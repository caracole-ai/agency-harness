<!-- Recherche documentaire du 2026-09-29 (agent de recherche et deux agents parallèles :
chiffres du secteur ; connecteurs, vocabulaire et douane). Textes officiels lus au
navigateur (playwright-cli) : Légifrance, EUR-Lex, Fedlex. Instantané daté : ne pas le
corriger en place, en écrire un nouveau. Une future fiche (fiche.md) en tirera ses
lignes `texte`. Les lignes B n'y entreront qu'en `hypothèse`. Les faits déjà établis
par `entretien-metier-workspace/recherche-transport-frigorifique-2026-09-29.md` sont
repris sans être relus, et cités comme tels. -->

# Transport et logistique à Aix-Marseille : la couche métier d'un harnais agentique (état au 29/09/2026)

**Critère de succès fixé au départ :** chaque fait porte sa source et son degré de certitude. Ce qui n'a pas été trouvé est dit, pas comblé.

**Degrés de certitude :**
- **H** : texte officiel ou PDF source lu directement le 29/09/2026, par cette recherche ou par l'un de ses agents parallèles, dans sa version en vigueur à cette date.
- **M** : texte officiel lu à travers un résumé, ou deux sources secondaires concordantes.
- **B** : une seule source secondaire (blog, éditeur, presse).

Sans degré, « hypothèse » signale une déduction à vérifier en entretien.

---

## 0. Sous-métiers et cible

Base `../reperage` (`data/reperage.db`, vue `v_prospectable`, relevé le 29/09/2026, lecture seule). Collecte Sirene du 07 au 09/09/2026.

| NAF | Sous-métier | Prospectables | dont 10-49 sal. | dont 6-9 | Siège local | Score moyen |
|---|---|---|---|---|---|---|
| 49.41B | Transport routier de proximité | 206 | 81 | 68 | 192 | 63,4 |
| 49.41A | Transport routier interurbain | 183 | 74 | 43 | 172 | 62,9 |
| 52.29B | Affrètement, organisation des transports (commissionnaires) | 157 | **89** | 25 | 97 | **67,9** |
| 52.10B | Entreposage non frigorifique | 42 | 19 | 9 | 31 | 61,3 |
| 52.29A | Messagerie, fret express | 9 | 5 | 1 | 9 | 70,4 |
| 50.20Z | Transport maritime de fret | 8 | 5 | 1 | 5 | 65,8 |
| 52.24B | Manutention non portuaire | 8 | 5 | 1 | 7 | 70,1 |
| 52.10A | Entreposage frigorifique | 7 | 2 | 5 | 7 | 60,3 |
| 52.24A | Manutention portuaire | 4 | 3 | 1 | 3 | 69,3 |

Le libellé du site (`verticals.logistique`, smart-tailor) parle de BL, CMR et lettres de voiture, de ressaisie, et de dossiers incomplets découverts à la facturation. `usage-ia.ts` donne une intensité 3 aux codes 52.29, 52.24 et 49.41, et 2 aux codes 52.10 et 50.

**Sous-métier à viser : le commissionnaire-affréteur (52.29B).** Trois raisons.
- C'est le plus gros vivier de PME de 10 à 49 salariés (89), avec le meilleur score moyen parmi les codes à fort volume.
- Son métier est documentaire par nature : il établit et vérifie les documents (contrat type de commission, art. 5.2 et 5.3, § 2.4), et tient un registre d'affrètement réglementaire avec prix d'achat, prix de vente et n° de lettre de voiture (arrêté du 11/02/1991, art. 7, § 2.4).
- Il répond de ses substitués (L132-6). Un dossier incomplet chez lui coûte une marge et une responsabilité.

Le transporteur routier (49.41A/B) vient en second : c'est le vivier le plus nombreux (389), mais sa douleur première est l'exploitation (tournées, temps de conduite). La manutention portuaire (4 prospectables) est trop étroite pour une verticale, à traiter au cas par cas.

## 1. La chaîne (hypothèse, sauf l'ancrage légal cité)

| # | Étape | Qui | Document | Ancrage légal | Cert. |
|---|---|---|---|---|---|
| 1 | Demande de cotation (mail, portail, EDI) | commercial ou exploitant | demande libre | — | hypothèse |
| 2 | Ordre de transport : informations avant la présentation du véhicule | chargeur → exploitation | ordre, IFTMIN | L3222-4 : transmises « préalablement à la présentation du véhicule au chargement, par écrit » | H |
| 3 | Affrètement d'un transporteur (commissionnaire) | exploitant | confirmation d'affrètement, registre | arrêté du 11/02/1991, art. 7 ; L3221-3 (document justifiant le prix) | H |
| 4 | Chargement : lettre de voiture ou CMR, réserves au départ | chauffeur, quai de l'expéditeur | LV / CMR / récépissé | arrêté du 09/11/1999, art. 4 ; CMR art. 8 ; contrat type général, art. 6.3 | H |
| 5 | Suivi, attente, immobilisation | exploitant, chauffeur | document de suivi (heures) | L3222-5 ; contrat type général, art. 11 | H |
| 6 | Livraison : émargement, réserves du destinataire | chauffeur, quai du destinataire | LV émargée = POD (« BL » en routier) | contrat type général, art. 9.1 et 9.2 | H |
| 7 | Retour des documents (papier le soir, scan, photo) | chauffeur → exploitation | POD | — | hypothèse (douleur n° 1 du site) |
| 8 | Contrôle du dossier complet, puis facture | exploitation → facturation | facture, surcharge carburant | L3222-1 (charges carburant apparentes sur la facture) | H |
| 9 | Paiement sous 30 jours après émission | client | — | L441-11 II 5° (frigo, H) ; contrat type général, art. 19.1 | H |
| 10 | Litige : protestation, réclamation, avoir, action | facturation, direction, assureur | protestation motivée | L133-3, L133-6 ; CMR art. 30 et 32 | H |

