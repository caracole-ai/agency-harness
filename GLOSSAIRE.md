# Glossaire

L'abécédaire du projet, relevé sur le code le 2026-10-18 : une ligne par
mot, par commande, par fichier. Budget : cent entrées ; un mot nouveau
remplace, il ne s'ajoute pas. Un terme garde sa place si un patron ou un
ingénieur doit le connaître pour faire tourner le système ; un nom de
fonction ou de fichier interne vit dans le README (« Structure »). Les
schémas sont dans le README (« La carte »).

## Le produit et ses couches

- **Harnais** : le produit. Pour un métier, ce que l'agent sait, ce qu'il peut faire, ce qu'il ne doit jamais faire, comment on reconnaît un travail juste, quand il rend la main. Il décrit des bornes, pas un processus.
- **Moteur** (`moteur/`, paquet `@harnais/moteur`) : le code commun à tous les métiers. Il n'importe aucun métier : il charge celui que nomme le client.
- **Métier** (`metiers/<métier>/`) : la couche d'un secteur : sa fiche, son registre de règles, son code, ses évals. Deux codés aujourd'hui : la sécurité privée, l'agence web.
- **Client** (un dossier, jamais versionné) : les données d'une entreprise, ses personnes, son journal, ses missions, sa config. `exemples/` en tient deux fictifs, à copier avant tout essai.
- **Méthode** (`methode/`) : ce qui vaut dans au moins deux métiers, écrit une fois : le socle, le temps, les archétypes, l'architecture que lisent les modèles. C'est la spécification du moteur.
- **Fiche** (`metiers/<métier>/fiche.md`) : la description d'un métier en neuf rubriques, selon la grille (`GRILLE.md`), qui sépare ce qui est du métier de ce qui est du client. Ses tables 1, 2 et 4 se régénèrent depuis le registre.
- **Registre** (`regles.yaml`) : les règles d'un métier : interdits, tests types, escalades. `pnpm registre:verifier` tient la fiche et le registre cohérents.
- **Interdit** (`I-01`…) : une règle qui ne se lève jamais. Un interdit codé devient un contrôle. Le capital du projet, avec les tests. Les règles communes à tous les métiers portent un `G-`.
- **Contrôle** : un interdit en code, exécuté à un moment donné, qui échoue fermé : en cas d'erreur, il refuse. Il rend un verdict, plafonné par le statut de la règle qui le fonde.
- **Constat** : une ligne d'un rapport de veille ou d'un verdict : ce qui a été vu, avec sa source.
- **Statut d'un fait** : `texte` (écrit dans un texte opposable), `déclaré` (dit par un client, sans document), `constaté` (vu chez un client, daté), `confirmé` (vu chez deux clients), `hypothèse` (à vérifier sur place). Une hypothèse ne construit rien, elle pose une question.
- **Escalade** : le cas où l'agent rend la main à un humain, écrit dans le registre.
- **Archétype** : une des cinq sortes de travail : veiller, planifier, rapprocher (le consommé contre le vendu), rédiger, chercher. Veiller est présent dans tous les métiers.
- **Veille** : l'archétype qui lit les données d'un client, vérifie les règles et calcule les échéances. `pnpm veiller`.
- **Échéance** : une date à tenir (renouvellement, recyclage, fin de contrat), avec sa fenêtre d'alerte et son délai de préparation, réglés dans la config du client.
- **Rapport** : la sortie d'une veille, en Markdown, mis en page en HTML par `pnpm rapport:html`.
- **Domaine, notions** : ce qu'un métier déclare au moteur pour ses prompts (le cadre, les objets, les modifications possibles, le motif des identifiants à masquer) et ses notions, définies une fois au-dessus du modèle. Un contrôle ne recalcule jamais une notion, il la demande.
- **Connecteur** : la lecture des exports d'un outil du client, en CSV aujourd'hui.
- **Cas, client fictif** (`T-xx`) : un scénario de test d'un métier, sur les données inventées d'un client, cohérentes avec les phrases de démo. Agents `A-11`, membres `M-01`, demandes `D-V-17`. Le même rejeu sert aux tests et au registre.

## La conversation et les trois espaces

