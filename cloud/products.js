'use strict';
const crypto=require('node:crypto');
const db=require('./db');
const local=require('../models/productModel');
const categories=local.categories;
const MAX_BYTES=3*1024*1024;
const mimeTypes={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
function decodeImage(data){
 if(typeof data!=='string'||data.length>Math.ceil(MAX_BYTES*4/3)+100)throw Error('Fotografía inválida o mayor a 3 MB.');
 const match=/^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(data);
 if(!match)throw Error('Usa una imagen JPG, PNG o WebP.');
 const bytes=Buffer.from(match[2],'base64');
 if(bytes.length<12||bytes.length>MAX_BYTES)throw Error('Foto inválida o mayor a 3 MB.');
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
 const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!({jpeg,png,webp}[match[1]]))throw Error('El archivo no coincide con su tipo de imagen.');
 return {bytes,mime:mimeTypes[match[1]],extension:match[1]==='jpeg'?'jpg':match[1]};
}
async function all(){const {rows}=await db.query('SELECT payload FROM visag_products ORDER BY created_at DESC, id DESC');return rows.map(r=>r.payload);}
async function find(id){const {rows}=await db.query('SELECT payload FROM visag_products WHERE id=$1',[id]);return rows[0]?.payload||null;}
function uploadId(path){return /^\/img\/uploads\/([a-f0-9-]{36})\.(?:jpg|png|webp)$/.exec(path||'')?.[1]||null;}
async function writeImage(client,imageData){
 const image=decodeImage(imageData),id=crypto.randomUUID();
 await client.query('INSERT INTO visag_uploads(id,mime,image_bytes) VALUES($1,$2,$3)',[id,image.mime,image.bytes]);
 return `/img/uploads/${id}.${image.extension}`;
}
async function create(input){
 const product=local.validate(input,null);
 if(!input.imageData)throw Error('Selecciona una fotografía para el nuevo producto.');
 // Validate before reserving any DB resources.
 decodeImage(input.imageData);
 const client=await db.getPool().connect();
 try{
  await client.query('BEGIN');
  const n=Number((await client.query("SELECT nextval('visag_product_id_seq') AS n")).rows[0].n);
  product.id=`p${String(n).padStart(3,'0')}`;
  product.imagen=await writeImage(client,input.imageData);
  await client.query('INSERT INTO visag_products(id,payload) VALUES($1,$2)',[product.id,JSON.stringify(product)]);
  await client.query('COMMIT');return product;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
async function update(id,input){
 const client=await db.getPool().connect();
 try{
  await client.query('BEGIN');
  const old=(await client.query('SELECT payload FROM visag_products WHERE id=$1 FOR UPDATE',[id])).rows[0]?.payload;
  if(!old){await client.query('ROLLBACK');return null;}
  const product={...old,...local.validate(input,old)};
  if(input.imageData){
   decodeImage(input.imageData);
   product.imagen=await writeImage(client,input.imageData);
  }
  await client.query('UPDATE visag_products SET payload=$2 WHERE id=$1',[id,JSON.stringify(product)]);
  if(input.imageData){const oldImageId=uploadId(old.imagen);if(oldImageId)await client.query('DELETE FROM visag_uploads WHERE id=$1',[oldImageId]);}
  await client.query('COMMIT');return product;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
async function remove(id){
 const client=await db.getPool().connect();
 try{
  await client.query('BEGIN');
  const old=(await client.query('DELETE FROM visag_products WHERE id=$1 RETURNING payload',[id])).rows[0]?.payload;
  if(old){const imageId=uploadId(old.imagen);if(imageId)await client.query('DELETE FROM visag_uploads WHERE id=$1',[imageId]);}
  await client.query('COMMIT');return old||null;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
async function image(id){const {rows}=await db.query('SELECT mime,image_bytes FROM visag_uploads WHERE id=$1',[id]);return rows[0]||null;}
module.exports={all,find,create,update,remove,image,categories,decodeImage};
