<script setup lang="ts">
import { ref, computed } from 'vue'
import { parsePlan } from '../parsers/normalize'
import { analyze } from '../analysis/engine'
import type { ParseResult } from '../parsers/types'
import type { AnalysisResult } from '../analysis/types'
import { formatDuration, formatCost, formatNumber } from '../utils/formatting'

const props = defineProps<{
  beforeExplain: string
  beforeQuery?: string
}>()

const afterInput = ref('')
const afterResult = ref<ParseResult | null>(null)
const afterAnalysis = ref<AnalysisResult | null>(null)

const beforeResult = computed(() => {
  if (!props.beforeExplain) return null
  return parsePlan(props.beforeExplain)
})

const beforeAnalysis = computed(() => {
  if (!beforeResult.value || beforeResult.value.stats.nodeCount === 0) return null
  return analyze(beforeResult.value.root, beforeResult.value.stats, props.beforeQuery)
})

function analyzeAfter() {
  if (!afterInput.value.trim()) return
  const result = parsePlan(afterInput.value)
  afterResult.value = result
  if (result.stats.nodeCount > 0) {
    afterAnalysis.value = analyze(result.root, result.stats)
  }
}

function metricDiff(before: number, after: number): { label: string; cls: string } {
  if (before === 0 && after === 0) return { label: '—', cls: '' }
  if (before === 0) return { label: `+${after}`, cls: 'diff-worse' }
  const pct = ((after - before) / before) * 100
  if (Math.abs(pct) < 1) return { label: 'same', cls: 'diff-same' }
  const arrow = pct < 0 ? '↓' : '↑'
  const cls = pct < 0 ? 'diff-better' : 'diff-worse'
  return { label: `${arrow} ${Math.abs(pct).toFixed(0)}%`, cls }
}

const hasComparison = computed(() => beforeResult.value && afterResult.value && beforeAnalysis.value && afterAnalysis.value)
</script>