- **Patron** : le dirigeant du client. Seul à commander ; rien ne s'écrit chez lui sans son oui. Pas l'agence.
- **Rôle** : ce qu'une personne est pour le harnais (dirigeant, cheffe de projet, agent…), déclaré par le métier. Un rôle ouvre des capacités (voir, désigner autrui, proposer, écrire, valider, administrer) et une copie de données. Les onglets réservés disparaissent sans la capacité.
- **Identité** : le rôle et la personne qui parlent, vérifiés au registre des personnes avant toute ouverture du dossier. Le sélecteur « Je suis » de l'interface. L'interface n'écoute que la machine : sa session est l'authentification.
- **Identifiant de personne** : `A-2`, `M-01`. Ce qui remplace un nom partout où le modèle regarde.
- **Consigne** : ce que le patron tape, tel quel.
- **Intention** : l'identifiant de ce que la demande veut (`releve_kilometrique`). Le nom d'un geste, existant ou absent.
- **Traduction** : le modèle choisit un geste et ses paramètres depuis la consigne, dans une liste fermée. Le code exécute. `pnpm evals traduire` la mesure.
- **Geste** : une action codée que la conversation sait faire. Ses paramètres (un agent, un projet, un domaine) sont résolus par le métier. Le premier espace.
- **Désignation** : trouver la personne qu'une consigne nomme sans que le modèle voie un nom. Une correspondance exacte décide ; sinon le harnais demande, en code, « Vous parlez de X ? » ou « Vous parlez de qui ? » avec une liste numérotée. Aucun geste ne s'exécute sur un nom deviné.
- **Pseudonymes** : les noms remplacés par des identifiants avant tout appel au modèle, la traduction comprise : personnes, et selon le métier organisations (clients, contacts, sous-traitants). Un prénom partagé ou un nom mal écrit part en jeton (`NOM-1`), que le code reprend après l'appel pour résoudre ou poser la question. « Aucun nom ne part au modèle » : aucun nom que les données connaissent ; un surnom, un nom absent des données, une faute tout en minuscules passent, et la mesure ne les voit pas.
- **Fuite** : un nom des données retrouvé dans ce qui est parti au modèle, consigne comprise, ou cité dans sa réponse. L'éval la compte ; « fuite 0 » veut dire pas plus que `main`.
- **Échappée** : quand aucun geste ne convient, le modèle interroge en SQL, en lecture, une copie masquée des données du rôle, en une boucle bornée (tours, tokens, temps), puis répond par une phrase à trous. Chaque résultat arrive nommé (`T1`, `T2`) et ses lignes numérotées. Chaque requête et son résultat restent au journal. Le deuxième espace.
- **Copie** : la base SQLite jetable de l'échappée, par rôle, pseudonymisée, rouverte en lecture seule avant que le modèle la voie.
- **Phrase à trous, fabrication** : le modèle ne retape jamais un nombre ; il écrit un trou, `{T2.3.heures}` (une cellule) ou `{T2.n}` (un nombre de lignes), et le code remplit. Un identifiant qu'il a reçu tel quel (`TK-1050`, dans la demande ou un résultat) se recopie hors d'un trou. Un trou qui ne se résout pas, ou un nombre retapé hors de la consigne et des dates données par le harnais, retire la réponse et montre les tableaux ; le demandeur le lit ; l'état compte, par client, les réponses retirées.
- **Proposition** : ce qu'une échappée propose d'écrire (un remplacement, une réaffectation groupée de plusieurs vacations). Ses modifications sont lues par le métier ; elle attend une validation, elle ne s'écrit jamais seule.
- **Confirmation** : le oui demandé avant une écriture, attendu, donné ou refusé, chacun une ligne du journal. La validation porte sur un contenu exact (la clé d'accord) : l'écriture vérifie au journal que la dernière validation porte ce contenu, sinon elle refuse.
- **Délégation** : un pouvoir du patron confié à une personne pour un temps. Une demande nouvelle ne se délègue jamais.
- **Remplacement** : le geste de la sécurité privée qui remplace un agent absent : absence déclarée, candidats essayés contre les mêmes contrôles que la veille, validation du patron, accord de l'agent, puis le planning réécrit.
- **Conversation** (`C-1`) : un fil de demandes et de réponses, dans le journal. Une question en attente s'y répond, par la personne à qui elle est posée.
- **Journal** (`journal.sqlite`) : la mémoire du client, en ajout seul. Chaque tour, chaque échappée, chaque confirmation, chaque commande, chaque mise à jour y est une ligne typée.
- **Sans geste** : une demande que le métier ne sait pas faire. L'échappée répond quand même, et l'onglet « Gestes » en fait une carte avec son état : à commander, en attente, en cours, fusionnée, retirée, échouée Le « i » de la carte ouvre un volet (`/api/sans-geste/detail`, sans modèle) : où en est le geste, étape par étape et daté ; ce qu'il fera des données ; les demandes reçues, qui, quand, et ce que la question libre en a fait ; ce qui part à l'agence, les noms remplacés par leur type, ou pourquoi la commande serait refusée.
- **Commande, « Créer ce geste »** : le clic du patron sur cette carte. Il écrit une mission. Le troisième espace.
- **Modèle** : le fournisseur de langage, Anthropic seulement. Trois accès : `claude` (l'abonnement, par le binaire `claude`), `anthropic` (une clé d'API, absente aujourd'hui), simulé (`--modele simule`, sans réseau, rejoue un script de réponses). Le coût s'affiche en équivalent API.
- **Évals** : les cas écrits à la main dans `metiers/<métier>/evals/`, rejoués contre le modèle : `consignes.yaml` pour la traduction, `echappees.yaml` pour l'échappée, avec leurs pièges (une donnée modifiée avant le cas). Chaque cas porte une étiquette, ce qui est attendu : rien de plus que ce que la question demande (une marge demandée en pourcentage n'exige pas les euros). Les résultats, datés, dans `evals/resultats/`.
- **Interface** : l'application web du client, servie sur `127.0.0.1` seulement. La conversation à droite ; onglets : À valider, Règles, Délégations, Gestes, Journal. « À valider » montre les confirmations en attente et les demandes en cours ; une demande porte ses décisions (les **choix** du métier : valider le proposé, prendre un autre possible, ses raisons dites) et son détail **replié** (ceux qu'une règle interdit, la règle qu'ils ne remplissent pas ; ceux dont le dossier est incomplet, ce qui est à renseigner), les mêmes que sous le résultat du geste, cliqués sans modèle ; ce qui écrit attend encore son oui. Le Journal raconte ce qui s'est passé, par jour et en phrases ; le détail technique (appels à l'IA, recherches) se montre sur demande, et l'identifiant d'une action ouvre un volet qui retrace toutes ses lignes, leurs données en clair et le coût de l'IA ; le métier y nomme l'objet en clair (« Moussa Diallo — carte professionnelle », `nommer`), et une échéance relevée à chaque veille n'y figure qu'une fois, avec son nombre de relevés. Le bilan des questions libres est en tête du Journal ; l'en-tête ne les signale qu'en cas de réponse retirée ou d'abandon. Dans le chat, une longue réponse (échéances, veille, planning de tous) se donne en une phrase de compte puis en groupes. L'onglet Délégations montre ce que l'outil propose de faire seul après un succès validé : quoi, d'où vient la proposition, seulement quand, ce qui ne change pas ; elle s'accorde dans la configuration.

## Le chantier et la livraison

- **Agence** : la machine et le dépôt de qui fabrique le harnais. `pnpm agence` y tourne. Sa config : `agence.yaml`, sans secret. Elle garde chez elle le dossier complet de chaque chantier et le registre client ↔ mission.
- **Mission** : la commande d'un geste absent, mise en fichier : `missions/<date>/<intention>.yaml` chez le client. Un titre, un pourquoi, les consignes-types des échappées qui l'ont motivée, le métier, aucun nom. Une mission, un chantier, un geste.
- **File** (`missions-<slug>`) : un dépôt git par client, entre le client et l'agence. La mission y monte, le statut public y redescend. `etat.yaml` y dit où en est l'agence.
- **Slug** : le nom court d'un client, dans le nom de sa file.
- **Statut** (`<id>.statut.yaml`) : ce que le chantier rend : `en attente`, `en cours`, `fusionné`, `refusé`, `écartée` (refusée en code avant tout appel), `échoué`, `retiré`. Le statut public va dans la file ; le statut complet reste à l'agence.
- **Chantier** : le travail qui code un geste depuis une mission, dans la branche `chantier/<métier>/<id>` : un arbre de travail, trois rôles de modèle (Fable planifie et relit, Opus code), la garde, la fusion. `pnpm chantier`. Une mission à la fois, bornées par jour.
- **Arbre de travail** : un `git worktree` du dépôt de l'agence, parti d'`origin/main`, dans `.claude/worktrees/`. L'arbre de qui lance et sa branche `main` ne bougent jamais.
- **Garde** : les neuf conditions vérifiées en code avant la fusion : les chemins autorisés du métier, aucun test retiré, `pnpm check` rejoué, l'honnêteté (trois cas de traduction par geste), la relecture, les bornes, le nombre de lignes, une mémoire sans nom, le rejeu. Seul le commit qui a passé la garde se fusionne, jamais la pointe de la branche.
- **Rejeu** : la neuvième condition : pour chaque cas de traduction du geste nouveau, une échappée vive sur la même consigne, sur la copie du client fictif, puis le geste ; chaque nombre que l'échappée cite doit se trouver dans la réponse du geste. Abandon ou résumé retiré : « non mesurable », dit. `pnpm evals rejeu`.
- **Fusion** : automatique, dans un arbre détaché, poussée sur `main` du distant. Puis une version.
- **Mémoire** (`memoire/`) : dans le dépôt, ce que chaque chantier laisse : `INDEX.md` (une ligne par événement), `chantiers/`, `CONVENTIONS.md` (on y ajoute, jamais on n'en retire). Le chantier suivant la lit, tous les clients la tirent. Aucun nom n'y entre.
- **Retrait** : `pnpm chantier retirer <métier>/<id> --motif` : `git revert` de la fusion, la mémoire, le statut, puis une version. Une mission retirée ne se relance jamais.
- **Version** : une étiquette git signée `v<AAAA-MM-JJ>-<n>` posée sur `main`, avec son manifeste. Chaque fusion et chaque retrait en posent une ; `pnpm versionner` en pose une sans chantier. Une version doit descendre de celle qui tourne (la lignée) et rester au-dessus du plancher : après un retrait, la version retirée ne se réinstalle pas.
- **Signature** : SSH, par la clé de l'agence, désignée par `AGENCE_CLE_SIGNATURE`, hors du dépôt, jamais dans l'environnement d'un modèle. Le client porte la clé publique dans son fichier `signataires` : sans lui, aucune version ne s'installe.
- **Client livré** : un client dont le dossier porte `livraison.yaml`. Il lit le dépôt du produit pour ses seules étiquettes `v*`, avec une clé de déploiement en lecture. Sans ce fichier, rien ne quitte sa machine.
- **Installation** : hors du dossier client : `depot/`, `versions/<tag>/` (un arbre par version), les liens `courant`, `precedent`, `courant.suivant`, et `missions/` (le clone de la file).
- **Rattrapage** (`pnpm mise-a-jour`) : le seul processus qui lance git chez le client : pousse les missions, tire les statuts, tire, vérifie et prépare la version suivante à côté (`pnpm check` vert dans son arbre). Au démarrage, à chaque intervalle, à l'onglet « Gestes », après une commande.
- **Lanceur** (`pnpm harnais`) : la seule chose installée à la main chez le client. Il lance l'interface depuis `courant` ; quand une version est prête et le moment calme, l'interface sort, le lanceur bascule (`courant` devient la version prête, l'ancienne `precedent`), sonde jusqu'à trente fois, revient en arrière sans réponse et le dit au journal.
- **Laboratoire** : un dossier temporaire avec un dépôt nu, une clé jetable et une copie du client fictif, pour rejouer la chaîne pour de vrai. Jamais dans le dépôt : `pnpm agence`, `pnpm chantier` et `pnpm versionner` y poussent sur GitHub.

## La méthode et les documents

- **HANDOFF.md** : l'état à la dernière passation, deux pages. À lire en premier.
- **REFLEXIONS.md** : le fil des décisions, les enseignements, les questions à trancher. Une décision réversible se prend par Claude et s'y écrit le jour même ; Lionel garde ce qui engage un client réel.
- **Plans** (`PLAN-GENERAL.md`, `PLAN-LIVRAISON.md`) : un plan par chantier de conception, écrit pour être exécuté sans décision à prendre, avec ses décisions numérotées (`G1`, `L7`). Les plans exécutés sont dans `archives/`.
- **Lot** : l'unité d'un plan. Une session, un lot, une branche, une fusion, un push.
- **Cérémonie** : règle commitée avant la mesure, mesure appariée (le même jeu de cas rejoué sur `main` et sur la branche, le même jour), une condition fausse et pas de fusion. Seulement pour la sécurité, la vie privée et la fusion dans `main`.
- **Relecture** : avant une fusion, des sous-agents indépendants lisent la branche sous des angles séparés ; l'auteur tranche et corrige.
- **KISS** : le chemin simple d'abord ; si le laborieux s'impose, prévenir avant de s'engager. Lire les traces avant toute correction ; mesurer une fois, à la fin.
- **Abonnement** : tout tourne par le binaire `claude` sur l'abonnement claude.ai. `ANTHROPIC_API_KEY` reste absente ; la bascule vers la clé est due avant un client réel.
- **Canal fabricant** : Telegram, à venir : des notifications vers l'agence, sans ordre ni donnée client.
- **Bac à sable** : ouvert, à Lionel : le code d'un chantier lit aujourd'hui la clé, `~/.ssh`, le trousseau. Le chemin proposé est un utilisateur dédié.

## Termes retirés, encore lisibles dans les archives

- **Promotion, geste appris, ronde, nuit, GMI, niveau 2** : une demande qui revenait devenait un geste fabriqué par le modèle (promotion), désignée par un passage automatique (ronde), codée au cron dans un clone réservé (nuit), sur un fournisseur tiers (GMI et GLM) ; le modèle départageait des noms proches (niveau 2). Tout est retiré : seul le patron commande, le chantier tourne au clic à l'agence, Anthropic seul, aucun nom au modèle.

## Les commandes

| Commande | Ce qu'elle fait |
|---|---|
| `pnpm install` | Installe les dépendances de tous les paquets. |
| `pnpm check` | Lint, types, tests, cohérence du registre. Vert avant chaque commit. |
| `pnpm lint`, `pnpm format` | Biome : vérifie, ou réécrit. |
| `pnpm typecheck`, `pnpm test` | TypeScript et Vitest, dans chaque paquet. |
| `pnpm registre:generer`, `pnpm registre:verifier` | Réécrit les tables de la fiche depuis le registre ; vérifie fiche, registre et cas (ce que `check` appelle en dernier). |
| `pnpm veiller --client <dossier> [--date AAAA-MM-JJ] [--sortie rapport.md]` | La veille d'un client : planning, règles, échéances, rapport. |
| `pnpm rapport:html <rapport.md> <rapport.html> [--bandeau "texte"]` | Met un rapport en page pour l'écran et l'impression. |
| `pnpm parler --client <copie> --role <rôle> [--personne A-2] [--maintenant …] [--modele simule] --consigne "…" [--conversation C-…]` | Une consigne, une réponse, en ligne de commande. |
| `pnpm interface --client <copie> [--port 3777] [--maintenant …] [--modele simule] [--script réponses.json]` | L'interface web, sur `127.0.0.1`. |
| `pnpm evals traduire\|echappee\|rejeu --client <dossier> [--seulement id,id] [--modele simule] [--gestes a,b]` | Rejoue les cas d'un métier (`rejeu` : les cas des gestes nommés, échappée contre geste), écrit les résultats dans `evals/resultats/`. |
| `pnpm --filter @harnais/agence-web fictif --vers <dossier>` | Génère le client fictif de l'agence web. |
| `pnpm chantier --mission <fichier> [--sortie <dossier>] [--sans-modele] [--refaire]` | Un chantier sur une mission, à la main. `--refaire` rouvre la branche telle quelle. |
| `pnpm chantier retirer <métier>/<id> --motif "<texte>"` | Retire un geste fusionné : revert, mémoire, statut, version. L'identifiant seul suffit s'il n'est que dans un métier. |
| `pnpm agence [--une-fois]` | La boucle de l'agence sur les files de ses clients : tire, chantier, statut, version. |
| `pnpm versionner` | Une version signée sur `origin/main` tel quel. Exige `AGENCE_CLE_SIGNATURE`. |
| `pnpm mise-a-jour [retirer] --client <dossier>` | Le rattrapage d'un client livré : missions, statuts, versions ; `retirer` revient à la version précédente. |
| `pnpm harnais --client <dossier> [-- --modele simule]` | Le lanceur, depuis `<installation>/courant`. |

Les commandes qui poussent sur `origin` (`agence`, `chantier`, `versionner`)
ne se lancent jamais dans ce dépôt pour un essai : au laboratoire. Un test
de `pnpm check` vérifie que cette table et les scripts de `package.json`
disent la même chose.

## Les fichiers et les variables

- **`config.yaml`** (client) : le métier, les données, le journal, les réglages de la veille et du remplacement, le modèle de la conversation.
- **`personnes.yaml`** (client) : le registre des personnes et de leurs rôles. Exigé de tout client, relu à chaque requête.
- **`livraison.yaml`, `signataires`** (client) : `depot`, `missions`, `installation`, `intervalle_minutes`, et la clé publique de l'agence. Font d'un client un client livré.
- **`journal.sqlite`** (client) : le journal.
- **`missions/<date>/<intention>.yaml`** (client) : les missions commandées ; `.a-pousser` marque celles qui n'ont pas encore quitté la machine.
- **`agence.yaml`** (agence) : modèles et prix du chantier, binaire, bornes (`chantiers_max_par_jour`, `tours_max`, `budget_usd_par_mission`, `lignes_max`), clients et leurs files, chemins autorisés et interdits, le client fictif des évals par métier.
- **`AGENCE_CLE_SIGNATURE`** : le chemin de la clé privée SSH de l'agence, hors du dépôt.
- **`ANTHROPIC_API_KEY`** : absente par décision ; ne pas la chercher ni la demander.
