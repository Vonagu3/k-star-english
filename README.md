# K-Star English Academy

A playful English-learning portal (British English, Pre-A1 → A1, Stage 1 = months 1–3) for a 10-year-old who loves K-pop, dancing, singing, drawing and Roblox-style decorating.

- **Worlds:** Seoul Studio (me & family) → Trainee Dorm (home & room) → Practice Room (my day & school) → Debut Stage.
- **15 exercise types:** flashcards, listen & tap, memory, spelling, sentence builder, gaps, stories, speaking (speech recognition / recording), drawing, K-pop style chants, dance commands, writing, watch & quiz, quiz show, K-Culture.
- **Game layer:** fans (XP) & ranks, hearts & avatar shop, dorm decorating, photocard album, streaks, daily missions, weekly / monthly checkpoints.
- **Parent panel** (PIN): progress, skills, weak words, review queue for drawings / audio / writing, time limit, unlock worlds.

## Develop

```bash
npm install
npm run dev               # local
npm run validate-content  # check lesson JSON
npm test                  # game rules
npm run build
```

Lesson content lives in `src/content/stage1/world*.json` and is validated against `src/content/schema.ts`. The child's name is never stored in the repo — texts use the `{name}` token.

## Cloud sync (Supabase)

1. Create a Supabase project, run `supabase/migrations/001_init.sql` in the SQL Editor.
2. In the GitHub repo → Settings → Secrets and variables → Actions → **Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the public anon key; data is protected by row-level security).
3. Without these variables the app runs in local-only mode (progress saved in the browser).

Deployed by GitHub Actions to GitHub Pages on every push to `main`.
