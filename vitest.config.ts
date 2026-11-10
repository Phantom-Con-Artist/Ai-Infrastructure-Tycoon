import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
export default defineConfig({ resolve: { alias: { '@sim': resolve('src/sim') } }, test: { include: ['src/**/*.test.{ts,tsx}'] } })
