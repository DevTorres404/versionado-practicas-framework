// scripts/generate-icons.mjs
// Genera los iconos PNG e instalables de la PWA a partir del logotipo oficial de Torres.
//
// Uso: npm run icons
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public');
const OUT_DIR = path.resolve(PUBLIC_DIR, 'pwa-icons');
const LOGO_SRC = path.resolve(PUBLIC_DIR, 'logo-torres.png');

const BRAND_BG = '#ffffff';

const run = async () => {
  await mkdir(OUT_DIR, { recursive: true });

  // 1. icon-192.png y icon-512.png (any)
  await sharp(LOGO_SRC)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'icon-192.png'));
  console.log('generado icon-192.png');

  await sharp(LOGO_SRC)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'icon-512.png'));
  console.log('generado icon-512.png');

  // 2. icon-maskable-192.png y icon-512-maskable.png (safe zone ~80%)
  const logo192Inner = await sharp(LOGO_SRC)
    .resize(150, 150, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .composite([{ input: logo192Inner, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'icon-maskable-192.png'));
  console.log('generado icon-maskable-192.png');

  const logo512Inner = await sharp(LOGO_SRC)
    .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .composite([{ input: logo512Inner, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'icon-512-maskable.png'));
  console.log('generado icon-512-maskable.png');

  // 3. apple-touch-icon.png (180x180)
  const logo180Inner = await sharp(LOGO_SRC)
    .resize(150, 150, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .composite([{ input: logo180Inner, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'apple-touch-icon.png'));
  console.log('generado apple-touch-icon.png');

  // 4. icon.svg maestro para PWA y favicon.svg para pestaña de navegador
  const logoBase64 = (await sharp(LOGO_SRC).resize(512, 512).png().toBuffer()).toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <image href="data:image/png;base64,${logoBase64}" width="512" height="512" />
</svg>`;
  await writeFile(path.join(OUT_DIR, 'icon.svg'), svgContent, 'utf8');
  await writeFile(path.join(PUBLIC_DIR, 'favicon.svg'), svgContent, 'utf8');
  console.log('generado icon.svg y favicon.svg con el logotipo de Torres');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
