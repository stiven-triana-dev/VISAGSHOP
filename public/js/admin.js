(() => {
  'use strict';
  const form=document.getElementById('admin-product-form');
  if (!form) return;
  const feedback=document.getElementById('admin-feedback');
  const preview=document.getElementById('imagen-preview');
  const fileInput=form.elements.imagen;
  const submit=document.getElementById('guardar-producto');
  const money=number=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(number);
  const updatePreview=()=>{
    document.getElementById('preview-nombre').textContent=form.elements.nombre.value||'Nombre de tu nueva prenda';
    const value=form.elements.precio.value;
    document.getElementById('preview-precio').textContent=value!==''&&Number.isFinite(Number(value))?money(Number(value)):'Precio por consultar';
  };
  form.addEventListener('input',updatePreview);
  fileInput.addEventListener('change',()=>{
    const file=fileInput.files[0];
    if (!file)return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>3*1024*1024){
      feedback.textContent='La fotografía debe ser JPG, PNG o WebP y pesar máximo 3 MB.';feedback.className='admin-feedback error';fileInput.value='';return;
    }
    if(preview.dataset.objectUrl)URL.revokeObjectURL(preview.dataset.objectUrl);
    const objectUrl=URL.createObjectURL(file);preview.dataset.objectUrl=objectUrl;preview.src=objectUrl;
    feedback.textContent='';feedback.className='admin-feedback';
  });
  function readFile(file){return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('No fue posible leer la fotografía.'));reader.readAsDataURL(file);
  });}
  if (new URLSearchParams(location.search).has('success')) {
    feedback.className='admin-feedback success';feedback.textContent='Los cambios se guardaron correctamente en el catálogo.';
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!form.reportValidity())return;
    submit.disabled=true;feedback.className='admin-feedback';feedback.textContent='Guardando producto…';
    try {
      const values=new FormData(form);
      const data={nombre:values.get('nombre'),descripcion:values.get('descripcion'),categoria:values.get('categoria'),precio:values.get('precio'),tallas:values.get('tallas'),colores:values.get('colores')};
      const file=fileInput.files[0];if(file)data.imageData=await readFile(file);
      const mode=form.dataset.mode,id=form.dataset.id;
      const endpoint=mode==='new'?'/products':`/products/${encodeURIComponent(id)}`;
      const response=await fetch(endpoint,{method:mode==='new'?'POST':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'same-origin'});
      const result=await response.json().catch(()=>({error:`Error del servidor (${response.status})`}));
      if(!response.ok)throw new Error(result.error||'No se pudo guardar el producto.');
      if(result.redirect)window.location.assign(result.redirect);
      else {feedback.className='admin-feedback success';feedback.textContent='Producto guardado.';}
    }catch(error){feedback.className='admin-feedback error';feedback.textContent=error.message;}
    finally{submit.disabled=false;}
  });
})();
