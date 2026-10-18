# Réflexions : le journal des « Fait » (2026-09-29 au 2026-10-10)

Extrait de `REFLEXIONS.md` le 2026-10-18 (décision « Le poids », point 5) :
un changelog, gardé pour la lecture historique. Rien n'y est à jour : l'état
est dans `HANDOFF.md`, les décisions dans `REFLEXIONS.md`, « Décidé ».

## Fait (2026-09-29 et 30)

- `methode/socle.md` : règles G-01 à G-07, le temps, les faits communs, le
  tronc commun des questions.
- `methode/archetypes.md` : veiller, planifier, rapprocher, rédiger, chercher,
  avec leurs interdits types, leurs tests types et leurs questions « si…,
  alors… ».
- Quatre métiers complets : recherche, fiche, prospection, entretien,
  observation. Chaque interdit a au moins un test (vérifié par script le
  2026-09-30).
- Le skill, la grille et le README suivent la nouvelle structure.

## Fait (2026-10-05)

- `PLAN.md` : le plan de construction, phases 0 à 6.
- Phase 0 : workspace pnpm (10.32.1 épinglé), TypeScript strict, Biome,
  Vitest, `pnpm check`.
- Phase 1 : le registre de la sécurité privée (`regles.yaml`, 31
  `scenarios/T-xx.yaml`), migré des tables de la fiche sans rien changer au
  fond (aller-retour identique au caractère près) ; `pnpm registre:generer`
  et `registre:verifier` (rend permanent le script du 30/09 sur les codes
  cités).
- Phase 2 : le calendrier juridique (`moteur/src/temps/`) : jours fériés
  (Alsace-Moselle en option), délais en jours, mois, années avec jours non
  comptés et report, heures réelles au changement d'heure, validité d'un
  titre sur une vacation (`partielle` quand il expire pendant la nuit : le
  moteur ne tranche pas, la règle le fait par ses lectures). Tests tirés de
  CPC 640-642, CMR 30 et L133-3 (le dimanche sous ses deux lectures).
  **Appris** : « trois mois avant » n'est pas « J-90 » (le 31/01 donne le
  31/10 contre le 02/11) ; la fiche sécurité écrit J-90 dans T-16, T-16b et
  `methode/archetypes.md`. Jours fériés (C. trav. L3133-1, L3134-13) codés
  sans relecture mot à mot : à la prochaine vérification.
- Phase 3 : le paquet `metiers/securite-privee/code` (modèle canonique,
  notions, contrôles I-01, I-02, I-03, I-04, I-05 en partie, I-20) ; le
  moteur plafonne chaque verdict par le statut de sa règle, échoue fermé si
  un contrôle lève, et décide une règle ⚠ par sa lecture de référence. Les
  scénarios T-xx portent leurs données (`cas`) et se rejouent dans les tests
  et dans `registre:verifier`. I-17 passe en phase 4 (Veiller), I-19 reste
  hors périmètre (paie). I-05 ne couvre pas encore l'amplitude, les 48 h par
  semaine, les 46 h sur 12 semaines ni le repos après 48 h : c'est affiché à
  chaque vérification.
- Relecture à la source du 2026-10-05
  (`metiers/securite-privee/verification-2026-10-05.md`), reportée dans le
  registre et la fiche : R631-15 en vigueur depuis le 01/10/2026, téléservice
  = **Dracar Ultimate** (sans API) ; I-02 relu (chaîne R631-15, R612-16,
  R612-18, L612-20 ; le SSIAP n'est pas une activité de carte) ; I-03 =
  R612-18 ; **I-12 réécrit** : le mémento est général et s'émarge à chaque
  modification, les consignes de site ne s'émargent par aucun texte lu ;
  Cass. soc. 16/09/2026 (n° 25-12.634) : sans carte ni récépissé, licenciement
  fondé, mais le MAC est à la charge de l'employeur (dommages et intérêts).
  T-13, T-16, T-16b et `archetypes.md` corrigés (« 3 mois », pas « J-90 »).
  **Appris** : la relecture a trouvé une règle fausse (I-12) dans une ligne
  qui n'était pas marquée ✓ — c'est exactement ce que le plafond de verdict
  par statut protège.

## Fait (2026-10-06)

- **Phase 4, premier jalon** : `pnpm veiller --client exemples/client-fictif`
  lit trois CSV, contrôle le planning (I-01 à I-05, I-20), calcule les
  échéances d'I-17 (dépôt du renouvellement 3 mois avant, MAC à organiser
  avant, recyclages SSIAP et secourisme, habilitation électrique, date
  inconnue = alerte), écrit son journal (SQLite, ajout seul tenu par des
  déclencheurs) et rend un rapport en cinq parties. Sur l'entreprise
  fictive, il trouve exactement les 12 constats et 7 échéances posés exprès
  (`attendu.yaml`, écrit à la main ; le test échoue si on en retire un).
  **Appris** : (1) un constat conforme qui porte une note ne doit pas
  disparaître du rapport, sinon la décision « on signale les autres textes »
  reste lettre morte ; (2) les motifs des contrôles parlaient au fabricant
  (« question pour le juriste », « non relu », « G-02 ») : un rapport client
  ne dit que ce que l'exploitation peut faire, les questions juridiques
  restent ici et dans la fiche ; (3) Veiller n'a pas besoin de machine à
  états tant qu'il n'y a pas de cycle de vie d'alerte.
