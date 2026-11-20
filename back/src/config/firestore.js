const admin = require('firebase-admin');
const path = require('path');

// construim calea absoluta catre fisierul cu cheia contului de serviciu din .env
const serviceAccountPath = path.resolve(__dirname, '../../', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
const serviceAccount = require(serviceAccountPath);

// initializam firebase admin sdk pe server
// asta ne da acces complet la firestore si la verificarea token-urilor din firebase auth
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// luam instanta bazei de date firestore ca sa o putem importa in rute
const db = admin.firestore();

module.exports = { admin, db };