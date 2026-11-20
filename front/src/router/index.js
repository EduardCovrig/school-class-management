import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import TeacherDashboardView from '../views/TeacherDashboardView.vue';
import StudentDashboardView from '../views/StudentDashboardView.vue';
import ClassesView from '../views/ClassesView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true } },
    { path: '/teacher', name: 'teacher', component: TeacherDashboardView, meta: { requiresAuth: true, role: 'teacher' } },
    { path: '/student', name: 'student', component: StudentDashboardView, meta: { requiresAuth: true, role: 'student' } },
    { path: '/classes', name: 'classes', component: ClassesView, meta: { requiresAuth: true, role: 'teacher' } },
    { path: '/:pathMatch(.*)*', redirect: '/login' }
  ]
});

// navigation guard: verificam daca userul e logat si are voie pe pagina ceruta
router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  await authStore.initAuth();

  const isLoggedIn = Boolean(authStore.user && authStore.profile);
  const role = authStore.profile?.role;

  if (to.meta.requiresAuth && !isLoggedIn) {
    return '/login';
  }
  if (to.meta.guestOnly && isLoggedIn) {
    return role === 'teacher' ? '/teacher' : '/student';
  }
  if (to.meta.role && to.meta.role !== role) {
    return role === 'teacher' ? '/teacher' : '/student';
  }
});

export default router;