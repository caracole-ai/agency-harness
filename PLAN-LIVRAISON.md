# Plan de la livraison — le chantier au clic, la version signée, la mise à jour tirée

Écrit le 2026-10-15 sur trois décisions de Lionel du même jour
(`REFLEXIONS.md`, « Décidé ») :

1. **Le chantier se lance au clic du patron**, pas la nuit : « Créer ce
   geste » → le chantier (Fable planifie, Opus code, Fable relit) → la
   fusion sous les huit conditions de G1. Plus de « nuit », plus de cron,
   plus de clone réservé (`depot_nuit`) : le chantier travaille dans un
   arbre de travail du dépôt de l'agence, part de `origin/main`, pousse.
2. **Le chantier tourne à l'agence, jamais chez le client.** L'aller (la
   mission, consignes masquées, sans nom) part du client vers l'agence :
   accepté. L'agence valide (G1, en code) et **émet une version signée**.
3. **Le harnais du client tire lui-même ses mises à jour** : il sait qu'une
   version l'attend, vérifie la signature, bascule à un moment calme,
   revient en arrière si le redémarrage échoue. Le canal fabricant reste en
   réception seule (2026-10-05) : aucun ordre n'entre chez le client.

Il remplace la phase E (la nuit au cron) et la phase H (G8) de
`PLAN-GENERAL.md`, et retire G3 (le clone de la nuit). Il garde G1 (les
huit conditions), G2 (le retrait), G10 (les modèles), G11 (la topologie :
le chantier chez l'agence, seule la mission voyage). Il ne touche ni à la
phase F (identité, journal chaîné, authentification) ni à la phase G (le
canal Telegram). Écrit pour être exécuté par Claude en plusieurs sessions,
sans décision à prendre : ce qui n'est pas tranché ici l'est par les règles
de `PLAN-GENERAL.md` § 0.

**Critère de succès global** (observable), au laboratoire, sur une machine :
deux dépôts nus dans un dossier temporaire (`livraison.git`, un clone nu du
dépôt ; `missions-client-fictif.git`, vide), une copie du client fictif avec
son `livraison.yaml`, une installation (`depot/`, `versions/`, `courant`),
`pnpm harnais` lancé d'un côté, `pnpm agence` de l'autre :

1. le patron pose une demande sans geste, clique « Créer ce geste » : la
   mission est écrite chez lui **et** poussée dans `missions-client-fictif.git`
   ; la carte dit « commandé, en attente de l'agence » ;
2. dans la minute, `pnpm agence` la prend : la carte dit « chantier en
   cours » ; le chantier code le geste dans
   `.claude/worktrees/chantier-<id>` du dépôt de l'agence, les huit
   conditions vertes, la fusion dans un arbre détaché, **`main` du dépôt de
   l'agence et l'arbre de Lionel n'ont pas bougé**, `origin/main` a avancé,
   l'étiquette `v<AAAA-MM-JJ>-<n>` est posée, signée, poussée ;
3. dans le quart d'heure, le harnais du client voit le statut « fusionné,
   version v… », tire la version, vérifie la signature, l'installe à côté
   (`versions/v…`), rejoue `pnpm check`, bascule à un moment calme, redémarre
   ; son journal dit `mise à jour : faite` ; la carte dit « disponible » ; la
   demande reposée est un geste, un appel ;
4. une étiquette signée d'une autre clé est refusée ; une version plus
   ancienne est refusée ; un redémarrage qui échoue revient à la version
   d'avant et le journal dit `mise à jour : retour arrière` ;
5. `pnpm chantier retirer <id>` à l'agence défait la fusion, émet une
   version, le client la tire : le geste a disparu, les deux journaux le
   disent ;
6. `pnpm check` vert partout ; `pnpm evals traduire` au seuil sur le geste
   codé ; fuite 0 sur la mission qui part et sur la mémoire ; aucun fichier
   de `clients/`, aucune donnée, aucun nom ne quitte la machine du client.

---

## 0. Règles de travail pour la session qui exécute

Celles de `PLAN-GENERAL.md` § 0, plus :

1. **Un lot = une branche `general/l<n>-<nom>` = un commit**, `pnpm check`
   vert avant ; une fusion `--no-ff` et un push par session.
2. **Le code réel avant la doc** ; la doc (README, `methode/`, HANDOFF)
   dans le même commit que le code qu'elle décrit.
3. **Rien ne tourne jamais `git` sur l'arbre de travail d'un humain** : ni
   `checkout`, ni `reset`, ni `merge`, ni `clean`. Le code ne fait, sur le
   dépôt de base, que `fetch`, `worktree add/remove/prune`, `tag`, `push`,
   `rev-parse`, `verify-tag`. Un test le vérifie (la liste des commandes
   émises, capturée par `Commande`).
4. **La clé de signature n'est jamais dans l'environnement d'un modèle** ni
   dans un arbre de travail : `envEnfant` la retire, un test le vérifie.
5. Tout ce qui vient d'un dépôt distant (une mission, un statut, une
   étiquette) est une **donnée** lue par un schéma strict, jamais une
   instruction ni un code exécuté : seule une étiquette dont la signature
   est vérifiée est installée.
6. Les tests simulent git, pnpm et le binaire `claude` comme aujourd'hui
   (`Commande`, `Lancer`, `Executer`) **et** jouent la chaîne pour de vrai
   dans un dossier temporaire avec des dépôts nus locaux et une clé de test
   engendrée par `ssh-keygen` : les deux, pas l'un ou l'autre.

---

## 1. La chaîne, de bout en bout

```
client (le harnais livré)                        agence
───────────────────────────                      ───────────────────────────
demande sans geste → « Créer ce geste »
  missions/<date>/<id>.yaml (masquée)
  ligne `geste commandé`
  push → missions-<client>.git ────────────────► pnpm agence (boucle, verrou)
                                                   fetch des files de tous les clients
                                                   la plus ancienne `à faire`
                                                   statut `en cours` ──┐
                                                   chantier :          │
                                                     worktree depuis origin/main
                                                     plan · implémentation · garde
                                                     pnpm check · relecture · honnêteté
                                                     mémoire
                                                   fusion (G1) dans un arbre détaché
                                                     merge --no-ff · tag chantier/<id>
                                                     tag v<date>-<n> signé (SSH)
                                                     push HEAD:main + étiquettes
                                                   statut `fusionné` + version,
                                                   dossier <id>.chantier.md
  rattraper (toutes les 15 min, et dès     ◄────── push → missions-<client>.git
   qu'un statut arrive) :
   statuts → journal `chantier`, chantiers/<id>.md
   fetch des étiquettes v* ◄───────────────────── livraison.git (= origin, lecture seule)
   la plus récente, signée, descendante
   versions/<tag> : worktree, install, check
   `.prete`
  moment calme → sortie RELANCE
  pnpm harnais : bascule `courant`, relance,
   sonde /api/roles ; sinon retour arrière
  journal `mise à jour : faite | retour arrière`
  etat.yaml (version courante) → push ─────────► l'agence sait qui est à jour
```

