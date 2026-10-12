import {currentUser,db,json,type Env} from "../_shared";
export const onRequestGet:PagesFunction<Env>=async({env,request})=>{try{
  const user=await currentUser(env,request);if(!user)return json({error:"Authentication required."},401);
  const rows=await db(env)`SELECT a.name,a.email,a.phone,a.bio,a.avatar_url AS "avatarUrl" FROM agents a WHERE a.user_id=${user.id}::uuid`;
  return json({profile:rows[0]||{name:user.name,email:user.email,avatarUrl:user.avatarUrl},role:user.role});
}catch(error){console.error("agent.profile",error);return json({error:"Unable to load profile."},500)}};
export const onRequestPatch:PagesFunction<Env>=async({env,request})=>{try{
  const user=await currentUser(env,request);if(!user)return json({error:"Authentication required."},401);
  const b=await request.json<Record<string,unknown>>(),name=String(b.name||"").trim();if(name.length<2)return json({error:"Name is required."},400);
  const sql=db(env),phone=b.phone==null?null:String(b.phone).trim(),bio=b.bio==null?null:String(b.bio).trim();
  await sql`UPDATE app_users SET name=${name} WHERE id=${user.id}::uuid`;
  const rows=await sql`UPDATE agents SET name=${name},phone=${phone},bio=${bio},updated_at=NOW() WHERE user_id=${user.id}::uuid RETURNING name,email,phone,bio,avatar_url AS "avatarUrl"`;
  return json({profile:rows[0]||{name}});
}catch(error){console.error("agent.profile.update",error);return json({error:"Unable to save profile."},500)}};
