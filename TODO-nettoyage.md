# Canal 7 — TODO & dette technique

> But : **ne pas dépendre de la mémoire d'une conversation**. Tout ce qui est « à savoir » ou
> « à faire plus tard » est ici, vit dans le projet et voyage avec le code (zip + GitHub).
> Dans une future session : dire « regarde TODO-nettoyage.md ».
>
> ⚠️ **Fichier UNIQUE** : on l'écrase à chaque mise à jour, on n'en crée pas de copies.

**Dernière mise à jour : 2026-07-11 · version : v843**

> 🔎 **Reprise dans une nouvelle conversation** : commencer par lire ce fichier en entier.
> L'état du projet, les règles à ne pas enfreindre et le reste-à-faire sont ici. Le code vit dans
> `index.html` (+ `sw.js`, `plan-feux.html`) — la conversation n'est PAS la source de vérité.

---

## 0. Où on en est

L'app est **entièrement éditable en inline** : le détail d'un décor (`modal-d2-detail`) permet de
tout créer et tout modifier sur place via le bouton **✏️ Modifier**.

**L'ancienne fenêtre de création/modification (`modal-d2` / `openD2Modal` / `saveD2`) a été
SUPPRIMÉE en v765** (HTML + les 2 fonctions, ~260 lignes). Validée par l'utilisateur avant retrait.
Backup : `canal7-backup-AVANT-suppression-v763.zip`.

---

## 1. RÈGLES À NE JAMAIS ENFREINDRE (bugs de fond déjà payés)

### 1.1 Service worker : ne jamais `cache.put` une réponse de NAVIGATION
L'ancien handler mettait toute navigation en cache sous la clé `./index.html` → ouvrir
`plan-feux.html` **écrasait `index.html` dans le cache**. Conséquences : page blanche, « bordel
d'affichage », app cassée hors-ligne. Les pages HTML sont **précachées à l'install** (`ASSETS`) et
ne sont **jamais réécrites** depuis une navigation.

### 1.2 Jamais de `backdrop-filter` sur un overlay FERMÉ
`.modal-overlay` (×54), `.confirm-overlay`, `#toast-back` appliquaient un `blur()` en permanence
(ils étaient seulement `opacity:0`). Chromium devait composer 54 calques plein écran → **le contenu
n'était plus peint** (Brave/Responsively cassés ; Firefox/Safari OK). Le flou n'est appliqué que sur
`.open` / `.show`, et les overlays fermés sont en `visibility:hidden`.

### 1.3 Import : jamais `state = parsed`
Ça **effaçait tous les films**. Voir §3 pour le comportement actuel.

### 1.4 N° de séquence = champ numérique, PAS un dropdown
Un dropdown de numéros faisait **ramer et inverser le texte sur iPhone SE**. La lettre (A–Z) et
l'effet sont des dropdowns ; le numéro reste un `input type="number"`.

### 1.5 `APP_VERSION` (index.html) doit rester SYNCHRO avec `CACHE_NAME` (sw.js)
`APP_VERSION` est affichée sur l'écran d'accueil → permet de savoir quelle version tourne vraiment
(le cache ment souvent). À bumper **aux deux endroits** à chaque livraison.

### 1.6 `_sdPersistFromDetail()` : l'ordre des instructions compte
Les éditeurs élec/photos des sous-décors travaillent sur `_d2SousDecors`, qui **pointe sur**
`item.sousDecors` (même référence). `_sdFromDetail` déclenche la sauvegarde. Bug déjà commis :
remettre `_sdFromDetail = false` **avant** d'appeler `_sdPersistFromDetail()` → la fonction sortait
immédiatement (elle commence par `if (!_sdFromDetail) return;`) → **ni sauvegarde ni rafraîchissement**.

### 1.7 Adresse : jamais de repli
Helios / Sun Seeker copient **uniquement l'adresse précise du décor courant**. Pas de repli sur la
ville seule, pas de repli sur un autre décor → ça provoquerait une **erreur de repérage**.

---

## 2. Fonctionnement de l'édition inline (repères pour reprendre vite)

- `_d2DetailEdit` (bool) : mode édition. Bouton **✏️ Modifier** (rouge clair) → **✓ Terminé** (vert),
  ou **Enregistrer** (rouge) si `_d2IsNew` (décor tout juste créé).
