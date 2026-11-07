import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { FREE_ITEMS, type DormPlacement, type Look } from './catalog';
import { pickCard, type Card } from './cards';
import {
  cardDrop, dayKey, questsForDay, QUEST_CHEST, QUEST_REWARD, rankFor, rewardsFor, srsUpdate, starsFor, streakOnActive,
  type EpisodeKind, type QuestMetric, type SrsEntry,
} from './rules';
import { supabase } from '../lib/supabase';

export type Skill = 'listening' | 'reading' | 'writing' | 'speaking' | 'maths';
export type ParentTask = { id: string; kind: 'write' | 'draw' | 'speak' | 'notebook'; prompt: string; ru?: string; reward: number; createdAt: number; doneAt?: number | null };
export type Tally = { c: number; t: number };

export type GameState = {
  version: 1;
  updatedAt: number;
  /** Set when the parent starts over: older snapshots from other devices are ignored. */
  resetAt?: number;
  /** Account the saved progress belongs to (cloud mode): progress of another account is never mixed in. */
  owner?: string;
  profile: {
    name: string;
    createdAt: number;
    pinHash: string | null;
    look: Look;
    dorm: DormPlacement[];
    /** Wall and floor per room. */
    dormStyle?: Record<string, { wall: string; floor: string }>;
    /** Shop item the child is saving hearts for. */
    wish?: string | null;
    settings: { dailyLimitMin: number | null; muted: boolean; voiceRate: number; birthday?: string | null; voiceName?: string | null; hoverTranslate?: 'all' | 'practice' | 'off' };
  } | null;
  fans: number;
  hearts: number;
  streak: { streak: number; lastActive: string | null; freezeWeek: string | null };
  progress: Record<string, { stars: number; best: number; attempts: number; completedAt: number | null }>;
  srs: Record<string, SrsEntry>;
  inventory: string[];
  furniture: string[];
  cards: Record<string, number>;
  forcedWorlds: string[];
  daily: { day: string; metrics: Partial<Record<QuestMetric, number>>; claimed: string[]; chest: boolean; missionBonus?: boolean; extraMin?: number };
  minutes: Record<string, number>;
  /** Active study seconds per day (tab visible and child active). */
  activeSec?: Record<string, number>;
  skills: Record<Skill, Tally>;
  mistakes: Record<string, number>;
  /** When each word was first met (ms). */
  wordsSeen?: Record<string, number>;
  /** Lifetime counters of quest metrics (chants sung, drawings, words reviewed...). */
  totals?: Partial<Record<QuestMetric, number>>;
  /** Earned badges: id -> when (ms). */
  badges?: Record<string, number>;
  /** Mini-game records. */
  games?: { rhythmBest?: number };
  /** Year the birthday gift was last given. */
  birthdayGift?: number;
  /** Tasks written by the parent for the child. */
  parentTasks?: ParentTask[];
};

export const emptyState = (): GameState => ({
  version: 1, updatedAt: 0, profile: null, fans: 0, hearts: 30,
  streak: { streak: 0, lastActive: null, freezeWeek: null },
  progress: {}, srs: {}, inventory: [...FREE_ITEMS], furniture: ['bed', 'desk', 'chair'], cards: {}, forcedWorlds: [],
  daily: { day: dayKey(Date.now()), metrics: {}, claimed: [], chest: false }, minutes: {},
  skills: { listening: { c: 0, t: 0 }, reading: { c: 0, t: 0 }, writing: { c: 0, t: 0 }, speaking: { c: 0, t: 0 }, maths: { c: 0, t: 0 } },
  mistakes: {},
});

/** Per-day maximum: time on another device is never lost or double counted. */
function maxPerDay(a: Record<string, number>, b: Record<string, number>) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(v, out[k] ?? 0);
  return out;
}

