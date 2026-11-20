import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useAuthStore } from './auth';

// store pinia care gestioneaza datele principale ale aplicatiei (clase, elevi, incadrari, note)
// centralizam aici apelurile catre api ca componentele vue sa ramana curate si usor de intretinut
export const useSchoolStore = defineStore('school', () => {
  const classes = ref([]);
  const students = ref([]);
  const assignments = ref([]);
  const grades = ref([]);

  // functie ajutatoare (wrapper peste fetch) care ataseaza automat token-ul jwt in header
  // si transforma orice raspuns de eroare (400, 403, 404, 409) intr-un Error cu mesajul din backend
  async function apiFetch(url, options = {}) {
    const authStore = useAuthStore();
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
        ...(options.headers || {})
      }
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Request failed.');
    }
    return data;
  }

  // --- OPERATII DE CITIRE (READ / GET) ---

  // incarcam lista tuturor claselor (ruta publica)
  async function loadClasses() {
    const res = await fetch('/api/classes');
    if (res.ok) {
      classes.value = await res.json();
    }
  }

  // incarcam elevii, optional filtrati dupa clasa selectata
  async function loadStudents(classId = '') {
    const url = classId ? `/api/users/students?classId=${classId}` : '/api/users/students';
    students.value = await apiFetch(url);
  }

  // incarcam incadrarile (profesorul le vede pe ale lui, elevul pe ale clasei lui)
  async function loadAssignments() {
    assignments.value = await apiFetch('/api/assignments');
  }

  // incarcam notele (filtrate dupa incadrare pentru profesor sau toate notele elevului)
  async function loadGrades(assignmentId = '') {
    const url = assignmentId ? `/api/grades?assignmentId=${assignmentId}` : '/api/grades';
    grades.value = await apiFetch(url);
  }

  // --- OPERATII CRUD PENTRU INCADRARI (ASSIGNMENTS) ---

  // CREATE: trimitem o incadrare noua si o adaugam in starea locala din pinia
  async function createAssignment(payload) {
    const created = await apiFetch('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    assignments.value.push(created);
    return created;
  }

  // UPDATE: modificam o incadrare existenta si actualizam elementul in lista din pinia
  async function updateAssignment(id, payload) {
    const updated = await apiFetch(`/api/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    const idx = assignments.value.findIndex((a) => a.id === id);
    if (idx !== -1) {
      assignments.value[idx] = updated;
    }
    return updated;
  }

  // DELETE: stergem o incadrare (daca are note, apiFetch arunca eroarea 409 Conflict din backend)
  async function deleteAssignment(id) {
    await apiFetch(`/api/assignments/${id}`, { method: 'DELETE' });
    assignments.value = assignments.value.filter((a) => a.id !== id);
  }

  // --- OPERATII CRUD PENTRU NOTE (GRADES) ---

  // CREATE: adaugam o nota noua si o punem in array-ul grades din store
  async function createGrade(payload) {
    const created = await apiFetch('/api/grades', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    grades.value.push(created);
    return created;
  }

  // UPDATE: actualizam valoarea sau modulul unei note si inlocuim obiectul in store
  async function updateGrade(id, payload) {
    const updated = await apiFetch(`/api/grades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    const idx = grades.value.findIndex((g) => g.id === id);
    if (idx !== -1) {
      grades.value[idx] = updated;
    }
    return updated;
  }

  // DELETE: stergem nota din backend si o scoatem din lista reactiva grades
  async function deleteGrade(id) {
    await apiFetch(`/api/grades/${id}`, { method: 'DELETE' });
    grades.value = grades.value.filter((g) => g.id !== id);
  }

  return {
    classes,
    students,
    assignments,
    grades,
    loadClasses,
    loadStudents,
    loadAssignments,
    loadGrades,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    createGrade,
    updateGrade,
    deleteGrade
  };
});