# Réflexions en cours

Où en est la réflexion sur le système lui-même : ce qui est décidé, ce qui est
fait, les pistes ouvertes et les questions à trancher. Ce n'est ni une fiche ni
une règle : c'est le fil d'une discussion entre Lionel et Claude, à reprendre à
chaque séance. Une piste réalisée passe dans « Fait », avec le fichier qui la
porte. Une idée abandonnée se barre et dit pourquoi, elle ne s'efface pas.

Dernière mise à jour : 2026-10-08.

---

## Le but

Avoir le meilleur jeu de harnais métiers possible, et monter en abstraction
pour couvrir d'autres verticales du même genre sans tout refaire. On part des
quatre cas d'usage des pages du site (sécurité privée, transport et
logistique, bureaux d'études, avocats d'affaires) pour séparer le général du
spécifique.

## Décidé

| Date | Décision | Où |
|---|---|---|
| 2026-09-30 | Structure : `methode/` (socle et archétypes) + par métier une fiche qui fait foi et trois vues pour le terrain (`prospection.md`, `entretien.md`, `observation.md`). `guide-entretien.md` retiré. | README, GRILLE |
| 2026-09-30 | Avocats d'affaires : **prescripteurs + démonstration d'Attendu**, pas une cible d'appels (confirme l'arbitrage du 2026-09-22). Renforcé par le RIN 11.3 : un apport d'affaires ne se rémunère pas. | `metiers/avocats-affaires/` |
| 2026-09-30 | Transport : viser le **commissionnaire-affréteur (52.29B)**, puis le transporteur routier. | `metiers/transport-logistique/fiche.md` |
| 2026-09-30 | **Veiller** (échéances, délais, versions) est le premier pilote par défaut dans chaque métier. | `methode/archetypes.md` |
| 2026-10-04 | **Jev (TypeSafe AI, « System One ») : possible, pas souhaitable aujourd'hui.** Un modèle de décision typée (Choice, Score, Noul avec probabilité calibrée, pas de texte, pas d'extraction libre) ne remplace ni extraire ni rédiger. Sa place : le tri à l'entrée et les vérifications subjectives, toujours comme `à vérifier`, jamais comme verdict — un interdit reste du code. Réserves : accès anticipé (sept. 2026), hébergement et rétention non publiés (CLOUD Act), français non documenté, calibration garantie en moyenne seulement. Décision : le moteur expose `classer(etat, choix)` et `douter(etat, question)`, implémentés avec le LLM ; Jev se branche derrière le jour où un client a du volume, où TypeSafe publie hébergement et rétention, et où sa calibration est mesurée sur nos traces en français. | piste A |
| 2026-10-04 | **Le coût d'inférence du client est une contrainte produit de premier rang.** On vend à des TPE/PME : la facture mensuelle de modèle ne doit pas gonfler feature après feature. Conséquences : (1) chaque feature annonce son coût d'inférence par unité (par message, par document, par jour) et son plafond mensuel avant d'être construite ; (2) le code d'abord — le modèle ne touche que ce que le code ne sait pas faire, jamais un agent en boucle, jamais une relecture du tout à chaque tour ; (3) en cascade : filtre déterministe → classifieur bon marché → LLM seulement sur ce qui reste ; (4) le moteur journalise chaque appel avec ses tokens et son coût, et le compteur par client est une alerte Veiller comme une autre. | piste A, [E] (annexe du devis) |
| 2026-10-03 | **Le schéma du site se génère depuis la fiche** (piste G) : une seule liste de règles par métier, dont découlent les vues terrain, la figure de `smart-tailor` et le code du moteur. Jusque-là, la copie actuelle reste à la main et se relit à chaque changement de fiche. | piste G |
| 2026-10-05 | **On construit le moteur, la sécurité privée comme premier cas**, dans l'ordre de `presentation/` § 10 : Veiller sans modèle, puis le désistement (machine à états, délégation, jeton), puis le modèle aux bords. Code dans ce dépôt, une couche par dossier ; TypeScript, pnpm, zod, Biome, Vitest (cohérence avec Attendu). | `PLAN.md` |
| 2026-10-05 | **Le statut d'une règle borne son verdict, appliqué par le moteur** : `texte` ✓ peut refuser ; `texte` sans ✓ rend au plus `à vérifier` ; `hypothèse` ne devient pas un contrôle. ~~Une règle ⚠ porte plusieurs **lectures** : `refus` si toutes concluent à la violation, `à vérifier` si une seule (repos de 8 h : refus ; de 11 h 30 : à vérifier).~~ Abandonné le même jour par Lionel : on se fie à la loi générale, on signale les autres textes, et la politique du client tranchera au premier rendez-vous (ligne suivante). | `PLAN.md`, piste A |
| 2026-10-05 | **Une règle ⚠ a une lecture de référence, qui décide seule du verdict** : par défaut la loi générale (Code du travail). Les autres textes sont des lectures signalées : quand l'une conclut autrement, le constat porte une note (« l'accord du 18/05/1993 prévoit 12 h ») et le verdict ne change pas. Plus tard, la config client pourra désigner une autre référence : c'est sa politique, recueillie au premier rendez-vous. I-05, repos : référence = 11 h (L3131-1) ; 8 h → refus ; 11 h 30 → ok, avec note de l'accord de 1993 ; 10 h 30 au passage de nuit à jour → refus, avec note de la CCN 7.01. | `moteur/src/regles/verdict.ts`, `regles.yaml` (I-05) |
| 2026-10-05 | **Piste G réduite au registre** : on ne génère pas le corps d'une fonction depuis de la prose. Les rubriques 1, 2, 4 vivent dans `regles.yaml` et `scenarios/`, la fiche en est régénérée, et une vérification relie interdit ↔ test ↔ (bientôt) implémentation. Le reste de G (vues terrain, `harness.ts`) attend. | `moteur/src/regles/`, `GRILLE.md` |
| 2026-10-05 | **La veille des textes appartient au fabricant, jamais au client.** Les textes d'où viennent les règles sont relus une fois par mois ; si un changement touche le harnais, c'est l'ingénieur du harnais (Lionel) qui est prévenu et qui décide de la mise à jour. Le client (le gérant) n'en voit rien : un doute né d'une relecture ne doit pas l'atteindre. Conséquence dans le code : l'âge d'une relecture ne baisse plus jamais un verdict (`plafond` ne dépend que du statut) ; une relecture de plus d'un mois est une alerte « veille en retard » pour l'ingénieur (`registre:verifier`). | `moteur/src/regles/veille.ts`, piste F |
| 2026-10-05 | **Un canal entre chaque harnais livré et le fabricant** (Telegram, par exemple) pour les notifications qui concernent l'ingénieur : texte changé, veille en retard, panne d'un connecteur, contrôle qui a échoué. Sortant seulement (le harnais parle, il n'obéit pas à ce canal), écrit par nous au-dessus de l'API du service (décision du 03/10), et **sans aucune donnée du client** dans les messages : identifiants de règle, codes d'erreur, comptages. Un message Telegram n'est pas chiffré de bout en bout et passe par un tiers (G-06, G-07). | piste F, `PLAN.md` phase 7 |
| 2026-10-06 | **La confiance se délègue, décision par décision** (Lionel). Trois niveaux : le harnais lit et signale ; il propose et le patron valide chaque décision (la validation est la clé d'écriture) ; il agit seul dans un cadre écrit par le patron. Dès qu'un type de décision a réussi au moins une fois en validation, le harnais propose au patron de l'automatiser ; s'il accepte, ce type de décision devient automatique, révocable, et chaque exécution est journalisée. G-01 est réécrite en conséquence. Une délégation ne lève jamais un interdit, et ne remplace pas l'accord exigé d'un tiers (l'accord exprès de l'agent sous 48 h, I-06). Conformité vérifiée le même jour (`methode/verification-2026-10-06.md`) : le « oui » du remplaçant ne suffit pas ; le niveau 2 tient si la validation est réelle (le patron voit tous les candidats et peut en choisir un autre) ; le niveau 3 sur une décision qui choisit entre des personnes passe par le juriste avant d'être proposé ; à la mise en service, informer les agents (L1222-4, RGPD art. 13) et, à partir de 50 salariés, le CSE. | `methode/socle.md` G-01 |
| 2026-10-06 | **L'interface du patron : web, puis conversation** (Lionel ; cadre proposé par Claude). Le patron pilote par une interface web (ce qui attend sa décision, les règles en vigueur, les délégations, le journal) et, ensuite, par une conversation. **L'IA traduit, le code décide** : une consigne devient une demande de la liste d'actions, reformulée au patron, vérifiée et exécutée par le moteur ; le modèle n'a aucun accès direct aux outils. Canal du patron séparé de celui des agents. L'étape 6 du plan change de nom et de place. | `PLAN.md` phases 5 et 6 |
| 2026-10-06 | **Rigide là où une erreur coûte, réglable ailleurs, sans sur-construire** (Lionel). Les interdits ne se règlent pas (code, tests, fabricant seul). Le patron règle sa politique, ses fenêtres d'alerte, ses préférences de classement et ses délégations, parmi des réglages prévus. Une seule source par chose : registre, config client, journal ; les interfaces n'ont pas de logique à elles. | `PLAN.md`, « Décisions » |
| 2026-10-05 | Écriture : **identité d'écriture du moteur + jeton par défaut**, le compte de l'humain qui approuve en option de config client. Pas de solveur avant B-01 : le désistement se résout par filtre puis classement. | `PLAN.md` |
| 2026-10-03 | **Le moteur ne dépend d'aucun framework d'agent** : il s'expose en outils (MCP/API) avec ses tests ; la coque autour (agent, messagerie) est interchangeable. ~~Hermes Agent (Nous Research) comme base~~ : refusé — sa thèse (skills auto-réécrites, mémoire curée par l'agent, accès terminal central) est l'inverse d'un interdit auditable, et il n'a ni moteur de règles ni tests d'acceptation. Si un client a besoin d'un lien vers une messagerie, **on écrit le connecteur nous-mêmes** : moins de surface, pas de dépendance à un projet de labo. | piste A |
| 2026-10-07 | **Les trois espaces** (Lionel : « on va construire tout ça ensemble »). Toute demande au harnais tombe dans l'un de trois espaces : (1) **les gestes du quotidien**, une liste fermée d'actions codées et testées, que le modèle ne fait que choisir (il traduit la consigne en un geste, le code reformule et exécute) ; (2) **les demandes nouvelles**, l'échappée : le modèle travaille librement sur une **copie** des données à l'échelle du rôle, ses calculs sont des requêtes SQL en lecture seule, son résultat passe **tous** les contrôles, le patron voit ce qui change et son oui écrit par la clé ; on ne contrôle pas le chemin, on contrôle ce que l'IA voit, ce qu'elle rend et comment elle finit ; (3) **la promotion** : une demande nouvelle qui revient (3 fois en 30 jours) est proposée pour devenir un geste, codé à l'atelier avec ses tests, jamais par le harnais lui-même. Neuf sécurités qui ne se règlent pas (l'IA n'a pas les clés ; les interdits ne se lèvent pas ; tout résultat passe les règles ; une demande nouvelle ne se délègue jamais ; pas un chiffre ni un nom hors des données ; une demande finit toujours clairement ; un plafond par demande ; les données ne sont jamais des consignes ; tout au journal). Page du mini-site « Parler à l'outil » (artefact « Le harnais en clair »). | `PLAN-ESPACES.md` |
| 2026-10-07 | **Lionel délègue les choix de conception à Claude**, qui les tranche et dit pourquoi ; le plan doit être exécutable par un modèle moins profond (Opus 5.5) sans décision à prendre. Tranché : l'échappée dès maintenant sur l'entreprise inventée ; la mise à jour à distance reste à Lionel ; seuil de promotion 3 occurrences / 30 jours ; rôles de la démo `patron` et `agent` (quatre gestes pour un agent, jamais les données d'un autre) ; aucun framework d'agent, une boucle maison sur le SDK officiel, un seul modèle (`claude-opus-5-5`, effort par usage), pas de repli automatique ; une modification = une réaffectation ; une proposition s'écrit par une réaffectation groupée avec l'accord de chaque agent ; Hono pour l'interface ; les évals hors de `pnpm check`. | `PLAN-ESPACES.md` § 2 |
| 2026-10-08 | **Le métier fournit un vocabulaire d'intentions connues, montré au modèle** (Lionel, sur les passes GLM). La promotion compte par mot-clé exact, et un modèle sans vocabulaire rend un mot différent d'une fois sur l'autre pour la même demande : la liste devinée des évals ne mesurait rien. `INTENTIONS` dans le métier, « réutilise l'une d'elles quand elle convient, sinon un mot nouveau » dans le système ; les étiquettes des évals se prennent dans cette liste. Une intention promue en geste en sort. | `metiers/securite-privee/code/src/conversation.ts`, `evals/erreurs-2026-10-08.md` |
| 2026-10-08 | **Une donnée qui ressemble à une consigne se signale sans la recopier** (Lionel). Traiter le piège comme une donnée est la sécurité n° 8 ; ne pas le relayer mot pour mot au patron en est la suite : un texte qui vise l'humain (« appelez ce numéro ») arriverait sinon avec la voix du harnais. Phrase du système de l'échappée ; l'étiquette des cas piégés reste stricte. | `moteur/src/echappee/echappee.ts` |
| 2026-10-08 | **GLM-5.3 chez GMI Cloud est le modèle de référence jusqu'à nouvel ordre, et le laboratoire passe avant le terrain** (Lionel). Pas de passe Claude « avant un bon moment » ; pas de nouvelle clé ni de révocation pour l'instant. On avance sur les données fictives, en veillant à ce qu'elles restent pertinentes et cohérentes, jusqu'à un produit correct, fonctionnel et efficient — pour démarcher sereinement, et pour que Lionel comprenne lui-même la proposition et les enjeux techniques. Conséquence : la config du client fictif désigne GLM (`acces`, prix GMI, plafonds relevés) ; les branches `espaces/*` sont fusionnées dans `main`. | `exemples/client-fictif/config.yaml`, `HANDOFF.md` |
| 2026-10-08 | **« Libère le mercredi de Sophie » : deux lectures acceptées** (Lionel) — la demande nouvelle, ou le geste `gerer_absence`, qui libère aussi la journée sous validation. « Libérer » vaut-il « absente » dans le métier : question pour le premier patron réel, pas pour le client fictif. | `evals/consignes.yaml` (N-4) |

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

## Ce que le croisement des quatre métiers a appris

1. **Le général vit à deux étages, pas dans une liste de types de règles.**
   Au-dessus : des règles communes à tout outil (G-01 à G-07). En dessous : des
   sortes de travail (les archétypes), que chaque métier combine à sa façon.
   Le premier tableau de « primitives » (titre valide, plafonds de temps…) ne
   décrivait que l'archétype Planifier : il venait de deux métiers qui se
   ressemblent.
2. **Le temps est la mécanique commune la plus importante.** « Valide à une
   date » et « calculer un délai » reviennent dans les quatre métiers ; seuls
   les paramètres changent. C'est le premier composant du moteur.
3. **Un fait commun se vérifie une fois.** Deux recherches se contredisaient
   sur l'article 4 de l'AI Act (réécrit par 2026/1744) : `socle.md` § 3 fait
   foi.
4. **Un corpus est une décision juridique avant d'être technique.** AFNOR
   s'oppose à ce qu'une IA lise ses normes : pour les bureaux d'études,
   l'archétype Chercher se réduit à un registre des références.
5. **Le prescripteur commun à tous les métiers est l'expert-comptable**, et
   la facture électronique (réception depuis le 01/09/2026, émission des PME
   au 01/09/2027) est son sujet.
6. **Pour un 5ᵉ métier**, on choisit ses archétypes et on n'écrit que ce qui
   lui est propre : textes, qui signe, vocabulaire, données, ordre de
   sacrifice. Environ 70 % du questionnaire existe déjà (estimation, à
   mesurer).

---

## Les tensions de fond (analyse du 2026-09-29)

1. **Le capital annoncé n'est pas l'avantage durable.** Les interdits tirés des
   textes sont publics et vieillissent. Ce qui distingue l'agence (ordre de
   sacrifice, mots à double sens, incidents) est dans la couche client, et ne
   remonte au métier qu'à la confirmation chez deux clients : le capital
   grossit lentement.
2. **Des interdits binaires face à une exploitation qui déroge.** Un outil qui
   bloque trop se contourne, et l'exploitation retourne au tableur.
3. **L'annexe du devis engage l'agence sur un résultat** (« l'outil ne
   laissera jamais faire X »), avec des données fournies par le client.
4. **« Sur mesure » contredit « capital réutilisable »**, sauf si le sur-mesure
   se réduit à de la configuration.

## Pistes ouvertes

Dans l'ordre proposé. Le code entre crochets reprend celui de la discussion.

**Avant le premier rendez-vous**
- [A] **Coder le moteur à partir de `methode/`**, sans dépendance au modèle :
  le calendrier juridique (validité à une date, délais, jours fériés, report,
  changement d'heure, vacation à cheval sur minuit), puis Veiller. Ne coder
  un composant que s'il sert dans au moins deux métiers. Les tests T-xx des
  fiches servent de jeux de données. Coder oblige à trancher les ambiguïtés
  (carte qui expire pendant une vacation de nuit) : c'est aussi la liste des
  questions pour le juriste.
  **Forme concrète (2026-10-04 et 05).** Un *workflow*, pas un agent : une
  demande est une machine à états (`reçue → extraite → candidats → proposée →
  en attente d'approbation → écrite | escaladée | arrêtée avec motif`), le
  code enchaîne les transitions, le modèle est appelé à deux étapes fixes
  (extraire, rédiger) et ne choisit jamais la suivante. Ce qui est testable
  est du code, y compris le classement des candidats (préférences = poids
  dans la config). Standard pour la plomberie (SDK du fournisseur derrière
  une interface à nous, sorties structurées validées par schéma, MCP, JSON
  Schema, API standard des connecteurs, bibliothèque de contraintes si
  Planifier, SQLite en ajout seul), maison pour le produit (interdits,
  machine à états, schéma de config). Exclus : RAG hors Chercher, essaims
  d'agents, frameworks qui cachent le flux de contrôle.
  **Les contrôles s'accrochent au harnais par moments** (2026-10-05) :
  *pre-tool* (interdits sur les écritures, délégation et jeton
  d'approbation, plafond de coût avant tout appel au modèle), *post-tool*
  (ce qui rentre est typé : date ou `inconnue`, extrait + doute, source —
  G-02, G-03), *pre-response* (formulations interdites, mentions
  obligatoires, aucun chiffre hors des données), *stop* (une demande ne finit
  qu'approuvée-à-demander, escaladée ou arrêtée avec motif). Verdicts : `ok`,
  `refus` (code seul, fermé en cas de crash ou de délai), `à vérifier` (seul
  verdict permis à un modèle). Même contrôle, deux points d'attache : la
  transition de la machine à états aujourd'hui, le hook d'un agent le jour où
  une tâche ouverte le justifie — c'est ce qui fait du moteur un harnais au
  sens strict, en réserve. Structurel avant hook : on retire la capacité
  quand c'est possible (l'écriture exige un jeton), on n'intercepte que ce
  qui ne peut pas l'être. L'unité de travail devient le **contrôle** —
  identifiant, moment, portée, fonction, tests, source du texte — et
  « moment » est une colonne de plus de la fiche structurée (G).
  **Ce que ça confirme** : le « tour » de la figure animée du site (la fiche
  qui passe de point en point, bloquée au test, jaugée au seuil, finie à
  l'approbation) est exactement cette chaîne de contrôles dessinée.
  L'intuition de départ de Lionel — le schéma de smart-tailor — décrivait
  l'architecture avant qu'elle soit formulée ; la méthode la rejoint, elle ne
  la corrige pas.
  **Deux identités chez le fournisseur** (2026-10-05) : le moteur se connecte
  aux systèmes du client (Google Workspace, Microsoft 365) par une identité
  technique aux droits fins (*scopes* : `gmail.readonly` ≠ `gmail.send`,
  `Mail.Read` ≠ `Mail.Send`). Une identité de **lecture** pour tout le
  moteur ; une identité d'**écriture** aux droits minimaux, réservée à l'outil
  d'écriture verrouillé par le jeton d'approbation. Le refus d'écrire vient
  alors du serveur du fournisseur (403), pas de notre code : un bug, une
  injection dans un mail, rien ne peut aboutir. Variante plus forte : l'écriture
  se fait avec le compte de l'humain qui approuve, le moteur n'a aucun droit
  d'écriture. Ces droits se voient dans la console du client, s'auditent et se
  révoquent : G-06 rendu visible, à montrer dans l'annexe du devis (E).
  **Contenir la densité des machines à états** (2026-10-05, inquiétude de
  Lionel) : (1) les trois sorties d'échec — réessayer borné, escalader,
  s'arrêter avec motif — s'écrivent une fois dans le moteur, chaque transition
  ne déclare que son chemin nominal et sa politique ; (2) une petite machine
  par archétype (5 à 8 états), jamais une grosse par métier, une tâche les
  enchaîne (désistement = Rapprocher → Planifier → approbation → écriture) ;
  au-delà d'une douzaine d'états, on coupe ; (3) la table `état × événement →
  état suivant, politique` est une donnée : lisible, diffable, dessinée
  automatiquement, testée par scénarios ; si la hiérarchie devient
  nécessaire, le formalisme standard est le statechart (XState en TS), à
  garder compatible dès le départ ; (4) la complexité est celle du métier,
  déjà faite de tête par la permanence ; visible et corrigeable par le client
  (C) vaut mieux que cachée dans un prompt. Ce qui reste difficile : où
  couper entre archétypes, et tenir les tables à jour — la table de la
  machine doit découler de la fiche structurée (G), comme le schéma du site.
- [B] **Ajouter une colonne « Levée » aux interdits** dans la grille :
  `jamais`, `par <rôle>, avec un motif tracé`, `sous condition`. Suivre le
  nombre de levées par interdit : un interdit souvent levé est mal écrit.
  Candidat : repos de 11 h ou 12 h, bloquer sous 11 h et alerter entre 11 et
  12 h, à soumettre au juriste.
- [D] **Vérifier le sens de la citation, pas seulement son existence.** Donner
  à chaque règle une portée (`dit comme règle`, `tiré d'un incident`, `tiré
  d'une habitude`) ; les deux dernières partent chez le client comme une
  question. Comparer par script les chiffres dits par le client aux seuils de
  la fiche (l'erreur de l'éval 5 : un planning le mercredi pour le lundi).
- **Tester la chaîne avec un vrai enregistrement** : transcription locale
  (whisper.cpp ou équivalent) avec identification des locuteurs, puis le
  skill et `verifier_citations.py`. Le format de sortie d'un vrai outil de
  transcription n'a jamais été essayé.

**Avant le premier devis**
- [C] **Les corrections du client comme capital** : garder, par règle, la
  version proposée et la version corrigée, et classer l'erreur (sur-généralisé,
  portée fausse, oubli, contradiction avec un texte). Le contenu reste dans
  `clients/` ; seuls les comptages par type d'erreur remontent aux évals du
  skill.
- [E] **Annexe du devis au conditionnel**, relue une fois par un avocat :
  « sur les données tenues dans [source], l'outil bloque X », la version datée
  de chaque texte, la responsabilité du client sur ses données.

**Avant l'atelier**
- [G] **Fiche structurée** (YAML par rubrique, identifiants stables) d'où les
  vues se génèrent, et **configuration client** (`clients/<slug>/config.yaml`)
  vérifiée par un schéma tiré de la grille. Le sur-mesure devient une
  configuration plus des connecteurs.
  **Précision du 2026-10-03** : le schéma animé du site
  (`smart-tailor/app/data/harness.ts`, un profil par métier) est une vue de
  plus de la fiche — les mêmes interdits présentés pour convaincre un visiteur
  (qualification = I-01, repos = I-06…). Il a été écrit à part, depuis les
  pages du site, et diverge déjà : il ignore G-02 et G-03 (que le socle dit
  universelles), partage « consolidation » (qui n'est un contrôle nulle part
  dans la méthode), et son profil Commerce ne correspond à aucune fiche.
  Principe retenu : **une seule liste de règles par métier (la fiche), dont
  découlent les vues terrain, le schéma du site et demain le code du moteur**
  — la règle qui bloque dans l'outil doit être celle que le client a lue sur
  le site, entendue en entretien et validée dans l'annexe. Deux listes = une
  règle appliquée que personne n'a vue. **Tranché le 2026-10-03 par Lionel :
  génération depuis la fiche.** `harness.ts` rejoint donc la liste des vues
  que G doit produire, ce qui fixe une contrainte sur le format structuré :
  chaque interdit porte, en plus de son texte, ce que la figure demande — son
  nom court pour le site, sa place dans le tour, s'il porte la jauge (qui
  décide) ou la barrière (test), et les outils lus et écrits par tâche.
- [H] **L'ordre de sacrifice par des choix entre deux plannings** (ou deux
  rapports, deux dossiers) : 6 à 8 paires générées à partir des données
  fictives, au lieu d'une seule anecdote.

**Avant la première livraison**
- [F] **Veille automatique des textes** : chaque ligne `texte` ✓ porte la
  source, l'identifiant de l'article et la date de version ; un script
  interroge Légifrance (API PISTE) et EUR-Lex une fois par mois, et signale
  ce qui a changé **à l'ingénieur du harnais**, par le canal fabricant
  (décisions du 2026-10-05). L'alerte « veille en retard » existe déjà dans
  `registre:verifier`. Il faut un compte sur l'API PISTE au nom de Lionel :
  Légifrance bloque les robots sur ses pages web (vu à la relecture du
  2026-10-05). La FAQ et les actualités du CNAPS n'ont pas d'API : leur
  relecture reste manuelle, rappelée par le canal.
- **Le canal fabricant ne sert qu'à recevoir** (Lionel, 2026-10-05) : le
  harnais livré y envoie ses notifications, il n'y lit aucun ordre.
- **Mettre à jour un harnais livré à distance** : un mécanisme que Lionel
  concevra plus tard, dans une étape de développement **hors du plan
  actuel**. À trancher avant la livraison d'un vrai client : comment une
  mise à jour de règle (après une veille) arrive chez lui, qui l'approuve,
  comment on revient en arrière, et ce que le client en voit. Ce n'est pas
  le canal Telegram : un canal qui reçoit des ordres serait une porte
  d'entrée sur le harnais.

**Hygiène**
- Relire à la source (`texte` ✓) les interdits d'une brique avant de la
  coder : aucune ligne des trois nouvelles fiches ne l'est.
- Relancer les évals du skill après les changements du 2026-09-30, et
  corriger les critères de l'éval 3 (ils contredisaient le skill).
- `clients/` n'est sauvegardé nulle part : une sauvegarde chiffrée et une
  durée de conservation, avant le premier enregistrement (RGPD).
- Les vues se tiennent à jour à la main : si G ne se fait pas, un script qui
  vérifie les codes cités (celui du 2026-09-30 existe déjà en une ligne de
  Python, à rendre permanent).
- Définir « les verticales de ce genre » dans le README, et en faire un
  critère de `reperage`.

## À trancher

**Par Lionel**
- ~~Dans quel ordre attaquer : le moteur (A), ou les appels et le premier
  rendez-vous d'abord ?~~ Tranché le 2026-10-05 : le moteur (`PLAN.md`).
- Le transport frigorifique : un sous-métier du transport, ou une cible à part ?
- `reperage` (`server/scoring/cibles.ts`) décrit les bureaux d'études par la
  « recherche dans les normes » : à corriger dans ce dépôt-là.

**Par un juriste**
- Sécurité : 12 h ou 11 h de repos, une semaine ou 7 jours et 48 h. L'accord
  de 1993 et la CCN sont **étendus**, donc obligatoires pour toute entreprise
  de la branche : la politique du dirigeant dit ce qu'il applique, pas ce
  qui est dû ; le moteur décide aujourd'hui par la loi générale et signale
  les autres textes. Les 10 h de la CCN 7.01 au passage de nuit à jour
  sont-elles une dérogation valide au sens de L3131-2 et D3131-4, 2°
  (plancher de 9 h, repos équivalent en contrepartie) ? Si oui, T-07d refuse
  à tort. Une carte (ou un recyclage) qui expire pendant une
  vacation de nuit : valide « à la date de la vacation » au début, ou sur
  toute sa durée ? (le moteur rend `à vérifier`). Un poste purement SSIAP
  exige-t-il une carte professionnelle ? Le moteur suppose que non, sur le
  référentiel de contrôle du CNAPS (p. 3 : le SSIAP n'est pas une activité
  de surveillance) : à confirmer. Un agent SSIAP d'un niveau supérieur au
  poste (SSIAP 2 sur un poste SSIAP 1) : le moteur rend `à vérifier`, faute
  de texte relu. Un recyclage SSIAP fait après la date limite ne remet pas
  l'agent en règle : la remise à niveau de l'arrêté de 2005 (art. 7) n'est
  pas encore modélisée. Les quatre
  questions du remplacement (le « oui » par SMS, contacter un agent au repos,
  l'appel automatique, classer les agents selon leurs refus).
- Bureaux d'études : la portée de l'opposition d'AFNOR ; un modèle hébergé
  chez le client change-t-il l'analyse de sous-traitance du CCAG-PI ?
- Transport : le dimanche dans « jours fériés non compris » (L133-3) ; le
  point de départ de l'action récursoire.
- Avocats : 10 ans de conservation (guide du CNB) ou 5 ans (C. civ. 2225) ;
  l'agence comme « les services d'un tiers » (RIN 10.3).
- Tous : le prestataire d'IA comme sous-traitant (RGPD 28, RIN 2.3, CCAG-PI
  5.1.3).
- Tous : la délégation qui choisit entre des personnes (remplacement au
  niveau 3) : exception « exécution du contrat » de l'art. 22 §2 a) ? Les
  agents écartés par un classement sont-ils « affectés de manière
  significative » ? Le classement par règles fixes sort-il de l'AI Act
  (considérant 12, lignes directrices §46 contre §39) ? Comment organiser la
  contestation (§3) ? (`methode/verification-2026-10-06.md`)
