'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const db=require('../cloud/db');
const products=require('../cloud/products');
const users=require('../cloud/users');
const sessions=require('../cloud/sessions');
const crypto=require('node:crypto');
const img='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YL//yoAAAAASUVORK5CYII=';

test('Adapter Neon: CRUD y fotografía se guardan y se eliminan mediante SQL',async t=>{
 const origPool=db.getPool,origQuery=db.query;
 t.after(()=>{db.getPool=origPool;db.query=origQuery;});
 const table=new Map(),photos=new Map();let seq=108;
 const query=async(sql,params=[])=>{
  if(sql.startsWith('BEGIN')||sql.startsWith('COMMIT')||sql.startsWith('ROLLBACK'))return {rows:[],rowCount:0};
  if(sql.includes("nextval('visag_product_id_seq')"))return {rows:[{n:++seq}],rowCount:1};
  if(sql.startsWith('INSERT INTO visag_uploads')){photos.set(params[0],{mime:params[1],image_bytes:params[2]});return {rows:[],rowCount:1};}
  if(sql.startsWith('INSERT INTO visag_products')){table.set(params[0],JSON.parse(params[1]));return {rows:[],rowCount:1};}
  if(sql.startsWith('SELECT payload FROM visag_products WHERE id='))return {rows:table.has(params[0])?[{payload:table.get(params[0])}]:[],rowCount:table.has(params[0])?1:0};
  if(sql.startsWith('SELECT payload FROM visag_products ORDER'))return {rows:[...table.values()].map(payload=>({payload})),rowCount:table.size};
  if(sql.startsWith('UPDATE visag_products')){table.set(params[0],JSON.parse(params[1]));return {rows:[],rowCount:1};}
  if(sql.startsWith('DELETE FROM visag_products')){const old=table.get(params[0]);table.delete(params[0]);return {rows:old?[{payload:old}]:[],rowCount:old?1:0};}
  if(sql.startsWith('DELETE FROM visag_uploads')){photos.delete(params[0]);return {rows:[],rowCount:1};}
  if(sql.startsWith('SELECT mime,image_bytes FROM visag_uploads'))return {rows:photos.has(params[0])?[photos.get(params[0])]:[],rowCount:photos.has(params[0])?1:0};
  throw Error('SQL sin simular: '+sql);
 };
 db.getPool=()=>({connect:async()=>({query,release(){}})});db.query=query;
 const p=await products.create({nombre:'Prenda de prueba',categoria:'Gorras',precio:15000,tallas:'Única',colores:'Azul',imageData:img});
 assert.equal(p.id,'p109');assert.match(p.imagen,/^\/img\/uploads\/.*\.png$/);
 assert.equal((await products.all()).length,1);
 const match=/\/uploads\/([a-f0-9-]{36})\.png$/.exec(p.imagen);
 assert.equal((await products.image(match[1])).mime,'image/png');
 const edited=await products.update(p.id,{nombre:'Prenda actualizada',categoria:'Gorras',precio:15500,tallas:'Única',colores:'Negro'});
 assert.equal(edited.precio,15500);assert.equal((await products.find(p.id)).nombre,'Prenda actualizada');
 assert.equal((await products.remove(p.id)).id,p.id);
 assert.equal(await products.find(p.id),null);assert.equal(await products.image(match[1]),null);
});

test('Adapter Neon: cliente, cookie opaca y revocación mantienen las operaciones parametrizadas',async t=>{
 const origPool=db.getPool,origQuery=db.query;
 t.after(()=>{db.getPool=origPool;db.query=origQuery;});
 const account=new Map(),emailIndex=new Map(),tokens=new Map();
 const query=async(sql,params=[])=>{
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return {rows:[],rowCount:0};
  if(sql.startsWith('INSERT INTO visag_users')){
   if(emailIndex.has(params[1])){const e=Error('duplicate');e.code='23505';throw e;}
   account.set(params[0],JSON.parse(params[2]));emailIndex.set(params[1],params[0]);return {rows:[],rowCount:1};
  }
  if(sql.startsWith('SELECT payload FROM visag_users WHERE email='))return {rows:emailIndex.has(params[0])?[{payload:account.get(emailIndex.get(params[0]))}]:[],rowCount:1};
  if(sql.startsWith('SELECT payload FROM visag_users WHERE id='))return {rows:account.has(params[0])?[{payload:account.get(params[0])}]:[],rowCount:1};
  if(sql.startsWith('UPDATE visag_users')){const old=account.get(params[0]);emailIndex.delete(old.email);const changed=JSON.parse(params[2]??params[1]);account.set(params[0],changed);emailIndex.set(changed.email,params[0]);return {rows:[],rowCount:1};}
  if(sql.startsWith('DELETE FROM visag_sessions WHERE user_id=')){for(const [key,value] of tokens)if(value.user_id===params[0])tokens.delete(key);return {rows:[],rowCount:1};}
  if(sql.startsWith('DELETE FROM visag_sessions WHERE token_hash=')){tokens.delete(params[0]);return {rows:[],rowCount:1};}
  if(sql.startsWith('INSERT INTO visag_sessions')){tokens.set(params[0],{user_id:params[1],remember:params[2]});return {rows:[],rowCount:1};}
  if(sql.startsWith('SELECT user_id FROM visag_sessions'))return {rows:tokens.has(params[0])?[tokens.get(params[0])]:[],rowCount:tokens.has(params[0])?1:0};
  throw Error('SQL sin simular: '+sql);
 };
 db.getPool=()=>({connect:async()=>({query,release(){}})});db.query=query;
 const user=await users.register({firstName:'Ana',lastName:'Pérez',email:'prueba@example.test',password:'MiClaveSegura2026'});
 assert.equal((await users.authenticate('prueba@example.test','MiClaveSegura2026')).id,user.id);
 assert.equal(await users.authenticate('prueba@example.test','clave incorrecta'),null);
 let cookie;
 const response={locals:{},cookie(name,value,options){cookie=value;assert.equal(options.httpOnly,true);},clearCookie(){this.cleared=true;}};
 const req={headers:{},secure:true};await sessions.login(req,response,user,true);
 assert.match(cookie,/^[0-9a-f]{64}$/);assert.equal(tokens.size,1);
 assert.equal(tokens.has(crypto.createHash('sha256').update(cookie).digest('hex')),true);
 const logged={headers:{cookie:'visag_session='+cookie}};
 await new Promise((resolve,reject)=>sessions.attach(logged,{locals:{}},e=>e?reject(e):resolve()));
 assert.equal(logged.customer.id,user.id);
 await sessions.logout(logged,response);
 assert.equal(tokens.size,0);assert.ok(response.cleared);
});
