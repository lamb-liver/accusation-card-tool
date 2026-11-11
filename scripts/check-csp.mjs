/**
 * build 後檢查 dist/_headers 的 CSP：
 * 1. 有 frame-ancestors 'none' 與 X-Frame-Options（防止被嵌入）
 * 2. dist 內每個 HTML 的內聯可執行 <script> 都有對應的 sha256 雜湊，否則上線後腳本會被瀏覽器擋下
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const headers = readFileSync(join(dist, '_headers'), 'utf8');
const csp = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1] ?? '';
const errors = [];

if (!csp) errors.push('dist/_headers 沒有 Content-Security-Policy');
if (!/frame-ancestors 'none'/.test(csp)) errors.push("CSP 缺少 frame-ancestors 'none'");
if (!/^\s*X-Frame-Options:\s*DENY\s*$/m.test(headers)) errors.push('缺少 X-Frame-Options: DENY');
if (!csp.includes('https://challenges.cloudflare.com')) errors.push('CSP 未允許 Turnstile（challenges.cloudflare.com）');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

let inlineCount = 0;
for (const file of walk(dist)) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1] ?? '';
    if (/\ssrc=/.test(attrs) || /type=["']application\/(ld\+)?json["']/.test(attrs)) continue;
    if (!m[2].trim()) continue;
    inlineCount += 1;
    const hash = `'sha256-${createHash('sha256').update(m[2]).digest('base64')}'`;
    if (!csp.includes(hash)) {
      errors.push(`${file.slice(dist.length + 1)} 的內聯腳本雜湊 ${hash} 不在 CSP script-src 裡，請更新 public/_headers`);
    }
  }
  if (/\son[a-z]+=["']/i.test(html)) errors.push(`${file.slice(dist.length + 1)} 有 inline 事件屬性（onclick 等），CSP 會擋`);
}

if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}
console.log(`check-csp: ok（${inlineCount} 段內聯腳本雜湊相符）`);
