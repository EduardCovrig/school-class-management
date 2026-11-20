<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSchoolStore } from '../stores/school';

const schoolStore = useSchoolStore();

// stare reactiva pentru formularul de incadrari (create + edit)
const formClassId = ref('');
const formSubject = ref('');
const editingAssignmentId = ref(null); // daca e null suntem in modul Create, altfel in modul Edit
const assignmentError = ref('');
const assignmentSuccess = ref('');

// stare reactiva pentru incadrarea selectata si catalogul de note
const selectedAssignment = ref(null);
const gradeStudentId = ref('');
const gradeValue = ref(10);
const gradeModule = ref(1);
const editingGradeId = ref(null); // tine id-ul notei pe care o editam acum
const gradeError = ref('');
const gradeSuccess = ref('');

// criteriul selectat pentru sortarea avansata multi-criteriu (+5p bonus)
const sortMode = ref('avg_desc_name_asc');

// proprietate calculata: returneaza lista de materii disponibile pentru clasa aleasa in dropdown
const availableSubjects = computed(() => {
  const cls = schoolStore.classes.find((c) => c.id === formClassId.value);
  return cls ? cls.subjects : [];
});

// proprietate calculata: combina elevii clasei cu notele lor la materia selectata,
// calculeaza media fiecarui elev si aplica sortarea dupa doua criterii
const sortedStudentRows = computed(() => {
  const rows = schoolStore.students.map((student) => {
    // filtram notele elevului curent si le ordonam dupa modul
    const studentGrades = schoolStore.grades
      .filter((g) => g.student.id === student.id)
      .sort((a, b) => a.module - b.module || b.value - a.value);

    // calculam media aritmetica daca elevul are cel putin o nota
    const avg =
      studentGrades.length > 0
        ? studentGrades.reduce((sum, g) => sum + g.value, 0) / studentGrades.length
        : null;

    return {
      ...student,
      grades: studentGrades,
      average: avg
    };
  });

  // sortare avansata dupa mai multe criterii (criteriul principal + departajare pe al doilea criteriu)
  return rows.sort((a, b) => {
    if (sortMode.value === 'avg_desc_name_asc') {
      const avgA = a.average ?? -1;
      const avgB = b.average ?? -1;
      if (avgB !== avgA) return avgB - avgA; // 1. medie descrescator
      return a.fullName.localeCompare(b.fullName); // 2. departajare alfabetica A-Z
    }
    if (sortMode.value === 'avg_asc_name_asc') {
      const avgA = a.average ?? 99;
      const avgB = b.average ?? 99;
      if (avgA !== avgB) return avgA - avgB; // 1. medie crescator
      return a.fullName.localeCompare(b.fullName); // 2. departajare alfabetica A-Z
    }
    if (sortMode.value === 'count_desc_avg_desc') {
      if (b.grades.length !== a.grades.length) return b.grades.length - a.grades.length; // 1. numar note
      return (b.average ?? -1) - (a.average ?? -1); // 2. medie descrescator
    }
    return a.fullName.localeCompare(b.fullName);
  });
});

// la incarcarea paginii aducem clasele si incadrarile profesorului, apoi deschidem prima incadrare
onMounted(async () => {
  await Promise.all([schoolStore.loadClasses(), schoolStore.loadAssignments()]);
  if (schoolStore.assignments.length > 0) {
    await selectAssignment(schoolStore.assignments[0]);
  }
});

// resetam formularul de incadrari la starea initiala (Create)
function resetAssignmentForm() {
  formClassId.value = '';
  formSubject.value = '';
  editingAssignmentId.value = null;
}

// incarcam datele unei incadrari in formular pentru editare
function startEditAssignment(assignment) {
  assignmentError.value = '';
  assignmentSuccess.value = '';
  editingAssignmentId.value = assignment.id;
  formClassId.value = assignment.class.id;
  formSubject.value = assignment.subject;
}

// CREATE / UPDATE incadrare
async function handleSaveAssignment() {
  assignmentError.value = '';
  assignmentSuccess.value = '';

  if (!formClassId.value || !formSubject.value) {
    assignmentError.value = 'Please select both a class and a subject.';
    return;
  }

  try {
    if (editingAssignmentId.value) {
      // apelam PUT in store (actualizeaza atomic si notele legate de aceasta incadrare)
      const updated = await schoolStore.updateAssignment(editingAssignmentId.value, {
        classId: formClassId.value,
        subject: formSubject.value
      });
      assignmentSuccess.value = 'Assignment and related grades updated.';
      if (selectedAssignment.value?.id === updated.id) {
        await selectAssignment(updated);
      }
    } else {
      // apelam POST in store pentru a crea o incadrare noua
      const created = await schoolStore.createAssignment({
        classId: formClassId.value,
        subject: formSubject.value
      });
      assignmentSuccess.value = 'Teaching assignment created.';
      if (!selectedAssignment.value) {
        await selectAssignment(created);
      }
    }
    resetAssignmentForm();
  } catch (err) {
    // afisam mesajul de eroare primit din api (ex: duplicat 409 Conflict)
    assignmentError.value = err.message;
  }
}

