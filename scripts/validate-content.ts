import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { World, type Episode, type Exercise } from '../src/content/schema';

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['world1', 'world2', 'world3'].map((w) => `src/content/stage1/${w}.json`);

const errors: string[] = [];
const allWords = new Map<string, string>();
const episodeIds = new Set<string>();
const worlds: World[] = [];

for (const f of files) {
  const p = resolve(f);
  if (!existsSync(p)) { console.warn(`skip (missing): ${f}`); continue; }
  const parsed = World.safeParse(JSON.parse(readFileSync(p, 'utf8')));
  if (!parsed.success) {
    for (const i of parsed.error.issues) errors.push(`${f}: ${i.path.join('.')} — ${i.message}`);
    continue;
  }
  worlds.push(parsed.data);
  const localIds = new Set<string>();
  for (const w of parsed.data.words) {
    if (localIds.has(w.id)) errors.push(`${f}: duplicate word id "${w.id}" in the same world`);
    localIds.add(w.id);
    const prev = allWords.get(w.id);
    if (prev && prev !== w.en) errors.push(`${f}: word id "${w.id}" means "${w.en}" here but "${prev}" in another world`);
    allWords.set(w.id, w.en);
  }
}

const ALLOWED_HOSTS = ['learnenglishkids.britishcouncil.org', 'www.youtube.com', 'youtube.com', 'storynory.com', 'home.oxfordowl.co.uk', 'lyricstraining.com', 'learningblocks.tv', 'www.funkidslive.com'];

let own = new Set<string>();
function checkEx(where: string, ex: Exercise) {
  const ref = (ids: string[]) => ids.forEach((id) => { if (!own.has(id)) errors.push(`${where}: word id "${id}" is not defined in this world's words`); });
  const ans = (n: number, len: number, w: string) => { if (n >= len) errors.push(`${where}: answer ${n} out of range (${len}) ${w}`); };
  switch (ex.type) {
    case 'flashcards': case 'memory': case 'spell': case 'quiz': ref(ex.words); break;
    case 'listen': ex.items.forEach((it, i) => ans(it.answer, it.options.length, `item ${i}`)); break;
    case 'gap': ex.items.forEach((it, i) => {
      ans(it.answer, it.options.length, `item ${i}`);
      if (it.text.split('___').length !== 2) errors.push(`${where}: gap item ${i} must contain exactly one ___`);
    }); break;
    case 'read': case 'kculture': case 'watch': ex.questions.forEach((q, i) => ans(q.answer, q.options.length, `question ${i}`)); break;
    case 'chant': {
      const text = ex.lines.join(' ').toLowerCase();
      ex.blanks.forEach((b) => { if (!text.includes(b.toLowerCase())) errors.push(`${where}: chant blank "${b}" not in lines`); });
      break;
    }
    case 'sentence': ex.items.forEach((it, i) => { if (it.sentence.split(/\s+/).length < 2) errors.push(`${where}: sentence ${i} too short`); }); break;
  }
  if (ex.type === 'watch') {
    const host = new URL(ex.url).host;
    if (!ALLOWED_HOSTS.includes(host)) errors.push(`${where}: watch url host not allowed: ${host}`);
  }
}

function checkEp(f: string, ep: Episode) {
  if (episodeIds.has(ep.id)) errors.push(`${f}: duplicate episode id ${ep.id}`);
  episodeIds.add(ep.id);
  ep.exercises.forEach((ex, i) => checkEx(`${f} ${ep.id}#${i}(${ex.type})`, ex));
}

for (const [i, w] of worlds.entries()) {
  const f = files.filter((x) => existsSync(resolve(x)))[i];
  own = new Set(w.words.map((x) => x.id));
  w.weeks.forEach((wk) => wk.episodes.forEach((ep) => checkEp(f, ep)));
  checkEp(f, w.showcase);
  if (w.finale) checkEp(f, w.finale);
}

const stats = worlds.map((w) => {
  const eps = w.weeks.flatMap((wk) => wk.episodes);
  const types = new Map<string, number>();
  eps.concat(w.showcase).forEach((e) => e.exercises.forEach((x) => types.set(x.type, (types.get(x.type) ?? 0) + 1)));
  return `${w.id}: ${w.words.length} words, ${eps.length} episodes, types ${[...types].map(([k, v]) => `${k}=${v}`).join(' ')}`;
});
console.log(stats.join('\n'));
if (errors.length) { console.error(`\n${errors.length} error(s):\n` + errors.join('\n')); process.exit(1); }
console.log('content OK');
