import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { WORDS, WORLDS } from '../content';
import { useGame } from '../game/store';
import { ipaFor } from '../lib/translate';
import { speak } from '../lib/tts';
import { WordPic } from '../exercises/common';

type Status = 'known' | 'learning' | 'weak';
const STATUS: Record<Status, { label: string; color: string; emoji: string }> = {
  known: { label: 'Known', color: 'var(--mint)', emoji: '⭐' },
  learning: { label: 'Learning', color: 'var(--violet)', emoji: '📗' },
  weak: { label: 'Practise', color: 'var(--red)', emoji: '💪' },
};

/** Personal dictionary: every word met so far, with picture, British IPA, translation and status. */
export default function Words() {
  const nav = useNavigate();
  const s = useGame((g) => g.s);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const ids = useMemo(() => [...new Set([...Object.keys(s.srs), ...Object.keys(s.wordsSeen ?? {})])].filter((id) => WORDS.has(id)), [s.srs, s.wordsSeen]);
  const statusOf = (id: string): Status => {
    const e = s.srs[id];
    if ((s.mistakes[id] ?? 0) >= 2 && (!e || e.box < 3)) return 'weak';
    if (e && e.box >= 4) return 'known';
    return e && e.box <= 1 && (s.mistakes[id] ?? 0) > 0 ? 'weak' : 'learning';
  };
  const counts = { known: 0, learning: 0, weak: 0 };
  ids.forEach((id) => counts[statusOf(id)]++);
  const weak = ids.filter((id) => statusOf(id) === 'weak');
  const shown = ids.filter((id) => (filter === 'all' || statusOf(id) === filter)
    && (!q || WORDS.get(id)!.en.toLowerCase().includes(q.toLowerCase()) || WORDS.get(id)!.ru.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="page col">
      <TopBar />
      <h1 className="title-xl">📖 My Words</h1>
      <div className="muted">Все слова, которые ты уже встретила: {ids.length}. Нажми на слово, чтобы послушать.</div>
      <div className="row wrap">
        <button className="chip" style={{ borderColor: filter === 'all' ? 'var(--pink)' : undefined }} onClick={() => setFilter('all')}>All {ids.length}</button>
        {(Object.keys(STATUS) as Status[]).map((k) => (
          <button key={k} className="chip" style={{ borderColor: filter === k ? STATUS[k].color : undefined }} onClick={() => setFilter(k)}>{STATUS[k].emoji} {STATUS[k].label} {counts[k]}</button>
        ))}
      </div>
      <div className="row wrap">
        <input className="field grow" placeholder="Search · Поиск" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 180 }} />
        <button className="btn sun small" disabled={weak.length === 0} onClick={() => nav(`/warmup?words=${weak.slice(0, 15).join(',')}`)}>💪 Practise weak words ({weak.length})</button>
      </div>
      {ids.length === 0 && <div className="card muted">Пройди первый эпизод — и здесь появятся твои слова!</div>}
      {WORLDS.map((w) => {
        const list = shown.filter((id) => w.words.some((x) => x.id === id));
        const rest = w === WORLDS[0] ? shown.filter((id) => !WORLDS.some((ww) => ww.words.some((x) => x.id === id))) : [];
        const all = [...new Set([...list, ...rest])];
        if (!all.length) return null;
        return (
          <section key={w.id} className="col" style={{ gap: 8 }}>
            <h3>{w.emoji} {w.title} · {all.length}</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {all.map((id) => {
                const word = WORDS.get(id)!;
                const st = STATUS[statusOf(id)];
                const ipa = ipaFor(word.en);
                return (
                  <button key={id} className="card col" style={{ alignItems: 'center', gap: 2, padding: 10, borderColor: st.color }} onClick={() => void speak(word.en)}>
                    <WordPic w={word} size={40} />
                    <b style={{ fontSize: 17 }}>{word.en}</b>
                    {ipa && <span className="tiny" style={{ color: 'var(--violet)' }}>/{ipa}/</span>}
                    <span className="small muted">{word.ru}</span>
                    <span className="tiny" style={{ color: st.color, fontWeight: 800 }}>{st.emoji} {st.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
