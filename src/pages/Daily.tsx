import { useCallback, useMemo } from 'react';
import { LessonPlayer } from './Lesson';
import { useGame, type FinishOutcome } from '../game/store';
import { dailyMission, DAILY_BONUS } from '../game/daily';
import { dayKey } from '../game/rules';
import { speak } from '../lib/tts';

/** Today's Paris mission: same all day, new tomorrow. */
export function useDailyMission() {
  const srs = useGame((g) => g.s.srs);
  const progress = useGame((g) => g.s.progress);
  const day = dayKey(Date.now());
  // Build from what was known when the day started being played: stable while the child plays.
  return useMemo(() => {
    const done = new Set(Object.entries(progress).filter(([, v]) => v.stars > 0).map(([k]) => k));
    return dailyMission(day, Object.keys(srs), done);
  }, [day]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function Daily() {
  const m = useDailyMission();
  const update = useGame((g) => g.update);
  const bonusTaken = useGame((g) => !!g.s.daily.missionBonus);

  const onFinished = useCallback((out: FinishOutcome) => {
    if (out.stars === 0 || bonusTaken) return 0;
    update((s) => ({ ...s, hearts: s.hearts + DAILY_BONUS, daily: { ...s.daily, missionBonus: true } }));
    return DAILY_BONUS;
  }, [bonusTaken, update]);

  const intro = (
    <div className="card col" style={{ alignItems: 'center', background: 'linear-gradient(160deg, #2b2a6b, #ff8fa3)', color: '#fff', borderColor: '#ff3b4e', maxWidth: 520 }}>
      <div className="tiny" style={{ fontWeight: 800, opacity: 0.9 }}>🗼 MISSION OF THE DAY · МИССИЯ ДНЯ</div>
      <div style={{ fontSize: 72 }}>{m.mission.emoji}</div>
      <h1 className="title-l">{m.mission.title}</h1>
      <div className="row" style={{ gap: 10, textAlign: 'left' }}>
        <div style={{ fontSize: 40 }}>🐞</div>
        <div className="card" style={{ color: 'var(--ink)', fontWeight: 800, fontSize: 18 }}>
          Pip: “{m.mission.story}”
          <button className="icon-btn" style={{ marginLeft: 8, width: 36, height: 36, fontSize: 18 }} onClick={() => void speak(m.mission.story)} aria-label="Listen">🔊</button>
          <div className="small muted" style={{ fontWeight: 700 }}>{m.mission.ru}</div>
        </div>
      </div>
      <div className="chip" style={{ color: 'var(--ink)' }}>{bonusTaken ? '✅ Done today — play again for fun!' : `🎁 Bonus: +${DAILY_BONUS} ❤️`}</div>
    </div>
  );
  return <LessonPlayer key={m.id} episode={m.episode} id={m.id} intro={intro} onFinished={onFinished} />;
}
