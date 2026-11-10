// Browser-only dev server for the renderer (live UI testing without Electron).
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
export default defineConfig({ root: 'src/renderer', resolve: { alias: { '@sim': resolve('src/sim') } }, plugins: [react()], server: { port: 5199, strictPort: true } })
