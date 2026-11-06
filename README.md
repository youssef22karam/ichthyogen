# IchthyoGen — Hyperreal Procedural Fish Generator (split-file edition)

This is the complete IchthyoGen project, restructured so that **every file in
the repo is 30,000 bytes or smaller**. That makes it uploadable to GitHub in a
form Arena AI (Battle / Code mode) can pull and read file-by-file without any
single file being cut off.

## Why it looks split

The fish engine is one large ES module. In the original project it was a
single file, `src/engine/fishgen.js` (508,828 bytes). Here it lives as 20
sequential parts:

```
src/engine/parts/fishgen.part01.js   (lines 1–212 of the module)
src/engine/parts/fishgen.part02.js   (lines 213–256 of the module)
src/engine/parts/fishgen.part03.js   (lines 257–298 of the module)
src/engine/parts/fishgen.part04.js   (lines 299–461 of the module)
src/engine/parts/fishgen.part05.js   (lines 462–647 of the module)
src/engine/parts/fishgen.part06.js   (lines 648–861 of the module)
src/engine/parts/fishgen.part07.js   (lines 862–1097 of the module)
src/engine/parts/fishgen.part08.js   (lines 1098–1395 of the module)
src/engine/parts/fishgen.part09.js   (lines 1396–1686 of the module)
src/engine/parts/fishgen.part10.js   (lines 1687–1990 of the module)
src/engine/parts/fishgen.part11.js   (lines 1991–2239 of the module)
src/engine/parts/fishgen.part12.js   (lines 2240–2581 of the module)
src/engine/parts/fishgen.part13.js   (lines 2582–2722 of the module)
src/engine/parts/fishgen.part14.js   (lines 2723–2929 of the module)
src/engine/parts/fishgen.part15.js   (lines 2930–3053 of the module)
src/engine/parts/fishgen.part16.js   (lines 3054–3344 of the module)
src/engine/parts/fishgen.part17.js   (lines 3345–3508 of the module)
src/engine/parts/fishgen.part18.js   (lines 3509–3687 of the module)
src/engine/parts/fishgen.part19.js   (lines 3688–3869 of the module)
src/engine/parts/fishgen.part20.js   (lines 3870–3944 of the module)
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

---

## Procedural genome system (added on top of the original engine)

New modules in `src/engine/` (the generated `fishgen.js` is untouched apart from small hooks in the parts):

| file | role |
|---|---|
| `clades.js`, `cladedata.js` | 59 continuous + 20 discrete trait axes; 17 clade envelopes / 41 lineages (ranges only, no species) |
| `genome.js` | seed → RNG → clade → trait vector; clamp, bounded mutation, crossover, genome hash, trait distance |
| `mapping.js` | trait vector → original engine genome paths (`body.*`, `head.*`, `fins.*`, `skin.*`…) |
| `validate.js` | **anatomy hard gate** (8 invariants; trait stage + engine `BodyModel` analytic stage) |
| `procgen.js` | pipeline: sample → mutate → map → gate → accept / resample; seed grammar `A`, `A~SALT` (mutant), `A^B.SALT` (offspring) |
| `naming.js` | genus/species + common name derived from traits and clade |
| `procui.js` | "Procedural" panel: Random, seed field, Mutate, Breed, clade bias, 24-fish gallery |

Verification: `node tools/reassemble.mjs && node tools/verify.mjs` (env `UNIQ`, `COH`, `SAMPLE`). `node tools/diag.mjs` prints per-lineage gate pass-rates.
Last full report: `docs/verify-report.txt`; screenshots in `docs/`.

Engine fix: `checkFishGeometry` read `getAttribute('aFin')` from a position attribute in its batoid branch; it now reads it from the fin geometry.
