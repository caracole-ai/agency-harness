# Glossaire

L'abécédaire du projet, relevé sur le code et les plans le 2026-10-16 : une
ligne par mot, par commande, par fichier. Les schémas sont dans le README
(« La carte »), le détail de chaque module dans « Structure ».

## Le produit et ses couches

- **Harnais** : le produit. Pour un métier, ce que l'agent sait, ce qu'il peut faire, ce qu'il ne doit jamais faire, comment on reconnaît un travail juste, quand il rend la main. Il décrit des bornes, pas un processus.
- **Moteur** (`moteur/`, paquet `@harnais/moteur`) : le code commun à tous les métiers. Il n'importe aucun métier : il charge celui que nomme le client.
- **Métier** (`metiers/<métier>/`) : la couche d'un secteur : sa fiche, son registre de règles, son code, ses évals. Deux aujourd'hui : la sécurité privée, l'agence web.
- **Client** (un dossier, jamais versionné) : les données d'une entreprise, ses personnes, son journal, ses missions, sa config. `exemples/` en tient deux fictifs, à copier avant tout essai.
- **Méthode** (`methode/`) : ce qui vaut dans au moins deux métiers, écrit une fois : le socle, le temps, les archétypes. C'est la spécification du moteur.
- **Fiche** (`metiers/<métier>/fiche.md`) : la description d'un métier en neuf rubriques. Ses tables 1, 2 et 4 se régénèrent depuis le registre.
- **Grille** (`GRILLE.md`) : le gabarit d'une fiche et la règle qui sépare ce qui est du métier de ce qui est du client.
- **Registre** (`regles.yaml`) : les règles d'un métier : interdits, tests types, escalades. `pnpm registre:verifier` tient la fiche et le registre cohérents.
- **Interdit** (`I-01`…) : une règle qui ne se lève jamais. Un interdit codé devient un contrôle. Le capital du projet, avec les tests.
- **Règle commune** (`G-01`…) : une règle du socle, vraie pour tous les outils de tous les métiers.
- **Contrôle** : un interdit en code, exécuté à un moment donné, qui échoue fermé : en cas d'erreur, il refuse.
- **Moment** : quand un contrôle s'exécute : `pre-tool`, `post-tool`, `pre-response`, `stop`.
- **Verdict** : ce que rend un contrôle, plafonné par le statut de la règle qui le fonde.
- **Constat** : une ligne d'un rapport de veille ou d'un verdict : ce qui a été vu, avec sa source.
- **Statut d'un fait** : `texte` (écrit dans un texte opposable), `déclaré` (dit par un client, sans document), `constaté` (vu chez un client, daté), `confirmé` (vu chez deux clients), `hypothèse` (à vérifier sur place). Une hypothèse ne construit rien, elle pose une question.
- **Escalade** : le cas où l'agent rend la main à un humain, écrit dans le registre.
- **Archétype** : une des cinq sortes de travail : veiller, planifier, rapprocher, rédiger, chercher. Veiller est présent dans tous les métiers.
- **Veille** : l'archétype qui lit les données d'un client, vérifie les règles et calcule les échéances. `pnpm veiller`.
- **Échéance** : une date à tenir (renouvellement, recyclage, fin de contrat), avec sa fenêtre d'alerte et son délai de préparation, réglés dans la config du client.
- **Rapport** : la sortie d'une veille, en Markdown, mis en page en HTML par `pnpm rapport:html`.
- **Candidats** : choisir quelqu'un pour une tâche en essayant chacun contre les mêmes contrôles que la veille. Aucune règle n'est réécrite pour l'occasion.
- **Rapprocher** : l'archétype qui compare le consommé au vendu et prévient au seuil. V1 minimale, dans l'agence web.
- **Notions** (`semantique.ts`) : les notions d'un métier, définies une fois au-dessus du modèle. Un contrôle ne recalcule jamais une notion, il la demande.
- **Domaine** (`domaine.ts`) : ce qu'un métier déclare au moteur pour ses prompts : le cadre, les objets, les modifications possibles, le motif des identifiants à masquer.
- **Opération** : l'écriture d'un métier, telle que le moteur la lit sans la connaître : le schéma d'une modification et l'objet qu'elle modifie.
- **Tableau** (`tableau.ts`) : ce que l'interface montre d'un métier (demandes en cours, lignes en attente, noms des objets). Le métier le rend, l'interface ne connaît aucun métier.
- **Connecteur** : la lecture des exports d'un outil du client, en CSV aujourd'hui.
- **Cas** (`T-xx`) : un scénario de test d'un métier : des données fictives, une date, ce qui est attendu. Le même rejeu sert aux tests et au registre.
- **Scénario, client fictif** : les données inventées d'un client, cohérentes avec les phrases de démo. Agents `A-11`, membres `M-01`, demandes `D-V-17`.

