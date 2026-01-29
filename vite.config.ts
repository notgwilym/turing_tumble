import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
})
