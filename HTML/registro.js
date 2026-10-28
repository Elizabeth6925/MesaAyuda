/*---
[TP] registro.js
Lógica de la pantalla de registración.
- Valida que las passwords coincidan y que se acepten los T&C.
- Llama a /api/addClienteRegistro del servidor local.
- Si la registración es exitosa, muestra un mensaje persistente.
*/
const formReg = document.getElementById('formRegistro');
formReg.addEventListener('submit', (event) => {
   event.preventDefault();
   const formData = new FormData(formReg);
   const data = Object.fromEntries(formData);
   console.log('Registro - datos del form:', data);
   const resultado = document.getElementById('resultado');
   // Validaciones en el frontend (UX)
   if (!data.contacto || !data.password || !data.password2) {
       resultado.style.color = 'RED';
       resultado.textContent = 'Debe completar correo, password y confirmación';
       return;
   }
   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contacto)) {
       resultado.style.color = 'RED';
       resultado.textContent = 'El correo electrónico no tiene formato válido';
       return;
   }
   if (data.password !== data.password2) {
       resultado.style.color = 'RED';
       resultado.textContent = 'Las contraseñas no coinciden';
       return;
   }
   if (data.termscondition != 'on') {
       resultado.style.color = 'RED';
       resultado.textContent = 'Debe aceptar los términos y condiciones';
       return;
   }
   const registro = {
       contacto        : data.contacto,
       nombre          : data.nombre || data.contacto,
       password        : data.password,
       acepta_terminos : true
   };
   const API = 'http://localhost:8080/api/addClienteRegistro';
   fetch(API, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(registro)
   })
   .then(res => res.json())
   .then(resp => {
       console.log('Respuesta registro:', resp);
       if (resp.response === 'OK') {
           resultado.style.color = 'GREEN';
          
           // [TP] MEJORA DE UX: Mensaje persistente (el link está abajo en el HTML)
           resultado.innerHTML =
               '<b>Registro exitoso.</b><br>Ya podés iniciar sesión con tu correo y contraseña.';
       } else {
           resultado.style.color = 'RED';
           resultado.textContent = 'No se pudo registrar: ' + (resp.message || 'error desconocido');
       }
   })
   .catch(err => {
       resultado.style.color = 'RED';
       resultado.textContent = 'Error de comunicación con el servidor: ' + err;
   });
});



