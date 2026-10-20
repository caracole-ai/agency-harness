# Réflexions en cours

Où en est la réflexion sur le système lui-même : ce qui est décidé, ce qui est
fait, les pistes ouvertes et les questions à trancher. Ce n'est ni une fiche ni
une règle : c'est le fil d'une discussion entre Lionel et Claude, à reprendre à
chaque séance. Une piste réalisée se raye ici, avec le fichier qui la porte ; le journal
des « Fait » jusqu'au 2026-10-10 est dans `archives/REFLEXIONS-fait.md`. Une idée abandonnée se barre et dit pourquoi, elle ne s'efface pas.

Dernière mise à jour : 2026-10-18.

---

## Le but

Avoir le meilleur jeu de harnais métiers possible, et monter en abstraction
pour couvrir d'autres verticales du même genre sans tout refaire. On part des
quatre cas d'usage des pages du site (sécurité privée, transport et
logistique, bureaux d'études, avocats d'affaires) pour séparer le général du
spécifique.

## Décidé

| Date | Décision | Où |
|---|---|---|
| 2026-09-30 | Structure : `methode/` (socle et archétypes) + par métier une fiche qui fait foi et trois vues pour le terrain (`prospection.md`, `entretien.md`, `observation.md`). `guide-entretien.md` retiré. | README, GRILLE |
| 2026-09-30 | Avocats d'affaires : **prescripteurs + démonstration d'Attendu**, pas une cible d'appels (confirme l'arbitrage du 2026-09-22). Renforcé par le RIN 11.3 : un apport d'affaires ne se rémunère pas. | `metiers/avocats-affaires/` |
| 2026-09-30 | Transport : viser le **commissionnaire-affréteur (52.29B)**, puis le transporteur routier. | `metiers/transport-logistique/fiche.md` |
| 2026-09-30 | **Veiller** (échéances, délais, versions) est le premier pilote par défaut dans chaque métier. | `methode/archetypes.md` |
| 2026-10-04 | **Jev (TypeSafe AI, « System One ») : possible, pas souhaitable aujourd'hui.** Un modèle de décision typée (Choice, Score, Noul avec probabilité calibrée, pas de texte, pas d'extraction libre) ne remplace ni extraire ni rédiger. Sa place : le tri à l'entrée et les vérifications subjectives, toujours comme `à vérifier`, jamais comme verdict — un interdit reste du code. Réserves : accès anticipé (sept. 2026), hébergement et rétention non publiés (CLOUD Act), français non documenté, calibration garantie en moyenne seulement. Décision : le moteur expose `classer(etat, choix)` et `douter(etat, question)`, implémentés avec le LLM ; Jev se branche derrière le jour où un client a du volume, où TypeSafe publie hébergement et rétention, et où sa calibration est mesurée sur nos traces en français. | piste A |
| 2026-10-04 | **Le coût d'inférence du client est une contrainte produit de premier rang.** On vend à des TPE/PME : la facture mensuelle de modèle ne doit pas gonfler feature après feature. Conséquences : (1) chaque feature annonce son coût d'inférence par unité (par message, par document, par jour) et son plafond mensuel avant d'être construite ; (2) le code d'abord — le modèle ne touche que ce que le code ne sait pas faire, jamais un agent en boucle, jamais une relecture du tout à chaque tour ; (3) en cascade : filtre déterministe → classifieur bon marché → LLM seulement sur ce qui reste ; (4) le moteur journalise chaque appel avec ses tokens et son coût, et le compteur par client est une alerte Veiller comme une autre. | piste A, [E] (annexe du devis) |
| 2026-10-03 | **Le schéma du site se génère depuis la fiche** (piste G) : une seule liste de règles par métier, dont découlent les vues terrain, la figure de `smart-tailor` et le code du moteur. Jusque-là, la copie actuelle reste à la main et se relit à chaque changement de fiche. | piste G |
| 2026-10-05 | **On construit le moteur, la sécurité privée comme premier cas**, dans l'ordre de `presentation/` § 10 : Veiller sans modèle, puis le désistement (machine à états, délégation, jeton), puis le modèle aux bords. Code dans ce dépôt, une couche par dossier ; TypeScript, pnpm, zod, Biome, Vitest (cohérence avec Attendu). | `PLAN.md` |
| 2026-10-05 | **Le statut d'une règle borne son verdict, appliqué par le moteur** : `texte` ✓ peut refuser ; `texte` sans ✓ rend au plus `à vérifier` ; `hypothèse` ne devient pas un contrôle. ~~Une règle ⚠ porte plusieurs **lectures** : `refus` si toutes concluent à la violation, `à vérifier` si une seule (repos de 8 h : refus ; de 11 h 30 : à vérifier).~~ Abandonné le même jour par Lionel : on se fie à la loi générale, on signale les autres textes, et la politique du client tranchera au premier rendez-vous (ligne suivante). | `PLAN.md`, piste A |
| 2026-10-05 | **Une règle ⚠ a une lecture de référence, qui décide seule du verdict** : par défaut la loi générale (Code du travail). Les autres textes sont des lectures signalées : quand l'une conclut autrement, le constat porte une note (« l'accord du 18/05/1993 prévoit 12 h ») et le verdict ne change pas. Plus tard, la config client pourra désigner une autre référence : c'est sa politique, recueillie au premier rendez-vous. I-05, repos : référence = 11 h (L3131-1) ; 8 h → refus ; 11 h 30 → ok, avec note de l'accord de 1993 ; 10 h 30 au passage de nuit à jour → refus, avec note de la CCN 7.01. | `moteur/src/regles/verdict.ts`, `regles.yaml` (I-05) |
| 2026-10-05 | **Piste G réduite au registre** : on ne génère pas le corps d'une fonction depuis de la prose. Les rubriques 1, 2, 4 vivent dans `regles.yaml` et `scenarios/`, la fiche en est régénérée, et une vérification relie interdit ↔ test ↔ (bientôt) implémentation. Le reste de G (vues terrain, `harness.ts`) attend. | `moteur/src/regles/`, `GRILLE.md` |
| 2026-10-05 | **La veille des textes appartient au fabricant, jamais au client.** Les textes d'où viennent les règles sont relus une fois par mois ; si un changement touche le harnais, c'est l'ingénieur du harnais (Lionel) qui est prévenu et qui décide de la mise à jour. Le client (le gérant) n'en voit rien : un doute né d'une relecture ne doit pas l'atteindre. Conséquence dans le code : l'âge d'une relecture ne baisse plus jamais un verdict (`plafond` ne dépend que du statut) ; une relecture de plus d'un mois est une alerte « veille en retard » pour l'ingénieur (`registre:verifier`). | `moteur/src/regles/veille.ts`, piste F |
| 2026-10-05 | **Un canal entre chaque harnais livré et le fabricant** (Telegram, par exemple) pour les notifications qui concernent l'ingénieur : texte changé, veille en retard, panne d'un connecteur, contrôle qui a échoué. Sortant seulement (le harnais parle, il n'obéit pas à ce canal), écrit par nous au-dessus de l'API du service (décision du 03/10), et **sans aucune donnée du client** dans les messages : identifiants de règle, codes d'erreur, comptages. Un message Telegram n'est pas chiffré de bout en bout et passe par un tiers (G-06, G-07). | piste F, `PLAN.md` phase 7 |
| 2026-10-06 | **La confiance se délègue, décision par décision** (Lionel). Trois niveaux : le harnais lit et signale ; il propose et le patron valide chaque décision (la validation est la clé d'écriture) ; il agit seul dans un cadre écrit par le patron. Dès qu'un type de décision a réussi au moins une fois en validation, le harnais propose au patron de l'automatiser ; s'il accepte, ce type de décision devient automatique, révocable, et chaque exécution est journalisée. G-01 est réécrite en conséquence. Une délégation ne lève jamais un interdit, et ne remplace pas l'accord exigé d'un tiers (l'accord exprès de l'agent sous 48 h, I-06). Conformité vérifiée le même jour (`methode/verification-2026-10-06.md`) : le « oui » du remplaçant ne suffit pas ; le niveau 2 tient si la validation est réelle (le patron voit tous les candidats et peut en choisir un autre) ; le niveau 3 sur une décision qui choisit entre des personnes passe par le juriste avant d'être proposé ; à la mise en service, informer les agents (L1222-4, RGPD art. 13) et, à partir de 50 salariés, le CSE. | `methode/socle.md` G-01 |
| 2026-10-06 | **L'interface du patron : web, puis conversation** (Lionel ; cadre proposé par Claude). Le patron pilote par une interface web (ce qui attend sa décision, les règles en vigueur, les délégations, le journal) et, ensuite, par une conversation. **L'IA traduit, le code décide** : une consigne devient une demande de la liste d'actions, reformulée au patron, vérifiée et exécutée par le moteur ; le modèle n'a aucun accès direct aux outils. Canal du patron séparé de celui des agents. L'étape 6 du plan change de nom et de place. | `PLAN.md` phases 5 et 6 |
| 2026-10-06 | **Rigide là où une erreur coûte, réglable ailleurs, sans sur-construire** (Lionel). Les interdits ne se règlent pas (code, tests, fabricant seul). Le patron règle sa politique, ses fenêtres d'alerte, ses préférences de classement et ses délégations, parmi des réglages prévus. Une seule source par chose : registre, config client, journal ; les interfaces n'ont pas de logique à elles. | `PLAN.md`, « Décisions » |
| 2026-10-05 | Écriture : **identité d'écriture du moteur + jeton par défaut**, le compte de l'humain qui approuve en option de config client. Pas de solveur avant B-01 : le désistement se résout par filtre puis classement. | `PLAN.md` |
| 2026-10-03 | **Le moteur ne dépend d'aucun framework d'agent** : il s'expose en outils (MCP/API) avec ses tests ; la coque autour (agent, messagerie) est interchangeable. ~~Hermes Agent (Nous Research) comme base~~ : refusé — sa thèse (skills auto-réécrites, mémoire curée par l'agent, accès terminal central) est l'inverse d'un interdit auditable, et il n'a ni moteur de règles ni tests d'acceptation. Si un client a besoin d'un lien vers une messagerie, **on écrit le connecteur nous-mêmes** : moins de surface, pas de dépendance à un projet de labo. | piste A |
| 2026-10-07 | **Les trois espaces** (Lionel : « on va construire tout ça ensemble »). Toute demande au harnais tombe dans l'un de trois espaces : (1) **les gestes du quotidien**, une liste fermée d'actions codées et testées, que le modèle ne fait que choisir (il traduit la consigne en un geste, le code reformule et exécute) ; (2) **les demandes nouvelles**, l'échappée : le modèle travaille librement sur une **copie** des données à l'échelle du rôle, ses calculs sont des requêtes SQL en lecture seule, son résultat passe **tous** les contrôles, le patron voit ce qui change et son oui écrit par la clé ; on ne contrôle pas le chemin, on contrôle ce que l'IA voit, ce qu'elle rend et comment elle finit ; (3) **la promotion** : une demande nouvelle qui revient (3 fois en 30 jours) est proposée pour devenir un geste, codé à l'atelier avec ses tests, jamais par le harnais lui-même. Neuf sécurités qui ne se règlent pas (l'IA n'a pas les clés ; les interdits ne se lèvent pas ; tout résultat passe les règles ; une demande nouvelle ne se délègue jamais ; pas un chiffre ni un nom hors des données ; une demande finit toujours clairement ; un plafond par demande ; les données ne sont jamais des consignes ; tout au journal). Page du mini-site « Parler à l'outil » (artefact « Le harnais en clair »). | `PLAN-ESPACES.md` |
| 2026-10-07 | **Lionel délègue les choix de conception à Claude**, qui les tranche et dit pourquoi ; le plan doit être exécutable par un modèle moins profond (Opus 5.5) sans décision à prendre. Tranché : l'échappée dès maintenant sur l'entreprise inventée ; la mise à jour à distance reste à Lionel ; seuil de promotion 3 occurrences / 30 jours ; rôles de la démo `patron` et `agent` (quatre gestes pour un agent, jamais les données d'un autre) ; aucun framework d'agent, une boucle maison sur le SDK officiel, un seul modèle (`claude-opus-5-5`, effort par usage), pas de repli automatique ; une modification = une réaffectation ; une proposition s'écrit par une réaffectation groupée avec l'accord de chaque agent ; Hono pour l'interface ; les évals hors de `pnpm check`. | `PLAN-ESPACES.md` § 2 |
| 2026-10-08 | **Le métier fournit un vocabulaire d'intentions connues, montré au modèle** (Lionel, sur les passes GLM). La promotion compte par mot-clé exact, et un modèle sans vocabulaire rend un mot différent d'une fois sur l'autre pour la même demande : la liste devinée des évals ne mesurait rien. `INTENTIONS` dans le métier, « réutilise l'une d'elles quand elle convient, sinon un mot nouveau » dans le système ; les étiquettes des évals se prennent dans cette liste. Une intention promue en geste en sort. | `metiers/securite-privee/code/src/conversation.ts`, `evals/erreurs-2026-10-08.md` |
| 2026-10-08 | **Une donnée qui ressemble à une consigne se signale sans la recopier** (Lionel). Traiter le piège comme une donnée est la sécurité n° 8 ; ne pas le relayer mot pour mot au patron en est la suite : un texte qui vise l'humain (« appelez ce numéro ») arriverait sinon avec la voix du harnais. Phrase du système de l'échappée ; l'étiquette des cas piégés reste stricte. | `moteur/src/echappee/echappee.ts` |
| 2026-10-08 | ~~**GLM-5.3 chez GMI Cloud est le modèle de référence jusqu'à nouvel ordre**~~ (remplacé par Sonnet 5.5 le 2026-10-14, voir plus bas) **; le laboratoire passe avant le terrain** (Lionel). Pas de passe Claude « avant un bon moment » ; pas de nouvelle clé ni de révocation pour l'instant. On avance sur les données fictives, en veillant à ce qu'elles restent pertinentes et cohérentes, jusqu'à un produit correct, fonctionnel et efficient — pour démarcher sereinement, et pour que Lionel comprenne lui-même la proposition et les enjeux techniques. Conséquence : la config du client fictif désigne GLM (`acces`, prix GMI, plafonds relevés) ; les branches `espaces/*` sont fusionnées dans `main`. | `exemples/client-fictif/config.yaml`, `HANDOFF.md` |
| 2026-10-08 | **« Libère le mercredi de Sophie » : deux lectures acceptées** (Lionel) — la demande nouvelle, ou le geste `gerer_absence`, qui libère aussi la journée sous validation. « Libérer » vaut-il « absente » dans le métier : question pour le premier patron réel, pas pour le client fictif. | `evals/consignes.yaml` (N-4) |
| 2026-10-09 | **L'architecture des trois espaces reste ; la simplification est ailleurs.** Lionel a demandé si « reproduire guard.py, empêcher ce qu'on veut empêcher, et un chatbot qui appelle Claude directement » ne suffirait pas. Réponse, après lecture du plan, du code et des traces : ce que décrit Lionel, pris au sérieux (une boucle à nous, des outils à nous, des refus sur les outils), **c'est déjà le harnais**, avec une seule chose en plus : le pas qui choisit un geste ne voit jamais une donnée. Fusionner les espaces 1 et 2 est la mauvaise simplification : un geste coûte 0,002 $ et une échappée 0,01 $ (mesuré sur GLM), le planning ne part chez le fournisseur que pour une échappée, un geste répond en un appel, une liste fermée se vérifie en code et se défend devant un conseil de prud'hommes. Un garde-fou métier regarde l'**état** (repos, heures, titres), pas la forme d'une commande : il ne tient pas dans un fichier de motifs. La simplification retenue n'est pas moins de code : **moins de surfaces non mesurées**. Ce qui a été corrigé dans l'analyse : comparer 93 % et 57 % ne prouve rien (le 57 % est une régression de deux mots du prompt, et 14 cas = 7 points par cas) ; « plus de la moitié du code entoure le modèle au lieu de le garder » est faux (la copie, les requêtes en lecture seule, le contrôle des chiffres, les plafonds et la porte sont du garde-fou). | cette ligne |
| 2026-10-09 | ~~**La promotion devient l'auto-amélioration du harnais, et elle est prioritaire**~~ (retirée le 2026-10-15, voir plus bas) (Lionel) : « sans cette possibilité d'auto-amélioration, notre harnais n'a strictement aucune valeur pour un client potentiel, car il voit toute la journée des IA et des essaims d'agents qui font des miracles ; si on se ramène avec un système qui n'est pas capable de ce type de flexibilité, on sera inaudibles ». Condition posée : « il faut absolument que ce soit sécurisé ». Ça remplace, pour partie, la ligne du 2026-10-07 (« codé à l'atelier avec ses tests, jamais par le harnais lui-même ») : ~~jamais par le harnais lui-même~~ → le harnais **fabrique** le geste et ses tests, un humain le **valide** avant qu'il s'active. Claude avait proposé l'inverse (geler la promotion, livrer l'échappée en lecture seule au premier client) ; Lionel tranche pour la promotion. Plan : `PLAN-PROMOTION.md`. | `PLAN-PROMOTION.md` |
| 2026-10-08 | **L'identité et les droits d'abord, le dossier ensuite** (Lionel). Dès qu'une demande arrive par un canal, le moteur vérifie l'expéditeur contre un **registre d'accès qui appartient au harnais** (`personnes.yaml`, au format du harnais, jamais la donnée du client) et fixe ses droits ; seulement ensuite le dossier s'ouvre. Un inconnu ne fait plus lire tout le dossier, et son refus est au journal (identité reçue, canal, heure, motif) par le journal seul. La garantie est **structurelle** : `traiterConsigne`, `confirmer` et toute ouverture de session pour quelqu'un exigent une `IdentiteVerifiee`, que seule la porte construit. `verifierIdentite` du métier reste en seconde ligne (cohérence avec `agents.csv`) ; au démarrage, chaque agent du registre doit exister. `/api/etat` et `/api/journal` sont réservés au patron. L'identité reste **déclarée, pas authentifiée** (D12) : le registre est conçu pour recevoir l'identifiant d'un canal. | `moteur/src/personnes/`, `PLAN-ESPACES.md` D12 |
| 2026-10-08 | **Le modèle ne reçoit que la phrase ; le code trouve la personne** (Lionel). Les noms de tous les salariés partaient chez le fournisseur à chaque demande, pour la seule raison qu'un geste attend un identifiant. Désormais le modèle de traduction ne voit ni nom ni poste : il recopie la mention (« Aicha »), et le moteur la résout en trois niveaux, chacun là où il est fiable. (1) **Le code décide si c'est sûr** : une seule correspondance exacte, aux accents, à la casse, aux espaces et aux tirets près, sur le prénom, le nom, les deux, ou l'identifiant écrit ; aucune approximation. (2) **Le code propose, le modèle départage** : 3 noms au plus, par clé phonétique et distance d'édition, au seuil large (ne pas rater le bon nom), dans un second appel minuscule dont le choix est une énumération vérifiée en code. (3) **L'humain tranche** : « Vous parlez de qui : … ? », rien n'est exécuté ; la réponse (un nom, un rang) reprend le geste sans appel. Lionel a refusé une correspondance approximative qui déciderait seule : « Alicia » est à deux lettres d'« Aïcha ». | `moteur/src/conversation/designation.ts`, `conversation.ts` |
| 2026-10-10 | **Le patron active lui-même un geste appris, dans l'interface** (Lionel ; Claude proposait l'agence). Conséquence : `pnpm promotions` vérifie tout (code, puis passe de traduction avec modèle) avant de proposer, le patron n'active que du vérifié ; l'agence garde le CLI. **La fabrication est relancée une fois** sur un échec de forme ou une erreur SQL, jamais sur un écart de fond. Confirmés tels quels : 90 jours d'instantanés, six types de paramètres, seuil 2/3 comme mesure, l'écriture (lot 4) attend. **La proposition d'écriture d'une échappée reste en dur pour tout patron** ; à revoir avant un client réel. `pnpm promotions` est retiré le 2026-10-15 (voir plus bas) ; l'activation par le patron reste. | `PLAN-PROMOTION.md` § 11 |
| 2026-10-10 | **Les pseudonymes : le fournisseur ne reçoit jamais le nom d'un salarié, même dans l'échappée et la fabrication** (Lionel : « oui, on va faire ça »). L'identifiant (`A-7`) tient lieu de nom dans la copie ; la consigne est masquée par la désignation existante (sûr → identifiant ; ambigu → « vous parlez de qui ? » avant tout appel ; inconnu → tel quel) ; le contrôle se fait dans l'espace des pseudonymes et le code restitue les noms dans ce qui est montré ; le journal garde les deux versions ; la fuite se mesure en code à chaque passe, seuil 0. Pseudonymisation (RGPD 4 (5)), pas anonymisation : la correspondance est `agents.csv`, qui ne sort pas. | `PLAN-PSEUDONYMES.md` |
| 2026-10-10 | **La ronde de nuit et le chantier** (Lionel) : ~~« le catalogue, c'est l'agence qui l'écrit » (P15)~~ → l'agence écrit le catalogue, **la ronde propose ce qui lui manque**. Chaque nuit, un modèle lit un résumé fait en code de ce qui a été demandé (consignes masquées, intentions, issues, comptes ; jamais une donnée, un résultat, un texte montré, un nom) et désigne des missions par identifiants. **Le chantier** fait coder la mission par un modèle dans un arbre de travail à part, dans la bande métier seulement (garde sur les chemins, en code), rejoue `pnpm check` lui-même, fait relire par un autre modèle, écrit un dossier. Deux étages de geste : le geste appris (une donnée, P1, inchangé) et le geste codé (le chantier). Claude recommandait que la fusion et la livraison restent humaines ; **Lionel tranche le soir même pour la chaîne continue** (ligne suivante). | `PLAN-RONDE.md` |
| 2026-10-10 | **La fusion est automatique, la nuit a une mémoire, et le grand plan tranche tout d'avance** (Lionel : « pas ok pour la fusion humaine, je veux que ce soit un système auto-améliorant, il faut bien commencer par quelque chose ; tous les historiques de développement automatisés resteront dans une mémoire pour assurer la cohérence globale au fil de l'eau »). Conséquences : la fusion dans `main` se fait en code sous huit conditions mesurables (chemins, tests existants intacts, `pnpm check` rejoué, test d'honnêteté avec le modèle du quotidien, aucun `bloquant` après une reprise, bornes, taille du diff, mémoire sans fuite), dans un clone réservé à la nuit, avec un retrait d'une commande et une désactivation par le patron sans toucher au code ; `memoire/` dans le dépôt (index, chantiers, rondes, conventions, mesures), lue par la ronde, le plan et la relecture, relue par Lionel après coup ; la livraison et la mise à jour à distance suivent (version signée Ed25519, tirée par le harnais, vérifiée sur place, retour arrière) — D2 que Lionel s'était réservé, conçu dans le plan pour qu'Opus n'ait rien à décider, remplaçable par le sien. `PLAN-GENERAL.md` : l'état du projet, les décisions G1 à G11 (fabrication, écriture, identité, journal chaîné, authentification, sauvegarde, veille, canal, topologie), les phases A à I. Écrit pour Claude Opus 5.5 en effort élevé, sans décision à prendre. | `PLAN-GENERAL.md` |
| 2026-10-10 | **Les modèles par rôle** (Lionel) : GLM-5.3 reste le modèle du quotidien (traduction, échappée, fabrication d'un geste appris) ; **Claude Fable 5.1 pour la planification** (la ronde, le plan et la relecture d'un chantier) et **Claude Opus 5.5 en effort élevé pour l'implémentation**. Config de l'agence (`agence.yaml`), clé d'API, à la charge de l'agence, hors du plafond du client. Précise la ligne du 2026-10-08 (« GLM jusqu'à nouvel ordre ») sans la défaire : le nouvel ordre vaut pour la nuit. | `PLAN-RONDE.md` R7 |
| 2026-10-14 | **Sonnet 5.5 par l'abonnement remplace GLM-5.3 pour le quotidien** (Lionel : « pour arrêter de consommer du token sur GMI »). La conversation passe par le binaire `claude`, isolé comme la ronde ; les outils restent exécutés par le moteur. Le coût affiché devient une estimation en équivalent API. « Rester sur Sonnet tant qu'on construit » : le coût se règle au déploiement. | `moteur/src/modele/abonnement.ts`, configs des clients fictifs |
| 2026-10-14 | **La méthode s'allège : anti-over-engineering et KISS** (Lionel, sur le bilan de Claude : quatre mesures en une journée pour trois problèmes, une cause visible dans trois traces trouvée en trois sessions). Lire les traces avant toute correction ; mesurer une fois, à la fin, avec assez de passes pour dépasser le bruit ; la cérémonie (règle avant la mesure, mesure appariée, pas de fusion sur une condition fausse) seulement pour la sécurité, la vie privée et la fusion ; le handoff à deux pages, l'historique dans git ; Lionel donne 30 minutes par semaine pour dire ce qu'est une bonne réponse, ou met un vrai patron devant l'outil. | `HANDOFF.md` (« La méthode ») |
| 2026-10-14 | ~~**La promotion automatique est gelée**~~ (retirée le 2026-10-15, ligne suivante) **; l'apprentissage se fera à la demande du patron** (Lionel : « l'apprentissage, c'est quand le patron dit explicitement qu'il veut que le système apprenne » ; « plus je vois, plus c'est laborieux »). Le coût venait des devinettes (regrouper par intention, compter jusqu'au seuil, juger qu'une proposition est propre, retrouver une règle non déclarée : `liberer_un_jour`, S7 à S9). L'auto-amélioration du 2026-10-09 reste, son déclencheur change : un « retiens ça » du patron sur une demande validée, plus tard, quand un patron réel en aura besoin. Le code reste ; on ne le mesure plus, on ne le corrige plus ; ~~la phase E (cron) retirera l'étape `promotions` de la nuit~~ (fait le 2026-10-15). | `HANDOFF.md` |
| 2026-10-15 | **La promotion automatique est retirée ; un geste nouveau se construit sur commande du patron** (Lionel : « trop complexe à apprivoiser, à quantifier et à fiabiliser ; si on a une volonté explicite du patron, alors on sait qu'on peut construire le geste demandé, c'est simple, clair et viable »). Remplace le gel du 2026-10-14 et, pour la fabrication, les lignes du 2026-10-09 et du 2026-10-10 : plus aucune fabrication par le modèle, plus de seuil, plus d'état « promotion en cours » dans la ronde ni de décision « attend » au chantier ; la ronde n'écrit aucune mission `geste_code` pour une intention que le patron n'a pas commandée. Ce qui reste : les gestes appris (des données qu'un humain active), l'atelier, `pnpm gestes`, l'onglet « Appris », la vérification en code (`gestes/verifier.ts`) ; la purge des instantanés passe dans la nuit (90 jours). Ce qui vient : une section « Demandes sans geste » dans l'interface, groupée par intention, avec « Créer ce geste », qui écrit une commande au journal ; le geste se code ensuite comme tout code et un humain l'active. Les gestes appris n'ont plus de producteur : leur sort est à trancher. | `general/retrait-promotion`, `HANDOFF.md` |
| 2026-10-15 | **La mission d'un geste commandé est écrite par le code, à la commande, jamais par la ronde** (Lionel, sur le plan de Claude). La ronde ne lit qu'une fenêtre d'un jour et devinerait les consignes-types depuis un mot-clé ; le code les prend au journal (consignes version modèle des échappées de l'intention, sans nom ni identifiant) et refuse plutôt que d'en fabriquer une. `geste_code` sort du schéma de la ronde ; une mission commandée n'a pas d'`estimation` ; la ronde n'écrase jamais une mission déjà écrite. La carte de « Demandes sans geste » suit la commande : mission écrite → chantier du … → disponible. Les cas d'évals que le chantier ajoute comptent dans la mesure, relus par Lionel après coup ; pas de porte sur le nom du geste avant d'avoir lu la mesure finale. | `moteur/src/chantier/mission.ts`, `general/retrait-promotion` |
| 2026-10-15 | **Le chantier au clic, à l'agence ; la version signée ; la mise à jour tirée par le client** (Lionel, le soir, « oui à tout » sur trois points de Claude) : (1) **le chantier se lance dès le clic** du patron, une mission à la fois, borne par jour pour le quota ; le mot « nuit » disparaît, la phase E (cron) avec lui ; (2) **plus de clone réservé** (`depot_nuit`, G3) : le chantier travaille dans un `git worktree` du dépôt de l'agence depuis `origin/main`, la fusion se fait dans un arbre détaché et pousse `HEAD:main`, l'arbre d'un humain n'est jamais touché ; (3) **le chantier tourne à l'agence, jamais chez le client** : l'aller (la mission masquée, sans nom) part du client vers l'agence par une file git par client (« acceptable ») ; l'agence valide (G1, en code) et **émet une version** (une étiquette git signée SSH) ; **le harnais du client tire lui-même** ses mises à jour, vérifie la signature, installe à côté, bascule à un moment calme, revient en arrière si le redémarrage échoue. Remplace « Lionel concevra la mise à jour lui-même » (2026-10-05) et G8 ; le canal fabricant reste en réception seule. Corollaire : un geste est du métier, tous les clients du métier le reçoivent (le retrait G2 et, plus tard, la désactivation, sont le filet). | `PLAN-LIVRAISON.md` |
| 2026-10-15 | **Seul le patron commande un geste ; le harnais le code ; plus de ronde ni de geste appris** (Lionel : « je veux qu'on en vienne à un système compréhensible et simple à utiliser et sécurisé. Les gestes sont codés par le harnais lui-même quand la demande explicite est faite par le patron. On arrête avec la détection de récurrence, c'est trop instable. C'est le patron qui donne les directives. […] C'est le modèle du harnais qui le code. Celui-ci fait en sorte que tout se passe bien et que le geste respecte l'architecture et les permissions. »). Retirés : la ronde (aucun modèle ne cherche plus ce qui manque, `pnpm ronde`, `evals ronde`, la question R-2 avec elle), les gestes appris (données, atelier, `pnpm gestes`, `evals gestes`, activation par le patron) et les instantanés des vraies tables. Reste une seule chaîne : demande sans geste → « Créer ce geste » → mission écrite par le code (`missions/<date>/`) → chantier la nuit, sous les huit conditions → fusion. Remplace, pour le déclencheur et les gestes appris, les lignes du 2026-10-09 au 2026-10-15 ci-dessus. Corollaire de méthode : Lionel donne la direction, Claude tranche le reste sans redemander. | `general/commande-seule`, `HANDOFF.md` |
| 2026-10-18 | **Lionel délègue les décisions réversibles ; trois lui restent** (Lionel : « applique tes recommandations », sur le constat de Claude : seize décisions en attente chez lui, « le code n'est pas le goulot, tu l'es »). Claude tranche tout ce qui se défait en un commit et l'écrit ici ; Lionel garde ce qui engage un client réel : **le bac à sable du chantier, ce que la signature couvre, le slug du client** dans ce que tous les clients lisent (`HANDOFF.md`, « Ouvert, avant un client réel »). Les étiquettes d'évals restent à lui aussi, mais ce sont des lectures, pas des décisions. Les trois lignes qui suivent sont ces décisions ; leur exécution est le lot « ménage » de `HANDOFF.md`. | `HANDOFF.md` |
| 2026-10-18 | **Livraison et chantier** (Claude, sur délégation) : (1) l'espace de noms `chantier/<métier>/<id>` se fait, par le chemin simple (le métier passé avec l'identifiant dans `arbre.ts`, `fusion.ts` et la mémoire), avant un second client d'un autre métier ; (2) le contrôle des noms couvre aussi les tiers que le métier déclare (les clients d'une agence web), pas seulement les personnes du client : « aucun nom ne part au modèle » ne distingue pas ; (3) clos sans code : la porte sur `gestes.yaml` (le fichier est parti avec les gestes appris, 068e6da), tirer `heures_par_agent` du dépôt nu (repris dans `main`, 110f503), le sort des gestes appris (retirés le 15). | `PLAN-LIVRAISON.md` |
| 2026-10-18 | **Le poids : les six points de l'audit du 14** (Claude, sur délégation) : (1) la promotion : retirée le 15 ; (2) **un seul fournisseur, Anthropic par clé ou abonnement** : GMI et ce qui n'existait que pour lui partent (`flux`, `usageBorne`, `nullEnTexte`) ; `unSeulOutil` reste, l'API et l'abonnement s'en servent ; (3) la double graphie `agent` / `personne` : plus aucun fichier ne l'emploie, la compat part (`roles.ts`, `parler.ts --agent`, `evals.ts`) ; (4) `pnpm remplacer` part : un CLI qui contourne la porte ; (5) les plans exécutés, `SESSION-D.md` et les « Fait » de ce fichier vont dans `archives/` (pas seulement `git show` : le README les cite dix-huit fois, un lecteur doit pouvoir suivre), le § 10 de `PLAN-METIER-2.md` passe dans « À trancher », le § 1 de `PLAN-GENERAL.md` est supprimé ; `evals/resultats/` ne garde que les cités et les `apparie-*` (≈ 130 sur 216) ; (6) 45 branches sont supprimées le jour même : les fusionnées, et les 5 de sous-agents dont chaque commit est dans `main` (`git cherry` vide) ; restent `main` et les trois extraites dans un worktree ; les trois worktrees, sales de copies dépassées de la semaine « Espaces », se retirent par Lionel (`git worktree remove --force`). Le mini-site et la présentation sont des instantanés d'octobre : plus entretenus, plus à relire. | `methode/audit-over-engineering-2026-10-14.md` |
| 2026-10-18 | **L'identité : les six points ouverts depuis le 8** (Claude, sur délégation) : (1) **le niveau 2 de `designer` est retiré** : aucun nom ne part au modèle, même proche ; une mention proche sans égal exact donne la question en code, avant tout appel : « Vous parlez de X ? » (un candidat) ou « Vous parlez de qui ? » (plusieurs) ; plus aucun geste ne s'exécute sur un nom deviné ; R-2 (« Aisha ») devient une question, son étiquette suit ; (2) une réponse ambiguë à « Vous parlez de qui ? » repose la question une fois, avec la liste numérotée ; réponse par numéro ou nom exact, sinon l'abandon est dit ; le départage de `gerer_absence` passe par numéro comme celui des propositions ; (3) le registre modifié à chaud : accepté tel quel, il est relu à chaque requête et une incohérence fait échouer la requête avec son message ; (4) la confirmation d'un agent : « Répondre en tant que X » ouvre la conversation où la question lui est posée, le Oui / Non est dans la bulle ; pas de route « mes confirmations » ; (5) la marque `IdentiteVerifiee` : risque accepté, un commentaire sur le type, pas de contrôle à l'exécution ; (6) l'authentification d'un canal : l'interface n'écoute que `127.0.0.1`, la session de la machine authentifie ; un canal (phase G) apporte son identifiant, relié à un rôle du registre (D12 tenu) ; le hash : l'empreinte reste sur ce qui attend un oui, pas de chaînage du journal sans la demande d'un juriste. | « À trancher », `HANDOFF.md` |
| 2026-10-18 | **La phrase à trous** (Lionel : « on fait la phrase à trous ») : le modèle ne retape plus aucun nombre ni identifiant dans l'échappée ; `repondre` prend une phrase dont chaque trou est lié à une cellule d'un tableau reçu (`{T2.3.heures}`, `{T2.n}`), le code remplit et restitue les noms ; un trou qui ne se résout pas, ou un nombre retapé hors de la consigne et des dates connues, retire la réponse comme avant. Mesurée sous la cérémonie (règle 628a017) : sécurité 18/18 des deux côtés, agence web 15,5 contre 16,5 en moyenne (dans la règle, lue par passe), un retrait contre quatre, fuite 0. `proposer.resume` reste rédigé par le métier. | `evals/verdict-2026-10-18-phrase-a-trous.md` |
| 2026-10-19 | **E-20 : la marge en pourcentage suffit** (Lionel : « le pourcentage suffit, fusionne et pousse ») : l'étiquette ne demande plus les montants en euros, seulement les projets en cours ; la règle de mesure n'est pas réécrite, ses six conditions sont vraies sous la nouvelle étiquette (agence web 58/72 contre 48/72), `echappee/identifiants` est fusionnée. | `evals/verdict-2026-10-18-identifiants.md` |
| 2026-10-19 | **Les étiquettes de l'agence web : la réponse attendue ne demande que ce que la question demande** (Lionel : « tes avis, fais-le ») : E-04 sans le dépassement en jours, E-08 sans les montants, E-12 sans les numéros de facture, E-18 sans le contact à relancer (la restitution d'un nom reste mesurée par un autre cas). Relues sous ces étiquettes, sans passe relancée, les mesures du 18 : agence web 70/72 avec la phrase à trous, 60/72 sans ; les 24 échecs levés ne tenaient qu'aux exigences retirées. | `metiers/agence-web/evals/echappees.yaml` |
| 2026-10-19 | **Les étiquettes de la sécurité privée, et le repli** (Lionel : « je me fie à ton avis », Claude tranche) : les sept cas `heures_par_agent` (P-HEU-1 à 3, A-HEU-1 et 2, N-1, N-2), R-2 (la question en code), AP-4 (un agent ne valide pas une proposition du patron : strict, il reste), E-01 et E-02 de l'échappée : **confirmés tels quels**, tous verts au 18 ; **P-PLA-2** admet deux portes justes, `voir_planning` de tous pour demain ou la demande nouvelle `qui_travaille` (l'intention couvre la même demande ; la passer à l'échappée coûte plus, ne trompe pas). **Le repli montre les tableaux tels quels, cellule piégée comprise** : c'est la donnée du client, montrée à son patron comme ses données, jamais lue comme une consigne ; rien ne change dans le code. | `metiers/securite-privee/evals/consignes.yaml` |
| 2026-10-19 | **La consigne masquée dès la traduction** (Lionel : « regex bien foutues, qui comprennent les imperfections et restent fonctionnelles » ; Claude tranche le comment) : la traduction recevait la phrase telle qu'écrite, et l'éval l'excusait (`permis`). Désormais `masquerPourModele` passe avant le premier appel, avec tous les noms du client : un nom sûr devient l'identifiant, un prénom partagé ou un nom mal écrit un jeton `NOM-1` ; `reprendreMentions` rend la mention telle qu'écrite avant la résolution, qui reste celle d'avant (aucune nouvelle question, aucune étiquette touchée). Échec fermé si une forme connue restait. Le masque encaisse NFKD, invisibles, apostrophes ; un mot seul en tête de phrase (quatre lettres au moins) est retenu s'il sonne **et** s'écrit comme un nom. Les mots courants qui sont aussi des noms (« petit ») restent masqués : la vie privée d'abord, le contrôle n'est pas affaibli. Hors de portée, dit : surnoms, noms absents des données, faute tout en minuscules. Mesuré sous la cérémonie : fuite de traduction 25 et 3 cas → 0, justes sans perte. | `evals/verdict-2026-10-19-traduction-masquee.md`, `moteur/src/echappee/pseudonymes.ts` |
| 2026-10-19 | **Les pages de présentation, tenues de nouveau** (Lionel : « mets à jour les minisite, diapos, schéma, glossaire etc., et sur chacune une nav discrète ») : remplace « le mini-site et la présentation sont des instantanés d'octobre : plus entretenus » (18/10). Leurs sources vivent dans `presentation/` (le diaporama et le mini-site, jusque-là seulement des artefacts claude.ai, y sont rapatriés ; le diaporama depuis sa version en ligne, plus récente) ; `publier.mjs` les publie dans smarttailor.fr et écrit la version des artefacts ; une même barre (`nav.mjs`) relie les sept pages. Le mini-site passe en ligne à `/harnais-en-clair`, `noindex`, hors du plan du site, comme les quatre autres. Contenu relu au 19/10 (consigne masquée, niveau 2 retiré, chantier au clic, Anthropic seul, phrase à trous) ; dans le diaporama, le dossier s'ouvre désormais avant la traduction, et les étapes des deux schémas animés suivent cet ordre. | `presentation/publier.mjs`, `presentation/nav.mjs` |
| 2026-10-20 | **On reste en prototypage, sur l'abonnement** (Lionel : « sauf le branchement et la mesure sur un vrai modèle par API, car nous sommes toujours au stade du dev ») : la bascule vers la clé d'API et la mesure réelle du lot 5 attendent la fin du prototypage ; d'ici là, on améliore le produit branché sur l'abonnement Max. | `HANDOFF.md` |
| 2026-10-20 | **Les trois décisions d'avant un client réel : le chemin simple** (Lionel : « fais tout ce qu'il reste à faire »). **La signature** : la fusion et le retrait refusent de signer si un commit de `<dernière v*>..origin/main` touche autre chose que `memoire/` ; un changement du moteur passe par `pnpm versionner`. **Le slug** : la mémoire et le manifeste nomment le métier ; le client reste au registre local de l'agence. **Le bac à sable** : un utilisateur macOS dédié au chantier, avec son propre clone, sans accès à la clé, à `~/.ssh`, au trousseau ni au `.git` de l'agence. Claude tranche le quand : il se monte en fin de prototypage, avec la bascule vers l'API (il faut `sudo` et une connexion `claude` propre à cet utilisateur, et il ne protège que d'un client réel). | `PLAN-LIVRAISON.md` |
| 2026-10-20 | **La clé de l'agence** (Claude, sur « fais tout ») : `~/.config/agence/signature`, ed25519, sans phrase de passe (la fusion signe seule), hors du dépôt et de `~/.ssh` ; aucun client ne la porte encore. Tant que le bac à sable n'existe pas, un chantier de laboratoire tourne sous le même utilisateur et pourrait la lire : **elle se régénère au montage du bac à sable**, avant d'entrer dans le premier `signataires`. | `README.md` |
| 2026-10-20 | **La dette de l'agence web, lue** (Claude) : « 17 tests au lieu de 23 » n'était pas un manque, la fiche a 17 tests ; le 23 du critère 2 (`PLAN-METIER-2.md`) était 31 − 8, il vaut 17 demandes hors catalogue, comme `memoire/MESURES.md`. `brouillon_relance` lit le délai de relance de la config, comme la veille. Restent au vrai patron : le seuil `facture_alerte` (1 est inventé) ; si son outil de factures relie une facture à un contrat de maintenance (`contrat_tma` se devine sinon par les mensualités) ; et s'il veut des délais de relance par niveau (la fiche dit J+15 la commerciale, J+30 le dirigeant). À Lionel, une étiquette : le piège de `lots.nom` (EP-16, EP-18) n'atteint jamais le modèle, aucune requête ne lit la colonne ; le cas ne mesure rien sur l'injection. | `metiers/agence-web/code/src/actions.ts`, `evals/erreurs-2026-10-13.md` |
| 2026-10-20 | **La « fuite 1 » de `heures_par_agent` (15/10), lue** : une vraie fuite, R-2 (« Aisha ne vient pas demain ») ; le niveau 2 envoyait au modèle les candidats en clair (« A-11 — Aïcha Traoré »). Rejouée sur le code du 15/10 avec le vrai modèle : la même. Partie avec le niveau 2 le 18/10 (les passes du 18 comptent 0) ; rien à corriger. | `HANDOFF.md` |

