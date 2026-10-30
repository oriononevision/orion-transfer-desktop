const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron')
const http = require('node:http')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')

const DESKTOP_PORT = 5176
const DEV_URL = `http://127.0.0.1:${DESKTOP_PORT}`

const MAX_FILES = 120
const MAX_FILE_BYTES = 400_000
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '__pycache__',
  '.turbo',
  '.cache',
  'release',
])
const TEXT_EXT =
  /\.(ts|tsx|js|jsx|mjs|cjs|json|md|txt|css|scss|html|htm|svg|yml|yaml|toml|env|sql|py|rs|go|java|kt|swift|c|h|cpp|hpp|cs|php|rb|sh|bat|ps1|xml|csv|ini|cfg|conf|vue|svelte|astro)$/i

let mainWindow = null
let staticServer = null

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
}

function distDir() {
  return path.join(__dirname, '..', 'dist')
}

function startStaticServer() {
  const root = distDir()
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url || '/', `http://127.0.0.1:${DESKTOP_PORT}`)
        let rel = decodeURIComponent(url.pathname)
        if (rel === '/') rel = '/index.html'
        let filePath = path.normalize(path.join(root, rel))
        if (!filePath.startsWith(root)) {
          res.writeHead(403)
          res.end()
          return
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(root, 'index.html')
        }
        const ext = path.extname(filePath).toLowerCase()
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
        fs.createReadStream(filePath).pipe(res)
      } catch (err) {
        res.writeHead(500)
        res.end(String(err))
      }
    })
    server.once('error', reject)
    server.listen(DESKTOP_PORT, '127.0.0.1', () => {
      staticServer = server
      resolve(`http://127.0.0.1:${DESKTOP_PORT}`)
    })
  })
}

async function resolveAppUrl() {
  if (app.isPackaged || process.env.ORION_DESKTOP_USE_DIST === '1') {
    return startStaticServer()
  }
  return DEV_URL
}

function appIconPath() {
  const ico = path.join(__dirname, '..', 'build', 'icon.ico')
  const png = path.join(__dirname, '..', 'build', 'icon.png')
  if (fs.existsSync(ico)) return ico
  if (fs.existsSync(png)) return png
  return undefined
}

function createWindow(appUrl) {
  const icon = appIconPath()
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'ORION Transfer',
    backgroundColor: '#06080f',
    show: false,
    autoHideMenuBar: true,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1:') || url.startsWith('http://localhost:')) {
      return { action: 'allow' }
    }
    shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.loadURL(appUrl)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function walkFolder(rootDir) {
  const files = {}
  let skipped = 0
  let truncated = false

  async function walk(dir, relBase) {
    if (Object.keys(files).length >= MAX_FILES) {
      truncated = true
      return
    }
    let entries
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true })
    } catch {
      skipped += 1
      return
    }
    for (const entry of entries) {
      if (Object.keys(files).length >= MAX_FILES) {
        truncated = true
        return
      }
      if (entry.name.startsWith('.') && entry.name !== '.env' && entry.name !== '.env.example' && entry.name !== '.gitignore') {
        if (entry.isDirectory()) continue
      }
      const abs = path.join(dir, entry.name)
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          skipped += 1
          continue
        }
        await walk(abs, rel.replace(/\\/g, '/'))
        continue
      }
      if (!entry.isFile()) continue
      if (!TEXT_EXT.test(entry.name) && !/^(Dockerfile|Makefile|LICENSE|README)$/i.test(entry.name)) {
        skipped += 1
        continue
      }
      try {
        const stat = await fsp.stat(abs)
        if (stat.size > MAX_FILE_BYTES || stat.size === 0) {
          skipped += 1
          continue
        }
        const buf = await fsp.readFile(abs)
        if (buf.includes(0)) {
          skipped += 1
          continue
        }
        files[rel.replace(/\\/g, '/')] = buf.toString('utf8')
      } catch {
        skipped += 1
      }
    }
  }

  await walk(rootDir, '')
  return { files, skipped, truncated }
}

function registerIpc() {
  ipcMain.handle('orion-transfer:open-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
      properties: ['openDirectory'],
      title: 'Ouvrir un dossier projet',
    })
    if (result.canceled || !result.filePaths[0]) return null
    const root = result.filePaths[0]
    const walked = await walkFolder(root)
    return {
      rootName: path.basename(root),
      files: walked.files,
      skipped: walked.skipped,
      truncated: walked.truncated,
    }
  })
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.orion.transfer.desktop')
  }
  registerIpc()
  const appUrl = await resolveAppUrl()
  createWindow(appUrl)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(appUrl)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  if (staticServer) {
    staticServer.close()
    staticServer = null
  }
})

app.commandLine.appendSwitch('disable-features', 'OutdatedNoneFieldRejection')
