import { get as idbGet, set as idbSet } from 'idb-keyval';
import { supabase } from './supabase';

export type Submission = {
  id: string; kind: 'draw' | 'audio' | 'text' | 'photo'; lessonId: string; prompt: string;
  text?: string; url?: string; storagePath?: string; status: 'new' | 'approved' | 'redo';
  comment?: string; bonus?: number; createdAt: number;
};

const KEY = 'kstar-subs-v1';
const BLOBS = 'kstar-blob-';

async function localList(): Promise<Submission[]> { return ((await idbGet(KEY)) as Submission[] | undefined) ?? []; }

export async function submitWork(userId: string | null, s: { kind: Submission['kind']; lessonId: string; prompt: string; blob?: Blob; text?: string }) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  if (supabase && userId && navigator.onLine) {
    let storage_path: string | null = null;
    if (s.blob) {
      const ext = s.kind === 'draw' ? 'png' : s.kind === 'photo' ? 'jpg' : s.blob.type.includes('mp4') ? 'm4a' : 'webm';
      storage_path = `${userId}/${id}.${ext}`;
      const up = await supabase.storage.from('submissions').upload(storage_path, s.blob, { contentType: s.blob.type });
      if (up.error) storage_path = null;
    }
    const { error } = await supabase.from('submissions').insert({ id, user_id: userId, kind: s.kind, lesson_id: s.lessonId, prompt: s.prompt, text: s.text ?? null, storage_path, status: 'new' });
    if (!error) return;
  }
  // Local fallback (also used offline): keep the blob in IndexedDB.
  if (s.blob) await idbSet(BLOBS + id, s.blob);
  const list = await localList();
  list.unshift({ id, kind: s.kind, lessonId: s.lessonId, prompt: s.prompt, text: s.text, status: 'new', createdAt });
  await idbSet(KEY, list.slice(0, 300));
}

export async function clearLocalSubmissions() {
  for (const x of await localList()) await idbSet(BLOBS + x.id, undefined);
  await idbSet(KEY, []);
  await idbSet('kstar-seen-fb', []);
}

export async function listSubmissions(userId: string | null): Promise<Submission[]> {
  const local = await localList();
  const withUrls = await Promise.all(local.map(async (x) => {
    const b = (await idbGet(BLOBS + x.id)) as Blob | undefined;
    return { ...x, url: b ? URL.createObjectURL(b) : undefined };
  }));
  if (!supabase || !userId) return withUrls;
  const { data } = await supabase.from('submissions').select('*').order('created_at', { ascending: false }).limit(200);
  const remote: Submission[] = await Promise.all((data ?? []).map(async (r) => {
    let url: string | undefined;
    if (r.storage_path) {
      const signed = await supabase!.storage.from('submissions').createSignedUrl(r.storage_path, 3600);
      url = signed.data?.signedUrl;
    }
    return { id: r.id, kind: r.kind, lessonId: r.lesson_id, prompt: r.prompt, text: r.text ?? undefined, storagePath: r.storage_path ?? undefined, url, status: r.status, comment: r.comment ?? undefined, bonus: r.bonus_hearts ?? undefined, createdAt: Date.parse(r.created_at) };
  }));
  return [...withUrls, ...remote].sort((a, b) => b.createdAt - a.createdAt);
}

export async function reviewSubmission(id: string, status: 'approved' | 'redo', comment: string, bonus: number) {
  const list = await localList();
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) {
    list[i] = { ...list[i], status, comment, bonus };
    await idbSet(KEY, list);
    return;
  }
  if (supabase) await supabase.from('submissions').update({ status, comment, bonus_hearts: bonus }).eq('id', id);
}

/** Feedback from the parent that the child hasn't seen yet (for a "Coach Mina" note). */
export async function unseenFeedback(userId: string | null): Promise<Submission[]> {
  const all = await listSubmissions(userId);
  const seen = new Set(((await idbGet('kstar-seen-fb')) as string[] | undefined) ?? []);
  return all.filter((x) => x.status !== 'new' && !seen.has(x.id));
}
export async function markFeedbackSeen(ids: string[]) {
  const seen = ((await idbGet('kstar-seen-fb')) as string[] | undefined) ?? [];
  await idbSet('kstar-seen-fb', [...new Set([...seen, ...ids])]);
}