## La conversation et les trois espaces

- **Patron** : le dirigeant du client. Seul à commander ; rien ne s'écrit chez lui sans son oui. Pas l'agence.
- **Rôle** : ce qu'une personne est pour le harnais (dirigeant, cheffe de projet, agent…), déclaré par le métier. Un rôle ouvre des capacités et une copie de données.
- **Capacité** : ce qu'un rôle a le droit de faire ou de voir. Les onglets réservés disparaissent sans elle.
- **Identité** : le rôle et la personne qui parlent. Le sélecteur « Je suis » de l'interface.
- **Identifiant de personne** : `A-2`, `M-01`. Ce qui remplace un nom partout où le modèle regarde.
- **Registre des personnes** (`personnes.yaml`) : qui existe chez le client, avec son rôle. Exigé de tout client.
- **Consigne** : ce que le patron tape, tel quel.
- **Intention** : l'identifiant de ce que la demande veut (`releve_kilometrique`). Le nom d'un geste, existant ou absent.
- **Traduction** : le modèle choisit un geste et ses paramètres depuis la consigne. Le code exécute. `pnpm evals traduire` la mesure.
- **Geste** : une action codée que la conversation sait faire, dans une liste fermée. Le premier espace.
- **Paramètre, entité** : ce qu'un geste attend (un agent, un projet, un domaine), résolu par le métier : identifiant exact, puis nom exact, puis les candidats les plus proches.
- **Désignation** : trouver la personne qu'une consigne nomme sans que le modèle voie la liste des noms. Niveau 1 : une correspondance exacte décide. Niveau 2 : une liste courte que le modèle départage.
- **Pseudonymes** : les noms remplacés avant tout appel au modèle. « Aucun nom ne part au modèle. »
- **Noms** : personnes, et selon le métier organisations (clients, contacts, sous-traitants) : tout ce qui se masque.
- **Fuite** : un nom des données retrouvé dans ce qui est parti au modèle, ou cité dans sa réponse. L'éval la compte ; « fuite 0 » veut dire pas plus que `main`.
- **Échappée** : quand aucun geste ne convient, le modèle interroge en SQL, en lecture, une copie masquée des données du rôle, puis résume. Le deuxième espace.
- **Copie** : la base SQLite jetable de l'échappée, par rôle, pseudonymisée, rouverte en lecture seule avant que le modèle la voie.
- **Outil d'échappée** : une requête SQL du modèle et son résultat, gardés au journal.
- **Boucle** : les tours d'une échappée, du premier appel au résumé.
- **Fabrication** : un chiffre, une date ou un nom cités par le modèle sans se trouver dans les sorties de ses outils. Le contrôle de la réponse retire alors le résumé ; l'éval la compte.
- **Proposition** : ce qu'une échappée propose d'écrire (un remplacement, une réaffectation). Elle attend une validation, elle ne s'écrit jamais seule.
- **Modifications** : les écritures qu'une proposition contient, lues par l'opération du métier.
- **Confirmation** : le oui demandé avant une écriture. Attendue, donnée ou refusée, chacune est une ligne du journal.
- **Jeton, clé d'accord** : la validation humaine porte sur un contenu exact. L'écriture vérifie au journal que la dernière validation porte ce contenu, sinon elle refuse.
- **Délégation** : un pouvoir du patron confié à une personne pour un temps. Une demande nouvelle ne se délègue jamais.
- **Remplacement** : le geste de la sécurité privée qui remplace un agent absent : absence déclarée, candidats contrôlés, validation du patron, accord de l'agent, puis le planning réécrit.
- **Réaffectation groupée** : une proposition de l'échappée qui redistribue plusieurs vacations d'un coup, validée par le patron, acceptée par chaque agent.
- **Conversation** (`C-1`) : un fil de demandes et de réponses, dans le journal. Une question en attente s'y répond.
- **Précision attendue** : la question que le harnais pose quand une consigne est ambiguë (« de qui parlez-vous ? »).
- **Journal** (`journal.sqlite`) : la mémoire du client, en ajout seul. Chaque tour, chaque échappée, chaque confirmation, chaque mise à jour y est une ligne typée.
- **Types de lignes** : `consigne`, `echappee`, `outil_echappee`, `appel_modele`, `confirmation`, `confirmation_attendue`, `precision_attendue`, `proposition refusée`, `accès refusé`, `alerte`, `geste commandé`, `chantier`, `mise à jour`.
- **Sans geste** : une demande que le métier ne sait pas faire. L'échappée répond quand même, et l'onglet « Gestes » en fait une carte.
- **Commande, « Créer ce geste »** : le clic du patron sur cette carte. Il écrit une mission. Le troisième espace.
- **Modèle** : le fournisseur de langage. Trois accès : `claude` (l'abonnement, par le binaire `claude`), `anthropic` (une clé d'API, absente aujourd'hui), simulé (`--modele simule`, sans réseau).
- **Script** : les réponses rejouées par le modèle simulé, un tableau JSON. Pour les démos et les captures.
- **Compteur** : le coût de chaque appel et du mois, en équivalent API. Sur l'abonnement, rien n'est facturé, le quota est la contrainte.
- **Évals** : les cas écrits à la main dans `metiers/<métier>/evals/`, rejoués contre le modèle : `consignes.yaml` pour la traduction, `echappees.yaml` pour l'échappée. Chaque cas porte une étiquette, ce qui est attendu.
- **Piège** : une modification d'un fichier de données faite avant un cas d'échappée, pour vérifier que la réponse lit les données et non sa mémoire.
- **Interface** : l'application web du client, servie sur `127.0.0.1` seulement. Onglets : Conversation, Gestes, Règles, Délégations, Journal.
- **Carte** : dans l'onglet « Gestes », une demande sans geste avec son état : à commander, en attente, en cours, fusionnée, retirée, échouée.

## Le chantier et la livraison

- **Agence** : la machine et le dépôt de qui fabrique le harnais. `pnpm agence` y tourne. Sa config : `agence.yaml`, sans secret.
- **Mission** : la commande d'un geste absent, mise en fichier : `missions/<date>/<intention>.yaml` chez le client. Un titre, un pourquoi, les échappées qui l'ont motivée, le métier, aucun nom. Une mission, un chantier, un geste.
- **Mission masquée** : la mission telle qu'elle part : relue, sans nom ni identifiant de personne.
- **File** (`missions-<slug>`) : un dépôt git par client, entre le client et l'agence. La mission y monte, le statut public y redescend. `etat.yaml` y dit où en est l'agence.
- **Slug** : le nom court d'un client, dans le nom de sa file.
- **Statut** (`<id>.statut.yaml`) : ce que le chantier rend : `en attente`, `en cours`, `fusionné`, `refusé`, `écartée`, `échoué`, `retiré`. Le statut public va dans la file ; le statut complet, avec la sortie de `pnpm check`, reste à l'agence.
- **Écartée** : une mission que le code refuse avant tout appel : retirée auparavant, ou dont l'intention a déjà un geste.
- **Chantier** : le travail qui code un geste depuis une mission : un arbre de travail, trois modèles, la garde, la fusion. `pnpm chantier`. Une mission à la fois, bornées par jour.
- **Arbre de travail** : un `git worktree` du dépôt de l'agence, parti d'`origin/main`, dans `.claude/worktrees/`. L'arbre de qui lance et sa branche `main` ne bougent jamais.
- **Plan, implémentation, revue** : les trois rôles de modèle d'un chantier, réglés dans `agence.yaml` : Fable planifie et relit, Opus code.
- **Garde** : les conditions vérifiées en code avant la fusion : `pnpm check`, les évals du métier, les chemins autorisés et interdits, le nombre de lignes, aucun nom dans la mémoire. Rien n'est promis par un prompt.
- **Chemins autorisés, interdits** : où un chantier a le droit d'écrire, résolus avec le métier de la mission. Un chantier ne touche jamais un autre métier ni les contrôles des règles.
- **Commit gardé** : le commit qui a passé la garde. C'est lui qui se fusionne, pas la pointe de la branche.
- **Fusion** : automatique, dans un arbre détaché, poussée sur `main` du distant. Puis une version.
- **Mémoire** (`memoire/`) : dans le dépôt, ce que chaque chantier laisse : `INDEX.md` (une ligne par événement), `chantiers/`, `CONVENTIONS.md` (on y ajoute, jamais on n'en retire). Le chantier suivant la lit. Aucun nom n'y entre.
- **Retrait** : `pnpm chantier retirer <id> --motif` : `git revert` de la fusion, la mémoire, le statut, puis une version. Une mission retirée ne se relance jamais.
- **Version** : une étiquette git signée `v<AAAA-MM-JJ>-<n>` posée sur `main`, avec son manifeste. `pnpm versionner`. Chaque fusion et chaque retrait en posent une.
- **Signature** : SSH, par la clé de l'agence, désignée par `AGENCE_CLE_SIGNATURE`, hors du dépôt, jamais dans l'environnement d'un modèle.
- **Signataires** : le fichier du dossier client qui porte la clé publique de l'agence. Sans lui, aucune version ne s'installe.
- **Lignée** : une version doit descendre de celle qui tourne. Une étiquette d'une autre lignée est refusée.
- **Plancher** : la version la plus basse que le client accepte encore. Après un retrait, la version retirée ne se réinstalle pas.
- **Client livré** : un client dont le dossier porte `livraison.yaml`. Sans ce fichier, rien ne quitte sa machine.
- **Dépôt du produit** : le dépôt de l'agence, lu par le client pour ses seules étiquettes `v*`, jamais ses branches. Une clé de déploiement en lecture.
- **Dépôt nu** : un clone git sans arbre de travail. L'installation en tient un ; le laboratoire aussi.
- **Installation** : hors du dossier client : `depot/`, `versions/<tag>/` (un arbre par version), les liens `courant`, `precedent`, `courant.suivant`, et `missions/` (le clone de la file).
- **Rattrapage** (`pnpm mise-a-jour`) : le seul processus qui lance git chez le client : pousse les missions, tire les statuts, tire et prépare les versions. Au démarrage, à chaque intervalle, à l'onglet « Gestes », après une commande.
- **Préparée** : une version tirée, vérifiée, installée à côté, dont `pnpm check` est vert dans son arbre. Marquée `.prete`, pointée par `courant.suivant`.
- **Moment calme** : aucune requête en cours ni récente, aucun rattrapage en cours. L'interface ne relance qu'à ce moment.
- **Relance** (`CODE_RELANCE`) : l'interface sort avec ce code quand une version est prête, ou que `courant` n'est plus le code qui tourne. Le lanceur fait le reste.
- **Lanceur** (`pnpm harnais`) : la seule chose installée à la main chez le client. Il lance l'interface depuis `courant`, bascule sur la version prête, sonde, revient en arrière.
- **Bascule** : `courant` devient la version prête, l'ancienne devient `precedent`.
- **Sonde** : après une bascule, le lanceur appelle l'interface jusqu'à trente fois. Sans réponse, retour arrière.
- **Retour arrière** : `courant` revient à `precedent`, l'interface est relancée, une ligne « mise à jour » le dit au journal.
- **Verrou** : un fichier qui porte le pid et le démarrage de la machine. Un verrou dont le pid est mort, ou posé sous un autre démarrage, est levé.
- **Laboratoire** : un dossier temporaire avec un dépôt nu, une clé jetable et une copie du client fictif, pour rejouer la chaîne pour de vrai. Jamais dans le dépôt : `pnpm agence`, `pnpm chantier` et `pnpm versionner` y poussent sur GitHub.
- **Ce qui reste à l'agence** : `.claude/missions/_chantiers/<slug>/<date>/` (le dossier complet d'un chantier) et `chantiers.log` (le registre local client ↔ mission).

## La méthode et les documents

- **HANDOFF.md** : l'état à la dernière passation, deux pages. À lire en premier.
- **REFLEXIONS.md** : le fil des décisions, les enseignements, les questions à trancher.
- **PLAN-*.md** : un plan par chantier de conception, écrit pour être exécuté sans décision à prendre. `PLAN-GENERAL.md` les ordonne ; `PLAN-LIVRAISON.md` est le dernier.
- **Lot, phase** : l'unité d'un plan. Une session, un lot, une branche, une fusion.
- **Décision** (`G1`, `L7`, `M10`, `R5`) : un choix tranché dans un plan, numéroté par plan.
- **Cérémonie** : règle commitée avant la mesure, mesure appariée base contre lot, une condition fausse et pas de fusion. Seulement pour la sécurité, la vie privée et la fusion dans `main`.
- **Mesure appariée** : le même jeu de cas rejoué sur `main` et sur la branche, le même jour, pour que l'écart dépasse le bruit.
- **Relecture** : avant une fusion, des sous-agents indépendants lisent la branche sous des angles séparés ; l'auteur tranche et corrige.
- **KISS** : le chemin simple d'abord ; si le laborieux s'impose, prévenir avant de s'engager.
- **Abonnement** : tout tourne par le binaire `claude` sur l'abonnement claude.ai. `ANTHROPIC_API_KEY` reste absente ; la bascule vers la clé est due avant un client réel.
- **Canal fabricant** : Telegram, à venir : des notifications vers l'agence, sans ordre ni donnée client.
- **Bac à sable** : ouvert : le code d'un chantier lit aujourd'hui la clé, `~/.ssh`, le trousseau. Le chemin proposé est un utilisateur dédié.

## Termes retirés, encore lisibles dans les anciens plans

- **Promotion, geste appris** : une demande qui revenait devenait un geste fabriqué par le modèle. Retirée le 2026-10-15 : seul le patron commande.
- **Ronde** : le passage automatique qui proposait des missions. Retirée avec la promotion.
- **Nuit, clone de la nuit** : le chantier au cron, dans un clone réservé. Remplacés par le chantier au clic, à l'agence.
- **GMI, GLM** : le fournisseur et le modèle du quotidien jusqu'au 2026-10-14. Remplacés par Sonnet sur l'abonnement.

## Les commandes

| Commande | Ce qu'elle fait |
|---|---|
| `pnpm install` | Installe les dépendances de tous les paquets. |
| `pnpm check` | Lint, types, tests, cohérence du registre. Vert avant chaque commit. |
| `pnpm lint`, `pnpm format` | Biome : vérifie, ou réécrit. |
| `pnpm typecheck`, `pnpm test` | TypeScript et Vitest, dans chaque paquet. |
| `pnpm registre:generer [metiers/<métier>]` | Réécrit les tables de la fiche depuis le registre. |
| `pnpm registre:verifier [metiers/<métier>]` | Vérifie fiche, registre et cas : ce que `check` appelle en dernier. |
| `pnpm veiller --client <dossier> [--date AAAA-MM-JJ] [--sortie rapport.md]` | La veille d'un client : planning, règles, échéances, rapport. |
| `pnpm rapport:html <rapport.md> <rapport.html> [--bandeau "texte"]` | Met un rapport en page pour l'écran et l'impression. |
| `pnpm parler --client <copie> --role <rôle> [--personne A-2] [--maintenant …] [--modele simule] --consigne "…" [--conversation C-…]` | Une consigne, une réponse, en ligne de commande. |
| `pnpm interface --client <copie> [--port 3777] [--maintenant …] [--modele simule] [--script réponses.json]` | L'interface web, sur `127.0.0.1`. |
| `pnpm evals traduire\|echappee --client <dossier> [--seulement id,id] [--modele simule]` | Rejoue les cas d'un métier, écrit les résultats dans `evals/resultats/`. |
| `pnpm remplacer absence\|valider\|reponse\|suivre --client <copie> …` | Le remplacement de la sécurité privée, étape par étape. |
| `pnpm --filter @harnais/agence-web fictif --vers <dossier>` | Génère le client fictif de l'agence web. |
| `pnpm chantier --mission <fichier> [--sortie <dossier>] [--sans-modele] [--refaire]` | Un chantier sur une mission, à la main. `--refaire` rouvre la branche telle quelle. |
| `pnpm chantier retirer <id> --motif "<texte>"` | Retire un geste fusionné : revert, mémoire, statut, version. |
| `pnpm agence [--une-fois]` | La boucle de l'agence sur les files de ses clients : tire, chantier, statut, version. |
| `pnpm versionner` | Une version signée sur `origin/main` tel quel. Exige `AGENCE_CLE_SIGNATURE`. |
| `pnpm mise-a-jour --client <dossier>` | Le rattrapage d'un client livré : missions, statuts, versions. |
| `pnpm mise-a-jour retirer --client <dossier>` | Revient à la version précédente ; l'interface relance au calme. |
| `pnpm harnais --client <dossier> [-- --modele simule]` | Le lanceur, depuis `<installation>/courant`. |

Les commandes qui poussent sur `origin` (`agence`, `chantier`, `versionner`)
ne se lancent jamais dans ce dépôt pour un essai : au laboratoire.

## Les fichiers et les variables

- **`config.yaml`** (client) : le métier, les données, le journal, les réglages de la veille et du remplacement, le modèle de la conversation.
- **`personnes.yaml`** (client) : le registre des personnes et de leurs rôles.
- **`livraison.yaml`** (client) : `depot`, `missions`, `installation`, `intervalle_minutes`. Fait d'un client un client livré.
- **`signataires`** (client) : la clé publique de l'agence.
- **`journal.sqlite`** (client) : le journal.
- **`missions/<date>/<intention>.yaml`** (client) : les missions commandées ; `.a-pousser` marque celles qui n'ont pas encore quitté la machine.
- **`agence.yaml`** (agence) : modèles et prix du chantier, binaire, bornes (`chantiers_max_par_jour`, `tours_max`, `budget_usd_par_mission`, `lignes_max`), clients et leurs files, chemins autorisés et interdits.
- **`memoire/`** (dépôt) : la mémoire des chantiers, tirée par tous les clients avec chaque version.
- **`metiers/<métier>/regles.yaml`, `fiche.md`, `evals/`** : le capital d'un métier.
- **`AGENCE_CLE_SIGNATURE`** : le chemin de la clé privée SSH de l'agence, hors du dépôt.
- **`ANTHROPIC_API_KEY`** : absente par décision ; ne pas la chercher ni la demander.
- **`evals/resultats/`** : les résultats de chaque passe d'évals, datés. Deux passes dans la même minute écrivent au même endroit : décaler.
