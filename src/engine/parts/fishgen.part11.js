// @@PART js/app.part11.js (11/19) lines 2151-2428 of the original module script -- stripped by build.mjs
function buildSpecials(bm, mats) {
  const g = bm.g, sp = g.head.special, L = bm.L, out = [], fr = {}, s = {};
  if (sp === 'none' || sp === 'horns' || bm.billStart !== null) return out;
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; out.push(m); return m; };
  bm.frame(0.003, fr); bm.section(0.03, s); const snX = fr.px, snY = fr.py;
  const loftSpike = (uBase, len, taperY, taperZ, droop, widen) => {
    /* base ring sampled ON the skin at uBase → the junction is vertex-coincident with the body, no seam */
    const M = 18, N = 14, ring = [], pos = [], idx = [], p = {}, frB = {}; bm.frame(uBase, frB);
    let cy = 0, cz = 0;
    for (let j = 0; j < M; j++) { bm.rawSurface(uBase, -Math.PI / 2 + j / M * TAU, p); ring.push([p.x, p.y, p.z]); cy += p.y / M; cz += p.z / M; }
    const fwdX = -frB.tx, fwdY = -frB.ty, tipX = frB.px + fwdX * len, tipY = cy + fwdY * len - droop * len;
    for (let i = 0; i <= N; i++) {
      const f = i / N, ease = Math.pow(f, .9), shrink = Math.pow(1 - f, .9) * (1 - f * .15) + .02;
      const axX = lerp(frB.px, tipX, ease), axY = lerp(cy, tipY, ease) - droop * len * f * f;
      for (let j = 0; j < M; j++) {
        const [bx, by, bz] = ring[j];
        const sy = shrink * lerp(1, taperY, f), szf = shrink * lerp(1, taperZ, f) * (1 + widen * Math.sin(Math.PI * f) * .6);
        pos.push(i === 0 ? bx : axX, i === 0 ? by : axY + (by - cy) * sy, i === 0 ? bz : (bz - cz) * szf + cz);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = a + M, d = b + M; idx.push(a, b, c, b, d, c); }
    const tip = pos.length / 3; pos.push(tipX + fwdX * len * .015, tipY, 0);
    for (let j = 0; j < M; j++) idx.push(tip, N * M + j, N * M + (j + 1) % M);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); skinAttributes(geo, bm); return geo;
  };
  if (sp === 'bill' || sp === 'sword') { add(loftSpike(.006, g.head.specialLen * L, sp === 'sword' ? .3 : .55, sp === 'sword' ? 1.1 : .6, .05, 0), mats.body); }
  else if (sp === 'rostrum' || sp === 'paddle') { const len = g.head.specialLen * L, w = g.head.specialWidth * L * (sp === 'paddle' ? 2 : 1); add(loftSpike(.008, len, sp === 'paddle' ? .22 : .14, Math.max(.6, w / Math.max(.001, bm.bp.width(.06) * L)), .01, sp === 'paddle' ? .5 : .15), mats.body);
    if (sp === 'rostrum') { const n = Math.max(6, Math.floor(len / (0.03 * L))), cone = new THREE.ConeGeometry(1, 1, 4, 1); cone.translate(0, 0.5, 0); const inst = new THREE.InstancedMesh(cone, mats.tooth, n * 2); const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3(0.004 * L, 0.03 * L, 0.004 * L), up = new THREE.Vector3(0, 1, 0); let k = 0;
      for (let i = 0; i < n; i++) for (const side of [1, -1]) { P.set(snX + len * 0.05 + (i + 0.5) / n * len * 0.85, snY, side * w * 0.5); Q.setFromUnitVectors(up, new THREE.Vector3(0, 0, side)); M.compose(P, Q, Sc); inst.setMatrixAt(k++, M); }
      cone.setAttribute('aJaw', new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 1)); inst.frustumCulled = false; out.push(inst); } }
  else if (sp === 'esca') { const len = g.head.specialLen * L; const u0 = bm.h * 0.3; bm.frame(u0, fr); bm.section(u0, s); const p0 = new THREE.Vector3(fr.px + fr.nx * s.dUp * 0.98, fr.py + fr.ny * s.dUp * 0.98, 0); const p1 = p0.clone().add(new THREE.Vector3(len * 0.35, len * 0.75, 0)), p2 = p0.clone().add(new THREE.Vector3(len * 0.95, len * 0.45, 0));
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p1, p2]), 8, Math.max(0.001, 0.006 * L), 4, false), mats.simple); const bulb = new THREE.SphereGeometry(Math.max(0.004, 0.018 * L), 8, 6); bulb.translate(p2.x, p2.y, p2.z); add(bulb, mats.glow); bm.lureTip = p2; }
  else if (sp === 'whip') { bm.frame(1, fr); bm.section(1, s); const len = g.head.specialLen * L; const geo = new THREE.CylinderGeometry(0.0015 * L, Math.max(0.002, (s.dUp + s.dDn) * 0.45), len, 6, 1); geo.rotateZ(Math.PI / 2); geo.translate(fr.px - len * 0.5, fr.py, 0); add(geo, mats.simple); }
  return out;
}
function landmarks3D(bm) { const lm = bm.lm, p = {}, out = []; const spec = { snout: [0.004, 0], mouthCorner: [lm.mouthCorner, 'm'], eye: [lm.eye, 'e'], preopercle: [lm.preopercle, 0], operculum: [lm.operculum, 0], pectoralBase: [lm.pectoralBase, 0], pelvicBase: [lm.pelvicBase, -Math.PI / 2], vent: [lm.vent, -Math.PI / 2], analOrigin: [lm.analOrigin, -Math.PI / 2], analEnd: [lm.analEnd, -Math.PI / 2], dorsalOrigin: [lm.dorsalOrigin, Math.PI / 2], dorsalEnd: [lm.dorsalEnd, Math.PI / 2], peduncleStart: [lm.peduncleStart, Math.PI / 2], caudalBase: [0.999, Math.PI / 2] };
  const fr = {}, s = {}; for (const k in spec) { const [u, th] = spec[k]; if (th === 'm') { bm.frame(u, fr); bm.section(u, s); const ym = bm.mouthLineY(u, s); out.push({ name: k, x: fr.px + fr.nx * ym, y: fr.py + fr.ny * ym, z: bm.halfWidthAtY(s, ym) }); } else if (th === 'e') { bm.frame(u, fr); bm.section(u, s); out.push({ name: k, x: fr.px + fr.nx * bm.eyeY, y: fr.py + fr.ny * bm.eyeY, z: bm.halfWidthAtY(s, bm.eyeY) }); } else { bm.surface(u, th, p); out.push({ name: k, x: p.x, y: p.y, z: p.z }); } } return out; }
