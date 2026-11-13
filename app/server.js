const express = require('express');
const passport = require('passport');
const xsenv = require('@sap/xsenv');
const JWTStrategy = require('@sap/xssec').JWTStrategy;
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


//configure passport - get first audience for xsuaa
const xsuaaService = xsenv.getServices({ myXsuaa: { tag: 'xsuaa' }});
const xsuaaCredentials = xsuaaService.myXsuaa; 
const jwtStrategy = new JWTStrategy(xsuaaCredentials)
passport.use('jwt1', jwtStrategy);

// configure passport - get second audience for job-scheduler
const jobSchedulerService = xsenv.getServices({ jobScheduler: { tag: 'jobscheduler' }});
const jobSchedulerCredentials = jobSchedulerService.jobScheduler.uaa; 
const jwtStrategy2 = new JWTStrategy(jobSchedulerCredentials)
passport.use('jwt2', jwtStrategy2);

app.use(passport.initialize());
app.use(passport.authenticate(['jwt1', 'jwt2'], { session: false }));



app.get('/notificar', function(req, res){
    axios.get('https://cmp-produccion-cmp-produccion-grp-js.cfapps.us10.hana.ondemand.com/vat.xsjs?method=get-ejecutores')
        .then(response => {
            // Handle the response data
            if (response.data.length){
                const url = 'https://sendmailproxyprdrelay.cfapps.us10.hana.ondemand.com/send';
                
                const config = {
                    headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic Ymx1ZWJvb3Q6czMzM25kYmx1bWFs'
                    }
                };

                response.data.forEach((ejecutor, i) => {

                    const delay = i * 2500; 

                    setTimeout(() => {                                                
                        
                        const data = {
                            "sendTo": ejecutor.ejecutorEmail,
                            "subject": "VAT #" + ejecutor.id + " - Recordatorio de Evaluacion de Entorno",
                            "mailBody": `Estimado/a ` + ejecutor.ejecutorNombre + `,
                            
Se le recuerda que debe realizar la evaluacion de entorno del dia de hoy para el VAT #` + ejecutor.id + `.
Por favor realizarlo a la brevedad.
                            
Muchas gracias,
GRP Digital.`
                        }
                        
                        axios.post(url, data, config )
                        .then(response => {
                            // Handle the response data
                            console.log("Mail enviado con éxito.");                     
                        }).catch(error => {
                            console.error(error);
                        });  
                    }, delay);
                })
            } else {
                console.log("No se obtuvieron Ejecutores.");
            }
        })
        .catch(error => {
            // Handle any error that occurred during the request
            console.error(error);
    });

    console.log('==> [APP JOB LOG] Job is running . . .');
    res.send('Finished job');
});

app.post('/notificarDuenoArea', function(req, res){
    console.log("--------------");
    console.log("--------------");
    console.log("--------------");
    console.log("Este es el req");
    console.log("--------------");
    console.log("--------------");
    console.log("--------------");
    console.log(req.body);
    console.log("--------------");
    console.log("--------------");
    console.log("--------------");
    const urlHana = 'https://cmp-produccion-cmp-produccion-grp-js.cfapps.us10.hana.ondemand.com/vat.xsjs?method=get-vat-sin-evaluacion&turno='+req.body.turno+'&hora='+req.body.hora;
    axios.get(urlHana)
    .then(response => {
        // Handle the response data
            console.log("--------------");
            console.log("--------------");
            console.log("--------------");
            console.log("Esta es la response");
            console.log("--------------");
            console.log("--------------");
            console.log(urlHana);
            console.log("--------------");
            console.log("--------------");
            console.log("--------------");
            console.log(response.data);
            console.log("--------------");
            console.log("--------------");
            
            if (response.data.length){
                var fecha = new Date();

                // Ajustar la zona horaria de Chile -4 / -3
                fecha.setHours(fecha.getHours() - 4);

                const subject = 
                (fecha.getDate() < 10 ? "0" + fecha.getDate() : fecha.getDate()) + "-" + 
                (fecha.getMonth() < 10 ? "0" + (fecha.getMonth() + 1) : (fecha.getMonth() + 1) ) + "-" + 
                fecha.getFullYear() + " " + 
                (fecha.getHours() < 10 ? "0" + fecha.getHours() : fecha.getHours())  + ":00 hs";

                const url = 'https://sendmailproxyprdrelay.cfapps.us10.hana.ondemand.com/send';
                
                const config = {
                    headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic Ymx1ZWJvb3Q6czMzM25kYmx1bWFs'
                    }
                };

                response.data.forEach((duenoArea, i) => {

                    const delay = i * 2500; 

                    var vatInfo = [];

                    duenoArea.vat.forEach((vat)=>{
                        vatInfo.push("– VAT N° "+vat.id + " - " + vat.ejecutorNombre +" ("+ vat.ejecutorEmail+")\n");
                    });
                    const vatText = vatInfo.join();

                    setTimeout(() => {                                                
                        const data = {
                            "sendTo": duenoArea.duenoAreaEmail,
                            "subject": subject + " - Recordatorio VAT sin evaluaciones de entorno",
                            "mailBody": `Estimado/a ` + duenoArea.duenoAreaNombre + `,
                            
Se le recuerda que los siguientes VAT no cuentan con evaluación de entorno al momento del envío de este mail:\n\n` + vatText + `\n
                            
Muchas gracias,
GRP Digital.`}    
                        axios.post(url, data, config )
                        .then(response => {
                            // Handle the response data
                            console.log("Mail enviado con éxito.");                     
                        }).catch(error => {
                            console.error(error);
                        });  
                    }, delay);
                })
            } else {
                console.log("No se obtuvieron VAT sin evaluaciones.");
            }
            
        })
        .catch(error => {
            // Handle any error that occurred during the request
            console.error(error);
    });
    

    console.log('==> [APP JOB LOG] Job is running . . .');
    res.send('Finished job');
});

