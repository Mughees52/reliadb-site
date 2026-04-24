<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { modules } from '../data/modules'
import { useProgress } from '../composables/useProgress'
import TrainingNav from '../components/layout/TrainingNav.vue'
import ProgressBar from '../components/progress/ProgressBar.vue'
import ModuleCta from '../components/layout/ModuleCta.vue'

const route = useRoute()
const { isLessonComplete, isExerciseComplete, getModuleProgress } = useProgress()

const module = computed(() => {
  const id = Number(route.params.moduleId)
  return modules.find((m) => m.id === id) || null
})

const progress = computed(() => {
  if (!module.value) return { completed: 0, total: 0, percent: 0 }
  return getModuleProgress(module.value.id, module.value.lessons.length, module.value.exercises.length)
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-72px)]">
    <!-- Sidebar navigation -->
    <TrainingNav />

    <!-- Main content -->
    <main v-if="module" class="flex-1 min-w-0 px-6 lg:px-12 xl:px-16 pt-8 pb-16">
      <!-- Breadcrumb -->
      <nav class="text-sm text-muted mb-6">
        <router-link to="/" class="hover:text-accent">Training</router-link>
        <span class="mx-2">/</span>
        <span class="text-primary font-medium">{{ module.title }}</span>
      </nav>

      <!-- Module Header -->
      <div class="mb-8">
        <div class="flex items-center gap-4 mb-4">
          <span
            class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
            :style="{ backgroundColor: module.color }"
          >
            {{ module.id }}
          </span>
          <div>
            <h1 class="text-2xl font-extrabold text-primary">{{ module.title }}</h1>
            <p class="text-gray-600 text-sm">{{ module.description }}</p>
          </div>
        </div>
        <div class="flex items-center gap-4 mb-2">
          <span class="text-xs text-muted">{{ progress.completed }}/{{ progress.total }} completed</span>
          <span class="text-xs font-semibold text-accent">{{ progress.percent }}%</span>
        </div>
        <ProgressBar :percent="progress.percent" :color="module.color" />
      </div>

      <!-- Lessons & Exercises grid -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <!-- Lessons column -->
        <div>
          <h2 class="text-lg font-bold text-primary mb-4">Lessons</h2>
          <div class="space-y-2">
            <router-link
              v-for="lesson in module.lessons"
              :key="lesson.id"
              :to="{ name: 'lesson', params: { moduleId: module.id, lessonId: lesson.id } }"
              class="flex items-center gap-3 p-4 bg-white rounded-lg border border-border hover:border-accent hover:shadow-sm transition-all no-underline"
            >
              <span
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                :class="isLessonComplete(module.id, lesson.id) ? 'bg-success text-white' : 'bg-gray-100 text-gray-500'"
              >
                <template v-if="isLessonComplete(module.id, lesson.id)">&#10003;</template>
                <template v-else>{{ lesson.id }}</template>
              </span>
              <span class="text-sm font-medium text-gray-700">{{ lesson.title }}</span>
            </router-link>
          </div>
        </div>

        <!-- Exercises column -->
        <div v-if="module.exercises.length > 0">
          <h2 class="text-lg font-bold text-primary mb-4">Exercises</h2>
          <div class="space-y-2">
            <router-link
              v-for="exercise in module.exercises"
              :key="exercise.id"
              :to="{ name: 'exercise', params: { moduleId: module.id, exerciseId: exercise.id } }"
              class="flex items-center gap-3 p-4 bg-white rounded-lg border border-border hover:border-accent hover:shadow-sm transition-all no-underline"
            >
              <span
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                :class="isExerciseComplete(module.id, exercise.id) ? 'bg-success text-white' : 'bg-gray-100 text-gray-500'"
              >
                <template v-if="isExerciseComplete(module.id, exercise.id)">&#10003;</template>
                <template v-else>&#9997;</template>
              </span>
              <span class="text-sm font-medium text-gray-700 flex-1">{{ exercise.title }}</span>
              <span
                class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                :class="'badge-' + exercise.difficulty"
              >
                {{ exercise.difficulty }}
              </span>
            </router-link>
          </div>
        </div>
      </div>

      <ModuleCta :module-id="module.id" />
    </main>

    <!-- Module not found -->
    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <p class="text-gray-500">Module not found.</p>
        <router-link to="/" class="text-accent hover:underline text-sm mt-2 inline-block">Back to Training</router-link>
      </div>
    </div>
  </div>
</template>
