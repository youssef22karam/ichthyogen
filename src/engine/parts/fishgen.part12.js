const GLSL_PIGMENT = /* glsl */`
uniform vec3 uBase,uBelly,uAccent,uGlow,uBandCol;
uniform float uPatScale,uPatStrength,uCounter,uSeed,uFineness,uFlat,uBand,uRay;
uniform int uPattern;
float verticalOf(float ang){ float v=uFlat>.5 ? sin(ang*6.2831853) : -cos(ang*6.2831853); return uRay>.5 ? clamp(v*5.0,-1.0,1.0) : v; }
vec3 skinPigment(float u,float ang){
  float vert=verticalOf(ang); vec2 pc=vec2(u*uFineness*.8,vert*1.2)*uPatScale+uSeed; float nz=fbm(pc*3.0);
  float cs=smoothstep(-.38,.48,vert+(nz-.5)*.12); vec3 col=mix(uBase,uBelly,uCounter*(1.0-cs)); float m=0.0;
  if(uPattern==1) m=smoothstep(.30,.40,abs(fract(vert*1.6*uPatScale+nz*.10)-.5));
  else if(uPattern==2) m=smoothstep(.27,.38,abs(fract(u*uFineness*1.1*uPatScale+nz*.045)-.5));
  else if(uPattern==3){ vec2 sp=vec2(u*uFineness*2.2,vert*2.0)*uPatScale*2.7, cell=floor(sp), l=fract(sp)-.5;
    float j=hash12(cell+uSeed); l-=(vec2(hash12(cell+1.7+uSeed),hash12(cell+3.1+uSeed))-.5)*.5;
    float rr=.1+.1*j; m=(1.0-smoothstep(rr-.03,rr+.02,length(l)))*step(.22,j)*smoothstep(-.55,-.1,vert); }
  else if(uPattern==4) m=1.0-smoothstep(.025,.07,abs(fbm(pc*2.5)-.5));
  else if(uPattern==5) m=smoothstep(.38,.65,sin(u*uFineness*1.6*uPatScale*3.1416)*.5+.5)*smoothstep(-.25,.45,vert);
  else if(uPattern==6) m=smoothstep(.38,.61,fbm(pc*2.2));
  else if(uPattern==7) m=smoothstep(.43,.51,fbm(pc*1.6));
  else if(uPattern==8){ float d=length(vec2((u-.74)*uFineness*1.2,(vert-.25)*.9)/(.35*uPatScale));
    m=(1.0-smoothstep(.75,.85,d))*.95; float ring=smoothstep(.85,.95,d)-smoothstep(1.05,1.2,d); col=mix(col,uBelly,ring*.8*uPatStrength); }
  col=mix(col,uAccent,m*uPatStrength);
  if(uBand>0.0){ float band=(1.0-smoothstep(.07,.2,abs(vert-.02)+(nz-.5)*.06))*smoothstep(.1,.3,u)*uBand; col=mix(col,uBandCol,band); }
  return col;
}
`;
const VS_BODY = GLSL_SWIM + /* glsl */`
attribute vec4 aBody; varying vec3 vN, vWP, vLP; varying vec4 vBody; varying vec2 vCirc;
void main(){ vec3 p = position; vec3 n = normal; float ph = phaseOf();
  p += inflateDisp(p);
  if(aBody.z>2.9 && aBody.z<3.1) p += n*aBody.w*uBreath*uLen*.0028;
  if(aBody.z>6.8) p += n*aBody.w*uBreath*uLen*.0005;
#ifdef JAW
  if(aBody.z < 2.0){ vec2 d = p.xy - uJawPivot; float a = -uJawAngle*aBody.w; float c = cos(a), s = sin(a); p.xy = uJawPivot + vec2(c*d.x - s*d.y, s*d.x + c*d.y); p.x += uJawProtrude*aBody.w; n.xy = vec2(c*n.x - s*n.y, s*n.x + c*n.y); }
#endif
  applyWave(p, n, ph); mat4 mm = modelM(); vec4 wp = mm*vec4(p,1.0); vWP = wp.xyz; vLP = p; vN = normalize(mat3(mm)*n); vBody = aBody; vCirc=vec2(cos(aBody.y*6.2831853),sin(aBody.y*6.2831853)); gl_Position = projectionMatrix*viewMatrix*wp; }`;
