import { motion, type TargetAndTransition } from 'framer-motion';
import { BGS, type Look } from '../game/catalog';
import type { DanceMove } from '../content/schema';

type Props = { look: Look; size?: number; move?: DanceMove | 'idle' | 'cheer'; moveKey?: number; showBg?: boolean; showStick?: boolean };

const ARM_L = { originX: '58px', originY: '140px' };
const ARM_R = { originX: '142px', originY: '140px' };

function poses(move: Props['move']): { body: TargetAndTransition; armL: TargetAndTransition; armR: TargetAndTransition; heart?: boolean } {
  const t = { duration: 0.5 };
  switch (move) {
    case 'hands-up': return { body: { y: 0, transition: t }, armL: { rotate: 160, transition: t }, armR: { rotate: -160, transition: t } };
    case 'hands-down': return { body: { y: 0, transition: t }, armL: { rotate: 0, transition: t }, armR: { rotate: 0, transition: t } };
    case 'clap': return { body: { y: 0 }, armL: { rotate: [0, -55, -20, -55, 0], transition: { duration: 0.8 } }, armR: { rotate: [0, 55, 20, 55, 0], transition: { duration: 0.8 } } };
    case 'jump': return { body: { y: [0, -36, 0], transition: { duration: 0.55 } }, armL: { rotate: [0, 120, 0], transition: { duration: 0.55 } }, armR: { rotate: [0, -120, 0], transition: { duration: 0.55 } } };
    case 'turn-left': return { body: { x: [0, -24, -24, 0], scaleX: [1, -1, -1, 1], transition: { duration: 0.9 } }, armL: { rotate: 20 }, armR: { rotate: -20 } };
    case 'turn-right': return { body: { x: [0, 24, 24, 0], scaleX: [1, -1, -1, 1], transition: { duration: 0.9 } }, armL: { rotate: 20 }, armR: { rotate: -20 } };
    case 'step-left': return { body: { x: [0, -34, -34, 0], transition: { duration: 0.9 } }, armL: { rotate: [0, 70, 0] }, armR: { rotate: 0 } };
    case 'step-right': return { body: { x: [0, 34, 34, 0], transition: { duration: 0.9 } }, armL: { rotate: 0 }, armR: { rotate: [0, -70, 0] } };
    case 'wave': return { body: { y: 0 }, armL: { rotate: 0 }, armR: { rotate: [-150, -120, -150, -120, -150, 0], transition: { duration: 1.1 } } };
    case 'spin': return { body: { scaleX: [1, 0.1, -1, 0.1, 1], rotate: [0, 0, 0, 0, 0], transition: { duration: 0.8 } }, armL: { rotate: [0, 90, 0] }, armR: { rotate: [0, -90, 0] } };
    case 'finger-heart': return { body: { y: 0 }, armL: { rotate: 0 }, armR: { rotate: [0, -135, -135, -135, 0], transition: { duration: 1.2 } }, heart: true };
    case 'pose': return { body: { rotate: [0, -6, -6, 0], transition: { duration: 1.1 } }, armL: { rotate: [0, -35, -35, 0], transition: { duration: 1.1 } }, armR: { rotate: [0, -165, -165, 0], transition: { duration: 1.1 } } };
    case 'cheer': return { body: { y: [0, -18, 0, -18, 0], transition: { duration: 0.9 } }, armL: { rotate: [0, 150, 120, 150, 0], transition: { duration: 0.9 } }, armR: { rotate: [0, -150, -120, -150, 0], transition: { duration: 0.9 } } };
    default: return { body: { y: [0, -3, 0], transition: { duration: 2.4, repeat: Infinity } }, armL: { rotate: 0 }, armR: { rotate: 0 } };
  }
}