Trois choses voyagent, rien d'autre : une mission masquée (aller), un
statut et un dossier de chantier (retour), du code signé (retour). Le
client n'exécute jamais rien qui vienne de la file des missions ; il
n'installe que ce que la signature de l'agence couvre.

---

## 2. Décisions (L1 à L12)

| # | Décision | Pourquoi |
|---|---|---|
| L1 | **Le chantier se lance au clic, à l'agence, une mission à la fois.** `pnpm agence` est une boucle (`agence.yaml: agence.intervalle_secondes`, 60 par défaut ; `--une-fois` pour un cron ou un test) sous un verrou (`.claude/agence.lock`, pid ; un verrou dont le pid est mort est levé). Elle lit la file de chaque client (`agence.yaml: clients: [{ slug, missions: <url> }]`), prend la mission `à faire` la plus ancienne (date, puis slug, puis id), écrit le statut `en cours`, fait le chantier, écrit le statut final. **Borne** : `agence.chantiers_max_par_jour` (3), comptés dans `memoire/INDEX.md` (les lignes `fusion` et `refus` du jour) ; au-delà, la mission attend le lendemain et son statut le dit. | Un geste commandé est rare et le patron attend ; la nuit n'avait de sens que pour la ronde, retirée. La borne protège le quota de l'abonnement, pas une fenêtre horaire. Un verrou plutôt qu'un démon : `pnpm agence --une-fois` au cron de l'agence suffit en production. |
| L2 | **Plus de clone réservé. Les arbres de travail partent de `origin/main` ; la fusion se fait dans un arbre détaché ; `main` local n'est jamais touché.** `arbre.ts` : le dépôt de base est la racine (`RACINE`, le dépôt de l'agence, qui peut être l'arbre d'un humain) ; `verifierBase` exige seulement un dépôt git avec un distant `origin` ; `git fetch origin main` puis `git worktree add .claude/worktrees/chantier-<id> -b chantier/<id> origin/main`. `fusion.ts` : `git worktree add .claude/worktrees/fusion-<id> --detach origin/main` (après un `fetch` frais), `git merge --no-ff chantier/<id>`, la mémoire commise à part, les étiquettes, `git push origin HEAD:refs/heads/main refs/tags/chantier/<id> refs/tags/v…` ; un push refusé (quelqu'un a poussé entre-temps) : **une** reprise depuis un nouveau `origin/main`, sinon `echec` (la branche reste). L'arbre de fusion est retiré dans tous les cas. Le retrait (G2) suit le même chemin (arbre détaché, `revert -m 1`, version). `verifierDepot`, `remettreAOrigine`, `restaurer` (reset/clean/merge --abort) disparaissent : il n'y a plus rien à restaurer, un arbre jetable se jette. | Git refuse de mettre à jour une branche extraite dans un autre arbre, et personne ne doit retrouver son arbre modifié : c'était la raison de G3. Un arbre détaché règle les deux sans clone : rien n'est extrait sur `main`, et le push cible `refs/heads/main` du distant directement. |
| L3 | **Le chantier ne connaît aucun dossier client.** `faireChantier` prend la mission (elle porte `metier`), le métier chargé par son nom (`moduleDuMetier(nom)` dans `cli/metier.ts`, à côté de `moduleDe(dossier)`), et un **dossier de sortie** où il écrit `<id>.chantier.md` et `<id>.statut.yaml`. Les lignes `chantier` du journal du client (aujourd'hui écrites par le chantier, `chantier.ts` l. 223) sont écrites **par le client** quand il lit le statut (L7). Le contrôle « aucun nom ne part » sur la mission se fait **chez le client, à la commande** (`missionCommandee` le fait déjà sur chaque consigne ; on y ajoute `interdits(missionPourModele(mission, domaine), personnes)` sur le texte entier, avant d'écrire la mission) ; à l'agence, la mémoire se contrôle contre les noms du client fictif du métier (`evals_clients`), seuls noms connus là-bas. `decider` garde ses deux refus (retirée, geste déjà codé) avec le catalogue du métier (ses gestes) et la file (les missions ouvertes). | L'agence n'a ni journal ni registre du client (G11) ; elle ne doit pas en avoir. Le contrôle des noms réels ne peut se faire que là où les noms sont : avant le départ. Perte acceptée : la mémoire écrite à l'agence n'est plus relue contre les noms réels ; elle ne contient que ce que le modèle a lu (une mission déjà masquée, des données fictives) et écrit. |
| L4 | **Une version = une étiquette git signée (SSH), posée en code après une fusion ou un retrait** : `v<AAAA-MM-JJ>-<n>` (n = nombre d'étiquettes du jour + 1), sur le commit de fusion ; message = le manifeste en clair (chantier, client (slug), geste ajouté ou retiré, sha de fusion). Signature : `git -c gpg.format=ssh -c user.signingkey=<fichier> tag -s`, la clé privée désignée par **`AGENCE_CLE_SIGNATURE`** (un chemin, hors du dépôt, `assertEnv` au préflight de `pnpm agence` et de `pnpm version`). Vérification chez le client : `git -c gpg.ssh.allowedSignersFile=<dossier client>/signataires verify-tag <tag>` (le fichier `signataires` : `agence <clé publique>`, livré avec le dossier). `pnpm version` (manuel, à l'agence) étiquette `origin/main` tel quel : pour livrer un changement du moteur sans chantier. Un refus de chantier ne fait pas de version (rien n'a changé dans le code) : sa mémoire est poussée sur `main` par l'arbre détaché, comme aujourd'hui. | Même garantie que G8 (seule l'agence peut publier ; le commit couvre tout l'arbre ; `git verify-tag` se relit à la main) sans une ligne de cryptographie à nous : ni manifeste JSON ni empreinte d'arbre à recalculer. Prérequis vérifié au préflight : `ssh-keygen -Y` (OpenSSH ≥ 8.2 ; macOS 12+, Debian 11+). |
| L5 | **Deux dépôts distants chez le client, décrits dans `<dossier client>/livraison.yaml`** (un fichier à part, comme `personnes.yaml` : les schémas stricts des métiers ne bougent pas) : `depot` (le dépôt du produit, = `origin` de l'agence, **lecture seule** : une clé de déploiement par client), `missions` (`missions-<slug>`, **lecture et écriture**, ne contient que des missions masquées, des statuts, des dossiers de chantier et `etat.yaml`), `installation` (un chemin absolu, hors du dossier client : `depot/`, `versions/<tag>/`, `courant`, `precedent`), `intervalle_minutes` (15). **Sans `livraison.yaml`, le harnais n'est pas livré** : tout reste local comme aujourd'hui (la mission s'écrit chez le client, `pnpm chantier --mission` la prend à la main, pas de minuterie) : c'est le mode du laboratoire et de la démo. Les clés SSH sont dans la config SSH de la machine (`~/.ssh/config`), jamais dans le dépôt ni dans la config : le README le dit. | Git est le seul transport qu'on a déjà (l'agence héberge déjà le dépôt) : pas de serveur, pas d'API, pas de TLS à tenir. Une clé par client et par sens : un client ne lit que le produit et n'écrit que dans sa file. |
| L6 | **L'aller : la mission, et rien d'autre.** `commanderMission` écrit la mission chez le client (comme aujourd'hui), la ligne `geste commandé`, puis **pousse** le fichier dans `missions` (`<date>/<id>.yaml`, `pull --rebase` avant `push`). Un push qui échoue (réseau) ne fait pas échouer le clic : la mission est marquée `à pousser` localement et le prochain `rattraper` la pousse (idempotent : même contenu, même chemin). Ce qui part est exactement ce que `Mission` contient aujourd'hui : intention, consignes-types masquées, comptes, date, métier ; jamais `par`, jamais un résumé, jamais une donnée. | C'est l'entorse à G11 que Lionel accepte : une mission masquée voyage. Elle est déjà construite sans nom (`missionCommandee`) et relue avant de partir (L3). |
| L7 | **Le retour : un statut par mission, lu par le client.** L'agence écrit dans `missions` : `<date>/<id>.statut.yaml` (`statut`: `en cours` \| `fusionné` \| `refusé` \| `écartée` \| `échoué` \| `en attente` (borne du jour) ; `issue` ; `version` quand fusionné ou retiré ; `cout_usd` ; `le`) et `<date>/<id>.chantier.md` (le dossier d'aujourd'hui, `rendreDossier`). Le client (`rattraper`) les tire, copie le dossier dans `<dossier client>/chantiers/<id>.md`, et écrit **une** ligne `chantier` au journal par statut nouveau (type `TYPE_CHANTIER`, objet `<id>`, issue = le statut ; `donnees.version`), jamais deux fois la même (le journal est relu). `demandesAvecEtat` ne change pas ; la carte dit : « commandé, en attente de l'agence » → « chantier en cours » → « fusionné (v…), mise à jour en préparation » → « disponible ». Le client pousse `etat.yaml` (`version_courante`, `le`) dans `missions` à chaque changement : l'agence sait qui est à jour sans canal. | Un seul mécanisme pour l'aller et le retour des statuts (la file), un autre pour le code (les versions) : chacun ne porte qu'une sorte de chose. Le patron voit où en est sa commande sans que personne ne lui parle. |
| L8 | **Chez le client : des versions côte à côte, un lien `courant`, la bascule à un moment calme, le retour arrière.** `moteur/src/livraison/mise-a-jour.ts` : `git fetch depot --tags` ; candidates = les étiquettes `v*` **descendantes** de la version courante (`merge-base --is-ancestor`) ; une étiquette non descendante (plus ancienne, ou d'une autre lignée) est refusée et dite ; la plus récente est **vérifiée** (`verify-tag`, L4) ; `git worktree add versions/<tag> <tag>` ; `pnpm install --frozen-lockfile --prefer-offline` ; `pnpm check` dans cet arbre ; alors `versions/<tag>/.prete` et le lien `courant.suivant`. Sinon : le dossier est retiré, le journal dit `mise à jour : refusée (raison)`. Seules les deux dernières versions sont gardées (`courant`, `precedent`). **Le moment calme** : l'interface (qui porte la minuterie) n'a reçu aucune requête depuis 60 s (`CALME_SECONDES`) et aucun `rattraper` n'est en cours ; elle sort alors avec le code `CODE_RELANCE` (75). | Vérifier **à côté** avant de basculer : un `pnpm check` rouge ne touche pas ce qui tourne. Le lien symbolique rend la bascule atomique et le retour arrière trivial. Ce qui attend un « oui » est dans le journal : un redémarrage ne perd rien. |
| L9 | **Le lanceur `pnpm harnais --client <dossier> [-- options de l'interface]`** (`moteur/src/cli/harnais.ts`), la seule chose qu'une machine cliente « installe » (une ligne launchd/systemd dans le README) : une boucle qui lance `pnpm interface` depuis `courant`, attend sa sortie ; `CODE_RELANCE` : `precedent ← courant`, `courant ← courant.suivant` (lien temporaire puis `rename`), relance, sonde `POST /api/roles` pendant 30 s ; échec ou sortie : `courant ← precedent`, marqueur `retour-arriere.yaml` (`de`, `vers`, `raison`), relance. Toute autre sortie (plantage) : relance après 5 s, trois fois par 10 min au plus, puis arrêt (un humain). Le lanceur ne charge aucun métier et n'écrit aucun journal : c'est l'interface, à son démarrage, qui compare sa version (`VERSION`, écrit par `mise-a-jour` dans l'arbre) à la dernière ligne `mise à jour` du journal et écrit `faite (v…)`, ou lit le marqueur et écrit `retour arrière (v… → v…, raison)`. Le lanceur tourne avec le code de la version qui l'a lancé jusqu'au prochain redémarrage manuel : accepté, dit dans le README. | Le lanceur est minuscule et bête (liens, processus, sonde) pour n'avoir jamais à être mis à jour lui-même ; tout ce qui sait quelque chose du métier est dans la version. |
| L10 | **Un geste est du métier** : la garde ne laisse écrire que dans `metiers/<métier>/` (inchangé), donc un geste commandé par un client arrive chez tous les clients du métier à leur prochaine version ; le retrait aussi. Le patron garde la désactivation sans code (`gestes_desactives`, phase F, inchangée). | C'est le produit qui s'améliore, pas une installation ; le filet est G2 (retrait en une commande) et, plus tard, la désactivation. |
| L11 | **Ce qui est retiré** : `depot_nuit`, `cheminDepotNuit`, `verifierDepot`, `remettreAOrigine`, `restaurer` ; `chantier/nuit.ts`, `cli/nuit.ts`, `pnpm nuit`, `missions_max_par_nuit` (→ `agence.chantiers_max_par_jour`), `dejaTentees` (comptait au journal du client) ; `ajouterMesure`, `lireMesures`, `publierMemoire` (la ligne « par nuit » de `MESURES.md` ; l'index a déjà une ligne par chantier) ; la phase E de `PLAN-GENERAL.md` et sa ligne cron ; le mot « nuit » dans `memoire/INDEX.md`, `methode/chantier.md` (« La mémoire de la nuit » → « La mémoire des chantiers »), `memoire.ts`, `methode/architecture-pour-modeles.md`, README. Les dossiers `~/harnais-nuit` et `~/harnais-nuit-origine.git` : à supprimer par Lionel après la mesure du lot 5. | Rien de ce qui disparaît n'a plus de rôle : chaque élément servait au clone ou à la fenêtre nocturne. |
| L12 | **Le laboratoire = la production, sur une machine** : deux dépôts nus temporaires, une copie du client fictif avec `livraison.yaml`, une installation temporaire, `pnpm harnais` et `pnpm agence` dans deux terminaux. Un test (`moteur/src/livraison/chaine.test.ts`) construit tout cela dans un dossier temporaire avec le binaire `claude` simulé et une clé engendrée par `ssh-keygen`, et joue les points 1 à 5 du critère. Aucune commande ni aucun mode « laboratoire » en plus dans le code : l'absence de `livraison.yaml` est le seul interrupteur (L5). | Un seul chemin de code ; ce qui est mesuré au laboratoire est ce qui tournera. |

---

## 3. Les lots

### Lot 0 — Le plan et la trace des décisions (fait dans cette session, branche `general/livraison`)

Ce fichier ; `REFLEXIONS.md` (« Décidé », une ligne) ; `PLAN-GENERAL.md`
(amendement en tête : E et H remplacées, G3 retiré, G8 remplacé par L4 à
L9) ; `HANDOFF.md` ; `README.md` (la ligne de ce plan dans la liste des
plans). Aucun code.

### Lot 1 — Le chantier sans clone, sans dossier client (`general/l1-chantier`, une session)

**Fait le 2026-10-15.** Écarts au plan, tranchés en session : (1) la mémoire
et les retraits que lit le chantier sont ceux d'`origin/main` (lus dans
l'arbre du chantier, juste ouvert), pas ceux de la racine : avec L2, `main`
de la racine n'avance plus, sa mémoire serait en retard ; la racine ne sert
qu'à la décision sans git (`--sans-modele`, et une mission déjà écartée) ;
(2) `--sortie` vaut par défaut le dossier de la mission (la même forme que la
file du lot 3 : `<date>/<id>.yaml`, `.statut.yaml`, `.chantier.md`) ; (3) le
push est atomique (`--atomic`) : sans lui, l'étiquette passait quand `main`
était refusé, et revenait par le suivi des étiquettes à la reprise ; (4)
`retirer <id>` lit le client, le titre et les intentions dans la mémoire de
la fusion (sur `origin/main`), et nettoie le motif contre les noms des
clients fictifs de tous les métiers ; (5) le statut porte aussi `retiré`
(L7 le suppose) ; une question pour l'atelier et une fuite rendent
`écartée` ; (6) l'arbre du chantier s'ouvre détaché, la branche
`chantier/<id>` n'est créée qu'une fois le chantier décidé (une mission
écartée sur la mémoire d'`origin/main` ne laisse rien) ; (7) une fusion
dont la branche est déjà dans `origin/main` (réponse d'un push perdue,
`--refaire`) rend la fusion étiquetée, sans rien refusionner ; (8)
`agence.yaml: clients[]` porte le `metier` de chaque client (le lot 3 refuse
une mission de la file qui en nomme un autre) ; en mode non livré, `pnpm
chantier` refuse une mission dont le métier n'est pas celui du client chez
qui elle est.

Risques acceptés, relevés à la relecture indépendante du lot 1 : la reprise
après un push refusé refusionne sur un `origin/main` neuf sans rejouer
`pnpm check` (L2 le veut) ; `exclureArbres` ajoute une ligne à
`.git/info/exclude` du dépôt de base (un fichier, pas une commande git) ; le
catalogue « un geste codé existe déjà » se juge sur le code de la racine,
qui n'avance plus seule (le client juge sur le sien à la commande) ; un
métier sans `evals_clients` n'a aucun nom à contrôler à l'agence (sa
condition 4 refuse de toute façon) ; le slug du client entre dans
`memoire/INDEX.md` d'`origin/main`, que tous les clients tireront au lot 4
(à trancher par Lionel avant un second client réel).

- `moteur/src/chantier/arbre.ts` : `verifierBase(c, racine)` (un dépôt git,
  un distant `origin`, `worktree prune`) ; `ouvrirArbre` depuis
  `origin/main` après `fetch` ; `ouvrirArbreDetache(c, racine, id)` pour la
  fusion ; retirer `verifierDepot`, `remettreAOrigine`, `BRANCHE_PRINCIPALE`
  ne sert plus qu'au nom de la ref distante. Les commandes émises sur la
  racine se limitent à la liste du § 0.3 : un test de `arbre.test.ts`
  (nouveau) les capture et le vérifie.
- `moteur/src/chantier/fusion.ts` : `conclure` et `retirerFusion` dans
  l'arbre détaché (L2), push `HEAD:refs/heads/main`, une reprise sur push
  refusé, retrait de `restaurer` et de `publierMemoire`. La mémoire se
  commet dans l'arbre détaché, toujours à part.
- `moteur/src/chantier/chantier.ts` : `faireChantier(mission, { racine,
  agence, metier: ModuleMetier, sortie, … })` (L3) ; le dossier et le
  statut dans `sortie` ; plus de journal, plus de `dossierClient` ; la
  fuite de la mission contrôlée contre les noms du client fictif du métier
  (`evals_clients`) ; `missionsRetirees` et la mémoire lus à la racine.
- `moteur/src/chantier/mission.ts` : `missionCommandee` relit
  `missionPourModele` entier contre les noms (L3) ; `construireCatalogue`
  prend les gestes du métier et la liste des missions ouvertes (plus de
  dossier client) ; `ecrireStatut` / `lireStatut` et le schéma `Statut`
  (L7) ; `Mission` inchangé.
- `moteur/src/cli/metier.ts` : `moduleDuMetier(nom)`.
- `moteur/src/cli/chantier.ts` : `pnpm chantier --mission <fichier>
  --sortie <dossier> [--sans-modele] [--refaire]` (le fichier peut être chez
  un client : le mode non livré) ; `retirer` sans `--client` (la mémoire du
  retrait ne cite que le slug que porte la mission).
- `moteur/src/agence/config.ts`, `agence.yaml` : `depot_nuit` retiré ;
  `chantier.missions_max_par_nuit` → `agence: { chantiers_max_par_jour: 3,
  intervalle_secondes: 60, clients: [] }`.
- Retirés : `chantier/nuit.ts`, `nuit.test.ts`, `cli/nuit.ts`, `pnpm nuit`,
  `ajouterMesure`, `lireMesures` (`memoire.ts`), les deux cas de
  `MESURES.md` écrits par le code (le fichier garde ses tables à la main).
- Tests repris : `chantier.test.ts`, `garde.test.ts`, `memoire.test.ts`,
  `essai.test.fixture.ts`, `metier-essai.test.fixture.ts`,
  `agence/config.test.ts`, `mission.test.ts`.
- Doc : `methode/chantier.md` (le mot « nuit »), `memoire/INDEX.md`
  (en-tête), `methode/architecture-pour-modeles.md`, README (§ chantier,
  § commandes), `agence.yaml` (commentaires).
- **Critère** : `pnpm chantier --mission <copie>/missions/<date>/<id>.yaml
  --sortie <tmp> --sans-modele` ne lance aucun git ; avec le binaire simulé
  et un `origin` nu temporaire, le test fusionne dans `origin/main`, pose
  `chantier/<id>`, et l'arbre de base (`git status`, `HEAD`, la branche
  courante) est identique avant et après. Le retrait, de même. Mesure réelle
  (lot 5), pas ici.

### Lot 2 — La version signée (`general/l2-version`, une session ; indépendant du lot 3)

**Fait le 2026-10-15, sur `general/l2-version`, à fusionner.** Écarts : la
commande s'appelle **`pnpm versionner`** (`pnpm version` est une commande de
pnpm, qui masquerait le script) ; `versionner` vit dans `fusion.ts`, le seul
module qui pousse ; le manifeste est en lignes `clé: valeur` (`sorte`,
`chantier`, `client`, `geste`, `commit`) ; `pnpm chantier` exige aussi la
clé (une fusion sans version ne partirait chez personne) ; la version d'un
retrait nomme le client que garde la mémoire de la fusion ; une fusion déjà
sur `origin/main` rend la version déjà posée ; `preflightSignature` refuse
une clé rangée dans le dépôt.

Relecture indépendante du lot 2, corrigé : une ref renommée vers une
version signée plus ancienne était admise (`verify-tag` ne compare pas le
nom) → le nom signé dans l'objet doit être celui de la ref ; une signature
OpenPGP d'une clé du trousseau de la machine était admise → seule une
signature SSH compte (`gpg.minTrustLevel=fully`, OpenPGP et X.509
désactivés) ; un chantier commencé avant minuit prenait un nom plus ancien
qu'une version déjà posée → un nom est toujours après la plus récente ; une
version restée locale (tentative tuée avant le push) passait pour posée →
ôtée ; le chemin de la clé pouvait partir dans un message d'échec → masqué ;
`SSH_AUTH_SOCK` retiré des enfants. **Ouvert, à Lionel avant un client
réel** : `pnpm check` et `pnpm evals` exécutent du code écrit par le modèle
sous l'utilisateur de l'agence, sans bac à sable : ce code peut lire le
fichier de la clé de signature (et toute clé SSH de la machine). Retirer la
variable ne suffit pas ; il faut que l'arbre du chantier tourne sous un
autre utilisateur, ou dans un bac à sable qui interdit la lecture de la
clé (`sandbox-exec` sous macOS, `bwrap` sous Linux). Le risque existait déjà
pour les clés SSH de la machine ; la clé de signature le rend décisif.

Audit avant fusion (2026-10-16), corrigé : la fusion prend le commit que la
garde a vu, jamais la pointe de la branche (le code du modèle tourne après
la garde, dans `pnpm check` et `pnpm evals` : un commit qu'il posait là
partait signé chez tous les clients) ; un arbre qui a bougé après la garde
refuse, avant les évals ; une étiquette `chantier/<id>` restée locale (une
fusion tuée avant le push) est reposée, jamais sur le distant ; un
`CLAUDE*.md` est interdit dans la bande (le binaire le chargerait comme
consigne à la relecture et aux chantiers suivants), et les chemins
interdits se comparent sans la casse (le disque de l'agence lit
`claude.md` comme `CLAUDE.md`). **Ouvert, aggravé** :
sans bac à sable, le code du modèle lit la clé, et aussi `~/.ssh`, le
trousseau, le `.git` commun (ses hooks et sa config feraient tourner du code
sous l'agence, hors de tout chantier) ; ce qu'il imprime ne part plus chez
le client (lot 3), mais il peut l'écrire dans le code de la bande ou dans
« Ce que j'ai appris » (la mémoire), que tous les clients tirent avec la
version, et fausser les mesures (`pnpm check`, `pnpm evals`) : le bac à
sable doit couvrir la lecture des secrets et l'écriture hors de l'arbre.
**Ouvert, nouveau** : la fusion automatique signe tout ce que porte
`origin/main` ; un compte de l'hébergeur volé y pousse, le chantier suivant
le signe et tous les clients l'installent. Règle simple proposée : avant de
signer, la fusion et le retrait refusent si un commit de `<dernière
v*>..origin/main` touche autre chose que `memoire/` (un changement du moteur
passe alors par `pnpm versionner`, le geste humain). Le manifeste de chaque
version porte `client: <slug>` : tous les clients lisent les slugs de tous,
un second canal du point ouvert du slug (lot 1). Non mesurable ici :
`gpg.minTrustLevel=fully` (git 2.50 refuse déjà une autre clé sans lui).

- `moteur/src/livraison/version.ts` : `prochaineEtiquette(c, racine,
  date)`, `signerEtiquette(c, arbre, tag, message, cle)`,
  `verifierEtiquette(c, depot, tag, signataires)`, `etiquettesCandidates(c,
  depot, courante)` (descendantes, triées), `VARIABLE_CLE_SIGNATURE`,
  `preflightSignature(env, executer)` (`ssh-keygen -Y` disponible, la clé
  lisible).
- `fusion.ts` : la version après la fusion et après le retrait (L4) ; le
  message-manifeste.
- `claude.ts` : `envEnfant` retire `AGENCE_CLE_SIGNATURE` ; un test.
- `moteur/src/cli/version.ts`, `pnpm version` : étiquette `origin/main` tel
  quel (arbre détaché, tag signé, push de l'étiquette seule).
- Tests : `version.test.ts` avec une clé de test (`ssh-keygen -t ed25519`
  dans un dossier temporaire) : signature acceptée ; une autre clé refusée ;
  une étiquette non descendante refusée ; le message porte le manifeste.
- Doc : README (`pnpm version`, la clé, le fichier `signataires`),
  `agence.yaml` (commentaire : la variable).
- **Critère** : la mesure H de `PLAN-GENERAL.md` § 4 (signature fausse
  refusée, version plus ancienne refusée), en test.

### Lot 3 — La file des missions, l'aller et le retour (`general/l3-missions`, une session ; indépendant du lot 2)

**Fait le 2026-10-15, sur `general/l3-missions`, empilée sur le lot 2 (le
préflight de `pnpm agence` exige la clé) : une seule fusion les porte
tous deux.** Écarts : le verrou est `.claude/missions/agence.lock` (à côté
des files, une seule exclusion dans `.git/info/exclude`) ; la borne compte
les statuts finals du jour qui ont coûté un appel dans les files, pas
`memoire/INDEX.md` de la racine (en retard depuis L2) ; une mission d'un
autre métier que son client (`agence.clients[].metier`) est écartée et son
statut le dit ; le rattrapage tourne aussi sans `livraison.yaml` (il lit les
statuts que `pnpm chantier` écrit à côté des missions) et se déclenche, en
attendant la minuterie du lot 4, à chaque ouverture de l'onglet « Gestes »
(dans `/api/sans-geste`, pas de route nouvelle) ; `etat.yaml` (la version
courante) attend le lot 4, qui la connaît ; un statut `en cours` resté après
un arrêt brutal n'est pas repris (la branche existe : `--refaire` à la
main) ; `commanderEtLivrer` (dans `livraison/missions.ts`) fait la commande
puis l'aller, `commanderMission` rend aussi le chemin de la mission.

Relecture indépendante du lot 3, corrigé : un lien posé dans une file
faisait écrire l'agence hors de la file et lire au client n'importe quel
fichier → aucun lien n'est suivi (dossiers de date, missions, statuts,
dossiers de chantier), une place occupée par un lien est nettoyée avant
d'écrire ; la borne se comptait sur des statuts que le client écrit → elle
se compte au registre de l'agence (`.claude/missions/chantiers.log`, une
ligne par chantier lancé), et le client qui a eu le moins de chantiers du
jour passe d'abord ; une mission datée de demain est laissée ; un commit
dont le push a échoué partait pour poussé → `publier` pousse tout ce que la
file n'a pas ; un statut que l'agence n'a pas pu pousser restait coincé, ou
un `fusionné` devenait `échoué` → rien ne s'efface, ce qui est commis part
au tour suivant ; une commande dont la config était illisible n'était ni
poussée ni marquée → la marque est posée d'abord ; un `pull --rebase` en
conflit laissait le clone bloqué → abandonné et dit ; git vers une file
tournait sans délai (une invite gelait l'interface) → `GIT_TERMINAL_PROMPT=0`,
ssh en mode lot, délai de 15 s ; le verrou se posait en deux temps → `wx`.
**Ouvert** : deux clients de métiers différents qui commandent le même
identifiant partagent la branche `chantier/<id>`, son étiquette et ses
retraits ; le second finit « échoué » (le message le dit, sans proposer
`--refaire`). Un espace de noms par métier (`chantier/<métier>/<id>`) est à
faire avant un second client d'un autre métier.

Audit avant fusion (2026-10-16), corrigé : un statut écrit dans le clone
d'une file sans être commis (un arrêt avant le push) bloquait la file pour
toujours → ce que le clone porte est commis d'abord, puis `pull --rebase`
(pas `--autostash` : son conflit sort en 0 et laissait pousser des
marqueurs) ; une reprise à la main (`pnpm chantier --refaire` sur une
mission de la file) écrivait dossier et statut complets dans le clone →
elle sort à l'agence et ne pose que le statut public ; une adresse de file
changée est suivie (`remote set-url`) ;
**écart à L7** : le dossier `<id>.chantier.md` et le texte du statut ne
partent plus chez le client (ils portaient ce que le code du modèle
imprime, le texte des modèles, des chemins de l'agence) : le dossier et le
statut complets restent à l'agence (`.claude/missions/_chantiers/<slug>/<date>/`),
la file reçoit le statut public (le statut, sa version, son coût ; la carte
ne lit rien d'autre) ; non livré, `pnpm chantier` écrit toujours le dossier
à côté de la mission ; la mission poussée est réécrite telle que le schéma
la lit ; le statut « retiré » ne se perd plus (commis dans le clone, poussé
au tour suivant) ; le motif d'un retrait est nettoyé une fois
(`retirerMission`, le même dans le commit, la mémoire et le statut) ;
`origin` injoignable au moment de prendre une mission la laisse à prendre
au lieu de la faire finir « échoué » ; la version d'un statut et le métier
d'une mission suivent leur motif ; le verrou à pid porte le démarrage de la
machine (`boot_id`, `kern.bootsessionuuid`) : posé lors d'un autre
démarrage, levé, sans rien demander à l'horloge ; vide et frais, tenu.
Risques acceptés : deux écrivains du même statut (l'agence ne l'a pas
encore commis, un tiers l'a réécrit dans la file) : la file s'arrête et le
dit à chaque tour, rien de corrompu ne part (on efface le clone de
l'agence, `.claude/missions/<slug>/`, pour repartir) ; un client qui
repose `en attente` sur une mission déjà faite entame d'un chantier la borne
du jour (sans appel au modèle ; l'équité entre clients borne l'effet) ;
deux processus qui lèvent le même verrou mort au même instant (une fenêtre
de quelques microsecondes) ; l'identifiant d'une intention n'est contrôlé
que contre les noms des personnes du client, pas contre ses tiers (les
clients d'une agence web) : à Lionel.

- `moteur/src/livraison/config.ts` : `livraison.yaml` (schéma strict :
  `depot`, `missions`, `installation`, `intervalle_minutes`), `lireLivraison(dossier)`
  rend `undefined` sans fichier (L5).
- `moteur/src/livraison/missions.ts` : côté client, `pousserMission`
  (clone local de `missions` dans `installation/missions/`, `pull --rebase`,
  copie, `push` ; `à pousser` en cas d'échec), `rattraperStatuts` (pull,
  statuts nouveaux → journal + `chantiers/<id>.md`, `etat.yaml` poussé) ;
  côté agence, `fileDesClients(agence)` (un clone par client dans
  `.claude/missions/<slug>/`), `prochaineMission`, `ecrireStatut` + push.
- `mission.ts` / `commanderMission` : pousse après la ligne `geste commandé`
  si le client est livré (L6).
- `moteur/src/cli/agence.ts`, `pnpm agence [--une-fois]` : le verrou, la
  borne du jour, la boucle (L1) ; préflight (`claude auth status`, la clé de
  signature) avant tout appel.
- `interface/src/app.ts` : rien de nouveau en route ; `app.js` : les
  textes de la carte (L7) ; `index.html` : le chapeau de l'onglet
  (« le harnais le code à l'agence, sous ses contrôles »).
- Tests : `missions.test.ts` avec deux dépôts nus temporaires : un clic
  pousse ; `pnpm agence --une-fois` (binaire simulé) prend, écrit `en cours`
  puis le statut final ; `rattraperStatuts` écrit la ligne `chantier` une
  seule fois ; une mission mal formée dans la file est ignorée et dite ;
  `serveur.test.ts` : la carte dans ses quatre états.
- Doc : README (`pnpm agence`, `livraison.yaml`, les deux dépôts, les clés
  SSH dans la config SSH), `agence.yaml` (`clients`).
- **Critère** : les points 1 et 2 du critère global avec le binaire simulé.

### Lot 4 — La mise à jour chez le client et le lanceur (`general/l4-mise-a-jour`, une à deux sessions ; après 2 et 3)

**Fait le 2026-10-15, sur `general/l4-mise-a-jour`, empilée sur les lots 2
et 3.** Écarts : la préparation essaie les versions de la plus récente à la
plus ancienne et prépare la première admise (une plus récente refusée, par
sa signature ou sa lignée, ne bloque pas les suivantes) ; une version
refusée ou revenue en arrière n'est jamais reprise (le journal le dit, une
fois) ; l'interface lance le rattrapage dans un processus à part (`pnpm
mise-a-jour`) pour continuer de répondre pendant `pnpm install` et `pnpm
check` de la version ; le lanceur vit dans `interface/src/harnais.ts` (il
connaît l'hôte et le port de l'interface), sa boucle dans
`moteur/src/livraison/harnais.ts` ; la première installation se fait par
`pnpm mise-a-jour` (la version préparée devient la courante) ; `etat.yaml`
(la version courante d'un client, poussée dans sa file) n'est pas fait :
l'agence n'en a pas l'usage avant la phase G ; `pnpm chantier retirer` pousse
le statut `retiré` (et sa version) dans la file du client qui avait
commandé. Trouvé par la chaîne entière : l'agence ne connaissait que les
versions de `main` ; un nom pris sur le distant hors de `main` (une
étiquette refusée chez les clients) bloquait toute version suivante →
l'agence tire toutes les étiquettes `v*` avant de nommer.

Relecture indépendante du lot 4, corrigé : l'interface sortait pour la
bascule en pleine requête (un appel au modèle dure jusqu'à 7 min) → les
requêtes en cours comptent ; un `retirer` à la main était défait par le
rattrapage suivant → le marqueur de retour exclut la version tout de suite,
et l'arbre de `courant` et de `precedent` n'est jamais touché ; deux
préparations pouvaient se croiser → un verrou sur l'installation (bascule et
retour l'attendent) ; une étiquette réécrite (même étrangère aux versions)
bloquait tout sans un mot → seules les `v*` se tirent, une panne se dit
(`erreur`) sans rien exclure ; une panne passagère (réseau, config) excluait
une version pour toujours → seul un refus définitif (signature, lignée,
`pnpm check` rouge) exclut ; « faite » s'écrivait avant la sonde → le
lanceur pose un marqueur de bascule une fois la sonde passée, l'interface
l'écrit au journal, la ligne avant d'ôter le marqueur ; trois plantages
juste après une bascule arrêtaient le lanceur sans revenir → retour arrière
(dans la fenêtre de dix minutes), et l'arrêt voulu sort en 0 (launchd et
systemd ne le relancent pas) ; une interface lancée hors du lanceur sortait
sans être relancée → seule celle du lanceur sort ; le lanceur retirait
l'agent SSH du client (ses clés de déploiement) → il le garde ; le journal
SQLite n'attendait pas un autre processus → `busy_timeout`.

Rejoué pour de vrai le 2026-10-15, sans modèle, sur une machine : un dépôt
nu du produit (cette branche), deux versions signées par une clé engendrée,
une copie du client fictif livrée. `pnpm mise-a-jour` : signature vérifiée,
`pnpm install` et `pnpm check` verts dans `versions/v…-1` (52 s), devenue
la courante ; `pnpm harnais -- --modele simule` : l'interface sert depuis
l'arbre de la version, « mise à jour : faite (v…-1) » ; la v…-2 publiée et
préparée à côté (54 s) sans rien toucher de ce qui tourne ; au calme,
l'interface sort (75), le lanceur bascule, la sonde répond, « faite (v…-2) »,
`/api/version` le dit, `precedent` garde la v…-1. Rejoué après les
corrections de la relecture (`19dee55`) : première installation sans ligne
au journal ; bascule v…-3 → v…-4 au calme, sonde, puis « faite » écrite par
l'interface qui tourne ; `pnpm mise-a-jour retirer` (v…-4 → v…-3), un
rattrapage qui ne reprépare pas la v…-4, l'interface tuée, relancée par le
lanceur sur la v…-3, « retour arrière (…, retirée à la main) » au journal.
Le retour arrière sur sonde muette n'est joué qu'en test.

Audit avant fusion (2026-10-16), corrigé : l'interface d'un client livré
lançait git dans son propre processus (l'onglet « Gestes », le clic) : une
file injoignable la gelait 15 s par appel, la conversation comprise
(mesuré), et deux écrivains de lignes `chantier` pouvaient se croiser →
l'interface ne lance plus git : le clic marque la mission, l'onglet et le
clic déclenchent le rattrapage à part (relancé à sa fin s'il a été demandé
pendant qu'il tournait) ; le pas de dix secondes n'ouvre le dossier client
que si un marqueur attend ; un `spawn` raté se dit au lieu de faire tomber
le processus ; après `pnpm mise-a-jour retirer`, l'interface qui tourne sur
la version retirée sort au calme et le lanceur la relance sur la
précédente (avant, rien ne redémarrait, et `elaguer` pouvait retirer
l'arbre du code qui tournait), un second retrait est refusé ; trois
plantages juste après une bascule pendant une préparation : le lanceur
attend le verrou et revient (il s'arrêtait sur la nouvelle version) ; le
port et le dossier passés après `--` ne l'emportent plus sur ceux du
lanceur ; la sonde compte ses essais (une mise en veille n'exclut plus une
version saine) ; un plancher : aucune version plus ancienne qu'une version
signée qui a échoué ici (check rouge, retour arrière) ne se prépare, et une
qui attendait déjà la bascule est écartée : un retrait qui échoue ne fait
plus revenir le geste retiré ; le dépôt du produit chez le client ne tire
que les étiquettes `v*` (`--no-tags` : ni les branches ni les étiquettes de
chantier de l'agence, même posées dans l'histoire des versions), sans
invite, une connexion figée coupée, son adresse relue ; le lanceur qui
attend le verrou pour revenir le dit, une fois, avec le pid. Risques
acceptés : les `pnpm install` et `pnpm check` d'une préparation n'ont pas
de délai (un check qui ne finit pas tient l'installation : le lanceur
attend et le dit) ; `livrer()`
(`interface/src/serveur.ts`) et le lanceur réel (`interface/src/harnais.ts`)
ne se jouent qu'au laboratoire ; leurs pièces (`noterSiMarque`,
`relanceAttendue`, `doitRelancer`, `argumentsInterface`,
`sonderInterface`, `retirerALaMain`) ont leurs tests.

Rejoué pour de vrai après l'audit (2026-10-16, sur `814d831`, sans modèle,
une machine) : première installation par `pnpm mise-a-jour` (72 s, un seul
message), le dépôt du client ne porte que l'étiquette `v…-1` ; `pnpm
harnais -- --modele simule` : l'interface sert depuis l'arbre de la `v…-1`,
« Version v…-1. » en tête de l'onglet ; « Créer ce geste » à l'écran : la
mission marquée, poussée dans la file par le rattrapage à part ; les statuts
posés à la main dans la file comme l'agence le ferait (`en cours`, puis
`fusionné` avec la `v…-2` signée) : la carte les suit au rafraîchissement ;
la `v…-2` préparée à côté, sortie au calme (75), bascule, sonde, « faite
(v…-2) », « Version v…-2, mise à jour le 16 octobre 2026 » ; `pnpm
mise-a-jour retirer` : l'interface écrit « retour arrière (…, retirée à la
main) », sort au calme d'elle-même, le lanceur la relance sur la `v…-1` ;
tuée ensuite, relancée en 5 s sur la `v…-1` ; la `v…-2` jamais
repréparée ; aucune erreur dans la console du navigateur. À part, une copie
livrée dont la file est injoignable : avant l'audit, l'onglet et le clic
gelaient l'interface 15 s (`/api/roles` à 14 s) ; après, l'onglet répond en
22 ms, le clic en 39 ms, la mission reste marquée jusqu'au retour de la
file.

- `moteur/src/livraison/mise-a-jour.ts` : `preparer(dossier)` (L8 : fetch,
  candidates, vérification, worktree, install, check, `.prete`,
  `courant.suivant`, `VERSION`), `elaguer` (deux versions gardées),
  `rattraper(dossier)` = statuts (lot 3) + `preparer` ; `TYPE_MISE_A_JOUR =
  'mise à jour'` et ses issues (`faite`, `refusée`, `retour arrière`).
- `moteur/src/cli/mise-a-jour.ts`, `pnpm mise-a-jour --client <dossier>` :
  `rattraper` une fois, à la main ; `retirer` : `courant ← precedent` à la
  main.
- `moteur/src/cli/harnais.ts`, `pnpm harnais --client <dossier> [-- …]`
  (L9).
- `interface/src/app.ts` / `serveur.ts` : la minuterie (`rattraper` toutes
  les `intervalle_minutes`, et tout de suite quand un statut `fusionné`
  arrive), le compteur de calme, la sortie `CODE_RELANCE` ; au démarrage, la
  ligne `mise à jour` (L9) ; `/api/version` (l'étiquette courante et la
  date de la dernière mise à jour) ; `app.js` : une ligne en tête de
  l'onglet « Gestes » (« Version v…, mise à jour le … »).
- Tests : `mise-a-jour.test.ts` (dépôt nu temporaire, étiquettes signées
  avec la clé du lot 2 : préparée ; signature fausse refusée ; non
  descendante refusée ; `pnpm check` rouge simulé → refusée et retirée) ;
  `harnais.test.ts` (l'interface remplacée par une commande injectée :
  bascule ; sonde en échec → retour arrière et marqueur ; trois plantages →
  arrêt) ; `chaine.test.ts` (L12 : la chaîne entière, points 1 à 5).
- Doc : README (`pnpm harnais`, la ligne launchd/systemd, `pnpm
  mise-a-jour`, « ce que le client voit »), `livraison.yaml` d'exemple
  commenté dans `exemples/` (non lu par les exemples : il documente).
- **Critère** : les points 3, 4 et 5 du critère global, en test avec le
  binaire simulé.

### Lot 5 — La mesure réelle, puis le nettoyage (une session)

- La chaîne entière au laboratoire (L12) avec les vrais modèles (Fable,
  Opus, Sonnet par l'abonnement), sur une mission commandée depuis
  l'interface sur une copie du client fictif : les six points du critère
  global, relevés dans `evals/resultats/livraison-<date>.md` (coût, durée
  de chaque étape, les huit conditions, la version, la bascule).
- `HANDOFF.md` ; `PLAN-GENERAL.md` (E et H : faites autrement) ; Lionel
  supprime `~/harnais-nuit`, `~/harnais-nuit-origine.git` et les trois
  arbres `.claude/worktrees/agent-*` restés d'anciennes sessions (`git
  worktree remove`).

---

## 4. Les mesures

| Lot | Mesure | Seuil |
|---|---|---|
| 1 | L'arbre de base intact après un chantier et un retrait (test) ; les commandes émises sur la racine dans la liste du § 0.3 (test) ; `pnpm check` | identique ; 100 % ; vert |
| 2 | Signature fausse refusée ; étiquette non descendante refusée ; `AGENCE_CLE_SIGNATURE` absente de l'environnement du modèle (tests) | 100 % |
| 3 | Un clic → une mission dans la file → un statut → une ligne `chantier`, une seule (test) ; fuite 0 sur la mission qui part (test, noms du client fictif) | 100 % ; 0 |
| 4 | Préparée, refusée (signature, lignée, check rouge), basculée, retour arrière (tests) ; la chaîne entière avec le binaire simulé | 100 % |
| 5 | La chaîne entière avec les vrais modèles, une fois ; `pnpm evals traduire` sur le geste codé ; fuite sur la mission et la mémoire | points 1 à 6 ; au seuil ; 0 |

---

## 5. Ordre, sessions, parallélisme

0 → 1 → (2 ∥ 3) → 4 → 5. Les lots 2 et 3 ne se touchent pas (la version
d'un côté, la file de l'autre) : deux sous-agents en arbres de travail, ou
deux sessions. Le lot 4 attend les deux. Une session = un lot (le lot 4
peut en prendre deux : la mise à jour, puis le lanceur et la chaîne). À la
fin de chaque lot : relecture indépendante, fusion, push, `HANDOFF.md`.

---

## 6. Ce qui reste ouvert (ne bloque aucun lot)

- **Notification à l'agence** : jusqu'à la phase G (Telegram), l'agence lit
  `etat.yaml` dans la file de chaque client ; `pnpm agence` l'affiche. La
  phase G ajoutera le message « mise à jour faite / retour arrière ».
- **Un chantier d'un client A refusé** : A le voit (statut) ; B ne voit rien
  (rien n'a changé pour lui). Un chantier fusionné : B le reçoit à sa
  prochaine version sans l'avoir demandé ; son onglet « Gestes » dit « Version
  v…, mise à jour le … », la liste des gestes nouveaux attend la phase F
  (`gestes_desactives` et sa place dans l'interface).
- **La bascule vers la clé d'API** (G10) : due avant un client réel, après
  ce plan ; `pnpm agence` sous `acces: anthropic` se mesure ce jour-là.
- **Le lanceur ne se met pas à jour seul** (L9) : accepté ; si un jour il
  le faut, `harnais.ts` relira `courant` et se relancera lui-même.
