# Sécurité privée — fiche métier

Surveillance humaine et gardiennage, sécurité incendie (SSIAP), rondes,
télésurveillance, cynophile. NAF **80.10Z** (et 80.20Z pour la télésurveillance).
Première cible de l'agence, arrêtée le 2026-09-29.

Remplie selon `../../GRILLE.md`. Ses vues pour le terrain : `prospection.md`
(l'appel et le premier rendez-vous), `entretien.md` (le dirigeant, pour le
devis) et `observation.md` (la journée sur place). Ses archétypes
(`../../methode/archetypes.md`) : Planifier au cœur, Veiller, Rapprocher,
Rédiger ; les règles communes à tous les métiers sont dans
`../../methode/socle.md`. État au **2026-10-05** : les textes et la
prospection seulement, **aucun entretien client encore**. Donc rien de
`déclaré` ni de `constaté` : toute ligne `hypothèse` est une question à poser,
pas une règle à coder.

**Deux sortes de `texte`** :
- **`texte` ✓** : relu mot à mot sur Légifrance, dans sa version en vigueur,
  le 2026-09-29 ou le 2026-10-05 (`verification-…` de la même date ; le
  registre, `regles.yaml`, porte la date de chaque ligne). Peut servir à
  coder un garde-fou.
- **`texte`** sans ✓ : lu par la recherche, parfois à travers un résumé
  automatique. À relire avant d'en coder quoi que ce soit (`GRILLE.md`
  § Statuts).

Sources :
- `recherche-2026-09-29.md`, dans ce dossier : instantané daté, avec les URL
  et un degré de certitude pour chaque fait. Ce qui n'y était étayé que par une
  source secondaire est resté en `hypothèse`.
- `verification-2026-09-29.md` et `verification-2026-10-05.md`, dans ce
  dossier : relectures à la source des faits appelés à devenir des
  garde-fous, citations exactes et URL. La seconde corrige I-02, I-03, I-12
  et I-20, et relit à nouveau les textes d'I-01, I-04 à I-06, I-17 et I-19.
- le dépôt voisin `reperage` (`../reperage` depuis la racine de ce dépôt) :
  `server/scoring/cibles.ts` (80.10Z : « vacations, mains
  courantes, habilitations à échéance » ; verticale « propreté et sécurité » :
  « plannings, remplacements, pointage et rapports de passage tenus au
  tableur ») et `docs/plan-prospection-2026-09.md`. **101 entreprises
  prospectables en 80.10Z** dans sa base (`v_prospectable`, relevé le
  2026-09-29).

Contexte chiffré, pour situer la douleur : un taux de marge sous celui des
activités de soutien comparables (Insee : 6,9 % contre 9,2 % en 2019, 3,7 %
contre 6,9 % en 2016), et une marge moyenne d'environ 1 % selon la Cour des
comptes (2018, enquête de branche de 2017 ; mesure différente de celle de
l'Insee). 71 % des embauches en CDD (AKTO 2023). 1 984 contrôles CNAPS et plus
de 2 300 sanctions en 2024. Le détail est dans la recherche. **Conséquence pour le harnais** :
dans ce métier, l'erreur coûte une sanction ou un marché, et la marge ne laisse
aucune place à une personne de plus pour vérifier. C'est le cas d'usage.

⚠ **Temps de travail : deux textes sont en vigueur en même temps.**
L'accord du 18/05/1993 fixe 12 h de repos entre deux services, et la remise ou
la modification du planning une semaine avant. L'article 7 de la convention
collective, dans sa version du 01/07/2026, rappelle les 11 h de repos légal,
fixe 7 jours pour modifier le cycle, 48 h pour un ajustement ponctuel, et un
contingent de 329 h d'heures supplémentaires contre 288 h en 1993. Lequel
s'applique quand ils divergent est une question de droit, pour un juriste.
**En attendant (décision du 2026-10-05), le moteur décide par la loi générale
et signale les autres textes en note** ; la politique du client, recueillie
au premier rendez-vous, pourra désigner un autre texte de référence. I-06
ne bloque rien avant l'avis du juriste.

**R631-15 a changé le 01/10/2026** (décret 2025-1344) : l'employeur déclare
ses agents dans **Dracar Ultimate**, le téléservice du CNAPS ouvert fin
février 2026, les tient à jour et vérifie régulièrement leurs titres (I-20).
Les listes de salariés de l'ancien Dracar NG n'ont pas été reprises. Bonne
question d'entrée chez tout client : « Vos salariés sont-ils tous rattachés
dans Dracar Ultimate ? »

---

## 0. La chaîne

| # | Étape | Entrée | Sortie | Qui | Outil aujourd'hui | Statut |
|---|---|---|---|---|---|---|
| 1 | Réponse à l'appel d'offres, devis | cahier des charges du donneur d'ordre | offre : mémoire technique, décomposition du prix horaire | dirigeant, commercial | ? | `hypothèse` (décomposition demandée par le guide d'achat du CNAPS, 2012) |
| 2 | Contrat | offre retenue | contrat qui fixe les conditions et les moyens d'exécution (R631-24), avec les mentions obligatoires (L612-15) et la sous-traitance déclarée (R631-19) | dirigeant | ? | `texte` |
| 3 | Reprise du personnel (marché gagné sur un concurrent) | dossiers des transférables transmis par l'entreprise sortante | liste des repris communiquée sous 8 jours ouvrables à compter des dossiers complets, avenants envoyés en même temps | dirigeant, RH | ? | `texte` ✓ (accord du 28/01/2011, art. 2.3.2) |
| 4 | Mémento et consignes de poste | instructions générales de l'entreprise ; contrat, visite de site | le **mémento** de l'entreprise, en français, sans rien de propre à un client ou à une mission, **émargé par chaque agent à chaque modification** (R631-16) ; les **consignes de poste**, propres au site, issues du contrat | exploitation | ? | `texte` ✓ (mémento) ; `hypothèse` (consignes de poste : aucun texte lu n'en impose l'émargement) |
| 5 | Planning des vacations | besoins par site, agents disponibles et qualifiés | planning remis aux agents au moins une semaine avant | exploitation, planning | tableur | `texte` ✓ (délai : accord de 1993, art. 2) ; `hypothèse` (outil, reperage) |
| 6 | Prise de poste et exécution | planning, consignes | main courante, rondes, rapports d'incident | agent, chef de poste | papier ou main courante électronique, pointage de rondes, PTI | `hypothèse` |
| 7 | Remplacements, modifications | absence, prestation supplémentaire | planning modifié ; sous le délai, avec l'accord exprès du salarié (écrit et contresigné pour une prestation supplémentaire demandée par le client) | exploitation | téléphone, messagerie | `texte` ✓ (accord) ; `hypothèse` (outil) |
| 8 | Contrôle interne, rapports au donneur d'ordre | mains courantes, visites de site | registre des contrôles internes, tenu à jour, et contrôles réguliers sur place (R631-16) ; rapport au donneur d'ordre | exploitation, dirigeant | ? | `texte` ✓ (registre) ; `hypothèse` (rapport) |
| 9 | Paie | heures réalisées | bulletins : majorations de nuit, de dimanche et de jours fériés ; toute vacation payée 6 h au minimum | paie, cabinet comptable | ? | `texte` ✓ (6 h : CCN art. 7.12) ; `hypothèse` (majorations, outil) |
| 10 | Facturation, encaissement | heures réalisées, contrat | factures, relances | administratif | ? | `hypothèse` |
| ↻ | Échéances réglementaires | dates des titres | carte pro (5 ans ; renouvellement déposé au moins 3 mois avant, avec l'attestation MAC), MAC (dans les 24 mois avant l'échéance, 36 en télésurveillance), recyclage SSIAP (triennal, au plus tard à la date anniversaire du diplôme), secourisme (tous les 2 ans, à la date anniversaire de **sa** qualification), agrément du dirigeant (5 ans) ; déclaration et mise à jour des agents dans Dracar Ultimate (R631-15, en vigueur) ; vérification régulière des titres | RH, exploitation | tableur ? | `texte` ✓ (sauf agrément du dirigeant : `texte`) ; `hypothèse` (outil) |