const FS_BODY = GLSL_COMMON_FS + GLSL_PIGMENT + /* glsl */`
uniform float uLen,uScaleSize,uIrid,uGloss,uPhoto,uTrans,uHeadU,uPreU,uMouthU,uLateral,uElectric,uDetail,uMouthStart,uMouthTipF,uMouthCornerF,uManta,uJawAngle;
uniform float uSilver,uLips,uEyeU,uEyeVert,uEyeRU,uEyeRV,uNostrils,uSlits;
uniform int uScale; varying vec3 vN,vWP,vLP; varying vec4 vBody; varying vec2 vCirc;
float gCirc = 1.0;   /* circuli visibility, killed when scales fall under a pixel */
float gFine = 1.0;   /* high-frequency skin detail visibility (anti-alias guard)     */

vec2 scaleUV(vec2 sc){ vec2 p=sc; if(uScale==2 || uScale==5) p=vec2(sc.x+sc.y,sc.y-sc.x)*.7071; p.x+=mod(floor(p.y),2.0)*.5; return p; }

/* An imbricated scale: a fan whose free (posterior, +x) edge rides over the next scale.
   Real cycloid/ctenoid scales also carry concentric growth rings (circuli) around an
   anterior focus plus radii grooves - those two features are what reads as "fish" up close. */
float scaleHeight(vec2 sc){
  if(uScale==4 || uScale==6) return 0.0;
  vec2 p=scaleUV(sc); vec2 cell=floor(p), q=fract(p)-.5;
  float jitter=hash12(cell+uSeed);
  q+=(vec2(jitter,hash12(cell+uSeed+1.3))-.5)*.035;
  vec2 e=vec2(q.x*.86-.1, q.y*1.05);
  float d=(uScale==2 || uScale==5) ? abs(e.x)+abs(e.y) : length(e);
  if(uScale==1) d+=.02*sin(atan(e.y,e.x)*9.0+jitter*6.0)*step(0.0,e.x);   /* ctenoid comb edge */
  float body=1.0-smoothstep(.40,.50,d);
  float ramp=.35+.65*smoothstep(-.45,.32,e.x);                            /* rises toward the free edge */
  float lip=smoothstep(.30,.44,d)*step(-.05,e.x);                         /* shadowed step over the next scale */
  float h=body*ramp*(.85+.3*jitter)-lip*.35;
  if(gCirc>0.001){
    vec2 f=vec2(e.x+.26,e.y);                                             /* focus sits anterior of centre */
    float fr=length(f*vec2(1.0,1.22));
    float circuli=sin(fr*47.0-jitter*5.0)*.055*smoothstep(.06,.22,fr)*body;
    float radii=sin(atan(f.y,f.x)*13.0+jitter*9.0)*.016*smoothstep(.1,.5,fr)*body;
    h+=(circuli+radii)*gCirc;
  }
  return h;
}
float scaleTone(vec2 sc){ return hash12(floor(scaleUV(sc))+uSeed+9.0); }
/* per-scale guanine (iridophore) platelet coverage: strongest mid-flank, like a real silver fish */
float scaleGuanine(vec2 sc,float vert){ vec2 p=scaleUV(sc); vec2 q=fract(p)-.5; float j=hash12(floor(p)+uSeed+4.2);
  return smoothstep(.46,.12,length(q))*(.45+.55*j)*(1.0-smoothstep(.15,.95,abs(vert-.1))); }

/* non-scale skin relief: pebbled head, fleshy lips, orbital rim, opercular bone, nares */
float microH(float u,float vert,float head){
  float h=0.0;
  h += (fbm(vec2(u*300.0/max(.6,uFineness), vert*90.0)+uSeed)-.5)*.22*head*gFine;      /* head pebbling   */
  h += (fbm(vec2(u*110.0, vert*30.0)+uSeed*1.7)-.5)*.10*head;                          /* coarse wrinkles */
  /* lips: two soft pads either side of the gape, with a crease between them */
  if(u>=uMouthStart && u<=uMouthU*1.04){
    float t=smoothstep(uMouthStart,uMouthU,u);
    float lvl=mix(uMouthTipF,uMouthCornerF,t);
    float dv=(vert-lvl);
    float fade=smoothstep(uMouthStart,uMouthStart+.015,u)*(1.0-smoothstep(uMouthU*.93,uMouthU*1.04,u));
    h += (exp(-pow((dv-.055)/.055,2.0))+exp(-pow((dv+.055)/.055,2.0)))*(.18+.55*uLips)*fade;
    h -= exp(-pow(dv/.018,2.0))*(.30+.4*uLips)*fade;
  }
  /* orbital rim: a raised bony ring around the eye, slightly sunken socket inside */
  if(uEyeRU>0.0){
    float dE=length(vec2((u-uEyeU)/max(1e-4,uEyeRU*1.9), (abs(vert)-abs(uEyeVert))/max(1e-4,uEyeRV*1.7)));
    h += (1.0-smoothstep(.75,1.35,dE))*.26 - (1.0-smoothstep(.0,.85,dE))*.30;
  }
  /* operculum: a flat bone plate with radial striae and a raised free margin */
  float op=smoothstep(uPreU,uPreU+(uHeadU-uPreU)*.3,u)*(1.0-smoothstep(uHeadU-.012,uHeadU+.006,u));
  h += op*(.09*sin((u-uPreU)*95.0/max(.12,uHeadU)+vert*7.0)*gFine+.05);
  h += (1.0-smoothstep(.0,.010,abs(u-uHeadU)))*.34;                                    /* free margin ridge */
  h += (1.0-smoothstep(.0,.008,abs(u-uPreU)))*.14;                                     /* preopercular ridge */
  /* nares: paired pits on the snout */
  float nd=length(vec2((u-uEyeU*.52)/.013,(vert-.30)/.085));
  h -= (1.0-smoothstep(.5,1.0,nd))*.5*uNostrils;
  return h;
}

void main(){
  float u=vBody.x, ang=fract(atan(vCirc.y,vCirc.x)/6.2831853+1.0), vert=verticalOf(ang);
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N; vec3 V=normalize(cameraPosition-vWP);
  vec3 col=skinPigment(u,ang); float tissue=vBody.z;
  float head=1.0-smoothstep(uHeadU*.5,uHeadU*1.08,u);

  /* screen-space surface frame, reused by every bump layer */
  vec3 ddx=dFdx(vWP), ddy=dFdy(vWP), r1=cross(ddy,N), r2=cross(N,ddx); float det=dot(ddx,r1);
  float relief=uLen*.0015;

  if(uManta<.5 && tissue<.5 && u>=uMouthStart && u<=uMouthU){
    float t=smoothstep(uMouthStart,uMouthU,u);
    float level=mix(uMouthTipF,uMouthCornerF,t)-.025*sin(3.14159265*t);
    float fade=smoothstep(uMouthStart,uMouthStart+.012,u)*(1.0-smoothstep(uMouthU-.014,uMouthU,u));
    float crease=exp(-pow((vert-level)/(.023+uJawAngle*.26),2.0))*fade;
    col=mix(col,uBase*.22,crease*.72);
    col=mix(col,mix(col,vec3(.62,.42,.40),.35),(exp(-pow((vert-level-.06)/.05,2.0))+exp(-pow((vert-level+.06)/.05,2.0)))*fade*uLips*.6);
  }

  vec2 sc=vec2(u*uFineness*34.0,ang*27.0*(1.0+.22*uFineness))/uScaleSize;
  if(uScale==3) sc*=2.2; if(uScale==5) sc*=.5;
  float fw=length(fwidth(sc)), visible=1.0-smoothstep(.4,1.7,fw);
  gCirc=(1.0-smoothstep(.05,.22,fw))*uDetail;
  gFine=(1.0-smoothstep(.0018,.0065,fwidth(u)))*uDetail;
  float h=scaleHeight(sc), guan=0.0;
  if(uDetail>.4 && tissue<.5 && uScale!=4 && uScale!=6){
    float scaleFade=uScale==3 ? 1.0 : smoothstep(uHeadU*.55,uHeadU,u);
    float hx=scaleHeight(sc+dFdx(sc))-h, hy=scaleHeight(sc+dFdy(sc))-h;
    float scaleRelief=uScale==3 ? .00035 : uScale==2 || uScale==5 ? .0015 : .0011;
    vec3 grad=sign(det)*(hx*r1+hy*r2)*(uLen/max(1.25,uFineness))*scaleRelief*uScaleSize*visible*scaleFade*1.5;
    N=normalize(max(abs(det),1e-12)*N-grad);
    float tone=scaleTone(sc);
    guan=scaleGuanine(sc,vert)*visible*scaleFade;
    col*=1.0+.05*(h-.4)*visible*scaleFade+.05*(tone-.5)*visible*scaleFade;
    col=mix(col,col*vec3(1.06,1.07,1.12),guan*uSilver*.5);                 /* platelet lightening */
    col*=1.0-.10*smoothstep(.25,.0,h)*visible*scaleFade;                   /* seated posterior edge */
  }

  /* skin relief that is not scales: pebbling, lips, orbit, opercle, nares */
  if(uDetail>.4 && tissue<2.0){
    float mh=microH(u,vert,head);
    vec3 mgrad=sign(det)*(dFdx(mh)*r1+dFdy(mh)*r2)*relief;
    N=normalize(max(abs(det),1e-12)*N-mgrad);
    col*=1.0+.10*clamp(mh,-1.0,1.0)*head;
    float orb=uEyeRU>0.0 ? 1.0-smoothstep(.55,1.5,length(vec2((u-uEyeU)/max(1e-4,uEyeRU*2.1),(abs(vert)-abs(uEyeVert))/max(1e-4,uEyeRV*1.9)))) : 0.0;
    col*=1.0-.34*orb;                                                       /* periorbital pigment ring */
    float margin=1.0-smoothstep(.0,.011,abs(u-uHeadU));
    col*=1.0-.30*margin;                                                    /* dark opercular membrane */
  }

  if(uScale==6){ float rows=min(abs(vert-.9),min(abs(abs(vert)-.35),abs(vert+.9)));
    float plate=(1.0-smoothstep(.015,.1,rows))*pow(.5+.5*sin(u*uFineness*31.0),2.0)*step(uHeadU,u); col*=1.0+.14*plate; }

  /* lateral line: canal groove plus the pored scales that punctuate it */
  float lly=.08*sin(u*3.0), line=exp(-pow((vert-lly)/.018,2.0))*step(uHeadU,u)*uLateral;
  float pore=line*(1.0-smoothstep(.12,.34,abs(fract(u*uFineness*26.0/uScaleSize)-.5)))*visible;
  col*=1.0-.18*line-.35*pore;

  if(tissue>.5 && tissue<2.0) col=mix(vec3(.34,.12,.12),vec3(.08,.02,.03),smoothstep(-.2,.9,vert*.5+.5))*(.85+.15*sin(u*70.0));
  if(tissue>5.4 && tissue<6.6) col=mix(col,vec3(.055,.035,.04),.62);
  if(tissue>6.6) col*=.88;

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
  vec3 c=wetLight(col,N,vWP,uGloss*.85,(1.0-vSkin.z)*(1.0-root)*.6);
  c+=col*uLightCol*pow(max(0.0,dot(-N,normalize(uLightDir))),2.0)*(1.0-vSkin.z)*(1.0-root)*.15;
  float fog=fogAmt(vWP); c=mix(c,uFogCol,fog); gl_FragColor=vec4(c,a);
}`;
const VS_EYE = GLSL_SWIM + /* glsl */`
uniform vec3 uAxis; uniform float uEyeRad;
varying vec3 vN, vWP, vLN, vLV;
void main(){ vec3 p = position; vec3 n = normal; vLN = normalize(normal);
  /* corneal dome: the front of a real fish eye bulges well past the scleral sphere */
  float front = smoothstep(.25,1.0,dot(vLN, normalize(uAxis)));
  p += vLN*uEyeRad*0.14*front*front;
  p+=inflateDisp(p); applyWave(p, n, phaseOf()); mat4 mm = modelM(); vec4 wp = mm*vec4(p,1.0);
  vWP = wp.xyz; vN = normalize(mat3(mm)*n);
  mat3 m3 = mat3(mm); vec3 wv = cameraPosition - wp.xyz;
  vLV = normalize(vec3(dot(m3[0],wv), dot(m3[1],wv), dot(m3[2],wv)));   /* view dir back in model space */
  gl_Position = projectionMatrix*viewMatrix*wp; }`;
