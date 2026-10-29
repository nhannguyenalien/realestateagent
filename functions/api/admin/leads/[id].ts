import {currentAdmin,db,json,type Env} from "../../_shared";
const statuses=new Set(["new","contacted","qualified","closed","lost"]);
export const onRequestPatch:PagesFunction<Env>=async({env,request,params})=>{try{
  if(!await currentAdmin(env,request))return json({error:"Administrator access required."},403);
  const body=await request.json<{status?:string}>().catch(()=>({} as {status?:string}));
  if(!body.status||!statuses.has(body.status))return json({error:"Invalid status."},400);
  const rows=await db(env)`UPDATE leads SET status=${body.status}::lead_status,updated_at=NOW() WHERE id=${String(params.id)}::uuid RETURNING id::text,status`;
  return rows[0]?json({lead:rows[0]}):json({error:"Lead not found."},404);
}catch(error){console.error("admin.lead.update",error);return json({error:"Unable to update lead."},500)}};
