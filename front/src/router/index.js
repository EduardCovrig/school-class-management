import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import TeacherDashboardView from '../views/TeacherDashboardView.vue';
import StudentDashboardView from '../views/StudentDashboardView.vue';
import ClassesView from '../views/ClassesView.vue';

// definim rutele aplicatiei si metadatele de securitate pentru fiecare pagina
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true } },
    { path: '/teacher', name: 'teacher', component: TeacherDashboardView, meta: { requiresAuth: true, role: 'teacher' } },
    { path: '/student', name: 'student', component: StudentDashboardView, meta: { requiresAuth: true, role: 'student' } },
    { path: '/classes', name: 'classes', component: ClassesView, meta: { requiresAuth: true, role: 'teacher' } },
    // orice alta ruta necunoscuta trimite spre login
    { path: '/:pathMatch(.*)*', redirect: '/login' }
  ]
});

// navigation guard global: ruleaza inainte de fiecare schimbare de pagina
router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  // asteptam initializarea starii de autentificare la refresh
  await authStore.initAuth();

  const isLoggedIn = Boolean(authStore.user && authStore.profile);
  const role = authStore.profile?.role;

  // daca pagina cere autentificare si userul nu e logat il trimitem la login
  if (to.meta.requiresAuth && !isLoggedIn) {
    return '/login';
  }

  // daca e deja logat si intra pe login sau register il ducem in pagina rolului sau
  if (to.meta.guestOnly && isLoggedIn) {
    return role === 'teacher' ? '/teacher' : '/student';
  }

  // daca un elev incearca sa intre pe o pagina de profesor (sau invers) il redirectionam
  if (to.meta.role && to.meta.role !== role) {
    return role === 'teacher' ? '/teacher' : '/student';
  }
});

export default router;