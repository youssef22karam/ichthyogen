/* MOUTH CONSTRUCTOR — one assembly for every creature: upper jaw, lower jaw hinged behind the eye line, a continuous
   lip ring of real thickness, and an interior cavity that TERMINATES in a throat cap with a floor. Special constructions
   (fused plate, underside sucker disc, short tube cap, flattened-plan ventral slot) come from the mouth law only.
   H = { THREE, clamp, lerp, sstep, smoother, TAU, skinAttributes, mergeGeos }. */
import { CAVITY_MAX, DISC_DEPTH_MAX } from './laws.js';

/* mouth-line level in vert = sin(theta) units, identical to the skin shader's crease line */
export function mouthLevel(bm, u, H) {
  const t = H.sstep(bm.jawStartU, bm.mcU, u);
  return H.lerp(bm.tipF, bm.cornerF, t) - .025 * Math.sin(Math.PI * t);
}
/* aperture half-height (vert units) of the opened mouth along the jaw */
export function apertureAt(bm, u, H) {
  const u0 = Math.max(bm.jawStartU, .006), u1 = bm.mcU * .92, tt = H.clamp((u - u0) / Math.max(1e-6, u1 - u0), 0, 1);
  return (.08 + .3 * bm.g.mouth.gape) * Math.pow(Math.sin(Math.PI * tt), .6);
}
const thetaOf = (vert, side) => { const th = Math.asin(Math.max(-.985, Math.min(.985, vert))); return side > 0 ? th : Math.PI - th; };
function skinPoint(bm, u, vert, side, out, lift = 0) {
  const fr = bm._mfr || (bm._mfr = {}), s = bm._ms || (bm._ms = {}), p = bm._mp || (bm._mp = {});
  bm.frame(u, fr); bm.section(u, s); bm.point(u, thetaOf(vert, side), p, fr, s, true);
  const l = Math.hypot(p.ly, p.lz) || 1, off = lift / l;
  out.set(p.x + fr.nx * p.ly * off, p.y + fr.ny * p.ly * off, p.z + p.lz * off); return out;
}
const jawWeight = (bm, u, H) => 1 - H.sstep(Math.max(.004, bm.jawStartU) + (bm.mcU - Math.max(.004, bm.jawStartU)) * .85, bm.mcU, u);

/** Lip ring: two tubes (upper lip static, lower lip hinged with the jaw) following the mouth line from corner to corner. */
export function buildLips(bm, mats, H, M) {
  const { THREE } = H, g = bm.g, u0 = Math.max(bm.jawStartU, .006), u1 = bm.mcU, K = 14, out = [];
  const fused = M.construction === 'fused';
  const r = bm.maxD * (.011 + .02 * g.mouth.lips) * H.clamp(bm.h / .27, .6, 1.4) * (fused ? 1.7 : 1);
  const lipOff = .035 + .03 * g.mouth.lips;
  for (const [sign, lower] of [[1, false], [-1, true]]) {
    const pts = [];
    for (let i = 0; i <= K; i++) { const u = H.lerp(u1, u0, i / K); pts.push(skinPoint(bm, u, mouthLevel(bm, u, H) + sign * lipOff, 1, new THREE.Vector3(), r * .35)); }
    for (let i = 1; i <= K; i++) { const u = H.lerp(u0, u1, i / K); pts.push(skinPoint(bm, u, mouthLevel(bm, u, H) + sign * lipOff, -1, new THREE.Vector3(), r * .35)); }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 2 * K + 4, r, 6, false);
    H.skinAttributes(geo, bm, fused ? 0 : 0, lower && !fused);
    const mesh = new THREE.Mesh(geo, fused ? mats.tooth : lower ? mats.jaw : mats.body); mesh.frustumCulled = false; out.push(mesh);
  }
  return out;
}

