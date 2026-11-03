import { useState } from 'react';
import Avatar from '../components/Avatar';
import { DEFAULT_LOOK, SHOP, type Look } from '../game/catalog';
import { sha256, useGame } from '../game/store';
import { speak } from '../lib/tts';
import { sfx } from '../lib/sfx';

const FREE = (slot: keyof Look) => SHOP.filter((i) => i.slot === slot && i.price === 0);

export default function Onboarding() {
  const update = useGame((g) => g.update);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [pin, setPin] = useState('');
  const set = (slot: keyof Look, v: string) => { sfx.tap(); setLook({ ...look, [slot]: v }); };

  const finish = async () => {
    const pinHash = await sha256(pin);
    update((s) => ({ ...s, profile: { name: name.trim(), createdAt: Date.now(), pinHash, look, dorm: [{ item: 'bed', x: 0, y: 1 }, { item: 'desk', x: 4, y: 1 }, { item: 'chair', x: 4, y: 2 }], settings: { dailyLimitMin: null, muted: false, voiceRate: 0.9 } } }));
    sfx.levelUp();
    void speak(`Welcome to Star Academy, ${name}!`);
  };

  return (
    <div className="page col" style={{ maxWidth: 620, alignItems: 'center', textAlign: 'center' }}>
      {step === 0 && (
        <>
          <div style={{ fontSize: 80 }}>🌟</div>
          <h1 className="title-xl">Welcome to Star Academy!</h1>
          <p className="muted" style={{ fontSize: 18 }}>Ты — новый трейни K-pop агентства. Учи английский, набирай фанатов, собирай фотокарточки и готовься к дебюту! ✨</p>
          <button className="btn" onClick={() => { void speak('Hello! Welcome to Star Academy!'); setStep(1); }}>Let's go! →</button>
        </>
      )}
      {step === 1 && (
        <>
          <h1 className="title-l">What's your name?</h1>
          <div className="muted">Как тебя зовут? (можно по-английски)</div>
          <input className="field" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={20} style={{ fontSize: 26, textAlign: 'center' }} />
          <button className="btn" disabled={name.trim().length < 2} onClick={() => { void speak(`Nice to meet you, ${name}!`); setStep(2); }}>Next →</button>
        </>
      )}
      {step === 2 && (
        <>
          <h1 className="title-l">Create your trainee!</h1>
          <Avatar look={look} size={190} move="pose" />
          {(['skin', 'hair', 'hairColor', 'eyes', 'outfit', 'outfitColor'] as const).map((slot) => (
            <div key={slot} className="row wrap" style={{ justifyContent: 'center', gap: 6 }}>
              {FREE(slot).map((i) => (
                <button key={i.id} className="chip" onClick={() => set(slot, i.value)} style={{ borderColor: look[slot] === i.value ? 'var(--pink)' : undefined }}>
                  {slot.endsWith('olor') || slot === 'skin' ? <span style={{ width: 18, height: 18, borderRadius: '50%', background: i.value, display: 'inline-block', border: '1px solid #ccc' }} /> : i.emoji} {i.name}
                </button>
              ))}
            </div>
          ))}
          <div className="muted small">More clothes and colours in the shop later! · Больше вещей — в магазине за сердечки.</div>
          <button className="btn" onClick={() => setStep(3)}>I love it! →</button>
        </>
      )}
      {step === 3 && (
        <>
          <div style={{ fontSize: 56 }}>🔐</div>
          <h1 className="title-l">Для родителя</h1>
          <div className="muted">Придумайте PIN-код (4–8 цифр) для родительской панели: там прогресс, проверка рисунков и записей, настройки.</div>
          <input className="field" inputMode="numeric" type="password" value={pin} maxLength={8} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} style={{ fontSize: 28, textAlign: 'center', letterSpacing: 8, maxWidth: 260 }} />
          <button className="btn violet" disabled={pin.length < 4} onClick={() => void finish()}>Start! 🚀</button>
        </>
      )}
    </div>
  );
}
