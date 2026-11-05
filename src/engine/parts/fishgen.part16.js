// @@PART js/app.part15.js (15/19) lines 2938-3227 of the original module script -- stripped by build.mjs
async function pumpThumbs() {
  if (thumbBusy) return; thumbBusy = true;
  try { if (!thumbR) { const cv = document.createElement('canvas'); cv.width = 260; cv.height = 182; thumbR = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.outputColorSpace = THREE.SRGBColorSpace; thumbR.toneMapping = THREE.ACESFilmicToneMapping; thumbScene = new THREE.Scene(); thumbCam = new THREE.PerspectiveCamera(32, 260 / 182, 0.01, 100); }
    while (thumbQueue.length) { const { id, img } = thumbQueue.shift(); if (!img.isConnected) continue; let fish = null;
      try { const g = generate({ species: id, seed: 'gallery' }); fish = buildFish(g, { quality: 'med' }); thumbScene.add(fish.group); const saved = { fog: ENV.uFogDensity.value, ld: ENV.uLightDir.value.clone(), lc: ENV.uLightCol.value.clone(), sk: ENV.uSkyCol.value.clone(), gr: ENV.uGroundCol.value.clone() };
        ENV.uFogDensity.value = 0; ENV.uLightDir.value.set(0.45, 0.8, 0.6).normalize(); ENV.uLightCol.value.setRGB(1.05, 1.03, 1); ENV.uSkyCol.value.setRGB(0.62, 0.66, 0.72); ENV.uGroundCol.value.setRGB(0.22, 0.21, 0.22);
        const box = fish.info.bounds, c2 = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() * 0.5;
        const ray = ['ray', 'benthicShark'].includes(fish.bm.a.family), dist = r / Math.sin(thumbCam.fov * Math.PI / 360) * (ray ? 1.35 : 1.02);
        thumbCam.position.copy(c2).add((ray ? new THREE.Vector3(.1, .95, .27) : new THREE.Vector3(.3, .2, 1)).normalize().multiplyScalar(dist)); thumbCam.near = dist * 0.01; thumbCam.far = dist * 10; thumbCam.lookAt(c2); thumbCam.updateProjectionMatrix();
        thumbR.setClearColor(0x0b1a26, 1); thumbR.render(thumbScene, thumbCam); img.src = thumbR.domElement.toDataURL('image/jpeg', 0.85);
        ENV.uFogDensity.value = saved.fog; ENV.uLightDir.value.copy(saved.ld); ENV.uLightCol.value.copy(saved.lc); ENV.uSkyCol.value.copy(saved.sk); ENV.uGroundCol.value.copy(saved.gr); }
      catch (e) { console.warn('thumb failed', id, e); }
      finally { if (fish) { thumbScene.remove(fish.group); fish.dispose(); } }
      await new Promise(r => setTimeout(r, 0)); } }
  finally { thumbBusy = false; }
}
/* ── GLB export (bakes standard materials) ── */
function pigmentAt(g, u, ang, out) {
  const s = g.skin, raw = g.body.roll ? Math.sin(ang * TAU) : -Math.cos(ang * TAU);
  const vert = anatomyProfile(g).family === 'ray' ? clamp(raw * 5, -1, 1) : raw;
  out.copy(hslCol(s.base)).lerp(hslCol(s.belly), s.countershade * (1 - sstep(-.38, .48, vert)));
  const fract = x => x - Math.floor(x), freq = s.patternScale, seed = cyrb128(g.meta.surfaceSeed || g.meta.seed)[0] % 1000;
  let mask = 0;
  if (s.pattern === 'bars') mask = sstep(.27, .38, Math.abs(fract(u * g.body.fineness * 1.1 * freq) - .5));
  else if (s.pattern === 'stripes') mask = sstep(.3, .4, Math.abs(fract(vert * 1.6 * freq) - .5));
  else if (s.pattern === 'spots') { const x = u * g.body.fineness * 3.5 * freq, y = vert * 3.2 * freq, h = fract(Math.sin(Math.floor(x) * 127.1 + Math.floor(y) * 311.7 + seed) * 43758.5453); mask = (1 - sstep(.13, .24, Math.hypot(fract(x) - .5, fract(y) - .5))) * (h > .2 ? 1 : 0); }
  else if (['mottle', 'disruptive', 'reticulate', 'saddles'].includes(s.pattern)) mask = sstep(.22, .7, .5 + .5 * Math.sin(u * 36 * freq + Math.sin(vert * 17 + seed) * 3));
  else if (s.pattern === 'eyespot') mask = 1 - sstep(.7, .9, Math.hypot((u - .74) * g.body.fineness, vert - .25) / (.35 * freq));
  out.lerp(hslCol(s.accent), mask * s.patternStrength);
  if (s.band > 0) out.lerp(hslCol(s.bandColor), (1 - sstep(.07, .2, Math.abs(vert - .02))) * sstep(.1, .3, u) * s.band);
  return out;
}
function exportGLB(name) {
  const f = App.fish; if (!f) return;
  const group = new THREE.Group(), geometries = [], materials = [], color = new THREE.Color(); group.rotation.x = f.group.rotation.x;
  const cleanup = () => { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); };
  try {
    f.group.traverse(o => {
      if (!o.isMesh) return;
      const source = o.geometry, geo = new THREE.BufferGeometry(), pos = source.getAttribute('position');
      geo.setAttribute('position', pos.clone()); if (source.getAttribute('normal')) geo.setAttribute('normal', source.getAttribute('normal').clone()); if (source.index) geo.setIndex(source.index.clone());
      const body = source.getAttribute('aBody'), fin = source.getAttribute('aFin'), skin = source.getAttribute('aSkin'), eye = f.materials._eyes.includes(o.material), glow = o.material === f.materials.glow, tooth = o.material === f.materials.tooth;
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        if (tooth) color.setRGB(.82, .78, .68);
        else if (glow) color.copy(f.uniforms.uGlow.value);
        else if (eye) { const norm = source.getAttribute('normal'), axis = o.material.uniforms.uAxis.value, dot = norm.getX(i) * axis.x + norm.getY(i) * axis.y + norm.getZ(i) * axis.z; color.copy(dot > .86 ? new THREE.Color(.008, .008, .009) : f.uniforms.uEyeCol.value); }
        else if (body) { pigmentAt(App.genome, body.getX(i), body.getY(i), color); if (body.getZ(i) > .5 && body.getZ(i) < 2 || body.getZ(i) > 5.4 && body.getZ(i) < 6.6) color.setRGB(.019, .007, .009); }
        else if (skin) { pigmentAt(App.genome, skin.getX(i), skin.getY(i), color); if (skin.getZ(i) < .5) color.lerp(f.uniforms.uFinCol.value, sstep(.06, .42, fin.getY(i))); }
        else color.copy(f.uniforms.uBase.value);
        colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometries.push(geo);
      const transparent = !!skin && !f.bm.a.solid;
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: eye ? .12 : .42, metalness: 0, transparent, opacity: transparent ? .78 : 1, side: THREE.DoubleSide, emissive: glow ? f.uniforms.uGlow.value.clone() : new THREE.Color(0) }); materials.push(material);
      if (o.isInstancedMesh) { const matrix = new THREE.Matrix4(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, matrix); const mesh = new THREE.Mesh(geo, material); mesh.applyMatrix4(matrix); group.add(mesh); } }
      else group.add(new THREE.Mesh(geo, material));
    });
    group.userData = { genome: stripGenome(App.genome), pose: 'neutral', pigmentBake: 'approximate vertex colors' };
    new GLTFExporter().parse(group, result => { download(new Blob([result], { type: 'model/gltf-binary' }), name + '.glb'); cleanup(); toast('GLB exported with anatomy and baked pigmentation.'); }, error => { cleanup(); toast('GLB export failed: ' + (error.message || error)); }, { binary: true });
  } catch (error) { cleanup(); showError(error); }
}
/* ── self test ── */
const TEST_STATE = { running: false, cancel: false, last: null };
function runFocusedTests() {
  const rows = [], assert = (condition, message) => { if (!condition) throw new Error(message); };
  const test = (name, fn) => { try { fn(); rows.push({ name, pass: true }); } catch (error) { rows.push({ name, pass: false, error: error.message }); } };
  test('Goldfish + hadal habitat creates a labelled speculative form', () => {
    const g = generate({ species: 'goldfish', habitat: 'hadal', seed: 'goldfish-hadal-regression' });
    assert(g.meta.habitat === 'hadal' && g.meta.species === 'goldfish', 'Species or habitat was discarded');
    assert(g.meta.speculative && g.meta.adapted.speculative, 'Impossible habitat was presented as a real population');
    assert(violations(g).length === 0, 'Unrepaired anatomical constraints');
  });
  test('Goldfish creates in every habitat without selection errors', () => {
    for (const habitat in HABITATS) { const g = generate({ species: 'goldfish', habitat, seed: 'all-habitats-regression' }); assert(g.meta.habitat === habitat && violations(g).length === 0, habitat + ' was not preserved or failed constraints'); }
  });
  test('Eight body/fin mutation steps make visible, bounded changes', () => {
    let g = generate({ species: 'goldfish', seed: 'step-regression' });
    const targets = ['agility', 'display', 'finShape', 'tail', 'speed', 'feeding', 'agility', 'finShape'];
    for (let i = 0; i < targets.length; i++) {
      const before = deepClone(g); g = mutate(g, .55, 'step-regression-' + i, targets[i]);
      assert(g.meta.evolution.step === i + 1, 'Step counter did not advance');
      assert(morphologyDifference(before, g) >= .025, 'Mutation is effectively a no-op');
      assert(violations(g).length === 0, 'Mutation failed anatomical rules');
      for (const p in g.meta.evolution.origin) {
        const lim = mutationBounds(g, p, g.meta.evolution), value = getP(g, p);
        assert(value >= lim.min - 1e-6 && value <= lim.max + 1e-6, p + ' escaped the founding envelope');
      }
    }
  });
  test('Mutation is repeatable and preserves the skin pattern seed', () => {
    const source = generate({ species: 'rainbow-trout', seed: 'deterministic-mutation' });
    const a = mutate(source, .55, 'shared-mutation-seed', 'finShape'), b = mutate(source, .55, 'shared-mutation-seed', 'finShape');
    assert(JSON.stringify(stripGenome(a)) === JSON.stringify(stripGenome(b)), 'Seeded mutation differs on replay');
    assert(a.meta.surfaceSeed === source.meta.surfaceSeed && source.meta.species === 'rainbow-trout', 'Source genome or pattern seed was altered');
  });
  test('JSON import preserves evolution anchors and adaptation labels', () => {
    const source = generate({ species: 'goldfish', habitat: 'hadal', seed: 'import-regression' });
    const evolved = mutate(source, .55, 'import-step', 'finShape');
    const imported = validateGenome(JSON.parse(JSON.stringify(stripGenome(evolved)))).genome; finalize(imported);
    assert(imported.meta.evolution.step === 1 && imported.meta.speculative, 'Evolution or speculative label was dropped');
    assert(JSON.stringify(imported.meta.evolution.origin) === JSON.stringify(evolved.meta.evolution.origin), 'Evolution envelope changed on import');
  });
  test('No cone horns; every pectoral shape curve is defined', () => {
    const g = generate({ clade: 'scorpaenid', habitat: 'coralReef', noSpecies: true, seed: 'ornament-regression' });
    assert(g.head.special !== 'horns', 'Cone head ornament remains enabled');
    for (const shape of SCHEMA['fins.pectoral.shape'].opts) assert(typeof PECT_SHAPE[shape] === 'function' && isNum(PECT_SHAPE[shape](.5)), 'Missing ' + shape + ' fin profile');
  });
  for (const species of ['goldfish', 'pacific-sardine', 'red-lionfish', 'milkfish', 'blue-marlin']) test(species + ' builds valid hero and school geometry', () => {
    const g = generate({ species, seed: 'focused-geometry' });
    for (const quality of ['hero', 'lod']) {
      const fish = buildFish(g, { quality });
      try { const result = checkFishGeometry(fish); assert(result.errors.length === 0, quality + ': ' + result.errors.join('; ')); }
      finally { fish.dispose(); }
    }
  });
  runHybridTests(test, assert);
  TEST_STATE.focused = rows; return rows;
}
FG.runFocusedTests = runFocusedTests;
function checkFishGeometry(fish) {
  const g = fish.bm.g, L = fish.bm.L, errors = [], q = QUALITY[fish.info.quality], tol = Math.max(L * 1e-6, 1e-9);
  for (const geo of fish.geos) for (const name of ['position', 'normal']) {
    const attr = geo.getAttribute(name); if (attr && !attr.array.every(Number.isFinite)) errors.push('Non-finite ' + name);
  }
  const pos = fish.parts.body.geometry.getAttribute('position'), fins = fish.parts.fins.geometry.getAttribute('position');
  let asym = 0, maxRootError = 0;
  for (let s = 0; s < fish.bm.loft.us.length; s += 3) for (let j = 1; j < q.R / 2; j++) {
    const a = s * q.R + j, b = s * q.R + q.R - j;
    if (Math.abs(pos.getX(a) - pos.getX(b)) > tol || Math.abs(pos.getY(a) - pos.getY(b)) > tol || Math.abs(pos.getZ(a) + pos.getZ(b)) > tol) asym++;
  }
  const p = {};
  for (const root of fish.info.attachments) {
    fish.bm.attachedSurface(root.u, root.theta, p);
    maxRootError = Math.max(maxRootError, Math.hypot(fins.getX(root.index) - p.x, fins.getY(root.index) - p.y, fins.getZ(root.index) - p.z));
    if (root.u < 0 || root.u > 1) errors.push('Attachment outside landmark axis');
  }
  if (asym) errors.push('Body lost bilateral symmetry');
  if (maxRootError > tol) errors.push('Fin roots detached from skin');
  if (fish.bm.billStart !== null) {
    const uv = fish.parts.body.geometry.getAttribute('aBody');
    if (uv.getX(0) > -.04 || fish.bm.loft.us[0] >= 0) errors.push('Bill is not part of the continuous body loft');
  }
  if (fish.bm.a.family === 'ray' || fish.bm.a.family === 'benthicShark') {
    let minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) { minZ = Math.min(minZ, pos.getZ(i)); maxZ = Math.max(maxZ, pos.getZ(i)); minY = Math.min(minY, pos.getY(i)); maxY = Math.max(maxY, pos.getY(i)); }
    if (fish.bm.isManta && (maxZ - minZ < L * 1.5 || (maxZ - minZ) / Math.max(L * .01, maxY - minY) < 4.5)) errors.push('Manta disc is too narrow or too thick');
    const flags = fins.getAttribute('aFin');
    for (let i = 0; i < flags.count; i++) if (flags.getW(i) === 3) { errors.push('Batoid pectorals are detached sheets'); break; }
    if (fish.parts.jaw && fish.bm.isManta) errors.push('Manta has a hinged bony jaw');
  }
  if (fish.parts.jaw) {
    const tissue = fish.parts.jaw.geometry.getAttribute('aBody');
    for (let i = 0; i < tissue.count; i++) if (tissue.getZ(i) !== 0) { errors.push('Mouth contains a flat cavity shelf'); break; }
  }
  if (g.meta.species === 'goldfish' && (g.body.fineness > 2.05 || g.fins.caudal.type !== 'fantail')) errors.push('Goldfish body or tail is not the reference fantail form');
  if (g.head.special === 'horns') errors.push('Detached cone ornament was not removed');
  const budget = fish.info.quality === 'lod' ? 2500 : 40000;
  if (fish.info.tris > budget) errors.push('Triangle budget exceeded');
  const un = violations(g); if (un.length) errors.push(un.length + ' unrepaired constraints');
  return { errors: [...new Set(errors)], maxRootError, asym, tris: fish.info.tris };
}
async function runSelfTest(out, prog, exhaustive = false) {
  if (TEST_STATE.running) { toast('Tests are already running.'); return; }
  TEST_STATE.running = App.testing = true; TEST_STATE.cancel = false;
  const rows = [], issues = [], beforePause = App.paused; App.paused = true; out.innerHTML = '';
  const yieldFrame = () => new Promise(resolve => setTimeout(resolve, 0));
  const show = () => {
    out.innerHTML = `<div style="overflow:auto"><table><tr><th>Suite</th><th>Genomes</th><th>Mutations</th><th>Geometry</th><th>Hero / LOD tris</th><th>Result</th></tr>${rows.map(r => `<tr><td>${esc(r.name)}</td><td>${r.n}</td><td>${r.m}</td><td>${r.geo}</td><td>${r.hero.toLocaleString()} / ${r.lod.toLocaleString()}</td><td class="${r.fail ? 'bad' : 'ok'}">${r.fail ? 'FAIL (' + r.fail + ')' : 'PASS'}</td></tr>`).join('')}</table></div>`;
    if (issues.length) { const pre = document.createElement('pre'); pre.style.cssText = 'font-size:10px;white-space:pre-wrap;color:#f4aba3'; pre.textContent = issues.slice(0, 25).join('\n'); out.appendChild(pre); }
  };
  const testGenome = (g, row, build) => {
    row.n++;
    let nan = false; for (const p in SCHEMA) { const v = getP(g, p), e = SCHEMA[p]; if ((e.t === 'n' || e.t === 'i') && !isNum(v) || e.t === 'hsl' && !(Array.isArray(v) && v.every(isNum))) nan = true; }
    const problems = violations(g); if (nan || problems.length) { row.fail++; issues.push(`${row.name}: ${g.meta.clade}, seed ${g.meta.seed}: ${nan ? 'NaN' : problems.map(p => p.rule).join(', ')}`); }
    if (build) for (const quality of ['hero', 'lod']) {
      let fish;
      try { fish = buildFish(g, { quality }); const check = checkFishGeometry(fish); row.geo++; row[quality === 'hero' ? 'hero' : 'lod'] = Math.max(row[quality === 'hero' ? 'hero' : 'lod'], check.tris); if (check.errors.length) { row.fail++; issues.push(`${g.meta.name} / ${quality}: ${check.errors.join(', ')}`); } }
      catch (err) { row.fail++; issues.push(`${g.meta.name}: ${err.message}`); }
      finally { if (fish) fish.dispose(); }
    }
  };
  try {
    for (const hid of Object.keys(HABITATS)) {
      const row = { name: HABITATS[hid].n, n: 0, m: 0, geo: 0, hero: 0, lod: 0, fail: 0 }; rows.push(row);
      try {
        const concept = invent(hid, 'novel-regression-' + hid);
        testGenome(concept, row, true);
        if (!concept.meta.novel || concept.meta.species || concept.meta.habitat !== hid || !cladeAllowed(concept.meta.clade, HABITATS[hid])) {
          row.fail++; issues.push(`${hid}: invented fish failed habitat or novelty constraints`);
        }
      } catch (error) { row.fail++; issues.push(`${hid}: invention failed: ${error.message}`); }
      for (let i = 0; i < 200 && !TEST_STATE.cancel; i++) {
        const g = generate({ habitat: hid, seed: 'anatomy-test-' + i }); testGenome(g, row, exhaustive || i % 25 === 0);
        const evolved = mutate(g, .85, 'mutation-test-' + hid + '-' + i); row.m++;
        if (violations(evolved).length) { row.fail++; issues.push(`${hid}: mutation constraints failed (${g.meta.clade})`); }
        if (i % 20 === 0) { prog.textContent = `${HABITATS[hid].n}: ${i + 1}/200`; show(); await yieldFrame(); }
      }
      show(); if (TEST_STATE.cancel) break;
    }
    if (!TEST_STATE.cancel) {
      const row = { name: 'All reference species', n: 0, m: 0, geo: 0, hero: 0, lod: 0, fail: 0 }; rows.push(row);
      for (const sp of SPECIES) {
        if (TEST_STATE.cancel) break;
        const g = generate({ species: sp.id, seed: 'reference-anatomy' }); testGenome(g, row, true);
        const a = anatomyProfile(g), locks = a.locks;
        if (Object.keys(locks).some(p => getP(g, p) !== locks[p])) { row.fail++; issues.push(sp.n + ': lineage architecture failed'); }
        const again = generate({ species: sp.id, seed: 'reference-anatomy' });
        if (JSON.stringify(stripGenome(g)) !== JSON.stringify(stripGenome(again))) { row.fail++; issues.push(sp.n + ': generation is not deterministic'); }
        const mutant = mutate(g, .7, 'breed-' + sp.id), offspring = breed(g, mutant, 'cross-' + sp.id); row.m++;
        if (violations(offspring).length) { row.fail++; issues.push(sp.n + ': crossover rules failed'); }
        prog.textContent = 'Reference anatomy: ' + sp.n; show(); await yieldFrame();
      }
    }
    const failed = rows.reduce((n, r) => n + r.fail, 0); TEST_STATE.last = { rows, issues, exhaustive, canceled: TEST_STATE.cancel };
    prog.textContent = TEST_STATE.cancel ? 'Canceled. Partial results shown.' : failed ? `${failed} checks failed. Details below.` : 'All completed checks passed.';
  } finally { TEST_STATE.running = App.testing = false; App.paused = beforePause; }
  return TEST_STATE.last;
}
FG.checkFishGeometry = checkFishGeometry; FG.TEST_STATE = TEST_STATE;
/* ── events & boot ── */
/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 9. HYBRID + EVOLUTION ENGINE                                     ║
   ║    body-plan aware crossing, habitat syndromes, wonder search,   ║
   ║    gradual evolution (drift · selection · gene flow · novelty)   ║
   ╚══════════════════════════════════════════════════════════════════╝ */
