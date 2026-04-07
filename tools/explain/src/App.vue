<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { parsePlan } from './parsers/normalize'
import { analyze } from './analysis/engine'
import type { ParseResult, PlanNode } from './parsers/types'
import type { AnalysisResult } from './analysis/types'
import { loadFromUrl, getShareUrl } from './storage/url-codec'
import { saveToHistory, loadHistory, deleteFromHistory, clearHistory, type HistoryEntry } from './storage/history'
import { samples } from './utils/samples'
import InputPanel from './components/InputPanel.vue'
import StatsBar from './components/StatsBar.vue'
import PlanTree from './components/PlanTree.vue'
import PlanTable from './components/PlanTable.vue'
import NodeDetail from './components/NodeDetail.vue'
import IssueList from './components/IssueList.vue'
import PlanHistory from './components/PlanHistory.vue'
import CostChart from './components/CostChart.vue'
import EstimateVsActual from './components/EstimateVsActual.vue'
import CompareView from './components/CompareView.vue'

// State
const explainInput = ref('')
const queryInput = ref('')
const ddlInput = ref('')
const parseResult = ref<ParseResult | null>(null)
const analysisResult = ref<AnalysisResult | null>(null)
const selectedNode = ref<PlanNode | null>(null)
const activeView = ref<'tree' | 'table' | 'cost' | 'estimate'>('tree')
const showSamples = ref(false)
const history = ref<HistoryEntry[]>([])
const showHistory = ref(false)
const showCopied = ref(false)
const showCompare = ref(false)

const hasResult = computed(() => parseResult.value !== null && parseResult.value.stats.nodeCount > 0)

function doAnalyze() {
  if (!explainInput.value.trim()) return

  selectedNode.value = null
  const result = parsePlan(explainInput.value)
  parseResult.value = result

  if (result.stats.nodeCount > 0) {
    analysisResult.value = analyze(result.root, result.stats, queryInput.value || undefined, ddlInput.value || undefined)

    saveToHistory({
      title: queryInput.value?.trim().slice(0, 60) || `Plan ${new Date().toLocaleTimeString()}`,
      explain: explainInput.value,
      query: queryInput.value || undefined,
      ddl: ddlInput.value || undefined,
      format: result.format,
      issueCount: (analysisResult.value?.summary.critical ?? 0) + (analysisResult.value?.summary.warnings ?? 0),
      score: analysisResult.value?.summary.score ?? 0,
    })
    history.value = loadHistory()
  } else {
    analysisResult.value = null
  }
}

function loadSample(index: number) {
  const sample = samples[index]
  explainInput.value = sample.explain
  queryInput.value = sample.query
  ddlInput.value = sample.ddl
  showSamples.value = false
  doAnalyze()
}

function selectNode(node: PlanNode) {
  selectedNode.value = selectedNode.value?.id === node.id ? null : node
}

function copyShareUrl() {
  const url = getShareUrl(explainInput.value, queryInput.value, ddlInput.value)
  navigator.clipboard.writeText(url).then(() => {
    showCopied.value = true
    setTimeout(() => { showCopied.value = false }, 2000)
  })
}

function loadHistoryEntry(entry: HistoryEntry) {
  explainInput.value = entry.explain
  queryInput.value = entry.query ?? ''
  ddlInput.value = entry.ddl ?? ''
  showHistory.value = false
  doAnalyze()
}

function removeHistoryEntry(id: string) {
  deleteFromHistory(id)
  history.value = loadHistory()
}

function clearAllHistory() {
  clearHistory()
  history.value = []
}

function reset() {
  explainInput.value = ''
  queryInput.value = ''
  ddlInput.value = ''
  parseResult.value = null
  analysisResult.value = null
  selectedNode.value = null
  showCompare.value = false
}

onMounted(() => {
  const shared = loadFromUrl()
  if (shared) {
    explainInput.value = shared.e
    queryInput.value = shared.q ?? ''
    ddlInput.value = shared.d ?? ''
    doAnalyze()
  }
  history.value = loadHistory()
})
</script>

