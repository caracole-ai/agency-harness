# Avocats d'affaires — fiche métier

Cabinets d'avocats en droit des affaires, de 2 à 30 avocats, barreaux de
Marseille et d'Aix-en-Provence. NAF **69.10Z**.

Remplie selon `../../GRILLE.md`. État au **2026-09-30** : les textes, la
recherche documentaire et le démonstrateur seulement, **aucun entretien client
encore**. Donc rien de `déclaré` ni de `constaté` : toute ligne `hypothèse` est
une question à poser, pas une règle à coder.

**Aucune ligne `texte` ✓** : aucune relecture séparée, mot à mot, n'a encore
été faite au sens de la grille. Les lignes `texte` viennent des faits que la
recherche a lus sur le texte officiel (certitude H). Elles se relisent avant
de coder quoi que ce soit. Les faits de certitude M ou B sont en `hypothèse`.

Sources :
- `recherche-2026-09-29.md`, dans ce dossier : instantané daté, avec les URL
  et un degré de certitude pour chaque fait.
- le démonstrateur `../attendu` (depuis la racine de ce dépôt) :
  `PLAN.md`, `docs/01-corpus-et-graphe.md`, `docs/known-failures.md`.

**La place de ce métier.** Les avocats sont des **prescripteurs**, pas une
cible de prospection (arbitrage du 2026-09-22, confirmé le 2026-09-29) : hors
de la matrice de `../reperage`, suivis à la main. Une prescription ne peut pas
être rémunérée : « La rémunération d'apports d'affaires est interdite » (RIN,
art. 11.3). Le démonstrateur Attendu sert de preuve de sérieux. Cette fiche
sert aussi pour un **cabinet pilote**, s'il se présente.

**Les archétypes combinés** (`../../methode/archetypes.md`) :
- **Chercher**, au cœur : la recherche datée et citée (Attendu) ;
- **Veiller** : les délais de procédure, et les textes cités dans un dossier
  qui changent ;
- **Rédiger** : les notes et projets d'écritures, relus et signés par
  l'avocat ;
- **Rapprocher** : le contrôle de conflit d'intérêts.

Les règles communes à tout outil (G-01 à G-07), la mécanique du temps et les
faits communs (CLOUD Act, AI Act, sous-traitance au sens du RGPD) sont dans
`../../methode/socle.md`. Cette fiche ne les recopie pas : elle ne garde que
ce qui est propre au métier.

⚠ **Le secret suit la donnée.** Consultations, correspondances, notes,
pièces, et même **le nom des clients et l'agenda** sont couverts (loi
71-1130, art. 66-5 ; RIN, art. 2.2). L'avocat répond des violations commises
par « toute personne qui coopère avec lui » (RIN, art. 2.3) : le prestataire
d'IA et l'hébergeur du modèle en font partie. Le CNB dit de ne jamais confier
de données couvertes par le secret à une IA générative (guide de 2024). Sa
grille de juin 2025 exclut les hébergeurs soumis à l'extraterritorialité et
dit que seule l'installation locale élimine le risque. **Conséquence** : un
outil pour ce métier s'installe chez le cabinet ou sur un hébergement européen
à son nom. En entretien, on ne demande jamais « pour quels clients ? ».

⚠ **« Version en vigueur » n'est pas « version applicable ».** Légifrance
affiche par défaut la version d'aujourd'hui. La date qui fixe le droit
applicable varie selon la matière : conclusion du contrat (ordonnance
2016-131, art. 9), introduction de l'instance, déclaration d'appel. C'est le
piège central du métier (socle, § 2).

---

## 0. La chaîne

Aucune source publique ne décrit la chaîne d'un cabinet étape par étape : elle
est reconstruite. Les textes disent ce qui est imposé ; les rôles sont à
vérifier sur place.

