# Handoff — 2026-10-11

Pour reprendre dans une session neuve. À lire avant `REFLEXIONS.md` (le fil
des décisions), `PLAN.md` (les phases 0 à 5) et `PLAN-ESPACES.md` (les trois
espaces). Ce fichier se remplace à chaque passation ; il ne fait pas foi, les
fichiers qu'il cite, si.

## Où on en est

- **2026-10-11 : `PLAN-GENERAL.md` phase A faite, lots 0 à 3 de la
  promotion fusionnés dans `main` et poussés.** A1 : relecture indépendante
  des lots 0 à 3 par un sous-agent en lecture seule (aucun bloquant, trois
  importants, six mineurs), corrigés en un commit (`456582c`) : la relance de
  la fabrication répond à chaque `tool_use` par un `tool_result` (sinon 400
  chez Anthropic, déguisé en « injoignable ») ; le rejeu ne trouve plus un
  nombre attendu dans une date (« 12 » dans « 2026-10-12 » laissait passer
  une réponse fausse) ; une ligne `retiré` ne vaut que pour son empreinte
  (retirer un doublon proposé ne tue plus le geste actif) ; les compteurs du
  § 8 par nombre d'appels ; gabarit mal formé refusé ; `copieClient` filtre
  sur le chemin relatif ; un geste appris à l'identifiant d'un geste codé est
  écarté au chargement ; `test.instantane` ni absolu ni `..` ; une assertion
  vide remplacée. A2 (`86bac1b`) : G4, les deux clauses ; **mesuré, GLM-5.3
  via GMI** : `pnpm evals echappee` trois passes **53/54** (18 cas depuis le
  lot 2 ; **41/42** sur les 14 d'avant, le seuil de G4) ; `pnpm evals
  promotion` trois passes **1/3, 1/3, 0/3 : objectif 2/3 non atteint**
  (troncatures au plafond `par_demande.tokens_sortie` de la config, la
  réflexion de la fabrication s'allongeant avec la clause (b) ; l'échappée
  ajoute encore du détail dans 7 réponses sur 21). Analyse : passe 16 de
  `evals/erreurs-2026-10-08.md`. Par G4, une fabrication qui échoue finit à
  l'atelier, et la ronde s'en saisira (phase D). A3 : `promotion/lot-3`
  fusionnée dans `main` (`--no-ff`), poussée ; `pnpm check` vert sur `main`
  (341 tests moteur, 119 métier, 20 interface). Choix faits faute de
  consigne : « Phase A du plan général » plus bas. **Reste de la fin de
  phase** : la relecture du mini-site et de la présentation (§ 0.7). **Puis
  la phase B** (`PLAN-PSEUDONYMES.md`), dans une autre session.
- **2026-10-10, nuit : `PLAN-GENERAL.md`, le grand plan, écrit ; rien
  codé.** Lionel a tranché contre la fusion humaine : la chaîne ronde →
  chantier → fusion → livraison est automatique, sous conditions en code
  (G1), avec retrait (G2), clone de la nuit (G3), mémoire dans le dépôt
  (`PLAN-RONDE.md` R10). Le plan tranche aussi la fabrication 0/3 (G4 :
  deux clauses de système, rejeu strict gardé), l'écriture par un geste
  appris (G5, lot 4), les six choix de l'identité (G6), le journal chaîné,
  l'authentification de l'interface et la sauvegarde chiffrée (G7), la
  livraison signée et tirée (G8), la veille et le canal (G9), les modèles
  (G10), la topologie (G11). Phases A (consolider, fusionner la promotion)
  → B (pseudonymes) → C (écriture) → D (ronde, chantier, mémoire, fusion)
  → E (la nuit en continu, dix nuits d'observation) → F (sécurités) → G
  (veille, canal) → H (livraison) ; I = ce qui reste aux humains. **À
  exécuter par Claude Opus 5.5, effort élevé. A0 (commiter les plans sur
  `main` et pousser) est fait le 2026-10-11 ; la phase A aussi (ligne
  précédente).** Le mini-site dit tout cela
  comme décidé, pas construit. La présentation (diapositive 10) n'est pas
  reprise.
- **2026-10-10, soir : deux plans écrits, rien codé.** `PLAN-PSEUDONYMES.md`
  (le fournisseur ne reçoit plus aucun nom, même dans l'échappée et la
  fabrication : l'identifiant tient lieu de nom dans la copie, la consigne
  est masquée par la désignation existante, le code restitue, la fuite se
  mesure en code à chaque passe, seuil 0 ; 4 lots) et `PLAN-RONDE.md` (la
  ronde de nuit : un modèle lit un résumé fait en code de ce qui a été
  demandé, sans aucune donnée, et désigne des missions ; le chantier :
  Claude Code en mode non interactif dans un arbre de travail à part, bande
  métier seulement, gardée en code, `pnpm check` rejoué par le code, relu
  par un autre modèle, dossier ; `pnpm nuit` ; `agence.yaml` : Fable 5.1
  planifie et relit, Opus 5.5 code, GLM reste au quotidien ; 4 lots). Les
  deux § 10 ont été tranchés la nuit même (ligne précédente) ; décisions
  dans `REFLEXIONS.md`. Le mini-site « Le harnais en clair » dit ces
  décisions comme décidées, pas construites. Dépendance : la ronde lit
  `consigne_modele`, écrit par le lot 1 des pseudonymes.
- **2026-10-10, après-midi : `PLAN-PROMOTION.md` lot 3 fait**, branche
  `promotion/lot-3` partie de `promotion/lot-2`, un commit, **pas poussée**.
  L'atelier (`pnpm gestes lister | verifier [--avec-modele] | activer --par
  | retirer --motif`) et le patron dans l'interface (onglet « Appris » : « Ce
  que l'outil a appris », proposés activables ou pourquoi pas, actifs,
  retirés ; activer après une confirmation à l'écran, retirer avec un motif)
  passent par la même logique (`moteur/src/promotion/atelier.ts`) : activer
  exige une ligne `vérifié` sans écart et avec modèle sur l'empreinte exacte
  du fichier, écrit `statut: actif` et `validation` dans le YAML puis la ligne
  `activé` au journal, la clé que le chargement exige ; retirer retire dès la
  consigne suivante. Le test d'honnêteté des gestes appris (§ 7.3) tourne
  dans `pnpm check`. `pnpm check` vert : 334 tests moteur (+13), 119 métier
  (+4), 20 interface (+5). **Rejoué pour de vrai sur la copie du lot 2**
  (celle qui porte le geste fabriqué, proposé et vérifié) :
  - CLI : `lister` (activable) ; `verifier` sans modèle (rejeu 3/3, 0 $,
    « la passe manque ») ; **`verifier --avec-modele` : 61/63 (97 %),
    0,11 $ compté exactement** (P-PLA-2 et AP-4 en écart, les deux
    étiquettes anciennes ; G-1 à G-3 du geste passent), activable ;
    `activer --par Lionel` ; `pnpm evals gestes` sur la copie **6/6** ;
    `retirer --motif` ; le journal porte `vérifié` (deux fois), `verifier`,
    `activé { par: Lionel }`, `retiré`. Résultats :
    `evals/resultats/2026-10-10-1525-traduire.md`, `…-1530-gestes.md` ;
    analyse `evals/erreurs-2026-10-08.md`, « Passe 15 ».
  - Interface (`pnpm interface --modele simule`, pilotée par playwright-cli,
    captures relues) : l'onglet montre le geste proposé avec « Vérifié le … :
    aucun écart ; traduction 97 %, seuil atteint » et les boutons ; Activer
    → « Activer le geste « … » ? » → Oui : la carte passe en « Actifs »,
    « activé le 10 octobre 2026 par patron », le YAML et la ligne `activé`
    (`par: patron`) suivent ; Retirer sans motif ne fait rien ; avec motif →
    « Retirés », ligne `retiré` avec le motif.
  Écarts au plan et choix : « Lot 3 de la promotion » plus bas (le principal :
  « postérieure à toute modification du fichier » est tenu par l'empreinte,
  pas par la date du fichier). **Suite : § 9**, la relecture indépendante de
  tout le chantier (lots 0 à 3) par un sous-agent en lecture seule, ses
  corrections, puis la fusion dans `main` et le push.
- **2026-10-10, midi : `PLAN-PROMOTION.md` lot 2 fait**, branche
  `promotion/lot-2` partie de `promotion/lot-1`, un commit, **pas poussée**.
  Le modèle fabrique un geste appris en un appel (`proposer_geste`, le
  schéma du geste ; relancé une fois sur un échec de forme ou une requête
  qui lève), le code le vérifie (gabarit sur une copie vide, rejeu de chaque
  test sur son instantané, aucune valeur en dur venue d'une consigne,
  description distincte), l'écrit en `gestes/<id>.yaml` (proposé), puis
  `pnpm promotions` mesure la traduction avec le geste chargé et dit s'il
  est activable ; le dossier de promotion raconte tout. `pnpm check` vert :
  321 tests moteur (+40), 115 métier, 15 interface. **Mesuré, GLM-5.3 via
  GMI, le 2026-10-10** (`evals/erreurs-2026-10-08.md`, « Passe 14 ») :
  - **le flux complet du critère 1-2 sur une copie** (trois échappées
    réelles, puis `pnpm promotions`) : fabrication en **un appel, zéro
    écart, rejeu 3/3**, `gestes/heures_par_agent.yaml` écrit (tableau,
    `agent` nullable, description qui garde « ou par tous ») ; traduction
    avec le geste chargé **61/63 (97 %)**, activable (N-1, P-PLA-2, AP-4
    passent ; R-2 et AP-2 en écart, variance sans lien avec le geste) ;
    `pnpm evals gestes` sur la copie **6/6**. Résultats :
    `evals/resultats/2026-10-10-1231-traduire.md`, `…-1209-gestes.md`,
    `…-1231-gestes.md`. Coût : 0,04 $ la fabrication, 0,15 $ la passe.
  - **`pnpm evals promotion` (trois intentions, § 8) : 0/3** sur la
    première passe ; deux gestes justes (`heures_par_agent`,
    `agents_sans_carte`) écartés au rejeu parce que les réponses de
    l'échappée disaient plus que la question (heures par vacation, agents
    à carte expirée « à noter ») ; `compter_vacations` tronqué deux fois
    (« de nuit » n'est pas un type : l'échec faute de type attendu). Deux
    bogues de `citations` corrigés (année, jour avec son zéro) ; une
    troncature ne relance plus. Seconde passe avec le code final : **0/3**
    encore (GMI a lâché le flux de la fabrication `heures_par_agent` après
    plusieurs minutes ; les deux autres comme avant). **À trancher par
    Lionel** : l'échappée répond court, ou le rejeu n'exige que la première
    phrase (le lot garde la règle du plan).
  - Appris sur GMI : coupure à 120 s hors flux (524), aucun token compté en
    flux → la fabrication part en flux avec une borne haute du coût (voir
    « Lot 2 de la promotion »).
  Suite : **lot 3** (l'atelier, l'activation, l'interface), sur
  `promotion/lot-3` partie de `promotion/lot-2` ; puis la relecture
  indépendante et la fusion (§ 9).
- **2026-10-10, nuit : `PLAN-PROMOTION.md` lot 1 fait**, branche
  `promotion/lot-1` partie de `promotion/lot-0`, un commit, **pas poussée**.
  Un geste appris est une donnée YAML (`gestes/<id>.yaml`, schéma fermé,
  six types de paramètres, SQL paramétré, gabarit rendu par le code) qui ne
  se charge que par sa clé (empreinte = dernière ligne `geste appris` /
  `activé` du journal, sinon écarté, `refusé`, alerte G-01), relue à chaque
  consigne ; chargé, c'est une action comme les autres, exécutée sans modèle
  sur la copie du rôle, et son intention sort de la liste des demandes
  nouvelles (P14). `pnpm check` vert : 281 tests moteur (+28), 115 métier
  (+4), 15 interface. **Mesuré, une passe réelle** (GLM-5.3 via GMI, le
  2026-10-10 à 02:47, 0,12 $) : `pnpm evals traduire` sur une copie du
  client fictif avec un `heures_par_agent.yaml` écrit à la main et activé :
  **57/60 (95 %)**, `evals/resultats/2026-10-10-0247-traduire.md`, analyse
  dans `evals/erreurs-2026-10-08.md` (« Passe 13 »). Le seuil numérique est
  atteint, mais le lanceur dit « sous le seuil » à cause du cas strict AP-4,
  écart ancien qui attend Lionel. N-2 (« Combien d'heures a fait Karim
  cette semaine ? ») choisit **le geste appris avec ses paramètres typés**
  (`agent: Karim, du: 2026-10-05, au: 2026-10-11`) : c'est le critère 4 du
  plan avec le vrai modèle. N-1 (« Qui a le moins d'heures ? ») part en
  demande nouvelle `moins_heures` : la description du geste écrit à la main
  (« les heures faites par un agent ») ne couvre pas « qui a le moins »,
  que l'intention remplacée couvrait (« ou par tous ») ; une question de
  description pour la fabrication (lot 2), pas un défaut du chargement.
  Les choix pris faute de consigne : « Lot 1 de la promotion » plus bas.
  Suite : **lot 2** (la fabrication), sur `promotion/lot-2` partie de
  `promotion/lot-1`.
- **2026-10-10, nuit : `PLAN-PROMOTION.md` lot 0 fait**, branche
  `promotion/lot-0` partie de `main` (`dd13bdc`, le plan relu et commité,
  poussé), un commit, **pas poussée**. Le journal se souvient de chaque
  échappée : identifiant `E-…` sur ses lignes, rôle et agent, texte final
  tel que montré, instantané de la copie dans `echappees/<id>.json` chez le
  client ; `executerRequete` lie des paramètres nommés (`:agent`) ; le
  compteur ne compte que les échappées finies proprement (P9) et relit
  chaque échappée par son identifiant ; `pnpm promotions` purge les
  instantanés passé `conversation.promotion.conservation_jours` (90, dans le
  schéma et chez le client fictif) sauf ceux qu'un `gestes/*.yaml` cite.
  `pnpm check` vert : 253 tests moteur (+20), 111 métier, 15 interface.
  **Rien de ce que le modèle lit n'a changé** (système, outils, requête sans
  paramètre : identiques) ; la passe `pnpm evals echappee` que le § 8
  demande après le lot 0 **n'est pas refaite** (pas de clé dans la session),
  ne pas écrire « mesuré ». Les choix pris faute de consigne sont listés
  plus bas (« Lot 0 de la promotion »). Suite : **lot 1** (le geste appris,
  chargé et exécuté), sur `promotion/lot-1` partie de `promotion/lot-0`.
- **2026-10-10 : `PLAN-PROMOTION.md` relu avec l'article Codemode, les
  choix du § 11 tranchés par Lionel, prêt à commencer au lot 0.** Ce qui
  a changé dans le plan : P6 (**le patron active dans l'interface**,
  `pnpm promotions` vérifie tout avant, avec modèle, § 6.3 et 7.2) ; P5
  (**une relance** sur échec de forme ou erreur SQL, § 6.1) ; P15 (la
  promotion est bornée au catalogue : 6 lectures promouvables sur 11
  intentions, `Intention.ecrit` non tentée avant le lot 4) ; § 8 (deux
  mesures : taux de promotion, échecs de forme) ; § 6.1 (plus de
  `maxTokens: 4096`, le plafond de la config) ; § 7.1 (ce n'est pas « une
  liste qui s'allonge » qu'on mesure). Le détail et ce qu'on ne prend pas :
  `REFLEXIONS.md`, « Fait (2026-10-10) ». La proposition d'écriture d'une
  échappée reste en dur pour tout patron. Rien de ceci n'est codé ni
  commité (arbre modifié : ce fichier, `PLAN-PROMOTION.md`,
  `REFLEXIONS.md`).
- **2026-10-09, soir : `PLAN-PROMOTION.md` est écrit, pas commencé.** Lionel
  a tranché que la promotion (une demande nouvelle qui revient devient un
  geste) est l'**auto-amélioration** du harnais et qu'elle est prioritaire ;
  Claude proposait l'inverse (geler, livrer l'échappée en lecture seule). La
  discussion et la décision sont dans `REFLEXIONS.md` (« Décidé », deux
  lignes du 2026-10-09). Commits du soir : `fbbd24c` (corrections des pistes
  1 à 3 de la passe 3), `5c94e9d` (le plan et les notes du jour), puis
  `02368f7` : trois corrections de l'échappée (`boucle.ts`,
  `reponse.ts`, leurs tests ; `pnpm check` vert, 233 tests moteur), les
  passes 7 à 12 et leurs notes. **L'échappée tient son seuil : 41/42 sur
  trois passes.** Le tout est poussé sur `origin/main` le 2026-10-10.
- **`PLAN-IDENTITE.md` exécuté le 2026-10-08 (lots 1 et 2), commité et
  poussé** (`1dc97fa`, sur `main`) ; le plan est retiré du
  dépôt comme il le demandait, son contenu consigné dans `REFLEXIONS.md`
  (Décidé, Fait, À trancher) et ci-dessous (« Identité et données
  minimales »). Le lot 1 est du code sans part de modèle ; la traduction du
  lot 2 (le modèle ne reçoit que la phrase) est mesurée depuis sur GLM-5.3 :
  58/60 (97 %) le 2026-10-09, voir les passes ci-dessus.
- **`PLAN-ESPACES.md` est exécuté en entier (lots 0 à 7) le 2026-10-08**, plus
  un commit de corrections après une relecture indépendante, puis
  `espaces/fournisseur` (un autre point d'accès, GMI Cloud, les premières
  passes réelles des évals, et leurs corrections). **Le tout est fusionné
  dans `main` le 2026-10-08** (avance rapide, `main` et `espaces/fournisseur`
  poussés sur origin) ; les branches `espaces/lot-*` et `espaces/corrections`
  restent locales. **Relecture indépendante du lot 7 et de
  `espaces/fournisseur` faite après la fusion** (2026-10-08, sous-agent, par
  lecture seule) : un défaut moyen corrigé (les routes JSON de l'interface
  répondaient à n'importe quelle page web ouverte dans le navigateur :
  `hono/csrf`, hôte local exigé, corps déclaré JSON exigé, test), deux
  mineurs corrigés (la balise de frontière écrite de travers, `</donnees >`,
  passait ; changer de « Je suis » pendant une requête mêlait les
  identités), un mineur noté (voir « Pièges »).
- **GLM-5.3 chez GMI Cloud est le modèle de référence jusqu'à nouvel ordre**
  (Lionel, 2026-10-08) : la config du client fictif le désigne (`acces`,
  prix GMI, plafonds relevés) ; l'API d'Anthropic reste en commentaire. Pas
  de passe Claude « avant un bon moment ». **On reste au laboratoire, sur
  les données fictives** (à garder pertinentes et cohérentes), jusqu'à un
  produit correct et efficient ; le réel viendra après.
- `pnpm check` passe : Biome, types des trois paquets, 229 tests
  du moteur, 111 du métier, 15 de l'interface, registre cohérent (21
  interdits, 34 tests, 10 escalades).
- **Le mini-site « Le harnais en clair » et la présentation sont à jour du
  code du 2026-10-08 au soir (identité avant le dossier), le 2026-10-09** :
  chiffres et circuit revérifiés dans le code (351 tests, 74 cas d'évals,
  9 gestes, 21 interdits, scénario D-V-17 rejoué). Trois écarts
  code/discours trouvés, **traités le 2026-10-09** : plusieurs appels
  d'outil en traduction donnent `inconnue` (« le modèle a choisi plusieurs
  actions »), et `aucun` pour `designer` (`traduire.ts`, deux tests ; aucune
  trace GLM n'en montrait en traduction, l'échappée en a et les traite
  tous) ; « un outil par tour » est demandé, pas tenu (README corrigé) ; le
  plafond du mois se vérifie **une fois par consigne, à la porte**, choix
  gardé et écrit (`avantLeDossier`) : le dépassement est d'une consigne au
  plus. **Le mini-site et la présentation ne sont pas repris** : vérifier
  qu'ils disent « à la porte, par consigne » et rien de plus.
- Mini-site, état antérieur :
  (trois pages, six schémas des mécanismes réels : carte du système, chemin
  d'une consigne, échappée, promotion, boucle des évals, modèle et point
  d'accès) : https://claude.ai/artifact/TustZJh4FbAG17ZcDjBG52. Ses sources
  ne sont pas dans le dépôt (artefact claude.ai, fichiers `index.html`,
  `espaces.html`, `demo.html`, `style.css`).
- **La présentation de conférence « Le harnais en 15 minutes »** (12
  diapositives, six schémas animés pas à pas ou en boucle, flèches et
  espace au clavier) : https://claude.ai/artifact/B8Dj1EJySsdZ6bJAyJCsN2.
  Même grammaire visuelle, ambiance vidéoprojecteur ; sources dans
  l'artefact seulement. Une ébauche vide faite avec le type « Slides » de
  claude.ai (https://claude.ai/artifact/N3ChoE5n8v2CxNT2e2ux1d) est à
  supprimer : ses pages vivantes ne sont pas cliquables par le public.
- **Aucune passe avec Claude** : pas de clé Anthropic le 2026-10-08. Deux
  passes réelles avec **GLM-5.3 chez GMI Cloud** : traduction 39/51 (76 %,
  seuil 95 %), échappée 11/14 (79 %, seuil 80 %) ; analyse dans
  `evals/erreurs-2026-10-08.md`. **Les six points « à corriger » issus de
  ces passes sont traités** (section ci-dessous) et mesurés depuis par les
  passes 3 à 12 du 2026-10-09 (`evals/erreurs-2026-10-08.md`).
- `presentation/schema-harnais.html` est commité (`c257ac8`, 2026-10-08) :
  travail de Lionel, jamais touché (l'interface en a lu la charte).
- Le mini-site « Le harnais en clair » (artefact claude.ai) :
  https://claude.ai/artifact/TustZJh4FbAG17ZcDjBG52 — les pages s'ouvrent
  depuis la barre du haut. La section « Honnêtement » de « Parler à l'outil »
  est à mettre à jour **avec Lionel** (§ 11 du plan) : ce qui est passé
  d'« à construire » à « existe ».

**Phases de `PLAN.md` faites (0 à 5)** : registre, calendrier juridique,
contrôles I-01 à I-05 (I-05 en partie) et I-20, Veiller (`pnpm veiller`), le
remplacement validé par le patron et la délégation (`pnpm remplacer`).

## `PLAN-PROMOTION.md` : l'avancement

Un lot = une branche `promotion/lot-N` partie de la précédente = un commit,
pas de push (§ 1.2 du plan). **Les quatre lots, la relecture indépendante et
G4 sont fusionnés dans `main` et poussés le 2026-10-11** (`PLAN-GENERAL.md`
phase A, qui lève l'interdiction de pousser).

- **Lot 0 (le journal se souvient de l'échappée)** fait le 2026-10-10,
  branche `promotion/lot-0` : `moteur/src/echappee/requete.ts`
  (`executerRequete(copie, sql, parametres?, delaiMs?)`, paramètres liés,
  `parametresNommes`), `moteur/src/echappee/echappee.ts` (`CadreEchappee`
  gagne `dossierClient` et `identite` ; `idEchappee` dans
  `conversation/id.ts` ; `ecrireInstantane`, `cheminInstantane`,
  `DOSSIER_ECHAPPEES` ; lignes `outil_echappee` et `echappee` avec
  `donnees.echappee`, la ligne `echappee` avec `role`, `agent?`, `texte`,
  `instantane`), `moteur/src/promotion/promotion.ts` (`intentions` ne
  compte que les échappées finies proprement, `echappeesDe`,
  `EchappeeJournalisee`, `debutFenetre`, `purgerInstantanes`,
  `DOSSIER_GESTES` ; `ecrireDossier` relit chaque échappée par son
  identifiant), `moteur/src/cli/promotions.ts` (purge),
  `moteur/src/conversation/config.ts` (`conservation_jours`, défaut 90),
  `moteur/src/echappee/boucle.ts` (`CONTROLE_OK`, constante seule),
  `metiers/securite-privee/code/src/conversation.ts` (passe `s.dossier`
  et `identite`), `exemples/client-fictif/config.yaml`. Tests :
  `requete.test.ts` (+7), `echappee.test.ts` (nouveau, moteur, simulé),
  `promotion.test.ts` (jeu refait : abandon, résumé retiré, proposition
  sans suite et ligne d'avant le lot 0 ne comptent pas ; `echappeesDe`
  sépare deux échappées d'une conversation ; la purge épargne l'instantané
  cité), `config.test.ts`. Pas de passe réelle (voir « Où on en est »).
- **Lot 1 (le geste appris, chargé et exécuté)** fait le 2026-10-10,
  branche `promotion/lot-1` partie de `promotion/lot-0` :
  `moteur/src/gestes/geste-appris.ts` (schéma `GesteAppris`, `FichierGeste`
  avec `statut` et `validation`, six types de paramètres, `clesDe`,
  `verifierGabarit`, `rendre`, `empreinteGeste`, `DOSSIER_GESTES`),
  `moteur/src/gestes/charger.ts` (`lireFichiersGestes`, `motifSansCle`,
  `chargerGestesAppris` : la clé P7, `refusé` et alerte G-01,
  `TYPE_GESTE_APPRIS`, `ISSUE_GESTE`), `moteur/src/gestes/action-apprise.ts`
  (`parametresAppris`, `actionApprise` : exécution sans modèle sur la copie
  du rôle, D4), `moteur/src/conversation/actions.ts` (`Action.executer`
  rend `Resultat | Promise<Resultat>`), `moteur/src/conversation/conversation.ts`
  (`MetierConversation.copie?`, gestes appris chargés avant la traduction,
  intentions filtrées (P14), `await`, `confirmer` asynchrone, `resultat`
  sur la ligne `consigne`), `moteur/src/cli/evals.ts` et
  `moteur/src/evals/evals.ts` (gestes appris chargés par fichier,
  `ecartsTraduction(…, appris)`), `moteur/src/archetypes/veille-client.ts`
  (`TYPE_ALERTE`), `moteur/src/index.ts`,
  `metiers/securite-privee/code/src/conversation.ts` (`copie: tablesPour`).
  Tests : `geste-appris.test.ts`, `charger.test.ts`, `action-apprise.test.ts`
  (nouveaux, moteur ; geste de référence dans `geste-appris.exemple.ts`),
  `evals.test.ts` (+1), `conversation.test.ts` du métier (+4 : « 16 » pour le
  patron en un appel et sans échappée, P14 dans le système du modèle, D4
  pour un agent, un octet changé → écarté, refusé, alerte, échappée).
  Mesure : voir « Où on en est ».
- **Lot 2 (la fabrication)** fait le 2026-10-10, branche `promotion/lot-2`
  partie de `promotion/lot-1` : `moteur/src/promotion/fabriquer.ts`
  (nouveau : `GestePropose`, `systemeFabriquer`, `messageFabriquer`,
  `outilProposerGeste`, `completerGeste`, `verifierGeste`, `rejouerTest`,
  `ecrireGeste`, `fabriquerGeste` avec la relance P5),
  `moteur/src/promotion/promouvoir.ts` (nouveau : `promouvoir`, ce que
  `pnpm promotions` fait d'une intention au seuil ; `compterFabrications`
  pour le § 8), `moteur/src/promotion/promotion.ts` (`Fabrication`, la
  section « Geste proposé » du dossier, `promotion proposée` la porte),
  `moteur/src/evals/traduction.ts` (nouveau : `copieClient`, `jouerCas`,
  `casDuFichier`, `casDuGeste`, `apprisDuDossier`, `jouerTraduction`,
  extraits de `cli/evals.ts`), `moteur/src/evals/evals.ts` (`SEUILS`,
  `FichierGestes`, `FichierPromotions`, `contient` venu de `reponse.ts`),
  `moteur/src/echappee/reponse.ts` (`citations`, `contient`),
  `moteur/src/gestes/action-apprise.ts` (`executerGeste`, `liaisonDe`
  exportés), `moteur/src/gestes/geste-appris.ts` (`TESTS_MIN`),
  `moteur/src/conversation/actions.ts` (`Intention.ecrit`, P15),
  `moteur/src/conversation/traduire.ts` (`jourSemaine`),
  `moteur/src/modele/compteur.ts` (`UsageAppel` + `fabriquer`, `verifier`),
  `moteur/src/cli/promotions.ts` (le modèle, `--sans-modele`, la passe de
  traduction, le compte du § 8), `moteur/src/cli/evals.ts` (`gestes`,
  `promotion`), `moteur/src/index.ts`,
  `metiers/securite-privee/code/src/conversation.ts` (`ecrit` sur chaque
  intention), `evals/gestes.yaml` et `evals/promotions.yaml` (nouveaux),
  `evals/echappees.yaml` (E-15 à E-18). Tests : `fabriquer.test.ts`,
  `promouvoir.test.ts`, `traduction.test.ts` (nouveaux), `reponse.test.ts`
  (+2), `traduire.test.ts` (`ecrit`). Mesure : voir « Où on en est ».
- **Lot 3 (l'atelier, l'activation, l'interface)** fait le 2026-10-10,
  branche `promotion/lot-3` partie de `promotion/lot-2` :
  `moteur/src/promotion/atelier.ts` (nouveau : `listerGestes`,
  `motifNonActivable`, `verifications`, `trouverGeste`, `activerGeste`,
  `retirerGeste`, `verifierGesteAppris`, `journaliserVerification`,
  `copieVideDe`, `ErreurAtelier`, `STATUT_LISIBLE`),
  `moteur/src/cli/gestes.ts` (nouveau : `pnpm gestes lister | verifier
  [--avec-modele] | activer --par | retirer --motif`),
  `moteur/src/evals/traduction.ts` (`passeTraduction`, `BilanTraduction`,
  `DOSSIER_PROMOTIONS` : la passe partagée par `pnpm promotions` et
  `pnpm gestes verifier`), `moteur/src/promotion/promouvoir.ts` (écrit
  `vérifié` par `journaliserVerification`), `moteur/src/cli/promotions.ts`
  (la passe par `passeTraduction`), `moteur/src/gestes/action-apprise.ts`
  (une erreur de rendu garde `resultats` : l'écart de gabarit est précis),
  `moteur/src/promotion/fabriquer.ts` (lit ces résultats), `moteur/src/index.ts`,
  `package.json` (script `gestes`), `interface/src/app.ts` (`/api/gestes`,
  `/api/gestes/activer`, `/api/gestes/retirer`, patron seul, `ErreurAtelier`
  en 400), `interface/public/index.html`, `static/app.js`, `static/style.css`
  (l'onglet « Appris » : proposés, actifs, retirés ; confirmation à l'écran ;
  motif du retrait), `metiers/securite-privee/code/src/evals.test.ts` (le
  test d'honnêteté des gestes appris, § 7.3), `README.md`, `PLAN-ESPACES.md`
  § 8 (renvoi). Tests : `atelier.test.ts` (nouveau, 12), `traduction.test.ts`
  (+1 : `passeTraduction` sur le modèle simulé), `serveur.test.ts` (+5),
  `evals.test.ts` du métier (+4). Mesure : voir « Où on en est ».
- Relecture indépendante, corrections et fusion (§ 9) : faites le
  2026-10-11 (`PLAN-GENERAL.md` A1 à A3). Le lot 4 (l'écriture) est tranché
  par G5 : c'est la phase C du grand plan.

## `PLAN-ESPACES.md` : l'avancement

Un lot = une branche `espaces/lot-N` partie de la précédente = un commit.

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
- **Lot 5 (promotion)** fait le 2026-10-08, branche `espaces/lot-5` :
  `moteur/src/promotion/promotion.ts`, `moteur/src/cli/promotions.ts`
  (`pnpm promotions`). Acceptation rejouée sans clé : trois conversations
  simulées de bout en bout (consigne → échappée → proposition → validation)
  sur une copie, puis `pnpm promotions --date 2026-10-10` : l'intention
  `liberer_un_jour` (3 demandes) reçoit son dossier, avec les requêtes, les
  modifications, « Suite donnée : validée » et les cas candidats ; un second
  lancement ne la repropose pas.
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
- **Lot 7 (interface du patron)** fait le 2026-10-08, branche
  `espaces/lot-7` (après les corrections) : paquet `interface/` (Hono,
  HTML/CSS/JS sans framework, charte de `presentation/schema-harnais.html`
  reprise de la version de travail de Lionel, lue sans y toucher),
  `pnpm interface`. 11 tests d'interface ; parcours de démo rejoué dans un
  navigateur en simulé (`--script`), 64 captures à 1280 et 390 px, clair et
  sombre, relues et corrigées (scratchpad de la session du 2026-10-08,
  `lot7/captures/`, non versionné).

- **Autre fournisseur (2026-10-08, branche `espaces/fournisseur`)** : la
  config accepte un point d'accès au format Anthropic (`conversation.modele.acces` :
  adresse, `bearer`, nom de la variable de la clé). Essayé avec GLM-5.3 chez
  GMI Cloud : premières passes réelles des évals, analyse dans
  `evals/erreurs-2026-10-08.md`. Elles ont révélé deux défauts du harnais,
  corrigés pour tout fournisseur : plusieurs appels d'outil dans un message
  (la boucle n'en traitait qu'un), et les nombres de la consigne refusés par
  le contrôle. Traduction ~77 % (seuil 95 %), échappée 11/14 (seuil 80 %).
  **Aucune passe avec Claude.**

## Identité et données minimales (`PLAN-IDENTITE.md`, 2026-10-08)

**Lot 1, l'identité avant le dossier.** `moteur/src/personnes/personnes.ts` :
le registre d'accès `personnes.yaml` (dans le dossier du client, au format du
harnais : le patron, et chaque agent par son identifiant), `recevoir()` et le
type `IdentiteVerifiee`, que seule la porte construit. Dans
`conversation.ts` : `accueillir()` (la porte ; un refus s'écrit par
`ouvrirJournal`, le journal seul, type `accès refusé`, avec l'identité reçue
bornée à 200 caractères, le canal `terminal` ou `web`, l'heure, le motif),
`verifierRegistre()` (au démarrage de `pnpm parler` et de l'interface :
chaque agent du registre existe dans `agents.csv`), `avecSession()` (exige une
`IdentiteVerifiee`). `verifierIdentite` du métier ne fait plus que la
cohérence. Interface : chaque route passe la porte avant d'ouvrir quoi que ce
soit (inconnu : 403, au journal) ; `/api/etat` et `/api/journal` deviennent
des **`POST { identite }`**, réservées au patron (403 « réservé au patron ») ;
la page envoie l'identité choisie et montre « Accès refusé » pour un agent ;
la liste « Je suis » vient du registre. Le registre est relu à chaque
requête.

**Lot 2, le modèle ne reçoit que la phrase.** `systemeTraduire(role, …)` :
plus d'agents ni de postes, le rôle seul. `Action.personnes` déclare les
paramètres qui désignent une personne (`gerer_absence.agent`,
`valider_remplacement.agent`, `voir_planning.agent`) ; `schemaMontre()` les
montre au modèle en mention libre. `designation.ts` : niveau 1
(`correspondances`), niveau 2 (`proches`, clé phonétique et
Damerau-Levenshtein, 3 au plus), réponse à la question (`choisirParmi` : un
nom ou un rang). `traduire.ts` : le second appel `designer` (énumération des
candidats + `aucun`, journalisé `appel_modele` / `designer`). `traiterConsigne`
prend le **dossier** : sur le journal seul, plafond, question en attente
(`precision_attendue`), traduction ; puis `ouvrir()`, cohérence, `resoudre()`,
le geste. Nouvelle réponse `precision` (`texte`, `candidats`), montrée avec
les candidats en boutons. Évals : 9 cas `R-1` à `R-9`, une variante
`homonyme` (A-14 Aïcha Mansouri, ajoutée à la copie du cas), la sorte
`precision`.

**Changements de comportement à connaître** : un agent qui nomme quelqu'un
d'autre reçoit « Tu ne peux désigner que toi-même : « Karim » ne te désigne
pas. » (avant : son propre planning, ou « Tu ne peux déclarer que ta propre
absence ») ; un homonyme exact va droit à la question, sans second appel ; le
planning vide d'un agent nommé dit son nom (« Aucune vacation pour Laura
Petit. ») ; une ligne `consigne` porte `demande` (la mention, telle que le
modèle l'a rendue) et `params` (ce qui a été exécuté).

**Non vérifié** : aucune passe réelle — la **passe 3 GLM mesurera un autre
prompt** que les passes 1 et 2 (plus de vocabulaire d'agents ni de postes) :
l'avant/après des six corrections est confondu avec ce changement, à lire cas
par cas ; le second appel `designer` n'a jamais tourné sur un vrai modèle ;
le seuil de `proches` (2 lettres ou 40 %) n'est éprouvé que sur des listes
synthétiques et le client fictif (13 agents), jamais sur 300 noms ; la clé
phonétique est une maison, sans référence publiée ; le chemin `precision`
du runner d'évals (`moteur/src/cli/evals.ts`) n'a tourné qu'en simulé, où
tout finit en « script simulé épuisé » (le câblage et la variante sont
vérifiés, pas le classement) ; relecture indépendante faite (sous-agent,
lecture seule) : rien de grave ; corrigés : texte reçu borné dans le motif
d'un refus, `--conversation` pour répondre à une question en CLI, pas de
niveau 2 pour un agent ; **ouverts, à trancher avec Lionel** : une personne
trouvée au niveau 2 exécute un geste qui lit (`gerer_absence` ouvre une
demande) sans « oui » — forcer une confirmation ? ; une réponse ambiguë à la
question (le prénom partagé) devient une nouvelle consigne au lieu de
reposer la question ; un agent ajouté au registre sans exister dans
`agents.csv` pendant que le serveur tourne fait échouer `/api/etat` (500)
jusqu'à correction ; la marque d'`IdentiteVerifiee` survit à une copie
modifiée (`{ ...identite, agent }`), aucun code ne le fait ; navigateur : Chromium de playwright-cli
seulement, 1280 px, thème clair. **Limite connue de l'interface** : une
confirmation qui attend un agent, listée dans « À valider », propose
« Répondre en tant que … » ; une fois l'agent choisi, l'onglet devient
« Accès refusé » et ses boutons Oui / Non disparaissent : l'agent ne peut
répondre que depuis la bulle de la conversation, si elle est dans la page
(une confirmation ouverte ailleurs, par `pnpm parler`, n'a plus de bouton
pour lui). Conséquence directe de la décision 5 (lectures réservées au
patron) ; à trancher avec Lionel (une route « mes confirmations » pour un
agent ?).

## Corrigé le 2026-10-08 (session suivante), à mesurer

Les six points issus des passes GLM, dans l'ordre où ils étaient posés.
Détail et décisions : `evals/erreurs-2026-10-08.md`, « Corrigé après la
passe 2 » ; décisions de Lionel dans `REFLEXIONS.md` (Décidé, 2026-10-08).

1. **Étiquettes, tranchées par Lionel** : vocabulaire d'intentions connues
   fourni par le métier et montré au modèle (`INTENTIONS`,
   `metiers/securite-privee/code/src/conversation.ts`), les étiquettes
   N-1 à N-8 s'y prennent ; N-4 accepte les deux lectures ; P-VEI-1 ne
   compare plus `date` ; AMB-1 garde `inconnue` et le système renvoie le
   « trop vague » à `je_ne_sais_pas` ; E-14 reste un écart et le système de
   l'échappée dit de signaler sans recopier.
2. **AP-1, AP-4** : descriptions de `repondre_sollicitation` et
   `repondre_reaffectation` précisées.
3. **Réponses bavardes** : lecture corrigée en rejouant `verifierReponse`
   sur les traces — l'intrus d'E-03 était « 2026 », celui d'E-10 « 21 »,
   « 40 » : *la date du message*, pas « 1 vacation chacun ». Le système
   demande une réponse courte sans la date ni l'heure du message ; le repli
   rend tous les tableaux des requêtes (`tableaux`, `boucle.ts`), plus le
   dernier seul.
4. **`oui` → `accepte`** dans les deux outils de réponse (schémas, tests,
   étiquettes).
5. **Passe avec Claude** : toujours pas de clé. Lionel a choisi de relancer
   **GLM seul** d'abord (clé GMI à mettre dans son profil shell).
6. **Plafonds GLM** : un commentaire dans `exemples/client-fictif/config.yaml`
   (GLM n'est pas retenu).

**Passes 3 à 6 faites le 2026-10-09** (`evals/erreurs-2026-10-08.md`) :
en passe 3, traduction 93 % et échappée 57 % (régression : le modèle
finissait par du texte). Pistes 1 à 3 corrigées, puis passe 4 : **traduction
58/60 (97 %, au-dessus du seuil), échappée 11/14 (79 %, seuil 80 %)**.
Passes 5 et 6 de l'échappée, même harnais : 13/14 puis 11/14, soit **35/42
(83 %) sur trois passes, deux sur trois sous le seuil**. Dans les sept
écarts, la réponse du modèle était juste ; ce qui échoue : finir par du
texte (3), recopier les bornes de semaine calculées (2) ou l'année du jour
(1) que le contrôle ne tient pas pour des sources, une somme de tête attrapée
(1). **Deux pistes déterministes faites le soir même** (relancer une fois un
modèle qui finit par du texte ; la date du jour et les bornes de la semaine
citables comme dates, pas comme nombres), puis **passes 7 à 9 : 11, 14 et
11 sur 14, soit 36/42 (86 %)**. Les deux catégories visées ont disparu sur
42 cas ; une catégorie ancienne revient (4 écarts) : la réflexion de GLM
avant `proposer` **tronquée à 4 096 tokens, plafond par appel codé en dur**
dans `boucle.ts` (même famille que N-6). Plafond retiré, puis **passes 10 à
12 : 14, 14, 13 sur 14 = 41/42 (98 %), trois passes au-dessus du seuil**.
Un seul écart (E-03) : « le plus petit total » pris pour une mention de
Laura Petit — catégorie nouvelle, vue une fois, piste notée, non faite
(« Passes 10 à 12 »). Restent à Lionel : le repli qui montre les cellules
piégées, AP-4, et cette sévérité du contrôle des noms.

## Ce qui reste (à Lionel, ou avec lui)

0. **Exécuter `PLAN-PROMOTION.md`** (écrit le 2026-10-09 sur décision de
   Lionel : la promotion est l'auto-amélioration du harnais, prioritaire,
   « il faut absolument que ce soit sécurisé »). Quatre lots, un geste appris
   = une donnée YAML (SQL paramétré sur la copie du rôle, gabarit rendu par
   le code), fabriqué par le modèle, vérifié en code par rejeu sur
   instantané, activé par un humain avec une clé. L'échappée tient son
   seuil (41/42 sur trois passes, le 2026-10-09 au soir) : le plan peut
   commencer. Les choix du § 11 sont tranchés le 2026-10-10 (le patron
   active ; une relance à la fabrication ; le reste confirmé). **Lots 0 à 3
   faits le 2026-10-10, relus, corrigés et fusionnés dans `main` le
   2026-10-11** (`PLAN-GENERAL.md` phase A). Les deux décisions qui
   restaient sont prises par le grand plan : le rejeu reste strict et
   l'échappée est priée de répondre court (G4, mesuré : passe 16) ; le
   lot 4 se fait (G5, phase C).
1. ~~Relancer les deux passes GLM~~ : passe 3 faite le 2026-10-09 (la clé
   se retrouve dans le transcript du 2026-10-08, voir la mémoire du projet) ; Lionel a tranché le 2026-10-08 : pas de
   nouvelle clé ni de révocation pour l'instant (« stade du laboratoire »),
   pas de passe Claude avant un bon moment. Les étiquettes sont tranchées
   (section précédente).
2. **Rejouer le critère global avec la clé**, sur une copie, à
   `--maintenant 2026-10-10T21:40` : `pnpm parler` (absence d'Aïcha,
   « Qui a le moins d'heures cette semaine ? ») puis `pnpm interface` (le
   scénario de `prospection.md`, § 10.3). Le n° 3 du critère est à reformuler
   d'abord (« Choix faits faute de consigne »).
3. ~~Relire et fusionner les branches `espaces/*`~~ : fusionnées le
   2026-10-08 sans relecture du lot 7 ni de `espaces/fournisseur` (à faire
   sur `main`).
4. **Relire les étiquettes des évals** (`evals/consignes.yaml`) ; les
   phrases de vrais patrons viendront plus tard (le réel après le produit).
5. Hors de ce plan, comme prévu (§ 12) : la mise à jour à distance d'un
   harnais livré, l'identité réelle, créer et supprimer une vacation, la
   politique réglable à l'écran, le plafond d'IA dans le rapport Veiller.

## Évals (lot 6) : deux passes GLM faites, l'audit ci-dessous à refaire

**Deux passes GLM-5.3 ont tourné le 2026-10-08** (`evals/resultats/`,
`evals/erreurs-2026-10-08.md`), **aucune avec Claude**. Commandes, sur le
client fictif (les évals travaillent toujours sur une copie fraîche) :
`pnpm evals traduire --client exemples/client-fictif` (51 cas, ≈ 0,1 $ avec
GLM) et `pnpm evals echappee --client exemples/client-fictif` (14 cas,
≈ 0,2 $ avec GLM ; ≈ 0,7 $ et 3 $ avec Opus),
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
**Statut :** tranché le 2026-10-08 (section « Corrigé »). Les deux passes
GLM ont confirmé le risque (deux mots différents pour N-3 d'une passe à
l'autre) : le métier fournit maintenant le vocabulaire (`INTENTIONS`),
montré au modèle, et les étiquettes s'y prennent. À mesurer à la passe 3.

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
- **2026-10-08** : le geste `declarer_absence` s'appelle **`gerer_absence`**
  (Lionel) : « déclarer » cachait qu'il cherche et propose un remplaçant.
  `PLAN-ESPACES.md` § 5.1 et `evals/erreurs-2026-10-08.md` gardent l'ancien nom
  (plan et analyse d'époque).
- **2026-10-08** : le métier fournit le vocabulaire des intentions, montré
  au modèle ; une donnée qui ressemble à une consigne se signale sans être
  recopiée ; « libère le mercredi de Sophie » admet le geste
  `gerer_absence` comme la demande nouvelle. **GLM-5.3 (GMI) est la
  référence** jusqu'à nouvel ordre ; **laboratoire d'abord**, sur données
  fictives, jusqu'à un produit correct et efficient.
- **KISS** : éviter l'over-engineering, ne jamais sacrifier la qualité.
- Durée maximale d'une vacation : **12 h**.

## Non vérifié, risques ouverts

- **Lot 3 (2026-10-10)** : « postérieure à toute modification du fichier »
  (§ 7.1) est tenu par l'empreinte, pas par la date du fichier (voir « Lot 3
  de la promotion ») ; l'activation à l'écran est rejouée avec le modèle
  simulé (aucune consigne réelle n'a suivi dans l'interface : le chargement du
  geste activé est couvert par `conversation.test.ts` du métier et par
  `pnpm evals gestes` sur la copie) ; `pnpm gestes verifier --avec-modele`
  n'a tourné qu'une fois (une passe) ; le test d'honnêteté sur
  `exemples/client-fictif/gestes/` est vide tant qu'on n'y écrit rien (il
  garde `evals/gestes.yaml`) ; la navigation au clavier de l'onglet « Appris »
  et le champ du motif n'ont été vus qu'en capture ; deux fichiers de
  `gestes/` au même identifiant se départagent par le nom du fichier (la page
  l'envoie, le CLI le demande) ; le mini-site et la présentation disent
  toujours « codé à l'atelier » (artefacts de Lionel, § 7.4).
- **Lot 2 (2026-10-10)** : la borne haute du coût d'une fabrication en flux
  majore d'environ deux fois (le plafond du mois se ferme plus tôt) ; le
  rejeu exige chaque nombre et chaque nom de la réponse de l'échappée, et
  GLM répond souvent plus long que la question (0/3 à l'éval de
  fabrication, deux gestes justes écartés) ; « activable » ne regarde que
  le taux de traduction, pas les cas stricts ; les outils `proposer_geste`
  portent des `record` (`parametres`, `tests[].params`) que le mode strict
  de l'API d'Anthropic pourrait refuser (GMI l'ignore ; jamais essayé chez
  Anthropic) ; la passe de traduction de `pnpm promotions` copie le dossier
  du client une fois par cas (≈ 65 copies, quelques secondes) ; le délai
  d'appel vaut maintenant `par_demande.secondes` pour la traduction aussi
  (une panne se voit plus tard qu'avec 60 s) ; `pnpm interface` et `pnpm
  parler --interactif` ne sont pas rejoués depuis le lot 1.
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
  au critère du lot 3 ou aux évals, avec la clé de Lionel. Les appels réels
  du 2026-10-08 sont passés par GMI Cloud (même SDK, autre point d'accès).
- **Les corrections du 2026-10-08 (session suivante) ne sont mesurées sur
  aucun modèle réel** : vocabulaire d'intentions, clauses du système (trop
  vague, réponse courte, signaler sans recopier), descriptions des outils
  de réponse, clé `accepte`. Elles peuvent déplacer d'autres cas (un
  vocabulaire montré peut pousser une action vers une demande nouvelle, ou
  l'inverse) : lire toute la passe 3, pas seulement les cas visés.

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
- Shell : le hook RTK filtre aussi `git diff` et `git status` (sortie vide ou
  trompeuse) : `git diff --output=<fichier>`, ou `rtk proxy git status`.
- **Les worktrees des sous-agents** vivent dans `.claude/worktrees/` (exclu
  localement par `.git/info/exclude`) : sans cette exclusion, `git add -A` les
  ajoute comme sous-dépôts. Les rapporter par un diff appliqué en 3 voies.
- Une requête de l'échappée tourne dans un **processus enfant** (`node -e`),
  pas dans un fil : un `worker.terminate()` n'interrompt pas une boucle
  SQLite native, et le processus ne rendait plus la main.
- Un agent ne doit jamais lire le texte d'une étape destiné au patron
  (`decrireEtape`) : les gestes de l'agent ont leurs propres phrases
  (`actions.ts`, `reponseEnregistree`, `vacationPourAgent`).
- **`traiterConsigne` prend le dossier, pas une session** : elle ouvre la
  sienne après la traduction. Un test qui garde une `Session` pour relire le
  journal ou confirmer voit les écritures (SQLite), pas un `ctx` rechargé.
- **Tout dossier client exige `personnes.yaml`** : sans lui, `pnpm parler`
  et l'interface refusent tout (« registre d'accès absent »). Les copies
  faites par `cpSync` l'emportent ; un client réel devra le recevoir.
- **`/api/etat` et `/api/journal` sont des `POST`** avec `{ identite }` ; un
  test de l'interface passe par `lire(a, route, identite)`.
- **Une question « Vous parlez de qui ? » appartient à qui elle a été
  posée** (`precisionEnAttente` filtre par identité) ; elle se ferme dès que
  cette personne envoie une autre consigne.
- **L'interface ne répond qu'à sa propre page** (`app.ts`) : `hono/csrf`
  sur `/api/*` (403 sur un POST de formulaire ou `text/plain` d'une autre
  origine), nom d'hôte dans `HOTES` sinon 421, corps déclaré
  `application/json` sinon 400. Un test qui poste doit mettre l'en-tête
  `Content-Type: application/json`. Une `HTTPException` de Hono garde son
  statut dans `onError`.
- Le test « rien des autres agents dans le système » de
  `metiers/…/echappee.test.ts` (ligne ~217) ne peut pas échouer : le système
  de l'échappée ne contient jamais de donnée. La garantie D4 est prouvée par
  le test de `tablesPour` ; un test de bout en bout (un agent joue
  `SELECT nom FROM agents`, le résultat ne contient que lui) serait plus
  honnête.

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
- **`gerer_absence` par le patron sans agent** : refus « Précisez l'agent
  absent. ».
- **`mes_titres`** : une ligne par titre, « non renseigné » quand la donnée
  manque, la carte avec ses activités et sa dernière période de validité.
- **Le test « `ConfigSecurite` sans `conversation` passe »** est dans
  `exemple.test.ts` (le test de la config du client fictif).
- **Les outils de réponse d'un agent prennent `accepte`, pas `oui`**
  (§ 5.1 du plan : `oui: z.boolean()`) : la couche de compatibilité de GMI
  déformait la clé courte ; essai du 2026-10-08, à mesurer.
- **Le repli d'une réponse retirée rend tous les tableaux des requêtes
  réussies**, dans l'ordre (§ 6.6 : « le tableau de la requête ») : le
  dernier seul n'avait parfois que des noms (E-03).
- **`MetierConversation.intentions`** (absent du plan) : le vocabulaire des
  demandes nouvelles connues, rendu dans le système de la traduction après
  la règle `demande_nouvelle`.

### Lot 0 de la promotion (`PLAN-PROMOTION.md` § 4, 2026-10-10)

- **Les paramètres partent au processus enfant par l'entrée standard, en
  JSON, avec le SQL** (le § 4.1 disait « par `argv` ») : c'est le canal que
  `requete.ts` utilisait déjà pour le chemin, le SQL et la borne ; l'essentiel
  tient, ils ne sont jamais collés dans le SQL. SQLite les lie
  (`iterate(parametres)`), les clés nues (`agent` pour `:agent`) passent sur
  Node 22.22 (testé).
- **Un paramètre nommé dans la requête et absent des paramètres est
  refusé** (`{ erreur }`) : `node:sqlite` n'expose pas les noms des
  paramètres d'une requête préparée, ils sont lus par une expression
  régulière sur le SQL **hors chaînes et identifiants entre guillemets**
  (`parametresNommes`, `:`, `@` et `$`). Une clé que la requête ne nomme pas
  est tolérée (`setAllowUnknownNamedParameters`) : un geste passe tous ses
  paramètres à chacune de ses requêtes. **Sans paramètres, rien ne change**
  pour l'échappée (pas de vérification, même chemin qu'avant).
- **`CONTROLE_OK = 'ok'` ajouté dans `boucle.ts`** (le type et la valeur
  rendue, rien d'autre) : `promotion.ts` compare à la constante, pas à une
  chaîne écrite deux fois.
- **La purge est câblée dans `pnpm promotions` dès le lot 0** (le § 3 place
  `cli/promotions.ts` au lot 2) : P8 dit que c'est cette commande qui
  purge, et une fonction sans appelant serait du code mort.
- **`EchappeeJournalisee` porte aussi `issue`, `modifications?` et
  `constats?`** (absents du § 4.3) : le dossier de promotion en a besoin
  (« proposition », les modifications, le contrôle) et la fabrication du lot
  2 saura ce qu'elle relit.
- **Le chemin de l'instantané est relatif au dossier du client**
  (`echappees/<id>.json`), au journal comme dans le fichier de geste à
  venir (`TestAppris.instantane`, § 5.1) : le dossier peut se déplacer.
- **Une ligne `echappee` d'avant le lot 0** (sans `echappee`, `texte`,
  `instantane`, `role`) **ne compte plus** pour le seuil et n'entre pas au
  dossier : sans instantané, rien ne se rejoue. Le journal du client fictif
  n'en a aucune (alertes, constats, veilles seulement).
- **La suite d'une proposition se lit par conversation** (comme avant,
  `suiteDe`), pas par échappée : deux propositions dans la même conversation
  partagent leur suite. Cas non rencontré ; à affiner si la fabrication y
  bute.
- **`ecrireDossier` calcule le début de la fenêtre** depuis `maintenant` et
  `fenetreJours` (`debutFenetre`, partagé avec le CLI), au lieu de retrouver
  les lignes par `conversations` et `occurrences` : c'est `echappeesDe` qui
  les donne, et chaque requête est celle de son échappée.
- **Un abandon n'a pas de `texte`** au journal (le texte montré, « Je n'y
  arrive pas : … », est rendu par `conversation.ts`) ; son instantané est
  écrit quand même, avant la boucle, et la ligne le cite.
- **La purge ne touche qu'aux fichiers que le journal cite** : un fichier
  d'`echappees/` que nulle ligne `echappee` ne nomme reste là. Les dates
  sont celles du journal (heure de Paris), pas celles du système de
  fichiers.

### Lot 1 de la promotion (`PLAN-PROMOTION.md` § 5, 2026-10-10)

- **`verifierGabarit` est statique au chargement** : les références du
  gabarit (requête, paramètre), une forme de réponse et une seule, une
  période au plus et `du`, `au` réservés, des noms de requêtes uniques,
  chaque `:param` d'un SQL déclaré — sans exécuter de requête. Le § 5.1
  lisait les colonnes sur une copie vide à chaque chargement (cinq
  processus enfants par consigne). Avec `colonnes` en second argument, il
  vérifie aussi les colonnes : c'est le lot 2 (`verifierGeste`, copie vide)
  qui les lui donnera. À l'exécution, une colonne absente rend « Je n'ai pas
  pu lire les données : … », détail au journal ; un geste n'est activé
  qu'après rejeu sur ses instantanés, qui l'aurait vu.
- **Le paramètre `agent` est `z.string().nullable()`**, pas `/^A-\d+$/`
  (§ 5.3) : le format des identifiants est au métier, et la résolution des
  personnes du moteur garantit un identifiant connu (ou null). Pour le rôle
  `agent`, il vaut toujours celui qui parle (D4), quel que soit le paramètre
  reçu.
- **Un fichier `propose` ou `retire` n'est ni chargé ni signalé** (son état
  normal). Un fichier `actif` sans clé (jamais activé, empreinte différente,
  retiré), illisible ou au gabarit faux est écarté, `refusé` au journal
  (objet = l'id, ou le nom du fichier s'il ne se lit pas) et alerte G-01 —
  **à chaque consigne** tant que le fichier reste là : voulu, ça doit se voir.
- **La clé se lit sur les lignes `activé` et `retiré` seulement**
  (`motifSansCle`) : une ligne `refusé`, `vérifié` ou `proposé` postérieure
  ne la défait pas ; un fichier altéré puis rétabli se recharge.
- **`chargerGestesAppris(dossierClient, { client, journal }, horodatage)`** :
  le client et l'horodatage du tour servent aux lignes du journal (le § 5.2
  ne les passait pas).
- **`MetierConversation.copie` est facultatif** comme `echappee` : absent,
  aucun geste appris n'est chargé.
- **`confirmer` devient asynchrone** (avec `executerAttente`) :
  `Action.executer` rend une promesse pour un geste appris, et `confirmer`
  exécute une action après un « oui » ; le CLI et l'interface passaient déjà
  par `avecSession`, seuls les tests ont gagné un `await`. Un geste appris
  ne demande jamais de « oui » (`ecrit: false`).
- **La ligne `consigne` d'une action porte `resultat`** (= `Resultat.donnees`
  quand il existe) : le commentaire de `Resultat.donnees` disait « va au
  journal » sans que rien ne l'écrive. Pour un geste appris : ses requêtes
  (nom, SQL, lignes) ou son erreur. Les gestes codés qui rendent `donnees`
  (`statut`, `demande`) y sont aussi désormais.
- **`DOSSIER_GESTES` vit dans `gestes/geste-appris.ts`** (le lot 0 l'avait mis
  dans `promotion.ts`) : `charger.ts` en a besoin, et `promotion.ts`
  importera `gestes/` au lot 2.
- **`parametresDe` s'appelle `parametresAppris`** : `regles/verdict.ts`
  exporte déjà `parametresDe`, et deux `export *` du même nom s'annulent à
  l'exécution (le métier a perdu son registre le temps de le comprendre).
- **`TYPE_ALERTE = 'alerte'`** ajouté dans `archetypes/veille-client.ts` (la
  veille l'écrivait en dur).
- **Les évals de traduction chargent les gestes `propose` et `actif`** du
  dossier `--client` **par leur fichier, sans la clé** : la copie d'un cas
  n'a pas de journal, et le § 7.1 mesurera un geste seulement proposé. **Une
  étiquette `nouvelle` d'une intention devenue geste appris passe quand le
  modèle choisit ce geste** (`ecartsTraduction(…, appris)`) : N-1 et N-2
  sont étiquetés `heures_par_agent` en demande nouvelle ; les paramètres se
  mesureront par les tests du geste (lot 3, P13).
- **Le geste de référence des tests vit dans `gestes/geste-appris.exemple.ts`**
  (non exporté par le moteur) : importer un fichier de test en rejoue les cas.

### Lot 2 de la promotion (`PLAN-PROMOTION.md` § 6, 2026-10-10)

- **`fabriquerGeste` vérifie elle-même** (la relance dépend d'un écart
  d'exécution) et rend trois sortes : `geste` (zéro écart, prêt à écrire),
  `ecarts` (la proposition lisible et ses écarts de fond) ou `echec` (forme,
  ou requête qui lève, après relance ; ou moins de trois réponses, sans
  appel). Le § 6.1 séparait l'appel de la vérification ; `pnpm promotions`
  ne vérifie pas deux fois.
- **L'identifiant du geste n'est pas demandé au modèle : c'est
  l'intention.** P14 retire de la liste l'intention du même id ; un id
  choisi par le modèle laisserait deux portes.
- **Le système de fabrication reçoit le schéma des tables** (noms, colonnes,
  descriptions, sans ligne ni compte : `schemaDesTables`), absent de la
  liste du § 6.1 : sans lui, `:du` et `:au` ne tombent pas sur la bonne
  colonne. Rien de nouveau ne part chez le fournisseur : ce schéma est le
  système de l'échappée. Il reçoit aussi la description de l'intention
  d'origine (« ou par tous ») : la passe 13 a montré qu'un geste plus étroit
  laisse des consignes sans mot-clé.
- **L'effort de la fabrication est `effort.echappee`** (pas de clé de config
  dédiée : une de plus dans `ConversationSchema` aurait touché toutes les
  configs). Le plafond par appel est `par_demande.tokens_sortie`, comme le
  plan le demande.
- **`contient` = les nombres hors dates et les mots de noms connus du texte
  montré, moins ce que la consigne porte déjà** : la consigne est une source
  de l'échappée (« du 5 au 11 octobre » se cite), et le gabarit rend les
  paramètres à sa façon. Les dates sont exclues pour la même raison. Un
  texte sans rien à vérifier (« Aucune vacation. ») ne fait pas un test
  (écart 2), parce que `TestAppris.contient` exige un élément (§ 7.3).
- **Un paramètre `agent` d'un test est résolu par le niveau 1**
  (`correspondances`) à partir de ce que le modèle écrit ; zéro ou deux
  personnes → écart 2. Pour le rôle `agent`, c'est celui qui parle (D4),
  quoi que le modèle écrive.
- **Écart 4, les valeurs en dur : les chaînes SQL seulement** (`'…'`, `%` et
  `_` retirés, deux caractères au moins). Une date ISO et une personne (id
  ou nom, niveau 1) sont des écarts même hors consigne ; un mot d'une
  consigne (`'nuit'`) en est un : c'est voulu, un geste qui code la consigne
  ne répond qu'à elle, et c'est la mesure « faute de type » du § 8. Les
  nombres (`LIMIT 1`, `* 24`) ne sont pas regardés.
- **Écart 1 sur la copie vide** : les tables du premier instantané lisible,
  lignes retirées ; une requête qui lève sur la copie vide arrête la
  vérification (un seul écart, celui qui relance) : rien d'autre n'a de sens.
- **Seules les échappées `reponse` vont à la fabrication** (un geste appris
  lit) ; moins de trois → `echec` sans appel.
- **`promouvoir.ts` porte l'orchestration** (le § 3 ne la plaçait nulle
  part) : testable avec le modèle simulé (`promouvoir.test.ts`, ce que le
  § 6.5 attendait de `promotion.test.ts`). `pnpm promotions` a
  `--sans-modele` (le dossier seul), pas `--modele simule`.
- **« Activable » = le taux de traduction seul, pas `bilan.atteint`** : AP-4
  (cas strict, écart ancien) bloquerait toute activation. Les cas stricts
  en écart sont écrits au dossier, au terminal et au journal (`vérifié`
  porte `traduction.atteint` = activable). À relire par Lionel avec AP-4.
- **Le coût de la passe de traduction va au journal du client en une ligne
  `appel_modele` / `verifier` agrégée** (objet = le geste, `appels`,
  `cout_usd`), pour le plafond du mois ; ses appels par cas vivent dans les
  copies détruites. Son tableau s'écrit à côté du dossier :
  `promotions/<id>-<date>-traduction.md`.
- **Une passe de traduction qui échoue ne perd pas le geste écrit** : le
  dossier dit « passe impossible (…) », non activable ; relancer
  `pnpm promotions` refabriquerait (le fichier existant est gardé, le nouveau
  prend la date) : plutôt `pnpm gestes verifier --avec-modele` au lot 3.
- **Le plafond du mois est respecté avant la fabrication** (sorte
  `plafond`, aucun appel) ; la passe de traduction ensuite n'est pas bornée
  par lui (une consigne admise va à son terme, même règle que la
  conversation).
- **`evals/traduction.ts` est extrait de `cli/evals.ts`** (copie, porte,
  trace, traduction et résolution) pour que `pnpm promotions` joue la même
  passe ; `casDuGeste` lit le moment de chaque test dans son instantané
  (`horodatage`), le schéma du test ne change pas.
- **`pnpm evals gestes`** : `gestes.yaml` porte des gestes écrits à la main,
  posés dans une copie (`gestes/eval-<id>.yaml`, proposé) avec un instantané
  par test pris sur les données de la copie à `maintenant` pour le rôle du
  test ; puis tous les gestes de la copie sont rejoués, ceux du `--client`
  compris. Identifiant de cas `<geste>/<échappée>`.
- **`pnpm evals promotion`** : le seuil est dans le fichier (0,66 pour
  « 2/3 ») ; pas de passe de traduction (≈ 0,12 $ par cas, mesurée par
  `pnpm promotions`) ; la copie passe la porte avec le rôle patron ;
  `compter_vacations` est attendu en échec faute de type (« de nuit »).
  Quatre cas d'échappée ajoutés (E-15 à E-18), chiffres à la main.
- **`Intention.ecrit` est obligatoire** (pas de défaut) ; les deux
  simulations sont `ecrit: false` mais ne sont pas promouvables (P15) : la
  fabrication les tentera et échouera sur le fond, c'est la mesure.
- **`citations` et `contient` vivent dans `echappee/reponse.ts`** ;
  `present` d'`evals.ts` est remplacé par `contient` (même règle).
- **`executerGeste` et `liaisonDe`** sont exportés d'`action-apprise.ts` :
  l'exécution d'un geste et le rejeu d'un test sont le même code.
- **« null » et « None » écrits en texte** dans `reponse.ligne`,
  `reponse.tableau` et `tests[].params` se relisent comme `null`, comme pour
  la traduction (GMI ignore `strict`).
- **La ligne `promotion proposée` porte `fabrication`** (tout sauf la
  proposition YAML, qui est au dossier) : le taux de promotion du § 8 se
  calcule depuis le journal.
- **Le délai d'un appel au SDK vient de la config** (`par_demande.secondes`,
  `modeleAnthropic(id, cle, acces, delaiMs)`) : le `timeout: 60_000` codé
  dans `anthropic.ts` faisait échouer la fabrication (GLM réfléchit plusieurs
  minutes). Même règle que pour les tokens (2026-10-09).
- **La fabrication part en flux (SSE)** (`AppelModele.flux: true`, le SDK
  reconstitue le message ; la traduction, la désignation et l'échappée
  restent hors flux) : la passerelle Cloudflare de GMI coupe toute réponse
  non diffusée passée 120 s (erreur 524) ; la fabrication sur la copie n'est
  passée qu'à la troisième tentative du SDK (366 s), facturée trois fois chez
  GMI. **Et en flux, GMI ne compte aucun token** : l'adaptateur rend alors
  une **borne haute** (`usageBorne` : entrée = caractères de la requête / 2,
  sortie = le plafond demandé), écrite au journal (`usage_borne: true`),
  portée par `IssueFabrication.usageBorne`, `Fabrication.cout_borne` et le
  dossier (« au plus x $ »). Jamais sous-compter le plafond du mois ; chez
  Anthropic le flux porte l'usage et la borne ne se déclenche pas. À relire
  par Lionel : la borne majore d'environ deux fois (0,07 $ contre 0,04 $
  mesuré hors flux) ; l'alternative serait l'effort `traduire` (bas) pour
  tenir sous 120 s hors flux, au prix de la qualité du geste.
- **Une fabrication « injoignable » (réseau, passerelle, flux lâché par GMI
  après plusieurs minutes : vu à la seconde passe de l'éval) n'inscrit pas
  la ligne `promotion proposée`** (`Fabrication.injoignable`) : une panne
  n'est pas un verdict, le dossier le dit et le prochain `pnpm promotions`
  réessaie. Les autres échecs (forme, troncature, écarts de fond) inscrivent
  la ligne : l'intention n'est reproposée qu'à sa prochaine occurrence.
- **Un refus ou une troncature ne relance pas** : P5 liste « schéma, zéro ou
  deux outils » et une requête qui lève ; un modèle tronqué à 12 000 tokens
  (compter_vacations, impossible faute de type) l'était deux fois, pour
  0,05 $ de plus.

### Lot 3 de la promotion (`PLAN-PROMOTION.md` § 7, 2026-10-10)

- **La logique vit dans `moteur/src/promotion/atelier.ts`**, pas dans le
  CLI (le § 3 ne nommait que `cli/gestes.ts`) : l'interface activera aux
  mêmes exigences (§ 7.2), il faut un seul code. `promouvoir.ts` écrit sa
  ligne `vérifié` par le même `journaliserVerification` ; `copieVideDe` y a
  déménagé ; `BilanTraduction` et la passe (`passeTraduction`) sont dans
  `evals/traduction.ts`, partagés par `pnpm promotions` et
  `pnpm gestes verifier --avec-modele` (deux CLI, une passe).
- **« Postérieure à toute modification du fichier » est tenu par
  l'empreinte, pas par la date du fichier** : la ligne `vérifié` retenue doit
  porter `jeton === empreinteGeste(geste)` ; un fichier modifié après la
  vérification a une autre empreinte (hors `statut` et `validation`, qui ne
  sont pas le geste). La date du fichier aurait été fausse partout : une
  copie du client (`cpSync`) remet les dates à maintenant, `pnpm promotions
  --date` écrit des lignes datées d'ailleurs. Écart au plan, assumé.
- **Ce qui rend activable** : sur l'empreinte exacte, la dernière ligne
  `vérifié` est sans écart, **et** une ligne `vérifié` sans écart porte une
  passe de traduction au seuil (`traduction.atteint`). Une vérification en
  code faite après la passe (`pnpm gestes verifier` sans modèle) ne la périme
  pas : même contenu, même résultat ; un écart apparu depuis (un instantané
  perdu) bloque. Sans ça, chaque `verifier` sans modèle aurait coûté une
  passe à 0,15 $ pour rien.
- **`<id>` ou nom de fichier** : `trouverGeste` accepte l'identifiant du
  geste, ou `x.yaml` ; plusieurs fichiers au même identifiant (une
  refabrication, `<id>-<date>.yaml`) → « nommer le fichier ». Un second
  fichier ne s'active pas tant qu'un autre est actif pour le même
  identifiant (deux actions du même id seraient chargées) : le retirer
  d'abord. La page envoie le nom du fichier.
- **Activer écrit le fichier avant la ligne au journal** : si la ligne
  manque (panne), le fichier `actif` sans clé est écarté avec `refusé` et une
  alerte G-01 au prochain chargement (ça se voit) ; l'inverse aurait laissé
  une ligne `activé` sans effet, en silence.
- **`par`** : `--par` obligatoire au CLI (le plan), optionnel pour
  `retirer` (le plan ne le demandait pas ; écrit dans `donnees` s'il est
  donné) ; dans l'interface, c'est `identite.role` (`patron`), l'identité
  vérifiée à la porte, jamais un champ du corps ; `validation.par: patron`
  dans le YAML, le registre d'accès ne porte pas de nom.
- **Retirer vaut pour un geste proposé ou actif** (« ce geste, non » se dit
  avant comme après) ; un geste retiré ne se vérifie plus ; pour le remettre
  en jeu : `statut: propose` à la main, puis `verifier`, puis `activer` (pas
  de commande, c'est l'atelier).
- **Un écart rend la passe inutile** : `verifier --avec-modele` ne lance la
  passe (0,15 $) que sans écart ; la ligne `vérifié` porte les écarts dans
  tous les cas, sans `traduction`.
- **La confirmation de l'interface est dans la page** (« Activer le geste
  « … » ? », Oui / Annuler), pas un `window.confirm` (qui bloque les
  navigateurs pilotés et ne se stylise pas) ; le retrait demande son motif
  dans un champ de la carte. L'onglet « Appris » se charge à l'ouverture et
  au rafraîchissement, comme le journal, par `/api/gestes` (pas dans
  `/api/etat`). Le résultat remplace les boutons (« Activé. », « Retiré :
  … »), puis la liste se recharge.
- **L'écart de gabarit est devenu précis** (code du lot 2) : quand le rendu
  levait sur la copie vide (une colonne citée que la requête ne rend pas),
  `executerGeste` perdait les résultats et `verifierGeste` signalait toutes
  les colonnes du gabarit, les bonnes comprises (`nom` à côté de `total`).
  L'erreur de rendu garde maintenant `resultats` ; `fabriquer.test.ts`
  passait par `toContain`, `atelier.test.ts` exige la liste exacte.
- **Le test d'honnêteté (§ 7.3)** lit `evals/gestes.yaml` et
  `exemples/client-fictif/gestes/` (vide, on n'y écrit jamais) ; au-delà du
  plan il exige que l'identifiant soit une intention du catalogue qui lit
  (`ecrit: false`, P15) et pas un geste codé (P14), que les agents cités
  existent, et `agent: null` pour un test du patron, un agent sinon.
- **`pnpm gestes` n'a pas de `--date`** (le plan n'en donne pas) : l'heure
  réelle, `validation.le` = aujourd'hui.
- **Le mini-site et la présentation ne sont pas touchés** (§ 7.4 : avec
  Lionel, ce sont ses artefacts) ; la phrase juste est celle de P15.

### Phase A du plan général (`PLAN-GENERAL.md` § 3, 2026-10-11)

- **« Le dossier le dit » pour `compter_vacations`** : un champ
  `impossible: <motif>` sur le cas dans `evals/promotions.yaml` (schéma
  `CasPromotion`), que le lanceur écrit en tête des écarts du résultat
  (« impossible par construction : … »). Le cas compte toujours dans le
  dénominateur (3) : l'objectif 2/3 suppose donc les deux autres.
- **Le seuil de l'échappée** : « 41/42 » valait pour 14 cas sur trois
  passes ; le lot 2 en a ajouté 4 (E-15 à E-18). Lu comme « au plus un écart
  sur trois passes » : 53/54 sur les 18, 41/42 sur les 14 d'origine.
- **Trois passes de promotion au lieu d'une** : la première (1/3) ne
  suffisait pas à conclure (la règle des passes 7 à 12 : jamais sur une
  passe). 0,64 $ en tout.
- **Relecture A1, défaut 7b non corrigé** : le test « sans modèle : aucun
  appel » (`promouvoir.test.ts`) ne passe pas de simulé qui compte ses
  appels, parce que sans modèle passé l'appel est impossible par le type ;
  le test vérifie déjà le journal (aucune ligne `appel`) et `gestes/` absent.
- **`contient` masque les plages qui ne sont pas des quantités** (dates,
  heures, identifiants, années), exactement celles que `citations` écarte :
  symétrique, et plus strict (un geste qui rendrait « 16h » collé ne passe
  plus « 16 »). Une ligne `retiré` sans jeton (aucune n'existe hors des
  tests : `retirerGeste` l'écrit toujours) ne compte plus.
- **L'identifiant d'un geste codé** est refusé au chargement (écarté,
  `refusé`, alerte G-01), pas à l'activation : l'échec reste fermé et un
  seul endroit le garde.
- **La clé GMI** : absente de l'environnement, extraite du transcript du
  2026-10-08 vers un fichier 600 du scratchpad, comme la mémoire du projet
  le dit ; jamais affichée.
- **Les branches `promotion/lot-0` à `lot-3`** ne sont pas supprimées :
  elles ne contiennent plus rien que `main` n'ait (le critère), et
  supprimer une branche est un geste que les garde-fous laissent à Lionel.

Pièges vus pendant la phase :

- **`npx vitest run` passé par RTK écrit `moteur/.vitest/json/output.json`**,
  que `biome check .` refuse ensuite (format) : le supprimer, ou lancer
  vitest par `rtk proxy`.
- **La fabrication de GLM touche le plafond de la config** depuis la
  clause G4 (b) : 41 000 caractères de réflexion pour `heures_par_agent`.
  Une « réponse tronquée » à la fabrication se lit dans la trace
  (`stop_reason: max_tokens`, `sortie` = `par_demande.tokens_sortie`).

## Commandes

```sh
pnpm install
pnpm check                 # lint, types, tests, cohérence du registre
pnpm registre:generer      # réécrit les tables de la fiche depuis le registre
pnpm registre:verifier     # couverture, codes cités, veille des textes en retard
pnpm veiller --client exemples/client-fictif --date 2026-10-06 [--sortie rapport.md]
pnpm remplacer absence|valider|reponse|suivre --client <copie> …   # voir README
pnpm parler --client <copie> --role patron|agent [--agent A-2] [--maintenant …] [--modele simule] --consigne "…" [--conversation C-…]
pnpm promotions --client <copie> [--date AAAA-MM-JJ] [--sans-modele]   # avec modèle : fabrique, vérifie, mesure la traduction (≈ 0,15 $ par intention)
pnpm evals traduire|echappee|promotion --client exemples/client-fictif [--seulement id,id]   # coûte, exige la clé
pnpm evals gestes --client <dossier>   # rejeu des gestes appris sur leurs instantanés, sans modèle
pnpm gestes --client <copie> lister | verifier <id> [--avec-modele] | activer <id> --par <nom> | retirer <id> --motif "<texte>" [--par <nom>]   # l'atelier ; --avec-modele coûte ≈ 0,15 $
pnpm interface --client <copie> [--maintenant 2026-10-10T21:40] [--modele simule --script <réponses.json>]   # onglet « Appris » : le patron active ou retire
# Un client sans personnes.yaml (registre d'accès) ne démarre ni parler ni l'interface.
```
