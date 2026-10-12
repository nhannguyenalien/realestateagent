export function safeVideoUrl(value:unknown):string|undefined {
 if(typeof value!=="string"||!value.trim())return undefined;
 try{const url=new URL(value);return ["https:","http:"].includes(url.protocol)?url.href:undefined}catch{return undefined}
}
export function youtubeVideoId(value:string):string|null {
 try{const url=new URL(value),host=url.hostname.replace(/^www\./,"");const id=host==="youtu.be"?url.pathname.slice(1):["youtube.com","m.youtube.com","youtube-nocookie.com"].includes(host)?url.searchParams.get("v")||url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]:null;return id&&/^[\w-]{11}$/.test(id)?id:null}catch{return null}
}
