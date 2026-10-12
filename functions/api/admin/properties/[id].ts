import {currentAdmin,db,json,type Env} from "../../_shared";
const allowed=new Set(["draft","published","archived"]);
const text=(v:unknown)=>v==null?null:String(v),num=(v:unknown)=>v==null||v===""?null:Number(v);
export const onRequestPatch:PagesFunction<Env>=async({env,params,request})=>{try{
  if(!await currentAdmin(env,request))return json({error:"Administrator access required."},403);
  const body=await request.json<Record<string,unknown>>(),status=body.status==null?null:String(body.status);
  if(status&&!allowed.has(status))return json({error:"Invalid property status"},400);
  const price=num(body.price),area=num(body.areaSqm),beds=num(body.bedrooms),baths=num(body.bathrooms),lat=num(body.latitude),lng=num(body.longitude),featured=typeof body.featured==="boolean"?body.featured:null;
  if(body.title!=null&&String(body.title).trim().length<3)return json({error:"Title must be at least 3 characters."},400);
  if([price,area,beds,baths,lat,lng].some(v=>v!==null&&!Number.isFinite(v))||(price!==null&&price<0)||(area!==null&&area<=0))return json({error:"Invalid numeric value."},400);
  const fields=["title","description","propertyType","price","currency","bedrooms","bathrooms","areaSqm","address","city","region","latitude","longitude","imageUrl","status","featured"];
  if(!fields.some(key=>body[key]!==undefined))return json({error:"Nothing to update"},400);
  const sql=db(env),rows=await sql`UPDATE properties SET title=COALESCE(${body.title?String(body.title).trim():null},title),description=COALESCE(${text(body.description)},description),property_type=COALESCE(${text(body.propertyType)},property_type),price=COALESCE(${price},price),currency=COALESCE(${body.currency?String(body.currency).slice(0,3).toUpperCase():null},currency),bedrooms=COALESCE(${beds},bedrooms),bathrooms=COALESCE(${baths},bathrooms),area_sqm=COALESCE(${area},area_sqm),address_line=COALESCE(${text(body.address)},address_line),city=COALESCE(${body.city?String(body.city).trim():null},city),region=COALESCE(${text(body.region)},region),latitude=COALESCE(${lat},latitude),longitude=COALESCE(${lng},longitude),primary_image_url=COALESCE(${body.imageUrl?String(body.imageUrl):null},primary_image_url),status=COALESCE(${status},status)::property_status,featured=COALESCE(${featured},featured),published_at=CASE WHEN ${status}='published' THEN COALESCE(published_at,NOW()) ELSE published_at END,updated_at=NOW() WHERE id=${String(params.id)}::uuid RETURNING id::text,slug,title,status,featured,updated_at AS "updatedAt"`;
  return rows[0]?json({property:rows[0]}):json({error:"Property not found"},404);
}catch(error){console.error("admin.property.update",error);return json({error:"Unable to update property"},500)}};
export const onRequestDelete:PagesFunction<Env>=async({env,params,request})=>{try{if(!await currentAdmin(env,request))return json({error:"Administrator access required."},403);const rows=await db(env)`DELETE FROM properties WHERE id=${String(params.id)}::uuid RETURNING id::text`;return rows[0]?json({ok:true}):json({error:"Property not found"},404)}catch(error){console.error("admin.property.delete",error);return json({error:"Unable to delete property"},500)}};