Passages de main à surveiller : 1→2 (ce que l'offre a promis n'arrive pas dans
les consignes), 5→7 (le planning modifié ne revient pas dans le planning de
référence), 6→9 (les heures réellement faites sont ressaisies pour la paie).

## 1. Interdits

<!-- registre:interdits — généré depuis le registre (pnpm registre:generer), ne pas éditer à la main -->

| ID | Interdit | Étape | Conséquence | Vérifiable par | Statut | Source |
|---|---|---|---|---|---|---|
| I-01 | Aucun agent n'est affecté à une vacation sans **carte professionnelle valide à la date de cette vacation**, ou couverte par le **récépissé** d'une demande de renouvellement complète | 5, 7 | employer sans titre valide est interdit « même pour une courte durée » ; pénalité CNAPS jusqu'à 150 000 € pour une personne morale ; sans carte valide ni récépissé, le licenciement de l'agent est fondé « par l'effet de la loi » (Cass. soc. 16/09/2026, n° 25-12.634) | code | `texte` ✓ | R631-15 (version du 01/10/2026, al. 1) ; R612-13 ; R612-17 |
| I-02 | Aucun agent n'est affecté à un poste dont l'**activité** ne figure pas parmi celles au titre desquelles sa carte a été délivrée (surveillance humaine ou gardiennage, télésurveillance, avec chien, détection d'explosifs avec chien, avec arme, surveillance renforcée, vidéoprotection…) ; le SSIAP n'en est pas une, c'est un diplôme (I-04) | 5, 7 | 2ᵉ manquement le plus relevé aux JO 2024 | code | `texte` ✓ (règle) ; `texte` (table poste → activité : arrêté du 01/09/2025, art. 4 ; l'arrêté visé par R612-14, 2° n'est pas identifié) | R631-15, al. 1 et 3 ; R612-16, 3° ; R612-18, 1° ; L612-20 ; Rapport CNAPS 2024, p. 32 |
| I-03 | Aucun agent en poste sans la **carte professionnelle propre à l'entreprise** remise par l'employeur (photo récente, identité et activités, chiens le cas échéant, employeur et son autorisation, n° de carte CNAPS), présentée à toute réquisition d'un agent de l'autorité publique et restituée à la fin du contrat | 5, 6 | plus de 80 % des manquements relevés aux JO 2024 | code | `texte` ✓ | R612-18 ; Rapport CNAPS 2024 |
| I-04 | Aucun poste incendie tenu sans : le **diplôme SSIAP du niveau requis** ; le **recyclage triennal** fait au plus tard à la date anniversaire du diplôme ; **1 607 h d'activité sur les 36 derniers mois**, sinon remise à niveau ; le **secourisme** recyclé tous les 2 ans ; l'**habilitation électrique** ; et, dans un nouvel établissement, les périodes en **doublure** (2, ou 3 pour un chef d'équipe) | 5, 7 | ERP ou IGH non conforme, responsabilité en cas de sinistre | code | `texte` ✓ | arrêté du 02/05/2005, art. 3 et 7 |
| I-05 | Aucun planning ne dépasse **12 h de travail par jour**, **13 h d'amplitude**, **48 h par semaine** et **46 h en moyenne sur 12 semaines** ; aucun ne laisse moins que le **repos minimal entre deux services** (12 h selon l'accord de 1993, 11 h de repos légal rappelé par la CCN, 10 h au passage d'un service de nuit à un service de jour) ni moins de **24 h de repos après 48 h** de travail | 5, 7 | contentieux prud'homal, contrôle | code | `texte` ✓ ⚠ repos de 12 h ou 11 h : à trancher par un juriste | accord du 18/05/1993, art. 1 et 2 ; CCN art. 7.01, 7.08, 7.09, 7.12 |
| I-06 | Aucune modification de planning notifiée moins de **7 jours** avant (changement du cycle) ou **48 h** avant (ajustement ponctuel en heures supplémentaires) sans l'**accord exprès** du salarié ; pour une prestation supplémentaire demandée par le client, cet accord est **écrit et contresigné** ; un refus n'entraîne aucune sanction | 7 | litige salarié | code (accord enregistré) | `texte` ✓ ⚠ l'accord de 1993 dit une semaine : à trancher avec I-05 | CCN art. 7.07.3 ; accord du 18/05/1993, art. 3 |
| I-07 | Surveillance humaine et gardiennage : sous-traitance d'**une partie seulement**, jamais de toute la prestation. Toute activité privée de sécurité : **deux rangs au plus**, le rang 2 seulement sur une justification validée par l'entrepreneur principal, et vérifiée par le donneur d'ordre ; l'identité de toute la chaîne sur chaque sous-traité ; autorisations et cartes du sous-traitant vérifiées. Les contrats antérieurs au 26/05/2022 n'y sont pas soumis | 1, 2, 5 | les manquements du sous-traitant sont imputés à l'entreprise principale | code (rangs, mentions, cartes) + humain (justification du rang 2) | `texte` ✓ (L612-5-1) ; `texte` (R631-23) | L612-5-1 ; R631-23 ; Rapport CNAPS 2024, p. 57 |
| I-08 | Tout document de l'entreprise — informatif, contractuel ou publicitaire, annonce ou correspondance : devis, contrat, courrier, site web — reproduit le **n° d'autorisation** et la phrase de L612-14 : « L'autorisation d'exercice ne confère aucune prérogative de puissance publique à l'entreprise ou aux personnes qui en bénéficient. » | 1, 2, 10 | manquement relevé au contrôle | code | `texte` ✓ | L612-14 ; L612-15 |
| I-09 | Aucun document ne fait état de la qualité d'**ancien fonctionnaire de police ou d'ancien militaire** d'un dirigeant ou d'un salarié | 1 | manquement relevé au contrôle | code (lexical) + humain | `texte` ✓ | L612-15 |
| I-10 | Aucune offre à un **prix anormalement bas**, qui ne couvre pas les obligations sociales | 1 | sanction CNAPS (manquement ciblé en 2024) | humain, avec une alerte calculée | `texte` | R631-21 ; Rapport CNAPS 2024 |
| I-11 | Aucune prestation **étrangère à la sécurité** dans une offre de surveillance ou de gardiennage (exclusivité) | 1, 2 | manquement relevé au contrôle | humain | `texte` | L612-2 |
| I-12 | Aucun agent n'est employé sans avoir émargé la **version en vigueur du mémento** de l'entreprise ; chaque modification du mémento appelle un nouvel émargement de tous les agents. Le mémento est en français, tenu dans les locaux professionnels, et ne contient rien de propre à un client ou à une mission | 4, 6 | manquement relevé au contrôle | code (émargement de la version en vigueur présent) | `texte` ✓ | R631-16 |
| I-13 | Télésurveillance : aucun appel à la police ou à la gendarmerie **sans levée de doute** documentée | 6 | sanction jusqu'à 450 € par appel injustifié | humain (le code peut exiger la trace de la levée de doute) | `texte` ✓ | L613-6 |
| I-14 | Aucune **palpation** sans consentement exprès, hors périmètre de protection ou arrêté préfectoral, ou par un agent d'un autre sexe | 2, 4 | infraction | humain | `texte` ✓ (version du 20/08/2026 : la palpation n'a pas changé) | L613-2 |
| I-15 | Aucun agent seul de nuit, ou en site isolé, sans **procédure de secours** : qui reçoit l'alarme, comment on écarte une fausse alerte, par où on accède au site | 4, 6 | accident sans secours | code (procédure rattachée au poste) | `hypothèse` (R4512-13 non relu ; pratique de l'INRS) | R4512-13 ; INRS |
| I-16 | Marché gagné sur un concurrent : l'entreprise entrante reprend **100 %** des transférables ayant au moins 4 ans d'ancienneté contractuelle et **85 %** des autres, arrondi à l'unité inférieure (100 % en sûreté aérienne) ; la liste des repris part sous **8 jours ouvrables** à compter des dossiers complets, avec les avenants | 3 | contentieux | code (critères, quotas, délai) + humain (choix parmi les autres) | `texte` ✓ | accord du 28/01/2011, art. 2.2 et 2.3.2 (l'accord du 05/03/2002 n'est plus en vigueur) |
| I-17 | Aucune **échéance réglementaire** — carte pro, MAC, recyclage SSIAP, secourisme, agrément du dirigeant — n'atteint sa date limite sans une alerte donnée assez tôt pour suivre la formation qui la conditionne (MAC, recyclage) | ↻ | agent inemployable du jour au lendemain, dirigeant sans agrément ; le licenciement de l'agent reste fondé, mais l'employeur qui n'a pas organisé le MAC doit des dommages et intérêts, qui peuvent couvrir la perte de l'emploi (Cass. soc. 16/09/2026, n° 25-12.634) | code | `texte` ✓ (sauf agrément du dirigeant : `texte`) | R612-13 ; R612-17 ; arrêté du 27/02/2017, art. 4 II et 6 II ; arrêté du 02/05/2005, art. 7 ; accord du 27/11/2017, art. 3 et 4 (le MAC relève de la formation continue de l'entreprise, sur le temps de travail, à ses frais) |
| I-18 | Le **registre de sécurité de l'ERP** n'est jamais écrit par le harnais : il appartient à l'exploitant | 6, 8 | responsabilité de l'exploitant engagée | code (aucun connecteur en écriture) | `texte` | CCH R143-44 |
| I-19 | Aucune vacation n'est payée **moins de 6 h** (4 h jusqu'au 30/06/2026) | 9 | rappel de salaire, litige | code | `texte` ✓ | CCN art. 7.12 (avenant n° 2 du 03/09/2025) |
| I-20 | Tout agent employé ou affecté est **déclaré dans Dracar Ultimate** (téléservice du CNAPS) ; ces informations sont tenues à jour ; la validité des titres est vérifiée régulièrement, à une fréquence adaptée aux entrées, aux sorties et à l'évolution des responsabilités | 5, ↻ | manquement à R631-15 | code (écart entre le planning et les déclarations) | `texte` ✓ (en vigueur depuis le 01/10/2026) ; « au moins une fois par mois, et avant toute affectation sur un grand événement » : doctrine du CNAPS, pas un texte | R631-15, version du 01/10/2026 (décret 2025-1344) ; R611-2-1 ; FAQ Dracar Ultimate du CNAPS |
| I-21 | Une demande du client sur les **références de carte professionnelle** des agents qui lui sont affectés reçoit une réponse **sans délai** | 6 | manquement à L612-15 | code | `texte` ✓ | L612-15 |

