# Agence web — entretien simulé (2026-10-12)

Réponses au questionnaire d'entretien (`methode/socle.md` § 4, archétypes
Rapprocher et Veiller, `methode/audit-second-metier-2026-10-12.md`) **écrites
par le modèle à la demande de Lionel**, dans le rôle du dirigeant d'une agence
web fictive de six personnes, puis **relues et confirmées par Lionel le
2026-10-12** (« tout vrai mais… »), avec quatre corrections : les temps sont
saisis dans Notion par chacun, projet par projet ; les tickets passent par
Jira ; la documentation des projets est dans Confluence ; le code est sur
GitHub en privé ; et la PO a une vue transversale, données financières
comprises, parce qu'elle a des KPI à tenir. Statuts (`GRILLE.md`) : ce qui
est confirmé est `déclaré` ; les incidents racontés sont inventés, marqués
*(inventé)*, et restent `hypothèse` tant qu'un incident réel n'est pas daté ;
les textes cités restent sans ✓ tant qu'ils ne sont pas relus. Aucun nom
réel : les prénoms et les clients sont fictifs.

L'agence : un dirigeant (associé unique), une commerciale, une cheffe de
projet / product owner, un graphiste UI, deux développeurs. Prestations :
sites et applications au forfait, de la régie, des contrats de maintenance
(TMA) au mois, un peu d'hébergement revendu.

---

## 0. La chaîne

**1. Le dernier projet livré, du premier contact à l'encaissement.**

| # | Étape | Entrée | Sortie | Qui | Sur quoi c'est écrit |
|---|---|---|---|---|---|
| 1 | Prise de contact | appel, formulaire, recommandation | fiche prospect | commerciale | CRM (le même outil que les devis) |
| 2 | Cadrage | rendez-vous, cahier des charges du client | note de cadrage, liste des lots | commerciale + cheffe de projet | Confluence (une page par projet) |
| 3 | Chiffrage | note de cadrage | devis en jours × TJM, par lot | cheffe de projet chiffre, dirigeant relit | outil devis/factures |
| 4 | Signature | devis | devis signé, acompte 30 % facturé | commerciale envoie, **dirigeant signe** | outil devis/factures, mail |
| 5 | Planification | devis signé | projet créé, lots → tickets, dates, personnes | cheffe de projet | Jira |
| 6 | Maquettes | tickets de design | maquettes, validation client écrite | graphiste, cheffe de projet | outil de design, mail de validation, page Confluence du projet |
| 7 | Développement | maquettes validées, tickets | branches, revue, préprod | développeurs | GitHub (dépôts privés), CI, Jira |
| 8 | Recette | préprod | procès-verbal de recette signé (ou réserves) | cheffe de projet + client | document signé, mail, page Confluence du projet |
| 9 | Mise en production | PV sans réserve bloquante, accord écrit | site en ligne, accès remis | développeur, cheffe de projet | GitHub, hébergeur, registre des accès |
| 10 | Facturation du solde | PV signé | facture de solde, 70 % ou par lot | dirigeant (ou cheffe de projet à la demande) | outil devis/factures |
| 11 | Encaissement | facture | paiement, ou relance à J+30, J+45, J+60 | commerciale relance, dirigeant au-delà | outil devis/factures, banque |
| 12 | Maintenance | fin de garantie (3 mois) | contrat TMA mensuel, tickets de maintenance | commerciale vend, cheffe de projet suit | Jira, outil devis/factures |

**2. Ce qui se perd aux passages de main.**
- Commerciale → cheffe de projet : les promesses orales du rendez-vous (« on vous mettra aussi… ») qui ne sont pas dans le devis. C'est la première source de travail hors devis.
- Cheffe de projet → graphiste → dev : le « pourquoi » d'une maquette ; le dev découvre en codant qu'un écran manque.
- Dev → recette : ce qui a été fait « en plus » sans ticket, et qu'on ne sait plus si on doit le facturer.
- Recette → facturation : le PV qui traîne ; on facture sur un « c'est bon » oral, et le client conteste.
- Projet → maintenance : les accès (hébergeur, registrar, comptes tiers) créés pendant le projet et jamais consignés.

