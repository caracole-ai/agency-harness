<!-- Recherche documentaire du 2026-09-29 (agent de recherche : Légifrance lu dans
un navigateur piloté par playwright-cli, PDF officiels extraits par pdftotext,
WebSearch/WebFetch pour le reste ; la recherche web a été coupée en cours de
route par une limite de session). Instantané daté : ne pas corriger en place,
en écrire un nouveau. La future fiche (fiche.md) en tirera ses lignes `texte` ;
les lignes de certitude B n'y entrent qu'en `hypothèse`. Aucune relecture mot à
mot au sens de GRILLE.md (`texte` ✓) n'est encore faite. -->


# Bureaux d'études et laboratoires d'essais : la couche métier d'un harnais agentique (état au 29/09/2026)

**Critère de succès fixé au départ :** chaque fait porte sa source et son degré de certitude ; ce qui n'a pas été trouvé est dit, pas comblé.

**Degrés de certitude :**
- **H** : j'ai lu moi-même le texte officiel ou le document source (Légifrance affiché dans le navigateur, PDF officiel extrait par pdftotext, fichier Insee ouvert).
- **M** : texte officiel lu à travers le résumé de l'outil WebFetch ou d'une recherche, ou source secondaire confirmée par une autre.
- **B** : une seule source secondaire, ou un résumé de recherche sans page lue.

---

## 0. Périmètre, sous-métiers, cible

