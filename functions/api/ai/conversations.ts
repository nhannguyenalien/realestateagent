import {currentUser,db,json,type Env} from '../_shared';
export const onRequest:PagesFunction<Env>=async({env,request})=>{
 try {
 const user=await currentUser(env,request);
 if(!user)return json({error:'Authentication required'},401);
 const sql=db(env);
 if(request.method==='GET'){
 const rows=await sql`SELECT payload FROM ai_conversations WHERE user_id=${user.id}::uuid ORDER BY updated_at DESC LIMIT 100`;
 return Response.json({conversations:rows.map(row=>row.payload)},{headers:{'cache-control':'no-store'}});
 }
 if(request.method!=='PUT')return json({error:'Method not allowed'},405);
 const raw=await request.text();
 if(raw.length>1000000)return json({error:'Conversation is too large'},413);
 const body=JSON.parse(raw);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)||!['system','agency'].includes(body.context?.scope)||typeof body.title!=='string'||body.title.length>160||!Array.isArray(body.messages)||body.messages.length>500||!body.messages.every((m:{role?:string;content?:string})=>['user','assistant'].includes(m.role||'')&&typeof m.content==='string'&&m.content.length<=50000))return json({error:'Invalid conversation'},400);
 await sql`INSERT INTO ai_conversations(user_id,id,payload) VALUES(${user.id}::uuid,${body.id}::uuid,${JSON.stringify(body)}::jsonb) ON CONFLICT(user_id,id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()`;
 return json({ok:true});
 }catch(error){console.error('ai.conversations',error);return json({error:'Unable to save or load chat history'},500)}
};
