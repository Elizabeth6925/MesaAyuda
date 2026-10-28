/*-----------------------------------------------------------------------------------------------------------------
//*  MesaAyuda.js
//*  REST API
//*  UADER - FCyT - Ingenieria de Software I
//*  Caso de estudio MesaAyuda
*----------------------------------------------------------------------------------------------------------------*/
process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = '1';

import express from 'express';
import crypto from 'crypto';
console.log("Comenzando servidor");
console.log("crypto ok!");

const app = express();
console.log("express ready!");

const PORT = 8080;

import cors from 'cors';
console.log("cors ok!");
app.use(cors());
console.log("CORS ready!");

import AWS from 'aws-sdk';
console.log("aws-sdk ready!");

import accessKeyId from '../accessKeyId.js';
import secretAccessKey from '../secretAccessKey.js';

let awsConfig = {
   "region"         : "us-east-1",
   "endpoint"       : "http://dynamodb.us-east-1.amazonaws.com",
   "accessKeyId"    : accessKeyId,
   "secretAccessKey": secretAccessKey
};
AWS.config.update(awsConfig);
let docClient = new AWS.DynamoDB.DocumentClient();

console.log("Servidor DB listo!");
app.use(express.json());

app.listen(PORT, () => {
    
    console.log(`Servidor escuchando conexiones en el puerto ${PORT}`);
    console.log(` disponible en http://localhost:${PORT}/api/cliente`);
   
});

/*-------------------------------------------------------------------------------------------
                           Funciones auxiliares
*-------------------------------------------------------------------------------------------*/
function jsonParser(keyValue, stringValue) {
   var string = JSON.stringify(stringValue);
   var objectValue = JSON.parse(string);
   return objectValue[keyValue];
}

// Función para buscar cliente por CONTACTO (e-mail) o ID
async function scanDbClientePorContacto(contacto) {
   var docClientLocal = new AWS.DynamoDB.DocumentClient();
   const paramsScan = {
     TableName: "cliente",
     Select: "ALL_ATTRIBUTES",
     FilterExpression : 'contacto = :contacto OR id = :contacto',
     ExpressionAttributeValues : {':contacto' : contacto}
   };     
   var objectPromise = await docClientLocal.scan(paramsScan).promise().then((data) => {
         return data.Items;
   }); 
   return objectPromise;
}

// Función para buscar tickets por clienteID
async function scanDbTicket(clienteID) {
   var docClientLocal = new AWS.DynamoDB.DocumentClient();
   const paramsScan = {
     TableName: "ticket",
     Select: "ALL_ATTRIBUTES",
     FilterExpression : 'clienteID = :clienteID',
     ExpressionAttributeValues : {':clienteID' : clienteID}
   };     
   var objectPromise = await docClientLocal.scan(paramsScan).promise().then((data) => {
         return data.Items;
   }); 
   return objectPromise;
}

