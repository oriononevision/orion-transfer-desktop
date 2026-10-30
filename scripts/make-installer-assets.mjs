/**
 * Génère les bitmaps NSIS (sidebar 164×314, header 150×57) aux couleurs ORION Transfer (ambre).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const buildDir = path.resolve(__dirname, '../build')
const iconPng = path.join(buildDir, 'icon.png')

const BG = '#06080f'
const ACCENT = '#f59e0b'
const ACCENT_DIM = '#b45309'
const TEXT = '#fef3c7'
const PRODUCT = 'TRANSFER'

function svgSidebar(iconDataUri) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="164" height="314" viewBox="0 0 164 314">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#12100a"/>
      <stop offset="55%" stop-color="${BG}"/>
      <stop offset="100%" stop-color="#02040a"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="38%" r="48%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.4"/>
      <stop offset="55%" stop-color="${ACCENT_DIM}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${BG}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="164" height="314" fill="url(#bg)"/>
  <rect width="164" height="314" fill="url(#glow)"/>
  <rect x="0" y="0" width="3" height="314" fill="${ACCENT}" opacity="0.9"/>
  <image href="${iconDataUri}" x="42" y="72" width="80" height="80"/>
  <text x="82" y="188" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif"
        font-size="13" font-weight="700" letter-spacing="3" fill="#f4f7fa">ORION</text>
  <text x="82" y="210" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif"
        font-size="10" font-weight="600" letter-spacing="2" fill="${ACCENT}">${PRODUCT}</text>
  <text x="82" y="278" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif"
        font-size="9" fill="#c4b59a" opacity="0.9">Installation</text>
</svg>`
}

function svgHeader(iconDataUri) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="150" height="57" viewBox="0 0 150 57">
  <defs>
    <linearGradient id="hbg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#12100a"/>
      <stop offset="100%" stop-color="${BG}"/>
    </linearGradient>
  </defs>
  <rect width="150" height="57" fill="url(#hbg)"/>
  <rect x="0" y="54" width="150" height="3" fill="${ACCENT}" opacity="0.8"/>
  <image href="${iconDataUri}" x="10" y="10" width="36" height="36"/>
  <text x="54" y="28" font-family="Segoe UI, Arial, sans-serif"
        font-size="11" font-weight="700" fill="#f4f7fa">ORION ${PRODUCT}</text>
  <text x="54" y="44" font-family="Segoe UI, Arial, sans-serif"
        font-size="9" fill="${ACCENT}">Assistant d'installation</text>
</svg>`
}

function rgbToBmp(width, height, rgb) {
  const rowSize = Math.floor((width * 3 + 3) / 4) * 4
  const pixelSize = rowSize * height
  const fileSize = 54 + pixelSize
  const buf = Buffer.alloc(fileSize)
  buf.write('BM', 0)
  buf.writeUInt32LE(fileSize, 2)
  buf.writeUInt32LE(0, 6)
  buf.writeUInt32LE(54, 10)
  buf.writeUInt32LE(40, 14)
  buf.writeInt32LE(width, 18)
  buf.writeInt32LE(height, 22)
  buf.writeUInt16LE(1, 26)
  buf.writeUInt16LE(24, 28)
  buf.writeUInt32LE(0, 30)
  buf.writeUInt32LE(pixelSize, 34)
  buf.writeInt32LE(2835, 38)
  buf.writeInt32LE(2835, 42)
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y
    const destRow = 54 + y * rowSize
    for (let x = 0; x < width; x++) {
      const si = (srcY * width + x) * 3
      const di = destRow + x * 3
      buf[di] = rgb[si + 2]
      buf[di + 1] = rgb[si + 1]
      buf[di + 2] = rgb[si]
    }
  }
  return buf
}

async function svgToBmp(svg, width, height, outPath) {
  const { data } = await sharp(Buffer.from(svg))
    .resize(width, height)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  fs.writeFileSync(outPath, rgbToBmp(width, height, data))
}

const iconBuf = fs.readFileSync(iconPng)
const iconDataUri = `data:image/png;base64,${iconBuf.toString('base64')}`

await svgToBmp(svgSidebar(iconDataUri), 164, 314, path.join(buildDir, 'installerSidebar.bmp'))
await svgToBmp(svgHeader(iconDataUri), 150, 57, path.join(buildDir, 'installerHeader.bmp'))
fs.copyFileSync(path.join(buildDir, 'installerSidebar.bmp'), path.join(buildDir, 'uninstallerSidebar.bmp'))

console.log('Assets installateur Transfer générés (BMP NSIS)')
