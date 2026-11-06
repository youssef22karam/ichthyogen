function makeUniforms(g, bm) {
  const lm = bm.lm, s = g.skin;
  /* where the eye sits in (u, circumferential-vertical) skin space, so the fragment shader can
     build an orbital rim, a sunken socket and periorbital pigment that actually line up with it */
  const es = bm.section(lm.eye, {}), yy = bm.eyeY;
  const yr = Math.max(1e-8, yy > 0 ? es.dUp : es.dDn), yn = yy > 0 ? es.nD : es.nV;
  const eyeVert = g.head.eyeSide === 'none' ? 0 : Math.sign(yy || 1) * Math.pow(clamp(Math.abs(yy) / yr, 0, .9), yn / 2);
  const eyeRU = g.head.eyeSide === 'none' ? 0 : bm.eyeR / Math.max(1e-6, bm.L);
  const eyeRV = g.head.eyeSide === 'none' ? 0 : clamp(bm.eyeR / Math.max(1e-6, (es.dUp + es.dDn) * .5), .02, .9);
  const silver = clamp(s.iridescence * .8 + (1 - s.base[1]) * .5 * (s.scale === 'bare' || s.scale === 'denticle' ? .2 : 1), 0, .92);
  return Object.assign({}, ENV, {
    uSilver: { value: silver }, uEyeU: { value: lm.eye }, uEyeVert: { value: eyeVert }, uEyeRU: { value: eyeRU }, uEyeRV: { value: eyeRV },
    uLen: { value: bm.L }, uHeadX: { value: bm.headX }, uFreq: { value: g.swim.freq }, uAmp: { value: g.swim.amp }, uAmpHead: { value: g.swim.ampHead }, uEnvPow: { value: g.swim.envPow }, uWaveK: { value: g.swim.waveK }, uMode: { value: Math.max(0, SWIM_MODES.indexOf(g.swim.mode)) }, uFlap: { value: FLAP[g.swim.mode] || 0.2 },
    uCycle: { value: 0 }, uFlat: { value: g.body.roll === 0 ? 0 : 1 }, uRay: { value: bm.a.family === 'ray' ? 1 : 0 }, uManta: { value: bm.ventralMouth ? 1 : 0 }, uGape: { value: g.mouth.gape }, uDetail: { value: 1 }, uCartilage: { value: bm.a.gills === 'lateral' ? 1 : 0 },
    uBreath: { value: 0 }, uInflate: { value: 0 }, uJawAngle: { value: 0 }, uJawPivot: { value: new THREE.Vector2(bm.headX, 0) }, uJawOpenMax: { value: 0.3 }, uJawProtrude: { value: 0 }, uPhase: { value: 0 }, uBurst: { value: 0 },
    uBase: { value: hslCol(s.base) }, uBelly: { value: hslCol(s.belly) }, uAccent: { value: hslCol(s.accent) }, uFinCol: { value: hslCol(s.fin) }, uEyeCol: { value: hslCol(s.eye) }, uGlow: { value: hslCol(s.glow) }, uBand: { value: s.band }, uBandCol: { value: hslCol(s.bandColor) },
    uPattern: { value: Math.max(0, SCHEMA['skin.pattern'].opts.indexOf(s.pattern)) }, uPatScale: { value: s.patternScale }, uPatStrength: { value: s.patternStrength }, uScale: { value: Math.max(0, SCHEMA['skin.scale'].opts.indexOf(s.scale)) }, uScaleSize: { value: s.scaleSize },
    uCounter: { value: s.countershade }, uIrid: { value: s.iridescence }, uGloss: { value: s.gloss }, uPhoto: { value: s.photophores }, uTrans: { value: s.translucency }, uSlits: { value: g.head.gillSlits }, uHeadU: { value: lm.operculum }, uPreU: { value: lm.preopercle }, uMouthU: { value: lm.mouthCorner },
    uLateral: { value: s.lateralLine }, uLips: { value: g.mouth.lips }, uNostrils: { value: g.head.nostrils }, uMouthStart: { value: bm.jawStartU }, uMouthTipF: { value: bm.tipF }, uMouthCornerF: { value: bm.cornerF }, uElectric: { value: s.electric ? 1 : 0 }, uSeed: { value: (cyrb128(String(g.meta.surfaceSeed || g.meta.seed))[0] % 1000) / 37 }, uFineness: { value: g.body.fineness }, uColor: { value: hslCol([s.base[0], s.base[1] * 0.6, s.base[2] * 0.75]) }, uSacc: { value: new THREE.Vector2() }, uPupil: { value: 0 }
  });
}
function makeMaterials(g, uni, school) {
  const defs = school ? { SCHOOL: 1 } : {}; const mats = { _eyes: [] };
  mats.body = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VS_BODY, fragmentShader: FS_BODY, defines: Object.assign({}, defs), transparent: g.skin.translucency > 0.05, side: THREE.FrontSide });
  mats.jaw = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VS_BODY, fragmentShader: FS_BODY, defines: Object.assign({ JAW: 1 }, defs), transparent: g.skin.translucency > 0.05, side: THREE.DoubleSide });
  mats.fin = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VS_FIN, fragmentShader: FS_FIN, defines: Object.assign({}, defs), transparent: !anatomyProfile(g).solid, depthWrite: true, side: THREE.DoubleSide, forceSinglePass: true });
  mats.eye = (axis, rad, pupilShape) => { const m = new THREE.ShaderMaterial({ uniforms: Object.assign({}, uni, { uAxis: { value: axis }, uEyeRad: { value: rad || 0.01 }, uPupilShape: { value: pupilShape || 0 } }), vertexShader: VS_EYE, fragmentShader: FS_EYE, defines: Object.assign({}, defs) }); mats._eyes.push(m); return m; };
  mats.simple = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VS_SIMPLE, fragmentShader: FS_SIMPLE });
  mats.tooth = new THREE.ShaderMaterial({ uniforms: Object.assign({}, uni, { uColor: { value: new THREE.Color(0.93, 0.9, 0.82) } }), vertexShader: VS_SIMPLE, fragmentShader: FS_SIMPLE, defines: { TEETH: 1 } });
  mats.glow = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VS_SIMPLE, fragmentShader: FS_GLOW });
  return mats;
}
/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 10. SCENE, ENVIRONMENT, SCHOOL, ANIMATION, ADAPTIVE QUALITY      ║
   ╚══════════════════════════════════════════════════════════════════╝ */
