// @@PART js/app.part08.js (8/19) lines 1262-1557 of the original module script -- stripped by build.mjs
function nameFish(g, rng) {
  if (g.meta.species) {
    const sp = SPECIES.find(s => s.id === g.meta.species);
    if (sp) {
      const ad = g.meta.adapted && HABITATS[g.meta.adapted.to], adj = ad ? (HAB_ADJ[ad.id] || ad.n.toLowerCase()) : '';
      g.meta.name = ad ? adj.charAt(0).toUpperCase() + adj.slice(1) + (g.meta.speculative ? '-inspired ' : '-adapted ') + sp.n.toLowerCase() : sp.n;
      g.meta.sci = sp.sci + (g.meta.speculative ? ' / speculative concept, not a real population' : ad ? ' (authored habitat variant)' : '');
      return;
    }
  }
  const cl = CLADES[g.meta.clade]; const base = singular(cl.n).toLowerCase();
  const adj = PATTERN_ADJ[g.skin.pattern] || hueName(g.skin.base);
  g.meta.name = `${g.meta.novel ? 'Concept' : adj} ${HAB_ADJ[g.meta.habitat] || ''} ${base}`.replace(/\s+/g, ' ').trim();
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  g.meta.sci = cap(rng.pick(SYL) + rng.pick(SYL) + rng.pick(GEN_END)) + ' ' + rng.pick(SYL) + rng.pick(SYL) + rng.pick(['us', 'a', 'um', 'ensis', 'oides']) + (g.meta.novel ? ' (generated concept)' : g.meta.fantasy ? ' (fict.)' : ' (gen.)');
  if (g.meta.evolution && g.meta.evolution.step > 0) {
    const source = SPECIES.find(card => card.id === g.meta.parentSpecies);
    g.meta.name = `Evolved ${source ? source.n.toLowerCase() : base} / step ${g.meta.evolution.step}`;
    if (source) g.meta.sci = source.sci + ' / generated evolutionary variant';
  }
}
function finalize(g, rng) {
  if (!CLADES[g.meta.clade]) g.meta.clade = 'teleost'; if (!HABITATS[g.meta.habitat]) g.meta.habitat = 'coralReef';
  const tags = new Set(cladeTags(g.meta.clade)); let ni = NICHES[g.meta.niche], hab = HABITATS[g.meta.habitat];
  if (ni) { ni.tags.forEach(t => tags.add(t)); ni.ff.forEach(f => tags.add(f)); }
  if (g.skin.electric) tags.add('electric'); if (g.skin.inflate) tags.add('inflate');
  g.meta.tags = [...tags]; g.meta.fantasy = !!(hab && hab.fantasy) || !!(ni && ni.fantasy) || tags.has('fantasy');
  if (!g.meta.repairs) g.meta.repairs = [];
  repair(g);
  ni = NICHES[g.meta.niche]; hab = HABITATS[g.meta.habitat];
  const resolvedTags = new Set(cladeTags(g.meta.clade)); if (ni) { ni.tags.forEach(t => resolvedTags.add(t)); ni.ff.forEach(t => resolvedTags.add(t)); }
  if (g.skin.electric) resolvedTags.add('electric'); if (g.skin.inflate) resolvedTags.add('inflate');
  g.meta.tags = [...resolvedTags]; g.meta.fantasy = !!hab.fantasy || !!(ni && ni.fantasy) || resolvedTags.has('fantasy');
  g.meta.speculative = !!(g.meta.adapted && (!cladeAllowed(g.meta.clade, hab) || hab.fantasy));
  if (g.meta.adapted) { g.meta.adapted.to = g.meta.habitat; g.meta.adapted.speculative = g.meta.speculative; }
  if (!g.meta.surfaceSeed) g.meta.surfaceSeed = g.meta.seed;
  g.meta.version = FG.version; nameFish(g, rng || new RNG(g.meta.seed + ':name'));
  g.meta.sizeClass = sizeClass(g.body.length); g.meta.metrics = metrics(g); g.meta.landmarks = landmarks(g);
  return g;
}
/**
 * Generate a validated genome.
 * @param {{seed?:string,habitat?:string,niche?:string,clade?:string,species?:string,overrides?:Object,noSpecies?:boolean}} opts
 */
