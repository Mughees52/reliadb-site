<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { modules } from '../data/modules'
import { useProgress } from '../composables/useProgress'
import TrainingNav from '../components/layout/TrainingNav.vue'
import LessonContent from '../components/lesson/LessonContent.vue'
import Exercise from '../components/lesson/Exercise.vue'
import ModuleCta from '../components/layout/ModuleCta.vue'

const props = defineProps<{
  moduleId: string | number
  lessonId?: string | number
  exerciseId?: string | number
  isExercise?: boolean
}>()

const route = useRoute()
const { markLessonComplete } = useProgress()

const module = computed(() => {
  const id = Number(props.moduleId)
  return modules.find((m) => m.id === id) || null
})

const lesson = computed(() => {
  if (!module.value || props.isExercise) return null
  const id = Number(props.lessonId)
  return module.value.lessons.find((l) => l.id === id) || null
})

const exercise = computed(() => {
  if (!module.value || !props.isExercise) return null
  const id = Number(props.exerciseId)
  return module.value.exercises.find((e) => e.id === id) || null
})

const prevLink = computed(() => {
  if (!module.value || !lesson.value) return null
  const idx = module.value.lessons.findIndex((l) => l.id === lesson.value!.id)
  if (idx > 0) {
    return { name: 'lesson', params: { moduleId: module.value.id, lessonId: module.value.lessons[idx - 1].id } }
  }
  return null
})

const nextLink = computed(() => {
  if (!module.value || !lesson.value) return null
  const idx = module.value.lessons.findIndex((l) => l.id === lesson.value!.id)
  if (idx < module.value.lessons.length - 1) {
    return { name: 'lesson', params: { moduleId: module.value.id, lessonId: module.value.lessons[idx + 1].id } }
  }
  if (module.value.exercises.length > 0) {
    return { name: 'exercise', params: { moduleId: module.value.id, exerciseId: module.value.exercises[0].id } }
  }
  return null
})

function markComplete() {
  if (lesson.value && module.value) {
    markLessonComplete(module.value.id, lesson.value.id)
  }
}

onMounted(markComplete)
watch(() => route.fullPath, markComplete)
</script>

<template>
  <div class="flex min-h-[calc(100vh-72px)]">
    <!-- Sidebar navigation -->
    <TrainingNav />

    <!-- Main content -->
    <main class="flex-1 min-w-0 px-6 lg:px-12 xl:px-16 pt-8 pb-16">
      <!-- Breadcrumb -->
      <nav class="text-sm text-muted mb-6 flex items-center gap-1 flex-wrap">
        <router-link to="/" class="hover:text-accent">Training</router-link>
        <span class="mx-1 text-gray-300">/</span>
        <router-link
          v-if="module"
          :to="{ name: 'module', params: { moduleId: module.id } }"
          class="hover:text-accent"
        >
          {{ module.title }}
        </router-link>
        <span class="mx-1 text-gray-300">/</span>
        <span class="text-primary font-medium">
          {{ lesson?.title || exercise?.title || 'Not found' }}
        </span>
      </nav>

      <!-- Lesson View -->
      <div v-if="lesson">
        <h1 class="text-2xl font-extrabold text-primary mb-6">{{ lesson.title }}</h1>
        <LessonContent :blocks="lesson.content" />

        <!-- Navigation -->
        <div class="flex items-center justify-between mt-10 pt-6 border-t border-border">
          <router-link
            v-if="prevLink"
            :to="prevLink"
            class="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            &larr; Previous
          </router-link>
          <span v-else></span>
          <router-link
            v-if="nextLink"
            :to="nextLink"
            class="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
          >
            Next &rarr;
          </router-link>
          <router-link
            v-else-if="module"
            :to="{ name: 'module', params: { moduleId: module.id } }"
            class="px-4 py-2 bg-success text-white text-sm font-medium rounded-lg hover:bg-success/90 transition-colors"
          >
            Module Complete &#10003;
          </router-link>
        </div>

        <ModuleCta v-if="!nextLink && module" :module-id="module.id" />
      </div>

      <!-- Exercise View -->
      <div v-else-if="exercise">
        <Exercise :exercise="exercise" />

        <div class="mt-6">
          <router-link
            v-if="module"
            :to="{ name: 'module', params: { moduleId: module.id } }"
            class="text-sm text-accent hover:underline"
          >
            &larr; Back to {{ module.title }}
          </router-link>
        </div>
      </div>

      <!-- Not found -->
      <div v-else class="text-center mt-16">
        <p class="text-gray-500">Content not found.</p>
        <router-link to="/" class="text-accent hover:underline text-sm mt-2 inline-block">Back to Training</router-link>
      </div>
    </main>
  </div>
</template>
