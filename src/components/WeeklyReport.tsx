import { useState } from 'react';
import { EPISODES, WORDS } from '../content';
import { BADGES } from '../game/badges';
import { dayKey } from '../game/rules';
import { useGame } from '../game/store';
import type { Submission } from '../lib/submissions';

const DAY = 86400000;
const monday = (ts: number) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Parent's weekly summary: time, episodes, stars, new words, badges, work sent. */
export default function WeeklyReport({ subs }: { subs: Submission[] }) {
  const s = useGame((g) => g.s);
  const [back, setBack] = useState(0);
  const start = monday(Date.now()) - back * 7 * DAY;
  const end = start + 7 * DAY;
  const inWeek = (ts: number | null | undefined, a = start, b = end) => !!ts && ts >= a && ts < b;
  const minsOf = (d: string) => Math.round((s.activeSec?.[d] ?? (s.minutes[d] ?? 0) * 60) / 60);
  const days = Array.from({ length: 7 }, (_, i) => dayKey(start + i * DAY));
  const mins = days.map(minsOf);
  const total = mins.reduce((a, b) => a + b, 0);
  const prevTotal = Array.from({ length: 7 }, (_, i) => minsOf(dayKey(start - 7 * DAY + i * DAY))).reduce((a, b) => a + b, 0);
  const eps = Object.entries(s.progress).filter(([k, v]) => !k.startsWith('daily-') && inWeek(v.completedAt));
  const dailies = Object.entries(s.progress).filter(([k, v]) => k.startsWith('daily-') && v.stars > 0 && inWeek(Date.parse(k.slice(6))));
  const stars = eps.reduce((a, [, v]) => a + v.stars, 0);
  const newWords = Object.entries(s.wordsSeen ?? {}).filter(([, t]) => inWeek(t)).map(([id]) => id);
  const badges = BADGES.filter((bd) => inWeek(s.badges?.[bd.id]));
  const sent = subs.filter((x) => inWeek(x.createdAt));
  const activeDays = mins.filter((m) => m > 0).length;
  const max = Math.max(20, ...mins);
  const range = `${new Date(start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${new Date(end - DAY).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
  const summary = total === 0 ? 'На этой неделе занятий пока не было.'
    : `${activeDays} ${activeDays === 1 ? 'день' : activeDays < 5 ? 'дня' : 'дней'} занятий, ${total} мин${prevTotal ? ` (${total >= prevTotal ? '+' : ''}${total - prevTotal} мин к прошлой неделе)` : ''}. Пройдено эпизодов: ${eps.length}, миссий дня: ${dailies.length}, новых слов: ${newWords.length}.`;

  return (
    <div className="card col">
      <div className="row wrap">
        <strong className="grow">📊 Отчёт за неделю · {range}</strong>
        <button className="chip" onClick={() => setBack(back + 1)}>← раньше</button>
        <button className="chip" disabled={back === 0} onClick={() => setBack(Math.max(0, back - 1))}>позже →</button>
      </div>
      <div className="card tint-mint small" style={{ boxShadow: 'none', fontWeight: 700 }}>{summary}</div>
      <div className="row" style={{ alignItems: 'flex-end', height: 110, gap: 8 }}>
        {mins.map((m, i) => (
          <div key={i} className="col grow" style={{ alignItems: 'center', gap: 4 }}>
            <div className="tiny">{m || ''}</div>
            <div style={{ width: '100%', maxWidth: 38, height: `${(m / max) * 70}px`, minHeight: 2, background: m ? 'var(--violet)' : '#eadcf0', borderRadius: 8 }} />
            <div className="tiny muted">{WD[i]}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-3">
        <Stat label="Минут" value={String(total)} sub={prevTotal ? `прошлая: ${prevTotal}` : ''} />
        <Stat label="Эпизодов" value={String(eps.length)} sub={`⭐ ${stars} · миссий дня ${dailies.length}`} />
        <Stat label="Новых слов" value={String(newWords.length)} sub={`работ отправлено: ${sent.length}`} />
      </div>
      {eps.length > 0 && <div className="small"><b>Пройдено:</b> {eps.map(([k, v]) => `${EPISODES.get(k)?.episode.title ?? k} ${'⭐'.repeat(v.stars)}`).join(' · ')}</div>}
      {newWords.length > 0 && <div className="small"><b>Новые слова:</b> {newWords.slice(0, 30).map((id) => WORDS.get(id)?.en ?? id).join(', ')}{newWords.length > 30 ? '…' : ''}</div>}
      {badges.length > 0 && <div className="small"><b>Бейджи:</b> {badges.map((bd) => `${bd.emoji} ${bd.name}`).join(', ')}</div>}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="card center" style={{ boxShadow: 'none', padding: 10 }}><div className="tiny muted" style={{ fontWeight: 800 }}>{label}</div><div style={{ fontFamily: 'var(--font-title)', fontSize: 26, fontWeight: 800 }}>{value}</div>{sub && <div className="tiny muted">{sub}</div>}</div>;
}
