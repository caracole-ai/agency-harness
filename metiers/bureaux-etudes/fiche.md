# Bureaux d'études et laboratoires d'essais — fiche métier

Ingénierie et études techniques (NAF **71.12B**), analyses, essais et
inspections techniques (NAF **71.20B**). Première verticale du plan de
prospection de `../reperage` (« plus gros bassin appelable, score moyen le plus
haut »).

Remplie selon `../../GRILLE.md`. État au **2026-09-30** : les textes et la
prospection seulement, **aucun entretien client encore**. Donc rien de
`déclaré` ni de `constaté` : toute ligne `hypothèse` est une question à poser,
pas une règle à coder.

**Aucune ligne `texte` ✓.** La recherche a lu les textes officiels, sans
relecture mot à mot séparée au sens de la grille. Les faits qu'elle a lus
elle-même (certitude H) sont ici en `texte`, les autres en `hypothèse`. Avant
de coder un garde-fou sur une ligne `texte`, relire l'article dans sa version en
vigueur.

Sources :
- `recherche-2026-09-29.md`, dans ce dossier : instantané daté, avec les URL
  et un degré de certitude pour chaque fait. Les renvois « § » de cette fiche
  pointent vers elle.
- `../../methode/socle.md` : les règles communes à tous les outils (G-01 à
  G-07), le calendrier juridique, les faits communs à plusieurs métiers
  (facturation électronique, AI Act, prestataire d'IA sous-traitant). Cette
  fiche ne les recopie pas.
- `../../methode/archetypes.md` : les questions et interdits types de chaque
  sorte de travail.
- `../reperage` : `server/scoring/cibles.ts` (verticale `etudes`),
  `docs/plan-prospection-2026-09.md`.

**Archétypes combinés** (`../../methode/archetypes.md`) :
- **Rédiger**, au cœur : rapports, notes de calcul, rapports d'essai ;
- **Veiller** : éditions des normes citées, portée d'accréditation,
  agréments et certifications, délais de dix ans ;
- **Rapprocher** : résultats d'essai vers le rapport, pièces d'une offre,
  phase livrée vers la facture ;
- **Chercher**, réduit à un **registre des références et des éditions** :
  l'outil ne lit pas les normes (⚠ ci-dessous).

**Quatre sous-métiers, quatre régimes** (§ 0) :
- **BET** (structure, fluides, thermique) et **maîtrise d'œuvre** : aucune
  autorisation d'exercer ; responsabilité décennale de « technicien » (I-01) ;
- **laboratoire d'essais** : accréditation Cofrac volontaire, sauf quand un
  texte ou un contrat l'impose ; règles de rapport strictes (I-07 à I-13) ;
- **contrôle technique** : agrément ministériel, **incompatible avec toute
  conception** (I-03) ;
- **diagnostic immobilier** : certification de la personne, indépendance
  (I-16). Rangé en 71.20B par l'usage, pas par la note Insee.

En nombre, l'ingénierie domine : 496 entreprises de 6 à 49 salariés dans les
Bouches-du-Rhône, contre 85 en essais et inspections (§ 10). Le BET bâtiment y
est probablement majoritaire : `hypothèse`, à trancher fiche par fiche avant
d'appeler.

⚠ **AFNOR s'oppose expressément à toute ingestion de ses normes par une
IA** : intégration dans un algorithme, fouille de textes, enrichissement, sous
peine de contrefaçon, sauf accord écrit d'AFNOR (CGV, art. 7 ; CPI L122-5-3).
L'outil ne lit, n'indexe ni ne résume donc aucune norme, même achetée par le
client (I-05, G-05). La douleur « la bonne version de la norme » se traite par
un registre des références et des éditions (B-02). La portée juridique de la
clause est à faire confirmer par un juriste.

⚠ **Aucune décision publiée n'a été lue** (sinistre, sanction, retrait
d'agrément ou d'accréditation) : la recherche a été coupée par une limite de
session. Les tests ci-dessous sont tous conçus depuis leur texte.

⚠ `../reperage` (`cibles.ts`) décrit ce métier par la « recherche dans les
normes ». Ne jamais le promettre à un prospect.

---

## 0. La chaîne

Aucune chaîne n'est décrite par un texte. Seules les phases de mission ont une
base écrite (R2431-1 à R2431-5 du code de la commande publique ; arrêté du
22/03/2019).

