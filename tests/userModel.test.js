'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
function sandbox(t){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'visag-users-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 fs.mkdirSync(path.join(base,'models'));
 fs.mkdirSync(path.join(base,'data'));
 fs.writeFileSync(path.join(base,'data/users.json'),'[]\n');
 fs.copyFileSync(path.join(__dirname,'../models/userModel.js'),path.join(base,'models/userModel.js'));
 return {model:require(path.join(base,'models/userModel.js')),base};
}
test('Registro guarda JSON con contraseña protegida, no en texto plano',t=>{
 const {model,base}=sandbox(t);
 const user=model.register({firstName:'María',lastName:'López',email:'Maria@example.test',password:'SeguroPass-2026!'});
 assert.equal(user.category,'customer');assert.equal(user.email,'maria@example.test');
 const raw=fs.readFileSync(path.join(base,'data/users.json'),'utf8');
 assert.ok(raw.includes('scrypt$'));
 assert.ok(!raw.includes('SeguroPass-2026!'));
 assert.equal(model.all().length,1);
 assert.ok(!Object.hasOwn(user,'password'));
});
test('Inicio de sesión valida la clave y rechaza credenciales incorrectas',t=>{
 const {model}=sandbox(t);
 model.register({firstName:'Paula',lastName:'Gómez',email:'Paula@example.test',password:'MiClaveSegura-2026'});
 assert.equal(model.authenticate('paula@example.test','no es la clave'),null);
 assert.equal(model.authenticate('paula@example.test','MiClaveSegura-2026').firstName,'Paula');
});
test('No permite registros duplicados, correos incorrectos o contraseñas breves',t=>{
 const {model}=sandbox(t);
 model.register({firstName:'Ana',lastName:'Pérez',email:'ana@example.test',password:'UnaClaveMuySegura11'});
 assert.throws(()=>model.register({firstName:'Ana',lastName:'Pérez',email:'ANA@example.test',password:'UnaClaveMuySegura11'}),/Ya existe/);
 assert.throws(()=>model.register({firstName:'Ana',lastName:'Pérez',email:'abc',password:'UnaClaveMuySegura11'}),/correo/);
 assert.throws(()=>model.register({firstName:'Ana',lastName:'Pérez',email:'otra@example.test',password:'1234'}),/contraseña/);
});
test('Acceso del panel bloqueado sin credenciales y habilitado con las credenciales adecuadas',t=>{
 const auth=require('../middleware/adminAuth');
 const name=process.env.ADMIN_USERNAME,pass=process.env.ADMIN_PASSWORD;
 t.after(()=>{if(name===undefined)delete process.env.ADMIN_USERNAME;else process.env.ADMIN_USERNAME=name;if(pass===undefined)delete process.env.ADMIN_PASSWORD;else process.env.ADMIN_PASSWORD=pass;});
 delete process.env.ADMIN_USERNAME;delete process.env.ADMIN_PASSWORD;
 const fake=(header)=>{
   const req={headers:{authorization:header}};
   const res={statusCode:200,set(){return this;},status(c){this.statusCode=c;return this;},type(){return this;},send(){return this;}};
   let passed=false;auth(req,res,()=>{passed=true;});return {status:res.statusCode,passed};
 };
 assert.equal(fake('').status,503);
 process.env.ADMIN_USERNAME='sprint4admin';process.env.ADMIN_PASSWORD='ClaveSeguraDePrueba2026';
 assert.equal(fake('').status,401);
 assert.equal(fake('Basic '+Buffer.from('sprint4admin:incorrecta').toString('base64')).status,401);
 assert.equal(fake('Basic '+Buffer.from('sprint4admin:ClaveSeguraDePrueba2026').toString('base64')).passed,true);
});
