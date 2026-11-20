const { admin, db } = require('../config/firestore');

// verificam token-ul jwt trimis de frontend in header
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decoded.uid).get();

    // punem datele userului pe req ca sa le folosim in rute
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      ...(userDoc.exists ? userDoc.data() : {})
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// lasam doar profesorii sa treaca mai departe
function requireTeacher(req, res, next) {
  if (!req.user || req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Teacher role required.' });
  }
  next();
}

module.exports = { verifyToken, requireTeacher };