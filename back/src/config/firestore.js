const admin = require('firebase-admin');
const path = require('path');

// calea completa pentru fisierul cu cheia din firebase
const serviceAccountPath = path.resolve(__dirname, '../../', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
const serviceAccount = require(serviceAccountPath);

// initializam firebase admin ca sa putem accesa baza de date
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = { admin, db };