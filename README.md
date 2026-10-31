# Mesa de Ayuda

## Taller y práctico para la materia Ingeniería de Software I

Implementación (parcial) de arquitectura, componente y maquetado para 
aplicación mockup de mesa de ayuda.

Implementación Full Stack Node.JS local usando DB en AWS.

##API ticket
```
	/crearTicket	Crea un nuevo ticket
	/listarTicket	Lista todos los tickets de un cliente
```

##API cliente

```

	/addCliente	Agrega un nuevo cliente
	/getCliente	Recupera el registro de un cliente
	/setCliente	Actualiza banderas baja, activo, registrado
	/updateCliente	Actualiza datos del cliente
	/listCliente	Lista clientes
	/resetCliente	Hace reset de password y actualiza fecha
	/loginCliente	Revisa login y actualiza fecha
	/deleteCliente	Borra fisicamente un cliente
``

Trabajo Práctico Final Integrador - Mesa de Ayuda
Materia: Ingeniería de Software 1 - UADER FCyT Integrantes: Lavergne Elizabeth y Roude Mariel Año: 2026

Descripción del Proyecto
Modificación del prototipo de la aplicación "Mesa de Ayuda" (Node.js + DynamoDB). Se implementaron mejoras de usabilidad y seguridad en el inicio de sesión, registro de usuarios, recuperación de contraseña y nuevas API REST para consultas estadísticas de tickets.

Funcionalidades Implementadas
Iniciar sesión con correo electrónico: Búsqueda del usuario por el campo contacto(email) en lugar del UUID.
Mejora de seguridad: El servidor valida la contraseña y ya no la exponen en la respuesta JSON (utiliza banderas OK/ invalido).
Registro de usuarios: Nueva pantalla y endpoint ( /api/addClienteRegistro) con generación de UUID y validación de Términos y Condiciones.
Modificación de Listado: El listado de boletos muestra Cliente, Nombre, Contacto y Último ingreso.
Restablecer contraseña: Nueva pantalla y punto final ( /api/resetClientePorContacto).
Estadísticas REST: Endpoint /resumenTickets(GET y POST) con validación de credenciales.
Acceso a Ticket REST: Endpoint /getTicket(GET y POST) con validación de pertenencia del ticket al cliente.
Requisitos para ejecutar el proyecto
Node.js instalado.
Ejecutar el servidor en la terminal:node IS1_MesaAyuda.js
Abrir el frontend (HTML) con Live Server.