| # | Étape | Entrée | Sortie | Qui | Outil aujourd'hui | Statut |
|---|---|---|---|---|---|---|
| 1 | Prise de contact, contrôle de conflit sur toute la structure, au jour de la saisine | demande du client | dossier accepté ou refusé | assistante (recherche), associé (décision) | logiciel de gestion ? | `texte` (RIN 4.1-4.2) ; `hypothèse` (rôles, outil) |
| 2 | Vigilance anti-blanchiment, quand l'activité entre dans CMF L561-3 I | identité du client, nature de l'opération | dossier de vigilance | associé | ? | `texte` (L561-2 13°, L561-3) ; `hypothèse` (rôle) |
| 3 | Convention d'honoraires écrite, sauf urgence, force majeure, aide juridictionnelle | mission | convention signée | associé | ? | `texte` (loi 71-1130, art. 10) |
| 4 | Ouverture du dossier : numéro, parties, adversaires, délais | convention | dossier dans le logiciel | assistante | logiciel de gestion (Secib, Kleos, Diapaz…) | `hypothèse` |
| 5 | Recherche, puis note, projet d'acte ou de conclusions | question, **date des faits**, pièces | note, projet | collaborateur, juriste | bases payantes, Légifrance, Judilibre | `hypothèse` |
| 6 | Relecture par l'associé ; double signature ou visa si le contrat de collaboration le prévoit | projet | écrit validé | associé | ? | `texte` (RIN 14.2.1, possibilité) ; `hypothèse` (usage) |
| 7a | Conseil : envoi de la consultation au client | écrit validé | consultation | associé ou collaborateur | messagerie | `texte` (secret, art. 66-5) |
| 7b | Contentieux : remise des actes par voie électronique, pièces numérotées, bordereau daté et signé | écrit validé, pièces | acte remis | collaborateur, assistante | RPVA, e-Barreau | `texte` (CPC 930-1 ; RIN 5.5) |
| 8 | Suivi des délais : appel, conclusions, prescription | décisions, notifications | délais tenus | assistante et collaborateur ; associé responsable | logiciel de gestion, agenda | `texte` (délais) ; `hypothèse` (rôles) |
| 9 | Facturation, au temps passé ou au forfait, selon la convention | temps, convention | facture | associé, comptabilité | logiciel de gestion | `texte` (RIN 11.1-11.2) |
| 10 | Archivage | dossier clos | archives | cabinet | ? | `texte` ⚠ 10 ans selon le guide LCB-FT du CNB, 5 ans selon C. civ. 2225 : à trancher (Questions ouvertes) |

Passages de main à surveiller (hypothèses) :
- associé → collaborateur : la question et **la date des faits** doivent
  passer avec le dossier ;
- collaborateur → associé : la note doit montrer ses sources ;
- assistante → collaborateur : le délai saisi dans le logiciel doit être le
  bon ;
- cabinet → client ou juridiction : rien ne part sans signature (G-01).

## 1. Interdits

Deux sortes d'interdits ici :
- ceux qu'impose un texte, en `texte` ;
- ceux qui fondent la conception de l'outil (citations, versions,
  abstention), nés de la page du site et d'incidents publiés. Ils restent en
  `hypothèse` tant qu'aucun cabinet ne les a confirmés, mais on ne construit
  pas sans eux.

