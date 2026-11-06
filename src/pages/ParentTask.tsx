import { useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useGame, type ParentTask } from '../game/store';
import { ExerciseView } from '../exercises';
import type { Exercise } from '../content/schema';
import { sfx } from '../lib/sfx';

/** Turns a parent's task into one of the usual exercise types. */
export function taskExercise(t: ParentTask): Exercise {
  switch (t.kind) {
    case 'draw': return { type: 'draw', prompt: t.prompt, ru: t.ru, emoji: '🎨' };
    case 'speak': return { type: 'speak', title: 'Say it!', items: [{ text: t.prompt, ru: t.ru, emoji: '📮' }] };
    case 'notebook': return { type: 'notebook', task: t.prompt, ru: t.ru, emoji: '📮', steps: ['Read the task carefully.', 'Write it neatly in your notebook.', 'Check your capital letters and full stops.'], lines: 6 };
    default: return { type: 'write', prompt: t.prompt, ru: t.ru, starters: ['I', 'My', 'I like', 'There is'], minWords: 10 };
  }
}

export const TASK_KIND: Record<ParentTask['kind'], { emoji: string; ru: string }> = {
  write: { emoji: '✍️', ru: 'Написать текст' }, draw: { emoji: '🎨', ru: 'Нарисовать' }, speak: { emoji: '🎤', ru: 'Сказать вслух' }, notebook: { emoji: '📓', ru: 'В тетради' },
};

export default function ParentTaskPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const task = useGame((g) => g.s.parentTasks?.find((t) => t.id === id));
  const name = useGame((g) => g.s.profile?.name ?? '');
  const update = useGame((g) => g.update);
  if (!task) return <div className="page center"><h2>Task not found</h2><button className="btn" onClick={() => nav('/')}>Home</button></div>;
  const done = () => {
    if (!task.doneAt) {
      update((s) => ({ ...s, hearts: s.hearts + task.reward, parentTasks: (s.parentTasks ?? []).map((t) => (t.id === task.id ? { ...t, doneAt: Date.now() } : t)) }));
      sfx.levelUp(); confetti({ particleCount: 140, spread: 90 });
    }
    nav('/');
  };
  return (
    <div className="page col" style={{ paddingBottom: 140 }}>
      <div className="row"><button className="icon-btn" onClick={() => nav('/')}>✖️</button><div className="grow" /><span className="chip">📮 From Mum/Dad · ❤️ {task.reward}</span></div>
      <ExerciseView ex={taskExercise(task)} onDone={done} name={name} lessonId={`parent-task-${task.id}`} />
    </div>
  );
}
