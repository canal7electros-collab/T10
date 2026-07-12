# Canal 7 — Tournage

Application web (PWA) de **repérages et suivi de tournage** pour chef·fe électricien·ne :
repérages, fiches décors **D2** (camion, accès, élec, stock, soleil, temps & renforts, plan de feux),
ponctuels, calendrier, équipe, **camions**, et **export PDF**.

Tout fonctionne côté navigateur, sans serveur : les données sont enregistrées **localement** sur l'appareil.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | L'application complète (HTML + CSS + JS). |
| `plan-feux.html` | Éditeur de plan de feux (pose de projecteurs sur un plan, export PNG/PDF). |
| `sw.js` | Service worker (mode hors-ligne, *network-first* pour le HTML). |
| `manifest.json` | Manifeste PWA (nom, icônes, couleurs). |
| `icon192.png`, `icon512.png` | Icônes de l'app. |

> **Note icônes :** `icon192.png` et `icon512.png` fournis ici sont des **placeholders** générés
> automatiquement. Remplacez-les par vos icônes d'origine (mêmes noms de fichier) avant publication.

## Déploiement sur GitHub Pages

1. Créez un dépôt GitHub (ex. `canal7`) et poussez-y **tous les fichiers à la racine** :
   ```bash
   git init
   git add .
   git commit -m "Canal 7 — Prépa & Tournage"
   git branch -M main
   git remote add origin https://github.com/VOTRE-USER/canal7.git
   git push -u origin main
   ```
   > Ce dossier est déjà initialisé en dépôt git avec un premier commit : vous pouvez sauter `git init`/`git add`/`git commit` et directement ajouter votre remote puis `git push -u origin main`.
2. Sur GitHub : **Settings → Pages → Build and deployment → Source : Deploy from a branch**,
   branche `main`, dossier `/ (root)`, puis **Save**.
3. L'app sera disponible sous quelques minutes à :
   `https://VOTRE-USER.github.io/canal7/`

Les chemins sont **relatifs** (`./`), l'app fonctionne donc sans souci dans un sous-dossier comme celui de GitHub Pages.

## Mises à jour & cache

Le service worker sert le HTML en **network-first** : à chaque ouverture en ligne, la dernière version d'`index.html` est récupérée automatiquement.

À chaque nouvelle version publiée, **incrémentez le numéro de cache** en haut de `sw.js` :
```js
const CACHE_NAME = 'canal7-v142';  // → 'canal7-v143', etc.
```
Cela force la PWA installée à recharger les fichiers en cache (icônes, librairies).

> Si vous restez bloqué sur une vieille version : outils développeur → **Application → Service Workers → Unregister**, puis **Clear site data**, et rechargez. Sur la PWA installée : désinstaller / réinstaller.

## Utilisation en local

Un PWA a besoin d'être servi en HTTP (le service worker ne s'active pas en `file://`). En local :
```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000/
```

## Dépendances (chargées via CDN)

- [jsPDF](https://github.com/parallax/jsPDF) + AutoTable — export PDF
- [SheetJS (xlsx)](https://sheetjs.com/) — import/export tableur
- [Leaflet](https://leafletjs.com/) — carte (point GPS parking)
- [Nominatim / OpenStreetMap](https://nominatim.org/) — recherche d'adresse

---
*Données stockées localement dans le navigateur. Pensez à exporter régulièrement.*
