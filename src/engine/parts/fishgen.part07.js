// @@PART js/app.part07.js (7/19) lines 1027-1261 of the original module script -- stripped by build.mjs
function metrics(g) {
  const bp = bodyProfile(g), lm = landmarks(g), f = g.fins, maxD = bp.maxD;
  let lat = 0; for (let i = 0; i < 50; i++) lat += bp.depth((i + .5) / 50) / 50;
  const finA = {};
  const dA = sp => (sp.e - sp.s) * sp.h * maxD * (FIN_FILL[sp.shape] || .7);
  finA.dorsal = f.dorsal.present && f.dorsal.count > 0 ? dA({ s: lm.dorsalOrigin, e: lm.dorsalEnd, h: f.dorsal.height, shape: f.dorsal.shape }) + (f.dorsal.count >= 2 ? dA({ s: lm.dorsal2Origin, e: lm.dorsal2End, h: f.dorsal2.height, shape: f.dorsal2.shape }) : 0) + (f.dorsal.count === 3 ? dA({ s: lm.dorsal3Origin, e: lm.dorsal3End, h: f.dorsal3.height, shape: f.dorsal3.shape }) : 0) : 0;
  finA.anal = f.anal.present ? dA({ s: lm.analOrigin, e: lm.analEnd, h: f.anal.height, shape: f.anal.shape }) : 0;
  finA.pectoral = f.pectoral.present ? 2 * f.pectoral.len * maxD * f.pectoral.baseLen * bp.depth(lm.pectoralBase) * .6 : 0;
  finA.pelvic = f.pelvic.present ? 2 * f.pelvic.len * maxD * .2 * maxD : 0;
  finA.caudal = f.caudal.present ? f.caudal.len * f.caudal.len * f.caudal.aspect * (CAUDAL_FILL[f.caudal.type] || .6) : 0;
  const fr = {}; for (const k in finA) fr[k] = +(finA[k] / Math.max(1e-6, lat)).toFixed(3);
  return { fineness: +g.body.fineness.toFixed(2), caudalAR: f.caudal.present ? +(f.caudal.aspect / (CAUDAL_FILL[f.caudal.type] || .6)).toFixed(2) : 0, relGape: +(g.mouth.gape * headDepth(g, bp)).toFixed(3), gapeOfHead: +g.mouth.gape.toFixed(2), finAreaFractions: fr, lateralAreaFrac: +lat.toFixed(3) };
}
FG.bodyProfile = bodyProfile; FG.landmarks = landmarks; FG.metrics = metrics;

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 6. BIOLOGICAL RULES ENGINE (declarative table + fixed-point run) ║
   ╚══════════════════════════════════════════════════════════════════╝ */
