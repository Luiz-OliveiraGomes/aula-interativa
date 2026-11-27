(function(){
 'use strict';
 const host=document.querySelector('[data-coordinate-system]');if(!host)return;
 const spherical=host.dataset.coordinateSystem==='spherical',M=window.AulaCoordinates,D=Math.PI/180;
 const settings=document.getElementById('coordinate-settings'),graph=document.getElementById('applet_container');
 const state=spherical?{r:1,theta:60*D,phi:45*D,mode:'none'}:{r:2,phi:45*D,z:1,mode:'phi'};
 let api,busy=false,previousCaption='',lastFrame='';const inputs={},outputs={},modeButtons=[];
 const heading=document.createElement('h2');heading.textContent=spherical?'Explore r, θ e φ':'Explore r, φ e z';settings.append(heading);
 const note=document.createElement('p');note.className='coordinate-live-note';note.textContent='Ângulos em graus. Os controles e as medidas também ficam disponíveis em tela cheia.';settings.append(note);
 function field(key,title,min,max,step){const row=document.createElement('div');row.className='coordinate-control-row';const label=document.createElement('label');label.textContent=title;const range=document.createElement('input');range.type='range';range.min=min;range.max=max;range.step=step;range.setAttribute('aria-label',title+' — controle deslizante');const number=document.createElement('input');number.type='number';number.min=min;number.max=max;number.step=step;number.setAttribute('aria-label',title);row.append(label,range,number);settings.append(row);inputs[key]={range,number};
  function change(source){if(source.value===''||!source.checkValidity())return;state[key]=Number(source.value)*(key==='theta'||key==='phi'?D:1);if(api)applyGeometry();else render();}
  range.addEventListener('input',()=>change(range));number.addEventListener('input',()=>change(number));
 }
 field('r',spherical?'Raio r':'Distância ao eixo r',0,5,.1);if(spherical)field('theta','Ângulo θ (graus)',0,180,1);field('phi','Ângulo φ (graus)',0,360,1);if(!spherical)field('z','Altura z',-5,5,.1);
 const modeLabel=document.createElement('p');modeLabel.className='coordinate-mode-label';modeLabel.textContent=spherical?'Durante o arraste do ponto':'Coordenada que varia ao arrastar';const modes=document.createElement('div');modes.className='coordinate-modes';settings.append(modeLabel,modes);
 for(const [mode,title] of spherical?[['none','Sem fixar'],['theta','Fixar θ'],['phi','Fixar φ']]:[['phi','Variar φ'],['z','Variar z'],['r','Variar r']]){const b=document.createElement('button');b.type='button';b.textContent=title;b.dataset.coordinateMode=mode;b.addEventListener('click',()=>{state.mode=mode;if(api)applyGeometry();else render();});modeButtons.push(b);modes.append(b);}
 const status=document.createElement('p');status.className='coordinate-status';status.setAttribute('role','status');settings.append(status);
 const readout=document.createElement('div');readout.className='coordinate-readout';readout.setAttribute('aria-label','Coordenadas cartesianas do ponto P');['x','y','z'].forEach(key=>{const cell=document.createElement('div');cell.append(key+' ');const out=document.createElement('output');out.setAttribute('aria-label','Coordenada '+key);outputs[key]=out;cell.append(out);readout.append(cell);});settings.append(readout);
 const actions=document.createElement('div');actions.className='coordinate-actions';const step=document.createElement('button');step.type='button';step.textContent=spherical?'Variar ângulo +15°':'Avançar variação';step.addEventListener('click',()=>{if(spherical){if(state.mode==='phi')state.theta=(state.theta+15*D)%(Math.PI+1e-8);else state.phi=M.wrap(state.phi+15*D);}else if(state.mode==='phi')state.phi=M.wrap(state.phi+15*D);else if(state.mode==='z')state.z=state.z>=4.9?-5:state.z+.5;else state.r=state.r>=4.9?0:state.r+.5;if(api)applyGeometry();else render();});const reset=document.createElement('button');reset.type='button';reset.textContent='Restaurar';reset.addEventListener('click',()=>{Object.assign(state,spherical?{r:1,theta:60*D,phi:45*D,mode:'none'}:{r:2,phi:45*D,z:1,mode:'phi'});if(api)applyGeometry();else render();});actions.append(step,reset);settings.append(actions);
 function point(){return spherical?M.sphere(state.r,state.theta,state.phi):M.cylinder(state.r,state.phi,state.z);}
 function format(value,digits=1){return Number(value.toFixed(digits)).toString();}
 function render(){
  for(const [key,pair]of Object.entries(inputs)){const value=key==='theta'||key==='phi'?state[key]/D:state[key];const text=format(value,key==='r'||key==='z'?2:1);if(document.activeElement!==pair.number)pair.number.value=text;pair.range.value=text;}
  modeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.coordinateMode===state.mode)));
  const xyz=point();xyz.forEach((v,i)=>outputs[['x','y','z'][i]].value=format(Math.abs(v)<1e-10?0:v,3));
  if(spherical){status.textContent=state.r<1e-9?'Na origem, θ e φ não são determinados. Aumente o raio para explorar os ângulos.':state.mode==='theta'?'θ fixo em '+format(state.theta/D)+'°. Arraste a bolinha pela circunferência dourada para variar φ. A altura permanece r cos(θ) = '+format(xyz[2],3)+'.':state.mode==='phi'?'φ fixo em '+format(state.phi/D)+'°. Arraste a bolinha pelo meridiano dourado para variar θ.':'Arraste a bolinha na esfera ou use os controles. O raio permanece fixo; θ e φ acompanham a posição.';
   if(state.r>1e-9&&Math.abs(Math.sin(state.theta))<1e-8)status.textContent+=' No polo, φ não é determinado e sua variação não muda a posição do ponto.';
  }else status.textContent=state.mode==='phi'?'r e z fixos. Arraste a bolinha pela circunferência para variar o ângulo φ.':state.mode==='z'?'r e φ fixos. Arraste a bolinha pela linha vertical para variar a altura z.':'φ e z fixos. Arraste a bolinha pelo segmento radial para variar r.';
  graph.dataset.coordinateState=JSON.stringify({...state,x:xyz[0],y:xyz[1],z:spherical?xyz[2]:state.z});
  if(api){api.setValue('aulaRadius',state.r);api.setValue('aulaPhi',state.phi);if(spherical)api.setValue('aulaTheta',state.theta);const caption=spherical?'P · θ = '+format(state.theta/D)+'° · φ = '+format(state.phi/D)+'°':'P · r = '+format(state.r,2)+' · φ = '+format(state.phi/D)+'° · z = '+format(state.z,2);if(caption!==previousCaption){previousCaption=caption;api.setCaption('P',caption);}
   if(api.exists('aulaPhiArc'))api.setVisible('aulaPhiArc',state.r>1e-9&&(!spherical||Math.abs(Math.sin(state.theta))>1e-8));
  }
 }
 function decoratePoint(){
  const xml=new DOMParser().parseFromString(api.getXML('P'),'application/xml');const el=xml.querySelector('element');if(el){el.querySelectorAll('condition').forEach(e=>e.remove());api.evalXML(new XMLSerializer().serializeToString(el));}
  api.setVisible('P',true);api.setColor('P',129,23,203);api.setPointSize('P',7);api.setLabelStyle('P',3);api.setLabelVisible('P',true);api.setFixed('P',state.r<1e-9&&spherical,true);
 }
 function fitCoordinateView(){if(!api)return;const extent=spherical?Math.max(.25,state.r)*1.6:Math.max(3,state.r,Math.abs(state.z))*1.4;const frame=[graph.clientWidth,graph.clientHeight,extent].join(':');if(frame===lastFrame||graph.clientWidth<1)return;lastFrame=frame;api.evalCommand('SetActiveView(3)');api.evalCommand('ZoomIn('+[-extent,-extent,-extent,extent,extent,extent].join(',')+')');}

 window.addEventListener('resize',()=>requestAnimationFrame(fitCoordinateView));
 function applyGeometry(){
  if(!api||busy)return;busy=true;
  try{
   const xyz=point();api.setValue('aulaRadius',state.r);if(spherical)api.setValue('R',state.r);
   let curve=null;
   if(spherical&&state.r>1e-9){if(state.mode==='theta'&&Math.abs(Math.sin(state.theta))>1e-8){const rho=state.r*Math.sin(state.theta),z=state.r*Math.cos(state.theta);curve=`Curve(${rho}*cos(t),${rho}*sin(t),${z},t,0,2*pi)`;}else if(state.mode==='phi')curve=`Curve(${state.r}*sin(t)*cos(${state.phi}),${state.r}*sin(t)*sin(${state.phi}),${state.r}*cos(t),t,0,pi)`;}
   if(!spherical){curve=state.mode==='phi'&&state.r>1e-9?`Curve(${state.r}*cos(t),${state.r}*sin(t),${state.z},t,0,2*pi)`:state.mode==='z'?`Curve(${xyz[0]},${xyz[1]},t,t,-5,5)`:state.mode==='r'?`Curve(t*cos(${state.phi}),t*sin(${state.phi}),${state.z},t,0,5)`:null;}
   api.unregisterObjectUpdateListener('P');
   if(curve){api.evalCommand('aulaPath='+curve);api.evalCommand('P=Point(aulaPath)');api.setCoords('P',...xyz);api.setColor('aulaPath',231,153,40);api.setLineThickness('aulaPath',5);api.setLabelVisible('aulaPath',false);api.setVisible('aulaPath',true);}
   else{api.evalCommand('P=('+xyz.join(',')+')');if(api.exists('aulaPath'))api.setVisible('aulaPath',false);}
   if(spherical)api.getAllObjectNames().forEach(n=>{if(!['O','e','P'].includes(n)&&!n.startsWith('aula'))api.setVisible(n,false);});decoratePoint();api.setMode(0);api.evalCommand('SetActiveView(3)');api.registerObjectUpdateListener('P',readPoint);render();fitCoordinateView();
  }finally{busy=false;}
 }
 function readPoint(){if(!api||busy)return;busy=true;try{
  const raw=[api.getXcoord('P'),api.getYcoord('P'),api.getZcoord('P')];if(raw.some(v=>!Number.isFinite(v)))return;
  if(spherical){const next=M.sphereProjection(raw,state);state.theta=next.theta;state.phi=next.phi;const projected=point();if(projected.some((v,i)=>Math.abs(v-raw[i])>1e-8))api.setCoords('P',...projected);}
  else{const next=M.cylindrical(raw,state);if(state.mode==='phi')state.phi=next.phi;else if(state.mode==='z')state.z=Math.max(-5,Math.min(5,next.z));else state.r=Math.max(0,Math.min(5,next.r));}
  render();
 }finally{busy=false;}}
 function initialize(){const current=graph.aulaGraphApi;if(!current||current.aulaCoordinateExplorer)return;api=current;api.aulaCoordinateExplorer=true;api.setPerspective('T');api.enableShiftDragZoom(true);api.enableRightClick(true);
  api.getAllObjectNames().forEach(name=>{if(spherical?!['O','e','P'].includes(name):['text','boolean'].includes(api.getObjectType(name)))api.setVisible(name,false);});
  api.evalCommand('aulaRadius='+state.r);api.evalCommand('aulaPhi='+state.phi);api.evalCommand('aulaTheta='+(spherical?state.theta:0));
  if(!spherical){api.evalCommand('aulaCilindro=Surface(aulaRadius*cos(u),aulaRadius*sin(u),v,u,0,2*pi,v,-4,4)');api.setColor('aulaCilindro',77,182,191);api.setFilling('aulaCilindro',.12);api.setLabelVisible('aulaCilindro',false);}
  // The point is created first for a blank cylindrical construction.
  if(!api.exists('P'))api.evalCommand('P=('+point().join(',')+')');
  api.evalCommand('aulaProjecao=(x(P),y(P),0)');api.setLabelVisible('aulaProjecao',false);api.setPointSize('aulaProjecao',3);api.setColor('aulaProjecao',231,153,40);
  api.evalCommand('aulaRaio=Segment((0,0,0),P)');api.setColor('aulaRaio',129,23,203);api.setLabelVisible('aulaRaio',false);api.evalCommand('aulaAltura=Segment(P,aulaProjecao)');api.setLineStyle('aulaAltura',1);api.setLabelVisible('aulaAltura',false);api.setColor('aulaAltura',231,153,40);
  api.evalCommand('aulaPhiArc=Curve(0.35*aulaRadius*cos(t),0.35*aulaRadius*sin(t),0,t,0,aulaPhi)');api.setColor('aulaPhiArc',45,159,154);api.setLineThickness('aulaPhiArc',6);api.setLabelVisible('aulaPhiArc',false);
  if(spherical){api.evalCommand('aulaThetaArc=Curve(0.55*aulaRadius*sin(t)*cos(aulaPhi),0.55*aulaRadius*sin(t)*sin(aulaPhi),0.55*aulaRadius*cos(t),t,0,aulaTheta)');api.setColor('aulaThetaArc',217,115,40);api.setLineThickness('aulaThetaArc',6);api.setLabelVisible('aulaThetaArc',false);}
  api.setCoordSystem(spherical?-1.8:-5,spherical?1.8:5,spherical?-1.8:-5,spherical?1.8:5,spherical?-1.8:-5,spherical?1.8:5);applyGeometry();
 }
 render();window.addEventListener('aula:graph-ready',initialize);initialize();
 if(!spherical){const applet=new GGBApplet({id:'cylindricalApplet',appName:'3d',width:760,height:560,showToolBar:false,showMenuBar:false,showAlgebraInput:false,errorDialogsActive:false,enableShiftDragZoom:true},true);applet.inject('applet_container');}
})();
