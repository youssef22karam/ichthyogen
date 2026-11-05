# IchthyoGen — Hyperreal Procedural Fish Generator (split-file edition)

This is the complete IchthyoGen project, restructured so that **every file in
the repo is 30,000 bytes or smaller**. That makes it uploadable to GitHub in a
form Arena AI (Battle / Code mode) can pull and read file-by-file without any
single file being cut off.

## Why it looks split

The fish engine is one large ES module. In the original project it was a
single file, `src/engine/fishgen.js` (508,209 bytes). Here it lives as 20
sequential parts:

```
src/engine/parts/fishgen.part01.js   (lines 1–211 of the module)
src/engine/parts/fishgen.part02.js   (lines 212–255)
src/engine/parts/fishgen.part03.js   (lines 256–297)
src/engine/parts/fishgen.part04.js   (lines 298–460)
src/engine/parts/fishgen.part05.js   (lines 461–646)
src/engine/parts/fishgen.part06.js   (lines 647–860)
src/engine/parts/fishgen.part07.js   (lines 861–1096)
src/engine/parts/fishgen.part08.js   (lines 1097–1393)
src/engine/parts/fishgen.part09.js   (lines 1394–1684)
src/engine/parts/fishgen.part10.js   (lines 1685–1988)
src/engine/parts/fishgen.part11.js   (lines 1989–2237)
src/engine/parts/fishgen.part12.js   (lines 2238–2579)
src/engine/parts/fishgen.part13.js   (lines 2580–2720)
src/engine/parts/fishgen.part14.js   (lines 2721–2927)
src/engine/parts/fishgen.part15.js   (lines 2928–3051)
src/engine/parts/fishgen.part16.js   (lines 3052–3342)
src/engine/parts/fishgen.part17.js   (lines 3343–3506)
src/engine/parts/fishgen.part18.js   (lines 3507–3685)
src/engine/parts/fishgen.part19.js   (lines 3686–3867)
src/engine/parts/fishgen.part20.js   (lines 3868–3941)
```

The parts are **one continuous module in filename order** — the `import`
statements are in part01 and the `export { boot, FG }` is at the end of
part20. They are not separate modules: never import a part on its own, and
never reorder them. Concatenated in order they reproduce the original
`fishgen.js` byte for byte
(SHA-256 of the original: `a982dac594db38c5f0467c0e2be593fe0b7ef6beeeeb5d359845184a00e372ac`).

## Build / run

```bash
npm install
npm run build     # reassembles fishgen.js, then builds one single-file HTML in dist/
npm run dev       # reassembles, then starts the Vite dev server
```

`tools/reassemble.mjs` concatenates the parts into the generated
`src/engine/fishgen.js` (git-ignored — do not commit it, and do not edit it;
edit the parts). It runs automatically inside `dev`/`build`, and it refuses
to build if any part has grown over 30,000 bytes, so the size rule cannot
silently break. Run it on its own any time with `npm run reassemble`.

The build output is a single self-contained HTML file
(`dist/index.html`, ~1.3 MB, everything inlined via vite-plugin-singlefile).

## Notes

- `package-lock.json` was deliberately left out: it was 86,021 bytes, over
  the size limit, and `npm install` regenerates it. Dependency versions are
  pinned in `package.json`.
- Everything else is the untouched original project: `src/App.tsx` is the UI
  shell, `src/engine/fish.css` the engine styles, `src/engine/fishgen.d.ts`
  the type declarations for the engine module.

## Instructions for Arena / any AI working on this repo

1. Read the engine as one module: `fishgen.part01.js` through
   `fishgen.part20.js`, in order.
2. Make code changes **inside the part files**, not in a recreated single
   `fishgen.js`.
3. Keep every file at or under 30,000 bytes. If an edit pushes a part over
   the limit, split that part into two at a top-level statement boundary and
   renumber the following parts.
4. Verify with `npm install && npm run build` — the build must succeed and
   produce `dist/index.html`.
