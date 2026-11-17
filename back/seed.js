//folosim faker ca sa ne dea datele pt seed.

require('dotenv').config();
const { faker } = require('@faker-js/faker');
const { db } = require('./src/config/firestore');

const LEVELS = ['9', '10', '11', '12'];
const LETTERS = ['A', 'B', 'C', 'D'];
const SUBJECTS = ['Mathematics', 'Computer Science', 'English', 'Physics', 'History', 'Literature'];

async function seed() {
  // folosim batch ca sa trimitem toate scrierile dintr-o singura bucata
  const batch = db.batch();

  // 1. cream mai intai cele 16 clase (9A .. 12D)
  const classes = [];
  for (const level of LEVELS) {
    for (const letter of LETTERS) {
      const className = `${level}${letter}`;
      const ref = db.collection('classes').doc(className);

      batch.set(ref, {
        name: className,
        year: '2026/2027',
        subjects: SUBJECTS
      });

      classes.push({ id: ref.id, name: className });
    }
  }

  // 2. cream 16 elevi de test si le punem o copie a clasei (id si name)
  const students = [];
  for (let i = 0; i < 16; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const assignedClass = faker.helpers.arrayElement(classes);
    const studentRef = db.collection('users').doc();

    batch.set(studentRef, {
      fullName,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      role: 'student',
      class: assignedClass // copie denormalizata: { id, name }
    });

    students.push({ id: studentRef.id, fullName, class: assignedClass });
  }

  // 3. cream un profesor demo si doua incadrari (assignments) ca exemplu de relatii
  const teacherRef = db.collection('users').doc('demo_teacher');
  batch.set(teacherRef, {
    fullName: 'Prof. Adrian Ionescu',
    email: 'teacher@school.edu',
    role: 'teacher'
  });

  const assignmentRef = db.collection('assignments').doc();
  batch.set(assignmentRef, {
    teacher: { id: teacherRef.id, fullName: 'Prof. Adrian Ionescu' },
    class: { id: '9A', name: '9A' },
    subject: 'Mathematics',
    year: '2026/2027'
  });

  // 4. daca avem elevi in 9A le punem si cate o nota de test
  const studentsIn9A = students.filter((s) => s.class.id === '9A');
  for (const st of studentsIn9A) {
    const gradeRef = db.collection('grades').doc();
    batch.set(gradeRef, {
      value: faker.number.int({ min: 7, max: 10 }),
      module: 1,
      student: { id: st.id, fullName: st.fullName },
      assignment: {
        id: assignmentRef.id,
        className: '9A',
        subject: 'Mathematics',
        teacherId: teacherRef.id
      },
      createdAt: new Date().toISOString()
    });
  }

  await batch.commit();
  console.log(`Seed finished: ${classes.length} classes and ${students.length} students created.`);
}

seed().catch((err) => {
  console.error('Error while seeding database:', err);
  process.exit(1);
});