/** Merge two snapshots (e.g. two devices): newer wins for scalars, collections are unioned with best values. */
export function mergeStates(a: GameState, b: GameState): GameState {
  const [base, other] = a.updatedAt >= b.updatedAt ? [a, b] : [b, a];
  if (base.resetAt && other.updatedAt <= base.resetAt) return base;
  const progress = { ...other.progress };
  for (const [k, v] of Object.entries(base.progress)) {
    const o = progress[k];
    progress[k] = o ? { stars: Math.max(v.stars, o.stars), best: Math.max(v.best, o.best), attempts: Math.max(v.attempts, o.attempts), completedAt: v.completedAt ?? o.completedAt } : v;
  }
  const cards = { ...other.cards };
  for (const [k, v] of Object.entries(base.cards)) cards[k] = Math.max(v, cards[k] ?? 0);
  return {
    ...base,
    profile: base.profile ?? other.profile,
    progress,
    srs: { ...other.srs, ...base.srs },
    cards,
    inventory: [...new Set([...base.inventory, ...other.inventory])],
    furniture: [...new Set([...base.furniture, ...other.furniture])],
    forcedWorlds: [...new Set([...base.forcedWorlds, ...other.forcedWorlds])],
    minutes: maxPerDay(other.minutes, base.minutes),
    activeSec: maxPerDay(other.activeSec ?? {}, base.activeSec ?? {}),
    wordsSeen: { ...other.wordsSeen, ...base.wordsSeen },
    parentTasks: base.parentTasks ?? other.parentTasks,
    badges: { ...other.badges, ...base.badges },
    totals: Object.fromEntries([...new Set([...Object.keys(base.totals ?? {}), ...Object.keys(other.totals ?? {})])]
      .map((k) => [k, Math.max(base.totals?.[k as QuestMetric] ?? 0, other.totals?.[k as QuestMetric] ?? 0)])),
    daily: base.daily.day === other.daily.day
      ? { ...base.daily, extraMin: Math.max(base.daily.extraMin ?? 0, other.daily.extraMin ?? 0) }
      : base.daily,
  };
}

export type EpisodeResult = {
  correct: number;
  total: number;
  skills: Partial<Record<Skill, Tally>>;
  words: { id: string; correct: boolean }[];
  metrics: Partial<Record<QuestMetric, number>>;
};

export type FinishOutcome = { stars: number; fans: number; hearts: number; firstTime: boolean; card: Card | null; rankUp: string | null };

type Store = {
  s: GameState;
  ready: boolean;
  syncing: 'idle' | 'saving' | 'offline' | 'error';
  userId: string | null;
  load: (userId: string | null) => Promise<void>;
  update: (fn: (s: GameState) => GameState) => void;
  finishEpisode: (id: string, kind: EpisodeKind, r: EpisodeResult) => FinishOutcome;
  reviewWords: (results: { id: string; correct: boolean }[]) => void;
  addMetric: (m: QuestMetric, n?: number) => void;
  claimQuest: (id: string) => void;
  claimChest: () => void;
  buy: (id: string, price: number, kind: 'look' | 'furniture') => boolean;
  addMinute: () => void;
  addSeconds: (n: number) => void;
  /** Seconds counted but not yet saved (flushed every 30 s). Not persisted. */
  liveSec: number;
  /** Seconds used today when the current episode started; null = not in an episode. Not persisted. */
  episodeStartSec: number | null;
};

const KEY = 'kstar-state-v1';
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function rollDay(s: GameState): GameState {
  const today = dayKey(Date.now());
  return s.daily.day === today ? s : { ...s, daily: { day: today, metrics: {}, claimed: [], chest: false } };
}

function bumpMetrics(s: GameState, m: Partial<Record<QuestMetric, number>>): GameState {
  const metrics = { ...s.daily.metrics };
  const totals = { ...s.totals };
  for (const [k, v] of Object.entries(m)) {
    metrics[k as QuestMetric] = (metrics[k as QuestMetric] ?? 0) + (v ?? 0);
    totals[k as QuestMetric] = (totals[k as QuestMetric] ?? 0) + (v ?? 0);
  }
  return { ...s, daily: { ...s.daily, metrics }, totals };
}

