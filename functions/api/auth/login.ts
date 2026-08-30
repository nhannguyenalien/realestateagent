import {createSession,db,json,sessionCookie,validEmail,verifyPassword,type Env} from "../_shared";

export const onRequestPost:PagesFunction<Env>=async({env,request})=>{
  try{
    const body=await request.json<{email?:unknown;password?:unknown}>(),email=typeof body.email==="string"?body.email.trim().toLowerCase():"",password=typeof body.password==="string"?body.password:"";
    if(!validEmail(email)||!password||password.length>128)return json({error:"Invalid email or password."},401);
    const sql=db(env),rows=await sql`SELECT id::text,email,name,avatar_url AS "avatarUrl",role,password_hash AS "passwordHash",password_salt AS "passwordSalt",password_iterations AS "passwordIterations" FROM app_users WHERE email=${email} LIMIT 1`,user=rows[0];
    if(!user?.passwordHash||!user.passwordSalt||!user.passwordIterations||!await verifyPassword(password,user.passwordHash as string,user.passwordSalt as string,Number(user.passwordIterations)))return json({error:"Invalid email or password."},401);
    await sql`UPDATE app_users SET last_login_at=NOW() WHERE id=${user.id}::uuid`;
    const token=await createSession(env,user.id as string);delete user.passwordHash;delete user.passwordSalt;delete user.passwordIterations;
    return new Response(JSON.stringify({ok:true,token,user}),{headers:{"content-type":"application/json","cache-control":"no-store","set-cookie":sessionCookie(token,request)}});
  }catch(error){console.error("auth.login",error);return json({error:"Unable to sign in."},500)}
};
