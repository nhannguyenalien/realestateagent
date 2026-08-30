import {createSession,db,hashPassword,json,sessionCookie,validEmail,type Env} from "../_shared";

export const onRequestPost:PagesFunction<Env>=async({env,request})=>{
  try{
    const body=await request.json<{name?:unknown;email?:unknown;password?:unknown}>(),name=typeof body.name==="string"?body.name.trim():"",email=typeof body.email==="string"?body.email.trim().toLowerCase():"",password=typeof body.password==="string"?body.password:"";
    if(name.length<2||name.length>100||!validEmail(email)||password.length<8||password.length>128||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))return json({error:"Use a valid name and email, and a password of 8–128 characters containing a letter and number."},400);
    const sql=db(env),existing=await sql`SELECT id FROM app_users WHERE email=${email} LIMIT 1`;
    if(existing.length)return json({error:"An account with this email already exists."},409);
    const credential=await hashPassword(password),admins=(env.ADMIN_EMAILS||"").split(",").map(v=>v.trim().toLowerCase()),role=admins.includes(email)?"admin":"agent";
    const rows=await sql`INSERT INTO app_users(email,name,role,password_hash,password_salt,password_iterations,last_login_at) VALUES (${email},${name},${role},${credential.hash},${credential.salt},${credential.iterations},NOW()) RETURNING id::text,email,name,avatar_url AS "avatarUrl",role`;
    await sql`INSERT INTO agents(user_id,name,email) VALUES (${rows[0].id}::uuid,${name},${email}) ON CONFLICT (user_id) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,updated_at=NOW()`;
    const token=await createSession(env,rows[0].id as string);
    return new Response(JSON.stringify({ok:true,token,user:rows[0]}),{status:201,headers:{"content-type":"application/json","cache-control":"no-store","set-cookie":sessionCookie(token,request)}});
  }catch(error){console.error("auth.register",error);return json({error:"Unable to create account."},500)}
};
