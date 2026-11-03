import { useRef, useState } from 'react';
import type { Exercise } from '../content/schema';
import { submitWork } from '../lib/submissions';
import { useGame } from '../game/store';
import { sfx } from '../lib/sfx';
import { subName } from '../lib/util';
import { Feedback, Prompt, SpeakBtn, type ExProps } from './common';

type Of<T extends Exercise['type']> = Extract<Exercise, { type: T }>;

/** Shrinks a photo to ≤1600px JPEG so uploads stay small on mobile data. */
async function compress(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.82));
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function Notebook({ ex, onDone, name, lessonId }: ExProps<Of<'notebook'>>) {
  const userId = useGame((g) => g.userId);
  const [checked, setChecked] = useState<boolean[]>(ex.steps.map(() => false));
  const [photo, setPhoto] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [sent, setSent] = useState<'photo' | 'nophoto' | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const task = subName(ex.task, name);
  const model = ex.model ? subName(ex.model, name) : '';
  const allDone = checked.every(Boolean);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    const b = await compress(f);
    setBlob(b); setPhoto(URL.createObjectURL(b));
  };
  const send = (withPhoto: boolean) => {
    void submitWork(userId, withPhoto && blob
      ? { kind: 'photo', lessonId, prompt: task, blob }
      : { kind: 'text', lessonId, prompt: task, text: '📓 Done in the notebook (no photo) — please check the notebook.' });
    sfx.win(); setSent(withPhoto ? 'photo' : 'nophoto');
  };

  return (
    <div className="col">
      <Prompt ru={ex.ru ?? 'Задание в тетради: напиши от руки, потом сфотографируй страницу'}>📓 Notebook mission!</Prompt>
      <div className="card tint-sun row" style={{ fontWeight: 800, fontSize: 21 }}>
        <div style={{ fontSize: 40 }}>{ex.emoji ?? '✏️'}</div>
        <div className="grow">{task}</div>
        <SpeakBtn text={task} />
      </div>
      <div className="card col" style={{ gap: 8 }}>
        <strong>Steps · Шаги</strong>
        {ex.steps.map((s, k) => (
          <label key={k} className="row" style={{ fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>
            <input type="checkbox" checked={checked[k]} onChange={() => { sfx.tap(); setChecked(checked.map((v, j) => (j === k ? !v : v))); }} style={{ width: 26, height: 26 }} />
            <span style={{ textDecoration: checked[k] ? 'line-through' : 'none' }}>{subName(s, name)}</span>
          </label>
        ))}
        <div className="muted small">About {ex.lines} lines in your notebook · примерно {ex.lines} строк</div>
      </div>
      {model && (
        <div className="card" style={{ background: 'repeating-linear-gradient(#fff 0 34px, #c9d8ff 34px 36px)', fontFamily: '"Comic Sans MS", "Chalkboard SE", var(--font)', fontSize: 21, lineHeight: '36px', whiteSpace: 'pre-wrap', paddingTop: 4 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}><span className="tiny muted" style={{ lineHeight: '20px' }}>Example · Образец</span><SpeakBtn text={model} /></div>
          {model}
        </div>
      )}
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      {photo && <img src={photo} alt="Your notebook page" style={{ maxWidth: '100%', borderRadius: 16, border: '3px solid var(--line)' }} />}
      <div className="row wrap" style={{ justifyContent: 'center' }}>
        <button className="btn violet" disabled={!allDone || !!sent} onClick={() => input.current?.click()}>📷 {photo ? 'Take again' : 'Take a photo of my page'}</button>
        {photo && <button className="btn mint" disabled={!!sent} onClick={() => send(true)}>📨 Send to Mum/Dad</button>}
      </div>
      {!allDone && <div className="muted small center">Tick all the steps first ✅ · Сначала отметь все шаги</div>}
      {allDone && !photo && !sent && <button className="btn ghost small" onClick={() => send(false)}>I can't take a photo now — I'll show my notebook</button>}
      {sent && <Feedback ok text={sent === 'photo' ? 'Your page is on its way! 📨' : 'Show your notebook to Mum or Dad 📓'} onNext={() => onDone({ correct: 1, total: 1, skill: 'writing', metric: 'notebook' })} />}
    </div>
  );
}
