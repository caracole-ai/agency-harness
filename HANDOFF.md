# Handoff — 2026-10-14

Pour reprendre dans une session neuve : deux pages, l'état et la suite. Les
décisions et leur fil sont dans `REFLEXIONS.md`, les plans dans `PLAN-*.md`,
l'historique dans git (l'ancien handoff de 4 220 lignes :
`git show 15a128b:HANDOFF.md`).

## Où on en est

`main` = `origin/main` = la fusion de `general/choix-patron` (S9).
`pnpm check` vert : moteur 644, interface 25, sécurité 145, agence web 263.

- **Le moteur ne sait rien d'aucun métier** ; deux métiers le prouvent :
  la sécurité privée (`metiers/securite-privee`, client
  `exemples/client-fictif`) et l'agence web (`metiers/agence-web`, client
  `exemples/agence-web-fictive`).
- **Les trois espaces** (`PLAN-ESPACES.md`) : la traduction vers un geste
  codé, l'échappée (SQL en lecture sur une copie, pseudonymes, contrôle « pas
  un chiffre ni un nom hors des données »), la promotion d'une demande qui
  revient en geste appris (`PLAN-PROMOTION.md`), activé par le patron.
- **La nuit** (`PLAN-RONDE.md`, `PLAN-GENERAL.md`) : ronde, chantier, fusion
  automatique sous conditions, sur l'abonnement par le binaire `claude`.
- **Le modèle du quotidien : Sonnet 5.5 par l'abonnement**
  (`acces: { binaire: claude }`, `moteur/src/modele/abonnement.ts`), depuis
  le 2026-10-14. GLM-5.3 chez GMI n'est plus utilisé (crédit épuisé).
- **Dernières mesures (Sonnet, 2026-10-14)** : échappée de la sécurité
  18/18 ; `liberer_un_jour` 3/3 depuis que la sécurité déclare son départage
  (préférences définies comme le code les calcule, puis le numéro d'agent) ;
  agence 16 et 17/24, sous son seuil parce que ses étiquettes sont des
  brouillons (voir « Pour Lionel »). La traduction n'a pas été mesurée en
  entier sur Sonnet.

## La suite

**S9 fusionnée** (`PLAN-CHOIX.md`) : le patron change un agent dans une
proposition (`changer_remplacant`, en mots) ; une proposition corrigée
n'apprend rien et le dossier de promotion la compte. **Suivante : lot 3 de
S9**, les boutons « Prendre X pour V-03 » dans l'interface (sans modèle,
vérification visuelle).

**Choix faits seul (S9) :** la nouvelle R-… se rattache à la conversation
d'origine par un champ générique `corrige` (`Resultat`,
`PropositionMetier.ouvrir`), sinon une correction faite depuis une autre
conversation échappe à la promotion ; le patron nomme la vacation ou son
jour, deux R-… en attente : « laquelle ? ».

**Mesure S9 (Sonnet, `evals/resultats/apparie-2026-10-14-s9-*`)** :
traduction base 60 + 59, lot 60 + 60 sur les cas communs ; cas neufs 12/12 ;
`liberer_un_jour` 3/3 ; gestes 6/6 des deux côtés ; échappées identiques au
simulé. Fuite : R-2 seule, des deux côtés ; Lionel a lu « fuite 0 » comme
« pas de fuite de plus que `main` » (la règle des mesures passées).

## La méthode (Lionel, 2026-10-14 : « anti-over-engineer et KISS »)

- **Lire les traces avant toute correction.** Une cause se cherche dans ce
  que le modèle a lu et écrit, pas en relevant un plafond ou en réécrivant
  une phrase.
