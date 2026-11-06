import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { activeEvent, isBirthdayToday, isBirthdayWeek, nextEvent } from '../game/events';
import { useGame } from '../game/store';
import { sfx } from '../lib/sfx';
import { speak } from '../lib/tts';

export const BIRTHDAY_GIFT = 100;

/** Home banner: running seasonal event (or the next one), and birthday greetings with a yearly gift. */
export default function EventBanner() {
  const s = useGame((g) => g.s);
  const update = useGame((g) => g.update);
  const name = s.profile?.name ?? '';
  const birthday = s.profile?.settings.birthday;
  const today = isBirthdayToday(birthday);
  const year = new Date().getFullYear();
  const giftDue = today && s.birthdayGift !== year;

  useEffect(() => {
    if (!giftDue) return;
    update((x) => ({ ...x, hearts: x.hearts + BIRTHDAY_GIFT, birthdayGift: year }));
    sfx.levelUp(); confetti({ particleCount: 200, spread: 120, origin: { y: 0.3 } });
    void speak(`Happy birthday, ${name}!`);
  }, [giftDue]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isBirthdayWeek(birthday)) {
    return (
      <Link to="/studio" className="card row" style={{ textDecoration: 'none', color: '#fff', background: 'linear-gradient(120deg, #ff5fa2, #7c5cff)', borderColor: '#ff5fa2' }}>
        <div style={{ fontSize: 46 }}>🎂</div>
        <div className="grow">
          <div style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: 22 }}>{today ? `Happy birthday, ${name}! 🎉` : 'Birthday week! 🎈'}</div>
          <div className="small" style={{ fontWeight: 700 }}>{today ? `Coach Mina's gift: +${BIRTHDAY_GIFT} ❤️ · ` : ''}Birthday items in the Style Studio!</div>
        </div>
      </Link>
    );
  }
  const ev = activeEvent();
  if (ev) {
    return (
      <Link to="/studio" className="card row" style={{ textDecoration: 'none', color: '#fff', background: `linear-gradient(120deg, ${ev.colors[0]}, ${ev.colors[1]})`, borderColor: ev.colors[0] }}>
        <div style={{ fontSize: 46 }}>{ev.emoji}</div>
        <div className="grow">
          <div className="tiny" style={{ fontWeight: 800, opacity: 0.9 }}>EVENT · {ev.ru.toUpperCase()}</div>
          <div style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: 20 }}>{ev.name}</div>
          <div className="small" style={{ fontWeight: 700 }}>{ev.greeting}</div>
          <div className="tiny" style={{ fontWeight: 800, marginTop: 2 }}>🛍️ {ev.items.length} limited items until {ev.to.split('-').reverse().join('.')}</div>
        </div>
      </Link>
    );
  }
  const n = nextEvent();
  return (
    <div className="card row" style={{ borderStyle: 'dashed' }}>
      <div style={{ fontSize: 36 }}>{n.event.emoji}</div>
      <div className="grow small"><b>{n.event.name}</b> starts in {n.days} days · {n.event.ru}</div>
    </div>
  );
}
