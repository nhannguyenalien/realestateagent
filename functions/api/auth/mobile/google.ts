import {db,json,randomToken,sha256,type Env} from "../../_shared";

type Body={idToken?:unknown};
type GoogleToken={aud?:string;sub?:string;email?:string;email_verified?:string;name?:string;picture?:string;error_description?:string};

export const onRequestPost:PagesFunction<Env>=async({env,request})=>{
  if(!env.GOOGLE_CLIENT_ID)return json({error:"Google mobile authentication is not configured."},503);
  const body:Body=await request.json<Body>().catch(()=>({} as Body));
  if(typeof body.idToken!=="string"||!body.idToken)return json({error:"Google ID token is required."},400);
  const response=await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.idToken)}`);
  const profile=await response.json<GoogleToken>();
  if(!response.ok||profile.aud!==env.GOOGLE_CLIENT_ID||profile.email_verified!=="true"||!profile.sub||!profile.email){
    return json({error:"Invalid Google ID token."},401);
  }
  const admins=(env.ADMIN_EMAILS||"").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);
  const email=profile.email.toLowerCase(),role=admins.includes(email)?"admin":"agent",sql=db(env);
  const users=await sql`INSERT INTO app_users (google_sub,email,name,avatar_url,role,last_login_at)
    VALUES (${profile.sub},${email},${profile.name||email},${profile.picture||null},${role},NOW())
    ON CONFLICT (email) DO UPDATE SET google_sub=EXCLUDED.google_sub,name=EXCLUDED.name,avatar_url=EXCLUDED.avatar_url,
      role=CASE WHEN EXCLUDED.role='admin' THEN 'admin' ELSE app_users.role END,last_login_at=NOW()
    RETURNING id::text,email,name,avatar_url AS "avatarUrl",role`;
  await sql`INSERT INTO agents(user_id,name,email,avatar_url) VALUES (${users[0].id}::uuid,${users[0].name},${email},${users[0].avatarUrl||null})
    ON CONFLICT (user_id) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,avatar_url=EXCLUDED.avatar_url,updated_at=NOW()`;
  const token=randomToken(48),hash=await sha256(token);
  await sql`INSERT INTO user_sessions(user_id,token_hash,expires_at) VALUES (${users[0].id}::uuid,${hash},NOW()+INTERVAL '30 days')`;
  return json({token,expiresIn:2592000,user:users[0]});
};