Passages de main où l'information se perd (hypothèse) : de 2 à 3 (exigences du client non répercutées au substitué, alors que le contrat type de commission, art. 5.6.3, l'impose), de 6 à 7 (POD qui revient tard ou illisible), de 7 à 8 (dossier incomplet découvert à la facturation).

---

## 2. Interdits et obligations dures

### 2.1 Documents de transport

| Fait | Citation courte | Source | Cert. |
|---|---|---|---|
| Transport intérieur : une lettre de voiture est établie **avant l'exécution** du transport, sur papier (un exemplaire à bord) ou sous forme électronique, transmise « immédiatement » au contrôleur | « avant l'exécution du transport… à l'établissement d'une lettre de voiture » | [Arrêté du 09/11/1999, art. 4 I](https://www.legifrance.gouv.fr/loda/id/LEGITEXT000005628727), version du 23/12/2017 | H |
| Mentions minimales de la LV (forme libre) : a) date d'établissement ; b) nom, adresse et SIREN ou n° TVA intracommunautaire du transporteur ; c) date de prise en charge ; d) nature et quantité, poids ou volume ; e) expéditeur ou remettant ; f) adresse complète de chargement ; g) destinataire ; h) adresse complète de déchargement | « Elle comporte au minimum les renseignements suivants » | art. 4 II | H |
| Cabotage : en plus, l'immatriculation du véhicule moteur et la date de déchargement | — | art. 4 III | H |
| Opérations successives ou groupage : une LV par jour au minimum, plus un état récapitulatif. Sans état récapitulatif au contrôle, il se produit **sous 3 jours francs** (sauf matières dangereuses) | « dans les trois jours francs suivant ce contrôle » | art. 5 | H |
| Compte propre : la facture, le bon d'enlèvement ou le **bon de livraison** accompagne le transport (7 mentions) | « doivent être accompagnés de la facture, du bon d'enlèvement ou du bon de livraison » | art. 2 | H |
| CMR : la LV est établie en **3 originaux** signés de l'expéditeur et du transporteur (un pour l'expéditeur, un avec la marchandise, un pour le transporteur) | « trois exemplaires originaux » | [CMR, texte officiel Fedlex (RS 0.741.611)](https://fedlex.data.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/1970/851_851_851/20210210/fr/pdf-a/fedlex-data-admin-ch-eli-cc-1970-851_851_851-20210210-fr-pdf-a.pdf), art. 5 | H |
| CMR, art. 6.1 : 11 mentions obligatoires, de a) à k). Lieu et date ; expéditeur ; transporteur ; lieu et date de prise en charge et lieu de livraison ; destinataire ; nature et emballage (dénomination reconnue pour le dangereux) ; nombre de colis, marques et numéros ; poids brut ; frais ; instructions douane ; **mention de soumission à la CMR** | « doit contenir les indications suivantes » | art. 6.1 | H |
| CMR, art. 6.2 : mentions « le cas échéant » (interdiction de transbordement, remboursement, valeur déclarée, intérêt spécial, instructions d'assurance, délai convenu, documents remis) | — | art. 6.2 | H |
| Sans la mention k), le transporteur répond de tous frais et dommages de l'ayant droit | « le transporteur est responsable de tous frais et dommages » | art. 7.3 | H |
| L'absence ou la perte de la LV n'affecte pas le contrat | « n'affectent ni l'existence ni la validité du contrat » | art. 4 | H |
| Sans réserves motivées du transporteur à la prise en charge, la marchandise est présumée en bon état apparent et conforme en nombre, marques et numéros | « il y a présomption que la marchandise et son emballage étaient en bon état apparent » | art. 9.2 | H |
| Commissionnaire (droit interne ancien, toujours en vigueur) : la LV est datée ; elle exprime nature, poids et délai ; nomme le commissionnaire, le destinataire et le transporteur ; énonce le prix et l'indemnité de retard ; elle est copiée « sur un registre coté et paraphé » | « La lettre de voiture doit être datée » | [C. com. L132-9](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006161256/) | H |
| Documents à bord : copie conforme de la licence, LV, justificatif de location | — | R3411-13 (recherche frigo) | H |

### 2.2 Réserves, protestation, prescription