- **Principe KISS** (Lionel, 2026-10-06) : éviter l'over-engineering tant
  qu'on peut, sans jamais sacrifier la qualité finale. Ménage du jour : le
  champ `levee` (piste B) et le détail des verdicts par lecture dans un
  constat, écrits mais jamais lus, sont retirés ; les scénarios ne se
  rejouent plus qu'à un endroit (les tests du métier) ; les fenêtres
  d'alerte des scénarios sont lues dans la config du client fictif, plus
  recopiées.
- **La démo du premier rendez-vous** : le rapport mis en page en A4
  (`pnpm rapport:html`, imprimé en PDF depuis un navigateur), et son déroulé
  dans `prospection.md`. Principe : la démonstration vient après les trois
  questions, et chaque partie du rapport amène une question dont la config a
  besoin (politique de repos, fenêtres d'alerte, qui décide, format du
  tableur, format de livraison). Vaut pour tout métier : le rapport Veiller
  sur données fictives sert de questionnaire. Le format de livraison chez un
  client reste à choisir avec lui : rien de plus n'est construit d'ici là.
- **Rapport lisible par un dirigeant** (préparation de la démo) : chaque
  interdit porte un nom court (`nom` dans `regles.yaml`) que le rapport
  affiche à la place du code, rejeté en fin de ligne ; le repos conforme dit
  ce qu'il a mesuré, et la note dit « minimum de 12 h, que ce repos n'atteint
  pas » au lieu de « non respecté » à côté de « conforme ». Le client fictif a
  des noms d'agents, de postes et de sites : noms inventés, d'origines et de
  genres mêlés, erreurs réparties sans lien avec l'origine
  (`exemples/client-fictif/config.yaml`).
- **L3131-1 relu** (`verification-2026-10-06.md`). **Appris** : la loi
  renvoie elle-même à la branche (L3131-2, D3131-4, 2° : la surveillance est
  nommée ; plancher de 9 h, D3131-6). Les 10 h de la CCN 7.01 au passage de
  nuit à jour sont peut-être une dérogation valide, pas une lecture
  concurrente : question au juriste, le moteur ne change pas avant.
- **Étape 5, le remplacement** : `pnpm remplacer` retrouve la vacation de
  l'absent, passe chaque agent aux contrôles de la veille sur un planning
  hypothétique, classe les possibles selon les préférences du patron, montre
  les exclus et les écartés avec leurs motifs, prend la validation (ou un
  autre choix, gardé au journal), demande l'accord de l'agent, puis écrit le
  planning avec la clé. La délégation valide seule dans son cadre, rend la
  main hors cadre, et se propose après un premier succès. Sur le client
  fictif : 4 possibles, 4 exclus, 4 écartés, exactement comme
  `attendu-remplacement.yaml` écrit à la main. **Appris** : le tableau du
  minisite disait « agents incendie exclus, sans carte » ; le moteur les dit
  « écartés, carte non renseignée ». Une cellule vide n'est pas une absence
  de carte (G-02) : le code a corrigé la page.
