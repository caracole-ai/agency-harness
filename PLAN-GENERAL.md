# Plan général — où on en est, et tout ce qui reste, dans l'ordre

> **Amendé le 2026-10-15** : la promotion automatique est retirée
> (`REFLEXIONS.md`). Les mentions de `pnpm promotions`, de la fabrication,
> de l'état « promotion en cours » et de `evals promotion` décrivent l'état
> d'avant ; la phase E n'a plus d'étape `promotions` à retirer.
>
> **Amendé le 2026-10-15 au soir** (`PLAN-LIVRAISON.md`) : le chantier se
> lance **au clic du patron, à l'agence**, sans nuit ni cron ni clone
> réservé ; la fusion se fait dans un arbre détaché depuis `origin/main` ;
> chaque fusion émet une **étiquette git signée (SSH)** que le harnais du
> client tire, vérifie, installe à côté et bascule à un moment calme, avec
> retour arrière. **G3 est retiré** (plus de clone de la nuit), **G8 est
> remplacé** par L4 à L9 de ce plan-là, **la phase E** (la nuit au cron) et
> **la phase H** (G8) sont remplacées par ses lots 1 à 5. G1, G2, G10 et G11
> restent ; F et G ne bougent pas.

Écrit le 2026-10-10 au soir, sur trois décisions de Lionel du même soir
(`REFLEXIONS.md`, « Décidé ») :

1. **Le harnais est un système auto-améliorant, pour de vrai** : la chaîne
   ronde → chantier → fusion est **automatique**, sous des conditions
   vérifiées en code ; « il faut bien commencer par quelque chose ». Claude
   recommandait une fusion humaine ; Lionel tranche, et ce plan exécute.
2. **Tout le développement automatisé laisse une mémoire** (`memoire/`),
   pour la cohérence globale au fil de l'eau : chaque ronde, chaque chantier,
   chaque fusion, chaque retrait, et les conventions apprises.
3. **Ce plan est écrit pour Claude Opus 5.5, effort élevé, en plusieurs
   sessions, sans décision à prendre** : tout choix technique profond est
   tranché ici (§ 2) ou dans les plans qu'il appelle. Quand un plan se tait,
   la règle est au § 0.

Il appelle quatre plans qui existent et qu'il ne réécrit pas :
`PLAN-PROMOTION.md` (lots 0 à 3 faits, § 9 et lot 4 à faire),
`PLAN-PSEUDONYMES.md`, `PLAN-RONDE.md` (amendé ce soir : la fusion, la
mémoire), et ce qui restait de `PLAN.md` (phase 7). Il ajoute ce qu'aucun
plan ne couvrait : la mémoire, la fusion, la livraison et la mise à jour à
distance, les sécurités d'avant un client réel.

**Critère de succès global** (observable), au laboratoire, sur une copie de
`exemples/client-fictif` et un second dossier qui joue un harnais livré :

1. une demande nouvelle sans intention du catalogue, posée trois fois sur
   trois jours (« quels agents ont une habilitation électrique qui expire
   dans le mois ? »), passe par l'échappée **sans qu'aucun nom ne parte** ;
2. la nuit suivante, `pnpm nuit` fait la ronde (une mission désignée, par
   identifiants), le chantier (un geste codé dans la bande métier, trois cas
   de traduction, tests, relecture sans `bloquant`), **fusionne dans `main`
   du clone de la nuit**, pose l'étiquette, écrit la mémoire, et publie une
   version signée ;
3. le dossier « livré » se met à jour seul la nuit d'après (signature
   vérifiée, `pnpm check` et rejeu sans modèle sur une copie, bascule,
   retour arrière possible), son journal le dit, son patron voit « ce que
   l'outil a appris » dans l'interface, avec de quoi désactiver le geste ;
4. la demande du point 1, reposée, est un geste : un appel, 0,002 $ ;
5. `pnpm chantier retirer <id>` défait la fusion, la version suivante retire
   le geste chez le « livré », la mémoire et les deux journaux le disent ;
