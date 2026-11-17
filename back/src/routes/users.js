const express = require('express');
const { db } = require('../config/firestore');

const router = express.Router();

// luam elevii din baza de date, optional filtrati dupa clasa
router.get('/students', async (req, res, next) => {
  try {
    let query = db.collection('users').where('role', '==', 'student');

    // daca primim ?classId=9B filtram doar elevii din clasa aia
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