import {currentUser,db,json,type Env} from "../../_shared";

export const onRequestGet: PagesFunction<Env> = async ({env,request}) => {
  try {
    const user=await currentUser(env,request);
    if(!user)return json({error:"Authentication required."},401);
    const sql=db(env);
    const rows=await sql`SELECT l.id::text,l.name,l.email,l.phone,l.message,l.source,l.status,
      l.created_at AS "createdAt",p.title AS property,p.slug AS "propertySlug"
      FROM leads l JOIN agents a ON a.id=l.assigned_agent_id
      LEFT JOIN properties p ON p.id=l.property_id
      WHERE a.user_id=${user.id}::uuid ORDER BY l.created_at DESC LIMIT 100`;
    return json({leads:rows});
  }catch(error){console.error("agent.leads",error);return json({error:"Unable to load leads."},500)}
};

