  renderer.domElement.addEventListener('dblclick', () => { if (App.genome && App.genome.skin.inflate) App.inflateTarget = App.inflateTarget > 0.5 ? 0 : 1; });
  addEventListener('hashchange', () => { if (!App.dirtyHash) loadFromHash(); });
}
function boot() {
  try { initScene(); populateSelects(); bindUI(); bindHybrid(); if (!loadFromHash()) { FG.proc.bootFish(); } requestAnimationFrame(animate); }
  catch (e) { showError(e); }
}
installProcUI({ FG, App, THREE, ENV, PANELS, setFish, buildFish, openSheet, toast, $, esc, closeSheet, view: () => ({ camera, controls }) });
Object.assign(FG, { App, setFish, buildEnvironment, runSelfTest, HABITATS, NICHES, CLADES, SPECIES, FORM_RULES, SCHEMA, ENV });
export { boot, FG };
export default boot;
