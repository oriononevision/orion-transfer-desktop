import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const buildDir = path.resolve(__dirname, '../build')
const svgPath = path.join(buildDir, 'icon.svg')
const svg = fs.readFileSync(svgPath)

async function png(size) {
  return sharp(svg).resize(size, size).png().toBuffer()
}

const sizes = [16, 24, 32, 48, 64, 128, 256, 512]
const buffers = {}
for (const s of sizes) {
  buffers[s] = await png(s)
}

fs.writeFileSync(path.join(buildDir, 'icon.png'), buffers[512])
fs.writeFileSync(path.join(buildDir, 'icon-256.png'), buffers[256])
fs.writeFileSync(
  path.join(buildDir, 'icon.ico'),
  await toIco([buffers[16], buffers[24], buffers[32], buffers[48], buffers[64], buffers[128], buffers[256]]),
)

console.log('Icons Transfer générés dans build/ (fond jaune)')
