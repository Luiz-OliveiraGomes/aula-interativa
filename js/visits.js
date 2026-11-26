(function () {
 'use strict';
 const widget = document.getElementById('visitor-counter');
 const number = new Intl.NumberFormat('pt-BR');
 const countries = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['pt-BR'], {type:'region'}) : null;
 const map=widget && window.AulaVisitorMap ? new window.AulaVisitorMap(document.getElementById('visitor-map')) : null;
 const expandedCountries=new Set(['LOCAL']);
 let latestData=null,onlineOnly=false;
 function countryName(item) {
  if (item.country_code === 'LOCAL') return 'Acesso local';
  if (item.country_code === 'XX') return 'Origem não identificada';
  return countries ? countries.of(item.country_code) : item.country;
 }
 function showCountries(data) {
  const tbody=document.getElementById('visitor-country-rows');tbody.replaceChildren();
  const list=data.countries.filter(item=>item.country_code!=='LOCAL'&&(!onlineOnly || Number(item.online)>0));
  if(!list.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=3;cell.textContent=onlineOnly?'Nenhum navegador ativo neste momento.':'As origens aparecerão com as primeiras visitas.';row.append(cell);tbody.append(row);}
  list.forEach(function(item){
   const row=document.createElement('tr'),name=document.createElement('td'),total=document.createElement('td'),online=document.createElement('td');
   const button=document.createElement('button');button.type='button';button.className='geo-country-button';button.setAttribute('aria-expanded',String(expandedCountries.has(item.country_code)));
   if(/^[A-Z]{2}$/.test(item.country_code)&&item.country_code!=='XX'){
    const flag=document.createElement('img');flag.src='/vendor/flags/'+item.country_code+'.svg';flag.alt='';flag.width=22;flag.height=15;button.append(flag);
   }else{const icon=document.createElement('span');icon.className='geo-local-icon';icon.textContent=item.country_code==='LOCAL'?'⌂':'?';icon.setAttribute('aria-hidden','true');button.append(icon);}
   button.append(document.createTextNode(countryName(item)));name.append(button);
   total.textContent=number.format(Number(item.visits));total.className='geo-history-number';online.textContent=number.format(Number(item.online||0));online.className='geo-online-number';
   row.append(name,total,online);tbody.append(row);
   const cities=data.cities.filter(city=>city.country_code===item.country_code&&(!onlineOnly||Number(city.online)>0));
   button.addEventListener('click',function(){if(expandedCountries.has(item.country_code))expandedCountries.delete(item.country_code);else expandedCountries.add(item.country_code);if(map)map.focus(cities.filter(city=>city.latitude!==null&&city.latitude!==undefined));showCountries(latestData);});
   if(expandedCountries.has(item.country_code))cities.forEach(function(city){
    const cityRow=document.createElement('tr'),cityCell=document.createElement('td'),totalCell=document.createElement('td'),onlineCell=document.createElement('td');cityRow.className='geo-city-row';
    const cityButton=document.createElement('button');cityButton.type='button';cityButton.className='geo-city-button';cityButton.textContent=city.city+(city.region&&city.region!==city.city?' · '+city.region:'');cityButton.addEventListener('click',()=>{if(map&&city.latitude!==null&&city.latitude!==undefined)map.focus([city]);});cityCell.append(cityButton);
    totalCell.textContent=number.format(Number(city.visits));totalCell.className='geo-history-number';onlineCell.textContent=number.format(Number(city.online||0));onlineCell.className='geo-online-number';cityRow.append(cityCell,totalCell,onlineCell);tbody.append(cityRow);
   });
  });
 }
 function render(data) {
  if (!widget || typeof data.visits !== 'number') return;
  ['visits','today','online','countries_count','pageviews'].forEach(function (key) {
   widget.querySelector('[data-visitor-stat="'+key+'"]').textContent = number.format(data[key]);
  });
  latestData=data;
  showCountries(data);
  if(map)map.setData(data.map_locations||[],onlineOnly);
  widget.querySelector('.visitor-status').textContent = 'Contador próprio do Aula Interativa. Atualizado automaticamente.';
 }
 if(widget)widget.querySelectorAll('[data-visitor-filter]').forEach(function(button){button.addEventListener('click',function(){onlineOnly=this.dataset.visitorFilter==='online';widget.querySelectorAll('[data-visitor-filter]').forEach(other=>{const selected=other===this;other.classList.toggle('active',selected);other.setAttribute('aria-pressed',String(selected));});if(latestData){showCountries(latestData);if(map)map.setData(latestData.map_locations||[],onlineOnly);}});});
 async function request(body) {
  const options = {credentials:'same-origin', cache:'no-store'};
  if (body) Object.assign(options, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  const response = await fetch('/api/visits.php', options);
  if (!response.ok) throw new Error('Contador indisponível');
  const data = await response.json();
  render(data);
 }
 const eventId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
 let started = false;
 let leaving = false;
 function leave() {
  if (leaving) return;
  leaving = true;
  const payload = JSON.stringify({type:'leave',id:eventId});
  if (navigator.sendBeacon && navigator.sendBeacon('/api/visits.php', new Blob([payload], {type:'application/json'}))) return;
  fetch('/api/visits.php', {method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body:payload}).catch(function () {});
 }
 request({type:'page',id:eventId}).catch(function () {
  if (widget) widget.querySelector('.visitor-status').textContent = 'O contador está temporariamente indisponível. As atividades continuam funcionando normalmente.';
 }).then(function () {
  started = true;
  if (document.visibilityState !== 'visible') leave();
 });
 window.addEventListener('pagehide', leave);
 window.addEventListener('pageshow', function (event) {
  if (event.persisted) { leaving = false; request({type:'ping',id:eventId}).catch(function () {}); }
 });
 document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible') {
   leaving = false;
   if (started) request({type:'ping',id:eventId}).catch(function () {});
  } else leave();
 });
 setInterval(function () {
  if (started && document.visibilityState === 'visible') request({type:'ping',id:eventId}).catch(function () {});
 }, 15000);
 if (widget) setInterval(function () {
  if (document.visibilityState === 'visible') request().catch(function () {});
 }, 10000);
})();