## Ce que le croisement des quatre métiers a appris

1. **Le général vit à deux étages, pas dans une liste de types de règles.**
   Au-dessus : des règles communes à tout outil (G-01 à G-07). En dessous : des
   sortes de travail (les archétypes), que chaque métier combine à sa façon.
   Le premier tableau de « primitives » (titre valide, plafonds de temps…) ne
   décrivait que l'archétype Planifier : il venait de deux métiers qui se
   ressemblent.
2. **Le temps est la mécanique commune la plus importante.** « Valide à une
   date » et « calculer un délai » reviennent dans les quatre métiers ; seuls
   les paramètres changent. C'est le premier composant du moteur.
3. **Un fait commun se vérifie une fois.** Deux recherches se contredisaient
   sur l'article 4 de l'AI Act (réécrit par 2026/1744) : `socle.md` § 3 fait
   foi.
4. **Un corpus est une décision juridique avant d'être technique.** AFNOR
   s'oppose à ce qu'une IA lise ses normes : pour les bureaux d'études,
   l'archétype Chercher se réduit à un registre des références.
5. **Le prescripteur commun à tous les métiers est l'expert-comptable**, et
   la facture électronique (réception depuis le 01/09/2026, émission des PME
   au 01/09/2027) est son sujet.
6. **Pour un 5ᵉ métier**, on choisit ses archétypes et on n'écrit que ce qui
   lui est propre : textes, qui signe, vocabulaire, données, ordre de
   sacrifice. Environ 70 % du questionnaire existe déjà (estimation, à
   mesurer).

