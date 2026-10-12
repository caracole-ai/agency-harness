# Agence web — fiche métier

Sites et applications au forfait, régie, contrats de maintenance (TMA) au
mois, un peu d'hébergement revendu. Second métier du moteur, décidé le
2026-10-12 pour prouver qu'il ne sait rien de la sécurité privée
(`../../PLAN-METIER-2.md`).

Remplie selon `../../GRILLE.md`, depuis une seule source :
`entretien-simule-2026-10-12.md`, dans ce dossier. Ses archétypes
(`../../methode/archetypes.md`) : **Rapprocher** au cœur (temps, devis,
factures), **Veiller** (domaines, certificats, garanties, contrats,
attestations) ; Rédiger (le brouillon de relance) est reporté
(`PLAN-METIER-2.md`, M12). Les règles communes à tous les métiers sont dans
`../../methode/socle.md`. Pas encore de vues pour le terrain
(`prospection.md`, `entretien.md`, `observation.md`).

État au **2026-10-12** :
- **L'entretien est simulé** : les réponses ont été écrites par le modèle dans
  le rôle du dirigeant d'une agence fictive de six personnes (un dirigeant,
  une commerciale, une cheffe de projet / product owner, un graphiste UI, deux
  développeurs), puis **relues et confirmées par Lionel le 2026-10-12**. Ce
  qui est confirmé est `déclaré`.
- **Les incidents racontés sont inventés**, marqués *(inventé)*, et restent
  `hypothèse` tant qu'aucun incident réel n'est daté.
- **Aucun texte n'est relu** : les cinq interdits adossés à un texte sont
  `texte` sans ✓. En v1, le verdict le plus grave d'un contrôle est donc
  « à vérifier » (`moteur/src/regles/verdict.ts`) : aucun refus.
- **Un seul client, et fictif** : ce qui est propre à cette agence (ses
  seuils, ses éditeurs, ses délais de relance) et ce qui vaut pour le métier
  n'est pas encore séparé (`GRILLE.md`, « Métier ou client ? »). Tout est à
  reposer chez le prochain.

Aucun nom réel : les prénoms et les clients de l'entretien sont fictifs, et
cette fiche n'en cite aucun.

---

## 0. La chaîne

| # | Étape | Entrée | Sortie | Qui | Outil aujourd'hui | Statut |
|---|---|---|---|---|---|---|
| 1 | Prise de contact | appel, formulaire, recommandation | fiche prospect | commerciale | CRM (le même outil que les devis) | `déclaré` |
| 2 | Cadrage | rendez-vous, cahier des charges du client | note de cadrage, liste des lots | commerciale, cheffe de projet | Confluence (une page par projet) | `déclaré` |
| 3 | Chiffrage | note de cadrage | devis en jours × TJM, par lot | la cheffe de projet chiffre, le dirigeant relit | outil devis et factures | `déclaré` |
| 4 | Signature | devis | devis signé, acompte de 30 % facturé | la commerciale envoie, **le dirigeant signe** | outil devis et factures, mail | `déclaré` |
| 5 | Planification | devis signé | projet créé, lots découpés en tickets, dates, personnes | cheffe de projet | Jira | `déclaré` |
| 6 | Maquettes | tickets de design | maquettes, validation écrite du client | graphiste, cheffe de projet | outil de design, mail de validation, page Confluence du projet | `déclaré` |
| 7 | Développement | maquettes validées, tickets | branches, revue, préprod | développeurs | GitHub (dépôts privés), CI, Jira | `déclaré` |
| 8 | Recette | préprod | PV de recette signé, avec ou sans réserves | cheffe de projet, client | document signé, mail, page Confluence du projet | `déclaré` |
| 9 | Mise en production | PV sans réserve bloquante, accord écrit | site en ligne, accès remis | développeur, cheffe de projet | GitHub, hébergeur, registre des accès | `déclaré` |
| 10 | Facturation du solde | PV signé | facture de solde (70 %, ou par lot) | dirigeant, ou cheffe de projet à sa demande | outil devis et factures | `déclaré` |
| 11 | Encaissement | facture | paiement, ou relance à J+30, J+45, J+60 | la commerciale relance, le dirigeant au-delà | outil devis et factures, banque | `déclaré` |
| 12 | Maintenance | fin de garantie (3 mois) | contrat TMA mensuel, tickets de maintenance | la commerciale vend, la cheffe de projet suit | Jira, outil devis et factures | `déclaré` |
| ↻ | Échéances et cycles | dates des domaines, certificats, contrats, attestations, versions | renouvellements, relances, révisions | dirigeant, un développeur, cheffe de projet | registrar, hébergeur, dossier, tableur | `déclaré` |

Passages de main à surveiller :
- **1→5**, commerciale → cheffe de projet : les promesses orales du
  rendez-vous (« on vous mettra aussi… ») qui ne sont pas dans le devis.
  Première source de travail hors devis (I-02).
- **5→7**, cheffe de projet → graphiste → développeur : le « pourquoi »
  d'une maquette ; le développeur découvre en codant qu'un écran manque.
- **7→8**, développement → recette : ce qui a été fait « en plus » sans
  ticket, dont on ne sait plus s'il faut le facturer (I-02).
- **8→10**, recette → facturation : le PV qui traîne ; on facture sur un
  « c'est bon » oral, et le client conteste (I-01).
- **9→12**, projet → maintenance : les accès (hébergeur, registrar, comptes
  tiers) créés pendant le projet et jamais consignés (I-04).

Les cycles : chaque semaine, point d'équipe le lundi et revue des temps le
vendredi ; chaque mois, facturation des TMA et des régies au 1er, relance des
impayés, rapprochement temps / devis par projet ; chaque année, renouvellement
des domaines et des certificats (groupés en janvier, mais pas tous), révision
des TJM ; tous les six mois, les attestations des sous-traitants.

Où ça coince le plus : entre le forfait vendu et le temps réel, découvert à
la recette, trop tard. Dernier cas *(inventé)* : un site vitrine vendu
18 jours, 27 passés, parce que le client a changé trois fois la page
d'accueil « en petites retouches », sans un seul avenant.

