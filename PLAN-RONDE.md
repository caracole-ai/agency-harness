# Plan — la ronde de nuit et le chantier : le harnais propose ce qui manque au catalogue, un modèle le code, un humain fusionne

> **Amendé le 2026-10-15** : la promotion automatique est retirée. La ronde
> n'écrit aucune mission `geste_code` pour une intention que le patron n'a
> pas commandée ; plus d'état « promotion en cours » (§ 0.b) ni de décision
> « attend » ; la nuit enchaîne purge des instantanés → ronde → chantier.
> **Puis** (même jour, plan « commande → geste codé ») : la ronde ne peut plus
> écrire `geste_code` (hors de son schéma, `SORTES_RONDE`) ; la mission d'un
> geste commandé est écrite par le code à la commande (`commanderMission`,
> `moteur/src/chantier/mission.ts`), sans `estimation`, et la nuit la prend
> comme les autres. **Enfin, la ronde est retirée** (Lionel, même jour :
> « on arrête avec la détection de récurrence, c'est trop instable ; c'est
> le patron qui donne les directives ») : plus aucun modèle ne cherche ce qui
> manque. Restent de ce plan le chantier (§ 6), la nuit (§ 7, sans ronde),
> la mémoire (R10) et `agence.yaml` ; les missions vivent dans
> `<client>/missions/<date>/`.

Écrit le 2026-10-10, sur deux décisions de Lionel du même jour
(`REFLEXIONS.md`, « Décidé ») :

- **B.** « Il faut prévoir un processus d'ingestion joué chaque nuit : tiens
  modèle, analyse ce journal de la journée ou du mois, voici les schémas de
  mon architecture, voici à quoi elle sert ; dis-moi si une échappée, une
  intention, un motif peut être transformé en geste. S'il en désigne une, ou
  plusieurs factorisables ensemble, on a une mission de code à produire, on
  la confie au modèle, il la fait, on la teste, on la relit de façon
  critique — avec la bonne hiérarchie de l'architecture : il ne faut pas que
  les devs fassent partir en vrille l'architecture de base (moteur, métiers,
  réglages, modèles). » Ça remplace, pour partie, P15 de `PLAN-PROMOTION.md`
  (« la promotion est bornée au catalogue déclaré ») : le catalogue reste ce
  que la traduction lit ; **la ronde propose ce qui lui manque**.
