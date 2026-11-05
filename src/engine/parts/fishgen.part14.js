// @@PART js/app.part13.js (13/19) lines 2609-2814 of the original module script -- stripped by build.mjs
class School {
  constructor(genome, count, es) {
    this.max = count; this.count = count; this.es = es; this.lod = buildFish(genome, { quality: 'lod', instanced: count }); const ph = new Float32Array(count); for (let i = 0; i < count; i++) ph[i] = Math.random();
    this.meshes = this.lod.group.children.filter(m => m.isInstancedMesh);
    for (const mesh of this.meshes) { mesh.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1)); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
    this.group = this.lod.group; this.pos = new Float32Array(count * 3); this.vel = new Float32Array(count * 3); this.dummy = new THREE.Object3D(); this.tmp = new THREE.Vector3(); this.fwd = new THREE.Vector3(1, 0, 0); this.q = new THREE.Quaternion();
    const ni = NICHES[genome.meta.niche]; this.formation = (ni && ni.formation) || 'loose'; const L = genome.body.length; this.L = L; this.speed = L * (this.formation === 'hover' ? 0.2 : this.formation === 'benthic' ? 0.5 : genome.swim.mode === 'thunniform' ? 3.5 : 1.6) * genome.swim.freq / 1.6;
    const R = es * 3; for (let i = 0; i < count; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * R; this.pos[i * 3] = Math.cos(a) * r; this.pos[i * 3 + 1] = (Math.random() - 0.5) * R * 0.8 + this.baseY(); this.pos[i * 3 + 2] = Math.sin(a) * r; this.vel[i * 3] = this.speed; this.vel[i * 3 + 1] = 0; this.vel[i * 3 + 2] = (Math.random() - 0.5) * this.speed * 0.3; }
    this.params = { polarized: [1.5, 1.2, 1.0, 2.2], loose: [0.6, 0.5, 1.4, 1.6], benthic: [0.3, 0.4, 1.6, 1.0], column: [0.8, 0.6, 1.2, 1.2], hover: [0.2, 0.3, 1.5, 1] }[this.formation] || [0.6, 0.5, 1.4, 1.6];
    this.center = new THREE.Vector3(0, this.baseY(), 0); this.sepR = L * 1.6; this.nbrR = L * (this.formation === 'polarized' ? 6 : 4);
    this.roll = this.lod.group.rotation.x; this.lod.group.rotation.x = 0;
  }
  baseY() { return this.formation === 'benthic' ? -1.3 * this.es : 0.6 * this.es; }
  setCount(n) { this.count = Math.min(this.max, Math.max(4, n)); for (const mesh of this.meshes) mesh.count = this.count; }
  update(dt, t) {
    this.lod.uniforms.uCycle.value += dt * this.lod.bm.g.swim.freq;
    const n = this.count, P = this.pos, V = this.vel, [align, coh, sep, home] = this.params, sp = this.speed, sepR2 = this.sepR * this.sepR, nbrR2 = this.nbrR * this.nbrR, R = this.es * 3.2;
    if (this.formation === 'column') this.center.y = this.baseY() + Math.sin(t * 0.15) * this.es * 2;
    for (let i = 0; i < n; i++) { const ix = i * 3; let ax = 0, ay = 0, az = 0, cx = 0, cy = 0, cz = 0, sx = 0, sy = 0, sz = 0, cnt = 0;
      for (let j = 0; j < n; j++) { if (j === i) continue; const jx = j * 3, dx = P[jx] - P[ix], dy = P[jx + 1] - P[ix + 1], dz = P[jx + 2] - P[ix + 2], d2 = dx * dx + dy * dy + dz * dz; if (d2 > nbrR2) continue; cnt++; ax += V[jx]; ay += V[jx + 1]; az += V[jx + 2]; cx += dx; cy += dy; cz += dz; if (d2 < sepR2 && d2 > 1e-9) { const w = 1 / d2; sx -= dx * w; sy -= dy * w; sz -= dz * w; } }
      let fx = 0, fy = 0, fz = 0; if (cnt) { fx += (ax / cnt - V[ix]) * align + cx / cnt * coh; fy += (ay / cnt - V[ix + 1]) * align + cy / cnt * coh; fz += (az / cnt - V[ix + 2]) * align + cz / cnt * coh; }
      fx += sx * sep * this.L * this.L; fy += sy * sep * this.L * this.L; fz += sz * sep * this.L * this.L;
      const hx = this.center.x - P[ix], hy = this.center.y - P[ix + 1], hz = this.center.z - P[ix + 2], hd = Math.sqrt(hx * hx + hy * hy + hz * hz); if (hd > R) { const k = home * (hd - R) / R; fx += hx / hd * k * sp; fy += hy / hd * k * sp; fz += hz / hd * k * sp; }
      const d0 = Math.max(1e-6, Math.sqrt(P[ix] * P[ix] + P[ix + 1] * P[ix + 1] + P[ix + 2] * P[ix + 2])); if (d0 < this.es * 1.2) { const k = (this.es * 1.2 - d0) / this.es * sp * 3; fx += P[ix] / d0 * k; fy += P[ix + 1] / d0 * k; fz += P[ix + 2] / d0 * k; }
      if (this.formation === 'benthic') fy += (this.baseY() - P[ix + 1]) * 2 * sp; if (this.formation === 'hover') { fx += (Math.random() - 0.5) * sp * 2; fy += (Math.random() - 0.5) * sp * 2; }
      V[ix] += fx * dt; V[ix + 1] += fy * dt * 0.6; V[ix + 2] += fz * dt; const vl = Math.hypot(V[ix], V[ix + 1], V[ix + 2]) || 1e-6; const tgt = clamp(vl, sp * 0.5, sp * 1.4); V[ix] *= tgt / vl; V[ix + 1] *= tgt / vl; V[ix + 2] *= tgt / vl; }
    const roll = this.roll; for (let i = 0; i < n; i++) { const ix = i * 3; P[ix] += V[ix] * dt; P[ix + 1] += V[ix + 1] * dt; P[ix + 2] += V[ix + 2] * dt;
      this.dummy.position.set(P[ix], P[ix + 1], P[ix + 2]); this.tmp.set(V[ix], V[ix + 1], V[ix + 2]).normalize(); this.q.setFromUnitVectors(this.fwd, this.tmp); this.dummy.quaternion.copy(this.q); if (roll) this.dummy.rotateX(roll); this.dummy.updateMatrix(); for (const mesh of this.meshes) mesh.setMatrixAt(i, this.dummy.matrix); }
    for (const mesh of this.meshes) mesh.instanceMatrix.needsUpdate = true;
  }
  dispose() { scene.remove(this.group); this.lod.dispose(); }
}
/* ── fish lifecycle ── */
function setFish(genome, opts = {}) {
  const prevL = App.genome ? App.genome.body.length : null;
  const cycle = App.fish ? App.fish.uniforms.uCycle.value : 0;
  const fish = buildFish(genome, { quality: App.tier >= 2 ? 'med' : 'hero' });
  if (App.fish) { scene.remove(App.fish.group); App.fish.dispose(); App.fish = null; } clearHelpers();
  if (genome.meta.godMode === undefined) genome.meta.godMode = GOD.enabled; else GOD.enabled = genome.meta.godMode;
  App.genome = genome; if (!opts.noHistory) { App.history.push(deepClone(genome)); if (App.history.length > 32) App.history.shift(); }
  if (opts.keepCamera) fish.uniforms.uCycle.value = cycle;
  syncSelects(genome);
  App.fish = fish; scene.add(fish.group);
  const hab = HABITATS[genome.meta.habitat] || HABITATS.coralReef;
  if (!App.env || App.env.hab.id !== hab.id || !prevL || Math.abs(Math.log(genome.body.length / prevL)) > 0.5) buildEnvironment(hab, genome.body.length);
  if (App.school) { App.school.dispose(); App.school = null; } if (App.schoolOn) startSchool();
  App.inflateTarget = 0; fish.uniforms.uPupil.value = 1 - hab.light; App.state.nextBurst = ENV.uTime.value + 3 + Math.random() * 6;
  if (!opts.keepCamera) frameCamera(fish); updateHUD(); updateDebugHelpers(); if (!opts.skipPanel) refreshPanels(); updateHash();
}
function frameCamera(fish) {
  const box = fish.info.bounds, c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const r = Math.max(1e-3, size.length() * .5), ray = ['ray', 'benthicShark'].includes(fish.bm.a.family);
  const halfFov = camera.fov * Math.PI / 360;
  const visibleHalf = ray ? Math.max(size.z * .55, size.x * .54 / camera.aspect) : Math.max(size.y * .55, size.x * .54 / camera.aspect);
  const dist = visibleHalf / Math.tan(halfFov) * 1.16 + (ray ? size.y : size.z) * .6;
  camera.near = Math.max(.0001, dist * .003); camera.far = dist * 400 + App.es * 200; camera.updateProjectionMatrix();
  controls.minDistance = r * .25; controls.maxDistance = dist * 6;
  const direction = ray ? new THREE.Vector3(.08, .96, .28) : new THREE.Vector3(.13, .1, 1);
  tweenCamera(c.clone().add(direction.normalize().multiplyScalar(dist)), c);
}
function tweenCamera(to, target) {
  if (reducedMotion) { camera.position.copy(to); controls.target.copy(target); controls.update(); return; }
  App.cameraTween = { from: camera.position.clone(), to, startTarget: controls.target.clone(), target, start: performance.now(), duration: 550 };
  controls.enableDamping = false;
}
function setCameraView(view) {
  if (!App.fish) return;
  const center = App.fish.info.bounds.getCenter(new THREE.Vector3()), size = App.fish.info.bounds.getSize(new THREE.Vector3()), r = Math.max(size.length() * .5, .001), distance = r / Math.sin(camera.fov * Math.PI / 360) * 1.12;
  const dir = view === 'top' ? new THREE.Vector3(.04, 1, .001) : view === 'head' ? new THREE.Vector3(1, .06, .01) : new THREE.Vector3(.02, .05, 1);
  tweenCamera(center.clone().addScaledVector(dir.normalize(), distance), center);
}
function undoFish() {
  clearTimeout(GOD.timer); clearTimeout(editTimer);
  if (Object.values(GOD.axes).some(v => v !== 0) && GOD.baseline) { GOD.axes = {}; setFish(deepClone(GOD.baseline), { noHistory: true, keepCamera: true }); return; }
  if (App.history.length < 2) { toast('No earlier fish in this session.'); return; }
  App.history.pop(); setFish(deepClone(App.history[App.history.length - 1]), { noHistory: true, keepCamera: true }); toast('Previous genome restored.');
}
function startSchool() { if (!App.genome) return; if (App.school) App.school.dispose(); App.school = new School(App.genome, TIERS[App.tier].school, App.es); scene.add(App.school.group); App.schoolOn = true; document.getElementById('btnSchool').classList.add('active'); }
function stopSchool() { if (App.school) { App.school.dispose(); App.school = null; } App.schoolOn = false; document.getElementById('btnSchool').classList.remove('active'); }
function rebuildAll() { if (App.genome) { const g = App.genome; if (App.env) { scene.remove(App.env.group); disposeObject(App.env.group); App.env = null; } setFish(g, { noHistory: true, keepCamera: true }); } }
function clearHelpers() { for (const h of App.helpers) { scene.remove(h); disposeObject(h); } App.helpers = []; }
function updateDebugHelpers() {
  clearHelpers(); const f = App.fish; if (!f) return; const d = App.debug;
  for (const k of ['body', 'jaw', 'fin', 'simple', 'tooth']) f.materials[k].wireframe = d.wire;
  if (d.skeleton) { const pts = []; for (let i = 0; i < f.info.spine.length - 1; i += 4) { const a = f.info.spine[i], b = f.info.spine[Math.min(i + 4, f.info.spine.length - 1)]; pts.push(a.x, a.y, 0, b.x, b.y, 0); } for (const r of f.info.rays) pts.push(...r);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); const ls = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x2dd4bf, depthTest: false, transparent: true, opacity: 0.9 })); ls.rotation.x = f.group.rotation.x; ls.renderOrder = 10; scene.add(ls); App.helpers.push(ls); }
  if (d.landmarks) { const pts = [], cols = []; for (const l of f.info.landmarks3D) { pts.push(l.x, l.y, l.z); const c = new THREE.Color().setHSL(cyrb128(l.name)[0] % 360 / 360, 0.9, 0.6); cols.push(c.r, c.g, c.b); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 12, sizeAttenuation: false, vertexColors: true, depthTest: false })); p.rotation.x = f.group.rotation.x; p.renderOrder = 11; scene.add(p); App.helpers.push(p); }
}
/* ── animation loop ── */
let lastT = performance.now(), frames = 0, fpsAcc = 0, hudTimer = 0;
function animate(now) {
  requestAnimationFrame(animate);
  try {
    const rawDt = Math.max(.0001, (now - lastT) / 1000); lastT = now;
    if (App.contextLost || App.shaderFailed) return;
    const dt = App.paused ? 0 : Math.min(.05, rawDt) * (reducedMotion ? .35 : 1); App.clock += dt; const t = App.clock; ENV.uTime.value = t;
    const fps = 1 / rawDt; if (!App.testing) adaptQuality(Math.min(.1, rawDt), fps); frames++; fpsAcc += fps; hudTimer += rawDt; if (hudTimer > .5) { updateStats(fpsAcc / frames); frames = 0; fpsAcc = 0; hudTimer = 0; }
    const f = App.fish; if (f) {
      const u = f.uniforms, g = App.genome, s = App.state, L = g.body.length;
      const restPose = App.debug.skeleton || App.debug.landmarks; u.uAmp.value = restPose ? 0 : g.swim.amp;
      if (!reducedMotion && t > s.nextBurst) { s.burst = 1; s.nextBurst = t + 5 + Math.random() * 9; } s.burst = Math.max(0, s.burst - dt / 1.3); const b = s.burst * s.burst; u.uBurst.value = b; u.uFreq.value = g.swim.freq * (1 + 1.1 * b);
      u.uCycle.value += dt * u.uFreq.value;
      const br = clamp(0.55 / Math.pow(L, 0.35), 0.25, 1.6), breath = 0.5 + 0.5 * Math.sin(t * br * TAU); u.uBreath.value = breath * (reducedMotion ? 0.3 : 1);
      const predator = (g.meta.tags || []).includes('predator'), shark = f.bm.a.solid && f.bm.a.gills === 'lateral'; u.uJawAngle.value = Math.min(1, g.mouth.open * .4 + (shark ? .008 : .04) * breath + (predator ? .45 * b : .1 * b)) * u.uJawOpenMax.value; u.uJawProtrude.value = g.mouth.protrusible ? (.2 * breath + .4 * b) * L * .018 : 0;
      if (t > s.saccT) { s.saccT = t + 0.7 + Math.random() * 2.5; s.saccTarget.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3); } u.uSacc.value.lerp(s.saccTarget, 1 - Math.exp(-dt * 16));
      u.uInflate.value = lerp(u.uInflate.value, App.inflateTarget, 1 - Math.exp(-dt * 3));
      if (restPose) { u.uBreath.value = 0; u.uJawAngle.value = 0; u.uJawProtrude.value = 0; u.uInflate.value = 0; u.uFlap.value = 0; } else u.uFlap.value = FLAP[g.swim.mode] || .2;
      f.group.position.y = reducedMotion || restPose ? 0 : Math.sin(t * .6) * L * .015; f.group.rotation.y = reducedMotion || restPose ? 0 : Math.sin(u.uCycle.value * TAU) * .012 * (1 + b);
    }
    if (App.school && App.schoolOn && dt > 0) App.school.update(dt, t);
    if (App.env && App.env.shafts && App.env.shafts.visible) for (const m of App.env.shafts.children) m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z);
    if (App.cameraTween) { const v = App.cameraTween, q = clamp((now - v.start) / v.duration, 0, 1), ease = smoother(q); camera.position.lerpVectors(v.from, v.to, ease); controls.target.lerpVectors(v.startTarget, v.target, ease); if (q === 1) { App.cameraTween = null; controls.enableDamping = true; } }
    controls.update(); renderer.render(scene, camera);
  } catch (e) { showError(e); }
}
/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 11. UI, PANELS, EXPORT, SELF-TEST, BOOT                          ║
   ╚══════════════════════════════════════════════════════════════════╝ */
