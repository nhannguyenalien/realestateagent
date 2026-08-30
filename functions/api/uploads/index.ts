import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Env } from "../_shared";

const allowed = new Set(["image/jpeg","image/png","image/webp","image/gif","image/avif","video/mp4","video/webm","video/quicktime"]);
const cleanBase=(value?:string)=>value?.replace(/\/$/,"");
const safeName=(name:string)=>name.toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"")||"image";
const client=(env:Env)=>new S3Client({region:env.S3_REGION||"auto",endpoint:env.S3_ENDPOINT,forcePathStyle:Boolean(env.S3_ENDPOINT),credentials:{accessKeyId:env.S3_ACCESS_KEY_ID||"",secretAccessKey:env.S3_SECRET_ACCESS_KEY||""}});
const publicUrl=(env:Env,key:string,origin:string)=>env.STORAGE_PROVIDER==="s3"?`${cleanBase(env.S3_PUBLIC_URL)||`https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com`}/${key}`:`${cleanBase(env.R2_PUBLIC_URL)||`${origin}/api/uploads/file`}/${key}`;

export const onRequestPost:PagesFunction<Env>=async({env,request})=>{
  const form=await request.formData(),file=form.get("file");
  if(!(file instanceof File))return Response.json({error:"Choose an image to upload."},{status:400});
  if(!allowed.has(file.type))return Response.json({error:"Supported formats: JPG, PNG, WEBP, GIF, AVIF, MP4, WEBM and MOV."},{status:415});
  const max=file.type.startsWith("video/")?100*1024*1024:10*1024*1024;
  if(file.size>max)return Response.json({error:file.type.startsWith("video/")?"Videos must be 100 MB or smaller.":"Images must be 10 MB or smaller."},{status:413});
  const key=`properties/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${safeName(file.name)}`;
  if(env.STORAGE_PROVIDER==="s3"){
    if(!env.S3_BUCKET||!env.S3_ACCESS_KEY_ID||!env.S3_SECRET_ACCESS_KEY)return Response.json({error:"S3 storage is not configured."},{status:503});
    await client(env).send(new PutObjectCommand({Bucket:env.S3_BUCKET,Key:key,Body:new Uint8Array(await file.arrayBuffer()),ContentType:file.type,CacheControl:"public, max-age=31536000"}));
  }else{
    if(!env.MEDIA_BUCKET)return Response.json({error:"Cloudflare R2 binding MEDIA_BUCKET is not configured."},{status:503});
    await env.MEDIA_BUCKET.put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:"public, max-age=31536000"},customMetadata:{originalName:file.name}});
  }
  return Response.json({key,url:publicUrl(env,key,new URL(request.url).origin),name:file.name,size:file.size,type:file.type});
};

export const onRequestGet:PagesFunction<Env>=async({env,request})=>{
  let objects:{key:string;size:number;uploaded?:Date}[]=[];
  if(env.STORAGE_PROVIDER==="s3"){
    if(!env.S3_BUCKET)return Response.json({items:[]});
    const result=await client(env).send(new ListObjectsV2Command({Bucket:env.S3_BUCKET,Prefix:"properties/",MaxKeys:60}));
    objects=(result.Contents||[]).map(x=>({key:x.Key||"",size:x.Size||0,uploaded:x.LastModified}));
  }else if(env.MEDIA_BUCKET){
    const result=await env.MEDIA_BUCKET.list({prefix:"properties/",limit:60});
    objects=result.objects.map(x=>({key:x.key,size:x.size,uploaded:x.uploaded}));
  }
  const origin=new URL(request.url).origin;
  return Response.json({provider:env.STORAGE_PROVIDER||"r2",items:objects.reverse().map(x=>({...x,name:x.key.split("/").pop()?.replace(/^[0-9a-f-]{36}-/,"")||x.key,url:publicUrl(env,x.key,origin)}))});
};
