# Haiku Generator

A single-page app that assembles a 5-7-5 haiku from a bundled list of prewritten phrases. Reroll lines, lock lines, copy the haiku, copy a share link, or save it to the public gallery and upvote others' haikus.

## Run and build

```
npm install
npm run dev      # dev server
npm test         # vitest
npm run build    # static bundle in dist/
npm run preview  # serve dist/ locally
```

The build uses relative asset paths (`base: './'`), so `dist/` can be served from any static host or subpath.

`npm test` and `npm run build` both work with no `.env` file present — the gallery's Supabase client degrades to `null` and gallery tests use an injected fake client, so neither needs network access or secrets.

## Gallery (Supabase setup)

The public gallery (save a haiku, browse, upvote) is backed by [Supabase](https://supabase.com). To run it locally:

1. Create a free Supabase project.
2. In the SQL editor, run the schema/RLS/RPC in `supabase/schema.sql`.
3. Copy `.env.example` to `.env` and fill in the project's URL and anon/public API key (Settings → API). These are safe to ship in the public bundle — Supabase's security model relies on Row Level Security, not on keeping the anon key secret.
4. For the deployed build, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository **Variables** (not Secrets) under Settings → Secrets and variables → Actions, so the GitHub Actions build step picks them up.

One vote per browser is enforced client-side only (a localStorage record of voted haiku IDs) — there's no login. Upvotes go through a `security definer` RPC that only ever increments one row by id; there's no `UPDATE`/`DELETE` policy for the public `anon` key.

## Phrase file

`src/data/phrases.json` is a flat array of `{ "id", "text", "syllables" }`.

- `id`: unique, only `a-z`, `0-9`, `-`. **IDs are permanent**: share links (`?h=id1,id2,id3`) use them.
- `text`: non-empty, displayed exactly as written.
- `syllables`: `5` or `7`, trusted as written.

`npm test` validates uniqueness, allowed values, and minimum pool sizes.

### Adding phrases safely

- Append new entries with new, never-used IDs (continue the `pNNN` sequence).
- Never change or reuse an existing ID, and never change what a phrase means under an existing ID.
- To retire a phrase, edit its text in place or leave it. Deleting one breaks share links that reference it (they fall back to a random haiku).

## Decisions where the spec was silent or assumed

- TypeScript is used. The address bar is not updated on reroll; the link is built on click.
- Locked lines have their reroll button disabled. "Reroll all" guarantees each unlocked line changes.
- Lock state is shown with an icon and label ("Locked" / "Lock") plus `aria-pressed`.
- The supplied 97-phrase file is used unchanged instead of the placeholders mentioned in spec section 10.
