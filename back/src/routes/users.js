const express = require('express');
const { db } = require('../config/firestore');
const { verifyToken, requireTeacher } = require('../middleware/auth');

const router = express.Router();

// POST /api/users/profile
// salvam profilul userului in firestore dupa ce si-a creat contul in firebase auth
router.post('/profile', verifyToken, async (req, res, next) => {
  try {
    const { fullName, role, classId } = req.body;

    // validam numele si rolul primit din formular -> altfel 400 Bad Request
    if (!fullName || fullName.trim().length < 3) {
      return res.status(400).json({ error: 'Full name must have at least 3 characters.' });
    }
    if (!['teacher', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role selected.' });
    }

    const profileData = {
      fullName: fullName.trim(),
      email: req.user.email,
      role
    };

    // daca userul s-a inregistrat ca elev trebuie sa ii legam si clasa
    if (role === 'student') {
      if (!classId) {
        return res.status(400).json({ error: 'Students must select a class.' });
      }
      // verificam in firestore ca exista clasa aleasa
      const classDoc = await db.collection('classes').doc(classId).get();
      if (!classDoc.exists) {
        return res.status(400).json({ error: 'Selected class does not exist.' });
      }
      // denormalizare: salvam o copie cu id si nume ca sa nu mai facem o citire in plus la afisare
      profileData.class = { id: classDoc.id, name: classDoc.data().name };
    }

    // salvam documentul folosind chiar uid-ul din firebase auth ca id de document
    await db.collection('users').doc(req.user.uid).set(profileData);
    res.status(201).json({ uid: req.user.uid, ...profileData });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me
// intoarce datele profilului pentru userul logat acum (folosit la refresh in frontend)
router.get('/me', verifyToken, (req, res) => {
  if (!req.user.role) {
    return res.status(404).json({ error: 'User profile not found.' });
  }
  res.status(200).json(req.user);
});

// GET /api/users/students
// returneaza lista elevilor (doar pentru profesori), optional filtrata dupa ?classId=9A
router.get('/students', verifyToken, requireTeacher, async (req, res, next) => {
  try {
    // pornim interogarea filtrand doar documentele cu role == 'student'
    let query = db.collection('users').where('role', '==', 'student');

    // daca primim query param classId filtram suplimentar dupa campul imbricat class.id
    if (req.query.classId) {
      query = query.where('class.id', '==', req.query.classId);
    }

    const snapshot = await query.get();
    const students = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    res.status(200).json(students);
  } catch (err) {
    next(err);
  }
});

module.exports = router;