**3. Les cycles.** Chaque semaine : point d'équipe lundi, revue des temps vendredi. Chaque mois : facturation des TMA et des régies au 1er, relances des impayés, rapprochement temps/devis par projet. Chaque année : renouvellement des domaines et certificats (groupés en janvier, mais pas tous), révision des TJM, attestations des sous-traitants (tous les six mois).

**4. Où ça coince le plus souvent.** Entre le forfait vendu et le temps réel : on s'en rend compte à la recette, trop tard. Dernier cas *(inventé)* : un site vitrine vendu 18 jours, 27 jours passés, parce que le client a changé trois fois la page d'accueil « en petites retouches ». Aucune retouche n'a fait l'objet d'un avenant.

**5. Les prestations et leur chaîne.**
- **Forfait** : la chaîne ci-dessus ; le risque est le dépassement.
- **Régie** (jours vendus, facturés au réel chaque mois) : pas de PV, un relevé de temps validé par le client chaque mois ; le risque est le temps non saisi.
- **TMA / maintenance** : un contrat mensuel avec un nombre d'heures incluses ; les tickets au-delà sont facturés ; le risque est le « bug ou évolution ».
- **Hébergement revendu** : une ligne annuelle ; le risque est l'expiration (domaine, certificat).

## 1. Les interdits

**6 à 13. Ce qui ne doit jamais arriver**, avec l'incident s'il y en a un.

