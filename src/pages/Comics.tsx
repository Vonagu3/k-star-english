import { useEffect, useRef, useState } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import TopBar from '../components/TopBar';
import Avatar, { SceneBackground } from '../components/Avatar';
import { PEOPLE } from '../game/cards';
import { fullLook, type Look } from '../game/catalog';
import { useGame } from '../game/store';
import { submitWork } from '../lib/submissions';
import { subName } from '../lib/util';
import { sfx } from '../lib/sfx';
import confetti from 'canvas-confetti';

type Char = { who: string; text: string };
type Panel = { bg: string; chars: Char[] };
type Comic = { id: string; title: string; panels: Panel[]; ts: number };
const KEY = 'kstar-comics-v1';
const SCENES = ['pink', 'mint', 'sunset', 'night', 'seoul', 'cherry', 'beach', 'snow', 'concert', 'paris', 'ocean', 'space', 'candy', 'rainbow'];
const SCENE_EMOJI: Record<string, string> = { pink: '🩷', mint: '🍃', sunset: '🌅', night: '🌃', seoul: '🏙️', cherry: '🌸', beach: '🏖️', snow: '❄️', concert: '🎆', paris: '🗼', ocean: '🐠', space: '🪐', candy: '🍭', rainbow: '🌈' };
const PHRASES = ['Hello!', "Hi! I'm {name}.", "What's your name?", 'Nice to meet you!', 'Let’s dance!', 'I love K-pop!', 'Wow!', 'Oh no!', 'Help!', 'Thank you!', "Let's go!", 'Good morning!', "I'm happy!", 'Where is my cat?', 'Look!', 'I can sing!', 'See you!'];

const emptyComic = (): Comic => ({ id: crypto.randomUUID(), title: 'My comic', ts: Date.now(), panels: [
  { bg: 'pink', chars: [{ who: 'me', text: 'Hello!' }, { who: 'Hana', text: "Hi! What's your name?" }] },
  { bg: 'seoul', chars: [{ who: 'me', text: "I'm {name}." }] },
  { bg: 'concert', chars: [{ who: 'me', text: "Let's dance!" }, { who: 'Hana', text: 'Yes!' }] },
] });

/** Splits bubble text into short lines (SVG has no automatic wrapping). */
function wrap(text: string, max = 16): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim();
  }
  if (line) out.push(line);
  return out.slice(0, 4);
}

function PanelSvg({ p, idx, me, name, x = 0, y = 0 }: { p: Panel; idx: number; me: Look; name: string; x?: number; y?: number }) {
  const look = (who: string) => (who === 'me' ? me : PEOPLE[who] ?? me);
  const two = p.chars.length > 1;
  return (
    <svg x={x} y={y} width="300" height="260" viewBox="0 0 300 260">
      <svg x="0" y="0" width="300" height="260" viewBox="0 0 200 260" preserveAspectRatio="none"><SceneBackground bg={p.bg} id={`cbg-${idx}`} /></svg>
      {p.chars.map((c, k) => {
        const cx = two ? (k === 0 ? 20 : 160) : 90;
        const lines = wrap(subName(c.text, name));
        const bw = 128; const bh = 14 + lines.length * 17;
        const bx = two ? (k === 0 ? 6 : 166) : 86; const by = 8;
        return (
          <g key={k}>
            <g transform={`translate(${cx} ${100})`}><Avatar look={look(c.who)} size={120} showBg={false} /></g>
            {lines.length > 0 && (
              <g>
                <rect x={bx} y={by} width={bw} height={bh} rx="14" fill="#fff" stroke="#2b2140" strokeWidth="2" />
                <path d={`M${bx + (k === 0 ? 30 : bw - 30)} ${by + bh - 1} l${k === 0 ? 4 : -4} 18 l${k === 0 ? 12 : -12} -18 Z`} fill="#fff" stroke="#2b2140" strokeWidth="2" strokeLinejoin="round" />
                <rect x={bx + (k === 0 ? 31 : bw - 46)} y={by + bh - 3} width="15" height="5" fill="#fff" />
                {lines.map((l, i) => <text key={i} x={bx + bw / 2} y={by + 22 + i * 17} textAnchor="middle" fontSize="14" fontWeight="700" fontFamily="Nunito, Arial, sans-serif" fill="#2b2140">{l}</text>)}
              </g>
            )}
          </g>
        );
      })}
      <rect x="1" y="1" width="298" height="258" fill="none" stroke="#2b2140" strokeWidth="3" rx="6" />
    </svg>
  );
}

function ComicSvg({ c, me, name, svgRef }: { c: Comic; me: Look; name: string; svgRef?: React.Ref<SVGSVGElement> }) {
  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 300" width="100%" style={{ display: 'block', background: '#fff', borderRadius: 16 }}>
      <rect width="940" height="300" fill="#fff" />
      <text x="470" y="26" textAnchor="middle" fontSize="20" fontWeight="800" fontFamily="Nunito, Arial, sans-serif" fill="#7c5cff">{subName(c.title, name)}</text>
      {c.panels.map((p, i) => <PanelSvg key={i} p={p} idx={i} me={me} name={name} x={10 + i * 310} y={34} />)}
    </svg>
  );
}

async function svgToPng(svg: SVGSVGElement): Promise<Blob | null> {
  const xml = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement('canvas'); c.width = 1880; c.height = 600;
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((r) => c.toBlob(r, 'image/png'));
  } catch { return null; } finally { URL.revokeObjectURL(url); }
}

