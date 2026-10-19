'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const dataDir=path.resolve(process.env.VISAG_DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname,'..','data'));
const file=path.join(dataDir,'users.json');
const validEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function all(){const result=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(result))throw new Error('JSON de usuarios inválido');return result;}
function write(items){const tmp=path.join(path.dirname(file),`.users-${process.pid}-${crypto.randomUUID()}.tmp`);try{fs.writeFileSync(tmp,JSON.stringify(items,null,2)+'\n',{mode:0o600});fs.renameSync(tmp,file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
function normalizeEmail(email){return String(email||'').trim().toLowerCase();}
function publicUser(user){return user&&{id:user.id,firstName:user.firstName,lastName:user.lastName,email:user.email,phone:user.phone||'',category:user.category,createdAt:user.createdAt||null};}
function register(fields){
 if(!fields||typeof fields!=='object')throw new Error('Datos incorrectos.');
 const firstName=String(fields.firstName||'').trim().slice(0,75),lastName=String(fields.lastName||'').trim().slice(0,75);
 const email=normalizeEmail(fields.email),password=fields.password;
 if(firstName.length<2||lastName.length<2)throw new Error('Ingresa nombre y apellidos válidos.');
 if(!validEmail.test(email)||email.length>180)throw new Error('El correo electrónico no es válido.');
 if(typeof password!=='string'||password.length<10||password.length>128)throw new Error('La contraseña debe tener entre 10 y 128 caracteres.');
 const items=all();
 if(items.some(x=>x.email===email))throw new Error('Ya existe una cuenta con este correo.');
 const salt=crypto.randomBytes(16).toString('hex');
 const passwordHash=crypto.scryptSync(password,salt,64).toString('hex');
 const user={id:crypto.randomUUID(),firstName,lastName,email,password:`scrypt$${salt}$${passwordHash}`,category:'customer',createdAt:new Date().toISOString()};
 items.push(user);write(items);return publicUser(user);
}
function passwordDigest(password,salt){return crypto.scryptSync(password,salt,64);}
function validPassword(password){return typeof password==='string'&&password.length>=10&&password.length<=128;}
function checkPassword(user,password){
 if(!user||!validPassword(password)||typeof user.password!=='string')return false;
 const [algo,salt,stored]=user.password.split('$');
 if(algo!=='scrypt'||!/^[0-9a-f]{32}$/.test(salt)||!/^[0-9a-f]{128}$/.test(stored))return false;
 return crypto.timingSafeEqual(passwordDigest(password,salt),Buffer.from(stored,'hex'));
}
function authenticate(email,password){
 const normalized=normalizeEmail(email);
 if(!validEmail.test(normalized)||typeof password!=='string'||password.length>128)return null;
 const user=all().find(x=>x.email===normalized);
 if(!user||typeof user.password!=='string')return null;
 return checkPassword(user,password)?publicUser(user):null;
}
function find(id){return publicUser(all().find(u=>u.id===id)||null);}
function updateProfile(id,changes){
 if(!changes||typeof changes!=='object')throw new Error('Información inválida.');
 const items=all(),index=items.findIndex(u=>u.id===id);
 if(index===-1)throw new Error('No se encontró el usuario.');
 const firstName=String(changes.firstName||'').trim();
 const lastName=String(changes.lastName||'').trim();
 const email=normalizeEmail(changes.email);
 const phone=String(changes.phone||'').trim();
 if(firstName.length<2||firstName.length>75||lastName.length<2||lastName.length>75)throw new Error('Nombre o apellidos no válidos.');
 if(!validEmail.test(email)||email.length>180)throw new Error('Correo electrónico no válido.');
 if(phone && !/^[+0-9 ()-]{7,25}$/.test(phone))throw new Error('Teléfono no válido.');
 if(items.some(u=>u.id!==id&&u.email===email))throw new Error('Ya existe una cuenta con este correo.');
 items[index]={...items[index],firstName,lastName,email,phone,updatedAt:new Date().toISOString()};
 write(items);return publicUser(items[index]);
}
function changePassword(id,currentPassword,newPassword,confirmPassword){
 const items=all(),index=items.findIndex(u=>u.id===id);
 if(index===-1)throw new Error('No se encontró el usuario.');
 if(!checkPassword(items[index],currentPassword))throw new Error('La contraseña actual no es correcta.');
 if(!validPassword(newPassword))throw new Error('La contraseña nueva debe tener entre 10 y 128 caracteres.');
 if(newPassword!==confirmPassword)throw new Error('Las contraseñas nuevas no coinciden.');
 if(currentPassword===newPassword)throw new Error('La contraseña nueva debe ser diferente.');
 const salt=crypto.randomBytes(16).toString('hex');
 items[index].password=`scrypt$${salt}$${passwordDigest(newPassword,salt).toString('hex')}`;
 items[index].updatedAt=new Date().toISOString();write(items);return true;
}
module.exports={all,register,authenticate,find,publicUser,updateProfile,changePassword,checkPassword};
