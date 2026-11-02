// Renders the PWA icons: three clue lines on systemBlue, one revealed and two still locked,
// like the Clue list in the app.
// Usage: npm run icons
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const outDir = new URL('../public/icons/', import.meta.url);
await mkdir(outDir, { recursive: true });

const TOP = '#3D97FF';
const BOTTOM = '#0062C4';

/** The mark on a 512 canvas: a revealed line, then two locked ones fading out. */
const LINES = `
    <rect x="112" y="150" width="288" height="44" rx="22" fill="#fff"/>
    <rect x="112" y="234" width="208" height="44" rx="22" fill="#fff" fill-opacity=".55"/>
    <rect x="112" y="318" width="248" height="44" rx="22" fill="#fff" fill-opacity=".3"/>`;

/**
 * @param {number} radius corner rounding; 0 for full-bleed (maskable and iOS add their own mask)
 * @param {number} scale artwork scale; maskable icons keep their art inside the central 80%
 */
export const icon = (radius, scale) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${TOP}"/><stop offset="1" stop-color="${BOTTOM}"/></linearGradient></defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${LINES}
  </g>
</svg>`;

const targets = [
  { file: 'icon-192.png', size: 192, svg: icon(112, 1) },
  { file: 'icon-512.png', size: 512, svg: icon(112, 1) },
  { file: 'icon-maskable-512.png', size: 512, svg: icon(0, 0.78) },
  { file: 'apple-touch-icon.png', size: 180, svg: icon(0, 1) },
];

for (const { file, size, svg } of targets) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(new URL(file, outDir), png);
  console.log('wrote', file, `${size}×${size}`);
}

// The favicon is the same mark as an SVG, rounded like the app icon.
await writeFile(new URL('../public/favicon.svg', import.meta.url), icon(112, 1).replace(' width="512" height="512"', '') + '\n');
console.log('wrote favicon.svg');
