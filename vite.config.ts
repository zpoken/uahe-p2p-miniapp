import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build works on GitHub Pages project sites
// (https://<user>.github.io/<repo>/) without extra config.
export default defineConfig({
  plugins: [react()],
  base: './',
})
