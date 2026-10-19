'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
function sandbox(t) {
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'visag-sprint4-'));
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  fs.mkdirSync(path.join(base,'models'),{recursive:true});
  fs.mkdirSync(path.join(base,'data'),{recursive:true});
  fs.mkdirSync(path.join(base,'public/img'),{recursive:true});
  fs.copyFileSync(path.join(__dirname,'../models/productModel.js'),path.join(base,'models/productModel.js'));
  fs.writeFileSync(path.join(base,'data/products.json'),JSON.stringify([{id:'p001',nombre:'Jean de prueba',descripcion:'',categoria:'Pantalones',precio:100000,tallas:['M'],imagen:'/img/p001.jpg'}]));
  return {model:require(path.join(base,'models/productModel.js')),base};
}
const tinyPng='data:image/png;base64,'+Buffer.from('89504e470d0a1a0a0000000d49484452','hex').toString('base64');
test('El modelo crea un producto y lo guarda con nueva referencia',t=>{
  const {model}=sandbox(t);
  const item=model.create({nombre:'Camiseta nueva',descripcion:'Algodón',categoria:'Sudaderas',precio:'80000',tallas:'S, M, L',colores:'Negro, Blanco',imageData:tinyPng});
  assert.equal(item.id,'p002');assert.equal(model.all().length,2);assert.deepEqual(item.tallas,['S','M','L']);assert.equal(item.precio,80000);
  assert.match(item.imagen,/^\/img\/uploads\/.*\.png$/);
});
test('El modelo edita sin cambiar el ID ni la fotografía anterior',t=>{
  const {model}=sandbox(t);
  const updated=model.update('p001',{nombre:'Jean editado',descripcion:'Nuevo',categoria:'Pantalones',precio:'',tallas:'28, 30',colores:'Azul'});
  assert.equal(updated.id,'p001');assert.equal(updated.precio,null);assert.equal(updated.imagen,'/img/p001.jpg');assert.equal(updated.descripcion,'Nuevo');
});
test('El modelo rechaza datos incorrectos e imágenes falsas',t=>{
  const {model}=sandbox(t);
  assert.throws(()=>model.create({nombre:'Prenda nueva',categoria:'Sin categoria',precio:'5',imageData:tinyPng}),/Categoría/);
  assert.throws(()=>model.create({nombre:'Prenda nueva',categoria:'Gorras',precio:'-40',imageData:tinyPng}),/precio/);
  assert.throws(()=>model.create({nombre:'Prenda nueva',categoria:'Gorras',precio:'40000',imageData:'data:image/png;base64,YWJjZA=='}),/imagen/i);
});
test('Administrador: cerrado sin credenciales y protegido con contraseña',t=>{
  const auth=require('../middleware/adminAuth');
  const oldUser=process.env.ADMIN_USERNAME, oldPassword=process.env.ADMIN_PASSWORD;
  t.after(()=>{if(oldUser===undefined)delete process.env.ADMIN_USERNAME;else process.env.ADMIN_USERNAME=oldUser;if(oldPassword===undefined)delete process.env.ADMIN_PASSWORD;else process.env.ADMIN_PASSWORD=oldPassword;});
  const fake=(header)=>{
    const output={statusCode:200,headers:{}};
    const req={headers:{authorization:header}};
    const res={set(k,v){output.headers[k]=v;return this;},status(code){output.statusCode=code;return this;},type(){return this;},send(message){output.body=message;return this;}};
    let nextCalled=false;auth(req,res,()=>{nextCalled=true;});return {...output,nextCalled};
  };
  delete process.env.ADMIN_USERNAME;delete process.env.ADMIN_PASSWORD;
  assert.equal(fake('').statusCode,503);
  process.env.ADMIN_USERNAME='testadmin';process.env.ADMIN_PASSWORD='my-local-test-secret';
  assert.equal(fake('').statusCode,401);
  assert.equal(fake('Basic '+Buffer.from('testadmin:bad').toString('base64')).statusCode,401);
  assert.equal(fake('Basic '+Buffer.from('testadmin:my-local-test-secret').toString('base64')).nextCalled,true);
});

test('Elimina un producto y permanece eliminado al volver a leer el archivo JSON',t=>{
  const {model,base}=sandbox(t);
  const deleted=model.remove('p001');
  assert.equal(deleted.id,'p001');
  assert.equal(model.all().length,0);
  assert.equal(model.find('p001'),null);
  assert.equal(model.remove('p001'),null);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(base,'data/products.json'),'utf8')),[]);
});
test('La eliminación limpia solo fotos administradas, no fotografías del catálogo original',t=>{
  const {model,base}=sandbox(t);
  const created=model.create({nombre:'Gorra azul original',categoria:'Gorras',precio:'35000',imageData:tinyPng});
  const uploaded=path.join(base,'public',created.imagen.replace(/^\//,''));
  assert.ok(fs.existsSync(uploaded));
  model.remove(created.id);
  assert.equal(fs.existsSync(uploaded),false);
  const original=path.join(base,'public/img/p001.jpg');
  fs.writeFileSync(original,'producto original');
  model.remove('p001');
  assert.equal(fs.existsSync(original),true);
});

test('No reutiliza un ID tras borrar el último producto creado',t=>{
 const {model}=sandbox(t);
 const a=model.create({nombre:'Gorra ejemplo azul',categoria:'Gorras',precio:'45000',imageData:tinyPng});
 model.remove(a.id);
 const b=model.create({nombre:'Gorra ejemplo blanca',categoria:'Gorras',precio:'46000',imageData:tinyPng});
 assert.equal(a.id,'p002');assert.equal(b.id,'p003');
});
