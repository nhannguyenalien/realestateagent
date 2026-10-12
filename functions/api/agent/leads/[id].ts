import {currentUser,db,json,type Env} from "../../_shared";
const statuses=new Set(["new","contacted","qualified","closed","lost"]);
export const onRequestPatch:PagesFunction<Env>=async({env,request,params})=>{try{
  const user=await currentUser(env,request);if(!user)return json({error:"Authentication required."},401);
  const body=await request.json<{status?:string}>();if(!body.status||!statuses.has(body.status))return json({error:"Invalid status."},400);
  const rows=await db(env)`UPDATE leads l SET status=${body.status}::lead_status,updated_at=NOW() FROM agents a WHERE l.id=${String(params.id)}::uuid AND a.user_id=${user.id}::uuid AND a.id=COALESCE(l.assigned_agent_id,(SELECT agent_id FROM properties WHERE id=l.property_id)) RETURNING l.id::text,l.status`;
  return rows[0]?json({lead:rows[0]}):json({error:"Lead not found."},404);
}catch(error){console.error("agent.lead.update",error);return json({error:"Unable to update lead."},500)}};
