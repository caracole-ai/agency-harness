# Handoff — 2026-10-15

Pour reprendre dans une session neuve : deux pages, l'état et la suite. Les
décisions et leur fil sont dans `REFLEXIONS.md`, les plans dans `PLAN-*.md`,
l'historique dans git (l'ancien handoff de 4 220 lignes :
`git show 15a128b:HANDOFF.md`).

## Où on en est

`main` = `origin/main` = la fusion de `general/retrait-promotion` (bf82764).
**`general/commande-seule`, non fusionnée** (Lionel, 2026-10-15 : « les gestes
sont codés par le harnais lui-même quand la demande explicite est faite par
le patron ; on arrête avec la détection de récurrence ») : la ronde et les
gestes appris sont retirés (≈ 8 000 lignes), puis le geste `heures_par_agent`
codé par le harnais est repris (110f503). `pnpm check` vert : moteur 476,
interface 29, sécurité 133, agence web 259 (les tests des deux
sous-systèmes partis avec eux). Onglet « Gestes » vu à 1280 et 390 px. À fusionner à la session suivante (une
fusion par session ; celle-ci a fusionné `retrait-promotion`).

- **Une seule chaîne pour un geste nouveau.** L'outil ne sait pas faire une
  demande → elle s'affiche dans l'onglet « Gestes » (ce que l'outil ne sait
  pas encore faire), groupée par intention → le patron clique « Créer ce
  geste » → le code écrit, sans modèle, la mission `geste_code` chez le
  client (`missions/<date>/<intention>.yaml` : consignes des échappées
  masquées, sans nom) et la ligne `geste commandé` → la nuit lance le
  chantier (Fable planifie, Opus code dans la bande métier, garde du diff,
  `pnpm check`, relecture, mesure de la traduction) → fusion si les huit
  conditions sont vertes → la carte dit « disponible » quand le métier porte
  le geste. Aucun modèle ne cherche lui-même ce qui manque ; un geste n'est
  que du code.
- **Mesurée en réel le 2026-10-15** sur `heures_par_agent`, avant le retrait
  (le code de la chaîne n'a pas changé depuis) : fusionné dans le clone de
  mesure (`~/harnais-nuit`, dépôt nu `~/harnais-nuit-origine.git`), huit
  conditions vertes, `evals traduire` 73/73 ; la même question passe ensuite
  par le geste, sans échappée. Le geste est repris dans cette branche.
- **Le moteur ne sait rien d'aucun métier** ; deux métiers le prouvent : la
  sécurité privée (`metiers/securite-privee`, client `exemples/client-fictif`)
  et l'agence web (`metiers/agence-web`, client `exemples/agence-web-fictive`).
- **Les trois espaces** : un geste codé (la traduction le choisit, le code
  l'exécute), l'échappée (SQL en lecture sur une copie masquée, contrôle
  « pas un chiffre ni un nom hors des données » ; elle n'écrit plus aucune
  copie des vraies tables sur disque), la commande.
- **Tout tourne sur l'abonnement** (binaire `claude`, Sonnet 5.5 au
  quotidien, Fable et Opus au chantier) : les dollars affichés sont des
  équivalents API, rien n'est facturé ; la contrainte est le quota.

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

- À Lionel, sur `heures_par_agent` : relire ses 7 cas de traduction et
  N-1/N-2 réétiquetés (l'exception prévue par la garde) ; E-01/E-02 de
  `echappees.yaml` gardent l'intention `heures_par_agent` (une étiquette) ;
  « fuite 1 » de sa passe `evals traduire` non lue ; l'arrondi des heures
  recopié de `remplacement.ts`.
- Non tranché : la priorité d'une mission commandée dans la nuit
  (`missions_max_par_nuit: 1`, par date : elle peut attendre) ; la mise à
  jour à distance (« disponible » chez un client en dépend).
- Le niveau 2 de `designer` envoie au modèle les candidats avec leur nom,
  contre « aucun nom ne part au modèle ».
- À Lionel : la bascule vers la clé d'API avant un client réel ; la phase E
  (tâche cron) ; aligner le
  départage de `gerer_absence` (par nom) sur celui des propositions (par
  numéro).
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
pnpm evals traduire|echappee --client exemples/client-fictif [--seulement id,id] [--modele simule]
pnpm chantier --mission <copie>/missions/<date>/<id>.yaml [--sans-modele]   # --refaire rouvre la branche telle quelle
pnpm nuit --client <copie> [--date AAAA-MM-JJ]   # jamais avec `pnpm -s`
```
