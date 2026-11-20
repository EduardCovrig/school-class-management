<script setup>
import { computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useSchoolStore } from '../stores/school';

const authStore = useAuthStore();
const schoolStore = useSchoolStore();

// la deschiderea paginii aducem incadrarile clasei si notele elevului logat
onMounted(async () => {
  await Promise.all([schoolStore.loadAssignments(), schoolStore.loadGrades()]);
});

// grupam notele elevului pe fiecare materie a clasei sale si calculam media pe materie
const subjectSummaries = computed(() => {
  const subjects = new Set([
    ...schoolStore.assignments.map((a) => a.subject),
    ...schoolStore.grades.map((g) => g.assignment.subject)
  ]);

  return Array.from(subjects)
    .sort((a, b) => a.localeCompare(b))
    .map((subject) => {
      const subjectGrades = schoolStore.grades
        .filter((g) => g.assignment.subject === subject)
        .sort((a, b) => a.module - b.module);

      const avg =
        subjectGrades.length > 0
          ? subjectGrades.reduce((sum, g) => sum + g.value, 0) / subjectGrades.length
          : null;

      return { subject, grades: subjectGrades, average: avg };
    });
});

// calculam media generala a tuturor materiilor la care elevul are deja note
const overallAverage = computed(() => {
  const valid = subjectSummaries.value.filter((s) => s.average !== null);
  if (valid.length === 0) return null;
  return valid.reduce((sum, s) => sum + s.average, 0) / valid.length;
});
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-6 space-y-6">
    <!-- antetul carnetului de note cu media generala -->
    <div class="bg-white p-6 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-slate-800">
          Student Gradebook — Class {{ authStore.profile?.class?.name }}
        </h1>
        <p class="text-sm text-slate-500">{{ authStore.profile?.fullName }}</p>
      </div>

      <div class="text-right">
        <p class="text-xs text-slate-500 uppercase tracking-wide">Overall Average</p>
        <p class="text-2xl font-bold text-indigo-600">
          {{ overallAverage !== null ? overallAverage.toFixed(2) : '—' }}
        </p>
      </div>
    </div>

    <!-- tabel responsive cu notele si mediile pe fiecare materie -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3">Subject</th>
              <th class="px-4 py-3">Grades</th>
              <th class="px-4 py-3 text-right">Subject Average</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="subjectSummaries.length === 0">
              <td colspan="3" class="px-4 py-4 text-center text-slate-500">
                No subjects or grades available yet.
              </td>
            </tr>
            <tr v-for="item in subjectSummaries" :key="item.subject" class="hover:bg-slate-50">
              <td class="px-4 py-3 font-semibold text-slate-800">{{ item.subject }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-2">
                  <span v-if="item.grades.length === 0" class="text-xs text-slate-400">No grades yet</span>
                  <span
                    v-for="g in item.grades"
                    :key="g.id"
                    class="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700"
                  >
                    {{ g.value }} <span class="text-slate-400">(M{{ g.module }})</span>
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-right font-bold">
                <span
                  v-if="item.average !== null"
                  :class="item.average >= 5 ? 'text-emerald-600' : 'text-red-600'"
                >
                  {{ item.average.toFixed(2) }}
                </span>
                <span v-else class="text-slate-400 font-normal">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>