function markSeen(seen: Record<string, number> | undefined, ids: string[], now: number) {
  const out = { ...seen };
  for (const id of ids) if (!out[id]) out[id] = now;
  return out;
}

export const useGame = create<Store>((set, get) => ({
  s: emptyState(),
  ready: false,
  syncing: 'idle',
  userId: null,
  liveSec: 0,
  episodeStartSec: null,

  load: async (userId) => {
    let local = ((await idbGet(KEY)) as GameState | undefined) ?? emptyState();
    // Progress saved on this device for another (or a deleted) account must not leak into this one.
    if (supabase && userId && local.owner !== userId) local = emptyState();
    if (supabase && userId) {
      try {
        const { data, error } = await supabase.from('kid_state').select('state').eq('user_id', userId).maybeSingle();
        if (error) throw error;
        if (data?.state) local = mergeStates(local, data.state as GameState);
      } catch {
        set({ syncing: 'offline' });
      }
    }
    set({ s: { ...rollDay(local), owner: userId ?? local.owner }, ready: true, userId });
  },

  update: (fn) => {
    const next = { ...fn(rollDay(get().s)), updatedAt: Date.now() };
    set({ s: next });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void persist(), 600);
  },

  finishEpisode: (id, kind, r) => {
    const before = get().s;
    const prev = before.progress[id];
    const firstTime = !prev || prev.stars === 0;
    const stars = starsFor(r.correct, r.total);
    const { fans, hearts } = rewardsFor(kind, r.correct, stars, firstTime);
    const drop = cardDrop(kind, stars, firstTime, Math.random());
    const card = drop ? pickCard(drop, before.cards, Math.random()) : null;
    const oldRank = rankFor(before.fans).rank.id;
    const newRank = rankFor(before.fans + fans).rank;
    get().update((s) => {
      const now = Date.now();
      const skills = { ...s.skills };
      for (const [k, v] of Object.entries(r.skills)) {
        const cur = skills[k as Skill] ?? { c: 0, t: 0 }; // older saves have no maths tally
        skills[k as Skill] = { c: cur.c + (v?.c ?? 0), t: cur.t + (v?.t ?? 0) };
      }
      const srs = { ...s.srs };
      const mistakes = { ...s.mistakes };
      for (const w of r.words) {
        srs[w.id] = srsUpdate(srs[w.id], w.correct, now);
        if (!w.correct) mistakes[w.id] = (mistakes[w.id] ?? 0) + 1;
      }
      let next: GameState = {
        ...s,
        fans: s.fans + fans,
        hearts: s.hearts + hearts,
        streak: stars > 0 ? streakOnActive(s.streak, now) : s.streak,
        progress: {
          ...s.progress,
          [id]: {
            stars: Math.max(stars, prev?.stars ?? 0),
            best: Math.max(r.total ? r.correct / r.total : 1, prev?.best ?? 0),
            attempts: (prev?.attempts ?? 0) + 1,
            completedAt: stars > 0 ? (prev?.completedAt ?? now) : prev?.completedAt ?? null,
          },
        },
        srs, skills, mistakes,
        wordsSeen: markSeen(s.wordsSeen, r.words.map((w) => w.id), now),
        cards: card ? { ...s.cards, [card.id]: (s.cards[card.id] ?? 0) + 1 } : s.cards,
      };
      next = bumpMetrics(next, { ...r.metrics, episodes: stars > 0 ? 1 : 0, threeStars: stars === 3 ? 1 : 0, fans });
      return next;
    });
    return { stars, fans, hearts, firstTime, card, rankUp: newRank.id !== oldRank ? newRank.name : null };
  },

  reviewWords: (results) => get().update((s) => {
    const now = Date.now();
    const srs = { ...s.srs };
    const mistakes = { ...s.mistakes };
    let correct = 0;
    for (const w of results) {
      srs[w.id] = srsUpdate(srs[w.id], w.correct, now);
      if (w.correct) correct++; else mistakes[w.id] = (mistakes[w.id] ?? 0) + 1;
    }
    const fans = correct * 5;
    return bumpMetrics({ ...s, srs, mistakes, wordsSeen: markSeen(s.wordsSeen, results.map((w) => w.id), now), fans: s.fans + fans, streak: results.length >= 5 ? streakOnActive(s.streak, now) : s.streak }, { reviewed: results.length, fans });
  }),

  addMetric: (m, n = 1) => get().update((s) => bumpMetrics(s, { [m]: n })),

  claimQuest: (id) => get().update((s) => {
    if (s.daily.claimed.includes(id)) return s;
    const q = questsForDay(s.daily.day).find((x) => x.id === id);
    if (!q || (s.daily.metrics[q.metric] ?? 0) < q.goal) return s;
    return { ...s, hearts: s.hearts + QUEST_REWARD, daily: { ...s.daily, claimed: [...s.daily.claimed, id] } };
  }),

  claimChest: () => get().update((s) => (s.daily.chest || s.daily.claimed.length < 3 ? s : { ...s, hearts: s.hearts + QUEST_CHEST, daily: { ...s.daily, chest: true } })),

  buy: (id, price, kind) => {
    const s = get().s;
    const owned = kind === 'look' ? s.inventory : s.furniture;
    if (owned.includes(id)) return true;
    if (s.hearts < price) return false;
    get().update((x) => (kind === 'look'
      ? { ...x, hearts: x.hearts - price, inventory: [...x.inventory, id] }
      : { ...x, hearts: x.hearts - price, furniture: [...x.furniture, id] }));
    return true;
  },

  addSeconds: (n) => get().update((s) => {
    const d = dayKey(Date.now());
    const sec = (s.activeSec?.[d] ?? 0) + n;
    return { ...s, activeSec: { ...s.activeSec, [d]: sec }, minutes: { ...s.minutes, [d]: Math.max(s.minutes[d] ?? 0, Math.round(sec / 60)) } };
  }),

  addMinute: () => get().update((s) => {
    const d = dayKey(Date.now());
    return { ...s, minutes: { ...s.minutes, [d]: (s.minutes[d] ?? 0) + 1 } };
  }),
}));