- **C.** « Le modèle qui recevra la demande finale d'implémentation sera un
  modèle différent : Claude Fable 5.1 pour la planification, Opus 5.5 en
  effort élevé pour l'implémentation. » GLM-5.3 reste le modèle du quotidien
  (traduction, échappée, fabrication d'un geste appris).

Ce plan ne touche pas : P1 (un geste appris est une donnée, pas du code),
la fabrication des gestes appris par `pnpm promotions` (elle reste le chemin
court pour une intention du catalogue en lecture), les contrôles, les règles
(`regles.yaml` : **jamais écrites par un modèle**, elles viennent d'une
relecture humaine des textes), le moteur (le chantier n'y écrit jamais), la
clé, l'interface du patron (il ne voit ni la ronde ni le chantier : il voit
un geste de plus, le jour où il est livré). La livraison d'un geste à un
harnais en service reste la mise à jour à distance, le chantier de Lionel.

**Tranché par Lionel le soir même** (Claude recommandait que la fusion
reste humaine ; position consignée dans `REFLEXIONS.md`) : **pas de fusion
humaine** — « je veux que ce soit un système auto-améliorant, il faut bien
commencer par quelque chose ». La chaîne va jusqu'à la fusion dans `main`,
sous huit conditions vérifiées en code (`PLAN-GENERAL.md` G1), avec un
retrait d'une commande (G2), dans un clone réservé à la nuit (G3), et
jusqu'à la livraison (G8). **Tout ce que la nuit fait va dans une mémoire**
(R10). Les choix du § 10 sont tranchés dans `PLAN-GENERAL.md` § 2.

**Critère de succès global** (observable), sur une copie de
`exemples/client-fictif` dont le journal contient les passes d'évals des
2026-10-08 et 09 (une centaine d'échappées) :

1. `pnpm ronde --client <copie> --date 2026-10-10` écrit
   `<copie>/rondes/2026-10-10.md` et `.json` : les intentions vues, les
   demandes qui se ressemblent sans intention commune, les abandons et les
   « je ne sais pas » qui reviennent, et **des missions** désignées par
   identifiants (`E-…`, intentions), chacune avec sa sorte, sa raison et
   ses consignes-types **sans aucun identifiant ni nom** ; le journal porte
   une ligne `ronde` avec des comptes seulement ; coût affiché ;
2. la ronde n'a reçu ni instantané, ni résultat de requête, ni texte montré,
   ni nom (la trace le prouve : colonne « fuite » de `PLAN-PSEUDONYMES.md`) ;
3. `pnpm chantier --mission <copie>/rondes/2026-10-10/<id>` crée un arbre de
   travail et une branche `chantier/<id>`, fait écrire le geste et ses tests
   par Claude Opus 5.5 dans la bande métier **seulement**, rejoue
   `pnpm check` lui-même, fait relire la branche par Claude Fable 5.1, et
   écrit `<copie>/chantiers/<id>.md` : mission, plan, fichiers touchés,
   tests, résultat de la relecture, coût, durée, et le bloc
   « Vérifié / Non vérifié, risque » du modèle ; puis, **si les huit
   conditions de G1 sont vertes, fusionne dans `main` du clone de la nuit**,
   pose l'étiquette `chantier/<id>`, pousse, écrit l'entrée de
   `memoire/` ; sinon la branche reste et le dossier dit pourquoi ;
   `pnpm chantier retirer <id> --motif …` défait la fusion, écrit la mémoire
   et le journal, et la ronde suivante ne repropose pas la mission ;
4. une mission dont le diff sort de la bande métier (un fichier de
   `moteur/`, `regles.yaml`, `interface/`) est **refusée par le code** : la
   branche reste, le dossier dit pourquoi, le chantier sort en échec ;
5. une mission `ecrit` sur une intention dont la promotion est en cours
   (`liberer_un_jour` au seuil, sans dossier d'échec) ne lance rien : le
   dossier dit « promotion en cours » ; la même, après un dossier « à coder
   à l'atelier », lance le chantier comme une autre (§ 0.b) ;
6. `pnpm nuit --client <copie>` enchaîne promotions → ronde → au plus une
   mission de chantier, dans les bornes de `agence.yaml` ; relancé deux fois
   la même nuit, il ne refait rien (idempotent) ;
7. `pnpm check` vert ; `pnpm evals ronde` (cas étiquetés par Lionel, § 8)
   au seuil.

---

## 0. Amendements du 2026-10-11 (après la phase C ; décidés par Lionel)

Ils priment sur le reste du plan ; les passages qu'ils corrigent renvoient ici.

a. **L'accès aux modèles d'Anthropic, au laboratoire : l'abonnement claude.ai,
   par le binaire `claude`**, pour les quatre rôles (ronde, plan,
   implémentation, relecture), et non la clé d'API. `agence.yaml` porte
   `acces: claude` ; la ronde passe alors par `lancerClaude` (6.2) avec
   `--json-schema` (le schéma de `rapport_de_ronde`) et `--tools ""` (aucun
   outil), pas par la couche modèle du harnais ; son coût est celui que le
   binaire rapporte (`total_cost_usd`), écrit « estimé par le binaire »,
   jamais « mesuré ». Préflight avant tout appel : `claude auth status` rend
   `loggedIn: true` ; et `ANTHROPIC_API_KEY` **n'est pas dans
   l'environnement** (une clé présente l'emporte en mode `-p` et facturerait
   l'API) : si elle y est, la commande refuse avant tout appel, en le disant.
   `acces: anthropic` (la clé ; la ronde par la couche modèle, comme la
   fabrication ; `assertEnv('ANTHROPIC_API_KEY')` au moment de l'appel) reste
   le mode de G10, et le code le garde : **la bascule vers la clé doit avoir
   lieu avant la finalisation**, au plus tard avant la phase E (la nuit en
   service continu), et tout se mesure à nouveau ce jour-là. Pourquoi :
   fabriquer les mécanismes sans dépenser l'API ; la doc réserve
   l'abonnement à un usage personnel, ce qu'est le laboratoire sur la
   machine de Lionel, pas un harnais livré.
b. **Une mission qui écrit n'« attend » plus le lot 4** (phase C faite :
   `Intention.ecrit` est promouvable, un geste appris porte
   `modifications`). Le code revalide ainsi : une mission `ecrit` sur une
   intention du catalogue au seuil de promotion, sans dossier d'échec de
   fabrication → « promotion en cours », aucun chantier (comme pour une
   lecture) ; une mission `ecrit` dont la fabrication a échoué (dossier « à
   coder à l'atelier ») ou hors catalogue → le chantier, comme une autre, et
   le geste codé qui écrit rend des `Modification` et passe par
   `ouvrirProposition` (contrôles, oui du patron, oui des agents, clé),
   jamais par une écriture à lui.
c. **Les étiquettes de `pnpm evals ronde`** : la session qui fait le lot 1
   écrit les journaux fixés et un **brouillon** des missions attendues,
   marqué `etiquettes: brouillon` dans `evals/rondes.yaml` ; le résultat
   s'écrit alors « brouillon, pas une mesure ». Lionel remplace le brouillon
   par ses étiquettes (`etiquettes: lionel`) et relance : c'est la mesure.

---

## 1. Règles de travail pour la session qui exécute

1. **Avant de coder** : lire `HANDOFF.md`, `PLAN-PROMOTION.md` § 2 (P1 à
   P15), `PLAN-PSEUDONYMES.md`, ce plan en entier, puis les fichiers que le
   lot touche. `pnpm check` vert au départ.
2. **Un lot = une branche `ronde/lot-N` = un commit** (pas de push). Avant le
   commit : `pnpm check` vert, README et `HANDOFF.md` à jour. Le commit cite
   le lot : `Ronde, lot N : <titre>`.
3. **Ne jamais** : lancer un chantier sur `main` ou sur l'arbre courant
   (toujours un arbre de travail du clone de la nuit, G3) ; fusionner sans
   les huit conditions de G1, ou ailleurs que dans le clone de la nuit ;
   livrer hors du chemin de G8 ; donner au modèle de la ronde un instantané, un résultat de
   requête, un texte montré, un nom ; donner au modèle du chantier une
   donnée du client (il reçoit des consignes-types) ; écrire un nom de
   modèle, un prix, un plafond, un nombre de tours en dur (tout vient de
   `agence.yaml`) ; écrire `process.env.X ?? 'valeur'` ; `any` ; `TODO` ;
   une dépendance de plus (le chantier appelle le binaire `claude`, pas un
   SDK).
4. **Conventions** : `PLAN-ESPACES.md` § 1.4 ; commentaire de tête qui
   renvoie à `PLAN-RONDE.md § n`.
5. **Quand le plan se tait** : `~/.claude/CLAUDE.md` et KISS ; noter dans
   `HANDOFF.md` sous « Choix faits faute de consigne ».
6. **Sous-agents** : un par fichier de test ou module indépendant (§ 9).
7. **Mesurer avant de déclarer** : la ronde (lot 1) et le chantier (lot 2)
   ne sont finis qu'avec une passe réelle (§ 8), coût affiché. Sans clé
   Anthropic dans la session : le dire dans `HANDOFF.md`, ne pas écrire
   « mesuré ». Avec l'abonnement (§ 0.a) : « estimé par le binaire ».

---

## 2. Décisions (prises par Claude le 2026-10-10 ; à trancher au § 10)

| # | Décision | Pourquoi |
|---|---|---|
| R1 | **Deux étages de geste, pas un.** (a) Le **geste appris**, une donnée (P1) : fabriqué par GLM, vérifié par rejeu, activé par le patron ; pour une intention du catalogue, en lecture, par `pnpm promotions`. (b) Le **geste codé**, du TypeScript dans la bande métier, comme les neuf d'aujourd'hui : écrit par le chantier pour ce que (a) ne sait pas exprimer (une écriture, une règle, une simulation, une intention nouvelle, plusieurs demandes à factoriser), relu, fusionné par un humain, livré par la mise à jour à distance. | (a) est sûr parce que borné par un schéma ; (b) est puissant parce que c'est du code. On ne demande pas à (a) de faire le travail de (b), ni l'inverse. |
| R2 | **La ronde est une lecture, et elle ne lit que la demande, jamais la donnée.** Un appel par nuit et par client, modèle `ronde` de `agence.yaml` (Claude Fable 5.1, effort élevé), **un seul outil** `rapport_de_ronde` au schéma strict (par le binaire, § 0.a : une sortie structurée `--json-schema` au même schéma), revalidé en code. Elle reçoit : (1) un **résumé fait en code** du journal sur la fenêtre (la journée ; `--depuis` pour un mois) : par conversation, le rôle, la consigne **version modèle** (`consigne_modele`, `PLAN-PSEUDONYMES.md` S5), ce qu'elle est devenue (geste + paramètres sans valeur de personne, ou `demande_nouvelle` + intention + fin de l'échappée + tours + coût, ou `je_ne_sais_pas` + motif), les précisions demandées ; en comptes : par intention et par geste sur 30 jours glissants, abandons par motif, plafond consommé ; (2) le **catalogue** : gestes codés et appris actifs (id, description), intentions (id, description, `ecrit`), gestes proposés en attente, missions déjà ouvertes ; (3) la **carte de l'architecture pour un modèle** (`methode/architecture-pour-modeles.md`, § 4.3) ; (4) `FRONTIERE`. Elle ne reçoit **jamais** : un instantané, un résultat de requête, un texte montré, un nom, le nom du client. | C'est la réponse à « le modèle reçoit-il des informations assez abstraites ? » : la ronde voit **ce qui a été demandé et comment ça a fini**, pas les données. Une consigne masquée et une intention suffisent à voir un motif ; une donnée n'y sert à rien. |
| R3 | **La ronde désigne par identifiants et décrit par types.** Chaque mission du rapport : `id` (slug), `sorte` (`intention_nouvelle`, `geste_code`, `factorisation`, `question_pour_l_atelier`), `titre`, `pourquoi` (avec les comptes), `echappees` (`E-…`), `intentions`, `consignes_types` (la demande réécrite avec des places : « combien d'heures a fait <agent> entre <du> et <au> »), `ecrit` (vrai si la demande modifie le planning), `estimation` (petite, moyenne, grande). Le code **revalide** : chaque `E-…` existe dans la fenêtre ; une intention citée existe ou est un slug neuf ; une mission sur une intention qui a déjà un geste actif est écartée ; une mission `ecrit` suit § 0.b (promotion en cours, ou le chantier) ; `consignes_types` sans aucun identifiant ni nom (`fuites`, et `/\bA-\d+\b/`) ; au plus `missions_max` par ronde. Une intention du catalogue au seuil est **déjà prise en charge** par `pnpm promotions` : la ronde peut la citer, le code la marque « promotion en cours », aucun chantier. | Même grammaire que la traduction et la fabrication : un appel, un outil, un choix, revalidé en code, un repli clair. La mission qui part vers le dépôt ne porte aucune donnée du client, seulement des types ; les identifiants restent dans le rapport, chez le client, pour la traçabilité. |
| R4 | **Le rapport s'écrit chez le client, la ligne au journal ne porte que des comptes.** `<client>/rondes/<date>.md` (pour Lionel) et `.json` (pour le chantier), une mission par fichier `<client>/rondes/<date>/<id>.yaml`. Ligne `ronde` au journal : `{ fenetre, conversations, missions, cout }`. Idempotent : une ronde déjà faite pour cette date ne se refait pas sans `--refaire`. | Le journal reste en ajout seul et sans texte libre du modèle ; le rapport, lui, peut se relire et se purger comme un dossier de promotion. |
| R5 | **Le chantier est Claude Code en mode non interactif, dans un arbre de travail à part, borné par la config, et son diff est gardé par le code.** `pnpm chantier --mission <fichier>` : (1) `git worktree add .claude/worktrees/chantier-<id> -b chantier/<id> main` ; (2) **plan** : `claude -p` avec le modèle `chantier.plan` (Fable 5.1, effort élevé), outils de lecture seuls, qui écrit `PLAN-CHANTIER.md` dans l'arbre (fichiers à toucher, gestes, paramètres, tests, cas d'évals, ce qu'il ne touchera pas) ; (3) **implémentation** : `claude -p` avec `chantier.implementation` (Opus 5.5, effort élevé), `--permission-mode dontAsk`, outils autorisés listés dans `agence.yaml` (lecture, édition, `pnpm check`, `pnpm test`, `git diff`, `git status`), `--max-turns` et `--max-budget-usd` de la config, `--append-system-prompt-file methode/chantier.md`, `--output-format json` ; le prompt est la mission + le plan ; (4) **garde** : `git diff --name-only main` ⊆ chemins autorisés (`metiers/<metier>/code/src/**`, ses `*.test.ts`, `evals/consignes.yaml`, `evals/gestes.yaml`, la fiche du métier) — sinon échec, branche gardée, dossier qui dit pourquoi ; (5) le code rejoue **lui-même** `pnpm check` et le test d'honnêteté (trois cas de traduction par geste nouveau) : il ne croit pas le modèle ; (6) **relecture** : `claude -p` avec `chantier.revue` (Fable 5.1, effort élevé), lecture seule, schéma JSON de constats (`bloquant`, `à corriger`, `remarque`, chacun avec fichier et ligne) ; un `bloquant` → **une** reprise par le modèle d'implémentation, puis stop (même règle que la relance de la fabrication, P5) ; (7) commit sur la branche, dossier `<client>/chantiers/<id>.md`, entrée de mémoire (R10) ; (8) **fusion** par `fusion.ts` si les huit conditions de `PLAN-GENERAL.md` G1 sont vertes (chemins, tests existants intacts, `pnpm check` rejoué, test d'honnêteté avec le modèle du quotidien, aucun `bloquant`, bornes, `lignes_max`, mémoire sans fuite) : `git merge --no-ff` dans `main` du clone de la nuit, étiquette `chantier/<id>`, push, ligne `chantier` / `fusionné` au journal ; sinon la branche reste, le dossier et la mémoire disent pourquoi. `pnpm chantier retirer <id> --motif` défait tout (G2). | Claude Code est fait pour éditer et tester du code dans un dépôt : on ne réécrit pas une boucle d'agent (décision du 2026-10-03). L'arbre à part protège le travail des humains. La garde sur les chemins est la hiérarchie de Lionel **appliquée par le code**, pas promise par un prompt. La relecture par un autre modèle que celui qui a écrit est la seule relecture critique qui vaille ; la fusion est en code, sous conditions mesurables, et se défait. |
| R6 | **La hiérarchie, écrite une fois, lue par les trois modèles** : `methode/architecture-pour-modeles.md` (la carte : moteur, métier, réglages, modèles ; ce qu'est un geste — un enchaînement déterministe, codé et testé — ; les deux étages R1 ; ce qu'un modèle ne fait jamais : écrire une règle, toucher le moteur, lire une donnée client ; comment finir : le bloc « Vérifié / Non vérifié, risque ») et `methode/chantier.md` (le système ajouté au chantier : conventions de code du dépôt, `pnpm check`, trois cas par geste, un commit, le dossier). **Aucune donnée client dans ces fichiers**, jamais. | Une seule source pour la ronde, le plan, l'implémentation et la relecture ; un modèle qui change ne change pas la carte. |
| R7 | **Les modèles, par rôle, dans `agence.yaml`** (nouveau, à la racine, sans secret ; la clé vient de `ANTHROPIC_API_KEY`) : `ronde` → `claude-fable-5-1`, effort élevé ; `chantier.plan` et `chantier.revue` → `claude-fable-5-1`, effort élevé ; `chantier.implementation` → `claude-opus-5-5`, effort élevé ; prix par million pour le compte ; `missions_max_par_nuit`, `tours_max`, `budget_usd_par_mission`, `outils_autorises`. Le quotidien ne change pas : `config.yaml` du client désigne GLM. La ronde passe par la couche modèle du harnais (`moteur/src/modele/`, un bloc d'accès Anthropic) et compte son coût comme tout appel ; le chantier passe par le binaire `claude`. **Authentification par clé d'API** pour les deux (la doc réserve le jeton d'abonnement à un usage personnel, et une clé présente l'emporte de toute façon en mode `-p`). **Amendé le 2026-10-11 (§ 0.a)** : au laboratoire, l'abonnement par le binaire, pour la ronde aussi (`acces: claude`) ; la clé reprend avant la finalisation. | C est la décision de Lionel. Deux chemins d'appel parce que deux besoins : un appel structuré (la ronde) et un agent qui édite et teste (le chantier). La clé d'API est le seul mode documenté pour un produit et pour une tâche sans personne devant. |
| R8 | **La nuit, c'est une commande** : `pnpm nuit --client <dossier>` enchaîne `promotions` → `ronde` → `chantier` sur la première mission non traitée, dans les bornes ; un cron de l'agence la lance. Idempotente. Un échec d'une étape n'empêche pas les suivantes d'être tentées ; tout est au dossier. Au laboratoire, tout tourne sur la machine de l'agence, sur une copie du client fictif. La topologie pour un harnais livré est au § 10. | Trois commandes qu'on peut lancer à la main et lire séparément, puis une qui les enchaîne : la même façon de faire que `pnpm promotions`. |
| R9 | **Ce qui se mesure** : la ronde contre des étiquettes humaines (§ 8, des journaux fixés, les missions attendues écrites par Lionel) ; le chantier sur des missions réelles du client fictif (check vert, diff dans la bande, constats de relecture, coût, durée, fusion ou refus motivé) ; et le taux de bout en bout : missions proposées → tentées → fusionnées → retirées → livrées. | Sans étiquette humaine sur la ronde, on ne saurait pas si elle désigne juste ; sans le taux de fusion et de retrait, on ne saurait pas si le chantier sert. |
| R10 | **La mémoire de la nuit, dans le dépôt** : `memoire/INDEX.md` (une ligne par événement : date, client, sorte — ronde, chantier, fusion, refus, retrait, mise à jour —, identifiant, titre, issue, coût), `memoire/chantiers/<date>-<id>.md` (la mission, le plan, les fichiers touchés, les tests, les constats de relecture, la raison d'une fusion ou d'un refus, le coût, et une section **« ce que j'ai appris »** de 20 lignes au plus écrite par le modèle d'implémentation), `memoire/rondes/<date>-<client>.md` (les missions proposées, retenues, écartées, avec les raisons ; sans aucun identifiant d'échappée ni donnée : ceux-là restent chez le client), `memoire/CONVENTIONS.md` (vivant : ce que les chantiers ont appris à faire et à ne pas faire ; le modèle d'implémentation peut y **ajouter** une ligne, jamais en retirer ; la relecture vérifie qu'une ligne ajoutée ne contredit ni la carte ni une convention existante), `memoire/MESURES.md` (une ligne par nuit, écrite par le code). **Qui lit quoi** : la ronde reçoit `INDEX.md` (les 60 dernières lignes), `CONVENTIONS.md` et les rondes des 7 derniers jours ; le plan reçoit `INDEX.md`, `CONVENTIONS.md` et les entrées de chantier qui citent les mêmes intentions ou gestes ; l'implémentation reçoit `CONVENTIONS.md` et le plan ; la relecture reçoit `CONVENTIONS.md`, la carte et l'entrée en cours. **Écrite par le code** depuis le dossier (la section libre du modèle est bornée et passée à `fuites`), commise avec la fusion (ou seule, pour un refus ou un retrait), toujours dans les chemins autorisés. Un test de `pnpm check` relit tout `memoire/` avec les personnes du client fictif : aucune fuite. | C'est la cohérence globale « au fil de l'eau » que Lionel demande : la nuit se souvient de ce qu'elle a fait, pourquoi, et de ce qu'on lui a retiré ; elle ne repropose pas une mission retirée, ne refait pas une convention à l'envers. Dans le dépôt, parce que c'est ce que le chantier lit et ce que Lionel relit après coup. |
| R11 | **Le clone de la nuit** (`PLAN-GENERAL.md` G3) : `agence.yaml: depot_nuit` ; `pnpm nuit` commence par `git fetch` et `git reset --hard origin/main` **sur ce clone seulement** ; les arbres de chantier en sont des `git worktree` ; la fusion et le push se font là. Un chemin de `depot_nuit` qui est l'arbre courant ou un arbre où `git status` n'est pas propre fait échouer la nuit avant tout appel. | Git refuse de mettre à jour une branche extraite ailleurs, et un humain ne doit jamais trouver son arbre modifié par la nuit. |

### Coût annoncé (estimation, à vérifier au § 8 ; prix dans `agence.yaml`, jamais en dur)

| Unité | Estimation | Plafond |
|---|---|---|
| Une ronde (journée de 5 à 20 conversations, catalogue, carte) | ≈ 6 000 tokens en entrée, 1 500 en sortie | un appel |
| Un chantier (plan + implémentation + relecture + une reprise au plus) | de l'ordre de quelques dollars ; l'implémentation domine | `budget_usd_par_mission`, `tours_max` ; `missions_max_par_nuit` |
| À la charge de | l'agence, jamais du plafond d'IA du client | — |

---

## 3. Où vit le code

```
agence.yaml                       (lot 0) modèles par rôle, prix, bornes, outils autorisés ; sans secret
methode/
  architecture-pour-modeles.md    (lot 0) la carte, lue par la ronde, le plan, l'implémentation, la relecture
  chantier.md                     (lot 2) le système ajouté au chantier
moteur/src/
  agence/config.ts                (lot 0) schéma zod d'agence.yaml, chargement ; acces: claude → préflight du binaire (§ 0.a) ; acces: anthropic → assertEnv de la clé
  ronde/
    resume.ts                     (lot 1) le résumé du journal en code (R2), sans donnée
    rapport.ts                    (lot 1) schéma zod RapportDeRonde, l'outil, la revalidation (R3)
    ronde.ts                      (lot 1) l'appel, l'écriture du rapport et des missions, la ligne au journal (R4)
  chantier/
    mission.ts                    (lot 2) schéma Mission, lecture, « promotion en cours » (§ 0.b)
    arbre.ts                      (lot 2) git worktree, branche, commit ; jamais merge ni push
    claude.ts                     (lot 1) lance le binaire claude -p, lit le JSON (résultat, coût, tours) ; la ronde l'emploie aussi (§ 0.a)
    garde.ts                      (lot 2) le diff dans la bande métier, tests existants intacts, lignes_max ; sinon échec
    fusion.ts                     (lot 2) les huit conditions de G1, git merge --no-ff, étiquette, push ; retirer = revert
    memoire.ts                    (lot 0) écrit INDEX, chantiers/, rondes/, MESURES ; lit pour la ronde, le plan, la relecture (R10)
    chantier.ts                   (lot 2) plan → implémentation → garde → check → relecture → reprise (une) → dossier → mémoire → fusion
  cli/
    ronde.ts                      (lot 1) pnpm ronde --client --date [--depuis] [--refaire] [--sans-modele]
    chantier.ts                   (lot 2) pnpm chantier --mission [--sans-modele]
    nuit.ts                       (lot 3) pnpm nuit --client
    evals.ts                      (lot 1) pnpm evals ronde
  evals/evals.ts                  (lot 1) contrôles en code de la ronde
evals/
  rondes.yaml                     (lot 1) journaux fixés → missions attendues (étiquettes de Lionel)
memoire/                          (lot 0) INDEX.md, CONVENTIONS.md, MESURES.md, chantiers/, rondes/ (R10) ; dans les chemins autorisés du chantier
<dossier client>/
  rondes/<date>.md, .json         (lot 1) le rapport
  rondes/<date>/<id>.yaml         (lot 1) une mission
  chantiers/<id>.md               (lot 2) le dossier d'un chantier
```

---

## 4. Lot 0 — La config de l'agence et la carte pour les modèles

### 4.1 `agence.yaml`

```yaml
modeles:                         # acces: claude = l'abonnement par le binaire (§ 0.a, laboratoire) ; anthropic = la clé (G10, avant la finalisation)
  ronde: { acces: claude, modele: claude-fable-5-1, effort: high }
  chantier:
    plan: { acces: claude, modele: claude-fable-5-1, effort: high }
    implementation: { acces: claude, modele: claude-opus-5-5, effort: high }
    revue: { acces: claude, modele: claude-fable-5-1, effort: high }
prix_par_million_usd:            # relus dans la doc le jour du lot 0, jamais en dur dans le code ; servent à l'estimation sous acces: anthropic
  claude-fable-5-1: { entree: …, sortie: … }
  claude-opus-5-5: { entree: …, sortie: … }
ronde:
  missions_max: 3
chantier:
  missions_max_par_nuit: 1
  tours_max: 60
  budget_usd_par_mission: 10
  outils_autorises: [Read, Edit, Write, Glob, Grep, "Bash(pnpm check)", "Bash(pnpm test*)", "Bash(git diff*)", "Bash(git status*)"]
  chemins_autorises: ["metiers/*/code/src/**", "evals/consignes.yaml", "evals/gestes.yaml", "metiers/*/fiche.md"]
```

`moteur/src/agence/config.ts` : schéma zod strict, `chargerAgence(racine)`,
et le préflight **au moment de l'appel** (pas au chargement : `--sans-modele`
ne l'exige pas) : sous `acces: claude`, `claude auth status` connecté et
`ANTHROPIC_API_KEY` absente, sinon refus qui dit pourquoi ; sous
`acces: anthropic`, `assertEnv('ANTHROPIC_API_KEY')`. Les deux identifiants
de modèle sont vérifiés par un appel minuscule (`pnpm ronde
--verifier-modeles`) avant la première nuit : un identifiant faux n'échoue
qu'au premier appel.

### 4.2 Préalables, à vérifier dans la doc le jour du lot (lus le 2026-10-10)

`claude -p "<prompt>" --model claude-opus-5-5 --effort high --permission-mode
dontAsk --allowedTools … --max-turns N --max-budget-usd X
--append-system-prompt-file methode/chantier.md --output-format json` ; le
JSON porte `result`, `session_id`, `total_cost_usd`, `num_turns`, `subtype`
(`success`, `error_max_turns`, `error_max_budget_usd`…) ; `--json-schema`
pour une sortie structurée (la relecture). `CLAUDE.md` de l'arbre est chargé
(pas `--bare`). Code de sortie non nul = échec, et un échec interne est
imprimé comme résultat : lire les deux. `claude auth status` en préflight.
Non confirmé par la doc : que `--effort` soit honoré en `-p` (à vérifier en
regardant le coût et la durée du premier chantier) ; un délai mural (le code
enveloppe l'appel dans un `timeout` à lui). Relu le 2026-10-11 dans
`claude --help` du binaire installé : `--json-schema`, `--tools`,
`--disallowedTools`, `--max-budget-usd`, `--effort`, `--model`,
`--permission-mode`, `--append-system-prompt` existent ; `claude auth
status` rend `{ loggedIn, authMethod: "claude.ai" | …, apiProvider }`. Pour
la ronde (§ 0.a) : `--tools ""`, `--json-schema <schéma>`, `--output-format
json`, et lire `structured_output`.

### 4.3 `methode/architecture-pour-modeles.md`

Une page, en français, sans donnée client, qui dit : les quatre bandes
(ce qu'on manipule, le moteur, le métier, le client) et ce que chacune
contient ; **ce qu'est un geste** (un enchaînement déterministe d'instructions,
codé, testé, que la traduction choisit et que le code exécute ; un geste
appris en est la forme « donnée ») ; les deux étages R1 et ce qui va dans
chacun ; les trois espaces ; ce qu'un modèle ne fait jamais (écrire ou lever
une règle, toucher le moteur ou l'interface, lire une donnée client, fusionner,
livrer) ; ce qui mérite une mission (une demande qui revient sans intention,
une intention sans geste possible en donnée, des abandons ou des « je ne sais
pas » qui se ressemblent, une demande coûteuse) et ce qui n'en mérite pas (une
demande vue une fois ; une intention du catalogue au seuil, déjà prise par la
promotion) ; comment finir (le bloc « Vérifié / Non vérifié, risque »).

Tests du lot 0 : `config.test.ts` (schéma strict, un champ inconnu refuse,
`assertEnv` seulement à l'appel) ; un test qui lit
`architecture-pour-modeles.md` et vérifie qu'il ne contient aucun nom du
client fictif (`fuites`).

---

## 5. Lot 1 — La ronde (`pnpm ronde`)

### 5.1 `resume.ts`

`resumerJournal(journal, fenetre, personnes) : Resume` — en code, sans modèle :
les conversations de la fenêtre (lignes `consigne`, `echappee`, `precision_attendue`,
`confirmation_attendue`, `appel_modele`), chacune réduite à `{ role,
consigneModele, devenue: geste { id, parametres sans personne } | demande_nouvelle
{ intention, fin, controle, tours, cout } | je_ne_sais_pas { motif }, precisions }` ;
les comptes sur 30 jours (par intention, par geste, abandons par motif,
`je_ne_sais_pas` par motif, plafond consommé) ; le catalogue (gestes codés,
gestes appris actifs et proposés, intentions, missions ouvertes lues dans
`rondes/*/`). **Refuse** (échec fermé) une conversation dont la ligne
`echappee` n'a pas `consigne_modele` (antérieure aux pseudonymes) : elle est
comptée, pas montrée. `fuites(resume, personnes)` doit être vide : testé.

### 5.2 `rapport.ts`

`RapportDeRonde` (zod strict) : `observations: string[]` (≤ 10, ≤ 300
caractères chacune), `missions: Mission[]` (R3), `rien_a_signaler: boolean`.
`outilRapport()` : un outil Anthropic, `strict: true`. `revalider(rapport,
resume, catalogue, config)` : les règles de R3, chaque écart en une phrase ;
un rapport qui ne passe pas est **écrit quand même** (« rapport refusé :
… ») et ne produit aucune mission.

### 5.3 `ronde.ts`

`systemeRonde(carte, catalogue)` : le rôle (« tu fais la ronde de nuit d'un
outil de planning… tu désignes, tu ne codes pas, tu ne lis aucune donnée »),
la carte (4.3), le catalogue, les sortes de mission et ce qui en mérite une,
`FRONTIERE`, « réponds par un seul appel de `rapport_de_ronde` ». Le message :
le résumé entre `<donnees>`. Un appel — sous `acces: claude` par
`lancerClaude` avec le schéma (§ 0.a), sous `acces: anthropic` par la couche
modèle avec l'outil — ; **une relance** sur échec de forme (zéro ou deux
outils, schéma, sortie structurée absente), comme la fabrication (P5) ; puis
« ronde échouée » au rapport. Écrit `rondes/<date>.md` (lisible : observations,
missions avec leurs raisons, comptes), `.json`, un `rondes/<date>/<id>.yaml`
par mission ; ligne `ronde` au journal avec `cout` (compté par la couche
modèle, borne haute si le fournisseur ne compte pas). `--sans-modele` : le
résumé et le catalogue seuls, écrits dans le `.md`, aucun appel (pour
relire ce que la ronde verrait).

### 5.4 `pnpm evals ronde`

`evals/rondes.yaml` : des journaux fixés (copies du client fictif après les
passes d'évals, rejouées à des dates données ; au moins trois, dont un sans
rien à signaler) et, pour chacun, les missions attendues **écrites par
Lionel** après lecture du résumé (`--sans-modele`) — d'abord un brouillon de
la session, marqué comme tel (§ 0.c) :
`{ sorte, intentions | consignes qui doivent y être, echappees qui doivent
y être }`. Contrôles en code : une mission attendue est trouvée si sa sorte
et ses intentions (ou ≥ 2 de ses échappées) y sont ; précision et rappel ;
seuil initial **à fixer après la première passe** (mesure, pas seuil, comme
le taux de promotion), fuite 0 dans toutes les traces.

Tests du lot 1 : `resume.test.ts` (fenêtre, comptes, refus d'une échappée
sans `consigne_modele`, aucune fuite), `rapport.test.ts` (chaque règle de
R3 en un cas), `ronde.test.ts` (simulé : rapport valide → fichiers + ligne ;
relance ; refus ; idempotence ; `--sans-modele`).

---

## 6. Lot 2 — Le chantier (`pnpm chantier`)

### 6.1 `mission.ts`

`Mission` (zod strict) = la mission écrite par la ronde + `client` (le nom du
dossier, pour le dossier de chantier seulement) + `metier`. `ecrit: true` sur
une intention dont la promotion est en cours (§ 0.b) → `{ sorte: 'attend',
motif: 'promotion en cours' }`, dossier écrit, aucun appel ; sinon le
chantier, et `methode/chantier.md` dit qu'un geste qui écrit rend des
`Modification` (jamais d'écriture à lui).

### 6.2 `arbre.ts`, `claude.ts`, `garde.ts`

- `ouvrirArbre(racine, id)` : `git worktree add .claude/worktrees/chantier-<id>
  -b chantier/<id> main` ; refuse si la branche existe (une mission déjà
  tentée ne se refait pas sans `--refaire`, qui supprime l'arbre, pas la
  branche). `commettre(arbre, message)` : un commit, avec la ligne
  `Co-Authored-By` du modèle. Jamais `merge`, `push`, `rebase`.
- `lancerClaude({ modele, effort, prompt, systemeAjoute, outils, permission,
  toursMax, budgetUsd, cwd, schemaJson? })` (lot 1, § 0.a : la ronde s'en
  sert) : le préflight (4.1), construit la ligne de commande (4.2),
  l'enveloppe dans un délai mural de la config, lit le JSON (`result`,
  `total_cost_usd`, `num_turns`, `subtype`, `structured_output`), rend
  `{ ok, texte, cout, tours, raison? }`. Aucun `any` : le JSON est validé
  par un schéma zod minimal.
- `garderDiff(arbre, chemins)` : `git diff --name-only main` ; tout chemin
  hors de la liste → `{ ok: false, horsBande: [...] }`.

### 6.3 `chantier.ts`

`chantier(mission, agence, racine)` : plan (Fable, lecture seule, écrit
`PLAN-CHANTIER.md` ; si le plan dit « ne peut pas se faire dans la bande
métier » → dossier « question pour l'atelier », stop) → implémentation
(Opus, bornée ; prompt = mission + plan + les consignes-types + « trois cas
de traduction par geste, un test par règle d'exécution, finis par le bloc
Vérifié / Non vérifié ») → `garderDiff` → `pnpm check` et le test
d'honnêteté **lancés par le code** → relecture (Fable, lecture seule,
`--json-schema` : constats) → un `bloquant` : une reprise (Opus, prompt =
les constats), puis à nouveau garde + check ; un second `bloquant` → stop →
commit sur la branche → dossier `chantiers/<id>.md` : mission, plan,
fichiers touchés, tests ajoutés, `pnpm check` (vert / rouge, sortie
résumée), constats de relecture (tous), coût par étape et total, durée,
le bloc « Vérifié / Non vérifié, risque » écrit par le modèle, et le
verdict de la fusion (G1 : chaque condition, verte ou rouge, avec sa
mesure) → entrée de mémoire (R10) → **fusion** si tout est vert
(`fusion.ts`), sinon rien de plus. `pnpm chantier retirer <id> --motif`
(G2) : `git revert -m 1` sur `main` du clone, push, mémoire, journal.

### 6.4 `methode/chantier.md`

Le système ajouté : où écrire et où ne jamais écrire (la liste de
`chemins_autorises`, en mots), les conventions (`PLAN-ESPACES.md` § 1.4),
« un geste = une `Action` dans `actions.ts` avec sa description de 200
caractères, son schéma zod, son exécution, trois cas dans
`evals/consignes.yaml`, ses tests », « une intention nouvelle = une entrée
dans `INTENTIONS` », « jamais `regles.yaml`, jamais un contrôle, jamais le
moteur », « ne pas deviner : une donnée manque → le dire dans le bloc », le
bloc final obligatoire.

Tests du lot 2 (le binaire `claude` **simulé** par un script qui écrit un
diff connu et rend un JSON) : mission `attend` ; plan qui refuse ; diff hors
bande refusé, branche gardée ; check rouge → dossier rouge, pas de commit
vert ; relecture `bloquant` → une reprise, pas deux ; coût additionné ; deux
lancements → « déjà tenté » ; aucun `merge`/`push` dans les commandes git
émises (capturées).

---

## 7. Lot 3 — La nuit (`pnpm nuit`) et la doc

`pnpm nuit --client <dossier> [--date]` : `promotions` → `ronde` → la
première mission non traitée (ni `attend`, ni déjà une branche) → `chantier`,
tant que `missions_max_par_nuit` n'est pas atteint ; chaque étape journalise
son issue ; une étape qui échoue n'arrête pas les suivantes. Un exemple de
ligne cron dans le README (`0 3 * * * cd … && pnpm nuit --client …`), rien
d'installé par le code. Doc : README (§ Structure, § Commandes), `HANDOFF.md`,
le mini-site (« décidé, à construire » → « construit »), la présentation
(diapositive 10).

---

## 8. Mesures avant de déclarer fini

| Quoi | Comment | Seuil |
|---|---|---|
| La ronde désigne juste | `pnpm evals ronde` contre les étiquettes de Lionel (≥ 3 journaux fixés, dont un sans rien à signaler) | mesure à la première passe, seuil ensuite ; `rien_a_signaler` juste sur le journal vide |
| La ronde ne voit rien | colonne « fuite » sur chaque trace de ronde ; aucune valeur de résultat de requête dans le résumé (test en code) | 0 |
| Le chantier tient la bande | sur 2 missions réelles du client fictif (`simuler_absence` → geste codé ; une `factorisation` de deux intentions de lecture) : diff dans les chemins, `pnpm check` vert rejoué par le code, trois cas de traduction qui passent avec GLM | 2/2 branches vertes ; constats `bloquant` lus un à un |
| Le chantier s'arrête | une mission `ecrit` dont la promotion est en cours → `attend` sans appel (§ 0.b) ; une mission impossible → « question pour l'atelier » | 100 % |
| Le coût | par ronde, par chantier (plan, implémentation, relecture, reprise), par nuit | affiché ; comparé à l'estimation du § 2 |
| De bout en bout | proposées → tentées → vertes → fusionnées (Lionel) → livrées | mesure |

---

## 9. Ordre et parallélisme

Lot 0 d'abord (deux sous-agents : config ; carte + son test). Lot 1 après le
lot 1 de `PLAN-PSEUDONYMES.md` (la ronde lit `consigne_modele`) ; trois
sous-agents (résumé, rapport, ronde + CLI), puis les étiquettes de Lionel,
puis la passe réelle. Lot 2 peut commencer dès le lot 0 (une mission écrite
à la main suffit pour le développer en simulé) ; quatre sous-agents (arbre,
claude, garde ; chantier + dossier), puis les deux missions réelles. Lot 3 à
la fin.

---

## 10. Tranché (par Lionel le 2026-10-10 au soir, puis dans `PLAN-GENERAL.md` § 2)

Tout ce qui suit est tranché ; la session qui exécute n'a rien à décider :

1. ~~La fusion et la livraison restent humaines~~ → **automatiques**, sous
   les huit conditions de G1, avec le retrait G2, dans le clone de la nuit
   G3, jusqu'à la livraison G8.
2. **Où tourne la ronde pour un harnais livré** : recommandé, **là où est le
   journal** (chez le client), et seul le rapport voyage vers l'agence par
   le canal de notification (identifiants et types, aucune donnée : cohérent
   avec la décision du 2026-10-05 sur ce canal) ; le chantier tourne chez
   l'agence sur le dépôt. L'alternative (rapatrier le journal) est un
   transfert de données de plus, à inscrire au contrat.
3. **L'authentification** : clé d'API (G10) ; à la charge de l'agence ;
   plafond par nuit dans `agence.yaml`. **Au laboratoire, jusqu'à la
   finalisation : l'abonnement, par le binaire** (§ 0.a, décidé le
   2026-10-11).
4. **Les sortes de mission que le chantier prend** : `geste_code`,
   `intention_nouvelle`, `factorisation` ; une mission `ecrit` passe par un
   geste appris avec `modifications` (phase C de `PLAN-GENERAL.md`) quand
   c'est exprimable, par le chantier sinon ; `question_pour_l_atelier` ne
   lance rien.
5. **La fenêtre de la ronde** : la journée, avec les comptes sur 30 jours ;
   pas de ronde mensuelle pour l'instant.
6. **Ce que la ronde ne voit pas** : les textes montrés et les résultats ; à
   rouvrir seulement si la mesure du § 8 montre qu'elle désigne mal.
7. **Le patron** ne voit ni la ronde ni le chantier ; il voit un geste de
   plus à la livraison, et peut le désactiver (G2).
8. **Le discours**, dans le mini-site et la présentation : « l'agence écrit le
   catalogue ; la ronde propose ce qui lui manque ; un modèle le code dans
   la bande métier ; la nuit fusionne si tout est vert ; une mémoire garde
   tout ; Lionel relit après coup ; tout se retire d'une commande ».