/*----
[TP] /api/resetClientePorContacto
*/
app.post('/api/resetClientePorContacto', (req,res) => {
   const {contacto}  = req.body;
   const {passwordActual} = req.body;
   const {password}  = req.body;
   const {password2} = req.body;
   
   console.log(`[RESET] Intento de reseteo para: ${contacto}`);

   if (!contacto) return res.status(400).send({response : "ERROR" , message: "Correo electrónico no informado"});
   if (!passwordActual) return res.status(400).send({response : "ERROR" , message: "Contraseña actual no informada"});
   if (!password) return res.status(400).send({response : "ERROR" , message: "Nueva password no informada"});
   if (password !== password2) return res.status(400).send({response : "ERROR" , message: "Las nuevas passwords no coinciden"});

   scanDbClientePorContacto(contacto)
   .then(resultDb => {
       if (Object.keys(resultDb).length == 0) {
           console.log(`[ERROR] Reset fallido: Cliente no existe`);
           return res.status(400).send({response : "ERROR" , message : "Cliente no existe"});
       }
       
       const dataItem = resultDb[0];
       const idCli = jsonParser('id',dataItem);
       const passDb = jsonParser('password',dataItem);
       
       if (passwordActual !== passDb) {
           console.log(`[ERROR] Reset fallido: Contraseña actual incorrecta`);
           return res.status(400).send({response : "ERROR" , message : "La contraseña actual es incorrecta"});
       }

       var hoy = new Date();
       var dd = String(hoy.getDate()).padStart(2, '0');
       var mm = String(hoy.getMonth() + 1).padStart(2, '0');
       var yyyy = hoy.getFullYear();
       hoy = dd + '/' + mm + '/' + yyyy;

       const paramsUpdate = {
           ExpressionAttributeNames: { "#p": "password", "#f": "fecha_cambio_password" },
           ExpressionAttributeValues: { ":p": password, ":f": hoy },
           Key: { "id": idCli },
           ReturnValues: "ALL_NEW",
           TableName: "cliente",
           UpdateExpression: "SET #p = :p, #f = :f"
       };
       
       docClient.update(paramsUpdate, function (err, data) {
           if (err)  {
               console.log(`[ERROR] DB error en reset: ${err}`);
               return res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
           } else {
               console.log(`[OK] Contraseña actualizada para: ${contacto}`);
               return res.status(200).send(JSON.stringify({response : "OK", message : "Password actualizada"}));
           }   
       });   
   })
   .catch(err => {
       console.log(`[ERROR] DB access error en reset: ${err}`);
       res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
   });
});

/*-------------------------------------------------------------------------------------------
                           SERVER API - CLIENTE
*-------------------------------------------------------------------------------------------*/
app.get('/api/cliente', (req,res) => {
   res.status(200).send({response : "OK", message : "API Ready"});
});

// [TP] Login por contacto (e-mail)
app.post('/api/loginCliente', (req,res) => {
   const contacto = req.body.contacto || req.body.id;
   const {password} = req.body;

   console.log(`[LOGIN] Intento de acceso: ${contacto}`);
   
   if (!password) {
       console.log(`[ERROR] Login fallido: Password no informada`);
       return res.status(400).send({response : "ERROR" , message : "Password no informada"});
   }
   if (!contacto) {
       console.log(`[ERROR] Login fallido: Correo no informado`);
       return res.status(400).send({response : "ERROR" , message : "Correo electrónico no informado"});
   }
   
   scanDbClientePorContacto(contacto)
   .then(resultDb => {
       if (Object.keys(resultDb).length == 0) {
           console.log(`[ERROR] Login fallido: El usuario ${contacto} no existe en la BD`);
           return res.status(400).send({response : "invalido" , message : "Cliente invalido"});
       }
       const dataItem = resultDb[0];
       const paswd   = jsonParser('password',dataItem);
       const activo  = jsonParser('activo',dataItem);
       const idCli   = jsonParser('id',dataItem);
       const contactoDb = jsonParser('contacto',dataItem);
       const nombre  = jsonParser('nombre',dataItem);
       const fecha_ultimo_ingreso = jsonParser('fecha_ultimo_ingreso',dataItem);

       if (password == paswd) {
           if (activo == true) {
               console.log(`[OK] Login exitoso: ${nombre} (${contactoDb})`);
               res.status(200).send(JSON.stringify({
                   response : "OK",
                   "id" : idCli,
                   "nombre" : nombre,
                   "contacto" : contactoDb,
                   "fecha_ultimo_ingreso": fecha_ultimo_ingreso
               }));   
           } else {
               console.log(`[ERROR] Login fallido: El usuario ${contacto} no está activo`);
               res.status(400).send(JSON.stringify({response : "invalido", message : "Cliente no activo"}));   
           }
       } else {
           console.log(`[ERROR] Login fallido: Contraseña incorrecta para ${contacto}`);
           res.status(400).send(JSON.stringify({response : "invalido" , message : "La contraseña ingresada es incorrecta"}));
       }   
   })
   .catch(err => {
       console.log(`[ERROR] DB access error: ${err}`);
       res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
   });
});

