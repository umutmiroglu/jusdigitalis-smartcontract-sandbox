import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // v2_5.jsx proje kökünde; Vite bu dizini root kabul eder
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