app.post('/notificarSolitarios', function(req, res){

    const urlRit = 'https://cmp-produccion-cmp-produccion-grp-js.cfapps.us10.hana.ondemand.com/rit.xsjs?method=get-rit-solitarios&turno='+req.body.turno;

    axios.get(urlRit)
        .then(response => {
            // Handle the response data
            if (response.data.length){
                const url = 'https://sendmailproxyprdrelay.cfapps.us10.hana.ondemand.com/send';
                
                
                const config = {
                    headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic Ymx1ZWJvb3Q6czMzM25kYmx1bWFs'
                    }
                };

                response.data.forEach((row, i) => {

                    const TZ = "America/Santiago";

                    const fechaCL = new Date(row.fechaInicio)
                    .toLocaleDateString("es-CL", { timeZone: TZ });              // ej: 10-10-2025

                    const horaCL = new Date(row.horaInicio)
                    .toLocaleTimeString("es-CL", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }); // ej: 14:37

                    const delay = i * 2500; 
                    var mensaje = `Estimado/a ${row.liderNombre},<br><br>
                    Se ha detectado que ${row.personaNombre} está realizando un trabajo en solitario en el RIT ${row.ritId}.<br><br>
                    Fecha: ${fechaCL}<br>
                    Faena: ${row.faenaName}<br>
                    Valle: ${row.valleName}<br>
                    Hora inicio: ${horaCL}<br><br>
                    Email de la persona: ${row.personaEmail}<br><br>
                    Por favor ingrese al siguiente enlace para realizar la evaluación y dejar registro:
                    <a href='https://grp.cmp.cl#rit-Display?ritId=${row.ritId}&persona=${row.personaEmail}' target='_blank'> aquí</a><br><br>
                    En caso de no poder acceder al link, intente <a href='https://flpnwc-ehvtci0fma.dispatcher.br1.hana.ondemand.com/sites/prd#rit-Display?ritId=${row.ritId}&persona=${row.personaEmail}' target='_blank'>acá</a><br><br>
                    Saludos,<br>
                    GRP Digital.`;


                    setTimeout(() => {                                                
                        
                        const data = {
                            "sendTo": row.liderEmail,
                            "subject": `RIT #${row.ritId} - Persona trabajando en solitario`,
							"mailBody": "a", 
                            "html": mensaje
                            // "html": (mensaje.replace("aquí", `<a href='https://grpqa.cmp.cl#rit-Display?ritId=${row.ritId}&persona=${row.personaEmail}' target='_blank'>aquí</a>`)).replace("acá", `<a href='https://flpnwc-ndaf37b4a.dispatcher.br1.hana.ondemand.com/sites?siteId=a95e35c0-735c-4da3-948a-86abc801600e#rit-Display?ritId=${row.ritId}&persona=${row.personaEmail}' target='_blank'>acá</a>`)
                        }
                        // https://grpqa.cmp.cl#rit-Display?ritId=${row.ritId}&persona=${row.personaEmail} 
                        
                        axios.post(url, data, config )
                        .then(response => {
                            // Handle the response data
                            console.log("Mail enviado con éxito.");                     
                        }).catch(error => {
                            console.error(error);
                        });  
                    }, delay);
                })
            } else {
                console.log("No se obtuvieron rit solitarios.");
            }
        })
        .catch(error => {
            // Handle any error that occurred during the request
            console.error(error);
    });

    console.log('==> [APP JOB LOG] Job is running . . .');
    res.send('Finished job');
});

