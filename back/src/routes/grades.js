const express = require('express');
const { db } = require('../config/firestore');
const { verifyToken, requireTeacher } = require('../middleware/auth');

const router = express.Router();

// GET /api/grades
// intoarce notele: profesorul vede notele puse de el, iar elevul vede strict notele lui
router.get('/', verifyToken, async (req, res, next) => {
  try {
    let query = db.collection('grades');

    if (req.user.role === 'teacher') {
      // filtram dupa id-ul profesorului salvat denormalizat in documentul notei
      query = query.where('assignment.teacherId', '==', req.user.uid);

      // optional, profesorul poate filtra notele doar pentru o anumita incadrare (?assignmentId=...)
      if (req.query.assignmentId) {
        query = query.where('assignment.id', '==', req.query.assignmentId);
      }
    } else {
      // un elev nu poate vedea notele colegilor; fortam filtrarea dupa uid-ul lui din token
      query = query.where('student.id', '==', req.user.uid);
    }

    const snapshot = await query.get();
    const grades = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(grades);
  } catch (err) {
    next(err);
  }
});

// POST /api/grades
// adauga o nota noua unui elev (doar profesorul care preda la acea incadrare)
router.post('/', verifyToken, requireTeacher, async (req, res, next) => {
  try {
    const { assignmentId, studentId, value, module } = req.body;

    // convertim valorile primite in numere ca sa le putem valida strict
    const numericValue = Number(value);
    const numericModule = Number(module);

    // 1. verificam ca am primit incadrarea si elevul -> 400 Bad Request
    if (!assignmentId || !studentId) {
      return res.status(400).json({ error: 'Assignment and student are required.' });
    }

    // 2. validam ca nota este un numar intreg intre 1 si 10
    if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 10) {
      return res.status(400).json({ error: 'Grade value must be an integer between 1 and 10.' });
    }

    // 3. validam ca modulul scolar este un numar intreg intre 1 si 5
    if (!Number.isInteger(numericModule) || numericModule < 1 || numericModule > 5) {
      return res.status(400).json({ error: 'Module must be an integer between 1 and 5.' });
    }

    // 4. verificam in firestore ca incadrarea exista si apartine profesorului logat
    const assignmentDoc = await db.collection('assignments').doc(assignmentId).get();
    if (!assignmentDoc.exists) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }
    const assignmentData = assignmentDoc.data();
    if (assignmentData.teacher.id !== req.user.uid) {
      return res.status(403).json({ error: 'You cannot add grades to another teacher assignment.' });
    }

    // 5. verificam ca elevul exista in colectia users si are rolul student
    const studentDoc = await db.collection('users').doc(studentId).get();
    if (!studentDoc.exists || studentDoc.data().role !== 'student') {
      return res.status(404).json({ error: 'Student not found.' });
    }
    const studentData = studentDoc.data();

    // 6. verificam consistenta relatiei: elevul trebuie sa faca parte din clasa incadrarii
    if (studentData.class?.id !== assignmentData.class.id) {
      return res.status(400).json({ error: 'Student does not belong to this assignment class.' });
    }

    // 7. construim documentul denormalizat al notei:
    // salvam numele elevului, clasa, materia si id-ul profesorului direct in nota
    // astfel, catalogul elevului si al profesorului se incarca dintr-o singura interogare
    const newGrade = {
      value: numericValue,
      module: numericModule,
      student: { id: studentDoc.id, fullName: studentData.fullName },
      assignment: {
        id: assignmentDoc.id,
        className: assignmentData.class.name,
        subject: assignmentData.subject,
        teacherId: req.user.uid
      },
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('grades').add(newGrade);
    res.status(201).json({ id: docRef.id, ...newGrade });
  } catch (err) {
    next(err);
  }
});

// PUT /api/grades/:id
// modifica valoarea sau modulul unei note existente
router.put('/:id', verifyToken, requireTeacher, async (req, res, next) => {
  try {
    const { id } = req.params;
    const numericValue = Number(req.body.value);
    const numericModule = Number(req.body.module);

    // validam noile valori inainte sa atingem baza de date
    if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 10) {
      return res.status(400).json({ error: 'Grade value must be an integer between 1 and 10.' });
    }
    if (!Number.isInteger(numericModule) || numericModule < 1 || numericModule > 5) {
      return res.status(400).json({ error: 'Module must be an integer between 1 and 5.' });
    }

    const gradeRef = db.collection('grades').doc(id);
    const gradeDoc = await gradeRef.get();

    if (!gradeDoc.exists) {
      return res.status(404).json({ error: 'Grade not found.' });
    }

    // verificam ownership-ul: doar profesorul care a pus nota o poate modifica -> 403 Forbidden
    if (gradeDoc.data().assignment.teacherId !== req.user.uid) {
      return res.status(403).json({ error: 'You can only edit your own grades.' });
    }

    await gradeRef.update({ value: numericValue, module: numericModule });
    res.status(200).json({ id, ...gradeDoc.data(), value: numericValue, module: numericModule });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/grades/:id
// sterge o nota din firestore
router.delete('/:id', verifyToken, requireTeacher, async (req, res, next) => {
  try {
    const { id } = req.params;
    const gradeRef = db.collection('grades').doc(id);
    const gradeDoc = await gradeRef.get();

    if (!gradeDoc.exists) {
      return res.status(404).json({ error: 'Grade not found.' });
    }

    // verificam ownership-ul: doar profesorul care a pus nota o poate sterge -> 403 Forbidden
    if (gradeDoc.data().assignment.teacherId !== req.user.uid) {
      return res.status(403).json({ error: 'You can only delete your own grades.' });
    }

    await gradeRef.delete();
    res.status(200).json({ message: 'Grade deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;