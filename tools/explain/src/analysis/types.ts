import type { PlanNode } from '../parsers/types'
import type { PlanNarrative } from './narrative'

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
  simulatedImpact?: IndexImpact
}

export interface IndexImpact {
  recommendation: IndexRecommendation
  changes: ImpactChange[]
  summary: string
}

export interface ImpactChange {
  type: 'access_type' | 'rows' | 'covering' | 'filesort' | 'temp_table' | 'join_order'
  icon: string
  before: string
  after: string
  explanation: string
}

export interface QueryRewrite {
  title: string
  description: string
  original: string
  rewritten: string
  reason: string
}

export interface SchemaIssue {
  table: string
  column: string
  issue: string
  ddl: string
}

export interface AnalysisResult {
  issues: Issue[]
  indexRecommendations: IndexRecommendation[]
  queryHints: QueryHint[]
  queryRewrites: QueryRewrite[]
  schemaIssues: SchemaIssue[]
  narrative: PlanNarrative
  summary: {
    critical: number
    warnings: number
    info: number
    good: number
    score: number
  }
}

export interface AnalysisContext {
  root: PlanNode
  query?: string
  ddl?: string
}
