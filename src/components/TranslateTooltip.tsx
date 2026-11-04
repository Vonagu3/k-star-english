import { useEffect, useRef, useState } from 'react';
import { translateAt } from '../lib/translate';
import { speak } from '../lib/tts';

type Tip = { en: string; ru: string; x: number; y: number; below: boolean };
const WORD = /[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’]*/g;

/** Finds the English word under a screen point and its neighbours in the same text node. */
function wordAt(x: number, y: number): { tokens: string[]; index: number; rect: DOMRect } | null {
  const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  let node: Node | null = null;
  let offset = 0;
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    if (p) { node = p.offsetNode; offset = p.offset; }
  } else if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    if (r) { node = r.startContainer; offset = r.startOffset; }
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const el = node.parentElement;
  if (!el || el.closest('input, textarea, select, [data-no-tr], .translate-tip')) return null;
  const text = node.textContent ?? '';
  const matches = [...text.matchAll(WORD)];
  const i = matches.findIndex((m) => m.index! <= offset && offset <= m.index! + m[0].length);
  if (i < 0) return null;
  const m = matches[i];
  const range = document.createRange();
  range.setStart(node, m.index!);
  range.setEnd(node, m.index! + m[0].length);
  const rect = range.getBoundingClientRect();
  // caret APIs return the nearest caret even over empty space: make sure the point is on the word.
  if (x < rect.left - 2 || x > rect.right + 2 || y < rect.top - 2 || y > rect.bottom + 2) return null;
  return { tokens: matches.map((x) => x[0].replace(/[’']+$/, '')), index: i, rect };
}

export default function TranslateTooltip({ enabled }: { enabled: boolean }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const lastKey = useRef('');

  useEffect(() => {
    if (!enabled) { setTip(null); return; }
    const show = (x: number, y: number, say: boolean) => {
      const w = wordAt(x, y);
      if (!w) { setTip(null); lastKey.current = ''; return false; }
      const tr = translateAt(w.tokens, w.index);
      if (!tr) { setTip(null); return false; }
      const below = w.rect.top < 70;
      setTip({ ...tr, x: w.rect.left + w.rect.width / 2, y: below ? w.rect.bottom + 8 : w.rect.top - 8, below });
      if (say) void speak(tr.en);
      return true;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      const key = `${Math.round(e.clientX / 6)}:${Math.round(e.clientY / 6)}`;
      if (key === lastKey.current) return;
      lastKey.current = key;
      hoverTimer.current = window.setTimeout(() => show(e.clientX, e.clientY, false), 220);
    };
    const onLeave = () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); setTip(null); };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      setTip(null);
      pressStart.current = { x: e.clientX, y: e.clientY };
      if (pressTimer.current) clearTimeout(pressTimer.current);
      pressTimer.current = window.setTimeout(() => {
        if (show(e.clientX, e.clientY, true)) {
          suppressClick.current = true;
          navigator.vibrate?.(15);
          window.setTimeout(() => setTip(null), 3500);
        }
      }, 450);
    };
    const cancelPress = (e: PointerEvent) => {
      if (!pressStart.current || !pressTimer.current) return;
      if (e.type === 'pointerup' || Math.hypot(e.clientX - pressStart.current.x, e.clientY - pressStart.current.y) > 10) {
        clearTimeout(pressTimer.current); pressTimer.current = null;
      }
    };
    const onClick = (e: MouseEvent) => {
      if (suppressClick.current) { suppressClick.current = false; e.preventDefault(); e.stopPropagation(); }
    };
    const onScroll = () => setTip(null);
    const onContext = (e: Event) => { if (suppressClick.current) e.preventDefault(); };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointermove', cancelPress, { passive: true });
    document.addEventListener('pointerup', cancelPress, { passive: true });
    document.addEventListener('click', onClick, true);
    document.addEventListener('contextmenu', onContext);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', cancelPress);
      document.removeEventListener('pointerup', cancelPress);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('contextmenu', onContext);
      window.removeEventListener('scroll', onScroll);
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
