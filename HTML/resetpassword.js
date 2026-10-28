/*---
[TP] resetPassword.js
Lógica de la pantalla de reset de contraseña.
- Pide dos veces la nueva password.
- Verifica en cliente que coincidan.
- Llama a /api/resetClientePorContacto del servidor.
*/
const formReset = document.getElementById('formReset');

formReset.addEventListener('submit', (event) => {
   event.preventDefault();
   const formData = new FormData(formReset);
   const data = Object.fromEntries(formData);
   console.log('Reset - datos del form:', data);
   const resultado = document.getElementById('resultado');
   
   // Validaciones en el frontend (UX)
   if (!data.contacto || !data.password || !data.password2) {
       resultado.style.color = 'RED';
       resultado.textContent = 'Debe completar todos los campos';
       return;
   }
   
   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contacto)) {
       resultado.style.color = 'RED';
       resultado.textContent = 'El correo electrónico no tiene formato válido';
       return;
   }
   
   if (data.password !== data.password2) {
       resultado.style.color = 'RED';
       resultado.textContent = 'Las nuevas contraseñas no coinciden';
       return;
   }
   
   // Armamos el objeto incluyendo la password actual
   const reset = {
       contacto  : data.contacto,
       password  : data.password,
       password2 : data.password2
   };
   
   const API = 'http://localhost:8080/api/resetClientePorContacto';
   
   fetch(API, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(reset)
   })
   .then(res => res.json())
   .then(resp => {
       console.log('Respuesta reset:', resp);
       if (resp.response === 'OK') {
           resultado.style.color = 'GREEN';
           resultado.innerHTML = '<b>Contraseña actualizada correctamente.</b>';
           formReset.reset(); // Limpia el formulario
       } else {
           resultado.style.color = 'RED';
           resultado.textContent = 'No se pudo actualizar: ' + (resp.message || 'error desconocido');
       }
   })
   .catch(err => {
       resultado.style.color = 'RED';
       resultado.textContent = 'Error de comunicación con el servidor: ' + err;
   });
});