import {currentUser,db,ensureAgent,json,type Env} from "../../_shared";

export const onRequestGet:PagesFunction<Env>=async({env,request})=>{try{
  const user=await currentUser(env,request);if(!user)return json({error:"Authentication required."},401);
  const sql=db(env),rows=await sql`SELECT p.id::text,p.slug,p.title,p.description,p.status,p.property_type AS "propertyType",p.price::float8 AS price,p.currency,p.bedrooms,p.bathrooms,p.area_sqm::float8 AS "areaSqm",p.address_line AS address,p.city,p.region,p.primary_image_url AS "imageUrl",p.latitude::float8 AS latitude,p.longitude::float8 AS longitude,p.created_at AS "createdAt",p.updated_at AS "updatedAt" FROM properties p JOIN agents a ON a.id=p.agent_id WHERE a.user_id=${user.id}::uuid ORDER BY p.updated_at DESC`;
  return json({properties:rows});
}catch(error){console.error("agent.properties",error);return json({error:"Unable to load listings."},500)}};

export const onRequestPost:PagesFunction<Env>=async({env,request})=>{try{
  const user=await currentUser(env,request);if(!user)return json({error:"Authentication required."},401);
  const body=await request.json<Record<string,unknown>>(),title=String(body.title||"").trim(),city=String(body.city||"").trim(),price=Number(body.price),area=Number(body.areaSqm);
  if(title.length<3||!city||!Number.isFinite(price)||price<0||!Number.isFinite(area)||area<=0)return json({error:"Title, city, price and area are required."},400);
  const sql=db(env),agentId=await ensureAgent(env,user);
  const base=title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)||"property",slug=`${base}-${crypto.randomUUID().slice(0,8)}`;
  const rows=await sql`INSERT INTO properties(slug,title,description,property_type,status,price,currency,bedrooms,bathrooms,area_sqm,address_line,city,region,latitude,longitude,primary_image_url,agent_id)
    VALUES(${slug},${title},${String(body.description||"")},${String(body.propertyType||"house")},'draft',${price},${String(body.currency||"USD").slice(0,3).toUpperCase()},${Number(body.bedrooms)||0},${Number(body.bathrooms)||0},${area},${String(body.address||"")},${city},${String(body.region||"")},${body.latitude==null?null:Number(body.latitude)},${body.longitude==null?null:Number(body.longitude)},${body.imageUrl?String(body.imageUrl):null},${agentId}::uuid) RETURNING id::text,slug,title,status,created_at AS "createdAt"`;
  return json({property:rows[0]},201);
}catch(error){console.error("agent.properties.create",error);return json({error:"Unable to create listing."},500)}};
