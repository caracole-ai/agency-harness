# Audit anti-over-engineering (2026-10-14)

Lecture seule de tout le dépôt (`moteur/`, `metiers/*/code/`, `interface/`,
les plans, l'état git), par quatre sondes indépendantes ; une douzaine
d'affirmations à fort impact revérifiées à la main. Base au départ :
`general/masquer-remplacees` (21bf873), `pnpm typecheck` et `pnpm test`
verts. Chaque constat porte un chemin et une ligne, un gain estimé et une
confiance (sûr / probable / à vérifier). Rien n'a été modifié.

Ne sont pas comptés comme de la sur-ingénierie : les portes (G1,
revalidation, préflight, fuite), les interdits, la clé d'accord, « aucun nom
au modèle ». Ce sont des décisions, pas du code en trop.

## Verdict en cinq lignes

1. **Le code est sain module par module.** Peu d'abstractions sans emploi ;
   celles qui n'ont qu'une implémentation sont les contrats du moteur
   agnostique, voulus. Rien à refondre.
2. **Le poids est historique, pas structurel** : deux strates abandonnées
   restent dans le code (la promotion gelée, ≈ 3 700 lignes de source et
   4 000 de tests ; l'accès GMI, ≈ 130 lignes) et inversent des dépendances
   (la ronde importe la promotion, le contrat `Modele` porte un fournisseur
   disparu).
3. **La vraie sur-ingénierie est documentaire** : ≈ 3 700 lignes de plans
   entièrement exécutés, un README dont la section « Structure » est un
   changelog de 380 lignes, la liste des commandes écrite trois fois, huit
   contradictions (GLM encore « au quotidien », promotion décrite active,
   phase D « en cours »).
4. **Les deux métiers divergent par le contenu, pas par la forme** : ≈ 450
   lignes nettes à gagner, surtout en cohérence (deux machines à états
   recopiées, le squelette d'un contrôle réécrit par métier, trois formats de
   nombres).
5. **Le dépôt traîne** : 36 branches fusionnées, 3 worktrees d'il y a une
   semaine (trois copies de l'arbre), 204 tableaux d'évals sur 215 jamais
   cités.

## 1. Deux strates abandonnées (décision de Lionel)

### 1.1 La promotion gelée : retirer ou isoler

Mort si le gel dure : `moteur/src/promotion/fabriquer.ts` entier sauf la
vérification en code (`rejouerTest`, `verifierGeste`, appelés par
`cli/evals.ts:248` et `atelier.ts:22`) ; `promouvoir.ts` entier ; dans
`promotion.ts` : `intentions`, `aProposer`, `ecrireDossier`,
`purgerInstantanes`, `resumeCout`, `compterFabrications` ;
`cli/promotions.ts` ; les branches `promotion` et `gestes` de
`cli/evals.ts:201-263, 343-439` ; `conversation/config.ts:51-63`
(`plafonds.fabrication`, `promotion.*`, exigés par un `strictObject` chez
tout client) ; `echappee/reponse.ts:225-234` (`citations`), dont le seul
lecteur hors tests est `fabriquer.ts` ; `NON_QUANTITES` et `nonQuantites`
restent, lus par `contient`.

Vivant, à garder : `promotion/atelier.ts` (onglet « Appris », `pnpm gestes`)
et `gestes/` : un geste appris est une donnée activée par un humain, c'est le
format du futur « retiens ça ».

Ce que la nuit porte encore pour elle : `chantier/nuit.ts:111-124` (l'étape
`promotions`, que la phase E retire), `ronde/ronde.ts:135-153, 176-195`
(« promotion en cours »), `chantier/mission.ts:81-84`,
`ronde/rapport.ts:195-204`, `nuit.ts:27` : ≈ 70 lignes sans objet.

Couplage inversé à défaire d'abord, quel que soit le choix : `dollars`
(`promotion.ts:222`) est importé par `chantier.ts`, `ronde.ts` et les CLI ;
`suiteDe`, `TYPE_PROMOTION` (`promotion.ts:246, 25`) par `ronde.ts:31`,
`resume.ts:9`. `dollars` va dans `modele/modele.ts` à côté de
`cout`, `suiteDe` et `TYPE_PROMOTION` dans `echappee/` ou `journal/`. La
promotion devient une feuille qu'on retire d'un bloc.

Gain : ≈ 2 000 lignes de source et 2 500 de tests si on retire ; une
frontière nette si on isole. Sûr.

### 1.2 GMI : ≈ 130 lignes qui ne servent plus qu'à un fournisseur abandonné

- `modele/anthropic.ts:12-16, 30-36` (`AccesModele { url, bearer }`,
  `baseURL`, `authToken`), `:63-83` (`usageBorne`), `:99-108`
  (`variable_cle`) ; `conversation/config.ts:10, 27-41` (`AUTHENTIFICATIONS`,
  `acces: { url, authentification, variable_cle }`) ;
  `modele/modele.ts:57-75` (`flux?`, `usageBorne?` dans le contrat).
- Propagé jusqu'à `fabriquer.ts:167-178, 818-874, 915-922`,
  `promouvoir.ts:168`, `promotion.ts:57, 204` (`cout_borne`),
  `compteur.ts:56` (`usage_borne`).
- « GMI ignore `strict` » : `fabriquer.ts:401-436` (`relireNuls`,
  `nulEnTexte`, 36 l.), `traduire.ts:89-100, 128-129` (`nullEnTexte`, double
  parse). Anthropic et le binaire imposent le schéma.
- `unSeulOutil` toujours `true` (`traduire.ts:153, 218`, `boucle.ts:260`,
  `ronde.ts:332`, `fabriquer.ts:866` ; vérifié : aucun `false`) : un champ du
  contrat `Modele` branché dans `anthropic.ts:47-49` et
  `abonnement.ts:32-69`. À coder en dur.
- Tests `anthropic.test.ts:92-139` (Bearer, flux, borne).
- À garder : `traduire.ts:106-108` (plusieurs outils → « inconnue ») et
  `simule.ts:12` : une garde contre un modèle qui désobéit, pas un
  contournement de fournisseur.

Décision : « Anthropic par clé ou par abonnement, rien d'autre » ; `acces`
devient `{ binaire } | absent`. Les deux clients fictifs sont déjà en
`{ binaire: claude }`. Sûr.

### 1.3 La compat « ancienne graphie `agent` »

`conversation/roles.ts:56-108` (la branche `agent` d'`IdentiteSchema`,
`identifiantRecu`, `personneLue`, `CHAMPS_PERSONNE`, `avecPersonne`),
`gestes/geste-appris.ts:69-117, 150-163` (`agent` dans `TestAppris`,
`ModificationsAnciennes`, `modificationsNormalisees`), `cli/parler.ts:33,
57-59` (`--agent`), et cinq appelants. Les seules données qui l'exigent : 30
clés `agent:` dans `metiers/securite-privee/evals/{consignes,echappees,gestes}.yaml`
et `gestes.yaml:82` (`reaffecter: { vacation, agent }`). L'agence, les deux
`personnes.yaml` et les journaux (non versionnés) sont déjà en `personne`.

Un `sed` sur ces trois fichiers, puis la suppression de la double lecture :
≈ 100 lignes. Sûr sur le code ; les fichiers d'évals ne se touchent pas sans
Lionel (ce n'est pas une étiquette, mais c'est la règle).

### 1.4 Le niveau 2 de désignation (`designer`)

`traduire.ts:158-225`, `conversation.ts:676-705`, `designation.ts:54-73`
(`clePhonetique` maison, `distance`, `formesLarges`) : ≈ 90 lignes et un
appel au modèle par mention, suspendus à la question ouverte R-2 (HANDOFF,
« Ouvert »). Si « aucun nom au modèle, même proche » : tout tombe, `proches`
reste pour la question du niveau 3. Noté, pas proposé : c'est sa décision.

## 2. La documentation

### 2.1 Les plans : ≈ 3 700 lignes exécutées

| Fichier | Lignes | État | Proposition |
|---|---|---|---|
| `PLAN.md` | 348 | phases 0-6 faites, 7 reprise par G9 | archiver (`git show`) |
| `PLAN-ESPACES.md` | 1 183 | lots 0-7 faits, § 8 remplacé | archiver |
| `PLAN-PROMOTION.md` | 579 | lots 0-4 faits, gelée | archiver |
| `PLAN-PSEUDONYMES.md` | 281 | lots 0-3 faits, § 10 porté par HANDOFF | archiver |
| `PLAN-RONDE.md` | 489 | lots 0-3 faits, phase E dans PLAN-GENERAL | archiver |
| `PLAN-CHOIX.md` | 136 | S9 fusionnée, § 4 repris par HANDOFF | archiver |
| `SESSION-D.md` | 119 | consignes D1/D2, exécutées le 2026-10-11 | supprimer |
| `PLAN-METIER-2.md` | 671 | lots 1-4 faits ; **§ 10 (sept points à trancher) que rien d'autre ne porte** | déplacer § 10 dans REFLEXIONS « À trancher », puis archiver |
| `PLAN-GENERAL.md` | 286 | vivant : phases E-I (`:191-238`), G6-G11 ; mais § 1 (`:84-100`) daté du 2026-10-10 et faux | garder, supprimer § 1 |
| `REFLEXIONS.md` | 614 | vivant : « Décidé », « Pistes », « À trancher » ; les six « Fait (date) » (`:62-359`, ≈ 300 l.) sont un changelog | garder les trois, archiver les « Fait » |

Les six blocs « Règles de travail pour la session » (`PLAN-ESPACES.md:33-67`,
`PLAN-PROMOTION.md:56-90`, `PLAN-PSEUDONYMES.md:54-81`,
`PLAN-RONDE.md:121-150`, `PLAN-METIER-2.md:67-131`,
`PLAN-GENERAL.md:49-83`) disent la même chose en six rédactions : celui de
PLAN-GENERAL suffit.

HANDOFF a déjà tranché ce principe pour l'ancien handoff (`HANDOFF.md:4-6`).
Trois fichiers restent : HANDOFF, PLAN-GENERAL, REFLEXIONS resserré.

### 2.2 README : « Structure » est un changelog

`README.md:25-406` (380 lignes) ; le seul bullet `moteur/` fait `:134-307`
(173 lignes, une phrase) ; 24 dates, 7 « lot n », « Pour l'instant : »
(`:135`), « Depuis `PLAN-ESPACES.md` : » (`:152`). Forme cible : un tableau
d'une ligne par dossier de premier niveau, et une ligne par sous-dossier de
`moteur/src/` avec sa responsabilité : ≈ 60 lignes. Le quand : `git log`. Le
reste : HANDOFF.

### 2.3 Les commandes, écrites trois fois

`package.json` (18 scripts, la source), `README.md:410-537` (128 lignes
commentées), `HANDOFF.md:119-132` (12 commandes). HANDOFF omet
`registre:verifier`, `remplacer`, `rapport:html`, `evals ronde`, `chantier
retirer`, `fictif`. Que HANDOFF ne garde que `pnpm check` et renvoie au
README.

Dans `package.json` : `NODE_OPTIONS=--disable-warning=ExperimentalWarning
tsx …` répété douze fois ; les scripts `remplacer` et `fictif` des métiers
passent par `cd "${INIT_CWD}" && tsx "$OLDPWD/…"` pour retrouver la racine.
Un script racine par CLI de métier (`tsx
metiers/securite-privee/code/src/cli/remplacer.ts`) les remplace, si
`remplacer` survit (§ 5.1).

### 2.4 Contradictions à corriger (sûr, chaque ligne lue)

- `agence.yaml:4` : « sa config désigne son modèle (GLM-5.3) ».
- `README.md:86` : « GLM reste au quotidien » ; `:200` : « que GMI ignore » ;
  `:455, 462, 472-473` : coûts « avec GLM-5.3 ».
- `README.md:65-66` : « D en cours : D1 faite, D2 à faire » (faite le
  2026-10-11, dit cinq lignes plus bas).
- `README.md:51-64, 217-266`, `interface/public/index.html:85` : la promotion
  décrite active ; « gelée » n'apparaît que dans HANDOFF et REFLEXIONS.
- `PLAN-GENERAL.md:84-100` : état du 2026-10-10.
- `HANDOFF.md:128` : `pnpm evals` sans `ronde`.
- `memoire/MESURES.md:5-12` : tableau « écrit à la main par S5 » sous
  l'en-tête « écrite par le code ».

### 2.5 `methode/` et `memoire/`

`methode/` : quatre fichiers lus par le code ou ses commentaires ;
`audit-second-metier-2026-10-12.md` est l'entrée de PLAN-METIER-2
(archivable avec lui) ; `verification-2026-10-06.md` reste (source d'une
lecture). `memoire/` : trois fichiers de 4 à 12 lignes, deux `.gitkeep`, une
ronde de 7 lignes, support de `chantier/memoire.ts` (432 + 269 lignes de
tests) : vide tant que la phase E ne tourne pas, utile dès la première nuit.
À laisser.

## 3. Le dépôt

- **36 branches locales fusionnées dans `main`** (`git branch --merged
  main`) : `espaces/*`, `metier-2/*`, `promotion/*`, `pseudonymes/*`,
  `general/*` sauf la courante, `moteur-securite`, `travail-lot5/7`,
  `worktree-agent-*`. `git branch -d` ne supprime que ce qui est fusionné :
  sans risque. Cinq non fusionnées (`metier-2/lot-4-n`, `s3/h`, `s3/i`,
  `s3/j`, `s3/k`, un commit chacune) : des branches de sous-agents dont le
  contenu est dans `main` sous d'autres commits. `-D` à confirmer par Lionel.
- **Trois worktrees morts** dans `.claude/worktrees/` (`f39ec99`, `1101237`,
  `f7c60b3`, tous ancêtres de `main`, datés de la semaine « Espaces ») :
  trois copies de l'arbre. `git worktree remove` × 3 puis `prune`.
  HANDOFF:115 les présente comme un piège plutôt qu'un déchet.
- **`evals/resultats/`** : 215 fichiers versionnés, 11 cités par HANDOFF,
  REFLEXIONS, README, les plans ou `erreurs-*.md`. Garder les `apparie-*` et
  les cités, archiver le reste ; et n'écrire dans `resultats/` que la mesure
  finale d'une session (c'est la méthode de HANDOFF:49-50). `evals/traces/` :
  102 Mo ignorés, à purger à la main.
- `entretien-metier-workspace/` (676 Ko, ignoré) et `presentation/` (131 Ko,
  instantané de conférence du 2026-10-05, exclu de Biome) : archivables.

## 4. Le contrat moteur ↔ métier, plus large que nécessaire (probable)

- **La session** : `MetierConversation` (`conversation.ts:71-121`, vingt
  membres) exige `ouvrir`, `fermer`, `config`, `client`, `journal`,
  `ouvrirJournal` ; les deux métiers les écrivent pareil (`securite
  conversation.ts:257-287` + `remplacement.ts:79-98`, `agence
  conversation.ts:42-74, 252-266`) ; `Cible`/`cibleDe`
  (`conversation.ts:271-278`) ne servent qu'à reconstituer `{ client, journal
  }` ; `cli/parler.ts:75-77` ouvre un journal pour lire la config puis le
  ferme. Une `SessionMetier<Config, Ctx>` construite par le moteur
  (`ouvrirSession(dossier, { schema, lire })`), le métier ne fournit plus que
  `schema` et `lire` : ≈ 80 lignes sur les deux métiers, cinq membres de
  moins.
- `tableau.nom` calculé pareil dans les deux métiers (`securite
  conversation.ts:201-202`, `agence conversation.ts:318-319`), dérivable de
  `m.noms(s)` + `roleDe().enMots` ; `demandes`/`enAttente` vides chez
  l'agence ; `conditions` propre à la sécurité : des optionnels à défaut vide.
- `MetierVeiller.sections` (`archetypes/metier.ts:43`) ne reçoit pas le
  registre : `agence veille.ts:722` le relit sur disque à chaque rapport.
- Le rapport exige un interdit par alerte : l'agence tient
  `INTERDIT_DE_L_ECHEANCE` avec des `null`, coupe ses échéances en deux et
  rejoue `veiller` avec un faux interdit (`agence echeances.ts:42-53,
  234-240`, `veille.ts:727-730`). Admettre `Echeance.regle: null` et une
  section « hors des règles vérifiées » générique dans
  `archetypes/rapport.ts` : ≈ 40 lignes de contorsion en moins. À vérifier
  (touche le rapport et son test).
- `Vocabulaire` (`traduire.ts:30-33`) : une interface à un champ,
  `vocabulaire(s, id).noms` partout.
- `regles/schema.ts:53, 210, 256` : `MOMENTS` et le champ `moment`, déclarés
  par six interdits de la sécurité, lus par aucun code (vérifié : seule la
  déclaration zod cite `moment`). Champ mort du schéma.
- `moteur/src/index.ts` : 59 `export *` ; une cinquantaine de symboles ne
  sont importés par aucun fichier non-test hors de leur module ; tout
  `ronde/*`, `promotion/promouvoir`, `temps/feries`, `regles/veille`,
  `echappee/requete` ne sont importés ni par l'interface ni par un métier.
  Une liste explicite de ce que les métiers et l'interface importent : zéro
  ligne gagnée, mais une frontière d'API qui n'existe pas aujourd'hui.

## 5. Duplication mécanique, par zone (sûr sauf mention)

### 5.1 Dans les deux métiers (≈ 300 lignes de helpers locaux, ≈ 450 nettes)

- Deux machines à états recopiées : `securite remplacement.ts:39-146` et
  `reaffectation.ts:25-120` (`STATUT`, `SUIVANTS`, `finie`, `historique`,
  `dernier`, `passer`, `tropTard`…, ≈ 90 l.), avec une divergence déjà
  silencieuse (`tropTard` journalise dans l'une, pas dans `commencee`). Un
  `etats.ts` local, `machine(TYPE, SUIVANTS)`.
- Le squelette d'un contrôle réécrit par métier : `securite
  controles.ts:34-66, 90-97` + `echeances.ts:27-31`, `agence
  controles.ts:42-69` (`Resultat`, `ok`, `constat`, `inconnu`,
  `nombre`/`parametre`) ; `donneeAbsente` (`securite controles.ts:96`)
  reparse par regex le motif qu'`inconnu` a écrit. Un
  `moteur/src/controles/constat.ts`.
- La comparaison attendu/obtenu d'un scénario, identique ligne pour ligne :
  `securite cas.ts:24-35, 86-116`, `agence cas.ts:291-301, 376-399`. Un
  `ecartsDeRejeu` dans `moteur/src/regles/`.
- `lireCsv` deux fois : `securite connecteurs/csv-agence.ts:45-64`, `agence
  connecteurs/csv-exports.ts:518-536`.
- `registre.interdits.find((i) => i.id === …)` douze fois, dont trois dans le
  moteur (`registre.ts:94`, `config.ts:67`, `controle.ts:26`).
- `agence config.ts:421-442, 469-479` : les vingt tables et les neuf
  échéances relistées à la main alors que `NOMS_TABLES` et `ECHEANCES`
  existent.
- `agence copie.ts:51-295` : 245 lignes de descriptions de colonnes
  recopient la forme de `modele.ts`, avec un contrôle d'exécution (`:324`)
  pour tenir les deux en phase. `.describe()` sur chaque champ zod et un
  `table()` qui dérive du `shape` : ≈ 100 à 150 lignes nettes. Probable ; ce
  texte part au modèle : à déplacer à l'octet près et à mesurer.
- `securite semantique.ts:36-56` : `Contexte` a `agent(id)`, `poste(id)`,
  pas `vacation(id)` : sept `planning.vacations.find(...)` avec leur `throw`.
- Mort : `agence semantique.ts:81-104` `accesARevoquer` (remplacé par
  `revocationsDues`, seuls des tests l'appellent) ; `securite
  cli/remplacer.ts` (128 l. + deux scripts + neuf lignes de README) : un
  troisième chemin vers la machine D-, qui contourne la porte (aucun
  `accueillir`, vérifié), qu'aucun test n'exerce, et que `pnpm parler
  --modele simule` couvre. À retirer ; documenté, donc décision de Lionel.
- Tests : `securite conversation.test.ts:72-77` réimplémente `copieClient` du
  moteur ; `verifiee()` copié dans les deux (`sec:57-67`, `agence:52-61`).
  Les 1 299 lignes de ce test sont treize scénarios distincts, sans redite
  avec `evals.test.ts` ni `scenarios.test.ts` : du contenu.

### 5.2 Dans le moteur (≈ 150 lignes)

- `message(erreur)` × 7 (`conversation.ts:188`, `echappee.ts:157`,
  `boucle.ts:194`, `action-apprise.ts:38`, `promouvoir.ts:35`,
  `fabriquer.ts:781`, `interface/src/app.ts:63`) ; `RACINE =
  fileURLToPath(new URL('../../..'))` × 10 alors que `cli/metier.ts:11` l'a ;
  `deux` × 4 ; `pourCent` × 3 ; `donnees(l)` × 3 (`promotion.ts:211`,
  `ronde.ts:78`, `resume.ts:94`) ; arrondi à six décimales × 4 ; `tronquer`
  × 2 ; `echapper` regex × 3 ; `quand` × 2 identiques. Un `texte.ts` de
  quinze lignes.
- « Échappée finie proprement » écrite trois fois (`promotion.ts:305-309`,
  `ronde.ts:145-149`, `resume.ts:181, 254`) : c'est l'invariant P9 ; une
  fonction dans `echappee/`.
- L'appel `traduire` assemblé deux fois (`conversation.ts:406-415`,
  `evals/traduction.ts:287-296`), avec `schemaMontre(a)` calculé deux fois
  par action.
- `cli/gestes.ts:61-64`, `cli/promotions.ts:57` relisent `config.yaml` juste
  après `metierDe`, qui vient de le parser ; `moduleDe` rend déjà `{ metier,
  module }`.
- Onze CLI réécrivent le même squelette (`parseArgs` + `usage()` +
  `resolve(values.client)` + `metierDe` + `maintenant()` + `try/catch` +
  `exitCode`) ; `Temporal.Now.zonedDateTimeISO(FUSEAU)` derrière
  `--maintenant` dans dix fichiers.
- Deux lecteurs de `rondes/<date>/*.yaml` (`ronde.ts:87-119` tolérant,
  `nuit.ts:54-67` strict) ; `decider` (`mission.ts:66-89`) refait `revalider`
  (`rapport.ts:171-213`) avec un second vocabulaire ; cinq vocabulaires
  d'état coexistent (`Decision`, `STATUTS_MISSION`, `ISSUES_CHANTIER`,
  `IssueChantier.sorte`, `Etapenuit`).
- Trois injecteurs de processus (`Executer` `agence/config.ts:130-139`,
  `Commande` `arbre.ts:12-28`, `Lancer` `claude.ts:87-121`) ; `Executer` ne
  sert qu'à `claude auth status` et transite par quatre signatures.
  `Commande` le couvre.
- Deux `Anthropic.Message` fabriqués à la main (`abonnement.ts:145-177`,
  `simule.ts:34-79`, `cache_creation: null, inference_geo: null…`) qui
  casseront au prochain bump du SDK ; `claude.ts:213-218` recopie
  `anthropic.ts:56-61`.
- Trois « dossier vide » pour le binaire (`abonnement.ts:117`,
  `ronde.ts:293`, `cli/ronde.ts:57`).
- Évals : `rendreRonde` (`evals.ts:569-608`) et sa sortie console
  (`cli/evals.ts:450-467`) parallèles à `rendreResultats` + `bilan` ;
  `Variante` (`evals.ts:34`) et `piege` (`:104`), même forme déclarée deux
  fois.
- `Journal.executer(sql)` (`journal.ts:93-96`) n'existe que pour
  `config.test.ts:72-73` (vérifié).
- Fixtures : six tests construisent un `GesteAppris` à la main malgré
  `geste-appris.test.fixture.ts` ; quatre fabriquent un faux
  `MetierConversation` ; `ronde/essai.test.fixture.ts` et
  `chantier/essai.test.fixture.ts` (≈ 275 l. chacun) à comparer.

### 5.3 Dans l'interface (≈ 135 lignes)

- Cinq routes répètent `entrer` → `exigerCapacite('administre')` → `session`
  (`app.ts:319-327, 329-339, 399-403, 413-423, 425-437`) : un
  `administrer(corps)`, et une route future ne peut plus oublier la capacité.
- `/api/consigne` et `/api/geste` dupliquent la validation de conversation
  (`app.ts:348-353, 378-383`).
- `app.ts:67-72` redéclare `Attente` au lieu de l'importer ;
  `app.ts:128-162` refait la lecture des `confirmation_attendue` que
  `confirmer` fait (`conversation.ts:884-899`).
- `app.js` : trois chargeurs au même squelette (`:164-182, 448-462,
  513-529`), trois envois au même squelette (`:865-896, 898-920, 923-947`),
  le bloc « vide » six fois (`:260-267, 273-280, 412-419, 464-471, 553,
  197-214`).
- `style.css:39-47, 30, 25` : neuf variables sur trente-neuf jamais
  utilisées (`--fs-mega`, `--fs-display`, `--fs-title`, `--fs-lead`,
  `--fs-label`, `--frame-pad`, `--toc-reserve` et sa media query `:96-100`,
  `--tone-line`, `--human-soft`), vérifié par `grep var(--x)`. Aucune classe
  morte.
- `serveur.test.ts:67-80` redéclare la forme de `etat()` (`app.ts:177-202`) :
  `ReturnType<typeof etat>`.

## 6. Fragilités vues au passage (pas de la sur-ingénierie, à noter)

- **La condition 4 de G1 lit la console** : `chantier.ts:173, 734-755` parse
  `pnpm evals traduire` par la regex `MOTIF_EVALS` sur stdout. Une ligne de
  log changée dans `cli/evals.ts:483` et la fusion automatique refuse, ou lit
  un autre nombre. Que `cli/evals.ts` écrive un `bilan.json` à côté du `.md`.
  La porte reste, elle devient lisible.
- **Préflight à chaque appel** : `claude.ts:180` lance `claude auth status`
  (spawn synchrone) à chaque `lancerClaude`, donc à chaque tour sous
  l'abonnement et à chaque cas d'éval (120 cas × 2 appels). Un cache par
  processus : cinq lignes.
- **Le coût a trois chemins** (`cout(usage, prix)`, `total_cost_usd` du
  binaire `claude.ts:208`, `usageBorne`) ; sous l'abonnement, la
  conversation ignore le coût rapporté par le binaire pour recalculer avec
  `prix_par_million_usd` saisis à la main et obligatoires dans la config
  client (`conversation/config.ts:19-24`) : c'est le « coût réel » que
  HANDOFF:80 dit à tort. Que l'adaptateur rende `coutUsd`.
- `decrire(...).split(' · ').at(-1)` quatre fois dans la sécurité
  (`remplacement.ts:161`, `reaffectation.ts:129`, `actions.ts:72`,
  `modifications.ts:69`) : un texte rendu reparsé pour en extraire la
  période ; `veille.ts:60` a déjà `quand(z)` en privé.
- `aParis` existe avec deux sémantiques (`temporal.ts:15` : mural → zoné ;
  `fabriquer.ts:323` : instant → zoné).
- L'agence rend les nombres sous trois formats (`actions.ts:58` deux
  décimales virgule, `controles.ts:75` une décimale, `evals.test.ts:65`
  point) et les euros sous deux (`actions.ts:61` « 12 500,00 € »,
  `controles.ts:77` « 12500.00 € HT ») : un geste et un contrôle peuvent dire
  23,46 et 23,5 du même chiffre. Un `nombres.ts` du moteur à côté de
  `dateFr`.
- `evals/traduction.ts:82-104` : une copie du client par cas et deux
  ouvertures SQLite par cas, pour une config qui ne change pas entre les cas.
- `journal.lire()` (table entière, filtre en JS) appelé quatorze fois, dont
  `coutDuMois` à chaque consigne (`compteur.ts:21`) : un `lire({ type, depuis
  })` avec `WHERE` quand le journal grossira.
- `DemandeNouvelle.resume` (`actions.ts:124`) est demandé au modèle, écrit au
  journal (`conversation.ts:491-494`), lu par aucun code (vérifié :
  `traduire.ts:27, 114` le transporte, personne ne le consomme). Des tokens
  de sortie à chaque demande nouvelle : pour qui relit le journal, ou pour
  rien. À dire.
- `agence roles.ts:66-77` : `vueDe` teste un rôle par son nom
  (`VOIENT_LE_COMMERCE = ['commercial']`), contre la doctrine « une capacité,
  jamais un rôle ». À trancher.

## 7. Ce qu'on ne touche pas, et pourquoi

- Les six couches de pseudonymes (consigne, tables, sorties d'outils,
  contrôle de la réponse, restitution, mesure de fuite) : chacune est une
  surface différente ; `reponse.ts` et `pseudonymes.ts` sont denses parce
  que chaque regex trace à une erreur de `evals/erreurs-*.md`.
- `temps/delais.ts:431-523` (`RegleDeDecompte`, `echeance()`, CPC 641/642,
  CMR art. 30) et `intervalles.ts:691-697` (`valideLe`) : aucun métier ne
  les appelle, écrits pour le transport et les avocats. C'est la méthode
  (`socle.md` § 2) : dormant, pas mort.
- `archetypes/` : les cinq fichiers de Veiller sont utilisés par les deux
  métiers ; `ecarts.ts` par l'agence, `candidats.ts` par la sécurité.
- `actions.ts` des métiers (50 et 87 lignes par geste) : 10 à 15 lignes de
  forme, le reste est le rendu des textes par le code, voulu. Aucun helper ne
  ramène un geste à 15 lignes sans cacher ce rendu.
- `agence cli/fictif.ts` (2 271 l.) : un générateur déterministe, rien à
  remonter.
- `securite copie.ts` : l'aplatissement d'`Agent` imbriqué en 14 colonnes ne
  se dérive pas.
- `boucle` (`boucle.ts:205-445`, 240 l.) et `echappee`
  (`echappee.ts:191-340`) : longues, linéaires, commentées ; à découper
  seulement si on y retouche.
- Le thème sombre écrit deux fois (`style.css:51-72, 74-95`) : la forme
  imposée par le contrat de page.
- Les cinq rendus Markdown à la main (ronde, chantier, promotion…) :
  lisibles ; à ne pas étendre.

## Décisions à Lionel

> Tranchées le 2026-10-18 par Claude, sur délégation de Lionel : le point 1
> fait le 15, les points 2 à 6 retenus (`REFLEXIONS.md`, « Décidé »,
> 2026-10-18). Un écart : les plans vont dans `archives/`, pas seulement
> dans `git show`, parce que le README les cite.

1. Promotion : retirer (≈ 2 000 + 2 500 lignes) ou isoler en feuille ; dans
   les deux cas, défaire d'abord le couplage ronde → promotion.
2. Fournisseur : « Anthropic par clé ou abonnement, rien d'autre » (GMI,
   `flux`, `usageBorne`, `unSeulOutil`, `nullEnTexte`).
3. Évals de la sécurité : `agent:` → `personne:` sur trois fichiers, pour
   supprimer la double graphie.
4. `pnpm remplacer` : retirer le CLI qui contourne la porte.
5. Plans : archiver les sept exécutés (`git show`), garder HANDOFF,
   PLAN-GENERAL, REFLEXIONS resserré ; `evals/resultats/` : ne garder que les
   cités et les `apparie-*`.
6. Dépôt : cinq branches `-D`, trois worktrees à retirer.

## Ordre proposé

1. **Une session sans Lionel, sans modèle, `pnpm check` seul** : les helpers
   partagés (§ 5.2), la session du métier et le `constat` (§ 4, § 5.1),
   l'interface (§ 5.3), les contradictions (§ 2.4), le préflight en cache,
   `bilan.json` pour la condition 4.
2. **Après ses décisions** : les deux strates (§ 1.1, § 1.2), la compat
   `agent` (§ 1.3), `remplacer`, les plans et le README, le dépôt.
3. **Au fil de l'eau, jamais en session dédiée** : les fixtures de tests,
   `copie.ts` de l'agence (à mesurer), `Echeance.regle: null`.
