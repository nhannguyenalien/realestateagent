import {currentUser,db,json,type Env} from "../../_shared";
const statuses=new Set(["draft","published","archived"]);
export const onRequestPatch:PagesFunction<Env>=async({env,request,params})=>{try{
  const user=await currentUser(env,request);if(!user)return json({error:"Authentication required."},401);
  const body=await request.json<Record<string,unknown>>(),status=body.status==null?null:String(body.status);if(status&&!statuses.has(status))return json({error:"Invalid status."},400);
  const sql=db(env),rows=await sql`UPDATE properties p SET title=COALESCE(${body.title?String(body.title):null},title),description=COALESCE(${body.description==null?null:String(body.description)},description),price=COALESCE(${body.price==null?null:Number(body.price)},price),status=COALESCE(${status},status)::property_status,primary_image_url=COALESCE(${body.imageUrl==null?null:String(body.imageUrl)},primary_image_url),published_at=CASE WHEN ${status}='published' THEN COALESCE(published_at,NOW()) ELSE published_at END,updated_at=NOW() FROM agents a WHERE p.id=${String(params.id)}::uuid AND p.agent_id=a.id AND a.user_id=${user.id}::uuid RETURNING p.id::text,p.slug,p.title,p.status,p.updated_at AS "updatedAt"`;
  return rows[0]?json({property:rows[0]}):json({error:"Listing not found."},404);
}catch(error){console.error("agent.property.update",error);return json({error:"Unable to update listing."},500)}};
