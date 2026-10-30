const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('orionDesktop', {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  /** Dialogue natif + lecture disque (gros dossiers). */
  openFolderWorkspace: () => ipcRenderer.invoke('orion-transfer:open-folder'),
  /** Connexion Google via la page web ORION, puis retour vers le logiciel. */
  openExternalAuth: (input) => ipcRenderer.invoke('orion-transfer:open-auth', input),
})
