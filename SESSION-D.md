# Consignes de la phase D — la ronde et le chantier

Écrit le 2026-10-11 au soir, après la phase C et l'amendement de
`PLAN-RONDE.md` (§ 0). Deux sessions, une consigne chacune, à coller telle
quelle en début de session. Modèle : Claude Opus 5.5, effort élevé
(`PLAN-GENERAL.md` § 0.3).

---

## Session D1 — lots 0 et 1 (la config de l'agence, la carte, la mémoire, la ronde)

Exécute les lots 0 et 1 de `PLAN-RONDE.md` (`PLAN-GENERAL.md` phase D), et
rien d'autre : une session = une phase au plus, et la phase D en prend deux.

- Ne pose aucune question à Lionel. Quand un plan se tait : KISS, et note le
  choix dans `HANDOFF.md` sous « Choix faits faute de consigne ».
- Ne rouvre aucune décision G1 à G11 ni R1 à R11, ni les points laissés à
  Lionel : le designer au niveau 2 de la traduction ; le plafond
  `par_demande.tokens_sortie` ; la date de la bascule de l'abonnement vers
  la clé d'API (`PLAN-RONDE.md` § 0.a).
- Lis dans l'ordre : `HANDOFF.md`, `PLAN-GENERAL.md` (§ 0, § 2, phase D,
  § 6), `PLAN-RONDE.md` **en entier, son § 0 d'abord**, `PLAN-PSEUDONYMES.md`
  S5 (`consigne_modele`), `PLAN-PROMOTION.md` § 2 (P1 à P15), les passes 16
  à 18 de `evals/erreurs-2026-10-08.md`. `pnpm check` vert avant tout.
- Branche `general/d-ronde`, partie de `main` ; un commit par lot (`Ronde,
  lot 0 : …`, `Ronde, lot 1 : …`), pas de push, pas de fusion : la session D2
  finit la phase.
- **Lot 0** : `agence.yaml` (`acces: claude` pour les quatre rôles ; les
  prix relus dans la doc d'Anthropic ce jour-là, jamais en dur dans le
  code), `moteur/src/agence/config.ts` avec le préflight de § 0.a (`claude
  auth status` connecté, `ANTHROPIC_API_KEY` absente, sinon refus qui le
  dit), `methode/architecture-pour-modeles.md` et son test (aucun nom du
  client fictif), `memoire/` et `moteur/src/chantier/memoire.ts` (R10) avec
  le test de fuite sur tout `memoire/`.
- **Lot 1** : `resume.ts`, `rapport.ts`, `ronde.ts`, `claude.ts`
  (`lancerClaude`, avec `--json-schema` et `--tools ""` pour la ronde),
  `pnpm ronde --client --date [--depuis] [--refaire] [--sans-modele]
  [--verifier-modeles]`, `pnpm evals ronde`, les tests du § 5.
- **Accès au modèle** : l'abonnement claude.ai par le binaire `claude`, pas
  la clé (§ 0.a). Le binaire est connecté sur la machine (`claude auth
  status` → `loggedIn: true`, `authMethod: claude.ai`, relu le 2026-10-11) ;
  `ANTHROPIC_API_KEY` n'est pas dans l'environnement : ne la cherche pas, ne
  la demande pas. Le coût s'écrit « estimé par le binaire ». GMI_API_KEY
  pour GLM : voir la mémoire ; sans clé, le dire et ne pas écrire « mesuré ».
- **Les étiquettes** (§ 0.c) : écris trois journaux fixés (copies du client
  fictif, dont un sans rien à signaler) et un brouillon des missions
  attendues, `etiquettes: brouillon` ; le résultat de `pnpm evals ronde`
  s'écrit « brouillon, pas une mesure ». Lionel étiquette ensuite.
- **Critère observable** : sur une copie de `exemples/client-fictif` dont le
  journal contient des échappées (rejoue `pnpm evals echappee` sur la copie
  si le journal est vide), `pnpm ronde --client <copie> --date <jour>` avec
  Fable 5.1 par le binaire écrit `rondes/<jour>.md`, `.json`, un
  `rondes/<jour>/<id>.yaml` par mission, une ligne `ronde` au journal avec
  des comptes seulement ; la trace de la ronde a une colonne « fuite » à
  0 ; `--sans-modele` montre le résumé sans appel ; relancé, il ne refait
  rien sans `--refaire`. Trois passes réelles de la ronde, jamais une
  conclusion sur une seule.