/** Comic maker: 3 panels, scenes, characters and English speech bubbles. */
export default function Comics() {
  const profile = useGame((g) => g.s.profile);
  const userId = useGame((g) => g.userId);
  const addMetric = useGame((g) => g.addMetric);
  const [list, setList] = useState<Comic[]>([]);
  const [c, setC] = useState<Comic | null>(null);
  const [panel, setPanel] = useState(0);
  const [msg, setMsg] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => { void idbGet(KEY).then((x) => setList((x as Comic[] | undefined) ?? [])); }, []);
  if (!profile) return null;
  const me = fullLook(profile.look);
  const name = profile.name;
  const cast = ['me', ...Object.keys(PEOPLE)];

  const save = async (send: boolean) => {
    if (!c) return;
    const next = [{ ...c, ts: Date.now() }, ...list.filter((x) => x.id !== c.id)].slice(0, 30);
    setList(next); await idbSet(KEY, next);
    if (send && svgRef.current) {
      const png = await svgToPng(svgRef.current);
      await submitWork(userId, png ? { kind: 'draw', lessonId: 'comic', prompt: `💬 Comic: ${c.title}`, blob: png } : { kind: 'text', lessonId: 'comic', prompt: `💬 Comic: ${c.title}`, text: c.panels.map((p, i) => `${i + 1}. ${p.chars.map((ch) => `${ch.who === 'me' ? name : ch.who}: ${subName(ch.text, name)}`).join(' / ')}`).join('\n') });
      addMetric('draw');
      sfx.win(); confetti({ particleCount: 100, spread: 80 }); setMsg('Sent to Mum/Dad! 📨');
    } else { sfx.coin(); setMsg('Saved! 💾'); }
  };

  if (!c) {
    return (
      <div className="page col">
        <TopBar />
        <h1 className="title-xl">💬 Comic Maker</h1>
        <div className="muted">Сделай комикс из 3 картинок: выбери место, героев и напиши, что они говорят по-английски.</div>
        <button className="btn" onClick={() => { setC(emptyComic()); setPanel(0); setMsg(''); }}>✨ New comic</button>
        {list.map((x) => (
          <button key={x.id} className="card col" style={{ gap: 6 }} onClick={() => { setC(x); setPanel(0); setMsg(''); }}>
            <ComicSvg c={x} me={me} name={name} />
            <div className="tiny muted">{new Date(x.ts).toLocaleDateString('ru-RU')}</div>
          </button>
        ))}
      </div>
    );
  }
  const p = c.panels[panel];
  const setPanelData = (np: Panel) => setC({ ...c, panels: c.panels.map((x, i) => (i === panel ? np : x)) });
  return (
    <div className="page col">
      <div className="row"><button className="btn ghost small" onClick={() => setC(null)}>⬅️ My comics</button><input className="field grow" value={c.title} maxLength={30} onChange={(e) => setC({ ...c, title: e.target.value })} /></div>
      <ComicSvg c={c} me={me} name={name} svgRef={svgRef} />
      <div className="row" style={{ justifyContent: 'center' }}>
        {c.panels.map((_, i) => <button key={i} className="chip" style={{ borderColor: panel === i ? 'var(--pink)' : undefined, background: panel === i ? 'var(--pink-soft)' : undefined }} onClick={() => setPanel(i)}>Picture {i + 1}</button>)}
      </div>
      <div className="card col">
        <b>🎬 Place · Место</b>
        <div className="row wrap" style={{ gap: 6 }}>{SCENES.map((bg) => <button key={bg} className="chip" style={{ borderColor: p.bg === bg ? 'var(--violet)' : undefined }} onClick={() => setPanelData({ ...p, bg })}>{SCENE_EMOJI[bg]} {bg}</button>)}</div>
        {p.chars.map((ch, k) => (
          <div key={k} className="col" style={{ gap: 6, borderTop: '2px solid var(--line)', paddingTop: 8 }}>
            <b>🧑 Character {k + 1}</b>
            <div className="row wrap" style={{ gap: 6 }}>
              {cast.map((who) => <button key={who} className="chip" style={{ borderColor: ch.who === who ? 'var(--violet)' : undefined }} onClick={() => setPanelData({ ...p, chars: p.chars.map((x, j) => (j === k ? { ...x, who } : x)) })}>{who === 'me' ? `⭐ ${name}` : who}</button>)}
            </div>
            <input className="field" placeholder="What does she say? (English)" maxLength={60} value={ch.text} onChange={(e) => setPanelData({ ...p, chars: p.chars.map((x, j) => (j === k ? { ...x, text: e.target.value } : x)) })} />
            <div className="row wrap" style={{ gap: 4 }}>{PHRASES.map((ph) => <button key={ph} className="chip" style={{ padding: '3px 8px', fontSize: 13 }} onClick={() => setPanelData({ ...p, chars: p.chars.map((x, j) => (j === k ? { ...x, text: ph } : x)) })}>{subName(ph, name)}</button>)}</div>
          </div>
        ))}
        <div className="row">
          {p.chars.length < 2 && <button className="btn ghost small" onClick={() => setPanelData({ ...p, chars: [...p.chars, { who: 'Jun', text: 'Hi!' }] })}>➕ Add a character</button>}
          {p.chars.length > 1 && <button className="btn ghost small" onClick={() => setPanelData({ ...p, chars: p.chars.slice(0, 1) })}>➖ One character</button>}
        </div>
      </div>
      <div className="row wrap" style={{ justifyContent: 'center' }}>
        <button className="btn violet" onClick={() => void save(false)}>💾 Save</button>
        <button className="btn mint" onClick={() => void save(true)}>📨 Save & send to Mum/Dad</button>
      </div>
      {msg && <div className="card tint-sun center" style={{ fontWeight: 800 }}>{msg}</div>}
    </div>
  );
}
