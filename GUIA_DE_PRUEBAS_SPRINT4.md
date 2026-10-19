# VisagShop Sprint 4 · Guía de verificación manual

Esta guía sirve para evidenciar los requisitos del PDF. **No sustituye pruebas ejecutadas por el equipo**: anota resultados, capturas y responsables reales.

## Preparación
1. Descomprime el ZIP en una carpeta propia. Verifica que `package.json` está ahí.
2. Usa `INICIAR_PANEL_ADMIN.bat` para elegir credenciales propias. Asegúrate de que Node.js está instalado.
3. Abre `http://localhost:3000`.
4. Conserva una copia de `data/products.json`, `data/users.json` y `data/product-sequence.json` antes de probar eliminar productos.

| Paso | Acción manual | Comportamiento esperado | Resultado / evidencia |
|---|---|---|---|
| 1 | Abre `GET /products` | Lista las 108 referencias iniciales (o número actual) | Pendiente |
| 2 | Abre `GET /products/p042` | Muestra detalle, precio y foto de la referencia | Pendiente |
| 3 | Visita `/products/create` sin autenticación | Solicita credenciales de admin | Pendiente |
| 4 | Entra a `/admin/products` autenticado | Carga listado, búsqueda y acciones | Pendiente |
| 5 | Crea una gorra de prueba con una foto | Registra un ID nuevo y aparece en el catálogo | Pendiente |
| 6 | Edita el nombre y precio desde su formulario | Guarda cambios sin alterar el ID | Pendiente |
| 7 | Pulsa Eliminar y cancela | La prenda permanece | Pendiente |
| 8 | Pulsa Eliminar y confirma | La prenda desaparece del listado y del JSON | Pendiente |
| 9 | Registra una cuenta ficticia en `/register` | Mensaje de éxito y sesión iniciada | Pendiente |
| 10 | Pulsa **Salir**, inicia sesión en `/login` | Accede con las mismas credenciales | Pendiente |
| 11 | Revisa `data/users.json` | No existe contraseña en texto plano | Pendiente |
| 12 | Abre portada, filtros, carrito y checkout desde celular | Funcionan y conservan el diseño | Pendiente |

## Pruebas HTTP para demostrar PUT y DELETE

Desde la herramienta de desarrollo del navegador (Network), crear y guardar mediante el panel envía `POST /products` y `PUT /products/:id`. La acción eliminar envía `DELETE /products/:id`; las respuestas exitosas retornan JSON.

## Resultado final

**Fecha de las pruebas:** pendiente  
**Equipo evaluador:** pendiente  
**Errores encontrados:** pendiente  
**Acciones correctivas:** pendiente  
**Evidencias/capturas:** pendiente

No intentes publicar la tienda académica sin adaptar autenticación, seguridad, protección de datos personales y persistencia a un entorno productivo.
