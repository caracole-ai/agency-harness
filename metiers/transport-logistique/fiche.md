# Transport et logistique — fiche métier

Commissionnaires de transport et affréteurs, transporteurs routiers de
marchandises, entrepositaires, et en marge la place portuaire de Marseille-Fos.
NAF **52.29B** d'abord (affrètement, organisation des transports), puis
**49.41A/B** (transport routier de fret) ; 52.29A, 52.24A/B, 52.10A/B et 50.20Z
au cas par cas.

Remplie selon `../../GRILLE.md`. État au **2026-09-30** : les textes et la
prospection seulement, **aucun entretien client encore**. Donc rien de
`déclaré` ni de `constaté` : toute ligne `hypothèse` est une question à poser,
pas une règle à coder.

**Aucune ligne `texte` ✓** : aucun article n'a encore été relu mot à mot au
sens de la grille. Les lignes `texte` ont été lues dans le texte officiel en
vigueur par la recherche (certitude H), mais se relisent avant de coder un
garde-fou. Les lignes de certitude M ou B de la recherche sont ici en
`hypothèse`.

**Archétypes** (`../../methode/archetypes.md`) :
- **Rapprocher**, au cœur : lire les LV, CMR et POD, les rattacher au dossier,
  dire ce qui manque avant la facture ;
- **Veiller** : délais de réserve, de protestation et de prescription ;
  téléchargements du chronotachygraphe ;
- **Rédiger** : brouillons de protestation et de relance, factures avec leurs
  mentions ;
- **Planifier**, en secondaire, pour le transporteur routier (temps de
  conduite).

Les règles communes à tout outil (G-01 à G-07 : rien ne sort sans un humain,
ne pas deviner, source de chaque sortie, pas de qualification juridique, pas
d'écriture chez un tiers, données cloisonnées, minimum de données
personnelles), la mécanique des délais et les faits communs (facturation
électronique, sous-traitance au sens du RGPD, AI Act) sont dans
`../../methode/socle.md` : cette fiche ne les recopie pas.

Sources :
- `recherche-2026-09-29.md`, dans ce dossier : instantané daté, avec les URL
  et un degré de certitude pour chaque fait. Les références « § » ci-dessous
  renvoient à elle.
- `recherche-frigorifique-2026-09-29.md`, dans ce dossier (copiée le
  2026-09-30 depuis le dossier de travail du skill, non versionné, où
  `recherche-2026-09-29.md` la cite encore) : temps de conduite,
  chronotachygraphe, conducteurs, ATP.
  **Repris sans relecture** : ses lignes portent « (frigo) ».
- le dépôt voisin `reperage` : `server/scoring/cibles.ts` (verticale
  `logistique` : « BL, CMR, lettres de voiture, manifestes : des documents
  ressaisis à la main, et des dossiers incomplets à relancer ») et
  `data/reperage.db` : **157 commissionnaires prospectables en 52.29B, dont 89
  de 10 à 49 salariés** ; 389 transporteurs routiers (relevé du 2026-09-29).

**Pourquoi le commissionnaire d'abord** : son métier est documentaire par
obligation. Il vérifie les documents (contrat type de commission, art. 5.2 et
5.3), tient un registre d'affrètement avec son prix d'achat et son prix de
vente (arrêté du 11/02/1991, art. 7), et **répond de ses substitués**
(L132-6). Un dossier incomplet lui coûte une marge et une responsabilité.

Contexte chiffré, pour situer la douleur : taux de marge du transport routier
de fret de 11,2 % en 2023, contre 20,9 % pour l'ensemble du transport de
marchandises (SDES) ; 2 995 défaillances dans le transport et l'entreposage
en 2024, le plus haut depuis 2000 ; 237 défaillances en transport et
logistique en PACA en 2025 (Altares). Le détail est dans la recherche, § 10.

⚠ **Délais de réserve : trois régimes.** 3 jours en droit interne (L133-3,
jours fériés non compris), 7 jours en CMR pour une avarie non apparente et 21
jours pour un retard (art. 30, dimanches et jours fériés non compris), 1 an de
prescription dans les deux cas. Le régime dépend du transport (intérieur ou
international) : **le régime applicable à un dossier est une donnée à
porter, jamais à supposer.**

⚠ **eFTI n'oblige pas les transporteurs.** Le règlement 2020/1056 oblige les
**autorités** à accepter les informations électroniques. Date calculée, non lue
telle quelle : le 09/07/2027. « e-CMR obligatoire en 2026 » est un amalgame
de blogs d'éditeurs (§ 2.7).

---

## 0. La chaîne

