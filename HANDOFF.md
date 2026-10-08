# Handoff — 2026-10-07

Pour reprendre dans une session neuve. À lire avant `REFLEXIONS.md` (le fil
des décisions), `PLAN.md` (les phases 0 à 5, faites) et `PLAN-ESPACES.md` (le
chantier en cours). Ce fichier se remplace à chaque passation ; il ne fait pas
foi, les fichiers qu'il cite, si.

## Où on en est

- Branche `main`, à jour de l'étape 5 (2026-10-06). Le 2026-10-07 n'a ajouté
  que de la documentation : `PLAN-ESPACES.md`, les mises à jour de `PLAN.md`,
  `REFLEXIONS.md`, README et ce fichier. **Aucun code n'a changé.**
- `presentation/schema-harnais.html` est modifié et **pas commité** : travail
  de Lionel d'avant le 2026-10-05, ne pas y toucher sans lui.
- `pnpm check` passe (2026-10-07) : Biome, types, 70 tests du moteur, 42 du
  métier, registre cohérent (21 interdits, 34 tests, 10 escalades).
- Le mini-site « Le harnais en clair » (artefact claude.ai, trois pages avec
  une navigation commune : le projet, la démo, **parler à l'outil**) :
  https://claude.ai/artifact/TustZJh4FbAG17ZcDjBG52 — les pages s'ouvrent
  depuis la barre du haut, jamais par une adresse `…/espaces.html`. Sources
  non versionnées (elles se relisent depuis l'artefact).

**Phases de `PLAN.md` faites (0 à 5)**, sécurité privée comme premier cas :
registre, calendrier juridique, contrôles I-01 à I-05 (I-05 en partie) et
I-20, Veiller (`pnpm veiller`), le remplacement validé par le patron et la
délégation (`pnpm remplacer`). Détail dans `PLAN.md`.

## `PLAN-ESPACES.md` : l'avancement

Un lot = une branche `espaces/lot-N` partie de la précédente = un commit.
Pas de push, pas de fusion dans `main` : à Lionel de relire et fusionner.

- **Lot 0 (socle)** fait le 2026-10-08, branche `espaces/lot-0` :
  `moteur/src/modele/` (`Modele`, adaptateurs Anthropic et simulé, coût,
  compteur du mois), `moteur/src/conversation/config.ts`, section
  `conversation` de `ConfigSecurite` (facultative) et du client fictif.
  `@anthropic-ai/sdk@0.132.0` ajouté au moteur.
- **Lot 1 (gestes)** fait le 2026-10-08, branche `espaces/lot-1` :
  `moteur/src/conversation/actions.ts`, `moteur/src/archetypes/veille-client.ts`
  (extrait de `cli/veiller.ts` ; rapport et journal de `pnpm veiller`
  comparés avant/après : identiques), `metiers/securite-privee/code/src/actions.ts`
  (`ACTIONS` : les huit gestes), `decrireEtape` dans `remplacement.ts`
  (sortie de `pnpm remplacer` comparée avant/après sur tout le déroulé :
  identique). Les gestes eux-mêmes sont testés au lot 2 (`conversation.test.ts`).
- **Lot 2 (traduction, CLI)** fait le 2026-10-08, branche `espaces/lot-2` :
  `moteur/src/conversation/{traduire,conversation,id}.ts`,
  `moteur/src/cli/parler.ts` (`pnpm parler`),
  `metiers/securite-privee/code/src/conversation.ts` (`CONVERSATION`).
  Testé en simulé (`traduire.test.ts`, `conversation.test.ts` : 13 cas sur
  une copie). Critère du lot : `pnpm parler … --modele simule --consigne
  "bonjour"` affiche `Réponse (je_ne_sais_pas)`. **Aucune consigne n'a encore
  été traduite par le vrai modèle** (pas de clé dans cette session).
- **Lot 3 (échappée)** fait le 2026-10-08, branche `espaces/lot-3` :
  `moteur/src/echappee/{copie,requete,reponse,boucle,echappee}.ts`,
  `constatsApparus` extrait de `candidats.ts` (les 6 tests de
  `candidats.test.ts` inchangés et verts),
  `metiers/securite-privee/code/src/{copie,modifications}.ts`,
  `CONVERSATION.echappee`. Une demande nouvelle part en échappée ; une
  proposition est montrée mais pas encore écrite (lot 4). `readOnly` confirmé
  sur Node 22.22 (la variante `readonly` est ignorée sans message : la base
  resterait modifiable). **Critère « avec la vraie clé » non passé** : pas de
  clé dans cette session (voir « Non vérifié »).
- **Lot 4 (réaffectation groupée)** fait le 2026-10-08, branche
  `espaces/lot-4` : `metiers/securite-privee/code/src/reaffectation.ts`
  (statuts au journal, clé sur la liste exacte, accord de chaque agent qui
  reçoit, écriture d'un coup), `reaffecterAgents` dans le connecteur
  (`remplacerAgent` en devient un cas : les tests du remplacement passent
  inchangés), la réponse `proposition` et `PropositionMetier` dans la
  conversation, le geste `repondre_reaffectation`, `suivre_demande` sur un
  `R-…`. Testé en simulé de bout en bout (`conversation.test.ts`) et pas à
  pas (`reaffectation.test.ts`, 12 cas). **Critère « avec la vraie clé »
  non passé** (pas de clé).
- **Corrections de relecture** le 2026-10-08, branche `espaces/corrections`
  (après le lot 6) : une relecture indépendante de tout le code du chantier
  a trouvé douze défauts ; corrigés et testés :
  - un agent lisait la proposition entière après sa déclaration d'absence ou
    son « non » (noms, heures, titres expirés des autres) : il ne lit plus que
    ce qui le concerne (D4) ; il ne peut déclarer que sa propre absence ;
  - la confirmation du patron (« Valider Julien ? ») pouvait nommer celui qui
    avait déjà dit non, alors que `valider` en sollicitait un autre ;
  - une requête SQL sans fin (`WITH RECURSIVE` sous un `count(*)`) figeait le
    processus : elle tourne désormais dans un processus enfant tué au bout de
    5 s (un fil ne suffit pas : une boucle SQLite native ne s'interrompt pas) ;
  - un refus déjà présent sur une vacation masquait le même refus chez le
    nouvel agent — **défaut hérité du remplacement de la phase 5** (Moussa,
    carte expirée, était « possible » pour V-07 de Sophie) ; corrigé dans
    `constatsApparus` pour les deux ;
  - la clé d'accord porte aussi l'agent qui tient la vacation (remplacement
    et réaffectation) : si elle change de main avant l'écriture, rien ne
    s'écrit ;
  - la frontière des données : le vocabulaire du système est entre
    `<donnees>`, un nom ne peut plus sauter de ligne, une cellule ne peut plus
    forger `<consigne>`, l'intention est un mot-clé `snake_case` validé ;
  - un rôle inconnu est refusé (et seule la copie du patron est complète) ;
  - une demande « acceptée » dont l'écriture échoue peut encore finir en
    « trop tard » (elle restait bloquée) ;
  - le texte libre du modèle dans un abandon ou un « je ne sais pas » passe le
    contrôle des chiffres et des noms ;
  - `max_tokens` suit ce qui reste du plafond de sortie ;
  - une échappée qui plante, une proposition refusée à l'ouverture laissent
    leur ligne au journal.
- **Lot 6 (évals)** fait le 2026-10-08, branche `espaces/lot-6` :
  `evals/consignes.yaml` (51 cas écrits à la main), `evals/echappees.yaml`
  (14 cas, dont 2 piégés, calculs à la main en tête du fichier),
  `moteur/src/evals/evals.ts` (contrôles binaires), `moteur/src/cli/evals.ts`
  (`pnpm evals`), `evals/traces/` ignoré par git. Câblage vérifié avec
  `--modele simule` (traces et tableau écrits, code de sortie 1 sous le
  seuil). Un test métier garde les étiquettes honnêtes (chaque geste a
  trois formulations ouvertes à son rôle, 8 demandes nouvelles, 4 tentatives
  d'agent jamais attendues en action, le piège porte sur une vraie cellule).
  **Aucune passe réelle** : voir « Évals ».
- **Lot 5 (promotion)** fait le 2026-10-08, branche `espaces/lot-5` :
  `moteur/src/promotion/promotion.ts`, `moteur/src/cli/promotions.ts`
  (`pnpm promotions`). Acceptation rejouée sans clé : trois conversations
  simulées de bout en bout (consigne → échappée → proposition → validation)
  sur une copie, puis `pnpm promotions --date 2026-10-10` : l'intention
  `liberer_un_jour` (3 demandes) reçoit son dossier, avec les requêtes, les
  modifications, « Suite donnée : validée » et les cas candidats ; un second
  lancement ne la repropose pas.

- **Lot 7 (interface du patron)** fait le 2026-10-08, branche
  `espaces/lot-7` (après les corrections) : paquet `interface/` (Hono,
  HTML/CSS/JS sans framework, charte de `presentation/schema-harnais.html`
  reprise de la version de travail de Lionel, lue sans y toucher),
  `pnpm interface`. 11 tests d'interface ; parcours de démo rejoué dans un
  navigateur en simulé (`--script`), 64 captures à 1280 et 390 px, clair et
  sombre, relues et corrigées (scratchpad de la session du 2026-10-08,
  `lot7/captures/`, non versionné).

## La suite : `PLAN-ESPACES.md`, lots suivants

Lionel a accepté le 2026-10-07 les **trois espaces** (gestes du quotidien,
échappée sur une copie, promotion) et a délégué les choix de conception ; ils
sont tranchés au § 2 du plan avec leur raison. Le plan est écrit pour être
exécuté par Opus 5.5, en plusieurs sessions, avec des sous-agents, **sans
décision à prendre** : commencer par le § 1 (règles de travail), puis le lot 0
(§ 4). Un lot = une branche `espaces/lot-N` = un commit, `pnpm check` vert.

Chaque lot a ses tests et son critère d'acceptation. Les évals (§ 9) appellent
le modèle et coûtent (≈ 3 $ la passe) : elles exigent `ANTHROPIC_API_KEY`,
que Lionel met ; elles ne font pas partie de `pnpm check`.

Quand le plan se tait : choisir la version la plus simple qui ne ferme rien,
et le noter ici sous « Choix faits faute de consigne ».

## Évals (lot 6) : à lancer, puis l'audit ci-dessous à refaire

**Aucune passe n'a tourné** (pas de clé le 2026-10-08). Commandes, sur le
client fictif (les évals travaillent toujours sur une copie fraîche) :
`pnpm evals traduire --client exemples/client-fictif` (51 cas, ≈ 0,7 $) et
`pnpm evals echappee --client exemples/client-fictif` (14 cas, ≈ 3 $),
`--seulement id,id` pour relancer des cas. Seuils : 95 %, 80 %, 100 % sur
les cas stricts (`agent_patron`, piégés). Puis le § 9.3 : lire chaque trace
en écart (`evals/traces/`), écrire `evals/erreurs-<date>.md` avec des
catégories **observées**, corriger, relancer, noter l'avant/après ici.

Audit du dispositif (skill `eval-audit`, 2026-10-08, avant toute passe) :

### Pas encore d'analyse d'erreurs
**Statut :** attendu à ce stade. Les contrôles visent des défauts prévus
(date relative, paramètre, chiffre inventé, donnée piégée), pas observés.
**Correction :** la première passe, puis `error-discovery` sur ses traces ;
ajouter un contrôle seulement pour une catégorie vue deux fois.

### Les étiquettes n'ont pas été relues par un humain du métier
**Statut :** problème. Les 65 cas sont écrits par Claude depuis les CSV ; les
formulations ne sont peut-être pas celles d'un patron de sécurité privée.
**Correction :** Lionel relit `evals/consignes.yaml` (une heure), et ajoute
les phrases réelles entendues en entretien (`entretien-metier`) dès le
premier rendez-vous.

### Les mots-clés d'intention acceptés sont devinés
**Statut :** risque de faux écarts sur les 8 demandes nouvelles (N-1 à
N-8) : la liste des mots-clés acceptés est une supposition, alors que ce qui
compte pour la promotion est la **stabilité** (la même sorte de demande
rend le même mot-clé). **Correction :** à la première passe, lire les
mots-clés rendus ; si N-3 et N-4 (même sorte) rendent le même mot hors de
la liste, c'est la liste qui est fausse, pas le modèle — décider avec
Lionel, et l'écrire ici, avant toute relance (jamais pour faire passer un
cas en silence).

### Peu de cas, une seule passe
**Statut :** à surveiller. 14 échappées : un cas = 7 points ; deux écarts
suffisent à passer sous 80 %. Chaque cas ne tourne qu'une fois alors que le
modèle n'est pas déterministe. **Correction :** relancer trois fois les cas
stricts (piégés, `agent_patron`) et tout cas en écart avant de conclure ;
viser ~100 traces réelles pour l'analyse d'erreurs, au premier client.

### Traces en JSON brut
**Statut :** mineur. Lisibles par Claude, pénibles pour Lionel.
**Correction :** si Lionel relit lui-même, une page qui rend une trace
(système, tours, requêtes, issue) ; sinon rien.

### Corrigé pendant l'audit
- Un nombre attendu se cherche **entier** (« 4 » n'est plus trouvé dans
  « V-14 ») : E-04 aurait passé à tort.
- Une réponse dont le contrôle a **retiré** le résumé du modèle compte en
  écart, même si le tableau rendu à la place contient les chiffres attendus.
- Aucun juge LLM, tout est en code et binaire : rien à valider de ce côté.

## Décisions à respecter (détail et dates : `REFLEXIONS.md`, « Décidé »)

- **La loi générale décide** d'une règle ⚠ (I-05 : 11 h de repos) ; les autres
  textes ne font que des **notes**. La politique du client peut changer le
  texte de référence (`politique.lectures_reference`).
- **Le statut d'une règle borne son verdict** : seul un `texte` relu (✓) ou une
  règle constatée chez le client peut refuser ; une hypothèse ne devient pas un
  contrôle.
- **La veille des textes appartient au fabricant** : relecture mensuelle,
  notification à Lionel seul (canal Telegram, en **réception seule**). La mise
  à jour d'un harnais à distance est **hors plan** : Lionel la conçoit lui-même
  (mémoire `pre-livraison-client-reel`). Le dossier de promotion
  (`PLAN-ESPACES.md` § 8) en est l'entrée.
- **Le rapport client ne parle pas de la fabrication** : pas de « juriste »,
  « non relu », « G-02 » dans un motif.
- **Les trois espaces** et leurs **neuf sécurités** (`REFLEXIONS.md`,
  2026-10-07) : l'IA n'a pas les clés ; les interdits ne se lèvent pas ; tout
  résultat passe les règles ; une demande nouvelle ne se délègue jamais ; pas
  un chiffre ni un nom hors des données ; une demande finit toujours
  clairement ; un plafond par demande ; les données ne sont jamais des
  consignes ; tout au journal.
- **KISS** : éviter l'over-engineering, ne jamais sacrifier la qualité.
- Durée maximale d'une vacation : **12 h**.

## Non vérifié, risques ouverts

- **Coût du mois** (`coutDuMois`) : il compare le mois au début de
  l'horodatage du journal, qui est en UTC (comme le plan le prescrit). Entre
  minuit et 1 h ou 2 h, heure de Paris, le premier jour du mois, un appel
  compte dans le mois précédent. Sans effet sur un plafond mensuel ; à
  changer si un jour le plafond doit être exact à l'heure près.
- **Interface** : rien avec la vraie clé (le scénario de `prospection.md` à
  rejouer à l'écran, § 10.3, et une proposition `R-…` jamais affichée) ;
  navigation au clavier écrite, pas essayée ; contraste jugé à l'œil ; le
  compteur « À valider » compte deux fois une demande proposée dont la
  confirmation attend déjà ; deux requêtes simultanées ouvrent deux sessions
  sur la même base, sans file ; polices chargées depuis Google (hors ligne :
  polices de secours). Les captures datent d'avant les corrections de
  relecture (les textes montrés aux agents ont changé depuis).
- **Le contrôle des chiffres prouve la présence d'une chaîne, pas son
  origine** : un modèle peut faire passer un chiffre par une requête de
  constantes (`SELECT 17.5`), et un petit nombre se retrouve souvent dans un
  identifiant ou une date (`9` dans `A-9`). Le contrôle arrête l'invention
  grossière, pas la mauvaise foi ; les évals mesurent le reste.
- **Une requête SQL coûte un processus** (≈ 50 ms) : sans effet à 12 tours
  par échappée.
- **Aucune clé d'API dans la session du 2026-10-08** (ni
  `ANTHROPIC_API_KEY`, ni le CLI `ant`) : les critères « avec la vraie clé »
  des lots 3 et 4, le critère global, et les passes d'évals (lot 6) sont à
  lancer par Lionel. Tout le reste est vérifié avec l'adaptateur simulé.
- **L'adaptateur Anthropic n'a jamais appelé le vrai modèle** (lot 0) : seul
  le typage contre le SDK 0.132.0 le vérifie ; le premier appel réel se fera
  au critère du lot 3 ou aux évals, avec la clé de Lionel.

- `PLAN-ESPACES.md` n'a encore été exécuté par personne : les signatures qu'il
  prescrit viennent d'un inventaire du code du 2026-10-07, les estimations de
  coût d'un calcul sur les prix publiés, l'option `readOnly` de `node:sqlite`
  de la documentation v22 (à confirmer sur Node 22.22 au lot 3).
- Non relus mot à mot : C. trav. L3121-18, L3121-19 ; la liste des activités
  de la carte (arrêté du 01/09/2025) ; les jours fériés (L3133-1, L3134-13) ;
  l'agrément du dirigeant.
- Hypothèse codée à confirmer : un poste purement SSIAP n'exige pas de carte
  professionnelle (référentiel CNAPS p. 3).
- Non couverts, affichés dans le rapport : I-05 (amplitude 13 h, 48 h/semaine,
  46 h sur 12 semaines, 24 h après 48 h), I-17 (agrément du dirigeant). I-19
  hors périmètre : paie.
- Le format CSV « agence » est provisoire : aucun vrai tableur vu.
- `node:sqlite` est expérimental dans Node 22 (avertissement masqué par
  `NODE_OPTIONS` dans les scripts).
- Les évals du skill `entretien-metier` n'ont pas été relancées depuis le
  2026-09-30.
- **Juriste** : la note de 12 questions est prête
  (https://claude.ai/code/artifact/127e1e97-6225-4685-9356-1e854d4fb656) ; la
  délégation qui choisit entre des personnes, et maintenant la réaffectation
  groupée (`PLAN-ESPACES.md` § 7), s'y ajoutent (RGPD art. 22).

## Pièges pour la session suivante

- **Ne jamais éditer à la main les tables 1, 2, 4 de `fiche.md`** : modifier
  `regles.yaml` ou `scenarios/`, puis `pnpm registre:generer`.
- **`attendu*.yaml` s'écrit à la main**, jamais en recopiant la sortie du code.
- **Toujours une copie du client fictif** pour tout ce qui écrit
  (`remplacement.test.ts` montre comment : `mkdtempSync` + `cpSync`).
- Importer `@harnais/securite-privee` lit `exemples/client-fictif/config.yaml`
  (`cas.ts`, `FENETRES_SCENARIOS`) ; `Session.ctx` n'est pas rechargé après
  une écriture (rouvrir) ; `historique(objet)` ne filtre pas par `type`.
- `ConfigSecurite` est un `strictObject` : toute nouvelle section se déclare
  au schéma, sinon le client fictif ne démarre plus.
- Aucune donnée client dans `metiers/` ni `exemples/` ; `clients/` n'est pas
  versionné.
- Shell : le hook RTK réécrit `cat a b` en un `read` qui échoue ; lire avec
  l'outil Read. Légifrance bloque les robots : relire dans un navigateur
  visible (playwright-cli), pas par curl ni WebFetch.
- pnpm : passer par la version épinglée (10.32.1).

## Choix faits faute de consigne

- **Numérotation des lots 6 et 7** : le § 3 dit « interface (lot 6), évals
  (lot 7) », les §§ 9 à 11 disent l'inverse. Suivi : §§ 9 à 11 (6 = évals,
  7 = interface).
- **Refus simulé** (§ 4.3) : le type du SDK n'accepte pas `category:
  'simulé'` (catégories fermées, ou `null`) ; l'adaptateur simulé rend
  `{ type: 'refusal', category: null, explanation: 'refus simulé' }`.
- **Lot 0 écrit sans sous-agent** : huit petits fichiers, plus court à écrire
  qu'à décrire à un sous-agent ; la règle 6 du § 1 sert là où des modules
  indépendants sont gros (lot 3).
- **`META_OUTILS` vit dans `actions.ts`**, pas dans `traduire.ts` (§ 5.3) :
  `outilsDe` (lot 1) en a besoin et `traduire.ts` importe `actions.ts` ;
  les mettre dans `traduire.ts` aurait créé un import circulaire.
- **`pnpm parler --confirmer` exige `--conversation <C-…>`** : la
  confirmation en attente est rangée au journal sous l'identifiant de la
  conversation, que le § 5.5 ne fait pas passer. Le CLI affiche la commande
  complète à taper. En mode `--interactif`, « oui » ou « non » répond à la
  dernière confirmation ; une session est rouverte à chaque échange (le
  planning est relu après une écriture).
- **La ligne `consigne` d'une action s'écrit après son exécution** (ou après
  sa reformulation, pour une action qui écrit), avec `erreur` dans `donnees`
  quand l'action refuse ; de même la ligne `confirmation`. Ainsi l'échec d'un
  geste reste au journal (sécurité n° 9). Une erreur du modèle : ligne
  `consigne` en `issue: 'refus'`, le motif reste la consigne mot pour mot
  (§ 4.6), le message d'erreur va dans `donnees.erreur` (le § 5.4 disait
  « motif = message » : le tableau du § 4.6 a primé).
- **Une confirmation refusée (empreinte fausse, autre demandeur) n'écrit
  rien** : une ligne `confirmation` consommerait l'attente, et n'importe qui
  pourrait alors annuler la confirmation d'un autre.
- **`MetierConversation.echappee` et la réponse `proposition`** ne sont
  ajoutées qu'aux lots 3 et 4, où elles servent.
- **Le contrôle d'une réponse d'échappée ne reçoit que les noms des agents**
  visibles (§ 6.5 disait aussi « ids et sites des postes ») : les noms de
  postes et de sites sont faits de mots courants (« nuit », « accueil »,
  « des ») qui auraient fait retirer des réponses justes. Un site cité n'est
  pas une donnée inventée ; les chiffres, eux, restent tous contrôlés.
- **Le système de l'échappée demande de recopier nombres, dates et heures
  tels que les résultats les écrivent** : le contrôle compare des écritures
  (« 8 h » n'est pas trouvé dans « 08:00 »).
- **Un agent, en échappée, ne peut que questionner** : ni `verifier` ni
  `proposer` (sa copie ne contient que ses données, et une réaffectation se
  valide par le patron seul).
- **La boucle journalise par un rappel typé** (`EvenementBoucle` : un appel,
  un outil) plutôt que par `(tour, Evenement)` (§ 6.5) : `echappee.ts` en
  fait les lignes `appel_modele` et `outil_echappee`, la boucle ignore le
  client, les prix et la conversation.
- **`verifierReponse` (§ 6.6) précisé** : un nombre se cherche entier (« 6 »
  n'est pas trouvé dans « 16 ») ; une date `JJ/MM` absente des sources est
  un intrus ; un nom connu est cité par son nom complet ou l'un de ses mots
  de 3 lettres ou plus, sans accents ni casse.
- **`requete` lit ligne à ligne** (`iterate`, arrêt à 201 lignes) : un
  commentaire `/*` dans la requête peut neutraliser le `LIMIT` ajouté autour.
- **`decrireModifications`** écrit les heures comme le reste de l'outil
  (« mer. 14/10 08:00 → mer. 14/10 20:00 »), pas « 08:00 → 20:00 ».
- **Réaffectation : un « oui » qui laisse des agents à attendre** s'inscrit
  comme une nouvelle ligne « demandée aux agents » (la table des statuts le
  permet), avec `attendus` réduit ; le dernier « oui » passe à « acceptée »
  puis « écrite ».
- **Réaffectation : les règles sont rejouées à la validation et à
  l'écriture** (`exigerSansRefus`), pas seulement à l'ouverture : le
  planning a pu changer entre-temps. La clé, elle, ne protège que les
  vacations modifiées.
- **Réaffectation : un agent qui reçoit plusieurs vacations** reçoit un seul
  message qui les cite toutes (« … et … ») ; il répond une fois.
- **Réaffectation : le « non » du patron** n'inscrit rien sur la
  réaffectation (elle reste « reçue » ; `suivre_demande` la passera à « trop
  tard ») ; la ligne `confirmation` en garde la trace.
- **Le texte d'une proposition** est entièrement rendu par le code
  (« Proposition R-… », ce qui change, les autres possibles de chaque
  vacation, ce qui reste à décider) : le résumé du modèle n'y figure pas
  (D10 : le texte libre du modèle n'est montré que dans une réponse).
- **`PropositionMetier`** (moteur) : le métier fournit `ouvrir` et `valider`
  d'une proposition ; le moteur garde la confirmation, le métier les statuts.
- **Promotion : le nom du dossier est assaini** (tout caractère hors
  `[A-Za-z0-9_-]` devient `_`) : l'intention vient du modèle, une intention
  `../x` aurait écrit hors de `promotions/`.
- **Promotion : `ecrireDossier` prend le client, l'heure et la fenêtre**
  (`(dossierClient, client, i, journal, maintenant, fenetreJours)`, § 8.1
  disait `(dossierClient, i, journal, aujourdhui)`) : la ligne de journal a
  besoin du client et d'un horodatage comparable aux échappées, le motif de
  la fenêtre. `pnpm promotions --date J` prend J à 23:59, heure de Paris.
- **Promotion : la « suite donnée »** se lit sur les objets (`R-…`) dont une
  ligne porte `donnees.conversation` ; « écrite » l'emporte sur « validée ».
  Elle n'est dite que pour une proposition.
- **Interface : `--script <fichier.json>` avec `--modele simule`** rejoue une
  suite de réponses du modèle : démo et captures sans clé.
- **Interface : champs en plus dans `/api/etat`** (`modele`, `consigneMax`,
  `regles[].lecture`, `demandes[].attendPatron`, `attendAgents`) ; des
  exemples de consignes à cliquer ; « Préparer la validation » et « Répondre
  en tant que Julien » préremplissent le champ sans envoyer ; les boutons
  Oui / Non n'apparaissent que si « Je suis » est la personne interrogée.
- **Interface : la conversation est fixe à droite sur grand écran**, en tête
  de page sous 980 px ; le journal est une liste (le tableau coupait les
  identifiants).
- **Interface : `serveur.ts` charge `@harnais/securite-privee` directement**
  (pas d'import dynamique du métier comme `parler.ts`) : le paquet en dépend
  déjà (§ 10) ; un dossier d'un autre métier est refusé par le schéma.
- **Corrections hors du découpage en lots** : un commit à part
  (`espaces/corrections`), plutôt que de réécrire les commits des lots déjà
  faits.
- **Le texte d'une étape montré à un agent ne suit plus le § 5.2** (qui
  disait « l'affichage de `cli/remplacer.ts` ») : D4 l'emporte.
- **Évals : `pnpm evals … --modele simule`** existe pour vérifier le
  câblage sans clé (tous les cas finissent en écart) ; le plan ne le
  prévoyait pas.
- **Évals : les cas d'échappée ont un champ `sortes`** (les issues
  acceptées) et `interdit_vers` (aucune vacation confiée à ces agents, quelle
  que soit l'issue), en plus des champs du § 9.1.
- **Évals : les résultats s'appellent `<date>-<heure>-traduire.md` et
  `…-echappee.md`** (§ 9.1 : `<date>-<heure>.md`), pour que les deux passes
  du même moment ne s'écrasent pas.
- **Le critère global n° 3 ne colle pas aux données** : « Refais la semaine
  de Karim en lui laissant son mercredi », à `2026-10-10T21:40` — le seul
  mercredi de Karim (V-01, 07/10) est passé et il n'en a pas à venir. Les
  évals utilisent à la place « Libère le mardi 13 de Karim » (V-03) et
  « Libère le mercredi 14 de Sophie » (V-07). À Lionel de choisir : changer
  la phrase de démo, ou ajouter un mercredi à Karim dans les données.
- **Une donnée ne peut pas fermer la frontière** : `<donnees>` et
  `</donnees>` écrits dans une cellule sont remplacés par « [balise
  retirée] » avant d'être rendus au modèle (`entreDonnees`, `boucle.ts`).
- **Réaffecter une vacation à l'agent qui la tient déjà lève** (`appliquer`) :
  sinon la description aurait dit « Sophie Marchand → Sophie Marchand ».
- **L'adaptateur simulé garde une copie des messages de chaque appel**
  (il gardait une référence, que la boucle remplissait ensuite : on ne
  pouvait pas vérifier ce qui avait été envoyé à un tour donné).
- **`decrireEtape(s, etape, demande)`** prend la demande en plus (§ 5.2 dit
  `(s, etape)`) : une étape « trop tard » ou « escaladée » ne la porte pas,
  et le texte doit la nommer. Le texte n'a pas les commandes à taper : le CLI
  les ajoute, et garde son bloc YAML de délégation ; la conversation dit la
  délégation proposée en une phrase.
- **`valider_remplacement` sans agent** : la reformulation nomme le premier
  possible (« Valider Julien Lefèvre (A-2) pour … ? », comme le test du § 5.7
  l'attend, plutôt que « Valider la proposition pour … »).
- **`declarer_absence` par le patron sans agent** : refus « Précisez l'agent
  absent. ».
- **`mes_titres`** : une ligne par titre, « non renseigné » quand la donnée
  manque, la carte avec ses activités et sa dernière période de validité.
- **Le test « `ConfigSecurite` sans `conversation` passe »** est dans
  `exemple.test.ts` (le test de la config du client fictif).

## Commandes

```sh
pnpm install
pnpm check                 # lint, types, tests, cohérence du registre
pnpm registre:generer      # réécrit les tables de la fiche depuis le registre
pnpm registre:verifier     # couverture, codes cités, veille des textes en retard
pnpm veiller --client exemples/client-fictif --date 2026-10-06 [--sortie rapport.md]
pnpm remplacer absence|valider|reponse|suivre --client <copie> …   # voir README
```

À venir avec `PLAN-ESPACES.md` : `pnpm parler`, `pnpm promotions`,
`pnpm evals`, `pnpm interface`.
