const express = require('express');
const app = express();
const multer = require('multer'); // Importar multer
const request = require('request'); // Agregado para manejar las solicitudes HTTP
const socketIo = require('socket.io');
const http = require('http');
const server = http.createServer(app); // Crea un servidor HTTP
const io = require('socket.io')(server); //Pasa el servidor HTTP a Socket.IO
const bodyParser = require('body-parser');
const cors = require('cors');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs'); 



// seteamos urlencoded para capturar los ddatos del formulario
app.use(express.urlencoded({extended:false}));
app.use(express.json());

// invocar a dotenv(ubicacion de los datos de la base de datos)
const dotenv = require('dotenv');
dotenv.config({path:'./env/.env'});

// el directorio public
app.use('/public', express.static('public'));
app.use('/public', express.static(__dirname + '/public'));

//establecemos el motor de plantillas
app.set('view engine', 'ejs');

//invocamos a bcryptjs
const bcrypt = require('bcryptjs');

//var. de session
const session = require('express-session');
app.use(session({
    secret:'secret',
    resave: 'true',
    saveUninitialized:true,
    cookie: { maxAge: null }
}));
//invocar la conexion
const connection = require('./database/db')


/////////////rutas//////////////////////////////
app.get('/inicio', (req,res)=>{
    res.render('inicio');
})

app.get('/nosotros', (req,res)=>{
    res.render('nosotros');
})

app.get('/api', (req,res)=>{
    res.render('api');
})

app.get('/registrar', (req,res)=>{
    res.render('registrar');
})

app.get('/clientes', (req,res)=>{
     res.render('clientes');
 })
 app.get('/json', (req,res)=>{
    res.render('json');
})

 
app.get('/miperfil', (req, res) => {
    connection.query('SELECT nombre FROM carrera', (error, carreras) => {
        if (error) {
            console.error('Error en la consulta de carreras:', error);
            res.status(500).send('Error en el servidor');
        } else {
            const nombresCarreras = carreras.map(carrera => carrera.nombre);

            res.render('miperfil', {
                nombresCarreras: JSON.stringify(nombresCarreras)
            });
        }
    });
});

//////////////Fin de rutas//////////////////
////////registro con verificación de reCAPTCHA//////////////////////////////////
////////registro con verificación de reCAPTCHA//////////////////////////////////
// Configuraracion multer para guardar las imágenes en la carpeta public/imgs
// Configuración de Multer para guardar las imágenes en la carpeta public/img/admin
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/img/admin');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Ruta para obtener la imagen de un usuario
app.get('/api/usuarios/:imagen', (req, res) => {
    const imagen = req.params.imagen;
    const rutaImagen = path.join(__dirname, 'public', 'img', 'admin', imagen);

    if (fs.existsSync(rutaImagen)) {
        res.sendFile(rutaImagen);
    } else {
        res.status(404).json({ error: 'Imagen no encontrada' });
    }
});

const recaptchaSecretKey = '6LfLepIpAAAAAGYRnUxL2HKehFzMmEjMfrg7y-Bn';

