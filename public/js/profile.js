(() => {
 'use strict';
 async function submitJson(form,path,method,message){
  const button=form.querySelector('[type="submit"]');
  message.textContent='Guardando…';message.className='profile-response';
  button.disabled=true;
  try{
   const body=Object.fromEntries(new FormData(form).entries());
   const response=await fetch(path,{method,headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'No fue posible guardar los cambios.');
   message.className='profile-response is-success';message.textContent=data.message||'Cambios guardados.';
   if(data.redirect){setTimeout(()=>location.assign(data.redirect),900);}
   else if(data.user){document.querySelector('.profile-identity strong').textContent=data.user.firstName+' '+data.user.lastName;document.querySelector('.profile-identity small').textContent=data.user.email;document.querySelector('.profile-avatar').textContent=(data.user.firstName.charAt(0)+data.user.lastName.charAt(0)).toUpperCase();}
   if(path.endsWith('/password'))form.reset();
  }catch(error){message.className='profile-response is-error';message.textContent=error.message;}
  finally{button.disabled=false;}
 }
 const personal=document.querySelector('#profile-form');
 const password=document.querySelector('#password-form');
 personal?.addEventListener('submit',event=>{event.preventDefault();if(personal.reportValidity())submitJson(personal,'/api/account/profile','PUT',document.querySelector('#profile-response'));});
 password?.addEventListener('submit',event=>{event.preventDefault();if(password.reportValidity())submitJson(password,'/api/account/password','PUT',document.querySelector('#password-response'));});
 document.querySelector('#cerrar-sesion-perfil')?.addEventListener('click',async event=>{
  const button=event.currentTarget;button.disabled=true;
  try{const response=await fetch('/api/account/logout',{method:'POST',credentials:'same-origin'});if(!response.ok)throw new Error('No fue posible cerrar sesión.');location.assign('/login');}
  catch(error){button.disabled=false;window.Visag?.notify?.(error.message);}
 });
})();
