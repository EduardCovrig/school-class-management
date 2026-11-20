const express = require('express');
const { db } = require('../config/firestore');
const { verifyToken, requireTeacher } = require('../middleware/auth');

const router = express.Router();

// salvam profilul in firestore dupa ce userul si-a facut cont in firebase auth
router.post('/profile', verifyToken, async (req, res, next) => {
  try {
    const { fullName, role, classId } = req.body;

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

    // daca e elev trebuie sa ii salvam si clasa din care face parte
    if (role === 'student') {
      if (!classId) {
        return res.status(400).json({ error: 'Students must select a class.' });
      }
      const classDoc = await db.collection('classes').doc(classId).get();
      if (!classDoc.exists) {
        return res.status(400).json({ error: 'Selected class does not exist.' });
      }
      profileData.class = { id: classDoc.id, name: classDoc.data().name };
    }

    await db.collection('users').doc(req.user.uid).set(profileData);
    res.status(201).json({ uid: req.user.uid, ...profileData });
  } catch (err) {
    next(err);
  }
});

// luam profilul utilizatorului logat acum
router.get('/me', verifyToken, (req, res) => {
  if (!req.user.role) {
    return res.status(404).json({ error: 'User profile not found.' });
  }
  res.status(200).json(req.user);
});

// luam elevii din baza de date, optional filtrati dupa clasa (doar pentru profesori)
router.get('/students', verifyToken, requireTeacher, async (req, res, next) => {
  try {
    let query = db.collection('users').where('role', '==', 'student');

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