# Haiku Generator

A single-page app that assembles a 5-7-5 haiku from a bundled list of prewritten phrases. Reroll lines, lock lines, copy the haiku, or copy a share link.

## Run and build

```
npm install
npm run dev      # dev server
npm test         # vitest
npm run build    # static bundle in dist/
npm run preview  # serve dist/ locally
```

The build uses relative asset paths (`base: './'`), so `dist/` can be served from any static host or subpath.

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