- Masqué en **mode simple** (fiche en lecture seule), sauf si l'édition est déjà en cours.
- `_d2CardMode` (simple/avancé) est **persisté** dans `state.d2CardMode`. ⚠️ Sans ça, il repartait à
  « simple » à chaque redémarrage → au retour de `plan-feux.html`, les **modules disparaissaient**.
- Helper `section()` : une ligne devient éditable si elle a `key` + `module` (+ `raw`, `type`,
  `options`, `reRender`, `suffix`, `sdi`). `sdi` = index de sous-décor → écrit dans son élec.
- Sauvegarde au fil de l'eau : texte = `onblur`, dropdown = `onchange`. Le bouton « Enregistrer »
  ne fait que **fermer** le mode édition (les données sont déjà écrites).
- Les dropdowns **conservent une valeur hors-liste** (vieille donnée type « Sud-Ouest ») en
  l'ajoutant comme option sélectionnée → **aucune perte de données**. Ne pas casser.
- `_scrollDetailTo(anchorId)` : centre une ancre dans le détail. Utilise les **positions réelles**
  (`getBoundingClientRect`), pas `offsetTop` (non fiable ici), et **rejoue** le centrage car les
  photos qui se chargent décalent la page.
- Rouge = **NUIT** (`_isNuit` / `_seqColor`) : une séquence n'est rouge que si son effet contient
  « nuit ». Ce n'est **pas** décoratif.

**Créer un décor** : bouton **+** (page Décors) ou **calendrier → ajouter un décor**, tous deux via
`newD2FromDetail(date)`. Date par défaut = **1er jour de tournage du film**, sinon **aujourd'hui**.

---

## 3. Import / Export JSON — comportement ACTUEL

- **Export** : `exportData()` → modale `modal-export-film` → on choisit **UN film** (ou « Tous les
  films »). `doExportFilm()` exporte le film **avec tout ce qui lui est rattaché** (filtre `filmId`
  sur ponctuels/liste/d2Items/decors/equipe/camions + photos via `_stateWithImages()`).
  `savedMembers` est global → volontairement NON exporté.
- **Import = COPIE CONFORME, film par film** :
  1. tout ce qui appartient au film **en local est effacé** (+ purge des photos, sinon fantômes),
  2. le film est créé s'il n'existe pas, sinon remplacé,
  3. les données du fichier sont versées.
  → Un décor supprimé chez l'expéditeur **disparaît** chez le destinataire (c'était le but).
  → **Les autres films ne sont JAMAIS touchés.**
  → Confirmation explicite avant import (liste des films + avertissement de perte).

---

## 4. Workflow de dev

- **Ne PAS tester en `file://`** (double-clic) : le navigateur y bloque des choses → faux bugs.
- **Serveur local** : `cd <dossier>` puis `python3 -m http.server 8000` → `http://localhost:8000`.
- Le **service worker est désactivé sur `localhost`** (et désinstalle celui qui traîne) : sinon il
  sert une vieille version et masque les modifs. ⚠️ Conséquence : **l'offline ne peut pas être testé
  en local** → le tester sur GitHub Pages ou sur le téléphone.
- **Responsively App** (iPhone SE / iPad / desktop en même temps) : aucun réglage pour vider son
  cache → quitter/relancer l'app si besoin.
- Vérifier la version affichée sur l'accueil (**« Canal 7 — vNNN »**) avant tout test.
- À chaque livraison : `node --check` sur le JS extrait + contrôle de l'équilibre des balises.

---

## 5. Reste à faire

### Dette technique
- [ ] **Arrachage de l'onglet `reperagesbis`** (« Fiche décor ») — désactivé en v695, mais ~124 réfs
      de code mort restent : `view-reperagesbis`, `modal-repbis-cfg`, `modal-repbis-pdf`, fonctions
      `_repbis*`, `REPBIS_MODULES`, `state.repbisOrder`, CSS associé.
      ⚠️ NE PAS confondre avec `modal-d2-modules` (pop-up des modules) ni `modal-d2-detail` : on les garde.
