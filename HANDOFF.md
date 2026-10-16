# Handoff — 2026-10-16

Pour reprendre dans une session neuve : deux pages, l'état et la suite. Les
décisions et leur fil sont dans `REFLEXIONS.md`, les plans dans `PLAN-*.md`,
l'historique dans git (l'ancien handoff de 4 220 lignes :
`git show 15a128b:HANDOFF.md`).

## Où on en est

`main` = `origin/main` = la fusion de `general/l4-mise-a-jour` (2026-10-16) :
les lots 0 à 4 de `PLAN-LIVRAISON.md`. Le chantier se lance **au clic**,
**à l'agence** (`pnpm agence`, une file git de missions masquées par
client) ; chaque fusion et chaque retrait posent une **version signée**
(`v<AAAA-MM-JJ>-<n>`, SSH, `AGENCE_CLE_SIGNATURE` hors du dépôt) ; le
harnais du client la **tire** (`pnpm mise-a-jour`, lancé par l'interface
dans un processus à part), vérifie signature et lignée, l'installe à côté,
rejoue `pnpm check`, bascule au calme (`pnpm harnais`, le lanceur), revient
en arrière si le redémarrage échoue. `pnpm check` vert : moteur 553,
interface 32, sécurité 133, agence web 259.

**Audité avant la fusion le 2026-10-16** : trois relectures en parallèle,
puis une relecture des corrections ; une trentaine de défauts corrigés en
cinq commits, chacun avec un test qui échoue sur le code d'avant (le détail
et les risques acceptés : « Audit avant fusion », sous les lots 2 à 4 du
plan). Les plus lourds : une file bloquée pour toujours par un statut non
commis ; l'interface gelée 15 s par une file injoignable (elle ne lance plus
git) ; la sortie de `pnpm check` et le texte des modèles qui partaient chez
le client (ils restent à l'agence) ; la fusion de la pointe de la branche au
lieu du commit gardé ; un geste retiré qui revenait (un plancher de
versions). L'onglet « Gestes » vu à l'écran ; le laboratoire du lot 4 rejoué
pour de vrai, deux fois, la dernière sur la pointe finale.

**Prochaine session : le lot 5** (la mesure réelle, avec les vrais modèles,
la clé de l'agence et un bac à sable : voir « Ouvert, avant un client
réel »). Avant la première fusion réelle, Lionel crée la clé de l'agence
(`ssh-keygen -t ed25519`, hors du dépôt) et l'exporte.

- **Ne jamais lancer `pnpm agence`, `pnpm chantier` ni `pnpm versionner`
  dans ce dépôt pour un essai** : ils poussent sur `origin` (GitHub). Le
  laboratoire se monte dans un dossier temporaire (recette : « Rejoué pour
  de vrai » sous le lot 4 du plan).
- **Mesurée en réel le 2026-10-15** (avant le lot 1, dans le clone
  `~/harnais-nuit`, dépôt nu `~/harnais-nuit-origine.git`) : le geste
  `heures_par_agent`, huit conditions vertes, `evals traduire` 73/73. Ces
  deux dossiers se suppriment après le lot 5, par Lionel.
- **Le moteur ne sait rien d'aucun métier** ; deux métiers le prouvent : la
  sécurité privée (`metiers/securite-privee`, client `exemples/client-fictif`)
  et l'agence web (`metiers/agence-web`, client `exemples/agence-web-fictive`).
- **Les trois espaces** : un geste codé (la traduction le choisit, le code
  l'exécute), l'échappée (SQL en lecture sur une copie masquée, contrôle
  « pas un chiffre ni un nom hors des données »), la commande.
- **Tout tourne sur l'abonnement** (binaire `claude`, Sonnet 5.5 au
  quotidien, Fable et Opus au chantier) : les dollars affichés sont des
  équivalents API, rien n'est facturé ; la contrainte est le quota.

## Ouvert, avant un client réel (à Lionel ; le détail sous les lots 2 et 3 du plan)

- **Le bac à sable, aggravé** : le code du modèle (`pnpm check`, `pnpm
  evals`) lit la clé, `~/.ssh`, le trousseau, écrit dans le `.git` commun,
  et peut glisser ce qu'il lit dans le code ou la mémoire que tous les
  clients tirent. Chemin simple : un utilisateur macOS dédié au chantier,
  avec son propre clone, sans accès à tout cela ; l'agence ne fait que lire
  le commit gardé, fusionner et signer.
- **La fusion automatique signe tout ce que porte `origin/main`** (un compte
  de l'hébergeur volé y pousse). Chemin simple : refuser de signer si un
  commit de `<dernière v*>..origin/main` touche autre chose que `memoire/`.
- **Le slug du client**, dans `memoire/INDEX.md` et le manifeste de chaque
  version, que tous les clients lisent. Chemin simple : y nommer le métier ;
  le client reste au registre local de l'agence (`chantiers.log`).
- **L'espace de noms** `chantier/<métier>/<id>`. Chemin simple : le métier
  passé avec l'identifiant dans `arbre.ts`, `fusion.ts` et la mémoire.

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
pnpm mise-a-jour [retirer] --client <dossier>   # chez un client livré ; retirer : revient à la précédente, l'interface relance d'elle-même au calme
pnpm harnais --client <dossier> [-- --modele simule]   # le lanceur, depuis <installation>/courant
```
