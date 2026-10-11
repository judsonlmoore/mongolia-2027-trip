import {addDays,buildSchedule,decodePlan,encodePlan,escapeHtml as e,formatDate,getLeg,hoursLabel,safeUrl,scheduleMessage,validatePlan} from './core.mjs';
const $ = selector => document.querySelector(selector);
const STORAGE_KEY = 'mongolia-2027-plan-v1';
let original,plan,destinations,geometry,photos,places,schedule,legs,map,routeGroup,selected=1,draft,filter='all',versionLabel='Original shared plan',toastTimer;
const euro = value => new Intl.NumberFormat('en-GB',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(value);
const external = (url,label) => safeUrl(url) ? `<a href="${e(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${e(label)} ↗</a>` : '';
const readJson = async path => { const response=await fetch(path); if(!response.ok) throw new Error(`Could not load ${path}.`); return response.json(); };
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent=message; $('#toast').hidden=false; toastTimer=setTimeout(()=>$('#toast').hidden=true,4500); }
function storageRead() { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } }
function saveLocally() { try { localStorage.setItem(STORAGE_KEY,JSON.stringify(plan)); return true; } catch { toast('Changes are active. Browser storage is unavailable; export or copy a link to keep them.'); return false; } }
function updatePlaces(currentPlan) { const merged=Object.create(null); for(const [id,place] of Object.entries(destinations)) merged[id]={...place,...geometry.places[id],name:place.name,shortName:place.shortName}; for(const place of currentPlan.customPlaces) merged[place.id]={...place,shortName:place.name,region:'A NEW CHAPTER',description:'A destination added to this version of the plan. Verify its map pin, access, accommodation, and connecting roads before travel.',highlights:['Access to research','Accommodation to arrange'],terrain:'Connecting road and local conditions to research'}; return merged; }
function dateRange(visit) { return visit.nights===1 ? formatDate(visit.start) : `${formatDate(visit.start)} – ${formatDate(visit.lastNight)}`; }
function photoMarkup(id,className='stop-photo') { const photo=photos[id]; return photo ? `<img class="${className}" src="assets/photos/${e(photo.filename)}" alt="${e(photo.caption)}" width="${photo.width}" height="${photo.height}" loading="lazy">` : `<div class="day-initial" aria-hidden="true">↟</div>`; }
function photoCredit(id) { const photo=photos[id]; return photo ? `<p class="photo-credit">${e(photo.author)} · ${external(photo.licenseUrl,photo.license)} · ${external(photo.sourceUrl,'Photo source')}</p>` : '<p class="photo-credit">No photograph selected for this custom destination.</p>'; }
function render() {
  places=updatePlaces(plan); schedule=buildSchedule(plan); selected=Math.min(selected,plan.stops.length-1);
  legs=schedule.visits.slice(1).map(visit=>({...getLeg(plan.stops[visit.index-1].placeId,visit.placeId,geometry,places,visit),visitIndex:visit.index,date:visit.start,fromId:plan.stops[visit.index-1].placeId,toId:visit.placeId}));
  document.title=`Mongolia · ${formatDate(plan.startDate,{year:'numeric'})}`;
  $('.wordmark-year').textContent=`/ ${plan.startDate.slice(0,4)}`;
  $('.hero-eyebrow').textContent=`${plan.people===4?'FOUR':plan.people} FRIENDS. ONE OPEN ROAD.`;
  $('#hero-title').innerHTML=e(plan.title).replace(', ', ',<br><em>')+(plan.title.includes(', ')?'</em>':'');
  $('#trip-strip').innerHTML=[['THE DATES',`${formatDate(plan.startDate)} – ${formatDate(plan.endDate,{year:'numeric'})}`],['THE COMPANY',`${plan.people} friends · ${Math.ceil(plan.people/4)} 4×4${plan.people>4?'s':''}`],['THE PACE',`${schedule.tripDays} travel days · ${schedule.nights} nights`],['THE BUDGET',`${euro(plan.stayBudget+plan.otherBudget)} / person / day`]].map(([label,value])=>`<div><span class="strip-label">${e(label)}</span><span class="strip-value">${e(value)}</span></div>`).join('');
  const roadLegs=legs.filter(leg=>leg.geometryKind==='road'),km=Math.round(roadLegs.reduce((sum,leg)=>sum+(leg.routedKm||0),0));
  $('#route-summary').textContent=`${legs.filter(leg=>leg.geometryKind!=='same').length} driving stages · ${km.toLocaleString('en-GB')} km of mapped roads${legs.some(leg=>leg.geometryKind==='approximate')?' + unrouted connections':''}`;
  $('.route-section .section-intro>p').textContent=legs.some(leg=>leg.key==='orkhon-tsenkher')?'Click a stop or a driving stage to explore it. We take the longer road from Orkhon to Tsenkher, with time to settle in along the way.':'Click a stop or a driving stage to explore it. Dashed connections need a researched road route before travel.';
  $('#budget-details').innerHTML=[['Group trip allowance',euro((plan.stayBudget+plan.otherBudget)*schedule.tripDays*plan.people)],['Accommodation target',`${euro(plan.stayBudget)} / person / night`],['Other daily allowance',`${euro(plan.otherBudget)} / person`]].map(([label,value])=>`<div class="budget-line"><span>${e(label)}</span><strong>${e(value)}</strong></div>`).join('');
  $('#version-label').textContent=versionLabel;
  const firstDrive=legs.find(leg=>leg.geometryKind!=='same');
  $('#vehicle-plan').textContent=`A Land Cruiser or Prado with low range, sensible luggage, and supplier-provided recovery equipment.${firstDrive?` Planned collection: ${formatDate(firstDrive.date)}. Return: ${formatDate(schedule.visits.at(-1).start)}.`:''}`;
  const stayParts=[['orkhon','with a herder family in Orkhon'],['tsenkher','at the hot springs'],['terkhiin','beside the Great White Lake'],['terelj','in Terelj']].map(([id,label])=>{const nights=plan.stops.filter(stop=>stop.placeId===id).reduce((sum,stop)=>sum+stop.nights,0);return nights?`${nights} night${nights===1?'':'s'} ${label}`:null;}).filter(Boolean);
  $('#stay-plan').textContent=stayParts.length?`${stayParts.join('; ')}. Choose the exact camps, family hosts, and hotel upgrades before booking.`:'Choose family stays, comfortable camps, and occasional hotel upgrades to suit this route.';
  $('.footer-top .wordmark').textContent=`↟ MONGOLIA / ${plan.startDate.slice(0,4)}`;
  $('.status-tag').textContent=`${plan.startDate.slice(0,4)} dates unconfirmed`;
  $('#itinerary-title').textContent='The days, loosely planned.';
  $('.itinerary-section .section-intro>p').textContent=`Leave Berlin on ${formatDate(plan.startDate)}. Be home on ${formatDate(plan.endDate)}. Everything in between is a plan we can keep shaping.`;
  const warning=scheduleMessage(schedule,plan.endDate); $('#schedule-warning').textContent=schedule.difference?warning:''; $('#schedule-warning').hidden=schedule.difference===0;
  renderMap(); renderStages(); renderStop(); renderItinerary();
}
function renderMap() {
  if(!window.L){$('#map').hidden=true;$('#map-fallback').hidden=false;return;}
  if(!map){
    map=L.map('map',{scrollWheelZoom:false,zoomControl:true,preferCanvas:false}).setView([47.5,103.8],7);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    routeGroup=L.featureGroup().addTo(map);
  }
  routeGroup.clearLayers();
  let selectedLine;
  for(const leg of legs){
    if(leg.coordinates.length<2)continue;
    // A wide invisible target makes narrow road lines usable without changing their appearance.
    L.polyline(leg.coordinates,{weight:18,opacity:0}).on('click',()=>selectVisit(leg.visitIndex)).addTo(routeGroup);
    const active=leg.visitIndex===selected;
    const line=L.polyline(leg.coordinates,{color:active?'#bc633c':leg.geometryKind==='approximate'?'#64716a':'#254a40',weight:active?5:3,opacity:active?1:.7,dashArray:leg.geometryKind==='approximate'?'7 7':null}).on('click',()=>selectVisit(leg.visitIndex));
    line.bindTooltip(`${e(places[leg.fromId].shortName)} → ${e(places[leg.toId].shortName)} · ${e(hoursLabel(leg.hours))}`,{className:'route-tooltip',sticky:true}); line.addTo(routeGroup); if(active)selectedLine=line;
  }
  // Outbound and return stages share roads; keep the selected trace visible above both.
  if(selectedLine)selectedLine.bringToFront();
  const seen=new Set();
  for(const visit of schedule.visits){
    if(seen.has(visit.placeId))continue;seen.add(visit.placeId);
    const place=places[visit.placeId],active=schedule.visits[selected].placeId===visit.placeId;
    const label=visit.placeId==='ulaanbaatar'?'UB':String(visit.index+1);
    const icon=L.divIcon({html:`<div class="route-marker ${active?'selected':''} ${visit.placeId==='ulaanbaatar'?'city':''}">${e(label)}</div>`,className:'',iconSize:active?[32,32]:[28,28],iconAnchor:active?[16,16]:[14,14]});
    const marker=L.marker([place.lat,place.lng],{icon,title:place.name,alt:place.name}).on('click',()=>selectVisit(visit.index));
    marker.bindTooltip(e(place.name),{className:'route-tooltip'}).addTo(routeGroup);
  }
  if(!map._tripFitted){fitRoute();map._tripFitted=true;}
}
function fitRoute(){if(map&&routeGroup.getLayers().length)map.fitBounds(routeGroup.getBounds(),{padding:[28,28],maxZoom:8});}
function selectVisit(index,{fit=false,scroll=false}={}){
  selected=Math.max(0,Math.min(index,schedule.visits.length-1));renderMap();renderStages();renderStop();
  if(fit&&map){const leg=legs.find(leg=>leg.visitIndex===selected);if(leg&&leg.coordinates.length>1)map.fitBounds(L.latLngBounds(leg.coordinates),{padding:[40,40],maxZoom:9});else map.setView([places[schedule.visits[selected].placeId].lat,places[schedule.visits[selected].placeId].lng],9);}
  if(scroll)$('#route').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
function renderStages(){
  $('#stage-list').innerHTML=legs.map((leg,index)=>`<button class="stage-button ${selected===leg.visitIndex?'selected':''}" data-stage="${leg.visitIndex}" aria-pressed="${selected===leg.visitIndex}"><span class="stage-number">${String(index+1).padStart(2,'0')}</span><span class="stage-name">${e(places[leg.fromId].shortName)} <span aria-hidden="true">→</span> ${e(places[leg.toId].shortName)}</span><span class="stage-meta">${e(formatDate(leg.date))}<br>${e(hoursLabel(leg.hours))}</span></button>`).join('');
}
function renderStop(){
  const visit=schedule.visits[selected],place=places[visit.placeId],leg=legs.find(leg=>leg.visitIndex===selected);
  const distance=leg?.routedKm!==null&&leg?.routedKm!==undefined?` · ${Math.round(leg.routedKm)} mapped km`:'';
  $('#stop-panel').innerHTML=`${photoMarkup(visit.placeId)}${photoCredit(visit.placeId)}<p class="eyebrow">${e(place.region)}</p><h3>${e(place.name)}</h3><p class="stop-date">${e(dateRange(visit))} · ${visit.nights} night${visit.nights===1?'':'s'}</p><p class="stop-description">${e(place.description)}</p><div class="stop-tags">${place.highlights.map(label=>`<span>${e(label)}</span>`).join('')}</div><div class="stop-facts">${leg?`<div class="stop-fact"><span class="stop-fact-label">DRIVE FROM ${e(places[leg.fromId].shortName)}</span><strong>${e(hoursLabel(leg.hours)+distance)}</strong></div>`:''}<div class="stop-fact"><span class="stop-fact-label">THE STAY · TO BE CONFIRMED</span><strong>${e(visit.stay)}</strong></div><div class="stop-fact"><span class="stop-fact-label">THE TERRAIN</span><strong>${e(place.terrain)}</strong></div></div>${leg?.notes?`<details class="road-note"><summary>Road trace & access notes</summary><p>${e(leg.notes)}</p></details>`:''}<p class="stop-notes">${e(visit.notes)}</p><div class="stop-actions"><div>${external(place.stayUrl||place.sourceUrl,place.stayLabel||place.sourceLabel||'Destination information')}</div><div class="stop-nav"><button data-previous aria-label="Previous stop" ${selected===0?'disabled':''}>←</button><button data-next aria-label="Next stop" ${selected===schedule.visits.length-1?'disabled':''}>→</button></div></div>`;
}
function itineraryDays(){
  const days=[{date:plan.startDate,kind:'flight',title:'Berlin → Mongolia',text:'Overnight outbound flight. Confirm a connection that arrives the following day.',stay:'On the flight'}];
  for(const visit of schedule.visits){
    const place=places[visit.placeId],leg=legs.find(leg=>leg.visitIndex===visit.index);
    for(let offset=0;offset<visit.nights;offset++){
      const driving=offset===0&&visit.index>0&&leg.geometryKind!=='same';
      days.push({date:addDays(visit.start,offset),kind:visit.index===0&&offset===0?'arrival':driving?'drive':'slow',title:offset===0?place.name:`A full day in ${place.shortName}`,text:offset===0?visit.notes:(place.dayIdeas?.[offset-1]||'A flexible day for local walks, time with hosts, and whatever the weather allows. See the stop notes for our plans.'),stay:visit.stay,visitIndex:visit.index,placeId:visit.placeId,hours:driving?leg.hours:null,driving});
    }
  }
  // The overnight plan and booked travel window can diverge while friends explore alternatives.
  days.push({date:schedule.departure,kind:'flight',title:'Mongolia → Berlin',text:`Planned departure after the final overnight. Choose flights that land in Berlin on ${formatDate(plan.endDate)}; flight timings still need confirmation.`,stay:'Home, if connections fit'});
  return days;
}
function renderItinerary(){
  const days=itineraryDays(),filtered=days.filter(day=>filter==='all'||(filter==='drive'?day.kind==='drive':day.kind==='slow'));
  $('#itinerary-list').innerHTML=filtered.map(day=>{const dayNum=days.findIndex(item=>item===day)+1;return `<article class="itinerary-row"><div class="day-date">${e(formatDate(day.date))}<span>DAY ${String(dayNum).padStart(2,'0')}</span></div>${day.placeId?photoMarkup(day.placeId,'day-photo'):'<div class="day-initial" aria-hidden="true">↗</div>'}<div class="day-content"><h3>${day.visitIndex!==undefined?`<button data-visit="${day.visitIndex}">${e(day.title)}</button>`:e(day.title)}</h3><p>${day.driving?`${e(hoursLabel(day.hours))} of driving · `:''}${e(day.text)}</p></div><div class="day-sleep"><strong>${day.kind==='flight'?'TRAVEL':'SLEEP'}</strong>${e(day.stay)}</div></article>`;}).join('')||'<p class="notice">No days match this filter.</p>';
}
function renderCredits(){
  $('#credits-list').innerHTML=Object.entries(photos).filter(([id])=>id!=='hero').map(([id,photo])=>`<div class="credit-row">${photoMarkup(id,'credit-photo')}<div><h3>${e(photo.caption)}</h3><p>${e(photo.author)} · ${external(photo.licenseUrl,photo.license)} · ${external(photo.sourceUrl,'Original photo')}</p><p>${e(photo.modifications)}</p></div></div>`).join('');
}
function editorSettings(){return {...draft,startDate:$('#editor-form').elements.startDate.value,endDate:$('#editor-form').elements.endDate.value,people:Number($('#editor-form').elements.people.value),stayBudget:Number($('#editor-form').elements.stayBudget.value),otherBudget:Number($('#editor-form').elements.otherBudget.value)};}
function updateEditorMessage(){try{const clean=validatePlan(editorSettings(),Object.keys(destinations)),message=scheduleMessage(buildSchedule(clean),clean.endDate);$('#editor-message').textContent=message;$('#editor-message').classList.toggle('warning',buildSchedule(clean).difference!==0);}catch(error){$('#editor-message').textContent=error.message;$('#editor-message').classList.add('warning');}}
function renderEditorStops(){
  const draftPlaces=updatePlaces(draft);
  $('#editor-stops').innerHTML=draft.stops.map((stop,index)=>{const locked=index===0||index===draft.stops.length-1;return `<div class="edit-stop" data-index="${index}"><div class="edit-stop-top"><div class="edit-stop-title">${e(draftPlaces[stop.placeId].name)}${locked?'<span>Flight city · keep this stop</span>':''}</div><label>Nights<input type="number" min="1" max="14" required value="${stop.nights}" data-field="nights"></label><div class="edit-stop-controls"><button type="button" data-move="-1" aria-label="Move ${e(draftPlaces[stop.placeId].name)} earlier" ${locked||index===1?'disabled':''}>↑</button><button type="button" data-move="1" aria-label="Move ${e(draftPlaces[stop.placeId].name)} later" ${locked||index===draft.stops.length-2?'disabled':''}>↓</button><button type="button" data-remove aria-label="Remove ${e(draftPlaces[stop.placeId].name)}" ${locked?'disabled':''}>×</button></div></div><details><summary>Accommodation, notes & driving time</summary><div class="edit-stop-extra"><label>Notes<textarea maxlength="1500" data-field="notes">${e(stop.notes)}</textarea></label><label>Accommodation<input maxlength="200" data-field="stay" value="${e(stop.stay)}"></label><label>Drive hours (optional override)<div class="coordinate-fields"><input type="number" min="0" max="24" step="0.5" data-field="driveMin" value="${stop.driveMin??''}" aria-label="Minimum driving hours"><input type="number" min="0" max="24" step="0.5" data-field="driveMax" value="${stop.driveMax??''}" aria-label="Maximum driving hours"></div></label></div></details></div>`;}).join('');
  $('#new-destination').innerHTML=Object.entries(draftPlaces).map(([id,place])=>`<option value="${e(id)}">${e(place.name)}</option>`).join('')+'<option value="new">Add a new destination…</option>';
  updateEditorMessage();
}
function openEditor(){draft=structuredClone(plan);const fields=$('#editor-form').elements;for(const key of ['startDate','endDate','people','stayBudget','otherBudget'])fields[key].value=draft[key];$('#add-stop-fields').hidden=true;$('#custom-place-fields').hidden=true;renderEditorStops();$('#editor').showModal();}
function applyPlan(raw,label){plan=validatePlan(raw,Object.keys(destinations));versionLabel=label;saveLocally();selected=Math.min(selected,plan.stops.length-1);history.replaceState(null,'',location.pathname+location.search);render();fitRoute();}
function installEvents(){
  $('#edit-plan').addEventListener('click',openEditor);$('#fit-route').addEventListener('click',fitRoute);
  document.addEventListener('click',event=>{const close=event.target.closest('[data-close]');if(close)$(`#${close.dataset.close}`).close();});
  $('#stage-list').addEventListener('click',event=>{const target=event.target.closest('[data-stage]');if(target)selectVisit(Number(target.dataset.stage),{fit:true,scroll:true});});
  $('#stop-panel').addEventListener('click',event=>{if(event.target.closest('[data-previous]'))selectVisit(selected-1,{fit:true});if(event.target.closest('[data-next]'))selectVisit(selected+1,{fit:true});});
  $('#itinerary-list').addEventListener('click',event=>{const target=event.target.closest('[data-visit]');if(target)selectVisit(Number(target.dataset.visit),{fit:true,scroll:true});});
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));});renderItinerary();}));
  $('#print-plan').addEventListener('click',()=>{const old=filter;filter='all';renderItinerary();window.print();filter=old;renderItinerary();});
  $('#photo-credits').addEventListener('click',()=>$('#credits').showModal());
  $('#editor-form').addEventListener('input',event=>{const row=event.target.closest('.edit-stop');if(row&&event.target.dataset.field){const field=event.target.dataset.field;if(field==='nights')draft.stops[Number(row.dataset.index)][field]=Number(event.target.value);else if(field.startsWith('drive')){if(event.target.value==='')delete draft.stops[Number(row.dataset.index)][field];else draft.stops[Number(row.dataset.index)][field]=Number(event.target.value);}else draft.stops[Number(row.dataset.index)][field]=event.target.value;}updateEditorMessage();});
  $('#editor-stops').addEventListener('click',event=>{const row=event.target.closest('.edit-stop');if(!row)return;const index=Number(row.dataset.index),move=event.target.closest('[data-move]');if(move&&!move.disabled){const other=index+Number(move.dataset.move);[draft.stops[index],draft.stops[other]]=[draft.stops[other],draft.stops[index]];for(let affected=Math.min(index,other);affected<=Math.max(index,other)+1;affected++){if(draft.stops[affected]){delete draft.stops[affected].driveMin;delete draft.stops[affected].driveMax;}}renderEditorStops();}if(event.target.closest('[data-remove]')&&!event.target.closest('[data-remove]').disabled){draft.stops.splice(index,1);if(draft.stops[index]){delete draft.stops[index].driveMin;delete draft.stops[index].driveMax;}renderEditorStops();}});
  $('#add-stop').addEventListener('click',()=>$('#add-stop-fields').hidden=!$('#add-stop-fields').hidden);
  $('#new-destination').addEventListener('change',()=>$('#custom-place-fields').hidden=$('#new-destination').value!=='new');
  $('#confirm-add-stop').addEventListener('click',()=>{try{const candidate=structuredClone(editorSettings());let id=$('#new-destination').value;if(id==='new'){const name=$('#new-place-name').value.trim(),latText=$('#new-place-lat').value,lngText=$('#new-place-lng').value;if(!name||!latText||!lngText)throw new Error('Enter a place name and verified latitude and longitude.');id=`custom-${Date.now().toString(36)}`;candidate.customPlaces.push({id,name,lat:Number(latText),lng:Number(lngText)});}candidate.stops.splice(candidate.stops.length-1,0,{placeId:id,nights:1,stay:'To be arranged',notes:''});delete candidate.stops.at(-1).driveMin;delete candidate.stops.at(-1).driveMax;draft=validatePlan(candidate,Object.keys(destinations));renderEditorStops();$('#add-stop-fields').hidden=true;}catch(error){$('#editor-message').textContent=error.message;$('#editor-message').classList.add('warning');}});
  $('#editor-form').addEventListener('submit',event=>{event.preventDefault();try{applyPlan(editorSettings(),'Your edited plan · saved on this device');$('#editor').close();toast('Plan updated. Copy its link to share this version.');}catch(error){$('#editor-message').textContent=error.message;$('#editor-message').classList.add('warning');}});
  $('#reset-plan').addEventListener('click',()=>{applyPlan(structuredClone(original),'Original shared plan');$('#editor').close();toast('Original plan restored.');});
  $('#export-plan').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(plan,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`mongolia-plan-${plan.startDate}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Plan exported. Import it on another device or share its link.');});
  $('#import-plan').addEventListener('click',()=>$('#import-file').click());
  $('#import-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>250000)throw new Error('Choose a plan file smaller than 250 KB.');applyPlan(JSON.parse(await file.text()),'Imported plan · saved on this device');toast('Plan imported.');}catch(error){toast(`Import failed: ${error.message}`);}finally{event.target.value='';}});
  $('#share-plan').addEventListener('click',async()=>{const url=new URL(location.href);try{url.hash=`plan=${encodePlan(plan)}`;}catch(error){toast(error.message);return;}try{await navigator.clipboard.writeText(url.href);toast('Link copied. It opens this exact version of the plan.');}catch{ $('#share-url').value=url.href;$('#share-dialog').showModal();$('#share-url').focus();$('#share-url').select(); }});
  window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#plan=')){try{plan=validatePlan(decodePlan(location.hash.slice(6)),Object.keys(destinations));versionLabel='Shared version · use Edit plan to make changes';render();fitRoute();}catch(error){toast(`Could not open shared plan: ${error.message}`);}}});
}
async function init(){
  try{
    [original,destinations,geometry,photos]=await Promise.all([readJson('data/trip.json'),readJson('data/destinations.json'),readJson('data/route-geometry.json'),readJson('assets/photos/manifest.json')]);
    original=validatePlan(original,Object.keys(destinations));plan=structuredClone(original);
    if(location.hash.startsWith('#plan=')){try{plan=validatePlan(decodePlan(location.hash.slice(6)),Object.keys(destinations));versionLabel='Shared version · use Edit plan to make changes';}catch(error){toast(`Shared link could not load: ${error.message}`);}}
    else if(storageRead()){try{plan=validatePlan(JSON.parse(storageRead()),Object.keys(destinations));versionLabel='Your edited plan · saved on this device';}catch{toast('An older saved plan could not load. Showing the original.');}}
    render();renderCredits();installEvents();
    // Observable readiness flag used by browser checks; contains no private data.
    document.documentElement.dataset.ready='true';
  }catch(error){const message=document.createElement('p');message.className='app-error';message.textContent=`The trip could not load. ${error.message} Please refresh or try again later.`;$('main').prepend(message);console.error(error);}
}
init();
