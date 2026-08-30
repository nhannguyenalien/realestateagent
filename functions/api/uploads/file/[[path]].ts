import type { Env } from "../../_shared";
export const onRequestGet:PagesFunction<Env>=async({env,params})=>{
  if(!env.MEDIA_BUCKET)return new Response("Storage unavailable",{status:503});
  const path=Array.isArray(params.path)?params.path.join("/"):String(params.path||"");
  const object=await env.MEDIA_BUCKET.get(path);
  if(!object)return new Response("Not found",{status:404});
  const headers=new Headers();object.writeHttpMetadata(headers);headers.set("etag",object.httpEtag);headers.set("cache-control","public, max-age=31536000, immutable");
  return new Response(object.body,{headers});
};