| ID | Interdit | Étape | Conséquence | Vérifiable par | Statut | Source |
|---|---|---|---|---|---|---|
| I-01 | Aucune donnée couverte par le secret (consultation, correspondance, note, pièce, **nom d'un client**, agenda) ne sort vers un service que le cabinet n'a pas désigné ; les journaux de l'outil n'en contiennent pas hors de l'hébergement du cabinet | toutes | 1 an et 15 000 € (C. pén. 226-13) ; l'avocat répond du prestataire (RIN 2.3) | code (flux sortants, liste des services autorisés) + humain (choix de l'hébergement) | `texte` | loi 71-1130, art. 66-5 ; RIN 2.1-2.3 ; C. pén. 226-13 |
| I-02 | Aucune **référence inexistante** dans un écrit préparé ou vérifié par l'outil | 5, 6 | sanction, frais, renvoi au barreau ; atteinte à la réputation du cabinet | code (chaque citation désigne un paragraphe enregistré) | `hypothèse` (règle de conception, fondée sur des incidents publiés) | Mata v. Avianca, 22/06/2023 ; TA Orléans, 29/12/2025 ; page du site |
| I-03 | Aucune citation d'un passage qui **ne figure pas** dans la décision ou l'article cité, ni d'un **moyen** du pourvoi présenté comme la solution | 5, 6 | même conséquence qu'I-02 | code (l'extrait est une sous-chaîne du paragraphe ; zone de la décision : moyens ou motifs) + humain (le sens) | `hypothèse` (règle de conception) | Ayinde / Al-Haroun, 06/06/2025 ; zones de Judilibre |
| I-04 | Aucune version d'un article **non applicable à la date retenue** ; la date se demande à l'avocat, elle n'est jamais supposée | 5 | raisonnement sur un texte qui ne s'applique pas au litige | code (filtre de version) + humain (choix de la date) | `texte` (droit transitoire) ; `hypothèse` (règle de conception) | ordonnance 2016-131, art. 9 ; Attendu, `docs/01` § 2.3 |
| I-05 | Aucune réponse quand le corpus ne couvre pas la question : l'outil s'abstient et dit pourquoi, en donnant la **borne du corpus** (textes absents, décisions postérieures à la date du dernier chargement) | 5 | réponse plausible et fausse | code | `hypothèse` (règle de conception) | page du site ; Attendu |
| I-06 | Aucun délai de procédure n'atteint sa limite sans une alerte donnée assez tôt pour écrire l'acte : appel (1 mois), conclusions de l'appelant (3 mois, ou 2 mois à bref délai), calculées avec les règles de report et d'allongement | 8 | caducité relevée d'office, que l'ordonnance « ne peut » rapporter ; responsabilité pour perte de chance | code | `texte` | CPC 538, 640-643, 906-2, 908-911 |
| I-07 | Aucun dossier n'est ouvert sans **contrôle de conflit** sur toute la structure (associés, collaborateurs et leurs dossiers personnels, moyens mis en commun), au jour de la saisine, et de nouveau quand la situation évolue | 1 | manquement déontologique | code (rapprochement des noms) + humain (décision, accord écrit des parties) | `texte` | RIN 4.1-4.2 |
| I-08 | Aucun dossier qui relève de CMF L561-3 I (fonds de commerce, sociétés, apports, fiducie, conseil fiscal, transactions) sans trace de la vigilance ; l'outil ne prépare **aucune** déclaration de soupçon, qui passe par le bâtonnier | 2 | manquement LCB-FT | code (trace présente) + humain | `texte` | CMF L561-2 13°, L561-3, L561-17 |
| I-09 | Aucune intervention sans **convention d'honoraires écrite**, sauf urgence, force majeure ou aide juridictionnelle totale, l'exception étant notée ; aucun honoraire fixé seulement au résultat judiciaire | 3 | contrôle de la DGCCRF ; litige d'honoraires | code (convention présente) + humain | `texte` | loi 71-1130, art. 10 et 10-1 |
| I-10 | Aucune correspondance entre avocats **non marquée « officielle »** n'est versée aux pièces ni citée dans un écrit judiciaire | 5, 7b | pièce irrecevable ; manquement | code (mention) + humain | `texte` | RIN 3.1-3.2 |
| I-11 | Aucun écrit de communication du cabinet ne dit « spécialiste » sans certificat, ni ne propose une démarche physique ou téléphonique vers un client | 1 | manquement aux règles de communication | code (lexical) + humain | `texte` | RIN 10.2-10.3 |
| I-12 | L'outil ne sert **qu'aux avocats du cabinet** : aucune réponse juridique produite pour un client ou un tiers sans avocat dans la boucle | toutes | exercice illégal (art. 54 et 66-2, 1 an et 15 000 €) | code (utilisateurs autorisés) | `texte` ; application à l'outil : lecture à confirmer | loi 71-1130, art. 54, 66-2 |

## 2. Tests types

Données fictives et génériques. Aucun test n'est encore issu d'un incident
raconté par un cabinet : ils viennent des interdits, des incidents publiés et
des échecs connus d'Attendu.

| ID | Étant donné | Quand | Alors | Interdit | Statut | Source |
|---|---|---|---|---|---|---|
| T-01 | un dossier fictif avec une pièce et le nom d'un client | l'outil doit appeler un service qui n'est pas dans la liste autorisée par le cabinet | l'appel est refusé ; rien ne sort | I-01 | `hypothèse` | conçu depuis l'interdit |
| T-01b | une session de recherche sur un dossier | on lit les journaux de l'outil | aucun nom de client en clair hors de l'hébergement du cabinet | I-01 | `hypothèse` | conçu depuis l'interdit |
| T-02 | un projet de conclusions qui cite un arrêt au numéro fictif | on le passe au vérificateur | la référence est signalée « introuvable » ; rien n'est corrigé en silence | I-02 | `hypothèse` | Mata v. Avianca, 2023 |
| T-02b | un projet avec quinze références, dont quatorze fictives | on le passe au vérificateur | un rapport liste chaque référence et son état | I-02 | `hypothèse` | TA Orléans, 29/12/2025 |
| T-02c | des références transmises par le client, reprises dans une note | on vérifie la note | elles sont vérifiées comme les autres, sans exception | I-02, I-03 | `hypothèse` | Al-Haroun, § 78 |
| T-02d | un projet que son auteur a marqué « déjà vérifié » | il est présenté pour envoi | il passe quand même au vérificateur | I-02 | `hypothèse` | Johnson v. Dunn, 23/07/2025 : une charte écrite n'avait rien empêché |
| T-03 | un arrêt existant, cité avec un passage qui n'y figure pas | on vérifie | la citation est signalée : « passage absent de la décision » | I-03 | `hypothèse` | Al-Haroun, 2025 |
| T-03b | un extrait tiré des **moyens** d'un pourvoi | il est cité comme la solution | l'outil signale que l'extrait vient des moyens | I-03 | `hypothèse` | vocabulaire, § 5 (« moyen ») |
| T-04 | un contrat fictif conclu en 2014 | on demande si l'imprévision de l'article 1195 s'applique | la réponse dit que 1195 vaut pour les contrats conclus à partir du 01/10/2016 et raisonne sur le droit antérieur | I-04 | `hypothèse` | ordonnance 2016-131, art. 9 ; Attendu |
| T-04b | un mémo qui cite l'ancien L. 442-6, I, 5° du Code de commerce | on le vérifie | l'outil signale la renumérotation en L. 442-1 (ordonnance 2019-359) et la version applicable à la date | I-04 | `hypothèse` | Attendu, `docs/01` § 3.2 |
| T-04c | une question sur un dépôt en magasin général, à une date entre 2000 et 2019 | on cherche | la réponse applique L. 522-15 dans sa version de l'époque, pas le droit commun du dépôt | I-04 | `hypothèse` | Attendu, échec connu G-101 |
| T-05 | une question qui appelle une décision postérieure à la borne du corpus | on cherche | abstention, avec la borne du corpus | I-05 | `hypothèse` | page du site ; Attendu |
| T-05b | un arrêt de la Cour de cassation (dans le corpus) qui applique un texte hors corpus | on pose la question qu'il tranche | l'outil répond sur l'arrêt, il ne s'abstient pas à tort | I-05 | `hypothèse` | Attendu, échecs connus G-037, G-038, G-042 |
| T-06 | un jugement notifié dont le délai d'appel d'un mois expire un samedi | on calcule | la limite est reportée au lundi (ou au premier jour ouvrable) | I-06 | `hypothèse` | CPC 538, 642 |
| T-06b | une partie qui demeure à l'étranger | on calcule le délai d'appel | 1 mois + 2 mois | I-06 | `hypothèse` | CPC 643 |
| T-06c | une déclaration d'appel faite après le 01/09/2024, avec mise en état | on suit le dossier | l'alerte sur les conclusions de l'appelant (3 mois) arrive assez tôt pour les écrire, puis s'escalade (E-04) | I-06 | `hypothèse` | CPC 908, 911 |
| T-06d | un dossier contentieux sans date de notification saisie | contrôle quotidien | alerte « date inconnue », jamais un silence | I-06 | `hypothèse` | socle, archétype Veiller |
| T-07 | un nouveau dossier dont l'adversaire est un ancien client du cabinet | on l'ouvre | alerte de conflit, décision de l'associé (E-01) | I-07 | `hypothèse` | RIN 4.1 |
| T-07b | un dossier personnel d'un collaborateur contre un client du cabinet | on l'ouvre | alerte de conflit | I-07 | `hypothèse` | RIN 4.1 |
| T-08 | un dossier de cession de fonds de commerce sans trace de vigilance | on l'ouvre | alerte bloquante : vigilance à faire | I-08 | `hypothèse` | CMF L561-3 I |
| T-08b | un doute sur l'origine des fonds exprimé dans une note | l'outil relit la note | il ne prépare aucune déclaration ; il escalade à l'avocat (E-02) | I-08 | `hypothèse` | CMF L561-17 |
| T-09 | un dossier ouvert sans convention d'honoraires | on l'ouvre | alerte ; si l'urgence est cochée, l'exception est tracée | I-09 | `hypothèse` | loi 71-1130, art. 10 |
| T-10 | une lettre d'un confrère sans la mention « officielle » | on l'ajoute au bordereau de pièces | alerte : correspondance confidentielle | I-10 | `hypothèse` | RIN 3.1 |
| T-11 | un brouillon de plaquette qui dit « spécialiste en droit des sociétés » | on le contrôle | la mention est signalée si le cabinet n'a pas déclaré de certificat | I-11 | `hypothèse` | RIN 10.2 |
| T-12 | une demande d'un client du cabinet, arrivée directement dans l'outil | l'outil la reçoit | aucune réponse ; elle va à l'avocat du dossier | I-12 | `hypothèse` | loi 71-1130, art. 54 |

## 3. Connecteurs

| Outil ou catégorie | Usage | Étape | Accès | Lecture / écriture | Qui le tient | Statut |
|---|---|---|---|---|---|---|
| Légifrance (API PISTE) et open data LEGI de la DILA | codes, toutes versions | 5 | API OAuth 2.0 ; XML en masse (utilisé par Attendu) | lecture | DILA | `texte` (existence) ; `hypothèse` (quotas non publiés) |
| Judilibre (API PISTE) | Cour de cassation ; seule voie pour les décisions postérieures au 19/03/2025 dans Attendu | 5 | API, `KeyId`, `/search`, `/decision`, `/export`, JSON par zones | lecture | Cour de cassation | `texte` |
| Open data des juges du fond | cours d'appel, tribunaux de commerce (depuis le 31/12/2024), tribunaux judiciaires (depuis le 30/09/2025) | 5 | open data | lecture | ministère de la Justice | `texte` |
| RPVA, e-Barreau | remise des actes aux juridictions | 7b | API du CNB après **référencement** de l'éditeur | **jamais en écriture par l'outil** (G-01) | cabinet | `texte` ; format des actes sous l'arrêté du 29/08/2025 non relu |
| Logiciel de gestion : Secib (Septeo), Kleos (Wolters Kluwer), Diapaz (Xelya), Jarvis Legal (LexisNexis) | dossiers, parties, délais, temps, facturation | 1, 4, 8, 9 | aucune API publique trouvée : se négocie avec l'éditeur, ou export | lecture (conflits, délais) | assistante, associé | `hypothèse` |
| Bases privées : Doctrine, Lexis+ AI, GenIA-L (Lefebvre Dalloz, intégré à Diapaz), Dalloz, Lamy | doctrine, jurisprudence | 5 | abonnement | **aucune indexation sans l'accord écrit de l'éditeur** (G-05) | cabinet | `hypothèse` (licences non lues) |
| Messagerie, GED, poste des avocats | pièces, notes | 5, 7a | à voir sur place | lecture, dans l'hébergement du cabinet (I-01) | cabinet | `hypothèse` |
| Attendu (démonstrateur de l'agence) | recherche datée et citée | 5 | Mistral, hébergement dans l'UE | lecture ; ne produit que des notes | agence | `texte` (dépôt) : c'est un démonstrateur, pas un outil en service |

## 4. Moments d'escalade

| ID | Déclencheur | Étape | Qui reprend | Délai | Ce qu'on lui présente | Statut |
|---|---|---|---|---|---|---|
| E-01 | conflit ou risque de conflit détecté | 1 | associé | avant l'ouverture | les noms rapprochés et le dossier en conflit ; l'accord écrit des parties si l'on passe outre | `texte` (RIN 4.1) ; `hypothèse` (rôle) |
| E-02 | soupçon de blanchiment | 2, 5 | l'avocat, puis le bâtonnier | selon l'avocat | la note ; l'outil ne prépare rien d'autre | `texte` (CMF L561-17) |
| E-03 | tout écrit qui sort du cabinet | 7a, 7b | l'avocat qui signe | avant l'envoi | l'écrit et le rapport du vérificateur de citations | `texte` (RIN 2.3 ; loi 71-1130, art. 27) |
| E-04 | délai de procédure à moins de X jours sans acte prêt | 8 | collaborateur, puis associé | seuil X à demander au cabinet | le dossier, le délai calculé et sa règle de calcul | `texte` (sanction, CPC 911) ; `hypothèse` (seuil) |
| E-05 | corpus muet, texte hors corpus, décision postérieure à la borne | 5 | l'avocat | immédiat | la question, ce qui a été cherché, la borne du corpus | `hypothèse` (règle de conception) |
| E-06 | date des faits incertaine : droit transitoire, renumérotation, plusieurs dates possibles | 5 | l'avocat | avant la réponse | les dates candidates et les versions correspondantes | `hypothèse` |
| E-07 | référence introuvable ou passage absent dans un écrit | 6 | l'auteur de l'écrit, puis l'associé | avant la relecture | le rapport du vérificateur | `hypothèse` |
| E-08 | désaccord du collaborateur avec l'approche du cabinet | 5, 6 | associé | avant d'agir | — (humain seulement) | `texte` (RIN 14.2.1) |

## 5. Vocabulaire

| Terme | Définition | Synonymes, abréviations | Piège | Statut |
|---|---|---|---|---|
| Dossier | l'affaire d'un client dans le logiciel ; « toutes les pièces du dossier », couvertes par le secret ; le dossier de la procédure au greffe | — | **trois sens** : un outil qui « lit le dossier » doit dire lequel | `texte` (le 2ᵉ) ; `hypothèse` (1ᵉʳ, 3ᵉ) |
| Version en vigueur | sur Légifrance, la version affichée par défaut, celle d'aujourd'hui | — | ce n'est pas la version applicable au litige | `texte` |
| Date des faits | la date qui fixe le droit applicable | — | **pas unique** : conclusion du contrat, introduction de l'instance, déclaration d'appel, date de la faute | `texte` (textes) ; lecture |
| Officielle | mention qui sort une lettre entre avocats de la confidentialité | — | sans elle, la lettre ne se produit pas en justice | `texte` |
| Caducité / irrecevabilité | sanctions d'un délai d'appel manqué, relevées d'office | — | l'une frappe la déclaration d'appel (appelant), l'autre les conclusions (intimé) | `texte` |
| Notification / signification | entre avocats / par commissaire de justice aux parties sans avocat | — | délais différents (CPC 911) | `texte` |
| Consultation | avis juridique écrit, couvert par le secret, sous monopole (art. 54) | — | dans le logiciel, peut désigner un rendez-vous facturé | `texte` ; `hypothèse` (logiciel) |
| Collaborateur | avocat qui travaille pour un cabinet, avec sa clientèle possible | collab | un « juriste » n'est pas avocat et ne signe pas de consultation | `texte` |
| Visa | accord de l'associé sur un écrit ; textes visés en tête d'un arrêt | — | **deux sens dans la même maison** ; un troisième chez les bureaux d'études | `texte` |
| Moyen | argument de droit ; dans un arrêt, le moyen du pourvoi | — | citer le moyen comme la décision : erreur classique | `hypothèse` |
| Publié / inédit | arrêt publié au Bulletin ou non | — | poids différent | `texte` (dépôt Attendu) |
| Spécialiste | titulaire d'un certificat de spécialisation | — | « cabinet d'affaires » ne veut pas dire « spécialiste » | `texte` (RIN 10.2) |

## 6. Le bon résultat

Rien de publié. Toutes les lignes sont à demander à un associé, sur un cas.

| ID | Objectif ou préférence | Étape | Qui y tient | Ordre de sacrifice | Statut | Source |
|---|---|---|---|---|---|---|
| O-01 | une note courte, qui répond à la question posée, puis les sources | 5 | associé | à recueillir | `hypothèse` | déduction |
| O-02 | la décision la plus haute et la plus récente avant les juges du fond | 5 | associé | à recueillir | `hypothèse` | déduction |
| O-03 | « je ne sais pas, le corpus s'arrête au… » plutôt qu'une réponse plausible | 5 | associé | probablement jamais sacrifié : à faire descendre en interdit si c'est confirmé (I-05) | `hypothèse` | page du site |
| O-04 | l'exhaustivité, tant qu'elle reste vérifiable | 5 | collaborateur | se sacrifie probablement avant la vérifiabilité | `hypothèse` | déduction |
| O-05 | moins d'heures **non facturables** (retrouver un arrêt, vérifier une citation), plutôt que moins d'heures | 5, 9 | associé | à recueillir | `hypothèse` | recherche § 10.4 (le temps de recherche est un élément de la rémunération, RIN 11.2) |
| O-06 | hébergement souverain : en France, sinon dans l'UE, chez un hébergeur non soumis à l'extraterritorialité, ou dans les locaux | toutes | associé | à recueillir ; peut être un interdit du cabinet | `hypothèse` (recommandation du CNB, non opposable) | grille du CNB, juin 2025 |

## 7. Les données

| ID | Donnée | Sert à | Où elle vit | Fraîcheur, fiabilité | Qui la tient | Statut |
|---|---|---|---|---|---|---|
| D-01 | codes, toutes versions | I-04, citer à la date | LEGI (DILA), API Légifrance | officielle ; deltas quotidiens | DILA | `texte` (dépôt Attendu) |
| D-02 | décisions de la Cour de cassation | I-02, I-03 | Judilibre ; miroir figé au 19/03/2025 dans Attendu | officielle, pseudonymisée ; la borne doit être affichée (I-05) | Cour de cassation | `texte` |
| D-03 | décisions des juges du fond | recherche | open data progressive (§ 3) | selon la juridiction | ministère de la Justice | `texte` |
| D-04 | doctrine, revues | recherche | bases payantes | licence à lire avant toute indexation | éditeurs | `hypothèse` |
| D-05 | pièces et notes des dossiers | rapprocher un dossier des textes | logiciel de gestion, GED, messagerie | variable ; **couvertes par le secret** | cabinet | `texte` (secret) |
| D-06 | délais et échéances | I-06 | logiciel de gestion, agenda | **saisis à la main, fiabilité inconnue : risque à lever avant tout garde-fou** | assistante | `hypothèse` |
| D-07 | clients et adversaires | I-07 | logiciel de gestion | le nom des clients est couvert par le secret | cabinet | `texte` (RIN 2.2) |
| D-08 | date des faits d'un dossier | I-04 | tête de l'avocat, note d'ouverture | rarement un champ structuré | avocat | `hypothèse` |
| D-09 | données d'infractions et de condamnations, fréquentes au contentieux d'affaires | — | pièces | ne se traitent que dans les cas prévus par la loi | cabinet | `texte` (RGPD, art. 10) |

## 8. Briques à proposer

À proposer en fin d'entretien, chacune en réponse à une douleur entendue.
Hors périmètre, à ne jamais proposer : l'envoi, le dépôt RPVA, la signature
(G-01), et tout outil destiné aux clients du cabinet (I-12).

| ID | Brique | Douleur qu'elle traite | Interdits qu'elle doit respecter | Ce qui la qualifie (questions) | Statut |
|---|---|---|---|---|---|
| B-01 | **Recherche datée et citée** (Attendu adapté au cabinet) | « L'article a changé trois fois » ; « un arrêt cité de mémoire » | I-01 à I-05, I-12 | combien de recherches par semaine, sur quelles bases, par qui ; quelle date des faits, où la trouve-t-on | démonstrateur existant ; `hypothèse` chez un cabinet |
| B-02 | **Vérificateur de citations** d'un projet de note ou de conclusions : chaque référence existe-t-elle, dans quelle version, dit-elle ce qu'on lui fait dire ? | les affaires de références inventées | I-01 à I-04 ; ne corrige jamais en silence | le cabinet utilise-t-il déjà une IA générative ? qui relit, et comment ? une référence fausse repérée, c'était quand ? | `hypothèse` |
| B-03 | **Veille des textes d'un dossier** : alerte quand un article cité dans un dossier ouvert change | « l'article a changé » | I-01, I-04 | combien de dossiers ouverts, combien de textes cités par dossier | `hypothèse` |
| B-04 | **Contrôle des délais**, en second contrôle du logiciel de gestion | le délai frôlé | I-06 ; **n'est jamais la seule alarme** ; le délai reste saisi par un humain | un délai déjà frôlé, c'était quand ? qui saisit les délais, qui les vérifie ? | `hypothèse` |
| B-05 | **Rapprochement dossier ↔ textes**, dans les locaux ou sur un hébergement européen au nom du cabinet | « les pièces ne doivent pas sortir » | I-01, G-06 | où sont les pièces aujourd'hui ? qui héberge la messagerie ? | `hypothèse` |
| B-06 | **Contrôle de conflit assisté** : rapprochement des noms à l'ouverture, et quand la situation évolue | le contrôle manuel dans le logiciel | I-01, I-07 ; la décision reste à l'associé | combien d'ouvertures par mois ? le dernier conflit repéré tard ? | `hypothèse` (déduction de RIN 4) |

---

## Questions ouvertes

### À trancher sur texte ou par un juriste (pas chez le cabinet)

- **Durée de conservation** : 10 ans selon le guide LCB-FT du CNB (« délai
  légal de la prescription en matière de responsabilité professionnelle »),
  5 ans après la fin de la mission judiciaire selon C. civ. 2225, et 2224 pour
  le conseil. À faire trancher avant toute règle d'archivage.
- **Art. 66-2 de la loi de 1971** : Légifrance l'affiche en vigueur jusqu'au
  01/02/2027. Contenu de la modification non lu.
- **Art. 10 de la loi de 1971**, modifié par la loi 2026-725 du 03/08/2026 :
  objet exact de la modification non vérifié.
- **Guide CNB « déontologie et IA » du 17/03/2026** : le PDF n'a pas été lu.
- **Art. 54** : un outil vendu au cabinet reste un outil de l'avocat ; un outil
  vendu à des entreprises qui leur donnerait des consultations tomberait sous le
  texte. Lecture à confirmer par un avocat.
- **Licences des bases privées** (Doctrine, Lexis, Dalloz, Lefebvre, Lamy) :
  que disent-elles d'un outil tiers qui lirait leurs contenus ?
- **Format des actes sous l'arrêté du 29/08/2025** (RPVA) : non relu.
- RGPD : modifications éventuelles par l'omnibus numérique de 2026, non
  vérifiées.
- Les deux arrêts de cassation sur les délais manqués (16/01/2013 et
  14/01/2016) sont lus sur Juricaf : à relire sur Légifrance.
- Décisions françaises sur les « hallucinations » (Périgueux, Orléans,
  Grenoble) : lues à travers des articles, pas dans le texte de la décision.

### Associé
- « Le dernier délai frôlé : c'était quand ? Qui s'en est aperçu ? » (I-06,
  E-04)
- « La dernière référence fausse ou périmée repérée dans un écrit du cabinet :
  avant ou après l'envoi ? » (I-02, I-03)
- « Qui relit quoi ? Double signature, visa ? » (RIN 14.2.1, E-03)
- « Le contrôle de conflit : qui le fait, sur quoi, et le dernier repéré
  tard ? » (I-07)
- « Où sont hébergées votre messagerie et vos pièces ? Qu'accepteriez-vous
  pour un outil : dans vos locaux, hébergement européen à votre nom ? » (I-01,
  O-06)
- « Entre deux notes justes, laquelle préférez-vous, et pourquoi ? » (O-01 à
  O-04)
- « Au forfait ou au temps passé ? Qu'est-ce qui n'est jamais facturable ? »
  (O-05)

### Collaborateur, juriste
- « Votre dernière recherche : combien de temps, où, et comment avez-vous su
  que c'était la bonne version ? » (I-04)
- « La date des faits d'un dossier, vous la trouvez où ? » (D-08)
- « Utilisez-vous déjà une IA ? Laquelle, pour quoi, qui vérifie ? »
- « Qu'est-ce que l'associé corrige le plus souvent dans vos notes ? »

### Assistante
- « Les délais : qui les saisit, depuis quel document, et qui les
  vérifie ? » (D-06)
- « Une ouverture de dossier : qu'est-ce qui se vérifie, dans quel ordre ? »
  (I-07, I-08, I-09)
- « Les bordereaux de pièces : comment sont-ils faits ? » (I-10, RIN 5.5)
