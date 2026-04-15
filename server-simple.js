const express = require('express');
const path = require('path');
const admin = require('firebase-admin');

let db;
let serviceAccount;
let firebaseReady = false;
let adminAvailable = false;
let productosEnMemoria = [];
let usuariosEnMemoria = {};
const app = express();

// Función simplificada para inicializar Firebase
function initFirebaseAdmin() {
  try {
    serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    db = admin.firestore();
    console.log(`✅ Firebase inicializado: ${serviceAccount.project_id}`);
    return true;
  } catch (error) {
    console.warn('⚠️ Firebase no disponible:', error.message);
    return false;
  }
}

// Función simplificada para timeout
function firestoreGetWithTimeout(query, timeoutMs = 5000) {
  return Promise.race([
    query.get(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
  ]);
}

// Inicializar Firebase
adminAvailable = initFirebaseAdmin();

// Configurar Express
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Función simplificada para inicializar productos
async function initProductos() {
  // Siempre inicializar datos en memoria
  const productosIniciales = [
    { id: '1', nombre: 'Camiseta Nike', precio: 50, categoria: 'indumentaria', imagen: 'https://picsum.photos/200/150?random=1', descripcion: 'Camiseta deportiva', whatsapp: '5491123456789' },
    { id: '2', nombre: 'Smartphone Samsung', precio: 300, categoria: 'electro', imagen: 'https://picsum.photos/200/150?random=2', descripcion: 'Teléfono inteligente', whatsapp: '5491123456790' },
    { id: '3', nombre: 'Zapatos Adidas', precio: 100, categoria: 'calzado', imagen: 'https://picsum.photos/200/150?random=3', descripcion: 'Zapatos para running', whatsapp: '5491123456791' },
    { id: '4', nombre: 'Servicio de Limpieza', precio: 80, categoria: 'servicios', imagen: 'https://picsum.photos/200/150?random=4', descripcion: 'Limpieza del hogar', whatsapp: '5491123456792' },
    { id: '5', nombre: 'Libro de Programación', precio: 20, categoria: 'varios', imagen: 'https://picsum.photos/200/150?random=5', descripcion: 'Libro técnico', whatsapp: '5491123456793' },
  ];
  productosEnMemoria = productosIniciales;

  // Intentar conectar a Firestore en background si está disponible
  if (adminAvailable) {
    try {
      console.log('🔄 Intentando conectar a Firestore...');
      await firestoreGetWithTimeout(db.collection('productos').limit(1), 8000);
      firebaseReady = true;
      console.log('✅ Firestore conectado - persistencia activada');
    } catch (error) {
      console.log('⚠️ Firestore no responde - usando memoria');
      firebaseReady = false;
    }
  }
}

// Rutas de la API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    firebase: firebaseReady,
    productos: productosEnMemoria.length
  });
});

app.get('/api/productos', async (req, res) => {
  try {
    if (firebaseReady) {
      const snapshot = await db.collection('productos').get();
      const productos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.json(productos);
    } else {
      res.json(productosEnMemoria);
    }
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.json(productosEnMemoria);
  }
});

app.post('/api/productos', async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, imagen, whatsapp, usuario } = req.body;
    if (!nombre || !descripcion || !precio || !categoria || !imagen || !whatsapp || !usuario) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const nuevoProducto = {
      nombre,
      descripcion,
      precio: Number(precio),
      categoria,
      imagen,
      whatsapp,
      usuario,
      createdAt: new Date().toISOString(),
    };

    if (firebaseReady) {
      const docRef = await db.collection('productos').add(nuevoProducto);
      res.json({ id: docRef.id, ...nuevoProducto });
    } else {
      const id = String(Date.now());
      productosEnMemoria.push({ id, ...nuevoProducto });
      res.json({ id, ...nuevoProducto });
    }
  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    const { nombre, email, password, whatsapp } = req.body;
    if (!nombre || !email || !password || !whatsapp) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    if (firebaseReady) {
      try {
        const userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: nombre,
        });
        await db.collection('usuarios').doc(userRecord.uid).set({
          uid: userRecord.uid,
          nombre,
          email,
          whatsapp,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ uid: userRecord.uid, nombre, email, whatsapp });
      } catch (authError) {
        console.error('Error Firebase Auth:', authError.message);
        res.status(400).json({ error: authError.message });
      }
    } else {
      // Modo fallback en memoria
      const uid = String(Date.now());
      usuariosEnMemoria[uid] = { uid, nombre, email, whatsapp, createdAt: new Date().toISOString() };
      res.json({ uid, nombre, email, whatsapp });
    }
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: error.message || 'Error al crear usuario' });
  }
});

// Servir el frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log(`🚀 Servidor SYPSY iniciado en http://localhost:${port}`);
  console.log(`📱 Frontend disponible en http://localhost:${port}`);
  console.log(`🔧 Modo: ${adminAvailable ? 'Firebase disponible' : 'Solo memoria'}`);

  // Inicializar productos en background
  await initProductos();
  console.log(`✅ Listo para recibir usuarios!`);
}).on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Puerto ${port} ocupado.`);
    process.exit(1);
  } else {
    console.error('Error iniciando servidor:', error);
    process.exit(1);
  }
});