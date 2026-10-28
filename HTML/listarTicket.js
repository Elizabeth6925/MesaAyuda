/*---
Función para procesar los parámetros recibidos en el URL
*/
function getQueryParams(qs) {
    qs = qs.split('+').join(' ');
    var params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;
    while (tokens = re.exec(qs)) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }
    return params;
}

console.log("Comienza listarTicket.js");

var query = getQueryParams(document.location.search);
console.log("id:"+query.id);
console.log("contacto:"+query.contacto);
console.log("nombre:"+query.nombre);
console.log("ultima_fecha:"+query.fecha_ultimo_ingreso);
console.log("mode:"+query.mode);

// ACÁ MOSTRAMOS LA TABLA CON LOS DATOS Y LA FECHA + HORA
document.getElementById("lastlogin").innerHTML = `
    <table style="border-collapse: collapse; text-align: left; margin: 10px auto;">
        <tr><td style="padding: 5px;"><b>Cliente (ID)</b></td><td>${query.id}</td></tr>
        <tr><td style="padding: 5px;"><b>Nombre</b></td><td>${query.nombre}</td></tr>
        <tr><td style="padding: 5px;"><b>Contacto</b></td><td>${query.contacto}</td></tr>
        <tr><td style="padding: 5px;"><b>Último ingreso</b></td><td>${query.fecha_ultimo_ingreso}</td></tr>
    </table>
`;

const systemURL = { 
    listarTicket    : "http://127.0.0.1:5500/HTML/listarTicket.html",
    loginCliente    : "http://127.0.0.1:5500/HTML/loginClient.html",
};

const RESTAPI = {
    loginCliente    : "http://localhost:8080/api/loginCliente",
    listarTicket    : "http://localhost:8080/api/listarTicket",
};

const HTMLResponse = document.querySelector("#app");
var ticket = {
    "ID" : query.id,
};
    
var options = {
    method: 'GET',
};
var APIREST_URL = '';
console.log('transferred mode:' + query.mode);    

switch (query.mode) {
  case "LOCAL":
    console.log("Utiliza servidor NodeJS local.");
    console.log("API_listarTicket:" + RESTAPI.listarTicket); 
  
    ticket = {
       "ID" : query.id,
    };
    
    options = {
       method: 'POST',
       headers: {
       'Content-Type': 'application/json',
    },
        body: JSON.stringify(ticket),
    };
    console.log("ticket:" + JSON.stringify(ticket) + " options:" + JSON.stringify(options));

    APIREST_URL = RESTAPI.listarTicket;
    break;
  case "TYPICODE":
    console.log("Typicode no soportado en ésta función");
    APIREST_URL = 'https://my-json-server.typicode.com/lu7did/mesaayuda/posts/' + query.id;
    break;
  case "AWS": 
    console.log("Utiliza AWS como serverless");
    APIREST_URL = 'https://n3ttz410ze.execute-api.us-east-1.amazonaws.com/default/listTicketGET?ID=' + query.id;
    break;
  default: 
    console.log("Asume AWS.");
    APIREST_URL = 'https://n3ttz410ze.execute-api.us-east-1.amazonaws.com/default/listTicketGET?ID=' + query.id;
}
console.log("APIREST_URL:" + APIREST_URL);
console.log("ticket  :" + JSON.stringify(ticket));
console.log("options :" + JSON.stringify(options));

fetch(`${APIREST_URL}`, options)
.then(res => {
    return res.json();
}).then(ticket => {
    console.log("ticket:");
    console.log(ticket);
    let f = false;
    let table = document.createElement("table");
    table.style.border = "1px solid";
    table.style.backgroundColor = "#f9f9f9";
    table.style.margin = "0 auto";

    ticket.data.forEach((t) => { 
        console.log(t.clienteID)
        if (t.clienteID == query.id) {
            if (f == false) {
                f = true;
                const hdr = ["Cliente", "ID", "Motivo", "Estado", "Fecha"];
                let tr = document.createElement("tr");
                tr.style.border = "1px solid";
                hdr.forEach((item) => {
                    let th = document.createElement("th");
                    th.style.border = "1px solid";
                    th.style.padding = "5px";
                    th.innerText = item;
                    tr.appendChild(th);
                });
                table.appendChild(tr);                   
            }

            const body = [t.clienteID, `${t.id}`, `${t.solucion}`, `${t.estado_solucion}`, `${t.ultimo_contacto}`];
            
            let trl = document.createElement("tr");
            body.forEach((line) => {
                let td = document.createElement("td");
                td.style.border = "1px solid";
                td.style.padding = "5px";
                td.innerText = line;
                trl.appendChild(td);
            });
            table.appendChild(trl);                   
        }
    });

    if (f) {
        console.log(table);
        HTMLResponse.appendChild(table);
    } else {
        console.log("no tiene tickets");
        document.getElementById('mensajes').style.textAlign = "center";
        document.getElementById('mensajes').style.color = "RED";
        document.getElementById("mensajes").innerHTML = "No hay tickets pendientes";
    }
}).catch(err => {
    console.log("Error al consultar tickets: " + err);
    document.getElementById('mensajes').style.textAlign = "center";
    document.getElementById('mensajes').style.color = "RED";
    document.getElementById("mensajes").innerHTML = "Error al conectar con el servidor de tickets";
});