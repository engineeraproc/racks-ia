import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Esta linha diz ao GitHub Pages onde encontrar os ficheiros do seu site
  base: '/racks-ia/', 
})