<template>
  <div class="explain-app">
    <!-- Tool Toolbar -->
    <div class="tool-toolbar">
      <div class="tool-toolbar-inner">
        <div class="tool-toolbar-left">
          <h1 class="tool-title">MySQL &amp; MariaDB EXPLAIN Analyzer</h1>
          <span class="tool-subtitle">Free &mdash; 100% in your browser</span>
        </div>
        <div class="tool-toolbar-right">
          <div class="sample-dropdown">
            <button @click="showSamples = !showSamples" class="btn-tool">
              Sample Plans
              <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
            </button>
            <div v-if="showSamples" class="sample-menu card">
              <button v-for="(s, i) in samples" :key="i"
                @click="loadSample(i)"
                class="sample-item">
                <div class="sample-name">{{ s.name }}</div>
                <div class="sample-desc">{{ s.description }}</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <main class="tool-main">
      <!-- Privacy Banner -->
      <div class="privacy-banner">
        <svg class="privacy-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a3.5 3.5 0 00-3.5 3.5V6H3a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1h-1.5V4.5A3.5 3.5 0 008 1zm2 5V4.5a2 2 0 10-4 0V6h4z"/>
        </svg>
        <span>Your data stays private &mdash; this tool runs 100% in your browser. Nothing is sent to any server.</span>
      </div>

      <!-- Input Section -->
      <InputPanel
        v-model:explain="explainInput"
        v-model:query="queryInput"
        v-model:ddl="ddlInput"
        @analyze="doAnalyze"
        @reset="reset"
        :has-result="hasResult"
      />

      <!-- Warnings -->
      <div v-if="parseResult?.warnings.length" class="warnings">
        <div v-for="(w, i) in parseResult.warnings" :key="i" class="warning-item">
          {{ w }}
        </div>
      </div>

      <!-- Results -->
      <template v-if="hasResult && analysisResult">
        <StatsBar :stats="parseResult!.stats" :summary="analysisResult.summary" :format="parseResult!.format" :engine="parseResult!.engine" />

        <div class="results-grid">
          <!-- Plan View -->
          <div class="results-plan">
            <div class="view-tabs">
              <button @click="activeView = 'tree'" :class="activeView === 'tree' ? 'tab-active' : 'tab-inactive'" class="view-tab">
                Tree
              </button>
              <button @click="activeView = 'table'" :class="activeView === 'table' ? 'tab-active' : 'tab-inactive'" class="view-tab">
                Table
              </button>
              <button @click="activeView = 'cost'" :class="activeView === 'cost' ? 'tab-active' : 'tab-inactive'" class="view-tab">
                Cost
              </button>
              <button @click="activeView = 'estimate'" :class="activeView === 'estimate' ? 'tab-active' : 'tab-inactive'" class="view-tab">
                Est. vs Actual
              </button>
            </div>

            <div v-show="activeView === 'tree'" class="card plan-card">
              <PlanTree :root="parseResult!.root" :selected-id="selectedNode?.id" @select="selectNode" />
            </div>
            <div v-show="activeView === 'table'" class="card plan-card">
              <PlanTable :root="parseResult!.root" @select="selectNode" :selected-id="selectedNode?.id" />
            </div>
            <div v-show="activeView === 'cost'">
              <CostChart :root="parseResult!.root" />
            </div>
            <div v-show="activeView === 'estimate'">
              <EstimateVsActual :root="parseResult!.root" />
            </div>

            <NodeDetail v-if="selectedNode" :node="selectedNode" :total-cost="parseResult!.stats.totalCost" />
          </div>

          <!-- Analysis Panel -->
          <div class="results-analysis">
            <IssueList :analysis="analysisResult" />

            <div class="card actions-card">
              <h3 class="actions-title">Actions</h3>
              <div class="actions-btns">
                <button @click="copyShareUrl" class="btn-tool">
                  {{ showCopied ? 'Copied!' : 'Copy Share Link' }}
                </button>
                <button @click="showCompare = !showCompare" class="btn-tool">
                  {{ showCompare ? 'Hide Compare' : 'Compare Plans' }}
                </button>
                <button @click="showHistory = !showHistory" class="btn-tool">
                  History ({{ history.length }})
                </button>
              </div>
            </div>

            <CompareView v-if="showCompare"
              :before-explain="explainInput"
              :before-query="queryInput"
            />

            <PlanHistory v-if="showHistory"
              :entries="history"
              @load="loadHistoryEntry"
              @remove="removeHistoryEntry"
              @clear="clearAllHistory"
            />
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div v-else-if="!hasResult && !parseResult" class="empty-state">
        <div class="empty-icon">&#x1F50D;</div>
        <h2 class="empty-title">Paste your MySQL or MariaDB EXPLAIN output above</h2>
        <p class="empty-desc">
          Supports MySQL EXPLAIN ANALYZE (tree), EXPLAIN FORMAT=JSON, traditional EXPLAIN table, and MariaDB ANALYZE / ANALYZE FORMAT=JSON.
        </p>
        <button @click="loadSample(0)" class="btn btn-primary">
          Try a Sample Plan
        </button>
      </div>
    </main>
  </div>
</template>
