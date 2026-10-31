
/*-----------------------------------------------------------------------------------------------------------------
//*  MesaAyuda.js debe copiarse al directorio del proyecto express como index.js
//*
//*  REST API 
//*  UADER - FCyT - Ingenieria de Software I 
//*  Caso de estudio MesaAyuda
//*
//*  Dr. Pedro E. Colla 2023,2025
 *----------------------------------------------------------------------------------------------------------------*/
//AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE=1

import express from 'express';
import crypto from 'crypto';
console.log("Comenzando servidor");

// const crypto = require('crypto');
console.log("crypto Ok!");

//const express = require('express');
//console.log("express Ok!");

const app = express();
console.log("express ready!");

const PORT = 8080;

import cors from 'cors';

//const cors = require('cors');
console.log("cors ok!");

app.use(cors());
console.log("CORS ready!");

import AWS from 'aws-sdk'
//var AWS = require('aws-sdk');
console.log("aws-sdk ready!");

/*----
Acquire critical security resources from an external file out of the path
*/

//const accessKeyId = require('../accessKeyId.js');
//const secretAccessKey = require('../secretAccessKey.js');

import accessKeyId from '../accessKeyId.js';
import secretAccessKey  from '../secretAccessKey.js';

let awsConfig = {
    "region"         : "us-east-1",
    "endpoint"       : "http://dynamodb.us-east-1.amazonaws.com",
    "accessKeyId"    : accessKeyId, 
    "secretAccessKey": secretAccessKey
};

AWS.config.update(awsConfig);
console.log("Servidor listo!");
let docClient = new AWS.DynamoDB.DocumentClient();

/*----
   Application server in LISTEN mode
*/

app.listen(
    PORT,
    () => console.log(`Servidor listo en http://localhost:${PORT}`)
);

app.use(express.json());

/*-------------------------------------------------------------------------------------------
                            Funciones y Servicios
 *-------------------------------------------------------------------------------------------*/

/*-----------
función para hacer el parse de un archivo JSON
*/
function jsonParser(keyValue,stringValue) {
    var string = JSON.stringify(stringValue);
    var objectValue = JSON.parse(string);
    return objectValue[keyValue];
}

/*-------------------------------------------------------------------------------------------
                            SERVER API 
 *-------------------------------------------------------------------------------------------*/
/*==*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*
 *                       API REST Cliente                                                   *
 *=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*==*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*/

app.get('/api/cliente', (req,res) => {
    res.status(200).send({response : "OK", message : "API Ready"});
    console.log("API cliente: OK");
});


