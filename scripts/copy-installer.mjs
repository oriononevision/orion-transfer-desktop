import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const name = `ORION-Transfer-Setup-${pkg.version}.exe`
const src = path.join(root, 'release', name)
const destDir = path.resolve(root, '../site web/orionweb.com/public/downloads')
const dest = path.join(destDir, name)

if (!fs.existsSync(src)) {
  console.error('Installateur introuvable:', src)
  process.exit(1)
}
fs.mkdirSync(destDir, { recursive: true })
fs.copyFileSync(src, dest)
console.log('Copié →', dest)
