# Handoff — 2026-10-15

Pour reprendre dans une session neuve : deux pages, l'état et la suite. Les
décisions et leur fil sont dans `REFLEXIONS.md`, les plans dans `PLAN-*.md`,
l'historique dans git (l'ancien handoff de 4 220 lignes :
`git show 15a128b:HANDOFF.md`).

## Où on en est

`main` = `origin/main` = la fusion de `general/l1-chantier` (2026-10-15) :
le lot 0 de `PLAN-LIVRAISON.md` (le plan) et son **lot 1, le chantier sans
clone ni dossier client**. Lionel, le soir du 2026-10-15 : le chantier se
lance **au clic**, **à l'agence**, sans nuit ni clone réservé ; chaque
fusion émet une **version signée** que le harnais du client **tire** et
installe lui-même, avec retour arrière. `pnpm check` vert : moteur 481,
interface 29, sécurité 133, agence web 259.

**`general/l4-mise-a-jour`, non fusionnée, empilée sur `general/l3-missions`
et `general/l2-version` : les lots 2, 3 et 4** ; une seule fusion de
`general/l4-mise-a-jour` les porte. Lot 4 : chez le client livré, `pnpm
mise-a-jour` tire les statuts et prépare la prochaine version à côté
(signature, lignée, `pnpm check`) ; l'interface le lance d'elle-même et sort
au calme (code 75) ; `pnpm harnais` bascule, sonde, revient en arrière ; la
chaîne entière (`livraison/chaine.test.ts`, binaire simulé) joue les points
1 à 5 du critère global.
Lot 3 : « Créer ce geste » pousse la mission dans la file git du client
(`livraison.yaml`) ; `pnpm agence [--une-fois]` la prend, écrit `en cours`
puis le statut final et le dossier dans la file ; l'onglet « Gestes »
rattrape les statuts (une ligne `chantier` par statut nouveau) et la carte
dit en attente / en cours / fusionné (v…) / disponible. Lot 2 :
relus et corrigés tous deux, `pnpm check` vert (moteur 530, interface 31). Chaque fusion et chaque retrait posent
`v<AAAA-MM-JJ>-<n>`, signée SSH (`AGENCE_CLE_SIGNATURE`, hors du dépôt,
retirée de l'environnement des modèles), poussée avec eux tout ou rien ;
`pnpm versionner` étiquette `origin/main` tel quel. **Prochaine session :
fusionner `general/l4-mise-a-jour`, puis le lot 5** (la mesure réelle, avec
les vrais modèles, et la clé de l'agence). Avant la première fusion réelle, Lionel crée la clé de
l'agence (`ssh-keygen -t ed25519`, hors du dépôt) et l'exporte. **Ouvert,
à trancher avant un client réel** : le code écrit par le modèle (`pnpm
check` dans l'arbre) tourne sous l'utilisateur de l'agence et peut lire la
clé ; il faut un bac à sable ou un autre utilisateur (`PLAN-LIVRAISON.md`,
lot 2).

- **Le lot 1** : `pnpm chantier --mission <fichier> [--sortie <dossier>]`
  travaille dans `.claude/worktrees/chantier-<id>` du dépôt de l'agence,
  parti d'`origin/main` frais ; la fusion (et le retrait) dans un arbre
  détaché, push atomique sur `main` du distant, une reprise si refusé. Sur
  la base, seulement `fetch`, `worktree`, `rev-parse` (`arbre.test.ts`) :
  l'arbre de qui lance, même sale et sur une autre branche, et son `main`
  ne bougent pas. Le chantier ne lit aucun dossier client : il écrit
  `<id>.chantier.md` et `<id>.statut.yaml` (L7) dans la sortie (par défaut
  à côté de la mission), contrôle contre les noms du client fictif du
  métier ; la mission est relue entière contre les vrais noms à la commande.
  `pnpm nuit`, `depot_nuit`, `MESURES.md` écrit par le code : retirés.
  Écarts au plan, notés sous son lot 1 (la mémoire lue sur `origin/main`,
  le push atomique, `retirer` sans `--client`).
- **Mesurée en réel le 2026-10-15** (avant le lot 1, dans le clone
  `~/harnais-nuit`, dépôt nu `~/harnais-nuit-origine.git`) : le geste
  `heures_par_agent`, huit conditions vertes, `evals traduire` 73/73. Ces
  deux dossiers se suppriment après le lot 5, par Lionel.
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
- Le niveau 2 de `designer` envoie au modèle les candidats avec leur nom,
  contre « aucun nom ne part au modèle ».
- À Lionel : la bascule vers la clé d'API avant un client réel (après le
  plan de la livraison) ; aligner le
  départage de `gerer_absence` (par nom) sur celui des propositions (par
  numéro) ; les trois arbres `.claude/worktrees/agent-*` d'anciennes
  sessions (`git worktree remove`).
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
pnpm chantier --mission <copie>/missions/<date>/<id>.yaml [--sortie <dossier>] [--sans-modele]   # --refaire rouvre la branche telle quelle
pnpm chantier retirer <id> --motif "<texte>"
pnpm versionner            # AGENCE_CLE_SIGNATURE=<clé privée hors du dépôt>
pnpm agence [--une-fois]   # les files des clients d'agence.yaml: agence.clients
pnpm mise-a-jour [retirer] --client <dossier>   # chez un client livré
pnpm harnais --client <dossier> [-- --modele simule]   # le lanceur, depuis <installation>/courant
```
