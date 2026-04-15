const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log('🧪 Testing Firestore connection...');
console.log('⏳ This may take up to 30 seconds...');

const timeout = setTimeout(() => {
  console.error('❌ Connection timeout after 30 seconds');
  process.exit(1);
}, 30000);

db.collection('productos').limit(1).get()
  .then(snapshot => {
    clearTimeout(timeout);
    console.log('✅ Firestore connection successful!');
    console.log(`📊 Found ${snapshot.size} existing products`);
    process.exit(0);
  })
  .catch(error => {
    clearTimeout(timeout);
    console.error('❌ Firestore connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code || 'Unknown');
    process.exit(1);
  });