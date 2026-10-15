# Handoff — 2026-10-15

Pour reprendre dans une session neuve : deux pages, l'état et la suite. Les
décisions et leur fil sont dans `REFLEXIONS.md`, les plans dans `PLAN-*.md`,
l'historique dans git (l'ancien handoff de 4 220 lignes :
`git show 15a128b:HANDOFF.md`).

## Où on en est

`main` = `origin/main` = la fusion de `general/masquer-remplacees` (8106d79).
**`general/retrait-promotion` n'est pas fusionnée** (14 commits devant `main`,
non poussée) : à fusionner après relecture de Lionel et une passe
`pnpm evals ronde --client exemples/client-fictif` sur Sonnet (le prompt de la
ronde et la carte ont changé ; l'attendu de R-1..R-3 est le même par
construction : aucun n'attend `geste_code`). `pnpm check` vert sur la branche :
moteur 603, interface 33, sécurité 144, agence web 263.

- **Le moteur ne sait rien d'aucun métier** ; deux métiers le prouvent : la
  sécurité privée (`metiers/securite-privee`, client `exemples/client-fictif`)
  et l'agence web (`metiers/agence-web`, client `exemples/agence-web-fictive`).
- **Les trois espaces** (`PLAN-ESPACES.md`) : la traduction vers un geste
  codé, l'échappée (SQL en lecture sur une copie, pseudonymes, contrôle « pas
  un chiffre ni un nom hors des données »), et **la commande** : la promotion
  automatique est retirée (Lionel, 2026-10-15) ; un geste nouveau se construit
  sur commande du patron, jamais parce qu'une demande revient.
- **La commande devient un geste codé** (plan
  `~/.claude/plans/adaptive-twirling-tome.md`, commits « Commande → geste
  codé ») : « Créer ce geste » fait écrire par le code, sans modèle, la
  mission `geste_code` (`rondes/<date>/<intention>.yaml`, consignes des
  échappées masquées, sans nom ni `estimation`), puis la ligne `geste
  commandé` ; sinon 400 (aucune consigne utilisable, nom déjà pris, déjà
  commandé). La nuit la prend ; la ronde ne peut plus écrire `geste_code` et
  n'écrase jamais une mission déjà écrite. La carte suit : mission écrite →
  chantier du … → disponible (un geste du métier porte ce nom). Vérifié sans
  modèle sur une copie, vu à 1280 et 390 px.
- **Mesure avec modèle (2026-10-15, `heures_par_agent`) : la chaîne entière
  marche.** Trois demandes réelles (Sonnet) → « Créer ce geste » → `pnpm
  chantier` : **fusionné** dans `main` du clone (`~/harnais-nuit`, poussé
  vers `~/harnais-nuit-origine.git`, étiquette `chantier/heures_par_agent`),
  huit conditions vertes, 7 cas de traduction, `evals traduire` 73/73, 0
  bloquant, 308 lignes, 1 512 s, 7,89 $ équivalent API (abonnement). La
  carte dit « disponible » sur le code fusionné ; la même question passe par
  le geste (`action`, sans échappée). Trois passes avant : refus sur un test
  de l'interface couplé au métier (corrigé, 4ef5f19), `--refaire` qui rouvre
  la branche telle quelle au lieu de repartir de `main` (supprimer la branche
  du clone pour repartir), un plan coupé par la limite d'usage. Le geste
  n'est pas dans ce dépôt : le tirer du dépôt nu est à Lionel.
- **La nuit** (`PLAN-RONDE.md`, `PLAN-GENERAL.md`) : ronde, chantier, fusion
  sous conditions ; tout sur l'abonnement (binaire `claude`, Sonnet 5.5 au
  quotidien).
- **Dernières mesures (Sonnet, `evals/resultats/apparie-2026-10-14-s9-*`)** :
  traduction 120 contre 119 sur les cas communs, cas neufs 12/12,
  `liberer_un_jour` 3/3, gestes 6/6, échappée de la sécurité 18/18 ; agence
  16 et 17/24 (étiquettes en brouillon). Fuite : R-2 seule, des deux côtés.

## La méthode (Lionel : « anti-over-engineer et KISS »)

- **Lire les traces avant toute correction** : une cause se cherche dans ce
  que le modèle a lu et écrit, pas en relevant un plafond ou en réécrivant
  une phrase.