6. `pnpm check` vert partout ; toutes les évals au seuil ; fuite 0 sur toutes
   les traces (traduction, échappée, fabrication, ronde, chantier) ;
   `memoire/INDEX.md` raconte la nuit en une ligne par événement.

---

## 0. Règles de travail pour la session qui exécute

1. **Lire d'abord** : `HANDOFF.md` (« Où on en est »), ce plan en entier, le
   plan de la phase, `REFLEXIONS.md` « Décidé » du 2026-10-10, puis les
   fichiers que le lot touche. `pnpm check` vert au départ.
2. **Une phase = une branche par lot = un commit par lot**, nommée comme le
   plan de la phase le dit (`pseudonymes/lot-N`, `ronde/lot-N`,
   `general/<phase>-<lot>`). **À la fin de chaque phase : fusion dans `main`
   et push** (ce plan lève l'interdiction de pousser des plans précédents :
   `main` est la vérité, la nuit en a besoin).
3. **Ne jamais** : demander une décision (tout est tranché ; sinon KISS et
   « Choix faits faute de consigne » dans `HANDOFF.md`) ; écrire un nom de
   modèle, un prix, un plafond, un chemin de dépôt, un jeton en dur (tout
   vient de `config.yaml`, `agence.yaml`, `personnes.yaml` ou d'une variable
   d'environnement exigée par `assertEnv`) ; `process.env.X ?? 'valeur'` ;
   `any` ; `TODO` ; une dépendance de plus sans la nommer dans `HANDOFF.md`
   avec sa raison (celles qu'on ajoute : aucune prévue ; `node:crypto` et
   `node:child_process` suffisent) ; une donnée réelle ; toucher
   `regles.yaml` ou un contrôle `I01`…`I20` sans relecture humaine d'un texte.
4. **Conventions** : `PLAN-ESPACES.md` § 1.4. Commentaire de tête de chaque
   fichier nouveau : `PLAN-GENERAL.md § n` ou le plan appelé.
5. **Sous-agents** : un par fichier de test ou module indépendant ; ils ne
   reçoivent que les règles de leur tâche ; relecture indépendante en lecture
   seule à la fin de chaque phase (douze défauts trouvés ainsi le
   2026-10-08).
6. **Mesurer avant de déclarer** : chaque phase a ses mesures (§ 4). Une
   passe réelle exige la clé du modèle concerné (GLM : `GMI_API_KEY` ou le
   nom que `config.yaml` donne ; Claude : `ANTHROPIC_API_KEY`). Sans clé :
   le dire dans `HANDOFF.md`, ne pas écrire « mesuré ».
7. **Doc à chaque lot** : README (structure, commandes), `HANDOFF.md` (état,
   choix, pièges). Le mini-site et la présentation sont relus **une fois par
   phase**, à la fin, pour dire « construit » là où ils disent « décidé ».

---

## 1. Où on en est (le 2026-10-10 au soir)

| État | Quoi | Où |
|---|---|---|
| **Fait, fusionné sur `main`, poussé** | `PLAN.md` phases 0 à 6 (registre, calendrier, contrôles, Veiller, remplacement avec clé, interface) ; `PLAN-ESPACES.md` lots 0 à 7 (traduction, 9 gestes, échappée sur copie, proposition, réaffectation groupée, promotion-comptage, évals, interface web) ; identité avant le dossier et modèle sans aucun nom (2026-10-08) ; corrections des passes GLM | `main` (`dd13bdc` le dernier) |
| **Mesuré, GLM-5.3** | traduction 58/60 (97 %) ; échappée 41/42 sur trois passes ; 130 cas réels sans écriture ni infraction | `evals/resultats/`, `evals/erreurs-2026-10-08.md` |
| **Fait, pas fusionné** | `PLAN-PROMOTION.md` lots 0 à 3 : le journal se souvient de l'échappée, le geste appris (donnée YAML, clé), la fabrication par le modèle vérifiée par rejeu, l'atelier `pnpm gestes` et l'activation par le patron dans l'interface | branches `promotion/lot-0` → `lot-3`, chacune sur la précédente, **non poussées** |
| **Mesuré et en échec** | l'éval de fabrication : 0/3 (deux gestes justes écartés au rejeu parce que GLM répond plus long que la question) | tranché au § 2, G4 |
| **Écrit, pas codé** | `PLAN-PSEUDONYMES.md` (4 lots), `PLAN-RONDE.md` (4 lots, amendé), ce plan | arbre de travail, non commité |
| **Pas commencé** | `PLAN-PROMOTION.md` lot 4 (l'écriture par un geste appris) ; `PLAN.md` phase 7 (veille des textes, canal fabricant) ; l'authentification d'un canal ; le chaînage du journal ; la mise à jour à distance ; les six choix ouverts de l'identité ; la sauvegarde chiffrée de `clients/` | § 3, phases C, F, G, H |
| **À Lionel, humain** | relire les 74 phrases des évals comme un patron ; le juriste (RGPD art. 22, sous-traitant) ; l'entretien chez un dirigeant ; les données fictives cohérentes avec les phrases de démo ; un compte API PISTE (Légifrance) ; le compte Anthropic et sa clé ; relire la mémoire de la nuit après coup | § 3, phase I |

Ce que le code sait faire ce soir et que le discours ne dit pas encore : le
mini-site et la présentation décrivent la promotion d'avant le lot 2 ; ils
disent « décidé » pour les pseudonymes et la ronde. C'est voulu : on ne dit
« construit » qu'après mesure (§ 0.7).

---

## 2. Les décisions de ce plan (tranchées pour qu'Opus n'ait pas à le faire)

| # | Décision | Pourquoi |
|---|---|---|
| G1 | **La fusion est automatique, en code, sous huit conditions**, toutes vérifiées par `moteur/src/chantier/fusion.ts` et aucune par un prompt : (1) le diff est dans les chemins autorisés de `agence.yaml` ; (2) aucun test existant n'a disparu (aucun `*.test.ts` supprimé, et le nombre de `it(`/`test(` d'un fichier de test existant ne baisse pas) ; (3) `pnpm check` vert, rejoué par le code ; (4) le test d'honnêteté : au moins trois cas de traduction par geste nouveau dans `evals/consignes.yaml`, et `pnpm evals traduire` avec le modèle du quotidien au seuil (95 %, comme « activable ») ; (5) la relecture ne laisse aucun `bloquant` après au plus une reprise ; (6) tours et budget dans les bornes ; (7) le diff ne dépasse pas `chantier.lignes_max` (600 par défaut ; au-delà, le plan devait découper : « question pour l'atelier ») ; (8) l'entrée de mémoire existe et ne porte aucun nom (`fuites` vide). Alors : `git merge --no-ff chantier/<id>` dans `main` **du clone de la nuit** (G3), étiquette `chantier/<id>`, `git push origin main`, ligne `chantier` / `fusionné` au journal du client qui l'a demandé. Sinon : la branche reste, le dossier et la mémoire disent pourquoi, rien d'autre. | C'est la décision de Lionel. Ce qui la rend tenable : chaque condition est une mesure, pas un avis ; la relecture est faite par un autre modèle que celui qui a écrit ; le périmètre est gardé par le code ; et tout se défait (G2). |
| G2 | **Tout se retire d'une commande** : `pnpm chantier retirer <id> --motif` fait `git revert -m 1` de la fusion sur `main` du clone de la nuit, pousse, écrit la mémoire (« retiré : motif »), la ligne au journal, et la version suivante (G8) l'emporte chez le livré. La ronde ne repropose jamais une mission retirée (elle lit la mémoire). **Le patron, lui, désactive un geste sans toucher au code** : `reglages.gestes_desactives: [id]` dans sa config (réglable dans l'interface, onglet « Appris »), lu par la traduction qui retire le geste de la liste. | Une fusion automatique sans retour arrière à un geste serait une faute ; avec, c'est une mesure de plus. Le patron garde la main sur ce qu'il voit, sans jamais toucher au dépôt. |
| G3 | **La nuit a son propre clone** du dépôt (`agence.yaml: depot_nuit`, par exemple `~/harnais-nuit`), à jour de `origin/main` au début de chaque nuit (`git fetch` + `git reset --hard origin/main` sur ce clone seulement — jamais sur un arbre où un humain travaille) ; les arbres de chantier en sont des `git worktree`. Les humains travaillent dans leur clone et tirent `main`. | Git refuse de mettre à jour une branche extraite dans un autre arbre ; et un humain ne doit jamais trouver son arbre modifié par la nuit. |
| G4 | **La fabrication (0/3) : deux corrections, la règle du rejeu ne change pas.** (a) Le système de l'échappée dit plus fermement : « Réponds à la question posée, rien de plus : pas de détail par vacation si on demande un total, pas de remarque ajoutée » — mesuré par `pnpm evals echappee` (doit tenir 41/42). (b) Le système de fabrication dit : « chaque nombre et chaque nom de chaque réponse montrée doit apparaître dans ce que le geste rend ; si une réponse détaille, choisis un tableau qui rend le détail ». Le rejeu reste strict (chaque nombre, chaque nom). Une fabrication qui échoue encore finit « à coder à l'atelier », et c'est la ronde qui s'en saisit (une mission `geste_code`). | La fidélité au texte validé est la seule preuve qu'on a ; on ne l'affaiblit pas. Ce qui ne passe pas par la donnée passe par le code : c'est exactement le second étage de la ronde. |
| G5 | **L'écriture par un geste appris (`PLAN-PROMOTION.md` lot 4) se fait**, après les pseudonymes (phase C), telle que le § 10 la décrit : `modifications: { pour_chaque, reaffecter }`, traitée exactement comme une proposition d'échappée (contrôles, oui du patron, oui de chaque agent, clé sur la liste exacte). Condition levée : l'échappée tient 41/42 sur trois passes. | Un système auto-améliorant qui ne sait promouvoir que des lectures s'arrête à la moitié des intentions. La réaffectation groupée existe et porte déjà toutes les sécurités. |
| G6 | **Les six choix ouverts de l'identité** (mémoire `choix-ouverts-identite`) : (1) une personne trouvée au **niveau 2** (le modèle départage) déclenche une confirmation pour un geste qui **écrit** (`gerer_absence` ouvre une demande : « Vous parlez de Karim Haddad ? oui / non ») ; un geste qui lit s'exécute ; (2) une réponse ambiguë à « Vous parlez de qui ? » **repose la question** avec les identifiants ; (3) le registre est validé **à chaque requête**, et une incohérence rend un message clair (« registre d'accès incohérent : A-14 absent du fichier des agents »), jamais un 500 ; (4) un agent a une route `/api/mes-confirmations` (ses sollicitations et réaffectations en attente, oui / non), montrée dans son onglet ; (5) pas de `WeakSet` (KISS) ; (6) l'authentification : G7. | Ils changent ce que voit le patron ou un agent ; on les tranche une fois, dans le sens du moins de surprise. |
| G7 | **Avant un client réel, trois sécurités, en code** : (a) **le journal est chaîné** : colonne `empreinte` (SHA-256 de l'empreinte précédente + horodatage + type + client + objet + issue + motif + donnees ; `ALTER TABLE … ADD COLUMN`, vide pour les lignes d'avant), `pnpm journal verifier --client` rejoue la chaîne, alerte Veiller si elle casse ; (b) **l'interface web authentifie** : `personnes.yaml` gagne `secret` (un hachage scrypt, `node:crypto`, sel par personne), `pnpm personnes secret <id>` le pose, l'interface demande la phrase, pose un cookie de session signé (`SESSION_SECRET` par `assertEnv`), et l'identité vérifiée vient de la session, plus d'un champ « Je suis » ; la ligne de commande reste déclarative (`--je-suis`), c'est l'outil de l'agence ; (c) **`clients/` est sauvegardé chiffré** : `pnpm sauvegarde --client` chiffre le dossier (AES-256-GCM, clé dans `SAUVEGARDE_CLE`) vers `agence.yaml: sauvegardes`, garde `conservation_jours`, et `pnpm sauvegarde restaurer` fait l'inverse. Les canaux de messagerie (WhatsApp, Telegram) apporteront leur identifiant plus tard : le registre est prêt. | Identité déclarée + journal non chaîné + dossier sans sauvegarde : trois choses qu'on ne livre pas. Chacune est petite ; aucune ne dépend d'un modèle. |
| G8 | **La livraison et la mise à jour à distance** (D2, que Lionel s'était réservé : conception écrite ici pour qu'Opus n'ait rien à décider ; Lionel la remplace s'il en veut une autre). **Une version** = une étiquette `v<AAAA-MM-JJ>-<n>` sur `main`, posée par la nuit après une fusion (ou par `pnpm version`), avec un `manifeste.json` (étiquette, empreinte de l'arbre, gestes ajoutés ou retirés, règles changées, schémas exigés) **signé** (Ed25519, `node:crypto` ; clé privée de l'agence dans `AGENCE_CLE_PRIVEE`, publique dans la config de chaque harnais livré). **Chez le client**, `pnpm mise-a-jour --client` tourne la nuit : lit le manifeste à `livraison.url` (un dépôt git ou un dossier accessible), vérifie la signature et l'empreinte, refuse une version plus ancienne, récupère l'arbre dans `versions/<etiquette>/`, y rejoue `pnpm check` **hors ligne** et `pnpm evals gestes` sans modèle sur une copie du dossier client, puis bascule le lien `courant` ; garde la version d'avant (`pnpm mise-a-jour retirer` revient dessus) ; ligne `mise à jour` au journal ; notification à l'agence par le canal fabricant (étiquette, résultat, rien d'autre). **Le patron voit** dans l'onglet « Appris » : « Mis à jour le … : <gestes nouveaux> », et peut désactiver (G2). Une règle changée après une veille suit le même chemin. Personne n'approuve : c'est G1 jusqu'au bout ; ce qui protège, c'est la signature, la vérification sur place, et le retour arrière. Au laboratoire, le « livré » est un second dossier sur la même machine, `livraison.url` pointant sur le dépôt local. | Le canal fabricant ne porte jamais d'ordre (décision du 2026-10-05) : la mise à jour est **tirée** par le harnais, jamais poussée ; la signature fait que seule l'agence peut publier ; le harnais se vérifie lui-même avant de basculer. |
| G9 | **La veille des textes et le canal fabricant** (`PLAN.md` phase 7) : `pnpm veille-textes` une fois par mois (cron de l'agence) lit, pour chaque règle `texte` ✓ du registre, l'identifiant d'article (LEGIARTI/KALIARTI) et la date de version, interroge l'API PISTE (compte de Lionel : `PISTE_CLIENT_ID`, `PISTE_CLIENT_SECRET`), compare, et envoie à l'agence par le canal ce qui a changé (identifiants et dates, aucun texte client) ; ce qui n'a pas d'API (CNAPS) est rappelé comme relecture manuelle. **Le canal fabricant** = `moteur/src/canal/telegram.ts`, sortant seulement, jeton `TELEGRAM_BOT_TOKEN`, destinataire dans `agence.yaml` ; messages : identifiants, codes, comptages, jamais une donnée. Le harnais livré l'utilise pour : veille en retard, texte changé, connecteur en panne, contrôle en échec, mise à jour faite ou refusée, chaîne du journal cassée. | Décisions du 2026-10-05, inchangées ; seul le transport manquait. |
| G10 | **Les modèles** : `agence.yaml` (`PLAN-RONDE.md` R7) — ronde, plan et relecture sur `claude-fable-5-1` effort élevé ; implémentation sur `claude-opus-5-5` effort élevé ; prix lus dans la doc le jour du lot, jamais en dur ; clé d'API (`ANTHROPIC_API_KEY`). Le quotidien reste GLM-5.3 (`config.yaml` du client). Les deux identifiants de modèle sont vérifiés par un appel minuscule avant la première nuit. **Amendé le 2026-10-11 (Lionel)** : au laboratoire, l'abonnement claude.ai par le binaire `claude`, pour la ronde aussi (`acces: claude`, `PLAN-RONDE.md` § 0.a), afin de fabriquer les mécanismes sans dépenser l'API ; **la bascule vers la clé a lieu avant la finalisation, au plus tard avant la phase E**, et se mesure à nouveau. | C est la décision de Lionel ; la doc réserve l'abonnement à un usage personnel. |
| G11 | **La topologie** : au laboratoire, tout tourne sur la machine de l'agence (le client fictif, son « jumeau livré », le clone de la nuit). Pour un harnais livré : la ronde tourne **là où est le journal** (chez le client, modèle de la ronde appelé depuis là avec la clé de l'agence), **seul le rapport voyage** vers l'agence par le canal fabricant (identifiants et types, aucune donnée) ; le chantier tourne chez l'agence ; la version signée revient par la mise à jour (G8). | Aucun journal ne quitte le client ; aucun ordre n'entre par le canal. |

---

## 3. Les phases, dans l'ordre

Chaque phase a ses lots, son critère et ses mesures (§ 4). Une phase ne
commence pas avant que la précédente soit fusionnée et poussée (§ 0.2).

### Phase A — Consolider (ce qui est fait doit être sur `main`)

- **A0** Commiter les plans de ce soir (`PLAN-PSEUDONYMES.md`,
  `PLAN-RONDE.md`, `PLAN-GENERAL.md`, `REFLEXIONS.md`, `HANDOFF.md`,
  `README.md`) sur `main`, pousser. **Fait le 2026-10-11** (le commit qui
  porte ce plan) ; commencer par A1.
- **A1** Relecture indépendante des lots 0 à 3 de la promotion
  (`PLAN-PROMOTION.md` § 9) par un sous-agent en lecture seule ; corrections
  sur `promotion/lot-3`.
- **A2** G4 : les deux clauses de système ; `pnpm evals echappee` (≥ 41/42)
  et `pnpm evals promotion` (objectif : 2/3 au moins, `compter_vacations`
  reste impossible par construction et le dossier le dit) ; résultats dans
  `evals/resultats/`.
- **A3** Fusion `promotion/lot-3` → `main` (avance rapide ou `--no-ff`),
  push ; `HANDOFF.md` : « lots 0 à 3 fusionnés ».
- Critère : `pnpm check` vert sur `main` ; les quatre branches de promotion
  ne contiennent plus rien que `main` n'ait.

### Phase B — Les pseudonymes (`PLAN-PSEUDONYMES.md`, lots 0 à 3)

Les choix de son § 10, **tranchés** : S1 l'identifiant stable ; S6 les
sites et les postes en clair ; S3 la question avant l'échappée pour une
mention ambiguë ; un mot inconnu passe tel quel et se mesure ; les constats
restent dans la copie, masqués. Critère : celui du plan. Après la phase : le
mini-site dit « construit » pour les noms.

### Phase C — L'écriture par un geste appris (`PLAN-PROMOTION.md` § 10, G5)

Un lot, branche `general/c-ecriture`. `GesteAppris.modifications`,
`executer` rend des `Modification`, `conversation.ts` les traite comme une
proposition ; `Intention.ecrit` devient promouvable ; le rejeu compare les
modifications ; `evals/promotions.yaml` gagne `liberer_un_jour`. Critère :
sur une copie, « libère le mardi 13 de Karim » trois fois → `pnpm promotions`
écrit `liberer_un_jour.yaml` → activé → la consigne suivante ouvre une
réaffectation groupée en un appel, le oui du patron et celui de l'agent
écrivent avec la clé.

### Phase D — La ronde et le chantier (`PLAN-RONDE.md`, lots 0 à 3, amendé le 2026-10-11 : son § 0)

Les choix de son § 10, **tranchés** : fusion automatique (G1), retrait (G2),
clone de la nuit (G3), topologie (G11), clé d'API (G10 ; au laboratoire,
l'abonnement par le binaire, `PLAN-RONDE.md` § 0.a) ; sortes de mission
que le chantier prend : `geste_code`, `intention_nouvelle`, `factorisation`
(`ecrit` est promouvable depuis la phase C : une mission qui écrit passe par
un geste appris avec `modifications` quand c'est possible, par le chantier
sinon) ; fenêtre : la journée, comptes sur 30 jours, pas de ronde mensuelle
pour l'instant ; la ronde ne voit ni texte montré ni résultat ; le patron ne
voit ni la ronde ni le chantier. **La mémoire** (`PLAN-RONDE.md` R10) est
dans le lot 0 de ce plan-là. Critère : celui du plan, plus G1 et G2 rejoués
en simulé (binaire `claude` simulé) puis pour de vrai sur deux missions du
client fictif. Deux sessions : D1 (lots 0 et 1), D2 (lots 2 et 3, relecture,
fusion) ; la consigne de chacune est dans `SESSION-D.md`.

### Phase M — Le second métier, une agence web (`PLAN-METIER-2.md`, ajoutée le 2026-10-12)

Demandée par Lionel après la phase D : prouver que le moteur est
agnostique (un second métier tourne avec le même moteur, la sécurité ne
bouge pas) et mesurer ce que le système produit seul pour un métier dont
le cœur est Rapprocher. Lots 1a à 1c (le moteur rendu agnostique :
`methode/audit-second-metier-2026-10-12.md`), 2a et 2b (le métier et son
client fictif), 3 (Rapprocher), 4 (la mesure). Sur l'abonnement (G10,
amendé : la bascule vers la clé est reportée, elle reste due avant un
client réel). Cinq sessions ; E peut tourner sur la sécurité pendant les
trois dernières.

### Phase E — La nuit en service continu, et la période d'observation

- **E0** `pnpm nuit` au cron de la machine de l'agence, chaque nuit, sur le
  client fictif ; `agence.yaml: missions_max_par_nuit: 1`.
- **E1** Dix nuits d'observation : chaque matin, la mémoire montre ce qui
  s'est passé ; Lionel relit après coup (phase I) ; `pnpm chantier retirer`
  si un geste ne convient pas. Les mesures de bout en bout (§ 4) se
  remplissent.
- Critère : dix nuits sans intervention, zéro fuite, zéro fusion qui casse
  `pnpm check` sur `main`, coût par nuit affiché et dans l'estimation.

### Phase F — Les sécurités d'avant un client réel (G6, G7)

Trois lots, branches `general/f-identite`, `general/f-journal`,
`general/f-interface` : les six choix de l'identité ; le journal chaîné et
`pnpm journal verifier` ; l'authentification de l'interface, la route des
confirmations d'un agent, `gestes_desactives` dans les réglages et l'onglet
« Appris » ; la sauvegarde chiffrée. Critère : un scénario à l'écran avec
le modèle simulé (connexion, une demande, une confirmation d'agent, un
geste désactivé, une sauvegarde restaurée), captures relues ; `pnpm journal
verifier` détecte une ligne altérée à la main.

### Phase G — La veille des textes et le canal fabricant (G9)

Deux lots : `general/g-canal` (Telegram sortant, messages sans donnée, les
six événements), `general/g-veille` (PISTE, comparaison des versions,
rapport à l'agence, rappel des relectures manuelles). Sans compte PISTE
dans la session : le code est écrit et testé contre des réponses fixées, la
passe réelle est notée « à lancer par Lionel ».

### Phase H — La livraison et la mise à jour à distance (G8)

Trois lots : `general/h-version` (étiquette, manifeste, signature,
`pnpm version`), `general/h-mise-a-jour` (`pnpm mise-a-jour`, vérifications
sur place, bascule, retour arrière, journal, canal), `general/h-patron`
(« Mis à jour le … » dans l'onglet « Appris », G2). Le « jumeau livré » :
`exemples/client-fictif-livre/` n'existe pas dans le dépôt ; la session le
crée comme une copie hors dépôt avec `livraison.url` sur le dépôt local.
Critère : les points 2, 3 et 5 du critère global.

### Phase I — Ce qui reste aux humains (ne bloque aucune phase)

Lionel : relire la mémoire de la nuit (phase E) ; relire les 74 phrases ;
le juriste ; l'entretien chez un dirigeant ; les données fictives cohérentes
avec les phrases de démo ; le compte PISTE ; le compte Anthropic ; décider si
la conception de G8 est la sienne. Le code ne les attend pas : il les note.

---

## 4. Les mesures, par phase

| Phase | Mesure | Seuil |
|---|---|---|
| A | `pnpm evals echappee` après G4 (a) ; `pnpm evals promotion` après G4 (b) | ≥ 41/42 ; ≥ 2/3, fuite sans objet |
| B | fuite sur traduction, échappée, promotion ; échappée avec pseudonymes | 0 ; ≥ 41/42 |
| C | `pnpm evals promotion` avec `liberer_un_jour` ; `pnpm evals gestes` | 1/1 écrit et rejoué ; 100 % |
| D | `pnpm evals ronde` (étiquettes de Lionel) ; deux chantiers réels : diff dans la bande, check vert, relecture, coût, durée, fusion | mesure à la première passe ; 2/2 fusionnés ou refusés pour une raison écrite |
| E | par nuit : missions proposées → tentées → fusionnées → retirées ; coût ; fuite ; `pnpm check` sur `main` au matin | zéro fuite, zéro `main` rouge ; le reste est une mesure, lue par Lionel |
| F | scénario à l'écran ; `pnpm journal verifier` sur un journal altéré | capturé ; détecté |
| G | messages du canal sans donnée (test `fuites`) ; veille contre des réponses fixées | 0 ; 100 % des changements fixés vus |
| H | critère global 2, 3, 5 ; une mise à jour à signature fausse refusée ; une version plus ancienne refusée | 100 % |

Toutes les mesures s'écrivent dans `evals/resultats/` (les passes) et dans
`memoire/MESURES.md` (une ligne par nuit, par le code).

---

## 5. Ordre, sessions, parallélisme

A → B → C → D → M → E, puis F, G, H dans cet ordre (H dépend de G pour le
canal, et de F pour l'onglet et la config du patron ; M avant F parce que
F construit les confirmations et l'authentification sur le modèle des
rôles, que M rend déclarable). E tourne pendant M (sur la sécurité, dès le
lot 1 de M fusionné), F, G et H : une nuit qui propose un chantier sur une
phase en cours est une mission comme une autre, dans la bande métier
seulement.

Une session = une phase au plus (A et C tiennent en une ; B, D, F, H en
deux). Dans une phase, les sous-agents suivent le § 9 du plan appelé. À la
fin de chaque phase : relecture indépendante, fusion, push, `HANDOFF.md`,
mini-site et présentation relus (§ 0.7).

---

## 6. Ce que ce plan interdit, même à un système auto-améliorant

- Un modèle n'écrit ni ne lève une règle (`regles.yaml`, `I01`…`I20`) ; il
  ne touche ni le moteur, ni l'interface, ni un réglage client ; la garde
  des chemins le refuse.
- Une donnée du client ne va ni dans la mémoire, ni dans une mission, ni
  dans un message du canal, ni chez le fournisseur sous un nom ; `fuites`
  le prouve partout.
- Une fusion sans ses huit conditions ; une mise à jour sans signature ni
  vérification sur place ; une version sans retour arrière.
- Une nuit qui tourne dans l'arbre d'un humain.
- Un nombre en dur à la place d'une config ; un « mesuré » sans passe réelle.