// Ruta para el registro de usuarios con verificación de reCAPTCHA
app.post('/usuarioregis', upload.single('foto'), async (req, res) => {
    const { nombre, lastname, correo, password } = req.body;
    const foto = req.file ? req.file.filename : null;
    const recaptchaResponse = req.body['g-recaptcha-response'];

    // Verificar reCAPTCHA
    const recaptchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecretKey}&response=${recaptchaResponse}`;

    request(recaptchaVerifyUrl, async (err, response, body) => {
        try {
            body = JSON.parse(body);

            if (body.success !== undefined && !body.success) {
                return res.render('inicio', {
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "¡Verificación reCAPTCHA fallida!",
                    alertIcon: 'error',
                    showConfirmButton: false,
                    timer: 1500,
                    ruta: ''
                });
            }

            // Verificar si ya existe un usuario con el mismo correo
            const results = await connection.query('SELECT * FROM usuario WHERE correo = ?', [correo]);

            if (results.length > 0) {
                // Ya existe un usuario con el mismo correo
                return res.render('inicio', {
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "¡El correo ya está registrado!",
                    alertIcon: 'error',
                    showConfirmButton: false,
                    timer: 1500,
                    ruta: ''
                });
            }

            // No existe un usuario con el mismo correo, proceder con el registro
            const passwordHash = await bcrypt.hash(password, 8);

            await connection.query('INSERT INTO usuario SET ?', {
                nombre,
                lastname,
                correo,
                foto,
                password: passwordHash
            });

            return res.render('inicio', {
                alert: true,
                alertTitle: "Registro",
                alertMessage: "¡Registro exitoso!",
                alertIcon: 'success',
                showConfirmButton: false,
                timer: 1500,
                ruta: ''
            });

        } catch (error) {
            console.error('Error durante el registro:', error);
            return res.render('inicio', {
                alert: true,
                alertTitle: "Error",
                alertMessage: "¡Ocurrió un error durante el registro!",
                alertIcon: 'error',
                showConfirmButton: false,
                timer: 1500,
                ruta: ''
            });
        }
    });
});
///////////////fin registro con verificación de reCAPTCHA///////////////////////////

//////////////////cambiar la contraseña admin////////////////////
app.post('/cambiar-contrasena', async (req, res) => {
    const correo = req.body.correo;
    const antiguaContrasena = req.body.antiguaContrasena;
    const nuevaContrasena = req.body.nuevaContrasena;

    // Verificar si el usuario con el correo dado existe
    connection.query('SELECT * FROM usuario WHERE correo = ?', [correo], async (error, results) => {
        if (error) {
            console.log(error);
        } else {
            if (results.length > 0) {
                // Usuario encontrado, verificar la antigua contraseña
                const usuario = results[0];
                const isPasswordValid = await bcrypt.compare(antiguaContrasena, usuario.password);

                if (isPasswordValid) {
                    // La antigua contraseña es válida, actualizar la contraseña
                    const nuevaContrasenaHash = await bcrypt.hash(nuevaContrasena, 8);

                    connection.query('UPDATE usuario SET password = ? WHERE correo = ?', [nuevaContrasenaHash, correo], async (error, results) => {
                        if (error) {
                            console.log(error);
                        } else {
                            res.render('inicio', {
                                alert: true,
                                alertTitle: "Cambio de Contraseña",
                                alertMessage: "¡Contraseña cambiada con éxito!",
                                alertIcon: 'success',
                                showConfirmButton: false,
                                timer: 1500,
                                ruta: ''
                            });
                        }
                    });
                } else {
                    // La antigua contraseña no es válida
                    res.render('inicio', {
                        alert: true,
                        alertTitle: "Error",
                        alertMessage: "¡La antigua contraseña es incorrecta!",
                        alertIcon: 'error',
                        showConfirmButton: false,
                        timer: 1500,
                        ruta: ''
                    });
                }
            } else {
                // No se encontró ningún usuario con el correo dado
                res.render('inicio', {
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "¡Usuario no encontrado!",
                    alertIcon: 'error',
                    showConfirmButton: false,
                    timer: 1500,
                    ruta: ''
                });
            }
        }
    });
});
/////////////////fin cambiar la contraseña admin///////////////////////


//////////////////autenticacion para el inicio de sesion//////////////////
app.post('/auth', async (req, res)=> {
	const correo = req.body.correo;
    const password = req.body.password;
    let passwordHash = await bcrypt.hash(password, 8);
    if(correo && password){
        connection.query('SELECT * FROM usuario WHERE correo = ?', [correo], async (error, results)=> {
            if(results.length == 0 || !(await bcrypt.compare(password, results[0].password))){
                res.render('inicio',{
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "USUARIO y/o PASSWORD incorrectas",
                    alertIcon:'error',
                    showConfirmButton: true,
                    timer: false,
                    ruta: ''    
                })
            }else{
                 req.session.loggedin = true;                
				req.session.nombre = results[0].nombre;
               req.session.foto = results[0].foto;
                req.session.lastname = results[0].lastname;
                req.session.correo = results[0].correo;
               req.session.claveempleado = results[0].claveempleado;
                
                res.render('inicio',{
                    alert: true,
                    alertTitle: "Conexion exitosa",
                    alertMessage: "Bienvenid@",
                    alertIcon:'success',
                    showConfirmButton: false,
                    timer: 1500,
                    ruta: ''    
                })
            }

        })
    }else{
        res.render('inicio',{
            alert: true,
            alertTitle: "Advertencia",
            alertMessage: "Por favor ingrese un usuario y una password",
            alertIcon:'warning',
            showConfirmButton: true,
            timer: false,
            ruta: ''    
        });
    }
});
//////////////////fin autenticacion para el inicio de sesion//////////////////



//////////////////Rutas con Autenticacion///////////
app.get('/',(req, res)=>{
    if(req.session.loggedin){
        res.render('index',{
            login:true,
            nombre: req.session.nombre,
            lastname: req.session.lastname,
            correo: req.session.correo,
            claveempleado: req.session.claveempleado,
            foto: `public/img/admin/${req.session.foto}`
        })
    }else{
        res.redirect('/inicio');   
    }
})

app.get('/estadofoco', (req, res) => {
    if (req.session.loggedin) {
        res.render('estadofoco', {
            login: true,
            estadoPuerta: 'Desconocido' 
        });
    } else {
        res.redirect('/inicio');
    }
});








//////////fin autenticacion para las demas paginas cuando inicie sesion//////////////////


// api
app.use(cors());
// Middleware para analizar el cuerpo de la solicitud como JSON
app.use(bodyParser.json());

app.get('/api/usuarios', (req, res) => {
    connection.query('SELECT * FROM usuario', (error, results) => {
        if (error) {
            res.status(500).json({ error: 'Error al obtener el usuario' });
        } else {
            res.status(200).json(results);
        }
    });
});
 
// Ruta para obtener un administrador por ID
app.get('/api/usuario/:id', (req, res) => {
    const id = req.params.id;
    connection.query('SELECT * FROM usuario WHERE id = ?', [id], (error, results) => {
        if (error) {
            res.status(500).json({ error: 'Error al obtener el usuario' });
        } else {
            if (results.length === 0) {
                res.status(404).json({ error: 'usuario no encontrado' });
            } else {
                res.status(200).json(results[0]);
            }
        }
    });
});

app.get('/api/puerta', (req, res) => {
    connection.query('SELECT * FROM puerta', (error, results) => {
        if (error) {
            res.status(500).json({ error: 'Error al obtener el usuario' });
        } else {
            res.status(200).json(results);
        }
    });
});
// fin api


// sensores




// Variable para almacenar el estado de la puerta
let estadoPuerta = false;

app.post('/puerta-estado', (req, res) => {
  estadoPuerta = req.body.estado;

  res.redirect('/estado_puerta');
});

app.post('/estado_puerta', (req, res) => {
    const estado = req.body.estado;

    connection.query('INSERT INTO puerta (estatus) VALUES (?)', [estado], (error, results) => {
        if (error) {
            console.error('Error al insertar el estado de la puerta en la base de datos:', error);
            res.status(500).send('Error interno del servidor');
        } else {
          
            res.redirect('/estado_puerta');
        }
    });
});

app.get('/estado_puerta', (req, res) => {
    if (req.session.loggedin) {
        res.render('estado_puerta', { estadoPuerta });
    } else {
        res.redirect('/inicio');
    }
});

 
//////////////////////Cerrar Sesion///////////////////////////////
app.get('/logout', function (req, res) {
	req.session.destroy(() => {
	  res.redirect('inicio') // siempre se ejecutará después de que se destruya la sesión
	})
});
/////////////////////Fin Cerrar Sesion///////////////////////////////

////////////////////Servidor//////////////////////




//Configuracion para productivo
//app.listen(process.env.PORT);

//Configuracion para Desarrolllo
server.listen(3001, () => {
console.log("El servidor está ejecutándose en el puerto http://localhost:3001");
});


///////////////Fin de servidor////////////////////////////