function generate(opts = {}) {
  const seed = String(opts.seed != null && opts.seed !== '' ? opts.seed : Math.floor(Math.random() * 1e9).toString(36));
  const rng = new RNG(`${seed}|${opts.habitat || ''}|${opts.niche || ''}|${opts.clade || ''}|${opts.species || ''}`);
  let species = opts.species ? SPECIES.find(s => s.id === opts.species) : null;
  let habId = opts.habitat && HABITATS[opts.habitat] ? opts.habitat : (species ? species.habitat : rng.pick(Object.keys(HABITATS).filter(h => !HABITATS[h].fantasy)));
  let nicheId = opts.niche, cladeId = opts.clade;
  if (species) { nicheId = opts.niche && NICHES[opts.niche] && cladeInNiche(species.clade, NICHES[opts.niche]) ? opts.niche : species.niche; cladeId = species.clade; }
  const hab = HABITATS[habId];
  if (!nicheId && cladeId && CLADES[cladeId]) {
    const candidates = {};
    for (const id in NICHES) if (cladeInNiche(cladeId, NICHES[id])) candidates[id] = hab.niches[id] || .08;
    if (Object.keys(candidates).length) nicheId = rng.weighted(candidates);
  }
  if (!nicheId || !NICHES[nicheId]) {
    const compatible = {};
    for (const id in hab.niches) {
      const niche = NICHES[id];
      if (niche && Object.keys(niche.clades).some(clade => CLADES[clade] && cladeAllowed(clade, hab))) compatible[id] = hab.niches[id];
    }
    if (!Object.keys(compatible).length) throw new Error(`No viable niches in ${hab.n}`);
    nicheId = rng.weighted(compatible);
  }
  const ni = NICHES[nicheId];
  if (!cladeId || !CLADES[cladeId]) cladeId = pickClade(ni, hab, rng);
  if (!species && !opts.noSpecies && rng.chance(0.35)) { const cands = SPECIES.filter(s => s.clade === cladeId && (s.habitat === habId || s.niche === nicheId)); if (cands.length) species = rng.pick(cands); }
  const meta = { seed, surfaceSeed: seed, habitat: habId, niche: nicheId, clade: cladeId, species: species ? species.id : null };
  const map = resolveTraitMap(meta);
  const g = defaultGenome(); Object.assign(g.meta, meta);
  sampleCorrelated(map, rng, g);
  genPalette(g, rng, hab, ni, map);
  if (species && habId !== species.habitat && !opts.noAdapt) adaptToHabitat(g, hab, species, rng, opts.niche);
  if (opts.overrides) for (const p in opts.overrides) if (SCHEMA[p]) setP(g, p, opts.overrides[p]);
  return finalize(g, rng);
}
/** Keep a reference species' body plan but adapt niche, colour, size and function-to-form to a different habitat. */
function adaptToHabitat(g, hab, species, rng, preferredNiche) {
  g.meta.adapted = { from: species.habitat, to: hab.id, speculative: !cladeAllowed(g.meta.clade, hab) || hab.fantasy };
  const w = {}; for (const id in hab.niches) if (cladeInNiche(g.meta.clade, NICHES[id])) w[id] = hab.niches[id];
  if (preferredNiche && NICHES[preferredNiche] && cladeInNiche(g.meta.clade, NICHES[preferredNiche])) g.meta.niche = preferredNiche;
  else if (Object.keys(w).length) g.meta.niche = rng.weighted(w);
  const ni = NICHES[g.meta.niche], ff = ni ? ni.ff : [];
  const hr = rng.pick(hab.pal.h), targetH = rng.range(hr[0], hr[1]), sat = (hab.pal.s[0] + hab.pal.s[1]) / 2 * (ni ? ni.sat : 1);
  for (const p of ['skin.base', 'skin.accent', 'skin.fin']) { const col = getP(g, p); const dh = ((targetH - col[0] + 540) % 360) - 180; col[0] = (col[0] + dh * .22 + 360) % 360; col[1] = lerp(col[1], clamp(sat, 0, 1), .2); }
  if (hab.light < .15) { g.head.eyeSize = clamp(g.head.eyeSize * 1.25, .05, .55); g.skin.iridescence *= .4; g.skin.base[2] *= .65; if (hab.light < .05) g.skin.photophores = Math.max(g.skin.photophores, 12); }
  if (ff.includes('maneuverer')) applyAdaptation(g, 'agility', .35, true);
  if (ff.includes('fastSwimmer')) applyAdaptation(g, 'speed', .3, true);
  if (ff.includes('crevice')) applyAdaptation(g, 'shelter', .4, true);
  const pelagicBody = anatomyProfile(g).family === 'pelagic' || g.swim.mode === 'thunniform';
  if ((ff.includes('camouflage') || ff.includes('ambusher')) && !pelagicBody) { if (g.skin.pattern === 'none') { g.skin.pattern = 'mottle'; g.skin.patternScale = Math.max(g.skin.patternScale, 1.4); } g.skin.patternStrength = clamp(Math.max(g.skin.patternStrength, .5), 0, .65); g.skin.iridescence = Math.min(g.skin.iridescence, .3); }
  if (ff.includes('bottomDweller')) g.body.ventralFlat = Math.max(g.body.ventralFlat, .4);
  if (['coralReef', 'rockyShore', 'mountainStream', 'cave', 'seagrass', 'blackwater'].includes(hab.id) && g.body.length > .5) g.body.length = Math.max(.35, g.body.length * .72);
  if (hab.tags.includes('fresh') && !cladeReq(g.meta.clade).includes('fresh')) g.skin.iridescence *= .7;
}
/* ==================================================================
   LINKED ADAPTATION MODULES: selection acts on whole functional units.
   God Mode widens variation, never disables architecture or repair.
   ================================================================== */