- **Mesurer une fois, à la fin**, avec assez de passes pour que l'écart
  attendu dépasse le bruit (l'écart entre deux passes de la base).
- **La cérémonie** (règle commitée avant la mesure, mesure appariée base
  contre lot, une condition fausse : pas de fusion) **seulement pour la
  sécurité, la vie privée et la fusion dans `main`.** Ailleurs : on corrige,
  on relance. « Fuite 0 » s'y lit « pas de fuite de plus que `main` ».
- **Le laborieux s'évite** : le chemin simple d'abord ; sinon, prévenir
  Lionel avant de s'engager. Signaux : une deuxième correction du même
  problème sans trace lue ; du code pour contourner un fournisseur plutôt que
  pour le produit ; un verdict qui tient à un ou deux cas ; une règle de
  mesure réécrite après coup ; un cas rouge sur deux modèles (l'étiquette est
  suspecte : la question va à Lionel) ; deux sessions sans rien de nouveau
  pour le patron ; ce fichier au-delà de deux pages.

## Pour Lionel : 30 minutes par semaine

Dire ce qu'est une bonne réponse (E1), ou mieux, mettre un vrai patron devant
l'outil. Premiers cas, rouges sur GLM comme sur Sonnet, dans
`metiers/agence-web/evals/echappees.yaml` : **E-04, E-12, E-16, E-20** (la
réponse attendue demande-t-elle plus que la question ?). Puis relire les
étiquettes de `metiers/securite-privee/evals/consignes.yaml`.

## Ouvert

- À Lionel, sur le geste fusionné : relire le remplacement du geste appris
  d'éval `heures_par_agent` → `compter_vacations` (`evals/gestes.yaml`, que
  la garde ne surveille pas) et les 7 cas ajoutés ; « fuite 1 » à `evals
  traduire` non lue (l'arbre est supprimé après fusion ; peut-être la fuite
  comptée à tort sur exception) ; remarques de relecture : E-01/E-02 de
  `echappees.yaml` gardent l'intention `heures_par_agent`, arrondi des heures
  recopié de `remplacement.ts`, description de fixture trompeuse.
- Non tranché : la priorité d'une mission commandée dans la nuit
  (`missions_max_par_nuit: 1`, ordre par date : elle peut attendre) ; la
  mise à jour à distance (« disponible » chez un client en dépend) ; le
  dossier d'une mission commandée dit encore « Mission de la ronde du … »
  (`rendreDecision`, `chantier.ts`).
- À Lionel : le sort des gestes appris (`gestes/`, atelier, onglet « Appris »,
  `pnpm gestes`, `evals gestes`, ≈ 2 500 lignes) : plus aucun producteur
  depuis le retrait ; garder dormants ou retirer.
- À Lionel : R-2 (« Aisha ») fuit à chaque passe : le niveau 2 de `designer`
  envoie au modèle les candidats avec leur nom, contre « aucun nom ne part au
  modèle ».
- À Lionel : la bascule vers la clé d'API avant un client réel ; la mise à
  jour à distance d'un harnais livré ; la phase E (tâche cron) ; aligner le
  départage de `gerer_absence` (par nom) sur celui des propositions (par
  numéro).
- Les tableaux d'évals disent « coût réel » sous l'abonnement (une
  estimation).
- Agence : `facture_alerte`, `contrat_tma`, `brouillon_relance` (J+1 en dur),
  17 tests au lieu de 23, le piège `lots.nom`.
- Une fuite comptée à tort sur exception.
- Non relus : le mini-site (https://claude.ai/artifact/TustZJh4FbAG17ZcDjBG52)
  et la présentation (https://claude.ai/artifact/B8Dj1EJySsdZ6bJAyJCsN2).

## Décisions à respecter (le détail : `REFLEXIONS.md`, « Décidé »)

- Les interdits ne se lèvent pas ; `regles.yaml` de la sécurité, les
  contrôles `I01`…`I20` et les étiquettes d'éval ne se touchent pas sans
  Lionel. Une porte de contrôle ne se contourne jamais.
- Aucun nom de personne ni de client ne part au modèle ; rien ne s'écrit chez
  le client sans le « oui » de qui a le droit.
- `exemples/client-fictif/` ne s'écrit qu'avec l'accord de Lionel ; on
  travaille sur des copies.
- Un seul `git merge --no-ff` et un seul push par session ; `pnpm check` vert
  avant chaque commit.
- `ANTHROPIC_API_KEY` reste absente (elle facturerait l'API sous
  l'abonnement) : ne la chercher ni la demander.

## Pièges

- RTK réécrit `ps`, `grep`, `git diff`, `git status` : `rtk proxy …` pour une
  sortie brute. Pas de `timeout` sur macOS. Lint : `pnpm exec biome format
  --write`.
- Les tables 1, 2, 4 de `fiche.md` se régénèrent (`pnpm registre:generer`),
  jamais à la main ; `attendu*.yaml` s'écrit à la main.
- `ConfigSecurite` est un `strictObject` ; tout client exige `personnes.yaml`.
- Le contrôle des fuites refuse tout mot qui est un nom d'agent fictif
  (« petit » = Laura Petit) : reformuler, jamais l'affaiblir.
- Deux évals lancées dans la même minute écrivent dans le même dossier de
  résultats : décaler.
- Les worktrees des sous-agents vivent dans `.claude/worktrees/`.

## Commandes

```sh
pnpm install
pnpm check                 # lint, types, tests, cohérence du registre
pnpm registre:generer      # réécrit les tables de la fiche depuis le registre
pnpm veiller --client exemples/client-fictif --date 2026-10-06
pnpm parler --client <copie> --role <rôle> [--personne A-2] [--maintenant …] [--modele simule] --consigne "…"
pnpm interface --client <copie> [--maintenant 2026-10-10T21:40]
pnpm gestes --client <copie> lister | verifier <id> | activer <id> --par <nom> | retirer <id> --motif "…"
pnpm evals traduire|echappee|gestes|ronde --client exemples/client-fictif [--seulement id,id] [--modele simule]
pnpm ronde --client <copie> --date AAAA-MM-JJ [--sans-modele]
pnpm chantier --mission <copie>/rondes/<date>/<id>.yaml
pnpm nuit --client <copie> [--date AAAA-MM-JJ]   # jamais avec `pnpm -s`
```
