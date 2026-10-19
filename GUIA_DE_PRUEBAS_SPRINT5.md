# Guía de pruebas manuales · Sprint 5

## Preparación

1. Extraer todo el ZIP. Confirmar que `package.json` está en la raíz.
2. Ejecutar `INICIAR_VISAGSHOP.bat` o `npm install` + `npm start`.
3. Abrir http://localhost:3000 en una ventana normal y otra de incógnito.

## Casos a verificar y evidenciar con capturas

1. **Visitante:** abrir `/`, `/products`, detalle y carrito sin estar registrado. Deben abrir con normalidad.
2. **Bloqueo del perfil:** visitar `/profile` sin sesión. Debe redirigir a `/login?next=%2Fprofile`.
3. **Registro:** crear un usuario nuevo con contraseña de al menos 10 caracteres. Debe guardarse en `data/users.json` con hash `scrypt$...`, no en texto plano; debe redirigir al perfil.
4. **Perfil protegido:** estando dentro ver el nombre y email; los datos deben coincidir con el registro. Editar nombre, email y teléfono y comprobar que persisten tras recargar.
5. **Cerrar sesión:** pulsar Salir; `/profile` debe volver a pedir login. En incógnito o con cookie anterior, la sesión anterior no debe recuperarse.
6. **Login sin recordar:** iniciar sesión sin marcar Recordarme. En DevTools > Application > Cookies, la cookie debe ser de sesión (sin Max-Age/Expires persistente).
7. **Login recordado:** salir y entrar marcando Recordarme. Cookie con Max-Age de 30 días. Recargar el navegador: debe seguir autenticado. En equipos compartidos NO marcar esta opción.
8. **Middleware de huéspedes:** con sesión iniciada intentar `/login` y `/register`: deben redirigir a `/profile`.
9. **Contraseña:** desde el perfil cambiar la contraseña ingresando la actual y la nueva. Debe cerrar las sesiones; la anterior no debe permitir acceso y la nueva sí.
10. **Errores:** probar contraseñas incorrectas, correo duplicado y teléfono inválido. Deben aparecer mensajes de validación sin exponer contraseñas.
11. **Panel:** ejecutar la versión administrativa, comprobar que alta, edición y eliminación del Sprint 4 siguen disponibles. Cliente autenticado NO equivale a administrador.
12. **Regresión:** confirmar que búsqueda, filtros, fotos, tallas, carrito y selector de pago siguen disponibles.

## Limitaciones conocidas

No hay correo de recuperación, confirmación de email, pasarela de pagos ni base de datos. Asegura pruebas en el navegador antes de la entrega, ya que en el entorno de preparación no pudieron descargarse dependencias npm para ejecutar Express y EJS.
