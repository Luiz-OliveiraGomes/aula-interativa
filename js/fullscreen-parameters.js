(function(){
 'use strict';
 const entries=new Map();
 function expanded(panel){return document.fullscreenElement===panel||panel.classList.contains('local-graph-expanded');}
 function notify(){window.dispatchEvent(new CustomEvent('aula:parameters-change'));}
 function findSource(panel,graph){
  const explicit=[...document.querySelectorAll('[data-fullscreen-controls]')].find(e=>e.dataset.fullscreenControls===graph.id);
  if(explicit&&!panel.contains(explicit))return explicit;
  const scopes=[panel.closest('.raup-workspace'),panel.closest('.polar3d-workspace'),panel.closest('.field-workspace'),panel.closest('.row')].filter(Boolean);
  for(const scope of scopes){
   const options=[...scope.children].filter(e=>!e.contains(graph)&&!panel.contains(e)&&e.querySelector('input:not([type=hidden]),select,button'));
   const source=options.find(e=>e.matches('.activity-controls,.raup-settings,[class*="col-"]'));
   if(source)return source;
  }
  return [...document.querySelectorAll('form,.activity-controls')].find(e=>!e.contains(graph)&&!panel.contains(e)&&e.querySelector('input,select'))||null;
 }
 function attach(panel){
  if(entries.has(panel))return;
  const graph=panel.querySelector('.local-graph-surface');if(!graph)return;
  const toolbar=panel.querySelector('.local-graph-toolbar');if(!toolbar)return;
  const toggle=document.createElement('button');toggle.type='button';toggle.className='fullscreen-parameter-toggle';toggle.textContent='Parâmetros';toggle.setAttribute('aria-expanded','false');
  const entry={panel,graph,toggle,source:null,placeholder:null,drawer:null};entries.set(panel,entry);
  toggle.addEventListener('click',()=>{if(!entry.drawer)return;entry.drawer.hidden=!entry.drawer.hidden;panel.classList.toggle('has-fullscreen-parameters',!entry.drawer.hidden);toggle.setAttribute('aria-expanded',String(!entry.drawer.hidden));notify();});
  toolbar.insertBefore(toggle,toolbar.querySelector('.local-fullscreen-button'));
 }
 function update(){
  document.querySelectorAll('.local-graph-panel').forEach(attach);
  entries.forEach(entry=>{
   const {panel,graph,toggle}=entry;
   if(expanded(panel)){
    if(entry.drawer)return;
    const source=findSource(panel,graph);if(!source){toggle.hidden=true;return;}
    toggle.hidden=false;entry.source=source;entry.placeholder=document.createComment('Parâmetros na posição original');source.before(entry.placeholder);
    const drawer=document.createElement('aside');drawer.className='fullscreen-parameter-drawer';drawer.setAttribute('aria-label','Parâmetros do gráfico');
    const h=document.createElement('h2');h.textContent='Parâmetros';drawer.append(h,source);panel.append(drawer);entry.drawer=drawer;
    drawer.hidden=window.matchMedia('(max-width:700px)').matches;panel.classList.toggle('has-fullscreen-parameters',!drawer.hidden);toggle.setAttribute('aria-expanded',String(!drawer.hidden));notify();
   }else if(entry.drawer){
    entry.placeholder.replaceWith(entry.source);entry.drawer.remove();entry.drawer=null;entry.source=null;entry.placeholder=null;panel.classList.remove('has-fullscreen-parameters');toggle.setAttribute('aria-expanded','false');notify();
   }
  });
 }
 let pending=false;function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;update();});}
 document.addEventListener('fullscreenchange',schedule);window.addEventListener('aula:graph-ready',schedule);
 document.addEventListener('click',e=>{if(e.target.closest('.local-fullscreen-button'))schedule();});
 new MutationObserver(records=>{if(records.some(r=>r.type==='childList'&&[...r.addedNodes].some(n=>n.nodeType===1&&n.matches?.('.local-graph-panel'))||r.type==='attributes'&&r.target.classList.contains('local-graph-panel')))schedule();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 update();
})();
