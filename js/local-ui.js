(function () {
 'use strict';
 let reported = false;
 window.addEventListener('error', function (event) {
  const graph = document.querySelector('#canvas-container, #applet_container, #geogebra, #geogebra1');
  if (!graph || reported || !event.message || /MathJax|google|youtube/i.test(event.filename || '')) return;
  reported = true;
  const notice = document.createElement('div');
  notice.className = 'local-graph-error';
  notice.dataset.details = event.message;
  notice.setAttribute('role', 'alert');
  notice.append('Não foi possível carregar a atividade. ');
  const retry = document.createElement('a');
  retry.href = window.location.href;
  retry.textContent = 'Recarregar a página';
  notice.append(retry);
  graph.before(notice);
 });

 const attached = new WeakSet();
 const panels = [];
 let pending = false;

 function isExpanded(panel) {
  return document.fullscreenElement === panel || panel.classList.contains('local-graph-expanded');
 }

 function fitGraphs() {
  pending = false;
  panels.forEach(function (entry) {
   const expanded = isExpanded(entry.panel);
   entry.button.textContent = expanded ? 'Sair da tela cheia' : 'Tela cheia';
   entry.button.setAttribute('aria-pressed', String(expanded));
   const api = entry.graph.aulaGraphApi;
   if (!api || typeof api.setSize !== 'function') return;
   if (!entry.originalSize) entry.originalSize = {
    width: Number(entry.graph.dataset.aulaGraphWidth) || entry.graph.clientWidth,
    height: Number(entry.graph.dataset.aulaGraphHeight) || entry.graph.clientHeight
   };
   if (entry.graph.dataset.aulaNativeResize === 'true') {
    entry.panel.classList.add('native-graph-panel');
    entry.panel.style.maxWidth = Math.min(entry.originalSize.width, 860) + 'px';
   }
   const width = expanded ? entry.panel.clientWidth - 32 : entry.graph.dataset.aulaNativeResize === 'true' ? entry.panel.clientWidth - 2 : Math.min(entry.originalSize.width, entry.panel.clientWidth);
   const extra = entry.panel.querySelector('.graph-live-controls');
   const height = expanded ? entry.panel.clientHeight - entry.toolbar.offsetHeight - (extra ? extra.offsetHeight : 0) - 48 : Math.min(entry.originalSize.height, 560);
   const size = Math.max(1, Math.round(width)) + ',' + Math.max(1, Math.round(height));
   if (size !== entry.lastSize) {
    let bounds;
    if (entry.graph.dataset.aulaGraph3d !== 'true' && typeof api.getViewProperties === 'function') {
     try { const v=JSON.parse(api.getViewProperties(1));
      if(v.width>0 && v.height>0 && v.invXscale>0 && v.invYscale>0) bounds={x:v.xMin+v.width*v.invXscale/2,y:v.yMin+v.height*v.invYscale/2,span:v.height*v.invYscale};
     } catch(error) { /* Algumas atividades não possuem uma vista 2D. */ }
    }
    entry.lastSize = size;
    api.setSize(...size.split(',').map(Number));
    const nativeResize = entry.graph.dataset.aulaNativeResize === 'true';
    if (nativeResize) {
     entry.graph.style.height = size.split(',')[1] + 'px';
    }
    const scaler = nativeResize ? null : entry.graph.querySelector('.applet_scaler');
    if (scaler) {
     scaler.style.width = size.split(',')[0] + 'px';
     scaler.style.height = size.split(',')[1] + 'px';
     scaler.style.transform = 'none';
    }
    if (!nativeResize) entry.graph.querySelectorAll('.applet_scaler > div, .applet_scaler > article').forEach(function (frame) {
     frame.style.width = size.split(',')[0] + 'px';
     frame.style.height = size.split(',')[1] + 'px';
    });
    if (typeof api.recalculateEnvironments === 'function') api.recalculateEnvironments();
    if(bounds){const parts=size.split(',').map(Number),halfY=bounds.span/2,halfX=halfY*parts[0]/parts[1];api.setCoordSystem(bounds.x-halfX,bounds.x+halfX,bounds.y-halfY,bounds.y+halfY);}
   }
  });
  // Atualiza as câmeras e os desenhos existentes sem mudar o ângulo escolhido.
  window.dispatchEvent(new Event('resize'));
 }

 function scheduleFit() {
  if (!pending) { pending = true; requestAnimationFrame(fitGraphs); }
 }

 function attachFullscreen(graph) {
  if (attached.has(graph) || getComputedStyle(graph).display === 'none') return;
  attached.add(graph);
  let panel;
  if (graph.id === 'canvas-container') panel = graph.parentElement;
  else {
   panel = document.createElement('div');
   graph.before(panel);
   panel.append(graph);
  }
  panel.classList.add('local-graph-panel');
  graph.classList.add('local-graph-surface');
  const toolbar = document.createElement('div');
  toolbar.className = 'local-graph-toolbar';
  const hint = document.createElement('span');
  hint.className = 'local-graph-hint';
  hint.textContent = '3D: arraste com o botão direito para girar. Shift + arrastar move a vista. Use a roda do mouse para zoom.';
  toolbar.append(hint);
  if (graph.id !== 'canvas-container' && graph.tagName !== 'CANVAS') {
   const move = document.createElement('button');
   move.type = 'button'; move.textContent = 'Mover vista'; move.setAttribute('aria-pressed','false');
   move.title = 'Ative para arrastar a vista com o botão esquerdo. Desative para selecionar pontos.';
   move.addEventListener('click', function () {
    const active = move.getAttribute('aria-pressed') !== 'true';
    if (graph.aulaGraphApi) {
     if (graph.dataset.aulaGraph3d === 'true') graph.aulaGraphApi.evalCommand('SetActiveView(3)');
     graph.aulaGraphApi.setMode(active ? 40 : 0);
    }
    move.setAttribute('aria-pressed', String(active));
   });
   toolbar.append(move);
  }
  function zoom(factor) {
   if (typeof graph.aulaZoom === 'function') graph.aulaZoom(factor);
   else if (graph.aulaGraphApi) {
    if (graph.dataset.aulaGraph3d === 'true') graph.aulaGraphApi.evalCommand('SetActiveView(3)');
    graph.aulaGraphApi.evalCommand('ZoomIn(' + factor + ')');
   }
   else {
    const canvas = graph.tagName === 'CANVAS' ? graph : graph.querySelector('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new WheelEvent('wheel', {deltaY:factor > 1 ? -120 : 120, clientX:rect.x+rect.width/2, clientY:rect.y+rect.height/2, bubbles:true, cancelable:true}));
   }
  }
  [[1/1.25, '−', 'Afastar gráfico'], [1.25, '+', 'Aproximar gráfico']].forEach(function (action) {
   const zoomButton = document.createElement('button');
   zoomButton.type = 'button';
   zoomButton.className = 'btn btn-default local-zoom-button';
   zoomButton.textContent = action[1];
   zoomButton.setAttribute('aria-label', action[2]);
   zoomButton.title = action[2];
   zoomButton.addEventListener('click', function () { zoom(action[0]); });
   toolbar.append(zoomButton);
  });
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-default local-fullscreen-button';
  button.textContent = 'Tela cheia';
  button.title = 'Ampliar o gráfico. Pressione Esc para sair.';
  button.setAttribute('aria-pressed', 'false');
  toolbar.append(button);
  panel.prepend(toolbar);
  const entry = {panel:panel, graph:graph, button:button, toolbar:toolbar};
  panels.push(entry);
  button.addEventListener('click', async function () {
   if (document.fullscreenElement === panel) await document.exitFullscreen();
   else if (panel.classList.contains('local-graph-expanded')) panel.classList.remove('local-graph-expanded');
   else {
    try {
     if (!panel.requestFullscreen) throw new Error('Fullscreen indisponível');
     await panel.requestFullscreen();
    } catch (error) { panel.classList.add('local-graph-expanded'); }
   }
   scheduleFit();
  });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(scheduleFit).observe(panel);
 }

 function findGraphs() {
  document.querySelectorAll('#canvas-container, #applet_container, #applet-container, #geogebra, #geogebra1, #geogebra2, #firstGraphDiv, #polarCanvas, #simpleCanvasContainer, #cycloidCanvasContainer').forEach(attachFullscreen);
  if (location.pathname.startsWith('/transformacoes-lineares/')) {
   document.querySelectorAll('canvas').forEach(function (canvas) { attachFullscreen(canvas.parentElement); });
  }
 }

 document.addEventListener('fullscreenchange', scheduleFit);
 document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
   panels.forEach(entry => entry.panel.classList.remove('local-graph-expanded'));
   scheduleFit();
  }
 });
 window.addEventListener('aula:graph-ready', function () { findGraphs(); scheduleFit(); });
 findGraphs();
 // As duas visualizações de transformações lineares são criadas após o carregamento.
 if (location.pathname.startsWith('/transformacoes-lineares/')) new MutationObserver(findGraphs).observe(document.body, {childList:true, subtree:true});
})();