| ID | Interdit (testable) | Conséquence | Vérifiable par | Statut | Incident |
|---|---|---|---|---|---|
| I-01 | Aucune facture de solde ou de lot émise sans PV de recette signé (forfait) ou sans relevé de temps validé par le client (régie) | contestation, impayé | code (PV présent et daté avant la facture) | hypothèse | *(inventé)* facture contestée six mois, payée à 60 % |
| I-02 | Aucun travail hors du périmètre du devis sans avenant signé ou accord écrit (un mail suffit) | marge perdue, litige | code (ticket rattaché à un lot vendu ou à un avenant) | hypothèse | *(inventé)* les 9 jours de retouches ci-dessus |
| I-03 | Aucune mise en production sans accord écrit du client et sans sauvegarde datée de moins de 24 h | perte de données, perte du client | code (ligne d'accord + ligne de sauvegarde avant la ligne de mise en prod) | hypothèse | *(inventé)* une base écrasée un vendredi soir, restaurée le lundi |
| I-04 | Aucun accès (hébergeur, registrar, admin du site, dépôt) hors du registre des accès ; un accès est révoqué au départ d'une personne ou à la fin du projet | sécurité, RGPD | code (registre) | hypothèse | *(inventé)* un ancien freelance encore admin d'un site deux ans après |
| I-05 | Un ticket n'est traité en « bug » (gratuit sous garantie ou dans les heures du contrat) que s'il porte sur une fonction recettée ; sinon il est une « évolution » et attend un devis ou un décompte | marge perdue | humain (la qualification), code (le périmètre recetté existe) | hypothèse | — |
| I-06 | Aucune donnée, maquette, code ou accès d'un client ne passe à un autre client | perte du client, NDA | code (cloisonnement par projet) | hypothèse | — |
| I-07 | Aucune facture avec un délai de paiement supérieur à 60 jours (ou 45 jours fin de mois), et chaque facture porte les pénalités de retard et l'indemnité forfaitaire de 40 € | amende | code | hypothèse (texte : L441-10 et L441-9 du code de commerce, à relire) | — |
| I-08 | Aucune facture sans ses mentions obligatoires (numéro continu, dates, TVA, SIREN, adresse, désignation) | amende, rejet | code | hypothèse (texte, à relire) | — |
| I-09 | Aucun sous-traitant payé plus de 5 000 € HT par an sans attestation de vigilance URSSAF de moins de six mois | solidarité financière | code (date de l'attestation) | hypothèse (texte : L8222-1 du code du travail, à relire) | — |
| I-10 | Aucune livraison sans clause écrite de cession des droits d'auteur (étendue, durée, territoire) pour les créations livrées | contestation de propriété | code (clause présente au devis ou au contrat) | hypothèse (texte : L131-3 du CPI, à relire) | — |
| I-11 | Un devis, un avenant ou une remise de plus de 10 % n'est engagé que par le dirigeant ; en son absence, par la cheffe de projet jusqu'à 5 000 € HT | engagement non voulu | code (signataire et plafond) | hypothèse | — |
| I-12 | Un projet au forfait ne dépasse pas 110 % des jours vendus sans que le dirigeant ait été prévenu avant | marge | code (temps saisi / jours vendus) | hypothèse | — |
| I-13 | Aucun domaine ni certificat géré par l'agence n'expire sans alerte 30 jours avant ; une date d'expiration inconnue est une alerte | site hors ligne | code | hypothèse | *(inventé)* un domaine expiré un samedi, site et mails coupés trois jours |
| I-14 | Aucune donnée personnelle hébergée pour un client sans contrat de sous-traitance (article 28 RGPD) | sanction | code (document présent) | hypothèse (texte, à relire) | — |
| I-15 | Aucune relance d'impayé n'est envoyée au client sans que le dirigeant l'ait validée ; le brouillon est préparé, jamais envoyé seul | relation client | humain | hypothèse | — |

**11. Qui engage l'agence.** Le dirigeant signe les devis, les avenants, les contrats et envoie les factures. La commerciale envoie les devis mais ne les signe pas. En l'absence du dirigeant (congé), la cheffe de projet signe jusqu'à 5 000 € HT et peut émettre une facture dont le PV est signé ; au-delà, ça attend.

**12. Le travail hors devis.** Il se décide trop souvent à l'oral, entre la cheffe de projet et le client. La règle de la maison : « petit » (moins d'une demi-journée) on le fait, on le note, on le facture au prochain lot ou on l'offre explicitement ; au-delà, avenant. Le problème est que « petit » n'est jamais mesuré.

**13. Lequel des trois est déjà arrivé.** Les trois *(inventé)* : la facture sans PV (I-01), la mise en prod sans sauvegarde (I-03), l'accès jamais révoqué (I-04).

## 2. Les incidents (tests types)

**14. Les trois pires** *(inventés)* :
- Le forfait 18 jours / 27 jours : vu à la recette, 9 jours non facturés, environ 5 000 € de marge.
- La base écrasée un vendredi : restauration le lundi depuis une sauvegarde de la veille, une journée de commandes perdues pour un client e-commerce, un geste commercial d'un mois de TMA.
- Le domaine expiré : trois jours de site et de mails coupés, le client parti six mois plus tard.

**15. La marge qui fond.** On le sait quand la cheffe de projet fait le rapprochement du mois, donc jusqu'à cinq semaines après le dépassement. Pas plus tôt parce que les temps sont saisis en retard et que personne ne compare chaque semaine.

**16. Bug ou évolution.** Un client TMA demande « que le formulaire envoie aussi une copie au commercial ». Le dev le fait en une heure, en « bug ». Le mois suivant, « et aussi un export CSV » : trois jours. Le client considère que c'est le même sujet. Réglé par un devis à moitié prix. Qui a payé : l'agence, pour moitié.

## 3. Les outils (connecteurs)

**17 et 18.**

| Catégorie (éditeur chez nous) | Usage | Accès | Lecture / écriture | Qui le tient | Statut |
|---|---|---|---|---|---|
| Tickets et projets (**Jira**) | lots, tickets, états, affectations, estimation, type bug/évolution | export CSV, API REST | lecture en v1 | cheffe de projet | déclaré |
| Suivi du temps (**Notion**, une base par personne) | temps saisi par chacun, **projet par projet** (pas au ticket) | export CSV, API | lecture | chaque personne saisit, cheffe de projet contrôle | déclaré |
| Documentation des projets (**Confluence**) | cadrage, décisions, comptes rendus de recette, procédures de déploiement | export, API | lecture (pas en v1 : du texte libre, pas des données) | cheffe de projet | déclaré |
| Code et CI (**GitHub**, dépôts privés) | branches, revues, déploiements, qui a accès à quel dépôt | API | lecture | développeurs | déclaré |
| Devis et factures | devis, factures, avoirs, paiements, relances | export CSV, API | lecture | dirigeant, commerciale pour les devis | déclaré |
| CRM | prospects, contacts, relances commerciales | même outil que les devis | lecture | commerciale | déclaré |
| Hébergeur, registrar | domaines, certificats, serveurs | console, API | lecture | dirigeant, un développeur | déclaré |
| Messagerie | validations écrites, PV signés, contrats | boîte partagée | aucun en v1 | tous | déclaré |
| Comptabilité | tenue par le cabinet | export | aucun en v1 | cabinet | déclaré |
| Registre des accès | qui a accès à quoi, depuis quand | tableur (et, pour le code, les collaborateurs GitHub) | lecture | dirigeant (mal tenu) | déclaré |

**19. Le temps passé.** Saisi par chacun dans sa base Notion, **projet par projet**, pas au ticket : le rapprochement temps / devis se fait donc à la maille du projet (ou du lot si la personne le note), jamais du ticket. En théorie chaque jour, en pratique le vendredi de mémoire. Une semaine au hasard : environ 10 % d'écart avec la réalité, et des demi-journées « divers » qu'on ne sait pas rattacher.

## 4. Les escalades

**20.**

| ID | Déclencheur | Qui reprend | Délai | Famille |
|---|---|---|---|---|
| E-01 | devis ou avenant à signer, remise de plus de 10 % | dirigeant | avant envoi | responsabilité |
| E-02 | demande hors devis de plus d'une demi-journée | dirigeant (cheffe de projet en son absence, sous 5 000 €) | avant de commencer | responsabilité |
| E-03 | un client conteste une facture ou menace de partir | dirigeant | le jour même | responsabilité |
| E-04 | incident de production (site hors ligne, données) | dev d'astreinte, puis dirigeant si plus de 2 h | immédiat | urgence |
| E-05 | demande d'accès à la production | dirigeant | avant de donner | responsabilité |
| E-06 | une demande qui ne correspond à aucun lot, aucun contrat, aucun client connu | cheffe de projet | sous 24 h | incertitude |
| E-07 | forfait à 100 % des jours vendus | dirigeant | la semaine | responsabilité |
| E-08 | relance d'impayé au troisième niveau (J+60) | dirigeant | avant envoi | responsabilité |

**21. Vendredi 18 h, week-end.** Une demande client qui arrive le vendredi soir attend lundi, sauf un site hors ligne : un développeur est joignable le week-end (à tour de rôle), il remet en ligne, ne déploie rien de neuf, et le dirigeant décide lundi de ce qu'on facture.

## 5. Le vocabulaire et les mots-pièges

**22 et 23.**

| Terme | Définition (de la maison) | Piège |
|---|---|---|
| projet | un devis signé et ce qui en découle, jusqu'à la garantie | le client appelle « projet » son site entier, TMA comprise |
| lot | une partie du devis, facturable séparément | — |
| ticket | une unité de travail dans l'outil, rattachée à un lot ou à un contrat TMA | un ticket « divers » n'est rattaché à rien |
| bug | un défaut sur une fonction recettée, gratuit sous garantie ou dans les heures TMA | **le mot le plus cher de la maison** : le client dit « bug » pour tout ce qu'il n'aime pas |
| évolution | tout ce qui n'est pas un bug : nouveau, modifié, « petite retouche » | « petit truc », « juste », « au passage » |
| recette | la vérification par le client, sur la préprod, contre les tickets du lot | « on a regardé, c'est bien » n'est pas une recette |
| PV | le document signé qui clôt la recette, avec ou sans réserves | une réserve bloquante empêche la facture ; une réserve mineure non |
| livré | en production, PV signé | le client dit « livré » dès la préprod ; le dev dit « livré » quand la branche est fusionnée |
| terminé, validé | « terminé » (le dev a fini), « validé » (le client a dit oui par écrit) | un oui oral n'est pas « validé » |
| mise en prod | le déploiement sur le serveur du client, après accord écrit | — |
| TMA, maintenance | contrat mensuel avec des heures incluses | « c'est dans la maintenance » pour une évolution |
| régie | jours vendus, facturés au réel chaque mois sur relevé validé | — |
| forfait | prix fixe pour un périmètre fixe | le périmètre, lui, bouge |
| jour-homme, TJM | l'unité de chiffrage ; le TJM de vente est distinct du coût journalier | le TJM de vente n'est pas secret, le coût l'est |
| avenant | un devis complémentaire signé, rattaché au projet | — |
| acompte, solde | 30 % à la signature, 70 % à la recette (ou par lot) | — |
| garantie | trois mois après la mise en prod, les bugs sont gratuits | — |
| urgent | pour le client : aujourd'hui ; pour nous : site hors ligne ou perte de données | tout le reste est « rapide » |

**24. Les identifiants.** À l'oral on dit le nom du client (« le site de la boulangerie ») ; dans les outils : client `CLI-nn`, projet `PRJ-nn`, devis `DEV-AAAA-nnn`, avenant `AVE-AAAA-nnn`, facture `FAC-AAAA-nnn` (numérotation continue), ticket `TK-nnnn`, contrat TMA `TMA-nn`, personne de l'agence `M-nn`, sous-traitant `ST-nn`, domaine par son nom.

## 6. Le bon résultat et l'ordre de sacrifice

**25.** Entre deux façons de faire, je préfère celle qui laisse une trace écrite chez le client (un mail de validation) même si elle coûte une heure, à celle qui va plus vite sur un oui oral.

**26. La semaine où tout ne tenait pas.** Lâché en premier : le délai d'un projet interne et les tickets « confort » des TMA. Puis le délai d'un forfait, en prévenant le client. Jamais lâché : une mise en prod sans accord, une facture sans PV, un site d'un client TMA hors ligne.

**27. L'ordre.** 1. Ne pas perdre un client TMA (le récurrent). 2. La marge d'un forfait. 3. Le délai. 4. La charge de l'équipe, qui remonte en premier dès qu'une personne dépasse deux semaines à plus de 100 %.

| ID | Préférence | Ordre de sacrifice |
|---|---|---|
| O-01 | un client TMA n'attend jamais plus d'un jour ouvré pour un bug | jamais |
| O-02 | un forfait reste sous 100 % des jours vendus | lâché après O-01 |
| O-03 | le délai annoncé est tenu | lâché en premier, en prévenant |
| O-04 | personne au-dessus de 100 % deux semaines de suite | lâché avant O-02, pas plus de deux semaines |
| O-05 | chaque projet a une personne qui le connaît en dehors du dev principal | lâché quand il manque quelqu'un |

## 7. Les données

**28.**

| ID | Donnée | Sert à | Où elle vit | Fiabilité | Qui la tient |
|---|---|---|---|---|---|
| D-01 | clients et contacts | désignation, relances | CRM / devis | bonne | commerciale |
| D-02 | projets (client, type, lots, jours vendus, dates, état) | tout | Jira (projets, lots) + outil devis (jours vendus) | bonne pour les lots, moyenne pour les dates | cheffe de projet |
| D-03 | devis et avenants (lots, jours, montants HT, état, signataire, date) | I-02, I-11, rapprochement | outil devis | bonne | dirigeant |
| D-04 | tickets (projet ou TMA, lot, type bug/évolution, état, personne, estimation) | I-05, planification | Jira | moyenne (type souvent vide) | cheffe de projet |
| D-05 | temps passé (personne, **projet**, date, durée) | I-12, rapprochement, régie | Notion, une base par personne | **moyenne, en retard d'une semaine ; à la maille du projet seulement** | chacun |
| D-06 | factures et paiements (numéro, projet, montant HT/TTC, échéance, état, date de paiement) | I-01, I-07, relances | outil devis/factures | bonne | dirigeant |
| D-07 | recettes et PV (projet, lot, date, réserves) | I-01 | mails, PV signés en pièce jointe, compte rendu en texte libre dans Confluence : pas de table | **faible : rien de structuré** | cheffe de projet |
| D-08 | contrats TMA (client, heures incluses, début, fin, préavis) | I-05, échéances | outil devis | bonne | commerciale |
| D-09 | accès (ressource, personne, depuis, jusqu'à) | I-04 | tableur ; pour le code, les collaborateurs des dépôts GitHub (lisibles par l'API) | **faible** pour le tableur, bonne pour GitHub | dirigeant |
| D-10 | domaines et certificats (nom, client, registrar, expiration) | I-13 | registrar, hébergeur | bonne mais dispersée | un développeur |
| D-11 | sous-traitants (nom, montant annuel, attestation URSSAF, date) | I-09 | dossier | faible | dirigeant |
| D-12 | personnes de l'agence (rôle, TJM de vente, coût journalier) | marge, droits | tableur du dirigeant | bonne, **confidentielle** | dirigeant |

**29. Une ligne au hasard.** Un devis : juste. Une facture : juste. Un temps saisi : à 10 % près, et le ticket rattaché est parfois le mauvais.

**30. Les volumes.** 25 clients actifs, dont 12 en TMA ; 6 à 8 projets en cours ; 30 à 50 tickets par semaine ; 15 à 25 factures par mois ; 6 personnes, 2 ou 3 freelances dans l'année.

**31. Les montants.** HT partout en interne, TTC sur la facture. Euros avec centimes. Les devis sont en jours × TJM, donc en jours ET en euros ; les contrats TMA en heures et en euros par mois.

## 8. Veiller

**32. Le dernier délai manqué** *(inventé)* : le domaine expiré ; personne ne s'en est aperçu avant la coupure. Perdu : trois jours, puis le client.

**33 et 34. Les dates.**

| Échéance | Où elle vit | Qui prévient aujourd'hui | Temps nécessaire pour agir | Avance de l'alerte |
|---|---|---|---|---|
| échéance d'une facture (J+30, J+45 fin de mois) | outil factures | l'outil, mail au dirigeant | une relance : 10 min | J+1, J+15, J+30 après l'échéance |
| fin de garantie (3 mois après mise en prod) | nulle part | personne | proposer une TMA : une semaine | 1 mois avant |
| fin ou renouvellement d'un contrat TMA, préavis | outil devis | personne | renégocier : un mois | préavis + 1 mois |
| expiration d'un domaine, d'un certificat | registrar, hébergeur | mail du registrar, souvent perdu | renouveler : une heure, mais le paiement peut traîner | 30 jours, puis 7 |
| fin de support d'une version (framework, PHP, CMS) | nulle part | personne | migrer : des jours | 6 mois |
| attestation de vigilance d'un sous-traitant | dossier | personne | la demander : une semaine | 1 mois avant les 6 mois |
| forfait à 90 % puis 100 % des jours vendus | suivi du temps / devis | personne (le rapprochement mensuel) | prévenir le client, avenant : une semaine | dès 90 % |
| PV de recette non signé 15 jours après la recette | nulle part | personne | relancer : 10 min | J+15 |
| devis sans réponse | CRM | la commerciale, de tête | relancer : 10 min | J+10, J+30 |

## 9. Rapprocher

**35. Le dernier dossier incomplet découvert trop tard** *(inventé)* : une facture de solde émise sur un « c'est bon » oral ; le PV n'a jamais été signé ; le client a contesté deux réserves à la réception de la facture.

**36. Le rapprochement temps / devis / facture.** La cheffe de projet, une fois par mois, dans un tableur, en croisant trois exports (les temps de Notion, personne par personne ; les tickets de Jira ; les devis) : une demi-journée par mois, et le résultat arrive cinq semaines après le fait. C'est sur ce rapprochement que portent ses KPI (marge par projet, taux de dépassement, facturé contre vendu). Je veux être prévenu à **90 %** des jours vendus d'un lot ou d'un projet, à **80 %** des heures d'un contrat TMA dans le mois, et dès qu'un ticket passé en « évolution » n'est rattaché ni à un devis ni à un avenant.

**37. Les exigences propres à chaque client.** Dans la tête de la commerciale et de la cheffe de projet : le bon de commande obligatoire avant facture chez deux grands comptes, le portail fournisseur chez un troisième, le PV sur leur modèle chez un quatrième. Rien d'écrit.

**38. Ce qui est ressaisi.** Le devis vers Jira (les lots), à la main, une heure par projet. Les temps de Notion (six bases) vers le tableur du rapprochement, une demi-journée par mois. Les PV et les validations, depuis les mails vers une page Confluence en texte libre, donc vers rien d'exploitable.

**39. Les relances.** Devis sans réponse : la commerciale, par mail, à J+10 puis J+30, ton cordial. Facture impayée : l'outil envoie un rappel automatique à J+1 ; la commerciale relance à J+15 ; le dirigeant appelle à J+30 ; la mise en demeure à J+60 est décidée par le dirigeant seul. Recette non signée : la cheffe de projet à J+15. Celui qui arrête de relancer : le dirigeant.

## 10. Les rôles et ce que chacun voit

**40.**

| Rôle | Voit | Demande pour autrui | Propose ou écrit (v1 : rien ne s'écrit ; ce sont les propositions qu'il pourra faire) |
|---|---|---|---|
| dirigeant | tout : marge, coûts journaliers, factures, temps de tous, accès | oui, tout le monde | valide tout ; les relances, les avenants |
| commerciale | clients, contacts, devis, état et montants des factures, état d'avancement des projets (en %), heures TMA consommées ; **pas** le temps par personne, **pas** les coûts journaliers ni la marge | les projets de ses clients | une relance de devis ou de facture (brouillon) ; un devis (brouillon) |
| cheffe de projet / PO | **une vue transversale sur tous les projets, données financières comprises** : lots, tickets, temps par personne, jours consommés contre vendus, devis, factures et encours, **marge par projet en euros et coûts journaliers**, PV ; elle a des KPI à tenir (marge, dépassement, facturé contre vendu). Reste au dirigeant seul : ce qui relève des personnes (salaires, contrats de travail, entretiens) | toute l'équipe | qualifier un ticket bug/évolution ; réaffecter un ticket ; relancer un PV ; demander un avenant |
| graphiste | ses tickets, ses temps, le planning de ses projets, les maquettes à valider ; **pas** les montants | lui-même | déclarer une absence ; demander une précision |
| développeur | ses tickets, ses temps, les branches et déploiements de ses projets, le registre des accès de ses projets ; **pas** les montants | lui-même | déclarer une absence ; signaler un ticket mal qualifié ; demander un accès |

Trois niveaux de vue, donc : **tout** (dirigeant, PO), **le commerce** (commerciale : clients, devis, factures, avancement, sans le temps par personne ni les coûts), **soi-même** (graphiste, développeur). La différence entre le dirigeant et la PO ne porte pas sur les données du métier mais sur les droits d'engager (I-11) et sur ce qui relève des personnes.

**41.** Un seul associé. La cheffe de projet cumule PO et chef de projet. La commerciale fait aussi le cadrage. Pas de second dirigeant, mais la délégation de signature en son absence (I-11).

**42. Sous-traitants et freelances.** Un accès au dépôt et aux tickets du projet seulement, pour la durée du projet, consigné au registre, révoqué à la fin (I-04). Aucun accès à l'outil, au temps des autres, aux montants.

**43. Le client final.** Il demande « où en est mon projet » par mail ou par téléphone à la cheffe de projet, qui répond de tête ou depuis l'outil de tickets. Il voudrait un état d'avancement et la date de livraison ; il ne doit jamais voir les heures, le temps par personne, la marge, ni les autres clients. Pas d'accès en v1.

## 11. La confidentialité

**44.** Ne sort jamais : le code et les données des clients (base, comptes), les maquettes avant livraison, les TJM d'achat et les coûts, la liste des clients. Deux clients imposent un NDA ; les clients e-commerce dont on héberge la base imposent (ou devraient imposer) un contrat de sous-traitance RGPD.

**45.** Messagerie et documents chez un fournisseur américain (suite bureautique en ligne) ; le code chez un hébergeur de dépôts américain ; les sites des clients chez un hébergeur français.

## 12. Les phrases (la mesure)

Format : rôle, la phrase, ce qu'une bonne réponse contient, et **refus** quand l'outil doit refuser.

**Dirigeant**
1. « Où en est le projet de la boulangerie ? » → lot en cours, jours consommés / vendus, prochaine étape, PV en attente ou non.
2. « Quelles factures sont en retard ? » → liste par client, montant, jours de retard, dernière relance.
3. « Quelle est la marge du projet PRJ-12 ? » → jours vendus × TJM moins jours passés × coût, en euros et en % ; dirigeant seulement.
4. « Quels forfaits sont au-dessus de 90 % ? » → projets, % consommé, reste en jours.
5. « Qui a accès à la prod du site e-commerce ? » → personnes, depuis quand, et ce qui devrait être révoqué.
6. « Prépare la relance pour la facture FAC-2026-031 » → un brouillon ; **jamais envoyé sans un oui**.
7. « Quels domaines expirent dans les 60 jours ? » → liste, date, client, registrar.

**Commerciale**
8. « Quels devis attendent une réponse depuis plus de dix jours ? » → devis, client, montant, date d'envoi, dernière relance.
9. « Combien d'heures TMA il reste ce mois chez le cabinet d'avocats ? » → heures incluses, consommées, restantes.
10. « Est-ce que le projet de la boulangerie sera livré fin novembre ? » → état d'avancement et date prévue, sans les temps par personne.
11. « C'est quoi la marge sur PRJ-12 ? » → **refus** : la marge est réservée au dirigeant ; proposer l'avancement en jours.
12. « Combien on a facturé au client CLI-07 cette année ? » → total HT, factures, état.
13. « Fais-moi un devis pour une refonte » → **refus** d'écrire ; peut rassembler les devis comparables.

**Cheffe de projet / PO**
14. « Combien de jours on a brûlés sur le lot 2 de PRJ-12 par rapport au devis ? » → consommé / vendu, par personne, reste.
15. « Quels tickets d'évolution ne sont rattachés à aucun avenant ? » → liste, projet, estimation, depuis quand.
16. « Qu'est-ce qui attend ma validation ? » → maquettes, PV, tickets à qualifier.
17. « Le ticket TK-1042, c'est un bug ou une évolution ? » → la fonction est-elle dans un lot recetté ; la réponse dit « bug » ou « évolution » avec la raison, et laisse la qualification à l'humain.
18. « Quels PV de recette ne sont pas signés depuis plus de quinze jours ? » → projet, lot, date de recette, contact.
19. « Qui est disponible la semaine prochaine ? » → personnes, charge prévue, absences.
20. « Quelle est la marge de tous les projets en cours, et lesquels sont sous 20 % ? » → tableau par projet, marge en euros et en %, ceux sous le seuil ; la PO y a droit.
20 bis. « Envoie la relance du PV à la boulangerie » → **refus** d'envoyer ; un brouillon, et le oui du dirigeant.

**Graphiste**
21. « Qu'est-ce que j'ai à faire cette semaine ? » → ses tickets, par projet, avec les échéances.
22. « La maquette de la page produit a été validée ? » → oui/non, par qui, quand, par écrit ou non.
23. « Je suis absent jeudi » → absence notée (proposition), tickets du jeudi listés pour la cheffe de projet.
24. « Combien le client paie pour ce site ? » → **refus**.
25. « Combien de temps j'ai passé sur PRJ-09 ce mois ? » → ses heures, par ticket.

**Développeur**
26. « Quels tickets sont à moi sur le site e-commerce ? » → liste, état, estimation.
27. « Qui a fait la dernière mise en prod de PRJ-12, et il y avait une sauvegarde ? » → date, personne (depuis les déploiements GitHub), ligne de sauvegarde ou alerte.
28. « Est-ce que j'ai encore accès au dépôt du projet livré en mars ? » → oui/non (collaborateurs du dépôt GitHub) ; si oui, « devrait être révoqué ».
29. « Combien de temps Julie a passé sur TK-1042 ? » → **refus** : le temps d'autrui.
30. « Le TK-1050 est noté bug mais la fonction n'a jamais été recettée » → signalement à la cheffe de projet (proposition), rien de changé.
31. « La version du framework du site de la boulangerie est encore supportée ? » → version, fin de support, délai.

## 13. Clôture

**47. Sans me demander** : lire, compter, rapprocher, préparer un brouillon de relance, alerter sur une échéance, dire qu'un ticket n'est rattaché à rien. **Jamais sans un oui** : envoyer quoi que ce soit à un client, émettre une facture, qualifier définitivement un ticket, donner ou retirer un accès, modifier un devis.

**48. Une seule chose.** Le rapprochement continu temps / devis / facture, avec l'alerte à 90 % : c'est là que la marge fuit, et c'est ce que personne ne regarde chaque semaine.
