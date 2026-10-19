'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
function isolated(t){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'visag-s5-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 for(const dir of ['models','middleware','data'])fs.mkdirSync(path.join(base,dir));
 fs.copyFileSync(path.resolve(__dirname,'../models/userModel.js'),path.join(base,'models/userModel.js'));
 fs.copyFileSync(path.resolve(__dirname,'../middleware/customerSession.js'),path.join(base,'middleware/customerSession.js'));
 fs.writeFileSync(path.join(base,'data','users.json'),'[]\n');
 const users=require(path.join(base,'models','userModel.js'));
 const session=require(path.join(base,'middleware','customerSession.js'));
 const user=users.register({firstName:'Laura',lastName:'Díaz',email:'laura@ejemplo.test',password:'ClaveInicial2026!'});
 const cookies=[];
 const res={locals:{},cookie(name,value,options){cookies.push({name,value,options});},clearCookie(name,options){this.cleared={name,options};}};
 const req=(cookie='')=>({headers:{cookie},secure:false});
 return {base,users,session,user,cookies,res,req};
}
function authenticate(env,cookie){let current;const req=env.req(cookie);const res={locals:{}};env.session.attach(req,res,()=>{current=req.customer;});return current;}
test('Sprint 5: login crea sesión opaca, no revela ID ni contraseña',t=>{
 const e=isolated(t);e.session.login(e.req(),e.res,e.user,false);
 const cookie=e.cookies[0];assert.equal(cookie.name,'visag_session');
 assert.match(cookie.value,/^[0-9a-f]{64}$/);
 assert.equal(cookie.options.httpOnly,true);
 assert.equal(cookie.options.sameSite,'lax');
 assert.equal(Object.hasOwn(cookie.options,'maxAge'),false);
 const raw=fs.readFileSync(path.join(e.base,'data/sessions.json'),'utf8');
 assert.ok(!raw.includes(cookie.value));
 assert.ok(!raw.includes('ClaveInicial2026!'));
 assert.equal(authenticate(e,`visag_session=${cookie.value}`).id,e.user.id);
});
test('Sprint 5: Recordarme crea cookie de 30 días y persiste sesión tras recargar módulo',t=>{
 const e=isolated(t);e.session.login(e.req(),e.res,e.user,true);
 const cookie=e.cookies[0];
 assert.equal(cookie.options.maxAge,30*24*60*60*1000);
 const modPath=require.resolve(path.join(e.base,'middleware','customerSession.js'));
 delete require.cache[modPath];
 const refreshed=require(modPath);
 let actual;refreshed.attach(e.req(`visag_session=${cookie.value}`),{locals:{}},()=>actual=true);
 assert.equal(actual,true);
});
test('Sprint 5: logout revoca token en servidor, además de borrar cookie',t=>{
 const e=isolated(t);e.session.login(e.req(),e.res,e.user,true);
 const cookie=`visag_session=${e.cookies[0].value}`;
 const req=e.req(cookie);e.session.attach(req,{locals:{}},()=>{});
 assert.equal(req.customer.id,e.user.id);
 e.session.logout(req,e.res);
 assert.equal(authenticate(e,cookie),null);
 assert.equal(e.res.cleared.name,'visag_session');
});
test('Sprint 5: perfil editable sin exponer hash y rechazo de email duplicado',t=>{
 const e=isolated(t);
 const updated=e.users.updateProfile(e.user.id,{firstName:'Laura María',lastName:'Díaz',email:'nuevo@ejemplo.test',phone:'+57 301 234 5678'});
 assert.equal(updated.firstName,'Laura María');assert.equal(updated.email,'nuevo@ejemplo.test');
 assert.equal(updated.phone,'+57 301 234 5678');assert.equal(Object.hasOwn(updated,'password'),false);
 assert.equal(e.users.authenticate('nuevo@ejemplo.test','ClaveInicial2026!').id,e.user.id);
 e.users.register({firstName:'Otra',lastName:'Persona',email:'otra@ejemplo.test',password:'OtraClave2026!!'});
 assert.throws(()=>e.users.updateProfile(e.user.id,{firstName:'Laura',lastName:'Diaz',email:'otra@ejemplo.test'}),/Ya existe/);
});
test('Sprint 5: cambiar contraseña invalida los tokens; contraseña vieja deja de funcionar',t=>{
 const e=isolated(t);e.session.login(e.req(),e.res,e.user,false);const cookie=`visag_session=${e.cookies[0].value}`;
 assert.throws(()=>e.users.changePassword(e.user.id,'equivocada','NuevaClaveMuySegura2026','NuevaClaveMuySegura2026'),/actual/);
 e.users.changePassword(e.user.id,'ClaveInicial2026!','NuevaClaveMuySegura2026','NuevaClaveMuySegura2026');
 e.session.revokeAll(e.user.id);
 assert.equal(authenticate(e,cookie),null);
 assert.equal(e.users.authenticate('laura@ejemplo.test','ClaveInicial2026!'),null);
 assert.equal(e.users.authenticate('laura@ejemplo.test','NuevaClaveMuySegura2026').id,e.user.id);
});
test('Sprint 5: acceso por rol de visitante y cliente',()=>{
 const requireGuest=require('../middleware/requireGuest');
 const requireCustomer=require('../middleware/requireCustomer');
 const res=()=>({code:200,header:null,redirected:null,body:null,headers:{},set(k,v){this.headers[k]=v;return this;},status(code){this.code=code;return this;},json(body){this.body=body;return this;},redirect(code,url){this.code=code;this.redirected=url;return this;}});
 let called=false;
 let r=res();requireGuest({customer:null},r,()=>called=true);assert.equal(called,true);
 called=false;r=res();requireGuest({customer:{id:'x'},originalUrl:'/login'},r,()=>called=true);assert.equal(r.redirected,'/profile');assert.equal(called,false);
 r=res();requireGuest({customer:{id:'x'},originalUrl:'/api/account/login'},r,()=>{});assert.equal(r.code,409);
 r=res();requireCustomer({customer:null,originalUrl:'/profile',path:'/profile'},r,()=>{});assert.equal(r.redirected,'/login?next=%2Fprofile');
 r=res();requireCustomer({customer:null,originalUrl:'/api/account/profile',path:'/profile'},r,()=>{});assert.equal(r.code,401);
 called=false;r=res();requireCustomer({customer:{id:'x'}},r,()=>called=true);assert.equal(called,true);
});
test('Sprint 5: no permite redirecciones a dominios externos después del login',()=>{
 const {cleanNext}=require('../controllers/accountController');
 assert.equal(cleanNext('//evil.example'),'/profile');
 assert.equal(cleanNext('https://evil.example'),'/profile');
 assert.equal(cleanNext('/profile'),'/profile');
 assert.equal(cleanNext('/products/p009'),'/products/p009');
});
