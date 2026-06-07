import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const distDir = resolve(process.cwd(), 'dist')
const targetDir = resolve(process.argv[2] || join(process.cwd(), 'deploy-output'))

async function emptyDir(dir) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
    return
  }
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    await rm(join(dir, entry.name), { recursive: true, force: true })
  }
}

async function main() {
  if (!existsSync(join(distDir, 'index.html'))) {
    console.error('[deploy] 找不到 dist/index.html，請先執行：npm run build')
    process.exit(1)
  }
  if (!existsSync(join(distDir, 'sw.js'))) {
    console.error('[deploy] 找不到 dist/sw.js，請先執行：npm run build')
    process.exit(1)
  }

  await emptyDir(targetDir)

  for (const entry of await readdir(distDir, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue
    await cp(join(distDir, entry.name), join(targetDir, entry.name), { recursive: true })
  }

  console.log('[deploy] 已將 dist 內容複製到：')
  console.log(`         ${targetDir}`)
  console.log('[deploy] 請用 GitHub Desktop 對「這個資料夾」Commit + Push 到 Cloudflare 連結的 repo。')
}

main().catch((err) => {
  console.error('[deploy] 失敗:', err)
  process.exit(1)
})
