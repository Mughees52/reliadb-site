import { createRouter, createWebHashHistory } from 'vue-router'
import TrainingIndex from '../views/TrainingIndex.vue'

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'index',
      component: TrainingIndex,
    },
    {
      path: '/module/:moduleId',
      name: 'module',
      component: () => import('../views/ModuleView.vue'),
      props: true,
    },
    {
      path: '/module/:moduleId/lesson/:lessonId',
      name: 'lesson',
      component: () => import('../views/LessonView.vue'),
      props: true,
    },
    {
      path: '/module/:moduleId/exercise/:exerciseId',
      name: 'exercise',
      component: () => import('../views/LessonView.vue'),
      props: (route) => ({
        moduleId: route.params.moduleId,
        exerciseId: route.params.exerciseId,
        isExercise: true,
      }),
    },
  ],
})

export default router
