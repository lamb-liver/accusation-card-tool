import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const swPath = resolve(process.cwd(), 'dist', 'sw.js')

if (!existsSync(swPath)) {
  console.error('[CI] Missing PWA service worker: expected dist/sw.js after build.')
  process.exit(1)
}

console.log('[CI] PWA service worker exists:', swPath)