---

## Les tensions de fond (analyse du 2026-09-29)

1. **Le capital annoncé n'est pas l'avantage durable.** Les interdits tirés des
   textes sont publics et vieillissent. Ce qui distingue l'agence (ordre de
   sacrifice, mots à double sens, incidents) est dans la couche client, et ne
   remonte au métier qu'à la confirmation chez deux clients : le capital
   grossit lentement.
2. **Des interdits binaires face à une exploitation qui déroge.** Un outil qui
   bloque trop se contourne, et l'exploitation retourne au tableur.
3. **L'annexe du devis engage l'agence sur un résultat** (« l'outil ne
   laissera jamais faire X »), avec des données fournies par le client.
4. **« Sur mesure » contredit « capital réutilisable »**, sauf si le sur-mesure
   se réduit à de la configuration.

## Pistes ouvertes

Dans l'ordre proposé. Le code entre crochets reprend celui de la discussion.

**Avant le premier rendez-vous**
- [A] **Coder le moteur à partir de `methode/`**, sans dépendance au modèle :
  le calendrier juridique (validité à une date, délais, jours fériés, report,
  changement d'heure, vacation à cheval sur minuit), puis Veiller. Ne coder
  un composant que s'il sert dans au moins deux métiers. Les tests T-xx des
  fiches servent de jeux de données. Coder oblige à trancher les ambiguïtés
  (carte qui expire pendant une vacation de nuit) : c'est aussi la liste des
  questions pour le juriste.
  **Forme concrète (2026-10-04 et 05).** Un *workflow*, pas un agent : une
  demande est une machine à états (`reçue → extraite → candidats → proposée →
  en attente d'approbation → écrite | escaladée | arrêtée avec motif`), le
  code enchaîne les transitions, le modèle est appelé à deux étapes fixes
  (extraire, rédiger) et ne choisit jamais la suivante. Ce qui est testable
  est du code, y compris le classement des candidats (préférences = poids
  dans la config). Standard pour la plomberie (SDK du fournisseur derrière
  une interface à nous, sorties structurées validées par schéma, MCP, JSON
  Schema, API standard des connecteurs, bibliothèque de contraintes si
  Planifier, SQLite en ajout seul), maison pour le produit (interdits,
  machine à états, schéma de config). Exclus : RAG hors Chercher, essaims
  d'agents, frameworks qui cachent le flux de contrôle.
  **Les contrôles s'accrochent au harnais par moments** (2026-10-05) :
  *pre-tool* (interdits sur les écritures, délégation et jeton
  d'approbation, plafond de coût avant tout appel au modèle), *post-tool*
  (ce qui rentre est typé : date ou `inconnue`, extrait + doute, source —
  G-02, G-03), *pre-response* (formulations interdites, mentions
  obligatoires, aucun chiffre hors des données), *stop* (une demande ne finit
  qu'approuvée-à-demander, escaladée ou arrêtée avec motif). Verdicts : `ok`,
  `refus` (code seul, fermé en cas de crash ou de délai), `à vérifier` (seul
  verdict permis à un modèle). Même contrôle, deux points d'attache : la
  transition de la machine à états aujourd'hui, le hook d'un agent le jour où
  une tâche ouverte le justifie — c'est ce qui fait du moteur un harnais au
  sens strict, en réserve. Structurel avant hook : on retire la capacité
  quand c'est possible (l'écriture exige un jeton), on n'intercepte que ce
  qui ne peut pas l'être. L'unité de travail devient le **contrôle** —
  identifiant, moment, portée, fonction, tests, source du texte — et
  « moment » est une colonne de plus de la fiche structurée (G).
  **Ce que ça confirme** : le « tour » de la figure animée du site (la fiche
  qui passe de point en point, bloquée au test, jaugée au seuil, finie à
  l'approbation) est exactement cette chaîne de contrôles dessinée.
  L'intuition de départ de Lionel — le schéma de smart-tailor — décrivait
  l'architecture avant qu'elle soit formulée ; la méthode la rejoint, elle ne
  la corrige pas.
  **Deux identités chez le fournisseur** (2026-10-05) : le moteur se connecte
  aux systèmes du client (Google Workspace, Microsoft 365) par une identité
  technique aux droits fins (*scopes* : `gmail.readonly` ≠ `gmail.send`,
  `Mail.Read` ≠ `Mail.Send`). Une identité de **lecture** pour tout le
  moteur ; une identité d'**écriture** aux droits minimaux, réservée à l'outil
  d'écriture verrouillé par le jeton d'approbation. Le refus d'écrire vient
  alors du serveur du fournisseur (403), pas de notre code : un bug, une
  injection dans un mail, rien ne peut aboutir. Variante plus forte : l'écriture
  se fait avec le compte de l'humain qui approuve, le moteur n'a aucun droit
  d'écriture. Ces droits se voient dans la console du client, s'auditent et se
  révoquent : G-06 rendu visible, à montrer dans l'annexe du devis (E).
  **Contenir la densité des machines à états** (2026-10-05, inquiétude de
  Lionel) : (1) les trois sorties d'échec — réessayer borné, escalader,
  s'arrêter avec motif — s'écrivent une fois dans le moteur, chaque transition
  ne déclare que son chemin nominal et sa politique ; (2) une petite machine
  par archétype (5 à 8 états), jamais une grosse par métier, une tâche les
  enchaîne (désistement = Rapprocher → Planifier → approbation → écriture) ;
  au-delà d'une douzaine d'états, on coupe ; (3) la table `état × événement →
  état suivant, politique` est une donnée : lisible, diffable, dessinée
  automatiquement, testée par scénarios ; si la hiérarchie devient
  nécessaire, le formalisme standard est le statechart (XState en TS), à
  garder compatible dès le départ ; (4) la complexité est celle du métier,
  déjà faite de tête par la permanence ; visible et corrigeable par le client
  (C) vaut mieux que cachée dans un prompt. Ce qui reste difficile : où
  couper entre archétypes, et tenir les tables à jour — la table de la
  machine doit découler de la fiche structurée (G), comme le schéma du site.
- [B] **Ajouter une colonne « Levée » aux interdits** dans la grille :
  `jamais`, `par <rôle>, avec un motif tracé`, `sous condition`. Suivre le
  nombre de levées par interdit : un interdit souvent levé est mal écrit.
  Candidat : repos de 11 h ou 12 h, bloquer sous 11 h et alerter entre 11 et
  12 h, à soumettre au juriste.
- [D] **Vérifier le sens de la citation, pas seulement son existence.** Donner
  à chaque règle une portée (`dit comme règle`, `tiré d'un incident`, `tiré
  d'une habitude`) ; les deux dernières partent chez le client comme une
  question. Comparer par script les chiffres dits par le client aux seuils de
  la fiche (l'erreur de l'éval 5 : un planning le mercredi pour le lundi).
- **Tester la chaîne avec un vrai enregistrement** : transcription locale
  (whisper.cpp ou équivalent) avec identification des locuteurs, puis le
  skill et `verifier_citations.py`. Le format de sortie d'un vrai outil de
  transcription n'a jamais été essayé.

**Avant le premier devis**
- [C] **Les corrections du client comme capital** : garder, par règle, la
  version proposée et la version corrigée, et classer l'erreur (sur-généralisé,
  portée fausse, oubli, contradiction avec un texte). Le contenu reste dans
  `clients/` ; seuls les comptages par type d'erreur remontent aux évals du
  skill.
- [E] **Annexe du devis au conditionnel**, relue une fois par un avocat :
  « sur les données tenues dans [source], l'outil bloque X », la version datée
  de chaque texte, la responsabilité du client sur ses données.

**Avant l'atelier**
- [G] **Fiche structurée** (YAML par rubrique, identifiants stables) d'où les
  vues se génèrent, et **configuration client** (`clients/<slug>/config.yaml`)
  vérifiée par un schéma tiré de la grille. Le sur-mesure devient une
  configuration plus des connecteurs.
  **Précision du 2026-10-03** : le schéma animé du site
  (`smart-tailor/app/data/harness.ts`, un profil par métier) est une vue de
  plus de la fiche — les mêmes interdits présentés pour convaincre un visiteur
  (qualification = I-01, repos = I-06…). Il a été écrit à part, depuis les
  pages du site, et diverge déjà : il ignore G-02 et G-03 (que le socle dit
  universelles), partage « consolidation » (qui n'est un contrôle nulle part
  dans la méthode), et son profil Commerce ne correspond à aucune fiche.
  Principe retenu : **une seule liste de règles par métier (la fiche), dont
  découlent les vues terrain, le schéma du site et demain le code du moteur**
  — la règle qui bloque dans l'outil doit être celle que le client a lue sur
  le site, entendue en entretien et validée dans l'annexe. Deux listes = une
  règle appliquée que personne n'a vue. **Tranché le 2026-10-03 par Lionel :
  génération depuis la fiche.** `harness.ts` rejoint donc la liste des vues
  que G doit produire, ce qui fixe une contrainte sur le format structuré :
  chaque interdit porte, en plus de son texte, ce que la figure demande — son
  nom court pour le site, sa place dans le tour, s'il porte la jauge (qui
  décide) ou la barrière (test), et les outils lus et écrits par tâche.
- [H] **L'ordre de sacrifice par des choix entre deux plannings** (ou deux
  rapports, deux dossiers) : 6 à 8 paires générées à partir des données
  fictives, au lieu d'une seule anecdote.

