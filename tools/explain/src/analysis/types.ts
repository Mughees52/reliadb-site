import type { PlanNode } from '../parsers/types'

export type Severity = 'critical' | 'warning' | 'info' | 'good'
export type IssueCategory = 'scan' | 'sort' | 'join' | 'subquery' | 'index' | 'estimate' | 'general'

export interface Issue {
  id: string
  severity: Severity
  category: IssueCategory
  title: string
  description: string
  nodeId: string
  nodeName: string
  recommendation: string
  ddl?: string
  docLink?: string
  impact?: string
}

export interface QueryHint {
  title: string
  description: string
  pattern: string
  suggestion: string
  docLink?: string
}

export interface IndexRecommendation {
  table: string
  columns: string[]
  reason: string
  impact: 'high' | 'medium' | 'low'
  ddl: string
}

export interface AnalysisResult {
  issues: Issue[]
  indexRecommendations: IndexRecommendation[]
  queryHints: QueryHint[]
  summary: {
    critical: number
    warnings: number
    info: number
    good: number
    score: number // 0-100 performance score
  }
}

export interface AnalysisContext {
  root: PlanNode
  query?: string
  ddl?: string
}