Les prestations et leur risque :
- **forfait** : la chaîne ci-dessus ; le risque est le dépassement (I-12) ;
- **régie** : jours vendus, facturés au réel chaque mois sur un relevé de
  temps validé par le client, sans PV ; le risque est le temps non saisi ;
- **TMA** : un contrat mensuel avec des heures incluses, les tickets au-delà
  facturés ; le risque est « bug ou évolution » (I-05) ;
- **hébergement revendu** : une ligne annuelle ; le risque est l'expiration
  d'un domaine ou d'un certificat (I-13).

## 1. Interdits

<!-- registre:interdits — généré depuis le registre (pnpm registre:generer), ne pas éditer à la main -->

| ID | Interdit | Étape | Conséquence | Vérifiable par | Statut | Source |
|---|---|---|---|---|---|---|
| I-01 | Aucune facture de solde ou de lot n'est émise sans **PV de recette signé** (forfait) ou sans **relevé de temps validé par le client** (régie) ; une réserve bloquante empêche la facture, une réserve mineure non | 8, 10 | contestation, impayé | code (PV présent et daté avant la facture) | `déclaré` ; incident `hypothèse` *(inventé)* : une facture contestée six mois, payée à 60 % | agence fictive, entretien simulé du 2026-10-12, dirigeant |
| I-02 | Aucun travail hors du **périmètre du devis** sans **avenant signé** ou **accord écrit** du client (un mail suffit) ; « petit » (moins d'une demi-journée) se fait, se note, et se facture au lot suivant ou s'offre explicitement | 5, 7, 12 | marge perdue, litige | code (ticket rattaché à un lot vendu ou à un avenant) | `déclaré` ; incident `hypothèse` *(inventé)* : un forfait vendu 18 jours, 27 passés en « petites retouches » sans avenant | agence fictive, entretien simulé du 2026-10-12, dirigeant |
| I-03 | Aucune **mise en production** sans **accord écrit** du client et sans **sauvegarde datée de moins de 24 h** | 9 | perte de données, perte du client | code (ligne d'accord et ligne de sauvegarde avant la ligne de mise en prod) | `déclaré` ; incident `hypothèse` *(inventé)* : une base écrasée un vendredi soir, restaurée le lundi, une journée de commandes perdue | agence fictive, entretien simulé du 2026-10-12, dirigeant |
| I-04 | Aucun accès (hébergeur, registrar, admin du site, dépôt) **hors du registre des accès** ; un accès est **révoqué** au départ d'une personne ou à la fin du projet | 7, 9, 12 | sécurité, RGPD | code (registre des accès et collaborateurs des dépôts) | `déclaré` ; incident `hypothèse` *(inventé)* : un ancien freelance encore admin d'un site deux ans après | agence fictive, entretien simulé du 2026-10-12, dirigeant |
| I-05 | Un ticket n'est traité en **« bug »** (gratuit sous garantie ou dans les heures du contrat) que s'il porte sur une **fonction recettée** ; sinon il est une **« évolution »** et attend un devis ou un décompte | 12 | marge perdue | humain (la qualification) ; le code dit si le périmètre recetté existe | `déclaré` | agence fictive, entretien simulé du 2026-10-12, dirigeant |
| I-06 | Aucune donnée, maquette, code ou accès d'un client ne passe à un autre client | 6, 7, 9 | perte du client, NDA | humain (ce qui appartient à un client) ; le code cloisonne par projet | `déclaré` | agence fictive, entretien simulé du 2026-10-12, dirigeant |
| I-07 | Aucune facture avec un **délai de paiement supérieur à 60 jours** (ou 45 jours fin de mois) ; chaque facture porte les **pénalités de retard** et l'**indemnité forfaitaire de 40 €** | 4, 10, 11 | amende | code | `texte` (non relu : à faire relire par un juriste) | L441-10 et L441-9 du code de commerce |
| I-08 | Aucune facture sans ses **mentions obligatoires** (numéro continu, dates, TVA, SIREN, adresse, désignation) | 4, 10 | amende, rejet | code (sur la facture émise ; les exports de la v1 ne portent pas ces mentions, non codé) | `texte` (non relu ; l'entretien ne cite aucun article : à identifier par un juriste) | texte à identifier (l'entretien dit « texte, à relire » sans le citer) |
| I-09 | Aucun **sous-traitant** payé plus de **5 000 € HT par an** sans **attestation de vigilance URSSAF** de moins de six mois | 5, ↻ | solidarité financière | code (date de l'attestation) | `texte` (non relu : à faire relire par un juriste) | L8222-1 du code du travail |
| I-10 | Aucune livraison sans **clause écrite de cession des droits d'auteur** (étendue, durée, territoire) pour les créations livrées | 4, 9 | contestation de propriété | code (clause présente au devis ou au contrat) | `texte` (non relu : à faire relire par un juriste) | L131-3 du code de la propriété intellectuelle |
| I-11 | Un **devis**, un **avenant** ou une **remise de plus de 10 %** n'est engagé que par le **dirigeant** ; en son absence, par la cheffe de projet jusqu'à **5 000 € HT** | 3, 4 | engagement non voulu | code (signataire et plafond) | `déclaré` | agence fictive, entretien simulé du 2026-10-12, dirigeant |
| I-12 | Un projet au **forfait** ne dépasse pas **110 % des jours vendus** sans que le dirigeant ait été prévenu avant | 7, 8 | marge | code (temps saisi rapporté aux jours vendus, à la maille du projet) | `déclaré` | agence fictive, entretien simulé du 2026-10-12, dirigeant |
| I-13 | Aucun **domaine** ni **certificat** géré par l'agence n'expire sans **alerte 30 jours avant** ; une date d'expiration inconnue est une alerte | ↻, 12 | site hors ligne | code | `déclaré` ; incident `hypothèse` *(inventé)* : un domaine expiré un samedi, site et mails coupés trois jours, le client parti six mois plus tard | agence fictive, entretien simulé du 2026-10-12, dirigeant |
| I-14 | Aucune **donnée personnelle hébergée** pour un client sans **contrat de sous-traitance** au sens de l'article 28 du RGPD | 4, 12 | sanction | code (document présent) | `texte` (non relu : à faire relire par un juriste) | article 28 du RGPD |
| I-15 | Aucune **relance d'impayé** n'est envoyée au client sans que le **dirigeant** l'ait validée ; le brouillon est préparé, jamais envoyé seul | 11 | relation client | humain | `déclaré` | agence fictive, entretien simulé du 2026-10-12, dirigeant |

<!-- /registre:interdits -->

**Qui engage l'agence** (I-11). Le dirigeant signe les devis, les avenants,
les contrats, et envoie les factures. La commerciale envoie les devis, sans
les signer. En l'absence du dirigeant, la cheffe de projet signe jusqu'à
5 000 € HT et peut émettre une facture dont le PV est signé ; au-delà, ça
attend.

**Le travail hors devis** (I-02). Il se décide trop souvent à l'oral, entre
la cheffe de projet et le client. La règle de la maison : « petit » (moins
d'une demi-journée), on le fait, on le note, on le facture au lot suivant ou
on l'offre explicitement ; au-delà, un avenant. « Petit » n'est jamais mesuré.

Les trois déjà arrivés, tous *(inventés)* : la facture sans PV (I-01), la
mise en production sans sauvegarde (I-03), l'accès jamais révoqué (I-04).

## 2. Tests types

Données fictives et génériques. Tous sont conçus depuis leur interdit ; les
incidents de l'entretien sont inventés, et aucun ne fait encore source. Les
données rejouables (`cas`) s'ajoutent aux scénarios des interdits codés, avec
le modèle de données de l'agence (`PLAN-METIER-2.md` § 7.4).

<!-- registre:tests — généré depuis le registre (pnpm registre:generer), ne pas éditer à la main -->

| ID | Étant donné | Quand | Alors | Interdit | Statut | Source |
|---|---|---|---|---|---|---|
| T-01 | un lot au forfait (LOT-nnn) recetté, dont le PV n'est pas signé | une facture de solde (FAC-AAAA-nnn) est émise sur ce lot | la facture est signalée « à vérifier » : PV de recette absent ; une facture de régie se lit de même contre le relevé de temps validé du mois | I-01 | `hypothèse` | conçu depuis l'interdit |
| T-01b | un lot recetté dont le PV est signé avec une réserve mineure | la facture de solde du lot est émise | rien n'est signalé : une réserve mineure n'empêche pas la facture ; avec une réserve bloquante, la facture serait signalée « à vérifier » | I-01 | `hypothèse` | conçu depuis l'interdit |
| T-02 | un projet en garantie, et un ticket (TK-nnnn) de type « évolution », résolu, rattaché à aucun lot vendu ni avenant | le contrôle lit les tickets | le ticket est signalé « à vérifier » : travail hors devis, sans lot ni avenant ; un accord écrit par mail, s'il existe, n'est pas lu en v1 et se confirme à la main | I-02 | `hypothèse` | conçu depuis l'interdit |
| T-03 | un site e-commerce dont la dernière sauvegarde date de 30 h | une mise en production a lieu un vendredi à 19 h | la mise en production est signalée « à vérifier » : aucune sauvegarde de moins de 24 h avant elle ; l'accord écrit du client, qui vit dans la messagerie, se confirme à la main | I-03 | `hypothèse` | conçu depuis l'interdit |
| T-04 | un sous-traitant (ST-nn), toujours collaborateur du dépôt d'un projet clos depuis quatre mois, sans date de révocation au registre | le contrôle croise le registre des accès et les collaborateurs des dépôts | l'accès est signalé « à vérifier » : à révoquer, la fin du projet est passée ; un collaborateur du dépôt absent du registre est signalé de même | I-04 | `hypothèse` | conçu depuis l'interdit |
| T-05 | un contrat TMA (TMA-nn), et un ticket noté « bug » qui demande un export CSV, fonction présente dans aucun lot recetté | la cheffe de projet demande si c'est un bug ou une évolution | la réponse dit « évolution », avec la raison (aucun lot recetté ne porte cette fonction), et laisse la qualification à l'humain : rien n'est requalifié | I-05 | `hypothèse` | conçu depuis l'interdit |
| T-06 | un développeur affecté aux projets de deux clients, dont l'un est sous NDA | il demande, à propos du projet de l'un, les maquettes et les accès de l'autre « pour s'en inspirer » | la réponse ne mêle pas les deux projets ; réutiliser ce qui appartient à un client est une décision humaine, renvoyée à la cheffe de projet | I-06 | `hypothèse` | conçu depuis l'interdit |
| T-07 | une facture émise avec un délai de paiement de 90 jours, sans mention des pénalités de retard | le contrôle lit les factures | la facture est signalée « à vérifier » : délai au-delà de 60 jours, pénalités non mentionnées ; une facture à 45 jours fin de mois qui porte pénalités et indemnité de 40 € n'est pas signalée | I-07 | `hypothèse` | conçu depuis l'interdit |
| T-08 | une facture émise sans le SIREN de l'agence | on la contrôle avant l'envoi | elle est signalée « à vérifier » : mention obligatoire absente. Les exports de la v1 ne portent pas les mentions : ce test attend un accès à la facture émise | I-08 | `hypothèse` | conçu depuis l'interdit |
| T-09 | un sous-traitant (ST-nn) payé 8 000 € HT sur l'année, dont la dernière attestation URSSAF date de huit mois | le contrôle lit les sous-traitants | le sous-traitant est signalé « à vérifier » : attestation de plus de six mois au-delà de 5 000 € HT ; sous le seuil, rien n'est signalé | I-09 | `hypothèse` | conçu depuis l'interdit |
| T-10 | un devis signé pour un site avec logo et maquettes, sans clause de cession des droits d'auteur | un lot de ce devis est mis en production | la livraison est signalée « à vérifier » : clause de cession absente ; une clause présente mais sans étendue, durée ou territoire se relit à la main | I-10 | `hypothèse` | conçu depuis l'interdit |
| T-11 | un devis à 15 % de remise, signé par la commerciale | le contrôle lit les devis | le devis est signalé « à vérifier » : remise de plus de 10 % engagée par une autre personne que le dirigeant ; de même pour un devis de plus de 5 000 € HT signé par la cheffe de projet | I-11 | `hypothèse` | conçu depuis l'interdit |
| T-12 | un forfait vendu 18 jours, dont les temps saisis sur le projet atteignent 27 jours | le contrôle rapproche les temps du projet et les jours vendus | le projet est signalé « à vérifier » : 150 % des jours vendus, au-delà de 110 % ; l'alerte était due dès 90 %, l'escalade à 100 % (E-07) | I-12 | `hypothèse` | conçu depuis l'interdit |
| T-13 | un domaine géré par l'agence qui expire dans 25 jours, sans renouvellement | le contrôle quotidien des échéances | alerte : expiration dans moins de 30 jours, avec la date, le client et le registrar ; nouvelle alerte à 7 jours | I-13 | `hypothèse` | conçu depuis l'interdit |
| T-13b | un domaine géré par l'agence dont la date d'expiration n'est pas connue | le contrôle quotidien des échéances | alerte : date d'expiration inconnue, en tête de liste, jamais tenue pour lointaine | I-13 | `hypothèse` | conçu depuis l'interdit |
| T-14 | un client e-commerce dont l'agence héberge la base de clients, sans contrat de sous-traitance au dossier | le contrôle lit les clients hébergés | le client est signalé « à vérifier » : contrat de sous-traitance (article 28 du RGPD) absent | I-14 | `hypothèse` | conçu depuis l'interdit |
| T-15 | une facture impayée, quinze jours après l'échéance | la commerciale demande d'envoyer la relance | l'outil prépare un brouillon et ne l'envoie pas : il attend le oui du dirigeant | I-15 | `hypothèse` | conçu depuis l'interdit |

<!-- /registre:tests -->

Les trois pires incidents *(inventés)*, qui donnent la mesure de l'enjeu :
- le forfait de 18 jours passé à 27 : vu à la recette, 9 jours non facturés,
  environ 5 000 € de marge (T-12) ;
- la base écrasée un vendredi : restaurée le lundi depuis la sauvegarde de la
  veille, une journée de commandes perdue pour un client e-commerce, un mois
  de TMA offert en geste commercial (T-03) ;
- le domaine expiré : trois jours de site et de mails coupés, le client parti
  six mois plus tard (T-13).

**Bug ou évolution** *(inventé)* : un client TMA demande « que le formulaire
envoie aussi une copie au commercial ». Le développeur le fait en une heure,
en « bug ». Le mois suivant, « et aussi un export CSV » : trois jours. Le
client tient que c'est le même sujet ; réglé par un devis à moitié prix,
l'agence a payé l'autre moitié (T-05).

## 3. Connecteurs

| Outil ou catégorie | Usage | Étape | Accès | Lecture / écriture | Qui le tient | Statut |
|---|---|---|---|---|---|---|
| Tickets et projets (Jira) | lots, tickets, états, affectations, estimation, type bug ou évolution | 5, 7, 12 | export CSV, API REST | lecture en v1 | cheffe de projet | `déclaré` |
| Suivi du temps (Notion, une base par personne) | temps saisi par chacun, **projet par projet**, jamais au ticket | 7, 8, 12 | export CSV, API | lecture | chaque personne saisit, la cheffe de projet contrôle | `déclaré` |
| Documentation des projets (Confluence) | cadrage, décisions, comptes rendus de recette, procédures de déploiement | 2, 8, 9 | export, API | **pas en v1** : du texte libre, pas des données | cheffe de projet | `déclaré` |
| Code et CI (GitHub, dépôts privés) | branches, revues, déploiements, qui a accès à quel dépôt | 7, 9 | API | lecture | développeurs | `déclaré` |
| Devis et factures | devis, factures, avoirs, paiements, relances | 3, 4, 10, 11 | export CSV, API | lecture | dirigeant ; la commerciale pour les devis | `déclaré` |
| CRM | prospects, contacts, relances commerciales | 1 | le même outil que les devis | lecture | commerciale | `déclaré` |
| Hébergeur, registrar | domaines, certificats, serveurs | 9, ↻ | console, API | lecture | dirigeant, un développeur | `déclaré` |
| Messagerie | validations écrites, PV signés, contrats | 4, 6, 8, 9 | boîte partagée | **aucun en v1** | tous | `déclaré` |
| Comptabilité | tenue par le cabinet | 11 | export | aucun en v1 | cabinet | `déclaré` |
| Registre des accès | qui a accès à quoi, depuis quand | 7, 9, 12 | tableur ; pour le code, les collaborateurs des dépôts GitHub | lecture | dirigeant (mal tenu) | `déclaré` |

**Ce que la v1 ne lit pas** : la messagerie, où vivent les accords écrits,
les validations de maquettes et les PV signés en pièce jointe. Un contrôle
qui en dépend (l'accord écrit d'I-02 et d'I-03) le dit, et laisse la
confirmation à un humain.

**Le temps passé** est saisi par chacun dans sa base, projet par projet, pas
au ticket : le rapprochement temps / devis se fait à la maille du projet (ou
du lot, quand la personne le note), jamais du ticket. En théorie chaque jour,
en pratique le vendredi, de mémoire : environ 10 % d'écart avec la réalité,
et des demi-journées « divers » qu'on ne sait pas rattacher.

## 4. Moments d'escalade

<!-- registre:escalades — généré depuis le registre (pnpm registre:generer), ne pas éditer à la main -->

| ID | Déclencheur | Étape | Qui reprend | Délai | Ce qu'on lui présente | Statut |
|---|---|---|---|---|---|---|
| E-01 | un devis ou un avenant à signer, une remise de plus de 10 % | 3, 4 | dirigeant | avant l'envoi | le devis ou l'avenant, ses lots, son montant HT, la remise, le signataire prévu (I-11) | `déclaré` |
| E-02 | une demande hors devis de plus d'une demi-journée | 5, 7, 12 | dirigeant (cheffe de projet en son absence, sous 5 000 € HT) | avant de commencer | la demande, son estimation, le lot ou le contrat TMA le plus proche, les jours vendus qui restent (I-02) | `déclaré` |
| E-03 | un client conteste une facture ou menace de partir | 11, 12 | dirigeant | le jour même | la facture, le PV ou le relevé de temps sur lequel elle repose, les relances déjà faites, le contrat | `déclaré` |
| E-04 | un incident de production : site hors ligne, données perdues ou exposées | 9, 12 | développeur d'astreinte, puis dirigeant au-delà de 2 h | immédiat ; le week-end, on remet en ligne sans rien déployer de neuf | le site, l'heure de la coupure, la dernière mise en production et la dernière sauvegarde (I-03) | `déclaré` |
| E-05 | une demande d'accès à la production | 7, 9 | dirigeant | avant de donner l'accès | la ressource, la personne, le projet, la durée demandée, les accès qu'elle a déjà (I-04) | `déclaré` |
| E-06 | une demande qui ne correspond à aucun lot, aucun contrat, aucun client connu | 1, 12 | cheffe de projet | sous 24 h | la demande telle qu'elle est arrivée, et les clients, projets et contrats les plus proches | `déclaré` |
| E-07 | un forfait atteint 100 % des jours vendus | 7, 8 | dirigeant | dans la semaine | les jours vendus et consommés, le reste à faire estimé, les tickets rattachés à aucun lot (I-12) | `déclaré` |
| E-08 | une relance d'impayé au troisième niveau (J+60) | 11 | dirigeant | avant l'envoi | la facture, son échéance, les relances déjà faites, le brouillon de mise en demeure (I-15) | `déclaré` |

<!-- /registre:escalades -->

Les familles (`GRILLE.md` § 4) : **responsabilité** pour E-01, E-02, E-03,
E-05, E-07 et E-08 ; **urgence** pour E-04 ; **incertitude** pour E-06.

**Le vendredi à 18 h** : une demande qui arrive le soir ou le week-end
attend le lundi, sauf un site hors ligne. Un développeur est joignable le
week-end, à tour de rôle ; il remet en ligne, ne déploie rien de neuf, et le
dirigeant décide le lundi de ce qu'on facture (E-04).

## 5. Vocabulaire

| Terme | Définition | Synonymes, abréviations | Piège | Statut |
|---|---|---|---|---|
| Projet | un devis signé et ce qui en découle, jusqu'à la garantie | — | le client appelle « projet » son site entier, TMA comprise | `déclaré` |
| Lot | une partie du devis, facturable séparément | — | — | `déclaré` |
| Ticket | une unité de travail dans l'outil, rattachée à un lot ou à un contrat TMA | — | un ticket « divers » n'est rattaché à rien | `déclaré` |
| Bug | un défaut sur une fonction recettée, gratuit sous garantie ou dans les heures TMA | — | **le mot le plus cher de la maison** : le client dit « bug » pour tout ce qu'il n'aime pas (I-05) | `déclaré` |
| Évolution | tout ce qui n'est pas un bug : nouveau, modifié, « petite retouche » | « petit truc », « juste », « au passage » | ces mots annoncent du travail hors devis (I-02) | `déclaré` |
| Recette | la vérification par le client, sur la préprod, contre les tickets du lot | — | « on a regardé, c'est bien » n'est pas une recette | `déclaré` |
| PV | le document signé qui clôt la recette, avec ou sans réserves | procès-verbal de recette | une réserve bloquante empêche la facture, une réserve mineure non (I-01) | `déclaré` |
| Livré | en production, PV signé | — | le client dit « livré » dès la préprod ; le développeur, quand la branche est fusionnée | `déclaré` |
| Terminé, validé | « terminé » : le développeur a fini ; « validé » : le client a dit oui par écrit | — | un oui oral n'est pas « validé » | `déclaré` |
| Mise en prod | le déploiement sur le serveur du client, après accord écrit | mise en production | — | `déclaré` |
| TMA | contrat mensuel avec des heures incluses | maintenance | « c'est dans la maintenance », pour une évolution | `déclaré` |
| Régie | jours vendus, facturés au réel chaque mois sur relevé validé | — | — | `déclaré` |
| Forfait | prix fixe pour un périmètre fixe | — | le périmètre, lui, bouge | `déclaré` |
| Jour-homme, TJM | l'unité de chiffrage ; le TJM de vente est distinct du coût journalier | jour, TJM | le TJM de vente n'est pas secret, le coût l'est | `déclaré` |
| Avenant | un devis complémentaire signé, rattaché au projet | — | — | `déclaré` |
| Acompte, solde | 30 % à la signature, 70 % à la recette (ou par lot) | — | — | `déclaré` |
| Garantie | les trois mois qui suivent la mise en production, où les bugs sont gratuits | — | — | `déclaré` |
| Urgent | pour l'agence : site hors ligne ou perte de données | — | pour le client, « urgent » veut dire aujourd'hui ; tout le reste est « rapide » | `déclaré` |

**Les identifiants.** À l'oral, on dit le nom du client (« le site de la
boulangerie ») ; dans les outils : client `CLI-nn`, projet `PRJ-nn`, devis
`DEV-AAAA-nnn`, avenant `AVE-AAAA-nnn`, facture `FAC-AAAA-nnn` (numérotation
continue), ticket `TK-nnnn`, contrat TMA `TMA-nn`, personne de l'agence
`M-nn`, sous-traitant `ST-nn`, domaine par son nom. Le moteur y ajoute
`CT-nn` (contact), `LOT-nnn` et `DOM-nn` (`PLAN-METIER-2.md`, M17).

## 6. Le bon résultat

Entre deux façons de faire, le dirigeant préfère celle qui **laisse une trace
écrite chez le client** (un mail de validation), même si elle coûte une
heure, à celle qui va plus vite sur un oui oral.

La semaine où tout ne tenait pas : lâchés en premier, le délai d'un projet
interne et les tickets « confort » des TMA ; puis le délai d'un forfait, en
prévenant le client. Jamais lâchés : une mise en production sans accord, une
facture sans PV, un site d'un client TMA hors ligne. Les deux premiers sont
des interdits (I-03, I-01) ; le troisième relève de l'urgence (E-04) et de
O-01 ci-dessous.

L'ordre déclaré : 1. ne pas perdre un client TMA (le récurrent) ; 2. la marge
d'un forfait ; 3. le délai ; 4. la charge de l'équipe, qui remonte en premier
dès qu'une personne dépasse deux semaines à plus de 100 %.

| ID | Objectif ou préférence | Étape | Qui y tient | Ordre de sacrifice | Statut | Source |
|---|---|---|---|---|---|---|
| O-01 | un client TMA n'attend jamais plus d'un jour ouvré pour un bug | 12 | dirigeant | jamais | `déclaré` | entretien simulé du 2026-10-12 |
| O-02 | un forfait reste sous 100 % des jours vendus | 7, 8 | dirigeant, cheffe de projet (ses KPI) | lâché après O-01 | `déclaré` | entretien simulé du 2026-10-12 |
| O-03 | le délai annoncé est tenu | 5 à 9 | client, cheffe de projet | lâché en premier, en prévenant le client | `déclaré` | entretien simulé du 2026-10-12 |
| O-04 | personne au-dessus de 100 % de charge deux semaines de suite | 5 | équipe, dirigeant | lâché avant O-02, jamais plus de deux semaines | `déclaré` | entretien simulé du 2026-10-12 |
| O-05 | chaque projet a une personne qui le connaît, en dehors du développeur principal | 5, 12 | dirigeant | lâché quand il manque quelqu'un | `déclaré` | entretien simulé du 2026-10-12 |

O-01 ne se sacrifie jamais : selon `GRILLE.md` § 6, c'est un interdit qui
s'ignore. Il reste ici tant que le client ne l'a pas dit en ces termes ; à
reposer au prochain entretien.

## 7. Les données

| ID | Donnée | Sert à | Où elle vit | Fraîcheur, fiabilité | Qui la tient | Statut |
|---|---|---|---|---|---|---|
| D-01 | clients et contacts | désignation, relances | CRM, outil devis | bonne | commerciale | `déclaré` |
| D-02 | projets : client, type, lots, jours vendus, dates, état | tout | Jira (projets, lots), outil devis (jours vendus) | bonne pour les lots, moyenne pour les dates | cheffe de projet | `déclaré` |
| D-03 | devis et avenants : lots, jours, montants HT, état, signataire, date | I-02, I-10, I-11, rapprochement | outil devis | bonne | dirigeant | `déclaré` |
| D-04 | tickets : projet ou TMA, lot, type bug ou évolution, état, personne, estimation | I-02, I-05, planification | Jira | moyenne : le type est souvent vide | cheffe de projet | `déclaré` |
| D-05 | temps passé : personne, **projet**, date, durée | I-12, rapprochement, régie | Notion, une base par personne | **moyenne, une semaine de retard, à la maille du projet seulement** | chacun | `déclaré` |
| D-06 | factures et paiements : numéro, projet, montants HT et TTC, échéance, état, date de paiement | I-01, I-07, relances | outil devis et factures | bonne | dirigeant | `déclaré` |
| D-07 | recettes et PV : projet, lot, date, réserves | I-01, I-05 | mails, PV signés en pièce jointe, compte rendu en texte libre dans Confluence : aucune table | **faible : rien de structuré** | cheffe de projet | `déclaré` |
| D-08 | contrats TMA : client, heures incluses, début, fin, préavis | I-05, échéances | outil devis | bonne | commerciale | `déclaré` |
| D-09 | accès : ressource, personne, depuis, jusqu'à | I-04 | tableur ; pour le code, les collaborateurs des dépôts GitHub, lisibles par l'API | **faible** pour le tableur, bonne pour GitHub | dirigeant | `déclaré` |
| D-10 | domaines et certificats : nom, client, registrar, expiration | I-13 | registrar, hébergeur | bonne, mais dispersée | un développeur | `déclaré` |
| D-11 | sous-traitants : montant annuel, attestation URSSAF et sa date | I-09 | dossier | faible | dirigeant | `déclaré` |
| D-12 | personnes de l'agence : rôle, TJM de vente, coût journalier | marge, droits | tableur du dirigeant | bonne, **confidentielle** | dirigeant | `déclaré` |

Deux données dont dépend un interdit sont faibles, et c'est le premier
risque à lever (`GRILLE.md` § 7) : les PV (D-07, pour I-01) et le registre des
accès (D-09, pour I-04). Une ligne au hasard : un devis, juste ; une facture,
juste ; un temps saisi, à 10 % près, et le ticket noté est parfois le mauvais.

Volumes déclarés (donnée client) : 25 clients actifs, dont 12 en TMA ; 6 à
8 projets en cours ; 30 à 50 tickets par semaine ; 15 à 25 factures par mois ;
6 personnes, 2 ou 3 freelances dans l'année. Montants : HT partout en
interne, TTC sur la facture, en euros avec centimes ; les devis en jours ×
TJM, donc en jours et en euros ; les contrats TMA en heures et en euros par
mois.

### Les échéances (Veiller)

| Échéance | Où elle vit | Qui prévient aujourd'hui | Temps pour agir | Avance de l'alerte |
|---|---|---|---|---|
| échéance d'une facture (30 jours, 45 jours fin de mois) | outil factures | l'outil, par mail au dirigeant | une relance : 10 min | J+1, J+15, J+30 après l'échéance |
| fin de garantie (3 mois après la mise en production) | nulle part | personne | proposer une TMA : une semaine | 1 mois avant |
| fin, renouvellement ou préavis d'un contrat TMA | outil devis | personne | renégocier : un mois | préavis + 1 mois |
| expiration d'un domaine, d'un certificat | registrar, hébergeur | le mail du registrar, souvent perdu | renouveler : une heure, mais le paiement peut traîner | 30 jours, puis 7 (I-13) |
| fin de support d'une version (framework, PHP, CMS) | nulle part | personne | migrer : des jours | 6 mois |
| attestation de vigilance d'un sous-traitant | dossier | personne | la demander : une semaine | 1 mois avant les 6 mois (I-09) |
| forfait à 90 %, puis 100 % des jours vendus | suivi du temps, devis | personne (le rapprochement mensuel) | prévenir le client, avenant : une semaine | dès 90 % (E-07, I-12) |
| PV de recette non signé 15 jours après la recette | nulle part | personne | relancer : 10 min | J+15 (I-01) |
| devis sans réponse | CRM | la commerciale, de tête | relancer : 10 min | J+10, J+30 |

Le dernier délai manqué *(inventé)* : le domaine expiré ; personne ne s'en
est aperçu avant la coupure. Une date d'expiration inconnue est une alerte
(I-13), jamais un silence.

### Le rapprochement (Rapprocher)

Aujourd'hui, la cheffe de projet croise une fois par mois, dans un tableur,
trois exports : les temps (personne par personne), les tickets, les devis.
Une demi-journée par mois, et un résultat qui arrive jusqu'à cinq semaines
après le dépassement. Ses KPI en dépendent : marge par projet, taux de
dépassement, facturé contre vendu. Le dirigeant veut être prévenu à **90 %**
des jours vendus d'un lot ou d'un projet, à **80 %** des heures d'un contrat
TMA dans le mois, et dès qu'un ticket passé en « évolution » n'est rattaché
ni à un devis ni à un avenant (I-02).

Ce qui est ressaisi : le devis vers les tickets (les lots), une heure par
projet ; les temps vers le tableur du rapprochement, une demi-journée par
mois ; les PV et les validations, des mails vers une page de texte libre,
donc vers rien d'exploitable. Les exigences propres à chaque client (un bon
de commande obligatoire avant facture, un portail fournisseur, un PV sur le
modèle du client) ne sont écrites nulle part : elles sont dans la tête de la
commerciale et de la cheffe de projet.

Les relances : devis sans réponse, la commerciale à J+10 puis J+30 ; facture
impayée, rappel automatique de l'outil à J+1, la commerciale à J+15, le
dirigeant au téléphone à J+30, la mise en demeure à J+60 décidée par lui seul
(E-08, I-15) ; recette non signée, la cheffe de projet à J+15.

### Qui voit quoi

| Rôle | Voit | Ne voit pas | Peut proposer (rien ne s'écrit en v1) |
|---|---|---|---|
| dirigeant | tout : marge, coûts journaliers, factures, temps de tous, accès | — | il valide tout : relances, avenants |
| cheffe de projet / PO | une vue transversale sur tous les projets, **données financières comprises** : lots, tickets, temps par personne, jours consommés contre vendus, devis, factures, encours, marge par projet, coûts journaliers, PV | ce qui relève des personnes (salaires, contrats de travail, entretiens) | qualifier un ticket, le réaffecter, relancer un PV, demander un avenant |
| commerciale | clients, contacts, devis, état et montants des factures, avancement des projets en %, heures TMA consommées | le temps par personne, les coûts journaliers, la marge | un brouillon de relance de devis ou de facture, un brouillon de devis |
| graphiste | ses tickets, ses temps, le planning de ses projets, les maquettes à valider | les montants | déclarer une absence, demander une précision |
| développeur | ses tickets, ses temps, les branches et déploiements de ses projets, le registre des accès de ses projets | les montants | déclarer une absence, signaler un ticket mal qualifié, demander un accès (E-05) |

Trois niveaux de vue : **tout** (dirigeant, PO), **le commerce**
(commerciale), **soi-même** (graphiste, développeur). Le dirigeant et la PO
ne diffèrent pas par les données du métier, mais par le droit d'engager
(I-11) et par ce qui relève des personnes. Un sous-traitant ou un freelance
n'a accès qu'au dépôt et aux tickets de son projet, pour sa durée, consigné
au registre et révoqué à la fin (I-04) ; jamais à l'outil, au temps des
autres ni aux montants. Le client final demande où en est son projet par mail
ou par téléphone ; il ne voit jamais les heures, le temps par personne, la
marge, ni les autres clients. Ni l'un ni l'autre n'a d'accès en v1.

### Ce qui ne sort jamais

Le code et les données des clients (bases, comptes), les maquettes avant
livraison, les TJM d'achat et les coûts, la liste des clients (G-06, I-06).
Deux clients imposent un NDA ; les clients e-commerce dont l'agence héberge
la base imposent, ou devraient imposer, un contrat de sous-traitance (I-14).
Messagerie et documents chez un fournisseur américain (suite bureautique en
ligne), le code chez un hébergeur de dépôts américain, les sites des clients
chez un hébergeur français.

Les phrases que chaque rôle dit à l'outil, avec ce qu'une bonne réponse
contient et les refus attendus, sont dans l'entretien (§ 12) : c'est la
matière des évals du métier (`PLAN-METIER-2.md` § 9), pas de cette fiche.

## 8. Briques à proposer

Ce que le dirigeant laisse faire **sans qu'on lui demande** : lire, compter,
rapprocher, préparer un brouillon de relance, alerter sur une échéance, dire
qu'un ticket n'est rattaché à rien. **Jamais sans un oui** : envoyer quoi que
ce soit à un client, émettre une facture, qualifier définitivement un ticket,
donner ou retirer un accès, modifier un devis (G-01).

| ID | Brique | Douleur qu'elle traite | Interdits qu'elle doit respecter | Ce qui la qualifie (questions) | Statut |
|---|---|---|---|---|---|
| B-01 | **Rapprochement continu** temps / devis / factures, avec l'alerte à 90 % des jours vendus et à 80 % des heures TMA : « une seule chose », dit le dirigeant | la marge fuit, et on le voit jusqu'à cinq semaines trop tard | I-02, I-12 ; E-02, E-07 | les temps sont-ils saisis chaque jour ou le vendredi ; à quelle maille (projet, lot) ; qui lit l'alerte, et que fait-il ce jour-là | `déclaré` |
| B-02 | **Veille des échéances** : domaines, certificats, garanties, contrats TMA, attestations, fins de support, PV non signés | un domaine expiré un samedi ; une garantie finie sans proposer de TMA | I-04, I-09, I-13 | combien de domaines et de certificats, chez combien de registrars ; qui reçoit les mails aujourd'hui ; les dates sont-elles toutes connues | `déclaré` |
| B-03 | **Contrôles avant facture et avant mise en production** : PV signé, délai et pénalités, sauvegarde, clause de cession, contrat de sous-traitance | facture contestée, base écrasée | I-01, I-03, I-07, I-08, I-10, I-14 | qui émet les factures, et depuis quel outil ; où est l'accord écrit du client ; la sauvegarde est-elle datée quelque part | `déclaré` |
| B-04 | **Brouillons de relance** (impayés, PV, devis), jamais envoyés seuls | relances oubliées ou envoyées au mauvais ton | I-15 ; E-08 | combien d'impayés par mois ; qui valide ; le ton par niveau | `déclaré` |
| B-05 | **L'état du projet, rôle par rôle** : l'avancement, les tickets, le temps, sans montrer à chacun plus que son niveau de vue | « où en est mon projet », répondu de tête ; un rapprochement que seule la PO sait faire | I-06, I-11 | qui pose la question le plus souvent ; ce que chaque rôle ne doit jamais voir | `déclaré` |

---

## Questions ouvertes

### À trancher sur texte ou par un juriste (pas chez le client)

Le client dira ce qu'il **applique**, pas ce qui est **dû**. Aucun des textes
ci-dessous n'est relu : jusqu'à leur relecture mot à mot, dans leur version
en vigueur, les interdits qui s'y adossent ne rendent que « à vérifier ».
- **L441-10 et L441-9 du code de commerce** (I-07) : le plafond de 60 jours,
  ou de 45 jours fin de mois ; les pénalités et l'indemnité de 40 €. Et
  « 45 jours fin de mois » se lit de deux façons : les 45 jours, puis la fin
  du mois atteint, ou la fin du mois, puis les 45 jours. Le moteur prend la
  première (`PLAN-METIER-2.md` § 10).
- **L8222-1 du code du travail** (I-09) : le seuil de 5 000 € HT et la
  périodicité de six mois sont-ils dans l'article lui-même, ou dans un texte
  d'application à citer ? Et le seuil est-il « plus de 5 000 € » (l'entretien,
  ce que le code applique) ou « au moins égal à 5 000 € » ?
- **L131-3 du code de la propriété intellectuelle** (I-10) : ce qu'une clause
  de cession doit contenir pour valoir (étendue, destination, lieu, durée), et
  si une clause au devis suffit.
- **Article 28 du RGPD** (I-14) : quand l'agence est-elle sous-traitante :
  l'hébergement revendu seulement, ou aussi la TMA avec un accès à la base ?
- **I-08, les mentions obligatoires de la facture** : l'entretien ne cite
  aucun article ; lesquels, et quelles mentions exactement ? Et ces mentions
  **ne sont pas dans les exports** : l'outil devis et factures donne le
  numéro, les dates et les montants, pas le SIREN, l'adresse ni la
  désignation. I-08 n'est pas codé en v1 ; il le sera sur la facture émise,
  ou par un export plus complet.
- **L'accessibilité** : absente de l'entretien et du plan. L'obligation
  d'accessibilité des services de commerce en ligne, en vigueur depuis 2025,
  est-elle un interdit pour l'agence qui livre un site e-commerce ? Quel
  texte, quel référentiel, et qui en répond (l'agence ou son client) ?

### Deux lectures à confirmer par le dirigeant

- **I-04 sous contrat TMA** : un projet clos qu'un contrat TMA maintient garde
  les accès des personnes de l'agence tant que le contrat court ; à sa fin
  (l'échéance de fin de TMA), ils sont à révoquer. Un sous-traitant, lui, perd
  son accès à la fin du projet. L'entretien dit « à la fin du projet » et
  définit le projet « jusqu'à la garantie » : est-ce bien ainsi qu'on l'entend ?
- **I-11 en l'absence du dirigeant** : la cheffe de projet signe jusqu'à
  5 000 € HT ; une remise de plus de 10 % dans ce plafond reste-t-elle au
  dirigeant seul (E-01), ou la délégation la couvre-t-elle ? Le code prend la
  seconde lecture.

### Les seuils (déclarés, à confirmer avec un document)

Des valeurs dites à l'entretien, sans document vu : l'alerte à **90 %** des
jours vendus (B-01), le plafond de **110 %** (I-12), l'alerte à **80 %** des
heures TMA, la délégation de signature à **5 000 € HT** (I-11), la remise de
plus de **10 %** (I-11, E-01). Pareil pour les délais : la sauvegarde de
moins de 24 h (I-03), l'alerte 30 jours avant une expiration (I-13), la
demi-journée du « petit » travail hors devis (I-02, E-02). « Vous pouvez me
montrer où c'est écrit ? »

### Les incidents à dater

Tous sont inventés. Un incident réel daté fait passer son interdit en
`constaté`, et permet alors le refus (`PLAN-METIER-2.md` § 10, point 3) :
- la facture contestée six mois, payée à 60 % (I-01) ;
- le forfait de 18 jours passé à 27 (I-02, I-12) ;
- la base écrasée un vendredi soir (I-03) ;
- l'ancien freelance encore admin deux ans après (I-04) ;
- le domaine expiré un samedi (I-13) ;
- la facture de solde émise sur un « c'est bon » oral, contestée sur deux
  réserves (I-01).

### Dirigeant
- « La dernière facture contestée : c'était quand, et sur quoi ? » (I-01)
- « La délégation de signature à la cheffe de projet, elle est écrite
  quelque part ? » (I-11)
- « Le registre des accès : montrez-moi. Il date de quand, la dernière
  mise à jour ? » (I-04, D-09)
- « Un client TMA qui attend plus d'un jour ouvré pour un bug : ça s'est
  déjà fait ? » (O-01 : préférence ou interdit)
- « Les sous-traitants : où sont leurs attestations ? Combien leur avez-vous
  payé cette année ? » (I-09, D-11)

### Cheffe de projet / PO
- « Montrez-moi un PV signé, et dites-moi où vous l'avez rangé. » (D-07)
- « Le dernier "petit" travail hors devis : combien de temps, au final ? »
  (I-02, E-02)
- « Qui qualifie un ticket en bug ou en évolution, et sur quoi ? » (I-05)
- « Les exigences de vos grands comptes (bon de commande, portail, modèle de
  PV) : où les retrouver ? »

### Commerciale
- « Une promesse faite au rendez-vous qui n'est pas dans le devis : ça
  arrive combien de fois ? » (le passage 1→5)
- « Les devis sans réponse : vous les suivez comment ? »

### Développeurs
- « La dernière mise en production : il y avait une sauvegarde, et l'accord
  du client, où ? » (I-03)
- « Les domaines et les certificats : qui reçoit les mails du registrar ? »
  (I-13, D-10)
- « Les versions des frameworks et des CMS de vos sites : où sont-elles
  notées ? » (la fin de support, sans donnée aujourd'hui)