| Fait | Citation courte | Source | Cert. |
|---|---|---|---|
| **Droit interne : protestation motivée sous 3 jours**, jours fériés non compris, par acte extrajudiciaire ou lettre recommandée, sinon toute action pour avarie ou perte partielle s'éteint. Une demande d'expertise (L133-4) dans le délai vaut protestation. Clause contraire nulle, sauf en international | « dans les trois jours, non compris les jours fériés… sa protestation motivée » | [C. com. L133-3](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006146034/), en vigueur depuis le 10/12/2009 | H |
| **CMR** : réserves au plus tard à la livraison pour les pertes et avaries apparentes ; **par écrit sous 7 jours**, dimanches et jours fériés non compris, pour les non apparentes. Sinon, présomption de réception conforme à la LV | « dans les sept jours à dater de la livraison, dimanche et jours fériés non compris » | CMR art. 30.1 | H |
| CMR, **retard** : réserve écrite sous **21 jours** à compter de la mise à disposition | « dans le délai de 21 jours » | art. 30.3 | H |
| Le jour de livraison ou de mise à disposition n'est pas compté | — | art. 30.4 | H |
| Contrat type général : le destinataire « peut » formuler des réserves « précises et motivées ». Il date et signe le document de transport. La signature s'accompagne du **nom du signataire, de la date, de l'heure et du cachet** ou d'un autre moyen d'identification incontestable | « La signature du destinataire est la preuve de la remise » | [Contrat type général, annexe II](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043864485), art. 9.1 et 9.2, en vigueur depuis le 01/09/2021 | H |
| Sans document émargé rendu avant le départ : présomption simple de livraison conforme si le transporteur confirme la remise au donneur d'ordre **au plus tard à midi du premier jour ouvrable suivant** | « au plus tard à midi du premier jour ouvrable suivant » | art. 9.3 | H |
| Réserves au chargement : « précises et motivées » sur le document de transport. Elles n'engagent le donneur d'ordre que s'il les a acceptées expressément | — | art. 6.3 et 7 ; CMR art. 8.2 | H |
| Contrat type de commission : les réserves sont faites « de façon expresse, précise, motivée et significative » et portent aussi sur le délai | — | [Annexe à D1432-3](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/LEGISCTA000028999867/), art. 2.9 | H |
| **Prescription d'un an** (avaries, pertes, retards, et toutes autres actions). Point de départ : jour où la marchandise aurait dû être remise (perte totale), sinon jour de la remise. Action récursoire : **1 mois** | « prescrites dans le délai d'un an » | C. com. L133-6 | H |
| CMR : **1 an**, **3 ans** en cas de dol ou de faute équivalente. Une réclamation écrite suspend la prescription | « prescrites dans le délai d'un an » | CMR art. 32 | H |
| Faute inexcusable, seule équivalente au dol : « faute délibérée qui implique la conscience de la probabilité du dommage et son acceptation téméraire sans raison valable » | — | C. com. L133-8 | H |
| Maritime : action contre le transporteur prescrite en **1 an**, action récursoire en 3 mois. Mêmes délais pour l'entrepreneur de manutention | — | [C. transports L5422-18 et L5422-25](https://www.legifrance.gouv.fr/codes/id/LEGISCTA000023080123) | H |

### 2.3 Plafonds d'indemnisation

| Fait | Source | Cert. |
|---|---|---|
| Contrat type général : envoi < 3 t : **33 €/kg**, au plus **1 000 € par colis** ; envoi ≥ 3 t : **20 €/kg**, au plus poids en tonnes × **3 200 €**. Sauf dol ou faute inexcusable | Contrat type général, art. 22.1 | H |
| Une déclaration de valeur écrite, faite au plus tard à la conclusion du contrat et payée, remplace le plafond | art. 22.2 | H |
| Retard : indemnité plafonnée au **prix du transport**, sauf déclaration d'intérêt spécial à la livraison | art. 24.3 | H |
| La marchandise peut être tenue pour perdue 30 jours après l'expiration du délai | art. 21.1 | H |
| Commissionnaire, faute personnelle : **20 €/kg**, au plus poids en tonnes × **5 000 €** | Contrat type de commission, art. 13.2 | H |
| Commissionnaire, fait du substitué : même limite que celle du substitué | art. 13.1 | H |
| CMR : **8,33 DTS/kg** de poids brut manquant ; en cas de retard, le prix du transport au plus | CMR art. 23.3 et 23.5 | H |
| Maritime : renvoi aux montants de la convention de Bruxelles de 1924 modifiée (art. 4 § 5). Manutentionnaire : mêmes plafonds | L5422-13, L5422-23 | H (renvoi lu ; montants non lus) |

### 2.4 Commissionnaire : garanties, registre, documents

| Fait | Citation courte | Source | Cert. |
|---|---|---|---|
| Garant de l'arrivée dans le délai (L132-4), des avaries et pertes (L132-5), et des faits du commissionnaire intermédiaire (L132-6) | « Il est garant des faits du commissionnaire intermédiaire » | C. com. L132-4 à L132-6 | H |
| **Action directe** : le voiturier agit en paiement contre l'expéditeur et le destinataire, « garants du paiement du prix du transport ». Clause contraire réputée non écrite | « action directe en paiement » | C. com. L132-8 | H |
| Obligation générale de résultat. Il **vérifie les documents** liés à l'organisation du transport et la conformité apparente des autres | « tenu de procéder à la vérification des documents » | Contrat type de commission, art. 5.1 et 5.2 | H |
| Il vérifie que les pièces nécessaires au document de transport sont fournies, **au plus tard à la prise en charge** | — | art. 5.3 | H |
| Il refuse une instruction contraire à la réglementation | — | art. 5.4.2 | H |
| Il vérifie l'habilitation de ses substitués, leur répercute **toutes les instructions** du donneur d'ordre, et veille à ce que les documents suivent jusqu'à la livraison | « l'obligation de répercuter… toutes les informations, demandes et instructions » | art. 5.6.1 à 5.6.4 | H |
| Aucune assurance marchandises sans ordre écrit, répété pour chaque envoi | — | art. 7 | H |
| **Registre d'affrètement** : chaque opération confiée s'enregistre dans l'ordre chronologique avec, entre autres, le transporteur affrété, les lieux, la nature et le poids, les dates et heures, le **n° de la LV**, le **prix facturé au client** et le **prix payé au transporteur**. Conservation **3 ans** | « prix du transport facturé au client ; prix payé au transporteur » | [Arrêté du 11/02/1991](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000170035), art. 6 et 7 | H |
| Groupage : une LV ou un récépissé par expédition, et un bordereau récapitulatif de chargement par lot | — | même arrêté, art. 2 et 3 | H |
| Inscription obligatoire au **registre des commissionnaires de transport** (préfet de région), sous conditions de capacité et d'honorabilité | « Tout commissionnaire de transport doit être inscrit » | [C. transports R1422-1 à R1422-8](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/LEGISCTA000028996751/) | H |
| Activités du commissionnaire, dont l'**affrètement** (envois confiés sans groupage préalable à des transporteurs publics) | — | C. transports R1411-1 | H |

### 2.5 Transporteur routier : accès à la profession

