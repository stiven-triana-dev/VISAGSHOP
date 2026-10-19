'use strict';
const crypto=require('node:crypto');
const db=require('./db');
const local=require('../models/userModel');
const validEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const norm=e=>String(e||'').trim().toLowerCase();
const publicUser=local.publicUser;
const passwordDigest=(pass,salt)=>crypto.scryptSync(pass,salt,64);
function credential(pass){const salt=crypto.randomBytes(16).toString('hex');return `scrypt$${salt}$${passwordDigest(pass,salt).toString('hex')}`;}
function isUnique(error){return error?.code==='23505';}
async function register(fields){
 const firstName=String(fields?.firstName||'').trim().slice(0,75),lastName=String(fields?.lastName||'').trim().slice(0,75);
 const email=norm(fields?.email),password=fields?.password;
 if(firstName.length<2||lastName.length<2)throw Error('Ingresa nombre y apellidos válidos.');
 if(!validEmail.test(email)||email.length>180)throw Error('Correo electrónico no válido.');
 if(typeof password!=='string'||password.length<10||password.length>128)throw Error('La contraseña debe tener entre 10 y 128 caracteres.');
 const user={id:crypto.randomUUID(),firstName,lastName,email,password:credential(password),category:'customer',createdAt:new Date().toISOString()};
 try{await db.query('INSERT INTO visag_users(id,email,payload) VALUES($1,$2,$3)',[user.id,email,JSON.stringify(user)]);}catch(e){if(isUnique(e))throw Error('Ya existe una cuenta con este correo.');throw e;}
 return publicUser(user);
}
async function authenticate(email,password){
 const normalized=norm(email);
 if(!validEmail.test(normalized)||typeof password!=='string'||password.length>128)return null;
 const result=await db.query('SELECT payload FROM visag_users WHERE email=$1',[normalized]);
 const user=result.rows[0]?.payload;
 return local.checkPassword(user,password)?publicUser(user):null;
}
async function find(id){if(!id)return null;const {rows}=await db.query('SELECT payload FROM visag_users WHERE id=$1',[id]);return publicUser(rows[0]?.payload||null);}
async function updateProfile(id,changes){
 const firstName=String(changes?.firstName||'').trim(),lastName=String(changes?.lastName||'').trim(),email=norm(changes?.email),phone=String(changes?.phone||'').trim();
 if(firstName.length<2||firstName.length>75||lastName.length<2||lastName.length>75)throw Error('Nombre o apellidos no válidos.');
 if(!validEmail.test(email)||email.length>180)throw Error('Correo electrónico no válido.');
 if(phone&&!/^[+0-9 ()-]{7,25}$/.test(phone))throw Error('Teléfono no válido.');
 const client=await db.getPool().connect();
 try{
  await client.query('BEGIN');
  const previous=(await client.query('SELECT payload FROM visag_users WHERE id=$1 FOR UPDATE',[id])).rows[0]?.payload;
  if(!previous)throw Error('No se encontró el usuario.');
  const updated={...previous,firstName,lastName,email,phone,updatedAt:new Date().toISOString()};
  await client.query('UPDATE visag_users SET email=$2,payload=$3 WHERE id=$1',[id,email,JSON.stringify(updated)]);
  await client.query('COMMIT');return publicUser(updated);
 }catch(e){await client.query('ROLLBACK');if(isUnique(e))throw Error('Ya existe una cuenta con este correo.');throw e;}finally{client.release();}
}
async function changePassword(id,currentPassword,newPassword,confirmPassword){
 if(typeof newPassword!=='string'||newPassword.length<10||newPassword.length>128)throw Error('La contraseña nueva debe tener entre 10 y 128 caracteres.');
 if(newPassword!==confirmPassword)throw Error('Las contraseñas nuevas no coinciden.');
 if(newPassword===currentPassword)throw Error('La contraseña nueva debe ser diferente.');
 const client=await db.getPool().connect();
 try{
  await client.query('BEGIN');
  const previous=(await client.query('SELECT payload FROM visag_users WHERE id=$1 FOR UPDATE',[id])).rows[0]?.payload;
  if(!previous)throw Error('No se encontró el usuario.');
  if(!local.checkPassword(previous,currentPassword))throw Error('La contraseña actual no es correcta.');
  const updated={...previous,password:credential(newPassword),updatedAt:new Date().toISOString()};
  await client.query('UPDATE visag_users SET payload=$2 WHERE id=$1',[id,JSON.stringify(updated)]);
  await client.query('DELETE FROM visag_sessions WHERE user_id=$1',[id]);
  await client.query('COMMIT');return true;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
module.exports={register,authenticate,find,updateProfile,changePassword,publicUser};