<!-- /registre:interdits -->

## 2. Tests types

Données fictives et génériques. Aucun test n'est encore issu d'un incident
raconté : tous sont conçus depuis leur interdit, et seront réécrits ou
confirmés dès les premiers entretiens (la source devient alors « client A, date »).

<!-- registre:tests — généré depuis le registre (pnpm registre:generer), ne pas éditer à la main -->

| ID | Étant donné | Quand | Alors | Interdit | Statut | Source |
|---|---|---|---|---|---|---|
| T-01 | un agent dont la carte pro expire dans 3 jours, sans renouvellement déposé | on l'affecte à une vacation dans 5 jours | l'affectation est refusée, avec le motif et des remplaçants qualifiés proposés | I-01 | `hypothèse` | conçu depuis l'interdit |
| T-01b | un agent dont la carte a expiré hier, mais dont la demande de renouvellement complète a été déposée à temps et le récépissé enregistré | on l'affecte à une vacation | accepté : le récépissé permet de poursuivre l'activité jusqu'à la décision | I-01 | `hypothèse` | conçu depuis l'interdit |
| T-02 | un agent dont la carte expire au milieu d'un planning de 4 semaines, sans récépissé | on génère le planning | seules les vacations postérieures à l'échéance sont bloquées, pas tout le planning | I-01 | `hypothèse` | conçu depuis l'interdit |
| T-03 | un poste de maître-chien | on propose un agent dont la carte ne porte que la surveillance humaine | refus : spécialité non conforme | I-02 | `hypothèse` | conçu depuis l'interdit |
| T-04 | un agent qui a une carte pro valide mais pas de carte entreprise enregistrée | on valide sa prise de poste | alerte bloquante : carte entreprise non remise | I-03 | `hypothèse` | conçu depuis l'interdit |
| T-05 | un poste de chef d'équipe SSIAP 2 en soirée | on propose en remplacement un SSIAP 1 disponible | refus, même en urgence, et escalade si personne n'est qualifié (E-02) | I-04 | `hypothèse` | conçu depuis l'interdit |
| T-06 | un SSIAP 1 dont la date anniversaire du diplôme est passée sans recyclage | on l'affecte à un poste incendie | refus, avec le motif « recyclage échu, remise à niveau nécessaire » | I-04 | `hypothèse` | conçu depuis l'interdit |
| T-06b | un SSIAP 1 à jour de son recyclage, qui ne justifie que de 900 h d'activité sur les 36 derniers mois | on l'affecte à un poste incendie | refus : moins de 1 607 h, remise à niveau nécessaire | I-04 | `hypothèse` | conçu depuis l'interdit |
| T-06c | un SSIAP 2 à jour, jamais affecté à cet établissement | on l'affecte comme chef d'équipe | ses trois premières périodes y sont planifiées en doublure | I-04 | `hypothèse` | conçu depuis l'interdit |
| T-07 | un agent qui sort d'une vacation de nuit à 7 h | on lui propose une vacation qui commence à 15 h le même jour | refus : 8 h de repos, sous chacun des minimums en vigueur (12 h, 11 h, 10 h). Les cas frontière sont T-07b (11 h 30) et T-07d (10 h 30 au passage de nuit à jour) | I-05 | `hypothèse` | conçu depuis l'interdit |
| T-07b | un agent qui sort d'une vacation de nuit à 7 h | on lui propose une vacation de jour qui commence à 18 h 30 le même jour | accepté : 11 h 30 de repos, au-dessus des 11 h de la loi, qui décide ; une note signale que l'accord du 18/05/1993 prévoit 12 h | I-05 | `hypothèse` | conçu depuis l'interdit |
| T-07c | un agent qui sort d'une vacation de nuit à 7 h | on lui propose une vacation de jour qui commence à 20 h le même jour | accepté : 13 h de repos, au-dessus de chacun des minimums en vigueur | I-05 | `hypothèse` | conçu depuis l'interdit |
| T-07d | un agent qui sort d'une vacation de nuit à 7 h | on lui propose une vacation de jour qui commence à 17 h 30 le même jour | refus : 10 h 30 de repos, sous les 11 h de la loi, qui décide ; une note signale que la CCN art. 7.01 admet 10 h au passage de nuit à jour | I-05 | `hypothèse` | conçu depuis l'interdit |
| T-08 | un remplacement à pourvoir pour le soir même | un agent accepte au téléphone | le planning n'est validé qu'une fois son accord enregistré. Le texte exige un accord exprès ; en garder une trace écrite est un choix de conception | I-06 | `hypothèse` | conçu depuis l'interdit |
| T-08b | une prestation supplémentaire demandée par le client pour le lendemain | un agent accepte au téléphone | l'affectation attend son accord écrit et contresigné | I-06 | `hypothèse` | conçu depuis l'interdit |
| T-09 | une chaîne : entrepreneur principal → sous-traitant A (rang 1) → sous-traitant B (rang 2) | B veut confier une partie de la mission à C | refus : un rang 3 est interdit | I-07 | `hypothèse` | conçu depuis l'interdit |
| T-09b | l'entrepreneur principal et son sous-traitant A (rang 1) | A veut confier une partie de la mission à B | accepté seulement si la justification de A (savoir-faire absent, moyens insuffisants, manque ponctuel d'effectifs) est validée par l'entrepreneur principal : escalade (E-03) | I-07 | `hypothèse` | conçu depuis l'interdit |
| T-10 | une mission de surveillance humaine entièrement confiée à un sous-traitant, contrat signé après le 26/05/2022 | on génère le contrat | refus : la sous-traitance ne peut porter que sur une partie de la prestation | I-07 | `hypothèse` | conçu depuis l'interdit |
| T-11 | un devis généré | on contrôle le document | il porte le n° d'autorisation et la phrase exacte de L612-14 ; sans eux, il n'est pas émis | I-08 | `hypothèse` | conçu depuis l'interdit |
| T-12 | un mémoire technique rédigé avec l'aide du modèle | le brouillon écrit « encadrement assuré par d'anciens gendarmes » | la phrase est signalée et retirée avant l'envoi | I-09 | `hypothèse` | conçu depuis l'interdit |
| T-13 | un agent qui a émargé la version 3 du mémento de l'entreprise, devenue la version 4 depuis | on l'affecte à une vacation | alerte bloquante : mémento modifié depuis son dernier émargement ; un mémento qui porte une consigne propre à un client ou à un site est signalé | I-12 | `hypothèse` | conçu depuis l'interdit |
| T-14 | une alarme reçue en télésurveillance | aucune levée de doute n'est enregistrée | le harnais ne propose pas l'appel aux forces de l'ordre : il escalade à l'opérateur (E-05) | I-13 | `hypothèse` | conçu depuis l'interdit |
| T-15 | un marché gagné et la liste des transférables reçue | un salarié à temps plein compte 600 h de vacation sur le site dans les 9 derniers mois | il est marqué non transférable, avec le critère cité (moins de 900 h ; au prorata pour un temps partiel) | I-16 | `hypothèse` | conçu depuis l'interdit |
| T-15b | 15 transférables, dont 5 avec au moins 4 ans d'ancienneté contractuelle | on prépare la liste des repris | au moins 13 repris : les 5, plus 85 % des 10 autres arrondi à l'unité inférieure (8) ; en dessous, la liste est bloquée | I-16 | `hypothèse` | conçu depuis l'interdit |
| T-16 | un agent dont la carte expire dans 150 jours et qui n'a suivi aucun MAC | contrôle quotidien des échéances | alerte : MAC à organiser par l'employeur, et renouvellement à déposer au plus tard 3 mois avant l'échéance (date calculée et affichée) | I-17 | `hypothèse` | conçu depuis l'interdit |
| T-16b | un agent dont la carte expire dans 80 jours, sans renouvellement déposé | contrôle quotidien des échéances | alerte escaladée au dirigeant : la date limite de dépôt (3 mois avant l'échéance) est dépassée ; sans récépissé à l'échéance, ses vacations suivantes sont bloquées (I-01) | I-17, I-01 | `hypothèse` | conçu depuis l'interdit |
| T-17 | une demande d'un donneur d'ordre qui inclut l'accueil et le nettoyage du hall | on prépare l'offre | la prestation étrangère à la sécurité est signalée et escaladée au dirigeant | I-11 | `hypothèse` | conçu depuis l'interdit |
| T-18 | une offre dont le prix horaire est inférieur au coût horaire conventionnel calculé (salaire du coefficient, charges, majorations) | on prépare l'envoi | l'envoi est bloqué et escaladé au dirigeant avec la décomposition et l'écart (E-04) | I-10 | `hypothèse` | conçu depuis l'interdit |
| T-19 | un cahier des charges d'événement qui prévoit des palpations à l'entrée, sans arrêté préfectoral ni périmètre de protection mentionné | on prépare les consignes | la palpation n'est pas inscrite dans les consignes ; la demande est escaladée au dirigeant (E-08) | I-14 | `hypothèse` | conçu depuis l'interdit |
| T-20 | un poste de nuit tenu par un agent seul, sans procédure de secours rattachée au poste | on valide le planning | alerte bloquante : procédure de secours absente | I-15 | `hypothèse` | conçu depuis l'interdit |
| T-21 | une main courante qui relate un exercice d'évacuation | on demande au harnais de le reporter au registre de sécurité de l'ERP | il prépare le texte pour l'exploitant et n'écrit rien dans le registre | I-18 | `hypothèse` | conçu depuis l'interdit |
| T-22 | une vacation de 4 h au planning, réalisée en octobre 2026 | on prépare la paie | elle est payée 6 h, et l'écart est signalé | I-19 | `hypothèse` | conçu depuis l'interdit |
| T-23 | un agent au planning de la semaine qui n'est pas déclaré sur le téléservice du CNAPS | contrôle quotidien | alerte : déclaration manquante | I-20 | `hypothèse` | conçu depuis l'interdit |
| T-24 | un donneur d'ordre demande par courriel les références de carte des agents affectés à son site | le harnais reçoit la demande | la réponse, limitée aux agents affectés à ce site, est préparée le jour même et soumise à validation | I-21 | `hypothèse` | conçu depuis l'interdit |

<!-- /registre:tests -->

## 3. Connecteurs

| Outil ou catégorie | Usage | Étape | Accès | Lecture / écriture | Qui le tient | Statut |
|---|---|---|---|---|---|---|
| **Dracar Ultimate** (téléservice du CNAPS, a remplacé Dracar NG fin février 2026) | déclarer les agents employés ou affectés et les tenir à jour (R631-15) ; vérifier la validité des cartes (statut visible dans l'espace entreprise, alerte d'expiration) ; déposer les demandes de titre | 5, ↻ | portail web ; **pas d'API** (« cette interconnexion n'est pas envisagée », FAQ du CNAPS) ; import CSV des salariés, activité par activité ; les listes de Dracar NG n'ont pas été reprises | lecture pour le rapprochement avec le planning ; **aucune écriture par le harnais** : la déclaration reste humaine | dirigeant, RH | `texte` ✓ (obligation) ; `texte` (existence, absence d'API : FAQ du CNAPS). ⚠ Un accès automatisé, avec les identifiants de l'employeur, n'est pas vérifié au regard des conditions d'utilisation du téléservice : à lire avant d'en faire un connecteur |
| Tableur de planning | vacations, affectations | 5, 7 | fichier | lecture, écriture (bornée par I-01 à I-06) | exploitation | `hypothèse` (reperage) |
| Logiciel d'exploitation du secteur (planning, main courante, rondes, facturation) — éditeurs relevés : SEKUR, Hector Solution, Comète, Nowgua, BanetteOne | tout ou partie de la chaîne | 5 à 10 | inconnu : API, export ? | à déterminer | exploitation | `hypothèse` (éditeurs vus sur leur site ; aucun vu chez un client) |
| Main courante papier ou électronique | journal des postes | 6, 8 | papier, tablette, parfois l'outil **imposé par le donneur d'ordre** | lecture | agents | `hypothèse` |
| Pointage de rondes (NFC, QR, GPS) | preuve de passage | 6 | inconnu | lecture | exploitation | `hypothèse` |
| PTI / DATI (éditeur relevé : Doomap) | alarme travailleur isolé | 6 | inconnu | lecture seule ; l'alarme va à un humain (E-06) | exploitation | `hypothèse` |
| Paie (logiciel interne ou cabinet comptable) | heures, majorations, minimum de 6 h | 9 | export ? ressaisie ? | à déterminer | paie, cabinet | `hypothèse` |
| Facturation, comptabilité | factures, relances | 10 | inconnu | à déterminer | administratif | `hypothèse` |
| Téléphone, messagerie | remplacements | 7 | aucun : c'est le trou à combler | — | exploitation | `hypothèse` |
| Rédaction des appels d'offres (éditeur relevé : Doaken) | mémoire technique | 1 | fichiers | écriture de brouillons (bornée par I-08 à I-11) | commercial | `hypothèse` |
| Registre de sécurité de l'ERP | tenu par l'exploitant | 6, 8 | papier ou outil de l'exploitant | **jamais en écriture** (I-18) | exploitant | `texte` |

