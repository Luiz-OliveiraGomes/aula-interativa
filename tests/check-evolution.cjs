const assert=require('node:assert/strict');
const model=require('../conchas-raup/model.js');
const nerdamer=require('../js/nerdamer/nerdamer.core.js');
const close=(a,b)=>assert(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const evolution={...model.defaults,mode:'evolution',lambda:1,seed:[()=>2,()=>3,()=>4]};
// Rotation about z must mix both horizontal coordinates and preserve height.
model.point(evolution,Math.PI/2,0).forEach((v,i)=>close(v,[-3,2,4][i]));
const scaled={...evolution,lambda:2};
model.point(scaled,1,0).forEach((v,i)=>close(v,model.point(evolution,1,0)[i]*2));
for (const raup of [model.defaults,...model.examples]) {
 const seed=[x=>2*raup.D/(1-raup.D)+1+Math.cos(x),()=>0,x=>2*raup.T*(raup.D/(1-raup.D)+1)+Math.sin(x)];
 const equivalent={...raup,mode:'evolution',lambda:Math.pow(raup.W,1/(2*Math.PI)),seed};
 for(const t of [0,0.4,Math.PI/2,2*Math.PI,6*Math.PI]) for(const x of [0,1.3,Math.PI,2*Math.PI]) {
  model.point(equivalent,t,x).forEach((v,i)=>close(v,model.point(raup,t,x)[i]));
 }
 const sampled=model.sample(equivalent,192,64);
 assert(sampled.positions.every(Number.isFinite));
}
// Parse the expressions actually presented in the form with the bundled parser.
const initialSeed=['-3+cos(x)','0','-6+sin(x)'].map(raw=>nerdamer(raw).buildFunction(['x']));
const initialLambda=Number(nerdamer('0.5^(1/(2*pi))').evaluate().valueOf());
const initial={...evolution,lambda:initialLambda,seed:initialSeed};
model.point(initial,2*Math.PI,0).forEach((v,i)=>close(v,[-1,0,-3][i]));
assert.throws(()=>model.validate({...initial,lambda:0}),/λ deve/);
assert.throws(()=>model.validate({...initial,lambda:-1}),/λ deve/);
assert.throws(()=>model.validate({...initial,lambda:1e100}),/escala extrema/);
assert.throws(()=>model.sample({...initial,seed:[()=>NaN,()=>0,()=>0]},12,12),/reais e finitas/);
assert.throws(()=>model.sample({...initial,seed:[()=>0,()=>0,()=>0]},12,12),/superfície visível/);
console.log('Evolução: rotação em z, escala, equivalência com Raup, expressões iniciais e entradas inválidas aprovadas.');
