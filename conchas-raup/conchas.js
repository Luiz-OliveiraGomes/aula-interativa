(function () {
 'use strict';
 const model=window.RaupModel;
 const graph=document.getElementById('canvas-container');
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(42,1,0.05,2000);
 camera.up.set(0,0,1);
 const renderer=createLocalRenderer({antialias:true,alpha:false});
 if (renderer.setPixelRatio) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
 renderer.setClearColor(0xffffff,1);
 graph.appendChild(renderer.domElement);
 const controls=new THREE.OrbitControls(camera,renderer.domElement);
 controls.enableKeys=false;
 controls.zoomSpeed=1.1;
 controls.minDistance=0.3;
 controls.maxDistance=300;
 setupLocalGraphControls(graph,camera,controls,renderer);
 const ambient=new THREE.AmbientLight(0xffffff,0.6);
 scene.add(ambient);
 const light=new THREE.DirectionalLight(0xffffff,0.75);
 light.position.set(12,-18,30); scene.add(light);
 const fill=new THREE.DirectionalLight(0x99c8d4,0.18);
 fill.position.set(-20,10,8); scene.add(fill);
 let surface,wire,reference,focus=new THREE.Vector3(),radius=15;
 const previews=[];
 const input=id=>document.getElementById(id);
 const error=input('raup-error');
 const format=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3});

 function readNumber(id) {
  const raw=input(id).value.trim().replace(/,/g,'.').replace(/π/g,'pi');
  if (!raw) throw new Error('Preencha todos os parâmetros e os limites dos intervalos.');
  let value;
  try { value=Number(nerdamer(raw).evaluate().valueOf()); }
  catch (exception) { throw new Error('Não foi possível interpretar um dos valores. Use números ou expressões como 2*pi.'); }
  if (!Number.isFinite(value)) throw new Error('Use números ou expressões numéricas, como 2*pi.');
  return value;
 }
 function readConfig() {
  const intervals={thetaMin:readNumber('theta-min'),thetaMax:readNumber('theta-max'),phiMin:readNumber('phi-min'),phiMax:readNumber('phi-max')};
  if (input('raup-model').value === 'evolution') {
   const seedExpressions=['seed-a','seed-b','seed-c'].map(id=>input(id).value.trim().replace(/,/g,'.').replace(/π/g,'pi'));
   const seed=seedExpressions.map(function (raw,index) {
    try {
     if (!raw) throw new Error();
     const expression=nerdamer(raw);
     if (expression.variables().some(name=>name !== 'x')) throw new Error();
     return expression.buildFunction(['x']);
    } catch (exception) {throw new Error('Revise '+['a(x)','b(x)','c(x)'][index]+'. Use apenas x, números e funções como sin(x) e cos(x).');}
   });
   return model.validate(Object.assign(intervals,{mode:'evolution',lambda:readNumber('evolution-lambda'),seed:seed,seedExpressions:seedExpressions}));
  }
  return model.validate(Object.assign(intervals,{D:readNumber('shape-d'),T:readNumber('shape-t'),W:readNumber('shape-w')}));
 }
 function showModel() {
  const evolution=input('raup-model').value === 'evolution';
  input('raup-model-description').hidden=evolution;
  input('raup-shape-fields').hidden=evolution;
  input('evolution-model-description').hidden=!evolution;
  input('evolution-fields').hidden=!evolution;
  input('growth-symbol').textContent=evolution?'t':'θ';
  input('seed-symbol').textContent=evolution?'x':'φ';
  input('turns-label').textContent=evolution?'Voltas de rotação':'Voltas de θ';
  input('growth-min-label').textContent=(evolution?'t':'θ')+' inicial';
  input('growth-max-label').textContent=(evolution?'t':'θ')+' final';
  input('seed-min-label').textContent=(evolution?'x':'φ')+' inicial';
  input('seed-max-label').textContent=(evolution?'x':'φ')+' final';
  graph.setAttribute('aria-label',evolution?'Superfície pela equação de evolução: arraste para girar e use a roda do mouse para dar zoom':'Superfície de Raup: arraste para girar e use a roda do mouse para dar zoom');
 }
 function seedFromRaup() {
  const D=readNumber('shape-d'),T=readNumber('shape-t'),W=readNumber('shape-w');
  model.validate(Object.assign({},model.defaults,{D:D,T:T,W:W}));
  input('evolution-lambda').value='('+W+')^(1/(2*pi))';
  input('seed-a').value=(2*D/(1-D)+1)+'+cos(x)';
  input('seed-b').value='0';
  input('seed-c').value=(2*T*(D/(1-D)+1))+'+sin(x)';
 }
 function putConfig(config) {
  input('shape-d').value=config.D; input('shape-t').value=config.T; input('shape-w').value=config.W;
  input('theta-min').value='0'; input('theta-max').value=(config.thetaMax/Math.PI)+'*pi';
  input('phi-min').value='0'; input('phi-max').value='2*pi';
  input('turns').value=(config.thetaMax-config.thetaMin)/(2*Math.PI);
 }
 function createGeometry(config,thetaSteps,phiSteps) {
  const data=model.sample(config,thetaSteps,phiSteps);
  const geometry=new THREE.BufferGeometry();
  geometry.addAttribute('position',new THREE.BufferAttribute(data.positions,3));
  const triangles=[];
  for (let i=0;i<thetaSteps;i++) for (let j=0;j<phiSteps;j++) {
   const a=i*(phiSteps+1)+j,b=a+phiSteps+1;
   triangles.push(a,b,a+1,b,b+1,a+1);
  }
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(triangles),1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return {geometry:geometry,data:data};
 }
 function makeWire(geometry,thetaSteps,phiSteps) {
  const positions=geometry.attributes.position;
  const lines=[];
  function segment(a,b) { lines.push(positions.getX(a),positions.getY(a),positions.getZ(a),positions.getX(b),positions.getY(b),positions.getZ(b)); }
  const thetaStride=Math.max(1,Math.round(thetaSteps/36));
  for (let i=0;i<=thetaSteps;i+=thetaStride) for (let j=0;j<phiSteps;j++) segment(i*(phiSteps+1)+j,i*(phiSteps+1)+j+1);
  for (let j=0;j<=phiSteps;j+=4) for (let i=0;i<thetaSteps;i++) segment(i*(phiSteps+1)+j,(i+1)*(phiSteps+1)+j);
  const gridGeometry=new THREE.BufferGeometry();
  gridGeometry.addAttribute('position',new THREE.BufferAttribute(new Float32Array(lines),3));
  return new THREE.LineSegments(gridGeometry,new THREE.LineBasicMaterial({color:0x986d45,transparent:true,opacity:0.32,depthWrite:false}));
 }
 function dispose(object) {
  if (!object) return;
  object.traverse(function (child) {
   if (child.geometry) child.geometry.dispose();
   if (child.material) {if(child.material.map)child.material.map.dispose();child.material.dispose();}
  });
  scene.remove(object);
 }
 function fitView() {
  const distance=radius/Math.sin(camera.fov*Math.PI/360)*1.08;
  const direction=new THREE.Vector3(1.1,-1.5,0.85).normalize();
  controls.target.copy(focus);
  camera.position.copy(focus).add(direction.multiplyScalar(distance));
  camera.near=0.05; camera.far=Math.max(2000,distance*20);
  camera.updateProjectionMatrix(); controls.update();
 }
 function updateSurface(resetView) {
  try {
   const config=readConfig();
   const turns=(config.thetaMax-config.thetaMin)/(2*Math.PI);
   const thetaSteps=Math.min(480,Math.max(144,Math.ceil(turns*64)));
   const built=createGeometry(config,thetaSteps,64);
   const nextSurface=new THREE.Mesh(built.geometry,new THREE.MeshPhongMaterial({color:0xd3a16b,side:THREE.DoubleSide,shininess:26,specular:0x33271b}));
   const nextWire=makeWire(built.geometry,thetaSteps,64);
   dispose(surface); dispose(wire); dispose(reference);
   surface=nextSurface; wire=nextWire;
   scene.add(surface); scene.add(wire);
   focus.copy(built.geometry.boundingSphere.center); radius=built.geometry.boundingSphere.radius;
   reference=new THREE.Group();
   const grid=new THREE.GridHelper(40,20,0x759194,0xc9d8d9);
   grid.rotation.x=Math.PI/2;
   grid.position.set(focus.x,focus.y,built.data.floor-0.3);
   reference.add(grid);
   scene.add(reference);
   wire.visible=input('raup-show-mesh').checked;
   reference.visible=input('raup-show-grid').checked;
   error.hidden=true;
   input('turns').value=Number(turns.toFixed(3));
   const description=config.mode === 'evolution'?'Equação de evolução · λ = '+format.format(config.lambda)+' · rotação em z':'D = '+format.format(config.D)+' · T = '+format.format(config.T)+' · W = '+format.format(config.W);
   input('raup-status').textContent=description+' · '+format.format(turns)+' voltas. Arraste para girar; use a roda para dar zoom.';
   if (resetView) fitView();
   renderer.render(scene,camera);
  } catch (exception) {
   error.textContent=exception instanceof Error ? exception.message : 'Não foi possível gerar a superfície. Revise os valores.';
   error.hidden=false;
  }
 }
 function makePreview(config,id) {
  const container=input(id);
  const previewScene=new THREE.Scene();
  previewScene.add(new THREE.AmbientLight(0xffffff,0.6));
  const previewLight=new THREE.DirectionalLight(0xffffff,0.75); previewLight.position.set(10,-20,30);previewScene.add(previewLight);
  const built=createGeometry(config,144,40);
  previewScene.add(new THREE.Mesh(built.geometry,new THREE.MeshPhongMaterial({color:config.color,side:THREE.DoubleSide,shininess:38})));
  const previewCamera=new THREE.PerspectiveCamera(38,1,0.1,1000); previewCamera.up.set(0,0,1);
  const center=built.geometry.boundingSphere.center;
  const distance=built.geometry.boundingSphere.radius/Math.sin(19*Math.PI/180)*1.08;
  previewCamera.position.copy(center).add(new THREE.Vector3(1.1,-1.5,0.85).normalize().multiplyScalar(distance)); previewCamera.lookAt(center);
  const previewRenderer=createLocalRenderer({antialias:true});
  if (previewRenderer.setPixelRatio) previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
  previewRenderer.setClearColor(0xffffff,1); container.appendChild(previewRenderer.domElement);
  previews.push({container:container,scene:previewScene,camera:previewCamera,renderer:previewRenderer});
 }
 function resize() {
  resizeLocalGraph(renderer,camera,graph,window.innerWidth<768?440:500);
  previews.forEach(function (preview) {
   const width=Math.max(1,preview.container.clientWidth),height=preview.container.clientHeight;
   preview.renderer.setSize(width,height); preview.camera.aspect=width/height; preview.camera.updateProjectionMatrix();
   preview.renderer.render(preview.scene,preview.camera);
  });
  renderer.render(scene,camera);
 }
 input('raup-form').addEventListener('submit',function (event) {event.preventDefault();updateSurface(true);});
 input('raup-fit').addEventListener('click',fitView);
 input('raup-reset').addEventListener('click',function () {putConfig(model.defaults);seedFromRaup();updateSurface(true);});
 input('raup-model').addEventListener('change',function () {showModel();updateSurface(true);});
 input('evolution-from-raup').addEventListener('click',function () {
  try {seedFromRaup();updateSurface(true);} catch (exception) {error.textContent=exception.message;error.hidden=false;}
 });
 input('turns').addEventListener('change',function () {
  const turns=Number(this.value);
  if (Number.isFinite(turns) && turns>0) {input('theta-min').value='0';input('theta-max').value='2*pi*'+turns;}
 });
 input('raup-show-mesh').addEventListener('change',function () {if(wire)wire.visible=this.checked;});
 input('raup-show-grid').addEventListener('change',function () {if(reference)reference.visible=this.checked;});
 document.querySelectorAll('[data-raup-example]').forEach(function (button) {
  button.addEventListener('click',function () {input('raup-model').value='raup';showModel();putConfig(model.examples[Number(this.dataset.raupExample)]);updateSurface(true);});
 });
 window.addEventListener('resize',resize);
 if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(graph);
 showModel();
 updateSurface(true);
 makePreview(model.examples[0],'raup-preview-flat');
 makePreview(model.examples[1],'raup-preview-tall');
 resize();
 function animate() {requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}
 animate();
})();
