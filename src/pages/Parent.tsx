import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, sha256, resetEverything } from '../game/store';
import { rankFor, dayKey } from '../game/rules';
import { EPISODE_ORDER, WORDS, WORLDS } from '../content';
import { clearLocalSubmissions, listSubmissions, reviewSubmission, type Submission } from '../lib/submissions';
import { supabase } from '../lib/supabase';

const PROGRAMME_URL = 'https://claude.ai/artifact/FcDuVghhNVuxqhGBTqQBbq';

export default function Parent() {
  const [ok, setOk] = useState(false);
  const pinHash = useGame((g) => g.s.profile?.pinHash);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const nav = useNavigate();
  if (!ok) {
    return (
      <div className="page col" style={{ maxWidth: 420, alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>🔐</div>
        <h1 className="title-l">Для родителей</h1>
        <div className="muted">Введите PIN-код</div>
        <input className="field" inputMode="numeric" type="password" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} style={{ textAlign: 'center', fontSize: 28, letterSpacing: 8 }} />
        {err && <div style={{ color: 'var(--red)', fontWeight: 800 }}>{err}</div>}
        <div className="row"><button className="btn ghost" onClick={() => nav('/')}>Назад</button>
          <button className="btn violet" onClick={async () => { if (!pinHash || (await sha256(pin)) === pinHash) setOk(true); else setErr('Неверный PIN'); }}>Войти</button></div>
      </div>
    );
  }
  return <Dashboard />;
}

function Dashboard() {
  const s = useGame((g) => g.s);
  const userId = useGame((g) => g.userId);
  const update = useGame((g) => g.update);
  const nav = useNavigate();
  const [subs, setSubs] = useState<Submission[]>([]);
  const [newPin, setNewPin] = useState('');
  useEffect(() => { void listSubmissions(userId).then(setSubs); }, [userId]);
  const { rank, next } = rankFor(s.fans);
  const days = Array.from({ length: 7 }, (_, k) => dayKey(Date.now() - (6 - k) * 86400000));
  const maxMin = Math.max(15, ...days.map((d) => s.minutes[d] ?? 0));
  const weekMin = days.reduce((a, d) => a + (s.minutes[d] ?? 0), 0);
  const weak = Object.entries(s.mistakes).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const pending = subs.filter((x) => x.status === 'new');

  const review = async (x: Submission, status: 'approved' | 'redo', comment: string, bonus: number) => {
    await reviewSubmission(x.id, status, comment, bonus);
    if (bonus) update((st) => ({ ...st, hearts: st.hearts + bonus }));
    setSubs(await listSubmissions(userId));
  };

  return (
    <div className="page col">
      <div className="row"><h1 className="title-xl grow">👨‍👩‍👧 Панель родителя</h1><button className="btn ghost small" onClick={() => nav('/')}>Выйти</button></div>

      <div className="grid grid-3">
        <Stat label="Серия дней" value={`🔥 ${s.streak.streak}`} />
        <Stat label="Минут сегодня / за 7 дней" value={`${s.minutes[dayKey(Date.now())] ?? 0} / ${weekMin}`} />
        <Stat label={`Ранг · уровень ${rank.cefr}`} value={rank.name} sub={next ? `${s.fans} / ${next.fans} фанатов` : ''} />
      </div>

      <div className="card col">
        <strong>Время занятий, мин</strong>
        <div className="row" style={{ alignItems: 'flex-end', height: 120, gap: 8 }}>
          {days.map((d) => (
            <div key={d} className="col grow" style={{ alignItems: 'center', gap: 4 }}>
              <div className="tiny">{s.minutes[d] ?? 0}</div>
              <div style={{ width: '100%', maxWidth: 40, height: `${((s.minutes[d] ?? 0) / maxMin) * 80}px`, minHeight: 2, background: 'var(--violet)', borderRadius: 8 }} />
              <div className="tiny muted">{d.slice(8)}.{d.slice(5, 7)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card col">
        <strong>Прогресс по мирам</strong>
        {WORLDS.map((w) => {
          const eps = EPISODE_ORDER.filter((r) => r.world.id === w.id);
          const done = eps.filter((r) => (s.progress[r.episode.id]?.stars ?? 0) > 0);
          const stars = eps.reduce((a, r) => a + (s.progress[r.episode.id]?.stars ?? 0), 0);
          const sc = s.progress[w.showcase.id];
          return (
            <div key={w.id} className="col" style={{ gap: 4 }}>
              <div className="row small"><b className="grow">{w.emoji} {w.title} — {w.ru}</b><span>{done.length}/{eps.length} эп. · ⭐ {stars}/{eps.length * 3}</span></div>
              <div className="bar"><span style={{ width: `${(done.length / eps.length) * 100}%` }} /></div>
              <div className="tiny muted">Грамматика: {w.grammar.join('; ')}{sc ? ` · Showcase: ${Math.round(sc.best * 100)}%` : ''}</div>
            </div>
          );
        })}
      </div>

      <div className="card col">
        <strong>Навыки (доля верных ответов)</strong>
        {([['listening', 'Аудирование'], ['reading', 'Чтение'], ['writing', 'Письмо'], ['speaking', 'Говорение']] as const).map(([k, l]) => {
          const t = s.skills[k];
          const p = t.t ? t.c / t.t : 0;
          return <div key={k} className="row small"><span style={{ width: 120 }}>{l}</span><div className="bar grow"><span style={{ width: `${p * 100}%` }} /></div><span style={{ width: 80, textAlign: 'right' }}>{t.t ? `${Math.round(p * 100)}%` : '—'} ({t.t})</span></div>;
        })}
      </div>

      <div className="card col">
        <strong>Слова с ошибками — стоит повторить</strong>
        {weak.length === 0 ? <div className="muted small">Пока ошибок нет 🎉</div> : (
          <div className="row wrap" style={{ gap: 6 }}>{weak.map(([id, n]) => { const w = WORDS.get(id); return <span key={id} className="chip">{w?.emoji} {w?.en ?? id} — {w?.ru} <span className="badge" style={{ background: 'var(--red)' }}>{n}</span></span>; })}</div>
        )}
      </div>

      <div className="card col">
        <strong>На проверку ({pending.length})</strong>
        <div className="tiny muted">Рисунки, аудио и записи из дневника. Похвалите и начислите бонусные сердечки — ребёнок увидит ваш комментарий на главной.</div>
        {subs.length === 0 && <div className="muted small">Пока ничего нет.</div>}
        {subs.slice(0, 40).map((x) => <ReviewItem key={x.id} x={x} onReview={review} />)}
      </div>

      <div className="card col">
        <strong>Настройки</strong>
        <label className="row small">Дневной лимит времени
          <select className="field" style={{ maxWidth: 160 }} value={s.profile?.settings.dailyLimitMin ?? 0}
            onChange={(e) => update((st) => ({ ...st, profile: { ...st.profile!, settings: { ...st.profile!.settings, dailyLimitMin: Number(e.target.value) || null } } }))}>
            <option value={0}>без лимита</option>{[20, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} мин</option>)}
          </select>
        </label>
        <label className="row small"><input type="checkbox" checked={s.profile?.settings.muted ?? false} onChange={(e) => update((st) => ({ ...st, profile: { ...st.profile!, settings: { ...st.profile!.settings, muted: e.target.checked } } }))} /> Выключить звуковые эффекты</label>
        <div className="small">Открыть мир вручную (если ребёнок уже знает тему):</div>
        <div className="row wrap">{WORLDS.slice(1).filter((w) => !w.bonus).map((w) => (
          <button key={w.id} className="btn ghost small" disabled={s.forcedWorlds.includes(w.id)} onClick={() => update((st) => ({ ...st, forcedWorlds: [...st.forcedWorlds, w.id] }))}>
            {s.forcedWorlds.includes(w.id) ? `✅ ${w.title}` : `🔓 ${w.title}`}
          </button>
        ))}</div>
        <div className="row">
          <input className="field" style={{ maxWidth: 160 }} inputMode="numeric" placeholder="Новый PIN" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} maxLength={8} />
          <button className="btn ghost small" disabled={newPin.length < 4} onClick={async () => { const h = await sha256(newPin); update((st) => ({ ...st, profile: { ...st.profile!, pinHash: h } })); setNewPin(''); }}>Сменить PIN</button>
        </div>
        <a href={PROGRAMME_URL} target="_blank" rel="noreferrer">📄 Программа обучения (Claude Doc)</a>
        <a href="#/notebook">📓 Все задания для тетради (можно распечатать)</a>
        <ResetBlock />
        {supabase && <button className="btn ghost small" onClick={() => void supabase!.auth.signOut().then(() => location.reload())}>Выйти из семейного аккаунта на этом устройстве</button>}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="card center"><div className="tiny muted" style={{ fontWeight: 800 }}>{label}</div><div style={{ fontFamily: 'var(--font-title)', fontSize: 26, fontWeight: 800 }}>{value}</div>{sub && <div className="tiny muted">{sub}</div>}</div>;
}

function ReviewItem({ x, onReview }: { x: Submission; onReview: (x: Submission, s: 'approved' | 'redo', c: string, b: number) => void }) {
  const [c, setC] = useState(x.comment ?? '');
  const ep = EPISODE_ORDER.find((r) => r.episode.id === x.lessonId);
  return (
    <div className="card col" style={{ boxShadow: 'none', background: x.status === 'new' ? '#fff' : '#fafafa' }}>
      <div className="tiny muted">{new Date(x.createdAt).toLocaleString('ru-RU')} · {ep?.episode.title ?? x.lessonId} · {x.kind === 'draw' ? 'рисунок' : x.kind === 'photo' ? 'фото тетради' : x.kind === 'audio' ? 'аудио' : 'текст'}</div>
      <div className="small"><b>Задание:</b> {x.prompt}</div>
      {(x.kind === 'draw' || x.kind === 'photo') && x.url && <img src={x.url} alt="" style={{ maxWidth: '100%', borderRadius: 12, border: '2px solid var(--line)' }} />}
      {x.kind === 'audio' && x.url && <audio controls src={x.url} />}
      {x.kind === 'text' && <div className="card tint-violet" style={{ boxShadow: 'none', whiteSpace: 'pre-wrap' }}>{x.text}</div>}
      {x.status === 'new' ? (
        <>
          <input className="field" placeholder="Комментарий для ребёнка (можно по-английски: Great job!)" value={c} onChange={(e) => setC(e.target.value)} />
          <div className="row wrap">
            <button className="btn mint small" onClick={() => onReview(x, 'approved', c, 10)}>✅ Принято +10 ❤️</button>
            <button className="btn sun small" onClick={() => onReview(x, 'approved', c, 25)}>🌟 Супер! +25 ❤️</button>
            <button className="btn ghost small" onClick={() => onReview(x, 'redo', c, 0)}>🔁 Переделать</button>
          </div>
        </>
      ) : <div className="small">{x.status === 'approved' ? '✅ Принято' : '🔁 На доработку'}{x.comment ? ` — ${x.comment}` : ''}{x.bonus ? ` (+${x.bonus} ❤️)` : ''}</div>}
    </div>
  );
}

function ResetBlock() {
  const [step, setStep] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  if (step === 0) return <button className="btn ghost small" style={{ color: 'var(--red)' }} onClick={() => setStep(1)}>🗑️ Начать заново (удалить профиль и весь прогресс)</button>;
  return (
    <div className="card col" style={{ boxShadow: 'none', borderColor: 'var(--red)' }}>
      <b style={{ color: 'var(--red)' }}>Удалить имя, аватар, прогресс, карточки, рисунки и фото — на всех устройствах?</b>
      <div className="small">Это нельзя отменить. Семейный аккаунт (email и пароль) останется. Для подтверждения введите слово <b>УДАЛИТЬ</b>.</div>
      <input className="field" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row">
        <button className="btn ghost small" onClick={() => { setStep(0); setText(''); }}>Отмена</button>
        <button className="btn small" disabled={text.trim().toUpperCase() !== 'УДАЛИТЬ' || busy}
          onClick={async () => { setBusy(true); await resetEverything(); await clearLocalSubmissions(); location.hash = '#/'; location.reload(); }}>
          {busy ? 'Удаляю…' : 'Удалить всё'}
        </button>
      </div>
    </div>
  );
}
