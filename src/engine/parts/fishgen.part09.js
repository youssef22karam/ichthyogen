// @@PART js/app.part09.js (9/19) lines 1558-1847 of the original module script -- stripped by build.mjs
/** Fuzzy species lookup: full name, all significant words, or scientific name. */
function findSpecies(text) {
  const t = normText(text); let best = null, score = 0;
  for (const s of SPECIES) {
    const n = s.n.toLowerCase().replace(/[^a-z0-9\s\-]/g, ' '), sci = s.sci.toLowerCase(); let sc = 0;
    if (t.includes(' ' + n + ' ') || t.includes(' ' + sci + ' ')) sc = 100 + n.length;
    else { const words = n.split(/[\s\-]+/).filter(x => x.length > 3); if (words.length && words.every(x => t.includes(' ' + x))) sc = 50 + words.join('').length; else if (words.length > 1 && words.filter(x => t.includes(' ' + x)).length >= Math.ceil(words.length * .67)) sc = 20 + words.length; }
    if (sc > score) { score = sc; best = s; }
  }
  return best;
}
function findHabitat(text) { const t = normText(text); for (const h in HAB_ALIASES) if (HAB_ALIASES[h].some(w => t.includes(w))) return h; return null; }
function genomeFromText(prompt, seed, defaultHabitat) {
  const t = normText(prompt);
  const has = ws => ws.some(w => t.includes(w)); const opts = { overrides: {}, seed: seed != null ? seed : cyrb128(prompt)[0].toString(36) };
  const best = findSpecies(prompt);
  if (best) opts.species = best.id;
  for (const [ph, id] of CLADE_PHRASES) if (t.includes(' ' + ph + ' ') || t.includes(' ' + ph + 's ') || t.includes(' ' + ph + 'es ')) { opts.clade = id; break; }
  const habHit = findHabitat(prompt); if (habHit) opts.habitat = habHit; else if (defaultHabitat && HABITATS[defaultHabitat]) opts.habitat = defaultHabitat;
  for (const n in NICHE_ALIASES) if (has(NICHE_ALIASES[n])) { opts.niche = n; break; }
  const o = opts.overrides; const cols = Object.keys(COLOR_WORDS).filter(w => t.includes(' ' + w)).sort((a, b) => t.indexOf(' ' + a) - t.indexOf(' ' + b));
  if (cols[0]) { o['skin.base'] = COLOR_WORDS[cols[0]].slice(); o['skin.fin'] = [COLOR_WORDS[cols[0]][0], COLOR_WORDS[cols[0]][1] * .7, Math.min(.9, COLOR_WORDS[cols[0]][2] + .1)]; }
  if (cols[1]) o['skin.accent'] = COLOR_WORDS[cols[1]].slice();
  if (has(['stripe'])) o['skin.pattern'] = 'stripes'; else if (has(['band', 'bar '])) o['skin.pattern'] = 'bars'; else if (has(['spot', 'dot', 'polka'])) o['skin.pattern'] = 'spots'; else if (has(['mottl', 'blotch'])) o['skin.pattern'] = 'mottle'; else if (has(['eyespot', 'ocell'])) o['skin.pattern'] = 'eyespot'; else if (has(['reticul', ' net', 'honeycomb'])) o['skin.pattern'] = 'reticulate'; else if (has(['saddle'])) o['skin.pattern'] = 'saddles'; else if (has(['plain', 'solid'])) o['skin.pattern'] = 'none';
  if (o['skin.pattern'] && o['skin.pattern'] !== 'none') o['skin.patternStrength'] = .9;
  if (has(['tiny', 'minute'])) o['body.length'] = .04; else if (has(['small', 'little'])) o['body.length'] = .1; else if (has(['huge', 'giant', 'enormous', 'massive', 'colossal'])) o['body.length'] = 3; else if (has(['large', 'big'])) o['body.length'] = 1.2;
  if (has(['eel-like', 'eellike', 'snake', 'serpent', 'ribbon'])) { o['body.fineness'] = 11; o['swim.mode'] = 'anguilliform'; } else if (has(['long', 'slender', 'elongat', 'skinny', 'torpedo', 'streamlined'])) o['body.fineness'] = 6.5; else if (has(['deep-bodied', 'deep bodied', 'tall', 'disc', 'discus', 'pancake'])) o['body.fineness'] = 1.9; else if (has(['round', 'fat', 'chubby', 'plump', 'globular'])) { o['body.fineness'] = 2.6; o['body.width'] = .85; }
  if (has(['flattened', 'depressed', 'flat '])) { o['body.width'] = 1.8; o['body.ventralFlat'] = 1; }
  if (has(['compressed', 'laterally'])) o['body.width'] = .3;
  if (has(['barbel', 'whisker'])) { o['head.barbels'] = 4; o['head.barbelLen'] = .6; }
  if (has(['glow', 'biolum', 'lumin', 'light organ', 'photophore'])) o['skin.photophores'] = 30;
  if (has(['sword'])) { o['head.special'] = 'sword'; o['head.specialLen'] = .32; } else if (has(['bill', 'spear'])) { o['head.special'] = 'bill'; o['head.specialLen'] = .22; } else if (has(['hammer'])) { o['head.special'] = 'hammer'; } else if (has(['horn', 'antler'])) { o['head.special'] = 'horns'; o['head.specialLen'] = .12; } else if (has(['lure', 'esca', 'fishing rod'])) { o['head.special'] = 'esca'; o['head.specialLen'] = .35; } else if (has(['saw'])) { o['head.special'] = 'rostrum'; o['head.specialLen'] = .28; }
  if (has(['fang'])) { o['mouth.teeth'] = 'fang'; o['mouth.teethCount'] = 24; o['mouth.gape'] = .7; } else if (has(['needle teeth', 'needle-like'])) { o['mouth.teeth'] = 'needle'; o['mouth.teethCount'] = 40; } else if (has(['beak', 'parrot'])) { o['mouth.type'] = 'beak'; o['mouth.teeth'] = 'beak'; } else if (has(['toothless', 'no teeth'])) { o['mouth.teeth'] = 'none'; } else if (has(['big mouth', 'huge mouth', 'gaping', 'wide mouth', 'large mouth'])) o['mouth.gape'] = .85;
  if (has(['sucker mouth', 'suction'])) o['mouth.type'] = 'suction'; else if (has(['upturned', 'superior mouth'])) o['mouth.type'] = 'superior'; else if (has(['underslung', 'inferior mouth', 'under the snout'])) o['mouth.type'] = 'inferior'; else if (has(['tube snout', 'tubular', 'pipette'])) o['mouth.type'] = 'tube';
  if (has(['armor', 'armour', 'plated', 'bony plates'])) o['skin.scale'] = 'plates'; else if (has(['scaleless', 'naked', 'smooth skin'])) o['skin.scale'] = 'bare'; else if (has(['ganoid', 'diamond scale'])) o['skin.scale'] = 'ganoid';
  if (has(['translucent', 'glass', 'transparent', 'see-through'])) o['skin.translucency'] = .75;
  if (has(['iridescent', 'shimmer', 'metallic', 'shiny', 'holographic'])) o['skin.iridescence'] = 1;
  if (has(['venomous spines', 'spiny dorsal', 'tall spines', 'quill'])) { o['fins.dorsal.shape'] = 'spines'; o['fins.dorsal.height'] = 1.1; o['fins.dorsal.spines'] = 13; }
  if (has(['sail fin', 'sailfin', 'huge dorsal', 'tall dorsal', 'sail-like'])) { o['fins.dorsal.shape'] = 'sail'; o['fins.dorsal.height'] = 1.4; }
  if (has(['veil', 'flowing fins', 'long fins', 'trailing'])) { o['fins.caudal.len'] = .5; o['fins.caudal.flex'] = .95; o['fins.dorsal.flex'] = .95; }
  if (has(['lunate', 'crescent tail', 'sickle tail'])) o['fins.caudal.type'] = 'lunate'; else if (has(['forked tail'])) o['fins.caudal.type'] = 'forked'; else if (has(['round tail', 'rounded tail', 'paddle tail'])) o['fins.caudal.type'] = 'rounded'; else if (has(['whip tail', 'whip-like', 'filament'])) o['fins.caudal.type'] = 'filamentous';
  if (has(['big eyes', 'huge eyes', 'large eyes', 'bug-eyed'])) o['head.eyeSize'] = .36; else if (has(['tiny eyes', 'small eyes', 'blind', 'eyeless'])) { o['head.eyeSize'] = .07; if (has(['blind', 'eyeless'])) o['head.eyeSide'] = 'none'; }
  if (has(['wing', 'glide', 'flying'])) { o['fins.pectoral.shape'] = 'wing'; o['fins.pectoral.len'] = 2.4; }
  if (has(['humped', 'hump', 'bulbous forehead', 'nuchal'])) o['body.hump'] = .8;
  if (has(['electric', 'shock'])) o['skin.electric'] = true;
  if (has(['puffer', 'inflat', 'balloon'])) o['skin.inflate'] = true;
  if (has(['fantasy', 'fictional', 'mythic', 'alien'])) { if (!opts.habitat) opts.habitat = 'void'; }
  return generate(opts);
}
/* ── pluggable LLM endpoint (returns JSON; schema-validated and rule-repaired, never trusted) ── */
FG.llm = { endpoint: safeStore.get('fg_llm_endpoint') || '', key: safeStore.get('fg_llm_key') || '', model: safeStore.get('fg_llm_model') || '' };
function schemaSummary() { const o = {}; for (const p in SCHEMA) { const e = SCHEMA[p]; o[p] = e.t === 's' ? e.opts.join('|') : e.t === 'b' ? 'bool' : e.t === 'hsl' ? '[h0-360,s0-1,l0-1]' : `${e.t === 'i' ? 'int' : 'num'} ${e.min}..${e.max}`; } return o; }
function extractJSON(txt) { const s = txt.indexOf('{'), e = txt.lastIndexOf('}'); if (s < 0 || e < 0) throw new Error('No JSON object in LLM response'); return JSON.parse(txt.slice(s, e + 1)); }
async function genomeFromLLM(prompt) {
  if (!FG.llm.endpoint) throw new Error('No LLM endpoint configured (Text panel → endpoint). The offline parser is used otherwise.');
  const body = { model: FG.llm.model || undefined, prompt, instruction: 'You design a fish. Return ONLY a JSON object: {"meta":{"habitat":ID,"niche":ID,"clade":ID},"overrides":{"<schema path>":value}}. Only use listed IDs and schema paths.', ids: { habitats: Object.keys(HABITATS), niches: Object.keys(NICHES), clades: Object.keys(CLADES) }, schema: schemaSummary() };
  const headers = { 'Content-Type': 'application/json' }; if (FG.llm.key) headers.Authorization = 'Bearer ' + FG.llm.key;
  const res = await fetch(FG.llm.endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('LLM endpoint HTTP ' + res.status);
  const json = extractJSON(await res.text());
  const src = json.overrides && typeof json.overrides === 'object' ? json.overrides : null;
  const meta = json.meta || {};
  if (!src) { const { genome, issues } = validateGenome(json); genome.meta.seed = genome.meta.seed || 'llm'; genome.meta.repairs = issues.map(i => ({ rule: 'schema_validate', path: '-', from: '-', to: i })); return finalize(genome); }
  const overrides = {}; const { genome: v, issues } = validateGenome({ ...Object.fromEntries([]), ...unflatten(src) });
  for (const p in src) if (SCHEMA[p]) overrides[p] = getP(v, p);
  const g = generate({ habitat: HABITATS[meta.habitat] ? meta.habitat : undefined, niche: NICHES[meta.niche] ? meta.niche : undefined, clade: CLADES[meta.clade] ? meta.clade : undefined, seed: 'llm:' + cyrb128(prompt)[0].toString(36), overrides });
  g.meta.repairs.unshift(...issues.map(i => ({ rule: 'schema_validate', path: '-', from: '-', to: i }))); return g;
}
function unflatten(flat) { const o = {}; for (const p in flat) setP(o, p, flat[p]); return o; }
Object.assign(FG, { generate, mutate, breed, genomeFromText, genomeFromLLM, resolveTraitMap, ADAPTATIONS, applyAdaptation, traitBounds });
/* data-layer self test: 200 genomes per habitat */
function selfTestData(perHabitat = 200) {
  const rows = [];
  for (const hid in HABITATS) { const row = { habitat: HABITATS[hid].n, n: perHabitat, nan: 0, unrepaired: 0, incoherent: 0, flags: 0, clades: new Set() };
    for (let i = 0; i < perHabitat; i++) { const g = generate({ habitat: hid, seed: 'st' + i });
      for (const p in SCHEMA) { const v = getP(g, p); if ((SCHEMA[p].t === 'n' || SCHEMA[p].t === 'i') && !isNum(v)) row.nan++; if (SCHEMA[p].t === 'hsl' && !v.every(isNum)) row.nan++; }
      if (violations(g).length) row.unrepaired++;
      if (g.fins.caudal.present && !(SWIM_TAILS[g.swim.mode] || CAUDAL_TYPES).includes(g.fins.caudal.type)) row.incoherent++;
      if (HABITATS[hid].fantasy !== g.meta.fantasy && !HABITATS[hid].fantasy) row.flags++;
      row.clades.add(g.meta.clade); }
    row.clades = row.clades.size; rows.push(row); }
  return rows;
}
FG.selfTestData = selfTestData;
/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 8. MORPHOLOGY BUILDER                                            ║
   ╚══════════════════════════════════════════════════════════════════╝ */
const QUALITY = { hero: { S: 96, R: 48, K: 6, eye: 20, detail: true }, med: { S: 56, R: 28, K: 4, eye: 12, detail: true }, lod: { S: 20, R: 12, K: 2, eye: 0, detail: false } };
const MOUTH_LINE = { terminal: [0, -.24], superior: [.28, -.2], inferior: [-.84, -.64], subterminal: [-.65, -.48], beak: [-.03, -.18], tube: [0, -.08], suction: [-.85, -.73], protrusible: [-.04, -.27] };
const SHAPE_FN = {
  sail: t => Math.pow(Math.sin(Math.PI * t), .34) * (1 - .2 * t),
  rounded: t => Math.pow(Math.max(0, Math.sin(Math.PI * t)), .65),
  lobe: t => Math.pow(Math.max(0, Math.sin(Math.PI * t)), .85),
  continuous: t => (0.7 + .3 * Math.sin(Math.PI * t)) * sstep(0, .045, t) * (1 - sstep(.91, 1, t)),
  notched: (t, sf) => (1 - .53 * gaussf((t - Math.max(.35, sf)) / .095)) * Math.pow(Math.max(0, Math.sin(Math.PI * t)), .4),
  spinySoft: (t, sf) => (t < sf ? .78 : 1.0) * Math.pow(Math.max(0, Math.sin(Math.PI * t)), .42),
  filament: t => Math.pow(Math.max(0, Math.sin(Math.PI * t)), .6) * (1 + 1.4 * gaussf((t - .85) / .085)),
  spines: t => Math.pow(Math.max(0, Math.sin(Math.PI * t)), .38) * (1 - .2 * t)
};
const PECT_SHAPE = { pointed: t => .25 + .75 * Math.pow(1 - t, 1.3), rounded: t => .5 + .5 * Math.pow(Math.sin(Math.PI * t), .7), wing: t => .35 + .65 * Math.pow(1 - t, .8), disc: t => Math.pow(Math.sin(Math.PI * t), .55), fan: t => .75 + .25 * Math.sin(Math.PI * t), filament: t => t < .25 ? 1 : .25, limb: t => .6 + .4 * Math.sin(Math.PI * t) };
const PELV_SHAPE = { pointed: t => .3 + .7 * Math.pow(1 - t, 1.2), rounded: t => .5 + .5 * Math.sin(Math.PI * t), filament: t => t < .3 ? 1 : .2, fused: t => .6 + .4 * Math.sin(Math.PI * t) };
const CAUDAL_SHAPE = {
  forked: (a, n) => lerp(.55, .24, n) + (1 - lerp(.55, .24, n)) * Math.pow(a, 1.5),
  lunate: (a, n) => .16 + .75 * Math.pow(a, 1.8),
  truncate: a => 1 - .04 * a,
  rounded: a => .38 + .62 * Math.sqrt(Math.max(0, 1 - a * a)),
  emarginate: (a, n) => .77 - .14 * n + .3 * a * a,
  heterocercal: a => .28 + .72 * Math.pow(a, 1.32) - .11 * gaussf((a - .82) / .085),
  hypocercal: a => .4 + .6 * Math.pow(a, 1.4),
  diphycercal: a => 1.12 - .8 * Math.pow(a, 1.5),
  lyrate: a => .56 + .61 * Math.pow(a, 4),
  filamentous: a => .65 + 1.2 * Math.pow(a, 7),
  fantail: (a, n) => .46 + .54 * Math.sqrt(Math.max(0, 1 - Math.pow((a - .53) / .55, 2))) - (1 - a) * .24 * n
};
function bezier2(t, p0, p1, p2, p3) {
  const s = 1 - t; return [s * s * s * p0[0] + 3 * s * s * t * p1[0] + 3 * s * t * t * p2[0] + t * t * t * p3[0], s * s * s * p0[1] + 3 * s * s * t * p1[1] + 3 * s * t * t * p2[1] + t * t * t * p3[1]];
}
function foilOutline(t, apex, sweep, curve, free = 0) {
  const x = .29 + sweep * .6;
  return t <= apex
    ? bezier2(t / apex, [0, 0], [x * .18, .26], [x * .72, .76], [x, 1])
    : bezier2((t - apex) / (1 - apex), [x, 1], [x - curve * .2, .56], [.74 + free, .08], [1 + free, 0]);
}
const TEETH = { villiform: { r: .012, len: .05 }, needle: { r: .012, len: .14 }, triangular: { r: .03, len: .08 }, fang: { r: .02, len: .17 }, molar: { r: .035, len: .03 }, beak: { r: .08, len: .045 }, rasp: { r: .008, len: .03 } };

/** Analytic body model shared by loft, fins, eyes, jaw and tests. All outputs in fish-local metres. */
class BodyModel {
  constructor(g) {
    this.g = g; this.a = anatomyProfile(g); const b = g.body; this.L = b.length; this.bp = bodyProfile(g); this.maxD = this.bp.maxD * this.L; this.h = g.head.lengthFrac; this.lm = landmarks(g);
    this.billStart = ['bill', 'sword'].includes(g.head.special) ? -g.head.specialLen : null;
    this.isManta = cladePath(g.meta.clade).some(node => node.id === 'manta');
    const NS = 240, pts = [], post = b.posture * Math.PI / 180, curl = b.curl; let x = 0, y = 0;
    for (let i = 0; i <= NS; i++) { const u = i / NS, phi = post * sstep(0.08, 0.28, u) + curl * TAU * 1.15 * Math.pow(Math.max(0, (u - 0.68) / 0.32), 1.6); pts.push({ x, y, phi }); x -= Math.cos(phi) * this.L / NS; y -= Math.sin(phi) * this.L / NS; }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; for (const p of pts) { p.x -= cx; p.y -= cy; }
    const control = pts.filter((p, i) => i % 15 === 0).map(p => new THREE.Vector3(p.x, p.y, 0));
    const curve = new THREE.CatmullRomCurve3(control, false, 'centripetal'); curve.arcLengthDivisions = 480; curve.updateArcLengths();
    const sample = new THREE.Vector3(), tangent = new THREE.Vector3(); let previousAngle = 0;
    for (let i = 0; i <= NS; i++) {
      curve.getPointAt(i / NS, sample); curve.getTangentAt(i / NS, tangent);
      let angle = Math.atan2(-tangent.y, -tangent.x);
      while (angle - previousAngle > Math.PI) angle -= TAU;
      while (angle - previousAngle < -Math.PI) angle += TAU;
      pts[i].x = sample.x; pts[i].y = sample.y; pts[i].phi = angle; previousAngle = angle;
    }
    this.curve = curve;
    this.spine = pts; this.headX = pts[0].x; this.tailX = pts[NS].x;
    const mt = MOUTH_LINE[g.mouth.type] || MOUTH_LINE.terminal; this.tipF = mt[0]; this.cornerF = mt[1];
    this.mcU = this.lm.mouthCorner;
    this.oralDisc = this.a.family === 'jawless' || ['suction', 'tube'].includes(g.mouth.type);
    const under = ['inferior', 'subterminal', 'suction'].includes(g.mouth.type);
    this.jawStartU = under ? this.h * .16 : .003;
    this.jawStartU = Math.min(this.jawStartU, this.mcU * .45);
    if (g.head.special === 'hammer') this.jawStartU = Math.min(Math.max(this.jawStartU, g.head.specialLen * .72), this.mcU * .8);
    if (g.head.special === 'bill' || g.head.special === 'sword') this.jawStartU = Math.min(this.mcU * .5, Math.max(this.jawStartU, this.mcU * .35));
    /* eyeSize = visible eye diameter as a fraction of head length; the ball is recessed so only ~0.73 of its radius shows */
    this.eyeR = g.head.eyeSize * this.h * this.L * 0.69;
    this.eyeY = g.head.eyeV * this.bp.depth(this.lm.eye) * this.L * b.dorsalFrac * 0.7;
    this._fr = {}; this._s = {};
  }
  frame(u, out) {
    const sp = this.spine;
    if (u < 0) { const a = sp[0]; out.tx = -Math.cos(a.phi); out.ty = -Math.sin(a.phi); out.px = a.x + out.tx * u * this.L; out.py = a.y + out.ty * u * this.L; out.nx = out.ty; out.ny = -out.tx; return out; }
    const t = clamp(u, 0, 1) * (sp.length - 1), i = Math.min(sp.length - 2, Math.floor(t)), f = t - i, a = sp[i], b2 = sp[i + 1]; const phi = a.phi + (b2.phi - a.phi) * f;
    out.px = a.x + (b2.x - a.x) * f; out.py = a.y + (b2.y - a.y) * f; out.tx = -Math.cos(phi); out.ty = -Math.sin(phi); out.nx = out.ty; out.ny = -out.tx; return out;
  }
  section(u, s) {
    const g = this.g, b = g.body, L = this.L, d = this.bp.depth(u) * L, w = this.bp.width(u) * L;
    if (this.billStart !== null && u < .004) {
      const f = clamp((u - this.billStart) / (.004 - this.billStart), 0, 1), d0 = this.bp.depth(.004) * L, w0 = this.bp.width(.004) * L;
      s.dUp = d0 * b.dorsalFrac * f; s.dDn = d0 * (1 - b.dorsalFrac) * f;
      s.w = w0 * .5 * f * (g.head.special === 'sword' ? 1 + .38 * Math.sin(Math.PI * f) : 1);
      s.coreW = s.w; s.n = 2; s.nV = 2; s.nD = 2; return s;
    }
    const shoulder = 1 + b.shoulder * .11 * gaussf((u - this.h * .93) / (this.h * .35));
    s.dUp = d * b.dorsalFrac; s.dDn = d * (1 - b.dorsalFrac); s.w = w * .5 * shoulder;
    s.w *= 1 + g.head.cheek * .05 * gaussf((u - this.h * .77) / (this.h * .22));
    if (b.hump > 0) s.dUp += b.hump * this.maxD * 0.22 * gaussf((u - 0.2) / 0.11);
    s.n = lerp(b.superN, b.superNTail, sstep(0.5, 1, u)); s.nV = s.n * (1 + 3 * b.ventralFlat); s.nD = s.n * (1 + 2.5 * b.dorsalFlat);
    const h = this.h, headBlend = 1 - sstep(h * .9, h * 1.4, u);
    s.dUp += headBlend * g.head.foreheadSlope * d * .18 * gaussf((u - h * .55) / (h * .3));
    s.dUp += headBlend * g.head.brow * this.eyeR * .15 * gaussf((u - this.lm.eye) / (h * .13));
    if (g.head.special === 'hammer') {
      const len = Math.max(1e-4, g.head.specialLen), q = u / len;
      /* cephalofoil: near-straight leading edge, flat wings held to ~0.85 of its length, then a quick fair-in to the trunk */
      const wing = sstep(0, .08, q) * (1 - sstep(.82, 1.35, q)), front = sstep(0, .08, q);
      s.w += g.head.specialWidth * L * .5 * wing * (1 - .12 * Math.pow(Math.max(0, 1 - q / .4), 2));
      s.dUp = lerp(s.dUp, Math.min(s.dUp, this.maxD * .17), wing); s.dDn = lerp(s.dDn, Math.min(s.dDn, this.maxD * .16), wing);
      s.n = lerp(s.n, 4.5, wing); s.nD = s.n; s.nV = s.n * (1 + 2 * b.ventralFlat);
      if (q < .08) { const k = front; s.w = Math.max(s.w, g.head.specialWidth * L * .5 * k * .9); }
    }
    s.coreW = s.w;
    if (this.a.family === 'ray' || this.a.family === 'benthicShark') {
      const ray = this.a.family === 'ray', peak = ray ? b.peakU : .37, end = ray ? .76 : .68;
      const span = ray ? L * clamp(g.fins.pectoral.len * .47, .58, 1.23) : L * .42;
      const front = ray ? (this.isManta ? .12 : .015) : .09;
      const taper = u < peak ? front + (1 - front) * Math.pow(Math.sin(Math.PI * .5 * clamp(u / peak, 0, 1)), .85)
        : Math.pow(1 - sstep(peak, end, u), .82);
      s.w = Math.max(s.coreW, span * taper);
    }
    return s;
  }
  mouthLineY(u, s) {
    const t = clamp((u - this.jawStartU) / Math.max(1e-6, this.mcU - this.jawStartU), 0, 1);
    const f = lerp(this.tipF, this.cornerF, smoother(t)) - this.g.mouth.cornerCurve * .055 * Math.sin(Math.PI * t);
    return clamp(f * (f > 0 ? s.dUp : s.dDn), -s.dDn * .96, s.dUp * .7);
  }
  halfWidthAtY(s, y) { const yR = y > 0 ? s.dUp : s.dDn, yn = y > 0 ? s.nD : s.nV; const q = Math.min(1, Math.pow(Math.abs(y) / Math.max(1e-9, yR), yn)); return s.w * Math.pow(Math.max(0, 1 - q), 1 / s.n); }
  point(u, theta, out, fr, s, raw = false) {
    const g = this.g, ct = Math.cos(theta), st = Math.sin(theta), n = st > 0 ? s.nD : s.nV, yR = st > 0 ? s.dUp : s.dDn;
    let ly = Math.sign(st) * Math.pow(Math.abs(st), 2 / n) * yR, lz = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / s.n) * s.w;
    if (this.a.family === 'ray' || this.a.family === 'benthicShark') {
      const outboard = Math.abs(lz) / Math.max(s.w, 1e-8);
      ly *= 1 - (this.a.family === 'ray' ? .90 : .78) * sstep(.08, .96, outboard);
    }
    const h = this.h;
    if (g.head.gillSlits && this.a.gills === 'lateral' && u > this.lm.gillStart - .02 && u < this.lm.gillEnd + .02) {
      const face = 1 - sstep(.58, .9, Math.abs(st));
      for (let i = 0; i < g.head.gillSlits; i++) {
        const gu = lerp(this.lm.gillStart, this.lm.gillEnd, (i + .5) / g.head.gillSlits) + g.head.gillSlant * h * .06 * (1 - st * st);
        lz -= Math.sign(ct) * s.w * .055 * face * gaussf((u - gu) / (h * .007));
      }
    }
    if (g.body.keel > 0) lz += Math.sign(ct) * g.body.keel * this.maxD * 0.08 * gaussf((u - 0.95) / 0.045) * Math.pow(Math.abs(ct), 6);
    out.mouth = 0;
    out.x = fr.px + fr.nx * ly; out.y = fr.py + fr.ny * ly; out.z = lz; out.ly = ly; out.lz = lz; return out;
  }
  surface(u, theta, out) { this.frame(u, this._fr); this.section(u, this._s); return this.point(u, theta, out, this._fr, this._s); }
  sampleLoft(u, theta, out, attribute = 'position') {
    const cache = this.loft, us = cache.us, values = cache.geo.getAttribute(attribute), R = cache.R;
    u = clamp(u, us[0], us[us.length - 1]);
    let lo = 0, hi = us.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (us[m] > u) hi = m; else lo = m; }
    const du = clamp((u - us[lo]) / Math.max(1e-12, us[hi] - us[lo]), 0, 1);
    const angle = (((theta + Math.PI / 2) / TAU) % 1 + 1) % 1 * R, j = Math.floor(angle), da = angle - j;
    const a = lo * R + j, b = lo * R + (j + 1) % R, c = hi * R + j, d = hi * R + (j + 1) % R;
    const ids = du + da <= 1 ? [a, b, c] : [b, c, d], ws = du + da <= 1 ? [1 - du - da, da, du] : [1 - du, 1 - da, du + da - 1];
    out.x = values.getX(ids[0]) * ws[0] + values.getX(ids[1]) * ws[1] + values.getX(ids[2]) * ws[2];
    out.y = values.getY(ids[0]) * ws[0] + values.getY(ids[1]) * ws[1] + values.getY(ids[2]) * ws[2];
    out.z = values.getZ(ids[0]) * ws[0] + values.getZ(ids[1]) * ws[1] + values.getZ(ids[2]) * ws[2];
    return out;
  }
  attachedSurface(u, theta, out) { return this.loft ? this.sampleLoft(u, theta, out) : this.surface(u, theta, out); }
  rawSurface(u, theta, out) { this.frame(u, this._fr); this.section(u, this._s); return this.point(u, theta, out, this._fr, this._s, true); }
  surfaceNormal(u, theta, out) {
    if (this.loft) { this.sampleLoft(u, theta, out, 'normal'); return out.normalize(); }
    const pa = {}, pb = {}, pc = {}, pd = {};
    this.rawSurface(clamp(u - .0005, .001, .999), theta, pa); this.rawSurface(clamp(u + .0005, .001, .999), theta, pb);
    this.rawSurface(u, theta - .001, pc); this.rawSurface(u, theta + .001, pd);
    const ax = pd.x - pc.x, ay = pd.y - pc.y, az = pd.z - pc.z, bx = pb.x - pa.x, by = pb.y - pa.y, bz = pb.z - pa.z;
    return out.set(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx).normalize();
  }
  mouthBoundary(u, side, out) {
    this.frame(u, this._fr); this.section(u, this._s); const y = this.mouthLineY(u, this._s);
    out.set(this._fr.px + this._fr.nx * y, this._fr.py + this._fr.ny * y, side * this.halfWidthAtY(this._s, y)); return out;
  }
}
function buildBodyGeometry(bm, S, R) {
  const billRings = bm.billStart === null ? 0 : (S < 30 ? 5 : 12), stations = S + billRings;
  const nV = (stations + 1) * R + 2, pos = new Float32Array(nV * 3), ab = new Float32Array(nV * 4), idx = [], us = new Float64Array(stations + 1);
  const fr = {}, s = {}, p = {}; let v = 0;
  for (let i = 0; i <= stations; i++) {
    const t = Math.max(0, i - billRings) / S;
    const u = i < billRings ? lerp(bm.billStart, .004, (i + 1) / (billRings + 1)) : Math.max(.004, t * (.6 + .4 * t));
    us[i] = u; bm.frame(u, fr); bm.section(u, s);
    for (let j = 0; j < R; j++) { bm.point(u, -Math.PI / 2 + j / R * TAU, p, fr, s); pos[v * 3] = p.x; pos[v * 3 + 1] = p.y; pos[v * 3 + 2] = p.z; ab[v * 4] = u; ab[v * 4 + 1] = j / R; ab[v * 4 + 2] = p.mouth; v++; } }
  bm.frame(bm.billStart === null ? 0 : bm.billStart, fr); const snout = v++; pos[snout * 3] = fr.px - fr.tx * .0002 * bm.L; pos[snout * 3 + 1] = fr.py - fr.ty * .0002 * bm.L; ab[snout * 4] = bm.billStart === null ? 0 : bm.billStart; ab[snout * 4 + 1] = .25;
  bm.frame(1, fr); const tail = v++; pos[tail * 3] = fr.px; pos[tail * 3 + 1] = fr.py; ab[tail * 4] = 1; ab[tail * 4 + 1] = .5;
  for (let i = 0; i < stations; i++) for (let j = 0; j < R; j++) { const a = i * R + j, b2 = i * R + (j + 1) % R, c2 = (i + 1) * R + j, d = (i + 1) * R + (j + 1) % R; idx.push(a, b2, c2, b2, d, c2); }
  for (let j = 0; j < R; j++) { idx.push(snout, (j + 1) % R, j, tail, stations * R + j, stations * R + (j + 1) % R); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aBody', new THREE.BufferAttribute(ab, 4)); geo.setIndex(idx); geo.computeVertexNormals();
  bm.loft = { geo, us, R };
  return geo;
}
function buildOperculum(bm) {
  const lm = bm.lm, u0 = lm.preopercle, u1 = lm.operculum + .004, NS = 8, NR = 18, pos = [], ab = [], idx = []; const fr = {}, s = {}, p = {}; let v = 0;
  for (const side of [1, -1]) { const v0 = v;
    for (let i = 0; i <= NS; i++) {
      for (let j = 0; j <= NR; j++) {
        const th = lerp(-1.18, 1.08, j / NR), window = Math.pow(Math.sin(Math.PI * j / NR), .7);
        const u = lerp(u0, u1 + .012 * window, i / NS); bm.frame(u, fr); bm.section(u, s);
        bm.point(u, side > 0 ? th : Math.PI - th, p, fr, s, true);
        const edge = smoother(i / NS) * window, l = Math.hypot(p.ly, p.lz) || 1, off = bm.maxD * (.002 + .018 * edge);
        pos.push(p.x + fr.nx * p.ly / l * off, p.y + fr.ny * p.ly / l * off, p.z + p.lz / l * off);
        ab.push(u, side > 0 ? .25 + th / TAU : .75 - th / TAU, 3, edge); v++;
      }
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const a = v0 + i * (NR + 1) + j, b2 = a + NR + 1; idx.push(a, a + 1, b2, a + 1, b2 + 1, b2); } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
}
