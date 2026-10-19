# Handoff — 2026-10-18

Pour reprendre dans une session neuve : deux pages, l'état et la suite. Les
décisions et leur fil sont dans `REFLEXIONS.md`, les plans vivants dans
`PLAN-GENERAL.md` et `PLAN-LIVRAISON.md`, les exécutés dans `archives/`,
l'historique dans git (l'ancien handoff de 4 220 lignes :
`git show 15a128b:HANDOFF.md`). Les commandes : `GLOSSAIRE.md`, une table,
la seule.

## Où on en est

`main` = la fusion de `general/menage` (2026-10-18, le lot « ménage » :
« Ouvert » ci-dessous) au-dessus de `origin/main` = `general/l4-mise-a-jour`
(2026-10-16, les lots 0 à 4 de `PLAN-LIVRAISON.md`) ; **`main` n'est pas
poussée** (six commits de doc et de carte, puis la fusion du ménage : à
pousser). Le chantier se lance **au clic**,
**à l'agence** (`pnpm agence`, une file git de missions masquées par
client) ; chaque fusion et chaque retrait posent une **version signée**
(`v<AAAA-MM-JJ>-<n>`, SSH, `AGENCE_CLE_SIGNATURE` hors du dépôt) ; le
harnais du client la **tire** (`pnpm mise-a-jour`, lancé par l'interface
dans un processus à part), vérifie signature et lignée, l'installe à côté,
rejoue `pnpm check`, bascule au calme (`pnpm harnais`, le lanceur), revient
en arrière si le redémarrage échoue. `pnpm check` vert : moteur 588,
interface 39, sécurité 136, agence web 259.

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
(`ssh-keygen -t ed25519`, hors du dépôt) et l'exporte. **La phrase à trous
est faite** (2026-10-18, fusion 59e9374, verdict dans
`evals/verdict-2026-10-18-phrase-a-trous.md`). L'adaptateur de
l'abonnement est corrigé (577ac5c : le modèle tentait d'appeler les outils
du moteur directement ; plus aucun abandon « outil indisponible »).
**Fusionné le 2026-10-19 (`echappee/identifiants`)** : un identifiant reçu
tel quel se recopie hors d'un trou, la notion des tickets à qualifier,
« chaque grandeur demandée, dans son unité ». Mesuré sous
`evals/regle-2026-10-18-identifiants.md` (trois passes, aucun cas perdu)
contre une base sans phrase à trous : agence web 58/72 contre 48/72,
retraits 1 contre 8, sécurité 54 = 54, aucune fuite. E-20 arrêtait la
fusion sur les euros ; Lionel a tranché que le pourcentage suffit, et
l'étiquette a changé (`evals/verdict-2026-10-18-identifiants.md`).
**Le frontend, avec Lionel (2026-10-19)** : une demande en cours porte ses
décisions, les mêmes sous le résultat du geste (`DemandeTableau.choix`,
`Resultat.choix` ; la sécurité : « Valider X », « Prendre Y à la place »),
cliquées sans modèle, le oui toujours exigé ; une décision cliquée dont le
oui attend renvoie aux confirmations. Restent, relevés sur l'écran du
patron : la réponse d'une absence en mur de texte (exclus et écartés à
replier), le bandeau « Questions libres » illisible pour un patron, les
suggestions coupées, une date brute dans un refus. Démo :
`pnpm interface --client <copie> --maintenant 2026-10-10T21:40` (le
planning fictif s'arrête mi-octobre).

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
  l'exécute ; une personne nommée se résout en code, exacte ou par une
  question, jamais par le modèle), l'échappée (SQL en lecture sur une copie
  masquée, une phrase à trous : le modèle ne retape aucun nombre, le code
  remplit, une réponse retirée est dite au demandeur et compté dans l'état sur trente jours), la commande (le
  chantier, neuf conditions dont le rejeu).
- **Tout tourne sur l'abonnement** (binaire `claude`, Sonnet 5.5 au
  quotidien, Fable et Opus au chantier) : les dollars affichés sont des
  équivalents API, rien n'est facturé ; la contrainte est le quota.

## Ouvert, avant un client réel : les trois décisions qui restent à Lionel