/** Interior cavity: a pocket rooted on the aperture outline, closed by a throat cap with a floor. Depth ≤ CAVITY_MAX × head length. */
export function buildCavity(bm, mats, H) {
  const { THREE } = H, g = bm.g, u0 = Math.max(bm.jawStartU, .006), u1 = bm.mcU * .92, um = (u0 + u1) / 2, hs = (u1 - u0) / 2 * .98;
  const Mr = 22, N = 5, depth = Math.min(g.mouth.cavityDepth, CAVITY_MAX) * bm.h * bm.L;
  const pos = [], ab = [], idx = [], rim = [], fr = {};
  const uc = u1; bm.frame(uc, fr);
  const rimC = new THREE.Vector3();
  /* closed outline on the skin: right corner → tip → left corner along the upper lip (lower=false), back along the lower lip */
  for (let j = 0; j < Mr; j++) {
    const phi = j / Mr * H.TAU, lower = phi > Math.PI, lam = lower ? (phi - Math.PI) / Math.PI : phi / Math.PI;
    const side = (lam < .5) === !lower ? 1 : -1, u = u1 - (u1 - u0) * Math.sin(Math.PI * lam), ap = apertureAt(bm, u, H);
    const vert = mouthLevel(bm, u, H) + (lower ? -1 : 1) * ap * 1.04;
    const p = skinPoint(bm, u, vert, side, new THREE.Vector3(), -bm.maxD * .004);
    rim.push({ p, u, phi, lower, lam }); rimC.add(p);
  }
  rimC.multiplyScalar(1 / Mr);
  const throat = rimC.clone().add(new THREE.Vector3(fr.tx * depth, fr.ty * depth, 0));
  { /* the throat cap stays inside the head section at its own station (laterally expanded / thin heads included) */
    const ut = H.clamp(uc + depth / bm.L, .004, .999), ft = {}, st = {}; bm.frame(ut, ft); bm.section(ut, st);
    const ly = H.clamp((throat.x - ft.px) * ft.nx + (throat.y - ft.py) * ft.ny, -st.dDn * .55, st.dUp * .55);
    throat.set(ft.px + ft.nx * ly, ft.py + ft.ny * ly, 0); }
  let v = 0;
  for (let i = 0; i <= N; i++) {
    const d = i / N, e = H.smoother(d), shrink = 1 - .25 * e;
    for (let j = 0; j < Mr; j++) {
      const r = rim[j], q = r.p.clone().lerp(throat, e).sub(throat).multiplyScalar(shrink).add(throat);
      if (i > 0) { /* structural containment: interior vertices never leave the head section at their own station */
        const uq = H.clamp((bm.headX - q.x) / bm.L, .004, .999), fq = {}, sq = {}; bm.frame(uq, fq); bm.section(uq, sq);
        const ly = H.clamp((q.x - fq.px) * fq.nx + (q.y - fq.py) * fq.ny, -sq.dDn * .9, sq.dUp * .9), hw = bm.halfWidthAtY(sq, ly) * .92;
        q.set(fq.px + fq.nx * ly, fq.py + fq.ny * ly, H.clamp(q.z, -hw, hw)); }
      const w = r.lower ? Math.pow(1 - d, 1.4) * jawWeight(bm, r.u, H) * Math.min(1, Math.sin(Math.PI * r.lam) * 1.6 + .2) : 0;
      pos.push(q.x, q.y, q.z); ab.push(r.u, .5, 1, w); v++;
    }
  }
  const centre = v; pos.push(throat.x, throat.y, 0); ab.push(u1, .5, 1, 0);
  for (let i = 0; i < N; i++) for (let j = 0; j < Mr; j++) { const a = i * Mr + j, b = i * Mr + (j + 1) % Mr, c = a + Mr, d = b + Mr; idx.push(a, c, b, b, c, d); }
  for (let j = 0; j < Mr; j++) idx.push(N * Mr + j, centre, N * Mr + (j + 1) % Mr);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); geo.setIndex(idx); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.jaw); mesh.frustumCulled = false; mesh.renderOrder = 1; return [mesh];
}

/** Shallow floored disc with a lip ring: underside sucker (construction 'sucker') or front cap of a short tube ('tube'). */
export function buildDisc(bm, mats, H, M) {
  const { THREE } = H, g = bm.g, front = M.construction === 'tube';
  const u = front ? .006 : bm.h * .3, theta = front ? 0 : -Math.PI / 2, fr = {}, p = {}; bm.frame(u, fr);
  const normal = new THREE.Vector3();
  if (front) normal.set(-fr.tx, -fr.ty, 0).normalize(); else bm.surfaceNormal(u, theta, normal);
  const centre = new THREE.Vector3();
  if (front) centre.set(fr.px, fr.py, 0).addScaledVector(normal, bm.L * .0007); else { bm.rawSurface(u, theta, p); centre.set(p.x, p.y, 0).addScaledVector(normal, bm.L * .0008); }
  const headL = bm.h * bm.L, radius = front ? Math.min(bm.maxD * .07, headL * .12) : Math.min(bm.maxD * .22, headL * .3);
  const depth = Math.min(DISC_DEPTH_MAX * headL * .95, radius * .35) * (front ? .4 : 1);
  const rot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  const lip = new THREE.TorusGeometry(radius, radius * (.2 + g.mouth.lips * .13), 6, 28); lip.applyQuaternion(rot); lip.translate(centre.x, centre.y, centre.z); H.skinAttributes(lip, bm);
  /* floored dish: concave rings sinking to a flat floor at `depth`, never a hole */
  const NR = 6, NA = 24, pos = [], ab = [], idx = [];
  for (let i = 0; i <= NR; i++) { const rr = radius * .92 * (1 - i / NR), z = -depth * (1 - Math.pow(rr / (radius * .92), 2)); for (let j = 0; j < NA; j++) { const a = j / NA * H.TAU; pos.push(Math.cos(a) * rr, Math.sin(a) * rr, z); ab.push(u, .25, 1, 0); } }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) { const a = i * NA + j, b = i * NA + (j + 1) % NA, c = a + NA, d = b + NA; idx.push(a, b, c, b, d, c); }
  const dish = new THREE.BufferGeometry(); dish.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); dish.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); dish.setIndex(idx); dish.computeVertexNormals();
  dish.applyQuaternion(rot); dish.translate(centre.x, centre.y, centre.z);
  const out = [new THREE.Mesh(lip, mats.body), new THREE.Mesh(dish, mats.jaw)];
  if (g.mouth.teeth === 'rasp' && !front) {
    const teeth = [];
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 18; i++) { const a = (i + ring * .5) / 18 * H.TAU, rr = radius * (.7 - ring * .25), geo = new THREE.ConeGeometry(radius * .035, radius * .1, 4); geo.rotateX(Math.PI / 2); geo.translate(Math.cos(a) * rr, Math.sin(a) * rr, -depth * (1 - (rr / radius) ** 2) + radius * .05); geo.applyQuaternion(rot); geo.translate(centre.x, centre.y, centre.z); teeth.push(geo); }
    out.push(new THREE.Mesh(H.mergeGeos(teeth), mats.simple));
  }
  out.forEach(m => { m.frustumCulled = false; }); return out;
}

