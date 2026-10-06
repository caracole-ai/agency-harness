# Plan — construire le harnais, sécurité privée comme premier cas

## Contexte

La réflexion (`REFLEXIONS.md`, piste A), la méthode (`methode/`) et la page
`presentation/schema-harnais.html` décrivent un moteur qui n'existe pas encore
(README : « Moteur — à venir »). On le construit maintenant, la PME de sécurité
privée servant de premier cas, en suivant l'ordre de la section 10 de la page :
**Veiller d'abord, sans aucun modèle**, puis la machine à états et l'approbation
sur le désistement, puis le modèle aux bords.

**Critère de succès du premier jalon** : sur un planning et un fichier de
titres fictifs, `pnpm veiller --date 2026-10-05` sort la liste des alertes
(I-01, I-04, I-05, I-17, I-19…) avec règle, motif et source, et tous les
T-xx de ces interdits passent, ainsi que les tests du calendrier tirés de deux
autres métiers.

Je prends la section 11 de la page comme validée, sauf ce que je tranche
ci-dessous (contestable, voir « Décisions »).

---

## Trois idées qui structurent le plan

1. **Pas de deuxième liste de règles.** Coder I-01 en dur dans un `.ts`
   pendant que la fiche porte I-01 en prose, c'est exactement les « deux
   listes » refusées le 03/10. Mais on ne génère pas le corps d'une fonction
   depuis de la prose. Donc la piste G, réduite à ce que le moteur demande :
   un **registre** structuré (ID, texte, moment, statut, source, lectures) qui
   fait foi, les tables de la fiche régénérées depuis lui, et un contrôle qui
   échoue si un interdit `code` n'a pas d'implémentation, si un T-xx n'a pas de
   scénario, ou si une fonction implémente un ID inconnu.

2. **Le statut d'une règle borne son verdict, mécaniquement.** La grille dit
   qu'une hypothèse ne sert jamais à construire ; le moteur l'applique :
   - `texte` ✓ → peut rendre `refus` ;
   - `texte` sans ✓ → au plus `à vérifier` tant qu'il n'est pas relu ;
   - `hypothèse` → pas de contrôle, une question.
   Et une règle ⚠ (deux textes en vigueur) porte **plusieurs lectures**,
   dont **une de référence** qui décide seule du verdict : par défaut la loi
   générale. Les autres sont signalées en note quand elles concluent
   autrement (décision de Lionel, 2026-10-05, qui remplace « refus si toutes
   les lectures violent »). Repos de 8 h : refus. 11 h 30 : ok, avec la note
   de l'accord de 1993 (12 h). 10 h 30 au passage de nuit à jour : refus,
   avec la note de la CCN 7.01 (10 h). La config client pourra désigner une
   autre référence : sa politique, recueillie au premier rendez-vous. La
   même forme sert au dimanche de L133-3 (transport) ou aux 5/10 ans
   (avocats).

3. **Chaque composant dit son étage, et la généricité se prouve par des
   tests d'autres métiers, pas par du code d'autres métiers.** Le calendrier
   est testé avec L133-3 (transport) et CPC 640-643 (avocats) sans écrire ces
   métiers ; la machine Veiller avec une échéance de transport fictive. Si
   ça ne passe qu'avec la sécurité, l'abstraction est fausse et on le voit
   tôt.

---

## Où vit le code

Dans ce dépôt, chaque couche du tableau du README dans son dossier :

```
moteur/                         générique (@harnais/moteur)
  src/temps/                    calendrier, fériés, délais, valide_a
  src/regles/                   registre, schéma, verdicts, lectures multiples
  src/controles/                exécution par moment, fermé en cas d'échec
  src/etats/                    table état × événement, 3 sorties d'échec
  src/journal/                  SQLite en ajout seul, coûts
  src/approbation/              délégation, jeton
  src/archetypes/veiller/       machine Veiller paramétrée
metiers/securite-privee/
  fiche.md                      tables 1, 2, 4 régénérées depuis le registre
  regles.yaml                   source : interdits, escalades, lectures
  scenarios/T-01.yaml …         source des tests : données + attendu
  code/                         @harnais/securite-privee : sémantique, interdits
exemples/client-fictif/         config.yaml + CSV fictifs, versionnés
clients/<slug>/config.yaml      vrai client, jamais versionné (déjà ignoré)
```

Stack, par cohérence avec Attendu (`../attendu`) : pnpm workspace, TypeScript
strict, zod, Biome, Vitest. Dates : Temporal (polyfill sur Node 22) ou
date-fns + tz — à trancher avec Context7 en phase 2, le critère étant le calcul
en instants et l'affichage en Europe/Paris. Journal : `node:sqlite` si stable
sur Node 22.22, sinon better-sqlite3.

