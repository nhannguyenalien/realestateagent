import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Integration checks use the configured database and optional db/demo-nearby.sql fixtures.
const env=Object.fromEntries((await readFile('.dev.vars','utf8')).split('\n').filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
env.SCHOOLSAI_TOOL_SECRET='local-test-secret';env.SCHOOLSAI_SYSTEM_API_KEY='local-test-key';
const dir=await mkdtemp(join(tmpdir(),'estatein-nearby-'));
try {
 const load=async(file)=>{const out=join(dir,file.replaceAll('/','_')+'.mjs');await build({entryPoints:[file],outfile:out,bundle:true,platform:'node',format:'esm',logLevel:'silent'});return import(pathToFileURL(out))};
 const {parseNearby}=await load('lib/nearby.ts');
 assert.deepEqual(parseNearby({latitude:0,longitude:0}),{latitude:0,longitude:0,radiusKm:5});
 for(const value of [{latitude:null,longitude:0},{latitude:91,longitude:0},{latitude:0,longitude:181},{latitude:0,longitude:0,radiusKm:101},{latitude:0,longitude:0,radiusKm:0},{latitude:'',longitude:0}])assert.throws(()=>parseNearby(value));
 const api=await load('functions/api/ai/properties.ts');
 const get=(q,authorized=true)=>api.onRequestGet({env,request:new Request('http://localhost/api/ai/properties?'+q,{headers:authorized?{authorization:'Bearer local-test-secret'}:{}})});
 assert.equal((await get('',false)).status,401);
 assert.equal((await get('latitude=10')).status,400);
 const result=await (await get('latitude=10.7769&longitude=106.7009&radius_km=5&max_price=3000000000&currency=VND&type=apartment')).json();
 assert.equal(result.count,2);assert.equal(result.properties[0].slug,'demo-nearby-hcm-1');assert.equal(result.properties[0].distanceKm,0);
 assert(result.properties.every(p=>p.isDemo&&p.distanceKm<=5&&p.price<=3000000000));
 assert(result.properties[1].distanceKm>1);
 assert.equal((await (await get('latitude=0&longitude=0&radius_km=5')).json()).count,0);
 assert.equal((await (await get('latitude=10.7769&longitude=106.7009&radius_km=5&agency_slug=missing-agency')).json()).count,0);
 const chat=await load('functions/api/ai/chat.ts');
 let context;const originalFetch=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{if(String(url).includes('apic.schoolsai.work')){context=JSON.parse(JSON.parse(options.body).item_context);return Response.json({reply:'Demo response'})}return originalFetch(url,options)};
 const post=(body)=>chat.onRequestPost({env,request:new Request('http://localhost/api/ai/chat',{method:'POST',body:JSON.stringify(body)})});
 assert.equal((await (await post({language:'vi',messages:[{role:'user',content:'Tìm nhà quanh đây'}]})).json()).requiresLocation,true);
 const response=await post({language:'vi',location:{latitude:10.7769,longitude:106.7009,radiusKm:20},messages:[{role:'user',content:'Tìm căn hộ dưới 3 tỷ trong bán kính 5 km'}]});
 assert.equal(response.status,200);
 const payload=await response.json();assert.deepEqual(payload.properties.map(p=>p.id),context.searchResults.map(p=>p.id));assert(payload.properties.every(p=>p.imageUrl&&p.currency&&typeof p.distanceKm==='number'));assert(payload.properties.every(p=>!p.videoUrl));
assert.equal(context.searchResults.length,2);assert.equal(context.searchCriteria.radiusKm,5);assert.equal(context.searchCriteria.currency,'VND');assert.match(context.instructions,/fictional demo/);
 assert.equal((await post({location:{latitude:91,longitude:0},messages:[{role:'user',content:'hello'}]})).status,400);
 const empty=await (await post({location:{latitude:0,longitude:0,radiusKm:1},messages:[{role:'user',content:'Tìm nhà quanh đây'}]})).json();assert.deepEqual(empty.properties,[]);
 const focused=await (await post({propertySlug:'demo-nearby-hcm-1',messages:[{role:'user',content:'Chi tiết căn này'}]})).json();assert.equal(focused.properties[0].slug,'demo-nearby-hcm-1');assert(focused.properties[0].imageUrl);
 const {safeVideoUrl,youtubeVideoId}=await load('lib/property-media.ts');assert.equal(safeVideoUrl('javascript:alert(1)'),undefined);assert.equal(youtubeVideoId('https://youtube.com.evil.test/watch?v=abcdefghijk'),null);assert.equal(youtubeVideoId('https://youtu.be/abcdefghijk'),'abcdefghijk');assert.equal(safeVideoUrl('https://example.com/video.mp4'),'https://example.com/video.mp4');
 globalThis.fetch=originalFetch;
 console.log('PASS: coordinate validation, authorization, real DB radius/price/type/currency/agency filters, distance ordering, empty results, missing location, chat context and demo labeling. AI network call mocked.');
}finally{await rm(dir,{recursive:true,force:true})}
