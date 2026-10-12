export interface Env { DAILY_SEARCH_URL:string; CRON_SECRET:string }

async function run(env:Env){
  const response=await fetch(env.DAILY_SEARCH_URL,{method:"POST",headers:{authorization:`Bearer ${env.CRON_SECRET}`}});
  if(!response.ok)throw new Error(`Daily search endpoint returned ${response.status}: ${await response.text()}`);
  console.log("Daily property search completed",await response.text());
}

export default {
  async scheduled(_controller:ScheduledController,env:Env,ctx:ExecutionContext){ctx.waitUntil(run(env))},
  async fetch(request:Request,env:Env){
    if(new URL(request.url).pathname!=="/__scheduled")return new Response("Not found",{status:404});
    await run(env);return Response.json({ok:true});
  }
};
