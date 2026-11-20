<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import Navbar from './components/Navbar.vue';

const router = useRouter();
const authStore = useAuthStore();

// delogam userul si il trimitem pe pagina de login
async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800">
    <!-- componenta reutilizabila de header; trimitem butoanele prin slot -->
    <Navbar>
      <template v-if="authStore.user && authStore.profile">
        <!-- link-uri de navigare vizibile doar pentru profesori -->
        <nav v-if="authStore.profile.role === 'teacher'" class="flex items-center gap-3 mr-2 text-sm">
          <RouterLink to="/teacher" class="text-slate-600 hover:text-indigo-600 font-medium">
            Dashboard
          </RouterLink>
          <RouterLink to="/classes" class="text-slate-600 hover:text-indigo-600 font-medium">
            Classes
          </RouterLink>
        </nav>

        <!-- badge cu rolul userului logat -->
        <span class="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
          {{ authStore.profile.role === 'teacher' ? 'Teacher' : `Student • ${authStore.profile.class?.name}` }}
        </span>
        <span class="text-sm text-slate-600 hidden sm:inline">{{ authStore.profile.fullName }}</span>
        <button
          @click="handleLogout"
          class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition"
        >
          Logout
        </button>
      </template>
    </Navbar>

    <!-- aici vue router afiseaza componenta paginii active -->
    <main>
      <RouterView />
    </main>
  </div>
</template>