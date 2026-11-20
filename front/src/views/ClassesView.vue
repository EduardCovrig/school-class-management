<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const classes = ref([]);
const students = ref([]);
const selectedClassId = ref('');
const loading = ref(true);
const error = ref('');

// luam toate clasele din api
async function fetchClasses() {
  const res = await fetch('/api/classes');
  if (!res.ok) throw new Error('Failed to load classes');
  classes.value = await res.json();
}

// luam elevii, filtrati dupa clasa selectata daca exista una
async function fetchStudents() {
  const url = selectedClassId.value
    ? `/api/users/students?classId=${selectedClassId.value}`
    : '/api/users/students';

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${authStore.token}` }
  });
  if (!res.ok) throw new Error('Failed to load students');
  students.value = await res.json();
}

// cand dam click pe o clasa reincarcam lista de elevi
async function selectClass(classId) {
  selectedClassId.value = classId;
  try {
    await fetchStudents();
  } catch (err) {
    error.value = err.message;
  }
}

onMounted(async () => {
  try {
    await Promise.all([fetchClasses(), fetchStudents()]);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
    <div v-if="error" class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
      {{ error }}
    </div>

    <div v-if="loading" class="text-slate-500 text-sm">Loading data...</div>

    <template v-else>
      <!-- sectiunea cu clasele afisate intr-un grid responsive -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-slate-800">Classes ({{ classes.length }})</h2>
          <button
            v-if="selectedClassId"
            @click="selectClass('')"
            class="text-sm text-indigo-600 hover:underline"
          >
            Show all students
          </button>
        </div>

        <p v-if="classes.length === 0" class="text-sm text-slate-500 bg-white p-4 rounded-lg border border-slate-200">
          No classes found in database yet.
        </p>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div
            v-for="cls in classes"
            :key="cls.id"
            @click="selectClass(cls.id)"
            :class="[
              'p-4 rounded-xl border bg-white cursor-pointer transition',
              selectedClassId === cls.id
                ? 'border-indigo-600 ring-2 ring-indigo-100'
                : 'border-slate-200 hover:border-indigo-300'
            ]"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-slate-800">Class {{ cls.name }}</span>
              <span class="text-xs text-slate-400">{{ cls.year }}</span>
            </div>
            <p class="text-xs text-slate-500">
              {{ cls.subjects?.join(', ') }}
            </p>
          </div>
        </div>
      </section>

      <!-- tabel responsive cu elevii -->
      <section class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 class="font-semibold text-slate-800">
            Students {{ selectedClassId ? `- Class ${selectedClassId}` : '(All)' }}
          </h2>
          <span class="text-xs text-slate-500">{{ students.length }} total</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th class="px-4 py-2.5">Full Name</th>
                <th class="px-4 py-2.5">Email</th>
                <th class="px-4 py-2.5">Class</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="students.length === 0">
                <td colspan="3" class="px-4 py-4 text-center text-slate-500">
                  No students found.
                </td>
              </tr>
              <tr v-for="student in students" :key="student.id" class="hover:bg-slate-50">
                <td class="px-4 py-2.5 font-medium text-slate-800">{{ student.fullName }}</td>
                <td class="px-4 py-2.5 text-slate-600">{{ student.email }}</td>
                <td class="px-4 py-2.5">
                  <span class="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
                    {{ student.class?.name }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>