const ADAPTATIONS = {
  speed: { label: 'Streamlining', desc: 'Slender trunk, narrower peduncle and higher-aspect thrust.', paths: { 'body.fineness': 1, 'body.tailTaper': .7, 'body.pedDepth': -.7, 'fins.caudal.aspect': .65, 'fins.caudal.span': .35, 'fins.dorsal.height': -.3, 'swim.envPow': .55 }, weight: 'fastSwimmer' },
  agility: { label: 'Maneuverability', desc: 'Deeper body and broader, more flexible steering fins.', paths: { 'body.fineness': -.7, 'body.width': -.25, 'fins.pectoral.len': .9, 'fins.pectoral.spread': .65, 'fins.pectoral.flex': .45, 'fins.caudal.aspect': -.45, 'swim.amp': -.2 }, weight: 'maneuverer' },
  feeding: { label: 'Prey Capture', desc: 'Head, gape and jaw proportions evolve together.', paths: { 'head.lengthFrac': .5, 'mouth.gape': .8, 'head.eyeForward': .3, 'head.cheek': .4, 'mouth.cavityDepth': .3 }, weight: 'predator' },
  shelter: { label: 'Crevice Adaptation', desc: 'Elongated, low-profile body and reduced exposed fins.', paths: { 'body.fineness': .65, 'body.width': -.25, 'fins.dorsal.height': -.35, 'fins.pectoral.len': -.35, 'swim.amp': .15 }, weight: 'crevice' },
  display: { label: 'Fin Display', desc: 'Fin envelope and flexibility grow as one structure.', paths: { 'fins.dorsal.height': .55, 'fins.anal.height': .55, 'fins.caudal.span': .45, 'fins.pectoral.len': .2, 'fins.dorsal.flex': .35, 'fins.anal.flex': .35, 'skin.iridescence': .3 }, weight: 'maneuverer' },
  finShape: { label: 'Fin Silhouette', desc: 'Fin apex, sweep and curvature evolve with the ray envelope.', paths: { 'fins.dorsal.height': .8, 'fins.dorsal.apex': .6, 'fins.dorsal.curvature': .6, 'fins.dorsal.sweep': .7, 'fins.dorsal2.height': .7, 'fins.anal.height': .65, 'fins.pectoral.len': .45, 'fins.pectoral.apex': .6, 'fins.pectoral.curvature': .6, 'fins.pectoral.spread': .5 }, weight: 'maneuverer' },
  tail: { label: 'Tail Propulsion', desc: 'Tail span, chord, fork depth and peduncle evolve together.', paths: { 'fins.caudal.span': .9, 'fins.caudal.len': .8, 'fins.caudal.aspect': .6, 'fins.caudal.notch': .6, 'fins.caudal.flex': .3, 'body.pedDepth': -.4, 'body.pedWidth': -.25, 'swim.envPow': .25 }, weight: 'fastSwimmer' },
  robust: { label: 'Robustness', desc: 'Stronger shoulder, cheek and fin-root transitions.', paths: { 'body.shoulder': .8, 'head.cheek': .55, 'head.brow': .3, 'fins.dorsal.rootBlend': .7, 'fins.pectoral.rootBlend': .7, 'fins.caudal.rootBlend': .45 }, weight: 'armored' },
  pigment: { label: 'Pigmentation', desc: 'Palette shifts remain coordinated across skin and fins.', paths: { 'skin.patternStrength': .45, 'skin.iridescence': .2 }, color: true, weight: 'camouflage' },
  size: { label: 'Body Size', desc: 'Isometric growth preserves every attachment and proportion.', paths: { 'body.length': .6 }, weight: 'large' }
};
function traitBounds(g, p, extended = false, map = resolveTraitMap(g.meta)) {
  const e = SCHEMA[p], spec = map[p], a = anatomyProfile(g);
  if (a.locks[p] !== undefined) return { min: a.locks[p], max: a.locks[p], locked: true };
  if (g.meta.evolution && g.meta.evolution.step > 0 && e.t === 'n' && isNum(g.meta.evolution.origin[p])) return mutationBounds(g, p, g.meta.evolution);
  let lo = e.min, hi = e.max;
  if (spec && spec.r) { lo = spec.r[0]; hi = spec.r[1]; }
  else if (isNum(spec)) { lo = spec; hi = spec; }
  else { const v = Number(getP(g, p)); if (isNum(v)) { const span = Math.max(Math.abs(v) * .25, (e.max - e.min) * .04); lo = v - span; hi = v + span; } }
  if (g.meta.hybrid || g.meta.evo) { const v0 = Number(getP(g, p)); if (isNum(v0)) { lo = Math.min(lo, v0); hi = Math.max(hi, v0); } }
  if (extended) { const pad = Math.max((hi - lo) * .65, Math.abs(Number(getP(g, p))) * .2, (e.max - e.min) * .015); lo -= pad; hi += pad; }
  lo = Math.max(e.min, lo); hi = Math.min(e.max, hi);
  if (a.bounds[p]) { lo = Math.max(lo, a.bounds[p][0]); hi = Math.min(hi, a.bounds[p][1]); }
  if (hi < lo) lo = hi = clamp(Number(getP(g, p)), e.min, e.max);
  return { min: lo, max: hi, locked: Math.abs(hi - lo) < 1e-9 };
}
function applyAdaptation(g, id, amount, extended = false) {
  const module = ADAPTATIONS[id]; if (!module) return g;
  const map = resolveTraitMap(g.meta);
  for (const p in module.paths) {
    const b = traitBounds(g, p, extended, map), e = SCHEMA[p]; if (b.locked) continue;
    let v = clamp(getP(g, p) + amount * module.paths[p] * (b.max - b.min) * .48, b.min, b.max);
    if (e.t === 'i') v = Math.round(v); setP(g, p, v);
  }
  if (module.color) {
    const shift = amount * (g.meta.fantasy ? 60 : 18);
    for (const p of ['skin.base', 'skin.belly', 'skin.accent', 'skin.fin']) { const col = getP(g, p).slice(); col[0] = (col[0] + shift + 360) % 360; setP(g, p, col); }
  }
  return g;
}
/* Evolution envelopes stay anchored to the founding genome, so repeated
   steps do not inflate the allowed range. Values are relative to anatomy. */
