<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

// validam campurile si trimitem cererea de login catre store-ul auth
async function handleLogin() {
  error.value = '';
  if (!email.value || !password.value) {
    error.value = 'Please fill in both email and password.';
    return;
  }

  loading.value = true;
  try {
    await authStore.login(email.value, password.value);
    // redirectionam in functie de rolul intors de api
    const target = authStore.profile?.role === 'teacher' ? '/teacher' : '/student';
    router.push(target);
  } catch (err) {
    error.value = 'Invalid email or password.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-60px)] flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xs p-8">
      <h1 class="text-2xl font-bold text-slate-800 mb-1">Sign In</h1>
      <p class="text-sm text-slate-500 mb-6">Access your teacher or student dashboard</p>

      <div v-if="error" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
        {{ error }}
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
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
          <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition disabled:opacity-50"
        >
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-600">
        Don't have an account?
        <RouterLink to="/register" class="text-indigo-600 font-medium hover:underline">
          Register
        </RouterLink>
      </p>
    </div>
  </div>
</template>