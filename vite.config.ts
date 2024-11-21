import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import dtsPlugin from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: './lib/main.ts',
      name: 'I18nObserver',
      fileName: 'i18n-observer',
    },
    target: 'es2015',
  },
  plugins: [
    vue(),
    vueJsx(),
    dtsPlugin({
      outDir: './dist/types',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