/**
 * Build a renderable fish from a genome.
 * @returns {{group:THREE.Group, uniforms:Object, materials:Object, bm:BodyModel, info:Object, dispose:()=>void}}
 */
function buildFish(g, opts = {}) {
  const q = QUALITY[opts.quality || 'hero'], bm = new BodyModel(g), f = g.fins, lm = bm.lm, maxD = bm.maxD; const geos = [];
  bm.lod = !q.detail;
  const bodyGeo = buildBodyGeometry(bm, q.S, q.R); geos.push(bodyGeo);
  const uni = makeUniforms(g, bm), mats = makeMaterials(g, uni, !!opts.instanced);
  uni.uDetail.value = q.detail ? 1 : 0;
  const group = new THREE.Group(); let tris = bodyGeo.index.count / 3; const parts = {};
  const body = opts.instanced ? new THREE.InstancedMesh(bodyGeo, mats.body, opts.instanced) : new THREE.Mesh(bodyGeo, mats.body); body.frustumCulled = false; group.add(body); parts.body = body;
  const fb = new FinBuilder(); const rc = n => q.detail ? clamp(Math.round(n), 8, 40) : 5; const sf = d => d.spines / Math.max(1, d.spines + d.rays);
  if (f.dorsal.present && f.dorsal.count > 0) {
    if (bm.a.separatedDorsal) {
      const n = q.detail ? clamp(f.dorsal.spines, 6, 16) : 5;
      for (let i = 0; i < n; i++) { const s = lerp(lm.dorsalOrigin, lm.dorsalEnd, i / n), e = lerp(lm.dorsalOrigin, lm.dorsalEnd, (i + .65) / n); addRidgeFin(fb, bm, { u0: s, u1: e, height: f.dorsal.height * maxD, sweep: .4, shape: 'triangle', side: 1, rays: 5, spineFrac: .2, opacity: 1, flex: .25, kind: 'dorsal', kindId: 1, K: q.detail ? 3 : 1 }); }
    } else addRidgeFin(fb, bm, { u0: lm.dorsalOrigin, u1: lm.dorsalEnd, height: f.dorsal.height * maxD, sweep: f.dorsal.sweep, shape: f.dorsal.shape, side: 1, rays: rc(f.dorsal.spines + f.dorsal.rays), spineFrac: sf(f.dorsal), opacity: f.dorsal.opacity, flex: f.dorsal.flex, kind: 'dorsal', kindId: 1, K: q.K });
    if (f.dorsal.count >= 2) addRidgeFin(fb, bm, { u0: lm.dorsal2Origin, u1: lm.dorsal2End, height: f.dorsal2.height * maxD, sweep: f.dorsal.sweep, shape: f.dorsal2.shape, side: 1, rays: rc(f.dorsal2.spines + f.dorsal2.rays), spineFrac: sf(f.dorsal2), opacity: f.dorsal.opacity, flex: f.dorsal.flex, kind: 'dorsal', cfg: 'dorsal2', kindId: 1, K: q.K });
    if (f.dorsal.count === 3) addRidgeFin(fb, bm, { u0: lm.dorsal3Origin, u1: lm.dorsal3End, height: f.dorsal3.height * maxD, sweep: .2, shape: f.dorsal3.shape, side: 1, rays: rc(f.dorsal3.rays), spineFrac: 0, opacity: f.dorsal.opacity, flex: f.dorsal.flex, kind: 'dorsal', cfg: 'dorsal3', kindId: 1, K: q.K });
  }
  if (f.anal.present) addRidgeFin(fb, bm, { u0: lm.analOrigin, u1: lm.analEnd, height: f.anal.height * maxD, sweep: f.anal.sweep, shape: f.anal.shape, side: -1, rays: rc(f.anal.spines + f.anal.rays), spineFrac: sf(f.anal), opacity: f.anal.opacity, flex: f.anal.flex, kind: 'anal', kindId: 2, K: q.K });
  if (f.pectoral.present) { /* flattened plan: the same constructor builds the ray-supported disc margin */
    addPectoral(fb, bm, 1, q.K, rc(f.pectoral.rays)); addPectoral(fb, bm, -1, q.K, rc(f.pectoral.rays));
  }
  if (f.pelvic.present) { addPelvic(fb, bm, 1, q.K, rc(f.pelvic.rays)); addPelvic(fb, bm, -1, q.K, rc(f.pelvic.rays)); }
  if (f.adipose.present && q.detail) addRidgeFin(fb, bm, { u0: lm.adipose - 0.012, u1: lm.adipose + 0.012, height: f.adipose.size * bm.L * 0.8, sweep: 0.5, shape: 'rounded', side: 1, rays: 4, spineFrac: 0, opacity: 1, flex: 0.1, kind: 'adipose', kindId: 6, K: 2 });
  if (f.finlets.count > 0 && q.detail) { const n = f.finlets.count, a0 = (f.dorsal.count === 3 ? lm.dorsal3End : f.dorsal.count === 2 ? lm.dorsal2End : lm.dorsalEnd) + 0.015, a1 = lm.peduncleStart - 0.01;
    for (let i = 0; i < n; i++) { const u = lerp(a0, a1, (i + 0.5) / n); addRidgeFin(fb, bm, { u0: u - 0.006, u1: u + 0.006, height: maxD * 0.09, sweep: 0.9, shape: 'falcate', side: 1, rays: 3, spineFrac: 0, opacity: 1, flex: 0.2, kind: 'finlet', kindId: 7, K: 2 }); if (f.anal.present) addRidgeFin(fb, bm, { u0: u - 0.006, u1: u + 0.006, height: maxD * 0.09, sweep: 0.9, shape: 'falcate', side: -1, rays: 3, spineFrac: 0, opacity: 1, flex: 0.2, kind: 'finlet', kindId: 7, K: 2 }); } }
  let caudal = null; if (f.caudal.present) caudal = addCaudal(fb, bm, q.K, q.detail ? clamp(f.caudal.rays, 7, 40) : 7);
  const finGeo = fb.build(); geos.push(finGeo); tris += finGeo.index.count / 3;
  const fins = opts.instanced ? new THREE.InstancedMesh(finGeo, mats.fin, opts.instanced) : new THREE.Mesh(finGeo, mats.fin); fins.frustumCulled = false; fins.renderOrder = 2; group.add(fins); parts.fins = fins;
  if (q.detail && !opts.instanced) {
    if (!bm.oralDisc && !bm.ventralMouth) {
      const jaw = buildJawGeometry(bm); geos.push(jaw.geo); tris += jaw.geo.index.count / 3; bm.pivotX = jaw.pivot.x; uni.uJawPivot.value.set(jaw.pivot.x, jaw.pivot.y); uni.uJawOpenMax.value = bm.law.mouth.construction === 'fused' ? 0 : jaw.openAngle;
      const jawMesh = new THREE.Mesh(jaw.geo, mats.jaw); jawMesh.frustumCulled = false; group.add(jawMesh); parts.jaw = jawMesh;
    } else { bm.pivotX = bm.headX; uni.uJawOpenMax.value = 0; }
    if (g.head.operculum) { const og = buildOperculum(bm); geos.push(og); tris += og.index.count / 3; const om = new THREE.Mesh(og, mats.jaw); om.frustumCulled = false; group.add(om); parts.operculum = om; }
    for (const mesh of [...buildMouthDetails(bm, mats), buildGills(bm, mats), buildNostrils(bm, mats)]) { geos.push(mesh.geometry); group.add(mesh); }
    for (const e of buildEyes(bm, q.eye, mats)) { geos.push(e.geometry); tris += e.geometry.index.count / 3; group.add(e); }
    const teeth = bm.oralDisc || bm.ventralMouth || bm.law.mouth.construction === 'fused' ? null : buildTeeth(bm, mats); if (teeth) { geos.push(teeth.geometry); tris += teeth.geometry.index.count / 3 * teeth.count; group.add(teeth); parts.teeth = teeth; }
    const barb = buildBarbels(bm, mats); if (barb) { geos.push(barb.geometry); tris += barb.geometry.index.count / 3; group.add(barb); if (bm.barbelTip && g.skin.photophores > 0) { const bulb = new THREE.SphereGeometry(Math.max(0.003, 0.012 * bm.L), 8, 6); bulb.translate(bm.barbelTip.x, bm.barbelTip.y, bm.barbelTip.z); geos.push(bulb); const bm2 = new THREE.Mesh(bulb, mats.glow); group.add(bm2); } }
    for (const m of buildSpecials(bm, mats)) { geos.push(m.geometry); tris += m.geometry.index.count / 3 * (m.count || 1); group.add(m); }
  } else { bm.pivotX = bm.headX; }
  if (!q.detail) for (const e of buildEyes(bm, 7, mats)) {
    geos.push(e.geometry);
    const mesh = opts.instanced ? new THREE.InstancedMesh(e.geometry, e.material, opts.instanced) : e;
    mesh.frustumCulled = false; group.add(mesh);
  }
  if (!q.detail && g.head.special !== 'none') for (const source of buildSpecials(bm, mats)) {
    if (source.isInstancedMesh) { source.geometry.dispose(); continue; }
    if (!source.geometry.getAttribute('aBody')) skinAttributes(source.geometry, bm);
    const mesh = opts.instanced ? new THREE.InstancedMesh(source.geometry, mats.body, opts.instanced) : new THREE.Mesh(source.geometry, source.material === mats.glow ? mats.glow : mats.body);
    mesh.frustumCulled = false; geos.push(mesh.geometry); group.add(mesh);
  }
  tris = 0; group.traverse(mesh => { if (mesh.isMesh) tris += (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3 * (mesh.isInstancedMesh && !opts.instanced ? mesh.count : 1); });
  group.rotation.x = g.body.roll * Math.PI / 180;
  const box = new THREE.Box3().setFromObject(group);
  const info = { tris: Math.round(tris), quality: opts.quality || 'hero', anatomy: bm.a.label, caudalAR: caudal ? +caudal.ar.toFixed(2) : 0, caudalSpan: caudal ? caudal.span : 0, finAreas: fb.areas, rays: fb.rays, finBases: fb.bases, attachments: fb.attachments, landmarks3D: landmarks3D(bm), bounds: box, spine: bm.spine, laws: { eye: bm.law.eye, mouth: bm.law.mouth, tail: { family: bm.law.tail.family, T: bm.law.tail.T, keel: bm.law.tail.keel }, flat: bm.law.flat } };
  return { group, uniforms: uni, materials: mats, bm, info, parts, geos, dispose() { geos.forEach(x => x.dispose()); for (const k in mats) { const m = mats[k]; if (m && m.dispose) m.dispose(); } (mats._eyes || []).forEach(m => m.dispose()); } };
}
FG.buildFish = buildFish; FG.BodyModel = BodyModel;
/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 9. SHADERS & MATERIALS (procedural skin, fins, eyes, swim wave)  ║
   ╚══════════════════════════════════════════════════════════════════╝ */
/* ── hyper-real rendering pack (ported from the FishDraw anatomical renderer) ──
   A sqrt-encoded pseudo-HDR equirectangular studio probe. Decoded in the shader as
   c*c*ENV_RANGE so a 8-bit canvas can still carry a 12x softbox highlight: that one
   detail is what turns plastic shading into wet, photographed fish skin.          */
const ENV_RANGE = 12.0;
function makeStudioProbe(W = 1024, H = 512) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
  const box = (dir, rad, soft, L, col) => ({ d: dir.normalize(), rad, soft, L, c: col });
  const lights = [
    box(new THREE.Vector3(0.45, 0.82, 0.60), 0.30, 0.26, ENV_RANGE, [1.0, 0.985, 0.95]),   /* key softbox   */
    box(new THREE.Vector3(-0.62, 0.34, -0.70), 0.55, 0.60, 1.5, [0.72, 0.84, 1.0]),        /* cool fill     */
    box(new THREE.Vector3(0.05, 0.22, -0.98), 0.26, 0.34, 5.0, [0.88, 0.95, 1.0]),         /* rim / kicker  */
    box(new THREE.Vector3(-0.35, 0.55, 0.75), 0.18, 0.30, 2.2, [0.85, 0.93, 1.0])          /* side strip    */
  ];
  const v3 = new THREE.Vector3();
  for (let j = 0; j < H; j++) {
    const phi = (j + .5) / H * Math.PI, sp = Math.sin(phi), y = Math.cos(phi);
    for (let i = 0; i < W; i++) {
      const th = ((i + .5) / W - .5) * TAU; v3.set(Math.cos(th) * sp, y, Math.sin(th) * sp);
      /* sky dome: bright surface above, dark water below, teal band at the waterline */
      const up = clamp(y * .5 + .5, 0, 1);
      let r = lerp(0.045, 0.52, Math.pow(up, 2.1)) + 0.06 * Math.pow(up, 8.0);
      let gg = lerp(0.062, 0.66, Math.pow(up, 1.9)) + 0.08 * Math.pow(up, 8.0);
      let b = lerp(0.085, 0.88, Math.pow(up, 1.7)) + 0.10 * Math.pow(up, 8.0);
      if (y > 0) { /* surface caustic shimmer read by the specular lobe as broken highlights */
        const s = Math.pow(y, 3.0) * (0.5 + 0.5 * Math.sin(th * 9.0 + Math.cos(th * 4.0) * 2.0)) * (0.5 + 0.5 * Math.sin(phi * 26.0));
        r += s * 0.55; gg += s * 0.58; b += s * 0.6;
      }
      for (const L of lights) {
        const a = Math.acos(clamp(v3.dot(L.d), -1, 1)), f = 1 - sstep(L.rad, L.rad + L.soft, a);
        const e = L.L * f * f; r += e * L.c[0]; gg += e * L.c[1]; b += e * L.c[2];
      }
      const k = (j * W + i) * 4;
      d[k] = Math.sqrt(clamp(r / ENV_RANGE, 0, 1)) * 255; d[k + 1] = Math.sqrt(clamp(gg / ENV_RANGE, 0, 1)) * 255; d[k + 2] = Math.sqrt(clamp(b / ENV_RANGE, 0, 1)) * 255; d[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping; tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace; tex.needsUpdate = true; return tex;
}
let _probe = null; const studioProbe = () => (_probe || (_probe = makeStudioProbe()));
/* seamless studio backdrop: a lit sweep behind the subject, like a photographic cyclorama */
let _back = null;
function studioBackdrop() {
  if (_back) return _back;
  const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
  x.fillStyle = '#0a1219'; x.fillRect(0, 0, S, S);
  let g = x.createRadialGradient(S * .5, S * .42, S * .04, S * .5, S * .5, S * .78);
  g.addColorStop(0, '#2b4152'); g.addColorStop(.45, '#17293a'); g.addColorStop(1, '#070d14');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, 'rgba(120,170,205,.16)'); g.addColorStop(.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  const im = x.getImageData(0, 0, S, S), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 7; d[i] += n; d[i + 1] += n; d[i + 2] += n; }   /* film grain kills banding */
  x.putImageData(im, 0, 0);
  _back = new THREE.CanvasTexture(cv); _back.colorSpace = THREE.SRGBColorSpace; return _back;
}
const ENV = { uEnvMap: { value: studioProbe() }, uEnvTint: { value: new THREE.Color(1, 1, 1) }, uEnvInt: { value: 1 }, uWet: { value: 1 }, uTime: { value: 0 }, uLightDir: { value: new THREE.Vector3(0.3, 1, 0.5).normalize() }, uLightCol: { value: new THREE.Color(1, 1, 1) }, uFillDir: { value: new THREE.Vector3(-.5, .35, -.6).normalize() }, uFillCol: { value: new THREE.Color(.19, .23, .27) }, uSkyCol: { value: new THREE.Color(0.5, 0.6, 0.7) }, uGroundCol: { value: new THREE.Color(0.15, 0.15, 0.18) }, uFogCol: { value: new THREE.Color(0.05, 0.3, 0.5) }, uFogDensity: { value: 0 } };
const FLAP = { anguilliform: .15, subcarangiform: .25, carangiform: .2, thunniform: .08, ostraciiform: .35, labriform: .8, rajiform: 0, hippocampiform: .5 };
const GLSL_SWIM = /* glsl */`
uniform float uTime, uCycle, uLen, uHeadX, uFreq, uAmp, uAmpHead, uEnvPow, uWaveK, uFlap, uBreath, uInflate, uJawAngle, uJawProtrude, uPhase, uBurst;
uniform int uMode; uniform vec2 uJawPivot;
#ifdef SCHOOL
attribute float aPhase;
#endif
float fishU(float x){ return clamp((uHeadX - x)/uLen, 0.0, 1.6); }
float waveZ(float u, float ph){ float env = mix(uAmpHead, 1.0, pow(clamp(u,0.0,1.0), uEnvPow)); if(u>1.0) env = 1.0 + (u-1.0)*0.45; return sin(u*uWaveK*6.2831853 - (uCycle+ph)*6.2831853) * uAmp * uLen * env * (1.0+0.25*uBurst); }
vec3 inflateDisp(vec3 p){ if(uInflate<=0.0) return vec3(0.0); float u=fishU(p.x); vec3 d = normalize(vec3(0.0, p.y, p.z)+vec3(0.0,1e-5,0.0)); return d * uInflate * uLen * 0.2 * exp(-pow((u-0.45)/0.28,2.0)); }
float phaseOf(){
#ifdef SCHOOL
  return aPhase;
#else
  return uPhase;
#endif
}
mat4 modelM(){
#ifdef USE_INSTANCING
  return modelMatrix * instanceMatrix;
#else
  return modelMatrix;
#endif
}
void applyWave(inout vec3 p, inout vec3 n, float ph){ float e = 0.01*uLen; float w = waveZ(fishU(p.x), ph); float dzdx = (waveZ(fishU(p.x+e),ph) - waveZ(fishU(p.x-e),ph))/(2.0*e); p.z += w; n = normalize(vec3(n.x - dzdx*n.z, n.y, n.z)); }
`;
const GLSL_COMMON_FS = /* glsl */`
uniform vec3 uLightDir, uLightCol, uFillDir, uFillCol, uSkyCol, uGroundCol, uFogCol; uniform float uFogDensity, uTime;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x), mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<3;i++){ v+=a*vnoise(p); p=p*2.03+vec2(17.1,9.3); a*=0.5; } return v; }
vec3 hsv2rgb(vec3 c){ vec3 p=abs(fract(c.xxx+vec3(0.0,2.0/3.0,1.0/3.0))*6.0-3.0); return c.z*mix(vec3(1.0),clamp(p-1.0,0.0,1.0),c.y); }
float fogAmt(vec3 wp){ float d = length(cameraPosition-wp); return 1.0 - exp(-pow(d*uFogDensity,2.0)); }
uniform sampler2D uEnvMap; uniform vec3 uEnvTint; uniform float uEnvInt, uWet;
#if __VERSION__ >= 300
#define ENVLOD(s,uv,l) textureLod(s,uv,l)
#else
#define ENVLOD(s,uv,l) texture2D(s,uv,l)
#endif
/* sqrt-encoded pseudo-HDR probe: decoding restores a 12x softbox so wet skin can blow out */
vec3 envRad(vec3 d, float lod){
  vec2 uv = vec2(atan(d.z,d.x)*0.1591549+0.5, acos(clamp(d.y,-1.0,1.0))*0.3183099);
  vec3 c = ENVLOD(uEnvMap, uv, lod).rgb; return c*c*12.0*uEnvTint*uEnvInt;
}
vec3 envSpec(vec3 R, float rough){ return envRad(R, sqrt(rough)*7.2); }
vec3 envDiff(vec3 N){ return envRad(N, 8.2)*0.55 + mix(uGroundCol,uSkyCol,N.y*.5+.5)*0.22; }
vec2 envBRDF(float nv, float rough){
  /* Karis analytic approximation of the split-sum environment BRDF */
  vec4 c0=vec4(-1.0,-0.0275,-0.572,0.022), c1=vec4(1.0,0.0425,1.04,-0.04);
  vec4 r=rough*c0+c1; float a=min(r.x*r.x,exp2(-9.28*nv))*r.x+r.y; return vec2(-1.04,1.04)*a+r.zw;
}
float ggxD(float nh, float a2){ float d=nh*nh*(a2-1.0)+1.0; return a2/(3.14159265*d*d); }
/* full PBR skin lobe: GGX sun + split-sum IBL + mucus clearcoat + wrapped subsurface */
vec3 pbrSkin(vec3 albedo, vec3 N, vec3 P, float rough, float metal, float sss, float coat, vec3 sheenCol){
  rough = clamp(rough,0.035,0.98);
  vec3 V=normalize(cameraPosition-P), L=normalize(uLightDir), H=normalize(V+L), FD=normalize(uFillDir);
  float nv=clamp(dot(N,V),1e-3,1.0), nl=max(0.0,dot(N,L)), nh=max(1e-4,dot(N,H)), vh=max(1e-4,dot(V,H));
  vec3 F0=mix(vec3(0.035), albedo, metal);
  vec3 F=F0+(max(vec3(1.0-rough),F0)-F0)*pow(1.0-vh,5.0);
  float a2=pow(rough,4.0), k=pow(rough+1.0,2.0)*0.125;
  float G=(nv/(nv*(1.0-k)+k))*(nl/(nl*(1.0-k)+k));
  vec3 spec=min(vec3(14.0), F*ggxD(nh,a2)*G/max(1e-3,4.0*nv*nl+1e-3));
  float wrap=clamp((dot(N,L)+0.28)/1.28,0.0,1.0);
  float fill=clamp((dot(N,FD)+0.18)/1.18,0.0,1.0);
  vec3 kd=(1.0-F)*(1.0-metal);
  vec3 diff=albedo*(envDiff(N)*0.62 + uLightCol*wrap*0.78 + uFillCol*fill*1.1);
  vec3 R=reflect(-V,N); vec2 ab=envBRDF(nv,rough);
  vec3 ibl=envSpec(R,rough)*(F0*ab.x+ab.y);
  vec3 c=kd*diff + spec*uLightCol*nl*1.7 + ibl;
  /* mucus / epidermal clearcoat: a second, very tight lobe over everything */
  float cr=mix(0.14,0.07,uWet), ca2=pow(cr,4.0);
  float cf=0.04+0.96*pow(1.0-vh,5.0);
  c += min(8.0, ggxD(nh,ca2)*cf*0.25/max(1e-3,4.0*nv*nl+1e-3))*uLightCol*nl*coat*1.5;
  c += envSpec(R,cr)*cf*coat*0.5;
  /* wrapped translucency: light bleeding through thin tissue + back scatter */
  float back=pow(clamp(dot(V,-L)*0.5+0.5,0.0,1.0),3.0);
  c += albedo*sss*(back*0.55+pow(1.0-nv,3.0)*0.35)*(uLightCol*0.6+uSkyCol*0.4);
  /* grazing guanine sheen (iridophore layer seen edge-on) */
  c += sheenCol*pow(1.0-nv,4.5)*0.6;
  return c;
}
vec3 wetLight(vec3 col, vec3 N, vec3 P, float gloss, float sss){
  return pbrSkin(col, N, P, mix(.62,.14,gloss), 0.0, sss*0.5, 0.45, vec3(0.0));
}
`;
