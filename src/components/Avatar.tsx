import { useId } from 'react';
import { motion, type TargetAndTransition } from 'framer-motion';
import { BGS, fullLook, type Look } from '../game/catalog';
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
    case 'braids': return <g fill={c}><path d="M46 84 Q44 30 100 26 Q156 30 154 84 L150 110 L50 110 Z" />{[0, 1, 2, 3, 4].map((i) => <g key={i}><ellipse cx="52" cy={118 + i * 16} rx="10" ry="9" /><ellipse cx="148" cy={118 + i * 16} rx="10" ry="9" /></g>)}<circle cx="52" cy="200" r="6" fill="#ff5fa2" /><circle cx="148" cy="200" r="6" fill="#ff5fa2" /></g>;
    case 'curly': return <g fill={c}>{[[50, 70], [44, 100], [48, 130], [60, 150], [150, 70], [156, 100], [152, 130], [140, 150], [70, 40], [100, 30], [130, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="22" />)}</g>;
    case 'side': return <g fill={c}><path d="M44 84 Q42 30 100 26 Q158 30 156 84 L150 100 L50 100 Z" /><path d="M150 70 Q196 90 182 180 Q172 140 150 110 Z" /><circle cx="156" cy="74" r="9" fill="#7c5cff" /></g>;
    case 'hime': return <g fill={c}><path d="M44 84 Q42 30 100 26 Q158 30 156 84 L158 200 L136 200 L134 130 L66 130 L64 200 L42 200 Z" /></g>;
    case 'wolf': return <path d="M44 84 Q42 30 100 26 Q158 30 156 84 L162 120 L150 116 L156 150 L140 140 L60 140 L44 150 L50 116 L38 120 Z" fill={c} />;
    case 'mega': return <g fill={c}><path d="M50 60 Q-4 80 14 220 Q30 160 56 112 Z" /><path d="M150 60 Q204 80 186 220 Q170 160 144 112 Z" /></g>;
    case 'topbun': return <path d="M46 84 Q44 34 100 30 Q156 34 154 84 L150 96 L50 96 Z" fill={c} />;
    case 'pixie': return null;
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
    case 'mega': return <g>{fringe}<circle cx="50" cy="66" r="10" fill="#ffd23f" /><circle cx="150" cy="66" r="10" fill="#ffd23f" /></g>;
    case 'topbun': return <g fill={c}><circle cx="100" cy="18" r="22" />{fringe}<rect x="84" y="34" width="32" height="6" rx="3" fill="#ff5fa2" /></g>;
    case 'pixie': return <path d="M46 88 Q44 28 100 26 Q156 28 154 88 Q150 62 132 60 Q122 48 104 54 Q90 46 76 58 Q56 58 46 88 Z" fill={c} />;
    case 'hime': return <g fill={c}><path d="M46 84 Q48 28 100 28 Q152 28 154 84 L154 70 L46 70 Z" /><rect x="52" y="44" width="96" height="26" /></g>;
    case 'curly': return <g fill={c}>{[[64, 50], [86, 44], [110, 44], [134, 50]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="16" />)}</g>;
    case 'wolf': return <path d="M46 88 Q46 28 100 28 Q154 28 154 88 L142 62 L132 78 L122 58 L110 76 L100 56 L88 76 L78 58 L68 78 L58 62 Z" fill={c} />;
    default: return fringe;
  }
}

