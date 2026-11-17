const express = require('express');
const { db } = require('../config/firestore');

const router = express.Router();

// luam toate clasele din firestore si le sortam dupa nume
router.get('/', async (req, res, next) => {
  try {
    const snapshot = await db.collection('classes').get();
    const classes = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    res.status(200).json(classes);
  } catch (err) {
    next(err);
  }
});

module.exports = router;