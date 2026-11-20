const express = require('express');
const { db } = require('../config/firestore');

const router = express.Router();

// GET /api/classes
// ruta publica (folosita si la inregistrarea elevilor ca sa isi aleaga clasa)
router.get('/', async (req, res, next) => {
  try {
    // citim toate documentele din colectia classes
    const snapshot = await db.collection('classes').get();

    // punem id-ul documentului in obiect si sortam natural (9A inainte de 10A)
    const classes = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    res.status(200).json(classes);
  } catch (err) {
    next(err);
  }
});

module.exports = router;