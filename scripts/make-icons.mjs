// Renders the PWA icons: a cloth-bound spine with a call-number label, on the bookcase's wood.
// Usage: npm run icons
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const outDir = new URL('../public/icons/', import.meta.url);
await mkdir(outDir, { recursive: true });

const WOOD = '#6A4223';
const CLOTH = '#7A1F2B';
const GOLD = '#EFD48A';
const LABEL = '#F4EEDD';

/**
 * @param {number} radius corner rounding; 0 for full-bleed (maskable and iOS add their own mask)
 * @param {number} scale artwork scale; maskable icons keep their art inside the central 80%
 */
const icon = (radius, scale) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${WOOD}"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <rect x="176" y="72" width="160" height="368" rx="18" fill="${CLOTH}"/>
    <rect x="176" y="72" width="160" height="368" rx="18" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="6"/>
    <path d="M176 122h160M176 138h160M176 374h160M176 390h160" stroke="${GOLD}" stroke-width="7"/>
    <rect x="206" y="196" width="100" height="112" rx="6" fill="${LABEL}"/>
    <path d="M228 230h56M228 252h56M228 274h36" stroke="#3A2A1A" stroke-width="9" stroke-linecap="round"/>
  </g>
</svg>`;

const targets = [
  { file: 'icon-192.png', size: 192, svg: icon(96, 1) },
  { file: 'icon-512.png', size: 512, svg: icon(96, 1) },
  { file: 'icon-maskable-512.png', size: 512, svg: icon(0, 0.78) },
  { file: 'apple-touch-icon.png', size: 180, svg: icon(0, 1) },
];

for (const { file, size, svg } of targets) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(new URL(file, outDir), png);
  console.log('wrote', file, `${size}×${size}`);
}