- À demander au premier client : les fenêtres d'alerte et de préparation de
  chaque échéance (exemple : MAC prévenu 2 mois avant le dépôt, escaladé à
  moins d'un mois), et son vrai tableur.

## Fait (2026-10-07)

- **Quatre dépôts examinés comme briques, tous écartés** (EvoOntology,
  OpenHarness, Reflexio, SoL-Pi) : chez les trois premiers, le modèle apprend
  puis réécrit ce qu'il a appris sans validation humaine préalable, la raison
  qui a écarté Hermes ; SoL-Pi est une extension d'agent de code (Pi).
  **Retenu** de SoL-Pi : la forme de son réducteur de journaux (un fait connu
  du code contraint la sortie du modèle, une alarme contre l'omission, échec
  fermé), devenue le contrôle « pas un chiffre hors des données » du plan.
- **La page « Parler à l'outil »** du mini-site « Le harnais en clair » (trois
  pages, navigation commune) : l'expérience en cinq demandes, les trois
  espaces, le mécanisme, les neuf sécurités, ce que ça ouvre par métier, le
  coût, ce qui existe et ce qui reste, à trancher. Lionel l'a acceptée.
- `PLAN-ESPACES.md` : huit lots, écrits pour une exécution par Opus 5.5 sans
  décision à prendre ; remplace la phase 6 de `PLAN.md`.
- **Appris** : la conversation n'est pas le produit, c'est une porte ; la
  valeur du premier jalon est que le moteur parle en premier. Et « sur
  mesure » ne veut pas dire du code écrit pour un client : c'est sa couche
  (politique, connecteurs, savoir tacite, délégations) sur un moteur commun.

---

## Fait (2026-10-08)

- **`PLAN-ESPACES.md` exécuté en entier** (lots 0 à 7, Opus 5.5, une
  session, des sous-agents en parallèle) : la conversation (une consigne →
  un geste de la liste fermée, ce qui écrit attend un « oui »), l'échappée
  (le modèle sur une copie SQLite en lecture seule, ses chiffres contrôlés,
  ses propositions passées aux règles), la réaffectation groupée (clé sur la
  liste exacte, accord de chaque agent qui reçoit), la promotion (ce qui
  revient trois fois en 30 jours reçoit un dossier pour l'atelier), les
  évals (65 cas écrits à la main, contrôles en code, aucun juge), et
  l'interface du patron. Branches `espaces/*`, non fusionnées. **Rien n'a
  encore parlé au vrai modèle** (pas de clé) : tout est vérifié en simulé.
  **Appris** :
  1. **Le minimum de données vaut pour ce qu'on montre, pas seulement pour
     ce qu'on lit.** La copie d'un agent ne contenait que ses données, mais
     le texte rendu après sa déclaration d'absence était celui du patron :
     les remplaçants, leurs heures, les titres expirés des collègues. D4 doit
     se vérifier sur chaque texte rendu à un rôle, pas seulement sur ses
     entrées.
  2. **La liberté de l'échappée éprouve le moteur plus fort que les gestes.**
     Un refus déjà présent sur une vacation masquait le même refus chez le
     nouvel agent (comparaison avant/après par règle et vacation). Le défaut
     existait depuis la phase 5 dans le remplacement (Moussa, carte expirée,
     « possible » pour la vacation de Sophie, carte expirée), invisible tant
     que les candidats venaient d'un classement ; une proposition libre l'a
     rendu évident.
  3. **La clé doit porter tout ce que la personne a vu** : poste, horaires,
     et aussi qui tient la vacation au moment du « oui ». Sinon une vacation
     qui change de main entre la validation et l'écriture s'écrit quand même.
  4. **Une borne de temps sur du code natif se tient par un processus, pas
     par un fil** : `worker.terminate()` n'interrompt pas une boucle SQLite ;
     seul le système tue une requête sans fin.
  5. **Le contrôle des chiffres prouve une présence, pas une origine** : il
     arrête l'invention grossière ; la mauvaise foi (une requête de
     constantes) et la coïncidence (un « 9 » dans « A-9 ») restent aux évals.
  6. **Écrire les étiquettes à la main depuis les CSV trouve les
     incohérences du plan** : la phrase de démo « laisse à Karim son
     mercredi » ne correspond à aucune vacation à venir.
  7. **Une relecture indépendante après coup a trouvé douze défauts**, dont
     trois graves, dans un code dont chaque lot passait ses tests. À garder
     comme étape de tout chantier, avant la clôture.

