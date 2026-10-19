(() => {
 'use strict';
 const form=document.getElementById('demo-form');if(!form)return;
 const message=document.getElementById('form-message');
 const nextField=document.getElementById('auth-next');
 const next=new URLSearchParams(location.search).get('next');
 if(nextField && next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\'))nextField.value=next;
 form.addEventListener('submit',async event=>{
  event.preventDefault();message.textContent='';
  if(!form.reportValidity())return;
  const mode=form.dataset.mode;
  if(mode==='recover'){
   message.style.color='#885e28';
   message.textContent='La recuperación automática por correo aún no está habilitada. Contacta a VisagShop por WhatsApp.';
   return;
  }
  const fd=new FormData(form);const body=Object.fromEntries(fd.entries());
  if(mode==='login')body.remember=Boolean(form.querySelector('[name=remember]')?.checked);
  if(mode==='register'&&body.password!==body.confirm){message.textContent='Las contraseñas no coinciden.';return;}
  const button=form.querySelector('[type=submit]');button.disabled=true;
  message.style.color='#666';message.textContent=mode==='register'?'Creando tu cuenta…':'Comprobando tus datos…';
  try {
   const r=await fetch(`/api/account/${mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'same-origin'});
   const data=await r.json();if(!r.ok)throw new Error(data.error||'No se pudo completar la operación.');
   message.style.color='#246a3a';message.textContent=mode==='register'?'Tu cuenta fue creada correctamente.':'Inicio de sesión correcto.';
   location.assign(data.redirect||'/');
  }catch(e){message.style.color='#bb3434';message.textContent=e.message;}
  finally{button.disabled=false;}
 });
})();