Le détail est sous les lots 2 et 3 du plan. Tout le reste a été tranché le
2026-10-18 (`REFLEXIONS.md`, « Décidé »). Recommandation de Claude : le
chemin simple, dans les trois cas.

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
l'outil. Toutes les étiquettes en suspens sont tranchées le 2026-10-19
(REFLEXIONS, « Décidé », les lignes du 19) : reste le vrai patron.

## Ouvert

**Le lot « ménage », tranché et fait le 2026-10-18** (`REFLEXIONS.md`,
« Décidé », les quatre lignes du 18 ; branche `general/menage`, quatre
forks fusionnés sans conflit, `pnpm check` vert, `evals traduire` 73/73
fuite 0 avec le vrai modèle) :

- Le dépôt : 45 branches supprimées ; la doc : `archives/`, résultats
  réduits à 135, README en arbre, glossaire à 99 entrées, un test qui tient
  la table des commandes et `package.json` ensemble.
- Un seul fournisseur (GMI, `flux`, `usageBorne`, le point d'accès de la
  config partent), la graphie `agent` ne se lit plus que dans
  `IdentiteSchema` (le registre du client fictif l'emploie), `pnpm
  remplacer` retiré.
- Le niveau 2 retiré : une mention proche donne « Vous parlez de « X » ?
  (oui / non) » ou la liste numérotée, en code ; une réponse ambiguë repose
  la question une fois ; « Répondre en tant que X » ouvre la conversation
  de la question ; R-2 est une question.
- L'échappée : `Reponse.resultat.controle`, les mots au demandeur
  (`MOTS_CONTROLE`), `compteurs.ts` (30 jours) dans `/api/etat` et
  l'en-tête de l'interface (« Questions libres »).
- Le chantier : la clé `<métier>/<id>` (`chantier/cle.ts`) pour la branche,
  l'étiquette, l'arbre et la mémoire (`memoire/chantiers/<métier>/`) ;
  `retirer <métier>/<id>` ; la neuvième condition **rejeu** (`evals/rejeu.ts`,
  `pnpm evals rejeu --gestes`) : une échappée vive par cas de traduction du
  geste, ses nombres doivent être dans la réponse du geste. Le contrôle
  de l'identifiant d'intention couvrait déjà tous les désignables du métier
  (`m.noms`) : la sécurité privée ne déclare pas ses sites, c'est le seul
  trou, côté métier.
- Les sites : le diaporama et le glossaire de smarttailor.fr redéployés.

**Reste à Lionel, sans être une décision** : créer la clé de l'agence ; la
date de la bascule vers la clé d'API ; deux écritures dans
`exemples/client-fictif/` : `personnes.yaml` (`agent:` → `personne:`, 13
lignes, puis retirer `agent` de `IdentiteSchema` et ses deux tests) et
`attendu-remplacement.yaml` (le départage de `gerer_absence` par numéro
donne `[A-2, A-1, A-5, A-9]`, puis `classer` avec
`localeCompare(…, 'fr', { numeric: true })` dans `remplacement.ts`) ;
supprimer `~/harnais-nuit`, `~/harnais-nuit-origine.git` et les trois
worktrees, sales de copies dépassées :

```sh
git worktree remove --force .claude/worktrees/agent-a2eb82aa7f784e5ca
git worktree remove --force .claude/worktrees/agent-a6d92e76e85884008
git worktree remove --force .claude/worktrees/agent-afb90b024f1dbbeaf
git worktree prune
git branch -d travail-lot5 travail-lot7 worktree-agent-a2eb82aa7f784e5ca worktree-agent-a6d92e76e85884008 worktree-agent-afb90b024f1dbbeaf
```

**Reste à faire, sans décision** : « fuite 1 » de la passe `evals traduire`
de `heures_par_agent`, non lue ; une fuite comptée à tort sur exception ;
l'arrondi des heures recopié de `remplacement.ts` ; agence :
`facture_alerte`, `contrat_tma`, `brouillon_relance` (J+1 en dur), 17 tests
au lieu de 23, le piège `lots.nom`.

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

La table de `GLOSSAIRE.md`, « Les commandes », la seule ; le README,
« Faire tourner », dit ce que la table ne dit pas (laboratoire, agence,
client livré).
