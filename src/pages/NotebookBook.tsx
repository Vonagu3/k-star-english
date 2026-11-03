import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WORLDS } from '../content';
import type { Exercise } from '../content/schema';
import { useGame } from '../game/store';
import { subName } from '../lib/util';

type Task = { ex: Extract<Exercise, { type: 'notebook' }>; epId: string; epTitle: string; week: string };

/** All notebook missions by world and week, with a print-friendly layout (lined space to write on). */
export default function NotebookBook() {
  const nav = useNavigate();
  const name = useGame((g) => g.s.profile?.name ?? '');
  const progress = useGame((g) => g.s.progress);
  const [worldId, setWorldId] = useState(WORLDS[0]?.id ?? '');
  const world = WORLDS.find((w) => w.id === worldId);
  const tasks = useMemo<Task[]>(() => {
    if (!world) return [];
    const out: Task[] = [];
    for (const wk of world.weeks) for (const ep of wk.episodes) for (const ex of ep.exercises) {
      if (ex.type === 'notebook') out.push({ ex, epId: ep.id, epTitle: ep.title, week: `Week ${wk.n}: ${wk.title}` });
    }
    for (const ep of [world.showcase, ...(world.finale ? [world.finale] : [])]) for (const ex of ep.exercises) if (ex.type === 'notebook') out.push({ ex, epId: ep.id, epTitle: ep.title, week: ep.title });
    return out;
  }, [world]);

  let lastWeek = '';
  return (
    <div className="page col notebook-book">
      <div className="row no-print">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Back">⬅️</button>
        <h1 className="title-xl grow">📓 My Notebook</h1>
        <button className="btn violet small" onClick={() => window.print()}>🖨️ Print</button>
      </div>
      <div className="muted no-print">Все задания для тетради. Можно выполнять прямо по этому списку или распечатать листы с линейками. · All your notebook missions.</div>
      <div className="row wrap no-print">
        {WORLDS.map((w) => <button key={w.id} className="chip" style={{ borderColor: w.id === worldId ? w.color : undefined, background: w.id === worldId ? `${w.color}22` : undefined }} onClick={() => setWorldId(w.id)}>{w.emoji} {w.title}</button>)}
      </div>
      {world && <h2 className="print-only">{world.emoji} {world.title} — {name}</h2>}
      {tasks.length === 0 && <div className="card muted">No notebook missions here yet.</div>}
      {tasks.map((t, k) => {
        const head = t.week !== lastWeek ? (lastWeek = t.week) : null;
        const done = (progress[t.epId]?.stars ?? 0) > 0;
        return (
          <div key={k} className="col" style={{ gap: 8 }}>
            {head && <h3 style={{ marginTop: 8 }}>{head}</h3>}
            <div className="card nb-task col" style={{ gap: 8 }}>
              <div className="row">
                <div style={{ fontSize: 34 }}>{t.ex.emoji ?? '✏️'}</div>
                <div className="grow">
                  <div style={{ fontWeight: 800, fontSize: 19 }}>{subName(t.ex.task, name)}</div>
                  {t.ex.ru && <div className="muted small">{t.ex.ru}</div>}
                  <div className="tiny muted">{t.epTitle}</div>
                </div>
                <span className="no-print" style={{ fontSize: 24 }} title={done ? 'episode done' : ''}>{done ? '✅' : '⬜'}</span>
              </div>
              <ol style={{ margin: 0, paddingLeft: 22, fontWeight: 700 }}>{t.ex.steps.map((s, j) => <li key={j}>{subName(s, name)}</li>)}</ol>
              {t.ex.model && <div style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", var(--font)', fontSize: 18, whiteSpace: 'pre-wrap', background: 'var(--sun-soft)', borderRadius: 12, padding: '8px 12px' }}><span className="tiny muted">Example: </span>{subName(t.ex.model, name)}</div>}
              <div className="print-only nb-lines" style={{ height: t.ex.lines * 34 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