function eyes(kind: string) {
  const ink = '#2b2140';
  switch (kind) {
    case 'smile': return <g stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round"><path d="M72 88 Q80 80 88 88" /><path d="M112 88 Q120 80 128 88" /></g>;
    case 'wink': return <g><ellipse cx="80" cy="88" rx="7" ry="9" fill={ink} /><circle cx="83" cy="84" r="2.5" fill="#fff" /><path d="M112 88 Q120 80 128 88" stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" /></g>;
    case 'star': return <g fill="#ff5fa2"><path d="M80 78 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" /><path d="M120 78 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" /></g>;
    case 'heart': return <g fill="#ff3d7f"><path d="M80 96 l-9 -9 a5 5 0 0 1 9 -6 a5 5 0 0 1 9 6 z" /><path d="M120 96 l-9 -9 a5 5 0 0 1 9 -6 a5 5 0 0 1 9 6 z" /></g>;
    case 'sleepy': return <g stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round"><path d="M72 88 Q80 94 88 88" /><path d="M112 88 Q120 94 128 88" /></g>;
    case 'happy': return <g stroke={ink} strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M72 92 L80 82 L88 92" /><path d="M112 92 L120 82 L128 92" /></g>;
    case 'cat': return <g><ellipse cx="80" cy="88" rx="7.5" ry="10" fill={ink} /><ellipse cx="120" cy="88" rx="7.5" ry="10" fill={ink} /><circle cx="83" cy="84" r="3" fill="#fff" /><circle cx="123" cy="84" r="3" fill="#fff" /><path d="M70 80 L64 74 M130 80 L136 74" stroke={ink} strokeWidth="3" strokeLinecap="round" /></g>;
    case 'blue': return <g><ellipse cx="80" cy="88" rx="8" ry="10.5" fill="#2f6fd6" /><ellipse cx="120" cy="88" rx="8" ry="10.5" fill="#2f6fd6" /><ellipse cx="80" cy="90" rx="4" ry="5" fill={ink} /><ellipse cx="120" cy="90" rx="4" ry="5" fill={ink} /><circle cx="83" cy="84" r="3" fill="#fff" /><circle cx="123" cy="84" r="3" fill="#fff" /></g>;
    case 'galaxy': return <g><ellipse cx="80" cy="88" rx="8" ry="10.5" fill="#5a2ca0" /><ellipse cx="120" cy="88" rx="8" ry="10.5" fill="#5a2ca0" /><circle cx="78" cy="92" r="3" fill="#ff7eb6" /><circle cx="118" cy="92" r="3" fill="#ff7eb6" /><path d="M83 82 l1.5 3 3 .5 -2 2 .5 3 -3 -1.5 -3 1.5 .5 -3 -2 -2 3 -.5z M123 82 l1.5 3 3 .5 -2 2 .5 3 -3 -1.5 -3 1.5 .5 -3 -2 -2 3 -.5z" fill="#fff" /></g>;
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
    case 'hanbok': return <g><path d="M66 132 Q100 124 134 132 L136 160 L64 160 Z" fill={c} /><path d="M86 132 L100 156 L114 132" fill="#fff" /><path d="M100 150 Q86 162 82 176 M100 150 Q114 162 118 176" stroke="#ff4d6d" strokeWidth="4" fill="none" /><path d="M62 158 L138 158 L160 216 L40 216 Z" fill="#ff8fb1" /><path d="M62 158 L138 158" stroke="#fff" strokeWidth="3" /></g>;
    case 'sailor': return <g><path d="M64 132 Q100 122 136 132 L138 200 L62 200 Z" fill="#fff" /><path d="M64 132 L100 160 L136 132 L136 146 L100 170 L64 146 Z" fill={c} /><path d="M92 160 L100 172 L108 160 Z" fill="#ff4d4d" /><path d="M62 186 L138 186 L146 210 L54 210 Z" fill={c} /></g>;
    case 'overalls': return <g><path d="M64 132 Q100 122 136 132 L138 170 L62 170 Z" fill="#fff" /><path d="M72 150 L128 150 L136 208 L64 208 Z" fill={c} /><path d="M74 150 L78 132 M126 150 L122 132" stroke={c} strokeWidth="6" /><rect x="88" y="160" width="24" height="16" rx="4" fill={dark} /></g>;
    case 'puffer': return <g><path d="M56 134 Q100 116 144 134 L146 206 L54 206 Z" fill={c} />{[150, 168, 186].map((y) => <path key={y} d={`M56 ${y} L144 ${y}`} stroke={dark} strokeWidth="3" />)}<path d="M100 132 L100 206" stroke="#fff" strokeWidth="3" /><path d="M80 126 Q100 116 120 126 L120 136 L80 136 Z" fill={c} stroke={dark} strokeWidth="2" /></g>;
    case 'pyjamas': return <g><path d="M60 134 Q100 120 140 134 L142 206 L58 206 Z" fill={c} />{[[76, 150], [118, 158], [90, 184], [126, 192], [70, 196]].map(([x, y], i) => <path key={i} d={`M${x} ${y} a6 6 0 1 0 6 -6 a4.5 4.5 0 1 1 -6 6z`} fill="#ffe36e" />)}</g>;
    case 'gown': return <g><path d="M72 132 Q100 124 128 132 L130 160 L70 160 Z" fill={c} /><path d="M70 158 L130 158 L172 222 L28 222 Z" fill={c} /><path d="M70 158 Q100 176 130 158 M50 196 Q100 214 150 196" stroke="#fff" strokeWidth="3" fill="none" opacity="0.8" />{[[80, 180], [120, 184], [100, 204], [64, 210], [138, 210]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#fff" />)}<circle cx="100" cy="144" r="6" fill="#ffd23f" /></g>;
    case 'tutu': return <g><path d="M70 132 Q100 124 130 132 L132 172 L68 172 Z" fill={c} /><path d="M40 176 Q70 160 100 168 Q130 160 160 176 Q130 192 100 186 Q70 192 40 176 Z" fill="#fff" opacity="0.9" /><path d="M50 176 Q75 166 100 172 Q125 166 150 176" stroke={c} strokeWidth="3" fill="none" /></g>;
    case 'astro': return <g><path d="M54 134 Q100 116 146 134 L148 210 L52 210 Z" fill="#f2f4f8" stroke="#c9ced6" strokeWidth="2" /><rect x="80" y="152" width="40" height="28" rx="6" fill="#3fa7ff" /><circle cx="90" cy="166" r="4" fill="#ff4d4d" /><circle cx="104" cy="166" r="4" fill="#ffd23f" /><circle cx="114" cy="166" r="3" fill="#2ec4b6" /><path d="M54 190 L148 190" stroke={c} strokeWidth="6" /></g>;
    case 'cheer': return <g><path d="M66 132 Q100 124 134 132 L136 176 L64 176 Z" fill={c} /><path d="M84 132 L100 150 L116 132" fill="#fff" /><text x="100" y="170" fontSize="16" textAnchor="middle" fill="#fff" fontWeight="900">★</text><path d="M60 174 L140 174 L152 210 L48 210 Z" fill="#fff" /><path d="M60 174 L140 174 L146 192 L54 192 Z" fill={c} /></g>;
    case 'sweater': return <g><path d="M58 134 Q100 118 142 134 L144 206 L56 206 Z" fill={c} /><path d="M100 178 l-14 -13 a8 8 0 0 1 14 -10 a8 8 0 0 1 14 10 z" fill="#fff" /><path d="M58 198 L144 198" stroke={dark} strokeWidth="5" /></g>;
    case 'raincoat': return <g><path d="M58 134 Q100 118 142 134 L150 210 L50 210 Z" fill={c} /><path d="M100 136 L100 210" stroke={dark} strokeWidth="3" />{[150, 170, 190].map((y) => <circle key={y} cx="108" cy={y} r="3" fill="#fff" />)}<path d="M64 136 Q100 104 136 136 Q100 124 64 136 Z" fill={c} /></g>;
    case 'idol': return <g><path d="M60 132 Q100 118 140 132 L142 206 L58 206 Z" fill="#1b1033" /><path d="M60 132 L84 132 L100 176 L116 132 L140 132 L142 206 L58 206 Z" fill={c} opacity="0.85" />{[[72, 150], [128, 150], [80, 176], [120, 176], [100, 196], [66, 196], [134, 196]].map(([x, y], i) => <path key={i} d={`M${x} ${y - 5} l1.6 3.4 3.6 .5 -2.6 2.4 .7 3.6 -3.3 -1.8 -3.3 1.8 .7 -3.6 -2.6 -2.4 3.6 -.5z`} fill="#ffd23f" />)}<path d="M84 132 L100 176 L116 132" fill="none" stroke="#ffd23f" strokeWidth="3" /></g>;
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
    case 'catears': return <g><path d="M52 50 L58 10 L84 34 Z" fill="var(--hair)" /><path d="M148 50 L142 10 L116 34 Z" fill="var(--hair)" /><path d="M60 40 L62 20 L76 34 Z M140 40 L138 20 L124 34 Z" fill="#ffb3cf" /></g>;
    case 'bunnyears': return <g><ellipse cx="76" cy="0" rx="12" ry="34" fill="#fff" stroke="#f1dcea" strokeWidth="2" /><ellipse cx="124" cy="0" rx="12" ry="34" fill="#fff" stroke="#f1dcea" strokeWidth="2" /><ellipse cx="76" cy="2" rx="6" ry="24" fill="#ffc2da" /><ellipse cx="124" cy="2" rx="6" ry="24" fill="#ffc2da" /><path d="M58 34 Q100 18 142 34" stroke="#ff8fc4" strokeWidth="6" fill="none" /></g>;
    case 'halo': return <ellipse cx="100" cy="6" rx="34" ry="9" fill="none" stroke="#ffd23f" strokeWidth="6" opacity="0.95" />;
    case 'flowers': return <g>{[[56, 44, '#ff8fc4'], [74, 30, '#ffd23f'], [100, 24, '#c7a6ff'], [126, 30, '#7ee0c3'], [144, 44, '#ff8fc4']].map(([x, y, c], i) => <g key={i}><circle cx={x as number} cy={y as number} r="10" fill={c as string} /><circle cx={x as number} cy={y as number} r="4" fill="#fff" /></g>)}</g>;
    case 'tiara': return <g><path d="M66 36 Q100 22 134 36 L128 40 Q100 30 72 40 Z" fill="#e6e9f0" />{[[78, 30], [100, 18], [122, 30]].map(([x, y], i) => <path key={i} d={`M${x} ${y - 9} l3 6 6.5 1 -4.8 4.5 1.2 6.5 -5.9 -3.2 -5.9 3.2 1.2 -6.5 -4.8 -4.5 6.5 -1z`} fill={i === 1 ? '#ff5fa2' : '#7ee0c3'} stroke="#fff" strokeWidth="1" />)}</g>;
    case 'beanie': return <g><path d="M46 64 Q46 14 100 12 Q154 14 154 64 Z" fill="#7c5cff" /><rect x="44" y="56" width="112" height="14" rx="7" fill="#5a3ee0" /><circle cx="100" cy="10" r="10" fill="#fff" /></g>;
    case 'horns': return <g fill="#ff4d6d"><path d="M64 40 Q58 14 76 6 Q70 24 80 36 Z" /><path d="M136 40 Q142 14 124 6 Q130 24 120 36 Z" /></g>;
    case 'butterflies': return <g>{[[58, 56, '#5cc8ff'], [142, 56, '#ff8fc4'], [126, 36, '#c7a6ff']].map(([x, y, c], i) => <g key={i} transform={`translate(${x} ${y})`}><ellipse cx="-6" cy="0" rx="7" ry="9" fill={c as string} /><ellipse cx="6" cy="0" rx="7" ry="9" fill={c as string} /><rect x="-1.5" y="-7" width="3" height="14" rx="1.5" fill="#2b2140" /></g>)}</g>;
    case 'idolcrown': return <g><path d="M62 38 L70 2 L86 26 L100 -6 L114 26 L130 2 L138 38 Z" fill="#ffd23f" stroke="#e6a800" strokeWidth="2" />{[[70, 4], [100, -4], [130, 4]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill={['#ff5fa2', '#5cc8ff', '#7ee0c3'][i]} />)}<rect x="62" y="32" width="76" height="8" rx="4" fill="#e6a800" /></g>;
    case 'mic': return <g><path d="M52 96 Q60 118 82 118" fill="none" stroke="#333" strokeWidth="3" /><circle cx="84" cy="118" r="4" fill="#333" /></g>;
    default: return null;
  }
}

function lightstick(kind: string) {
  const glow = '#ff8fc4';
  const star = (r: number, fill: string, stroke: string) => <path d={`M0 ${-26 * r} l${7 * r} ${14 * r} ${16 * r} ${2 * r} ${-12 * r} ${11 * r} ${3 * r} ${16 * r} ${-14 * r} ${-8 * r} ${-14 * r} ${8 * r} ${3 * r} ${-16 * r} ${-12 * r} ${-11 * r} ${16 * r} ${-2 * r}z`} fill={fill} stroke={stroke} strokeWidth="2" />;
  const heads: Record<string, React.JSX.Element> = {
    star: star(1, '#fff7b0', '#ffc93c'),
    round: <circle cx="0" cy="-12" r="15" fill="#e7e1ff" stroke="#7c5cff" strokeWidth="3" />,
    bunny: <g><ellipse cx="-7" cy="-30" rx="5" ry="12" fill="#ffe3f0" stroke={glow} strokeWidth="2" /><ellipse cx="7" cy="-30" rx="5" ry="12" fill="#ffe3f0" stroke={glow} strokeWidth="2" /><circle cx="0" cy="-12" r="14" fill="#ffe3f0" stroke={glow} strokeWidth="3" /></g>,
    moon: <path d="M6 -28 A16 16 0 1 0 6 4 A12 12 0 1 1 6 -28 Z" fill="#ffe36e" stroke="#e6a800" strokeWidth="2" />,
    strawberry: <g><path d="M0 2 C-18 -6 -16 -26 0 -24 C16 -26 18 -6 0 2 Z" fill="#ff4d6d" />{[[-6, -14], [5, -16], [0, -7], [-8, -6], [8, -7]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#fff3b0" />)}<path d="M-8 -24 L0 -30 L8 -24 L0 -21 Z" fill="#2ec4b6" /></g>,
    cloud: <g fill="#fff" stroke="#9fd9ff" strokeWidth="2"><circle cx="-8" cy="-10" r="9" /><circle cx="8" cy="-10" r="9" /><circle cx="0" cy="-18" r="10" /></g>,
    crownstick: <path d="M-16 -2 L-14 -26 L-6 -14 L0 -30 L6 -14 L14 -26 L16 -2 Z" fill="#ffd23f" stroke="#e6a800" strokeWidth="2" />,
    galaxystick: <g><circle cx="0" cy="-12" r="16" fill="#3b1d7a" stroke="#c7a6ff" strokeWidth="3" /><ellipse cx="0" cy="-12" rx="22" ry="5" fill="none" stroke="#ff7eb6" strokeWidth="2" transform="rotate(-20 0 -12)" />{star(0.35, '#fff', '#fff')}</g>,
  };
  const head = heads[kind] ?? <path d="M0 -2 C -22 -16 -14 -34 0 -24 C 14 -34 22 -16 0 -2 Z" fill="#ffd0e6" stroke={glow} strokeWidth="3" />;
  return <g><rect x="-4" y="-2" width="8" height="30" rx="4" fill="#ddd" /><circle cx="0" cy="-12" r="22" fill={glow} opacity="0.25" />{head}</g>;
}

function faceDeco(kind: string) {
  switch (kind) {
    case 'freckles': return <g fill="#b5652b" opacity="0.6">{[[64, 100], [70, 104], [76, 100], [124, 100], [130, 104], [136, 100]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" />)}</g>;
    case 'hearts': return <g fill="#ff5f8f"><path d="M70 108 l-6 -6 a3.5 3.5 0 0 1 6 -4 a3.5 3.5 0 0 1 6 4 z" /><path d="M130 108 l-6 -6 a3.5 3.5 0 0 1 6 -4 a3.5 3.5 0 0 1 6 4 z" /></g>;
    case 'star': return <path d="M134 96 l2.5 5 5.5 .8 -4 3.8 1 5.4 -5 -2.6 -5 2.6 1 -5.4 -4 -3.8 5.5 -.8z" fill="#ffd23f" stroke="#e6a800" strokeWidth="1" />;
    case 'glitter': return <g fill="#fff">{[[62, 98], [70, 108], [78, 100], [122, 100], [130, 108], [138, 98]].map(([x, y], i) => <path key={i} d={`M${x} ${y - 3} l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1z`} />)}</g>;
    case 'stage': return <g>{[[64, 74], [136, 74], [100, 64]].map(([x, y], i) => <path key={i} d={`M${x} ${y - 4} l4 4 -4 4 -4 -4z`} fill={['#7ee0c3', '#ff7eb6', '#5cc8ff'][i]} stroke="#fff" strokeWidth="1" />)}</g>;
    default: return null;
  }
}

function glassesDeco(kind: string) {
  switch (kind) {
    case 'round': return <g fill="none" stroke="#2b2140" strokeWidth="3"><circle cx="80" cy="88" r="13" /><circle cx="120" cy="88" r="13" /><path d="M93 88 L107 88" /></g>;
    case 'heart': return <g><path d="M80 102 l-15 -14 a8 8 0 0 1 15 -11 a8 8 0 0 1 15 11 z" fill="#ff5fa2" opacity="0.85" /><path d="M120 102 l-15 -14 a8 8 0 0 1 15 -11 a8 8 0 0 1 15 11 z" fill="#ff5fa2" opacity="0.85" /><path d="M95 86 L105 86" stroke="#ff5fa2" strokeWidth="3" /></g>;
    case 'star': return <g fill="#ffd23f" opacity="0.92" stroke="#e6a800" strokeWidth="1.5"><path d="M80 72 l4.5 9.5 10.5 1.3 -7.7 7.2 2 10.3 -9.3 -5 -9.3 5 2 -10.3 -7.7 -7.2 10.5 -1.3z" /><path d="M120 72 l4.5 9.5 10.5 1.3 -7.7 7.2 2 10.3 -9.3 -5 -9.3 5 2 -10.3 -7.7 -7.2 10.5 -1.3z" /></g>;
    case 'sun': return <g><path d="M64 80 L96 80 L94 96 Q80 102 66 96 Z M104 80 L136 80 L134 96 Q120 102 106 96 Z" fill="#1b1033" /><path d="M96 84 L104 84" stroke="#1b1033" strokeWidth="3" /><path d="M70 84 L78 84" stroke="#fff" strokeWidth="2" opacity="0.6" /></g>;
    case 'visor': return <rect x="58" y="76" width="84" height="22" rx="11" fill="#5cc8ff" opacity="0.75" stroke="#ff7eb6" strokeWidth="3" />;
    default: return null;
  }
}

export function bgDeco(bg: string) {
  switch (bg) {
    case 'seoul': return <g fill="#0b0f26" opacity="0.85"><path d="M0 260 L0 200 L18 200 L18 180 L34 180 L34 210 L52 210 L52 170 L62 170 L62 150 L66 150 L66 170 L76 170 L76 205 L98 205 L98 190 L118 190 L118 215 L138 215 L138 175 L156 175 L156 200 L176 200 L176 186 L200 186 L200 260 Z" />{[[24, 190], [56, 180], [142, 186], [182, 196], [104, 198]].map(([x, y], i) => <rect key={i} x={x} y={y} width="4" height="4" fill="#ffd36e" />)}</g>;
    case 'cherry': return <g>{[[20, 30], [170, 50], [40, 120], [180, 150], [24, 210], [150, 230], [100, 18]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y}) rotate(${i * 40})`}><ellipse cx="0" cy="-4" rx="4" ry="7" fill="#ffb3cf" /><ellipse cx="4" cy="2" rx="4" ry="7" fill="#ffc8dc" transform="rotate(72)" /></g>)}</g>;
    case 'beach': return <g><circle cx="168" cy="36" r="18" fill="#ffd23f" /><path d="M0 214 Q50 204 100 214 Q150 224 200 214 L200 260 L0 260 Z" fill="#3fa7ff" opacity="0.7" /><path d="M0 236 L200 236 L200 260 L0 260 Z" fill="#ffe2a8" /></g>;
    case 'snow': return <g fill="#fff">{[[20, 30], [60, 70], [170, 40], [150, 110], [30, 150], [180, 190], [90, 20], [10, 220]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 3 : 4.5} />)}<path d="M0 240 Q100 222 200 240 L200 260 L0 260 Z" /></g>;
    case 'concert': return <g opacity="0.5"><path d="M30 0 L0 260 L60 260 Z" fill="#ff7eb6" /><path d="M170 0 L140 260 L200 260 Z" fill="#5cc8ff" /><path d="M100 0 L76 260 L124 260 Z" fill="#ffd36e" /></g>;
    case 'rainbow': return <g fill="none" strokeWidth="9" opacity="0.6">{['#ff7eb6', '#ffd36e', '#7ee0c3', '#5cc8ff', '#c7a6ff'].map((c, i) => <path key={c} d={`M${-20 + i * 9} 260 A${120 - i * 9} ${120 - i * 9} 0 0 1 ${220 - i * 9} 260`} stroke={c} />)}</g>;
    case 'candy': return <g>{[[24, 40, '#ff7eb6'], [176, 60, '#7ee0c3'], [30, 200, '#ffd36e'], [174, 210, '#c7a6ff'], [100, 20, '#5cc8ff']].map(([x, y, c], i) => <g key={i}><circle cx={x as number} cy={y as number} r="10" fill={c as string} /><circle cx={x as number} cy={y as number} r="5" fill="#fff" opacity="0.6" /></g>)}</g>;
    case 'ocean': return <g>{[[20, 200], [40, 160], [170, 120], [180, 60], [30, 60]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3 + (i % 3)} fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.7" />)}<text x="150" y="230" fontSize="22">🐠</text><text x="16" y="110" fontSize="18">🐟</text><path d="M0 250 Q20 236 40 250 Q60 236 80 250 L80 260 L0 260 Z" fill="#2ec4b6" opacity="0.6" /></g>;
    case 'space': return <g>{[[20, 30], [60, 80], [170, 30], [150, 140], [30, 190], [180, 210], [100, 14], [120, 230]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 1.5 : 2.5} fill="#fff" />)}<circle cx="168" cy="70" r="16" fill="#ff9a5a" /><ellipse cx="168" cy="70" rx="26" ry="6" fill="none" stroke="#ffd36e" strokeWidth="3" /><circle cx="26" cy="232" r="10" fill="#7ee0c3" /></g>;
    default: return null;
  }
}

/** "grad:#a:#b[:#c…]" → gradient stops; plain colour → null. */
const gradStops = (c: string) => (c.startsWith('grad:') ? c.slice(5).split(':') : null);
const firstColour = (c: string) => gradStops(c)?.[0] ?? c;

const FX_SPOTS = [[22, 60], [178, 80], [30, 150], [172, 170], [100, 6], [60, 30], [150, 26]];

export default function Avatar({ look: rawLook, size = 180, move = 'idle', moveKey = 0, showBg = true, showStick = true }: Props) {
  const look = fullLook(rawLook);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = poses(move);
  const [bg1, bg2] = BGS[look.bg] ?? BGS.pink;
  const gid = `bg-${look.bg}-${uid}`;
  const hairStops = gradStops(look.hairColor);
  const clothStops = gradStops(look.outfitColor);
  const hair = hairStops ? `url(#hair-${uid})` : look.hairColor;
  const cloth = clothStops ? `url(#cloth-${uid})` : look.outfitColor;
  const grad = (id: string, stops: string[]) => (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      {stops.map((c, i) => <stop key={i} offset={stops.length === 1 ? 0 : i / (stops.length - 1)} stopColor={c} />)}
    </linearGradient>
  );
  return (
    <svg viewBox="0 0 200 260" width={size} height={size * 1.3} role="img" aria-label="Your avatar" style={{ overflow: 'visible' }}>
      <defs>
        {hairStops && grad(`hair-${uid}`, hairStops)}
        {clothStops && grad(`cloth-${uid}`, clothStops)}
        {showBg && <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={bg1} /><stop offset="1" stopColor={bg2} /></linearGradient>}
      </defs>
      {showBg && (
        <>
          <rect x="0" y="0" width="200" height="260" rx="28" fill={`url(#${gid})`} />
          {look.bg === 'paris' && <path d="M160 250 L172 150 L176 120 L178 96 L180 120 L184 150 L196 250 L188 250 L182 196 L174 196 L168 250 Z M170 170 L190 170" fill="#1d1a45" opacity="0.7" stroke="#1d1a45" strokeWidth="2" />}
          {(look.bg === 'night' || look.bg === 'galaxy' || look.bg === 'paris') && [20, 60, 170, 150, 35].map((x, i) => <circle key={i} cx={x} cy={20 + i * 37} r="2" fill="#fff" opacity="0.8" />)}
          {bgDeco(look.bg)}
        </>
      )}
      {look.fx !== 'none' && FX_SPOTS.map(([x, y], i) => (
        <motion.text key={`fx-${i}`} x={x} y={y} fontSize={look.fx === '👑' ? 18 : 15} textAnchor="middle"
          animate={{ y: [0, -14, 0], opacity: [0.3, 1, 0.3] }} transition={{ duration: 2.2 + (i % 3) * 0.4, repeat: Infinity, delay: i * 0.3 }}>
          {look.fx}
        </motion.text>
      ))}
      {look.fx === '👑' && <motion.circle cx="100" cy="130" r="96" fill="none" stroke="#ffd23f" strokeWidth="3" animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 2, repeat: Infinity }} />}
      <motion.g key={`b-${move}-${moveKey}`} animate={p.body} style={{ originX: '100px', originY: '200px' }}>
        <g fill={look.skin}>
          <rect x="80" y="196" width="16" height="46" rx="7" />
          <rect x="104" y="196" width="16" height="46" rx="7" />
        </g>
        <g fill="#fff"><rect x="76" y="238" width="24" height="12" rx="6" /><rect x="100" y="238" width="24" height="12" rx="6" /></g>
        {hairBack(look.hair, hair)}
        <motion.g key={`l-${move}-${moveKey}`} animate={p.armL} style={ARM_L}>
          <rect x="50" y="134" width="16" height="54" rx="8" fill={cloth} stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
          <circle cx="58" cy="190" r="9" fill={look.skin} />
        </motion.g>
        {outfit(look.outfit, cloth, look.skin)}
        <motion.g key={`r-${move}-${moveKey}`} animate={p.armR} style={ARM_R}>
          <rect x="134" y="134" width="16" height="54" rx="8" fill={cloth} stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
          <circle cx="142" cy="190" r="9" fill={look.skin} />
          {showStick && <g transform="translate(146 194)">{lightstick(look.stick)}</g>}
        </motion.g>
        <rect x="90" y="118" width="20" height="16" rx="6" fill={look.skin} />
        <circle cx="100" cy="80" r="54" fill={look.skin} />
        {eyes(look.eyes)}
        <ellipse cx="70" cy="104" rx="9" ry="5" fill="#ff8fb1" opacity="0.55" />
        <ellipse cx="130" cy="104" rx="9" ry="5" fill="#ff8fb1" opacity="0.55" />
        {faceDeco(look.face)}
        <path d="M92 108 Q100 116 108 108" stroke="#2b2140" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        {hairFront(look.hair, hair)}
        {glassesDeco(look.glasses)}
        <g style={{ ['--mask' as string]: firstColour(look.outfitColor), ['--hair' as string]: firstColour(look.hairColor) }}>{accessory(look.acc)}</g>
        {look.acc === 'mask' && eyes(look.eyes)}
        {p.heart && (
          <motion.text key={`h-${moveKey}`} x="150" y="70" fontSize="30" initial={{ opacity: 0, y: 70 }} animate={{ opacity: [0, 1, 1, 0], y: [70, 40, 20, 0] }} transition={{ duration: 1.2 }}>💗</motion.text>
        )}
      </motion.g>
      {look.pet !== 'none' && (
        <motion.text x="30" y="250" fontSize="40" textAnchor="middle" animate={{ y: [0, -8, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>{look.pet}</motion.text>
      )}
    </svg>
  );
}

/** A scene background (gradient + decorations) in the avatar's 200x260 space. */
export function SceneBackground({ bg, id }: { bg: string; id: string }) {
  const [c1, c2] = BGS[bg] ?? BGS.pink;
  return (
    <g>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient></defs>
      <rect x="0" y="0" width="200" height="260" fill={`url(#${id})`} />
      {bg === 'paris' && <path d="M160 250 L172 150 L176 120 L178 96 L180 120 L184 150 L196 250 L188 250 L182 196 L174 196 L168 250 Z" fill="#1d1a45" opacity="0.7" />}
      {bgDeco(bg)}
    </g>
  );
}