function hairBack(style: string, c: string) {
  switch (style) {
    case 'long': return <path d="M46 82 Q44 30 100 26 Q156 30 154 82 L160 190 Q130 200 100 196 Q70 200 40 190 Z" fill={c} />;
    case 'wavy': return <path d="M46 82 Q44 30 100 26 Q156 30 154 82 Q166 120 152 150 Q164 175 146 186 L54 186 Q36 175 48 150 Q34 120 46 82 Z" fill={c} />;
    case 'pony': return <path d="M140 60 Q186 70 176 150 Q170 120 150 96 Z" fill={c} />;
    case 'twin': return <g fill={c}><path d="M50 70 Q10 90 26 170 Q36 130 56 110 Z" /><path d="M150 70 Q190 90 174 170 Q164 130 144 110 Z" /></g>;
    case 'bob': return <path d="M44 84 Q42 30 100 26 Q158 30 156 84 L158 128 Q100 140 42 128 Z" fill={c} />;
    default: return null;
  }
}

function hairFront(style: string, c: string) {
  const fringe = <path d="M48 80 Q50 32 100 30 Q150 32 152 80 Q138 58 120 64 Q104 50 86 62 Q66 54 48 80 Z" fill={c} />;
  switch (style) {
    case 'short': return <path d="M48 84 Q46 30 100 28 Q154 30 152 84 Q146 60 130 58 Q110 44 90 56 Q64 50 48 84 Z" fill={c} />;
    case 'buns': return <g fill={c}><circle cx="56" cy="36" r="20" /><circle cx="144" cy="36" r="20" />{fringe}</g>;
    case 'pony': return <g fill={c}>{fringe}<circle cx="146" cy="58" r="9" fill="#ff5fa2" /></g>;
    case 'twin': return <g>{fringe}<circle cx="50" cy="72" r="8" fill="#ff5fa2" /><circle cx="150" cy="72" r="8" fill="#ff5fa2" /></g>;
    default: return fringe;
  }
}

function eyes(kind: string) {
  const ink = '#2b2140';
  switch (kind) {
    case 'smile': return <g stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round"><path d="M72 88 Q80 80 88 88" /><path d="M112 88 Q120 80 128 88" /></g>;
    case 'wink': return <g><ellipse cx="80" cy="88" rx="7" ry="9" fill={ink} /><circle cx="83" cy="84" r="2.5" fill="#fff" /><path d="M112 88 Q120 80 128 88" stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" /></g>;
    case 'star': return <g fill="#ff5fa2"><path d="M80 78 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" /><path d="M120 78 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" /></g>;
    default: return <g><ellipse cx="80" cy="88" rx="7.5" ry="10" fill={ink} /><ellipse cx="120" cy="88" rx="7.5" ry="10" fill={ink} /><circle cx="83" cy="84" r="3" fill="#fff" /><circle cx="123" cy="84" r="3" fill="#fff" /><circle cx="78" cy="92" r="1.5" fill="#fff" /><circle cx="118" cy="92" r="1.5" fill="#fff" /></g>;
  }
}