// [TP] Registro de nuevos usuarios con ID generada
app.post('/api/addClienteRegistro', (req,res) => {
   const {contacto, password, nombre, acepta_terminos} = req.body;
   
   console.log(`[REGISTRO] Intento de registro: ${contacto}`);
   
   if (!contacto) return res.status(400).send({response : "ERROR" , message : "Correo electrónico no informado"});
   if (!password) return res.status(400).send({response : "ERROR" , message : "Password no informada"});
   if (acepta_terminos !== true && acepta_terminos !== 'true' && acepta_terminos !== 'on') {
       console.log(`[ERROR] Registro fallido: No aceptó los términos`);
       return res.status(400).send({response : "ERROR" , message : "Debe aceptar los términos y condiciones"});
   }

   scanDbClientePorContacto(contacto)
   .then(resultDb => {
       if (Object.keys(resultDb).length != 0) {
           console.log(`[ERROR] Registro fallido: El usuario ${contacto} ya existe`);
           return res.status(400).send({response : "ERROR" , message : "El usuario ya existe"});
       }
       
       var hoy = new Date();
       var dd = String(hoy.getDate()).padStart(2, '0');
       var mm = String(hoy.getMonth() + 1).padStart(2, '0');
       var yyyy = hoy.getFullYear();
       hoy = dd + '/' + mm + '/' + yyyy;
       
       const newCliente = {
           id                    : crypto.randomUUID(),
           contacto              : contacto,
           nombre                : nombre || contacto,
           password              : password,
           activo                : true,
           registrado            : true,
           primer_ingreso        : true,
           fecha_alta            : hoy,
           fecha_cambio_password : hoy,
           fecha_ultimo_ingreso  : hoy,
       };
       
       const paramsPut = {
           TableName: "cliente",
           Item: newCliente,
           ConditionExpression:'attribute_not_exists(id)',
       };
       docClient.put(paramsPut, function (err, data) {
           if (err) {
               console.log(`[ERROR] DB error en registro: ${err}`);
               res.status(400).send(JSON.stringify({response : "ERROR", message : "DB error " + err}));
           } else {
               console.log(`[OK] Usuario registrado exitosamente: ${contacto} (ID: ${newCliente.id})`);
               res.status(200).send(JSON.stringify({response : "OK", "cliente": newCliente}));
           }
       });
   })
   .catch(err => {
       console.log(`[ERROR] DB access error en registro: ${err}`);
       res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
   });
});

/*-------------------------------------------------------------------------------------------
                           SERVER API - TICKETS
*-------------------------------------------------------------------------------------------*/
app.post('/api/listarTicket', (req,res) => {
   const {ID}  = req.body;
   console.log(`[TICKETS] Listando tickets para cliente: ${ID}`);

   if (!ID) return res.status(400).send({response : "ERROR" , message: "ID cliente  no informada"});
   
   scanDbTicket(ID)
   .then(resultDb => {
     if (Object.keys(resultDb).length == 0) {
       console.log(`[WARN] El cliente ${ID} no tiene tickets`);
       res.status(400).send({response : "ERROR" , message : "clienteID no tiene tickets"});
     } else {
       console.log(`[OK] Se encontraron ${resultDb.length} tickets`);
       res.status(200).send(JSON.stringify({response : "OK",  "data": resultDb}));
     }
   })
   .catch(err => {
       console.log(`[ERROR] DB access error en listarTicket: ${err}`);
       res.status(400).send({response : "ERROR", message : "DB access error "+err});
   });
});

/*----
[TP] Helper: valida usuario (contacto o id) y password.
*/
async function validarCredenciales(usuario, password) {
   if (!usuario || !password) return null;
   let items = await scanDbClientePorContacto(usuario);
   if (Object.keys(items).length == 0) return null;
   const cli = items[0];
   if (cli.password !== password) return null;
   if (cli.activo !== true) return null;
   return cli;
}