| Fait | Source | Cert. |
|---|---|---|
| **71.12B** comprend « les activités d'ingénierie […] et de conseil » : sites industriels, génie civil, bâtiments et infrastructures de transport, eau, génie électrique, climatisation, assainissement, génie acoustique, « les services de gestion de projets de constructions », études géophysiques et géologiques. Il **exclut** l'architecture (71.11Z), les essais et contrôles (71.20B), la R&D (72.19Z) et **les économistes de la construction (74.90A)**. | [Insee, 71.12B](https://www.insee.fr/fr/metadonnees/nafr2/sousClasse/71.12B) (mise à jour du 19/12/2025) | H |
| **71.20B** comprend les analyses physiques et chimiques de matériaux, les essais acoustiques et de vibration, le contrôle des résistances et épaisseurs, le contrôle radiographique des soudures, l'analyse de défaillance, la mesure de la pollution de l'air et de l'eau, la **certification de produits**, les essais sur maquettes. La note ne cite **ni le contrôle technique de la construction ni les diagnostics immobiliers**. | [Insee, 71.20B](https://www.insee.fr/fr/metadonnees/nafr2/sousClasse/71.20B) | H |
| Dans la base `reperage`, les entreprises 71.20B de 6 à 49 salariés du 13 mêlent des laboratoires (hygiène, microbiologie, œnologie, électronique), des sociétés de contrôle et des **diagnostiqueurs immobiliers** (noms contenant « DIAG », « AMIANTE », « DIAGNOSTICS IMMOBILIER »). Les diagnostics relèvent donc au moins en partie de 71.20B par usage, pas par la note Insee. | `../reperage/data/reperage.db`, vue `v_prospectable`, requête du 2026-09-29 | M |
| Les 325 entreprises 71.12B de 6 à 49 salariés du même fichier ont des noms très hétérogènes : ingénierie du bâtiment (fluides, thermique, structure, acoustique, géotechnique), mais aussi industrie, énergie, environnement, et quelques sociétés de conseil ou de logiciel mal codées. Aucun mot clé ne domine (« INGENIERIE » : 30 noms sur 325). | idem | M |

**Sous-métier dominant (hypothèse).** En nombre, l'ingénierie (71.12B) écrase les essais : 496 entreprises de 6 à 49 salariés contre 85 dans les Bouches-du-Rhône (§ 10). Dans l'ingénierie, le BET bâtiment (fluides et thermique en tête, structure ensuite) est probablement majoritaire dans la cible, porté par la RE2020, mais les noms ne suffisent pas à le prouver. **À trancher fiche par fiche** (site web, qualifications OPQIBI) avant d'écrire la fiche métier. Les règles diffèrent fortement :
- **ingénierie structure, fluides, thermique** : aucune autorisation d'exercer ; responsabilité décennale de « technicien » (§ 2.1) ;
- **maîtrise d'œuvre** : responsabilité décennale, et la mission de base du code de la commande publique face à un maître d'ouvrage public (§ 1) ;
- **laboratoires d'essais** : accréditation Cofrac volontaire, sauf quand un texte ou un contrat l'impose (§ 2.7) ;
- **contrôle technique** : agrément ministériel, **incompatible** avec toute conception (§ 2.2) ;
- **diagnostics** : certification de la personne, indépendance, annuaire public (§ 2.8).

---

## 1. La chaîne

Aucune chaîne n'est décrite par un texte : les étapes ci-dessous sont une **hypothèse** à confronter sur place. Seules les phases de mission ont une base écrite.

| # | Étape | Qui (hypothèse) | Passage de main |
|---|---|---|---|
| 1 | Consultation ou appel d'offres : lecture du DCE, offre, mémoire technique, honoraires | dirigeant, chef de projet | 1→2 : ce que l'offre promet (phases, livrables, délais) doit arriver dans le dossier d'affaire |
| 2 | Contrat : mission, phases, CCAG visé, assurance | dirigeant | l'attestation décennale est exigée du candidat à un marché public (§ 2.1) |
| 3 | Collecte des données d'entrée : plans, hypothèses, sondages, relevés, échantillons | chef de projet, technicien | 3→4 : l'hypothèse de calcul et sa source se perdent |
| 4 | Production : calcul, modélisation, essai, rédaction du rapport ou de la note | ingénieur, technicien, junior | |
| 5 | Vérification, relecture, validation | ingénieur confirmé, responsable technique | 4→5 : le passage le plus sensible pour un outil qui rédige |
| 6 | Signature, émission, transmission | signataire autorisé, dirigeant | § 5 |
| 7 | Suivi : VISA des études d'exécution, DET, réception, réserves | chef de projet MOE | |
| 8 | Facturation par phase ou par rapport, relance | administratif | 6→8 : la phase livrée doit déclencher la facture |
| ↻ | Archivage : décennale, réclamations, rapports amendés | tous | durée au moins égale au délai d'action (§ 2.1) : déduction, pas texte |

**Les phases de mission et leur base actuelle** (certitude H sauf mention) :
- **Code de la commande publique, R2431-1** (version du 01/04/2019, [Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037728197)) : la mission de maîtrise d'œuvre peut comprendre dix éléments : études préliminaires ; diagnostic ; esquisse ; avant-projet ; projet ; assistance à la passation des marchés de travaux ; études d'exécution ou examen de leur conformité et **visa** ; direction de l'exécution des marchés de travaux ; ordonnancement, pilotage et coordination ; assistance aux opérations de **réception** et pendant la garantie de parfait achèvement.
- **R2431-4 et R2431-5** ([section](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000037701019/LEGISCTA000037726513/)) : pour la construction neuve de bâtiment, la **mission de base** comporte esquisse, avant-projet, projet, assistance à la passation, direction de l'exécution, assistance à la réception, examen de conformité et visa des études d'exécution. En réhabilitation : les mêmes, **sans l'esquisse**. Ces articles sont au titre III, « maîtrise d'œuvre privée » : ils visent un maître d'œuvre de droit privé travaillant pour un maître d'ouvrage public.
- **Arrêté du 22/03/2019** ([Légifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000038318756/), dernière mise à jour du 01/04/2019) : il découpe l'avant-projet en « études d'avant-projet sommaire » et « études d'avant-projet définitif ». Il parle du « dossier de consultation des entreprises ». Le visa y a pour objet « d'assurer au maître d'ouvrage que les documents établis par ces opérateurs respectent les dispositions du projet établi par le maître d'œuvre ». Il remplace l'arrêté du 21/12/1993 et constitue l'annexe 20 du code (certitude M, résumé de recherche).
- **Les sigles ESQ, APS, APD, PRO, ACT, VISA, EXE, DET, OPC, AOR, DIA ne figurent ni dans R2431-1 ni dans l'arrêté de 2019** : ils sont d'usage ([marche-public.fr](https://www.marche-public.fr/Marches-publics/Definitions/Entrees/Elements-mission-maitrise-oeuvre.htm), certitude M). Le DCE n'est pas un élément de mission : il se prépare dans l'assistance à la passation (ACT).
- En marché privé, ce découpage n'est imposé par aucun texte lu ici ; il sert de référence contractuelle. **Hypothèse.**

---

## 2. Interdits et obligations dures

### 2.1 Responsabilité décennale et assurance

Source : [Code civil, articles 1787 à 1799-1](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000006150293/). Certitude **H** sur toutes les lignes.

- **Art. 1792** (en vigueur depuis le 01/01/1979) : « Tout constructeur d'un ouvrage est responsable de plein droit, envers le maître ou l'acquéreur de l'ouvrage, des dommages, même résultant d'un vice du sol, qui compromettent la solidité de l'ouvrage ou qui […] le rendent impropre à sa destination. » Il n'échappe à cette responsabilité qu'en prouvant une cause étrangère.
- **Art. 1792-1, 1°** : est réputé constructeur « tout architecte, entrepreneur, **technicien** ou autre personne liée au maître de l'ouvrage par un contrat de louage d'ouvrage ». Le bureau d'études y entre comme technicien.
- **Art. 1792-2** : la présomption couvre les éléments d'équipement qui font indissociablement corps avec l'ouvrage. **Art. 1792-3** : les autres éléments ont une garantie de bon fonctionnement de deux ans au moins.
- **Art. 1792-4-1** : décharge après **dix ans à compter de la réception**. **Art. 1792-4-3** : les autres actions contre les constructeurs et leurs sous-traitants se prescrivent aussi par dix ans à compter de la réception.
- **Art. 1792-5** : toute clause qui exclut ou limite cette responsabilité est **réputée non écrite**.
- **Art. 1792-6** : la réception est l'acte par lequel le maître de l'ouvrage accepte l'ouvrage, avec ou sans réserves ; la garantie de parfait achèvement dure un an.
- **Code des assurances, L241-1** (version du 08/08/2015, [Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031010281)) : toute personne dont la responsabilité décennale peut être engagée « doit être couverte par une assurance ». Elle en justifie **à l'ouverture de tout chantier**, et « tout candidat à l'obtention d'un marché public » doit pouvoir en justifier. La garantie est réputée maintenue pour toute la durée de la responsabilité décennale.

### 2.2 Contrôle technique de la construction

Certitude **H**. Sources : [CCH L125-1 à L125-6](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000006158997/), [R125-1 à R125-16-1](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000043818503/), [R125-17 à R125-21](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000043818537/), versions en vigueur depuis le 01/07/2021 (R125-17 : 26/11/2023).

- **L125-1** : le contrôleur technique intervient à la demande du maître de l'ouvrage et lui donne son **avis**, notamment sur la solidité et la sécurité des personnes. **L125-2** : il est soumis à la présomption de l'article 1792, dans les limites de sa mission.
- **L125-3** : l'activité est **soumise à agrément** et « **incompatible avec l'exercice de toute activité de conception, d'exécution ou d'expertise d'un ouvrage** ».
- **R125-1** : agrément du ministre chargé de la construction, **cinq ans au plus**, renouvelable. **R125-3** : il fixe les catégories d'ouvrages couvertes.
- **R125-4** : impartialité, et **aucun lien** de nature à porter atteinte à l'indépendance avec ceux qui conçoivent, exécutent ou expertisent.
- **R125-7 III** : le personnel d'exécution sans pratique suffisante agit sous supervision directe et permanente. Il **ne peut signer un document de contrôle technique que par délégation** d'un dirigeant ou d'un membre de l'encadrement opérationnel.
- **R125-17** : contrôle obligatoire notamment pour les ERP de 1re à 4e catégorie, les immeubles dont le dernier plancher dépasse 28 m, les portées de plus de 40 m, les fondations de plus de 30 m, et dans les zones de sismicité 4 et 5 pour les immeubles de plus de 8 m.
- **R125-21** : le maître de l'ouvrage qui entreprend des travaux sans le contrôle obligatoire encourt l'amende des contraventions de 5e classe.

### 2.3 Statut juridique des normes

- **Décret 2009-697, art. 17** (version du 14/11/2021, [Légifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020749979), texte consolidé au 16/02/2026) : « Les normes sont **d'application volontaire**. » Elles peuvent être rendues obligatoires par arrêté. Celles-ci « sont **consultables gratuitement** sur le site internet de l'Association française de normalisation », téléchargeables et imprimables gratuitement « sauf en cas d'opposition dûment justifiée d'un tiers détenteur de droits de propriété intellectuelle ». Certitude **H**.
- Le **décret 2026-93 du 13/02/2026** a modifié les articles 1, 3, 4 et 5 (gouvernance, délégué interministériel) ; il n'a pas touché l'article 17. Certitude **H**.
- Une norme non rendue obligatoire devient opposable **par le contrat** qui la cite (NF DTU dans un marché de travaux, par exemple). **Hypothèse** : aucun texte lu ici ne le dit.

### 2.4 Droit d'auteur et licence des normes : le point critique pour un outil d'IA

| Fait | Source | Cert. |
|---|---|---|
| Les CGV d'AFNOR disent : « AFNOR **s'oppose expressément** à l'intégration, la transmission, l'absorption de quelque manière que ce soit dans des moteurs ou algorithmes d'intelligence artificielle » des documents dont elle détient les droits ou la distribution. Elle s'oppose aussi à « toute opération de moissonnage, de **fouille de textes et de données** (au sens de l'article L. 122-5-3 du code de la propriété intellectuelle), d'enrichissement, de création dérivée », y compris par intelligence artificielle, « qui constitueraient dès lors des actes de **contrefaçon**, sauf accord spécifique formellement exprimé de la part d'AFNOR ». | [CGV AFNOR, art. 7](https://standardstore-cdn.afnor.org/standardstore/documents/CGV.fr-FR.pdf), PDF téléchargé le 2026-09-29, **non daté** | H |
| Même article : l'achat ne confère qu'un droit d'usage « strictement individuel, non collectif et non marchand ». Il interdit toute « reproduction, extraction, mise en réseau, partage, ou réutilisation qualitativement ou quantitativement substantielle ». | idem | H |
| Pour un document téléchargé : « Le fichier électronique […] ne peut, en aucun cas, être placé sur un réseau quel qu'il soit. » AFNOR peut venir vérifier sur place le respect de la licence. | idem, art. 12 f | H |
| **CPI L122-5-3 III** (version du 26/11/2021) : la fouille de textes est libre sur des œuvres accédées licitement, « sauf si l'auteur s'y est opposé de manière appropriée ». Les copies sont détruites à l'issue de la fouille. L'opposition d'AFNOR ci-dessus est exactement cette réserve. | [Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044363192) | H |
| CJUE, 05/03/2024, C-588/21 P (Public.Resource.Org) : les normes harmonisées restent protégées par le droit d'auteur, mais un « intérêt public supérieur » en justifie la divulgation au titre du règlement 1049/2001 (accès aux documents de la Commission). | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=ecli%3AECLI%3AEU%3AC%3A2024%3A201) ; [Landot avocats](https://blog.landot-avocats.net/2024/03/06/pas-de-norme-obligatoire-sans-diffusion-publique-gratuite/) ; [Portail qualité Luxembourg](https://portail-qualite.public.lu/fr/actualites/normes-normalisation/2024/la-protection-par-le-droit-d-auteur-des-normes-harmonisees-n-est-pas-remise-en-question-il-existe-cependant-un-interet-public-primordial-a-leur-divulgation.html) (arrêt non lu) | M |

**Conséquence pour l'outil** (déduction, à faire valider par un juriste) : l'outil ne doit **ni ingérer, ni indexer, ni résumer** le texte d'une norme AFNOR, même achetée par le client, sans accord écrit d'AFNOR. Même une norme rendue obligatoire, gratuite à la consultation, reste sous droit d'auteur. Ce qui reste possible sans accord : citer la **référence** (numéro, date d'édition), renvoyer le lecteur à Cobaz ou à l'exemplaire du client, et travailler sur les **notes internes** du bureau d'études, qui lui appartiennent. La douleur du site (« la bonne version de la norme ») se traite donc par un **registre des références et des éditions**, pas par une lecture des normes.

### 2.5 Eurocodes, NF DTU, sismique

- **Arrêté du 22/10/2010, art. 4** (version du 01/08/2022, [Légifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000022941755/)) : pour les bâtiments « à risque normal » soumis aux règles parasismiques, la conception et le calcul suivent les normes **NF EN 1998-1 septembre 2005, NF EN 1998-3 décembre 2005, NF EN 1998-5 septembre 2005** (« règles Eurocode 8 ») et leurs annexes nationales datées de 2007-2008. Ce qu'elles ne couvrent pas se justifie par **NF EN 1990 mars 2003**. Le texte **fixe l'édition** de chaque norme. Certitude **H**.
- La commune de Salon-de-Provence est classée en zone de sismicité **4** (moyenne). Le classement d'Aix-en-Provence et de Marseille n'a pas été lu. Source : [annexe 4-4 d'un PPR des Bouches-du-Rhône](https://www.bouches-du-rhone.gouv.fr/content/download/22226/135567/file/ANNEXE_4-4_R), document préfectoral. Certitude **M**.
- **Eurocodes de deuxième génération** : publication étalée jusqu'en 2027, annexes nationales à voter, retrait de la première génération visé pour **mars 2028**, avec une période de coexistence. Certitude **B** : résumé de recherche seulement ([Graitec](https://graitec.com/fr/blog/eurocodes-2eme-generation/), [AFNOR](https://normalisation.afnor.org/thematiques/eurocodes/)), pages non lues. À croiser avec l'arrêté de 2010, qui cite l'édition 2005.
- **NF DTU** : aucun texte d'application obligatoire trouvé. Leur force vient du marché qui les cite. **Hypothèse.**

### 2.6 RE2020 : les attestations

Source : [CCH R122-24 à R122-27](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000043818465/), versions du 01/01/2024 (décret 2023-1175). Certitude **H**.

- **R122-24-1** : au dépôt du permis, le **maître d'ouvrage** établit un document attestant qu'il a respecté, ou fait respecter par le maître d'œuvre chargé de la conception, les exigences de performance énergétique et environnementale (R172-4, R172-5).
- **R122-24-3** : à l'achèvement, même attestation, jointe à la déclaration d'achèvement et de conformité ; elle **comprend les indicateurs** des 6° et 7° de R172-4.
- **R122-25** : l'attestation d'achèvement est établie, **après visite sur site**, par un contrôleur technique, un diagnostiqueur DPE (maison individuelle), un organisme certificateur conventionné, un architecte, ou « **un bureau d'étude agréé** ». Le texte ne dit pas qui agrée le bureau d'études.

### 2.7 Accréditation des laboratoires (Cofrac, NF EN ISO/IEC 17025:2017)

La norme ISO/IEC 17025 est payante et n'a pas été lue. Ce qui suit vient des documents Cofrac, gratuits, qui renvoient à ses paragraphes. Certitude **H** : [LAB REF 02 rév. 15](https://tools.cofrac.fr/documentation/LAB-REF-02), applicable depuis le **01/03/2026** ; [GEN REF 11 rév. 11](https://tools.cofrac.fr/documentation/GEN-REF-11), applicable depuis le **01/02/2026**.

- **Confidentialité (LAB REF 02, § 4.2.3)** : toute information sur le client est confidentielle, même obtenue d'une autre source, sauf exigence légale.
- **Signataire (§ 6.2.6)** : la « personne autorisant le rapport » (norme, § 7.8.2.1 o) prend la responsabilité de l'émission et atteste implicitement le respect du système qualité. Si d'autres valident les résultats ou émettent avis et déclarations de conformité, ces validations doivent être **traçables** (norme, § 7.5.1).
- **Méthodes (§ 7.2)** : la portée d'accréditation liste les méthodes que le laboratoire peut appliquer sous accréditation ; un écart demandé par le client n'est admis que si la portée le permet (§ 7.1.4, LAB REF 08).
- **Rapports (§ 7.8.1)** : rien ne peut être rapporté sous accréditation hors de la portée. Dans un rapport portant la marque, tout résultat hors portée est « explicitement identifié comme non couvert par l'accréditation ».
- **Mention obligatoire (§ 7.8.2.1 l)** : le rapport spécifie que les résultats **ne valent que pour l'objet soumis à essai**. La révision 15 le rend systématique. Si le laboratoire n'a pas prélevé, les résultats s'appliquent « à l'échantillon tel qu'il a été reçu » (§ 7.6.1).
- **Amendements (§ 7.8.8)** : toute modification est identifiée et traçable ; rapport d'origine et rapport modifié sont conservés. On ne réémet pas un rapport sous accréditation parce que le nom commercial du produit a changé.
- **Transmission (§ 7.8.1.2)** : confidentialité, authenticité et intégrité, quel que soit le support.
- **Systèmes informatisés (§ 7.11)** : la règle vaut pour « les LIMS, les GED », etc. Leur **validation** consiste à confirmer, par des preuves objectives, que les spécifications répondent aux besoins et à toutes les exigences de la norme. **Un outil d'IA qui produit ou met en forme un rapport entre dans ce champ.**
- **Enregistrements (§ 8.4.2)** : durée de conservation compatible avec les besoins des clients et des pouvoirs publics, et avec les cycles d'évaluation du Cofrac. **Aucune durée chiffrée.**
- **GEN REF 11, § 7** : un organisme doit rendre sous accréditation tout rapport de sa portée, sauf accord contractuel documenté. C'est **interdit hors accréditation** quand l'accréditation est obligatoire (réglementairement ou contractuellement) ou quand le rapport est destiné au public ou aux autorités.
- **GEN REF 11, § 9** : une référence trompeuse à l'accréditation est un usage abusif. Le Cofrac peut suspendre ou retirer l'accréditation et publier l'infraction.
- **ISO/IEC 17020** (organismes d'inspection) : le document Cofrac INS REF 02 n'a pas pu être téléchargé. Non lu.

### 2.8 Diagnostics immobiliers

- **CCH L271-6** (version du 02/07/2025, modifiée par la loi 2025-594 du 30/06/2025, [Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022493212/)) : les diagnostics sont établis par une personne présentant des garanties de compétence, **assurée**, sans lien avec le propriétaire ni avec une entreprise pouvant faire les travaux. Nouveauté : « Un **annuaire rendu public** recense les personnes en activité ». Certitude **H**.
- **R271-1** : la compétence est certifiée par un organisme accrédité. Certitude **M** : résumé de recherche, article non affiché.
- **DPE** : son régime (opposabilité, contrôles, sanctions) n'a pas été lu.

### 2.9 Commande publique : confidentialité et pénalités (CCAG-PI 2021)

[Arrêté du 30/03/2021, CCAG-PI](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000043310613), texte consolidé (mise à jour du 01/07/2024). Il ne s'applique que si le marché y renvoie. La maîtrise d'œuvre a son propre CCAG-MOE, non lu. Certitude **H**.
- **Art. 5.1.2** : une information confidentielle couvre toute information, méthodologie et savoir-faire compris, communiquée par l'acheteur ; le titulaire « ne peu[t] l'utiliser que pour l'accomplissement des prestations prévues au marché ».
- **Art. 5.1.3** : le titulaire informe ses sous-traitants de ces obligations et s'assure qu'ils les respectent.
- **Art. 14.2** : une violation de la confidentialité ou des mesures de sécurité coûte une pénalité de **0,5 % du montant exécuté** du marché, et de **2 %** si des données personnelles sont en cause. Les pénalités se cumulent par fait générateur.

### 2.10 Convention collective Syntec (IDCC 1486)

[Légifrance, KALICONT000005635173](https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000005635173) : « convention collective nationale des bureaux d'études techniques, des cabinets d'ingénieurs-conseils et des sociétés de conseils du 15 décembre 1987 », mise à jour par l'avenant n° 46 du 16/07/2021.

Temps de travail : [accord du 22/06/1999](https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000005679936?idConteneur=KALICONT000005635173), dans sa version affichée, avenant du 01/04/2014 intégré. Certitude **H** sauf mention.
- Trois modalités : **standard** (35 h), **réalisation de missions** (dépassement de 10 % au plus inclus au salaire, **219 jours** au plus, rémunération d'au moins 115 % du minimum conventionnel), **autonomie complète** (forfait jours).
- Forfait jours : **218 jours** par an au plus, journée de solidarité incluse ; rémunération d'au moins 120 % du minimum (122 % en position 2.3).
- L'employeur tient un **document des journées travaillées et des jours de repos**, et fait un entretien annuel sur la charge de travail.
- Contingent d'heures supplémentaires de 90 h si le temps de travail est organisé sur l'année (certitude **M** : je n'ai pas vérifié que cette phrase est en vigueur).

Textes attachés, vus dans la liste, contenu non lu :
- l'avenant n° 11 du 08/07/1993 sur les fins de chantier dans l'ingénierie ;
- l'accord du 13/12/2022 sur l'organisation hybride du travail ;
- l'avenant n° 2 du 13/12/2022 sur la durée du travail.

Nouvelle classification applicable au 01/10/2024 : certitude **B** (sources de paie seulement).

---

## 3. Incidents, sanctions, contentieux : ce qui peut devenir un test

| Fait | Source | Cert. |
|---|---|---|
| Flop 10 2026 de l'Agence Qualité Construction (base Sycodés, 1996-2025, publié le 18/06/2026) : les défauts d'étanchéité à l'eau font **67 % des désordres sur 2023-2025** (61 % l'an précédent). Les désordres de structure en font 11 %. En logement collectif, les équipements sanitaires arrivent en tête (10,7 %). | [AQC](https://qualiteconstruction.com/actualite/desordres-decennaux-aqc-2026-flop-10-sinistralite-francaise-06-2026/) | M |
| Cofrac : suspension de l'accréditation pour le domaine en cause si les essais d'aptitude remettent en cause la validité des résultats sans action corrective efficace (LAB REF 02, § 7.7.3). Suspension, retrait et publication en cas d'usage abusif de la marque (GEN REF 11, § 9). | § 2.7 | H |
| Le Cofrac publie une liste des suspensions, résiliations et retraits. Page dynamique, **non lue**. | [tools.cofrac.fr](https://tools.cofrac.fr/fr/easysearch/rrs.php) | B |
| Maître de l'ouvrage sans contrôle technique obligatoire : amende de 5e classe (R125-21). Clause limitant la décennale : réputée non écrite (1792-5). Violation de confidentialité en marché public : 0,5 % ou 2 % du montant exécuté (CCAG-PI 14.2). | § 2.1, 2.2, 2.9 | H |
| **Aucune décision publiée** contre un bureau d'études, un contrôleur technique ou un diagnostiqueur n'a été lue : la recherche web a été coupée avant. | — | — |

Tests candidats, tirés des textes :
- un rapport d'essai sans la mention « ne vaut que pour l'objet soumis à essai » est bloqué ;
- un résultat hors portée d'accréditation, dans un rapport qui porte la marque, est bloqué s'il n'est pas marqué « non couvert » ;
- une note citant « NF EN 1998-1 » sans édition, ou avec une autre édition que celle exigée par l'arrêté applicable, est signalée ;
- un rapport modifié garde sa version d'origine et la trace du changement ;
- aucun extrait de norme AFNOR ne transite par le modèle ;
- une note de calcul qui change une hypothèse d'entrée sans validation humaine est bloquée : c'est un garde-fou de la page du site.

---

## 4. Connecteurs

Présence vérifiée par le site de l'éditeur (fonctions non testées ; certitude **B** sur le rôle, **H** sur l'existence du site) :
- **Calcul de structure** : Graitec, partenaire Autodesk ([graitec.com](https://graitec.com/fr/)) ; Dlubal ([dlubal.com](https://www.dlubal.com/fr)) ; SCIA ([scia.net](https://www.scia.net/fr)) ; CYPE ([cype.fr](https://www.cype.fr/)).
- **Thermique, énergie, RE2020** : Izuba ([izuba.fr](https://www.izuba.fr/logiciels/)) ; BBS Logiciels ([bbs-logiciels.com](https://www.bbs-logiciels.com/)).
- **LIMS des laboratoires** : LabWare ([labware.com](https://www.labware.com/)). Le Cofrac classe les LIMS parmi les systèmes à valider (§ 2.7).
- **Gestion d'agence** : OOTI, ciblé architectes ([ooti.co](https://www.ooti.co/fr)). Aucun logiciel de gestion d'affaires propre aux BET n'est confirmé.
- **Accès aux normes** : Cobaz, AFNOR, sur abonnement ([cobaz.afnor.org](https://cobaz.afnor.org/)) ; Sagaweb, AFNOR (site existant, contenu non lu) ; boutique du CSTB ([boutique.cstb.fr](https://boutique.cstb.fr/)). Les CGV d'AFNOR excluent l'IA (§ 2.4) ; la licence du CSTB n'a pas été lue.
- **Qualification des BET** : OPQIBI ([opqibi.com](https://www.opqibi.com/)), « la marque de l'ingénierie compétente ». Qualification volontaire. Certitude **M**.
- **Formats** : IFC (BIM) et BCF, DWG, tableurs, PDF signés. Catégorie seulement, rien de vérifié.

---

## 5. Escalades et responsabilité

| Qui engage quoi | Source | Cert. |
|---|---|---|
| L'entreprise de BET, comme « technicien » lié au maître de l'ouvrage, porte la décennale : elle ne peut pas l'exclure par contrat. | C. civ. 1792-1, 1792-5 | H |
| Contrôle technique : le personnel d'exécution ne signe **que par délégation** d'un dirigeant ou de l'encadrement opérationnel. | CCH R125-7 III | H |
| Laboratoire accrédité : la « personne autorisant le rapport » ; toute validation déléguée doit être traçable. | LAB REF 02, § 6.2.6 | H |
| RE2020 : le **maître d'ouvrage** signe l'attestation du permis ; celle d'achèvement est établie par l'une des cinq catégories de R122-25, **après visite sur site**. | CCH R122-24-1, R122-25 | H |
| Diagnostic : la personne certifiée, assurée et indépendante. | CCH L271-6 | H |
| Ingénieur de BET : **aucun texte lu ne réserve une signature** à un titre (il n'existe pas d'ordre des ingénieurs). La signature relève de la délégation interne. | recherche | H (absence) |

Ce qu'un junior ne peut pas valider, **hypothèse** à confirmer sur place : une hypothèse de calcul, une déclaration de conformité, une réponse à une réserve de contrôleur technique, un visa, l'émission d'un rapport.

---

## 6. Vocabulaire et pièges

| Terme | Sens | Piège | Cert. |
|---|---|---|---|
| **Réception** | Acte par lequel le maître de l'ouvrage accepte l'ouvrage (1792-6), point de départ des délais de dix ans. | Au laboratoire : l'arrivée de l'échantillon (« l'échantillon tel qu'il a été reçu »). | H |
| **Visa** | Élément de mission : examen de conformité au projet des études d'exécution faites par l'entreprise. | Pas une signature d'approbation générale ; ne transfère pas la conception. | H |
| **Avis** | Du contrôleur technique au maître de l'ouvrage (L125-1). | Au laboratoire, les « avis et interprétations » relèvent de la portée d'accréditation. | H |
| **Agrément / accréditation / certification / qualification** | Agrément ministériel (contrôle technique) ; accréditation Cofrac (laboratoire) ; certification de personne (diagnostiqueur) ; qualification OPQIBI (BET). | Quatre régimes distincts. « Bureau d'étude agréé » (R122-25) n'a pas d'agrément défini. | H/M |
| **Validation** | 17025 : preuve qu'une méthode, ou qu'un système informatisé, répond à l'usage. | Dans l'agence : « le chef a validé ». | H |
| **APS / APD** | Avant-projet sommaire / définitif (arrêté de 2019). | Le code ne connaît que « l'avant-projet » ; les sigles sont d'usage. | H |
| **DCE** | Dossier de consultation des entreprises. | Pièce, pas phase : relève de l'assistance à la passation. | H |
| **Diagnostic (DIAG)** | Élément de mission de maîtrise d'œuvre (R2431-1, 2°). | Diagnostic immobilier réglementé (L271-6) : autre métier, autre responsabilité. | H |
| **Contrôle** | Contrôle technique agréé. | Autocontrôle de l'entreprise, contrôle interne du BET, contrôle qualité du labo. | H |
| **Norme / DTU / Eurocode** | Norme volontaire sauf arrêté ; NF DTU et Eurocodes sont des normes. | « Obligatoire » veut dire soit par arrêté, soit par contrat. | H/hyp. |
| **Portée** | Liste des essais et méthodes couverts par l'accréditation. | Un essai fait correctement mais hors portée ne se rapporte pas sous accréditation. | H |
| **Mission de base** | Ensemble minimal imposé en construction neuve publique (R2431-4). | En marché privé, rien ne l'impose. | H/hyp. |

---

## 7. Le bon résultat

**Rien de publié trouvé.** Toutes les lignes sont des hypothèses à poser en entretien :
- un rapport dans le **modèle maison**, conforme aux paragraphes types déjà validés ;
- chaque référence normative citée avec son **édition** ;
- des hypothèses de calcul **explicites et sourcées** en tête de note ;
- une livraison dans le délai de la phase, qui déclenche la facture ;
- quand tout ne tient pas, on sacrifie probablement la mise en forme avant la complétude de la vérification.

---

## 8. Données

| Donnée | Sert à | Où elle vit (hypothèse) | Risque |
|---|---|---|---|
| Plans, maquettes, hypothèses du maître d'ouvrage | produire le rapport | DCE, GED, messagerie | confidentielles (CCAG-PI 5.1 ; LAB REF 02 4.2.3) |
| Modèles de rapports, paragraphes types | rédiger | serveur de fichiers, Word | propriété du BET |
| Références normatives et leur édition | citer juste | tête des ingénieurs, tableur | pas le texte des normes (§ 2.4) |
| Portée d'accréditation, méthodes et versions | bloquer un rapport hors portée | système qualité, LIMS | doit être à jour, sinon garde-fou faux |
| Résultats d'essais bruts | rapport d'essai | LIMS, tableurs, fichiers d'appareils | traçabilité (§ 7.5.1 de la norme) |
| Liste des signataires et délégations | escalade | organigramme, système qualité | R125-7 ; LAB REF 02 § 6.2.6 |
| Attestations d'assurance décennale | offres de marchés publics | administratif | L241-1 |
| Dates de réception | archivage sur dix ans | dossier d'affaire | 1792-4-1 |

---

## 9. Briques plausibles

Rattachées aux trois douleurs de la page du site (`smart-tailor`, `verticals.etudes`). **Hypothèses.**

| Brique | Douleur | Borne principale |
|---|---|---|
| Préparation du rapport depuis les données d'affaire, dans le modèle maison | « Un rapport sur deux, c'est de la mise en forme » | ne modifie aucune hypothèse ; ne signe ni n'envoie ; version et trace (§ 7.8.8) |
| Registre des références normatives : édition citée, date de vérification, alerte de révision | « La bonne version de la norme » | **ne lit pas les normes** : références seules (§ 2.4) ; l'édition peut être fixée par arrêté (§ 2.5) |
| Liste de vérifications passée avant de rendre la main (mentions obligatoires, portée, unités, pièces manquantes) | « Il manque toujours la même vérification » | contrôles déterministes en code ; le jugement reste humain |
| Contrôle de complétude de l'offre (attestation décennale, pièces du DCE) | hors page du site | L241-1 |
| Suivi phase par phase jusqu'à la facture | hors page du site | aucune écriture comptable sans validation |

---

## 10. Prospection

**Chiffres du secteur**

| Fait | Source | Cert. |
|---|---|---|
| Chiffre d'affaires de la branche en 2023 : **65,5 Md€** pour 71.12B, **9,4 Md€** pour 71.20B (France, entreprises marchandes). | [Insee, Ésane 2023](https://www.insee.fr/fr/statistiques/8611640?sommaire=8611642), fichier `DD_esane23m23ep_branche.xlsx` | H |
| Unités légales actives de 6 à 49 salariés : **6 300** en 71.12B et **915** en 71.20B en France ; **496** et **85** dans les Bouches-du-Rhône. Tout le 13, toutes tailles : 4 607 et 716. Le code de tranche Sirene est souvent daté. | [API Recherche d'entreprises](https://recherche-entreprises.api.gouv.fr), requêtes du 2026-09-29 | H (comptage) |
| `reperage`, relevé de volumétrie (13, 3 à 49 salariés) : 697 (71.12B), 113 (71.20B). Vue `v_prospectable` : 459 et 71 fiches, dont **325 et 52 de 6 à 49 salariés**, et **29 et 1 avec un téléphone**. | `../reperage/data/volumetrie.tsv` ; `data/reperage.db` (collecte du 2026-09-09) | H |
| `reperage` a fait des études et essais sa **première verticale** : « plus gros bassin appelable, score moyen le plus haut ». | `../reperage/docs/plan-prospection-2026-09.md` | H |
| Adhérents Syntec-Ingénierie : CA 2025 en hausse de **+5,2 %**, production **-0,7 % au T1 2026**, carnet de **10,2 mois**. « Le Bâtiment reste sous pression. » | [Syntec-Ingénierie, 25/06/2026](https://www.syntec-ingenierie.fr/actualites/barometre-economique-de-lingenierie-printemps-2026-cap-maintenu-dans-un-contexte-exigeant/) | M |
| Taux de marge et emploi par sous-classe : non trouvés. | — | — |

**Accroches datées** (2025-2027)
- **01/03/2026** : LAB REF 02 rév. 15. La mention « résultats valables pour le seul objet soumis à essai » devient systématique, et les avis et déclarations de conformité doivent être rendus sous accréditation. Les modèles de rapport ont dû changer. Certitude **H**.
- **01/02/2026** : GEN REF 11 rév. 11 sur la référence à l'accréditation. Certitude **H**.
- **02/07/2025** : annuaire public des diagnostiqueurs (L271-6). Certitude **H**.
- **02/08/2026** : l'AI Act s'applique pour l'essentiel, dont la transparence de l'article 50. Depuis le 02/02/2025, l'**article 4** impose au déployeur un « niveau suffisant de maîtrise de l'IA » pour son personnel. Certitude **H** sur le texte initial ; un amendement ultérieur (omnibus numérique) n'a pas été vérifié.
- **Mars 2028** : retrait visé des Eurocodes de première génération. Tous les modèles de notes de calcul sont concernés. Certitude **B**.
- **01/01/2027** : entrée en vigueur de la NAF 2025, qui change le code APE de toutes les entreprises ([Insee](https://www.insee.fr/fr/information/8181066), décret 2025-736). Certitude **M**. Accroche faible pour le client ; **risque pour `reperage`**, dont les filtres reposent sur 71.12B et 71.20B.

**Ce qu'un connaisseur dit au téléphone** (tiré des textes)
- Un contrôleur technique ne conçoit jamais (L125-3) : on ne lui vend pas la même chose qu'à un BET.
- Rendre un rapport hors accréditation n'est pas un choix libre (GEN REF 11).
- L'arrêté parasismique cite l'Eurocode 8 **dans son édition de 2005**.
- AFNOR s'oppose à tout usage de ses normes par une IA : dire d'emblée que l'outil ne les lit pas.

**Objections probables** (hypothèses)
- « Nos données clients ne sortent pas » : CCAG-PI 5.1 et confidentialité 17025.
- « C'est moi qui signe et qui suis assuré » : la décennale ne se délègue pas.
- « Et le Cofrac ? » : un outil de rapport est un système informatisé à valider (§ 7.11).
- « Nos modèles sont faits, le problème est ailleurs. »
- « L'outil va inventer une norme. »

---

## 11. Contraintes propres à un outil d'IA

- **Licence des normes** : l'opposition d'AFNOR à la fouille et à l'IA (§ 2.4) exclut qu'un modèle reçoive le texte d'une norme. Garde-fou en code : aucun document issu de Cobaz, d'AFNOR ou d'une boutique de normes dans les entrées. Certitude **H** sur la clause ; portée juridique à faire valider.
- **Confidentialité du maître d'ouvrage** : CCAG-PI 5.1.2 (usage limité au marché), 5.1.3 (sous-traitants informés et tenus), 14.2 (pénalités). Un fournisseur de modèle est probablement un **sous-traitant** au sens de 5.1.3 : **hypothèse** juridique. D'où le garde-fou « ne sert pas à entraîner un modèle » de la page du site.
- **Laboratoires** : validation du système informatisé (LAB REF 02, § 7.11), traçabilité des validations (§ 6.2.6), versions des rapports (§ 7.8.8).
- **Responsabilité du signataire** : la décennale et la signature restent humaines (§ 5). L'outil ne signe, n'émet et ne transmet rien.
- **AI Act** (règlement 2024/1689, [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024R1689), texte initial lu) :
  - article 4 (maîtrise de l'IA) applicable depuis le 02/02/2025 ;
  - article 50 : informer une personne qu'elle interagit avec un système d'IA ;
  - annexe III, point 2 : vise les « composants de sécurité » de la gestion d'infrastructures critiques (numérique, trafic routier, eau, gaz, chauffage, électricité). **Un outil de rédaction de rapports de BET n'y figure pas** : classement non à haut risque probable. Déduction (certitude M), à revoir si l'outil s'intègre à l'exploitation d'une infrastructure.

---

## Non trouvé / à vérifier

1. **Aucune décision publiée** (sinistre, sanction, retrait d'accréditation ou d'agrément) n'a été lue : la recherche web a été coupée par une limite de session. La liste Cofrac des retraits est dynamique et n'a pas été lue.
2. Texte de la norme ISO/IEC 17025 (payante) et document Cofrac INS REF 02 pour l'ISO/IEC 17020 (téléchargement vide).
3. Seuils RE2020 et leurs paliers (arrêté du 04/08/2021) ; régime du DPE ; articles R271-1 et suivants affichés sur Légifrance.
4. Calendrier officiel des Eurocodes de deuxième génération, et articulation avec l'édition 2005 fixée par l'arrêté parasismique.
5. Zone sismique d'Aix-en-Provence et de Marseille.
6. CCAG-MOE 2021 : clauses de confidentialité et de propriété intellectuelle.
7. Syntec : contenu de la classification en vigueur, de l'accord de 2022 sur le travail hybride et de l'avenant « fins de chantier » ; statut en vigueur du contingent de 90 h.
8. Arrêt de la CJUE C-588/21 P et décision du Conseil d'État n° 383756 (accès aux normes) : lus à travers des résumés seulement.
9. Marge, emploi et nombre d'entreprises par sous-classe (Ésane les donne au niveau groupe) ; chiffres de la région PACA.
10. Logiciels de gestion d'affaires propres aux BET ; LIMS français ; fonctions de Sagaweb.
11. Qui agrée le « bureau d'étude agréé » de R122-25.
12. Amendement éventuel de l'AI Act en 2025-2026 (omnibus numérique).
13. Un modèle hébergé chez le client, plutôt que chez un fournisseur, change-t-il l'analyse de sous-traitance du CCAG-PI ? Question à un juriste.

---
