import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import topLevelAwait from 'vite-plugin-top-level-await'
import solidPlugin from 'vite-plugin-solid'
import wasm from 'vite-plugin-wasm'
import devtools from 'solid-devtools/vite'

export default defineConfig({
  plugins: [devtools(), solidPlugin(), wasm(), tailwindcss(), topLevelAwait()],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
})
