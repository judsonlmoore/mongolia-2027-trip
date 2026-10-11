import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validatePlan,buildSchedule} from '../core.mjs';
const root=new URL('../',import.meta.url);
const json=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const [trip,destinations,geometry,photos]=await Promise.all([json('data/trip.json'),json('data/destinations.json'),json('data/route-geometry.json'),json('assets/photos/manifest.json')]);
const schedule=buildSchedule(validatePlan(trip,Object.keys(destinations)));
if(schedule.difference!==0)throw new Error('The published default must fit the return-flight window.');
for(const [id,place] of Object.entries(destinations)){
  const pin=geometry.places[id];if(!pin||!Number.isFinite(pin.lat)||!Number.isFinite(pin.lng)||!pin.coordinateSource)throw new Error(`Missing sourced coordinates for ${id}`);
  const photo=photos[id];if(!photo||!photo.author||!photo.license||!photo.licenseUrl||!photo.sourceUrl)throw new Error(`Missing photo credits for ${id}`);
  await access(new URL(`assets/photos/${photo.filename}`,root));
  if(!place.name||!place.description)throw new Error(`Missing destination content for ${id}`);
}
for(const [id,segment] of Object.entries(geometry.segments)){
  if(!['road','approximate'].includes(segment.geometryKind)||!segment.notes||!segment.geometrySource)throw new Error(`Missing route provenance for ${id}`);
  if(segment.coordinates.length<2||segment.coordinates.some(point=>point.length!==2||point.some(value=>!Number.isFinite(value))))throw new Error(`Invalid route coordinates for ${id}`);
}
await Promise.all(['index.html','app.mjs','core.mjs','styles.css','assets/vendor/leaflet.js','assets/vendor/leaflet.css','assets/vendor/LEAFLET-LICENSE.txt','.nojekyll'].map(path=>access(new URL(path,root))));
console.log(`Validated ${Object.keys(destinations).length} destinations, ${Object.keys(geometry.segments).length} driving traces, licensed photos, and ${schedule.nights} nights within the flight window.`);
console.log(`Static site: ${fileURLToPath(root)}`);