function outfit(kind: string, c: string, skin: string) {
  const dark = 'rgba(0,0,0,0.12)';
  switch (kind) {
    case 'tee': return <g><path d="M64 132 Q100 122 136 132 L138 200 L62 200 Z" fill={c} /><path d="M86 130 Q100 142 114 130" fill={skin} /></g>;
    case 'jacket': return <g><path d="M62 132 Q100 120 138 132 L140 204 L60 204 Z" fill={c} /><path d="M100 132 L100 204" stroke="#fff" strokeWidth="3" /><path d="M88 130 L100 152 L112 130" fill="#fff" /><circle cx="84" cy="170" r="4" fill="#ffd23f" /><circle cx="116" cy="170" r="4" fill="#ffd23f" /></g>;
    case 'uniform': return <g><path d="M64 132 Q100 122 136 132 L138 200 L62 200 Z" fill="#fff" /><path d="M64 132 L80 132 L76 200 L62 200 Z M136 132 L120 132 L124 200 L138 200 Z" fill={c} /><path d="M94 134 L100 160 L106 134 Z" fill="#ff4d4d" /><path d="M62 184 L138 184 L142 206 L58 206 Z" fill={c} /></g>;
    case 'dress': return <g><path d="M70 132 Q100 124 130 132 L132 168 L150 212 L50 212 L68 168 Z" fill={c} /><path d="M68 168 L132 168" stroke={dark} strokeWidth="4" /><circle cx="100" cy="150" r="5" fill="#fff" /></g>;
    case 'spots': return <g><path d="M64 132 Q100 122 136 132 L138 204 L62 204 Z" fill={c} /><path d="M100 132 L100 204" stroke="#111" strokeWidth="3" />{[[78, 148], [118, 152], [86, 178], [124, 182], [72, 196], [108, 196]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5.5" fill="#111" />)}</g>;
    case 'cape': return <g><path d="M60 134 L36 214 L164 214 L140 134 Z" fill={c} opacity="0.85" /><path d="M64 132 Q100 122 136 132 L138 204 L62 204 Z" fill="#fff" /><path d="M86 160 l14 -12 14 12 -14 14z" fill={c} /></g>;
    case 'track': return <g><path d="M62 132 Q100 120 138 132 L140 204 L60 204 Z" fill={c} /><path d="M70 134 L70 204 M130 134 L130 204" stroke="#fff" strokeWidth="5" /><path d="M100 134 L100 204" stroke={dark} strokeWidth="3" /></g>;
    default: return <g><path d="M60 134 Q100 118 140 134 L142 206 L58 206 Z" fill={c} /><path d="M78 128 Q100 150 122 128" fill="none" stroke={dark} strokeWidth="6" /><rect x="82" y="176" width="36" height="16" rx="6" fill={dark} /></g>;
  }
}

function accessory(kind: string) {
  switch (kind) {
    case 'clip': return <path d="M140 52 l4 9 10 1 -7 7 2 10 -9 -5 -9 5 2 -10 -7 -7 10 -1z" fill="#ffd23f" stroke="#e6a800" strokeWidth="1.5" />;
    case 'bow': return <g fill="#ff5fa2"><path d="M100 30 L74 16 L76 44 Z" /><path d="M100 30 L126 16 L124 44 Z" /><circle cx="100" cy="30" r="7" fill="#d93f84" /></g>;
    case 'headphones': return <g><path d="M46 84 Q46 22 100 22 Q154 22 154 84" fill="none" stroke="#333" strokeWidth="8" /><rect x="34" y="76" width="18" height="30" rx="8" fill="#ff5fa2" /><rect x="148" y="76" width="18" height="30" rx="8" fill="#ff5fa2" /></g>;
    case 'cap': return <g><path d="M48 62 Q52 22 100 20 Q148 22 152 62 Z" fill="#7c5cff" /><path d="M48 62 Q20 64 26 72 L100 66 Z" fill="#5a3ee0" /><circle cx="100" cy="22" r="5" fill="#fff" /></g>;
    case 'crown': return <path d="M72 34 L80 10 L92 28 L100 6 L108 28 L120 10 L128 34 Z" fill="#ffd23f" stroke="#e6a800" strokeWidth="2" />;
    case 'mask': return <g><path d="M58 80 Q60 70 80 72 Q96 74 100 82 Q104 74 120 72 Q140 70 142 80 Q140 98 120 98 Q106 98 100 90 Q94 98 80 98 Q60 98 58 80 Z" fill="var(--mask, #e8283a)" opacity="0.92" /><ellipse cx="80" cy="86" rx="9" ry="8" fill="#fff" opacity="0.85" /><ellipse cx="120" cy="86" rx="9" ry="8" fill="#fff" opacity="0.85" /></g>;
    case 'beret': return <g><ellipse cx="96" cy="32" rx="52" ry="18" fill="#1f1f3a" /><circle cx="96" cy="14" r="5" fill="#1f1f3a" /></g>;
    case 'mic': return <g><path d="M52 96 Q60 118 82 118" fill="none" stroke="#333" strokeWidth="3" /><circle cx="84" cy="118" r="4" fill="#333" /></g>;
    default: return null;
  }
}

function lightstick(kind: string) {
  const glow = '#ff8fc4';
  const head = kind === 'star'
    ? <path d="M0 -26 l7 14 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2z" fill="#fff7b0" stroke="#ffc93c" strokeWidth="2" />
    : kind === 'round' ? <circle cx="0" cy="-12" r="15" fill="#e7e1ff" stroke="#7c5cff" strokeWidth="3" />
      : kind === 'bunny' ? <g><ellipse cx="-7" cy="-30" rx="5" ry="12" fill="#ffe3f0" stroke={glow} strokeWidth="2" /><ellipse cx="7" cy="-30" rx="5" ry="12" fill="#ffe3f0" stroke={glow} strokeWidth="2" /><circle cx="0" cy="-12" r="14" fill="#ffe3f0" stroke={glow} strokeWidth="3" /></g>
        : <path d="M0 -2 C -22 -16 -14 -34 0 -24 C 14 -34 22 -16 0 -2 Z" fill="#ffd0e6" stroke={glow} strokeWidth="3" />;
  return <g><rect x="-4" y="-2" width="8" height="30" rx="4" fill="#ddd" /><circle cx="0" cy="-12" r="22" fill={glow} opacity="0.25" />{head}</g>;
}

export default function Avatar({ look, size = 180, move = 'idle', moveKey = 0, showBg = true, showStick = true }: Props) {
  const p = poses(move);
  const [bg1, bg2] = BGS[look.bg] ?? BGS.pink;
  const gid = `bg-${look.bg}`;
  return (
    <svg viewBox="0 0 200 260" width={size} height={size * 1.3} role="img" aria-label="Your avatar" style={{ overflow: 'visible' }}>
      {showBg && (
        <>
          <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={bg1} /><stop offset="1" stopColor={bg2} /></linearGradient></defs>
          <rect x="0" y="0" width="200" height="260" rx="28" fill={`url(#${gid})`} />
          {look.bg === 'paris' && <path d="M160 250 L172 150 L176 120 L178 96 L180 120 L184 150 L196 250 L188 250 L182 196 L174 196 L168 250 Z M170 170 L190 170" fill="#1d1a45" opacity="0.7" stroke="#1d1a45" strokeWidth="2" />}
          {(look.bg === 'night' || look.bg === 'galaxy' || look.bg === 'paris') && [20, 60, 170, 150, 35].map((x, i) => <circle key={i} cx={x} cy={20 + i * 37} r="2" fill="#fff" opacity="0.8" />)}
        </>
      )}
      <motion.g key={`b-${move}-${moveKey}`} animate={p.body} style={{ originX: '100px', originY: '200px' }}>
        <g fill={look.skin}>
          <rect x="80" y="196" width="16" height="46" rx="7" />
          <rect x="104" y="196" width="16" height="46" rx="7" />
        </g>
        <g fill="#fff"><rect x="76" y="238" width="24" height="12" rx="6" /><rect x="100" y="238" width="24" height="12" rx="6" /></g>
        {hairBack(look.hair, look.hairColor)}
        <motion.g key={`l-${move}-${moveKey}`} animate={p.armL} style={ARM_L}>
          <rect x="50" y="134" width="16" height="54" rx="8" fill={look.outfitColor} stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
          <circle cx="58" cy="190" r="9" fill={look.skin} />
        </motion.g>
        {outfit(look.outfit, look.outfitColor, look.skin)}
        <motion.g key={`r-${move}-${moveKey}`} animate={p.armR} style={ARM_R}>
          <rect x="134" y="134" width="16" height="54" rx="8" fill={look.outfitColor} stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
          <circle cx="142" cy="190" r="9" fill={look.skin} />
          {showStick && <g transform="translate(146 194)">{lightstick(look.stick)}</g>}
        </motion.g>
        <rect x="90" y="118" width="20" height="16" rx="6" fill={look.skin} />
        <circle cx="100" cy="80" r="54" fill={look.skin} />
        {eyes(look.eyes)}
        <ellipse cx="70" cy="104" rx="9" ry="5" fill="#ff8fb1" opacity="0.55" />
        <ellipse cx="130" cy="104" rx="9" ry="5" fill="#ff8fb1" opacity="0.55" />
        <path d="M92 108 Q100 116 108 108" stroke="#2b2140" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        {hairFront(look.hair, look.hairColor)}
        <g style={{ ['--mask' as string]: look.outfitColor }}>{accessory(look.acc)}</g>
        {look.acc === 'mask' && eyes(look.eyes)}
        {p.heart && (
          <motion.text key={`h-${moveKey}`} x="150" y="70" fontSize="30" initial={{ opacity: 0, y: 70 }} animate={{ opacity: [0, 1, 1, 0], y: [70, 40, 20, 0] }} transition={{ duration: 1.2 }}>💗</motion.text>
        )}
      </motion.g>
    </svg>
  );
}
