# ORION Transfer — Desktop

Application bureau (Electron) qui **réutilise** `../orion-transfer`.

Sur le web : envoi de fichiers / dossiers.  
Sur le logiciel : **+ code partagé** avec ouverture native de gros dossiers.

## Démarrage

```bash
cd logiciel-transfer
npm install
npm run dev
```

Fenêtre **ORION Transfer** sur `http://127.0.0.1:5176`.

## Installateur Windows

```bash
npm run dist
```

Sortie dans `release/ORION-Transfer-Setup-0.1.0.exe`.

## Variables

Copier les clés de `orion-transfer/.env.local` dans `.env` ici, avec :

```
VITE_ORION_DESKTOP=1
```
