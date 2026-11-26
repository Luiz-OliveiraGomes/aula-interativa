(function () {
 'use strict';
 const ns='http://www.w3.org/2000/svg';
 const width=1000,height=500;
 function node(tag,attributes){const element=document.createElementNS(ns,tag);Object.entries(attributes||{}).forEach(([key,value])=>element.setAttribute(key,value));return element;}
 function project(longitude,latitude){return [(longitude+180)*width/360,(90-latitude)*height/180];}
 class VisitorMap {
  constructor(container){
   this.container=container;this.locations=[];this.onlineOnly=false;this.view={x:0,y:0,w:width,h:height};this.drag=null;this.mapState='loading';
   this.svg=node('svg',{viewBox:'0 0 1000 500',role:'img','aria-label':'Mapa-múndi das origens aproximadas dos visitantes'});
   this.svg.append(node('rect',{x:0,y:0,width:1000,height:500,fill:'#dfeef3'}));
   const grid=node('g',{'class':'geo-map-grid'});
   for(let lon=-180;lon<=180;lon+=45){const x=project(lon,0)[0];grid.append(node('path',{d:'M'+x+' 0V500'}));}
   for(let lat=-60;lat<=60;lat+=30){const y=project(0,lat)[1];grid.append(node('path',{d:'M0 '+y+'H1000'}));}
   this.land=node('g',{'class':'geo-map-land'});this.points=node('g',{'class':'geo-map-points'});
   this.svg.append(grid,this.land,this.points);container.prepend(this.svg);
   this.message=container.querySelector('.geo-map-message');
   fetch('/vendor/maps/world.json?v=20261126-2',{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error();return response.json();}).then(data=>{
    data.features.forEach(feature=>{
     const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
     const d=polygons.map(polygon=>polygon.map(ring=>ring.map((point,index)=>{const p=project(point[0],point[1]);return(index?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2);}).join('')+'Z').join('')).join('');
     const path=node('path',{d:d,'fill-rule':'evenodd','data-country':feature.properties.code});
     const title=node('title');title.textContent=feature.properties.name;path.append(title);this.land.append(path);
    });
    this.mapState='ready';this.updateMessage();
   }).catch(()=>{this.mapState='failed';this.updateMessage();});
   this.svg.addEventListener('wheel',event=>{event.preventDefault();this.zoom(event.deltaY<0?1.3:1/1.3);},{passive:false});
   this.svg.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;this.drag={px:event.clientX,py:event.clientY,x:this.view.x,y:this.view.y};this.svg.setPointerCapture(event.pointerId);this.svg.classList.add('is-dragging');
   });
   this.svg.addEventListener('pointermove',event=>{
    if(!this.drag)return;const rect=this.svg.getBoundingClientRect();this.view.x=this.drag.x-(event.clientX-this.drag.px)*this.view.w/rect.width;this.view.y=this.drag.y-(event.clientY-this.drag.py)*this.view.h/rect.height;this.updateView();
   });
   ['pointerup','pointercancel','lostpointercapture'].forEach(type=>this.svg.addEventListener(type,()=>{this.drag=null;this.svg.classList.remove('is-dragging');}));
   container.parentElement.querySelector('[data-map-zoom="in"]').addEventListener('click',()=>this.zoom(1.5));
   container.parentElement.querySelector('[data-map-zoom="out"]').addEventListener('click',()=>this.zoom(1/1.5));
   container.parentElement.querySelector('[data-map-reset]').addEventListener('click',()=>this.reset());
  }
  updateView(){
   this.view.x=Math.max(-this.view.w*0.1,Math.min(width-this.view.w*0.9,this.view.x));
   this.view.y=Math.max(-this.view.h*0.1,Math.min(height-this.view.h*0.9,this.view.y));
   this.svg.setAttribute('viewBox',[this.view.x,this.view.y,this.view.w,this.view.h].join(' '));this.drawPoints();
  }
  zoom(factor){
   const next=Math.max(25,Math.min(1000,this.view.w/factor));const cx=this.view.x+this.view.w/2,cy=this.view.y+this.view.h/2;
   this.view={x:cx-next/2,y:cy-next/4,w:next,h:next/2};this.updateView();
  }
  reset(){this.view={x:0,y:0,w:1000,h:500};this.updateView();}
  focus(locations){
   const valid=locations.filter(location=>Number.isFinite(Number(location.latitude))&&location.latitude!==null&&location.longitude!==null);
   if(!valid.length)return;
   const coordinates=valid.map(location=>project(Number(location.longitude),Number(location.latitude)));
   const xs=coordinates.map(p=>p[0]),ys=coordinates.map(p=>p[1]);
   const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
   const w=Math.max(90,Math.min(1000,Math.max(x1-x0,(y1-y0)*2)*1.8));
   this.view={x:(x0+x1-w)/2,y:(y0+y1-w/2)/2,w:w,h:w/2};this.updateView();
  }
  setData(locations,onlineOnly){this.locations=locations||[];this.onlineOnly=onlineOnly;this.drawPoints();}
  drawPoints(){
   this.points.replaceChildren();
   const locations=this.locations.filter(location=>!this.onlineOnly||Number(location.online)>0);
   locations.forEach(location=>{
    const p=project(Number(location.longitude),Number(location.latitude));
    const circle=node('circle',{cx:p[0],cy:p[1],r:(4+Math.min(4,Math.log2(Number(location.visits)+1)))*this.view.w/1000,fill:Number(location.online)>0?'#26944f':'#da6b8b',stroke:'#fff','stroke-width':1.5,'vector-effect':'non-scaling-stroke',tabindex:0,role:'button','aria-label':location.city+': '+location.visits+' visitas, '+location.online+' ativos'});
    const title=node('title');title.textContent=location.city+', '+location.country+' — '+location.visits+' visitas; '+location.online+' ativos';circle.append(title);
    circle.addEventListener('click',()=>this.focus([location]));
    circle.addEventListener('keydown',event=>{if(event.key==='Enter')this.focus([location]);});this.points.append(circle);
   });
   this.updateMessage();
  }
  updateMessage(){
   if(!this.message)return;
   if(this.mapState==='loading'){this.message.hidden=false;this.message.textContent='Carregando o mapa-múndi…';return;}
   if(this.mapState==='failed'){this.message.hidden=false;this.message.textContent='Não foi possível carregar o desenho dos países. Recarregue a página para tentar novamente.';return;}
   const visible=this.locations.filter(location=>!this.onlineOnly||Number(location.online)>0);
   this.message.hidden=visible.length>0;
   this.message.textContent=this.onlineOnly?'Nenhum acesso externo ativo localizado neste momento.':'As origens aparecerão com as primeiras visitas.';
  }
 }
 window.AulaVisitorMap=VisitorMap;
})();
