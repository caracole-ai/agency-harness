<!-- Vérification à la source du 2026-10-05 (agent de vérification, pages Légifrance,
CNAPS et Cour de cassation affichées dans un navigateur, sans résumé automatique).
Instantané daté : ne pas corriger en place. Complète verification-2026-09-29.md,
qu'elle ne remplace pas. -->

# Vérification à la source — sécurité privée, 2026-10-05

Les six points ont été lus dans leur version en vigueur au 05/10/2026. Un seul reste incomplet : l'**arrêté qui définit les spécialités** de la carte (point 2), qui n'a pas pu être identifié avec certitude. **Trois résultats changent la fiche :**
- **R631-15 nouvelle version** : en vigueur depuis le 01/10/2026, sans date de fin. Le téléservice qu'elle vise est **Dracar Ultimate**.
- **R631-16** : le mémento des consignes est un document **général**, qui ne doit comporter « aucune mention spécifique à un client ou une mission ». Il s'émarge « à chaque modification », pas à chaque prise de poste. I-12, l'étape 4, T-13 et le glossaire sont donc faux sur ce point.
- **Cass. soc. du 16/09/2026** : sans carte valide ni récépissé, le licenciement est fondé. Le manquement de l'employeur à son « obligation de formation » (le MAC) ouvre seulement droit à des dommages et intérêts.

Méthode : comme le 29/09, Légifrance renvoie une page Cloudflare aux requêtes sans navigateur, et même à Chrome en mode headless. J'ai lu le texte affiché de chaque page dans Chrome en mode visible, piloté par playwright-cli. Même méthode pour les pages du CNAPS et de la Cour de cassation (Judilibre). Le seul document lu autrement est le référentiel de contrôle du CNAPS : c'est un PDF scanné, lu page par page en image. La recherche web n'a servi qu'à trouver les identifiants et les URL. Les sources secondaires ne sont citées que lorsqu'elles sont signalées comme telles.

---

**1. CSI R631-15 et téléservice — MODIFIÉ (nouvelle version en vigueur) ; téléservice identifié**

- **Version en vigueur au 05/10/2026** : « VERSION EN VIGUEUR DEPUIS LE 01 OCTOBRE 2026 », modifiée par le décret n° 2025-1344 du 26/12/2025, art. 3. Pas de date de fin. La liste des versions en compte trois : 2014, 2024 et 2026.
- La version du 07/04/2024 est marquée « VERSION EN VIGUEUR DU 07 AVRIL 2024 AU 01 OCTOBRE 2026 ».
- Texte intégral de la version en vigueur :
  > Vérification de la capacité d'exercer.
  >
  > Les personnes morales et services internes de sécurité et leurs dirigeants s'interdisent d'employer ou de commander, même pour une courte durée, des personnels ne satisfaisant pas aux conditions de qualification professionnelle ou ne possédant pas les autorisations valides requises pour exercer leurs missions.
  >
  > Afin de permettre de vérifier le respect des conditions prévues à l'alinéa précédent, les personnes morales et les services internes de sécurité procèdent à la création d'un compte individualisé dans le téléservice mis en œuvre par le Conseil national des activités privées de sécurité et y déclarent les personnes qu'ils emploient ou affectent à l'exercice de missions de sécurité privée. Ils tiennent ces informations à jour et vérifient régulièrement la validité des titres détenus par ces personnes. La fréquence et l'ampleur de ces vérifications doivent être adaptées à la fréquence et à la nature des recrutements, des licenciements ou des démissions au sein de la personne morale ainsi que de l'évolution des responsabilités de chacun de ses salariés.
  >
  > Les personnes morales et services internes de sécurité et leurs dirigeants s'assurent en outre de l'adéquation des compétences de leurs agents aux missions qui leur sont confiées.
- Ce qui change par rapport à la citation du 29/09 :
  - la phrase « La fréquence et l'ampleur… » n'avait pas été citée ;
  - le dernier alinéa est reformulé : « de leurs agents aux missions qui leur sont confiées ».
