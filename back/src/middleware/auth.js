const { admin, db } = require('../config/firestore');

// middleware care verifica daca userul este autentificat (are un token jwt valid de la firebase)
async function verifyToken(req, res, next) {
  // citim header-ul Authorization care vine sub forma "Bearer <token>"
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token.' });
  }

  // extragem efectiv string-ul token-ului dupa cuvantul "Bearer "
  const token = authHeader.split(' ')[1];
  try {
    // verificam semnatura si validitatea token-ului cu firebase admin
    const decoded = await admin.auth().verifyIdToken(token);

    // cautam profilul userului in colectia users din firestore ca sa ii stim rolul (teacher / student)
    const userDoc = await db.collection('users').doc(decoded.uid).get();

    // atasam datele userului pe obiectul req ca sa le avem disponibile in rutele urmatoare
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      ...(userDoc.exists ? userDoc.data() : {})
    };
    next();
  } catch (err) {
    // daca token-ul e expirat sau falsificat intoarcem 401 Unauthorized
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// middleware de autorizare: verifica daca userul logat are rolul de profesor
// se apeleaza mereu dupa verifyToken
function requireTeacher(req, res, next) {
  if (!req.user || req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Teacher role required.' });
  }
  next();
}

module.exports = { verifyToken, requireTeacher };