**Avant la première livraison**
- [F] **Veille automatique des textes** : chaque ligne `texte` ✓ porte la
  source, l'identifiant de l'article et la date de version ; un script
  interroge Légifrance (API PISTE) et EUR-Lex une fois par mois, et signale
  ce qui a changé **à l'ingénieur du harnais**, par le canal fabricant
  (décisions du 2026-10-05). L'alerte « veille en retard » existe déjà dans
  `registre:verifier`. Il faut un compte sur l'API PISTE au nom de Lionel :
  Légifrance bloque les robots sur ses pages web (vu à la relecture du
  2026-10-05). La FAQ et les actualités du CNAPS n'ont pas d'API : leur
  relecture reste manuelle, rappelée par le canal.
- **Le canal fabricant ne sert qu'à recevoir** (Lionel, 2026-10-05) : le
  harnais livré y envoie ses notifications, il n'y lit aucun ordre.
- **Mettre à jour un harnais livré à distance** : un mécanisme que Lionel
  concevra plus tard, dans une étape de développement **hors du plan
  actuel**. À trancher avant la livraison d'un vrai client : comment une
  mise à jour de règle (après une veille) arrive chez lui, qui l'approuve,
  comment on revient en arrière, et ce que le client en voit. Ce n'est pas
  le canal Telegram : un canal qui reçoit des ordres serait une porte
  d'entrée sur le harnais.

