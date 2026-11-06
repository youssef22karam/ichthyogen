  if(tissue>6.6) col*=.86+.08*step(tissue,7.2);

  /* material response */
  float tone2=scaleTone(sc);
  float rough=mix(.56,.13,uGloss);
  rough*=1.0+.22*head-.10*(1.0-smoothstep(-.7,-.1,vert));      /* head duller, belly slicker */
  rough+=(tone2-.5)*.10*visible;
  rough-=guan*.08;
  float metal=clamp(uSilver*guan*1.15,0.0,.85)*(1.0-head*.55);
  float coat=mix(.45,1.0,uWet)*(1.0-.25*head);
  float sss=uTrans*.9+.12;
  bool inner=tissue>.5 && tissue<2.0;
  if(inner){ rough=.42; metal=0.0; coat=1.0; sss=.55; }
  vec3 sheen=mix(uBase,vec3(.8,.88,1.0),.6)*uIrid*(.25+.75*guan);
  vec3 c=pbrSkin(col,N,vWP,rough,metal,sss,coat,sheen);

  /* structural colour: thin-film over the guanine layer, hue rotating with view angle */
  float nv=max(0.0,dot(N,V));
  float filmT=.55+.45*fbm(vec2(u*38.0,vert*13.0)+uSeed);
  vec3 iri=hsv2rgb(vec3(fract(.53+(1.0-nv)*.52*filmT+u*.07),.6,1.0));
  c+=iri*uIrid*(.10+.5*guan)*pow(1.0-nv,2.0)*0.9;

  if(uPhoto>.5) for(int row=0;row<2;row++){
    float rv=row==0 ? -.52 : -.81, n=max(1.0,floor(uPhoto/2.0)), pu=(u-uHeadU)/(1.0-uHeadU)*n;
    float dotp=1.0-smoothstep(.07,.13,length(vec2(fract(pu)-.5,(vert-rv)*n*.36)));
    c+=uGlow*dotp*step(uHeadU,u)*step(u,.99)*( .85+.15*sin(uTime*2.5+floor(pu)))*1.7;
  }
  if(uElectric>.5) c+=vec3(.2,.35,.65)*uElectric*pow(max(0.0,sin(uTime*5.0+u*16.0)),24.0)*smoothstep(.3,.8,u)*.14;
  if(cav) c=mix(c,col*.35,.75);
  c=mix(c,uFogCol,fogAmt(vWP)); gl_FragColor=vec4(c,mix(1.0,.86,uTrans));
}`;
const VS_FIN = GLSL_SWIM + /* glsl */`
attribute vec4 aFin; attribute vec4 aFin2; attribute vec4 aSkin; attribute vec3 aBase; varying vec3 vN, vWP; varying vec4 vFin, vFin2, vSkin; varying vec2 vCirc;
void main(){ vec3 p = position; vec3 n = normal; float ph = phaseOf(); p += inflateDisp(aBase);
  float kind = aFin.w, lenT = aFin.y, rayT = aFin.x, flex = aFin.z; float u = aSkin.x; float t = uCycle + ph;
  float mobile=smoothstep(.12,.8,lenT), tissue=mix(1.0,.13,aSkin.z);
  float rip = sin(rayT*9.0 + t*8.0 + u*4.0) * flex * mobile*mobile * uLen * .008*tissue;
  if(uMode == 7 && kind == 1.0) rip = sin(rayT*12.0 - t*14.0) * lenT*lenT * uLen * 0.03;
  if((kind == 2.0 || kind == 1.0) && uMode == 0 && flex > 0.9) rip = sin(rayT*14.0 - t*7.0) * lenT*lenT*uLen*0.03;
  p.z += rip*mobile;
  if(kind == 3.0){ if(uMode == 6){ p.y += sin(u*uWaveK*8.5 - t*6.2831853) * mobile*mobile * uLen * .065; } else { float f = uFlap * sin(t*6.2831853 + ph) * (1.0+0.3*uBurst); if(uMode==7) f = .3*sin(t*12.0); p.y += f * mobile*mobile * uLen * .065; } }
  applyWave(p, n, ph); mat4 mm = modelM(); vec4 wp = mm*vec4(p,1.0); vWP = wp.xyz; vN = normalize(mat3(mm)*n); vFin = aFin; vFin2 = aFin2; vSkin=aSkin; vCirc=vec2(cos(aSkin.y*6.2831853),sin(aSkin.y*6.2831853)); gl_Position = projectionMatrix*viewMatrix*wp; }`;
const FS_FIN = GLSL_COMMON_FS + GLSL_PIGMENT + /* glsl */`
uniform vec3 uFinCol; uniform float uIrid,uGloss; varying vec3 vN, vWP; varying vec4 vFin, vFin2, vSkin; varying vec2 vCirc;
void main(){ float rayT = vFin.x, lenT = vFin.y, op = vFin2.x, memb = vFin2.y, sf = vFin2.z, R = vFin2.w;
  float rl = abs(fract(rayT*(R-1.0)+0.5)-0.5); float isSpine = step(rayT, sf - 0.001); float rayW = mix(0.08, 0.16, isSpine)*(1.0-0.5*lenT); float ray = 1.0 - smoothstep(rayW, rayW+0.08, rl);
  if(vSkin.z<.5 && lenT > 1.0-.075*(4.0*rl*rl)) discard;                       /* fin law: trailing edge scalloped between ray tips */
  float branch=1.0-smoothstep(.055,.12,abs(fract(rayT*(R-1.0)*2.0+.5)-.5));
  ray=mix(ray,max(ray*.55,branch*.65),smoothstep(.55,.86,lenT)*(1.0-isSpine));
  if(lenT > memb && ray < .55 && vSkin.z<.5) discard;
  float root=1.0-smoothstep(.06,.42,lenT), ang=fract(atan(vCirc.y,vCirc.x)/6.2831853+1.0);
  vec3 skin=skinPigment(vSkin.x,ang), col=mix(uFinCol,skin,root);
  /* membrane: collagen fibre sheen between the rays, pigment blotches and a clearer distal margin */
  float fibre=.94+.06*sin(rayT*R*18.0+lenT*9.0);
  float blotch=fbm(vec2(rayT*9.0, lenT*5.0)+uSeed*1.3);
  col*=fibre*(.88+.24*blotch);
  col=mix(col, col*vec3(1.15,1.12,1.06), smoothstep(.75,1.0,lenT)*.5*(1.0-vSkin.z));
  if(vSkin.z>.5) col=mix(skin,uFinCol*.9,smoothstep(.28,1.0,lenT)*.18);
  else {
    col*=1.0-.09*ray*(1.0-root);
    if(uPattern==2 || uPattern==3) col=mix(col,uAccent,(1.0-root)*uPatStrength*.35*smoothstep(.3,.44,abs(fract(rayT*R*.35)-.5)));
  }
  float a=mix(max(.22,op*(1.0-.28*lenT)+ray*.08),1.0,root);
  if(vSkin.z>.5) a=1.0;
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 c=wetLight(col,N,vWP,uGloss*.38,(1.0-vSkin.z)*(1.0-root)*.6);                 /* matte / satin membrane */
  c+=col*uLightCol*pow(max(0.0,dot(-N,normalize(uLightDir))),2.0)*(1.0-vSkin.z)*(1.0-root)*.15;
  float fog=fogAmt(vWP); c=mix(c,uFogCol,fog); gl_FragColor=vec4(c,a);
}`;
const VS_EYE = GLSL_SWIM + /* glsl */`
attribute vec3 aEye; varying vec3 vN, vWP, vE;
void main(){ vec3 p = position; vec3 n = normal; vE = aEye;
  p += inflateDisp(p); applyWave(p, n, phaseOf()); mat4 mm = modelM(); vec4 wp = mm*vec4(p,1.0);
  vWP = wp.xyz; vN = normalize(mat3(mm)*n); gl_Position = projectionMatrix*viewMatrix*wp; }`;
/* The eyeball is real geometry (sclera shell, recessed iris disc, pupil cup, cornea dome, optional lids); this shader only colours each part
   from its own coordinates (aEye) - nothing here depends on the viewing direction except ordinary lighting. */
const FS_EYE = GLSL_COMMON_FS + /* glsl */`
uniform vec3 uEyeCol; uniform float uCartilage,uSeed;
varying vec3 vN, vWP, vE;
void main(){
  vec3 N = normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 V = normalize(cameraPosition-vWP), L = normalize(uLightDir), H = normalize(L+V), R = reflect(-V,N);
  float nv = max(dot(N,V),0.0), nl = max(dot(N,L),0.0), kind = vE.z, fres = .04+.96*pow(1.0-nv,4.2);
  vec3 col = vec3(.5); float alpha = 1.0, spec = 0.0, ao = 1.0;
  if(kind < .5){                                   /* sclera: pale connective tissue, vessels, darker toward the limbus */
    float th = vE.x, ph = vE.y;
    col = mix(uEyeCol*.35, vec3(.78,.76,.70), uCartilage>.5 ? .12 : .5) * (.92+.14*vnoise(vec2(ph*3.0,uSeed)));
    col = mix(col, vec3(.62,.26,.24), smoothstep(.55,1.0,fbm(vec2(ph*9.0, th*14.0)+uSeed))*.24);
    col *= mix(.48, 1.0, smoothstep(.78, 1.15, th));
  } else if(kind < 1.5){                           /* iris: textured, palette-coloured, darker limbal rim, bright pupil ruff */
    float q = vE.x, ph = vE.y;
    float fibers = .80 + .12*sin(ph*79.0+q*12.0) + .07*sin(ph*131.0-q*7.0) + .05*sin(ph*37.0+3.0);
    float crypt  = .88 + .12*vnoise(vec2(ph*14.0, q*11.0)+uSeed) + .06*fbm(vec2(ph*26.0,q*18.0));
    float collar = 1.0 + .22*(1.0-smoothstep(.0,.16,abs(q-.30)));
    vec3 irisCol = uCartilage>.5 ? mix(uEyeCol*.95, uEyeCol*.55, q)*.8 : mix(uEyeCol*1.38, uEyeCol*.50, q*q);
    col = irisCol*fibers*crypt*collar;
    col += uEyeCol*.45*(1.0-smoothstep(.0,.12,q));
    col *= 1.0 - .66*smoothstep(.78,1.0,q);
    col += mix(uEyeCol,vec3(1.0),.5)*.10*pow(1.0-nv,2.0);        /* metallic sheen of the stroma */
    ao = .70 + .30*smoothstep(.0,.35,1.0-q*.5);                  /* recessed under the cornea */
  } else if(kind < 2.5){                           /* pupil cup: the dark lens, part of the eyeball itself */
    col = vec3(.004,.004,.006) + uEyeCol*.035*(1.0-vE.x); ao = .8;
  } else if(kind < 3.5){                           /* cornea: clear, moist; only a small scene-light highlight */
    alpha = .03 + .22*fres;
    spec = pow(max(dot(N,H),0.0), 320.0)*.9 + pow(max(dot(N,H),0.0), 40.0)*.03;
    col = vec3(1.0);
  } else if(kind < 4.5){                           /* adipose eyelid: clear fatty window, subtle */
    col = vec3(.84,.88,.86); alpha = .16 + .30*fres;
  } else if(kind < 5.5){                           /* limbal funnel: dark collar leading down to the iris plane */
    col = uEyeCol*.16 + vec3(.01); ao = .75;
  } else {                                         /* nictitating lower lid: translucent milky membrane */
    col = vec3(.74,.76,.78); alpha = .84; spec = pow(max(dot(N,H),0.0), 60.0)*.05;
  }
  vec3 c = col*ao*(envDiff(N)*.55 + uLightCol*(.30+.70*nl) + uFillCol*.7);
  if(kind > 2.5 && kind < 3.5){ c = uLightCol*spec + envSpec(R,.035)*fres*.45; alpha = clamp(alpha + spec*.9 + fres*.25, 0.0, 1.0); }
  else c += uLightCol*spec;
  c *= .80 + .20*nv;
  float fog = fogAmt(vWP); c = mix(c, uFogCol, fog); gl_FragColor = vec4(c, alpha); }`;
const VS_SIMPLE = GLSL_SWIM + /* glsl */`
#ifdef TEETH
attribute float aJaw;
varying float vT;
#endif
varying vec3 vN, vWP;
void main(){ vec3 p = position; vec3 n = normal;
#ifdef TEETH
  vT = position.y;
#endif
#ifdef USE_INSTANCING
  p = (instanceMatrix*vec4(p,1.0)).xyz; n = normalize(mat3(instanceMatrix)*n);
#endif
#ifdef TEETH
  if(aJaw > 0.0){ vec2 d = p.xy - uJawPivot; float a = -uJawAngle*aJaw; float c = cos(a), s = sin(a); p.xy = uJawPivot + vec2(c*d.x - s*d.y, s*d.x + c*d.y); n.xy=vec2(c*n.x-s*n.y,s*n.x+c*n.y); p.x += uJawProtrude*aJaw; }
#endif
  applyWave(p, n, phaseOf()); vec4 wp = modelMatrix*vec4(p,1.0); vWP = wp.xyz; vN = normalize(mat3(modelMatrix)*n); gl_Position = projectionMatrix*viewMatrix*wp; }`;
const FS_SIMPLE = GLSL_COMMON_FS + /* glsl */`
uniform vec3 uColor; varying vec3 vN, vWP;
#ifdef TEETH
varying float vT;
#endif
void main(){ vec3 N = normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 col = uColor; float rough = 0.30, sss = 0.35;
#ifdef TEETH
  /* enamel: translucent, bluish-white at the tip, yellow dentine at the root, gum line at the base */
  float t = clamp(vT,0.0,1.0);
  col = mix(mix(vec3(.74,.52,.46), vec3(.95,.92,.84), smoothstep(.05,.35,t)), vec3(.92,.95,1.0), smoothstep(.45,1.0,t));
  col *= .95+.08*sin(t*54.0);                                    /* faint growth striae */
  rough = mix(.34,.07,smoothstep(.2,1.0,t)); sss = .25+.75*smoothstep(.35,1.0,t);
#endif
  vec3 c = pbrSkin(col, N, vWP, rough, 0.0, sss, 0.75, vec3(0.0));
  float fog = fogAmt(vWP); c = mix(c,uFogCol,fog); gl_FragColor = vec4(c,1.0); }`;
const FS_GLOW = GLSL_COMMON_FS + /* glsl */`
uniform vec3 uGlow; varying vec3 vN, vWP;
void main(){ float fl = 0.75 + 0.25*sin(uTime*5.0) * sin(uTime*2.3+1.0); vec3 N = normalize(vN); vec3 V = normalize(cameraPosition-vWP); float rim = pow(1.0-max(dot(N,V),0.0),2.0); vec3 c = uGlow*fl*(1.2+rim) + vec3(0.3)*rim; float fog = fogAmt(vWP); c = mix(c,uFogCol,fog*0.6); gl_FragColor = vec4(c,1.0); }`;
const hslCol = a => new THREE.Color().setHSL(((a[0] % 360) + 360) % 360 / 360, clamp(a[1], 0, 1), clamp(a[2], 0, 1), THREE.SRGBColorSpace);
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
  mats.eyeOrgan = (glass, eyeCol, axis) => { const m = new THREE.ShaderMaterial({ uniforms: Object.assign({}, uni, { uEyeCol: { value: eyeCol }, uAxis: { value: axis } }), vertexShader: VS_EYE, fragmentShader: FS_EYE, defines: Object.assign({}, defs), transparent: !!glass, depthWrite: !glass, side: glass ? THREE.FrontSide : THREE.DoubleSide }); m.userData.eyeball = true; mats._eyes.push(m); return m; };
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
makeMaterials = function (g, uni, school) { const m = _origMakeMaterials(g, uni, school); for (const k of ['body', 'jaw', 'fin', 'simple', 'tooth', 'glow']) m[k].fragmentShader = FS_POST(m[k].fragmentShader); const ef = m.eyeOrgan; m.eyeOrgan = (...a) => { const mm = ef(...a); mm.fragmentShader = FS_POST(mm.fragmentShader); return mm; }; return m; };
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
