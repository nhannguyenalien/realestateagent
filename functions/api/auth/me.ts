import {currentUser,json,type Env} from "../_shared";
export const onRequestGet:PagesFunction<Env>=async({env,request})=>{const user=await currentUser(env,request);return user?json({user}):json({user:null},401)};
