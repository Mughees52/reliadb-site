<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import type { LessonBlock } from '../../types'
import SqlEditor from './SqlEditor.vue'

defineProps<{
  blocks: LessonBlock[]
}>()

const animationComponents: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  BTreeAnimation: defineAsyncComponent(() => import('../animations/BTreeAnimation.vue')),
  JoinAnimation: defineAsyncComponent(() => import('../animations/JoinAnimation.vue')),
  GroupByAnimation: defineAsyncComponent(() => import('../animations/GroupByAnimation.vue')),
  ScanCompareAnimation: defineAsyncComponent(() => import('../animations/ScanCompareAnimation.vue')),
  TransactionAnimation: defineAsyncComponent(() => import('../animations/TransactionAnimation.vue')),
}
</script>

<template>
  <div class="lesson-content">
    <template v-for="(block, i) in blocks" :key="i">
      <!-- Text block -->
      <div v-if="block.type === 'text'" class="prose" v-html="block.html"></div>

      <!-- Code block -->
      <div v-else-if="block.type === 'code'" class="mb-4">
        <p v-if="block.title" class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{{ block.title }}</p>
        <pre class="bg-gray-900 text-green-300 p-4 rounded-lg text-sm font-mono overflow-x-auto">{{ block.sql }}</pre>
      </div>

      <!-- Sandbox block -->
      <div v-else-if="block.type === 'sandbox'" class="mb-6 bg-bg-alt rounded-xl p-4 border border-border">
        <p v-if="block.description" class="text-sm text-gray-600 mb-3">{{ block.description }}</p>
        <SqlEditor
          :default-query="block.defaultQuery || ''"
          placeholder="-- Try it! Write SQL and press Ctrl+Enter"
          height="120px"
        />
      </div>

      <!-- Callout block -->
      <div v-else-if="block.type === 'callout'" class="callout mb-4" :class="'callout-' + block.calloutType">
        <div class="text-sm" v-html="block.html"></div>
      </div>

      <!-- Comparison block -->
      <div v-else-if="block.type === 'comparison'" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div class="bg-white rounded-lg border border-border p-4">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">{{ block.left.title }}</h4>
          <div class="text-sm text-gray-600" v-html="block.left.content"></div>
        </div>
        <div class="bg-white rounded-lg border border-border p-4">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">{{ block.right.title }}</h4>
          <div class="text-sm text-gray-600" v-html="block.right.content"></div>
        </div>
      </div>

      <!-- Animation block -->
      <div v-else-if="block.type === 'animation'" class="mb-6">
        <component
          v-if="animationComponents[block.animation]"
          :is="animationComponents[block.animation]"
          v-bind="block.props || {}"
        />
        <div v-else class="animation-container p-8 text-center">
          <p class="text-muted text-sm">Animation: {{ block.animation }}</p>
        </div>
      </div>
    </template>
  </div>
</template>
