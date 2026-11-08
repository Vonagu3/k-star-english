// Adds up the results of an episode's tasks (pure; used by the lesson player).
import type { ExResult } from '../exercises/common';
import type { EpisodeResult } from './store';

export function tallyResults(all: ExResult[]): EpisodeResult {
  const out: EpisodeResult = { correct: 0, total: 0, skills: {}, words: all.flatMap((x) => x.words ?? []), metrics: {} };
  for (const x of all) {
    // A task may score several skills (e.g. a mystery case: maths + reading).
    for (const p of [{ skill: x.skill, correct: x.correct, total: x.total }, ...(x.also ?? [])]) {
      out.correct += p.correct;
      out.total += p.total;
      const sk = out.skills[p.skill] ?? { c: 0, t: 0 };
      out.skills[p.skill] = { c: sk.c + p.correct, t: sk.t + p.total };
    }
    if (x.metric) out.metrics[x.metric] = (out.metrics[x.metric] ?? 0) + (x.metricN ?? 1);
  }
  return out;
}