const FS_POST = s => s.replace(/\}\s*$/, '\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}');
const _origMakeMaterials = makeMaterials;
makeMaterials = function (g, uni, school) { const m = _origMakeMaterials(g, uni, school); for (const k of ['body', 'jaw', 'fin', 'simple', 'tooth', 'glow']) m[k].fragmentShader = FS_POST(m[k].fragmentShader); const ef = m.eye; m.eye = axis => { const mm = ef(axis); mm.fragmentShader = FS_POST(mm.fragmentShader); return mm; }; return m; };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 1000);
const TIERS = [{ pr: 2, school: 64, particles: 400, shafts: true }, { pr: 1.5, school: 40, particles: 240, shafts: true }, { pr: 1, school: 24, particles: 120, shafts: false }, { pr: 0.75, school: 12, particles: 0, shafts: false }];
const App = { fish: null, genome: null, history: [], mode: 'studio', school: null, schoolOn: false, env: null, tier: isMobile ? 1 : 0, fpsEma: 60, lowT: 0, highT: 0, debug: { wire: false, skeleton: false, landmarks: false }, inflateTarget: 0, paused: false, contextLost: false, clock: 0, state: { nextBurst: 4, burst: 0, saccT: 0, saccTarget: new THREE.Vector2() }, es: 1, helpers: [], dirty: false };
const GOD = { enabled: false, strength: .55, baseline: null, axes: {}, editing: false, timer: 0 };
let renderer, scene, camera, controls, lights = {};
function initScene() {
  const canvas = document.getElementById('gl');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
    App.shaderFailed = true;
    showError(new Error('Shader compilation failed\n' + gl.getProgramInfoLog(program) + '\n' + gl.getShaderInfoLog(vertex) + '\n' + gl.getShaderInfoLog(fragment)));
  };
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  applyTier(); renderer.setSize(innerWidth, innerHeight, false);
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.01, 500); camera.position.set(1, 0.4, 2.5);
  controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = true; controls.screenSpacePanning = true; controls.autoRotate = false;
  lights.hemi = new THREE.HemisphereLight(0x88aacc, 0x223322, 0.8); lights.dir = new THREE.DirectionalLight(0xffffff, 1.6); lights.dir.position.set(2, 6, 3); lights.fill = new THREE.DirectionalLight(0xaaccff, 0.4); lights.fill.position.set(-3, 1, -2); scene.add(lights.hemi, lights.dir, lights.fill);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); App.contextLost = true; toast('WebGL context lost. Waiting to recover.'); }, false);
  canvas.addEventListener('webglcontextrestored', () => { App.contextLost = false; App.shaderFailed = false; toast('WebGL context restored'); try { rebuildAll(); } catch (e) { showError(e); } }, false);
  canvas.addEventListener('pointerdown', () => { App.cameraTween = null; controls.enableDamping = true; });
  addEventListener('resize', onResize); onResize();
}
function onResize() { if (!renderer) return; const width = innerWidth - (typeof currentTab !== 'undefined' && currentTab && innerWidth >= 1000 ? 420 : 0); renderer.setSize(width, innerHeight, false); $('gl').style.width = width + 'px'; camera.aspect = width / innerHeight; camera.updateProjectionMatrix(); }
function applyTier() {
  const t = TIERS[App.tier]; if (renderer) renderer.setPixelRatio(Math.min(devicePixelRatio || 1, t.pr));
  if (App.env) { if (App.env.shafts) App.env.shafts.visible = t.shafts && App.mode === 'habitat'; if (App.env.particles) { App.env.particles.visible = t.particles > 0 && App.mode === 'habitat'; App.env.particles.geometry.setDrawRange(0, t.particles); } }
  if (App.school) App.school.setCount(t.school);
  const target = App.tier >= 2 ? 'med' : 'hero';
  if (App.fish && App.fish.info.quality !== target && !App.qualityPending) { App.qualityPending = true; setTimeout(() => { App.qualityPending = false; if (App.genome && !App.contextLost) setFish(App.genome, { noHistory: true, keepCamera: true, skipPanel: true }); }, 0); }
}
function adaptQuality(dt, fps) { App.fpsEma = lerp(App.fpsEma, fps, 0.08); if (App.fpsEma < 42) { App.lowT += dt; App.highT = 0; if (App.lowT > 2 && App.tier < TIERS.length - 1) { App.tier++; App.lowT = 0; applyTier(); toast('Lowered detail (tier ' + App.tier + ') to keep 60 fps'); } } else if (App.fpsEma > 57) { App.highT += dt; App.lowT = 0; if (App.highT > 10 && App.tier > (isMobile ? 1 : 0)) { App.tier--; App.highT = 0; applyTier(); } } else { App.lowT = Math.max(0, App.lowT - dt); } }
/* ── environment ── */
const FS_FLOOR = GLSL_COMMON_FS + /* glsl */`
uniform vec3 uColor; uniform float uCaustic, uScale; varying vec3 vWP; varying vec2 vUv;
void main(){ vec2 p = vWP.xz/uScale; float n = fbm(p*0.8); vec3 col = uColor*(0.75+0.5*n);
  float t = uTime*0.25; float c1 = vnoise(p*6.0+vec2(t,t*0.7)), c2 = vnoise(p*6.3-vec2(t*0.8,t*0.5)); float caus = pow(max(0.0,1.0-abs(c1-c2)*3.0),4.0)*uCaustic;
  col += uLightCol*caus*0.6*(0.6+0.4*n); vec3 c = col*(mix(uGroundCol,uSkyCol,0.6)*0.8+uLightCol*0.6); float fog = fogAmt(vWP); c = mix(c,uFogCol,fog); gl_FragColor = vec4(c,1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const VS_FLOOR = /* glsl */`varying vec3 vWP; varying vec2 vUv; void main(){ vUv = uv; vec4 wp = modelMatrix*vec4(position,1.0); vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`;
const VS_PART = /* glsl */`uniform float uTime, uScale, uSize; attribute float aSeed; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y + uTime*0.02*uScale*(0.5+aSeed), 12.0*uScale) - 6.0*uScale; p.x += sin(uTime*0.3+aSeed*6.28)*0.2*uScale; vec4 mv = modelViewMatrix*vec4(p,1.0); gl_PointSize = uSize*(0.5+aSeed) / max(0.1,-mv.z) ; vA = 0.4+0.6*aSeed; gl_Position = projectionMatrix*mv; }`;
const FS_PART = /* glsl */`uniform vec3 uFogCol; varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = (1.0-smoothstep(0.2,0.5,d))*0.5*vA; gl_FragColor = vec4(mix(uFogCol, vec3(1.0), 0.6), a); }`;
const FS_SHAFT = /* glsl */`uniform float uI; varying vec2 vUv; void main(){ float a = (1.0-smoothstep(0.0,1.0,abs(vUv.x*2.0-1.0)))*(1.0-vUv.y)*(vUv.y)*uI; gl_FragColor = vec4(vec3(1.0,0.97,0.85), a*0.35); }`;
const VS_SHAFT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
function disposeObject(o) { o.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) { const ms = Array.isArray(c.material) ? c.material : [c.material]; ms.forEach(m => m.dispose()); } }); }
function propMaterial(color, emissive) { return new THREE.MeshLambertMaterial({ color, emissive: emissive || 0x000000, emissiveIntensity: emissive ? 1.2 : 0 }); }
function makeProp(type, rng, es) {
  const g = new THREE.Group(); const sc = es * rng.range(0.6, 1.4);
  const jitter = geo => { const p = geo.getAttribute('position'); for (let i = 0; i < p.count; i++) { const k = 1 + (rng.next() - 0.5) * 0.35; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } geo.computeVertexNormals(); return geo; };
  switch (type) {
    case 'rock': case 'boulder': { const m = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(sc * (type === 'boulder' ? 0.9 : 0.5), 1)), propMaterial(new THREE.Color().setHSL(rng.range(0.05, 0.12), 0.2, rng.range(0.2, 0.35)))); m.scale.y = rng.range(0.5, 0.8); g.add(m); break; }
    case 'coral': { const n = rng.int(3, 6); for (let i = 0; i < n; i++) { const h = sc * rng.range(0.3, 0.9); const m = new THREE.Mesh(rng.chance(0.5) ? new THREE.ConeGeometry(sc * 0.12, h, 6) : new THREE.SphereGeometry(sc * rng.range(0.12, 0.25), 7, 6), propMaterial(new THREE.Color().setHSL(rng.pick([0.95, 0.05, 0.12, 0.8, 0.5]), 0.7, 0.5))); m.position.set((rng.next() - 0.5) * sc * 0.6, h * 0.4, (rng.next() - 0.5) * sc * 0.6); g.add(m); } break; }
    case 'fan': case 'sponge': { const m = new THREE.Mesh(type === 'fan' ? new THREE.CylinderGeometry(sc * 0.45, sc * 0.1, sc * 0.9, 8, 1, false) : new THREE.CylinderGeometry(sc * 0.15, sc * 0.2, sc * 0.8, 8, 1, true), propMaterial(new THREE.Color().setHSL(type === 'fan' ? 0.95 : 0.78, 0.6, 0.45))); if (type === 'fan') m.scale.z = 0.08; m.position.y = sc * 0.4; g.add(m); break; }
    case 'kelp': { const n = rng.int(2, 4); for (let i = 0; i < n; i++) { const h = es * rng.range(6, 12); const m = new THREE.Mesh(new THREE.CylinderGeometry(es * 0.03, es * 0.06, h, 5), propMaterial(new THREE.Color().setHSL(0.17, 0.5, 0.22))); m.position.set((rng.next() - 0.5) * es, h / 2, (rng.next() - 0.5) * es); m.rotation.z = (rng.next() - 0.5) * 0.25; m.rotation.x = (rng.next() - 0.5) * 0.25; g.add(m); const b = new THREE.Mesh(new THREE.PlaneGeometry(es * 0.5, h * 0.8), new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(0.16, 0.5, 0.25), side: THREE.DoubleSide })); b.position.copy(m.position); b.rotation.y = rng.next() * Math.PI; g.add(b); } break; }
    case 'weed': case 'grass': case 'leaf': { const n = rng.int(6, 14); for (let i = 0; i < n; i++) { const h = es * (type === 'leaf' ? 0.25 : rng.range(0.8, 1.8)); const m = new THREE.Mesh(new THREE.PlaneGeometry(es * 0.08, h), new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(type === 'leaf' ? 0.08 : rng.range(0.2, 0.3), 0.5, type === 'leaf' ? 0.25 : 0.3), side: THREE.DoubleSide })); m.position.set((rng.next() - 0.5) * es * 1.5, type === 'leaf' ? 0.01 : h / 2, (rng.next() - 0.5) * es * 1.5); m.rotation.y = rng.next() * Math.PI; if (type === 'leaf') m.rotation.x = -Math.PI / 2; else m.rotation.z = (rng.next() - 0.5) * 0.4; g.add(m); } break; }
    case 'root': { const n = rng.int(3, 6); for (let i = 0; i < n; i++) { const h = es * rng.range(4, 7); const m = new THREE.Mesh(new THREE.CylinderGeometry(es * 0.06, es * 0.12, h, 6), propMaterial(0x4a3524)); m.position.set((rng.next() - 0.5) * es * 2, h / 2, (rng.next() - 0.5) * es * 2); m.rotation.z = (rng.next() - 0.5) * 0.5; m.rotation.x = (rng.next() - 0.5) * 0.5; g.add(m); } break; }
    case 'wood': { const m = new THREE.Mesh(new THREE.CylinderGeometry(es * 0.15, es * 0.2, es * 4, 7), propMaterial(0x5a4030)); m.rotation.z = Math.PI / 2 + (rng.next() - 0.5) * 0.3; m.rotation.y = rng.next() * Math.PI; m.position.y = es * 0.15; g.add(m); break; }
    case 'ice': { const m = new THREE.Mesh(new THREE.BoxGeometry(sc * 2, sc * 0.8, sc * 2), new THREE.MeshLambertMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.8 })); m.position.y = es * 7; m.rotation.y = rng.next(); g.add(m); break; }
    case 'vent': { const m = new THREE.Mesh(new THREE.ConeGeometry(sc * 0.6, sc * 1.6, 7), propMaterial(0x332a28)); m.position.y = sc * 0.8; g.add(m); const t = new THREE.Mesh(new THREE.SphereGeometry(sc * 0.15, 6, 5), propMaterial(0x442200, 0xff6622)); t.position.y = sc * 1.6; g.add(t); break; }
    case 'stalagmite': { const n = rng.int(2, 4); for (let i = 0; i < n; i++) { const h = sc * rng.range(0.8, 2.5); const m = new THREE.Mesh(new THREE.ConeGeometry(sc * 0.2, h, 6), propMaterial(0x8a8070)); m.position.set((rng.next() - 0.5) * sc, h / 2, (rng.next() - 0.5) * sc); g.add(m); } break; }
    case 'lava': { const m = new THREE.Mesh(new THREE.CircleGeometry(sc * 1.2, 10), propMaterial(0x441100, 0xff5500)); m.rotation.x = -Math.PI / 2; m.position.y = 0.02 * es; g.add(m); break; }
    case 'crystal': { const n = rng.int(2, 5); for (let i = 0; i < n; i++) { const h = sc * rng.range(0.5, 1.6); const m = new THREE.Mesh(new THREE.OctahedronGeometry(sc * 0.2, 0), new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(rng.range(0.7, 0.9), 0.7, 0.6), emissive: new THREE.Color().setHSL(rng.range(0.7, 0.9), 0.8, 0.3), transparent: true, opacity: 0.85 })); m.scale.y = h / (sc * 0.4); m.position.set((rng.next() - 0.5) * sc, h / 2, (rng.next() - 0.5) * sc); m.rotation.z = (rng.next() - 0.5) * 0.5; g.add(m); } break; }
    case 'cloud': { const n = rng.int(3, 6); for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(sc * rng.range(0.6, 1.4), 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })); m.position.set((rng.next() - 0.5) * sc * 3, (rng.next() - 0.5) * sc + es * rng.range(-6, 6), (rng.next() - 0.5) * sc * 2); g.add(m); } break; }
    case 'star': { const n = 200, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const r = es * 60; const th = rng.next() * TAU, ph = Math.acos(2 * rng.next() - 1); pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: es * 0.3, sizeAttenuation: true }))); break; }
  }
  return g;
}
function buildEnvironment(hab, L) {
  if (App.env) { scene.remove(App.env.group); disposeObject(App.env.group); App.env = null; }
  const es = App.es = Math.max(0.05, L) * 2.2; const rng = new RNG('env:' + hab.id); const group = new THREE.Group(); const env = { group, hab };
  const water = new THREE.Color(hab.water[0], hab.water[1], hab.water[2]);
  if (hab.floor) { const geo = new THREE.PlaneGeometry(60 * es, 60 * es, 40, 40); const p = geo.getAttribute('position'); for (let i = 0; i < p.count; i++) p.setZ(i, (Math.sin(p.getX(i) * 0.7 / es) + Math.cos(p.getY(i) * 0.5 / es)) * 0.15 * es + (rng.next() - 0.5) * 0.1 * es); geo.computeVertexNormals(); geo.rotateX(-Math.PI / 2);
    const sand = new THREE.Color().setHSL(hab.pal.h[0][0] / 360, 0.25, hab.id === 'lavaLake' ? 0.08 : hab.light < 0.1 ? 0.12 : 0.4);
    const mat = new THREE.ShaderMaterial({ uniforms: Object.assign({}, ENV, { uColor: { value: sand }, uCaustic: { value: hab.light > 0.4 && !reducedMotion ? 1 : 0 }, uScale: { value: es } }), vertexShader: VS_FLOOR, fragmentShader: FS_FLOOR });
    env.floor = new THREE.Mesh(geo, mat); env.floor.position.y = -1.6 * es; group.add(env.floor);
    const props = hab.props.filter(p => p !== 'star' && p !== 'cloud'); for (let i = 0; i < 26 && props.length; i++) { const pr = makeProp(rng.pick(props), rng, es); const a = rng.next() * TAU, r = es * rng.range(3.5, 20); pr.position.set(Math.cos(a) * r, -1.55 * es, Math.sin(a) * r); pr.rotation.y = rng.next() * TAU; group.add(pr); } }
  for (const t of hab.props.filter(p => p === 'star' || p === 'cloud')) { const n = t === 'star' ? 1 : 10; for (let i = 0; i < n; i++) { const pr = makeProp(t, rng, es); const a = rng.next() * TAU, r = es * rng.range(6, 24); pr.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); group.add(pr); } }
  { const n = 400, pos = new Float32Array(n * 3), seed = new Float32Array(n); for (let i = 0; i < n; i++) { pos[i * 3] = (rng.next() - 0.5) * 14 * es; pos[i * 3 + 1] = (rng.next() - 0.5) * 12 * es; pos[i * 3 + 2] = (rng.next() - 0.5) * 14 * es; seed[i] = rng.next(); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    env.particles = new THREE.Points(geo, new THREE.ShaderMaterial({ uniforms: { uTime: ENV.uTime, uScale: { value: es }, uSize: { value: 5 * es * renderer.getPixelRatio() }, uFogCol: ENV.uFogCol }, vertexShader: VS_PART, fragmentShader: FS_PART, transparent: true, depthWrite: false })); env.particles.frustumCulled = false; group.add(env.particles); }
  if (hab.light > 0.3) { env.shafts = new THREE.Group(); for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(es * rng.range(1, 2.5), es * 14), new THREE.ShaderMaterial({ uniforms: { uI: { value: hab.light * 0.8 } }, vertexShader: VS_SHAFT, fragmentShader: FS_SHAFT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); const a = rng.next() * TAU, r = es * rng.range(2, 9); m.position.set(Math.cos(a) * r, es * 3, Math.sin(a) * r); m.rotation.z = (rng.next() - 0.5) * 0.3; env.shafts.add(m); } group.add(env.shafts); }
  scene.add(group); App.env = env; applyTier(); applyMode();
}
function applyMode() {
  const hab = App.env ? App.env.hab : HABITATS.coralReef, es = App.es, studio = App.mode === 'studio';
  if (App.env) { App.env.group.visible = !studio; }
  if (studio) { scene.background = studioBackdrop(); scene.fog = null; ENV.uFogDensity.value = 0; ENV.uLightDir.value.set(0.45, 0.8, 0.6).normalize(); ENV.uLightCol.value.setRGB(1.05, 1.03, 1); ENV.uSkyCol.value.setRGB(0.62, 0.66, 0.72); ENV.uGroundCol.value.setRGB(0.22, 0.21, 0.22); ENV.uFogCol.value.setRGB(0.11, 0.15, 0.2); lights.hemi.color.set(0x9fb3c8); lights.hemi.groundColor.set(0x3a3a3a); lights.dir.intensity = 1.6; }
  else { const w = new THREE.Color(hab.water[0], hab.water[1], hab.water[2]); scene.background = w; scene.fog = new THREE.FogExp2(w, hab.fog / es); ENV.uFogDensity.value = hab.fog / es; ENV.uFogCol.value.copy(w);
    const l = hab.light; ENV.uLightDir.value.set(0.25, 1, 0.35).normalize(); ENV.uLightCol.value.setRGB(0.3 + l * 0.9, 0.35 + l * 0.85, 0.45 + l * 0.7); ENV.uSkyCol.value.setRGB(w.r * 1.6 + 0.25 * l, w.g * 1.6 + 0.3 * l, w.b * 1.6 + 0.35 * l); ENV.uGroundCol.value.setRGB(0.05 + w.r * 0.6, 0.05 + w.g * 0.6, 0.05 + w.b * 0.6);
    if (hab.id === 'lavaLake') { ENV.uLightDir.value.set(0.1, -1, 0.3).normalize(); ENV.uLightCol.value.setRGB(1.3, 0.45, 0.1); ENV.uGroundCol.value.setRGB(0.8, 0.25, 0.05); }
    if (hab.id === 'void' || hab.id === 'abyssal' || hab.id === 'hadal') { ENV.uSkyCol.value.setRGB(0.12, 0.12, 0.18); ENV.uGroundCol.value.setRGB(0.04, 0.04, 0.06); ENV.uLightCol.value.setRGB(0.35, 0.4, 0.5); }
    lights.hemi.color.copy(ENV.uSkyCol.value); lights.hemi.groundColor.copy(ENV.uGroundCol.value); lights.dir.intensity = 0.6 + l * 1.2; lights.dir.color.copy(ENV.uLightCol.value); }
  ENV.uFillCol.value.copy(ENV.uSkyCol.value).multiplyScalar(studio ? .42 : .22);
  /* the reflection probe is tinted / dimmed to the water it is swimming in */
  if (studio) { ENV.uEnvTint.value.setRGB(1, 1, 1); ENV.uEnvInt.value = 1; ENV.uWet.value = 1; }
  else { const l = clamp(hab.light, 0, 1), w = new THREE.Color(hab.water[0], hab.water[1], hab.water[2]);
    ENV.uEnvTint.value.setRGB(lerp(w.r * 1.4 + .08, 1, l * .8), lerp(w.g * 1.4 + .1, 1, l * .8), lerp(w.b * 1.4 + .14, 1, l * .8));
    ENV.uEnvInt.value = 0.16 + l * 0.95; ENV.uWet.value = 0.78 + l * 0.22; }
  if (renderer) renderer.toneMappingExposure = studio ? 1.0 : 1.06;
  document.getElementById('btnMode').textContent = studio ? 'Studio' : 'Habitat';
}
/* ── school (boids on instanced LOD) ── */