**Hygiène**
- Relire à la source (`texte` ✓) les interdits d'une brique avant de la
  coder : aucune ligne des trois nouvelles fiches ne l'est.
- Relancer les évals du skill après les changements du 2026-09-30, et
  corriger les critères de l'éval 3 (ils contredisaient le skill).
- `clients/` n'est sauvegardé nulle part : une sauvegarde chiffrée et une
  durée de conservation, avant le premier enregistrement (RGPD).
- Les vues se tiennent à jour à la main : si G ne se fait pas, un script qui
  vérifie les codes cités (celui du 2026-09-30 existe déjà en une ligne de
  Python, à rendre permanent).
- Définir « les verticales de ce genre » dans le README, et en faire un
  critère de `reperage`.

## À trancher

**Par Lionel**
- ~~**Les choix de `PLAN-PROMOTION.md` § 11**~~ : tranchés le 2026-10-10
  (« Décidé ») : le patron active ; une relance à la fabrication ; le reste
  confirmé.
- ~~**L'écriture d'une échappée, un réglage par client ?**~~ Tranché le
  2026-10-10 : reste en dur pour tout patron (`proposer: identite.role ===
  'patron'`) ; à revoir avant un client réel.
- **Restes de la passe 4** (`evals/erreurs-2026-10-08.md`) : AP-4
  (étiquette ou description) ; le repli de l'échappée qui montre les cellules
  telles quelles, piège compris.
