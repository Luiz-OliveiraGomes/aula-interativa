(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.AulaCoordinates=model;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';const TAU=2*Math.PI,EPS=1e-10;
 function wrap(angle){return ((angle%TAU)+TAU)%TAU;}
 function sphere(r,theta,phi){return [r*Math.sin(theta)*Math.cos(phi),r*Math.sin(theta)*Math.sin(phi),r*Math.cos(theta)];}
 function spherical(point,reference={theta:0,phi:0}){const [x,y,z]=point,r=Math.hypot(x,y,z),rho=Math.hypot(x,y);return {r,theta:r<EPS?reference.theta:Math.acos(Math.max(-1,Math.min(1,z/r))),phi:rho<EPS?reference.phi:wrap(Math.atan2(y,x)),singular:r<EPS||rho<EPS};}
 function cylinder(r,phi,z){return [r*Math.cos(phi),r*Math.sin(phi),z];}
 function cylindrical(point,reference={phi:0}){const [x,y,z]=point,r=Math.hypot(x,y);return {r,phi:r<EPS?reference.phi:wrap(Math.atan2(y,x)),z,singular:r<EPS};}
 function sphereProjection(point,state){const actual=spherical(point,state);return {...state,theta:state.mode==='theta'?state.theta:actual.theta,phi:state.mode==='phi'?state.phi:actual.phi};}
 return {TAU,EPS,wrap,sphere,spherical,cylinder,cylindrical,sphereProjection};
});
