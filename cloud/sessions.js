'use strict';
const crypto=require('node:crypto');
const db=require('./db');
const users=require('./users');
const cookieName='visag_session';
const sessionSeconds=12*60*60,rememberedSeconds=30*24*60*60;
const hash=token=>crypto.createHash('sha256').update(token).digest('hex');
const parseCookies=raw=>Object.fromEntries(String(raw||'').split(';').map(pair=>{
 const at=pair.indexOf('=');return at<0?[]:[pair.slice(0,at).trim(),pair.slice(at+1).trim()];
}).filter(pair=>pair.length===2));
function cookieSettings(req,remember){const options={httpOnly:true,sameSite:'lax',secure:req.secure||process.env.NODE_ENV==='production',path:'/'};if(remember)options.maxAge=rememberedSeconds*1000;return options;}
async function attach(req,res,next){
 try{
  req.customer=null;req.sessionTokenHash=null;res.locals.customer=null;
  const token=parseCookies(req.headers.cookie)[cookieName];
  if(token&&/^[0-9a-f]{64}$/.test(token)){
   const digest=hash(token);
   const {rows}=await db.query('SELECT user_id FROM visag_sessions WHERE token_hash=$1 AND expires_at>NOW()',[digest]);
   if(rows[0]){const user=await users.find(rows[0].user_id);if(user){req.customer=user;req.sessionTokenHash=digest;res.locals.customer=user;}}
  }
  next();
 }catch(e){next(e);}
}
async function login(req,res,user,remember=false){
 if(!user?.id)throw Error('Cuenta inválida.');
 const token=crypto.randomBytes(32).toString('hex');
 const client=await db.getPool().connect();
 try{
  await client.query('BEGIN');
  if(req.sessionTokenHash)await client.query('DELETE FROM visag_sessions WHERE token_hash=$1',[req.sessionTokenHash]);
  await client.query('INSERT INTO visag_sessions(token_hash,user_id,remember,expires_at) VALUES($1,$2,$3,NOW() + ($4 * INTERVAL \'1 second\'))',[hash(token),user.id,remember,remember?rememberedSeconds:sessionSeconds]);
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 res.cookie(cookieName,token,cookieSettings(req,remember));
}
async function logout(req,res){
 if(req.sessionTokenHash)await db.query('DELETE FROM visag_sessions WHERE token_hash=$1',[req.sessionTokenHash]);
 res.clearCookie(cookieName,{httpOnly:true,sameSite:'lax',secure:req.secure||process.env.NODE_ENV==='production',path:'/'});
}
async function revokeAll(userId){await db.query('DELETE FROM visag_sessions WHERE user_id=$1',[userId]);}
module.exports={attach,login,logout,revokeAll,sessionSeconds,rememberedSeconds};