## 4. Moments d'escalade

<!-- registre:escalades — généré depuis le registre (pnpm registre:generer), ne pas éditer à la main -->

| ID | Déclencheur | Étape | Qui reprend | Délai | Ce qu'on lui présente | Statut |
|---|---|---|---|---|---|---|
| E-01 | un agent signale une suspension ou un retrait de carte, ou une condamnation (R631-26) | ↻, 5 | dirigeant | immédiat | vacations futures de l'agent, remplaçants qualifiés | `texte` |
| E-02 | aucun remplaçant **qualifié** n'est disponible pour une vacation | 7 | responsable d'exploitation, ou astreinte la nuit | avant la prise de poste | le poste, les qualifications requises, les candidats les plus proches et ce qui leur manque | `hypothèse` |
| E-03 | signature d'un contrat, acceptation d'un sous-traitant, validation de la justification d'un rang 2 | 2 | dirigeant (entrepreneur principal) | avant tout engagement | le contrat, les pièces du sous-traitant, la justification | `texte` ✓ (validation du rang 2, L612-5-1) ; `hypothèse` (qui signe) |
| E-04 | le prix d'une offre passe sous le coût conventionnel calculé | 1 | dirigeant | avant l'envoi | la décomposition du prix horaire et l'écart | `texte` (R631-21) |
| E-05 | une alarme de télésurveillance arrive | 6 | opérateur | selon la procédure de la station | les éléments de levée de doute recueillis | `texte` ✓ (L613-6) |
| E-06 | une alarme PTI / DATI se déclenche | 6 | la personne désignée par la procédure de secours | immédiat | la position de l'agent, l'accès au site, l'historique de l'alarme | `hypothèse` (pratique de l'INRS) |
| E-07 | un contrôle CNAPS est en cours | toutes | dirigeant | immédiat ; y faire obstacle est un délit (L617-14) | les registres, les cartes, les contrats demandés | `texte` (délit d'obstacle) ; `hypothèse` (qui reprend) |
| E-08 | une demande hors cadre : palpation, armement, prestation étrangère à la sécurité, inspection visuelle de véhicules hors des lieux prévus par L613-2-1 (créé par la loi du 18/08/2026) | 1, 2 | dirigeant | avant la réponse | la demande et le texte qui la borne | `texte` ✓ (L613-2, L613-2-1) ; `texte` (armement : décret 2017-1844 ; exclusivité : L612-2) |
| E-09 | une modification de planning sous le délai (7 jours pour le cycle, 48 h pour un ajustement ponctuel) | 7 | l'agent concerné, dont l'accord exprès est requis (écrit et contresigné pour une prestation supplémentaire du client) | avant validation | l'ancienne et la nouvelle vacation | `texte` ✓ |
| E-10 | un incident grave sur site : violence, intrusion | 6 | chef de poste ou astreinte ; police ou gendarmerie (R631-10) | immédiat | la main courante et la localisation | `texte` (R631-10) ; `hypothèse` (circuit interne) |

<!-- /registre:escalades -->

## 5. Vocabulaire

| Terme | Définition | Synonymes, abréviations | Piège | Statut |
|---|---|---|---|---|
| Vacation | un service d'un agent sur un poste, avec un début et une fin ; payée 6 h au minimum depuis le 01/07/2026 | vac | ≠ « vacataire », mot qu'on peut entendre pour un statut d'emploi | `texte` ✓ (CCN 7.12) ; `hypothèse` (« vac », piège) |
| Main courante | journal chronologique des événements d'un poste | MC | **aucune définition réglementaire** ; ≠ la main courante déposée au commissariat, que le client peut aussi évoquer | `hypothèse` |
| Mémento des consignes | instructions et consignes générales de l'entreprise, réunies en français, émargées par chaque agent à chaque modification | manuel des consignes | obligatoire et écrit (R631-16) ; **≠ consignes de poste** : le mémento ne contient rien de propre à un client ou à une mission | `texte` ✓ |
| Registre des contrôles internes | trace des contrôles réguliers faits sur place par l'entreprise, tenue à jour | — | ≠ registre de sécurité | `texte` ✓ (R631-16) |
| Registre de sécurité | registre de l'ERP : personnel incendie, vérifications, travaux | — | tenu par l'**exploitant**, pas par le prestataire | `texte` |
| Carte professionnelle | titre CNAPS dématérialisé, valable 5 ans à compter de sa délivrance, qui porte une ou plusieurs spécialités | carte pro | ≠ carte entreprise | `texte` ✓ (R612-13) |
| Récépissé | délivré par le CNAPS sur une demande de renouvellement complète ; permet de poursuivre l'activité jusqu'à la décision | — | une carte expirée n'interdit donc pas toujours l'affectation | `texte` ✓ (R612-17) |
| Carte entreprise | « carte professionnelle propre à l'entreprise » (R612-18) : remise par l'employeur, photo récente, identité et activités, chiens le cas échéant, employeur et son autorisation, n° de carte CNAPS ; présentée sur réquisition, restituée en fin de contrat | carte professionnelle propre à l'entreprise | ≠ carte professionnelle du CNAPS ; plus de 80 % des manquements relevés aux JO 2024 la concernaient (non remise ou non présentée) | `texte` ✓ |
| NUB | numéro unique de bénéficiaire ; ses 7 derniers chiffres figurent sur la tenue | — | — | `texte` |
| Autorisation d'exercice / agrément / autorisation préalable | entreprise, **par établissement** / dirigeant, 5 ans / entrée en formation, 6 mois | — | trois « autorisations » différentes | `texte` |
| Dracar Ultimate | système d'information du CNAPS depuis fin février 2026 : déclaration des agents, demandes de titre | DRACAR | « DRACAR » seul est ambigu : l'ancien téléservice s'appelait Dracar NG | `texte` |
| MAC | stage de maintien et d'actualisation des compétences ; son attestation accompagne la demande de renouvellement de la carte | — | se suit dans les 24 mois avant l'échéance (36 en télésurveillance) | `texte` ✓ (arrêté du 27/02/2017, art. 4 II et 6 II ; R612-17) |
| TFP APS / CQP APS | titre de qualification de l'agent de prévention et de sécurité | — | CQP renommé TFP en 2021, formation refondue le 01/10/2025 : les anciens titres restent valables | `texte` |
| SSIAP 1 / 2 / 3 | agent / chef d'équipe / chef de service de sécurité incendie | — | le niveau désigne un **poste**, pas une ancienneté | `texte` ✓ (arrêté du 02/05/2005, art. 3) |
| Doublure | périodes de travail aux côtés d'un titulaire avant de tenir seul un poste SSIAP dans un nouvel établissement : 2, ou 3 pour un chef d'équipe | — | une obligation de l'arrêté SSIAP, pas seulement un usage de formation | `texte` ✓ (arrêté du 02/05/2005, art. 3) |
| Levée de doute | vérifications de la matérialité et de la concordance des indices d'une alarme, avant d'appeler les forces de l'ordre | — | sans elle, l'appel est « injustifié » | `texte` ✓ (L613-6) |
| Périmètre sortant / entreprise entrante / transférable | vocabulaire de la reprise du personnel en cas de changement de prestataire | — | « transférable » a des critères précis (> 50 % du temps, ≥ 900 h en 9 mois, au prorata pour un temps partiel…) | `texte` ✓ (accord du 28/01/2011, art. 2.2) |
| Rang | niveau dans la chaîne de sous-traitance | sous-traité, entrepreneur principal | deux au plus | `texte` ✓ (L612-5-1) |
| ITE | interdiction temporaire d'exercer, 7 ans au plus | — | — | `texte` |
| Cycle 24/72 | 24 h de service, 72 h de repos | — | autorisé pour les IGH et les pompiers (accord de 1993), sous une réserve de l'arrêté d'extension : pas un cycle libre | `texte` |
| PTI / DATI | protection du travailleur isolé / dispositif d'alarme pour travailleur isolé | — | le boîtier ne suffit pas : c'est la procédure de secours qui compte | `hypothèse` |
| PC sécurité | poste central de sécurité d'un site | PC | — | `hypothèse` |
| Donneur d'ordre | le client qui achète la prestation | client | « le client » peut aussi désigner le public du site | `hypothèse` |

## 6. Le bon résultat

Tout l'enjeu d'un outil d'affectation : entre plusieurs plannings qui
respectent les limites (I-01 à I-06, I-19, I-20), lequel choisir. Les
préférences ci-dessous sont celles qu'on s'attend à trouver ; **leur ordre de
sacrifice est propre à chaque client** et se recueille chez lui.

| ID | Objectif ou préférence | Étape | Qui y tient | Ordre de sacrifice | Statut | Source |
|---|---|---|---|---|---|---|
| O-01 | chaque poste est tenu : aucun poste vide | 5, 7 | donneur d'ordre (pénalités, non-renouvellement) | en dernier ; si le contrat prévoit une pénalité, c'est un interdit du client, à faire descendre en rubrique 1 | `hypothèse` | déduction |
| O-02 | continuité : le même agent sur le même site (agent attitré) | 5 | donneur d'ordre | à recueillir | `hypothèse` | déduction |
| O-03 | trajet : affecter un agent près de chez lui | 5, 7 | agents, exploitation | à recueillir | `hypothèse` | déduction |
| O-04 | coût : limiter les heures supplémentaires (majorées, et plafonnées par un contingent annuel) | 5, 7 | dirigeant | à recueillir | `hypothèse` (majorations non relues) | accord de 1993 ; CCN art. 7.10 |
| O-05 | équité : répartir les nuits, les dimanches et les jours fériés entre agents | 5 | agents | à recueillir | `hypothèse` | déduction |
| O-06 | stabilité : modifier le moins possible un planning publié, puisque chaque modification sous délai demande l'accord de l'agent (I-06) | 7 | exploitation, agents | à recueillir | `hypothèse` | déduction |
| O-07 | heures contractuelles : donner à chaque agent les heures prévues à son contrat, notamment aux temps partiels | 5 | agents, paie | à recueillir | `hypothèse` | déduction |

## 7. Les données

Volumes à mesurer chez chaque client (donnée client) : agents, sites, postes,
vacations par mois, désistements par semaine.

| ID | Donnée | Sert à | Où elle vit | Fraîcheur, fiabilité | Qui la tient | Statut |
|---|---|---|---|---|---|---|
| D-01 | titres de chaque agent : carte pro (spécialités, échéance, récépissé), carte entreprise remise, MAC, SSIAP (niveau, date du diplôme, dernier recyclage, heures d'activité sur 36 mois), secourisme, habilitation électrique | I-01 à I-04, I-17, I-20 | tableur (onglet d'échéances ?), Dracar Ultimate | **inconnue, et tout en dépend** : c'est le premier risque à lever | RH, exploitation | `hypothèse` |
| D-02 | postes de chaque site : horaires, qualification requise (spécialité, niveau SSIAP), effectif minimal, consignes | I-02, I-04, I-12, O-01 | contrats, consignes, mémoire du planning | ? | exploitation | `hypothèse` |
| D-03 | disponibilités et absences des agents | 5, 7, B-02 | téléphone, messagerie, tableur | au fil de l'eau, souvent hors de tout outil | exploitation | `hypothèse` |
| D-04 | planning publié et heures réellement faites | I-05, I-06, I-19, O-06, paie | tableur, logiciel | ? | exploitation, paie | `hypothèse` |
| D-05 | contrat de chaque agent : temps plein ou partiel, heures prévues, ancienneté | O-07, I-16 | paie, RH | ? | RH | `hypothèse` |
| D-06 | commune de domicile de chaque agent (pas l'adresse : c'est assez pour un temps de trajet) | O-03 | RH | ? | RH | `hypothèse` ; donnée personnelle, minimisée |
| D-07 | préférences des donneurs d'ordre (agent attitré, agent refusé) | O-02 | la mémoire du planning | tacite | exploitation | `hypothèse` |
| D-08 | sous-traitants : autorisations, cartes de leurs agents, rang | I-07 | ? | ? | dirigeant | `hypothèse` |
| D-09 | accords des agents aux modifications de planning | I-06, B-02 | souvent nulle part | — | exploitation | `hypothèse` |

## 8. Briques à proposer

Ce qu'on sait construire pour ce métier, à proposer **en fin d'entretien**,
chacune en réponse à une douleur entendue. Pour l'affectation (B-01, B-02),
c'est un **solveur de contraintes** qui choisit, les interdits codés en dur :
un modèle de langage qui déciderait qui va où finirait par inventer ou oublier
une contrainte. Le modèle sert aux bords : lire une absence reçue par message,
mener l'échange avec l'agent, expliquer un choix au responsable, traiter
l'exception.

| ID | Brique | Douleur qu'elle traite | Interdits qu'elle doit respecter | Ce qui la qualifie (questions) | Statut |
|---|---|---|---|---|---|
| B-01 | **Affectation assistée** : l'outil propose le planning de la semaine dans les limites, en cherchant le bon résultat (O-01 à O-07) ; l'exploitation corrige et publie | planning refait chaque semaine à la main ; erreurs de carte, de niveau ou de repos | I-01 à I-06, I-15, I-19, I-20 | temps passé chaque semaine sur le planning, et par qui ; nombre d'agents, de sites, de postes ; les données D-01 à D-07 existent-elles, et sont-elles justes ; qui valide avant publication | `hypothèse` |
| B-02 | **Réaffectation sur désistement** : à l'annonce d'une absence, l'outil retrouve les remplaçants qualifiés, disponibles et reposés, les contacte dans l'ordre (SMS avec réponse oui ou non, ou appel automatique), enregistre l'accord, met le planning à jour, et passe la main si personne n'accepte à temps (E-02) | des heures au téléphone le soir et le week-end ; un remplaçant envoyé sans vérifier sa carte, son niveau ou son repos | I-01 à I-06, I-15, I-20 ; E-02 | nombre de désistements par semaine, à quelle heure ils arrivent, temps passé à remplacer ; canal accepté par les agents ; heures où l'on peut les contacter ; ce que l'agent doit pouvoir répondre ; qui valide l'affectation finale ; que faire si personne n'accepte | `hypothèse` |
| B-03 | **Veille des titres et des déclarations** : échéances, récépissés, déclarations dans Dracar Ultimate | agent inemployable du jour au lendemain ; contrôle CNAPS | I-17, I-20 | combien de titres suivis, où, par qui ; le dernier titre expiré sans qu'on le voie | `hypothèse` |
| B-04 | **Contrôle des documents sortants** : devis, contrats, mémoires techniques vérifiés avant l'envoi | manquement relevé au contrôle ; appel d'offres | I-08, I-09, I-11 | documents par mois ; qui les écrit ; générés ou tapés | `hypothèse` |
| B-05 | **Rapport au donneur d'ordre** compilé depuis les mains courantes | des heures de compilation chaque mois | I-18 | quel rapport, pour quels clients, en combien de temps ; main courante papier ou électronique | `hypothèse` |
| B-06 | **Heures réalisées vers la paie**, sans ressaisie, avec les minimums et les majorations | ressaisie, erreurs, réclamations des agents | I-19 ; majorations (non relues) | qui ressaisit ; combien d'erreurs par mois ; quel logiciel de paie, et quel import il accepte | `hypothèse` |

**B-02 soulève quatre questions de droit**, à poser au juriste avec I-05 et
I-06 avant d'en livrer une :
- l'accord exprès de l'agent : un « oui » par SMS, horodaté et conservé, en
  est une trace. Mais pour une prestation supplémentaire demandée par le client,
  l'accord de 1993 veut un écrit **contresigné** : un SMS suffit-il ?
- contacter un agent pendant son repos : à quelles heures, et que prévoient le
  droit à la déconnexion et un éventuel accord d'entreprise ?
- un appel automatique (voix de synthèse, enregistrement) : information des
  agents, base légale du traitement de leurs données ;
- appeler d'abord « ceux qui disent oui d'habitude » : classer les agents
  selon leurs refus passés peut revenir à les pénaliser, alors qu'un refus ne
  peut entraîner aucune sanction (accord de 1993, art. 3).

---

## Questions ouvertes

### À trancher sur texte ou par un juriste (pas chez le client)

Le client dira ce qu'il **applique**, pas ce qui est **dû**.
- **Articulation de l'accord de 1993 et de l'article 7 de la CCN** (version du
  01/07/2026) : repos entre deux services (12 h ou 11 h), délai de
  modification (une semaine, ou 7 jours et 48 h), contingent d'heures
  supplémentaires (288 h ou 329 h). À un juriste. En attendant (décidé le
  2026-10-05, `REFLEXIONS.md`) : chaque texte est une lecture de la règle,
  la loi générale est la lecture de référence et décide seule du verdict
  (11 h de repos, L3131-1), les autres textes sont signalés en note quand
  ils concluent autrement. L'accord de 1993 et la CCN sont étendus, donc
  obligatoires pour toute entreprise de la branche : la politique du
  dirigeant dit ce qu'il applique, pas ce qui est dû. À verser au dossier :
  l'accord de 1993 ne vise que les agents d'exploitation et les techniciens ;
  la CCN 7.07.3 ne protège le refus que « pour raisons justifiées ».
- Validité de l'accord de 1993 : il se dit conclu pour 3 ans (art. 8), et
  Légifrance le marque en vigueur.
- Le délai de 10 jours laissé au salarié pour renvoyer son avenant de reprise :
  sûreté aérienne seulement, ou tous les secteurs ?
- Les autres articles modifiés par le décret 2025-1344, listés mais non lus
  (`verification-2026-10-05.md`, point 1).
- L'arrêté qui définit les spécialités au sens de R612-14, 2° : sans lui, la
  table poste → activité d'I-02 reste `texte` sans ✓.
- Soc. 7 janvier 2026 (n° 24-15.367), citée par l'arrêt du 16/09/2026 : non
  lue.
- Une carte professionnelle (ou un recyclage) qui expire pendant une
  vacation de nuit : valide « à la date de la vacation » au début, ou sur
  toute sa durée ? Le moteur rend « à vérifier » (T-02, V-3).
- Un poste purement SSIAP exige-t-il une carte professionnelle ? Le moteur
  suppose que non, sur le référentiel de contrôle du CNAPS (p. 3) : à
  confirmer.
- Les quatre questions de droit de la brique B-02 (§ 8).
- Non relus à la source : L612-2, R631-21, R631-23, CCH R143-44, R4512-13,
  MS 46, les majorations de nuit, de dimanche et de jours fériés, et le
  Code du travail sur lequel le moteur s'appuie : L3131-1 (11 h de repos,
  lecture de référence d'I-05), L3121-18 et L3121-19 (la durée quotidienne
  portée à 12 h par accord).

### Dirigeant
- « Vous avez déjà eu un contrôle CNAPS ? Qu'est-ce qu'ils ont regardé ? Et
  relevé ? »
- « Dracar Ultimate, où il faut déclarer vos agents depuis le 1er octobre :
  ils y sont tous ? Qui s'en occupe ? » (I-20)
- « Vous sous-traitez, ou vous êtes sous-traitant ? Comment vous vérifiez les
  cartes de l'autre ? »
- « Votre dernier marché gagné sur un concurrent, ou perdu : comment s'est
  passée la reprise du personnel ? »
- « Qui a le droit de signer un contrat, d'accepter un sous-traitant, d'envoyer
  une offre ? »
- « Le dernier appel d'offres perdu : vous savez pourquoi ? » (I-10, et le
  poids du mémoire technique)

