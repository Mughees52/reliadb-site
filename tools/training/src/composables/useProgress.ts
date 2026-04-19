import { ref, watch, readonly } from 'vue'
import type { UserProgress, ExerciseAttempt } from '../types'

const STORAGE_KEY = 'reliadb-training-progress'

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function defaultProgress(): UserProgress {
  return {
    completedLessons: {},
    completedExercises: {},
    currentModule: 1,
    currentLesson: '',
    streakDays: 0,
    lastActiveDate: '',
  }
}

function loadFromStorage(): UserProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...defaultProgress(), ...JSON.parse(stored) }
    }
  } catch {
    // ignore
  }
  return defaultProgress()
}

function saveToStorage(progress: UserProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // ignore storage full
  }
}

const progress = ref<UserProgress>(loadFromStorage())

// Auto-save on changes
watch(progress, (val) => saveToStorage(val), { deep: true })

export function useProgress() {
  function markLessonComplete(moduleId: number, lessonId: number) {
    const key = `m${moduleId}-l${lessonId}`
    progress.value.completedLessons[key] = true
    progress.value.currentModule = moduleId
    progress.value.currentLesson = key
    updateStreak()
  }

  function isLessonComplete(moduleId: number, lessonId: number): boolean {
    return !!progress.value.completedLessons[`m${moduleId}-l${lessonId}`]
  }

  function markExerciseAttempt(
    moduleId: number,
    exerciseId: number,
    passed: boolean,
    hintsUsed: number,
    showedSolution: boolean
  ) {
    const key = `m${moduleId}-e${exerciseId}`
    const existing = progress.value.completedExercises[key]

    if (existing) {
      existing.attempts++
      existing.hintsUsed = Math.max(existing.hintsUsed, hintsUsed)
      if (passed && !existing.completed) {
        existing.completed = true
        existing.completedAt = new Date().toISOString()
      }
      if (showedSolution) existing.showedSolution = true
    } else {
      progress.value.completedExercises[key] = {
        completed: passed,
        attempts: 1,
        hintsUsed,
        showedSolution,
        completedAt: passed ? new Date().toISOString() : undefined,
      }
    }
    updateStreak()
  }

  function isExerciseComplete(moduleId: number, exerciseId: number): boolean {
    const key = `m${moduleId}-e${exerciseId}`
    return !!progress.value.completedExercises[key]?.completed
  }

  function getExerciseAttempt(moduleId: number, exerciseId: number): ExerciseAttempt | null {
    const key = `m${moduleId}-e${exerciseId}`
    return progress.value.completedExercises[key] || null
  }

  function getModuleProgress(
    moduleId: number,
    totalLessons: number,
    totalExercises: number
  ): { completed: number; total: number; percent: number } {
    let completed = 0
    const total = totalLessons + totalExercises

    for (let i = 1; i <= totalLessons; i++) {
      if (isLessonComplete(moduleId, i)) completed++
    }
    for (let i = 1; i <= totalExercises; i++) {
      if (isExerciseComplete(moduleId, i)) completed++
    }

    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }

  function getOverallStats(
    modules: { id: number; lessonCount: number; exerciseCount: number }[]
  ) {
    let totalCompleted = 0
    let totalItems = 0

    for (const m of modules) {
      const mp = getModuleProgress(m.id, m.lessonCount, m.exerciseCount)
      totalCompleted += mp.completed
      totalItems += mp.total
    }

    return {
      completed: totalCompleted,
      total: totalItems,
      percent: totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0,
      streak: progress.value.streakDays,
    }
  }

  function updateStreak() {
    const today = getToday()
    const last = progress.value.lastActiveDate

    if (last === today) return

    if (last) {
      const lastDate = new Date(last)
      const todayDate = new Date(today)
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (diffDays === 1) {
        progress.value.streakDays++
      } else if (diffDays > 1) {
        progress.value.streakDays = 1
      }
    } else {
      progress.value.streakDays = 1
    }

    progress.value.lastActiveDate = today
  }

  function getResumePoint(): { moduleId: number; lessonKey: string } | null {
    if (progress.value.currentLesson) {
      return {
        moduleId: progress.value.currentModule,
        lessonKey: progress.value.currentLesson,
      }
    }
    return null
  }

  function resetProgress() {
    progress.value = defaultProgress()
  }

  return {
    progress: readonly(progress),
    markLessonComplete,
    isLessonComplete,
    markExerciseAttempt,
    isExerciseComplete,
    getExerciseAttempt,
    getModuleProgress,
    getOverallStats,
    updateStreak,
    getResumePoint,
    resetProgress,
  }
}