- [ ] **Renommer les identifiants internes** devenus trompeurs : `reperagesbis` → `fichedecor`,
      `d2-incl-reperages`, `d2-sousdecors-section` (⚠️ cet id désigne la NOUVELLE liste de
      sous-décors, pas l'ancien module supprimé en v681).
- [ ] Vérifier si des helpers de l'ancienne fenêtre sont devenus **orphelins** après la suppression
      v765 (`renderD2Sequences`, `renderD2Jours`, `_d2Sequences`, `_d2Jours`, `setD2DateMode`,
      `addD2Jour`…). ⚠️ Beaucoup sont **encore utilisés** par les éditeurs de modules et la modale
      photos des sous-décors → vérifier un par un avant de couper.
- [ ] **Photos des sous-décors** : dernier endroit qui dépend encore d'une ancienne modale
      (`modal-sd-photos`). L'élec, elle, est déjà inline.

### Questions ouvertes
- [ ] Nacelle **Ciseau** → présélectionner VL ? (les 2 options VL/PL restent dispo aujourd'hui)
- [ ] Rouge « nuit » : l'étendre aux **cartes** de la liste Décors et à l'**export PDF** ?
- [ ] Distance camion : si **plusieurs camions** placés, c'est celle du **premier** qui est retenue.
      Suffisant ?

### Idées fonctionnelles (discutées, pas décidées)
- [ ] **Bilan de puissance** : liste lumière vs abonnement Kva → voyant vert/rouge + répartition
      mono/tri par phase.
- [ ] **Calcul d'équilibrage triphasé** (repissage dans le neutre) — méthode validée (somme des
      écarts au min, prudente).
- [ ] **Heures de soleil** (lever/coucher/golden hour) depuis le GPS + date → calculable HORS-LIGNE.
- [ ] **Section de câble / chute de tension** depuis distance + ampérage.
- [ ] **Bloc « Intentions / discussions DP »** (le pan ARTISTIQUE du livre blanc, absent de l'app).
- [ ] **Récap matériel agrégé** sur tout le film.
- [ ] **Dupliquer un décor**.
- [ ] Distance **entre sous-décors** + temps de déplacement.

---

## 6. Vision long terme

Canal 7 = l'app **chef élec**. Idée : décliner le même patron pour **machino**, **caméra**, puis une
app **DP** qui agrège tout.

- [ ] **Séparer le SOCLE COMMUN des MODULES MÉTIER.**
      Socle : film, décors, séquences, PDT, dates, GPS, photos, sous-décors, sauvegarde/export.
      Métier élec : énergie/branchement, liste lumière, bijoute, camion/parking…
- [ ] **Décision structurante avant le natif : le partage entre métiers.**
      L'agrégation DP nécessite un **serveur + synchronisation**. Contrainte non négociable :
      ça doit **continuer à marcher hors-ligne sur le plateau** → modèle « offline-first + sync
      quand réseau ». ⚠️ Ne pas construire le serveur trop tôt : finir/durcir l'app élec d'abord.
- [ ] **« cf. régie / cf. prod / cf. DP »** : marquer un item « à confirmer avec [X] » + une liste
      « ce qu'il me reste à valider ». Prend son sens dans l'écosystème multi-métiers.

---

## 7. Repères techniques

- Fichier unique `index.html` (~20 000 lignes, HTML+CSS+JS inline), pas de build.
- `plan-feux.html` = éditeur séparé (navigation de page → **l'app redémarre** au retour).
- Photos : normalisées en JPEG à l'import (canvas), stockées en **IndexedDB** (jetons `idb:`).
- Jamais de `prompt()` (échoue en PWA installée) → modales custom. `confirm()` OK.
- Ancien module « sousdecors » (texte nom/plan/lieu) = **supprimé en v681**. Ne pas le réintroduire.
- Onglets visibles : Liste · Décors · Ponctuels · PDT · Équipe · Camion.

- [ ] Code mort (v790) : l'ancienne barre de recherche de la page Fichiers a été retirée du HTML.
      Les fonctions `setFichiersSearch` / `clearFichiersSearch` et les réfs à `fichiers-search-input`,
      `fichiers-search-clear`, `fichiers-count-line` subsistent (protégées par `if (el)`, donc inoffensives).
      La recherche passe désormais par la loupe → `openPageSearch('fichiers')` (`_PAGE_SEARCH_CFG.fichiers`).


---

## 8. Session UI (v766 → v807)

### 8.1 La BIJOUTE est devenue une section de la page « Listes »
L'onglet Bijoute **n'existe plus** : sa page, sa modale, ses fonctions et son entrée d'onglet ont été
**supprimées en v807** (~200 lignes). Elle vit désormais dans la page **Listes** :

- 8 colonnes : `BJ_Roulantes`, `BJ_Grip`, `BJ_Deports`, `BJ_Cadres`, `BJ_Toiles`, `BJ_Elec`,
  `BJ_Crmx`, `BJ_Diables` (section `LISTE_SECTIONS` avec `bijoute: true`, toujours en dernier).
- ⚠️ **Le préfixe `BJ_` est indispensable** : 5 tableaux de bijoute portent le MÊME nom que des
  colonnes de la liste de base (Grip, Déports, Cadres, Toiles, Électricité). Sans préfixe, les items
  se mélangeraient. Un item de bijoute a `cat: 'Bijoute'` + `sousCat` (voir `listeColKey`).
- Interrupteur `state.bijouteOn` (masquée par défaut) → bouton **Bijoute** en bas à gauche de la
  modale « Gérer ses listes » (`toggleBijouteSection`). Masquée aussi en **mode simple**.
- Icône SVG : `_bijouteIconSvg(size, color)` — une roulante (casier 4 curvers + poignée + roues).
- Couleurs : en-têtes de base **noires**, Conso **blanche** (+ trait bas 1.5px), bijoute **gris clair**
  avec contour gris (`LISTE_HEAD_BG`).
- La page s'appelle désormais **« Listes »** (pluriel).

### 8.2 Barres du haut unifiées (inversion simple/avancé)
Règle appliquée à Listes, Décors, Ponctuels, PDT, Équipe, Camion, Fichiers :

- **Loupe : TOUJOURS visible** (dans les deux modes), à gauche du sélecteur Simple/Avancé.
- **Mode SIMPLE** → roue crantée / bouton de tri / sélecteur d'affichage du PDT.
- **Mode AVANCÉ** → le **« + » vert**.
  ⚠️ C'est une **inversion volontaire** du comportement historique, validée par l'utilisateur.
  Conséquence assumée : **on ne peut plus rien ajouter en mode simple**.
- Page **M.e.s.** : volontairement laissée de côté (pas de loupe, pas d'inversion).

**Nouveaux tris** : Équipe (`state.equipeTri` : `poste` | `az`) et Camion (`state.camionTri` :
`type` PL→VL | `charge` utile décroissante) — `equipeSort()` / `camionSort()`.

**PDT** : le sélecteur J/S/M est devenu un **bouton rond « calendrier »** (`cal-view-btn`) ouvrant un
menu (Jour, Semaine, 1 à 6 mois). ⚠️ Le mode simple **respecte** ce choix (avant, il forçait « mois »).

**Codes couleur** : vert = ajouter · gris plein (`#d8d5d0`) = régler/trier/filtrer · transparent à
contour gris = rechercher.

**Page Fichiers** : la barre de recherche du bas a été **supprimée** → remplacée par la loupe de la
barre du haut (`_PAGE_SEARCH_CFG.fichiers`, cherche dans TOUS les fichiers du film).

### 8.3 États vides : une seule constante
`EMPTY_ICON_TOP` (= 288) pilote la hauteur de l'icône des états vides sur **les 5 pages**
(Ponctuels, Décors, Équipe, Camion, Fichiers) via `_fitEmptyState(id)`.
⚠️ Utiliser une **marge** (pas `transform`) : les conteneurs ont `overflow:hidden`, une translation
**coupait le texte** sous l'icône (bug rencontré en v797).
Avant, chaque page avait sa propre marge en dur (78 / 70 / 62 / 28 px) → jamais alignées.

### 8.4 Divers
- PDT : le jour cliqué est **mis en valeur** (encadré violet). Ne PAS re-render le calendrier au clic
  (ça effacerait le détail affiché dessous) → `_calHighlightDay()` déplace juste la classe.
- « Gérer ses listes » : le bouton **Tous** mémorise la sélection précédente (`listeHiddenCatsPrev`)
  → un 2ᵉ clic la restaure au lieu de tout masquer.
- Nom du film dans les barres : la troncature « … » est portée par `.film-sub-clic` (via
  `setFilmSub2`). ⚠️ **Ne pas ajouter de règle CSS par page** → ça doublait la marge (bug v789).


---

## 9. PROCHAINES ÉTAPES (point de reprise — 2026-07-11)

**État général** : l'app est fonctionnellement **quasi complète**. Toutes les pages, options, boutons
et fonctions attendus sont en place. Il reste de l'**optimisation d'ergonomie** et du **remplissage
de données**.

### 9.1 À optimiser (avec Claude) — PRIORITÉ
Trois écrans que l'utilisateur juge perfectibles :
- [ ] **Créer / modifier un DÉCOR** (l'édition inline du détail : ergonomie, ordre des champs, fluidité)
- [ ] **Créer un item de LISTE de base** (modale `modal-liste`)
- [ ] **Créer un PONCTUEL** (modale `modal-ponctuel`)

⚠️ **Méthode** : ne PAS théoriser. Demander à yo **ce qui le gêne concrètement** en s'en servant
(frictions réelles, gestes en trop, champs mal placés) — c'est là que sont les vrais problèmes.
Les pages **Équipe** et **Camion** sont jugées **bonnes en l'état** → ne pas y toucher.

### 9.2 À remplir (par yo, plus tard)
- [ ] Enrichir les **dropdowns** avec les vraies références du métier :
      listes de base, **bijoute**, **machinerie**.
      → C'est du scrap + vérification côté yo. **À faire vers la fin**, une fois la structure figée :
      inutile d'injecter des centaines de références dans des champs qui peuvent encore bouger.

### 9.3 Écarté volontairement (ne pas y revenir sans raison)
- **Page M.e.s.** : laissée de côté (pas de loupe, pas d'inversion simple/avancé). Assumé.
- **Photos de département → dossiers Fichiers** (idée : créer auto un dossier « Département » +
  sous-dossier « Nom du décor »). **REFUSÉ** après analyse, pour deux raisons :
  1. les dossiers de la page Fichiers sont **à plat** (`{id, filmId, side, name, order}`) —
     aucun `parentId`, donc pas de sous-dossiers sans refondre la page ;
  2. copier les photos les ferait exister **en double** dans IndexedDB → double le poids, alors
     qu'une fonction « Libérer de l'espace » existe déjà (signe que la place est comptée).
  Bénéfice jugé trop faible pour le coût. Les photos de département restent rattachées au décor.

### 9.4 Rappel : taille du projet (v807)
`index.html` = **20 168 lignes** (80 % JS / 14 % HTML / 5 % CSS), **901 fonctions**, fichier unique.
C'est gérable aujourd'hui, mais c'est **le frein n°1** le jour où l'app sera déclinée
(machino, caméra, DP) → voir §6 « Vision long terme » : **séparer le socle des modules métier**
AU MOMENT du 2ᵉ métier, surtout **ne pas dupliquer le fichier** (sinon chaque bug du socle devra
être corrigé N fois, et les apps divergeront → l'agrégation DP deviendra impossible).

---

## 10. Session UI (v808 → v843)

### 10.1 Alignement du haut des pages — UNE constante
`PAGE_TOP_LINE = 106` (px depuis le haut du viewport) + `alignPageTop(vue)` : mesure la barre du haut
réelle et calcule le padding pour que le **1er élément du contenu** tombe toujours à la même hauteur
(Décors = 1er tableau, Ponctuels = 1re ligne, PDT = barre date+flèches, Équipe/Camion/M.e.s. = 1er tableau).
Appelée au changement d'onglet, au basculement simple/avancé et au resize.

- ⚠️ **Écrire en `!important`** : `#view-liste` et `#view-calendrier` ont un `padding-top` en `!important`
  dans le CSS mobile → un style inline en JS ne passe PAS (bug v808, corrigé en v809).
- `PAGE_TOP_SKIP = ['liste','fichiers']` : pages laissées telles quelles.
- `PAGE_TOP_OFFSET = { ponctuels: -30, calendrier: -10 }` : ajustements par page.
- PDT : la barre date+flèches remonte de 10 px, **rendus en marge basse** (`#cal-nav-bar { margin-bottom }`)
  → le calendrier en dessous ne bouge pas.

### 10.2 Sous-titre des barres du haut : DEUX lignes
- **Ligne 1** = titre du film (inerte, classe `.film-sub-l1`).
- **Ligne 2** = dates de tournage `01/09 / 15/10` → **au toucher** bascule en `Chrgt: … / Rend: …`
  (classe `.film-sub-clic`, état partagé `_filmTitleState`).
- Le cycle à 3 états (titre → tournage → charg/rendus) est SUPPRIMÉ.
- ⚠️ Page Listes : ses 2 lignes sont **deux `.topbar-sub` séparés** (`#topbar-sub-liste` +
  `#topbar-sub-liste-tournage`) → `margin-top:0` sur la 2e (sinon elle tombe 2 px plus bas qu'ailleurs),
  et `refreshFilmSubs()` doit appeler `renderListeDateLine()` (sinon le clic ne rafraîchit rien).

### 10.3 Page Listes, mode simple = LECTURE SEULE
Références non cliquables, en-têtes de tableau inertes (plus d'`openListeWithCat`), titres/sous-titres
de section (LUMIÈRE, MÉTAL…) affichés dans les DEUX modes.
→ La règle CSS `.lg-section-nohead` n'est plus posée par le JS : **code mort**, à retirer un jour.

### 10.4 POST IT (PDT)
Nouvelle collection `state.postits` : `{ id, filmId, date, note }`. Couleur unique `POSTIT_COLOR = '#f5c518'`,
icône SVG `_postitIconSvg()`.
- Créé par le « + » du PDT (`calAddChoice('postit')` → `modal-postit`, z-index **400** : sinon il passe
  SOUS le détail du jour qui est en 300).
- Pastille jaune sur la case du calendrier, **en dernier** (ordre : noir, rouge, violet, jaune).
- Filtre « Post it » jaune à droite de Renforts (haut + bas), texte noir (illisible en blanc).
- 1re section du détail du jour + section en bas de la vue Jour.
- Ligne **POST IT** en dernier dans le PDF « Pdt Électro ». ⚠️ La largeur des colonnes-jours est
  désormais FIXÉE, sinon une note longue élargissait sa colonne au lieu de revenir à la ligne.
  **Limite connue** : les colonnes du PDF sont les jours qui portent au moins un décor → un post-it
  posé sur un jour sans décor n'apparaît pas dans le PDF.
- Branché sur l'export film-par-film, l'import (copie conforme, `COLS`) et `deleteFilm`.

### 10.5 Calendrier : cases de hauteur STABLE
Les 4 rangées de points sont **toujours rendues** en mobile portrait ; une catégorie sans point laisse
une ligne vide de même hauteur (`_dotRow(items, colorFn, reserve)`). Avant, décocher un filtre
changeait la hauteur des cases → le calendrier « sautait » et les points changeaient de ligne.

### 10.6 Divers
- Vue **Jour** du PDT : plus de pop-up détail (doublon). Ce qui n'existait que dans le pop-up a été
  rapatrié : post-it, **type** du décor, **dates** du décor. Le clic mène à la fiche (`calGotoRef`).
- Détail du jour : décors = **point rond noir** aligné sur la ligne du nom (avant : carré gris centré).
- Renforts : `_membrePhotoSrc(m)` retrouve la photo par le nom si la fiche du calendrier ne la porte pas,
  et ignore un jeton `idb:` non ré-hydraté. **Sans photo → aucun avatar** (plus de rond d'initiales).
- Page Ponctuels (carte mobile) : ordre des lignes = nom · accessoires · durée/dates · décor · **effet** ·
  **adresse** · **transport** (icône camion, `td.pt-transp`, masquée sur web : le `thead` n'a que 9 colonnes).
- Roue crantée de la barre d'onglets : centre creux, comme les autres roues.

---

## 11. DÉCISION EN ATTENTE — menu « + » du PDT (v843)

Les boutons **Nouveau décor / Nouveau ponctuel / Nouveau renfort** du pop-up « Ajouter un nouveau »
(`modal-cal-add`) sont **masqués** (`display:none`) — **PAS supprimés**. `calAddChoice()` garde ses
branches `decor` / `ponctuel` / `renfort` : il suffit de remettre leur `display:flex`.

Seul **Nouveau POST IT** reste visible. Trois issues possibles, à trancher :
1. les **remettre** tels quels ;
2. les **supprimer** pour de bon (HTML + branches de `calAddChoice`) ;
3. remplacer « Nouveau renfort » par un **pop-up de choix : renfort + décor + date** (idée évoquée) —
   sélection d'un membre existant (`state.equipe` du film / `state.savedMembers`), d'un décor du film et
   d'une date → ajout d'une période au membre : `m.periods.push({ du, au, decor })`, ce qui suffit à le
   faire apparaître dans le calendrier (`equipeDayMap`).
