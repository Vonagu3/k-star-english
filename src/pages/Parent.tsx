import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, sha256, resetEverything, usedToday } from '../game/store';
import { useTimeStatus } from '../components/TimerChip';
import WeeklyReport from '../components/WeeklyReport';
import { TASK_KIND } from './ParentTask';
import type { ParentTask } from '../game/store';
import { DEFAULT_LIMIT_MIN, mmss } from '../game/rules';
import { rankFor, dayKey } from '../game/rules';
import { EPISODE_ORDER, WORDS, WORLDS } from '../content';
import { clearLocalSubmissions, listSubmissions, reviewSubmission, type Submission } from '../lib/submissions';
import { supabase } from '../lib/supabase';
import { britishVoices, configureVoice, hasBritishVoice, speak } from '../lib/tts';

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
    if (bonus) update((st) => ({ ...st, hearts: st.hearts + bonus, heartsSetAt: Date.now() }));
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

      <HeartsFix />

      <WeeklyReport subs={subs} />

      <ParentTasks />

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
        {([['listening', 'Аудирование'], ['reading', 'Чтение'], ['writing', 'Письмо'], ['speaking', 'Говорение'], ['maths', 'Математика']] as const).map(([k, l]) => {
          const t = s.skills[k] ?? { c: 0, t: 0 };
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
        <TimeLimitSettings />
        <label className="row small">🎂 День рождения ребёнка (для праздника и подарка)
          <input className="field" type="date" style={{ maxWidth: 180 }}
            value={s.profile?.settings.birthday ? `2016-${s.profile.settings.birthday}` : ''}
            onChange={(e) => update((st) => ({ ...st, profile: { ...st.profile!, settings: { ...st.profile!.settings, birthday: e.target.value ? e.target.value.slice(5) : null } } }))} />
        </label>
        <VoiceSettings />
        <label className="row small">Перевод и транскрипция слов по правому клику мыши / долгому нажатию (в заданиях на вспоминание, разминке, Showcase и Debut подсказок нет)
          <select className="field" style={{ maxWidth: 220 }} value={s.profile?.settings.hoverTranslate ?? 'practice'}
            onChange={(e) => update((st) => ({ ...st, profile: { ...st.profile!, settings: { ...st.profile!.settings, hoverTranslate: e.target.value as 'all' | 'practice' | 'off' } } }))}>
            <option value="practice">только в обучающих частях (рекомендуется)</option>
            <option value="all">везде, даже в заданиях и проверках</option>
            <option value="off">выключен</option>
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
        <div className="tiny muted">Версия портала: {__BUILD__}</div>
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

/** Lets the parent correct the hearts balance (e.g. after an accidental purchase). */
function HeartsFix() {
  const hearts = useGame((g) => g.s.hearts);
  const update = useGame((g) => g.update);
  const [v, setV] = useState('');
  const [done, setDone] = useState('');
  const n = Number(v);
  const valid = v !== '' && Number.isInteger(n) && n >= 0 && n <= 100000;
  return (
    <div className="card col" style={{ gap: 8 }}>
      <strong>❤️ Сердечки: {hearts}</strong>
      <div className="tiny muted">Если сердечки потратились по ошибке, впишите нужный баланс. Купленные вещи останутся у ребёнка.</div>
      <div className="row wrap">
        <input className="field" inputMode="numeric" placeholder="например, 350" value={v} onChange={(e) => { setV(e.target.value.replace(/\D/g, '')); setDone(''); }} style={{ maxWidth: 160 }} />
        <button className="btn violet small" disabled={!valid} style={{ opacity: valid ? 1 : 0.5 }}
          onClick={() => { update((st) => ({ ...st, hearts: n, heartsSetAt: Date.now() })); setDone(`Готово: теперь ${n} ❤️`); setV(''); }}>Установить</button>
      </div>
      {done && <div className="small" style={{ fontWeight: 700, color: 'var(--mint)' }}>✅ {done}</div>}
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

function VoiceSettings() {
  const settings = useGame((g) => g.s.profile?.settings);
  const update = useGame((g) => g.update);
  const [voices, setVoices] = useState(britishVoices());
  useEffect(() => {
    const h = () => setVoices(britishVoices());
    speechSynthesis?.addEventListener?.('voiceschanged', h);
    const t = setTimeout(h, 600);
    return () => { speechSynthesis?.removeEventListener?.('voiceschanged', h); clearTimeout(t); };
  }, []);
  const set = (patch: { voiceName?: string | null; voiceRate?: number }) => {
    update((st) => ({ ...st, profile: { ...st.profile!, settings: { ...st.profile!.settings, ...patch } } }));
    configureVoice({ name: patch.voiceName, rate: patch.voiceRate });
  };
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="small"><b>🇬🇧 Британский голос озвучки</b> (на этом устройстве)</div>
      {!hasBritishVoice() && voices.length === 0 ? (
        <div className="card tint-sun small" style={{ boxShadow: 'none' }}>
          На этом устройстве не найден британский голос. Озвучка всё равно запрашивает британский английский, но лучше установить голос:<br />
          • iPhone/iPad: Настройки → Универсальный доступ → Устные материалы → Голоса → English → English (UK) → скачать Kate или Daniel.<br />
          • Android: Настройки → Синтез речи → Google → Язык: English (United Kingdom), скачать голос.<br />
          • Windows: Параметры → Время и язык → Речь → Добавить голоса → English (United Kingdom).<br />
          • Mac: Системные настройки → Универсальный доступ → Устный контент → Голос системы → Управлять голосами → English (UK).
        </div>
      ) : (
        <div className="row wrap">
          <select className="field" style={{ maxWidth: 320 }} value={settings?.voiceName ?? ''} onChange={(e) => set({ voiceName: e.target.value || null })}>
            <option value="">Автоматически (лучший британский)</option>
            {voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
          </select>
          <button className="btn ghost small" onClick={() => void speak('Hello! Welcome to Star Academy. My favourite colour is purple.')}>▶ Прослушать</button>
        </div>
      )}
      <label className="row small">Скорость речи
        <input type="range" min={0.6} max={1.1} step={0.05} value={settings?.voiceRate ?? 0.9} onChange={(e) => set({ voiceRate: Number(e.target.value) })} />
        <span>{Math.round((settings?.voiceRate ?? 0.9) * 100)}%</span>
      </label>
    </div>
  );
}

function TimeLimitSettings() {
  const settings = useGame((g) => g.s.profile?.settings);
  const extra = useGame((g) => g.s.daily.extraMin ?? 0);
  const used = useGame(usedToday);
  const update = useGame((g) => g.update);
  const t = useTimeStatus();
  const limit = settings?.dailyLimitMin ?? DEFAULT_LIMIT_MIN;
  const extend = (min: number) => update((st) => ({ ...st, daily: { ...st.daily, extraMin: (st.daily.extraMin ?? 0) + min } }));
  return (
    <div className="col" style={{ gap: 6 }}>
      <label className="row small"><b>⏱ Лимит занятий в день</b>
        <select className="field" style={{ maxWidth: 170 }} value={limit}
          onChange={(e) => update((st) => ({ ...st, profile: { ...st.profile!, settings: { ...st.profile!.settings, dailyLimitMin: Number(e.target.value) } } }))}>
          {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} мин{m === DEFAULT_LIMIT_MIN ? ' (по умолчанию)' : ''}</option>)}
          <option value={0}>без лимита</option>
        </select>
      </label>
      {limit > 0 && (
        <>
          <div className="small">Сегодня: <b>{Math.floor(used / 60)} мин</b> из {limit + extra} мин{extra ? ` (в т.ч. продление +${extra})` : ''} · осталось <b>{t.level === 'locked' ? '0:00 — время вышло' : mmss(t.remainingSec)}</b></div>
          <div className="row wrap">
            <button className="btn ghost small" onClick={() => extend(15)}>+15 мин сегодня</button>
            <button className="btn ghost small" onClick={() => extend(30)}>+30 мин сегодня</button>
          </div>
          <div className="tiny muted">Время считается, только пока портал открыт и ребёнок им пользуется (после 3 минут бездействия таймер останавливается). Начатый урок можно доиграть — до 10 минут сверх лимита.</div>
        </>
      )}
    </div>
  );
}

const NO_TASKS: ParentTask[] = [];

function ParentTasks() {
  const stored = useGame((g) => g.s.parentTasks);
  const tasks = stored ?? NO_TASKS;
  const update = useGame((g) => g.update);
  const [kind, setKind] = useState<ParentTask['kind']>('write');
  const [prompt, setPrompt] = useState('');
  const [ru, setRu] = useState('');
  const [reward, setReward] = useState(20);
  const add = () => {
    const t: ParentTask = { id: crypto.randomUUID(), kind, prompt: prompt.trim(), ru: ru.trim() || undefined, reward, createdAt: Date.now(), doneAt: null };
    update((s) => ({ ...s, parentTasks: [t, ...(s.parentTasks ?? [])].slice(0, 50) }));
    setPrompt(''); setRu('');
  };
  return (
    <div className="card col">
      <strong>📮 Задания от вас</strong>
      <div className="tiny muted">Придумайте своё задание — оно появится у ребёнка на главной. Пишите по-английски простыми словами; русская подсказка по желанию. Результат придёт в «На проверку».</div>
      <div className="row wrap">{(Object.keys(TASK_KIND) as ParentTask['kind'][]).map((k) => <button key={k} className="chip" style={{ borderColor: kind === k ? 'var(--violet)' : undefined }} onClick={() => setKind(k)}>{TASK_KIND[k].emoji} {TASK_KIND[k].ru}</button>)}</div>
      <input className="field" placeholder={kind === 'speak' ? 'Фраза, например: I love my cat Murka.' : 'Задание, например: Write about your cat. What colour is it?'} value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={160} />
      <input className="field" placeholder="Подсказка по-русски (необязательно)" value={ru} onChange={(e) => setRu(e.target.value)} maxLength={120} />
      <div className="row wrap"><span className="small">Награда:</span>{[10, 20, 30, 50].map((r) => <button key={r} className="chip" style={{ borderColor: reward === r ? 'var(--violet)' : undefined }} onClick={() => setReward(r)}>❤️ {r}</button>)}
        <div className="grow" /><button className="btn violet small" disabled={prompt.trim().length < 4} onClick={add}>Добавить задание</button></div>
      {tasks.map((t) => (
        <div key={t.id} className="row small" style={{ borderTop: '2px solid var(--line)', paddingTop: 6 }}>
          <span>{TASK_KIND[t.kind].emoji}</span>
          <div className="grow"><b>{t.prompt}</b>{t.ru ? <span className="muted"> · {t.ru}</span> : null}</div>
          <span>{t.doneAt ? `✅ ${new Date(t.doneAt).toLocaleDateString('ru-RU')}` : '⏳ ждёт'}</span>
          <button className="chip" onClick={() => update((s) => ({ ...s, parentTasks: (s.parentTasks ?? []).filter((x) => x.id !== t.id), parentTasksGone: [...(s.parentTasksGone ?? []), t.id] }))}>🗑️</button>
        </div>
      ))}
    </div>
  );
}
