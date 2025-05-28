import { defineConfig } from 'vite'

export default defineConfig({
  root: '.', // Use current directory as root
  server: {
    port: 5173,
    open: true
  }
})