| # | Étape | Entrée | Sortie | Qui | Outil aujourd'hui | Statut |
|---|---|---|---|---|---|---|
| 1 | Cotation | demande libre du chargeur (mail, portail, EDI) | prix proposé | commercial, exploitant | mail, bourse de fret | `hypothèse` |
| 2 | Ordre de transport | commande du chargeur | ordre avec lieux, dates, poids, instructions, transmis **par écrit avant la présentation du véhicule** (L3222-4) | chargeur → exploitation | mail, portail, EDI IFTMIN, TMS | `texte` (L3222-4) ; `hypothèse` (outil) |
| 3 | Affrètement (commissionnaire) | ordre de transport | confirmation d'affrètement, ligne au registre, document justifiant du prix (L3221-3) ; instructions répercutées au substitué | exploitant | TMS, tableur, bourse de fret | `texte` (arrêté 1991 ; contrat type de commission, art. 5.6) ; `hypothèse` (outil) |
| 4 | Chargement | marchandise, ordre | LV ou CMR établie **avant l'exécution** ; réserves au départ | chauffeur, quai de l'expéditeur | papier, e-CMR | `texte` (arrêté 1999, art. 4 ; CMR art. 8) |
| 5 | Suivi, attente | heures d'arrivée et de départ | document de suivi signé, qui fait foi (L3222-5) ; immobilisation facturable | exploitant, chauffeur | application conducteur, téléphone | `texte` ; `hypothèse` (outil) |
| 6 | Livraison | marchandise, LV | LV émargée avec nom, date, heure et cachet = POD ; réserves du destinataire | chauffeur, quai du destinataire | papier, photo, e-CMR | `texte` (contrat type général, art. 9) |
| 7 | Retour des documents | POD | POD à l'exploitation | chauffeur → exploitation | papier le soir, scan, photo | `hypothèse` (douleur n° 1 de la page du site) |
| 8 | Contrôle du dossier, facture | dossier, POD, heures, indices carburant | facture avec charges carburant apparentes (L3222-1) et mentions obligatoires | exploitation → facturation | TMS, logiciel de facturation | `texte` (mentions) ; `hypothèse` (outil) |
| 9 | Encaissement | facture | paiement sous 30 jours après émission | client | — | `texte` (contrat type général, art. 19.1) |
| 10 | Litige | avarie, perte, retard | protestation, réclamation, avoir, action | facturation, direction, assureur | courrier, mail | `texte` (délais) ; `hypothèse` (qui) |
| ↻ | Délais et échéances | dates de livraison, de remise, de téléchargement | alertes | exploitation, litiges | ? | `texte` (délais) ; `hypothèse` (outil) |