const FS_EYE = GLSL_COMMON_FS + /* glsl */`
uniform vec3 uAxis, uEyeCol; uniform vec2 uSacc; uniform float uPupil,uCartilage,uSeed,uRay,uGloss;
varying vec3 vN, vWP, vLN, vLV;
void main(){
  vec3 n = normalize(vLN), ax = normalize(uAxis), lv = normalize(vLV);
  float t = dot(n, ax);
  vec3 tu = normalize(cross(abs(ax.y)<.9 ? vec3(0,1,0) : vec3(1,0,0), ax)), tv = cross(ax, tu);

  /* The iris is not painted on the cornea - it sits on a plane deep inside the globe and is
     seen through a refracting dome. Tracing that refracted ray gives true parallax: the pupil
     slides behind the cornea as the fish turns, which is the single biggest "alive" cue. */
  vec3 rd = refract(-lv, n, 1.0/1.336);
  if(dot(rd,rd) < 1e-5) rd = -ax;
  float planeD = -0.34, den = dot(rd, ax);
  vec3 hit = n + rd * clamp((planeD - dot(n,ax))/(abs(den)<.08 ? sign(den+1e-6)*.08 : den), 0.0, 4.0);
  vec2 pc = vec2(dot(hit,tu), dot(hit,tv)) * 1.34 - uSacc*.10;
  if(length(pc) > 1.25) pc = normalize(pc)*1.25;
  float r = length(pc), angle = atan(pc.y, pc.x);

  float pupilR = .30 + uPupil*.05, irisR = .74, scleraR = .90;
  /* pupil outline: round, vertical slit (sharks), or an operculated crescent (rays) */
  float pd = uCartilage>.5 ? length(vec2(pc.x/.52, pc.y)) : r;
  if(uRay>.5) pd = max(pd, (pc.y+ .22)/max(1e-3,pupilR));
  vec3 col; float irisQ = 0.0, isIris = 0.0;
  if(t <= -0.05){ col = uEyeCol*.10 + vec3(.005); }
  else if(pd < pupilR){
    float e = smoothstep(pupilR-.035, pupilR, pd);
    col = mix(vec3(.004,.004,.006), uEyeCol*.22, e);                      /* soft pupil margin        */
  }
  else {
    float q = clamp((r-pupilR)/(irisR-pupilR), 0.0, 1.0); irisQ=q; isIris=1.0;
    float detail = 1.0-smoothstep(.02,.09,fwidth(r));
    float fibers = .80 + detail*(.12*sin(angle*79.0+q*12.0) + .07*sin(angle*131.0-q*7.0) + .05*sin(angle*37.0+3.0));
    float crypt  = .88 + .12*vnoise(vec2(angle*14.0, q*11.0)+uSeed) + .06*fbm(vec2(angle*26.0,q*18.0));
    float collar = 1.0 + .22*(1.0-smoothstep(.0,.16,abs(q-.42)));          /* collarette ridge         */
    vec3 deepC = uEyeCol*.38, outC = uEyeCol*1.35;
    vec3 irisCol = uCartilage>.5 ? mix(uEyeCol*.55, uEyeCol*.95, q)*.75 : mix(outC, deepC, q*q);
    col = irisCol*fibers*crypt*collar;
    col += uEyeCol*.55*(1.0-smoothstep(.02,.10,abs(r-pupilR)));            /* bright pupil ruff        */
    col *= 1.0 - .62*smoothstep(.80,1.0,q);                                /* dark limbal ring         */
    if(r > irisR){
      float sq = smoothstep(irisR,irisR+.04,r);
      vec3 sclera = mix(uEyeCol*.35, vec3(.80,.78,.72), uCartilage>.5 ? .12 : .6);
      sclera *= .92+.14*vnoise(vec2(angle*3.0,uSeed));
      sclera = mix(sclera, vec3(.62,.26,.24), smoothstep(.55,1.0,fbm(vec2(angle*9.0, r*22.0)+uSeed))*.28); /* vessels */
      col = mix(col, sclera, sq);
      col = mix(col, vec3(.045,.03,.028)*(1.0+.3*vnoise(vec2(angle*4.0,uSeed))), smoothstep(scleraR,scleraR+.07,r));
    }
  }
  vec3 N = normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 V = normalize(cameraPosition-vWP), L = normalize(uLightDir), H = normalize(L+V), R = reflect(-V,N);
  float nv = max(dot(N,V),0.0), nl = max(dot(N,L),0.0);
  /* lit like a wet sphere: diffuse through the humour, then the cornea on top */
  vec3 c = col*(envDiff(N)*.55 + uLightCol*(0.30+0.70*nl) + uFillCol*.7);
  /* tapetum lucidum - deep-water eyes flare back at the viewer when lit from the camera side */
  float retro = pow(max(0.0,dot(V,L)),22.0)*(1.0-smoothstep(pupilR*1.1,pupilR*1.5,pd))*step(-0.05,t);
  c += mix(vec3(.25,.9,.6), vec3(1.0,.85,.45), uCartilage)*retro*(.25+.95*uPupil);
  /* cornea: razor specular + the actual softbox reflected out of the environment probe */
  float fres = .04+.96*pow(1.0-nv,4.2);
  c += uLightCol*(pow(max(dot(N,H),0.0),420.0)*2.4 + pow(max(dot(N,H),0.0),48.0)*.12)*step(-0.05,t);
  c += envSpec(R, .035)*fres*0.55*step(-0.05,t);
  c *= .74+.26*nv;
  c = mix(c, c*vec3(.75,.82,.95), smoothstep(.6,1.0,irisQ)*isIris*.3);
  float fog = fogAmt(vWP); c = mix(c, uFogCol, fog); gl_FragColor = vec4(c,1.0); }`;
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
