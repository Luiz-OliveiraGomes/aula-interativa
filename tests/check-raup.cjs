const assert=require('node:assert/strict');
const model=require('../conchas-raup/model.js');
const config={...model.defaults,D:0.5,T:0.25,W:4};
function close(actual,expected){assert(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);}
model.point(config,0,0).forEach((value,index)=>close(value,[4,0,1][index]));
model.point(config,2*Math.PI,0).forEach((value,index)=>close(value,[16,0,4][index]));
model.validate(model.defaults);
model.point(model.defaults,0,0).forEach((value,index)=>close(value,[-2,0,-6][index]));
model.point(model.defaults,2*Math.PI,0).forEach((value,index)=>close(value,[-1,0,-3][index]));
// Cada volta completa multiplica as três coordenadas por W.
const before=model.point(config,0.7,1.1),after=model.point(config,0.7+2*Math.PI,1.1);
before.forEach((value,index)=>close(after[index],value*config.W));
const up=model.point({...config,T:0.6},0,0),down=model.point({...config,T:-0.6},0,0);
close(up[2],-down[2]);
for(const current of [model.defaults,...model.examples]){
 const sampled=model.sample(current,192,64);
 assert.equal(sampled.positions.length,193*65*3);
 assert(Array.from(sampled.positions).every(Number.isFinite));
 assert(sampled.scale>0);
}
assert.throws(()=>model.validate({...config,D:1}),/D deve/);
assert.throws(()=>model.validate({...config,W:0}),/W deve/);
assert.throws(()=>model.validate({...config,thetaMax:0}),/limite final/);
assert.throws(()=>model.validate({...config,thetaMax:10000}),/20 voltas/);
console.log('Raup: equações da imagem, expansão por volta, sinal de T, exemplos e entradas inválidas aprovados.');
