/*-----------------------------------------------------------------------------------------------------------------
//*  MesaAyuda.js debe copiarse al directorio del proyecto express como index.js
//*
//*  REST API
//*  UADER - FCyT - Ingenieria de Software I
//*  Caso de estudio MesaAyuda
//*
//*  Dr. Pedro E. Colla 2023,2025
*----------------------------------------------------------------------------------------------------------------*/
import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import AWS from 'aws-sdk';
import accessKeyId from '../accessKeyId.js';
import secretAccessKey from '../secretAccessKey.js';

console.log("Comenzando servidor");

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

let awsConfig = {
   "region"         : "us-east-1",
   "endpoint"       : "http://dynamodb.us-east-1.amazonaws.com",
   "accessKeyId"    : accessKeyId,
   "secretAccessKey": secretAccessKey
};
AWS.config.update(awsConfig);
let docClient = new AWS.DynamoDB.DocumentClient();

app.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`));

/*-------------------------------------------------------------------------------------------
                           Funciones auxiliares
*-------------------------------------------------------------------------------------------*/
function jsonParser(keyValue, stringValue) {
   var string = JSON.stringify(stringValue);
   var objectValue = JSON.parse(string);
   return objectValue[keyValue];
}

// Función para buscar cliente por CONTACTO (e-mail)
async function scanDbClientePorContacto(contacto) {
   var docClientLocal = new AWS.DynamoDB.DocumentClient();
   const paramsScan = {
     TableName: "cliente",
     Select: "ALL_ATTRIBUTES",
     FilterExpression : 'contacto = :contacto',
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

/*-------------------------------------------------------------------------------------------
                           SERVER API - CLIENTE
*-------------------------------------------------------------------------------------------*/
app.get('/api/cliente', (req,res) => {
   res.status(200).send({response : "OK", message : "API Ready"});
});

// [TP] Login por contacto (e-mail)
app.post('/api/loginCliente', (req,res) => {
   const contacto = req.body.contacto || req.body.id; // Acepta contacto o id
   const {password} = req.body;
   
   if (!password) return res.status(400).send({response : "ERROR" , message : "Password no informada"});
   if (!contacto) return res.status(400).send({response : "ERROR" , message : "Correo electrónico no informado"});
   
   scanDbClientePorContacto(contacto)
   .then(resultDb => {
       if (Object.keys(resultDb).length == 0) {
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
               res.status(200).send(JSON.stringify({
                   response : "OK",
                   "id" : idCli,
                   "nombre" : nombre,
                   "contacto" : contactoDb,
                   "fecha_ultimo_ingreso": fecha_ultimo_ingreso
               }));   
           } else {
               res.status(400).send(JSON.stringify({response : "invalido", message : "Cliente no activo"}));   
           }
       } else {
           res.status(400).send(JSON.stringify({response : "invalido" , message : "usuario o password incorrecto"}));
       }   
   })
   .catch(err => {
       res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
   });
});

// [TP] Registro de nuevos usuarios con ID generada
app.post('/api/addClienteRegistro', (req,res) => {
   const {contacto, password, nombre, acepta_terminos} = req.body;
   
   if (!contacto) return res.status(400).send({response : "ERROR" , message : "Correo electrónico no informado"});
   if (!password) return res.status(400).send({response : "ERROR" , message : "Password no informada"});
   if (acepta_terminos !== true && acepta_terminos !== 'true' && acepta_terminos !== 'on') {
       return res.status(400).send({response : "ERROR" , message : "Debe aceptar los términos y condiciones"});
   }

   scanDbClientePorContacto(contacto)
   .then(resultDb => {
       if (Object.keys(resultDb).length != 0) {
           return res.status(400).send({response : "ERROR" , message : "El usuario ya existe"});
       }
       
       var hoy = new Date();
       var dd = String(hoy.getDate()).padStart(2, '0');
       var mm = String(hoy.getMonth() + 1).padStart(2, '0');
       var yyyy = hoy.getFullYear();
       hoy = dd + '/' + mm + '/' + yyyy;
       
       const newCliente = {
           id                    : crypto.randomUUID(), // <--- GENERA LA ID ÚNICA
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
               res.status(400).send(JSON.stringify({response : "ERROR", message : "DB error " + err}));
           } else {
               res.status(200).send(JSON.stringify({response : "OK", "cliente": newCliente}));
           }
       });
   })
   .catch(err => {
       res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
   });
});

/*-------------------------------------------------------------------------------------------
                           SERVER API - TICKETS
*-------------------------------------------------------------------------------------------*/
app.post('/api/listarTicket', (req,res) => {
   const {ID}  = req.body;
   if (!ID) return res.status(400).send({response : "ERROR" , message: "ID cliente no informada"});
   
   scanDbTicket(ID)
   .then(resultDb => {
     if (Object.keys(resultDb).length == 0) {
       res.status(400).send({response : "ERROR" , message : "clienteID no tiene tickets"});
     } else {
       res.status(200).send(JSON.stringify({response : "OK",  "data": resultDb}));
     }
   })
   .catch(err => {
       res.status(400).send({response : "ERROR", message : "DB access error "+err});
   });
});

// (El resto de tus endpoints de tickets: getTicket, addTicket, updateTicket, etc., se mantienen igual)