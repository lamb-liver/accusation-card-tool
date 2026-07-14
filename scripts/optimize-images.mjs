import sharp from 'sharp';
import fg from 'fast-glob';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { CARD_IMAGE_WIDTHS } from '../src/utils/cardAlternateArt.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES_DIR = path.join(ROOT, 'public/images');

/** 卡牌響應式寬度：與 srcset 產生端共用同一常數，避免手動同步失誤 */
const CARD_WIDTHS = CARD_IMAGE_WIDTHS;
const ICON_MAX_WIDTH = 64;
const ICON_AVIF_WIDTH = 32;
const WEBP_QUALITY = 72;
const AVIF_QUALITY = 50;

const RESPONSIVE_SUFFIX_RE = /-w\d+\.(webp|avif)$/i;
const RASTER_RE = /\.(png|jpe?g)$/i;

function isCardMasterWebp(file) {
  const rel = path.relative(IMAGES_DIR, file);
  if (rel.includes(`${path.sep}icons${path.sep}`)) return false;
  if (RESPONSIVE_SUFFIX_RE.test(rel)) return false;
  return rel.endsWith('.webp');
}

async function writeResponsiveVariants(inputPath) {
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, '.webp');
  const meta = await sharp(inputPath).metadata();
  const naturalWidth = meta.width ?? 800;

  for (const width of CARD_WIDTHS) {
    const targetWidth = Math.min(width, naturalWidth);
    const webpOut = path.join(dir, `${base}-w${width}.webp`);
    const avifOut = path.join(dir, `${base}-w${width}.avif`);

    await sharp(inputPath)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(webpOut);

    await sharp(inputPath)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .avif({ quality: AVIF_QUALITY })
      .toFile(avifOut);

    console.log('responsive:', path.relative(ROOT, webpOut), path.relative(ROOT, avifOut));
  }
}

async function rasterToWebp(file) {
  const out = file.replace(RASTER_RE, '.webp');
  if (existsSync(out)) {
    console.log('skip (exists):', path.relative(ROOT, out));
    return out;
  }
  await sharp(file).webp({ quality: WEBP_QUALITY }).toFile(out);
  console.log('optimized:', path.relative(ROOT, out));
  return out;
}

async function optimizeIcon(file) {
  const base = file.replace(RASTER_RE, '');
  const webpOut = `${base}.webp`;
  const avifOut = `${base}-32.avif`;

  await sharp(file)
    .resize({ width: ICON_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(webpOut);

  await sharp(file)
    .resize({ width: ICON_AVIF_WIDTH, withoutEnlargement: true })
    .avif({ quality: AVIF_QUALITY })
    .toFile(avifOut);

  console.log('icon:', path.relative(ROOT, webpOut), path.relative(ROOT, avifOut));
}

async function main() {
  const rasters = await fg('public/images/**/*.{png,jpg,jpeg}', {
    cwd: ROOT,
    absolute: true,
  });

  for (const file of rasters) {
    const rel = path.relative(IMAGES_DIR, file);
    if (rel.startsWith(`icons${path.sep}`)) {
      await optimizeIcon(file);
    } else {
      const webpPath = await rasterToWebp(file);
      if (webpPath) await writeResponsiveVariants(webpPath);
    }
  }

  const cardMasters = await fg('public/images/*.webp', {
    cwd: ROOT,
    absolute: true,
  });

  for (const file of cardMasters) {
    if (!isCardMasterWebp(file)) continue;
    await writeResponsiveVariants(file);
  }

  console.log('done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