// DELETE incadrare
async function handleDeleteAssignment(id) {
  assignmentError.value = '';
  assignmentSuccess.value = '';
  try {
    await schoolStore.deleteAssignment(id);
    assignmentSuccess.value = 'Assignment deleted.';
    // daca am sters incadrarea activa in catalog, trecem la prima ramasa
    if (selectedAssignment.value?.id === id) {
      selectedAssignment.value = schoolStore.assignments[0] || null;
      if (selectedAssignment.value) {
        await selectAssignment(selectedAssignment.value);
      }
    }
  } catch (err) {
    // daca incadrarea are deja note, backend-ul intoarce 409 Conflict si afisam mesajul aici
    assignmentError.value = err.message;
  }
}

// selectam o incadrare si incarcam in paralel elevii clasei si notele la materia respectiva
async function selectAssignment(assignment) {
  selectedAssignment.value = assignment;
  gradeError.value = '';
  gradeSuccess.value = '';
  editingGradeId.value = null;
  gradeStudentId.value = '';
  await Promise.all([
    schoolStore.loadStudents(assignment.class.id),
    schoolStore.loadGrades(assignment.id)
  ]);
}

// pregatim formularul de note pentru modificarea unei note existente
function startEditGrade(grade) {
  gradeError.value = '';
  gradeSuccess.value = '';
  editingGradeId.value = grade.id;
  gradeStudentId.value = grade.student.id;
  gradeValue.value = grade.value;
  gradeModule.value = grade.module;
}

// iesim din modul de editare nota
function cancelEditGrade() {
  editingGradeId.value = null;
  gradeStudentId.value = '';
  gradeValue.value = 10;
  gradeModule.value = 1;
}

// CREATE / UPDATE nota
async function handleSaveGrade() {
  gradeError.value = '';
  gradeSuccess.value = '';

  const val = Number(gradeValue.value);
  const mod = Number(gradeModule.value);

  // validam datele in frontend inainte sa trimitem request-ul catre server
  if (!editingGradeId.value && !gradeStudentId.value) {
    gradeError.value = 'Please select a student.';
    return;
  }
  if (!Number.isInteger(val) || val < 1 || val > 10) {
    gradeError.value = 'Grade must be a whole number between 1 and 10.';
    return;
  }
  if (!Number.isInteger(mod) || mod < 1 || mod > 5) {
    gradeError.value = 'Module must be between 1 and 5.';
    return;
  }

  try {
    if (editingGradeId.value) {
      // modificam nota existenta (PUT /api/grades/:id)
      await schoolStore.updateGrade(editingGradeId.value, { value: val, module: mod });
      gradeSuccess.value = 'Grade updated.';
      cancelEditGrade();
    } else {
      // adaugam o nota noua (POST /api/grades)
      await schoolStore.createGrade({
        assignmentId: selectedAssignment.value.id,
        studentId: gradeStudentId.value,
        value: val,
        module: mod
      });
      gradeSuccess.value = 'Grade recorded.';
      gradeStudentId.value = '';
    }
  } catch (err) {
    gradeError.value = err.message;
  }
}