- **Mesurer une fois, à la fin**, avec assez de passes pour que l'écart
  attendu dépasse le bruit (l'écart entre deux passes de la base).
- **La cérémonie** (règle écrite et commitée avant la mesure, mesure
  appariée base contre lot, une condition fausse : pas de fusion) **ne sert
  que pour la sécurité, la vie privée et la fusion dans `main`.** Un essai,
  une exploration : on corrige, on relance, sans règle.
- **Sonnet tant qu'on construit** ; le coût se règle au déploiement.
- Ce fichier reste à deux pages : on remplace, on n'ajoute pas un journal.

**Le laborieux s'évite** (Lionel : « préviens-moi quand on part sur des
choses laborieuses, et évite de le faire, tout simplement ») : Claude prend
d'abord le chemin simple ; s'il n'y en a pas, il prévient Lionel avant de
s'engager. Les signaux (leçons de S1 à S8) :
1. Une deuxième correction du même problème sans avoir lu une trace
   (`liberer_un_jour` : trois sessions de plafonds et de phrases ; la cause,
   des ex æquo, se lisait dans trois traces).
2. Du code écrit pour contourner un fournisseur plutôt que pour le produit
   (GLM : flux, borne de coût, coupure à 120 s, plafonds à 40 000).
3. Un verdict qui tient à un ou deux cas : c'est du bruit, pas une mesure.
4. Une règle de mesure réécrite parce qu'une mesure l'a rendue caduque.
5. Un cas rouge sur deux modèles : l'étiquette est suspecte ; la question va
   à Lionel, on ne retouche pas le prompt.
6. Deux sessions sans rien de nouveau visible pour le patron.
7. Ce fichier au-delà de deux pages, ou un compte rendu plus long que ce
   qu'il apprend.

## Pour Lionel : 30 minutes par semaine

Dire ce qu'est une bonne réponse (E1), ou mieux, mettre un vrai patron
devant l’outil. Premiers cas, rouges le plus souvent sur GLM comme sur Sonnet, dans
`metiers/agence-web/evals/echappees.yaml` : **E-04, E-12, E-16, E-20** (la
réponse attendue demande-t-elle plus que la question ?). Puis relire les
étiquettes de `metiers/securite-privee/evals/consignes.yaml`.

## Ouvert

- À Lionel : R-2 (« Aisha ») fuit à chaque passe : le niveau 2 de
  `designer` envoie au modèle les candidats avec leur nom, contre « aucun
  nom ne part au modèle ». Les règles de mesure disent désormais « pas de
  fuite de plus que `main` ».
- À Lionel : la bascule vers la clé d'API avant un client réel ; la mise à
  jour à distance d'un harnais livré ; la phase E (tâche cron) ; aligner le
  départage de `gerer_absence` (par nom) sur celui des propositions (par
  numéro).
- Les tableaux d'évals disent « coût réel » sous l'abonnement (une
  estimation).
- Agence : `facture_alerte`, `contrat_tma`, `brouillon_relance` (J+1 en dur),
  17 tests au lieu de 23, les promotions jamais mesurées, le piège
  `lots.nom`.
- Une fuite comptée à tort sur exception ; le commentaire « impossible » de
  `compter_vacations` (`metiers/securite-privee/evals/promotions.yaml`).
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
- `ConfigSecurite` est un `strictObject` ; tout client exige
  `personnes.yaml`.
- Le contrôle des fuites refuse tout mot qui est un nom d'agent fictif (« petit »
  = Laura Petit) : reformuler, jamais l'affaiblir.
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
pnpm promotions --client <copie> [--date AAAA-MM-JJ] [--sans-modele]
pnpm gestes --client <copie> lister | verifier <id> | activer <id> --par <nom> | retirer <id> --motif "…"
pnpm evals traduire|echappee|promotion|gestes --client exemples/client-fictif [--seulement id,id] [--modele simule]
pnpm ronde --client <copie> --date AAAA-MM-JJ [--sans-modele]
pnpm chantier --mission <copie>/rondes/<date>/<id>.yaml
pnpm nuit --client <copie> [--date AAAA-MM-JJ]   # jamais avec `pnpm -s`
```