const $ = id => document.getElementById(id);
let toastTimer = 0; function toast(msg) { const t = $('toast'); t.textContent = msg; t.style.opacity = 1; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.opacity = 0; }, 2600); }
function showError(e) { console.error(e); window.__fgShowError(e && e.stack ? e.stack : String(e)); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
const b64enc = s => btoa(unescape(encodeURIComponent(s))), b64dec = s => decodeURIComponent(escape(atob(s)));
function populateSelects() {
  const h = $('selHabitat'); h.innerHTML = Object.values(HABITATS).map(x => `<option value="${x.id}">${esc(x.n)}</option>`).join('');
  const n = $('selNiche'); n.innerHTML = '<option value="">Niche: auto</option>' + Object.values(NICHES).map(x => `<option value="${x.id}">${esc(x.n)}${x.fantasy ? ' ✨' : ''}</option>`).join('');
  const c2 = $('selClade'); const rows = []; const walk = (id, depth) => { rows.push(`<option value="${id}">${'· '.repeat(depth)}${esc(CLADES[id].n)}</option>`); Object.values(CLADES).filter(k => k.p === id).forEach(k => walk(k.id, depth + 1)); }; walk('fish', 0); c2.innerHTML = '<option value="">Clade: auto</option>' + rows.join('');
  const s = $('selSpecies'); const byHab = {}; for (const sp of SPECIES) (byHab[sp.habitat] = byHab[sp.habitat] || []).push(sp); s.innerHTML = '<option value="">Species: none</option>' + Object.keys(byHab).map(hid => `<optgroup label="${esc(HABITATS[hid].n)}">` + byHab[hid].map(sp => `<option value="${sp.id}">${esc(sp.n)}</option>`).join('') + '</optgroup>').join('');
}
function currentOpts() { return { habitat: $('selHabitat').value || undefined, niche: $('selNiche').value || undefined, clade: $('selClade').value || undefined, species: $('selSpecies').value || undefined, seed: $('seed').value.trim() || undefined }; }
function doGenerate(opts) {
  clearTimeout(GOD.timer); clearTimeout(editTimer);
  try {
    opts = opts || currentOpts();
    if (!opts.seed) { opts.seed = Math.floor(Math.random() * 1e9).toString(36); $('seed').value = opts.seed; }
    const g = generate(opts); syncSelects(g); setFish(g);
  } catch (e) { if (e instanceof RangeError) toast(e.message); else showError(e); }
}
function syncSelects(g) { $('selHabitat').value = g.meta.habitat; $('seed').value = g.meta.seed; }
/** Top-bar "name → creature": species name (optionally + habitat words) or a free description; species are adapted to the chosen habitat. */
function convertFromName() {
  const text = $('nameInput').value.trim(); if (!text) { toast('Type a species name or describe a creature.'); return; }
  try {
    const sp = findSpecies(text), habitat = findHabitat(text) || $('selHabitat').value || undefined, seed = cyrb128(text + '|' + (habitat || '')).toString(36);
    const g = sp ? generate({ species: sp.id, habitat, seed: 'name:' + seed }) : genomeFromText(text, 'txt:' + seed, habitat);
    syncSelects(g); setFish(g);
    toast(sp ? (g.meta.adapted ? sp.n + ' adapted to ' + HABITATS[g.meta.habitat].n : sp.n + ' in its native habitat') : 'Interpreted as ' + CLADES[g.meta.clade].n.toLowerCase() + ' / ' + NICHES[g.meta.niche].n.toLowerCase());
  } catch (e) { if (e instanceof RangeError) toast(e.message); else showError(e); }
}
/** Invent within one body plan and one habitat; the seed fully determines the result. */
function invent(habId, seed) {
    const hab = HABITATS[habId]; if (!hab) throw new Error('Unknown discovery habitat');
    const rng = new RNG('disc:' + seed);
    const a = generate({ habitat: habId, noSpecies: true, seed: 'disc-a-' + seed });
    /* sister lineage: a nearby leaf clade (tree distance ≤ 3) that is ecologically valid for this habitat */
    const isLeaf = id => !Object.values(CLADES).some(k => k.p === id);
    const plan = anatomyProfile(a);
    const sisters = Object.keys(CLADES).filter(id => {
      if (!isLeaf(id) || id === a.meta.clade || cladeDistance(a.meta.clade, id) > 3 || !cladeAllowed(id, hab)) return false;
      const other = anatomyProfile({ meta: { clade: id } });
      return other.family === plan.family && other.gills === plan.gills && cladeInNiche(id, NICHES[a.meta.niche]);
    });
    const sisterClade = sisters.length && rng.chance(.75) ? rng.pick(sisters) : a.meta.clade;
    const b = generate({ habitat: habId, clade: sisterClade, niche: a.meta.niche, noSpecies: true, seed: 'disc-b-' + seed });
    let child; try { child = breed(a, b, 'disc-x-' + seed); } catch (err) { child = a; }
    child = mutate(child, .25, 'disc-m-' + seed);
    child.meta.habitat = habId; child.meta.niche = a.meta.niche; child.meta.species = null; child.meta.parentSpecies = null;
    child.meta.adapted = null; child.meta.novel = true; child.meta.repairs = [];
    delete child.meta.evolution; delete child.meta.mutation;
    finalize(child);
    return child;
}
FG.invent = invent;
function doDiscover() {
  clearTimeout(GOD.timer); clearTimeout(editTimer);
  try {
    const habId = $('selHabitat').value || (App.genome ? App.genome.meta.habitat : 'coralReef');
    const child = invent(habId, Math.floor(Math.random() * 1e9).toString(36));
    const cl = CLADES[child.meta.clade];
    $('selSpecies').value = ''; $('selClade').value = ''; $('selNiche').value = ''; $('seed').value = '';
    setFish(child); toast('New concept from the ' + cl.n.toLowerCase() + ' lineage, shaped for ' + HABITATS[habId].n + '.');
  } catch (e) { showError(e); }
}
function doBreed() { if (App.history.length < 2) { toast('Generate a second fish first. Breed crosses the current fish with the previous one.'); return; } const a = App.history[App.history.length - 2], b = App.genome; try { const child = adaptFinish(hybridize(a, b, .5, a.meta.seed + 'x' + b.meta.seed + ':' + Math.floor(Math.random() * 1e6).toString(36)), b.meta.habitat, 'br' + Math.floor(Math.random() * 1e6).toString(36)); child.meta.evo = { step: 0, base: child.meta.name, nov: {}, don: null, hab: null, last: null, log: [] }; setFish(child); toast('Hybrid cross: ' + a.meta.name + ' + ' + b.meta.name); } catch (e) { toast(e.message); } }
function updateHash() { if (!App.genome) return; const g = App.genome, m = g.meta; const q = new URLSearchParams({ s: m.seed, h: m.habitat, n: m.niche || '', c: m.clade, sp: m.species || '', g: b64enc(JSON.stringify(slimGenome(g))) }); try { history.replaceState(null, '', '#' + q.toString()); } catch (e) { /* Sandboxed or local-file history. */ } }
function stripGenome(g) { const c2 = deepClone(g); delete c2.meta.metrics; delete c2.meta.landmarks; delete c2.meta.repairs; return c2; }
function loadFromHash() { const q = new URLSearchParams(location.hash.slice(1)); if (!q.get('s') && !q.get('g')) return false; try { if (q.get('g')) { const { genome, issues } = validateGenome(JSON.parse(b64dec(q.get('g')))); genome.meta.repairs = issues.map(i => ({ rule: 'schema_validate', path: '-', from: '-', to: i })); finalize(genome); genome.meta.edited = true; syncSelects(genome); setFish(genome); return true; } const opts = { seed: q.get('s'), habitat: q.get('h') || undefined, niche: q.get('n') || undefined, clade: q.get('c') || undefined, species: q.get('sp') || undefined }; $('selHabitat').value = opts.habitat || ''; $('selNiche').value = opts.niche || ''; $('selClade').value = opts.clade || ''; $('selSpecies').value = ''; $('seed').value = opts.seed; doGenerate(opts); return true; } catch (e) { console.warn('hash load failed', e); return false; } }
function updateHUD() {
  const g = App.genome; if (!g) return; const m = g.meta;
  $('fishName').innerHTML = esc(m.name) + (m.hybrid ? '<span class="badge" style="background:#b45309">HYBRID</span>' : m.novel ? '<span class="badge" style="background:#22644f">NEW CONCEPT</span>' : '')
    + (m.speculative ? '<span class="badge" style="background:#7355a6">SPECULATIVE</span>' : m.fantasy ? '<span class="badge">FANTASY</span>' : '')
    + (m.species ? '<span class="badge" style="background:#0e7490">' + (m.speculative ? 'REFERENCE LINEAGE' : 'SPECIES CARD') + '</span>' : '')
    + (m.adapted ? '<span class="badge" style="background:#925614">HABITAT VARIANT</span>' : '');
  $('fishSci').textContent = m.sci || '';
  $('fishTags').textContent = `${HABITATS[m.habitat].n} / ${NICHES[m.niche] ? NICHES[m.niche].n : 'Generalist'} / ${CLADES[m.clade].n} / ${m.sizeClass} (${g.body.length.toFixed(2)} m) / ${g.swim.mode}` + (m.evoTraits && m.evoTraits.length ? ' / evolved: ' + m.evoTraits.join(', ') : '');
  $('btnUndo').disabled = App.history.length < 2;
  $('btnMutate').title = 'Evolve one generation (drift, gene flow, habitat selection or a new organ). Generation ' + (((m.evo && m.evo.step) || (m.evolution ? m.evolution.step : 0)) + 1) + ' next.';
}
function updateStats(fps) { const f = App.fish; $('stats').textContent = `${fps.toFixed(0)} fps · tier ${App.tier} · ${f ? f.info.tris.toLocaleString() : 0} tris · ${renderer.info.render.calls} draws${App.school && App.schoolOn ? ' · school ' + App.school.count : ''}`; }
/* ── sheet / tabs ── */
let currentTab = null; const inspectorState = { genome: null, inputs: new Map() };
function openSheet(tab) { clearTimeout(GOD.timer); currentTab = tab; $('sheet').classList.remove('hidden'); document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); renderPanel(tab); onResize(); }
function closeSheet() { clearTimeout(GOD.timer); currentTab = null; $('sheet').classList.add('hidden'); document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active')); onResize(); }
function refreshPanels() { if (!currentTab || currentTab === 'tests' || currentTab === 'text' || (currentTab === 'god' && GOD.editing)) return; if (currentTab === 'inspect' && inspectorState.genome === App.genome) { syncInspector(); return; } if (currentTab === 'gallery') return; renderPanel(currentTab); }
function renderPanel(tab) { const body = $('sheetBody'); const titles = { mix: 'Hybrid Lab / lineage & adaptation report', evo: 'Evolution Lab / gradual mutation', god: 'God Mode / Evolution Workbench', inspect: 'Genome inspector', tree: 'Phylogeny', gallery: 'Reference gallery', text: 'Text to genome', export: 'Export & share', debug: 'Debug & rules', tests: 'Anatomy regression tests', help: 'Anatomy Engine Guide' }; $('sheetTitle').textContent = titles[tab] || tab; body.innerHTML = ''; try { PANELS[tab](body); } catch (e) { showError(e); } }
