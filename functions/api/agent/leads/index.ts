import {currentUser,db,json,type Env} from "../../_shared";

export const onRequestGet: PagesFunction<Env> = async ({env,request}) => {
  try {
    const user=await currentUser(env,request);
    if(!user)return json({error:"Authentication required."},401);
    const sql=db(env);
    const rows=await sql`SELECT l.id::text,l.name,l.email,l.phone,l.message,l.source,l.status,l.updated_at AS "updatedAt",
      l.created_at AS "createdAt",p.title AS property,p.slug AS "propertySlug"
      FROM leads l LEFT JOIN properties p ON p.id=l.property_id
      JOIN agents a ON a.id=COALESCE(l.assigned_agent_id,p.agent_id)
      WHERE a.user_id=${user.id}::uuid ORDER BY l.created_at DESC LIMIT 100`;
    return json({leads:rows});
  }catch(error){console.error("agent.leads",error);return json({error:"Unable to load leads."},500)}
};