/*----
[TP] /resumenTickets
*/
async function handlerResumenTickets(req, res) {
   let usuario, password;
   if (req.method === 'GET') {
       usuario  = req.query.ID || req.query.id || req.query.CONTACTO;
       password = req.query.PASSWORD || req.query.password;
   } else {
       usuario  = req.body.ID || req.body.id || req.body.CONTACTO;
       password = req.body.PASSWORD || req.body.password;
   }

   console.log(`[ESTADISTICAS] Petición de resumen (Método: ${req.method}) para: ${usuario}`);

   if (!usuario || !password) return res.status(400).send({response:"ERROR", message:"Debe informar ID y PASSWORD"});
   
   try {
       const cli = await validarCredenciales(usuario, password);
       if (!cli) {
           console.log(`[ERROR] Estadísticas: Credenciales inválidas para ${usuario}`);
           return res.status(401).send({response:"invalido", message:"Usuario o password incorrecto"});
       }
       
       const tickets = await scanDbTicket(cli.id);
       const detalle = tickets.map(t => ({
           clave : t.id,
           fecha_apertura : t.fecha_apertura,
           estado : t.estado_solucion
       }));
       
       console.log(`[OK] Resumen generado: ${tickets.length} tickets para ${cli.contacto}`);
       res.status(200).send({
           response : "OK",
           idCliente : cli.id,
           contacto : cli.contacto,
           nombre : cli.nombre,
           cantidadTickets : tickets.length,
           tickets : detalle
       });
   } catch (err) {
       console.log(`[ERROR] DB access error en resumen: ${err}`);
       res.status(500).send({response:"ERROR", message:"DB access error "+err});
   }
}
app.get ('/resumenTickets', handlerResumenTickets);
app.post('/resumenTickets', handlerResumenTickets);

/*----
[TP] /getTicket
*/
async function handlerGetTicket(req, res) {
   let usuario, password, ticketID;
   if (req.method === 'GET') {
       usuario  = req.query.ID || req.query.id || req.query.CONTACTO;
       password = req.query.PASSWORD || req.query.password;
       ticketID = req.query.TICKET || req.query.ticket;
   } else {
       usuario  = req.body.ID || req.body.id || req.body.CONTACTO;
       password = req.body.PASSWORD || req.body.password;
       ticketID = req.body.TICKET || req.body.ticket;
   }

   console.log(`[GET_TICKET] Petición de ticket (Método: ${req.method}) - Usuario: ${usuario} - Ticket: ${ticketID}`);

   if (!usuario || !password) return res.status(400).send({response:"ERROR", message:"Debe informar ID y PASSWORD"});
   if (!ticketID) return res.status(400).send({response:"ERROR", message:"Debe informar TICKET"});

   try {
       const cli = await validarCredenciales(usuario, password);
       if (!cli) {
           console.log(`[ERROR] GetTicket: Credenciales inválidas para ${usuario}`);
           return res.status(401).send({response:"invalido", message:"Cliente no existe o credenciales incorrectas"});
       }
       
       var params = { TableName: "ticket", Key: { "id": ticketID } };
       const data = await docClient.get(params).promise();
       
       if (Object.keys(data).length == 0) {
           console.log(`[WARN] Ticket ${ticketID} no encontrado`);
           return res.status(404).send({response:"ERROR", message:"Ticket no existe"});
       }
       
       if (data.Item.clienteID !== cli.id) {
           console.log(`[ERROR] Seguridad: El ticket ${ticketID} no pertenece a ${usuario}`);
           return res.status(403).send({response:"ERROR", message:"El ticket no pertenece al cliente"});
       }
       
       console.log(`[OK] Ticket ${ticketID} entregado a ${cli.contacto}`);
       res.status(200).send({
           response  : "OK",
           idCliente : cli.id,
           contacto  : cli.contacto,
           ticket    : data.Item
       });
   } catch (err) {
       console.log(`[ERROR] DB access error en getTicket: ${err}`);
       res.status(500).send({response:"ERROR", message:"DB access error "+err});
   }
}
app.get ('/getTicket', handlerGetTicket);
app.post('/getTicket', handlerGetTicket);

/*-------------------------------------------------[ Fin del API REST ]-------------------------------------------------------------*/