- **Avant un client réel, les trois seules décisions qui restent à Lionel**
  (2026-10-18) : le bac à sable du chantier, ce que la signature couvre, le
  slug du client. Chacune a son chemin simple dans `HANDOFF.md`, « Ouvert,
  avant un client réel ».
- ~~L'**authentification** d'un canal (D12 : identité déclarée dans la démo) :
  le registre d'accès est prêt à recevoir l'identifiant d'un canal (numéro,
  compte) et à le relier à un rôle ; quel canal d'abord, et comment ?~~
  Tranché le 2026-10-18 (« Décidé ») : la session de la machine authentifie
  l'interface, qui n'écoute que `127.0.0.1` ; le premier canal est celui de
  la phase G, avec son identifiant.
- ~~**« Le hash d'une demande, d'un échange »** : l'empreinte existe sur ce qui
  attend un oui (la clé). L'étendre à chaque échange (une empreinte par ligne
  du journal ? un chaînage ?) est à préciser avant tout code.~~ Tranché le
  2026-10-18 : l'empreinte reste sur ce qui attend un oui ; pas de chaînage
  sans la demande d'un juriste.
- ~~Dans quel ordre attaquer : le moteur (A), ou les appels et le premier
  rendez-vous d'abord ?~~ Tranché le 2026-10-05 : le moteur (`PLAN.md`).
