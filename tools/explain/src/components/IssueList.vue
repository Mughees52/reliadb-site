<script setup lang="ts">
import { ref } from 'vue'
import type { AnalysisResult, Issue } from '../analysis/types'

defineProps<{
  analysis: AnalysisResult
}>()

const activeTab = ref<'issues' | 'indexes' | 'hints' | 'rewrites' | 'schema'>('issues')
const copiedDDL = ref('')
const expandedImpact = ref<Set<number>>(new Set())

function toggleImpact(index: number) {
  const s = new Set(expandedImpact.value)
  if (s.has(index)) s.delete(index)
  else s.add(index)
  expandedImpact.value = s
}

function severityDot(s: Issue['severity']): string {
  return `dot-${s}`
}

function impactClass(impact: string): string {
  if (impact === 'high') return 'badge-critical'
  if (impact === 'medium') return 'badge-warning'
  return 'badge-info'
}

function copyDDL(ddl: string) {
  navigator.clipboard.writeText(ddl).then(() => {
    copiedDDL.value = ddl
    setTimeout(() => { copiedDDL.value = '' }, 2000)
  })
}
</script>

<template>
  <div class="card issue-list">
    <!-- Tabs -->
    <div class="il-tabs">
      <button @click="activeTab = 'issues'" :class="activeTab === 'issues' ? 'tab-active' : 'tab-inactive'" class="il-tab">
        Issues <span class="il-count">({{ analysis.issues.length }})</span>
      </button>
      <button @click="activeTab = 'indexes'" :class="activeTab === 'indexes' ? 'tab-active' : 'tab-inactive'" class="il-tab">
        Indexes <span class="il-count">({{ analysis.indexRecommendations.length }})</span>
      </button>
      <button v-if="analysis.queryHints.length" @click="activeTab = 'hints'" :class="activeTab === 'hints' ? 'tab-active' : 'tab-inactive'" class="il-tab">
        Hints <span class="il-count">({{ analysis.queryHints.length }})</span>
      </button>
      <button v-if="analysis.queryRewrites.length" @click="activeTab = 'rewrites'" :class="activeTab === 'rewrites' ? 'tab-active' : 'tab-inactive'" class="il-tab">
        Rewrites <span class="il-count">({{ analysis.queryRewrites.length }})</span>
      </button>
      <button v-if="analysis.schemaIssues.length" @click="activeTab = 'schema'" :class="activeTab === 'schema' ? 'tab-active' : 'tab-inactive'" class="il-tab">
        Schema <span class="il-count">({{ analysis.schemaIssues.length }})</span>
      </button>
    </div>

    <!-- Issues Tab -->
    <div v-show="activeTab === 'issues'" class="il-body">
      <div v-if="analysis.issues.length === 0" class="il-empty">No issues detected &mdash; your plan looks clean.</div>
      <div v-for="issue in analysis.issues" :key="issue.id" class="il-item">
        <div class="il-item-header">
          <span class="il-dot" :class="severityDot(issue.severity)"></span>
          <div class="il-item-content">
            <div class="il-item-title-row">
              <span class="il-item-title">{{ issue.title }}</span>
              <span :class="'badge-' + issue.severity" class="il-badge-sev">{{ issue.severity }}</span>
            </div>
            <p class="il-item-desc">{{ issue.description }}</p>

            <div class="il-rec">
              <div class="il-rec-label">Recommendation</div>
              <p class="il-rec-text">{{ issue.recommendation }}</p>
            </div>

            <div v-if="issue.ddl" class="il-ddl-wrap">
              <code class="il-ddl">{{ issue.ddl }}</code>
              <button @click="copyDDL(issue.ddl!)" class="il-copy">{{ copiedDDL === issue.ddl ? 'Copied!' : 'Copy' }}</button>
            </div>

            <p v-if="issue.impact" class="il-impact">{{ issue.impact }}</p>

            <a v-if="issue.docLink" :href="issue.docLink" target="_blank" rel="noopener" class="il-link">
              MySQL Docs &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Index Recommendations Tab -->
    <div v-show="activeTab === 'indexes'" class="il-body">
      <div v-if="analysis.indexRecommendations.length === 0" class="il-empty">No index recommendations.</div>
      <div v-for="(rec, i) in analysis.indexRecommendations" :key="i" class="il-item">
        <div class="il-item-title-row">
          <span class="il-item-title">{{ rec.table }}</span>
          <span :class="impactClass(rec.impact)" class="il-badge-sev">{{ rec.impact }} impact</span>
        </div>
        <p class="il-item-desc">{{ rec.reason }}</p>
        <div class="il-ddl-wrap">
          <code class="il-ddl">{{ rec.ddl }}</code>
          <button @click="copyDDL(rec.ddl)" class="il-copy">{{ copiedDDL === rec.ddl ? 'Copied!' : 'Copy' }}</button>
        </div>

        <!-- Impact Simulator -->
        <div v-if="rec.simulatedImpact && rec.simulatedImpact.changes.length > 0" class="il-impact-section">
          <button @click="toggleImpact(i)" class="il-impact-toggle">
            <span class="il-impact-toggle-icon">{{ expandedImpact.has(i) ? '▾' : '▸' }}</span>
            <span class="il-impact-toggle-label">Estimated Impact</span>
            <span class="il-impact-summary">{{ rec.simulatedImpact.summary }}</span>
          </button>
          <div v-if="expandedImpact.has(i)" class="il-impact-panel">
            <div v-for="(change, ci) in rec.simulatedImpact.changes" :key="ci" class="il-impact-change">
              <div class="il-impact-change-header">
                <span class="il-impact-icon">{{ change.icon }}</span>
                <div class="il-impact-before-after">
                  <span class="il-impact-before">{{ change.before }}</span>
                  <span class="il-impact-arrow">→</span>
                  <span class="il-impact-after">{{ change.after }}</span>
                </div>
              </div>
              <p class="il-impact-explanation">{{ change.explanation }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Query Hints Tab -->
    <div v-show="activeTab === 'hints'" class="il-body">
      <div v-for="(hint, i) in analysis.queryHints" :key="i" class="il-item">
        <div class="il-item-title">{{ hint.title }}</div>
        <p class="il-item-desc">{{ hint.description }}</p>
        <div class="il-rec">
          <p class="il-rec-text">{{ hint.suggestion }}</p>
        </div>
        <a v-if="hint.docLink" :href="hint.docLink" target="_blank" rel="noopener" class="il-link">MySQL Docs &rarr;</a>
      </div>
    </div>

    <!-- Query Rewrites Tab -->
    <div v-show="activeTab === 'rewrites'" class="il-body">
      <div v-for="(rw, i) in analysis.queryRewrites" :key="i" class="il-item">
        <div class="il-item-title">{{ rw.title }}</div>
        <p class="il-item-desc">{{ rw.description }}</p>
        <div class="il-rewrite-section">
          <div class="il-rewrite-label">Original:</div>
          <code class="il-ddl il-rewrite-code">{{ rw.original }}</code>
        </div>
        <div class="il-rewrite-section">
          <div class="il-rewrite-label il-rewrite-label-new">Rewrite:</div>
          <div class="il-ddl-wrap">
            <code class="il-ddl il-rewrite-new">{{ rw.rewritten }}</code>
            <button @click="copyDDL(rw.rewritten)" class="il-copy">{{ copiedDDL === rw.rewritten ? 'Copied!' : 'Copy' }}</button>
          </div>
        </div>
        <p class="il-impact">{{ rw.reason }}</p>
      </div>
    </div>

    <!-- Schema Issues Tab -->
    <div v-show="activeTab === 'schema'" class="il-body">
      <div v-for="(si, i) in analysis.schemaIssues" :key="i" class="il-item">
        <div class="il-item-title-row">
          <span class="il-item-title">{{ si.table }}.{{ si.column }}</span>
          <span class="badge-warning" style="font-size:0.65rem;text-transform:uppercase">nullable</span>
        </div>
        <p class="il-item-desc">{{ si.issue }}</p>
        <div class="il-ddl-wrap">
          <code class="il-ddl">{{ si.ddl }}</code>
          <button @click="copyDDL(si.ddl)" class="il-copy">{{ copiedDDL === si.ddl ? 'Copied!' : 'Copy' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.il-tabs { display: flex; background: var(--bg-alt); border-bottom: 1px solid var(--border); }
.il-tab { padding: 10px 16px; font-size: 0.82rem; font-weight: 600; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; cursor: pointer; color: var(--text-lt); font-family: inherit; transition: all 0.15s; }
.il-tab:hover { color: var(--primary); }
.il-tab.tab-active { color: var(--primary); border-bottom-color: var(--primary); background: #fff; }
.il-count { opacity: 0.6; font-size: 0.75rem; }
.il-body { max-height: 600px; overflow-y: auto; }
.il-empty { padding: 32px; text-align: center; color: var(--text-lt); font-size: 0.85rem; }
.il-item { padding: 14px 16px; border-bottom: 1px solid #f0f0f0; }
.il-item:last-child { border-bottom: none; }
.il-item-header { display: flex; gap: 10px; align-items: flex-start; }
.il-dot { width: 9px; height: 9px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
.dot-critical { background: #E74C3C; }
.dot-warning { background: #E67E22; }
.dot-info { background: #3498DB; }
.dot-good { background: #27AE60; }
.il-item-content { flex: 1; min-width: 0; }
.il-item-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.il-item-title { font-size: 0.85rem; font-weight: 700; color: var(--primary); }
.il-badge-sev { font-size: 0.65rem; text-transform: uppercase; }
.il-item-desc { font-size: 0.78rem; color: var(--text-lt); margin-top: 4px; }
.il-rec { margin-top: 8px; padding: 8px 12px; background: #ebf5fb; border: 1px solid #aed6f1; border-radius: 6px; }
.il-rec-label { font-size: 0.72rem; font-weight: 700; color: #2471a3; margin-bottom: 2px; }
.il-rec-text { font-size: 0.78rem; color: #2471a3; margin: 0; }
.il-ddl-wrap { display: flex; align-items: flex-start; gap: 8px; margin-top: 8px; }
.il-ddl { display: block; flex: 1; font-size: 0.75rem; background: #1a1a2e; color: #27ae60; padding: 8px 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; overflow-x: auto; white-space: pre; }
.il-copy { font-size: 0.72rem; color: var(--text-lt); cursor: pointer; background: none; border: none; font-family: inherit; white-space: nowrap; flex-shrink: 0; padding: 8px 0; }
.il-copy:hover { color: var(--accent); }
.il-impact { font-size: 0.75rem; color: var(--text-lt); font-style: italic; margin-top: 6px; }
.il-link { font-size: 0.75rem; color: var(--accent); display: inline-block; margin-top: 4px; }
.il-link:hover { text-decoration: underline; }
.il-rewrite-section { margin-top: 8px; }
.il-rewrite-label { font-size: 0.7rem; font-weight: 700; color: var(--text-lt); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em; }
.il-rewrite-label-new { color: #1e8449; }
.il-rewrite-code { max-height: 80px; font-size: 0.72rem; background: #f4f6f8; color: var(--text); white-space: pre-wrap; word-break: break-all; }
.il-rewrite-new { background: #1a1a2e; color: #27ae60; white-space: pre-wrap; word-break: break-all; }
.il-tabs { flex-wrap: wrap; }

/* Impact Simulator */
.il-impact-section { margin-top: 10px; }
.il-impact-toggle { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid #e0e0e0; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-family: inherit; font-size: 0.75rem; color: var(--text-lt); width: 100%; text-align: left; transition: all 0.15s; }
.il-impact-toggle:hover { border-color: var(--accent); color: var(--accent); background: #f8fbff; }
.il-impact-toggle-icon { font-size: 0.7rem; width: 12px; flex-shrink: 0; }
.il-impact-toggle-label { font-weight: 700; color: var(--primary); flex-shrink: 0; }
.il-impact-summary { color: var(--text-lt); font-size: 0.72rem; margin-left: auto; }
.il-impact-panel { margin-top: 6px; border: 1px solid #d5e8d4; border-radius: 6px; background: #f6faf6; overflow: hidden; }
.il-impact-change { padding: 10px 12px; border-bottom: 1px solid #e8f0e8; }
.il-impact-change:last-child { border-bottom: none; }
.il-impact-change-header { display: flex; align-items: flex-start; gap: 8px; }
.il-impact-icon { font-size: 0.85rem; flex-shrink: 0; width: 18px; text-align: center; }
.il-impact-before-after { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 0.78rem; }
.il-impact-before { color: #c0392b; text-decoration: line-through; opacity: 0.7; }
.il-impact-arrow { color: var(--text-lt); font-size: 0.7rem; }
.il-impact-after { color: #1e8449; font-weight: 600; }
.il-impact-explanation { font-size: 0.72rem; color: #555; margin: 4px 0 0 26px; line-height: 1.4; }
</style>