<template>
  <div class="card cv">
    <div class="cv-header">
      <h3 class="cv-title">Before / After Comparison</h3>
    </div>
    <div class="cv-body">
      <p class="cv-desc">Paste the EXPLAIN output after your optimization to compare.</p>

      <textarea
        v-model="afterInput"
        class="cv-input"
        rows="6"
        placeholder="Paste the optimized EXPLAIN ANALYZE output here..."
      ></textarea>

      <button @click="analyzeAfter" class="btn-tool cv-btn">Compare Plans</button>

      <div v-if="hasComparison" class="cv-table-wrap">
        <table class="cv-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Before</th>
              <th>After</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Score</td>
              <td>{{ beforeAnalysis!.summary.score }}</td>
              <td>{{ afterAnalysis!.summary.score }}</td>
              <td :class="metricDiff(100 - beforeAnalysis!.summary.score, 100 - afterAnalysis!.summary.score).cls">
                {{ metricDiff(100 - beforeAnalysis!.summary.score, 100 - afterAnalysis!.summary.score).label }}
              </td>
            </tr>
            <tr>
              <td>Total Cost</td>
              <td>{{ formatCost(beforeResult!.stats.totalCost) }}</td>
              <td>{{ formatCost(afterResult!.stats.totalCost) }}</td>
              <td :class="metricDiff(beforeResult!.stats.totalCost, afterResult!.stats.totalCost).cls">
                {{ metricDiff(beforeResult!.stats.totalCost, afterResult!.stats.totalCost).label }}
              </td>
            </tr>
            <tr v-if="beforeResult!.stats.totalTime != null && afterResult!.stats.totalTime != null">
              <td>Exec Time</td>
              <td>{{ formatDuration(beforeResult!.stats.totalTime!) }}</td>
              <td>{{ formatDuration(afterResult!.stats.totalTime!) }}</td>
              <td :class="metricDiff(beforeResult!.stats.totalTime!, afterResult!.stats.totalTime!).cls">
                {{ metricDiff(beforeResult!.stats.totalTime!, afterResult!.stats.totalTime!).label }}
              </td>
            </tr>
            <tr>
              <td>Total Rows</td>
              <td>{{ formatNumber(beforeResult!.stats.totalRows) }}</td>
              <td>{{ formatNumber(afterResult!.stats.totalRows) }}</td>
              <td :class="metricDiff(beforeResult!.stats.totalRows, afterResult!.stats.totalRows).cls">
                {{ metricDiff(beforeResult!.stats.totalRows, afterResult!.stats.totalRows).label }}
              </td>
            </tr>
            <tr>
              <td>Critical Issues</td>
              <td>{{ beforeAnalysis!.summary.critical }}</td>
              <td>{{ afterAnalysis!.summary.critical }}</td>
              <td :class="metricDiff(beforeAnalysis!.summary.critical, afterAnalysis!.summary.critical).cls">
                {{ metricDiff(beforeAnalysis!.summary.critical, afterAnalysis!.summary.critical).label }}
              </td>
            </tr>
            <tr>
              <td>Warnings</td>
              <td>{{ beforeAnalysis!.summary.warnings }}</td>
              <td>{{ afterAnalysis!.summary.warnings }}</td>
              <td :class="metricDiff(beforeAnalysis!.summary.warnings, afterAnalysis!.summary.warnings).cls">
                {{ metricDiff(beforeAnalysis!.summary.warnings, afterAnalysis!.summary.warnings).label }}
              </td>
            </tr>
            <tr>
              <td>Tables Scanned</td>
              <td>{{ beforeResult!.stats.hasFullScan ? 'Yes' : 'No' }}</td>
              <td>{{ afterResult!.stats.hasFullScan ? 'Yes' : 'No' }}</td>
              <td :class="!afterResult!.stats.hasFullScan && beforeResult!.stats.hasFullScan ? 'diff-better' : afterResult!.stats.hasFullScan && !beforeResult!.stats.hasFullScan ? 'diff-worse' : 'diff-same'">
                {{ !afterResult!.stats.hasFullScan && beforeResult!.stats.hasFullScan ? '✓ Fixed' : afterResult!.stats.hasFullScan && !beforeResult!.stats.hasFullScan ? '✗ Regressed' : '—' }}
              </td>
            </tr>
            <tr>
              <td>Filesort</td>
              <td>{{ beforeResult!.stats.hasFilesort ? 'Yes' : 'No' }}</td>
              <td>{{ afterResult!.stats.hasFilesort ? 'Yes' : 'No' }}</td>
              <td :class="!afterResult!.stats.hasFilesort && beforeResult!.stats.hasFilesort ? 'diff-better' : 'diff-same'">
                {{ !afterResult!.stats.hasFilesort && beforeResult!.stats.hasFilesort ? '✓ Fixed' : '—' }}
              </td>
            </tr>
            <tr>
              <td>Temp Table</td>
              <td>{{ beforeResult!.stats.hasTempTable ? 'Yes' : 'No' }}</td>
              <td>{{ afterResult!.stats.hasTempTable ? 'Yes' : 'No' }}</td>
              <td :class="!afterResult!.stats.hasTempTable && beforeResult!.stats.hasTempTable ? 'diff-better' : 'diff-same'">
                {{ !afterResult!.stats.hasTempTable && beforeResult!.stats.hasTempTable ? '✓ Fixed' : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cv-header { padding: 12px 16px; border-bottom: 1px solid var(--border); }
.cv-title { font-size: 0.85rem; font-weight: 700; color: var(--primary); margin: 0; }
.cv-body { padding: 16px; }
.cv-desc { font-size: 0.82rem; color: var(--text-lt); margin-bottom: 10px; }
.cv-input { width: 100%; padding: 10px; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; border: 1px solid var(--border); border-radius: 6px; resize: vertical; background: var(--bg-alt); color: var(--text); }
.cv-input:focus { outline: none; border-color: var(--accent); }
.cv-btn { margin-top: 10px; }
.cv-table-wrap { margin-top: 16px; overflow-x: auto; }
.cv-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.cv-table th { text-align: left; padding: 8px 10px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--text-lt); background: var(--bg-alt); border-bottom: 1px solid var(--border); }
.cv-table td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; color: var(--text); }
.cv-table th:nth-child(2), .cv-table th:nth-child(3), .cv-table th:nth-child(4),
.cv-table td:nth-child(2), .cv-table td:nth-child(3), .cv-table td:nth-child(4) { text-align: center; }
.diff-better { color: #27AE60; font-weight: 700; }
.diff-worse { color: #E74C3C; font-weight: 700; }
.diff-same { color: var(--text-lt); }
</style>
