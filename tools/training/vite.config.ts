import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/training/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'codemirror': ['codemirror', '@codemirror/view', '@codemirror/state', '@codemirror/lang-sql', '@codemirror/language', '@codemirror/theme-one-dark', '@codemirror/commands'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['sql.js'],
  },
})