async function persist() {
  const { s, userId } = useGame.getState();
  await idbSet(KEY, s);
  if (!supabase || !userId) return;
  if (!navigator.onLine) { useGame.setState({ syncing: 'offline' }); return; }
  useGame.setState({ syncing: 'saving' });
  const { error } = await supabase.from('kid_state').upsert({ user_id: userId, state: s, updated_at: new Date(s.updatedAt).toISOString() });
  useGame.setState({ syncing: error ? 'error' : 'idle' });
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void persist());
}

export const persistNow = persist;

/** Wipes the child's profile and progress on this device and in the cloud (parent action). */
export async function resetEverything() {
  const now = Date.now();
  const fresh: GameState = { ...emptyState(), updatedAt: now, resetAt: now, owner: useGame.getState().userId ?? undefined };
  useGame.setState({ s: fresh });
  await idbSet(KEY, fresh);
  const { userId } = useGame.getState();
  if (supabase && userId) {
    await supabase.from('kid_state').upsert({ user_id: userId, state: fresh, updated_at: new Date(now).toISOString() });
    const { data } = await supabase.from('submissions').select('storage_path').not('storage_path', 'is', null);
    const paths = (data ?? []).map((r) => r.storage_path as string);
    if (paths.length) await supabase.storage.from('submissions').remove(paths);
    await supabase.from('submissions').delete().eq('user_id', userId);
  }
}

/** Seconds studied today, including not-yet-saved live seconds. */
export const usedToday = (g: { s: GameState; liveSec: number }) => (g.s.activeSec?.[dayKey(Date.now())] ?? 0) + g.liveSec;

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`kstar:${text}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
