// scripts/generate-icons.mjs
// Genera los iconos PNG instalables de la PWA a partir de geometría vectorial
// definida en código. Es determinista y reproducible: no depende de binarios
// externos ni de un editor gráfico.
//
// Uso: npm run icons
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'pwa-icons');

const BRAND = '#863bff'; // violeta de marca (mismo origen que favicon.svg)
const CANVAS = 512;

/**
 * Marca MultiCatálogo: árbol MLM de tres nodos (ventas → referidos).
 * Coordenadas en el lienzo base de 512x512.
 */
const NODES = [
  { cx: 256, cy: 150, r: 38 }, // nodo raíz
  { cx: 136, cy: 348, r: 33 }, // referido izquierdo
  { cx: 376, cy: 348, r: 33 }, // referido derecho
];

const EDGES = [
  { x1: 256, y1: 188, x2: 136, y2: 315 },
  { x1: 256, y1: 188, x2: 376, y2: 315 },
  { x1: 136, y1: 348, x2: 376, y2: 348 },
];

/**
 * Genera el SVG del icono.
 * @param {number} scale escala de la marca respecto del lienzo (1 = tamaño natural)
 * @param {string} background color de fondo; 'none' deja el fondo transparente
 */
const buildSvg = (scale, background) => {
  const cx = CANVAS / 2;
  const cy = CANVAS / 2;

  // Escalamos la marca alrededor del centro del lienzo.
  const transform = `translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`;

  const edges = EDGES.map(
    (e) =>
      `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="#ffffff" stroke-opacity="0.75" stroke-width="22" stroke-linecap="round" />`
  ).join('\n    ');

  const nodes = NODES.map(
    (n) => `<circle cx="${n.cx}" cy="${n.cy}" r="${n.r}" fill="#ffffff" />`
  ).join('\n    ');

  const bg =
    background === 'none'
      ? ''
      : `<rect width="${CANVAS}" height="${CANVAS}" fill="${background}" />\n    `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  ${bg}<g transform="${transform}">
    ${edges}
    ${nodes}
  </g>
</svg>`;
};

/** @type {{file: string, size: number, scale: number, background: string}[]} */
const TARGETS = [
  { file: 'icon-192.png', size: 192, scale: 1, background: BRAND },
  { file: 'icon-512.png', size: 512, scale: 1, background: BRAND },
  // Maskable: la marca debe caber en la "safe zone" (círculo de 80% del lienzo).
  { file: 'icon-512-maskable.png', size: 512, scale: 0.68, background: BRAND },
  { file: 'icon-maskable-192.png', size: 192, scale: 0.68, background: BRAND },
  // iOS no maneja bien la transparencia: fondo opaco y marca más grande.
  { file: 'apple-touch-icon.png', size: 180, scale: 0.85, background: BRAND },
];

const run = async () => {
  await mkdir(OUT_DIR, { recursive: true });

  // Fuente vectorial legible por humanos, junto a los PNG generados.
  const sourceSvg = buildSvg(1, BRAND);
  await sharp(Buffer.from(sourceSvg)).png().toFile(path.join(OUT_DIR, 'icon-512.png'));

  for (const target of TARGETS) {
    const svg = buildSvg(target.scale, target.background);
    await sharp(Buffer.from(svg))
      .resize(target.size, target.size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT_DIR, target.file));
    console.log(`generado ${target.file} (${target.size}x${target.size})`);
  }

  // Copia del SVG maestro para uso como favicon vectorial alternativo.
  const { writeFile } = await import('node:fs/promises');
  await writeFile(path.join(OUT_DIR, 'icon.svg'), sourceSvg, 'utf8');
  console.log('generado icon.svg');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
