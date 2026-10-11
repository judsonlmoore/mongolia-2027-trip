const DAY = 86400000;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Use a valid calendar date.');
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new Error('Use a real calendar date.');
  if (time < Date.parse('2026-01-01T00:00:00Z') || time > Date.parse('2100-12-31T00:00:00Z')) throw new Error('Choose dates between 2026 and 2100.');
  return time;
}
export function addDays(value, days) { return new Date(parseDate(value) + days * DAY).toISOString().slice(0, 10); }
export function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / DAY); }
export function formatDate(value, options = {}) { return new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',timeZone:'UTC',...options}).format(new Date(parseDate(value))); }
export function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
export function safeUrl(value) { try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
function text(value, field, max, fallback = '') {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.length > max) throw new Error(`${field} must be text of ${max} characters or fewer.`);
  return value.trim();
}
function number(value, field, min, max, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error(`${field} must be ${integer?'a whole number':'a number'} between ${min} and ${max}.`);
  return value;
}
export function validatePlan(raw, destinationIds) {
  if (!isRecord(raw) || raw.version !== 1) throw new Error('This file is not a supported trip plan (version 1).');
  parseDate(raw.startDate); parseDate(raw.endDate);
  const tripDays = daysBetween(raw.startDate, raw.endDate) + 1;
  if (tripDays < 4 || tripDays > 62) throw new Error('Choose a trip window of 4–62 days.');
  const plan = {version:1,title:text(raw.title,'Title',120,'Mongolia, at our own pace'),startDate:raw.startDate,endDate:raw.endDate,people:number(raw.people,'Travellers',1,8,true),stayBudget:number(raw.stayBudget,'Stay budget',0,1000),otherBudget:number(raw.otherBudget,'Other budget',0,1000),customPlaces:[],stops:[]};
  const known = new Set(destinationIds);
  if (raw.customPlaces !== undefined && (!Array.isArray(raw.customPlaces) || raw.customPlaces.length > 20)) throw new Error('A plan can have up to 20 custom destinations.');
  for (const place of raw.customPlaces || []) {
    if (!isRecord(place) || typeof place.id !== 'string' || !/^custom-[a-z0-9-]{1,50}$/.test(place.id) || known.has(place.id)) throw new Error('Custom destinations need unique valid identifiers.');
    const name = text(place.name,'Destination name',120);
    if (!name) throw new Error('Give each custom destination a name.');
    plan.customPlaces.push({id:place.id,name,lat:number(place.lat,'Latitude',-90,90),lng:number(place.lng,'Longitude',-180,180)});
    known.add(place.id);
  }
  if (!Array.isArray(raw.stops) || raw.stops.length < 2 || raw.stops.length > 40) throw new Error('A plan needs 2–40 overnight stops.');
  for (const stop of raw.stops) {
    if (!isRecord(stop) || !known.has(stop.placeId)) throw new Error('A stop references an unknown destination.');
    const clean = {placeId:stop.placeId,nights:number(stop.nights,'Nights',1,14,true),stay:text(stop.stay,'Accommodation',200,'To be arranged'),notes:text(stop.notes,'Notes',1500)};
    if (stop.driveMin !== undefined || stop.driveMax !== undefined) {
      clean.driveMin = number(stop.driveMin,'Minimum drive hours',0,24);
      clean.driveMax = number(stop.driveMax,'Maximum drive hours',clean.driveMin,24);
    }
    plan.stops.push(clean);
  }
  if (plan.stops[0].placeId !== 'ulaanbaatar' || plan.stops.at(-1).placeId !== 'ulaanbaatar') throw new Error('Keep Ulaanbaatar as the first and final overnight stop for the international flights.');
  if (plan.stops.reduce((sum, stop) => sum + stop.nights, 0) > 60) throw new Error('Keep the plan to 60 nights or fewer.');
  return plan;
}
export function buildSchedule(plan) {
  let cursor = addDays(plan.startDate, 1);
  const visits = plan.stops.map((stop,index) => { const start = cursor; cursor = addDays(cursor, stop.nights); return {...stop,index,start,end:cursor,lastNight:addDays(cursor,-1)}; });
  const nights = plan.stops.reduce((sum,stop) => sum+stop.nights,0);
  return {visits,nights,arrival:addDays(plan.startDate,1),departure:cursor,tripDays:daysBetween(plan.startDate,plan.endDate)+1,difference:daysBetween(plan.endDate,cursor)};
}
export function scheduleMessage(schedule, endDate) {
  if (schedule.difference === 0) return `${schedule.nights} nights · fits the flight window · home on ${formatDate(endDate)}.`;
  if (schedule.difference > 0) return `The nights run to ${formatDate(schedule.departure)}, ${schedule.difference} day${schedule.difference===1?'':'s'} after the return date. Remove nights or change the return date.`;
  return `The overnight plan ends on ${formatDate(schedule.departure)}, ${-schedule.difference} day${schedule.difference===-1?'':'s'} before the return date. Add nights or change the return date.`;
}
const timeRanges = {'ub-hustai':[2,3],'hustai-khogno':[4,5],'khogno-kharkhorin':[1.5,2],'kharkhorin-orkhon':[4,6],'orkhon-tsenkher':[6,8],'tsenkher-terkhiin':[5,6],'terkhiin-tsetserleg':[3,4],'tsetserleg-ub':[7,9],'ub-terelj':[2,3],'terelj-ub':[2,4]};
const alias = id => id === 'ulaanbaatar' ? 'ub' : id;
export function getLeg(from, to, geometry, places, stop = {}) {
  const key = `${alias(from)}-${alias(to)}`;
  const reversedKey = `${alias(to)}-${alias(from)}`;
  if (from === to) return {key,geometryKind:'same',coordinates:[],routedKm:0,hours:[0,0],notes:'Same destination; no intercity transfer.'};
  const known = geometry.segments[key] || geometry.segments[reversedKey];
  let hours = timeRanges[key] || timeRanges[reversedKey] || null;
  if (stop.driveMin !== undefined && stop.driveMax !== undefined) hours = [stop.driveMin,stop.driveMax];
  if (known) return {...known,key,hours,coordinates:geometry.segments[key] ? known.coordinates : [...known.coordinates].reverse()};
  return {key,geometryKind:'approximate',coordinates:[[places[from].lat,places[from].lng],[places[to].lat,places[to].lng]],routedKm:null,hours,geometrySource:'',notes:'This new connection has not been routed. The dashed line only connects destination pins; research a suitable road route, distance, permissions, and driving time before travel.'};
}
export function hoursLabel(hours) { if (!hours) return 'Time to research'; return hours[0] === hours[1] ? `${hours[0]} h` : `${hours[0]}–${hours[1]} h`; }
export function encodePlan(plan) { const bytes = new TextEncoder().encode(JSON.stringify(plan)); let binary=''; for(const byte of bytes) binary+=String.fromCharCode(byte); return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
export function decodePlan(encoded) { if (encoded.length > 80000 || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('This plan link is invalid or too large.'); const binary=atob(encoded.replace(/-/g,'+').replace(/_/g,'/')); return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0)))); }