| Fait | Source | Cert. |
|---|---|---|
| Inscription au registre électronique national. Licence communautaire au-delà de 3,5 t, licence de transport intérieur en deçà. Validité **10 ans** au plus, une copie certifiée conforme par véhicule | [C. transports R3211-12](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/LEGISCTA000033449943/) | H |
| Capacité financière : **9 000 €** pour le premier véhicule > 3,5 t et **5 000 €** pour chacun des suivants ; 1 800 € puis 900 € pour les ≤ 3,5 t | R3211-32 | H |
| Des garanties bancaires peuvent couvrir la capacité financière, jusqu'à la moitié au plus | R3211-33 | H |

### 2.6 Prix, carburant, temps d'attente

| Fait | Citation courte | Source | Cert. |
|---|---|---|---|
| Tout prestataire (transporteur, **commissionnaire**, plateforme) doit offrir ou pratiquer un prix qui couvre les charges légales, l'énergie, l'amortissement, les frais de route, les péages et les documents | « tenu d'offrir ou de pratiquer un prix qui permette de couvrir » | [C. transports L3221-1](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/LEGISCTA000023071149/) | H |
| Sanction : **90 000 €** d'amende (L3242-2). Même peine pour le donneur d'ordre qui sous-rémunère un affrètement (L3221-4, L3242-4) | — | [L3242-2 à L3242-5](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/LEGISCTA000023071249/) | H |
| Chaque contractant d'un affrètement de véhicule complet produit un **document justifiant du prix conclu**. Refus de le communiquer : 6 mois et 3 750 € | — | L3221-3, L3242-5 | H |
| **Indexation carburant** : révision de plein droit du prix, et charges carburant « apparentes » sur la facture ; volet propre aux groupes frigorifiques | « révisé de plein droit » | L3222-1 (relu) ; L3222-2 (indices CNR à défaut de clause) | H |
| Le cocontractant qui ne l'applique pas encourt **15 000 €** d'amende | « Est punie d'une amende de 15 000 € » | L3242-3 | H |
| L3221-2, L3222-1 à L3222-6 et L3222-9 sont d'**ordre public**. L3222-1 à L3222-4 s'appliquent aussi au contrat de commission | — | L3222-9, L1432-11 | H |
| Document de suivi signé : heures d'arrivée et de départ, prestations annexes. Il fait foi jusqu'à preuve contraire | « fait foi jusqu'à preuve contraire » | L3222-5 | H |
| Un contrat qui n'estime pas les temps des tâches, avec leur rémunération ou leurs pénalités, est **nul** | « à peine de nullité » | L3222-8 | H |
| Contrat type général, durée de mise à disposition avant immobilisation facturable : **1 h** si le rendez-vous est respecté, puis 1 h 30 à 3 h selon les cas. Plage horaire de 4 h au plus | « D'une heure en cas de rendez-vous respecté » | art. 2 et 11 | H |
| Annulation à moins de 24 h : indemnité plafonnée au prix du transport | — | art. 15 | H |
| Paiement sous **30 jours** après émission, pénalités de 5 fois le taux légal et **40 €** de frais de recouvrement, **mentions obligatoires sur la facture** | « doivent obligatoirement figurer sur la facture » | art. 19.1 à 19.4 ; commission, art. 12 | H |
| Les contrats types s'appliquent de plein droit à défaut de convention écrite | — | contrat type général, art. 1er | H |

### 2.7 Numérique : e-CMR, eFTI, facturation électronique

| Fait | Citation courte | Source | Cert. |
|---|---|---|---|
| **e-CMR** : le protocole additionnel du 20/02/2008 est publié en France (décret 2017-1 du 03/01/2017). La LV électronique a « la même force probante » que le papier. Elle est authentifiée par une signature électronique fiable, et toute modification doit être détectable | « aura la même force probante et produira les mêmes effets » | [Décret 2017-1 et annexe](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000033787034), art. 2, 3 et 4 du protocole | H |
| **eFTI**, règlement (UE) 2020/1056 : **applicable depuis le 21/08/2024** | « Il est applicable à partir du 21 août 2024 » | [EUR-Lex 32020R1056](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32020R1056), art. 18 | H |
| Les **autorités** acceptent les informations électroniques 30 mois après l'entrée en vigueur du premier acte délégué ou d'exécution | « Au terme d'un délai de 30 mois » | art. 5.1 | H |
| Les actes 2024/1942 (exécution) et 2024/2025 (délégué) sont publiés au JO UE du **20/12/2024**. Entrée en vigueur au 20e jour, soit le **09/01/2025** ; acceptation obligatoire par les autorités le **09/07/2027**. Date calculée, non lue telle quelle | — | [2024/1942](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=OJ:L_202401942), art. final ; 2024/2025 | H (calcul) |
| eFTI oblige les autorités, pas les opérateurs. L'opérateur **qui choisit** l'électronique passe par une **plateforme eFTI certifiée**, dans un format lisible par machine | « ils le font sur la base de données traitées sur une plateforme eFTI certifiée » | 2020/1056, art. 4.2 | H |
| Les blogs d'éditeurs titrent « eCMR obligatoire en 2026 » : amalgame | — | Logix, Axiotrans, Symphonia (repérés par l'agent parallèle) | B |
| **Facturation électronique, calendrier légal maintenu.** Au **01/09/2026** : réception obligatoire pour **toutes** les entreprises concernées, émission obligatoire pour les grandes entreprises et les ETI. Au **01/09/2027** : émission obligatoire pour les **PME, TPE et micro-entreprises**. Passage par une **plateforme agréée** (CGI 289 bis). Accroche **commune à toutes les verticales** | « Pour les PME, TPE et micro-entreprises, cette obligation d'émission s'applique à compter du 1er septembre 2027 » | [DGFiP, guide pratique de démarrage, juillet 2026](https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/guide_pratique_facturation_electronique.pdf), p. 1 et partie « obligation d'émission en 2027 » | H |
| Pendant le démarrage, pas de sanction pour l'entreprise « engagée dans une trajectoire sérieuse de mise en conformité ». Sanctions prévues : CGI 1788 D (émission) et 1737 IV bis (réception) ; montants non lus | « pas d'application des sanctions » | même guide, p. 1 et question 29 | H |
| Formats socles : Factur-X, UBL et CII | — | deux sources secondaires (Quadient, notamment) | M |

