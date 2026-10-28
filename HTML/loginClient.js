const formE1 = document.querySelector('.form');
/*---
   Intercepta el submit del formulario
   */
formE1.addEventListener('submit', (event) => {
	event.preventDefault();
	const formData = new FormData(formE1);
	const data = Object.fromEntries(formData);
	console.log('Application Server: Revisa el valor del form:');
	console.log(data);
	
	if (data.contacto == '' || data.password == '') {
		console.log('debe indicar correo y password');
		document.getElementById('resultado1').style.color = 'RED';
		document.getElementById('resultado1').style.textAlign = 'center';
		document.getElementById('resultado1').textContent =
			'Debe informar correo electrónico y password para completar el acceso';
		return;
	}
	
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contacto)) {
		document.getElementById('resultado1').style.color = 'RED';
		document.getElementById('resultado1').style.textAlign = 'center';
		document.getElementById('resultado1').textContent =
			'El correo electrónico informado no tiene formato válido';
		return;
	}
	
	if (data.contacto == 'pec') {   
		console.log('pec no es bienvenido en éste sistema');
		document.getElementById('resultado2').style.color = 'RED';
		document.getElementById('resultado2').style.textAlign = 'center';
		document.getElementById('resultado2').textContent =
			'El usuario <pec> no es bienvenido en éste sistema';
		return;
	}
	
	if (data.termscondition != 'on') {
		console.log('no aceptó los T&C no se puede loggear');
		document.getElementById('resultado2').style.textAlign = 'center';
		document.getElementById('resultado2').style.color = 'RED';
		document.getElementById('resultado2').textContent =
			'Debe aceptar los T&C para poder usar el sistema';
		return;
	}
	
	const HTMLResponse = document.querySelector('#app');
	const ul = document.createElement('ul');
	const tpl = document.createDocumentFragment();
	const systemURL = {
		listarTicket: 'http://127.0.0.1:5500/HTML/listarTicket.html',
		loginCliente: 'http://127.0.0.1:5500/HTML/loginClient.html',
	};
	const RESTAPI = {
		loginCliente: 'http://localhost:8080/api/loginCliente',
		listarTicket: 'http://localhost:8080/api/listarTicket',
	};

   const MODE='LOCAL'; 
	if (MODE == 'LOCAL') {
	    const login = {
	        contacto: data.contacto,
		    password: data.password
		}	
		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(login),
	};
	 	console.log('API REST:' + RESTAPI.loginCliente);
	    console.log(login);
	    console.log('login(' + JSON.stringify(login) + ')');
	    console.log('options ' + JSON.stringify(options));
   	var API = RESTAPI.loginCliente;
	    var APIoptions = options;
	};
	
	if (MODE == 'TYPICODE') {
		console.log('Acceso usando Typicode como application server');
		API = 'https://my-json-server.typicode.com/lu7did/MesaAyuda/posts/' + data.contacto;
		APIoptions = { method: 'GET' };
	}
	
	if (MODE == 'AWS') {
		console.log('Acceso usando AWS lambda como application server');
		API='https://fmtj0jrpp9.execute-api.us-east-1.amazonaws.com/default/loginUserGET?ID=' + encodeURIComponent(data.contacto) + '&PASSWORD=' + encodeURIComponent(data.password);
   	APIoptions = { method: 'GET' };
	}
	
	fetch(`${API}`, APIoptions)
		.then((res) => {
			return res.json();
		})
		.then((users) => {
			console.log('Datos en respuesta del application server=' + JSON.stringify(users));
			
			if (users.response == 'OK') {
				console.log('La password es correcta');
				console.log('nombre(' + users.nombre + ') fecha_ultimo_ingreso(' + users.fecha_ultimo_ingreso + ')' + 'mode(' + MODE + ')');
				
				// Enviamos la fecha con hora por la URL
				window.location.href =
					systemURL.listarTicket +
					'?id=' + users.id +
					'&contacto=' + encodeURIComponent(users.contacto) +
					'&nombre=' + encodeURIComponent(users.nombre) +
					'&fecha_ultimo_ingreso=' + encodeURIComponent(users.fecha_ultimo_ingreso) +
					'&mode=' + MODE;
			} else {
				console.log('Error del servidor:', users.message);
				document.getElementById('resultado1').style.color = 'RED';
				document.getElementById('resultado1').style.textAlign = 'center';
				document.getElementById('resultado1').textContent = users.message || 'Error de login';
			}
		})
		.catch(err => {
			console.log('Error en login: ' + err);
			document.getElementById('resultado1').style.color = 'RED';
			document.getElementById('resultado1').style.textAlign = 'center';
			document.getElementById('resultado1').textContent =
				'Error de comunicación con el servidor';
		});
});