`../agent-guardrails` n'est pas une amorce de code : il **échoue ouvert**
par conception, le moteur doit échouer fermé. On n'en reprend que l'idée des
moments. Le README sera corrigé sur ce point.

---

## Phases

### Phase 0 — Socle du dépôt (½ jour)
- Réparer pnpm (corepack cherche un pnpm 12.4.2 absent) ; épingler la
  version dans `packageManager`.
- Workspace, `tsconfig.base.json`, `biome.json`, Vitest, script `pnpm check`
  (lint + types + tests + cohérence du registre).
- **Relecture à la source avant de coder** (hygiène de REFLEXIONS) : R631-15
  (le décret 2025-1344 a dû basculer depuis le 01/10 : téléservice ouvert ?),
  et pour Veiller les interdits encore sans ✓ (I-02, I-03, I-12). Cass. soc.
  16/09/2026 sur le MAC. Résultat dans `verification-2026-10-XX.md`, ✓ mis à
  jour dans la fiche.

### Phase 1 — Le registre (piste G réduite)
Étage : schéma générique dans `moteur/src/regles`, données métier dans
`metiers/securite-privee/`.
- Schéma zod d'une règle : `id`, `texte`, `etapes`, `moment`
  (pre-tool | post-tool | pre-response | stop), `verifiable_par`, `statut`,
  `relu` (bool + date), `lectures[]` (pour ⚠), ~~`levee`~~ (retiré le
  2026-10-06 : rien ne s'en servait, il reviendra avec la piste B), `source`, et les champs que la
  figure du site demandera (nom court, place dans le tour) laissés optionnels.
- Schéma d'un scénario T-xx : `etant_donne` (prose + données), `quand`,
  `alors` (verdict attendu + motif), `interdits`, `statut`, `source`.
- `regles.yaml` et `scenarios/*.yaml` remplis depuis les tables actuelles de
  la fiche (I-01 à I-21, E-01 à E-10, T-01 à T-24), sans rien changer au fond.
- Script `generer-fiche` : réécrit les tables 1, 2, 4 de `fiche.md` entre
  marqueurs. Le skill `entretien-metier` lit toujours `fiche.md` : il ne
  change pas.
- Script `verifier-registre` : couverture interdit ↔ scénario ↔
  implémentation, codes cités par `prospection.md`, `entretien.md`,
  `observation.md` existants (rend permanent le script d'une ligne du 30/09).

Le registre ne porte **que** les rubriques 1, 2, 4. Vocabulaire, données,
briques restent en prose jusqu'à ce qu'un composant en ait besoin.

### Phase 2 — Le calendrier juridique (socle § 2)
Étage : générique. Le premier composant, celui qui sert aux quatre métiers.
- Jours fériés France (fixes + Pâques), avec la variante Alsace-Moselle en
  paramètre (sinon un client de Strasbourg aurait des délais faux).
- Décompte calendaire, ouvrable, ouvré, franc ; report au jour ouvrable
  suivant ; exclusions paramétrables (dimanches, fériés, jour de départ).
- `valide_a(historique, date)` : titre ou version valide à un instant, avec
  le cas « couvert par un récépissé ».
- Intervalles en instants : vacation à cheval sur minuit, nuit du changement
  d'heure (une vacation 21 h–7 h dure 9 ou 11 h réelles), période glissante
  (48 h / 7 jours, 46 h sur 12 semaines).
- Tests : ceux de la sécurité, plus L133-3, CMR art. 30 et CPC 640-643 comme
  preuves de généricité.

### Phase 3 — La couche sémantique et les interdits de la sécurité
Étage : métier (`metiers/securite-privee/code`).
- Modèle canonique zod : Agent, Titre (carte pro, carte entreprise, SSIAP,
  MAC, secourisme), Site, Poste, Vacation. Notions dérivées en fonctions
  pures : `carte_valide_a`, `qualifie_pour(poste)`, `repos_avant`,
  `heures_sur(periode)`, `delai_de_prevenance`.
- Un interdit = une fonction pure `(contexte) → Verdict`, rattachée à son ID ;
  le moteur plafonne le verdict selon le statut (idée 2), jamais la fonction.
- Périmètre : les interdits que Veiller et le désistement exigent — I-01,
  I-02, I-03, I-04, I-05 (⚠, lecture de référence et lectures signalées),
  I-20. **Fait le 2026-10-05**, avec trois écarts : I-17 passe en phase 4
  (c'est une alerte d'échéance, pas un verdict sur une affectation) ; I-19
  reste hors périmètre (la paie, B-06) ; I-05 est codé en partie (repos
  minimal, durée maximale), le reste (amplitude, 48 h par semaine, 46 h sur
  12 semaines, repos après 48 h) est déclaré `nonCouvert` et affiché par
  `registre:verifier`. I-06 attend la phase 5 (il lui faut l'historique des
  modifications et des accords). Les autres attendent leur brique.
- Connecteur de lecture : un adaptateur CSV « format agence » vers le modèle
  canonique. On n'a vu aucun tableur client : ce format est un échafaudage,
  le vrai adaptateur s'écrira chez le premier client, le modèle canonique ne
  bouge pas.

### Phase 4 — Veiller, livrable sans modèle ← **premier jalon** (fait le 2026-10-06)
Étage : archétype générique, paramétré par le métier.

**Écarts à ce qui suit** : pas de machine à états pour Veiller (un rapport
calculé en une passe n'en a pas besoin ; le cycle de vie d'une alerte —
envoyée, acquittée, relancée — viendra avec le moteur d'états de la phase 5).
Une fenêtre par échéance a deux durées : `alerter` (quand prévenir) et
`preparation` (en dessous, escalade). I-19 reste hors périmètre (paie).
Le rapport a une section « Conforme, à noter » : ce que la loi accepte et
qu'un autre texte refuserait (décision de Lionel : on signale).
- Machine Veiller (5 à 6 états) en table : `source lue → échéances calculées
  → alertes → notifiées | escaladées`. L'avance d'une alerte = délai de
  préparation (MAC avant J-90), une date absente déclenche sa propre alerte.
- Deux usages sur la sécurité : échéances des titres (B-03) et audit du
  planning publié contre I-01 à I-05, I-19, I-20 (« un script qui lit le
  planning et dit ce qui cloche »).
- Sortie : rapport lisible (CLI + Markdown), chaque ligne avec règle, motif,
  source, verdict. Journal SQLite dès ici.
- Config client validée au démarrage (`exemples/client-fictif/config.yaml`) :
  un seuil manquant arrête le boot.

### Phase 5 — Le désistement : machine à états, délégation, approbation
Étage : générique (machine, échecs, jeton) + métier (table de délégation type).
- Moteur d'états : table en donnée, trois sorties d'échec écrites une fois,
  transition « trop tard » sur l'échéance de la demande, état persisté et
  reprenable. Format compatible statechart, XState seulement si la hiérarchie
  l'exige.
- Contrôles montés aux quatre moments, fermés en cas d'erreur ou de délai.
- Candidats : filtre par les interdits, classement par les poids de la config
  (pas de solveur : il ne sert qu'au planning hebdomadaire B-01, hors plan).
- Délégation `action × condition → rôle`, rôle suivant si absent ; jeton lié
  au contenu exact de l'affectation ; écriture refusée sans jeton.
- I-06 et E-09 (accord de l'agent sous le délai) entrent ici.
- Entrée structurée à la main (CLI) : pas encore de message libre.
- Exposition MCP du moteur pour le piloter depuis Claude Code.

### Phase 6 — Le modèle aux bords
- Interface à nous : `extraire`, `rediger`, `classer`, `douter` ; un premier
  adaptateur fournisseur choisi à ce moment (Mistral par cohérence avec
  Attendu et G-06, pas exclusif).
- Sorties validées par schéma, deux échecs → `à vérifier` avec le message
  brut. Journal des tokens et du coût par appel, plafond mensuel dans la
  config, alerte Veiller à l'approche.
- Coût par unité annoncé avant de coder (décision du 04/10).
- Évals : skill `eval-audit` avant de déclarer le pipeline testé ; les
  traces réelles n'existent qu'après un client, donc d'ici là un jeu de
  messages fictifs, explicitement marqué comme tel.

### Phase 7 — Veille des textes et canal fabricant (avant la première livraison)
Étage : générique. Destinataire : l'ingénieur du harnais, jamais le client.
- Chaque règle `texte` ✓ porte l'identifiant de ses articles (LEGIARTI,
  KALIARTI) et la date de la version relue. Une fois par mois, un script
  interroge Légifrance par l'API PISTE (compte à créer par Lionel) et
  compare les versions ; ce qui n'a pas d'API (FAQ du CNAPS) reste une
  relecture manuelle, rappelée par le même canal.
- Le canal fabricant : un connecteur sortant (Telegram, par exemple) depuis
  chaque harnais livré, écrit par nous. Il porte : texte changé, veille en
  retard, connecteur en panne, contrôle en échec. Aucune donnée du client
  dans un message (identifiants de règle, codes, comptages seulement), et
  aucune commande reçue par ce canal : il ne sert qu'à recevoir des
  notifications. Telegram ne chiffre pas de bout en bout et passe par un
  tiers (G-06, G-07).
- Une mise à jour du harnais suit le chemin habituel : registre, tests,
  `pnpm check`, livraison.

**Hors plan, volontairement** : le solveur (B-01), le connecteur WhatsApp,
l'écriture dans un vrai tableur, la génération de `smart-tailor/harness.ts`
et des vues terrain depuis le registre, les trois autres métiers, et **la
mise à jour d'un harnais livré à distance** (une étape ultérieure du projet,
à trancher avant la livraison d'un vrai client). Chacun a sa place dans
REFLEXIONS ; aucun ne bloque les phases 0 à 5.

---

## Décisions que je prends (à contester)

| Décision | Pourquoi |
|---|---|
| Code dans ce dépôt, une couche = un dossier | la fiche et le code qui l'applique se diffent ensemble ; le registre vérifie les deux dans le même `pnpm check` |
| TypeScript, pnpm, zod, Biome, Vitest | cohérence avec Attendu ; zod et MCP natifs |
| ~~Règle ⚠ = plusieurs lectures, `refus` seulement si toutes violent~~ | abandonné le 2026-10-05 par Lionel |
| Règle ⚠ = une lecture de référence (la loi générale) qui décide, les autres en note | on se fie à la loi générale, on signale les autres textes ; la politique du client tranchera au premier rendez-vous |
| Statut → verdict maximal, appliqué par le moteur | une hypothèse ne peut pas bloquer, même par erreur de code |
| Registre limité aux rubriques 1, 2, 4 | ce que le moteur lit ; le reste quand un composant le demande |
| Identité d'écriture du moteur + jeton par défaut, compte de l'humain en option de config | les deux rendent G-06 visible ; la variante forte se choisit par client |
| Pas de solveur avant B-01 | le désistement se résout par filtre + classement |

## Effets de bord anticipés

- **`fiche.md` devient en partie générée.** Toute édition à la main des
  tables 1, 2, 4 sera écrasée : le README et `GRILLE.md` le diront, et
  `pnpm check` échoue si la fiche a dérivé du registre.
- **Le skill `entretien-metier`** lit `fiche.md` : inchangé tant que le
  format des tables reste le même ; ses évals se relancent après la phase 1.
- **Les textes bougent** : la fiche a vu trois modifications en 2026, R631-15
  vient de basculer. Le champ `relu` porte une date ; une relecture de plus
  d'un mois est une alerte « veille en retard » **pour l'ingénieur du
  harnais**, jamais un verdict dégradé chez le client (décision du
  2026-10-05). La veille automatique est la phase 7.
- **Aucune donnée réelle** : tout ce qu'on construit tourne sur du fictif ;
  le format CSV est jetable, le modèle canonique et les interdits ne le sont
  pas. Premier rendez-vous = première correction du modèle canonique.
- **Rien de client dans `exemples/`** : prénoms et sites fictifs, vérifiés à
  la relecture de chaque commit.

## Documentation à tenir

README (couche Moteur : où, comment lancer), `GRILLE.md` (tables générées,
colonnes `moment`, `lectures`, `parametres`), `REFLEXIONS.md` (piste A en cours,
G partielle, B posée, décisions ci-dessus datées du 2026-10-05), un
`moteur/README.md` court.

## Vérification

- `pnpm check` vert : Biome, `tsc --noEmit`, Vitest, `verifier-registre`.
- Chaque T-xx des interdits couverts rejoué depuis son YAML ; I-05 testé sur
  8 h (refus), 11 h 30 (ok + note), 10 h 30 au passage de nuit à jour
  (refus + note), 13 h (ok).
- Calendrier : tests L133-3, CMR 30, CPC 640-643, nuit du 25/10/2026
  (passage à l'heure d'hiver), vacation 21 h–7 h.
- `pnpm veiller` sur `exemples/client-fictif` : rapport relu à l'œil, chaque
  alerte attendue présente, aucune en trop.
- Phase 5 : scénario du désistement de la page (Karim, 17 h, vacation 21 h)
  rejoué de bout en bout en CLI, y compris non, absence de réponse et
  « trop tard » ; écriture sans jeton → refus.
- `generer-fiche` puis `git diff metiers/securite-privee/fiche.md` : vide
  après la phase 1 (le registre reproduit la fiche telle quelle).
