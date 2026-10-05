<!-- Recherche documentaire du 2026-09-29 (agent de recherche, WebSearch/WebFetch,
Légifrance et EUR-Lex lus dans un navigateur piloté par playwright-cli).
Instantané daté : ne pas corriger en place, en écrire un nouveau. Une future
fiche (fiche.md) en tirera ses lignes `texte` ; les lignes de certitude B n'y
entrent qu'en `hypothèse`. Aucune vérification séparée n'a encore été faite :
les lignes H ont été lues mot à mot dans la version affichée « en vigueur » le
2026-09-29, par l'agent ou par deux agents de recherche parallèles de la même
session (§ 2.9, 3, 4, 10 : IA, incidents, connecteurs, chiffres) ; elles se
relisent avant de coder un garde-fou (GRILLE.md). Deux arrêts de cassation
sont lus sur Juricaf, reproduction non officielle. -->


# Cabinets d'avocats en droit des affaires : la couche métier d'un harnais agentique (état au 29/09/2026)

**Critère de succès fixé au départ :** chaque fait porte sa source et son degré de certitude ; ce qui n'a pas été trouvé est dit, pas comblé.

**Degrés de certitude :**
- **H** : j'ai lu moi-même le texte officiel (Légifrance, EUR-Lex, PDF du CNB) dans sa version en vigueur au 29/09/2026.
- **M** : texte officiel lu à travers un résumé d'outil, ou source secondaire confirmée par une autre.
- **B** : une seule source secondaire (blog, éditeur, presse).

Périmètre : NAF 69.10Z, cabinets de 2 à 30 avocats, barreaux de Marseille et d'Aix-en-Provence. L'outil visé est un assistant de recherche (codes et jurisprudence à la date des faits, citation au paragraphe, abstention).

---

## 0. Ce qui existe déjà, et la place de ce métier

- **Le démonstrateur `../attendu`** couvre la recherche : Code de commerce et Code civil avec toutes les versions d'articles (dump DILA LEGI), Cour de cassation par le miroir Hugging Face de Judilibre, **figé au 19/03/2025** ; citations par décodage contraint (le rédacteur ne peut citer qu'un paragraphe enregistré, l'extrait est vérifié comme sous-chaîne) ; filtre temporel ; abstention ; 15 dossiers **synthétiques** (`../attendu/PLAN.md` § 0 à 2, `docs/01-corpus-et-graphe.md` § 1-2). Tout modèle est Mistral, hébergement UE (D13). Ce document ne refait pas ce travail : il décrit ce qui l'entoure (chaîne, interdits, escalades, données, prospection).
- **Échecs connus du démonstrateur qui recoupent le métier** (`../attendu/docs/known-failures.md`) : arrêt qui applique un texte hors corpus lu comme « hors périmètre » (G-037, G-038, G-042) ; version ancienne d'un article non retrouvée (G-101, C. com. L. 522-15 dans sa version 2000-2019) ; inversion de la charge de la preuve (G-039). Ce sont des tests tout faits.
- **Prospection** : `../reperage/docs/plan-prospection-2026-09.md` (arbitrage du 2026-09-22) : « Comptables et avocats restent hors matrice : prescripteurs suivis à la main, une dizaine de contacts, pas de code NAF ajouté. » La page du site existe (`../smart-tailor/i18n/locales/fr/verticals.json5`, `verticals.avocats`) avec trois douleurs : l'article qui a changé trois fois, l'arrêt cité de mémoire, les pièces qui ne doivent pas sortir du cabinet.

---

## 1. La chaîne

Aucune source publique ne décrit la chaîne d'un cabinet d'affaires étape par étape. Les étapes ci-dessous sont **reconstruites** : chaque ligne dit quel texte l'impose (H) ou si ce n'est qu'une hypothèse à vérifier sur place.

