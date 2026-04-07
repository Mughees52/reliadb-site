<script setup lang="ts">
import type { PlanStats, ExplainFormat, DatabaseEngine } from '../parsers/types'
import type { AnalysisResult } from '../analysis/types'
import { formatDuration, formatNumber, formatCost } from '../utils/formatting'

defineProps<{
  stats: PlanStats
  summary: AnalysisResult['summary']
  format: ExplainFormat
  engine: DatabaseEngine
}>()

function scoreColor(score: number): string {
  if (score >= 80) return 'score-good'
  if (score >= 50) return 'score-warning'
  return 'score-critical'
}
</script>

<template>
  <div class="card stats-bar">
    <div class="stats-grid">
      <!-- Score -->
      <div class="stat-item">
        <div class="score-badge" :class="scoreColor(summary.score)">
          <span class="score-num">{{ summary.score }}</span>
        </div>
        <div>
          <div class="stat-label">Score</div>
          <div class="stat-value">/100</div>
        </div>
      </div>

      <!-- Total Cost -->
      <div class="stat-item">
        <div class="stat-label">Total Cost</div>
        <div class="stat-value-lg">{{ formatCost(stats.totalCost) }}</div>
      </div>

      <!-- Exec Time -->
      <div v-if="stats.totalTime != null" class="stat-item">
        <div class="stat-label">Exec Time</div>
        <div class="stat-value-lg">{{ formatDuration(stats.totalTime) }}</div>
      </div>

      <!-- Tables -->
      <div class="stat-item">
        <div class="stat-label">Tables</div>
        <div class="stat-value-lg">{{ stats.tablesAccessed.length }}</div>
      </div>

      <!-- Issues -->
      <div class="stat-item">
        <div class="stat-label">Issues</div>
        <div class="stat-badges">
          <span v-if="summary.critical" class="badge-critical">{{ summary.critical }}</span>
          <span v-if="summary.warnings" class="badge-warning">{{ summary.warnings }}</span>
          <span v-if="summary.good" class="badge-good">{{ summary.good }}</span>
          <span v-if="!summary.critical && !summary.warnings && !summary.good" class="stat-value">None</span>
        </div>
      </div>

      <!-- Format -->
      <div class="stat-item stat-hide-mobile">
        <div class="stat-label">Format</div>
        <div class="stat-value">{{ engine !== 'unknown' ? engine.charAt(0).toUpperCase() + engine.slice(1) + ' / ' : '' }}{{ format }}</div>
      </div>

      <!-- Nodes -->
      <div class="stat-item stat-hide-mobile">
        <div class="stat-label">Nodes</div>
        <div class="stat-value-lg">{{ stats.nodeCount }}</div>
      </div>
    </div>

    <!-- Warning flags -->
    <div v-if="stats.hasFullScan || stats.hasFilesort || stats.hasTempTable" class="stats-flags">
      <span v-if="stats.hasFullScan" class="badge-critical">Full Table Scan</span>
      <span v-if="stats.hasFilesort" class="badge-warning">Filesort</span>
      <span v-if="stats.hasTempTable" class="badge-warning">Temporary Table</span>
    </div>
  </div>
</template>

<style scoped>
.stats-bar { padding: 16px 20px; }
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 16px;
  align-items: center;
}
.stat-item { display: flex; flex-direction: column; gap: 2px; }
.stat-item:first-child { flex-direction: row; align-items: center; gap: 10px; }
.stat-label { font-size: 0.72rem; color: var(--text-lt, #777); text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em; }
.stat-value { font-size: 0.88rem; font-weight: 600; color: var(--text, #444); }
.stat-value-lg { font-size: 1.15rem; font-weight: 700; color: var(--primary, #1A5276); }
.stat-badges { display: flex; gap: 4px; margin-top: 2px; }
.score-badge { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.score-num { font-size: 1.1rem; font-weight: 800; }
.score-good { background: #d5f5e3; color: #1e8449; }
.score-warning { background: #fdebd0; color: #ca6f1e; }
.score-critical { background: #fadbd8; color: #c0392b; }
.stats-flags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border, #DDE3E9); }
@media (max-width: 640px) {
  .stat-hide-mobile { display: none; }
}
</style>
