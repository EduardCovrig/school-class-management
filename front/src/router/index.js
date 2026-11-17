import { createRouter, createWebHistory } from 'vue-router';
import ClassesView from '../views/ClassesView.vue';

// definim rutele aplicatiei
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'classes',
      component: ClassesView
    }
  ]
});

export default router;