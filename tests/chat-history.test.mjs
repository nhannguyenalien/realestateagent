import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {build} from 'esbuild';
import {neon} from '@neondatabase/serverless';
const line=(await readFile('.dev.vars','utf8')).split('\n').find(l=>l.startsWith('DATABASE_URL='));
const env={DATABASE_URL:line.slice(13).trim().replace(/^['"]|['"]$/g,'')},sql=neon(env.DATABASE_URL);
const dir=await mkdtemp(join(tmpdir(),'chat-history-')),ids=[randomUUID(),randomUUID()],tokens=[randomUUID(),randomUUID()];
try{
 const file=join(dir,'api.mjs');await build({entryPoints:['functions/api/ai/conversations.ts'],outfile:file,bundle:true,platform:'node',format:'esm',logLevel:'silent'});
 const {onRequest}=await import(pathToFileURL(file));
 for(let i=0;i<2;i++){await sql`INSERT INTO app_users(id,email,name) VALUES(${ids[i]}::uuid,${ids[i]+'@test.invalid'},'History integration test')`;await sql`INSERT INTO user_sessions(user_id,token_hash,expires_at) VALUES(${ids[i]}::uuid,${createHash('sha256').update(tokens[i]).digest('hex')},now()+interval '5 minutes')`}
 const call=(i,method='GET',body)=>onRequest({env,request:new Request('https://example.test/api/ai/conversations/',{method,headers:i===null?{}:{authorization:'Bearer '+tokens[i]},...(body?{body:JSON.stringify(body)}:{})})});
 assert.equal((await call(null)).status,401);
 const conversation={id:randomUUID(),title:'Private conversation',context:{scope:'agency',agencySlug:'test',agencyName:'Test agency'},messages:[{role:'user',content:'Find a home'}],updatedAt:new Date().toISOString()};
 assert.equal((await call(0,'PUT',conversation)).status,200);
 assert.deepEqual((await (await call(0)).json()).conversations,[conversation]);
 assert.deepEqual((await (await call(1)).json()).conversations,[]);
 conversation.messages.push({role:'assistant',content:'Saved reply'});
 assert.equal((await call(0,'PUT',conversation)).status,200);
 assert.equal((await (await call(0)).json()).conversations[0].messages.length,2);
 assert.equal((await call(0,'PUT',{...conversation,id:'bad'})).status,400);
 console.log('PASS: authenticated DB persistence, update, anonymous rejection, account isolation, invalid ID rejection. Temporary users cleaned up.');
}finally{for(const id of ids)await sql`DELETE FROM app_users WHERE id=${id}::uuid`;await rm(dir,{recursive:true,force:true})}