/*---
  /api/loginCliente
  [TP] Modificado: ahora busca al cliente por contacto (e-mail) en lugar de por ID.
  La password se valida en el servidor y NUNCA se retorna en la respuesta.
  Respuesta OK: {response:"OK", id, nombre, contacto, fecha_ultimo_ingreso}
  Respuesta inválida: {response:"invalido", message:"..."}
*/  
app.post('/api/loginCliente', (req,res) => {

    // [TP] Acepta "contacto" (nuevo) o "id" (compatibilidad)
    const contacto = req.body.contacto || req.body.id;
    const {password} = req.body;

    console.log("loginCliente: contacto("+contacto+")");

    if (!password) {
        res.status(400).send({response : "ERROR" , message : "Password no informada"});
        return;
    }    
    if (!contacto) {
        res.status(400).send({response : "ERROR" , message : "Correo electrónico no informado"});
        return;
    }    

    // [TP] Se busca el cliente por contacto usando SCAN sobre la tabla
    scanDbClientePorContacto(contacto)
    .then(resultDb => {
        if (Object.keys(resultDb).length == 0) {
            res.status(400).send({response : "invalido" , message : "Cliente invalido"});
            return;
        }
        const dataItem = resultDb[0];
        const paswd   = jsonParser('password',dataItem);
        const activo  = jsonParser('activo',dataItem);
        const idCli   = jsonParser('id',dataItem);
        const contactoDb = jsonParser('contacto',dataItem);
        const nombre  = jsonParser('nombre',dataItem);
        const fecha_ultimo_ingreso = jsonParser('fecha_ultimo_ingreso',dataItem);

        // [TP] La comparación se hace en el servidor y NO se retorna la password
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


/*-----------
  /api/getCliente
  Esta API permite acceder a un cliente dado su id
*/

app.post('/api/getCliente/:id', (req,res) => {
    const { id } = req.params;
    console.log("getCliente: id("+id+")");
    var params = {
        TableName: "cliente",
        Key: {
            "id" : id
            //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
             }
        };
    docClient.get(params, function (err, data) {
        if (err)  {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
        } else {

            if (Object.keys(data).length != 0) {
               res.status(200).send(JSON.stringify({"response":"OK","cliente" : data.Item}),null,2);
            } else {
               res.status(400).send(JSON.stringify({"response":"ERROR",message : "Cliente no existe"}),null,2);
            }
        }    
    })


} );

/*---------
Función para realizar el SCAN de un DB de cliente usando contacto como clave para la búsqueda (no es clave formal del DB)
*/
async function scanDb(contacto) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    const scanKey=contacto;
    const paramsScan = { // ScanInput
      TableName: "cliente", // required
      Select: "ALL_ATTRIBUTES" || "ALL_PROJECTED_ATTRIBUTES" || "SPECIFIC_ATTRIBUTES" || "COUNT",
      FilterExpression : 'id = :contacto',
      ExpressionAttributeValues : {':contacto' : scanKey}
    };      
    var objectPromise = await docClient.scan(paramsScan).promise().then((data) => {
          return data.Items 
    });  
    return objectPromise;
}


/*---------
[TP] Nueva función: SCAN de cliente por el atributo "contacto" (e-mail).
Se utiliza para el login por correo y para la verificación en la registración.
*/
async function scanDbClientePorContacto(contacto) {
    var docClientLocal = new AWS.DynamoDB.DocumentClient();
    const paramsScan = {
      TableName: "cliente",
      Select: "ALL_ATTRIBUTES",
      FilterExpression : 'contacto = :contacto',
      ExpressionAttributeValues : {':contacto' : contacto}
    };      
    var objectPromise = await docClientLocal.scan(paramsScan).promise().then((data) => {
          return data.Items 
    });  
    return objectPromise;
}


/*----
addCliente
Revisa si el contacto (e-mail) existe y en caso que no da de alta el cliente generando un id al azar
*/
app.post('/api/addCliente', (req,res) => {

    const {contacto} = req.body;
    const {password} = req.body;
    const {nombre}   = req.body;
    console.log("addCliente: contacto("+contacto+") nombre("+nombre+") password("+password+")");
    
    if (!password) {
        res.status(400).send({response : "ERROR" , message: "Password no informada"});
        return;
    }
    if (!nombre) {
        res.status(400).send({response : "ERROR", message : "Nombre no informado"});
        return;
    }

    if (!contacto){
        res.status(400).send({response : "ERROR" , message : "Contacto no informado"});
        return;
    } 

    scanDb(contacto)
    .then(resultDb => {
      if (Object.keys(resultDb).length != 0) {
        res.status(400).send({response : "ERROR" , message : "Cliente ya existe"});
        return;
      } else {
        var hoy = new Date();
        var dd = String(hoy.getDate()).padStart(2, '0');
        var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = hoy.getFullYear();
        hoy = dd + '/' + mm + '/' + yyyy;
    
        const newCliente = {
         id                    : contacto,
         nombre                : nombre,
         password              : password,
         activo                : true,
         registrado            : true,
         primer_ingreso        : false,
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
                res.status(400).send(JSON.stringify({response : "ERROR", message : "DB error" + err}));
            } else {
                res.status(200).send(JSON.stringify({response : "OK", "cliente": newCliente}));
            }
        });
    }
    });

});


/*----
[TP] /api/addClienteRegistro
Nueva función de registración simplificada (pedagógica).
- Verifica que el contacto (e-mail) NO exista.
- Da de alta el cliente con activo=true, registrado=true y todas las fechas al momento actual.
- Genera un id aleatorio (crypto.randomUUID()).
Requiere: contacto, password, nombre (puede derivarse del correo si no se informa), acepta_terminos.
*/
app.post('/api/addClienteRegistro', (req,res) => {

    const {contacto} = req.body;
    const {password} = req.body;
    const {nombre}   = req.body;
    const {acepta_terminos} = req.body;

    console.log("addClienteRegistro: contacto("+contacto+") nombre("+nombre+")");

    if (!contacto) {
        res.status(400).send({response : "ERROR" , message : "Correo electrónico no informado"});
        return;
    }
    if (!password) {
        res.status(400).send({response : "ERROR" , message : "Password no informada"});
        return;
    }
    // [TP] Aceptación obligatoria de términos y condiciones
    if (acepta_terminos !== true && acepta_terminos !== 'true' && acepta_terminos !== 'on') {
        res.status(400).send({response : "ERROR" , message : "Debe aceptar los términos y condiciones"});
        return;
    }

    scanDbClientePorContacto(contacto)
    .then(resultDb => {
        if (Object.keys(resultDb).length != 0) {
            // [TP] El usuario ya existe => no se puede registrar
            res.status(400).send({response : "ERROR" , message : "El usuario ya existe"});
            return;
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


/*----------
/api/updateCliente
Permite actualizar datos del cliente contacto, nombre, estado de activo y registrado
*/
app.post('/api/updateCliente', (req,res) => {
    
    const {id} = req.body;
    const {nombre}   = req.body; 
    const {password} = req.body;

    var activo = ((req.body.activo+'').toLowerCase() === 'true')
    var registrado = ((req.body.registrado+'').toLowerCase() === 'true')

    console.log("updateCliente: id("+id+") nombre("+nombre+") password("+password+") activo("+activo+") registrado("+registrado+")");

    if (!id) {
        res.status(400).send({response : "ERROR" , message: "Id no informada"});
        return;
    }

    if (!nombre) {
        res.status(400).send({response : "ERROR" , message: "Nombre no informado"});
        return;
    }

    if (!password) {
        res.status(400).send({response : "ERROR" , message: "Password no informado"});
        return;
    }

    var params = {
        TableName: "cliente",
        Key: {
            "id" : id
            //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
             }
        };
        
    docClient.get(params, function (err, data) {
        if (err)  {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
            return;
        } else {

            if (Object.keys(data).length == 0) {
                res.status(400).send(JSON.stringify({"response":"ERROR",message : "Cliente no existe"}),null,2);
                return;
            } else {

                const paramsUpdate = { 
   
                    ExpressionAttributeNames: { 
                         "#a": "activo", 
                         "#n": "nombre",
                         "#p": "password",
                         "#r": "registrado"

                    }, 
                    ExpressionAttributeValues: { 
                        ":a": activo , 
                        ":p": password,
                        ":n": nombre , 
                        ":r": registrado 
                   }, 
                   Key: { 
                       "id": id 
                   }, 
                   ReturnValues: "ALL_NEW", 
                   TableName: "cliente", 
                   UpdateExpression: "SET #n = :n, #p = :p, #a = :a, #r = :r" 
                };
                docClient.update(paramsUpdate, function (err, data) {
                    if (err)  {
                        res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
                        return;
                    } else {
                        res.status(200).send(JSON.stringify({response : "OK", message : "updated" , "data": data}));
                    }    
                });    
            }
        }    
    })


});


/*-------
/api/resetCliente
Permite cambiar la password de un cliente
*/
app.post('/api/resetCliente', (req,res) => {
    
    const {id}       = req.body;
    const {password} = req.body;
 
    if (!id) {
        res.status(400).send({response : "ERROR" , message: "Id no informada"});
        return;
    }

    if (!password) {
        res.status(400).send({response : "ERROR" , message: "Password no informada"});
        return;
    }

    var params = {
        TableName: "cliente",
        Key: {
            "id" : id
            //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
             }
        };
        
    docClient.get(params, function (err, data) {
        if (err)  {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
            return;
        } else {

            if (Object.keys(data).length == 0) {
                res.status(400).send(JSON.stringify({"response":"ERROR",message : "Cliente no existe"}),null,2);
                return;
            } else {

                const paramsUpdate = { 
   
                    ExpressionAttributeNames: { 
                         "#p": "password" 
                    }, 
                    ExpressionAttributeValues: { 
                        ":p": password 
                   }, 
                   Key: { 
                       "id": id 
                   }, 
                   ReturnValues: "ALL_NEW", 
                   TableName: "cliente", 
                   UpdateExpression: "SET #p = :p" 
                };
                docClient.update(paramsUpdate, function (err, data) {
                    if (err)  {
                        res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
                        return;
                    } else {
                        res.status(200).send(JSON.stringify({response : "OK", message : "updated" , "data": data}));
                    }    
                });    
            }
        }    
    })
});


/*----
[TP] /api/resetClientePorContacto
Permite resetear la password de un cliente identificado por su correo electrónico.
Se usa desde la pantalla de "¿Olvidó su contraseña?".
Requiere: contacto, password, password2 (confirmación).
*/
app.post('/api/resetClientePorContacto', (req,res) => {

    const {contacto}  = req.body;
    const {password}  = req.body;
    const {password2} = req.body;

    if (!contacto) {
        res.status(400).send({response : "ERROR" , message: "Correo electrónico no informado"});
        return;
    }
    if (!password) {
        res.status(400).send({response : "ERROR" , message: "Password no informada"});
        return;
    }
    if (password !== password2) {
        res.status(400).send({response : "ERROR" , message: "Las passwords no coinciden"});
        return;
    }

    scanDbClientePorContacto(contacto)
    .then(resultDb => {
        if (Object.keys(resultDb).length == 0) {
            res.status(400).send({response : "ERROR" , message : "Cliente no existe"});
            return;
        }
        const dataItem = resultDb[0];
        const idCli = jsonParser('id',dataItem);

        var hoy = new Date();
        var dd = String(hoy.getDate()).padStart(2, '0');
        var mm = String(hoy.getMonth() + 1).padStart(2, '0');
        var yyyy = hoy.getFullYear();
        hoy = dd + '/' + mm + '/' + yyyy;

        const paramsUpdate = { 
            ExpressionAttributeNames: { 
                 "#p": "password",
                 "#f": "fecha_cambio_password"
            }, 
            ExpressionAttributeValues: { 
                ":p": password,
                ":f": hoy
           }, 
           Key: { 
               "id": idCli 
           }, 
           ReturnValues: "ALL_NEW", 
           TableName: "cliente", 
           UpdateExpression: "SET #p = :p, #f = :f" 
        };
        docClient.update(paramsUpdate, function (err, data) {
            if (err)  {
                res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
                return;
            } else {
                res.status(200).send(JSON.stringify({response : "OK", message : "Password actualizada"}));
            }    
        });    
    })
    .catch(err => {
        res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
    });

});



/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*
/*                                                       API REST ticket                                                             *
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*/

/*---------
Función para realizar el SCAN de un DB de cliente usando contacto como clave para la búsqueda (no es clave formal del DB)
*/
async function scanDbTicket(clienteID) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    const scanKey=clienteID;
    const paramsScan = { // ScanInput
      TableName: "ticket", // required
      Select: "ALL_ATTRIBUTES" || "ALL_PROJECTED_ATTRIBUTES" || "SPECIFIC_ATTRIBUTES" || "COUNT",
      FilterExpression : 'clienteID = :clienteID',
      ExpressionAttributeValues : {':clienteID' : scanKey}
    };      
    var objectPromise = await docClient.scan(paramsScan).promise().then((data) => {
          return data.Items 
    });  
    return objectPromise;
}
/*----------
  listarTicket
  API REST para obtener todos los tickets de un clienteID
*/  
app.post('/api/listarTicket', (req,res) => {

    const {ID}  = req.body;
    console.log("listarTicket: ID("+ID+")");
 
    if (!ID) {
        res.status(400).send({response : "ERROR" , message: "ID cliente  no informada"});
        return;
    }

    scanDbTicket(ID)
    .then(resultDb => {
      if (Object.keys(resultDb).length == 0) {
        res.status(400).send({response : "ERROR" , message : "clienteID no tiene tickets"});
        return;
      } else {
        res.status(200).send(JSON.stringify({response : "OK",  "data": resultDb}));
    }

    });

});

/*---------
  getTicket
  API REST para obtener los detalles de un ticket
*/
app.post('/api/getTicket', (req,res) => {
    const {id}  = req.body;
    console.log("getTicket: id("+id+")");
 
    if (!id) {
        res.status(400).send({response : "ERROR" , message: "ticket id no informada"});
        return;
    }
    var params = {
        TableName: "ticket",
        Key: {
            "id" : id
            //"clienteID": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
            //"id"       : "e08905a8-4aab-45bf-9948-4ba2b8602ced"
        }
    };
    docClient.get(params, function (err, data) {
        if (err) {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
        }
        else {
            if (Object.keys(data).length == 0) {
                res.status(400).send({response : "ERROR" , message : "ticket invalido"});
            } else {
                res.status(200).send(JSON.stringify({response : "OK", "data" : data}));    
            }    
        }
    })
});

/*-----------------
/api/addTicket
API REST para agregar ticket (genera id)
*/
app.post('/api/addTicket', (req,res) => {

    const {clienteID} = req.body;
    const estado_solucion = 1;
    const {solucion} = req.body;
    const {descripcion} = req.body;

    var hoy = new Date();
    var dd = String(hoy.getDate()).padStart(2, '0');
    var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = hoy.getFullYear();
    hoy = dd + '/' + mm + '/' + yyyy;

    const newTicket = {
     id                    : crypto.randomUUID(),
     clienteID             : clienteID,
     estado_solucion       : estado_solucion,
     solucion              : solucion,
     descripcion           : descripcion,
     fecha_apertura        : hoy,
     ultimo_contacto       : hoy
    };

    const paramsPut = {
      TableName: "ticket",
      Item: newTicket,
      ConditionExpression:'attribute_not_exists(id)',
    };

    docClient.put(paramsPut, function (err, data) {
        if (err) {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB error" + err}));
        } else {
            res.status(200).send(JSON.stringify({response : "OK", "ticket": newTicket}));
        }
    });
}
)

/*--------
/api/updateTicket
Dado un id actualiza el ticket, debe informarse la totalidad del ticket excepto ultimo_contacto
*/
app.post('/api/updateTicket', (req,res) => {

    const {id} = req.body;
    const {clienteID} = req.body;
    const {estado_solucion} = req.body;
    const {solucion} = req.body;
    const {descripcion} = req.body;
    const {fecha_apertura} = req.body;

    if (!id) {
        res.status(400).send({response : "ERROR" , message: "Id no informada"});
        return;
    }

    if (!clienteID) {
        res.status(400).send({response : "ERROR" , message: "clienteID no informada"});
        return;
    }

    if (!estado_solucion) {
        res.status(400).send({response : "ERROR" , message: "estado_solucion no informada"});
        return;
    }

    if (!solucion) {
        res.status(400).send({response : "ERROR" , message: "solucion no informado"});
        return;
    }

    if (!fecha_apertura) {
        res.status(400).send({response : "ERROR" , message: "fecha apertura"});
        return;
    }
    
    var hoy = new Date();
    var dd = String(hoy.getDate()).padStart(2, '0');
    var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = hoy.getFullYear();
    hoy = dd + '/' + mm + '/' + yyyy;

    const ultimo_contacto = hoy;

    var params = {
        TableName: "ticket",
        Key: {
            "id" : id
            //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
             }
        };
        
    docClient.get(params, function (err, data) {
        if (err)  {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
            return;
        } else {

            if (Object.keys(data).length == 0) {
                res.status(400).send(JSON.stringify({"response":"ERROR",message : "ticket no existe"}),null,2);
                return;
            } else {

                const paramsUpdate = { 
   
                    ExpressionAttributeNames: { 
                         "#c": "clienteID", 
                         "#e": "estado_solucion",
                         "#s": "solucion",
                         "#a": "fecha_apertura",
                         "#u": "ultimo_contacto",
                         "#d": "descripcion"
                    }, 
                    ExpressionAttributeValues: { 
                        ":c":  clienteID, 
                        ":e":  estado_solucion , 
                        ":s":  solucion , 
                        ":a":  fecha_apertura,
                        ":u":  ultimo_contacto,
                        ":d":  descripcion 
                   }, 
                   Key: { 
                       "id": id 
                   }, 
                   ReturnValues: "ALL_NEW", 
                   TableName: "ticket", 
                   UpdateExpression: "SET #c = :c, #e = :e, #a = :a, #s = :s, #d = :d, #u = :u" 
                };
                docClient.update(paramsUpdate, function (err, data) {
                    if (err)  {
                        res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
                        return;
                    } else {
                        res.status(200).send(JSON.stringify({response : "OK",  "data": data}));
                    }    
                });    
            }
        }    
    })

});


/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*
/*                                    [TP] API REST Estadísticas y Acceso a Tickets                                               *
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*/

/*----
[TP] Helper: valida usuario (contacto o id) y password.
Devuelve el registro del cliente si las credenciales son válidas, o null.
*/
async function validarCredenciales(usuario, password) {
    if (!usuario || !password) return null;
    // Busca primero por contacto, si no encuentra intenta por id
    let items = await scanDbClientePorContacto(usuario);
    if (Object.keys(items).length == 0) {
        // Compatibilidad: intentar por id
        try {
            var params = { TableName: "cliente", Key: { "id": usuario } };
            const data = await docClient.get(params).promise();
            if (Object.keys(data).length != 0) items = [data.Item];
        } catch(e) { /* ignore */ }
    }
    if (Object.keys(items).length == 0) return null;
    const cli = items[0];
    if (cli.password !== password) return null;
    if (cli.activo !== true) return null;
    return cli;
}

/*----
[TP] /resumenTickets
Accesible por GET o POST.
- GET : /resumenTickets?ID={usuario}&PASSWORD={password}
- POST: body JSON {ID:"...", PASSWORD:"..."}
Respuesta: JSON anidado con Id de cliente, correo, número de tickets y
para cada ticket: clave, fecha de apertura y estado.
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

    if (!usuario || !password) {
        res.status(400).send({response:"ERROR", message:"Debe informar ID (contacto) y PASSWORD"});
        return;
    }

    try {
        const cli = await validarCredenciales(usuario, password);
        if (!cli) {
            res.status(401).send({response:"invalido", message:"Usuario o password incorrecto"});
            return;
        }
        const tickets = await scanDbTicket(cli.id);
        const cantidad = tickets.length;
        const detalle = tickets.map(t => ({
            clave          : t.id,
            fecha_apertura : t.fecha_apertura,
            estado         : t.estado_solucion
        }));
        res.status(200).send({
            response     : "OK",
            idCliente    : cli.id,
            contacto     : cli.contacto,
            nombre       : cli.nombre,
            cantidadTickets : cantidad,
            tickets      : detalle
        });
    } catch (err) {
        res.status(500).send({response:"ERROR", message:"DB access error "+err});
    }
}
app.get ('/resumenTickets', handlerResumenTickets);
app.post('/resumenTickets', handlerResumenTickets);

/*----
[TP] /getTicket
Accesible por GET o POST.
- GET : /getTicket?ID={usuario}&PASSWORD={password}&TICKET={ticketID}
- POST: body JSON {ID, PASSWORD, TICKET}
Valida credenciales y existencia del cliente, luego retorna todos los
datos del ticket solicitado o código de error.
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

    if (!usuario || !password) {
        res.status(400).send({response:"ERROR", message:"Debe informar ID (contacto) y PASSWORD"});
        return;
    }
    if (!ticketID) {
        res.status(400).send({response:"ERROR", message:"Debe informar TICKET"});
        return;
    }

    try {
        const cli = await validarCredenciales(usuario, password);
        if (!cli) {
            // [TP] Cliente inválido: no se consulta el ticket
            res.status(401).send({response:"invalido", message:"Cliente no existe o credenciales incorrectas"});
            return;
        }
        var params = { TableName: "ticket", Key: { "id": ticketID } };
        const data = await docClient.get(params).promise();
        if (Object.keys(data).length == 0) {
            res.status(404).send({response:"ERROR", message:"Ticket no existe"});
            return;
        }
        // Seguridad: el ticket debe pertenecer al cliente
        if (data.Item.clienteID !== cli.id) {
            res.status(403).send({response:"ERROR", message:"El ticket no pertenece al cliente"});
            return;
        }
        res.status(200).send({
            response  : "OK",
            idCliente : cli.id,
            contacto  : cli.contacto,
            ticket    : data.Item
        });
    } catch (err) {
        res.status(500).send({response:"ERROR", message:"DB access error "+err});
    }
}
app.get ('/getTicket', handlerGetTicket);
app.post('/getTicket', handlerGetTicket);

/*-------------------------------------------------[ Fin del API REST ]-------------------------------------------------------------*/