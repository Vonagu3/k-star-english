import { useEffect, useRef, useState } from 'react';
import { ipaFor, translateAt } from '../lib/translate';
import { speak } from '../lib/tts';

type Tip = { en: string; ru: string; ipa: string | null; x: number; y: number; below: boolean };
const WORD = /[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’]*/g;

type Hit = { tokens: string[]; index: number; rect: DOMRect };
const inside = (r: DOMRect, x: number, y: number, pad = 2) => x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
let everywhere = false;
const blocked = (el: Element | null) => !el || !!el.closest(everywhere ? 'input, textarea, select, .translate-tip' : 'input, textarea, select, [data-no-tr], .translate-tip');

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

/**
 * Translation popup. Desktop: right-click a word. Touch: long-press a word (or the browser's own long-press
 * context menu event). The popup stays until a click elsewhere, Esc, scroll or navigation.
 * Hovering shows nothing.
 */
export default function TranslateTooltip({ enabled, all = false }: { enabled: boolean; all?: boolean }) {
  everywhere = all;
  const [tip, setTip] = useState<Tip | null>(null);
  const tipKey = useRef('');
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) { setTip(null); return; }

    const hide = () => { tipKey.current = ''; setTip(null); };
    /** Shows the word at (x, y). Returns false when there is no translatable word there. */
    const showAt = (x: number, y: number, say: boolean): boolean => {
      const w = wordAt(x, y);
      if (!w) return false;
      const tr = translateAt(w.tokens, w.index);
      if (!tr) return false;
      const key = `${tr.en}|${Math.round(w.rect.left)}|${Math.round(w.rect.top)}`;
      if (key !== tipKey.current) {
        tipKey.current = key;
        const below = w.rect.top < 110;
        setTip({ ...tr, ipa: ipaFor(tr.en), x: w.rect.left + w.rect.width / 2, y: below ? w.rect.bottom + 8 : w.rect.top - 8, below });
      }
      if (say) void speak(tr.en);
      return true;
    };

    // Right click (desktop) or the browser's long-press menu (Android): show instead of the native menu.
    const onContext = (e: MouseEvent) => {
      if (suppressClick.current) { e.preventDefault(); return; }
      if (showAt(e.clientX, e.clientY, false)) e.preventDefault();
    };

    // Touch / pen long press (iOS has no context menu event for text).
    const onDown = (e: PointerEvent) => {
      if (boxRef.current?.contains(e.target as Node)) return;
      hide();
      if (e.pointerType === 'mouse') return;
      pressStart.current = { x: e.clientX, y: e.clientY };
      if (pressTimer.current) clearTimeout(pressTimer.current);
      pressTimer.current = window.setTimeout(() => {
        pressTimer.current = null;
        if (showAt(e.clientX, e.clientY, true)) { suppressClick.current = true; navigator.vibrate?.(15); }
      }, 350);
    };
    const cancelPress = (e: PointerEvent) => {
      if (!pressStart.current || pressTimer.current === null) return;
      if (e.type !== 'pointermove' || Math.hypot(e.clientX - pressStart.current.x, e.clientY - pressStart.current.y) > 12) {
        clearTimeout(pressTimer.current); pressTimer.current = null;
      }
    };
    const onClick = (e: MouseEvent) => {
      if (suppressClick.current) { suppressClick.current = false; e.preventDefault(); e.stopPropagation(); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };

    document.addEventListener('contextmenu', onContext);
    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointermove', cancelPress, { passive: true });
    document.addEventListener('pointerup', cancelPress, { passive: true });
    document.addEventListener('pointercancel', cancelPress, { passive: true });
    document.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', hide, { passive: true, capture: true });
    window.addEventListener('blur', hide);
    window.addEventListener('hashchange', hide);
    return () => {
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', cancelPress);
      document.removeEventListener('pointerup', cancelPress);
      document.removeEventListener('pointercancel', cancelPress);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', hide, { capture: true });
      window.removeEventListener('blur', hide);
      window.removeEventListener('hashchange', hide);
    };
  }, [enabled]);

  if (!tip) return null;
  const left = Math.min(Math.max(tip.x, 120), window.innerWidth - 120);
  return (
    <div ref={boxRef} className="translate-tip" role="dialog" aria-label={`${tip.en}: ${tip.ru}`}
      style={{ left, top: tip.y, transform: `translate(-50%, ${tip.below ? '0' : '-100%'})` }}>
      <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
        <b>{tip.en}</b>
        <button className="tip-say" aria-label={`Say ${tip.en}`} onClick={() => void speak(tip.en)}>🔊</button>
      </div>
      {tip.ipa && <div className="tip-ipa">/{tip.ipa}/</div>}
      <div>{tip.ru}</div>
    </div>
  );
}
