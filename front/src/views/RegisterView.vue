<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const fullName = ref('');
const email = ref('');
const password = ref('');
const role = ref('teacher');
const classId = ref('');
const classes = ref([]);
const error = ref('');
const loading = ref(false);

// luam clasele din api pentru dropdown-ul de elevi
onMounted(async () => {
  try {
    const res = await fetch('/api/classes');
    if (res.ok) {
      classes.value = await res.json();
    }
  } catch (err) {
    console.error(err);
  }
});

// validam formularul si cream contul
async function handleRegister() {
  error.value = '';
  if (fullName.value.trim().length < 3) {
    error.value = 'Full name must have at least 3 characters.';
    return;
  }
  if (!email.value || password.value.length < 6) {
    error.value = 'Enter a valid email and a password of at least 6 characters.';
    return;
  }
  if (role.value === 'student' && !classId.value) {
    error.value = 'Please select your class.';
    return;
  }

  loading.value = true;
  try {
    await authStore.register({
      fullName: fullName.value,
      email: email.value,
      password: password.value,
      role: role.value,
      classId: role.value === 'student' ? classId.value : null
    });
    router.push(role.value === 'teacher' ? '/teacher' : '/student');
  } catch (err) {
    error.value = err.message || 'Registration failed.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-60px)] flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xs p-8">
      <h1 class="text-2xl font-bold text-slate-800 mb-1">Create Account</h1>
      <p class="text-sm text-slate-500 mb-6">Register as a teacher or student</p>

      <div v-if="error" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
        {{ error }}
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input
            v-model="fullName"
            type="text"
            placeholder="e.g. Andrei Popescu"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="name@school.edu"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Password (min 6 chars)</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Role</label>
          <select
            v-model="role"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </div>

        <div v-if="role === 'student'">
          <label class="block text-sm font-medium text-slate-700 mb-1">Class</label>
          <select
            v-model="classId"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="" disabled>-- Select class --</option>
            <option v-for="cls in classes" :key="cls.id" :value="cls.id">
              Class {{ cls.name }}
            </option>
          </select>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition disabled:opacity-50"
        >
          {{ loading ? 'Creating account...' : 'Register' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-600">
        Already have an account?
        <RouterLink to="/login" class="text-indigo-600 font-medium hover:underline">
          Sign In
        </RouterLink>
      </p>
    </div>
  </div>
</template>