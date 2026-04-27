<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { modules } from '../../data/modules'
import { useProgress } from '../../composables/useProgress'

const route = useRoute()
const { isLessonComplete, isExerciseComplete } = useProgress()

const isOpen = ref(false)

const currentModuleId = computed(() => Number(route.params.moduleId) || 0)
const currentLessonId = computed(() => Number(route.params.lessonId) || 0)
const currentExerciseId = computed(() => Number(route.params.exerciseId) || 0)
const isExerciseRoute = computed(() => route.name === 'exercise')

// Which modules are expanded in the sidebar
const expandedModules = ref<Set<number>>(new Set([currentModuleId.value]))

// Auto-expand current module on route change
watch(currentModuleId, (id) => {
  if (id) expandedModules.value.add(id)
})

function toggleModule(id: number) {
  if (expandedModules.value.has(id)) {
    expandedModules.value.delete(id)
  } else {
    expandedModules.value.add(id)
  }
}

function isActiveLesson(moduleId: number, lessonId: number) {
  return currentModuleId.value === moduleId && currentLessonId.value === lessonId && !isExerciseRoute.value
}

function isActiveExercise(moduleId: number, exerciseId: number) {
  return currentModuleId.value === moduleId && currentExerciseId.value === exerciseId && isExerciseRoute.value
}

// Close sidebar on mobile when navigating
watch(() => route.fullPath, () => {
  if (window.innerWidth < 1024) isOpen.value = false
})
</script>

<template>
  <!-- Mobile toggle button -->
  <button
    class="lg:hidden fixed bottom-4 left-4 z-50 w-12 h-12 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
    @click="isOpen = !isOpen"
    :aria-label="isOpen ? 'Close navigation' : 'Open navigation'"
  >
    <svg v-if="!isOpen" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
    <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
  </button>

  <!-- Overlay (mobile) -->
  <div
    v-if="isOpen"
    class="lg:hidden fixed inset-0 bg-black/30 z-40"
    @click="isOpen = false"
  ></div>

  <!-- Sidebar -->
  <aside
    :class="[
      'training-sidebar bg-white border-r border-gray-200 overflow-y-auto z-40',
      'lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)] lg:block',
      isOpen ? 'fixed inset-y-0 left-0 w-72 shadow-2xl block' : 'hidden lg:block'
    ]"
    style="min-width: 260px; max-width: 280px;"
  >
    <div class="p-4">
      <!-- Header -->
      <router-link to="/" class="flex items-center gap-2 mb-4 text-primary font-bold text-sm no-underline hover:text-accent">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        All Modules
      </router-link>

      <!-- Module list -->
      <nav class="space-y-1">
        <div v-for="mod in modules" :key="mod.id">
          <!-- Module header -->
          <button
            @click="toggleModule(mod.id)"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors text-sm"
            :class="currentModuleId === mod.id ? 'bg-accent/10 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50'"
          >
            <span
              class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 text-white"
              :style="{ backgroundColor: mod.color }"
            >
              {{ mod.id }}
            </span>
            <span class="flex-1 truncate text-xs font-semibold">{{ mod.title }}</span>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="shrink-0 transition-transform duration-200"
              :class="expandedModules.has(mod.id) ? 'rotate-90' : ''"
            ><path d="M9 18l6-6-6-6"/></svg>
          </button>

          <!-- Expanded lessons/exercises -->
          <div v-if="expandedModules.has(mod.id)" class="ml-4 mt-1 mb-2 space-y-0.5">
            <!-- Lessons -->
            <router-link
              v-for="lesson in mod.lessons"
              :key="'l' + lesson.id"
              :to="{ name: 'lesson', params: { moduleId: mod.id, lessonId: lesson.id } }"
              class="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs no-underline transition-colors"
              :class="isActiveLesson(mod.id, lesson.id)
                ? 'bg-accent text-white font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
            >
              <span
                class="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[8px]"
                :class="isLessonComplete(mod.id, lesson.id)
                  ? 'bg-success text-white'
                  : isActiveLesson(mod.id, lesson.id) ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-500'"
              >
                <template v-if="isLessonComplete(mod.id, lesson.id)">&#10003;</template>
              </span>
              <span class="truncate">{{ lesson.title }}</span>
            </router-link>

            <!-- Exercises separator -->
            <div v-if="mod.exercises.length > 0" class="pt-1 mt-1 border-t border-gray-100">
              <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Exercises</div>
            </div>
            <router-link
              v-for="ex in mod.exercises"
              :key="'e' + ex.id"
              :to="{ name: 'exercise', params: { moduleId: mod.id, exerciseId: ex.id } }"
              class="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs no-underline transition-colors"
              :class="isActiveExercise(mod.id, ex.id)
                ? 'bg-accent text-white font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
            >
              <span
                class="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[8px]"
                :class="isExerciseComplete(mod.id, ex.id)
                  ? 'bg-success text-white'
                  : isActiveExercise(mod.id, ex.id) ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-500'"
              >
                <template v-if="isExerciseComplete(mod.id, ex.id)">&#10003;</template>
              </span>
              <span class="truncate">{{ ex.title }}</span>
              <span
                class="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                :class="isActiveExercise(mod.id, ex.id) ? 'bg-white/20 text-white' : 'badge-' + ex.difficulty"
              >{{ ex.difficulty }}</span>
            </router-link>
          </div>
        </div>
      </nav>
    </div>
  </aside>
</template>
