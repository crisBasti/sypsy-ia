# SYPSY - Despliegue Rápido

## 🚀 Desplegar Online (Opción Rápida)

### 1. Railway (Recomendado - Gratis)
1. Ve a [Railway.app](https://railway.app) y regístrate
2. Conecta tu GitHub
3. Importa este repositorio
4. Railway detectará automáticamente Node.js
5. La app se desplegará automáticamente

### 2. Render (Alternativa)
1. Ve a [Render.com](https://render.com)
2. Crea un nuevo "Web Service"
3. Conecta tu repositorio GitHub
4. Configura:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. Vercel (Otra opción)
1. Ve a [Vercel.com](https://vercel.com)
2. Importa el proyecto
3. Configura el comando de build: `npm install`
4. Start command: `npm start`

## ✅ Funcionalidades Listas

- ✅ Registro de usuarios
- ✅ Autenticación con Firebase
- ✅ Carga de productos
- ✅ Persistencia en Firestore
- ✅ Interfaz web completa
- ✅ WhatsApp integration

## 🔧 Configuración

Asegúrate de que `serviceAccountKey.json` esté en la raíz del proyecto con las credenciales de Firebase.

## 📱 Acceso

Una vez desplegado, comparte la URL con tus usuarios. ¡Ya pueden registrarse y subir productos!