/** @typedef {{rule:string,path:string,from:any,to:any}} Repair */
const RULES = [];
const RULE = (id, desc, fn) => RULES.push({ id, desc, fn });
function clampLog(g, log, rule, path, lo, hi) {
  const v = getP(g, path); if (hi < lo) hi = lo;
  if (!isNum(v)) { setP(g, path, lo); log.push({ rule, path, from: v, to: lo }); return; }
  const nv = clamp(v, lo, hi); if (Math.abs(nv - v) > 1e-9) { setP(g, path, nv); log.push({ rule, path, from: +v.toFixed(4), to: +nv.toFixed(4) }); }
}
function setLog(g, log, rule, path, val) { const v = getP(g, path); if (v !== val) { setP(g, path, val); log.push({ rule, path, from: v, to: val }); } }
RULE('schema_bounds', 'Every trait inside schema bounds / enums; no NaN', (g, lm, log) => {
  for (const p in SCHEMA) { const e = SCHEMA[p], v = getP(g, p);
    if (e.t === 'n' || e.t === 'i') { if (!isNum(v)) { setLog(g, log, 'schema_bounds', p, e.def); continue; } clampLog(g, log, 'schema_bounds', p, e.min, e.max); if (e.t === 'i' && Math.round(getP(g, p)) !== getP(g, p)) setLog(g, log, 'schema_bounds', p, Math.round(getP(g, p))); }
    else if (e.t === 's') { if (!e.opts.includes(v)) setLog(g, log, 'schema_bounds', p, e.def); }
    else if (e.t === 'b') { if (typeof v !== 'boolean') setLog(g, log, 'schema_bounds', p, !!v); }
    else if (e.t === 'hsl') { if (!Array.isArray(v) || v.length !== 3 || !v.every(isNum)) setLog(g, log, 'schema_bounds', p, e.def.slice()); else { const c2 = [((v[0] % 360) + 360) % 360, clamp(v[1], 0, 1), clamp(v[2], 0, 1)]; if (c2.some((x, i) => x !== v[i])) setLog(g, log, 'schema_bounds', p, c2); } } }
});
RULE('gape_head', 'Gape ≤ head height and ≤ 0.95 × body depth at mouth corner', (g, lm, log) => {
  const bp = bodyProfile(g), hd = headDepth(g, bp), h = g.head.lengthFrac;
  let gp = g.mouth.gape, it = 0;
  while (it++ < 120 && gp > 0.05 && gp * hd > 0.95 * bp.depth(h * (0.12 + 0.6 * gp))) gp -= 0.01;
  gp = Math.max(0.05, gp);
  if (gp < g.mouth.gape - 1e-9) { log.push({ rule: 'gape_head', path: 'mouth.gape', from: +g.mouth.gape.toFixed(3), to: +gp.toFixed(3) }); g.mouth.gape = gp; }
  if (g.mouth.type === 'beak' || g.mouth.type === 'tube') clampLog(g, log, 'gape_head', 'mouth.gape', 0.05, 0.25);
});
RULE('dorsal_range', 'Dorsal bases ordered, non-overlapping, inside their segment', (g, lm, log) => {
  const d = g.fins.dorsal; clampLog(g, log, 'dorsal_range', 'fins.dorsal.u0', 0, 0.9); clampLog(g, log, 'dorsal_range', 'fins.dorsal.u1', d.u0 + 0.05, 1);
  if (d.count >= 2) { if (d.u1 > .87) clampLog(g, log, 'dorsal_range', 'fins.dorsal.u1', d.u0 + .05, .87); clampLog(g, log, 'dorsal_range', 'fins.dorsal2.u0', d.u1 + .02, .93); clampLog(g, log, 'dorsal_range', 'fins.dorsal2.u1', g.fins.dorsal2.u0 + .03, d.count === 3 ? .88 : 1); }
  if (d.count === 3) { clampLog(g, log, 'dorsal_range', 'fins.dorsal2.u1', g.fins.dorsal2.u0 + .03, .86); clampLog(g, log, 'dorsal_range', 'fins.dorsal3.u0', g.fins.dorsal2.u1 + .02, .95); clampLog(g, log, 'dorsal_range', 'fins.dorsal3.u1', g.fins.dorsal3.u0 + .025, 1); }
  if (d.count === 0 && d.present) setLog(g, log, 'dorsal_range', 'fins.dorsal.present', false);
});
RULE('anal_range', 'Anal base ordered and inside [vent, peduncle]', (g, lm, log) => { clampLog(g, log, 'anal_range', 'fins.anal.u0', 0, 0.9); clampLog(g, log, 'anal_range', 'fins.anal.u1', g.fins.anal.u0 + 0.05, 1); });
RULE('pectoral_base', 'Pectoral base ≤ 0.9 × local depth, behind operculum', (g, lm, log) => { clampLog(g, log, 'pectoral_base', 'fins.pectoral.baseLen', 0.03, 0.9); clampLog(g, log, 'pectoral_base', 'fins.pectoral.u', 0, 1); });
RULE('pelvic_ventral', 'Pelvics use ventral landmarks; true eel clades lack pelvics', (g, lm, log) => { if (cladeTags(g.meta.clade).has('eelLike') && g.fins.pelvic.present) setLog(g, log, 'pelvic_ventral', 'fins.pelvic.present', false); });
RULE('tail_swim_coherence', 'Caudal type consistent with swim mode', (g, lm, log) => { const ok = SWIM_TAILS[g.swim.mode] || CAUDAL_TYPES; if (g.fins.caudal.present && !ok.includes(g.fins.caudal.type)) setLog(g, log, 'tail_swim_coherence', 'fins.caudal.type', ok[0]); });
RULE('caudal_aspect', 'Caudal aspect ratio bounded by its type', (g, lm, log) => { const ar = CAUDAL_AR[g.fins.caudal.type]; if (ar) clampLog(g, log, 'caudal_aspect', 'fins.caudal.aspect', ar[0], ar[1]); });
RULE('caudal_len', 'Caudal length bounded by type', (g, lm, log) => { clampLog(g, log, 'caudal_len', 'fins.caudal.len', 0.03, caudalLenMax(g)); });
RULE('caudal_vs_peduncle', 'Caudal span ≥ 1.1 × peduncle depth; peduncle compatible with tail', (g, lm, log) => {
  const c2 = g.fins.caudal; if (!c2.present) return; const ped = bodyProfile(g).depth(0.999);
  const need = 1.1 * ped; if (c2.aspect * c2.len < need) { const ar = CAUDAL_AR[c2.type]; const a2 = Math.min(ar[1], need / c2.len); if (a2 > c2.aspect) setLog(g, log, 'caudal_vs_peduncle', 'fins.caudal.aspect', +a2.toFixed(3)); if (g.fins.caudal.aspect * c2.len < need) { const l2 = Math.min(caudalLenMax(g), need / g.fins.caudal.aspect); if (l2 > c2.len) setLog(g, log, 'caudal_vs_peduncle', 'fins.caudal.len', +l2.toFixed(3)); } if (g.fins.caudal.aspect * g.fins.caudal.len < need - 1e-6) { const ratio = (g.fins.caudal.aspect * g.fins.caudal.len) / need; clampLog(g, log, 'caudal_vs_peduncle', 'body.pedDepth', 0.03, Math.max(0.03, g.body.pedDepth * ratio * 0.98)); } }
  if (c2.type === 'lunate' || c2.type === 'forked') clampLog(g, log, 'caudal_vs_peduncle', 'body.pedDepth', 0.03, 0.35);
});
RULE('fineness_swim', 'Fineness ratio consistent with swim mode and body plan', (g, lm, log) => { const m = g.swim.mode; if (m === 'thunniform') clampLog(g, log, 'fineness_swim', 'body.fineness', 3.8, 17); else if (m === 'anguilliform' && g.body.roll === 0) clampLog(g, log, 'fineness_swim', 'body.fineness', 4.8, 17); else if (m === 'ostraciiform') clampLog(g, log, 'fineness_swim', 'body.fineness', 1.25, 4.5); });
RULE('swim_params', 'Wave envelope matches swim mode', (g, lm, log) => { const m = g.swim.mode; if (m === 'anguilliform') { clampLog(g, log, 'swim_params', 'swim.ampHead', 0.25, 1); clampLog(g, log, 'swim_params', 'swim.waveK', 1.2, 3); } else if (m === 'thunniform') { clampLog(g, log, 'swim_params', 'swim.ampHead', 0, 0.08); clampLog(g, log, 'swim_params', 'swim.envPow', 4, 16); } else if (m === 'carangiform') clampLog(g, log, 'swim_params', 'swim.ampHead', 0, 0.2); else if (m === 'ostraciiform') clampLog(g, log, 'swim_params', 'swim.envPow', 8, 16); else if (m === 'rajiform' || m === 'hippocampiform') clampLog(g, log, 'swim_params', 'swim.amp', 0, 0.03); });
RULE('eye_in_head', 'Eyes symmetric, inside the head, not larger than local depth', (g, lm, log) => { const bp = bodyProfile(g), h = g.head.lengthFrac; clampLog(g, log, 'eye_in_head', 'head.eyeU', 0.15, 0.92); clampLog(g, log, 'eye_in_head', 'head.eyeV', -0.7, 0.98); const maxE = 0.42 * bp.depth(h * g.head.eyeU) / h; clampLog(g, log, 'eye_in_head', 'head.eyeSize', 0.05, Math.max(0.05, maxE)); });
RULE('eye_mouth_clearance', 'Eye sits clear above the jaw line and below the dorsal profile', (g, lm, log) => {
  if (g.head.eyeSide === 'none' || g.body.roll !== 0) return;
  if (g.head.special === 'hammer') { clampLog(g, log, 'eye_mouth_clearance', 'head.eyeV', -.1, .3); return; }
  const bp = bodyProfile(g), h = g.head.lengthFrac, d = bp.depth(h * g.head.eyeU); if (!(d > 0)) return;
  const mt = MOUTH_LINE[g.mouth.type] || MOUTH_LINE.terminal, dUp = d * g.body.dorsalFrac, dDn = d * (1 - g.body.dorsalFrac);
  const topF = Math.max(mt[0], mt[1]), mouthTop = topF >= 0 ? topF * dUp : topF * dDn, scale = Math.max(1e-6, d * g.body.dorsalFrac * 0.7);
  let eyeR = g.head.eyeSize * h * 0.5;
  const room = dUp * 0.96 - mouthTop - 0.1 * d;
  if (2 * eyeR > room * 0.92) { clampLog(g, log, 'eye_mouth_clearance', 'head.eyeSize', 0.05, Math.max(0.05, room * 0.92 / h)); eyeR = g.head.eyeSize * h * 0.5; }
  const vMin = (mouthTop + eyeR + 0.05 * d) / scale, vMax = (dUp * 0.96 - eyeR) / scale;
  clampLog(g, log, 'eye_mouth_clearance', 'head.eyeV', Math.min(vMin, 0.98), Math.max(Math.min(vMin, 0.98), Math.min(vMax, 0.98)));
});
RULE('countershade', 'Dorsum darker than belly unless niche overrides', (g, lm, log) => { if (g.skin.countershade < 0.3 || (g.meta.tags || []).includes('noCountershade')) return; const b = g.skin.base, be = g.skin.belly; if (be[2] < b[2] + 0.1 - 1e-9) { if (b[2] > 0.84) setLog(g, log, 'countershade', 'skin.base', [b[0], b[1], 0.84]); const bl = Math.min(b[2], 0.84); setLog(g, log, 'countershade', 'skin.belly', [be[0], Math.min(be[1], b[1]), +Math.min(0.96, bl + 0.12).toFixed(4)]); } });
RULE('teeth_mouth', 'Teeth consistent with mouth type', (g, lm, log) => { const m = g.mouth; if (m.type === 'tube') { setLog(g, log, 'teeth_mouth', 'mouth.teeth', 'none'); } if (m.type === 'beak' && m.teeth !== 'beak' && m.teeth !== 'none') setLog(g, log, 'teeth_mouth', 'mouth.teeth', 'beak'); if (m.type === 'suction' && !['rasp', 'none'].includes(m.teeth)) setLog(g, log, 'teeth_mouth', 'mouth.teeth', 'rasp'); if (g.mouth.teeth === 'none') setLog(g, log, 'teeth_mouth', 'mouth.teethCount', 0); else if (g.mouth.teeth === 'beak') clampLog(g, log, 'teeth_mouth', 'mouth.teethCount', 2, 4); else if (g.mouth.teethCount < 2) setLog(g, log, 'teeth_mouth', 'mouth.teethCount', 2); });
RULE('barbels_mouth', 'No barbels on beak/tube mouths', (g, lm, log) => { if ((g.mouth.type === 'beak' || g.mouth.type === 'tube') && g.head.barbels > 0) setLog(g, log, 'barbels_mouth', 'head.barbels', 0); });
RULE('ray_counts', 'Each fin has ≥ 3 total rays', (g, lm, log) => { for (const k of ['dorsal', 'anal']) { const f = g.fins[k]; if (f.spines + f.rays < 3) setLog(g, log, 'ray_counts', `fins.${k}.rays`, 3 - f.spines); } if (g.fins.dorsal2.spines + g.fins.dorsal2.rays < 3) setLog(g, log, 'ray_counts', 'fins.dorsal2.rays', 3 - g.fins.dorsal2.spines); });
RULE('photophores_light', 'Photophores only in dark habitats (or glow lineages)', (g, lm, log) => { const hab = HABITATS[g.meta.habitat]; if (hab && hab.light > 0.45 && !g.meta.fantasy && g.skin.photophores > 0 && !(g.meta.tags || []).includes('deep')) setLog(g, log, 'photophores_light', 'skin.photophores', 0); });
RULE('upright_posture', 'Upright posture ⇒ hippocampiform swimming, no caudal fin', (g, lm, log) => { if (g.body.posture > 60) { setLog(g, log, 'upright_posture', 'swim.mode', 'hippocampiform'); setLog(g, log, 'upright_posture', 'fins.caudal.present', false); } });
RULE('special_sizes', 'Special structures sized sanely', (g, lm, log) => { const s = g.head.special; if (s === 'bill' || s === 'sword') clampLog(g, log, 'special_sizes', 'head.specialLen', 0.1, 0.4); else if (s === 'hammer') { clampLog(g, log, 'special_sizes', 'head.specialWidth', 0.1, 0.35); clampLog(g, log, 'special_sizes', 'head.specialLen', 0.06, g.head.lengthFrac * 0.7); clampLog(g, log, 'special_sizes', 'head.eyeU', 0.15, Math.max(0.15, g.head.specialLen / g.head.lengthFrac * 0.85)); } else if (s === 'esca') clampLog(g, log, 'special_sizes', 'head.specialLen', 0.05, 0.7); else if (s === 'horns') clampLog(g, log, 'special_sizes', 'head.specialLen', 0.03, 0.2); });
RULE('inferior_jaw', 'Inferior/suction mouths have a shorter lower jaw; superior have longer', (g, lm, log) => { const t = g.mouth.type; if (t === 'inferior' || t === 'suction') clampLog(g, log, 'inferior_jaw', 'mouth.jawRatio', 0.4, 0.8); else if (t === 'superior') clampLog(g, log, 'inferior_jaw', 'mouth.jawRatio', 1.02, 1.5); else if (t === 'subterminal') clampLog(g, log, 'inferior_jaw', 'mouth.jawRatio', 0.6, 0.95); });
RULE('flat_eyes', 'Flatfish eyes migrate to one side; others symmetric', (g, lm, log) => { if (g.body.roll !== 0 && g.head.eyeSide === 'both') setLog(g, log, 'flat_eyes', 'head.eyeSide', g.body.roll < 0 ? 'left' : 'right'); if (g.body.roll === 0 && (g.head.eyeSide === 'left' || g.head.eyeSide === 'right')) setLog(g, log, 'flat_eyes', 'head.eyeSide', 'both'); });
RULE('lineage_architecture', 'Preserve lineage-specific gills, fin supports and functional body plan', (g, lm, log) => {
  const a = anatomyProfile(g);
  for (const p in a.locks) setLog(g, log, 'lineage_architecture', p, a.locks[p]);
  for (const p in a.bounds) clampLog(g, log, 'lineage_architecture', p, a.bounds[p][0], a.bounds[p][1]);
  clampLog(g, log, 'lineage_architecture', 'fins.caudal.span', a.tailSpan[0], a.tailSpan[1]);
  clampLog(g, log, 'lineage_architecture', 'fins.dorsal.height', .03, a.dorsalLimit);
  if (a.solid) for (const k of ['dorsal', 'anal', 'pectoral', 'caudal']) {
    clampLog(g, log, 'lineage_architecture', `fins.${k}.opacity`, .94, 1);
    clampLog(g, log, 'lineage_architecture', `fins.${k}.flex`, 0, .38);
  }
});
RULE('caudal_proportion', 'Tail span follows the body and blends out of the peduncle', (g, lm, log) => {
  if (!g.fins.caudal.present) return;
  const minSpan = g.body.pedDepth * 1.18;
  clampLog(g, log, 'caudal_proportion', 'fins.caudal.span', Math.max(.45, minSpan), anatomyProfile(g).tailSpan[1]);
  if (['lunate', 'forked'].includes(g.fins.caudal.type)) clampLog(g, log, 'caudal_proportion', 'body.pedWidth', .35, 1.3);
  if (g.fins.caudal.type === 'heterocercal') clampLog(g, log, 'caudal_proportion', 'fins.caudal.lobeAsym', .2, .85);
  else if (g.fins.caudal.type === 'hypocercal') clampLog(g, log, 'caudal_proportion', 'fins.caudal.lobeAsym', -.7, -.15);
  else if (!['filamentous', 'diphycercal'].includes(g.fins.caudal.type)) clampLog(g, log, 'caudal_proportion', 'fins.caudal.lobeAsym', -.12, .18);
});
RULE('fin_segment_balance', 'Second dorsal does not overpower the first; finlets occupy a free segment', (g, lm, log) => {
  const a = anatomyProfile(g), d = g.fins.dorsal;
  if (d.count === 2 && a.family === 'shark') clampLog(g, log, 'fin_segment_balance', 'fins.dorsal2.height', .03, Math.max(.08, d.height * .6));
  const lastD = d.count === 3 ? lm.dorsal3End : d.count === 2 ? lm.dorsal2End : lm.dorsalEnd;
  if (g.fins.finlets.count && lastD > g.body.pedU - .035) setLog(g, log, 'fin_segment_balance', 'fins.finlets.count', 0);
  if (g.fins.adipose.present && lastD > g.body.pedU - .045) setLog(g, log, 'fin_segment_balance', 'fins.adipose.present', false);
  clampLog(g, log, 'fin_segment_balance', 'fins.pectoral.baseLen', .06, a.family === 'ray' ? .9 : .65);
});
RULE('oral_gill_separation', 'The gill chamber begins behind the mouth articulation', (g, lm, log) => {
  clampLog(g, log, 'oral_gill_separation', 'head.gillStart', Math.max(.45, lm.mouthCorner / g.head.lengthFrac + .05), .78);
});
RULE('habitat_ecology', 'Lineage matches salinity, depth zone and thermal habitat (unless explicitly adapted)', (g, lm, log) => {
  const habitat = HABITATS[g.meta.habitat]; if (!habitat || g.meta.adapted || cladeAllowed(g.meta.clade, habitat)) return;
  const card = SPECIES.find(s => s.id === (g.meta.species || g.meta.parentSpecies));
  const candidates = Object.values(HABITATS).filter(h => cladeAllowed(g.meta.clade, h));
  const match = card && candidates.find(h => h.id === card.habitat) || candidates.find(h => !h.fantasy) || candidates[0];
  if (match) setLog(g, log, 'habitat_ecology', 'meta.habitat', match.id);
});
RULE('niche_identity', 'Ecological niche is supported by the selected evolutionary branch', (g, lm, log) => {
  const niche = NICHES[g.meta.niche]; if (niche && (g.meta.hybrid || cladeInNiche(g.meta.clade, niche))) return;
  const habitat = HABITATS[g.meta.habitat], weights = {};
  for (const id in NICHES) if (cladeInNiche(g.meta.clade, NICHES[id])) weights[id] = habitat && habitat.niches[id] || .1;
  if (Object.keys(weights).length) setLog(g, log, 'niche_identity', 'meta.niche', new RNG(g.meta.seed + ':niche-repair').weighted(weights));
});
RULE('surface_ornaments', 'No detached conical head ornaments; brow anatomy is sculpted into the skin', (g, lm, log) => {
  if (g.head.special === 'horns') setLog(g, log, 'surface_ornaments', 'head.special', 'none');
});
FG.RULES = RULES;
/** Run all rules to a fixed point. Repairs are appended to g.meta.repairs. */
function repair(g) {
  const log = g.meta.repairs || (g.meta.repairs = []);
  for (let pass = 0; pass < 12; pass++) { const before = log.length, lm = landmarks(g); for (const rl of RULES) { try { rl.fn(g, lm, log); } catch (e) { log.push({ rule: rl.id, path: '-', from: 'error', to: String(e.message) }); } } if (log.length === before) break; }
  return log;
}
/** Report-only pass: violations that a fresh rules run would still repair (should be empty after repair()). */
function violations(g) { const c2 = deepClone(g); c2.meta.repairs = []; repair(c2); return c2.meta.repairs; }
FG.repair = repair; FG.violations = violations;

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 7. GENERATION PIPELINE: resolve → sample → palette → repair      ║
   ╚══════════════════════════════════════════════════════════════════╝ */
