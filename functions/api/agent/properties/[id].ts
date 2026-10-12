import {safeVideoUrl} from "../../../../lib/property-media";
import {cleanImageList,currentUser,db,json,replaceImages,type Env} from "../../_shared";
const statuses=new Set(["draft","published","archived"]);
const text=(v:unknown)=>v==null?null:String(v),num=(v:unknown)=>v==null||v===""?null:Number(v);
export const onRequestPatch:PagesFunction<Env>=async({env,request,params})=>{try{
  const user=await currentUser(env,request);if(!user)return json({error:"Authentication required."},401);
  const body=await request.json<Record<string,unknown>>(),status=body.status==null?null:String(body.status);if(status&&!statuses.has(status))return json({error:"Invalid status."},400);
  const hasImages=Array.isArray(body.images),images=cleanImageList(body.images);
  if(hasImages&&!images.length)return json({error:"Add at least one photo."},400);
  const hasVideo="videoUrl" in body,video=hasVideo?safeVideoUrl(body.videoUrl)||null:null;
  if(hasVideo&&String(body.videoUrl||"").trim()&&!video)return json({error:"Video link must be a valid http(s) URL."},400);
  const price=num(body.price),area=num(body.areaSqm),beds=num(body.bedrooms),baths=num(body.bathrooms),lat=num(body.latitude),lng=num(body.longitude);
  if(body.title!=null&&String(body.title).trim().length<3)return json({error:"Title must be at least 3 characters."},400);
  if([price,area,beds,baths,lat,lng].some(v=>v!==null&&!Number.isFinite(v))||(price!==null&&price<0)||(area!==null&&area<=0))return json({error:"Invalid numeric value."},400);
  const sql=db(env),rows=await sql`UPDATE properties p SET title=COALESCE(${body.title?String(body.title).trim():null},title),description=COALESCE(${text(body.description)},description),property_type=COALESCE(${text(body.propertyType)},property_type),price=COALESCE(${price},price),currency=COALESCE(${body.currency?String(body.currency).slice(0,3).toUpperCase():null},currency),bedrooms=COALESCE(${beds},bedrooms),bathrooms=COALESCE(${baths},bathrooms),area_sqm=COALESCE(${area},area_sqm),address_line=COALESCE(${text(body.address)},address_line),city=COALESCE(${body.city?String(body.city).trim():null},city),region=COALESCE(${text(body.region)},region),latitude=COALESCE(${lat},latitude),longitude=COALESCE(${lng},longitude),video_url=CASE WHEN ${hasVideo} THEN ${video} ELSE video_url END,status=COALESCE(${status},status)::property_status,primary_image_url=COALESCE(${hasImages?images[0]:body.imageUrl?String(body.imageUrl):null},primary_image_url),published_at=CASE WHEN ${status}='published' THEN COALESCE(published_at,NOW()) ELSE published_at END,updated_at=NOW() FROM agents a WHERE p.id=${String(params.id)}::uuid AND p.agent_id=a.id AND a.user_id=${user.id}::uuid RETURNING p.id::text,p.slug,p.title,p.status,p.updated_at AS "updatedAt"`;
  if(!rows[0])return json({error:"Listing not found."},404);
  if(hasImages)await replaceImages(env,rows[0].id,images,rows[0].title);
  return json({property:rows[0]});
}catch(error){console.error("agent.property.update",error);return json({error:"Unable to update listing."},500)}};

export const onRequestDelete:PagesFunction<Env>=async({env,request,params})=>{try{
  const user=await currentUser(env,request);if(!user)return json({error:"Authentication required."},401);
  const sql=db(env),rows=await sql`DELETE FROM properties p USING agents a WHERE p.id=${String(params.id)}::uuid AND p.agent_id=a.id AND a.user_id=${user.id}::uuid RETURNING p.id::text`;
  return rows[0]?json({ok:true}):json({error:"Listing not found."},404);
}catch(error){console.error("agent.property.delete",error);return json({error:"Unable to delete listing."},500)}};
