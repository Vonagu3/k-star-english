import { useEffect, useRef, useState } from 'react';
import { translateAt } from '../lib/translate';
import { speak } from '../lib/tts';

type Tip = { en: string; ru: string; x: number; y: number; below: boolean };
const WORD = /[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’]*/g;

type Hit = { tokens: string[]; index: number; rect: DOMRect };
const inside = (r: DOMRect, x: number, y: number, pad = 2) => x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
const blocked = (el: Element | null) => !el || !!el.closest('input, textarea, select, [data-no-tr], .translate-tip');

/** Word under the point inside one text node, if the point really is on it. */
function hitInNode(node: Text, x: number, y: number, offset?: number): Hit | null {
  const text = node.textContent ?? '';
  const matches = [...text.matchAll(WORD)];
  if (!matches.length) return null;
  const range = document.createRange();
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (offset !== undefined && !(m.index! <= offset && offset <= m.index! + m[0].length)) continue;
    range.setStart(node, m.index!);
    range.setEnd(node, m.index! + m[0].length);
    for (const r of range.getClientRects()) {
      if (inside(r, x, y)) return { tokens: matches.map((t) => t[0].replace(/[’']+$/, '')), index: i, rect: r };
    }
  }
  return null;
}

/** Finds the English word under a screen point and its neighbours in the same text node. */
function wordAt(x: number, y: number): Hit | null {
  // 1) Fast path: caret position from the browser.
  const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  let node: Node | null = null;
  let offset = 0;
  try {
    if (doc.caretPositionFromPoint) {
      const p = doc.caretPositionFromPoint(x, y);
      if (p) { node = p.offsetNode; offset = p.offset; }
    } else if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(x, y);
      if (r) { node = r.startContainer; offset = r.startOffset; }
    }
  } catch { node = null; }
  if (node && node.nodeType === Node.TEXT_NODE && !blocked(node.parentElement)) {
    const hit = hitInNode(node as Text, x, y, offset);
    if (hit) return hit;
  }
  // 2) Fallback (buttons, tiles, user-select:none on touch screens): scan the text of the element under the point.
  const el = document.elementFromPoint(x, y);
  if (blocked(el)) return null;
  const walker = document.createTreeWalker(el!, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  let count = 0;
  while ((n = walker.nextNode()) && count++ < 60) {
    const hit = hitInNode(n as Text, x, y);
    if (hit) return hit;
  }
  return null;
}

export default function TranslateTooltip({ enabled }: { enabled: boolean }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const tipKey = useRef('');
  const frame = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    if (!enabled) { setTip(null); return; }

    /** Shows the translation of the word at (x, y). Returns false if there is no translatable word there. */
    const showAt = (x: number, y: number, say: boolean): boolean => {
      const w = wordAt(x, y);
      if (!w) return false;
      const tr = translateAt(w.tokens, w.index);
      if (!tr) return false;
      const key = `${tr.en}|${Math.round(w.rect.left)}|${Math.round(w.rect.top)}`;
      if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
      if (key !== tipKey.current) {
        tipKey.current = key;
        const below = w.rect.top < 70;
        setTip({ ...tr, x: w.rect.left + w.rect.width / 2, y: below ? w.rect.bottom + 8 : w.rect.top - 8, below });
      }
      if (say) void speak(tr.en);
      return true;
    };
    const hideNow = () => {
      if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
      tipKey.current = ''; setTip(null);
    };
    const hideSoon = (ms = 40) => {
      if (hideTimer.current || !tipKey.current) return;
      hideTimer.current = window.setTimeout(() => { tipKey.current = ''; setTip(null); hideTimer.current = null; }, ms);
    };

    // Mouse: check the word under the cursor once per animation frame — no waiting for the mouse to stop.
    let last = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      last = { x: e.clientX, y: e.clientY };
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        if (!showAt(last.x, last.y, false)) hideSoon();
      });
    };
    const onOut = (e: MouseEvent) => { if (!e.relatedTarget) hideNow(); };

    // Touch / pen: long press on a word shows it and says it.
    const onDown = (e: PointerEvent) => {
      hideNow();
      if (e.pointerType === 'mouse') return;
      pressStart.current = { x: e.clientX, y: e.clientY };
      if (pressTimer.current) clearTimeout(pressTimer.current);
      pressTimer.current = window.setTimeout(() => {
        pressTimer.current = null;
        if (showAt(e.clientX, e.clientY, true)) {
          suppressClick.current = true;
          navigator.vibrate?.(15);
          hideTimer.current = window.setTimeout(() => { tipKey.current = ''; setTip(null); hideTimer.current = null; }, 3500);
        }
      }, 350);
    };
    const cancelPress = (e: PointerEvent) => {
      if (!pressStart.current || pressTimer.current === null) return;
      if (e.type === 'pointerup' || e.type === 'pointercancel' || Math.hypot(e.clientX - pressStart.current.x, e.clientY - pressStart.current.y) > 12) {
        clearTimeout(pressTimer.current); pressTimer.current = null;
      }
    };
    const onClick = (e: MouseEvent) => {
      if (suppressClick.current) { suppressClick.current = false; e.preventDefault(); e.stopPropagation(); }
    };
    const onContext = (e: Event) => { if (suppressClick.current || pressTimer.current !== null) e.preventDefault(); };
    const onScroll = () => hideNow();

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseout', onOut);
    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointermove', cancelPress, { passive: true });
    document.addEventListener('pointerup', cancelPress, { passive: true });
    document.addEventListener('pointercancel', cancelPress, { passive: true });
    document.addEventListener('click', onClick, true);
    document.addEventListener('contextmenu', onContext);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('keydown', onScroll);
    window.addEventListener('blur', onScroll);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseout', onOut);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', cancelPress);
      document.removeEventListener('pointerup', cancelPress);
      document.removeEventListener('pointercancel', cancelPress);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('contextmenu', onContext);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('keydown', onScroll);
      window.removeEventListener('blur', onScroll);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [enabled]);

  if (!tip) return null;
  const left = Math.min(Math.max(tip.x, 90), window.innerWidth - 90);
  return (
    <div className="translate-tip" role="tooltip"
      style={{ left, top: tip.y, transform: `translate(-50%, ${tip.below ? '0' : '-100%'})` }}>
      <b>{tip.en}</b> — {tip.ru}
    </div>
  );
}