| # | Étape | Entrée | Sortie | Qui | Outil aujourd'hui | Statut |
|---|---|---|---|---|---|---|
| 1 | Consultation, appel d'offres | DCE, cahier des charges | offre : mémoire technique, honoraires, attestation décennale pour un marché public (L241-1) | dirigeant, chef de projet | ? | `texte` (attestation) ; `hypothèse` (le reste) |
| 2 | Contrat | offre retenue | mission, phases, CCAG visé, assurance | dirigeant | ? | `hypothèse` |
| 3 | Données d'entrée | plans, hypothèses du maître d'ouvrage, sondages, relevés, échantillons | dossier d'affaire | chef de projet, technicien | GED, messagerie, LIMS | `hypothèse` |
| 4 | Production | données d'entrée | calcul, modélisation, essai, rapport ou note | ingénieur, technicien, junior | logiciels de calcul, thermique, LIMS, Word | `hypothèse` |
| 5 | Vérification, relecture | projet de rapport | rapport validé | ingénieur confirmé, responsable technique | ? | `hypothèse` |
| 6 | Signature, émission | rapport validé | rapport signé, transmis | signataire autorisé, dirigeant | PDF signé | `texte` (labo, contrôle technique : I-04, I-12) ; `hypothèse` (BET) |
| 7 | Suivi de chantier (maîtrise d'œuvre) | études d'exécution des entreprises | VISA, DET, réception, réserves | chef de projet | ? | `texte` (éléments de mission, R2431-1) |
| 8 | Facturation | phase ou rapport livré | facture, relance | administratif | ? | `hypothèse` |
| ↻ | Archivage, échéances | réception, rapports, agréments | dossier conservé au moins dix ans après la réception ; agréments et accréditations renouvelés | tous | ? | `texte` (dix ans, 1792-4-1) ; `hypothèse` (durée d'archivage, qui la déduit) |

Passages de main à surveiller : 1→2 (ce que l'offre promet n'arrive pas dans
le dossier d'affaire), 3→4 (l'hypothèse de calcul et sa source se perdent),
4→5 (le plus sensible pour un outil qui rédige : ce qui a été vérifié, et par
qui), 6→8 (la phase livrée ne déclenche pas la facture).

## 1. Interdits

| ID | Interdit | Étape | Conséquence | Vérifiable par | Statut | Source |
|---|---|---|---|---|---|---|
| I-01 | Aucun document préparé par l'outil (contrat, offre, courrier) ne contient de clause qui **exclut ou limite la responsabilité décennale** du bureau d'études | 1, 2 | clause « réputée non écrite » ; le BET est constructeur au titre de « technicien » | code (alerte lexicale) + humain | `texte` | C. civ. 1792-1, 1792-5 |
| I-02 | Aucune candidature à un **marché public** ne part sans l'**attestation d'assurance décennale** | 1 | candidature incomplète | code (pièce présente) | `texte` | C. assur. L241-1 |
| I-03 | Contrôle technique : aucune mission de **conception, d'exécution ou d'expertise** acceptée sur un ouvrage, ni **aucun lien** avec ceux qui conçoivent, exécutent ou expertisent | 1 | activité incompatible avec l'agrément | code (croisement des affaires) + humain | `texte` | CCH L125-3, R125-4 |
| I-04 | Contrôle technique : aucun document de contrôle signé par un membre du **personnel d'exécution sans délégation** d'un dirigeant ou de l'encadrement | 6 | document irrégulier | code (liste des délégations) | `texte` | CCH R125-7 III |
| I-05 | **Aucun texte de norme AFNOR** n'est transmis au modèle, indexé ni résumé, même acheté par le client, sans accord écrit d'AFNOR. Seules circulent les **références** (numéro, édition) | toutes | contrefaçon selon AFNOR | code (aucun document de Cobaz, d'AFNOR ou d'une boutique de normes dans les entrées) | `texte` (clause lue) ⚠ portée à valider par un juriste ; licence du CSTB non lue | CGV AFNOR, art. 7 et 12 f ; CPI L122-5-3 III |
| I-06 | Toute **référence normative** citée porte son **édition** ; quand un arrêté fixe l'édition, c'est celle-là | 4, 5 | calcul fondé sur un texte non applicable | code | `texte` | arrêté du 22/10/2010, art. 4 (Eurocode 8, éditions 2005) |
| I-07 | Laboratoire accrédité : aucun résultat **hors portée** d'accréditation dans un rapport qui porte la marque, sauf **explicitement marqué comme non couvert** | 6 | usage abusif de l'accréditation | code (portée à jour) | `texte` | LAB REF 02 rév. 15, § 7.8.1 |
| I-08 | Laboratoire accrédité : tout rapport d'essai dit que les résultats **ne valent que pour l'objet soumis à essai**, ou pour l'échantillon **tel qu'il a été reçu** si le labo n'a pas prélevé | 6 | écart au référentiel ; systématique depuis le 01/03/2026 | code | `texte` | LAB REF 02 rév. 15, § 7.8.2.1 l, § 7.6.1 |
| I-09 | Laboratoire accrédité : toute **modification d'un rapport émis** est identifiée et tracée, l'original est conservé ; aucune réémission sous accréditation pour un simple changement de nom commercial | 6, ↻ | écart au référentiel | code (versions) | `texte` | LAB REF 02, § 7.8.8 |
| I-10 | Laboratoire accrédité : aucun rapport de la portée rendu **hors accréditation** sans accord contractuel documenté, et jamais quand l'accréditation est obligatoire ou le rapport destiné au public ou aux autorités | 6 | suspension, retrait, publication | humain, avec une alerte calculée | `texte` | GEN REF 11 rév. 11, § 7 |
| I-11 | Laboratoire accrédité : aucune **référence trompeuse** à l'accréditation (marque, mention, document commercial) | 1, 6 | usage abusif : suspension ou retrait, publication | code (lexical) + humain | `texte` | GEN REF 11, § 9 |
| I-12 | Laboratoire accrédité : aucun rapport émis sans la **personne autorisant le rapport** ; toute validation déléguée est traçable | 6 | écart au référentiel | code (liste des signataires) | `texte` | LAB REF 02, § 6.2.6 |
| I-13 | Laboratoire accrédité : l'outil qui produit ou met en forme un rapport n'est **pas mis en service sans validation** documentée, comme tout système informatisé (LIMS, GED) | ↻ | écart au référentiel ; résultats contestables | humain (dossier de validation) | `texte` | LAB REF 02, § 7.11 |
| I-14 | Marché public sous CCAG-PI : les informations de l'acheteur ne servent **qu'au marché** ; tout sous-traitant, **y compris le fournisseur du modèle**, en est informé et tenu | 3, 4 | pénalité de 0,5 % du montant exécuté, 2 % si des données personnelles sont en cause | code (cloisonnement) + humain (contrat) | `texte` (clause) ; `hypothèse` (fournisseur du modèle = sous-traitant, § 11) | CCAG-PI 2021, art. 5.1.2, 5.1.3, 14.2 |
| I-15 | Aucune **hypothèse de calcul** ni donnée d'entrée n'est modifiée par l'outil ; un écart entre deux versions est signalé | 4, 5 | calcul faux sous signature humaine | code | `hypothèse` (garde-fou de la page du site ; qui a le droit de changer une hypothèse est à demander) | page du site ; `../../methode/archetypes.md`, Rédiger |
| I-16 | Diagnostic : aucun diagnostic établi par une personne **non certifiée, non assurée**, ou **liée** au propriétaire ou à une entreprise de travaux | 4, 6 | diagnostic irrégulier | code (certification et assurance à la date) + humain (liens) | `texte` (L271-6) ; `hypothèse` (R271-1, non affiché) | CCH L271-6 |
| I-17 | RE2020 : aucune **attestation d'achèvement** préparée sans **visite sur site** enregistrée, ni par quelqu'un hors des cinq catégories de R122-25 | 6 | attestation irrégulière | code (visite présente, catégorie) | `texte` ⚠ qui agrée le « bureau d'étude agréé » : non trouvé | CCH R122-24-3, R122-25 |
| I-18 | Aucune **échéance** — agrément du contrôleur technique (5 ans au plus), accréditation, certification du diagnostiqueur, attestation décennale — n'atteint sa date sans une alerte donnée assez tôt pour renouveler | ↻ | activité exercée sans titre | code | `texte` (agrément 5 ans : R125-1) ; `hypothèse` (les autres durées, non lues) | CCH R125-1 ; `../../methode/archetypes.md`, Veiller |

## 2. Tests types

Données fictives et génériques. Aucun test n'est encore issu d'un incident
raconté, ni d'une décision publiée (⚠ en tête).

| ID | Étant donné | Quand | Alors | Interdit | Statut | Source |
|---|---|---|---|---|---|---|
| T-01 | un projet de contrat de maîtrise d'œuvre qui contient « la responsabilité du bureau d'études est limitée au montant des honoraires, y compris au titre de l'article 1792 » | on prépare l'envoi | la clause est signalée comme réputée non écrite, et escaladée au dirigeant | I-01 | `hypothèse` | conçu depuis l'interdit |
| T-02 | une candidature à un marché public dont les pièces ne comprennent aucune attestation décennale | on contrôle la complétude | la candidature est déclarée incomplète, avec la pièce manquante | I-02 | `hypothèse` | conçu depuis l'interdit |
| T-03 | un contrôleur technique missionné sur un ouvrage, et une demande d'étude de structure pour ce même ouvrage | on ouvre la nouvelle affaire | refus : incompatible avec l'agrément, escalade au dirigeant | I-03 | `hypothèse` | conçu depuis l'interdit |
| T-04 | un rapport de contrôle technique signé par un technicien absent de la liste des délégations | on prépare l'émission | émission bloquée, avec le motif | I-04 | `hypothèse` | conçu depuis l'interdit |
| T-05 | un PDF téléchargé depuis Cobaz, déposé dans le dossier d'affaire | l'outil prépare la note | le fichier est exclu des entrées du modèle ; la note ne cite que la référence et l'édition | I-05 | `hypothèse` | conçu depuis l'interdit |
| T-06 | une note de calcul parasismique qui cite « NF EN 1998-1 » sans édition | on vérifie la note | signalée : édition absente ; l'arrêté applicable fixe l'édition de septembre 2005 | I-06 | `hypothèse` | conçu depuis l'interdit |
| T-06b | une note qui cite une édition de l'Eurocode 8 postérieure à celle fixée par l'arrêté | on vérifie la note | signalée : édition différente de celle exigée ; décision humaine | I-06 | `hypothèse` | conçu depuis l'interdit |
| T-07 | un rapport d'essai sous accréditation qui contient un essai absent de la portée | on prépare l'émission | émission bloquée tant que le résultat n'est pas marqué « non couvert par l'accréditation » | I-07 | `hypothèse` | conçu depuis l'interdit |
| T-08 | un rapport d'essai sans la mention « ne vaut que pour l'objet soumis à essai », sur un échantillon apporté par le client | on prépare l'émission | émission bloquée ; la mention attendue est celle de l'échantillon « tel qu'il a été reçu » | I-08 | `hypothèse` | conçu depuis l'interdit |
| T-09 | un rapport émis, corrigé après une remarque du client | on prépare la nouvelle version | la modification est identifiée, l'original conservé, les deux versions liées | I-09 | `hypothèse` | conçu depuis l'interdit |
| T-09b | un client demande la réémission d'un rapport accrédité parce que le nom commercial de son produit a changé | on traite la demande | refus de réémettre sous accréditation, escalade au responsable technique | I-09 | `hypothèse` | conçu depuis l'interdit |
| T-10 | un essai de la portée, commandé pour un dossier destiné à une autorité | on prépare un rapport hors accréditation | bloqué, escaladé au responsable technique | I-10 | `hypothèse` | conçu depuis l'interdit |
| T-11 | une plaquette commerciale qui dit « tous nos essais sont accrédités » alors que la portée n'en couvre qu'une partie | on vérifie le document | la phrase est signalée comme référence trompeuse | I-11 | `hypothèse` | conçu depuis l'interdit |
| T-12 | un rapport validé par un technicien, sans personne autorisant le rapport enregistrée | on prépare l'émission | émission bloquée, avec la liste des signataires autorisés | I-12 | `hypothèse` | conçu depuis l'interdit |
| T-13 | un laboratoire accrédité qui veut utiliser l'outil de mise en forme des rapports | on prépare la mise en service | la mise en service attend le dossier de validation (spécifications, preuves, résultats des tests) | I-13 | `hypothèse` | conçu depuis l'interdit |
| T-14 | un dossier d'affaire d'un marché public sous CCAG-PI | l'outil prépare le rapport d'une autre affaire | aucune donnée de ce dossier n'est lue ni citée | I-14 | `hypothèse` | conçu depuis l'interdit |
| T-15 | une note de calcul en version 2 dont une hypothèse de charge diffère de la version 1 | l'outil prépare la mise en forme | l'écart est signalé, la valeur n'est pas changée | I-15 | `hypothèse` | conçu depuis l'interdit |
| T-16 | un diagnostiqueur dont la certification a expiré le mois dernier | on prépare un rapport de diagnostic à son nom | bloqué : certification non valide à la date | I-16 | `hypothèse` | conçu depuis l'interdit |
| T-17 | une attestation RE2020 d'achèvement demandée sans visite sur site enregistrée | on prépare l'attestation | bloquée : visite sur site requise | I-17 | `hypothèse` | conçu depuis l'interdit |
| T-18 | un agrément de contrôle technique qui arrive à échéance dans 5 mois, sans renouvellement engagé | contrôle quotidien des échéances | alerte au dirigeant, avec la date limite | I-18 | `hypothèse` | conçu depuis l'interdit |
| T-18b | une attestation décennale dont la date de validité est inconnue | on prépare une candidature | alerte « date inconnue », pas de silence | I-18, I-02 | `hypothèse` | `../../methode/archetypes.md`, Veiller |

## 3. Connecteurs

| Outil ou catégorie | Usage | Étape | Accès | Lecture / écriture | Qui le tient | Statut |
|---|---|---|---|---|---|---|
| Calcul de structure (éditeurs relevés : Graitec, Dlubal, SCIA, CYPE) | notes de calcul | 4 | inconnu | lecture des résultats ; **aucune écriture d'hypothèse** (I-15) | ingénieurs | `hypothèse` (éditeurs vus sur leur site) |
| Thermique, RE2020 (Izuba, BBS Logiciels) | études thermiques, attestations | 4, 6 | inconnu | lecture | ingénieurs thermiciens | `hypothèse` |
| LIMS (éditeur relevé : LabWare) | résultats d'essai, traçabilité | 3 à 6 | inconnu | lecture ; l'outil branché dessus est un système à valider (I-13) | laboratoire | `texte` (LIMS dans le champ de § 7.11) ; `hypothèse` (éditeurs) |
| Gestion d'affaires | phases, temps, facturation | 1, 8 | inconnu | lecture | administratif | `hypothèse` (aucun logiciel propre aux BET confirmé ; OOTI vise les architectes) |
| Accès aux normes : Cobaz, Sagaweb (AFNOR), boutique du CSTB | consulter les normes | 4 | abonnement | **aucune lecture par l'outil** (I-05) | ingénieurs | `texte` (CGV AFNOR) ; `hypothèse` (licence CSTB) |
| Modèles de rapports, paragraphes types | rédiger | 4 | fichiers Word, serveur | lecture | BET | `hypothèse` |
| Messagerie, GED | données du maître d'ouvrage | 3 | inconnu | lecture, cloisonnée par affaire (I-14) | tous | `hypothèse` |
| Formats : IFC, BCF, DWG, tableurs, PDF signés | échanges | 3 à 6 | fichiers | lecture | — | `hypothèse` |
| Annuaire public des diagnostiqueurs (L271-6) | vérifier une certification | ↻ | site public | lecture | — | `texte` (existence) ; `hypothèse` (format) |
| Liste Cofrac des suspensions et retraits | veille | ↻ | page dynamique | lecture | — | `hypothèse` (non lue) |

## 4. Moments d'escalade

| ID | Déclencheur | Étape | Qui reprend | Délai | Ce qu'on lui présente | Statut |
|---|---|---|---|---|---|---|
| E-01 | émission, signature ou transmission de tout rapport, note, avis ou attestation | 6 | le signataire autorisé | avant l'envoi | le document, ses vérifications, ce qui reste à vérifier | `texte` (labo, contrôle : I-04, I-12) ; `hypothèse` (BET : délégation interne, aucun titre réservé) |
| E-02 | une hypothèse de calcul, une déclaration de conformité, une réponse à une réserve du contrôleur, un visa | 4, 5, 7 | ingénieur confirmé | avant de rendre la main | l'élément, sa source, l'écart éventuel | `hypothèse` (ce qu'un junior ne valide pas seul) |
| E-03 | un résultat hors portée, ou un rapport demandé hors accréditation | 6 | responsable technique du laboratoire | avant l'émission | la portée, la demande, l'usage prévu du rapport | `texte` (I-07, I-10) |
| E-04 | une demande de mission incompatible avec un agrément de contrôle technique | 1 | dirigeant | avant tout engagement | l'ouvrage, la mission en cours, la demande | `texte` (I-03) |
| E-05 | une clause qui limite la décennale dans un projet de contrat | 2 | dirigeant | avant signature | la clause et l'article 1792-5 | `texte` (I-01) |
| E-06 | un ouvrage qui entre dans les critères du contrôle technique obligatoire (ERP de 1re à 4e catégorie, plancher à plus de 28 m…), sans contrôleur désigné au dossier | 1, 3 | chef de projet, qui le signale au maître d'ouvrage | au plus tôt | les critères remplis et l'article | `texte` (R125-17) ; `hypothèse` (qui signale) |
| E-07 | une référence normative dont l'édition applicable est incertaine | 4, 5 | ingénieur | avant la vérification | la référence, les éditions possibles, le texte qui fixe l'édition s'il existe | `hypothèse` |

## 5. Vocabulaire

| Terme | Définition | Synonymes, abréviations | Piège | Statut |
|---|---|---|---|---|
| Réception | acte par lequel le maître de l'ouvrage accepte l'ouvrage, avec ou sans réserves ; point de départ des dix ans | — | au laboratoire : l'arrivée de l'échantillon (« tel qu'il a été reçu ») | `texte` (1792-6) |
| Visa | élément de mission : examen de conformité au projet des études d'exécution de l'entreprise | VISA | pas une approbation générale ; ne transfère pas la conception. Chez un avocat, « visa » a un autre sens | `texte` |
| Avis | celui du contrôleur technique au maître de l'ouvrage (L125-1) | — | au laboratoire, les « avis et interprétations » relèvent de la portée | `texte` |
| Agrément / accréditation / certification / qualification | agrément ministériel (contrôle technique) ; accréditation Cofrac (laboratoire) ; certification de la personne (diagnostiqueur) ; qualification OPQIBI (BET, volontaire) | — | quatre régimes distincts ; le « bureau d'étude agréé » de R122-25 n'a pas d'agrément défini | `texte` / `hypothèse` (OPQIBI) |
| Validation | 17025 : preuve qu'une méthode ou un système informatisé répond à l'usage | — | dans la maison : « le chef a validé » | `texte` |
| APS / APD | avant-projet sommaire / définitif | — | le code ne connaît que « l'avant-projet » : les sigles sont d'usage | `texte` |
| ESQ, PRO, ACT, EXE, DET, OPC, AOR | éléments de mission de maîtrise d'œuvre | — | sigles d'usage, absents du code et de l'arrêté de 2019 | `hypothèse` |
| DCE | dossier de consultation des entreprises | — | une pièce, pas une phase : il se prépare dans l'assistance à la passation | `texte` |
| Diagnostic | élément de mission de maîtrise d'œuvre (R2431-1) | DIA | ≠ diagnostic immobilier réglementé (L271-6) : autre métier, autre responsabilité | `texte` |
| Contrôle | contrôle technique agréé | — | aussi : autocontrôle de l'entreprise, contrôle interne du BET, contrôle qualité du labo | `texte` |
| Norme, NF DTU, Eurocode | normes volontaires sauf arrêté | DTU, EC | « obligatoire » veut dire soit par arrêté, soit par le contrat qui la cite | `texte` (volontaire) ; `hypothèse` (force par contrat) |
| Portée | liste des essais et méthodes couverts par l'accréditation | — | un essai bien fait mais hors portée ne se rapporte pas sous accréditation | `texte` |
| Mission de base | ensemble minimal imposé en construction neuve publique | — | rien ne l'impose en marché privé ; en réhabilitation, sans l'esquisse | `texte` / `hypothèse` (privé) |
| Personne autorisant le rapport | signataire d'un rapport d'essai accrédité | signataire | ≠ celui qui a fait l'essai ou validé les résultats | `texte` |

## 6. Le bon résultat

Rien de publié trouvé. Les préférences ci-dessous sont celles qu'on s'attend à
trouver ; **leur ordre de sacrifice est propre à chaque client**.

| ID | Objectif ou préférence | Étape | Qui y tient | Ordre de sacrifice | Statut | Source |
|---|---|---|---|---|---|---|
| O-01 | le rapport dans le **modèle maison**, avec les paragraphes types déjà validés | 4 | dirigeant, clients | à recueillir | `hypothèse` | déduction |
| O-02 | chaque référence normative citée avec son **édition** | 4, 5 | ingénieurs | probablement jamais sacrifié : alors c'est l'interdit I-06 | `hypothèse` | déduction |
| O-03 | les hypothèses de calcul **explicites et sourcées** en tête de note | 4 | ingénieur confirmé, contrôleur | à recueillir | `hypothèse` | déduction |
| O-04 | la livraison dans le délai de la phase, qui déclenche la facture | 6, 8 | dirigeant | à recueillir | `hypothèse` | déduction |
| O-05 | la mise en forme soignée | 4 | clients | probablement sacrifiée avant la vérification | `hypothèse` | recherche, § 7 |

## 7. Les données

Volumes à mesurer chez chaque client : affaires par an, rapports par mois,
ingénieurs et juniors, essais par mois.

| ID | Donnée | Sert à | Où elle vit | Fraîcheur, fiabilité | Qui la tient | Statut |
|---|---|---|---|---|---|---|
| D-01 | plans, maquettes, hypothèses du maître d'ouvrage | produire le rapport | DCE, GED, messagerie | ? ; **confidentielles** (I-14) | chef de projet | `hypothèse` |
| D-02 | modèles de rapports, paragraphes types | rédiger (B-01) | serveur, Word | ? | BET | `hypothèse` |
| D-03 | références normatives citées et leur édition | I-06, B-02 | la tête des ingénieurs, un tableur | **inconnue** ; jamais le texte des normes (I-05) | ingénieurs | `hypothèse` |
| D-04 | portée d'accréditation, méthodes et leurs versions | I-07, I-10 | système qualité, LIMS | **doit être à jour, sinon le garde-fou est faux** : premier risque à lever au labo | responsable qualité | `hypothèse` |
| D-05 | résultats d'essai bruts | rapport d'essai | LIMS, tableurs, fichiers d'appareils | traçabilité exigée par la norme | laboratoire | `hypothèse` |
| D-06 | liste des signataires et des délégations | I-04, I-12, E-01 | organigramme, système qualité | ? | dirigeant, qualité | `hypothèse` |
| D-07 | attestations d'assurance décennale, agréments, accréditation, certifications | I-02, I-16, I-18 | administratif | dates de validité : ? | administratif | `hypothèse` |
| D-08 | dates de réception des ouvrages | archivage, I-18 | dossier d'affaire | ? | chef de projet | `hypothèse` |
| D-09 | phases livrées et facturées | O-04, B-05 | gestion d'affaires, tableur | ? | administratif | `hypothèse` |

## 8. Briques à proposer

Ce qu'on sait construire pour ce métier, à proposer **en fin d'entretien**,
chacune en réponse à une douleur entendue. Les trois premières répondent aux
trois douleurs de la page du site (`../smart-tailor`, `verticals.etudes`).

| ID | Brique | Douleur qu'elle traite | Interdits qu'elle doit respecter | Ce qui la qualifie (questions) | Statut |
|---|---|---|---|---|---|
| B-01 | **Préparation du rapport** depuis les données de l'affaire, dans le modèle maison ; le signataire relit | « Un rapport sur deux, c'est de la mise en forme et des paragraphes qu'on a déjà écrits cent fois » | I-05, I-07 à I-09, I-12, I-13, I-15 ; G-01 | rapports par mois ; temps de mise en forme par rapport ; le modèle maison existe-t-il, et qui le tient ; qui signe | `hypothèse` |
| B-02 | **Registre et veille des références** : chaque référence citée avec son édition, la date de vérification, l'alerte quand une édition change ou qu'un arrêté en fixe une autre ; **sans lire les normes**. Premier pilote par défaut | « La bonne version de la norme, on la cherche à chaque fois » | I-05, I-06, I-18 | combien de références suivies ; où ; la dernière édition périmée repérée, et par qui ; qui reçoit l'alerte | `hypothèse` |
| B-03 | **Liste de vérifications** passée avant de rendre la main : mentions obligatoires, portée, unités, éditions, pièces manquantes | « Le junior rend une note propre, mais il manque toujours la même vérification » | I-06 à I-08, I-15 | la vérification qui manque toujours : laquelle ; combien de retours par mois ; qui relit | `hypothèse` |
| B-04 | **Complétude de l'offre** : pièces du DCE, attestation décennale | hors page du site | I-02, I-11 | appels d'offres par an ; la dernière candidature rejetée pour une pièce | `hypothèse` |
| B-05 | **Suivi phase par phase jusqu'à la facture** | hors page du site | aucune écriture comptable sans validation (G-01) | la dernière phase livrée et facturée en retard ; combien de jours | `hypothèse` |

**Pour un laboratoire accrédité**, toute brique qui produit ou met en forme un
rapport est un système informatisé à valider (I-13). Le dossier de validation
fait partie de la livraison, et se prévoit dès le devis.

---

## Questions ouvertes

### À trancher sur texte ou par un juriste (pas chez le client)

- **La portée de l'opposition d'AFNOR** (CGV, art. 7) pour un outil qui ne
  lit que les références, et pour les notes internes d'un BET qui paraphrasent
  une norme. La licence du CSTB.
- **Le fournisseur du modèle est-il un sous-traitant** au sens du CCAG-PI
  (5.1.3) ? Un modèle hébergé chez le client change-t-il l'analyse ?
- Qui agrée le « **bureau d'étude agréé** » de R122-25 ?
- Le calendrier officiel des **Eurocodes de deuxième génération** (retrait de
  la première visé pour mars 2028, source secondaire), et son articulation avec
  l'arrêté parasismique qui cite l'édition 2005.
- La **zone sismique** d'Aix-en-Provence et de Marseille (Salon-de-Provence
  est en zone 4).
- ISO/IEC 17020 et le document Cofrac INS REF 02 (organismes d'inspection).
- CCAG-MOE 2021 : confidentialité et propriété intellectuelle.
- R271-1 et le régime du DPE ; seuils RE2020.
- Syntec : classification en vigueur, travail hybride, contingent de 90 h.
- **Toute décision publiée** : sinistres, sanctions, retraits d'accréditation
  (liste Cofrac), contentieux de contrôle technique.
- Relecture mot à mot, dans leur version en vigueur, des articles cités en
  `texte` avant d'en coder un garde-fou.

### Dirigeant
- « Vous êtes plutôt structure, fluides, thermique, maîtrise d'œuvre ?
  Laboratoire ? Contrôle ? Diagnostic ? » (le sous-métier décide de tout le
  reste)
- « Qui signe les rapports ? Qu'est-ce qu'un junior ne peut pas valider
  seul ? » (E-01, E-02)
- « Vous répondez à des marchés publics ? Sous quel CCAG ? » (I-02, I-14)
- « Le dernier rapport qui est revenu : qu'est-ce qui clochait ? » (tests)
- « Qu'est-ce qui ne doit jamais sortir de chez vous ? Vos maîtres d'ouvrage
  vous l'imposent par contrat ? » (I-14, G-06)

### Chef de projet, ingénieur
- « Le dernier rapport : combien de temps en mise en forme, combien en calcul
  et en vérification ? » (B-01)
- « La dernière fois qu'une note citait une norme dans une édition périmée :
  qui s'en est aperçu ? » (I-06, B-02)
- « Les hypothèses de calcul, où sont-elles écrites, et qui peut les
  changer ? » (I-15, D-01)
- « Une réserve du contrôleur technique : qui y répond ? » (E-02)

### Junior
- « Qu'est-ce qu'on vous corrige le plus souvent ? » (B-03 : la vérification
  qui manque toujours)
- « Quand vous hésitez sur une édition de norme, vous faites comment ? »

### Qualité, responsable technique (laboratoire)
- « La portée d'accréditation : où est-elle, qui la tient à jour ? » (D-04)
- « La révision 15 de LAB REF 02, au 1er mars : qu'est-ce qu'elle a changé
  dans vos modèles de rapport ? » (I-08)
- « Un rapport amendé : comment vous le tracez ? » (I-09)
- « Le LIMS a été validé comment ? Qui ferait la validation d'un nouvel
  outil ? » (I-13)
- « Le dernier écart relevé par le Cofrac ? » (tests)

### Administratif
- « La facture part quand une phase est livrée ? Qui le sait ? » (B-05)
- « Les attestations décennales, les agréments, les certifications : où sont
  leurs dates ? » (D-07, I-18)
- « La facture électronique : vous recevez déjà par une plateforme
  agréée ? » (`../../methode/socle.md` § 3)