// Aviso diario al equipo de cada investigacion con los dias habiles que quedan para cerrarla
app.get('/notificarPlazosInvestigaciones', function(req, res){

    const urlInvestigaciones = 'https://cap-capcf-grp-js.cfapps.us10.hana.ondemand.com/investigaciones.xsjs?method=get-plazos-investigaciones';

    // BLOQUE TEMPORAL PARA PRUEBAS: si tiene correos, solo se envia a esos. Vaciar para enviar a todo el equipo
    const correosPrueba = ['lcairo@blueboot.com', 'tsantana@cmp.cl', 'ecortesi@cmp.cl'];

    // intent de la app de investigaciones en el launchpad (lo que va despues del # en la url)
    // si queda vacio, el mail se envia sin link
    const intentInvestigaciones = 'investigacionincidentes-Display';

    // solo se avisa cuando quedan estos dias habiles o menos: 2 dias antes, 1 dia antes y el dia del cierre (0)
    const diasAviso = 2;

    axios.get(urlInvestigaciones)
        .then(response => {
            // diasRestantes puede venir como string (DECIMAL de HANA)
            const investigaciones = (response.data?.entity || [])
                .filter(investigacion => Number(investigacion.diasRestantes) <= diasAviso);

            // un mail por cada miembro del equipo de cada investigacion
            var mails = [];
            investigaciones.forEach((investigacion) => {
                const correos = [...new Set((investigacion.equipo || [])
                    .map(miembro => (miembro.email || "").trim().toLowerCase())
                    .filter(Boolean))]
                    .filter(correo => !correosPrueba.length || correosPrueba.includes(correo));

                correos.forEach((correo) => {
                    mails.push({ investigacion, correo });
                });
            });

            if (mails.length){
                const url = 'https://sendMail.cfapps.us10.hana.ondemand.com/send';

                const config = {
                    headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic Ymx1ZWJvb3Q6czMzM25kYmx1bWFs'
                    }
                };

                mails.forEach(({ investigacion, correo }, i) => {

                    const delay = i * 2500;

                    // diasRestantes puede venir como string (DECIMAL de HANA)
                    const dias = Number(investigacion.diasRestantes);
                    const textoDias = dias === 0
                        ? "hoy vence el plazo"
                        : (dias === 1 ? "queda 1 día hábil" : `quedan ${dias} días hábiles`);

                    var link = intentInvestigaciones
                        ? `Puede revisarla ingresando al siguiente enlace:
                    <a href='https://grpqa.cmp.cl#${intentInvestigaciones}?id=${investigacion.id}' target='_blank'>aquí</a><br><br>
                    En caso de no poder acceder al link, intente <a href='https://flpnwc-ndaf37b4a.dispatcher.br1.hana.ondemand.com/sites?siteId=a95e35c0-735c-4da3-948a-86abc801600e#${intentInvestigaciones}?id=${investigacion.id}' target='_blank'>acá</a><br><br>`
                        : `Puede revisarla ingresando a la aplicación de Investigación de Incidentes.<br><br>`;

                    var mensaje = `Estimado/a,<br><br>
                    Le recordamos que para la investigación ${investigacion.nombre ? "<b>" + investigacion.nombre + "</b> " : ""}con Número SAP: ${investigacion.numeroAviso} ${textoDias} para su cierre.<br><br>
                    ${link}
                    Saludos,<br>
                    GRP Digital.`;

                    setTimeout(() => {

                        const data = {
                            "sendTo": correo,
                            "subject": `Investigación Nro SAP: ${investigacion.numeroAviso} - Plazo de cierre: ${textoDias}`,
                            "mailBody": "a",
                            "html": mensaje
                        }

                        axios.post(url, data, config )
                        .then(response => {
                            console.log("Mail enviado con éxito.");
                        }).catch(error => {
                            console.error(error);
                        });
                    }, delay);
                })
            } else {
                console.log(`No hay investigaciones en proceso a ${diasAviso} días hábiles o menos de su cierre.`);
            }
        })
        .catch(error => {
            console.error(error);
    });

    console.log('==> [APP JOB LOG] Job is running . . .');
    res.send('Finished job');
});

app.get('/healthcheck-hana', async function(req, res) {
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 12000;

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    let lastError = null;

    for (let i = 1; i <= MAX_RETRIES; i++) {
        try {
            await axios.get('https://cmp-produccion-cmp-produccion-grp-js.cfapps.us10.hana.ondemand.com/vat.xsjs?method=get-ejecutores', 
                { timeout: 10000 }
            );
            console.log(`[HANA CHECK] Intento ${i}: OK`);
            return res.status(200).send('OK - HANA responde correctamente'); 
        } catch(err) {
            lastError = err.message;
            console.warn(`[HANA CHECK] Intento ${i} fallido: ${err.message}`);
            if (i < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
        }
    }

    const url = 'https://sendmailproxyprdrelay.cfapps.us10.hana.ondemand.com/send';
                
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic Ymx1ZWJvb3Q6czMzM25kYmx1bWFs'
        }
    };
    await axios.post(url, {
        sendTo: 'fbastias@cmp.cl',
        subject: '[ALERTA] HANA no responde - BTP PRD',
        mailBody: `HANA no respondió luego de 5 intentos (~1 minuto).\n\nError: ${lastError}`
    }, config).catch(e => console.error('Error enviando mail:', e.message));

    return res.status(500).send(`HANA no responde - alerta enviada. Error: ${lastError}`);
});

const port = process.env.PORT || 3000;
app.listen(port, function(){
    console.log('listening');
})