const mixC = (a, b, t) => { const dh = ((b[0] - a[0] + 540) % 360) - 180; return [(a[0] + dh * t + 360) % 360, clamp(lerp(a[1], b[1], t), 0, 1), clamp(lerp(a[2], b[2], t), 0, 1)]; };
const nounOf = n => String(n || 'fish').replace(/\(.*?\)/g, '').trim().split(/\s+/).pop().toLowerCase().replace(/[^a-z-]/g, '') || 'fish';
const LOGP = new Set(['body.length', 'body.fineness', 'body.width', 'body.pedDepth', 'body.snoutDepth', 'head.lengthFrac', 'head.eyeSize', 'mouth.gape', 'swim.freq', 'fins.dorsal.height', 'fins.dorsal2.height', 'fins.dorsal3.height', 'fins.anal.height', 'fins.pectoral.len', 'fins.pelvic.len', 'fins.caudal.len', 'fins.caudal.span', 'fins.caudal.aspect', 'fins.adipose.size', 'head.specialLen', 'head.specialWidth', 'head.barbelLen']);
const blendN = (p, a, b, t) => LOGP.has(p) && a > 0 && b > 0 ? Math.exp(lerp(Math.log(a), Math.log(b), t)) : lerp(a, b, t);
const setN = (g, p, v) => { const e = SCHEMA[p]; v = clamp(v, e.min, e.max); setP(g, p, e.t === 'i' ? Math.round(v) : v); };
const cp3 = v => Array.isArray(v) ? v.slice() : v;
/* every schema path belongs to exactly one organ; organs are inherited as functional units */
const ORGAN_DEFS = [
  ['body', 'struct', p => p.startsWith('body.')], ['face', 'surface', p => /^head\.(lengthFrac|snoutTaper|foreheadSlope|brow|cheek)$/.test(p)],
  ['jaw', 'surface', p => p.startsWith('mouth.')], ['eye', 'surface', p => /^head\.eye/.test(p) || p === 'skin.eye'],
  ['ornament', 'surface', p => /^head\.special/.test(p)], ['barbels', 'surface', p => /^head\.barbel/.test(p)],
  ['gills', 'lineage', p => /^head\.(operculum|gill|spiracles|nostrils)/.test(p)],
  ['dorsal', 'struct', p => /^fins\.dorsal/.test(p)], ['anal', 'struct', p => /^fins\.anal\./.test(p)], ['pectoral', 'struct', p => /^fins\.pectoral\./.test(p)],
  ['pelvic', 'struct', p => /^fins\.pelvic\./.test(p)], ['tail', 'struct', p => /^fins\.caudal\./.test(p) || p.startsWith('swim.')],
  ['extras', 'surface', p => /^fins\.(adipose|finlets)/.test(p)], ['scales', 'surface', p => p === 'skin.scale' || p === 'skin.scaleSize'],
  ['pattern', 'surface', p => /^skin\.(pattern|band)/.test(p)], ['palette', 'surface', p => ['skin.base', 'skin.belly', 'skin.accent', 'skin.fin'].includes(p)],
  ['sheen', 'surface', p => /^skin\.(iridescence|gloss|countershade|lateralLine)$/.test(p)], ['light', 'surface', p => /^skin\.(photophores|glow|translucency|electric|inflate)$/.test(p)]
];
const ORGAN_KIND = {}, ORG_OF = {}, ORG_PATHS = {}, ORGAN_LABEL = { body: 'Body plan', face: 'Head shape', jaw: 'Jaws & teeth', eye: 'Eyes', ornament: 'Head ornament', barbels: 'Barbels', gills: 'Gills', dorsal: 'Dorsal fins', anal: 'Anal fin', pectoral: 'Pectoral fins', pelvic: 'Pelvic fins', tail: 'Tail & swimming', extras: 'Finlets & adipose', scales: 'Scales', pattern: 'Pattern', palette: 'Palette', sheen: 'Sheen & lateral line', light: 'Light organs & skin' };
for (const [id, kind] of ORGAN_DEFS) ORGAN_KIND[id] = kind;
for (const p in SCHEMA) { const d = ORGAN_DEFS.find(x => x[2](p)); ORG_OF[p] = d ? d[0] : '?'; (ORG_PATHS[ORG_OF[p]] = ORG_PATHS[ORG_OF[p]] || []).push(p); }
let _GEN = null; const generic = () => _GEN || (_GEN = defaultGenome());
/** how far an organ departs from a generic fish (0..1): the organ's "signature" */
function signature(g, id) {
  let s = 0, n = 0; const d0 = generic();
  for (const p of ORG_PATHS[id] || []) { const e = SCHEMA[p], v = getP(g, p), d = getP(d0, p); n++;
    if (e.t === 'n' || e.t === 'i') s += Math.min(1, Math.abs(v - d) / Math.max(1e-6, e.max - e.min) * 3);
    else if (e.t === 'hsl') s += Math.min(1, Math.abs(((v[0] - d[0] + 540) % 360) - 180) / 180 * .6 + Math.abs(v[1] - d[1]) * .5 + Math.abs(v[2] - d[2]) * .5);
    else s += v !== d ? 1 : 0; }
  return n ? s / n : 0;
}
/** body-plan class: structural organs are only exchanged between identical plans (names follow the real anatomy families) */
function planOf(g) {
  const fam = anatomyProfile(g).family, b = g.body;
  if (fam === 'upright' || b.posture > 60) return 'upright';
  if (fam === 'ray') return 'ray'; if (fam === 'benthicShark') return 'flatShark'; if (fam === 'flatfish' || Math.abs(b.roll) > 45) return 'flat';
  if (fam === 'knife') return 'knife'; if (fam === 'molid') return 'molid'; if (fam === 'rigid') return 'rigid'; if (fam === 'jawless') return 'jawless'; if (fam === 'pipe') return 'pipe';
  if (fam === 'ribbon' && b.fineness > 8) return 'ribbon'; if (fam === 'chimaera') return 'chimaera';
  return 'std';
}
const shuffle = (rng, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/** functional axes (0..1) measured from the genome itself, so every rule reacts to the real fish, invented or not */
const AX = g => {
  const f = g.fins, s = g.skin, m = g.mouth, b = g.body, pierce = ['fang', 'needle', 'triangular'].includes(m.teeth);
  return {
    fast: clamp((b.fineness - 3) / 6, 0, 1) * (f.caudal.present && f.caudal.aspect > 2.6 ? 1 : .55), agile: clamp(f.pectoral.len / 1.1, 0, 1) * (b.fineness < 4.5 ? 1 : .5),
    pred: clamp(m.gape * .8 + (pierce ? .35 : 0), 0, 1), flat: clamp(b.ventralFlat * .8 + (g.head.eyeV > .7 ? .25 : 0) + (Math.abs(b.roll) > 45 ? .6 : 0), 0, 1),
    armor: ['plates', 'scutes', 'ganoid'].includes(s.scale) ? 1 : s.scale === 'denticle' ? .45 : 0,
    camo: ['mottle', 'disruptive', 'saddles', 'spots'].includes(s.pattern) ? clamp(s.patternStrength * (1 - s.iridescence * .5), 0, 1) : 0,
    show: clamp((f.dorsal.height + f.pectoral.len * .5) / 1.6, 0, 1) * (.4 + s.iridescence * .6), dark: clamp(s.photophores / 30, 0, 1), eel: clamp((b.fineness - 7) / 6, 0, 1),
    size: clamp(Math.log10(b.length / .05) / 2.6, 0, 1), glass: s.translucency,
    filter: m.gape > .68 && ['none', 'rasp'].includes(m.teeth) ? clamp((m.gape - .6) / .3, 0, 1) : 0,
    grazer: m.gape < .3 && ['molar', 'beak', 'villiform', 'rasp'].includes(m.teeth) ? clamp((.34 - m.gape) / .2, 0, 1) : 0,
    surface: (m.type === 'superior' ? .6 : 0) + b.dorsalFlat * .4, spiny: f.dorsal.shape === 'spines' || f.dorsal.spines >= 14 ? 1 : 0,
    school: clamp((s.iridescence - .45) * 2, 0, 1) * (b.length < .5 ? 1 : .4), sail: f.dorsal.shape === 'sail' || f.dorsal.height > 1.1 ? 1 : 0, whisker: clamp(g.head.barbels / 4, 0, 1)
  };
};
/* ── plan-coherence rules: these remove the "missing tail" class of defects everywhere (mix, mutate, god mode) ── */
RULE('plan_swim_posture', 'Swim mode, posture and curl agree with the body plan', (g, lm, log) => {
  const a = anatomyProfile(g), lockNoTail = a.locks && a.locks['fins.caudal.present'] === false;
  if (g.swim.mode === 'hippocampiform' && g.body.posture <= 60 && !lockNoTail) setLog(g, log, 'plan_swim_posture', 'swim.mode', g.body.fineness > 9 ? 'anguilliform' : 'subcarangiform');
  if (g.swim.mode === 'rajiform' && a.family !== 'ray') setLog(g, log, 'plan_swim_posture', 'swim.mode', 'subcarangiform');
  if (g.body.curl > .02 && g.body.posture <= 60 && a.family !== 'upright') setLog(g, log, 'plan_swim_posture', 'body.curl', 0);
});