- Entrée en vigueur, d'après le décret 2025-1344, **art. 10, 2°** : « les dispositions de l'article 2 et du 4° de l'article 3 entrent en vigueur à la date de mise en service des fonctionnalités du téléservice mentionnées à ces articles et au plus tard le 1er octobre 2026 ». Légifrance date la version au 01/10/2026.
- Le même décret, art. 3, crée **R611-2-1** (version du 01/10/2026) : « Préalablement à la demande de l'autorisation mentionnée à l'article L. 612-9 les exploitants individuels et les personnes morales procèdent à la création d'un compte individualisé dans le téléservice mis en œuvre par le [CNAPS]. »
- Autres articles modifiés par le décret (liste lue sur Légifrance, **contenu non lu** sauf R612-15 et R612-36) :
  - art. 2 : R612-2, R612-15 (photographie d'identité, 6°), R612-22, R622-2, R622-13, R622-20, R625-9, R625-26 ;
  - art. 3 : création de R621-1-1 et R625-3-1 ;
  - art. 4 : R612-36 ;
  - art. 5 : abrogation de R613-52 ;
  - art. 6 : R632-10, R634-9 ;
  - art. 7 : R645-1 à R648-1 (outre-mer). Cet article entre en vigueur par arrêté, au plus tard le 31/12/2026.
- URL : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053221542 (version 2026), https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049382807/2024-04-07 (version 2024), https://www.legifrance.gouv.fr/loda/id/LEGIARTI000053196252/2025-12-29 (décret, art. 10) et https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053221534 (R611-2-1).

*Le téléservice, d'après le site officiel du CNAPS* :
- **Nom : Dracar Ultimate.** Fiche thématique du CNAPS, publiée le 31/12/2025 et mise à jour le 02/04/2026 : « l'obligation pour les personnes morales de déclarer leurs salariés dans leur compte Dracar Ultimate, de tenir à jour ces déclarations et de vérifier régulièrement la validité des titres de leurs salariés ». Échéance : « Pour les entreprises de sécurité privée déjà connues du CNAPS, le délai de mise en conformité est fixé au 1er octobre 2026 au plus tard ». Pour toute nouvelle demande d'autorisation, l'obligation s'applique dès la mise en service. Polynésie française, Nouvelle-Calédonie, Wallis-et-Futuna : fin 2026.
- **Depuis quand : fin février 2026.** L'actualité « Dracar Ultimate : décollage réussi ! » (publiée le 02/03/2026, mise à jour le 05/03/2026) dit : « Cinq jours après sa mise en service, Dracar Ultimate enregistre une forte mobilisation des usagers ». **Le jour exact de mise en service ne figure sur aucune page officielle lue.** Les sources secondaires divergent (18/02, ou 24-25/02/2026) : non retenues.
- **Se confond-il avec « DRACAR » ? Oui pour le nom, non pour le système.** Dracar Ultimate remplace l'ancien téléservice, appelé « **Dracar NG** » dans la FAQ du CNAPS. Ce que dit cette FAQ :
  - reprise des données : « les données relatives aux usagers et leurs titres seront repris dans Dracar Ultimate », mais pour les listes de salariés des entreprises, « Aucune reprise de ces données n'est prévue depuis l'ancien téléservice entreprise du CNAPS ». Il faut les rattacher de nouveau, par import CSV, « que pour l'activité que vous aurez sélectionnée » ;
  - API : « À ce stade du développement de l'outil, cette interconnexion n'est pas envisagée. Dracar Ultimate est un outil d'instruction des demandes de titre. Dès lors, il n'a pas vocation à collecter des données à caractère RH. » **Pas d'API.**
- **Fréquence des vérifications** : c'est une doctrine du CNAPS, pas un texte. FAQ : « la validité des cartes des salariés devra être vérifiée a minima une fois par mois. les entreprises de sécurité doivent vérifier la validité des cartes avant chaque affectation de salariés sur des grands évènements ». Même chose dans l'actualité du 17/09/2026 (mise à jour le 01/10/2026) : « au minimum une fois par mois, et avant toute affectation d'un salarié sur un grand événement ».
- **Autres réponses utiles de la FAQ** :
  - le statut de chaque carte (active, expirée, retirée, suspendue) est visible dans l'espace entreprise, et « Une alerte permettra à l'employeur de connaître les salariés dont les cartes arriveront à expiration » ;
  - le renouvellement est ouvert dans les 6 mois qui précèdent l'expiration ;
  - l'employeur n'a pas l'obligation de déposer lui-même les renouvellements : « Non ! Les demandes pourront être déposées par l'entreprise, après avoir recueilli le consentement du salarié […] ou par le salarié lui-même ».
- URL :
  - https://www.cnaps.interieur.gouv.fr/Publications/Fiches-thematiques/Parution-du-decret-du-26-12-2025-les-nouvelles-obligations-liees-au-lancement-de-Dracar-Ultimate
  - https://www.cnaps.interieur.gouv.fr/Actualites/Dracar-Ultimate-decollage-reussi
  - https://www.cnaps.interieur.gouv.fr/Actualites/Dracar-Ultimate-entreprises-etes-vous-pretes-pour-le-1er-octobre
  - https://www.cnaps.interieur.gouv.fr/FAQ/DRACAR-ULTIMATE

**2. Spécialité de la carte (I-02) — NOUVEAU, mais pas d'article unique : l'obligation résulte d'une chaîne de textes**

Aucun article lu ne dit en ces termes que « la spécialité doit correspondre aux fonctions ». L'obligation se reconstitue ainsi, tous textes lus en version en vigueur au 05/10/2026 :
- **R612-16, 3°** (version du 01/12/2014) : la décision de délivrance de la carte comprend « L'activité ou les activités au titre desquelles la carte est délivrée ». La carte vaut donc pour des activités nommées.
- **R612-14, 2°** (version du 01/01/2018, décret 2017-1844) : la demande porte sur « La ou les activités mentionnées à l'article L. 611-1, dont les spécialités sont définies par arrêté du ministre de l'intérieur, au titre desquelles la carte est sollicitée ».
- **L612-20** (version du 01/05/2022) : « Nul ne peut être employé ou affecté pour participer à une activité mentionnée à l'article L. 611-1 : […] 5° S'il ne justifie pas de son aptitude professionnelle […]. Le respect de ces conditions est attesté par la détention d'une carte professionnelle ».
- **R631-15, al. 1** (version du 01/10/2026), qui est l'interdiction faite à l'employeur : il ne peut employer des personnels « ne possédant pas les autorisations valides requises pour exercer leurs missions ». L'**al. 3** ajoute l'obligation de s'assurer de « l'adéquation des compétences de leurs agents aux missions qui leur sont confiées ».
- **R612-18, 1°** : la carte remise par l'employeur mentionne « les activités du titulaire » (point 3).
- **Arrêté du 01/09/2025** (cahier des charges de la formation initiale), **art. 4** (version du 01/10/2025) : « Pour l'obtention de la carte professionnelle mentionnée à l'article L. 612-20 susvisé, les personnes doivent justifier d'une formation initiale correspondant à l'activité pour laquelle la carte est sollicitée ». Il distingue ensuite 11 formations spécifiques, qui forment de fait la liste des spécialités :
  1. tronc commun ;
  2. surveillance humaine ou gardiennage ;
  3. télésurveillance (« par des systèmes électroniques de sécurité ») ;
  4. avec port d'une arme (L613-5) ;
  5. avec l'usage d'un chien (L613-7) ;
  6. chien de détection d'explosifs (L613-7-1 A) ;
  7. vidéoprotection (L613-13) ;
  8. surveillance renforcée (1° bis) ;
  9. transport de fonds ;
  10. protection physique des personnes ;
  11. protection physique avec arme.

  Le II traite à part la sûreté de l'aviation civile.
- **NON LU** : l'arrêté qui « définit les spécialités » au sens de R612-14, 2°. Je n'ai pas pu établir si c'est l'arrêté du 01/09/2025 ou un autre texte, faute d'en avoir lu les visas. Recherche web infructueuse.
- **SSIAP n'est pas une spécialité de la carte.** Référentiel de contrôle du CNAPS « Surveillance humaine et gardiennage » (07/05/2025, p. 3) : « Ne peuvent être qualifiées d'activités de surveillance humaine ou de gardiennage au sens de l'article L. 611-1 du CSI […] les activités des services de sécurité incendie et d'assistance à personne (SSIAP) ». La qualification SSIAP est un diplôme (arrêté du 02/05/2005, art. 3), donc relève d'I-04.
- URL :
  - https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000025503132/LEGISCTA000029655893/2026-10-05 (R612-12 à R612-18-1)
  - https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043540580 (L612-20)
  - https://www.legifrance.gouv.fr/loda/id/JORFTEXT000052197461 (arrêté du 01/09/2025)
  - https://www.cnaps.interieur.gouv.fr/contenu/telechargement/5666/46074/file/R%C3%83%C2%A9f%C3%83%C2%A9rentiel%20de%20contr%C3%83%C2%B4le%20-%20Surveillance%20humaine%20et%20gardiennage.pdf

**3. Carte remise par l'employeur (I-03) — CONFIRMÉ, et l'article est R612-18**

- **R612-18**, version en vigueur depuis le 01/05/2022 (décret 2022-449) :
  > Tout candidat à l'emploi pour exercer des activités privées de sécurité définies aux articles L. 611-1 et L. 613-13 ou tout employé participant à l'exercice de ces activités communique à l'employeur le numéro de la carte professionnelle qui lui a été délivrée par le directeur du Conseil national des activités privées de sécurité.
  >
  > L'employeur remet à l'employé une carte professionnelle propre à l'entreprise. Cette carte, qui comporte une photographie récente de son titulaire, mentionne :
  > 1° Le nom, les prénoms, la date de naissance et les activités du titulaire ;
  > 2° Si l'activité du titulaire est celle d'" agent cynophile ", le numéro d'identification de chacun des chiens utilisés ;
  > 3° Le nom, la raison sociale et l'adresse de l'employeur ainsi que l'autorisation administrative prévue aux articles L. 612-9 et L. 613-13 ;
  > 4° Le numéro de carte professionnelle délivrée par le directeur du Conseil national des activités privées de sécurité.
  >
  > La carte professionnelle remise à l'employé par son employeur doit être présentée à toute réquisition d'un agent de l'autorité publique et restituée à l'employeur à l'expiration du contrat de travail.
- Les deux autres articles de la sous-section :
  - **R612-12** (version du 01/05/2022) porte sur la carte CNAPS, pas sur la carte d'entreprise. Il précise que la carte est délivrée « sous la forme dématérialisée d'un numéro d'enregistrement », et que l'employeur accède aux informations de R612-16 « par le biais d'un téléservice » ;
  - **R612-13** : 5 ans (point 6).
- Le texte ne dit pas « carte entreprise » mais « carte professionnelle propre à l'entreprise ».
- URL : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045456783 (R612-18) et https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045456799 (R612-12)

**4. CSI R631-16 (I-12, étapes 4 et 8) — CONFIRMÉ pour le registre ; MODIFIÉ pour le mémento : la fiche lui prête un contenu par site que le texte interdit**

- Version en vigueur depuis le 01/12/2014 (décret 2014-1253), sans autre version :
  > Consignes et contrôles.
  > Les dirigeants s'interdisent de donner à leurs salariés, directement ou par l'intermédiaire de leurs cadres, des ordres qui les conduiraient à ne pas respecter le présent code de déontologie.
  > Ils veillent à la formulation d'ordres et de consignes clairs et précis afin d'assurer la bonne exécution des missions.
  > Les instructions générales, circulaires et consignes générales de la sécurité privée et celles relatives aux fonctions assurées, que les salariés doivent mettre en œuvre dans l'exercice de leurs fonctions, sont regroupées dans un mémento, rédigé en langue française, dans un style facilement compréhensible. Le salarié doit en prendre connaissance à chaque modification et en justifier par émargement. Le mémento doit être mis à la disposition des agents dans les locaux professionnels. Il ne peut être consulté que par les personnels impliqués dans la conception et la réalisation des missions ainsi que, sans délai, par les agents de contrôle du Conseil national des activités privées de sécurité. **Ce mémento ne comporte aucune mention spécifique à un client ou une mission.**
  > Les dirigeants s'assurent de la bonne exécution des missions, notamment au moyen de contrôles réguliers sur place. Dans ce cadre, les dirigeants mettent en place et tiennent à jour un registre des contrôles internes.
- Ce qu'il faut en retenir :
  - le mémento est **unique et général** à l'entreprise, sans contenu propre à un site ;
  - l'émargement est dû **à chaque modification** du mémento, pas à chaque prise de poste ;
  - le mémento est tenu dans les locaux professionnels, et consultable sans délai par le CNAPS.
- Les consignes propres à un site n'ont aucune obligation d'émargement dans ce texte. Je n'ai lu aucun autre texte qui en impose une.
- URL : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000029656398

**5. Cass. soc., 16 septembre 2026 — NOUVEAU (arrêt lu en entier)**

- **Références** : pourvoi n° Z 25-12.634, arrêt n° 712 FS-B, publié au Bulletin, ECLI:FR:CCASS:2026:SO00712. **Cassation partielle** de CA Paris (pôle 6, ch. 8), 16/01/2025, n° 23/05290. Parties : Challancin prévention et sécurité c/ M. [W].
- **Faits** :
  - carte expirée le 9 mars 2021 ;
  - le salarié détenait « une attestation de suivi d'un stage MAC du 3 au 5 février 2021 », mais aucun récépissé à la date du licenciement (23/04/2021, « motif personnel non disciplinaire - défaut de carte professionnelle ») ;
  - la cour d'appel avait jugé le licenciement sans cause réelle et sérieuse, parce que l'employeur « n'a organisé aucune formation MAC au bénéfice du salarié ».
- **Visa** : L612-20 al. 5 et 7, L612-20-1 et R612-17 CSI ; « l'article 3 de l'accord du 27 novembre 2017 relatif au financement des maintiens et à l'actualisation des compétences (MAC) des agents de sécurité » ; C. trav. L6321-1 et L6321-2.
- **Solution** (§ 11) : « l'absence de détention d'une carte professionnelle en cours de validité ou d'un récépissé de renouvellement de sa carte par l'agent de sécurité constitue, par l'effet de la loi, un motif de licenciement, peu important l'éventuel manquement de l'employeur à son obligation de formation, qui peut ouvrir droit à l'allocation de dommages et intérêts pouvant inclure la réparation de la perte de l'emploi ».
- **Met-il l'organisation du MAC à la charge de l'employeur ? Oui pour l'obligation de formation, non pour la sanction.**
  - L'arrêt parle de « son obligation de formation ». Il s'appuie sur l'accord de 2017, art. 3 (§ 8 : le MAC est « du ressort de la formation continue de l'entreprise »), sur L6321-1 (adaptation au poste) et sur L6321-2 (formation qui conditionne l'activité = temps de travail effectif, rémunération maintenue).
  - En revanche, il ne juge pas que l'employeur a manqué ici. Il dit « l'éventuel manquement ».
  - Le manquement ne rend pas le licenciement injustifié. Il ouvre droit à des dommages et intérêts, qui peuvent inclure la perte de l'emploi.
  - La condamnation de l'employeur « au titre de la formation MAC » par la cour d'appel n'est pas cassée (§ 15).
- **Texte de branche lu à l'appui** (accord du 27/11/2017, « EN VIGUEUR ÉTENDU ») :
  - art. 3 : « Le maintien et l'actualisation des compétences des salariés de la prévention sécurité sont du ressort de la formation continue de l'entreprise » ;
  - art. 4 : « la totalité de cette formation doit être effectuée sur le temps de travail des salariés ou sur toute autre période qui sera alors assimilée à du temps de travail effectif et […] les frais attenants seront pris en charge par l'employeur sauf demande formelle et expresse du salarié ».
- Rapprochement cité par la Cour : Soc., 7 janvier 2026, n° 24-15.367, publié. **NON LU.**
- URL : https://www.courdecassation.fr/decision/6aaa63f0c27382d099c5fe95 et https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000036777870

**6. Re-vérification de version (relus au 29/09/2026)**

| Texte | Version en vigueur au 05/10/2026 | Par rapport au 29/09 |
|---|---|---|
| CSI R612-13 | depuis le 01/12/2014 (décret 2014-1253) ; texte identique | **CONFIRMÉ**, inchangé |
| CSI R612-17 | depuis le 01/03/2025 (décret 2024-311, art. 5) ; texte identique | **CONFIRMÉ**, inchangé. L'identifiant de la version en vigueur est LEGIARTI000049382882, pas LEGIARTI000032469051 (URL citée le 29/09) |
| Arrêté du 27/02/2017, art. 4 II | depuis le 01/10/2025 (arrêté du 01/09/2025, art. 9) : « vingt-quatre mois » ; texte consolidé « EN VIGUEUR AU 05 OCTOBRE 2026 », dernière mise à jour le 01/10/2025 | **CONFIRMÉ**, inchangé |
| Arrêté du 27/02/2017, art. 6 II | depuis le 01/03/2025 (arrêté du 23/10/2024, art. 28) : « trente-six mois » | **CONFIRMÉ**, inchangé |
| Arrêté du 02/05/2005, art. 3 | depuis le 08/01/2011 ; dernière mise à jour du texte le 10/07/2024 | **CONFIRMÉ**, inchangé |
| Arrêté du 02/05/2005, art. 7 | depuis le 01/02/2011 | **CONFIRMÉ**, inchangé ; précision ci-dessous |
| CCN prévention-sécurité, art. 7 (7.01, 7.07.3, 7.08, 7.09, 7.12) | « 01 JUILLET 2026 (VERSION ACTIVE) », avenant n° 2 du 03/09/2025, étendu par arrêté du 27/05/2026 ; aucune version postérieure dans la liste ; textes de 7.01, 7.07.3, 7.08, 7.09, 7.10 et 7.12 identiques aux citations du 29/09 | **CONFIRMÉ**, inchangé ; précision ci-dessous |
| Accord du 18/05/1993, art. 1 à 3 | « EN VIGUEUR ÉTENDU » ; textes identiques aux citations du 29/09 | **CONFIRMÉ**, texte inchangé. Je n'ai pas rouvert la liste des versions de chaque article ; la page n'en signale aucune modification |

Précisions lues en relisant, qui n'ont pas été citées le 29/09 :
- **Arrêté de 2005, art. 7** : la date limite de recyclage est « la date anniversaire de la délivrance du diplôme SSIAP **ou de la qualification de secourisme** ». L'échéance du secourisme court donc depuis sa propre qualification.
- **CCN 7.07.3** : « Son refus pour raisons justifiées ne peut entraîner de sanctions disciplinaires ». La CCN pose donc une condition (« raisons justifiées ») que l'accord de 1993, art. 3, 2°, ne pose pas pour la prestation supplémentaire.
- **Accord de 1993, champ d'application** (préambule) : il concerne « les salariés […] relevant des catégories agents d'exploitation et techniciens. Les cadres, agents de maîtrise et personnels administratifs ne sont pas concernés sauf accord individuel avec l'entreprise ».

URL :
- https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000029655897 (R612-13)
- https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049382882 (R612-17)
- https://www.legifrance.gouv.fr/loda/id/JORFTEXT000034104578 (arrêté de 2017)
- https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000448223 (arrêté de 2005)
- https://www.legifrance.gouv.fr/conv_coll/article/KALIARTI000054226430 (CCN, art. 7)
- https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000005680922 (accord de 1993)

---

**Conséquences pour la fiche** (propositions, à valider avant d'éditer `fiche.md`)

1. **I-01** : reste `texte` ✓. Source : « R631-15 (version du 01/10/2026, al. 1) ; R612-13 ; R612-17 ». Libellé inchangé. Le motif de l'arrêt du 16/09/2026 recoupe exactement la règle « carte valide ou récépissé », et peut figurer en conséquence : sans l'un ni l'autre, le licenciement est fondé « par l'effet de la loi ».
2. **I-02** : peut passer en `texte` ✓ pour la règle, à trois conditions.
   - Libellé proposé : « Aucun agent n'est affecté à un poste dont l'activité ne figure pas parmi celles au titre desquelles sa carte a été délivrée (surveillance humaine ou gardiennage, télésurveillance, avec chien, détection d'explosifs avec chien, avec arme, surveillance renforcée, vidéoprotection…) ».
   - Source : « R631-15 al. 1 et 3 ; R612-16, 3° ; R612-18, 1° ; L612-20 ».
   - **Retirer « SSIAP »** des exemples : ce n'est pas une spécialité de carte (référentiel CNAPS, p. 3), c'est I-04.
   - La table de correspondance poste → spécialité reste `texte` sans ✓ (arrêté du 01/09/2025, art. 4), tant que l'arrêté visé par R612-14, 2° n'est pas identifié. T-03 (maître-chien sur une carte de surveillance humaine seule) est cohérent avec ces textes.
3. **I-03** : passer en `texte` ✓.
   - Source : « R612-18 » au lieu de « R612-12 et suivants ».
   - Libellé : « Aucun agent en poste sans la carte professionnelle propre à l'entreprise remise par l'employeur (photo récente, identité et activités, chiens le cas échéant, employeur et son autorisation, n° de carte CNAPS) ». Ajouter : présentée « à toute réquisition d'un agent de l'autorité publique », restituée à la fin du contrat.
   - Glossaire « Carte entreprise » : ajouter le terme du texte, « carte professionnelle propre à l'entreprise », et passer en `texte` ✓.
4. **I-12** : passer en `texte` ✓ **après réécriture**, car le libellé actuel n'est pas ce que dit le texte.
   - Proposition : « Aucun agent n'est employé sans avoir émargé la version en vigueur du mémento de l'entreprise : chaque modification du mémento appelle un nouvel émargement de tous les agents. Le mémento est en français, tenu dans les locaux professionnels, et ne contient rien de propre à un client ou à une mission. »
   - Étape 4 de la chaîne : séparer le **mémento** (général, R631-16) des **consignes de poste** (par site, issues du contrat). Aucun texte lu n'impose l'émargement des consignes de site ; ce serait au mieux un `déclaré` à recueillir chez le client.
   - **T-13** : le réécrire, car « le mémento des consignes du site » contredit R631-16.
   - **Glossaire, ligne « Mémento des consignes »** : retirer « consignes de poste » des synonymes.
5. **Étape 8 et registre** : « registre des contrôles internes » passe en `texte` ✓ (R631-16). Le texte ajoute « contrôles réguliers sur place ».
6. **I-17** : reste `texte` ✓ (sauf l'agrément du dirigeant, toujours non relu).
   - Ajouter en source « accord du 27/11/2017, art. 3 et 4 » : le MAC relève de la formation continue de l'entreprise, se fait sur le temps de travail, et ses frais sont à la charge de l'employeur sauf demande expresse du salarié.
   - Ajouter en conséquence : Cass. soc. 16/09/2026, n° 25-12.634. Le licenciement reste fondé, mais l'employeur qui n'a pas formé doit des dommages et intérêts, qui peuvent couvrir la perte de l'emploi.
   - Pour T-16 et T-16b : l'alerte doit laisser le temps d'**organiser** le MAC avant la date limite de dépôt (J-90), pas seulement le signaler. Le renouvellement s'ouvre dans Dracar Ultimate 6 mois avant l'échéance : c'est une pratique du CNAPS (FAQ), pas un texte.
7. **I-20** : passer en `texte` ✓ **sans réserve** : R631-15, version en vigueur depuis le 01/10/2026.
   - Libellé : « Tout agent employé ou affecté est déclaré dans Dracar Ultimate (téléservice du CNAPS) ; ces informations sont tenues à jour ; la validité des titres est vérifiée régulièrement, avec une fréquence adaptée aux entrées, aux sorties et à l'évolution des responsabilités. »
   - Retirer « Au plus tard à partir du 01/10/2026 » et la mention « ⚠ en vigueur à la mise en service ».
   - « Au moins une fois par mois, et avant toute affectation sur un grand événement » est une **doctrine du CNAPS** (FAQ et actualité du 17/09/2026), pas un texte. Proposition : la coder comme valeur par défaut, avec cette source, sans le statut `texte`.
   - Ajouter R611-2-1 : compte créé avant toute demande d'autorisation.
8. **Avertissement de tête « R631-15 change au plus tard le 01/10/2026 »** : le passer au passé. C'est en vigueur depuis le 01/10/2026, et le téléservice est Dracar Ultimate, ouvert fin février 2026. Garder la question d'entrée chez le client : « Vos salariés sont-ils tous rattachés dans Dracar Ultimate ? ».
9. **Ligne ↻ de la chaîne** : remplacer « déclaration des agents au téléservice du CNAPS (au plus tard le 01/10/2026) » par « déclaration et mise à jour des agents dans Dracar Ultimate (R631-15, en vigueur) ; vérification régulière des titres ». Pour le SSIAP, préciser que le secourisme se recycle à la date anniversaire de **sa** qualification.
10. **§ 3 Connecteurs** : fusionner les deux lignes, « DRACAR Ultimate » et « Téléservice de déclaration des agents ». C'est un seul outil, qui a remplacé Dracar NG.
    - Accès : portail web, **pas d'API** (« cette interconnexion n'est pas envisagée », FAQ du CNAPS), import CSV des salariés activité par activité.
    - Les listes de salariés de Dracar NG n'ont pas été reprises.
    - Statut proposé : `texte` pour l'existence et l'obligation ; la FAQ du CNAPS est la source de l'absence d'API.
11. **Glossaire « DRACAR Ultimate »** : préciser que c'est le système d'information du CNAPS depuis fin février 2026, qui remplace **Dracar NG**. « DRACAR » seul est ambigu.
12. **I-05 et I-06** : aucun changement de statut, les textes sont inchangés. À verser au dossier du juriste :
    - l'accord de 1993 ne vise que les agents d'exploitation et les techniciens ;
    - la CCN 7.07.3 ne protège le refus que « pour raisons justifiées ».
13. **Questions ouvertes** :
    - retirer « Le décret 2025-1344 en entier… quel est le téléservice » : la réponse est Dracar Ultimate. Garder la liste des articles modifiés non lus (point 1) si on veut les relire ;
    - retirer la question sur la Cass. soc. du 16/09/2026 (lue, point 5) ;
    - dans « Non relus à la source », retirer R612-12 et suivants, R631-16, et l'article de la spécialité ;
    - ajouter : l'arrêté visé par R612-14, 2°, la Soc. du 7 janvier 2026 (n° 24-15.367), et les articles du décret 2025-1344 non lus.
