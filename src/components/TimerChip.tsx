import { useGame, usedToday } from '../game/store';
import { dayKey, mmss, timeStatus } from '../game/rules';

/** Time left today (or grace time to finish the episode). */
export function useTimeStatus() {
  const used = useGame(usedToday);
  const limit = useGame((g) => g.s.profile?.settings.dailyLimitMin);
  const extra = useGame((g) => (g.s.daily.day === dayKey(Date.now()) ? g.s.daily.extraMin ?? 0 : 0));
  const start = useGame((g) => g.episodeStartSec);
  return { used, ...timeStatus({ usedSec: used, limitMin: limit, extraMin: extra, episodeStartedAtSec: start }) };
}

export default function TimerChip() {
  const t = useTimeStatus();
  if (t.level === 'unlimited') return null;
  const color = t.level === 'ok' ? 'var(--ink)' : t.level === 'warn10' ? '#d97a00' : '#d62839';
  const bg = t.level === 'ok' ? '#fff' : t.level === 'warn10' ? '#fff3cc' : '#ffe5e8';
  const text = t.level === 'grace' ? `⏰ ${mmss(t.graceLeftSec)}` : `⏱ ${mmss(t.remainingSec)}`;
  return (
    <span className="chip" title={t.level === 'grace' ? 'Time to finish this episode' : 'Time left today'}
      style={{ color, background: bg, borderColor: t.level === 'ok' ? undefined : color, fontVariantNumeric: 'tabular-nums' }}>
      {text}
    </span>
  );
}