- **`PLAN-IDENTITE.md` exécuté** (lots 1 et 2, Opus 5.5, une session ; le
  plan est retiré du dépôt une fois consigné ici et dans `HANDOFF.md`).
  Choix faits dans le silence du plan, à relire par Lionel : un **homonyme
  exact** (deux « Aïcha ») va droit à la question, sans second appel — le
  modèle n'a rien de plus que l'humain pour trancher ; un **agent** qui nomme
  quelqu'un d'autre que lui reçoit « Tu ne peux désigner que toi-même »,
  sans liste (D4 : rien à lui apprendre) ; une **question en attente**
  appartient à qui elle a été posée (une autre personne dans la même
  conversation ne la ferme pas) ; les deux lectures de l'interface sont des
  `POST` (un `GET` portant l'identité dans l'adresse écrirait des refus au
  journal depuis n'importe quel site) ; le registre est **relu à chaque
  requête** (retirer quelqu'un vaut tout de suite) ; l'effort du second appel
  est celui de la traduction (pas de réglage de plus). **Appris** :
  1. **Ce qu'on envoie au fournisseur se mesure dans un test**, pas dans une
     intention : le test lit le système et les outils du modèle simulé et y
     cherche chaque prénom, nom, poste et site du client fictif.
  2. **Un test qui joue un intrus dans la même conversation a trouvé un vrai
     défaut** : la question posée au patron se fermait dès qu'un autre
     parlait. L'état d'une conversation se lit par personne.
  3. **« Montrer le nom complet résolu » se vérifie geste par geste** : le
     planning vide d'un agent ne disait pas qui l'outil avait compris ; il le
     dit maintenant (« Aucune vacation pour Laura Petit. »).

## Fait (2026-10-09)

- **Trois écarts code/discours, trouvés en remettant le mini-site à jour.**
  (1) La traduction gardait le premier appel d'outil quand le modèle en
  rendait plusieurs : c'est maintenant `inconnue`, et `aucun` pour
  `designer` (aucune trace GLM n'en montrait en traduction ; l'échappée en
  reçoit souvent et les traite tous). (2) « Un outil par tour » est demandé
  au fournisseur, pas tenu : GMI l'ignore. (3) Le plafond du mois se vérifie
  une fois par consigne, à la porte, comme le prévoit le plan : une
  consigne admise va à son terme, le dépassement est d'une consigne au plus.
  Revérifier avant `designer` (l'appel le moins cher) a été écarté : une
  relecture du journal entier pour quelques millièmes de dollar.
- **Passes 3 et 4 sur GLM** (`evals/erreurs-2026-10-08.md`) : la passe 3
  a donné traduction 93 % et échappée 57 % (régression : le modèle finissait
  par du texte, sans appeler `repondre`, à cause de « Réponds court »). Trois
  corrections (la fin par un appel d'outil, jamais par du texte ; le nombre de
  lignes d'un résultat comme source ; `"null"` écrit en texte relu comme
  `null`), puis passe 4 : **traduction 58/60 (97 %, seuil atteint), échappée
  11/14 (79 %, seuil 80 %)**. Les trois écarts restants : E-02 et E-10, le
  modèle finit encore par du texte (réponse juste, « 16 h ») ; E-04, il
  additionne deux comptes de tête (« 19 au total »), le contrôle retire le
  résumé. **Passes 5 et 6, même harnais** (Fable 5.1) : 13/14 puis 11/14,
  soit **35/42 (83 %) sur trois passes**, deux sur trois sous le seuil. Dans
  les sept écarts, **la réponse du modèle était juste à chaque fois** ; ce qui
  échoue : finir par du texte au lieu de `repondre` (3), recopier les bornes
  de semaine qu'il a calculées (2) ou l'année du jour (1), que le contrôle ne
  tient pas pour des sources, une somme de tête attrapée (1). Deux pistes
  déterministes **faites le soir même** (relancer une fois ; la date du jour
  et les bornes de la semaine citables comme dates et par leur année, pas
  comme nombres), puis **passes 7 à 9 : 11, 14, 11 sur 14 (36/42, 86 %)**.
  Les deux catégories visées ont disparu sur 42 cas ; une ancienne revient
  (4 écarts) : la réflexion de GLM avant `proposer` tronquée par un plafond
  de **4 096 tokens par appel codé en dur** dans `boucle.ts`, même famille
  que N-6 (1 024 en traduction). Plafond retiré dans la foulée : **passes 10
  à 12 : 14, 14, 13 sur 14 = 41/42 (98 %), trois passes au-dessus du
  seuil**. Un seul écart : « le plus petit total » pris pour une mention de
  Laura Petit (catégorie nouvelle, vue une fois, piste notée, non faite).
  **Appris** : avec
  14 cas, un cas vaut 7 points ; on ne conclut qu'après trois passes
  (0,45 $) ; un contrôle « pas un chiffre hors des données » doit compter
  parmi ses sources ce que le harnais lui-même a dit au modèle ; et chaque
  plafond « pensé pour Claude » laissé dans le code finit par tronquer un
  autre modèle — un plafond vit dans la config.
- **`PLAN-PROMOTION.md` écrit** (Fable 5.1) : un geste appris est une
  **donnée** (YAML : paramètres typés d'une liste fermée, SQL paramétré sur la
  copie du rôle, gabarit rendu par le code), jamais du code ; aucun appel au
  modèle à l'exécution ; fabriqué par le modèle en un appel, vérifié en code
  par **rejeu sur l'instantané** de la copie que l'échappée a vu, activé par
  un humain avec une clé sur l'empreinte du fichier ; lecture seule jusqu'à
  une décision de Lionel sur l'écriture (lot 4). Quatorze décisions (P1 à
  P14), quatre lots, les mesures à faire avant de déclarer fini.

## Fait (2026-10-10)

**L'article « Codemode » d'Armin Ronacher** (lucumr.pocoo.org, 2026-10-06 :
le modèle écrit un script JS qui enchaîne des appels d'outils, exécuté dans
un bac à sable du harnais), lu à la demande de Lionel, un avis d'Opus 5.5
puis un contre-avis de Fable 5.1, vérifié dans le code.

- **Ce qu'il confirme** : cerveau et mains séparés (notre copie en lecture
  seule dans un processus enfant) ; « sonder cinq ou dix éléments, puis
  écrire le script » = l'échappée puis la promotion, la nôtre en plus
  testée, scellée par une clé et activée par un humain ; son « Starlark
  plutôt que JS » = P1 poussé au bout (un geste appris est une donnée).
- **Une idée fausse écartée** : « la liste des gestes qui grossit fait
  baisser la traduction ». La traduction choisit parmi les gestes codés et
  les onze intentions **écrites à la main** (`INTENTIONS`), sinon un mot-clé
  libre qui varie et n'atteint pas le seuil ; P14 échange l'intention contre
  le geste : le nombre de choix ne bouge pas. Ce qui change après une
  promotion, c'est la tâche (extraire des paramètres typés), et le critère 6
  du plan le mesure déjà. Le souci d'échelle de l'article (plusieurs serveurs
  d'outils) ne nous concerne pas.
- **La promotion est bornée au catalogue déclaré** (P15) : six intentions
  sur onze sont des lectures simples promouvables aux lots 0 à 3 ; trois
  écrivent (lot 4) ; deux simulations demandent les règles, pas une
  requête. Le discours doit dire « le harnais fabrique un geste pour une
  demande du catalogue qui revient ; le catalogue, c'est l'agence qui
  l'écrit », pas « apprentissage ».
- **« Codemode dans Codemode » = le lot 2** : du SQL avec ses guillemets
  dans du JSON d'appel d'outil, sous un schéma `strict` que GLM ignore ; le
  double échappement est ce qui perd les modèles moyens. D'où la relance
  (P5) et une mesure à part des échecs de forme (§ 8).
- **Le compromis sécurité ↔ couverture est le nôtre** (sa tension
  Starlark/JS) : P11 et P12 refuseront de promouvoir une partie des
  demandes ; l'indicateur qui tranche est le **taux de promotion**, ajouté
  au § 8. Un type de plus ne s'ajoute qu'avec ce chiffre.
- **Ce qu'on ne prend pas** : laisser l'échappée écrire du JS pour faire
  moins de tours (petits modèles ; surtout, personne ne relira du JS généré
  dans une annexe de devis ; D10 ne contrôlerait plus les chiffres) ; la
  durabilité (une échappée est en lecture seule, idempotente, 0,01 $ : on la
  refait) ; la concurrence (une copie, une requête à la fois).
- Au passage : `PLAN-PROMOTION.md` § 6.1 disait encore `maxTokens: 4096`
  pour la fabrication, contre la décision du 2026-10-09 (jamais de plafond
  par appel en dur) ; corrigé dans le plan avant d'être codé.