### Exploitation, planning
- « Montrez-moi le planning de la semaine prochaine. Où sont les dates des
  cartes, du SSIAP, du secourisme ? » (I-01 à I-04, I-17)
- « La dernière fois qu'un agent était sur un poste sans la bonne carte ou sans
  le bon niveau, qui s'en est aperçu ? » (tests T-01 à T-06c)
- « Le dernier remplacement au pied levé : racontez. Comment vous gardez trace
  de son accord ? » (I-06, E-02)
- « Quelles règles de repos vous appliquez, concrètement ? » (la pratique,
  à comparer aux deux textes)
- « Le mémento : modifié quand, la dernière fois, et émargé par qui
  depuis ? » (I-12) Puis les consignes d'un site : où elles sont, et si
  l'agent les signe (pratique, aucun texte lu ne l'impose).
- « Vous tenez un registre des contrôles internes ? Montrez-moi. »
- « Le planning de la semaine dernière : pourquoi cet agent sur ce site ? »
  (O-02, O-03 : chaque « parce que » est une préférence)
- « La semaine où il vous manquait du monde, vous avez lâché quoi en
  premier ? » (l'ordre de sacrifice)
- « Les dates des cartes et du SSIAP : qui les met à jour, et quand, la
  dernière fois ? » (D-01)

### Terrain
- « Votre main courante, c'est papier ou tablette ? Qui la relit ? » (et quel
  outil impose le donneur d'ordre)
- « Les rondes : vous pointez comment ? Et si le boîtier PTI se déclenche, il
  se passe quoi ? » (I-15, E-06)
- Relever les mots : « PC », « vac », « doublure », les abréviations propres à
  la maison.
- « Si on vous proposait un remplacement par SMS, vous répondriez ? Jusqu'à
  quelle heure ? Et par un appel automatique ? » (B-02, à poser après avoir
  entendu la douleur)

### Administratif, paie
- « Comment les heures faites arrivent jusqu'à la paie ? Et jusqu'à la
  facture ? Quelqu'un les ressaisit ? » (le passage 6→9)
- « Les vacations de moins de 6 h : il y en a ? Comment elles sont payées
  depuis juillet ? » (I-19)
- « Les majorations de nuit, de dimanche, de jours fériés : quelles valeurs, et
  qui les calcule ? »
- « Qu'est-ce qui revient chaque mois en réclamation des agents ? »

### Commercial, appels d'offres
- « Les acheteurs vous demandent la décomposition du prix horaire ? »
- « Qui écrit le mémoire technique, et en combien de temps ? » (T-12)
- « Les mentions obligatoires sur vos devis, elles sont générées ou tapées ? »
  (I-08)