Passages de main à surveiller : **2→3** (les exigences du client ne passent
pas au substitué, alors que le contrat type de commission l'impose), **6→7**
(la POD revient tard, illisible, ou pas du tout), **7→8** (le dossier
incomplet se découvre à la facturation).

## 1. Interdits

| ID | Interdit | Étape | Conséquence | Vérifiable par | Statut | Source |
|---|---|---|---|---|---|---|
| I-01 | Aucune **lettre de voiture intérieure** n'est tenue pour complète sans ses mentions minimales : date d'établissement ; nom, adresse et SIREN ou n° de TVA du transporteur ; date de prise en charge ; nature et quantité, poids ou volume ; expéditeur ; adresse complète de chargement ; destinataire ; adresse complète de déchargement. En cabotage, en plus : l'immatriculation et la date de déchargement | 4, 8 | manquement au contrôle ; dossier fragile en litige | code | `texte` | arrêté du 09/11/1999, art. 4 II et III |
| I-02 | Aucune **lettre de voiture CMR** n'est tenue pour complète sans ses 11 mentions obligatoires (art. 6.1 a à k), dont la mention de **soumission à la CMR** | 4, 8 | sans la mention k, le transporteur répond de tous frais et dommages de l'ayant droit | code | `texte` | CMR art. 6.1 et 7.3 |
| I-03 | Aucune livraison n'est tenue pour **prouvée** sans une POD qui porte la signature du destinataire, son **nom**, la **date**, l'**heure** et le **cachet** (ou un autre moyen d'identification incontestable). Sans POD rendue avant le départ, la remise est confirmée au donneur d'ordre **au plus tard à midi du premier jour ouvrable suivant** | 6, 7 | présomption de livraison conforme perdue | code | `texte` | contrat type général, art. 9.2 et 9.3 |
| I-04 | Aucun **délai de réserve ou de protestation** n'expire sans une alerte donnée assez tôt pour agir : 3 jours en droit interne (jours fériés non compris, par acte extrajudiciaire ou lettre recommandée) ; en CMR, 7 jours pour une avarie non apparente et 21 jours pour un retard (dimanches et jours fériés non compris, jour de livraison exclu) | ↻, 10 | l'action pour avarie ou perte partielle s'éteint (L133-3) ; présomption de réception conforme (CMR art. 30) | code | `texte` | C. com. L133-3 ; CMR art. 30 |
| I-05 | Aucune **prescription** n'expire sans alerte : 1 an (avaries, pertes, retards et autres actions) ; 3 ans en CMR en cas de dol ou de faute équivalente ; **1 mois** pour l'action récursoire ; en maritime, 1 an contre le transporteur et 3 mois pour l'action récursoire | ↻, 10 | recours perdu | code | `texte` | C. com. L133-6 ; CMR art. 32 ; C. transports L5422-18 et L5422-25 |
| I-06 | Chaque opération confiée par le commissionnaire est inscrite au **registre d'affrètement**, dans l'ordre chronologique, avec au moins le transporteur affrété, les lieux, la nature et le poids, les dates et heures, le **n° de la lettre de voiture**, le **prix facturé au client** et le **prix payé au transporteur** ; le registre se conserve **3 ans** | 3 | manquement au contrôle | code | `texte` | arrêté du 11/02/1991, art. 6 et 7 |
| I-07 | Aucun affrètement sans : un substitué **habilité** (inscrit au registre, licence valide à la date du transport) ; **toutes** les instructions du donneur d'ordre répercutées au substitué ; les documents qui suivent jusqu'à la livraison | 3 | le commissionnaire est garant de ses substitués ; une instruction non suivie peut devenir une faute inexcusable, qui fait sauter les plafonds | code (présence, validité) + humain (contenu des instructions) | `texte` | contrat type de commission, art. 5.6.1 à 5.6.4 ; C. com. L132-4 à L132-6, L133-8 ; C. transports R3211-12 |
| I-08 | Une **instruction du client contraire à la réglementation** n'est jamais exécutée : le commissionnaire la refuse | 2, 3 | responsabilité du commissionnaire | humain | `texte` | contrat type de commission, art. 5.4.2 |
| I-09 | Aucune **assurance marchandises** n'est souscrite pour le client sans son **ordre écrit, répété pour chaque envoi** | 3 | engagement non voulu | code (ordre écrit présent) | `texte` | contrat type de commission, art. 7 |
| I-10 | Aucun prix offert ou pratiqué **sous les charges** (charges légales, énergie, amortissement, frais de route, péages, documents) ; aucun affrètement **sous-rémunéré** | 1, 3 | 90 000 € d'amende, pour le prestataire comme pour le donneur d'ordre | humain, avec une alerte calculée | `texte` | C. transports L3221-1, L3221-4, L3242-2, L3242-4 |
| I-11 | Chaque affrètement de **véhicule complet** a son **document justifiant du prix conclu**, communicable sur demande | 3 | refus de le communiquer : 6 mois et 3 750 € | code (présence) | `texte` | L3221-3, L3242-5 |
| I-12 | Le prix est **révisé de plein droit** selon la variation du carburant, et les charges carburant sont **apparentes sur la facture** ; à défaut de clause, les indices CNR s'appliquent. Règle d'ordre public, valable aussi pour le contrat de commission | 8 | 15 000 € d'amende pour le cocontractant qui ne l'applique pas | code | `texte` | L3222-1, L3222-2, L3222-9, L3242-3, L1432-11 |
| I-13 | Aucune facture n'est émise sans ses **mentions obligatoires** : date d'exigibilité (paiement sous 30 jours après émission), taux des pénalités de retard (5 fois le taux légal), indemnité forfaitaire de recouvrement de 40 € | 8 | facture contestable | code | `texte` | contrat type général, art. 19.1 à 19.4 ; contrat type de commission, art. 12 |
| I-14 | Aucun contrat de transport sans **estimation des temps** des tâches (chargement, déchargement, attente), avec leur rémunération ou leurs pénalités | 2 | contrat **nul** | humain (lecture du contrat), avec une liste de contrôle | `texte` | L3222-8 |
| I-15 | **Groupage et opérations successives** : une LV par jour au minimum et un **état récapitulatif**, à produire sous 3 jours francs s'il manque au contrôle ; pour le commissionnaire, une LV ou un récépissé par expédition et un **bordereau récapitulatif** par lot | 4 | manquement au contrôle | code | `texte` | arrêté du 09/11/1999, art. 5 ; arrêté du 11/02/1991, art. 2 et 3 |
| I-16 | **Dédouanement** (seulement si le commissionnaire dédouane) : aucune déclaration pour autrui sans **mandat écrit** et sans le **mode de représentation** déclaré (directe ou indirecte : en indirecte, le représentant est redevable) ; les documents douaniers se conservent **3 ans** au moins | 2, 3 | sans déclaration du mode, le représentant est réputé agir pour son propre compte | code (mandat, mode) | `texte` | CDU art. 18, 19 et 51 ; C. douanes R221-13 et suivants (nouveau code, 01/05/2026) |
| I-17 | **Maritime** : aucune marchandise à bord sans inscription au **manifeste** ; aucune lettre de garantie contre un connaissement « sans réserves » tenue pour opposable aux tiers | 4 | 3 750 € et 6 mois (manifeste) ; nullité envers les tiers | code (manifeste) + humain | `texte` | C. transports L5422-26, L5422-5 |
| I-18 | **Transporteur routier** : aucun planning ne dépasse les **temps de conduite** (9 h par jour, 10 h au plus deux fois par semaine ; 56 h par semaine ; 90 h sur deux semaines), ni ne manque la **pause** de 45 min après 4 h 30, ni ne laisse moins que le **repos journalier** (11 h, ou 9 h réduit au plus trois fois entre deux repos hebdomadaires) et le **repos hebdomadaire** (45 h, ou 24 h réduit) | 3, 5 | infraction du conducteur, dont l'entreprise répond (art. 10.3) | code | `texte` (frigo, repris sans relecture) | règlement 561/2006, art. 4, 6, 7, 8 |
| I-19 | **Transporteur routier** : les données du chronotachygraphe sont téléchargées au plus tous les **90 jours** (unité embarquée) et **28 jours** (carte conducteur), et conservées **12 mois** au moins | ↻ | infraction | code | `texte` (frigo, repris sans relecture) | règlement 581/2010, art. 1.3 ; 561/2006, art. 10.5 |
| I-20 | **Commissionnaire et chargeur** : aucun horaire convenu avec un substitué qui ne pourrait être tenu qu'en dépassant les temps de conduite | 3 | les chargeurs et commissionnaires sont tenus d'y veiller | humain, avec une alerte calculée (distance et délai) | `texte` (frigo, repris sans relecture) | 561/2006, art. 10.4 |

## 2. Tests types

Données fictives et génériques. Aucun test n'est encore issu d'un incident
raconté : tous sont conçus depuis leur interdit ou depuis une décision publiée,
et seront réécrits ou confirmés dès les premiers entretiens.

| ID | Étant donné | Quand | Alors | Interdit | Statut | Source |
|---|---|---|---|---|---|---|
| T-01 | une LV intérieure sans SIREN ni n° de TVA du transporteur | le dossier passe au contrôle avant facture | dossier **incomplet**, mention manquante nommée | I-01 | `hypothèse` | conçu depuis l'interdit |
| T-01b | une LV dont l'adresse de chargement se limite à une ville | contrôle avant facture | incomplet : adresse complète exigée | I-01 | `hypothèse` | conçu depuis l'interdit |
| T-02 | une CMR sans la mention de soumission à la convention | contrôle | alerte : responsabilité du transporteur pour tous frais et dommages (art. 7.3) | I-02 | `hypothèse` | conçu depuis l'interdit |
| T-03 | une POD signée, sans nom ni cachet | lecture de la POD | preuve de livraison signalée comme **affaiblie**, jamais comme « livrée conforme » | I-03 | `hypothèse` | conçu depuis l'interdit |
| T-03b | une livraison le mardi à 17 h sans document émargé rendu avant le départ | mercredi à 11 h, aucune confirmation envoyée au donneur d'ordre | alerte : confirmation à envoyer avant midi | I-03 | `hypothèse` | conçu depuis l'interdit |
| T-04 | une avarie non apparente, transport intérieur, constatée en interne 4 jours après la livraison, sans jour férié entre-temps | lecture du dossier | le délai de protestation de L133-3 est **affiché comme dépassé** ; l'outil ne tranche pas si le recours est perdu (G-04) | I-04 | `hypothèse` | recherche § 3 |
| T-04b | une avarie non apparente en CMR, 5 jours ouvrés après la livraison, un dimanche entre-temps | lecture du dossier | encore dans le délai de 7 jours : alerte avec la date limite | I-04 | `hypothèse` | recherche § 3 |
| T-04c | un retard en CMR, réserve écrite 22 jours après la mise à disposition | lecture du dossier | hors délai (21 jours) : signalé | I-04 | `hypothèse` | recherche § 3 |
| T-04d | une POD qui porte « sous réserve de déballage », sans protestation envoyée sous 3 jours | lecture du dossier | « **recours menacé** » avec la date limite, jamais « réserve valable » | I-04 | `hypothèse` | Cass. com. 20/01/1998, n° 95-19.774 (recherche § 3) |
| T-04e | une livraison intérieure dont le délai de 3 jours comprend un dimanche | calcul de la limite | la limite est calculée, et **le cas du dimanche est marqué à trancher** (« jours fériés non compris » : le dimanche est-il compris ?) | I-04 | `hypothèse` | question ouverte |
| T-05 | une avarie sur un envoi remis il y a 11 mois et 3 semaines, sans action engagée | contrôle quotidien des délais | alerte escaladée : prescription d'un an dans une semaine | I-05 | `hypothèse` | conçu depuis l'interdit |
| T-05b | le commissionnaire est assigné par son client pour une avarie causée par un substitué | ouverture du litige | alerte : action récursoire contre le substitué, délai d'un mois (point de départ à relire) | I-05 | `hypothèse` | conçu depuis l'interdit |
| T-06 | un affrètement sans prix payé au transporteur, ou sans n° de LV | contrôle du registre | ligne de registre **incomplète**, affrètement signalé | I-06 | `hypothèse` | recherche § 3 |
| T-07 | l'ordre du chargeur exige un stationnement gardé ; l'ordre transmis au substitué ne le mentionne pas | on prépare l'affrètement | **bloqué** tant que l'instruction n'est pas répercutée | I-07 | `hypothèse` | Cass. com. 21/11/2018, n° 17-17.468 (recherche § 3) |
| T-07b | un substitué dont la licence expire la veille du transport | on l'affrète | refus, avec le motif ; d'autres substitués habilités proposés | I-07 | `hypothèse` | conçu depuis l'interdit |
| T-08 | un client demande de charger sans établir de lettre de voiture | on prépare l'ordre | refus et escalade à l'exploitant (E-05) | I-08 | `hypothèse` | conçu depuis l'interdit |
| T-09 | un client écrit « assurez comme d'habitude », sans ordre pour cet envoi | on prépare l'affrètement | aucune assurance souscrite ; demande d'ordre écrit préparée pour validation | I-09 | `hypothèse` | conçu depuis l'interdit |
| T-10 | un prix d'affrètement proposé inférieur au coût calculé du trajet | on prépare l'envoi de la cotation | envoi bloqué, escaladé à la direction avec le calcul et l'écart (E-06) | I-10 | `hypothèse` | conçu depuis l'interdit |
| T-11 | un affrètement de véhicule complet sans document justifiant du prix | contrôle du dossier | incomplet | I-11 | `hypothèse` | conçu depuis l'interdit |
| T-12 | un contrat qui prévoit l'indexation carburant, une facture sans charges carburant apparentes | contrôle de la facture | **bloquée** | I-12 | `hypothèse` | recherche § 3 |
| T-12b | un contrat sans clause d'indexation | préparation de la facture | la révision est calculée sur les indices CNR, et signalée comme telle | I-12 | `hypothèse` | conçu depuis l'interdit |
| T-13 | une facture sans date d'exigibilité, sans taux de pénalités ou sans l'indemnité de 40 € | contrôle de la facture | bloquée, mention manquante nommée | I-13 | `hypothèse` | recherche § 3 |
| T-14 | un contrat de transport régulier sans estimation des temps de chargement | revue des contrats | signalé comme exposé à la nullité, escaladé à la direction | I-14 | `hypothèse` | conçu depuis l'interdit |
| T-15 | quatre enlèvements successifs le même jour pour un même véhicule, sans état récapitulatif | contrôle de fin de journée | alerte : état récapitulatif manquant | I-15 | `hypothèse` | conçu depuis l'interdit |
| T-16 | une déclaration en douane à préparer pour un client sans mandat écrit enregistré | ouverture du dossier import | bloquée tant que le mandat et le mode de représentation ne sont pas enregistrés | I-16 | `hypothèse` | conçu depuis l'interdit |
| T-17 | un colis présent dans le dossier d'embarquement mais absent du manifeste | rapprochement | alerte bloquante avant départ | I-17 | `hypothèse` | conçu depuis l'interdit |
| T-18 | un conducteur qui a déjà conduit deux fois 10 h dans la semaine | on lui affecte une tournée de 9 h 30 de conduite | refus : au-delà de 9 h, la troisième fois est interdite | I-18 | `hypothèse` | conçu depuis l'interdit |
| T-18b | une tournée qui prévoit 4 h 45 de conduite sans pause | on valide la tournée | refus : pause de 45 min après 4 h 30 | I-18 | `hypothèse` | conçu depuis l'interdit |
| T-19 | une carte conducteur téléchargée pour la dernière fois il y a 26 jours | contrôle quotidien | alerte : téléchargement dû sous 2 jours | I-19 | `hypothèse` | conçu depuis l'interdit |
| T-20 | un horaire de livraison demandé qui suppose de parcourir une distance impossible dans les temps de conduite d'une journée | on prépare l'affrètement | escalade à l'exploitant avec la distance et le temps minimal calculé | I-20 | `hypothèse` | conçu depuis l'interdit |

## 3. Connecteurs

| Outil ou catégorie | Usage | Étape | Accès | Lecture / écriture | Qui le tient | Statut |
|---|---|---|---|---|---|---|
| TMS (éditeurs relevés : Dashdoc, Akanea, Teliae / Teliway, Cargo-TMS…) | dossiers, affrètement, facturation | 2 à 8 | inconnu : API, export ? | lecture ; écriture du **statut du dossier** seulement, bornée par I-01 à I-13 | exploitation | `hypothèse` (sites des éditeurs) |
| WMS (Reflex, Generix, Akanea Xtent…) | entreposage | — | inconnu | lecture | entrepôt | `hypothèse` |
| e-CMR (Dashdoc, TransFollow) | lettre de voiture électronique | 4, 6 | inconnu | **lecture seule** : réécrire une LV électronique casserait la détectabilité des modifications (G-05) | exploitation | `texte` (force probante, protocole de 2008) ; `hypothèse` (outils) |
| EDI (EDIFACT : IFTMIN, IFTSTA) | ordres et statuts | 2, 5 | fichiers | lecture | exploitation, chargeur | `hypothèse` |
| Portails des chargeurs (Shippeo, Transporeon) | créneaux, visibilité, souvent imposés | 2, 5 | portail web | lecture | chargeur | `hypothèse` |
| GED transport (GedTrans, Deltic, Zeendoc) | documents des sous-traitants ; **concurrents directs** d'une brique de lecture | 7 | inconnu | lecture | administratif | `hypothèse` |
| Bourses de fret (B2PWeb, Teleroute, Timocom, Trans.eu) | cotation, recherche de transporteur | 1, 3 | hors périmètre | — | exploitation | `hypothèse` |
| Ci5, Cargo Community System de Marseille-Fos | statuts portuaires : arrivée, gate in et out, mainlevée, bon à enlever | 2 à 6 | EDI en fichiers ; API facturées au volume | **lecture de statuts, jamais écriture** | transitaire, commissionnaire | `hypothèse` (pages de l'opérateur) |
| Douane (Delta IE, ICS2) | déclarations | 2, 3 | hors périmètre : la déclaration reste au représentant | — | déclarant | `hypothèse` |
| Plateforme de facturation électronique agréée | factures reçues des sous-traitants | 8 | Factur-X, UBL, CII | lecture | comptabilité | socle § 3 ; `hypothèse` (formats) |
| Indices CNR | révision carburant | 8 | site du CNR | lecture | facturation | `texte` (L3222-2) |
| Boîte mail, scans, photos de POD, tableur des exigences client | la matière première de la douleur | 2, 7 | fichiers, messagerie | lecture | exploitation | `hypothèse` (page du site) |
| Chronotachygraphe (logiciel de téléchargement) | temps de conduite | ↻ | inconnu | lecture | exploitation (transporteur) | `hypothèse` |

## 4. Moments d'escalade

| ID | Déclencheur | Étape | Qui reprend | Délai | Ce qu'on lui présente | Statut |
|---|---|---|---|---|---|---|
| E-01 | une réserve à porter ou à accepter au chargement | 4 | chauffeur, puis exploitant | avant le départ | la marchandise, la réserve proposée ; elle n'engage le donneur d'ordre que s'il l'accepte expressément | `texte` (CMR art. 8.2 ; contrat type, art. 6.3) ; `hypothèse` (qui) |
| E-02 | une protestation ou une réserve écrite à envoyer | 10 | exploitation, service litiges | avant la date limite (I-04) | le dossier, la date limite calculée, un brouillon | `texte` (délais) ; `hypothèse` (qui) |
| E-03 | un avoir ou un geste commercial sur une avarie ou un retard | 10 | direction ou commercial | selon le client | le dossier, les plafonds applicables, une éventuelle déclaration de valeur | `texte` (plafonds, contrat type, art. 22 et 24) ; `hypothèse` (qui) |
| E-04 | une instruction du client non suivie, qui pourrait devenir une faute inexcusable | 3, 10 | direction et assureur | immédiat | l'instruction, l'ordre transmis au substitué, l'écart | `texte` (L133-8) ; `hypothèse` (qui) |
| E-05 | une instruction du client contraire à la réglementation | 2, 3 | exploitant | avant exécution | l'instruction et le texte qu'elle contredit | `texte` (contrat type de commission, art. 5.4.2) |
| E-06 | un prix sous le coût calculé | 1, 3 | direction | avant l'envoi | le calcul et l'écart | `texte` (L3221-1, L3221-4) |
| E-07 | un document illisible, manuscrit ambigu, ou un champ lu avec doute | 7 | exploitant | avant la facture | le document, le champ, ce qui a été lu, le doute | `hypothèse` (garde-fou de la page du site) |
| E-08 | une relance d'un destinataire au titre de l'action directe (le substitué n'est pas payé) | 10 | direction, facturation | avant tout envoi | le dossier et le risque de double paiement | `texte` (L132-8 ; Cass. com. 04/02/2003) ; `hypothèse` (qui) |
| E-09 | un planning de conducteur qui ne tient qu'en dépassant un temps de conduite | 3, 5 | exploitant | avant publication | le conducteur, le dépassement, les solutions possibles | `texte` (561/2006, frigo) |

## 5. Vocabulaire

| Terme | Définition | Synonymes, abréviations | Piège | Statut |
|---|---|---|---|---|
| **BL** | *Bill of Lading* : connaissement maritime, titre négociable ; ou **bon de livraison** : la POD en routier, et un document du transport en compte propre | — | **Deux sens dans la même maison** chez un commissionnaire qui touche au maritime. Toujours faire préciser | `texte` (arrêté 1999, art. 2 ; L5422-3) ; `hypothèse` (usage) |
| Lettre de voiture | document du contrat de transport intérieur | LV | établie **avant** l'exécution du transport | `texte` |
| CMR | la convention de 1956 sur le transport international routier, et la lettre de voiture internationale | « la CMR » | un même mot pour la convention et le document | `texte` |
| Récépissé | document de groupage, une expédition | — | — | `texte` |
| POD | preuve de livraison : LV émargée avec nom, date, heure et cachet | bon émargé, « le BL » | une signature sans nom ni cachet affaiblit la preuve | `texte` |
| Réserve | constat écrit, exprès, précis et motivé, au chargement (transporteur) ou à la livraison (destinataire) | — | **≠ protestation** : la réserve ne suffit pas, en droit interne ; c'est la protestation motivée sous 3 jours qui préserve le recours (L133-3) | `texte` |
| Protestation | acte motivé, sous 3 jours, par acte extrajudiciaire ou lettre recommandée | — | voir « Réserve » | `texte` |
| Donneur d'ordre | la partie qui conclut le contrat de transport : expéditeur, commissionnaire ou autre | — | pas forcément le client final | `texte` |
| Envoi | marchandise remise au même moment, par un même donneur d'ordre, pour un même destinataire, d'un lieu à un lieu | — | ni une commande ni un dossier | `texte` |
| Commissionnaire / affréteur / transitaire | l'affréteur est juridiquement un commissionnaire, donc garant de ses substitués | — | « sous-traiter » un transport n'est pas « affréter » | `texte` |
| Substitué | le transporteur ou l'intermédiaire auquel le commissionnaire confie l'exécution | sous-traitant | — | `texte` |
| Registre d'affrètement | registre chronologique des opérations confiées, avec prix d'achat et de vente | — | réglementaire, pas un simple tableau de suivi | `texte` |
| Plage horaire / rendez-vous | 4 h au plus / jour et heure précis et fermes | — | ils ne déclenchent pas la même franchise d'attente | `texte` |
| Immobilisation | dépassement de la durée de mise à disposition, facturé à part | attente | — | `texte` |
| Port payé / port dû | prix exigible à l'enlèvement / à la livraison | — | — | `texte` |
| Souffrance / laissé pour compte | personne ne donne d'instruction / le destinataire refuse la marchandise | — | — | `texte` |
| Déclaration de valeur | déclaration écrite et payée, faite au plus tard à la conclusion du contrat, qui remplace le plafond d'indemnisation | — | sans elle, l'indemnité est plafonnée | `texte` |
| Action directe | le transporteur agit en paiement contre l'expéditeur et le destinataire | — | le destinataire peut payer deux fois | `texte` |
| Représentation directe / indirecte | au nom d'autrui / en son nom propre | RDE (représentant en douane enregistré) | en indirecte, le commissionnaire doit les droits | `texte` |
| Connaissement | titre maritime | BL | présomption de réception, irréfragable envers un tiers de bonne foi | `texte` |
| Manifeste | liste des marchandises à bord | — | — | `texte` |
| VGM | masse brute vérifiée d'un conteneur | — | sans elle, le conteneur n'est pas chargé | `hypothèse` |
| eFTI / e-CMR | plateforme d'information électronique de fret / LV électronique | — | eFTI oblige les autorités à accepter l'électronique, pas les opérateurs à l'adopter | `texte` |

## 6. Le bon résultat

Aucun indicateur publié : ni taux de POD reçues, ni délai entre livraison et
facture, ni taux de litiges. **Tout est à recueillir, et l'ordre de sacrifice
est propre à chaque client.**

| ID | Objectif ou préférence | Étape | Qui y tient | Ordre de sacrifice | Statut | Source |
|---|---|---|---|---|---|---|
| O-01 | facturer vite : le délai de paiement court de l'émission, chaque jour de dossier incomplet retarde l'encaissement | 8 | direction, facturation | à recueillir : facturer vite, ou ne jamais facturer un dossier incomplet ? | `hypothèse` | déduction du contrat type, art. 19 |
| O-02 | la POD reçue le jour même de la livraison | 6, 7 | exploitation | à recueillir | `hypothèse` | page du site |
| O-03 | les exigences de chaque client respectées sans dépendre de la mémoire de deux personnes | 2, 3 | commercial, exploitation | à recueillir | `hypothèse` | page du site |
| O-04 | relancer un chargeur ou un substitué sans l'agacer | 7, 10 | commercial | à recueillir | `hypothèse` | déduction |
| O-05 | facturer toutes les immobilisations et prestations annexes réellement faites | 5, 8 | direction | à recueillir | `hypothèse` | Hub France IA, livre blanc (surcoûts « souvent difficiles » à facturer) |
| O-06 | la marge d'affrètement : l'écart entre prix de vente et prix d'achat | 3 | direction | à recueillir ; plancher dur : I-10 | `hypothèse` | déduction |

## 7. Les données

Volumes à mesurer chez chaque client (donnée client) : dossiers par jour,
POD par jour, part de POD manuscrites ou photographiées, dossiers incomplets
par mois, litiges par an, substitués actifs.

| ID | Donnée | Sert à | Où elle vit | Fraîcheur, fiabilité | Qui la tient | Statut |
|---|---|---|---|---|---|---|
| D-01 | ordre de transport : lieux, dates, poids, instructions | I-07, I-14, contrôle de complétude | mail, portail, EDI, TMS | instructions souvent en langage libre : 55 % des ordres EDI d'un projet de messagerie demandaient une intervention humaine | exploitation | `hypothèse` |
| D-02 | LV, CMR, POD émargée | I-01 à I-04, facture | papier, scan, photo, e-CMR | **inconnue, et tout en dépend** : lisibilité, délai de retour | exploitation | `hypothèse` |
| D-03 | régime du transport (intérieur, CMR, maritime) | I-04, I-05 : quel délai s'applique | dossier, TMS | rarement un champ, probablement déduit | exploitation | `hypothèse` |
| D-04 | date et heure de livraison ou de mise à disposition | I-04, I-05 | POD, TMS | dépend de D-02 | exploitation | `hypothèse` |
| D-05 | heures d'arrivée et de départ | immobilisation facturable (O-05) | document de suivi, application conducteur | fait foi jusqu'à preuve contraire (L3222-5) | chauffeur, exploitation | `texte` (valeur) ; `hypothèse` (lieu) |
| D-06 | prix de vente, prix d'achat, n° de LV de chaque affrètement | I-06, I-10, I-11 | TMS, tableur | **sensible** : jamais vers le client ni vers le substitué (G-06) | exploitation, direction | `texte` (contenu du registre) ; `hypothèse` (lieu) |
| D-07 | habilitation des substitués : inscription, licence, date de validité | I-07 | dossier fournisseur, GED | ? | exploitation | `hypothèse` |
| D-08 | exigences par client : créneaux, documents, cachet, photo, stationnement | I-07, O-03 | « dans la tête de deux personnes » | tacite | exploitation, commercial | `hypothèse` (page du site) |
| D-09 | indices CNR du carburant | I-12 | site du CNR | publication régulière | facturation | `texte` (L3222-2) |
| D-10 | calendrier des jours fériés, par pays pour la CMR | I-04 | — | à décider : quel calendrier pour un transport international | — | `hypothèse` |
| D-11 | temps de conduite et téléchargements (transporteur) | I-18, I-19 | chronotachygraphe, logiciel de téléchargement | ? | exploitation | `hypothèse` |
| D-12 | nom du signataire, identité du chauffeur | I-03 | POD | réduits au besoin de la preuve (G-07) | — | `hypothèse` |

## 8. Briques à proposer

Ce qu'on sait construire pour ce métier, à proposer **en fin d'entretien**,
chacune en réponse à une douleur entendue. **La veille des délais (B-03) et le
contrôle de complétude (B-02) sont les premiers pilotes** : ils lisent,
calculent et signalent, sans rien envoyer ni écrire chez personne
(`../../methode/archetypes.md`, Veiller et Rapprocher).

| ID | Brique | Douleur qu'elle traite | Interdits qu'elle doit respecter | Ce qui la qualifie (questions) | Statut |
|---|---|---|---|---|---|
| B-01 | **Lecture des POD et des LV à l'arrivée** (scan, photo, mail), rapprochées du dossier | « Les chauffeurs ramènent les BL le soir, et quelqu'un les ressaisit le lendemain » | I-01 à I-03 ; jamais un champ deviné (E-07) ; jamais une réserve qualifiée de « valable » | combien de POD par jour ; quelle part manuscrite ou photographiée ; qui ressaisit, combien de temps | `hypothèse` |
| B-02 | **Contrôle de complétude avant facture** : mentions obligatoires, POD, heures, carburant, registre | « Un dossier incomplet, on s'en aperçoit à la facturation » | I-01 à I-03, I-06, I-11 à I-13 ; aucun envoi sans validation | combien de dossiers incomplets par mois ; découverts quand ; combien de jours de retard à l'encaissement | `hypothèse` |
| B-03 | **Veille des délais** de réserve, de protestation et de prescription, avec un brouillon de protestation | le litige perdu faute d'avoir protesté à temps (déduction) | I-04, I-05 ; l'humain signe et envoie (E-02) | combien de litiges par an ; le dernier recours perdu ou frôlé ; qui suit les délais aujourd'hui | `hypothèse` |
| B-04 | **Exigences des clients mises en règles** écrites et testées, puis répercutées au substitué | « Chaque client a ses exigences, et elles sont dans la tête de deux personnes » | I-07 ; règles validées par le client | combien de clients ont des exigences propres ; la dernière exigence oubliée | `hypothèse` |
| B-05 | **Relance** du chargeur ou du substitué pour la pièce manquante | « la relance prête » | toujours validée avant envoi (G-01) ; E-08 pour l'action directe | combien de relances par semaine ; par quel canal | `hypothèse` |
| B-06 | **Contrôle des factures reçues** des sous-traitants, par la plateforme agréée | l'échéance de la facturation électronique (socle § 3) | ne modifie jamais un prix (page du site) | combien de factures de sous-traitants par mois ; déjà reçues par une plateforme ? | `hypothèse` |
| B-07 | **Temps de conduite** vérifiés avant de valider une tournée (transporteur) | tournées refaites, infractions relevées | I-18, I-19 ; un solveur, pas le modèle (archétype Planifier) | combien de conducteurs ; qui fait les tournées ; infractions relevées au dernier contrôle | `hypothèse` |

**Concurrence** : des GED du transport (GedTrans, Deltic, Zeendoc) et des TMS
(Dashdoc) annoncent déjà de la lecture de documents. L'écart à montrer n'est
pas la lecture : ce sont les **règles écrites du client**, le **refus de
deviner**, et le **calcul des délais**.

---

## Questions ouvertes

### À trancher sur texte ou par un juriste (pas chez le client)

Le client dira ce qu'il **fait**, pas ce qui est **dû**.
- L133-3 : « jours fériés non compris ». Le dimanche est-il compté ? (T-04e)
- L133-6 : le point de départ exact de l'action récursoire d'un mois (T-05b).
- CMR : quel calendrier des jours fériés pour un transport international
  (D-10) ; articles 1er (champ) et 41 (nullité des dérogations), non relus ;
  texte lu sur la publication officielle suisse, pas au JORF de 1961.
- Montants de la convention de Bruxelles de 1924 (plafonds maritimes et de
  manutention) ; délais de réserves maritimes (partie réglementaire R5422).
- C. civ. 1366 et 1367 (écrit et signature électroniques), non lus.
- eFTI : la date du 09/07/2027 est **calculée** à partir des actes publiés le
  20/12/2024, pas lue telle quelle.
- Nouveau code des douanes : R221-23 à R221-28 non lus.
- Les faits repris de la recherche frigo (I-18 à I-20) : à relire avant tout
  garde-fou.
- Contrats types spécifiques (sous-traitance, location avec conducteur,
  messagerie) et convention collective (IDCC 16), non lus.
- Aucune ligne de cette fiche n'est `texte` ✓ : la relecture mot à mot des
  articles de I-01 à I-13 est à faire avant de coder B-02 ou B-03.

### Dirigeant
- « Vous êtes commissionnaire, transporteur, les deux ? Vous dédouanez ? Vous
  touchez au maritime ? » (sous-métier, I-16, I-17)
- « Le dernier litige : racontez. Avarie, perte, retard ? Quand l'avez-vous
  su, et qu'est-ce qui a été envoyé, quand ? » (I-04, I-05, T-04 à T-05b)
- « Le dernier recours perdu ou frôlé faute d'avoir protesté à temps ? »
  (B-03)
- « Vos prix d'affrètement : qui les fixe, et comment vous savez qu'ils
  couvrent les charges ? » (I-10, E-06)
- « Qui signe un avoir, une protestation, une relance d'impayé ? » (E-02,
  E-03, E-08)

### Exploitation, affrètement
- « Montrez-moi un dossier ouvert ce matin, et celui d'un envoi livré hier. »
  (chaîne, D-01, D-02)
- « Les exigences de vos clients : où sont-elles écrites ? Comment
  arrivent-elles au transporteur que vous affrétez ? » (I-07, B-04)
- « Le registre d'affrètement : où est-il, qui le tient ? » (I-06)
- « Comment vérifiez-vous qu'un transporteur est inscrit et que sa licence
  est valable ? » (I-07, D-07)
- « Les heures d'attente et d'immobilisation : notées, facturées ? »
  (O-05, D-05)

### Quai, chauffeurs
- « Une réserve au chargement ou à la livraison, qui l'écrit, et comment ? »
  (E-01)
- « Les POD : papier, photo, application ? Elles reviennent quand ? » (D-02)
- Relever les mots : « BL », « bon », « récépissé », les abréviations
  propres à la maison.

### Facturation, litiges
- « Un dossier incomplet : à quel moment vous en apercevez-vous ? Combien par
  mois ? » (B-02)
- « La surcharge carburant : calculée comment, apparente sur la facture ? »
  (I-12)
- « Les factures de vos sous-traitants arrivent-elles déjà par une plateforme
  agréée ? » (B-06)
- « Qui suit les délais de protestation et de prescription ? Où ? » (B-03)

### Transporteur routier (49.41)
- « Qui fait les tournées, et comment vérifie-t-il les temps de conduite ? »
  (I-18, B-07)
- « Les téléchargements du chronotachygraphe : qui, et à quelle fréquence ? »
  (I-19)
- « Le dernier contrôle sur route : qu'est-ce qui a été relevé ? »