### 2.8 Douane et port (seulement pour le commissionnaire qui dédouane)

| Fait | Source | Cert. |
|---|---|---|
| Représentation **directe** (au nom et pour le compte d'autrui) ou **indirecte** (en son nom propre) ; en indirecte, le représentant est redevable. Sans déclaration de représentation, il est réputé agir pour son propre compte | [Règlement 952/2013 (CDU)](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:02013R0952-20221212), art. 18 et 19 | H |
| Conservation des documents douaniers **3 ans au moins** | CDU art. 51 | H |
| **Code des douanes national recodifié au 01/05/2026** : les anciens art. 86-87 et l'arrêté RDE du 13/04/2016 sont abrogés. Le représentant en douane enregistré relève désormais de R221-13 à R221-28 : mandat écrit, électronique possible ; enregistrement à durée indéterminée ; subdélégation avec l'accord exprès du mandant ; changement signalé sous **2 mois** ; OEA non exigé | [C. douanes R221-13 s.](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006071570/LEGISCTA000053813574/) ; [art. 87 abrogé](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042623685) | H |
| Delta IE remplace Delta G et Delta X ; l'export est en production depuis le 04/11/2025 | [douane.gouv.fr, 12/12/2025](https://www.douane.gouv.fr/actualites/point-dactualite-sur-le-deploiement-de-delta-ie-import-et-export-au-12-decembre-2025) | M |
| ICS2 routier et ferroviaire depuis 2025 ; ICS1 toléré en France jusqu'au 31/12/2025 | [douane.gouv.fr](https://www.douane.gouv.fr/fiche/les-formalites-davant-dedouanement-antes-et-ics2) | M |
| Maritime : le **connaissement** vaut présomption de réception des marchandises « telles qu'elles y sont décrites », irréfragable envers un tiers de bonne foi. Une lettre de garantie contre un connaissement « sans réserves » est nulle envers les tiers | C. transports L5422-3 à L5422-5 | H |
| Une marchandise non inscrite au **manifeste** : 3 750 € d'amende et 6 mois | L5422-26 | H |
| Le manutentionnaire n'est responsable qu'envers celui qui l'a requis | L5422-20 | H |

Également en vigueur, sans lien direct avec le flux documentaire : l'information CO2 (L1431-3, amende de 3 000 € au plus), et l'obligation des chargeurs et commissionnaires de veiller à la conformité des horaires (561/2006, art. 10.4). Voir la recherche frigo, H.

## 3. Incidents et litiges types publiés, et les tests qui en naissent

| Cas publié | Ce qu'il enseigne | Test possible | Source | Cert. |
|---|---|---|---|---|
| Cass. com. 20/01/1998, n° 95-19.774 | Le pourvoi disait la mention « sous réserve de déballage » insuffisante. La Cour le **rejette** : le destinataire gagne grâce à une protestation motivée sous 3 jours par LRAR et à un constat d'huissier. Les blogs qui en tirent « réserve vague = sans valeur » simplifient l'arrêt | Une POD portant « sous réserve de déballage » sans protestation sous 3 jours est signalée comme **recours menacé**, jamais comme « réserve valable » | [Légifrance](https://www.legifrance.gouv.fr/juri/id/JURITEXT000007041053) | H |
| Cass. com. 21/11/2018, n° 17-17.468 | Faute inexcusable : remorque non cadenassée, de nuit, sur un terrain isolé, contre les instructions reçues. Les plafonds sautent | Une instruction de sûreté du client (« stationnement gardé ») absente de l'ordre au substitué bloque l'affrètement | [Légifrance](https://www.legifrance.gouv.fr/juri/id/JURITEXT000037676927) | H |
| Cass. com. 04/02/2003, n° 01-11.031 | Action directe : le destinataire paie le voiturier même si l'expéditeur a déjà payé le commissionnaire | Une relance d'impayé d'un sous-traitant adressée à un client final n'est jamais préparée sans validation humaine | [Légifrance](https://www.legifrance.gouv.fr/juri/id/JURITEXT000007047421) | H |
| Ordres EDI : 55 % demandent une intervention humaine (un projet de messagerie) | Des instructions en langage libre ; des surcoûts « souvent difficiles » à facturer | Une instruction libre non structurée est signalée, pas interprétée | [Hub France IA, livre blanc, déc. 2025](https://www.hub-franceia.fr/wp-content/uploads/2026/01/2025_12_25_Livre-Blanc-IA-Transport-Logistique.pdf) | H (source promotionnelle) |

Tests tirés directement des textes (tous vérifiables par code) :
- LV intérieure sans SIREN du transporteur, ou sans adresse complète de chargement : dossier **incomplet** (arrêté 1999, art. 4 II).
- CMR sans la mention k) : alerte de responsabilité du transporteur (CMR art. 7.3).
- Avarie non apparente constatée au jour J+4 hors jours fériés, en interne : le délai de L133-3 est dépassé. Il s'affiche, il ne se tranche pas.
- En CMR, J+5 ouvrés reste dans le délai de 7 jours.
- Retard CMR : réserve écrite à J+22 → hors délai (art. 30.3).
- Dossier d'affrètement sans prix payé au transporteur ou sans n° de LV : incomplet (arrêté 1991, art. 7).
- Facture de transport sans charges carburant apparentes alors que le contrat les mentionne : bloquée (L3222-1).
- Facture sans date d'exigibilité, taux des pénalités ou indemnité de 40 € : bloquée (contrat type, art. 19.4).

## 4. Connecteurs

| Catégorie | Éditeurs et formats relevés | Lecture / écriture probable | Cert. |
|---|---|---|---|
| TMS transport et affrètement | Dashdoc (TMS et e-CMR), Akanea (XROAD, IROAD pour les TPE et commissionnaires, MROAD), Teliae / Teliway (messagerie, affrètement), Cargo-TMS ; cités une seule fois : Qargo, WinSped, Sinari, Winfret, OneWorld, Aeolus, Shiptify, Elefleet | lecture ; écriture du statut du dossier seulement | B (sites éditeurs) |
| WMS | Reflex (Hardis), Generix, Akanea Xtent, A-SIS, Infflux | lecture | B |
| Bourses de fret | B2PWeb (française, détenue par plus de 300 transporteurs et commissionnaires), Teleroute, Timocom, Trans.eu | hors périmètre (cotation) | M / B |
| Visibilité et portails chargeurs | Shippeo, Transporeon (créneaux de quai) : portails imposés par les clients | lecture | B |
| e-CMR | Dashdoc, TransFollow (Portal, Connect API, Drive) | lecture | B |
| GED transport | GedTrans (groupe B2P, documents des sous-traitants, IA annoncée), Deltic, Zeendoc : **concurrents directs** d'une brique de lecture | — | B |
| EDI | EDIFACT / EANCOM : IFTMIN (instruction de transport), IFTSTA (statut) | lecture | M (GS1) |
| Port de Marseille-Fos | **Ci5**, Cargo Community System de MGI, en service depuis le 16/10/2018 (après AP+ et Protis). Il relie 15 professions et suit les statuts (arrivée, gate in/out, mainlevée douane, bon à enlever). EDI en fichiers asynchrones ; API facturées au volume (annonce du 29/10/2025) | lecture de statuts, jamais écriture | M (pages MGI) / B (API) |
| Douane | Delta IE, ICS2, ANTES, GUN | hors périmètre (déclaration = RDE) | M |
| Facture électronique | Plateformes agréées (liste DGFiP sur impots.gouv.fr) ; Factur-X, UBL, CII | lecture des factures reçues | H (principe) / M (formats) |
| Sources non outillées (hypothèse, douleur du site) | boîte mail, scans et photos de POD, tableur des exigences client | lecture | hypothèse |

Non trouvés : Transplan, Chronotruck, Pionira, Upply (bourse).

## 5. Escalades et responsabilité

| Déclencheur | Qui décide (hypothèse de rôle) | Pourquoi l'humain | Ancrage |
|---|---|---|---|
| Réserve à porter ou à accepter au chargement | chauffeur, puis exploitant | engage le donneur d'ordre seulement s'il l'accepte expressément | CMR art. 8.2 ; contrat type, art. 6.3 |
| Protestation motivée (3 jours) ou réserve écrite CMR (7 ou 21 jours) | exploitation, service litiges | délai de forclusion, acte engageant | L133-3 ; CMR art. 30 |
| Avoir ou geste commercial sur une avarie ou un retard | direction ou commercial | argent, plafonds, déclaration de valeur | contrat type, art. 22 et 24 |
| Suspicion de faute inexcusable (instruction non suivie) | direction et assureur | fait sauter les plafonds | L133-8 |
| Instruction du client contraire à la réglementation | exploitant | le commissionnaire doit refuser | contrat type de commission, art. 5.4.2 |
| Prix d'affrètement sous le coût | direction | 90 000 € d'amende | L3221-1, L3221-4 |
| Document illisible ou manuscrit ambigu | exploitant | valeur probante, montant | hypothèse (garde-fou du site : « il la marque à vérifier ») |
| Relance d'un destinataire au titre de l'action directe | direction, facturation | relation client, risque de double paiement | L132-8 ; Cass. com. 04/02/2003 |

## 6. Vocabulaire et pièges

| Terme | Sens | Piège | Source / Cert. |
|---|---|---|---|
| **BL** | *Bill of Lading* = connaissement maritime (titre négociable), ou **bon de livraison** (POD en routier, document du compte propre) | Deux sens dans la même maison chez un commissionnaire portuaire | arrêté 1999, art. 2 (H) ; Akanea (B) |
| **Lettre de voiture / CMR / récépissé** | LV intérieure (arrêté 1999) ; LV internationale (CMR) ; récépissé en groupage | « la CMR » désigne à la fois la convention et le document | H |
| **Connaissement / LTA** | Titre maritime / lettre de transport aérien, non négociable | — | L5422-3 (H) ; LTA (B) |
| **Donneur d'ordre** | « la partie (expéditeur, commissionnaire de transport ou autre) qui conclut le contrat de transport » | Ce n'est pas forcément le client final | contrat type général, art. 2 (H) |
| **Envoi** | Marchandise remise au même moment, par un même donneur d'ordre, pour un même destinataire, d'un lieu à un lieu | Un envoi n'est ni une commande ni un dossier | H |
| **Commissionnaire / affréteur / transitaire** | L'affréteur est juridiquement un commissionnaire (R1411-1), donc garant de ses substitués | « Sous-traiter » un transport n'est pas « affréter » | H |
| **Substitué** | Transporteur ou intermédiaire auquel le commissionnaire confie l'exécution | — | contrat type de commission (H) |
| **Plage horaire / rendez-vous** | 4 h au plus / jour et heure « précis et fermes » | Ils ne déclenchent pas la même franchise d'attente | H |
| **Immobilisation** | Dépassement de la durée de mise à disposition, facturé séparément | — | art. 11 et 18 (H) |
| **Port payé / port dû** | Prix exigible à l'enlèvement / à la livraison | — | art. 19.1 (H) |
| **Souffrance / laissé pour compte** | Personne ne donne d'instruction / le destinataire refuse | — | art. 2 et 17 (H) |
| **Réserves** | Expresses, précises, motivées ; au chargement (transporteur) ou à la livraison (destinataire) | « Réserve » et « protestation » ne sont pas la même chose (L133-3) | H |
| **POD** | Preuve de livraison : LV émargée avec nom, date, heure et cachet | Une signature sans nom ni cachet affaiblit la preuve (art. 9.2) | H |
| **Représentation directe / indirecte** | Au nom d'autrui / en son nom propre | En indirecte, le commissionnaire doit les droits | CDU art. 18 (H) |
| **VGM** | Masse brute vérifiée (SOLAS), obligatoire depuis le 01/07/2016 | Sans VGM, le conteneur n'est pas chargé | CMA CGM (M) |
| **Manifeste** | Liste des marchandises à bord | — | L5422-26 (H) |

## 7. Bon résultat et préférences

Aucun indicateur publié n'a été trouvé : ni taux de POD reçues, ni délai entre livraison et facture, ni taux de litiges. **Tout est en hypothèse, à poser en entretien.**
- Facturer vite : le délai de paiement court de l'émission (30 jours), donc chaque jour de dossier incomplet retarde l'encaissement. Déduction de L441-11 et de l'art. 19.
- Ne jamais facturer un dossier incomplet plutôt que facturer vite ? Ordre de sacrifice inconnu.
- Relancer un chargeur sans l'agacer : préférence probable, non publiée.

## 8. Données : ce dont un outil a besoin, et où ça vit (hypothèse, sauf mention)

| Donnée | Sert à | Où elle vit (probable) |
|---|---|---|
| Ordre de transport (lieux, dates, poids, instructions) | contrôle de complétude, étapes 2-3 | mail, portail chargeur, EDI IFTMIN, TMS |
| LV / CMR / POD émargée | réserves, délais, preuve, facture | papier, puis scan ou photo ; e-CMR |
| Heures d'arrivée et de départ | immobilisation facturable | document de suivi (L3222-5), application conducteur |
| Prix de vente, prix d'achat, n° de LV | registre d'affrètement, marge | TMS, tableur (arrêté 1991, art. 7, H) |
| Exigences par client (créneaux, documents, cachet, photo) | règles écrites | « dans la tête de deux personnes » (site) |
| Indices CNR carburant | surcharge sur la facture | cnr.fr (L3222-2, H) |
| Statuts portuaires, mainlevée, BAE | dossier import et export | Ci5 (M) |
| Données personnelles (nom du signataire, chauffeur) | preuve de livraison | POD ; les réduire au besoin de la preuve |

## 9. Briques plausibles, rattachées aux douleurs du site

| Brique | Douleur du site | Interdits qui la bornent |
|---|---|---|
| Lecture des POD et LV à l'arrivée (scan, photo, mail), rapprochement avec le dossier du TMS | « Les chauffeurs ramènent les BL le soir… ressaisis le lendemain » | ne jamais deviner un champ illisible ; ne jamais qualifier une réserve de « valable » |
| Contrôle de complétude du dossier avant facture : mentions obligatoires, POD, heures, carburant, registre | « Un dossier incomplet, on s'en aperçoit à la facturation » | règles codées (arrêté 1999, CMR art. 6, arrêté 1991, L3222-1) ; aucun envoi sans validation |
| Alerte de délais de réserve et de protestation (3, 7 et 21 jours, 1 an) avec un brouillon de protestation | issue d'un litige perdu (déduction) | l'humain signe et envoie ; aucune qualification juridique définitive |
| Exigences des clients mises en règles écrites et testées, puis répercutées au substitué | « Chaque client a ses exigences… deux personnes » | contrat type de commission, art. 5.6.3 ; règles validées par le client |
| Relance du chargeur ou du substitué pour la pièce manquante | « la relance prête » | validation avant tout envoi (garde-fou du site) |
| Contrôle de réception des factures électroniques des sous-traitants (depuis le 01/09/2026) | accroche commune | ne jamais modifier un prix (garde-fou du site) |

---

## 10. Prospection

**Chiffres du secteur**
- Transport routier de fret et déménagement : **39 960 entreprises en 2023**, 62,1 Md€ de CA, 63,9 Md€ estimés en 2024. Taux de marge **11,2 % en 2023, 13,7 % estimés en 2024**, contre 20,9 % pour l'ensemble du transport de marchandises. « Les prix évoluent moins vite que les coûts. » [SDES, bilan 2024, nov. 2025](https://www.statistiques.developpement-durable.gouv.fr/sites/default/files/2025-11/statistiques_sdes_datalab_143_bilan_transports_2024_novembre2025.pdf) — H
- Défaillances transports et entreposage : **2 995 en 2024** (+30,9 %, le plus haut depuis 2000), dont **1 947** pour le routier de fret. Même source ; la synthèse du PDF écrit « +0,9 % », une coquille — H
- Établissements avec salariés fin 2024 : TRM **25 306**, auxiliaires 52.29A/B **4 665**, logistique 52.10B **1 673**. 42 % des établissements de la branche ont 5 salariés ou moins. [OPTL 2025](https://optl.fr/wp-content/uploads/Rapport-OPTL-2025.pdf) — H
- Altares, **PACA 2025** : 150 défaillances TRM (154 en 2024), 237 en transport et logistique. **T1 2026** : 857 défaillances en transport et logistique (+12,9 %). [Bilan 2025](https://altares87872.activehosted.com/content/pyND2/2026/01/19/0c384e52-6925-4cbf-8ae2-eb6f8886a9c3.pdf), [T1 2026](https://altares87872.activehosted.com/content/pyND2/2026/04/13/a857972e-87da-4a20-988f-3b2b1bb52b62.pdf) — H
- Marseille-Fos, fin 2019 : 1 570 établissements et 42 640 salariés dans le cluster, dont 460 établissements de « services à la marchandise ». [Insee Analyses PACA 115](https://www.insee.fr/fr/statistiques/fichier/7614185/pr_ina_115.pdf) — H
- Trafic 2025 : 74 Mt (+5 %) et 1,45 M EVP. [Mer et Marine, 15/05/2026](https://www.meretmarine.com/fr/vie-portuaire/le-port-de-marseille-fos-a-vu-son-trafic-augmenter-de-5-en-2025) — M
- France Num 2026 (17/09/2026) : **29 % des TPE-PME du transport et de la logistique utilisent l'IA** (×1,8 en un an), mais 60 % seulement voient un bénéfice au numérique (-10 points). Les dirigeants consultent d'abord leur **expert-comptable (41 %)**. [France Num](https://www.francenum.gouv.fr/guides-et-conseils/strategie-numerique/comprendre-le-numerique/barometre-france-num-2026-le) — H

**Accroches datées**
1. **Facturation électronique** : réception obligatoire depuis le 01/09/2026, émission obligatoire des PME au 01/09/2027 (DGFiP, H). Commune à toutes les verticales ; l'expert-comptable est le prescripteur naturel.
2. **Gazole +42,7 %** pour les poids lourds entre février et la mi-avril 2026, selon les indices CNR ([OTRE, 15/04/2026](https://www.otre.org/indices-cnr-gazole-professionnels-publication-de-la-1ere-quinzaine-davril/)) — M. La surcharge carburant sur chaque facture est un point de contrôle naturel (L3222-1, 15 000 € d'amende pour le cocontractant qui ne l'applique pas).
3. **eFTI au 09/07/2027** : les autorités acceptent l'électronique. Le connaisseur corrige l'amalgame « e-CMR obligatoire », ce qui crédibilise l'appelant (H).
4. Ziegler France (52.29B, 1 426 salariés) en redressement judiciaire en mars 2026 (Altares T1 2026, H). À manier avec tact.
5. ZFE maintenues : Conseil constitutionnel, décision 2026-903 DC du 21/05/2026 (H). ETS2 reporté à 2028 (Conseil de l'UE, 05/03/2026, M).

**Ce qu'un connaisseur mentionne au téléphone** : la protestation sous 3 jours (et non « une réserve sur le bon ») ; l'action directe de L132-8 ; la déclaration de valeur qui fait sauter les plafonds ; le registre d'affrètement ; Ci5 à Fos.

**Objections probables (hypothèse, étayée par France Num et Hub France IA)** :
- « On a déjà un TMS » ou « notre GED fait déjà ça » (GedTrans, Dashdoc).
- « Nos documents sont manuscrits, tachés, photographiés de travers. »
- « Nos clients imposent leur portail. »
- « Trop cher pour nos marges » : les marges sont réelles, et la dépense numérique du secteur est faible.

---

## 11. Contraintes propres à un outil d'IA

- **Documents manuscrits ou illisibles** : la preuve de livraison repose sur la signature, le nom, la date, l'heure et le cachet (contrat type, art. 9.2, H). Un champ lu avec doute se marque « à vérifier » ; le site en fait un garde-fou.
- **Valeur probante d'une réserve** : c'est la protestation motivée dans les délais (L133-3, CMR art. 30, H) qui préserve le recours, et la Cour de cassation en a jugé sur les faits (1998). Un outil ne qualifie donc jamais juridiquement une réserve : il détecte, date, calcule le délai et prépare le brouillon.
- **Écrit électronique** : l'e-CMR a la même force probante si la signature est fiable et toute modification détectable (protocole, art. 3 et 4, H). Un outil qui réécrit une LV électronique casserait cette détectabilité : **jamais d'écriture dans le document de transport**.
- **Données des chargeurs** : le secret des informations commerciales est expressément protégé dans le cadre eFTI (2020/1056, art. 6, H). Le registre d'affrètement réunit prix d'achat et prix de vente (H) : une donnée sensible face au client comme face au sous-traitant. L'hébergement et le cloisonnement par client sont à prévoir (hypothèse).
- **Données personnelles** : nom du signataire et identité du chauffeur, à réduire au besoin de la preuve (hypothèse, RGPD non relu ici).

---

## Non trouvé ou à vérifier

1. Montants de la convention de Bruxelles de 1924 modifiée (plafonds maritimes et de manutention) : renvoi lu, montants non lus.
2. Délais de réserves en maritime (partie réglementaire R5422) : non recherchés.
3. C. civ. 1366 et 1367 (écrit et signature électroniques) : page Légifrance non chargée, non lus.
4. Montants des amendes de facturation électronique (CGI 1788 D, 1737 IV bis) et texte de l'article 289 bis : cités par le guide DGFiP, non lus.
5. La date du 09/07/2027 pour eFTI est **calculée** à partir de la publication des actes du 20/12/2024 ; aucune page officielle ne la donne telle quelle dans ce qui a été lu. La date d'entrée en vigueur du règlement délégué 2024/2024 n'a pas été lue.
6. CMR : article 1er (champ) et article 41 (nullité des dérogations) non relus ; texte suisse officiel en français, non le JORF de 1961.
7. Nouveau code des douanes : R221-23 à R221-28 non lus ; tables de concordance non consultées. Dates de NCTS phase 5 et de fermeture de Delta G import non trouvées.
8. Formats et conditions d'accès de Ci5 pour une PME ; nombre d'entreprises de la place portuaire (« 300 entreprises » de l'UMF, une source).
9. Nombre d'entreprises et marge propres aux codes 52.29B, 52.24 et 52.10 ; défaillances transport dans les Bouches-du-Rhône.
10. Tout indicateur publié de bon résultat (POD, délai de facturation, litiges) et tout baromètre du taux d'e-CMR en France.
11. Transplan, Chronotruck, Pionira, Upply ; messages EDI INVOIC et DESADV non vérifiés à une source.
12. Contrats types spécifiques (sous-traitance, location avec conducteur, messagerie, citerne) non lus ; convention collective IDCC 16 non recherchée (hors flux documentaire).

---