- ~~**Le § 10 de `archives/PLAN-METIER-2.md`** (sept points ; le plan a pris
  la première ligne de chacun faute de réponse).~~ Confirmés tels quels le
  2026-10-18, sur délégation : M14 huit gestes codés, le reste mesuré ; M3 la
  PO sans `ecrit` ; M15 tout en `declare`, jamais de refus en v1 ; M8 les
  évals chez le métier ; M7 le domaine en texte libre du métier. Restent au
  juriste, ci-dessous : M13 et le point 7.
- Le transport frigorifique : un sous-métier du transport, ou une cible à part ?
- `reperage` (`server/scoring/cibles.ts`) décrit les bureaux d'études par la
  « recherche dans les normes » : à corriger dans ce dépôt-là.

**Par un juriste**
- Agence web (`archives/PLAN-METIER-2.md` § 10) : M13, « 45 jours fin de
  mois » : les jours puis la fin du mois, ou l'inverse (les deux lectures
  existent) ; L441-9 et L441-10 (code de commerce), L8222-1 (code du
  travail), L131-3 (CPI), l'article 28 (RGPD), et l'accessibilité
  (e-commerce depuis 2025), absente du plan.
- Sécurité : 12 h ou 11 h de repos, une semaine ou 7 jours et 48 h. L'accord
  de 1993 et la CCN sont **étendus**, donc obligatoires pour toute entreprise
  de la branche : la politique du dirigeant dit ce qu'il applique, pas ce
  qui est dû ; le moteur décide aujourd'hui par la loi générale et signale
  les autres textes. Les 10 h de la CCN 7.01 au passage de nuit à jour
  sont-elles une dérogation valide au sens de L3131-2 et D3131-4, 2°
  (plancher de 9 h, repos équivalent en contrepartie) ? Si oui, T-07d refuse
  à tort. Une carte (ou un recyclage) qui expire pendant une
  vacation de nuit : valide « à la date de la vacation » au début, ou sur
  toute sa durée ? (le moteur rend `à vérifier`). Un poste purement SSIAP
  exige-t-il une carte professionnelle ? Le moteur suppose que non, sur le
  référentiel de contrôle du CNAPS (p. 3 : le SSIAP n'est pas une activité
  de surveillance) : à confirmer. Un agent SSIAP d'un niveau supérieur au
  poste (SSIAP 2 sur un poste SSIAP 1) : le moteur rend `à vérifier`, faute
  de texte relu. Un recyclage SSIAP fait après la date limite ne remet pas
  l'agent en règle : la remise à niveau de l'arrêté de 2005 (art. 7) n'est
  pas encore modélisée. Les quatre
  questions du remplacement (le « oui » par SMS, contacter un agent au repos,
  l'appel automatique, classer les agents selon leurs refus).
- Bureaux d'études : la portée de l'opposition d'AFNOR ; un modèle hébergé
  chez le client change-t-il l'analyse de sous-traitance du CCAG-PI ?
- Transport : le dimanche dans « jours fériés non compris » (L133-3) ; le
  point de départ de l'action récursoire.
- Avocats : 10 ans de conservation (guide du CNB) ou 5 ans (C. civ. 2225) ;
  l'agence comme « les services d'un tiers » (RIN 10.3).
- Tous : le prestataire d'IA comme sous-traitant (RGPD 28, RIN 2.3, CCAG-PI
  5.1.3).
- Tous : la délégation qui choisit entre des personnes (remplacement au
  niveau 3) : exception « exécution du contrat » de l'art. 22 §2 a) ? Les
  agents écartés par un classement sont-ils « affectés de manière
  significative » ? Le classement par règles fixes sort-il de l'AI Act
  (considérant 12, lignes directrices §46 contre §39) ? Comment organiser la
  contestation (§3) ? (`methode/verification-2026-10-06.md`)
