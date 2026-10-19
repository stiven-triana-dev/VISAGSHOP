# Tablero de trabajo — VisagShop Sprint 4

> Borrador de planificación y seguimiento. **No afirma la celebración de reuniones ni asigna nombres inventados.** Pasar a Trello/GitHub Projects si la asignatura exige un enlace público o compartido.

| ID | Historia / tarea | Prioridad | Estado del código | Responsable |
| --- | --- | --- | --- | --- |
| S4-01 | Analizar el documento y mapear las rutas HTTP | Alta | Implementado | Por asignar |
| S4-02 | Definir esquema de productos y crear `data/products.json` | Alta | Implementado | Por asignar |
| S4-03 | Definir esquema de usuarios y crear `data/users.json` | Alta | Implementado | Por asignar |
| S4-04 | GET `/products`: listado público dinámico | Alta | Implementado | Por asignar |
| S4-05 | GET `/products/create`: formulario alta | Alta | Implementado | Por asignar |
| S4-06 | GET `/products/:id`: detalle | Alta | Implementado | Por asignar |
| S4-07 | POST `/products`: guardar creación | Alta | Implementado | Por asignar |
| S4-08 | GET `/products/:id/edit`: formulario edición | Alta | Implementado | Por asignar |
| S4-09 | PUT `/products/:id`: guardar cambios | Alta | Implementado | Por asignar |
| S4-10 | DELETE `/products/:id`: retirar un producto | Alta | Implementado | Por asignar |
| S4-11 | Panel administrativo con confirmación de eliminación | Alta | Implementado | Por asignar |
| S4-12 | Registro/login con usuarios JSON protegidos por hash | Media (mejora) | Implementado | Por asignar |
| S4-13 | Pruebas unitarias de JSON, autenticación y CRUD | Alta | Implementado | Por asignar |
| S4-14 | Actualizar retrospectiva y tablero del equipo | Alta | Borrador listo para validar | Por asignar |
| S4-15 | Probar funcionamiento real en navegador con npm instalado | Alta | Pendiente de verificación en equipo | Por asignar |
| S4-16 | Weekly o daily | Baja (opcional) | Plantilla `weekly.md` | Por asignar |

## Criterios de aceptación

1. Las 108 referencias iniciales y sus fotografías conservan sus IDs, imágenes y precios existentes.
2. El listado `/products` y el detalle `/products/p042` muestran información desde `data/products.json`.
3. En el panel protegido se puede crear, editar y eliminar una referencia de prueba; al recargar el JSON el cambio permanece.
4. POST, PUT y DELETE no permiten solicitudes sin credenciales de administrador.
5. El archivo `users.json` mantiene datos de cuentas locales con contraseñas hasheadas, y la interfaz puede registrar e iniciar sesión con datos de prueba.
6. Las cuentas y archivos privados de la tienda no pueden descargarse desde la carpeta pública.
7. `npm test` pasa; el equipo hará además la validación manual de navegador y registrará sus resultados.

**URL del tablero externo:** por completar
