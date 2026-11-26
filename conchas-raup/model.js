(function (root, factory) {
 'use strict';
 if (typeof module === 'object' && module.exports) module.exports = factory();
 else root.RaupModel = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
 'use strict';
 const defaults = {D:2, T:3, W:0.5, thetaMin:0, thetaMax:6*Math.PI, phiMin:0, phiMax:2*Math.PI};
 const examples = [
  {name:'Chifre de bode', D:2, T:3, W:0.5, thetaMin:0, thetaMax:6*Math.PI, phiMin:0, phiMax:2*Math.PI, color:0xd6a260},
  {name:'Concha em expansão', D:0.5, T:0.4, W:2, thetaMin:0, thetaMax:6*Math.PI, phiMin:0, phiMax:2*Math.PI, color:0x4b9b9c}
 ];
 function validate(config) {
  const evolution=config.mode === 'evolution';
  for (const name of (evolution ? ['lambda','thetaMin','thetaMax','phiMin','phiMax'] : ['D','T','W','thetaMin','thetaMax','phiMin','phiMax'])) {
   if (!Number.isFinite(config[name])) throw new Error('Preencha os parâmetros e os intervalos com números válidos.');
  }
  if (evolution) {
   if (config.lambda <= 0) throw new Error('λ deve ser positivo para definir λ elevado a t em todo o intervalo.');
   if (!Array.isArray(config.seed) || config.seed.length !== 3 || config.seed.some(fn=>typeof fn !== 'function')) throw new Error('Defina as três coordenadas da curva inicial y₀(x).');
  } else {
   if (config.D < 0 || config.D === 1) throw new Error('D deve ser maior ou igual a 0 e diferente de 1. Em D = 1, as equações não estão definidas.');
   if (config.W <= 0) throw new Error('W deve ser positivo.');
  }
  if (config.thetaMax <= config.thetaMin || config.phiMax <= config.phiMin) throw new Error('O limite final de cada intervalo deve ser maior que o inicial.');
  if ((config.thetaMax-config.thetaMin)/(2*Math.PI) > 20 + 1e-8) throw new Error('Use até 20 voltas para manter a visualização fluida.');
  const logScale=evolution ? Math.log(config.lambda) : Math.log(config.W)/(2*Math.PI);
  const exponent = Math.max(Math.abs(config.thetaMin*logScale), Math.abs(config.thetaMax*logScale));
  if (exponent > 200) throw new Error('O fator de escala e o intervalo geram uma escala extrema. Reduza o fator ou o intervalo.');
  return config;
 }
 function point(config, theta, phi) {
  if (config.mode === 'evolution') {
   const seed=config.seed.map(fn=>fn(phi));
   if (seed.some(value=>typeof value !== 'number' || !Number.isFinite(value))) throw new Error('A curva inicial deve produzir três coordenadas reais e finitas em todo o intervalo de x.');
   const factor=Math.pow(config.lambda,theta), c=Math.cos(theta), s=Math.sin(theta);
   return [factor*(c*seed[0]-s*seed[1]),factor*(s*seed[0]+c*seed[1]),factor*seed[2]];
  }
  const expansion = Math.pow(config.W, theta/(2*Math.PI));
  const radius = 2*config.D/(1-config.D) + 1 + Math.cos(phi);
  return [
   expansion*radius*Math.cos(theta),
   expansion*radius*Math.sin(theta),
   expansion*(2*config.T*(config.D/(1-config.D)+1)+Math.sin(phi))
  ];
 }
 function sample(config, thetaSteps, phiSteps) {
  validate(config);
  const raw = new Float64Array((thetaSteps+1)*(phiSteps+1)*3);
  const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
  for (let i=0;i<=thetaSteps;i++) for (let j=0;j<=phiSteps;j++) {
   const p=point(config,config.thetaMin+(config.thetaMax-config.thetaMin)*i/thetaSteps,config.phiMin+(config.phiMax-config.phiMin)*j/phiSteps);
   for (let axis=0;axis<3;axis++) {
    if (!Number.isFinite(p[axis])) throw new Error('Os parâmetros geraram uma coordenada inválida. Revise os valores.');
    raw[3*(i*(phiSteps+1)+j)+axis]=p[axis];
    min[axis]=Math.min(min[axis],p[axis]); max[axis]=Math.max(max[axis],p[axis]);
   }
  }
  const scale=Math.max(...max.map((value,i)=>value-min[i]))/20;
  if (!(scale>1e-100)) throw new Error('Esse intervalo não produz uma superfície visível. Revise a curva ou amplie os intervalos.');
  const positions=Float32Array.from(raw,value=>value/scale);
  return {positions:positions,scale:scale,center:min.map((value,i)=>(value+max[i])/(2*scale)),floor:min[2]/scale,turns:(config.thetaMax-config.thetaMin)/(2*Math.PI)};
 }
 return {defaults:defaults,examples:examples,validate:validate,point:point,sample:sample};
});
