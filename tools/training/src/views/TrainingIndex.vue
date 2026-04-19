<script setup lang="ts">
import { computed } from 'vue'
import { modules } from '../data/modules'
import ModuleCard from '../components/layout/ModuleCard.vue'
import StreakCounter from '../components/progress/StreakCounter.vue'
import { useProgress } from '../composables/useProgress'

const { getOverallStats, getResumePoint } = useProgress()

const stats = computed(() =>
  getOverallStats(
    modules.map((m) => ({
      id: m.id,
      lessonCount: m.lessons.length,
      exerciseCount: m.exercises.length,
    }))
  )
)

const resumePoint = computed(() => getResumePoint())

const totalLessons = computed(() => modules.reduce((sum, m) => sum + m.lessons.length, 0))
const totalExercises = computed(() => modules.reduce((sum, m) => sum + m.exercises.length, 0))
</script>

<template>
  <div class="max-w-container mx-auto px-6 pt-8 pb-16">
    <!-- Hero -->
    <div class="text-center mb-10">
      <h1 class="text-3xl md:text-4xl font-extrabold text-primary mb-3">
        Learn MySQL
      </h1>
      <p class="text-lg text-gray-600 max-w-2xl mx-auto mb-4">
        Free interactive training with a live SQL sandbox. Write real queries, see animated visualizations, and master MySQL from foundations to performance optimization.
      </p>
      <div class="flex items-center justify-center gap-6 text-sm text-muted">
        <span><strong class="text-primary">{{ modules.length }}</strong> Modules</span>
        <span><strong class="text-primary">{{ totalLessons }}</strong> Lessons</span>
        <span><strong class="text-primary">{{ totalExercises }}</strong> Exercises</span>
        <span class="text-success font-semibold">100% Free</span>
      </div>
    </div>

    <!-- Progress / Resume -->
    <div v-if="stats.percent > 0" class="bg-bg-alt rounded-xl border border-border p-5 mb-8">
      <div class="flex items-center justify-between mb-3">
        <div>
          <p class="text-sm text-gray-600">
            Your progress: <strong class="text-primary">{{ stats.percent }}%</strong> complete
            ({{ stats.completed }}/{{ stats.total }})
          </p>
        </div>
        <StreakCounter />
      </div>
      <div class="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div
          class="progress-fill h-full bg-accent rounded-full"
          :style="{ width: stats.percent + '%' }"
        ></div>
      </div>
      <router-link
        v-if="resumePoint"
        :to="{ name: 'module', params: { moduleId: resumePoint.moduleId } }"
        class="inline-block text-sm font-semibold text-accent hover:underline"
      >
        Resume where you left off &rarr;
      </router-link>
    </div>

    <!-- Module Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ModuleCard v-for="mod in modules" :key="mod.id" :module="mod" />
    </div>

    <!-- CTA -->
    <div class="text-center mt-12 bg-primary/5 rounded-xl border border-primary/20 p-8">
      <h2 class="text-xl font-bold text-primary mb-2">Need expert MySQL help?</h2>
      <p class="text-gray-600 text-sm mb-4">ReliaDB provides MySQL consulting — audits, optimization, and ongoing support for production databases.</p>
      <a href="/contact.html" class="inline-block px-6 py-2.5 bg-cta text-white font-semibold rounded-lg hover:bg-cta-dark transition-colors">
        Book Free Assessment
      </a>
    </div>
  </div>
</template>
