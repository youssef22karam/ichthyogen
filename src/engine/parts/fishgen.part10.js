// @@PART js/app.part10.js (10/19) lines 1848-2150 of the original module script -- stripped by build.mjs
function buildJawGeometry(bm) {
  const NJ = 15, M = 16, pos = [], ab = [], idx = [], p = {}, fr = {}, s = {};
  const u0 = Math.max(bm.jawStartU, .006), u1 = bm.mcU;
  bm.frame(u1, fr); bm.section(u1, s);
  const py = bm.mouthLineY(u1, s), pivot = { x: fr.px + fr.nx * py, y: fr.py + fr.ny * py };
  for (let i = 0; i <= NJ; i++) {
    const t = i / NJ, u = lerp(u0, u1, t);
    bm.frame(u, fr); bm.section(u, s);
    const ym = bm.mouthLineY(u, s), yr = ym > 0 ? s.dUp : s.dDn, n = ym > 0 ? s.nD : s.nV;
    const rim = Math.asin(Math.sign(ym) * Math.pow(clamp(Math.abs(ym) / Math.max(yr, 1e-8), 0, .98), n * .5));
    for (let j = 0; j <= M; j++) {
      const a = lerp(-Math.PI - rim, rim, j / M);
      bm.point(u, a, p, fr, s, true);
      const fade = Math.sin(Math.PI * j / M) * Math.sin(Math.PI * t);
      const off = bm.maxD * .004 * fade, length = Math.max(1e-8, Math.hypot(p.ly, p.lz));
      pos.push(p.x + fr.nx * p.ly / length * off, p.y + fr.ny * p.ly / length * off, p.z + p.lz / length * off);
      ab.push(u, ((a + Math.PI / 2) / TAU + 1) % 1, 0, 1 - sstep(.62, 1, t));
    }
  }
  for (let i = 0; i < NJ; i++) for (let j = 0; j < M; j++) {
    const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); geo.setIndex(idx); geo.computeVertexNormals();
  const openAngle = Math.min(.24, Math.atan2(bm.g.mouth.gape * headDepth(bm.g, bm.bp) * bm.L * .42, Math.max(1e-5, (u1 - u0) * bm.L)));
  return { geo, pivot, openAngle };
}
function skinAttributes(geo, bm, tag = 0, jaw = false) {
  const pos = geo.getAttribute('position'), a = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const u = clamp((bm.headX - pos.getX(i)) / bm.L, .003, .999);
    const fr = {}; bm.frame(u, fr); const y = (pos.getX(i) - fr.px) * fr.nx + (pos.getY(i) - fr.py) * fr.ny;
    a[i * 4] = u; a[i * 4 + 1] = ((Math.atan2(y, pos.getZ(i)) + Math.PI / 2) / TAU + 1) % 1;
    a[i * 4 + 2] = tag; a[i * 4 + 3] = jaw ? 1 - sstep(Math.max(.004, bm.jawStartU) + (bm.mcU - Math.max(.004, bm.jawStartU)) * .85, bm.mcU, u) : 0;
  }
  geo.setAttribute('aBody', new THREE.BufferAttribute(a, 4)); return geo;
}
function buildMouthDetails(bm, mats) {
  if (bm.oralDisc) return buildOralDisc(bm, mats);
  if (bm.isManta) return buildMantaMouth(bm, mats);
  return [];
}
function buildMantaMouth(bm, mats) {
  const width = bm.L * .145, height = bm.L * .011;
  const fr = {}; bm.frame(.004, fr);
  const p = [], ab = [], idx = [], N = 28, x = bm.headX + bm.L * .001, y = fr.py - bm.maxD * .085;
  p.push(x, y, 0); ab.push(.012, .18, 6, 0);
  for (let j = 0; j <= N; j++) {
    const angle = TAU * j / N;
    p.push(x, y + height * Math.sin(angle), width * Math.cos(angle));
    ab.push(.012, .18, 6, 0);
    if (j) idx.push(0, j, j + 1);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); geo.setIndex(idx); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.jaw); mesh.frustumCulled = false; return [mesh];
}
function buildOralDisc(bm, mats) {
  const front = bm.a.family === 'jawless' || bm.g.mouth.type === 'tube', fr = {}, p = {};
  const u = front ? .005 : bm.h * .28; bm.frame(u, fr);
  const direction = front ? new THREE.Vector3(-fr.tx, -fr.ty, 0) : new THREE.Vector3(-fr.nx, -fr.ny, 0);
  const center = new THREE.Vector3();
  if (front) center.set(fr.px + bm.L * .0007, fr.py, 0);
  else { bm.rawSurface(u, -Math.PI / 2, p); center.set(p.x, p.y - bm.L * .0008, 0); }
  const radius = bm.maxD * (bm.g.mouth.type === 'tube' ? .065 : bm.a.family === 'jawless' ? .23 : .12);
  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
  const lip = new THREE.TorusGeometry(radius, radius * (.2 + bm.g.mouth.lips * .13), 6, 28); lip.applyQuaternion(rotation); lip.translate(center.x, center.y, center.z); skinAttributes(lip, bm);
  const opening = new THREE.SphereGeometry(radius * .93, 12, 8); opening.scale(1, 1, .23); opening.applyQuaternion(rotation); opening.translate(center.x - direction.x * radius * .02, center.y - direction.y * radius * .02, center.z); skinAttributes(opening, bm, 6);
  const out = [new THREE.Mesh(lip, mats.body), new THREE.Mesh(opening, mats.body)];
  if (bm.g.mouth.teeth === 'rasp') {
    const teeth = [];
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, geo = new THREE.ConeGeometry(radius * .045, radius * .13, 4); geo.rotateX(Math.PI / 2); geo.translate(Math.cos(a) * radius * .66, Math.sin(a) * radius * .66, radius * .13); geo.applyQuaternion(rotation); geo.translate(center.x, center.y, center.z); teeth.push(geo); }
    const mesh = new THREE.Mesh(mergeGeos(teeth), mats.simple); out.push(mesh);
  }
  out.forEach(mesh => { mesh.frustumCulled = false; }); return out;
}
function buildGills(bm, mats) {
  const g = bm.g, a = bm.a, pos = [], ab = [], idx = [], p = {}, q = {}; let nv = 0;
  const slots = g.head.gillSlits || 1;
  for (const side of [-1, 1]) for (let slot = 0; slot < slots; slot++) {
    const isCover = a.gills === 'opercular', pores = a.gills === 'pores', ventral = a.gills === 'ventral';
    const center = isCover ? bm.lm.operculum + .012 : lerp(bm.lm.gillStart, bm.lm.gillEnd, (slot + .5) / slots);
    const N = pores ? 10 : 14, start = nv;
    for (let j = 0; j <= N; j++) {
      const t = j / N;
      let theta = ventral ? -Math.PI / 2 + side * lerp(.06, .24, t) : lerp(-.78, .74, t) * g.head.gillHeight;
      if (!ventral && side < 0) theta = Math.PI - theta;
      const u = center + g.head.gillSlant * bm.h * .055 * Math.sin(Math.PI * t);
      const width = bm.h * (pores ? .018 : .012) * Math.pow(Math.sin(Math.PI * t), .6);
      for (let k = 0; k < 4; k++) {
        const uu = u + (k - 1.5) * width;
        bm.rawSurface(uu, theta, p); bm.frame(uu, q);
        const norm = new THREE.Vector3(); bm.surfaceNormal(uu, theta, norm);
        const lift = bm.maxD * (k === 0 ? .012 : .003);
        pos.push(p.x + norm.x * lift, p.y + norm.y * lift, p.z + norm.z * lift);
        ab.push(uu, ((theta + Math.PI / 2) / TAU + 1) % 1, k === 1 || k === 2 ? 6 : 7, Math.sin(Math.PI * t)); nv++;
      }
    }
    for (let j = 0; j < N; j++) for (let k = 0; k < 3; k++) { const v = start + j * 4 + k; idx.push(v, v + 1, v + 4, v + 1, v + 5, v + 4); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mats.body); m.frustumCulled = false; return m;
}
/* fins: ray grid membranes merged into one geometry */
function triArea(P, a, b, c2) { const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2]; const ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az, vx = P[c2 * 3] - ax, vy = P[c2 * 3 + 1] - ay, vz = P[c2 * 3 + 2] - az; const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx; return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz); }
class FinBuilder {
  constructor() { this.pos = []; this.fin = []; this.fin2 = []; this.skin = []; this.base = []; this.idx = []; this.rays = []; this.areas = {}; this.nv = 0; this.bases = []; this.attachments = []; this.rootNormals = []; }
  add(sp) {
    const R = sp.R, K = sp.K, v0 = this.nv, faceSize = R * (K + 1), b = new THREE.Vector3(), edge = new THREE.Vector3(), root = new THREE.Vector3(), q = new THREE.Vector3(), normal = sp.normal.clone(), tips = []; let area = 0;
    const tri = (i, j, k, side) => {
      const P = this.pos, ax = P[j * 3] - P[i * 3], ay = P[j * 3 + 1] - P[i * 3 + 1], az = P[j * 3 + 2] - P[i * 3 + 2], bx = P[k * 3] - P[i * 3], by = P[k * 3 + 1] - P[i * 3 + 1], bz = P[k * 3 + 2] - P[i * 3 + 2];
      const dot = (ay * bz - az * by) * normal.x + (az * bx - ax * bz) * normal.y + (ax * by - ay * bx) * normal.z;
      this.idx.push(i, dot * side < 0 ? k : j, dot * side < 0 ? j : k);
    };
    for (const side of [1, -1]) for (let i = 0; i < R; i++) {
      const t = i / (R - 1); sp.base(t, b); sp.edge(t, edge); sp.root(t, side, root);
      const u = root.u, ang = ((root.theta + Math.PI / 2) / TAU + 1) % 1;
      if (side === 1) { tips.push(edge.clone()); if (i % 2 === 0) this.rays.push([b.x, b.y, b.z, edge.x, edge.y, edge.z]); }
      const attached = !sp.attached || sp.attached(t);
      if (attached) sp.bm.attachedSurface(u, root.theta, root);
      if (attached) { this.bases.push([root.x, root.y, root.z, sp.kind]); this.attachments.push({ kind: sp.kind, u, theta: root.theta, point: [root.x, root.y, root.z], index: this.nv }); }
      for (let k = 0; k <= K; k++) {
        const s = k / K, collar = 1 - sstep(0, .42 + .16 * sp.blend, s);
        q.copy(b).lerp(edge, s).addScaledVector(root.clone().sub(b), collar);
        const width = sp.thickness * Math.pow(Math.sin(Math.PI * s), 1.2) * (1 - s) * Math.pow(Math.max(0, Math.sin(Math.PI * t)), .45);
        q.addScaledVector(normal, side * width);
        if (k === 0 && attached) {
          const rn = new THREE.Vector3(); sp.bm.surfaceNormal(u, root.theta, rn);
          this.rootNormals.push([this.nv, rn.x, rn.y, rn.z]);
        }
        this.pos.push(q.x, q.y, q.z); this.fin.push(t, s, sp.flex, sp.kindId); this.fin2.push(sp.opacity, sp.memb, sp.spineFrac, sp.physicalR || R);
        this.skin.push(u, ang, sp.solid ? 1 : 0, 0); this.base.push(root.x, root.y, root.z); this.nv++;
      }
    }
    for (let side = 0; side < 2; side++) for (let i = 0; i < R - 1; i++) for (let k = 0; k < K; k++) {
      const a = v0 + side * faceSize + i * (K + 1) + k, bb = a + K + 1;
      tri(a, bb, a + 1, side ? -1 : 1); tri(a + 1, bb, bb + 1, side ? -1 : 1);
      if (!side) area += triArea(this.pos, a, bb, a + 1) + triArea(this.pos, a + 1, bb, bb + 1);
    }
    for (let i = 0; i < R - 1; i++) { const a = v0 + i * (K + 1) + K, b2 = a + K + 1, c2 = a + faceSize, d = b2 + faceSize; this.idx.push(a, c2, b2, b2, c2, d); }
    for (const i of [0, R - 1]) for (let k = 0; k < K; k++) { const a = v0 + i * (K + 1) + k, b2 = a + faceSize; this.idx.push(a, a + 1, b2, a + 1, b2 + 1, b2); }
    this.areas[sp.kind] = (this.areas[sp.kind] || 0) + area; return { tips, area };
  }
  build() { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); geo.setAttribute('aFin', new THREE.Float32BufferAttribute(this.fin, 4)); geo.setAttribute('aFin2', new THREE.Float32BufferAttribute(this.fin2, 4)); geo.setAttribute('aSkin', new THREE.Float32BufferAttribute(this.skin, 4)); geo.setAttribute('aBase', new THREE.Float32BufferAttribute(this.base, 3)); geo.setIndex(this.idx); geo.computeVertexNormals(); const n = geo.getAttribute('normal'); for (const [i, x, y, z] of this.rootNormals) n.setXYZ(i, x, y, z); return geo; }
}
function addRidgeFin(fb, bm, o) {
  const fr = {}, p = {}, fn = SHAPE_FN[o.shape] || SHAPE_FN.lobe, cfg = bm.g.fins[o.cfg || o.kind] || {}, solid = bm.a.solid && o.kind !== 'adipose';
  const apex = cfg.apex || .36, curve = cfg.curvature || .48, rootAngle = bm.a.root * (solid ? 3.0 : 1.3), span = o.u1 - o.u0;
  const foil = ['triangle', 'falcate'].includes(o.shape), memb = o.shape === 'spines' ? (bm.a.family === 'lion' ? .25 : bm.a.family === 'rigid' && o.spineFrac > .8 ? .12 : .68) : 1;
  return fb.add({ bm, kind: o.kind, kindId: o.kindId, R: Math.max(o.rays, o.K > 2 ? 18 : 5), physicalR: o.rays, K: o.K, flex: o.flex, opacity: o.opacity, memb, spineFrac: o.spineFrac, solid,
    blend: cfg.rootBlend || .55, thickness: bm.maxD * bm.a.root * (solid ? .56 : .13), normal: new THREE.Vector3(0, 0, 1),
    base: (t, out) => { bm.surface(lerp(o.u0, o.u1, t), o.side * Math.PI / 2, p); out.set(p.x, p.y, p.z); },
    root: (t, side, out) => { const u = lerp(o.u0, o.u1, t), th = o.side * Math.PI / 2 - side * rootAngle * Math.pow(Math.max(0, Math.sin(Math.PI * t)), .5); bm.surface(u, th, p); out.set(p.x, p.y, p.z); out.u = u; out.theta = th; },
    edge: (t, out) => {
      let eu = lerp(o.u0, o.u1, t), h;
      if (foil) { const v = foilOutline(t, apex, o.sweep, curve, bm.a.freeTip); eu = o.u0 + span * v[0]; h = v[1]; }
      else { h = fn(t, o.spineFrac); eu += Math.sin(Math.PI * t) * o.sweep * Math.min(span * .3, o.height / bm.L * .35); }
      bm.surface(clamp(eu, .005, .999), o.side * Math.PI / 2, p); bm.frame(clamp(eu, .005, 1), fr);
      out.set(p.x + fr.nx * o.side * o.height * h, p.y + fr.ny * o.side * o.height * h, 0);
    } });
}
function addPectoral(fb, bm, side, K, rays) {
  const f = bm.g.fins.pectoral, lm = bm.lm, fr = {}, sec = {}, p = {}, base = new THREE.Vector3(); bm.frame(lm.pectoralBase, fr); bm.section(lm.pectoralBase, sec);
  const disc = bm.a.family === 'ray', foil = bm.a.solid || ['pointed', 'wing'].includes(f.shape), len = f.len * bm.maxD;
  const chord = Math.min(.14 * bm.L, f.baseLen * (sec.dUp + sec.dDn) * (foil ? 1.25 : .48));
  const rootU = t => disc ? lerp(.025, Math.min(.84, lm.peduncleStart - .06), t) : lm.pectoralBase + t * chord / bm.L;
  const th = t => f.v * 1.25 + (disc || foil ? 0 : (.5 - t) * Math.min(f.baseLen, .5) * 1.1);
  const root = (t, skinSide, out) => { const u = rootU(t), a = th(t) + skinSide * bm.a.root * 2 * Math.sin(Math.PI * t), theta = side > 0 ? a : Math.PI - a; bm.surface(u, theta, p); out.set(p.x, p.y, p.z); out.u = u; out.theta = theta; };
  return fb.add({ bm, kind: 'pectoral', kindId: 3, R: Math.max(rays, K > 2 ? 20 : 6), physicalR: rays, K, flex: f.flex, opacity: f.opacity, memb: f.shape === 'filament' ? .3 : bm.a.family === 'lion' ? .8 : 1, spineFrac: 0, solid: bm.a.solid,
    blend: f.rootBlend, thickness: bm.maxD * bm.a.root * (bm.a.solid ? .65 : .13), normal: new THREE.Vector3(0, 1, 0), root,
    base: (t, out) => { const u = rootU(t), theta = side > 0 ? th(t) : Math.PI - th(t); bm.surface(u, theta, p); out.set(p.x, p.y, p.z); },
    edge: (t, out) => {
      const u = rootU(t), theta = side > 0 ? th(t) : Math.PI - th(t); bm.surface(u, theta, p); base.set(p.x, p.y, p.z);
      if (disc) {
        const h = Math.pow(Math.max(0, Math.sin(Math.PI * t)), bm.g.fins.pectoral.shape === 'wing' ? .85 : .58);
        out.copy(base).add(new THREE.Vector3(-len * f.sweep * h * .65, -bm.maxD * .06 * h, side * len * h));
      } else if (foil) {
        const v = foilOutline(t, f.apex, f.sweep, f.curvature, bm.a.freeTip * .7);
        bm.surface(lm.pectoralBase, side > 0 ? f.v * 1.25 : Math.PI - f.v * 1.25, p);
        const posterior = v[0] * chord + len * f.sweep * .8 * v[1];
        out.set(p.x + fr.tx * posterior, p.y + fr.ty * posterior - len * .12 * v[1], p.z + side * len * v[1] * (f.shape === 'wing' ? 1 : .78));
      } else {
        /* radiating ray fan: rays leave a small base at angles from up-and-back (leading, t=0) to down-and-back (trailing) */
        const shp = (PECT_SHAPE[f.shape] || PECT_SHAPE.rounded)(t), psi = lerp(.7, -.95, t) * clamp(f.spread / .6, .65, 1.35);
        const Lt = len * shp * (.62 + .38 * Math.sin(Math.PI * (.1 + .8 * t))) * (.8 + f.sweep * .3);
        const dx = fr.tx * Math.cos(psi) + fr.nx * Math.sin(psi), dy = fr.ty * Math.cos(psi) + fr.ny * Math.sin(psi);
        out.set(base.x + dx * Lt, base.y + dy * Lt - (f.shape === 'limb' ? len * .25 * shp : 0), base.z + side * Lt * .3);
      }
    } });
}
function addPelvic(fb, bm, side, K, rays) {
  const f = bm.g.fins.pelvic, u = bm.lm.pelvicBase, p = {}, fr = {}, fused = f.shape === 'fused', len = f.len * bm.maxD * .55, spread = fused ? .16 : .48;
  bm.frame(u, fr);
  const rootU = t => clamp(u + t * bm.bp.maxD * .12, .02, .94), rootTh = -Math.PI / 2 + side * spread;
  return fb.add({ bm, kind: 'pelvic', kindId: 4, R: Math.max(rays, K > 2 ? 10 : 4), K, flex: f.flex, opacity: f.opacity, memb: f.shape === 'filament' ? .32 : 1, spineFrac: 0, solid: bm.a.solid, blend: .65, thickness: bm.maxD * bm.a.root * .22, normal: new THREE.Vector3(0, 0, side),
    base: (t, out) => { bm.surface(rootU(t), rootTh, p); out.set(p.x, p.y, p.z); },
    root: (t, skinSide, out) => { const uu = rootU(t), theta = rootTh + skinSide * .045 * Math.sin(Math.PI * t); bm.surface(uu, theta, p); out.set(p.x, p.y, p.z); out.u = uu; out.theta = theta; },
    edge: (t, out) => {
      const v = foilOutline(t, .4, .55, .5), h = f.shape === 'filament' ? Math.pow(Math.max(0, Math.sin(Math.PI * t)), 5) : v[1];
      bm.surface(rootU(t), rootTh, p); out.set(p.x + fr.tx * len * .8 * h, p.y - len * (bm.a.solid ? .3 : .68) * h, p.z + side * len * .6 * h);
    } });
}
function addCaudal(fb, bm, K, rays) {
  const f = bm.g.fins.caudal, fr = {}, sec = {}, p = {}; bm.frame(.988, fr); bm.section(.988, sec);
  const F = CAUDAL_SHAPE[f.type] || CAUDAL_SHAPE.forked, span = bm.maxD * f.span, H = span * .5, asym = f.lobeAsym;
  const tailY = t => { const tt = t * 2 - 1; return H * tt * (1 + (tt > 0 ? 1 : -1) * asym * .52); };
  const trailing = t => { const tt = t * 2 - 1; let x = F(Math.abs(tt), f.notch) * (1 + asym * tt * .48); if (bm.a.family === 'lobefin' && f.type === 'diphycercal') x *= 1 + .48 * gaussf(tt / .17); return x; };
  const leading = t => {
    const y = tailY(t), edge = y > 0 ? sec.dUp : sec.dDn, limit = H * (1 + (y > 0 ? 1 : -1) * asym * .52);
    const q = clamp((Math.abs(y) - edge) / Math.max(1e-6, limit - edge), 0, 1);
    return trailing(y > 0 ? 1 : 0) * Math.pow(q, f.type === 'lunate' ? 2.7 : 2.15);
  };
  let coeff = 0; for (let i = 0; i < 100; i++) { const t = (i + .5) / 100; coeff += Math.max(.005, trailing(t) - leading(t)) / 100; }
  const targetChord = span / Math.max(.1, f.aspect * coeff);
  const chord = clamp(targetChord, bm.L * .025, f.len * bm.L * (f.type === 'filamentous' ? 1.5 : 1.3));
  const attached = t => { const y = tailY(t); return y >= -sec.dDn && y <= sec.dUp; };
  const root = (t, skinSide, out) => {
    const y = tailY(t), radius = y > 0 ? sec.dUp : sec.dDn, exp = y > 0 ? sec.nD : sec.nV;
    const th = Math.asin(Math.sign(y) * Math.pow(clamp(Math.abs(y) / Math.max(1e-8, radius), 0, 1), exp / 2));
    const theta = skinSide > 0 ? th : Math.PI - th;
    if (attached(t)) { bm.surface(.988, theta, p); out.set(p.x, p.y, p.z); }
    else { const x = chord * leading(t); out.set(fr.px + fr.tx * x + fr.nx * y, fr.py + fr.ty * x + fr.ny * y, skinSide * bm.maxD * .002 * (1 - Math.abs(t * 2 - 1))); }
    out.u = .988; out.theta = theta;
  };
  const r1 = new THREE.Vector3(), r2 = new THREE.Vector3();
  const res = fb.add({ bm, kind: 'caudal', kindId: 5, R: Math.max(rays | 1, K > 2 ? 31 : 9), K: K > 2 ? K + 1 : K, flex: f.flex, opacity: f.opacity, memb: 1, spineFrac: 0, solid: bm.a.solid, blend: f.rootBlend,
    thickness: bm.maxD * (bm.a.solid ? .02 : .008), normal: new THREE.Vector3(0, 0, 1), root, attached,
    base: (t, out) => { root(t, 1, r1); root(t, -1, r2); out.copy(r1).add(r2).multiplyScalar(.5); },
    edge: (t, out) => {
      const y = tailY(t), x = chord * trailing(t);
      out.set(fr.px + fr.tx * x + fr.nx * y, fr.py + fr.ty * x + fr.ny * y, 0);
    } });
  let lo = Infinity, hi = -Infinity; for (const tp of res.tips) { const yv = (tp.x - fr.px) * fr.nx + (tp.y - fr.py) * fr.ny; lo = Math.min(lo, yv); hi = Math.max(hi, yv); }
  const measured = hi - lo; return { span: measured, area: res.area, ar: res.area > 0 ? measured * measured / res.area : 0 };
}
function mergeGeos(list) {
  const pos = [], nor = [], idx = []; let off = 0;
  for (const g of list) { const p = g.getAttribute('position'), n = g.getAttribute('normal'), ix = g.getIndex(); for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); } if (ix) for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + off); else for (let i = 0; i < p.count; i++) idx.push(i + off); off += p.count; g.dispose(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setIndex(idx); return geo;
}
function buildEyes(bm, seg, mats) {
  const g = bm.g, out = []; if (g.head.eyeSide === 'none') return out; const fr = {}, s = {}; const u = bm.lm.eye; bm.frame(u, fr); bm.section(u, s);
  const y = bm.eyeY; const list = g.head.eyeSide === 'both' ? [[1, y, u], [-1, y, u]] : g.head.eyeSide === 'left' ? [[1, y, u], [1, Math.max(-s.dDn * .5, y - bm.eyeR * 1.9), u + .018]] : [[-1, y, u], [-1, Math.max(-s.dDn * .5, y - bm.eyeR * 1.9), u + .018]];
  for (const [side, yy, uu] of list) {
    bm.frame(uu, fr); bm.section(uu, s);
    const ray = ['ray', 'benthicShark'].includes(bm.a.family), yn = yy > 0 ? s.nD : s.nV, yr = yy > 0 ? s.dUp : s.dDn;
    const th = ray ? Math.acos(clamp(Math.pow(s.coreW * .8 / Math.max(1e-8, s.w), s.n / 2), 0, 1))
      : Math.asin(Math.sign(yy) * Math.pow(clamp(Math.abs(yy) / Math.max(1e-8, yr), 0, .9), yn / 2));
    const theta = side > 0 ? th : Math.PI - th, surface = {}, axis = new THREE.Vector3();
    bm.rawSurface(uu, theta, surface); bm.surfaceNormal(uu, theta, axis);
    axis.add(new THREE.Vector3(-fr.tx * g.head.eyeForward * .16, 0, 0)).normalize();
    const center = new THREE.Vector3(surface.x, surface.y, surface.z).addScaledVector(axis, -bm.eyeR * .53);
    const geo = new THREE.SphereGeometry(bm.eyeR, seg, Math.max(5, Math.round(seg * .65))); geo.scale(1, 1, .8); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis)); geo.translate(center.x, center.y, center.z);
    const m = new THREE.Mesh(geo, mats.eye(axis, bm.eyeR)); m.frustumCulled = false; out.push(m);
    if (seg > 8 && !ray) {
      const pts = [], p = {}, section = {}, frame = {}, radius = bm.eyeR * .75;
      // The orbital edge follows the head surface instead of a floating torus.
      for (let j = 0; j < 32; j++) {
        const a = j / 32 * TAU, eyeU = clamp(uu + Math.cos(a) * radius / bm.L, .009, bm.h * .94);
        bm.frame(eyeU, frame); bm.section(eyeU, section);
        const ly = clamp(yy + Math.sin(a) * radius, -section.dDn * .9, section.dUp * .9), max = ly > 0 ? section.dUp : section.dDn, n = ly > 0 ? section.nD : section.nV;
        const t = Math.asin(Math.sign(ly) * Math.pow(clamp(Math.abs(ly) / Math.max(max, 1e-8), 0, .95), n / 2));
        bm.rawSurface(eyeU, side > 0 ? t : Math.PI - t, p); pts.push(new THREE.Vector3(p.x, p.y, p.z));
      }
      const rim = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), 32, bm.eyeR * .035, 4, true);
      skinAttributes(rim, bm);
      const socket = new THREE.Mesh(rim, mats.body); socket.frustumCulled = false; out.push(socket);
    }
  }
  return out;
}
function buildNostrils(bm, mats) {
  const geos = [], g = bm.g, points = {}, normal = new THREE.Vector3();
  const theta = bm.a.gills === 'lateral' || bm.a.gills === 'ventral' ? -.82 : .23;
  for (const side of [-1, 1]) for (const type of [0, ...(g.head.spiracles ? [1] : [])]) {
    const u = type ? bm.lm.eye + bm.h * .12 : bm.a.gills === 'lateral' ? Math.max(.008, bm.jawStartU * .5) : Math.max(.024, bm.lm.eye * .52), th = side > 0 ? theta + (type ? .4 : 0) : Math.PI - theta - (type ? .4 : 0);
    bm.rawSurface(u, th, points); bm.surfaceNormal(u, th, normal);
    const rad = bm.maxD * (type ? .035 : .021) * (.45 + g.head.nostrils);
    const disk = new THREE.SphereGeometry(rad, 8, 5); disk.scale(.65, .25, 1);
    disk.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal));
    disk.translate(points.x + normal.x * rad * .1, points.y + normal.y * rad * .1, points.z + normal.z * rad * .1);
    geos.push(disk);
  }
  const geo = mergeGeos(geos); skinAttributes(geo, bm, 6); const mesh = new THREE.Mesh(geo, mats.body); mesh.frustumCulled = false; return mesh;
}
function buildTeeth(bm, mats) {
  const g = bm.g, m = g.mouth; if (m.teethCount <= 0 || m.teeth === 'none') return null; const T = TEETH[m.teeth] || TEETH.villiform; const count = Math.min(90, m.teethCount), nUp = Math.ceil(count / 2), nDn = count - nUp, hd = headDepth(g, bm.bp) * bm.L;
  const cone = new THREE.ConeGeometry(1, 1, m.teeth === 'triangular' ? 3 : m.teeth === 'molar' || m.teeth === 'beak' ? 8 : 5, 1); cone.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(cone, mats.tooth, count); const aJaw = new Float32Array(count); const fr = {}, s = {}, M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), D = new THREE.Vector3(); let k = 0;
  const u0 = Math.max(bm.jawStartU, 0.03 * bm.mcU) + 0.03 * bm.mcU, u1 = 0.92 * bm.mcU;
  for (const [n, lower] of [[nUp, 0], [nDn, 1]]) { const nn = Math.max(1, Math.ceil(n / 2)); for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1, frac = (Math.floor(i / 2) + 0.5) / nn, u = lerp(u0, u1, frac); bm.frame(u, fr); bm.section(u, s); const ym = bm.mouthLineY(u, s), zr = bm.halfWidthAtY(s, ym) * 0.85; const len = T.len * hd * (m.teeth === 'fang' ? 1.4 - 0.8 * frac : 1), rad = T.r * hd;
    const y = ym + (lower ? -.12 : .12) * len, x = fr.px + fr.nx * y; P.set(x, fr.py + fr.ny * y, side * zr); D.set(fr.nx - .12, fr.ny, -side * .12).normalize().multiplyScalar(lower ? 1 : -1); Q.setFromUnitVectors(up, D); Sc.set(rad, len, m.teeth === 'triangular' ? rad * .18 : rad); M.compose(P, Q, Sc); inst.setMatrixAt(k, M); aJaw[k] = lower * (1 - sstep(Math.max(.004, bm.jawStartU) + (bm.mcU - Math.max(.004, bm.jawStartU)) * .85, bm.mcU, u)); k++; } }
  cone.setAttribute('aJaw', new THREE.InstancedBufferAttribute(aJaw, 1)); inst.frustumCulled = false; inst.instanceMatrix.needsUpdate = true; return inst;
}
function buildBarbels(bm, mats) {
  const g = bm.g, n = g.head.barbels; if (!n) return null; const len = g.head.barbelLen * bm.h * bm.L, fr = {}, s = {}, geos = [], r = Math.max(0.0008, bm.maxD * 0.012);
  const spots = []; const mc = bm.mcU; bm.frame(mc, fr); bm.section(mc, s); const ym = bm.mouthLineY(mc, s), zr = bm.halfWidthAtY(s, ym);
  if (n % 2) spots.push([mc * 0.8, -s.dDn * 0.9, 0, 0, -1.2]);
  const pairs = Math.floor(n / 2); const defs = [[mc, ym - 0.02 * bm.maxD, zr * 0.95, 0.5, -0.6], [mc * 0.55, -s.dDn * 0.9, zr * 0.45, 0.2, -1.2], [bm.h * 0.15, s.dUp * 0.45, zr * 0.6, 0.8, 0.3], [mc * 0.75, -s.dDn * 0.9, zr * 0.8, 0.1, -1.3]];
  for (let i = 0; i < pairs && i < defs.length; i++) { const d = defs[i]; spots.push([d[0], d[1], d[2], d[3], d[4]]); spots.push([d[0], d[1], -d[2], d[3], d[4]]); }
  for (const [u, ly, lz, fwd, dn] of spots) { bm.frame(u, fr); const p0 = new THREE.Vector3(fr.px + fr.nx * ly, fr.py + fr.ny * ly, lz); const dir = new THREE.Vector3(-fr.tx * fwd + fr.tx * (1 - fwd) * 0.6, dn * 0.5, Math.sign(lz) * 0.5).normalize();
    const p1 = p0.clone().addScaledVector(dir, len * 0.45).add(new THREE.Vector3(0, -len * 0.1, 0)), p2 = p0.clone().addScaledVector(dir, len * 0.9).add(new THREE.Vector3(len * 0.1, -len * 0.35, 0));
    geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p1, p2]), 6, r, 4, false)); if (geos.length === 1) bm.barbelTip = p2; }
  const mesh = new THREE.Mesh(mergeGeos(geos), mats.simple); mesh.frustumCulled = false; return mesh;
}
