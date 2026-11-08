import { useCallback, useMemo } from 'react';
import { LessonPlayer } from './Lesson';
import { useGame, type FinishOutcome } from '../game/store';
import { dailyCase, CASE_BONUS } from '../game/dailyCase';
import { dayKey } from '../game/rules';
import { speak } from '../lib/tts';
import { subName } from '../lib/util';

/** Today's Pine Hollow case: same all day, new tomorrow. */
export function useDailyCase() {
  const srs = useGame((g) => g.s.srs);
  const day = dayKey(Date.now());
  // Built from the words known when the day started being played: stable while the child plays.
  return useMemo(() => dailyCase(day, Object.keys(srs)), [day]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function DailyCase() {
  const c = useDailyCase();
  const update = useGame((g) => g.update);
  const name = useGame((g) => g.s.profile?.name ?? '');
  const bonusTaken = useGame((g) => !!g.s.daily.caseBonus);

  const onFinished = useCallback((out: FinishOutcome) => {
    if (out.stars === 0 || bonusTaken) return 0;
    update((s) => ({ ...s, hearts: s.hearts + CASE_BONUS, daily: { ...s.daily, caseBonus: true } }));
    return CASE_BONUS;
  }, [bonusTaken, update]);

  const intro = (
    <div className="journal col" style={{ alignItems: 'center', maxWidth: 520, textAlign: 'center' }}>
      <div className="tiny" style={{ fontWeight: 800, letterSpacing: 1 }}>🌲 MYSTERY OF THE DAY · ДЕЛО ДНЯ</div>
      <div style={{ fontSize: 72 }}>{c.story.emoji}</div>
      <h1 className="title-l">{c.story.title}</h1>
      <div className="row" style={{ gap: 10, textAlign: 'left' }}>
        <div style={{ fontSize: 40 }}>🦉</div>
        <div className="card" style={{ fontWeight: 800, fontSize: 17 }}>
          Hoot: “{subName(c.story.intro, name)}”
          <button className="icon-btn" style={{ marginLeft: 8, width: 36, height: 36, fontSize: 18 }} onClick={() => void speak(subName(c.story.intro, name))} aria-label="Listen">🔊</button>
          <div className="small muted" style={{ fontWeight: 700 }}>{subName(c.story.introRu, name)}</div>
        </div>
      </div>
      <div className="chip">{bonusTaken ? '✅ Solved today — play again for fun!' : `🎁 Bonus: +${CASE_BONUS} ❤️`}</div>
    </div>
  );
  return <LessonPlayer key={c.id} episode={c.episode} id={c.id} intro={intro} onFinished={onFinished} />;
}
