'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
test('Sesión rechaza cookies adulteradas y conserva datos personales fuera de la cookie',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'visag-token-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 for(const sub of ['middleware','models','data'])fs.mkdirSync(path.join(dir,sub));
 fs.copyFileSync(path.resolve(__dirname,'../models/userModel.js'),path.join(dir,'models/userModel.js'));
 fs.copyFileSync(path.resolve(__dirname,'../middleware/customerSession.js'),path.join(dir,'middleware/customerSession.js'));
 fs.writeFileSync(path.join(dir,'data','users.json'),'[]\n');
 const users=require(path.join(dir,'models','userModel.js'));
 const session=require(path.join(dir,'middleware','customerSession.js'));
 const user=users.register({firstName:'Ana',lastName:'López',email:'ana@example.test',password:'PasswordEjemplo2026'});
 let cookieValue='';
 const res={cookie(name,value,options){assert.equal(name,'visag_session');cookieValue=value;assert.equal(options.httpOnly,true);assert.equal(options.sameSite,'lax');}};
 session.login({headers:{},secure:false},res,user);
 function parse(cookie){const req={headers:{cookie}};let complete=false;session.attach(req,{locals:{}},()=>{complete=true;});assert.equal(complete,true);return req.customer;}
 assert.equal(parse(`visag_session=${cookieValue}`).id,user.id);
 assert.equal(parse(`visag_session=${cookieValue.slice(0,-1)}X`),null);
 assert.equal(parse(''),null);
 assert.equal(cookieValue.includes(user.id),false);
});
