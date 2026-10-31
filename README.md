# Trabajo Práctico Final Integrador - Mesa de Ayuda
**Materia:** Ingeniería de Software 1 - UADER FCyT
**Integrantes:** Lavergne Elizabeth y Roude Mariel
**Año:** 2026

## Descripción del Proyecto
Modificación del prototipo de la aplicación "Mesa de Ayuda" (Node.js + DynamoDB). Se implementaron mejoras de usabilidad y seguridad en el login, registro de usuarios, recuperación de contraseña y nuevas API REST para consultas estadísticas de tickets.

## Funcionalidades Implementadas
1. **Login con correo electrónico:** Búsqueda del usuario por el campo `contacto` (email) en lugar del UUID.
2. **Mejora de seguridad:** El servidor valida la contraseña y ya no la expone en la respuesta JSON (utiliza banderas `OK` / `invalido`).
3. **Registro de usuarios:** Nueva pantalla y endpoint (`/api/addClienteRegistro`) con generación de UUID y validación de Términos y Condiciones.
4. **Modificación de Listado:** El listado de tickets muestra Cliente, Nombre, Contacto y Último ingreso.
5. **Reset de contraseña:** Nueva pantalla y endpoint (`/api/resetClientePorContacto`).
6. **Estadísticas REST:** Endpoint `/resumenTickets` (GET y POST) con validación de credenciales.
7. **Acceso a Ticket REST:** Endpoint `/getTicket` (GET y POST) con validación de pertenencia del ticket al cliente.

## Requisitos para ejecutar el proyecto
- Node.js instalado.
- Ejecutar el servidor en la terminal: `node IS1_MesaAyuda.js` 
- Abrir el frontend (HTML) con Live Server.