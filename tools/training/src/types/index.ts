export interface Module {
  id: number
  title: string
  slug: string
  description: string
  icon: string
  color: string
  lessons: Lesson[]
  exercises: Exercise[]
}

export interface Lesson {
  id: number
  moduleId: number
  title: string
  slug: string
  content: LessonBlock[]
  nextLessonId?: number
  prevLessonId?: number
}

export type LessonBlock =
  | TextBlock
  | CodeBlock
  | AnimationBlock
  | SandboxBlock
  | CalloutBlock
  | ComparisonBlock

export interface TextBlock {
  type: 'text'
  html: string
}

export interface CodeBlock {
  type: 'code'
  sql: string
  title?: string
}

export interface AnimationBlock {
  type: 'animation'
  animation: string
  props?: Record<string, unknown>
}

export interface SandboxBlock {
  type: 'sandbox'
  description?: string
  defaultQuery?: string
}

export interface CalloutBlock {
  type: 'callout'
  calloutType: 'info' | 'warning' | 'tip' | 'mysql'
  html: string
}

export interface ComparisonBlock {
  type: 'comparison'
  left: { title: string; content: string }
  right: { title: string; content: string }
}

export interface Exercise {
  id: number
  moduleId: number
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  starterQuery?: string
  expectedQuery: string
  expectedResult: ExpectedResult
  hints: string[]
  validationMode: 'exact' | 'unordered' | 'contains'
  setupSql?: string
  teardownSql?: string
}

export interface ExpectedResult {
  columns: string[]
  values: unknown[][]
}

export interface QueryResult {
  columns: string[]
  values: unknown[][]
}

export interface QueryError {
  error: string
}

export type QueryOutput = QueryResult | QueryError

export function isQueryError(result: QueryOutput): result is QueryError {
  return 'error' in result
}

export interface UserProgress {
  completedLessons: Record<string, boolean>
  completedExercises: Record<string, ExerciseAttempt>
  currentModule: number
  currentLesson: string
  streakDays: number
  lastActiveDate: string
}

export interface ExerciseAttempt {
  completed: boolean
  attempts: number
  hintsUsed: number
  showedSolution: boolean
  completedAt?: string
}