| # | Étape | Ce qui l'impose ou la décrit | Qui (hypothèse) | Cert. |
|---|---|---|---|---|
| 1 | **Prise de contact, contrôle de conflit** : vérifier qu'aucun client actuel ou ancien n'est en conflit, « au jour de sa saisine », y compris pour les dossiers personnels d'un collaborateur. | RIN art. 4.1 et 4.2 | assistante (recherche dans le logiciel), associé (décision) | H (texte) / B (rôles) |
| 2 | **Vigilance anti-blanchiment** quand l'activité entre dans CMF L561-3 I (transactions immobilières ou financières, fonds de commerce, création, gestion ou direction de sociétés, apports, fiducie, conseil fiscal). | CMF L561-2 13°, L561-3 | associé | H |
| 3 | **Convention d'honoraires écrite**, sauf urgence, force majeure ou aide juridictionnelle ; information dès la saisine sur le mode de calcul. | Loi 71-1130 art. 10 al. 3 ; RIN 11.1-11.2 | associé | H |
| 4 | **Ouverture du dossier** dans le logiciel de gestion (numéro, parties, adversaires, délais). | pratique ; § 4 | assistante | B |
| 5 | **Recherche** (textes, jurisprudence, doctrine) et **note** ou projet d'acte, de conclusions. | pratique | collaborateur, juriste | B |
| 6 | **Relecture par l'associé** ; double signature ou visa possibles si le contrat de collaboration le prévoit. | RIN 14.2.1 (« Il peut être convenu que la double signature ou le visa soient apposés sur tous actes, correspondances, études ou consultations ») | associé | H (possibilité) / B (usage) |
| 7a | **Conseil : envoi** de la consultation au client (couverte par le secret). | Loi 71-1130 art. 66-5 | associé ou collaborateur | H |
| 7b | **Contentieux : remise des actes par voie électronique** à la juridiction (RPVA) ; pièces numérotées, au cachet de l'avocat, avec **bordereau daté et signé**. | CPC 930-1 (appel) ; RIN 5.5 | collaborateur, assistante | H |
| 8 | **Suivi des délais** (appel, conclusions, prescription) : la tâche critique, § 2.6. | CPC 538, 640-643, 906-2, 908-911 | assistante + collaborateur ; associé responsable | H (délais) / B (rôles) |
| 9 | **Facturation**, au temps passé ou au forfait, selon la convention ; information régulière sur l'évolution du montant. | RIN 11.1-11.2 | associé, comptabilité | H |
| 10 | **Archivage** : le guide LCB-FT du CNB dit de conserver les documents de consultation **10 ans**, « délai légal de la prescription en matière de responsabilité professionnelle » ; or C. civ. 2225 fixe 5 ans après la fin de la mission judiciaire, et 2224 vaut pour le conseil (§ 2.6). **Écart à faire trancher par un avocat.** | [Guide CNB LCB-FT, 3ᵉ éd., p. 19](https://cnb.avocat.fr/sites/default/files/documents/cnb_guide_lutte-contre-blanchiment_3eme_edition.pdf) | cabinet | H (lu) |

**Passages de main à surveiller** (hypothèses) : associé → collaborateur (la question posée et **la date des faits** doivent passer avec le dossier) ; collaborateur → associé (la note doit montrer ses sources) ; assistante → collaborateur (le délai saisi dans le logiciel doit être le bon) ; cabinet → client (rien ne part sans signature).

---

## 2. Interdits et obligations dures

### 2.1 Secret professionnel

| Fait | Source | Cert. |
|---|---|---|
| « En toutes matières, que ce soit dans le domaine du conseil ou dans celui de la défense », consultations, correspondances client-avocat et entre avocats (sauf mention « officielle »), notes d'entretien et « toutes les pièces du dossier » sont couvertes par le secret. Version en vigueur depuis le 30/03/2011. | [Loi 71-1130, art. 66-5](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000508793) | H |
| Le secret est « d'ordre public », « général, absolu et illimité dans le temps ». Il couvre aussi « le nom des clients et l'agenda de l'avocat », quel que soit le support (« voie électronique »). | [RIN, art. 2.1 et 2.2, version consolidée au 18/02/2026](https://cnb.avocat.fr/medias/file/rinconsolide-final---maj-10032026-69b3efdd32d1b4.99657001.pdf) | H |
| **L'avocat fait respecter le secret par son personnel « et par toute personne qui coopère avec lui dans son activité professionnelle. Il répond des violations du secret qui seraient ainsi commises. »** Un prestataire informatique ou d'IA entre dans cette phrase. | RIN art. 2.3 | H |
| Tous les échanges entre avocats sont confidentiels et ne peuvent être produits en justice ; exceptions : la correspondance marquée « officielle » (équivalant à un acte de procédure, ou sans référence à un élément confidentiel). | RIN art. 3.1-3.2 | H |
| Révélation d'une information secrète : **1 an d'emprisonnement et 15 000 €** d'amende. | [C. pén. 226-13](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006417945) | H |
| Le RIN consolidé au 18/02/2026 **ne contient pas les mots « intelligence artificielle »** (recherche dans le texte extrait du PDF). | RIN | H |

### 2.2 Conflits d'intérêts

| Fait | Source | Cert. |
|---|---|---|
| Pas plus d'un client dans une même affaire s'il y a conflit, ou, **sauf accord des parties**, risque sérieux de conflit. Pas de nouveau client si le secret d'un ancien client risque d'être violé ou si sa connaissance favoriserait le nouveau. | RIN art. 4.1 | H |
| La règle s'applique à **toute la structure** et à tous ses membres, aux avocats qui mettent des moyens en commun, et entre le collaborateur (ses dossiers personnels) et le cabinet. | RIN art. 4.1 | H |
| Le conflit s'apprécie « au jour de sa saisine », et de nouveau quand la situation évolue. | RIN art. 4.2 | H |

### 2.3 Honoraires

| Fait | Source | Cert. |
|---|---|---|
| Convention d'honoraires **écrite** obligatoire, sauf urgence, force majeure, aide juridictionnelle totale ; elle précise le montant ou le mode de détermination, les frais et débours. | Loi 71-1130, art. 10 al. 3 (version en vigueur depuis le **05/08/2026**, modifiée par la loi n° 2026-725 du 03/08/2026 sur le sport professionnel) | H |
| Honoraire fixé **seulement** en fonction du résultat judiciaire : interdit. Un honoraire complémentaire de résultat, en plus de la rémunération des prestations, est licite. | idem, al. 5 | H |
| La DGCCRF contrôle la convention d'honoraires ; elle en informe le bâtonnier par écrit au moins 3 jours avant. | Loi 71-1130, art. 10-1 | H |
| Éléments de la rémunération listés : temps consacré, travail de recherche, difficulté, intérêts en cause, frais du cabinet, notoriété et spécialisation, résultat, fortune du client. | RIN art. 11.2 | H |

### 2.4 Lutte contre le blanchiment (LCB-FT)

| Fait | Source | Cert. |
|---|---|---|
| Les avocats sont assujettis « dans les conditions prévues à l'article L. 561-3 ». | [CMF L561-2, 13°](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000050361172) | H |
| Activités visées : participer au nom du client à une transaction financière ou immobilière ; assister le client pour l'achat ou la vente d'immeubles ou de **fonds de commerce**, la gestion de fonds ou titres, l'ouverture de comptes, **l'organisation des apports, la constitution, la gestion ou la direction des sociétés**, les fiducies, les fonds de dotation ; le **conseil fiscal**. C'est le cœur du droit des affaires. | [CMF L561-3 I](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000050361174), en vigueur depuis le 30/12/2024 | H |
| La déclaration de soupçon ne s'applique pas quand l'activité se rattache à une procédure juridictionnelle, ni aux consultations juridiques, **sauf** si elles sont fournies à des fins de blanchiment ou en le sachant. | CMF L561-3 II | H |
| L'avocat adresse sa déclaration **au bâtonnier**, qui la transmet à Tracfin si les conditions de L561-3 sont remplies. Pas de dérogation pour l'avocat fiduciaire. | [CMF L561-17](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000023480398), en vigueur depuis le 14/02/2020 | H |
| Les ordres sont « organes de contrôle des avocats en cette matière » ; le CNB publie un guide pratique (3ᵉ édition, à jour de l'ordonnance 2020-115). | Guide CNB LCB-FT, p. 5 | H |

### 2.5 Assurance

| Fait | Source | Cert. |
|---|---|---|
| Assurance de responsabilité civile professionnelle obligatoire pour chaque avocat, justifiée par le barreau ou par l'avocat, plus une garantie des fonds reçus. | [Loi 71-1130, art. 27](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000508793) | H |

### 2.6 Délais et prescription : le « ne jamais laisser passer »

| Fait | Source | Cert. |
|---|---|---|
| Prescription de droit commun : **5 ans** « à compter du jour où le titulaire d'un droit a connu ou aurait dû connaître les faits ». | [C. civ. 2224](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000019017112) | H |
| Obligations nées du commerce entre commerçants, ou entre commerçants et non-commerçants : **5 ans**, sauf prescription spéciale plus courte. | [C. com. L110-4](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000027725867) | H |
| Action en responsabilité contre l'avocat qui a représenté ou assisté en justice : **5 ans à compter de la fin de sa mission**. | [C. civ. 2225](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000019017110) | H |
| Délai d'appel : **1 mois** en matière contentieuse, 15 jours en matière gracieuse. | [CPC 538](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006410858) | H |
| Calcul : délai en mois, expire le jour du même quantième (sinon le dernier jour du mois) ; à 24 h ; **samedi, dimanche, jour férié ou chômé → premier jour ouvrable suivant**. En jours, le jour de départ ne compte pas. | [CPC 640 à 642](https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006135898/) | H |
| +1 mois pour les personnes qui demeurent outre-mer, **+2 mois à l'étranger** (comparution, appel, opposition, pourvoi). | [CPC 643](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034747123) | H |
| Appel avec mise en état (appels formés depuis le **01/09/2024**, décret 2023-1391) : conclusions de l'appelant en **3 mois** à compter de la déclaration d'appel, **à peine de caducité relevée d'office** ; intimé : 3 mois, à peine d'irrecevabilité. L'ordonnance de caducité « ne peut être rapportée » ; seule la force majeure y échappe. | [CPC 908 à 911](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000048850825/) | H |
| Appel à bref délai : **2 mois** pour l'appelant à compter de l'avis de fixation, à peine de caducité ; 2 mois pour l'intimé. | [CPC 906-2](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048852560) | H |
| Actes de procédure d'appel remis **par voie électronique**, à peine d'irrecevabilité relevée d'office (papier seulement pour cause étrangère). | [CPC 930-1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034757202) | H |

### 2.7 « Version en vigueur à la date des faits » : le droit transitoire

| Fait | Source | Cert. |
|---|---|---|
| Réforme du droit des contrats en vigueur le **01/10/2016** : « Les contrats conclus avant cette date demeurent soumis à la loi ancienne, y compris pour leurs effets légaux et pour les dispositions d'ordre public. » Exceptions : C. civ. 1123 al. 3-4, 1158, 1183. Instance introduite avant : loi ancienne, y compris en appel et en cassation. | [Ordonnance 2016-131, art. 9](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000032004939) | H |
| Le démonstrateur plante ce piège : « Orbex invoque 1195 pour son contrat de 2014 » (l'imprévision de 1195 n'existe que pour les contrats conclus à partir du 01/10/2016), et un vieux mémo raisonne sur **L. 442-6, I, 5°**, devenu L. 442-1 (ordonnance 2019-359). | `../attendu/docs/01-corpus-et-graphe.md` § 2.3 et § 3.2 | H (lu dans le dépôt) |

### 2.8 Monopole, communication, démarchage

| Fait | Source | Cert. |
|---|---|---|
| Nul ne peut, à titre habituel et rémunéré, donner des consultations juridiques ou rédiger des actes sous seing privé pour autrui sans titre ou compétence reconnue. Sanction : art. 66-2 (15 000 € et un an). **Un outil vendu par l'agence directement à des entreprises, qui leur donnerait des consultations, tomberait sous ce texte ; vendu à un cabinet, il reste un outil de l'avocat.** | [Loi 71-1130, art. 54 et 66-2](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000508793) | H (texte) ; la conséquence pour l'agence est une lecture, à faire confirmer par un avocat |
| Légifrance affiche l'art. 66-2 « en vigueur du 01/01/1992 **au 01/02/2027** » : une modification est programmée, dont je n'ai pas lu le contenu. | idem | H (affichage) |
| L'avocat peut recourir à la publicité et à la **sollicitation personnalisée** ; toute prestation qui en découle fait l'objet d'une convention d'honoraires. | Loi 71-1130, art. 3 bis | H |
| La sollicitation personnalisée « prend la forme d'un message **exclusif de toute démarche physique ou téléphonique** » ; SMS exclus ; interdit de passer par un tiers pour contourner. Publicité mensongère, comparative ou dénigrante prohibée ; « spécialiste » réservé aux titulaires d'un certificat ; au plus trois domaines d'activités dominantes. | RIN art. 10.2 et 10.3 | H |
| **Conséquence pour l'agence** : ces règles visent la communication **de** l'avocat, pas le démarchage **d'**un avocat par un prestataire. Mais un outil qui rédigerait des messages de prospection pour un cabinet, ou l'agence qui démarcherait des entreprises au nom d'un cabinet, entrerait dans « les services d'un tiers ». | RIN 10.3 | H (texte) / lecture à confirmer |
| Prestations juridiques en ligne : service personnalisé, avocat identifiable, contrôle d'identité du demandeur « afin de respecter le secret professionnel, d'éviter le conflit d'intérêts, d'assurer le respect des règles relatives à la prévention du blanchiment ». | RIN art. 19.1-19.2 | H |

### 2.9 IA générative : ce que la profession a publié

| Fait | Source | Cert. |
|---|---|---|
| CNB, « Utilisation des systèmes d'intelligence artificielle générative », **1ʳᵉ édition, septembre 2024** : « l'avocat ne doit jamais communiquer des données couvertes par le secret professionnel à des intelligences artificielles génératives, sous peine de sanctions » ; ni nom du client, ni information confidentielle, ni stratégie dans une requête ; **pseudonymisation** (distincte de l'anonymisation) ; vérifier toujours la véracité du contenu. | [CNB, guide 2024](https://cnb.avocat.fr/medias/cnb-guidepratique-utilisation-systemes-iag-2024-68f7b1d86e4570.98487114.pdf) | H |
| CNB, « Grille de lecture », **juin 2025, V.1.2** : critères de souveraineté par priorité : hébergement des données des clients (France, sinon UE), puis nationalité de l'hébergeur, **en excluant les entreprises soumises à des dispositions extraterritoriales, « comme les entreprises américaines »**, puis les mêmes critères pour le modèle. Les engagements de non-réutilisation sont « ni prouvable[s] ni vérifiable[s] » ; seules l'anonymisation totale préalable ou **l'installation du modèle en local** éliminent le risque. | [CNB, grille 2025](https://cnb.avocat.fr/medias/cnb-grille-lecture-intelligence-aartificielle-2025-68f775b81ba5b2.65545272.pdf) | H |
| CNB, guide « déontologie et intelligence artificielle » adopté le **17/03/2026** : secret, RGPD, compétence, prudence, indépendance, information du client, honoraires équilibrés. Le PDF n'a pas pu être lu. | [CNB, actualité](https://cnb.avocat.fr/actualite/le-cnb-adopte-un-guide-sur-la-deontologie-et-l-intelligence-artificielle) | H (page) |
| CNB, AG du **12/12/2025** : résolution pour redéfinir la consultation juridique dans la loi de 1971 à cause de l'IA générative, et demande de propositions de modification du RIN. Aucune modification adoptée trouvée. | [Le Monde du Droit](https://www.lemondedudroit.fr/mag/378-intelligence-artificielle/102290-le-cnb-redefinit-la-consultation-juridique-pour-repondre-aux-defis-de-lia.html) | B |
| Barreau de Paris : **modèle de charte IA** pour les cabinets adopté le **21/07/2026** (contrôle humain, vérification, données sensibles, secret), non contraignant ; livre blanc d'octobre 2025. | [avocatparis.org](https://www.avocatparis.org/le-barreau-de-paris-adopte-un-modele-de-charte-disposition-des-cabinets) | M |
| **Barreau de Marseille**, commission Numérique : rentrée le **10/09/2026** avec « un questionnaire comparatif des outils informatiques et services d'intelligence artificielle pour le quotidien des cabinets » ; séances « La relation client au défi de l'IA » (11/03/2027) et sur la proposition de valeur face à l'IA (13/05/2027). | [barreau-marseille.avocat.fr](https://www.barreau-marseille.avocat.fr/commissions/numerique/) (via résumé) | M |
| CCBE, guide sur l'IA générative, **02/10/2025** : vérifier les résultats « lorsque le cas d'utilisation l'exige » ; à défaut, sanctions pour faute professionnelle ou outrage. | [CCBE, PDF](https://www.ccbe.eu/fileadmin/speciality_distribution/public/documents/IT_LAW/ITL_Guides_recommendations/FR_ITL_20251002_CCBE-guide-on-the-use-of-the-use-of-generative-AI-for-lawyers.pdf) | H |
| Barreau d'Aix-en-Provence : rien de publié trouvé sur l'IA. | — | — |

### 2.10 AI Act

| Fait | Source | Cert. |
|---|---|---|
| **Annexe III, point 8 a)** : sont à haut risque les systèmes « destinés à être utilisés **par les autorités judiciaires ou en leur nom**, pour les aider à rechercher et à interpréter les faits ou la loi, et à appliquer la loi à un ensemble concret de faits », ou de manière similaire dans le règlement extrajudiciaire d'un litige. **Les avocats ne sont pas nommés.** | [Règlement (UE) 2024/1689, annexe III](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024R1689) | H |
| Le considérant 61 confirme la cible : « une autorité judiciaire ou pour le compte de celle-ci » ; les organismes de règlement extrajudiciaire quand leurs résultats produisent des effets juridiques. Un assistant de recherche pour un cabinet n'est donc pas à haut risque au titre du point 8 ; il le deviendrait s'il servait un arbitre ou un médiateur dont la décision lie les parties (lecture, pas jurisprudence). | idem, considérant 61 | H (texte) / lecture |
| **Maîtrise de l'IA** (art. 4) : applicable depuis le 02/02/2025 ; **réécrit par le règlement (UE) 2026/1744 du 08/07/2026** (« omnibus numérique sur l'IA ») : fournisseurs et déployeurs « prennent des mesures pour favoriser le développement de la maîtrise de l'IA » de leur personnel, au lieu de la « garantir ». | [Règlement (UE) 2026/1744](https://eur-lex.europa.eu/eli/reg/2026/1744/oj/fra) | H |
| Même omnibus : obligations des systèmes à haut risque de l'annexe III reportées au **02/12/2027** (annexe I : 02/08/2028). Entré en vigueur le 27/07/2026 selon la presse spécialisée. | idem ; [K&L Gates](https://www.klgates.com/EU-Digital-Omnibus-on-AI-Enters-Into-Force-7-31-2026) | H (dates) / M (entrée en vigueur) |

### 2.11 RGPD, hébergement, extraterritorialité

| Fait | Source | Cert. |
|---|---|---|
| Le cabinet est responsable du traitement ; l'agence ou l'hébergeur est **sous-traitant** : contrat écrit, traitement sur instruction documentée, y compris pour les transferts, pas de sous-traitant ultérieur sans autorisation écrite. | [RGPD art. 28](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32016R0679) (texte initial ; modifications éventuelles de 2026 non vérifiées) | H |
| Les données relatives aux **condamnations pénales et aux infractions** (fréquentes dans un contentieux d'affaires) ne se traitent que dans les cas prévus par la loi. | RGPD art. 10 | H |
| **CLOUD Act** (18 U.S.C. § 2713) : un fournisseur de service de communication électronique ou d'informatique à distance doit préserver ou divulguer les données en sa « possession, custody, or control », « **regardless of whether** [they are] located within or outside of the United States ». Un hébergement en Europe chez un fournisseur américain ne suffit pas. | [18 U.S.C. § 2713](https://www.law.cornell.edu/uscode/text/18/2713) | H |
| La grille du CNB (juin 2025) classe l'hébergement en France, sinon dans l'UE, chez un hébergeur non soumis à l'extraterritorialité (§ 2.9). Une recommandation SecNumCloud « depuis 2021 » n'apparaît que dans des blogs d'éditeurs. | grille CNB 2025 ; [donneespersonnelles.fr](https://www.donneespersonnelles.fr/rgpd-cabinet-avocats) | H / B |

---

## 3. Incidents et sanctions publiés

### 3.1 Jurisprudence inventée par une IA dans des écritures

| Fait | Source | Cert. |
|---|---|---|
| **Mata v. Avianca**, S.D.N.Y., **22/06/2023**, n° 22-cv-1461 : décisions inexistantes créées par ChatGPT, maintenues après les ordonnances du juge. **5 000 $** d'amende solidaire (Rule 11) ; « existing rules impose a gatekeeping role on attorneys to ensure the accuracy of their filings ». | [CourtListener, ECF 54](https://storage.courtlistener.com/recap/gov.uscourts.nysd.575368/gov.uscourts.nysd.575368.54.0_3.pdf) | H |
| **Zhang v. Chen**, 2024 BCSC 285, Colombie-Britannique, février 2024 : deux décisions inventées ; l'avocate supporte les frais causés à l'adversaire. | [CanLII Connects](https://canliiconnects.org/en/commentaries/93754) ; [CBC](https://www.cbc.ca/news/canada/british-columbia/lawyer-chatgpt-fake-precedent-1.7126393) | M |
| **Ayinde v. Haringey / Al-Haroun v. Qatar National Bank**, [2025] EWHC 1383 (Admin), **06/06/2025** : dans Al-Haroun, **45 citations dont 18 inexistantes**, d'autres sans le passage cité ; renvoi aux régulateurs. Les citations venaient du **client** : « the very last thing any solicitor should do is to rely on the research of a lay client » (§ 78). | [judiciary.uk](https://www.judiciary.uk/wp-content/uploads/2025/06/Ayinde-v-London-Borough-of-Haringey-and-Al-Haroun-v-Qatar-National-Bank.pdf) | H |
| **Johnson v. Dunn**, N.D. Ala., **23/07/2025** : cinq citations fabriquées par trois avocats d'un cabinet de plus de 400 avocats **qui interdisait déjà par écrit l'IA non vérifiée**. Réprimande publique, exclusion du dossier, renvoi au barreau, décision remise aux clients et aux juges de leurs autres affaires. | [Berkeley, PDF](https://www.law.berkeley.edu/wp-content/uploads/archive/2025/12/Johnson-v-Dunn.pdf) | H |
| **France, TJ de Périgueux, 18/12/2025, n° 23/00452** : première décision judiciaire qui emploie « hallucinations » ; elle invite la partie **et son conseil** à vérifier les références trouvées par IA. | [blog Doctrine](https://blog.doctrine.fr/les-hallucinations-de-lintelligence-artificielle-sinvitent-devant-les-juridictions-francaises/) ; [Village de la Justice](https://www.village-justice.com/articles/les-hallucinations-intelligence-artificielle-devant-les-juridictions-francaises,56337.html) | M |
| **France, TA d'Orléans, 29/12/2025, n° 2506461** : requérant **représenté par un avocat** ; une quinzaine de références entièrement fausses ; mise en garde du conseil, sans amende. | Village de la Justice ; [Kohen Avocats, 13/09/2026](https://kohenavocats.fr/2026/09/13/jurisprudences-inventees-ia-juges-amende-mesure-159-decisions-2026/) | M |
| France, TA de Grenoble, 03/12/2025 et 09/12/2025 : requérants sans avocat, « références jurisprudentielles fantaisistes », requêtes rejetées. Amendes contre des requérants sans avocat : 200 € (TA Grenoble, 04/06/2026), 500 € (TA Rennes, 19/08/2026). Aucun avocat sanctionné par une cour d'appel au 13/09/2026. | Village de la Justice ; Kohen Avocats (source unique pour les amendes) | M / B |
| Base « AI Hallucination Cases » (Damien Charlotin) : **2 095 cas** dans le monde, dont **14 en France**, au 28/09/2026. | [damiencharlotin.com](https://www.damiencharlotin.com/hallucinations/) (via résumé) | M |

**Ce qui devient un test** : une référence inexistante (Mata) ; une référence qui existe mais ne contient pas le passage cité (Al-Haroun) ; une référence fournie par le client, reprise sans contrôle (Al-Haroun § 78) ; une politique écrite qui n'a rien empêché (Johnson) : la règle doit être dans l'outil, pas dans une charte.

### 3.2 Délais manqués et discipline

| Fait | Source | Cert. |
|---|---|---|
| Cass. 1ʳᵉ civ., **16/01/2013, n° 12-14.439** : appel non régulièrement formé malgré les instructions ; « la perte certaine d'une chance même faible, est indemnisable ». | [Juricaf](https://juricaf.org/arret/FRANCE-COURDECASSATION-20130116-1214439) (reproduction, non Légifrance) | H |
| Cass. 1ʳᵉ civ., **14/01/2016, n° 14-23.200**, publié : forclusion du délai d'appel, **2 163 812,44 €** réclamés pour perte de chance ; action prescrite, le délai courant de la décision qui constate l'irrecevabilité de l'appel. | [Juricaf](https://juricaf.org/arret/FRANCE-COURDECASSATION-20160114-1423200) ; [Lexbase](https://www.lexbase.fr/revues-juridiques/29437822-jurisprudence-le-point-de-depart-du-delai-de-prescription-de-la-responsabilite-professionnelle-de-l) | H / M |
| Décret n° 2025-77 du 29/01/2025 sur la déontologie et la discipline des avocats, en vigueur le 30/01/2025 (droit de se taire en discipline). | [Légifrance](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051058650) (titre) ; Lexbase | M |
| CA Paris, **16/10/2025, n° 24/18012** : violation du secret de l'instruction sur les réseaux sociaux ; publication de la décision 12 mois sur le site de l'Ordre, formation de déontologie. | [yvesavril.com](https://www.yvesavril.com/articles-informations/articles/deontologie/nouvelles-sanctions-disciplinaires-chez-avocat-2026/) | B |

---

## 4. Connecteurs

| Outil ou catégorie | Usage, accès, format | Source | Cert. |
|---|---|---|---|
| **API Légifrance** (PISTE) | OAuth 2.0 *client credentials*, jeton de 3 600 s ; bac à sable et production séparés ; 403 sans acceptation des CGU. En masse : open data XML de la DILA (LEGI), que le démonstrateur utilise. Quotas : consultables dans PISTE, aucun chiffre public. | [FAQ API Légifrance](https://www.legifrance.gouv.fr/contenu/pied-de-page/foire-aux-questions-api) | M |
| **API Judilibre** (PISTE) | gratuite après inscription, bêta, `KeyId` en en-tête ; `https://api.piste.gouv.fr/cassation/judilibre/v1.0` ; `/search` (50 par page, 10 000 au total), `/decision`, `/export`, `/transactionalhistory` ; JSON avec `zones` (exposé, moyens, motifs…). Seule voie pour les décisions postérieures au 19/03/2025 dans le démonstrateur. | [README judilibre-search](https://github.com/Cour-de-cassation/judilibre-search/blob/dev/README.md) ; `../attendu/docs/01` § 2.2 | H |
| **Open data des juges du fond** | civil, commercial, social : cours d'appel depuis le 30/04/2022, **tribunaux de commerce depuis le 31/12/2024**, **tribunaux judiciaires depuis le 30/09/2025**, prud'hommes 30/09/2026 ; pénal de 2027 à 2028. Arrêté du 28/04/2021 modifié le 29/08/2025. | [Légifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000043426865) | H |
| **RPVA / e-Barreau** | les logiciels de gestion y accèdent par des API du CNB après **référencement** (cahier des charges, tests, redevance annuelle). Douze éditeurs référencés (catalogue API 1.5) : Adwin, Akantha, ANAFAGC, Buroclic/Loman, Félix Informatique, Jarvis Legal, JPL, LexisNexis, Logestia/Agestia, Septeo (Secib), Wolters Kluwer (Kleos), Xelya (Diapaz). | [CNB, API e-barreau](https://assistance.cnb.avocat.fr/hc/fr/articles/7752505901980) ; [LGC référencés](https://assistance.cnb.avocat.fr/hc/fr/articles/7752021477020) | H |
| Communication électronique avec les juridictions | **arrêté du 29/08/2025**, en vigueur le 01/09/2025 : ComCi TJ et ComCi CA reliés à e-Barreau ; i-greffes et SECURIGREFFE pour le tribunal de commerce ; PLINE est interne à l'État. L'envoi simultané des conclusions au greffe et aux parties par e-Barreau vaut remise au greffe (CPC 915-1). **Piège** : l'arrêté du 20/05/2020 (acte XML, pièces PDF) est abrogé depuis le 01/09/2025 ; le format actuel n'a pas été relu. | [arrêté 2025](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052157777) ; [arrêté 2020, abrogé](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000041897396) | H |
| **Logiciels de gestion** : Secib (Septeo, gammes Neo et Air, « plus de 7 500 cabinets » revendiqués, assistant « Septeo Brain Lawyer »), Kleos (Wolters Kluwer, SaaS, « plateforme API » annoncée), Diapaz (Xelya), Jarvis Legal (LexisNexis) | dossiers, temps, facturation, agenda, RPVA, Word, Outlook. **Aucune documentation d'API publique trouvée** : l'accès se négocie avec l'éditeur ou passe par export. | [septeo.com](https://www.septeo.com/fr/offres/secib-avocat) ; [wolterskluwer.com](https://www.wolterskluwer.com/fr-fr/solutions/kleos/fonctionnalites-logiciel-avocat-kleos/microsoft) | B |
| **Bases privées avec IA** : Lexis+ AI (France, **01/07/2024**) ; GenIA-L de Lefebvre Dalloz (**29/01/2024**), intégré à Diapaz (**06/03/2025**) ; Doctrine (« Flow Counsel », serveurs à Francfort, 13/11/2025 ; rachat de Predictice annoncé le 17/09/2025, source unique) | concurrents autant que sources ; contenus sous licence, pas d'indexation par un tiers sans accord (hypothèse). Prix publics relevés par le CNB : Doctrine Pro 2 094 € HT/an, Doctrine Flow 1 392 € HT/an, un outil Lefebvre Dalloz 250 € HT/mois. | [LexisNexis](https://www.lexisnexis.com/community/espace-presse/b/nouvelles/posts/lexis-ai-france) ; [Enssib](https://bbf.enssib.fr/ia-generative-lefebvre-dalloz-lance-genia-l-a-destination-des-professionnels-du-droit) ; [Xelya](https://www.xelya.com/espace-presse/lancement-genia-l-assistant-pour-diapaz-lefebvre-dalloz-et-xelya/) ; [Décideurs juridiques](https://www.decideurs-juridiques.com/legaltech-juridiques/62803-doctrine-lance-flow-counsel-l-ia-juridique-destinee-au-conseil.html) ; grille CNB 2025 (prix) | M (H pour les prix) |

Connecteurs en écriture : aucun. Le RPVA est un connecteur en écriture par nature (dépôt d'actes) : il reste hors de l'outil (page du site, `guard` : « Signer, envoyer ou déposer quoi que ce soit »).

---

## 5. Escalades et responsabilité

| Déclencheur | Qui reprend | Pourquoi | Cert. |
|---|---|---|---|
| Tout écrit qui sort du cabinet (consultation, conclusions, courrier) | l'avocat qui signe | il répond du secret (RIN 2.3), des délais (C. civ. 2225) et du contenu ; l'assurance est la sienne (loi 1971, art. 27) | H (textes) |
| Désaccord du collaborateur avec l'approche du cabinet | associé, avant d'agir | le collaborateur « reste maître de l'argumentation » mais doit informer avant d'agir, et restituer le dossier si le désaccord persiste | H (RIN 14.2.1) |
| Double signature ou visa | associé | possible si le contrat de collaboration le prévoit ; ce n'est pas une règle générale | H (RIN 14.2.1) |
| Conflit ou risque de conflit détecté | associé | décision et, le cas échéant, accord **écrit** des parties | H (RIN 4.1) |
| Soupçon de blanchiment | l'avocat, puis le bâtonnier | seule voie de déclaration | H (CMF L561-17) |
| Délai de moins de X jours sans conclusions prêtes | collaborateur puis associé | caducité irrattrapable (CPC 911) | H (sanction) / B (seuil X à demander) |
| Corpus muet, texte hors corpus, décision postérieure à la borne du corpus | l'avocat | l'outil s'abstient et dit pourquoi | règle de conception (page du site, `guard`) |
| Texte cité dont la version à la date des faits est incertaine (droit transitoire, renumérotation) | l'avocat | risque de citer un texte non applicable | hypothèse |

---

## 6. Vocabulaire et pièges

| Terme | Définition | Piège | Cert. |
|---|---|---|---|
| **Dossier** | (1) l'affaire d'un client dans le logiciel ; (2) « toutes les pièces du dossier », couvertes par le secret (art. 66-5) ; (3) le dossier de la procédure (RPVA, greffe). | Trois sens ; un outil qui « lit le dossier » doit dire lequel. | H (2) / B (1, 3) |
| **Version en vigueur** | Sur Légifrance, la version affichée par défaut est celle **d'aujourd'hui** (« VERSION EN VIGUEUR DEPUIS LE… »). | Ce n'est pas la version applicable au litige. Loi 1971, art. 10 : en vigueur depuis le 05/08/2026 ; une recherche faite en juillet aurait lu une autre version. | H |
| **Date des faits** | La date qui fixe le droit applicable. | Elle varie selon la matière : date de conclusion du contrat (ord. 2016-131, art. 9), date d'introduction de l'instance, date de la déclaration d'appel (décret 2023-1391, appels depuis le 01/09/2024), date de la faute. Une seule « date des faits » par dossier est une simplification. | H (textes) / lecture |
| **Officielle** | Mention qui sort une lettre entre avocats de la confidentialité. | Sans elle, la lettre ne se produit pas en justice. | H (RIN 3) |
| **Caducité / irrecevabilité** | Sanctions d'un délai d'appel manqué, relevées d'office. | L'une frappe la déclaration d'appel (appelant), l'autre les conclusions (intimé). | H (CPC 908-909) |
| **Notification / signification** | Notification entre avocats ; signification par commissaire de justice aux parties sans avocat. | CPC 911 : délais différents. | H |
| **Consultation** | Avis juridique écrit, couvert par le secret, monopole encadré (loi 1971, art. 54). | Dans le logiciel, « consultation » peut aussi être un rendez-vous facturé. | H / B |
| **Collaborateur** | Avocat libéral ou salarié qui travaille pour un cabinet, avec sa propre clientèle possible. | Pas un salarié non avocat ; un « juriste » n'est pas avocat et ne signe pas de consultation. | H (RIN 14) |
| **Visa** | (1) accord de l'associé sur un écrit (RIN 14.2.1) ; (2) les textes visés en tête d'un arrêt de cassation. | Deux sens dans la même maison. | H |
| **Moyen** | Argument de droit ; dans un arrêt, le « moyen » du pourvoi, qui n'est pas la solution. | Citer le moyen comme si c'était la décision est une erreur classique de lecture d'arrêt. | M |
| **Publié / inédit** | Arrêt publié au Bulletin ou non. | Poids différent ; le démonstrateur filtre sur ce champ. | H (dépôt) |

---

## 7. Le bon résultat (rien de publié : hypothèses)

Aucune source publique ne dit ce qu'un associé de cabinet d'affaires préfère entre deux notes justes. À demander sur place :
- une note courte, qui répond à la question posée, puis les sources, plutôt qu'un exposé (hypothèse) ;
- l'arrêt le plus récent et le plus haut (Cour de cassation publiée) avant les juges du fond (hypothèse) ;
- « je ne sais pas, le corpus s'arrête au… » plutôt qu'une réponse plausible (hypothèse, cohérente avec la page du site) ;
- ordre de sacrifice probable : l'exhaustivité avant la vérifiabilité (hypothèse) ;
- ce qui est facturable : le temps de recherche est un élément de la rémunération (RIN 11.2, H) ; un outil qui divise ce temps touche la facture au temps passé (objection au § 10).

## 8. Les données

| Donnée | Sert à | Où elle vit | Fiabilité | Cert. |
|---|---|---|---|---|
| Codes, toutes versions | citer à la date des faits | DILA LEGI (open data, Licence Ouverte 2.0), API Légifrance | officielle ; mise à jour quotidienne (deltas) | H (dépôt attendu) |
| Cour de cassation | jurisprudence | Judilibre (API PISTE) ; miroir HF figé au 19/03/2025 | officielle, pseudonymisée | H (dépôt attendu) |
| Juges du fond | jurisprudence d'appel et de commerce | open data progressive, § 4 | voir § 4 | voir § 4 |
| Doctrine, revues | commentaires | bases payantes (Dalloz, Lexis, Lefebvre), sous licence | licence d'usage à vérifier avant toute indexation | hypothèse |
| Pièces et notes des dossiers | rapprocher un dossier des textes | logiciel de gestion, GED, messagerie, poste des avocats | variable ; **couvertes par le secret** | H (secret) |
| Délais et échéances | alerte | logiciel de gestion, agenda | saisis à la main : fiabilité inconnue, **risque à lever avant tout garde-fou** | hypothèse |
| Liste des clients et adversaires | contrôle de conflit | logiciel de gestion | le nom des clients est couvert par le secret (RIN 2.2) | H |
| Date des faits d'un dossier | filtre temporel | dans la tête de l'avocat ou dans la note d'ouverture | rarement un champ structuré (hypothèse) | hypothèse |

## 9. Briques plausibles

| Brique | Douleur du site | Interdits qui la bornent | Qualification (questions) | Cert. |
|---|---|---|---|---|
| **Recherche datée et sourcée** (Attendu) | « L'article a changé trois fois » ; « un arrêt cité de mémoire » | citer seulement un paragraphe existant ; version à la date donnée ; abstention | combien de recherches par semaine ? sur quelles bases aujourd'hui ? qui cherche ? | démonstrateur existant |
| **Vérificateur de citations** d'un projet de conclusions ou de note : chaque référence existe-t-elle, dans quelle version, dit-elle ce qu'on lui fait dire ? | les affaires d'arrêts inventés (§ 3) | ne jamais corriger en silence ; signaler | le cabinet utilise-t-il déjà une IA générative ? qui relit ? | hypothèse |
| **Veille sur les textes d'un dossier** : alerter quand un article cité dans un dossier ouvert change | « l'article a changé » | lecture seule | combien de dossiers ouverts ? | hypothèse |
| **Rapprochement dossier ↔ textes**, dans les locaux ou sur un hébergement européen au nom du cabinet | « les pièces ne doivent pas sortir » | secret, RIN 2.3, CLOUD Act, RGPD 28 | où sont les pièces aujourd'hui ? qui héberge la messagerie ? | hypothèse |
| **Contrôle des délais** (lecture seule, double contrôle du logiciel) | pas sur la page du site | ne jamais être la seule alarme ; le délai reste saisi par un humain | un délai déjà frôlé ? (« c'était quand, la dernière fois ? ») | hypothèse |

Hors périmètre, à ne pas proposer : envoi, dépôt RPVA, signature (page du site, `guard`) ; outil pour les clients du cabinet (art. 54).

## 10. Prospection

### 10.1 Chiffres

| Fait | Source | Cert. |
|---|---|---|
| **75 681 avocats** en France au 01/01/2024 (+25,7 % en 10 ans), dont 43,2 % à Paris ; 164 barreaux. | [Ministère de la Justice, statistique 2024 (PDF publié en 06/2026)](https://www.justice.gouv.fr/sites/default/files/2026-06/statistique_profession_avocat_2024.pdf) | H |
| **Marseille** : **2 503 avocats** au 01/01/2024 ; 44,8 % en individuel, 27,2 % associés, 26,3 % collaborateurs, 1,7 % salariés ; **384 groupements d'exercice** (61,2 % de SELARL). | idem, tableaux 19-20 | H |
| **Aix-en-Provence** : **890 avocats** ; 46,5 % individuel, 32,5 % associés, 20,3 % collaborateurs ; **190 groupements** (55,3 % de SELARL). Ressort de la cour d'appel d'Aix : 6 057 avocats. | idem | H |
| Spécialisations : droit des sociétés, 510 mentions sur 6 825 au niveau national (7,5 %). **Aucune statistique « droit des affaires »** : une mention ne mesure pas l'activité. Le nombre de cabinets de 2 à 30 avocats à Marseille et Aix n'est pas publié (on a les groupements, pas leur taille). | idem | H |
| Revenu net moyen 83 225 €, médian 47 953 € (année non précisée). | [CNB, chiffres clés](https://cnb.avocat.fr/en/the-lawyers-in-numbers) | M |
| Enquête CNB (décembre 2025, 4 457 avocats) : **62 %** ont déjà expérimenté l'IA générative ; **74 %** chez ceux qui ont une clientèle d'entreprises ; adoption par « initiative individuelle », seuls les très grands cabinets formalisent. Confiance : 34 % dans les IA généralistes, 54 % dans les IA juridiques. Chez ceux qui refusent : **44 % craignent pour la confidentialité**. Un tiers pense que l'IA fera baisser leurs tarifs ; le forfait est jugé « plus protecteur » que le taux horaire. | [CNB, Cahiers de l'Observatoire](https://cnb.avocat.fr/medias/cnb-les-cahiers-de-l-observatoire-ia-web-hr-696849652f1c75.51507624.pdf) | H |

### 10.2 Accroches datées

1. **La commission Numérique du barreau de Marseille** compare les outils d'IA des cabinets depuis sa rentrée du 10/09/2026 (M). Une démonstration d'Attendu y a sa place, et c'est une porte collective plutôt qu'un cabinet par cabinet.
2. **Des jugements français parlent d'« hallucinations »** depuis décembre 2025, dont un dossier où l'avocat avait une quinzaine de références fausses (TA Orléans, 29/12/2025, M). Un outil qui ne peut pas citer un paragraphe inexistant répond à cela.
3. **La grille du CNB (juin 2025)** exclut les hébergeurs soumis à l'extraterritorialité et dit que seule l'installation locale élimine le risque (H) : c'est exactement l'option « dans vos locaux » de la page du site.
4. Le tribunal de commerce de Marseille est **tribunal des activités économiques** depuis le 01/01/2025 (expérimentation jusqu'au 31/12/2028) ([ministère](https://www.justice.gouv.fr/actualites/actualite/lancement-lexperimentation-du-tribunal-activites-economiques), M) ; les décisions des tribunaux de commerce et judiciaires entrent en open data (H) : plus de jurisprudence du fond à chercher, et à dater.
5. Charte IA du barreau de Paris (21/07/2026) et guide déontologique du CNB (17/03/2026) : les cabinets de province vont se voir demander la même chose.

### 10.3 Ce qu'un connaisseur mentionne

- Le **nom des clients est couvert par le secret** (RIN 2.2). En entretien, ne jamais demander « pour quels clients ? » ; demander des cas anonymisés. H.
- Un « spécialiste » a un certificat ; un cabinet « d'affaires » n'en a pas forcément (RIN 10.2). H.
- La réforme de l'appel du **01/09/2024** et l'arrêté RPVA du **29/08/2025** ont changé les délais et les formats : deux sujets que tout contentieux d'affaires a vécus. H.
- L'associé répond de tout ce que signe le collaborateur ? Non : le collaborateur reste maître de son argumentation (RIN 14.2.1). Qui relit quoi est une question à poser, pas une évidence. H.

### 10.4 Objections probables

| Objection | Ce qu'on sait | Cert. |
|---|---|---|
| Confidentialité | 44 % des réfractaires la citent ; le CNB interdit de confier des données couvertes à une IA générative sans pseudonymisation ; la grille exclut les hébergeurs américains. Réponse possible : fournisseur européen, hébergement au nom du cabinet, ou local ; rien pour entraîner. | H |
| Facturation au temps passé | Le temps et « le travail de recherche » sont des éléments de la rémunération (RIN 11.2) ; un tiers des avocats craint une baisse des tarifs. L'argument n'est pas « moins d'heures » mais « moins d'heures non facturables » (vérifier une citation, retrouver un arrêt) : hypothèse à tester. | H / hypothèse |
| Outils déjà payés | Doctrine, Lexis+ AI, GenIA-L, souvent déjà dans le logiciel de gestion (Diapaz). L'écart à montrer : la date des faits, l'abstention, les dossiers du cabinet. | M |
| Taille | 45 à 47 % d'exercice individuel à Marseille et Aix : la cible 2 à 30 avocats est la minorité des structures. | H |

### 10.5 Démarcher un avocat par téléphone

- **Aucune règle propre** trouvée qui interdise à un prestataire d'appeler un avocat. Les limites du RIN (10.3 : pas de démarche physique ou téléphonique) visent la sollicitation **par** l'avocat de ses clients. H.
- C. consom. **L223-1**, en vigueur depuis le **11/08/2026** (loi 2025-594), exige le consentement préalable pour démarcher **un consommateur** par téléphone ; un avocat appelé à son cabinet pour son activité n'est pas un consommateur. [Légifrance](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069565/LEGISCTA000032221441/2026-09-29), H ; le régime B2B (opposition RGPD) : M.
- Usage : le démarchage téléphonique à froid d'une profession qui se l'interdit à elle-même est mal perçu (hypothèse). Le canal naturel est la commission Numérique du barreau, un confrère, ou un expert-comptable commun.

### 10.6 Cible ou prescripteur ? Avis

**Prescripteurs d'abord, cible de démonstration ensuite**, pour quatre raisons sourcées :
1. **Un avocat ne peut pas être rémunéré pour un apport d'affaires** : « L'avocat ne peut percevoir d'honoraires que de son client [...]. La rémunération d'apports d'affaires est interdite » (RIN 11.3, H). Un partenariat de prescription ne peut donc pas être commissionné : il repose sur le service rendu à ses propres clients.
2. Le marché visé est étroit et atomisé : 2 503 + 890 avocats, près de la moitié en individuel, aucune donnée sur le nombre de cabinets d'affaires de 2 à 30 avocats (H).
3. L'adoption est individuelle et les outils du marché sont déjà dans les logiciels (H/M) ; la décision d'achat est longue et la contrainte de secret impose une installation soignée.
4. En revanche, l'avocat d'affaires conseille les dirigeants des autres cibles de l'agence ; il voit leurs sanctions et leurs contentieux. Attendu sert de preuve de sérieux (citations contraintes, abstention) auprès de lui.

Ce qui ferait changer d'avis : un cabinet qui a déjà vécu une citation fausse ou un délai frôlé et qui accepte une installation locale. C'est cohérent avec l'arbitrage du 2026-09-22 (hors matrice, suivi à la main).

---

## 11. Contraintes propres à un outil d'IA dans ce métier

1. **Le secret suit la donnée** : consultations, notes, pièces, nom des clients et agenda sont couverts (art. 66-5, RIN 2.2). L'avocat répond des violations commises par « toute personne qui coopère avec lui » (RIN 2.3) : le prestataire d'IA et l'hébergeur du modèle en sont. H.
2. **Extraterritorialité** : le CLOUD Act vise la donnée sous le contrôle d'un fournisseur américain, où qu'elle soit stockée. H. D'où le choix d'Attendu (Mistral, UE, D13) et la phrase de la page du site (« fournisseur européen, hébergement en Europe »).
3. **Responsabilité** : l'avocat signe et répond de l'écrit ; l'assurance RCP est la sienne ; 5 ans après la fin de la mission en contentieux (C. civ. 2225). H. Un outil ne partage pas cette responsabilité : il doit rendre la vérification rapide, pas la remplacer.
4. **Pas de haut risque AI Act** au titre de l'annexe III, 8 a) pour un outil de cabinet ; restent l'art. 4 (maîtrise de l'IA, version 2026/1744) et le RGPD. H.
5. **Rien pour entraîner un modèle** : promesse de la page du site ; à écrire dans le contrat de sous-traitance (RGPD 28). H (texte) / engagement commercial.
6. **Pas d'outil vendu aux clients du cabinet** sans avocat dans la boucle (loi 1971, art. 54). H (texte) / lecture.

---

## Non trouvé / à vérifier

1. **Texte du guide CNB « déontologie et IA » du 17/03/2026** : le PDF n'a pas pu être lu.
2. **Contenu de la modification de l'art. 66-2** de la loi de 1971 programmée au 01/02/2027, et objet exact de la modification de l'art. 10 par la loi 2026-725 (le texte lu de l'alinéa 3 ne dit rien du sport ; la modification porte probablement sur les alinéas sportifs, non vérifié).
3. **Recommandation du CNB sur l'hébergement (SecNumCloud)** : seulement des blogs ; la grille de 2025 est la source la plus proche.
4. **Sinistralité RCP des avocats par cause** (part des délais manqués) : aucun chiffre publié accessible.
5. Décisions françaises sur les hallucinations (Grenoble, Périgueux, Orléans) : lues à travers des articles, pas dans le texte de la décision.
6. Aucune décision disciplinaire publiée de 2023 à 2026 sur un conflit d'intérêts ou sur le démarchage, vérifiée.
7. **Nombre de cabinets** (et non de groupements) de 2 à 30 avocats à Marseille et à Aix ; effectifs 2025 officiels par barreau.
8. Quotas chiffrés des API Légifrance et Judilibre ; documentation d'API des logiciels de gestion (Secib, Kleos, Diapaz) ; format technique des actes sous l'arrêté du 29/08/2025.
9. Le **bon résultat** et les préférences des associés : rien de publié ; tout le § 7 est à demander.
10. La chaîne interne d'un cabinet (qui saisit les délais, qui relit, qui ouvre le dossier) : rien de publié ; le § 1 est une reconstruction.
11. Modifications éventuelles du RGPD par l'omnibus numérique de 2026 : non vérifiées.
12. L'appartenance actuelle de Lamy (Wolters Kluwer ou Lefebvre Dalloz) et les offres IA de Dalloz hors GenIA-L.
13. Le barreau d'Aix-en-Provence : rien de publié trouvé sur l'IA.
14. Une règle ordinale qui encadrerait la sollicitation commerciale **d'un** avocat par un prestataire : non trouvée (§ 10.5).
