import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AgentWidget',
      fileName: 'agent-widget',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        // 单文件 IIFE 格式，所有依赖内联
        entryFileNames: 'agent-widget.js',
      },
    },
  },
})
