// Usa o pacote oficial instalado nesta máquina e mantém as APIs das atividades antigas.
(function () {
 'use strict';
 const OfficialApplet = window.GGBApplet;
 if (!OfficialApplet) return;
 window.GGBApplet = function (parameters) {
  parameters = Object.assign({}, parameters);
  let graphContainer;
  parameters.language = 'pt';
  parameters.allowUpscale = false;
  parameters.enableShiftDragZoom = true;
  parameters.showZoomButtons = true;
  const originalLoad = parameters.appletOnLoad;
  parameters.appletOnLoad = function (api) {
   const id = parameters.id || 'ggbApplet';
   document[id] = api;
   window[id] = api;
   api.enableShiftDragZoom(true);
   const activity = location.pathname.split('/').filter(Boolean).filter(x => x !== 'versao-teste')[0];
   if (['IntersecaoPlano','projecao','fluxo','riemann-3d','coordenadas-esfericas','polares-3d'].includes(activity)) api.setPerspective('T');
   if (['campo-vetorial','campo-eletrico'].includes(activity)) api.setPerspective('G');
   if (activity === 'campo-vetorial') api.setCoordSystem(-6.5,6.5,-6.5,6.5);
   if (activity === 'coordenadas-esfericas') {
    api.getAllObjectNames().forEach(function (name) {
     if (api.getObjectType(name) === 'text') api.setFixed(name, true, false);
    });
   }
   if (graphContainer) {
    graphContainer.aulaGraphApi = api;
    graphContainer.dataset.aulaGraphWidth = parameters.width || 600;
    graphContainer.dataset.aulaGraphHeight = parameters.height || 500;
   }
   if (typeof originalLoad === 'function') originalLoad(api);
   window.dispatchEvent(new CustomEvent('aula:graph-ready'));
  };
  const applet = new OfficialApplet(parameters, true);
  applet.setHTML5Codebase('/vendor/geogebra/GeoGebra/HTML5/5.0/web3d/');
  const inject = applet.inject;
  applet.inject = function (target) {
   graphContainer = typeof target === 'string' ? document.getElementById(target) : target;
   if (graphContainer) graphContainer.dataset.aulaNativeResize = 'true';
   return inject.apply(applet, arguments);
  };
  return applet;
 };
})();