// DELETE nota
async function handleDeleteGrade(id) {
  gradeError.value = '';
  gradeSuccess.value = '';
  try {
    await schoolStore.deleteGrade(id);
    gradeSuccess.value = 'Grade deleted.';
  } catch (err) {
    gradeError.value = err.message;
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-6 space-y-8">
    <!-- SECTIUNEA 1: CRUD PENTRU INCADRARI (ASSIGNMENTS) -->
    <section class="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 class="text-lg font-bold text-slate-800">My Teaching Assignments</h2>

      <div v-if="assignmentError" class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
        {{ assignmentError }}
      </div>
      <div v-if="assignmentSuccess" class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
        {{ assignmentSuccess }}
      </div>

      <!-- formular creare / modificare incadrare -->
      <form @submit.prevent="handleSaveAssignment" class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Class</label>
          <select
            v-model="formClassId"
            @change="formSubject = ''"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
          >
            <option value="" disabled>-- Choose class --</option>
            <option v-for="cls in schoolStore.classes" :key="cls.id" :value="cls.id">
              Class {{ cls.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Subject</label>
          <select
            v-model="formSubject"
            :disabled="!formClassId"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm disabled:bg-slate-100"
          >
            <option value="" disabled>-- Choose subject --</option>
            <option v-for="subj in availableSubjects" :key="subj" :value="subj">
              {{ subj }}
            </option>
          </select>
        </div>

        <div class="flex gap-2">
          <button
            type="submit"
            class="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
          >
            {{ editingAssignmentId ? 'Update' : 'Add Assignment' }}
          </button>
          <button
            v-if="editingAssignmentId"
            type="button"
            @click="resetAssignmentForm"
            class="py-2 px-3 border border-slate-300 text-sm rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>

      <!-- lista cardurilor cu incadrarile profesorului -->
      <div v-if="schoolStore.assignments.length === 0" class="text-sm text-slate-500 pt-2">
        No assignments yet. Add a class and subject above to start grading.
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
        <div
          v-for="item in schoolStore.assignments"
          :key="item.id"
          @click="selectAssignment(item)"
          :class="[
            'p-4 rounded-xl border cursor-pointer transition flex items-center justify-between',
            selectedAssignment?.id === item.id
              ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-100'
              : 'border-slate-200 hover:border-indigo-300'
          ]"
        >
          <div>
            <p class="font-bold text-slate-800">Class {{ item.class.name }}</p>
            <p class="text-sm text-indigo-600 font-medium">{{ item.subject }}</p>
          </div>

          <div class="flex items-center gap-2" @click.stop>
            <button
              @click="startEditAssignment(item)"
              class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-100"
            >
              Edit
            </button>
            <button
              @click="handleDeleteAssignment(item.id)"
              class="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTIUNEA 2: CATALOGUL DE NOTE PENTRU INCADRAREA SELECTATA -->
    <section v-if="selectedAssignment" class="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-800">
            Gradebook — Class {{ selectedAssignment.class.name }} ({{ selectedAssignment.subject }})
          </h2>
          <p class="text-xs text-slate-500">Add, edit or delete student grades (scale 1–10, modules 1–5)</p>
        </div>

        <!-- selector pentru sortarea avansata multi-criteriu -->
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium text-slate-600">Sort students:</label>
          <select v-model="sortMode" class="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white">
            <option value="avg_desc_name_asc">Average (High → Low), then Name (A–Z)</option>
            <option value="avg_asc_name_asc">Average (Low → High), then Name (A–Z)</option>
            <option value="count_desc_avg_desc">Grades Count (High → Low), then Average</option>
            <option value="name_asc">Full Name (A–Z)</option>
          </select>
        </div>
      </div>

      <div v-if="gradeError" class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
        {{ gradeError }}
      </div>
      <div v-if="gradeSuccess" class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
        {{ gradeSuccess }}
      </div>

      <!-- formular creare / modificare nota -->
      <form @submit.prevent="handleSaveGrade" class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Student</label>
          <select
            v-model="gradeStudentId"
            :disabled="Boolean(editingGradeId)"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm disabled:bg-slate-100"
          >
            <option value="" disabled>-- Select student --</option>
            <option v-for="st in schoolStore.students" :key="st.id" :value="st.id">
              {{ st.fullName }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Grade (1–10)</label>
          <input
            v-model.number="gradeValue"
            type="number"
            min="1"
            max="10"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Module (1–5)</label>
          <select v-model.number="gradeModule" class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm">
            <option v-for="m in [1, 2, 3, 4, 5]" :key="m" :value="m">Module {{ m }}</option>
          </select>
        </div>

        <div class="flex gap-2">
          <button
            type="submit"
            class="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
          >
            {{ editingGradeId ? 'Save Grade' : 'Record Grade' }}
          </button>
          <button
            v-if="editingGradeId"
            type="button"
            @click="cancelEditGrade"
            class="py-2 px-3 border border-slate-300 bg-white text-sm rounded-lg hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </form>

      <!-- tabel responsive cu elevii, notele si media calculata -->
      <div class="overflow-x-auto border border-slate-200 rounded-lg">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th class="px-4 py-2.5">Student</th>
              <th class="px-4 py-2.5">Grades (click to edit / × to remove)</th>
              <th class="px-4 py-2.5 text-right">Average</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="sortedStudentRows.length === 0">
              <td colspan="3" class="px-4 py-4 text-center text-slate-500">
                No students enrolled in Class {{ selectedAssignment.class.name }}.
              </td>
            </tr>
            <tr v-for="row in sortedStudentRows" :key="row.id" class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium text-slate-800">{{ row.fullName }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-2">
                  <span v-if="row.grades.length === 0" class="text-xs text-slate-400">No grades</span>
                  <span
                    v-for="g in row.grades"
                    :key="g.id"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    <button @click="startEditGrade(g)" class="hover:underline" title="Edit grade">
                      {{ g.value }} <span class="text-indigo-400">(M{{ g.module }})</span>
                    </button>
                    <button
                      @click="handleDeleteGrade(g.id)"
                      class="text-red-500 hover:text-red-700 font-bold ml-1"
                      title="Delete grade"
                    >
                      ×
                    </button>
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-right font-bold">
                <span
                  v-if="row.average !== null"
                  :class="row.average >= 5 ? 'text-emerald-600' : 'text-red-600'"
                >
                  {{ row.average.toFixed(2) }}
                </span>
                <span v-else class="text-slate-400 font-normal">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>