function narrow(map, p, spec, hard) {
  const cur = map[p];
  if (hard || cur === undefined) { map[p] = spec; return; }
  const curR = cur && cur.r, specR = spec && spec.r;
  if (specR && curR) { const lo = Math.max(curR[0], specR[0]), hi = Math.min(curR[1], specR[1]); if (lo <= hi) map[p] = { r: [lo, hi], i: cur.i || spec.i }; else { const w = (curR[1] - curR[0]) * 0.25; map[p] = specR[0] > curR[1] ? { r: [curR[1] - w, curR[1]], i: cur.i } : { r: [curR[0], curR[0] + w], i: cur.i }; } return; }
  if (specR && isNum(cur)) return;
  if (spec && spec.c && cur && cur.c) { const inter = cur.c.filter(x => spec.c.includes(x)); map[p] = inter.length ? { c: inter } : cur; return; }
  if (cur && typeof cur === 'object' && !Array.isArray(cur)) { map[p] = spec; }
}
function applyForm(map, rule) {
  if (!rule) return;
  for (const p in rule) { const q = rule[p], cur = map[p], sch = SCHEMA[p]; if (!sch) continue;
    if (q.set !== undefined) { if (cur === undefined || (cur && typeof cur === 'object' && !Array.isArray(cur))) map[p] = q.set; continue; }
    if (q.oneOf) { if (cur === undefined) map[p] = { c: q.oneOf }; else if (cur && cur.c) { const i = cur.c.filter(x => q.oneOf.includes(x)); if (i.length) map[p] = { c: i }; } continue; }
    const lo = q.min !== undefined ? q.min : -Infinity, hi = q.max !== undefined ? q.max : Infinity;
    if (cur === undefined) map[p] = { r: [Math.max(lo, sch.min), Math.min(hi, sch.max)], i: sch.t === 'i' ? 1 : 0 };
    else if (cur && cur.r) { const a = Math.max(cur.r[0], lo), b = Math.min(cur.r[1], hi); map[p] = a <= b ? { r: [a, b], i: cur.i } : { r: lo > cur.r[1] ? [cur.r[1], cur.r[1]] : [cur.r[0], cur.r[0]], i: cur.i }; }
  }
}
/** Resolve the trait map (path → spec) for a (clade, niche, species) combination. */
function resolveTraitMap(meta) {
  const map = {};
  for (const n of cladePath(meta.clade)) {
    Object.assign(map, n.t);
    if (ANATOMY[n.id] && ANATOMY[n.id].traits) Object.assign(map, ANATOMY[n.id].traits);
  }
  const ni = NICHES[meta.niche];
  if (ni) { for (const ff of ni.ff) applyForm(map, FORM_RULES[ff]); for (const p in ni.t) narrow(map, p, ni.t[p], false); }
  const sp = meta.species || meta.parentSpecies ? SPECIES.find(s => s.id === (meta.species || meta.parentSpecies)) : null;
  if (sp) for (const p in sp.t) map[p] = sp.t[p];
  return map;
}
function sampleSpec(spec, rng) {
  if (spec && typeof spec === 'object' && !Array.isArray(spec)) {
    if (spec.r) { const v = rng.range(spec.r[0], spec.r[1]); return spec.i ? Math.round(v) : v; }
    if (spec.c) return rng.pick(spec.c);
    if (spec.hsl) return spec.hsl.map(x => { if (!Array.isArray(x)) return x; if (Array.isArray(x[0])) { const rr = rng.pick(x); return rng.range(rr[0], rr[1]); } return rng.range(x[0], x[1]); });
  }
  return Array.isArray(spec) ? spec.slice() : spec;
}
const TRAIT_LINKS = {
  'body.fineness': ['locomotion', 1], 'body.pedDepth': ['locomotion', -1], 'body.tailTaper': ['locomotion', 1],
  'fins.caudal.aspect': ['locomotion', 1], 'fins.caudal.span': ['locomotion', 1], 'swim.envPow': ['locomotion', 1],
  'mouth.gape': ['feeding', 1], 'head.lengthFrac': ['feeding', 1], 'head.eyeForward': ['feeding', 1],
  'fins.pectoral.len': ['maneuvering', 1], 'fins.pectoral.spread': ['maneuvering', 1], 'fins.pectoral.flex': ['maneuvering', 1]
};
function sampleCorrelated(map, rng, g) {
  const latent = {};
  for (const p in SCHEMA) if (map[p] !== undefined) {
    const spec = map[p], link = TRAIT_LINKS[p] || [p.startsWith('fins.') ? p.split('.').slice(0, 2).join('.') : p.split('.')[0], 1];
    if (latent[link[0]] === undefined) latent[link[0]] = rng.range(.06, .94);
    if (spec && spec.r) {
      const q = clamp((link[1] > 0 ? latent[link[0]] : 1 - latent[link[0]]) + (rng.next() - .5) * .07, 0, 1);
      const v = lerp(spec.r[0], spec.r[1], q); setP(g, p, spec.i || SCHEMA[p].t === 'i' ? Math.round(v) : v);
    } else if (SCHEMA[p].t === 'hsl' && Array.isArray(spec) && spec.some(Array.isArray)) setP(g, p, spec.map(x => Array.isArray(x) ? rng.range(x[0], x[1]) : x));
    else setP(g, p, sampleSpec(spec, rng));
  }
}
function genPalette(g, rng, hab, ni, map) {
  const pal = hab.pal, sat = (ni && ni.sat) || 1;
  if (!map['skin.base']) { const hr = rng.pick(pal.h); g.skin.base = [(rng.range(hr[0], hr[1]) + 360) % 360, clamp(rng.range(pal.s[0], pal.s[1]) * sat, 0, 1), rng.range(pal.l[0], pal.l[1])]; }
  const [h, s, l] = g.skin.base;
  if (!map['skin.belly']) g.skin.belly = [(h + rng.range(-12, 12) + 360) % 360, s * 0.3, clamp(l + 0.35, 0.3, 0.95)];
  if (!map['skin.accent']) {
    const camo = !!(ni && ni.ff.some(rule => ['camouflage', 'ambusher', 'flatBenthic', 'crevice', 'bottomDweller'].includes(rule)));
    const dh = camo ? rng.range(-12, 12) : rng.pick([24, -24, 38, -38]);
    g.skin.accent = [(h + dh + 360) % 360, clamp(camo ? s * .72 : s * .88, 0, .9), camo ? l * .5 : clamp(l * .5 + .05, .06, .6)];
  }
  if (!map['skin.fin']) g.skin.fin = [(h + rng.range(-10, 10) + 360) % 360, s * 0.75, clamp(l + 0.05, 0, 1)];
  if (!map['skin.eye']) g.skin.eye = rng.pick([[45, .85, .5], [40, .3, .7], [0, 0, .1], [0, .8, .4], [120, .5, .5], [30, .9, .55]]);
  if (!map['skin.glow'] && g.skin.photophores > 0) g.skin.glow = rng.pick([[190, 1, .6], [160, 1, .6], [210, 1, .65], [350, .9, .6]]);
}
function cladeAllowed(id, hab) {
  const e = ecologyProfile(id);
  if (hab.fantasy) return !e.habitats || e.habitats.includes(hab.id);
  if (!cladeReq(id).some(t => hab.tags.includes(t))) return false;
  return (!e.bands || e.bands.includes(depthBand(hab))) && (!e.excluded || !e.excluded.some(t => hab.tags.includes(t))) && (!e.requireAny || e.requireAny.some(t => hab.tags.includes(t)));
}
function pickClade(ni, hab, rng) {
  const w = {};
  for (const id in ni.clades) if (CLADES[id] && cladeAllowed(id, hab)) w[id] = ni.clades[id];
  if (!Object.keys(w).length) throw new Error(`No viable ${ni.n.toLowerCase()} clades in ${hab.n}; choose another niche`);
  return rng.weighted(w);
}
/* naming */
const PATTERN_ADJ = { stripes: 'Striped', bars: 'Banded', spots: 'Spotted', reticulate: 'Reticulated', saddles: 'Saddled', mottle: 'Mottled', disruptive: 'Masked', eyespot: 'Ocellated' };
const HAB_ADJ = { coralReef: 'reef', openOcean: 'oceanic', mesopelagic: 'twilight', abyssal: 'abyssal', hadal: 'hadal', kelpForest: 'kelp', rockyShore: 'shore', sandFlat: 'sand', seagrass: 'grassbed', mangrove: 'mangrove', brackish: 'estuary', polar: 'polar', fastRiver: 'river', slowRiver: 'river', mountainStream: 'brook', lake: 'lake', floodplain: 'Amazon', blackwater: 'blackwater', cave: 'cave', deepReef: 'deep-reef', lavaLake: 'ember', skySea: 'sky', crystalCavern: 'crystal', void: 'void' };
function hueName(c2) { const [h, s, l] = c2; if (l < 0.14) return 'Black'; if (s < 0.18) return l > 0.55 ? 'Silver' : 'Grey'; if (h < 15 || h >= 345) return 'Red'; if (h < 45) return l < 0.35 ? 'Brown' : 'Orange'; if (h < 70) return 'Golden'; if (h < 160) return 'Green'; if (h < 190) return 'Teal'; if (h < 260) return 'Blue'; if (h < 300) return 'Violet'; return 'Rose'; }
function singular(n) { n = n.split(/ & | \/ |,/)[0].replace(/\s*\(.*\)/, '').replace(/^True /, '').trim(); if (/fishes$/.test(n)) return n.replace(/es$/, ''); if (/ies$/.test(n)) return n.replace(/ies$/, 'y'); if (/sses$/.test(n)) return n.replace(/es$/, ''); if (/s$/.test(n) && !/ss$/.test(n)) return n.replace(/s$/, ''); return n; }
const SYL = ['ich', 'thy', 'os', 'ar', 'en', 'la', 'pto', 'mor', 'ne', 'ra', 'xi', 'do', 'gla', 'tri', 'on', 'ba', 'lo', 'cy', 'pha', 'sel', 'ko', 'ti'];
const GEN_END = ['ichthys', 'gnathus', 'pterus', 'soma', 'cephalus', 'notus', 'urus', 'don'];
