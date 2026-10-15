# Handoff — 2026-10-14

Pour reprendre dans une session neuve : deux pages, l'état et la suite. Les
décisions et leur fil sont dans `REFLEXIONS.md`, les plans dans `PLAN-*.md`,
l'historique dans git (l'ancien handoff de 4 220 lignes :
`git show 15a128b:HANDOFF.md`).

## Où on en est

`main` = `origin/main` = la fusion de `general/masquer-remplacees` (8106d79).
`pnpm check` vert : moteur 644, interface 29, sécurité 145, agence web 263.

- **Le moteur ne sait rien d'aucun métier** ; deux métiers le prouvent : la
  sécurité privée (`metiers/securite-privee`, client `exemples/client-fictif`)
  et l'agence web (`metiers/agence-web`, client `exemples/agence-web-fictive`).
- **Les trois espaces** (`PLAN-ESPACES.md`) : la traduction vers un geste
  codé, l'échappée (SQL en lecture sur une copie, pseudonymes, contrôle « pas
  un chiffre ni un nom hors des données »), et la **commande** à la place de
  la promotion : la promotion automatique est **retirée** (Lionel,
  2026-10-15, branche `general/retrait-promotion`, ci-dessous) ; un geste
  nouveau se construit sur commande du patron, jamais parce qu'une demande
  revient.
- **La nuit** (`PLAN-RONDE.md`, `PLAN-GENERAL.md`) : ronde, chantier, fusion
  automatique sous conditions, sur l'abonnement par le binaire `claude`.
- **Le modèle : Sonnet 5.5 par l'abonnement** (`acces: { binaire: claude }`,
  `moteur/src/modele/abonnement.ts`). GLM-5.3 chez GMI n'est plus utilisé.
- **S9 fusionnée en entier** (`PLAN-CHOIX.md`) : le patron change un agent
  dans une proposition, en mots (`changer_remplacant`) ou par un bouton
  « Prendre X pour V-03 » (`PropositionMetier.choix`, `traiterGeste`,
  `/api/geste`, sans modèle). Une proposition corrigée n'apprend rien ; la
  nouvelle R-… se rattache à la conversation d'origine par le champ générique
  `corrige`. Deux R-… en attente : « laquelle ? ».
- **`general/retrait-promotion`, non fusionnée** (la fusion de la session
  a été celle de `masquer-remplacees`) : le retrait de la promotion en cinq
  commits (couplage défait, nuit/ronde/chantier, évals, config et
  suppression, docs), puis **« Demandes sans geste »** (deux commits) :
  l'onglet « Appris » montre les demandes nouvelles groupées par intention
  (`/api/sans-geste`), « Créer ce geste » écrit une ligne `geste commandé`
  (`/api/sans-geste/commander`, capacité `administre`, aucun modèle), et le
  catalogue de la ronde marque l'intention « commandée », la seule qui
  mérite une mission `geste_code`. Vu à 1280 et 390 px. `pnpm check` vert :
  moteur 592, interface 31, sécurité 144, agence 263 (les tests de la
  promotion partis avec elle, huit tests neufs).
  La ronde n'écrit plus de mission `geste_code` sans commande ; la nuit
  purge les instantanés (90 jours) à la place de `pnpm promotions` ;
  `citations` et `PropositionMetier.criteres` restent (lus par des tests).
  À fusionner après relecture ; avant, une passe `pnpm evals ronde` sur
  Sonnet (le prompt de la ronde a changé ; l'attendu de R-1..R-3 est le
  même par construction).
- **Dernières mesures (Sonnet, `evals/resultats/apparie-2026-10-14-s9-*`)** :
  traduction 120 contre 119 sur les cas communs, cas neufs 12/12,
  `liberer_un_jour` 3/3, gestes 6/6, échappée de la sécurité 18/18 ; agence
  16 et 17/24, sous son seuil parce que ses étiquettes sont des brouillons.
  Fuite : R-2 seule, des deux côtés (voir « Ouvert »).

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