/** Flattened plan: a shallow curved mouth on the BOTTOM surface (two lip arcs around a dark slot). */
export function buildVentralMouth(bm, mats, H) {
  const { THREE } = H, g = bm.g, u = bm.h * .42, s = {}, fr = {}, p = {}; bm.section(u, s); bm.frame(u, fr);
  const w = s.coreW * .62, r = bm.maxD * (.014 + .012 * g.mouth.lips), K = 16, out = [];
  const bottom = (uu, z, out2, lift) => { bm.frame(uu, fr); bm.section(uu, s); const ct = Math.sign(z) * Math.pow(Math.min(1, Math.abs(z) / Math.max(1e-8, s.w)), s.n / 2); bm.point(uu, -Math.acos(H.clamp(ct, -1, 1)), p, fr, s, true); const l = Math.hypot(p.ly, p.lz) || 1; out2.set(p.x + fr.nx * p.ly / l * lift, p.y + fr.ny * p.ly / l * lift, p.z + p.lz / l * lift); return out2; };
  for (const sign of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= K; i++) { const z = H.lerp(-w, w, i / K), uu = u + .05 * bm.h * (z / w) ** 2 + sign * .02 * bm.h; pts.push(bottom(uu, z, new THREE.Vector3(), r * .3)); }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), K + 4, r, 6, false); H.skinAttributes(geo, bm); const m = new THREE.Mesh(geo, mats.body); m.frustumCulled = false; out.push(m);
  }
  /* slot: a thin dark strip between the lips, closed (a floor), depth ≤ CAVITY_MAX by construction (it lies on the skin) */
  const pos = [], ab = [], idx = [];
  for (let i = 0; i <= K; i++) { const z = H.lerp(-w, w, i / K) * .95; for (const sgn of [-1, 1]) { const uu = u + .05 * bm.h * (z / w) ** 2 + sgn * .009 * bm.h; const q = bottom(uu, z, new THREE.Vector3(), -bm.maxD * .003); pos.push(q.x, q.y, q.z); ab.push(uu, .25, 1, 0); } }
  for (let i = 0; i < K; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const slot = new THREE.BufferGeometry(); slot.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); slot.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); slot.setIndex(idx); slot.computeVertexNormals();
  const sm = new THREE.Mesh(slot, mats.jaw); sm.frustumCulled = false; out.push(sm);
  return out;
}

/** Flattened plan: optional defensive spine on the top of the slender tail (niche flag). */
export function buildTailSpine(bm, mats, H) {
  const { THREE } = H, u = .8, p = {}, n = new THREE.Vector3(), fr = {}; bm.rawSurface(u, Math.PI / 2, p); bm.surfaceNormal(u, Math.PI / 2, n); bm.frame(u, fr);
  const len = bm.L * .09, geo = new THREE.ConeGeometry(bm.maxD * .02, len, 6); geo.translate(0, len * .5, 0);
  const dir = new THREE.Vector3(fr.tx, fr.ty, 0).multiplyScalar(.9).add(n.multiplyScalar(.35)).normalize();
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)); geo.translate(p.x, p.y, p.z);
  const m = new THREE.Mesh(geo, mats.tooth); m.frustumCulled = false; return [m];
}
