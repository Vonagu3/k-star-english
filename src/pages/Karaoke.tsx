import { useEffect, useMemo, useRef, useState } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import TopBar from '../components/TopBar';
import { EPISODE_ORDER } from '../content';
import { useGame } from '../game/store';
import { PlayerControls, SPEED_KEY, savedSpeed, useChantPlayer, type ChantSpeed } from '../exercises/Music';
import { submitWork } from '../lib/submissions';
import { subName } from '../lib/util';
import { recordWithBeat, sfx } from '../lib/sfx';
import confetti from 'canvas-confetti';

type Song = { key: string; title: string; emoji: string; lines: string[]; bpm: number; from: string };
type Take = { id: string; song: string; title: string; ts: number; blob: Blob };
const KEY = 'kstar-karaoke-v1';

/** Chants from finished episodes (and the very first one, so there is always something to sing). */
function useSongs(): Song[] {
  const progress = useGame((g) => g.s.progress);
  const name = useGame((g) => g.s.profile?.name ?? '');
  return useMemo(() => {
    const out: Song[] = [];
    EPISODE_ORDER.forEach((r, idx) => {
      const open = (progress[r.episode.id]?.stars ?? 0) > 0 || idx === 0;
      if (!open) return;
      r.episode.exercises.forEach((ex, k) => {
        if (ex.type !== 'chant') return;
        out.push({ key: `${r.episode.id}#${k}`, title: ex.title && ex.title !== 'Chant time!' ? ex.title : `${r.episode.title}`, emoji: r.world.emoji, lines: ex.lines.map((l) => subName(l, name)), bpm: ex.bpm, from: r.episode.title });
      });
    });
    return out;
  }, [progress, name]);
}

/** Karaoke studio: sing a chant over the beat, record yourself, listen back, send to Mum or Dad. */
export default function Karaoke() {
  const songs = useSongs();
  const [sel, setSel] = useState<Song | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);
  useEffect(() => { void idbGet(KEY).then((t) => setTakes((t as Take[] | undefined) ?? [])); }, []);
  const saveTakes = (t: Take[]) => { setTakes(t); void idbSet(KEY, t); };

  return (
    <div className="page col">
      <TopBar />
      <h1 className="title-xl">🎤 Karaoke Studio</h1>
      {!sel && (
        <>
          <div className="muted">Выбери песню, спой под бит и запиши себя! Новые песни появляются, когда проходишь эпизоды.</div>
          <div className="grid grid-2">
            {songs.map((s) => (
              <button key={s.key} className="card col" style={{ textAlign: 'left', gap: 4 }} onClick={() => setSel(s)}>
                <div style={{ fontSize: 30 }}>{s.emoji} 🎵</div>
                <b>{s.title}</b>
                <div className="tiny muted">{s.lines[0]}</div>
              </button>
            ))}
          </div>
          {takes.length > 0 && <Takes takes={takes} onChange={saveTakes} />}
        </>
      )}
      {sel && <Stage song={sel} onBack={() => setSel(null)} onTake={(t) => saveTakes([t, ...takes].slice(0, 30))} takes={takes.filter((t) => t.song === sel.key)} onChange={(t) => saveTakes([...takes.filter((x) => x.song !== sel.key), ...t])} />}
    </div>
  );
}

