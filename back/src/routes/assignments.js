const express = require('express');
const { db } = require('../config/firestore');
const { verifyToken, requireTeacher } = require('../middleware/auth');

const router = express.Router();

// GET /api/assignments
// returneaza incadrarile (clasa + materie) relevante pentru utilizatorul logat
router.get('/', verifyToken, async (req, res, next) => {
  try {
    let query = db.collection('assignments');

    // daca userul e profesor, aducem doar incadrarile create de el
    // daca userul e elev, aducem incadrarile clasei din care face parte
    if (req.user.role === 'teacher') {
      query = query.where('teacher.id', '==', req.user.uid);
    } else if (req.user.class?.id) {
      query = query.where('class.id', '==', req.user.class.id);
    }

    const snapshot = await query.get();

    // transformam documentele firestore in obiecte js cu id-ul inclus
    // sortam natural dupa numele clasei ca "9A" sa apara inainte de "10A"
    const assignments = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.class.name.localeCompare(b.class.name, undefined, { numeric: true }));

    res.status(200).json(assignments);
  } catch (err) {
    next(err);
  }
});

// POST /api/assignments
// creeaza o incadrare noua (profesorul isi asociaza o clasa si o materie)
// folosim verifyToken + requireTeacher ca doar profesorii sa poata crea incadrari
router.post('/', verifyToken, requireTeacher, async (req, res, next) => {
  try {
    const { classId, subject } = req.body;

    // 1. validare de baza: verificam ca am primit ambele campuri obligatorii -> 400 Bad Request
    if (!classId || !subject || !subject.trim()) {
      return res.status(400).json({ error: 'Class and subject are required.' });
    }

    // 2. verificam in firestore ca exista clasa aleasa -> altfel 404 Not Found
    const classDoc = await db.collection('classes').doc(classId).get();
    if (!classDoc.exists) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    // 3. verificam ca materia trimisa face parte din materiile valide ale clasei -> 400 Bad Request
    const classData = classDoc.data();
    if (!classData.subjects.includes(subject.trim())) {
      return res.status(400).json({ error: 'Selected subject is not valid for this class.' });
    }

    // 4. prevenim duplicatele: acelasi profesor nu poate avea de doua ori aceeasi clasa + materie -> 409 Conflict
    const duplicate = await db
      .collection('assignments')
      .where('teacher.id', '==', req.user.uid)
      .where('class.id', '==', classId)
      .where('subject', '==', subject.trim())
      .get();

    if (!duplicate.empty) {
      return res.status(409).json({ error: 'You already teach this subject to this class.' });
    }

    // 5. modelare NoSQL (denormalizare): salvam copii cu id si nume pentru profesor si clasa
    // astfel, cand afisam incadrarile in frontend nu mai facem citiri suplimentare in users sau classes
    const newAssignment = {
      teacher: { id: req.user.uid, fullName: req.user.fullName },
      class: { id: classDoc.id, name: classData.name },
      subject: subject.trim(),
      year: classData.year || '2026/2027'
    };

    // adaugam documentul in colectia assignments si intoarcem 201 Created
    const docRef = await db.collection('assignments').add(newAssignment);
    res.status(201).json({ id: docRef.id, ...newAssignment });
  } catch (err) {
    next(err);
  }
});

// PUT /api/assignments/:id
// modifica o incadrare existenta si sincronizeaza copiile denormalizate din colectia grades
router.put('/:id', verifyToken, requireTeacher, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { classId, subject } = req.body;

    if (!classId || !subject || !subject.trim()) {
      return res.status(400).json({ error: 'Class and subject are required.' });
    }

    // cautam incadrarea dupa id in firestore
    const assignmentRef = db.collection('assignments').doc(id);
    const assignmentDoc = await assignmentRef.get();

    if (!assignmentDoc.exists) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    // verificam ownership-ul: un profesor nu are voie sa modifice incadrarea altui profesor -> 403 Forbidden
    if (assignmentDoc.data().teacher.id !== req.user.uid) {
      return res.status(403).json({ error: 'You can only edit your own assignments.' });
    }

    const classDoc = await db.collection('classes').doc(classId).get();
    if (!classDoc.exists) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    const classData = classDoc.data();
    if (!classData.subjects.includes(subject.trim())) {
      return res.status(400).json({ error: 'Invalid subject for this class.' });
    }

    // verificam sa nu cream un duplicat cu alta incadrare a aceluiasi profesor
    const duplicate = await db
      .collection('assignments')
      .where('teacher.id', '==', req.user.uid)
      .where('class.id', '==', classId)
      .where('subject', '==', subject.trim())
      .get();

    const hasOtherDuplicate = duplicate.docs.some((doc) => doc.id !== id);
    if (hasOtherDuplicate) {
      return res.status(409).json({ error: 'You already teach this subject to this class.' });
    }

    const updatedData = {
      class: { id: classDoc.id, name: classData.name },
      subject: subject.trim()
    };

    // costul denormalizarii in NoSQL: cand schimbam materia sau clasa unei incadrari,
    // trebuie sa actualizam si copiile salvate in documentele din colectia grades
    // folosim db.batch() ca toate modificarile sa se execute atomic (ori toate, ori niciuna)
    const batch = db.batch();
    batch.update(assignmentRef, updatedData);

    const gradesSnapshot = await db.collection('grades').where('assignment.id', '==', id).get();
    gradesSnapshot.docs.forEach((gradeDoc) => {
      batch.update(gradeDoc.ref, {
        'assignment.className': classData.name,
        'assignment.subject': subject.trim()
      });
    });

    await batch.commit();
    res.status(200).json({ id, ...assignmentDoc.data(), ...updatedData });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/assignments/:id
// sterge o incadrare doar daca nu exista note puse pe ea (integritate referentiala -> 409 Conflict)
router.delete('/:id', verifyToken, requireTeacher, async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignmentRef = db.collection('assignments').doc(id);
    const assignmentDoc = await assignmentRef.get();

    if (!assignmentDoc.exists) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    // verificam ca incadrarea apartine profesorului logat -> 403 Forbidden
    if (assignmentDoc.data().teacher.id !== req.user.uid) {
      return res.status(403).json({ error: 'You can only delete your own assignments.' });
    }

    // interogam colectia grades cu limit(1) ca sa vedem daca exista cel putin o nota legata de aceasta incadrare
    // daca exista note, refuzam stergerea cu 409 Conflict ca sa nu lasam note orfane sau sa pierdem datele elevilor
    const existingGrades = await db.collection('grades').where('assignment.id', '==', id).limit(1).get();
    if (!existingGrades.empty) {
      return res.status(409).json({
        error: 'Cannot delete this assignment because grades have already been recorded for it.'
      });
    }

    await assignmentRef.delete();
    res.status(200).json({ message: 'Assignment deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;