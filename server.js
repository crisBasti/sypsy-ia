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

function parseServiceAccountFromEnv() {
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!envKey) return null;
  try {
    return JSON.parse(envKey);
  } catch (error) {
    console.error('ERROR: No se pudo parsear FIREBASE_SERVICE_ACCOUNT_JSON. Verifica el JSON.');
    console.error(error.message);
    return null;
  }
}

function initFirebaseAdmin() {
  const envServiceAccount = parseServiceAccountFromEnv();
  if (envServiceAccount) {
    serviceAccount = envServiceAccount;
  } else {
    try {
      serviceAccount = require('./serviceAccountKey.json');
    } catch (error) {
      console.warn('WARN: No se encontró serviceAccountKey.json en la raíz del proyecto.');
      return false;
    }
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    db = admin.firestore();
    console.log(`Firebase Admin inicializado para el proyecto: ${serviceAccount.project_id}`);
    return true;
  } catch (error) {
    console.error('ERROR al inicializar Firebase Admin:', error.message);
    return false;
  }
}

function firestoreGetWithTimeout(query, timeoutMs = 15000) {
  return Promise.race([
    query.get(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), timeoutMs)),
  ]);
}

adminAvailable = initFirebaseAdmin();
if (!adminAvailable) {
  console.warn('Iniciando modo fallback en memoria sin Firebase.');
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function generarProductosPrueba() {
  const categorias = ['indumentaria', 'electro', 'calzado', 'servicios', 'varios'];
  const nombres = {
    indumentaria: ['Camiseta', 'Pantalón', 'Chaqueta', 'Vestido', 'Short'],
    electro: ['Smartphone', 'Laptop', 'Tablet', 'Auriculares', 'Cargador'],
    calzado: ['Zapatos', 'Zapatillas', 'Botas', 'Sandalias', 'Tacones'],
    servicios: ['Limpieza', 'Reparación', 'Clases', 'Masaje', 'Jardinería'],
    varios: ['Libro', 'Juguete', 'Herramienta', 'Accesorio', 'Decoración'],
  };
  const productosGenerados = [];
  for (const cat of categorias) {
    for (let i = 1; i <= 200; i += 1) {
      const nombreBase = nombres[cat][Math.floor(Math.random() * nombres[cat].length)];
      const nombre = `${nombreBase} ${cat.charAt(0).toUpperCase() + cat.slice(1)} ${i}`;
      const precio = Math.floor(Math.random() * 500) + 10;
      const imagen = `https://picsum.photos/200/150?random=${Math.floor(Math.random() * 10000)}`;
      const descripcion = `Descripción de ${nombre}`;
      const whatsapp = `54911${Math.floor(Math.random() * 90000000) + 10000000}`;
      productosGenerados.push({ nombre, precio, categoria: cat, imagen, descripcion, whatsapp });
    }
  }
  return productosGenerados;
}

async function ensureProductosIniciales() {
  if (!adminAvailable) {
    firebaseReady = false;
    const productosIniciales = [
      { id: '1', nombre: 'Camiseta Nike', precio: 50, categoria: 'indumentaria', imagen: 'https://picsum.photos/200/150?random=1', descripcion: 'Camiseta deportiva de alta calidad', whatsapp: '5491123456789' },
      { id: '2', nombre: 'Smartphone Samsung', precio: 300, categoria: 'electro', imagen: 'https://picsum.photos/200/150?random=2', descripcion: 'Teléfono inteligente con cámara excelente', whatsapp: '5491123456790' },
      { id: '3', nombre: 'Zapatos Adidas', precio: 100, categoria: 'calzado', imagen: 'https://picsum.photos/200/150?random=3', descripcion: 'Zapatos cómodos para running', whatsapp: '5491123456791' },
      { id: '4', nombre: 'Servicio de Limpieza', precio: 80, categoria: 'servicios', imagen: 'https://picsum.photos/200/150?random=4', descripcion: 'Limpieza profunda de hogar', whatsapp: '5491123456792' },
      { id: '5', nombre: 'Varios - Libro', precio: 20, categoria: 'varios', imagen: 'https://picsum.photos/200/150?random=5', descripcion: 'Libro de programación', whatsapp: '5491123456793' },
    ];
    productosEnMemoria = [...productosIniciales, ...generarProductosPrueba().map((p, i) => ({ id: String(6 + i), ...p }))];
    console.log('⚠️ Firebase no disponible. Iniciando con datos en memoria.');
    return;
  }

  try {
    console.log('🔍 Intentando conectar a Firestore...');
    console.log('⏳ Esto puede tomar hasta 30 segundos...');

    // Intentar conectar con timeout más largo
    const snapshot = await firestoreGetWithTimeout(db.collection('productos').limit(1), 30000);
    console.log('✅ Firestore conectado exitosamente.');
    if (!snapshot.empty) {
      console.log('Productos existentes encontrados en Firestore.');
      firebaseReady = true;
      return;
    }
    console.log('No hay productos. Generando 1000 productos de prueba en Firestore...');
    const productosIniciales = [
      { nombre: 'Camiseta Nike', precio: 50, categoria: 'indumentaria', imagen: 'https://picsum.photos/200/150?random=1', descripcion: 'Camiseta deportiva de alta calidad', whatsapp: '5491123456789' },
      { nombre: 'Smartphone Samsung', precio: 300, categoria: 'electro', imagen: 'https://picsum.photos/200/150?random=2', descripcion: 'Teléfono inteligente con cámara excelente', whatsapp: '5491123456790' },
      { nombre: 'Zapatos Adidas', precio: 100, categoria: 'calzado', imagen: 'https://picsum.photos/200/150?random=3', descripcion: 'Zapatos cómodos para running', whatsapp: '5491123456791' },
      { nombre: 'Servicio de Limpieza', precio: 80, categoria: 'servicios', imagen: 'https://picsum.photos/200/150?random=4', descripcion: 'Limpieza profunda de hogar', whatsapp: '5491123456792' },
      { nombre: 'Varios - Libro', precio: 20, categoria: 'varios', imagen: 'https://picsum.photos/200/150?random=5', descripcion: 'Libro de programación', whatsapp: '5491123456793' },
    ];
    console.log('📤 Subiendo productos a Firestore...');
    const productosAGenerar = [...productosIniciales, ...generarProductosPrueba()];
    const batchSize = 100; // Reducir batch size para evitar timeouts

    for (let i = 0; i < productosAGenerar.length; i += batchSize) {
      const batch = db.batch();
      const chunk = productosAGenerar.slice(i, i + batchSize);
      chunk.forEach((producto) => {
        const docRef = db.collection('productos').doc();
        batch.set(docRef, producto);
      });
      await batch.commit();
      console.log(`✅ Subidos ${Math.min(i + batchSize, productosAGenerar.length)} / ${productosAGenerar.length} productos`);
    }
    firebaseReady = true;
    console.log('Generación de productos completada en Firestore.');
  } catch (error) {
    console.error('❌ Error conectando a Firestore:', error.message);
    console.error('🔍 Código de error:', error.code || 'Desconocido');
    console.error('📋 Stack trace:', error.stack);

    console.warn('⚠️  Firestore no está disponible. Usando modo fallback con datos en memoria.');
    console.warn('💡 Posibles soluciones:');
    console.warn('   - Verificar conexión a internet');
    console.warn('   - Revisar firewall/antivirus');
    console.warn('   - Intentar desde otra red');
    console.warn('   - Verificar región de Firestore');

    firebaseReady = false;
    const productosIniciales = [
      { id: '1', nombre: 'Camiseta Nike', precio: 50, categoria: 'indumentaria', imagen: 'https://picsum.photos/200/150?random=1', descripcion: 'Camiseta deportiva de alta calidad', whatsapp: '5491123456789' },
      { id: '2', nombre: 'Smartphone Samsung', precio: 300, categoria: 'electro', imagen: 'https://picsum.photos/200/150?random=2', descripcion: 'Teléfono inteligente con cámara excelente', whatsapp: '5491123456790' },
      { id: '3', nombre: 'Zapatos Adidas', precio: 100, categoria: 'calzado', imagen: 'https://picsum.photos/200/150?random=3', descripcion: 'Zapatos cómodos para running', whatsapp: '5491123456791' },
      { id: '4', nombre: 'Servicio de Limpieza', precio: 80, categoria: 'servicios', imagen: 'https://picsum.photos/200/150?random=4', descripcion: 'Limpieza profunda de hogar', whatsapp: '5491123456792' },
      { id: '5', nombre: 'Varios - Libro', precio: 20, categoria: 'varios', imagen: 'https://picsum.photos/200/150?random=5', descripcion: 'Libro de programación', whatsapp: '5491123456793' },
    ];
    productosEnMemoria = [...productosIniciales, ...generarProductosPrueba().map((p, i) => ({ id: String(6 + i), ...p }))];
    console.log(`✅ Modos fallback listo con ${productosEnMemoria.length} productos en memoria.`);
  }
}


app.get('/api/status', (req, res) => {
  res.json({ status: 'ok' });
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
    console.error('Error leyendo productos:', error);
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
      // Usar Firebase Auth + Firestore
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
        console.error('Error con Firebase Auth:', authError.message);
        res.status(400).json({ error: authError.message });
      }
    } else {
      // Usar modo fallback en memoria
      const uid = String(Date.now());
      usuariosEnMemoria[uid] = { uid, nombre, email, whatsapp, createdAt: new Date().toISOString() };
      res.json({ uid, nombre, email, whatsapp });
    }
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: error.message || 'Error al crear usuario' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 3000;

// Iniciar servidor inmediatamente
app.listen(port, () => {
  console.log(`🚀 Servidor iniciado en http://localhost:${port}`);
  console.log(`📱 Frontend disponible en http://localhost:${port}`);
  console.log(`🔧 Modo: ${adminAvailable ? 'Firebase + Fallback' : 'Solo Fallback'}`);

  // Intentar conectar a Firestore en background
  if (adminAvailable) {
    console.log('🔄 Conectando a Firestore en segundo plano...');
    ensureProductosIniciales().catch(error => {
      console.error('Error en inicialización de Firestore:', error.message);
    });
  } else {
    console.log('⚠️ Firebase no disponible - modo fallback activado');
  }
}).on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Puerto ${port} ocupado. Intenta con otro puerto.`);
    process.exit(1);
  } else {
    console.error('Error iniciando servidor:', error);
    process.exit(1);
  }
});