function Stage({ song, onBack, onTake, takes, onChange }: { song: Song; onBack: () => void; onTake: (t: Take) => void; takes: Take[]; onChange: (t: Take[]) => void }) {
  const addMetric = useGame((g) => g.addMetric);
  const [speed, setSpeedState] = useState<ChantSpeed>(savedSpeed);
  const setSpeed = (s: ChantSpeed) => { setSpeedState(s); try { localStorage.setItem(SPEED_KEY, s); } catch { /* ignore */ } };
  const [voice, setVoice] = useState(true);
  const p = useChantPlayer(song.lines, song.bpm, speed);
  const rec = useRef<{ stop: () => Promise<Blob> } | null>(null);
  const [recording, setRecording] = useState(false);
  const [err, setErr] = useState('');

  /** Records over the backing track (beat only); `withVoice` adds the helper voice to sing along with (not recorded). */
  const startRecording = async (withVoice: boolean) => {
    setErr('');
    try {
      rec.current = await recordWithBeat(5 * 60 * 1000);
      setRecording(true);
      p.playFrom(0, withVoice, () => void stopRecording());
    } catch { setErr('Нет доступа к микрофону. Разреши микрофон в настройках браузера.'); }
  };
  const stopRecording = async () => {
    p.stop();
    const blob = await rec.current?.stop();
    rec.current = null;
    setRecording(false);
    if (blob && blob.size > 2000) {
      onTake({ id: crypto.randomUUID(), song: song.key, title: song.title, ts: Date.now(), blob });
      addMetric('chant');
      sfx.win(); confetti({ particleCount: 90, spread: 80 });
    }
  };
  useEffect(() => () => { void rec.current?.stop(); }, []);

  return (
    <div className="col">
      <div className="row"><button className="btn ghost small" onClick={() => { p.stop(); onBack(); }}>⬅️ Songs</button><b className="grow">{song.emoji} {song.title}</b></div>
      <div className="card col" style={{ gap: 6, background: 'linear-gradient(160deg, #1a0b2e, #6a1b9a)', borderColor: '#6a1b9a' }}>
        {song.lines.map((l, i) => (
          <div key={i} className={`karaoke-line ${p.line === i ? 'on' : ''}`} style={{ color: p.line === i ? '#fff' : '#d9ccff', cursor: 'pointer' }} onClick={() => !recording && p.playFrom(i, voice)}>{l}</div>
        ))}
      </div>
      {!recording && <PlayerControls p={p} n={song.lines.length} voice={voice} onVoice={() => setVoice(!voice)} speed={speed} onSpeed={setSpeed} />}
      <div className="row wrap" style={{ justifyContent: 'center' }}>
        {!recording
          ? <>
            <button className="btn" style={{ minHeight: 64, fontSize: 22 }} onClick={() => void startRecording(false)}>🔴 Record my song</button>
            <button className="btn ghost small" onClick={() => void startRecording(true)}>🔴 Record with the helper voice</button>
          </>
          : <button className="btn violet" style={{ minHeight: 64, fontSize: 22 }} onClick={() => void stopRecording()}>⏹ Stop recording</button>}
      </div>
      <div className="muted small center">{recording ? '🎙️ Recording… Sing along with the beat!' : 'Запись идёт под минус: бит записывается вместе с твоим голосом. Если слова ещё не выучены — нажми «with the helper voice», подсказка будет звучать, но в запись не попадёт.'}</div>
      {err && <div className="card tint-sun small">{err}</div>}
      {takes.length > 0 && <Takes takes={takes} onChange={onChange} />}
    </div>
  );
}

function Takes({ takes, onChange }: { takes: Take[]; onChange: (t: Take[]) => void }) {
  const userId = useGame((g) => g.userId);
  const [sent, setSent] = useState<string[]>([]);
  const urls = useMemo(() => Object.fromEntries(takes.map((t) => [t.id, URL.createObjectURL(t.blob)])), [takes]);
  useEffect(() => () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return (
    <div className="card col">
      <b>🎧 My recordings · Мои записи</b>
      {takes.map((t) => (
        <div key={t.id} className="col" style={{ gap: 4, borderTop: '2px solid var(--line)', paddingTop: 8 }}>
          <div className="row small"><b className="grow">{t.title}</b><span className="tiny muted">{new Date(t.ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
          <audio controls src={urls[t.id]} style={{ width: '100%' }} />
          <div className="row">
            <button className="btn mint small" disabled={sent.includes(t.id)} onClick={() => { void submitWork(userId, { kind: 'audio', lessonId: 'karaoke', prompt: `🎤 Karaoke: ${t.title}`, blob: t.blob }); setSent([...sent, t.id]); sfx.coin(); }}>
              {sent.includes(t.id) ? '✓ Sent' : '📨 Send to Mum/Dad'}
            </button>
            <button className="btn ghost small" onClick={() => onChange(takes.filter((x) => x.id !== t.id))}>🗑️</button>
          </div>
        </div>
      ))}
    </div>
  );
}