const EVOLUTION_LIMITS = {
  'body.fineness': [.62, 1.6, .1], 'body.width': [.6, 1.55, .04],
  'body.pedDepth': [.55, 1.65, .025], 'body.pedWidth': [.6, 1.55, .04],
  'body.tailTaper': [.55, 1.4, .06], 'body.shoulder': [.5, 1.8, .08],
  'head.lengthFrac': [.72, 1.4, .015], 'head.cheek': [.5, 1.6, .08],
  'head.brow': [.5, 1.5, .05], 'head.eyeForward': [.6, 1.4, .04],
  'mouth.gape': [.6, 1.5, .025], 'mouth.cavityDepth': [.65, 1.4, .04],
  'fins.dorsal.height': [.5, 1.8, .035], 'fins.dorsal2.height': [.5, 1.8, .025],
  'fins.anal.height': [.5, 1.8, .03], 'fins.pectoral.len': [.55, 1.8, .04],
  'fins.pectoral.spread': [.65, 1.6, .05], 'fins.caudal.span': [.65, 1.6, .04],
  'fins.caudal.len': [.65, 1.6, .025], 'fins.caudal.aspect': [.65, 1.5, .06]
};
const FIN_NEIGHBORS = {
  dorsal: { triangle: ['falcate'], falcate: ['triangle'], rounded: ['lobe'], lobe: ['rounded'], notched: ['spinySoft'], spinySoft: ['notched'] },
  caudal: { rounded: ['emarginate'], emarginate: ['rounded', 'truncate'], truncate: ['emarginate'], forked: ['lyrate'], lyrate: ['forked'] }
};
function mutationAnchor(g) {
  if (g.meta.evolution && g.meta.evolution.clade === g.meta.clade && Object.keys(g.meta.evolution.origin || {}).length) return deepClone(g.meta.evolution);
  const origin = {};
  for (const id in ADAPTATIONS) for (const p in ADAPTATIONS[id].paths) if (SCHEMA[p] && SCHEMA[p].t === 'n') origin[p] = getP(g, p);
  return { step: 0, clade: g.meta.clade, origin, lastModule: '', direction: 1 };
}
function mutationBounds(g, p, anchor) {
  const e = SCHEMA[p], a = anatomyProfile(g);
  if (a.locks[p] !== undefined) return { min: a.locks[p], max: a.locks[p], locked: true };
  const v = isNum(anchor.origin[p]) ? anchor.origin[p] : getP(g, p), range = EVOLUTION_LIMITS[p] || [.6, 1.6, .04];
  let lo = Math.max(e.min, v * range[0] - (v < .1 ? range[2] : 0));
  let hi = Math.min(e.max, Math.max(v * range[1], v + range[2]));
  if (a.bounds[p]) { lo = Math.max(lo, a.bounds[p][0]); hi = Math.min(hi, a.bounds[p][1]); }
  if (p === 'fins.dorsal.height') hi = Math.min(hi, a.dorsalLimit);
  if (p === 'fins.caudal.span') { lo = Math.max(lo, a.tailSpan[0]); hi = Math.min(hi, a.tailSpan[1]); }
  if (p === 'fins.caudal.aspect') { const ar = CAUDAL_AR[g.fins.caudal.type]; lo = Math.max(lo, ar[0]); hi = Math.min(hi, ar[1]); }
  if (p === 'fins.caudal.len') hi = Math.min(hi, caudalLenMax(g));
  if (a.solid && p.endsWith('.flex')) hi = Math.min(hi, .38);
  if (hi < lo) lo = hi = clamp(getP(g, p), e.min, e.max);
  return { min: lo, max: hi, locked: hi - lo < 1e-8 };
}
function morphologySignature(g) {
  const d = 1 / g.body.fineness, lm = landmarks(g), s = { bodyDepth: d, bodyWidth: d * g.body.width, headLength: g.head.lengthFrac, headDepth: headDepth(g), gape: g.mouth.gape * headDepth(g) };
  if (g.fins.dorsal.present) s.dorsalExtent = d * g.fins.dorsal.height;
  if (g.fins.anal.present) s.analExtent = d * g.fins.anal.height;
  if (g.fins.pectoral.present) s.pectoralExtent = d * g.fins.pectoral.len;
  if (g.fins.caudal.present) { s.tailSpan = d * g.fins.caudal.span; s.tailChord = Math.min(g.fins.caudal.len * 1.3, s.tailSpan / Math.max(.2, g.fins.caudal.aspect * .6)); }
  s.dorsalBase = lm.dorsalEnd - lm.dorsalOrigin;
  return s;
}
function morphologyDifference(a, b) {
  const sa = morphologySignature(a), sb = morphologySignature(b); let score = 0;
  for (const k in sa) score = Math.max(score, Math.abs((sb[k] || 0) - sa[k]) / Math.max(.005, sa[k]));
  if (a.fins.dorsal.shape !== b.fins.dorsal.shape || a.fins.caudal.type !== b.fins.caudal.type) score = Math.max(score, .08);
  return score;
}
function mutationChanges(a, b) {
  const changes = [];
  for (const p in SCHEMA) {
    const from = getP(a, p), to = getP(b, p), e = SCHEMA[p];
    if (e.t === 'n' && Math.abs(to - from) > 1e-7) changes.push({ path: p, from: +from.toFixed(5), to: +to.toFixed(5), percent: +((to - from) / Math.max(Math.abs(from), .04) * 100).toFixed(1) });
    else if (e.t === 's' && from !== to) changes.push({ path: p, from, to, percent: null });
  }
  return changes;
}
function evolveModule(g, id, amount, anchor, rng) {
  for (const p in ADAPTATIONS[id].paths) {
    if (!SCHEMA[p] || SCHEMA[p].t !== 'n') continue;
    const fin = p.startsWith('fins.') && p.split('.')[1];
    if (fin && fin !== 'caudal' && fin !== 'dorsal2' && g.fins[fin] && !g.fins[fin].present) continue;
    if (fin === 'caudal' && !g.fins.caudal.present || fin === 'dorsal2' && g.fins.dorsal.count < 2) continue;
    const lim = mutationBounds(g, p, anchor); if (lim.locked) continue;
    const old = getP(g, p), floor = EVOLUTION_LIMITS[p] ? EVOLUTION_LIMITS[p][2] : .08;
    const delta = Math.max(Math.abs(old), floor) * amount * ADAPTATIONS[id].paths[p];
    setP(g, p, clamp(old + delta, lim.min, lim.max));
  }
  // Adjacent fin morphs occur only every third step, with the same support skeleton.
  if ((anchor.step + 1) % 3 === 0 && rng.chance(.7)) {
    if (id === 'finShape' && g.fins.dorsal.present) {
      const choices = FIN_NEIGHBORS.dorsal[g.fins.dorsal.shape];
      if (choices) g.fins.dorsal.shape = rng.pick(choices);
    }
    if (id === 'tail' && g.fins.caudal.present) {
      const choices = (FIN_NEIGHBORS.caudal[g.fins.caudal.type] || []).filter(type => SWIM_TAILS[g.swim.mode].includes(type));
      if (choices.length) g.fins.caudal.type = rng.pick(choices);
    }
  }
}
/** Each click changes a functional unit by a bounded step, then measures the repaired silhouette. */
function mutate(g0, strength = .55, seed, target = 'auto') {
  const mutationSeed = String(seed != null ? seed : g0.meta.seed + ':m'), rng = new RNG(mutationSeed), anchor = mutationAnchor(g0);
  strength = clamp(strength, .05, 1);
  const tags = new Set(g0.meta.tags || []), weights = {};
  const profiles = ['speed', 'agility', 'feeding', 'shelter', 'display', 'finShape', 'tail'];
  for (const id of profiles) weights[id] = tags.has(ADAPTATIONS[id].weight) ? 4 : 1;
  if (weights[anchor.lastModule]) weights[anchor.lastModule] *= 1.7;
  let best = null, score = -1, usedModule = '', usedAmount = 0;
  const step = lerp(.09, .24, strength);
  for (let attempt = 0; attempt < 12; attempt++) {
    const id = attempt < 4 && profiles.includes(target) ? target : rng.weighted(weights);
    const direction = attempt % 2 ? -1 : anchor.lastModule === id ? anchor.direction : (rng.chance(.5) ? -1 : 1);
    const amount = step * direction * rng.range(.93, 1.07), candidate = deepClone(g0);
    candidate.meta.parentSpecies = g0.meta.species || g0.meta.parentSpecies || null;
    candidate.meta.species = null; candidate.meta.seed = mutationSeed; candidate.meta.surfaceSeed = g0.meta.surfaceSeed || g0.meta.seed;
    candidate.meta.repairs = []; candidate.meta.edited = true;
    evolveModule(candidate, id, amount, anchor, rng);
    finalize(candidate);
    const difference = morphologyDifference(g0, candidate);
    if (difference > score && violations(candidate).length === 0) { best = candidate; score = difference; usedModule = id; usedAmount = amount; }
    if (score >= Math.max(.04, step * .38)) break;
  }
  if (score < .035) {
    for (const id of ['agility', 'speed', 'display', 'tail']) for (const direction of [-1, 1]) {
      const candidate = deepClone(g0), amount = step * direction;
      candidate.meta.parentSpecies = g0.meta.species || g0.meta.parentSpecies || null;
      candidate.meta.species = null; candidate.meta.seed = mutationSeed; candidate.meta.surfaceSeed = g0.meta.surfaceSeed || g0.meta.seed;
      candidate.meta.repairs = []; candidate.meta.edited = true;
      evolveModule(candidate, id, amount, anchor, rng); finalize(candidate);
      const difference = morphologyDifference(g0, candidate);
      if (difference > score && violations(candidate).length === 0) { best = candidate; score = difference; usedModule = id; usedAmount = amount; }
    }
  }
  if (!best || score < .025) throw new Error('No meaningful mutation remains within this lineage envelope. The current fish was preserved; try another lineage or an authored edit.');
  best.meta.evolution = { ...anchor, step: anchor.step + 1, lastModule: usedModule, direction: Math.sign(usedAmount) };
  best.meta.mutation = { source: g0.meta.name, modules: [{ id: usedModule, amount: +usedAmount.toFixed(4) }], strength, shapeChange: +score.toFixed(4), changes: mutationChanges(g0, best) };
  const source = SPECIES.find(s => s.id === best.meta.parentSpecies);
  best.meta.name = `Evolved ${source ? source.n.toLowerCase() : singular(CLADES[best.meta.clade].n).toLowerCase()} / step ${best.meta.evolution.step}`;
  best.meta.sci = source ? source.sci + ' / generated evolutionary variant' : best.meta.sci;
  return best;
}
Object.assign(FG, { EVOLUTION_LIMITS, mutationAnchor, mutationBounds, morphologyDifference, mutationChanges });
/** Crossover between two genomes of the same or neighbouring clades (tree distance ≤ 4). */
function breed(a, b, seed) {
  const dist = cladeDistance(a.meta.clade, b.meta.clade);
  if (dist > 4) throw new Error(`Clades too distant to breed (tree distance ${dist} > 4): ${CLADES[a.meta.clade].n} × ${CLADES[b.meta.clade].n}`);
  const rng = new RNG(String(seed != null ? seed : a.meta.seed + 'x' + b.meta.seed)), pickA = rng.chance(.5), primary = pickA ? a : b, secondary = pickA ? b : a, g = deepClone(primary);
  g.meta = Object.assign({}, g.meta, { seed: String(seed != null ? seed : a.meta.seed + 'x' + b.meta.seed), species: null, parentSpecies: null, parents: [a.meta.name, b.meta.name], repairs: [], edited: true });
  delete g.meta.evolution; delete g.meta.mutation;
  const compatible = anatomyProfile(a).family === anatomyProfile(b).family, blockMix = {}, map = resolveTraitMap(g.meta);
  for (const p in SCHEMA) {
    const e = SCHEMA[p], block = p.startsWith('fins.') ? p.split('.').slice(0, 2).join('.') : p.split('.')[0];
    if (blockMix[block] === undefined) blockMix[block] = rng.range(.15, .7);
    const t = blockMix[block], va = getP(primary, p), vb = getP(secondary, p);
    if (e.t === 'n' || e.t === 'i') { const lim = traitBounds(g, p, false, map); let v = clamp(lerp(va, vb, t), lim.min, lim.max); if (e.t === 'i') v = Math.round(v); setP(g, p, v); }
    else if (e.t === 'hsl') { const dh = ((vb[0] - va[0] + 540) % 360) - 180; setP(g, p, [(va[0] + dh * t + 360) % 360, lerp(va[1], vb[1], t), lerp(va[2], vb[2], t)]); }
    else if (compatible && !block.startsWith('fins') && block !== 'mouth' && block !== 'swim') setP(g, p, t > .5 ? vb : va);
  }
  finalize(g, rng); g.meta.name = 'Hybrid ' + g.meta.name.toLowerCase(); return g;
}
/* ── text → genome (offline keyword parser) ── */
const HAB_ALIASES = { coralReef: ['reef', 'coral'], openOcean: ['open ocean', 'pelagic', 'offshore', 'high seas'], mesopelagic: ['twilight', 'mesopelagic', 'midwater'], abyssal: ['abyss', 'deep sea', 'deep-sea', 'abyssal', 'deep water'], hadal: ['hadal', 'trench'], kelpForest: ['kelp'], rockyShore: ['tide pool', 'tidepool', 'rocky shore', 'rockpool'], sandFlat: ['sand flat', 'sandy', 'mud flat', 'sandflat'], seagrass: ['seagrass', 'eelgrass', 'meadow'], mangrove: ['mangrove'], brackish: ['estuary', 'brackish', 'delta'], polar: ['polar', 'arctic', 'antarctic', 'icy'], fastRiver: ['rapids', 'fast river', 'torrent'], slowRiver: ['river', 'creek', 'bayou'], mountainStream: ['stream', 'mountain', 'brook'], lake: ['lake', 'pond'], floodplain: ['amazon', 'floodplain', 'flooded forest'], blackwater: ['blackwater', 'swamp', 'peat'], cave: ['cave', 'cavern', 'subterranean'], deepReef: ['deep reef', 'mesophotic'], lavaLake: ['lava', 'magma', 'volcan', 'fire', 'ember'], skySea: ['sky', 'cloud', 'aerial', 'floating'], crystalCavern: ['crystal', 'gem', 'prism'], void: ['void', 'cosmic', 'starry', 'nebula', 'space'] };
const NICHE_ALIASES = { ambush: ['ambush', 'lurk', 'lie in wait'], pelagicHunter: ['fast', 'speedy', 'hunter', 'chase', 'sprinter'], apex: ['apex', 'top predator', 'giant predator', 'man-eater'], schooler: ['school', 'shoal', 'bait'], filterFeeder: ['filter', 'plankton eater', 'gentle giant'], grazer: ['graz', 'algae', 'herbivor'], reefManeuverer: ['maneuver', 'agile', 'nimble', 'colorful reef', 'colourful reef'], creviceHider: ['crevice', 'hole', 'hide', 'burrow'], bottomSifter: ['sift', 'bottom feeder', 'mud', 'scrounge'], flatBenthic: ['flat', 'lie on', 'buried'], currentHolder: ['current', 'rapids'], surfaceFeeder: ['surface', 'insect', 'skim'], cleaner: ['cleaner', 'clean'], scavenger: ['scaveng', 'carrion', 'carcass'], lurer: ['lure', 'angler', 'bait on'], verticalMigrator: ['migrat', 'lantern'], mimic: ['mimic', 'camoufl', 'disguise', 'leaf'], armoredBrowser: ['armor', 'armour', 'box', 'plated'], planktivore: ['plankton', 'zooplankton'], pursuitPredator: ['pursu', 'predator', 'carnivor'], nocturnalHunter: ['night', 'nocturnal'], parasite: ['parasit', 'blood'], hitchhiker: ['hitch', 'sucker'], glider: ['glid', 'fly', 'wing'], airBreather: ['breath', 'air', 'labyrinth'], amphibious: ['amphib', 'mudflat', 'walk'], suctionFeeder: ['suction', 'pipette', 'snout'], deepBenthic: ['deep bottom', 'rattail'], caveDweller: ['blind', 'cave'] };
const CLADE_STOP = new Set(['fish', 'fishes', 'true', 'allies', 'root', 'finned', 'ray-finned fish', 'lobe-finned fish', 'jawless fish', 'cartilaginous fish', 'fantasy lineage', 'perch-like fish', 'sea', 'deep', 'marine', 'fantasy']);
const CLADE_PHRASES = (() => { const m = new Map(); for (const id in CLADES) { if (id === 'fish') continue; const depth = cladePath(id).length; const n = CLADES[id].n.toLowerCase().replace(/\(.*?\)/g, ''); for (let part of n.split(/\s*(?:,|&|\/)\s*/)) { part = part.replace(/^true /, '').trim(); if (!part) continue; const cands = new Set([part, singular(part).toLowerCase()]); const last = part.split(/\s+/).pop(); cands.add(last); cands.add(singular(last).toLowerCase()); for (const ph of cands) { if (ph.length < 3 || CLADE_STOP.has(ph)) continue; const prev = m.get(ph); if (!prev || prev.depth > depth) m.set(ph, { id, depth }); } } } return [...m.entries()].map(([ph, v]) => [ph, v.id]).sort((a, b) => b[0].length - a[0].length); })();
const COLOR_WORDS = { red: [0, .8, .42], crimson: [350, .85, .4], scarlet: [5, .9, .45], orange: [28, .9, .5], yellow: [52, .9, .55], gold: [45, .85, .5], golden: [45, .85, .5], green: [115, .5, .4], emerald: [140, .7, .4], olive: [80, .4, .3], teal: [172, .6, .4], cyan: [185, .8, .5], turquoise: [175, .7, .5], blue: [215, .7, .45], navy: [225, .6, .2], indigo: [245, .6, .35], purple: [275, .6, .4], violet: [270, .7, .5], lavender: [265, .5, .7], pink: [335, .7, .7], magenta: [310, .8, .5], rose: [340, .6, .6], brown: [30, .4, .3], tan: [35, .4, .6], sandy: [40, .35, .65], black: [220, .1, .06], white: [0, 0, .95], silver: [200, .08, .72], grey: [200, .05, .5], gray: [200, .05, .5], ivory: [45, .3, .9], copper: [22, .7, .45], bronze: [30, .5, .4] };
function normText(prompt) { return ' ' + String(prompt || '').toLowerCase().replace(/[^a-z0-9\s\-]/g, ' ').replace(/\s+/g, ' ') + ' '; }