- Règles, à conserver telles quelles : « aucun nom de modèle, prix,
  plafond, chemin ou jeton en dur ; `assertEnv` ; pas de `any` ni de `TODO` ;
  aucune donnée réelle ; jamais d'écriture dans `exemples/client-fictif/` ;
  ne touche ni `regles.yaml` ni un contrôle I01…I20 ; commentaire de tête
  qui cite le plan sur tout fichier nouveau ; aucun nom de salarié ne part
  au modèle ; la ronde ne reçoit ni instantané, ni résultat de requête, ni
  texte montré, ni nom. »
- Fin de session : README et `HANDOFF.md` à jour (« Où on en est », risques,
  « Phase D, session D1 » avec les choix et les pièges) ; analyse d'erreurs
  des passes réelles (une passe de plus dans `evals/erreurs-2026-10-08.md`) ;
  ni mini-site ni présentation (la session D2 les relit).
- Termine par le bloc « Vérifié / Non vérifié, risque », puis arrête-toi.

---

## Session D2 — lots 2 et 3 (le chantier, la nuit), relecture, fusion

Exécute les lots 2 et 3 de `PLAN-RONDE.md`, puis finis la phase D de
`PLAN-GENERAL.md`, et rien d'autre.

- Mêmes règles que D1 (questions, décisions, lecture, accès, GMI, règles
  citées). Lis en plus `HANDOFF.md` « Phase D, session D1 » et les commits de
  `general/d-ronde`. `pnpm check` vert sur cette branche avant tout.
- Continue sur `general/d-ronde` ; un commit par lot (`Ronde, lot 2 : …`,
  `Ronde, lot 3 : …`), puis le commit des corrections de relecture.
- **Lot 2** : `mission.ts` (§ 0.b : « promotion en cours », jamais
  « attend le lot 4 »), `arbre.ts`, `garde.ts`, `fusion.ts` (les huit
  conditions de G1, `git merge --no-ff` dans `main` **du clone de la nuit**
  seulement, étiquette, push ; `retirer` = `git revert -m 1`),
  `chantier.ts`, `methode/chantier.md` (un geste qui écrit rend des
  `Modification` et passe par `ouvrirProposition`), `pnpm chantier
  --mission [--sans-modele]`, `pnpm chantier retirer <id> --motif`, les tests
  du § 6 avec le binaire `claude` **simulé** (un script qui écrit un diff
  connu et rend un JSON), dont : aucun `merge` ni `push` hors de `fusion.ts`,
  et `fusion.ts` refuse hors du clone de la nuit (R11).
- **Lot 3** : `pnpm nuit --client` (promotions → ronde → au plus une
  mission), idempotent ; la ligne cron dans le README, rien d'installé.
- **Critère observable**, en deux temps :
  1. en simulé : G1 et G2 rejoués (une fusion sous huit conditions vertes,
     un refus pour chaque condition rouge, un retrait qui défait) ;
  2. pour de vrai, sur une copie du client fictif et un clone de la nuit
     (`depot_nuit`) qui pointe sur un dépôt **local** nu (jamais `origin`
     pendant la phase) : deux missions, `simuler_absence` → un geste codé,
     et une `factorisation` de deux intentions de lecture ; pour chacune,
     Fable planifie, Opus implémente, Fable relit, par le binaire ; diff dans
     la bande, `pnpm check` rejoué par le code, trois cas de traduction qui
     passent avec GLM, constats lus un à un, coût « estimé par le binaire »,
     durée ; 2/2 fusionnés dans `main` du clone, ou refusés pour une raison
     écrite ; puis `pnpm chantier retirer` sur l'un des deux, et la ronde
     suivante ne le repropose pas. Une mission `ecrit` sur
     `liberer_un_jour` au seuil → dossier « promotion en cours », aucun
     appel.
- Relecture indépendante en lecture seule de toute la branche (un
  sous-agent qui n'a pas écrit le code), corrections, `pnpm check` vert,
  fusion `--no-ff` de `general/d-ronde` dans `main`, push.
- Fin de phase : README et `HANDOFF.md` à jour ; analyse d'erreurs ; relire
  le mini-site (https://claude.ai/artifact/TustZJh4FbAG17ZcDjBG52) et la
  présentation (https://claude.ai/artifact/B8Dj1EJySsdZ6bJAyJCsN2) pour dire
  « construit » pour la ronde et le chantier (le discours de `PLAN-RONDE.md`
  § 10.8), rien de plus ; dans les deux, l'accès reste décrit comme une clé
  d'API de l'agence, l'abonnement étant un réglage de laboratoire.
- Termine par le bloc « Vérifié / Non vérifié, risque », puis arrête-toi.
