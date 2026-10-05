# Réflexions en cours

Où en est la réflexion sur le système lui-même : ce qui est décidé, ce qui est
fait, les pistes ouvertes et les questions à trancher. Ce n'est ni une fiche ni
une règle : c'est le fil d'une discussion entre Lionel et Claude, à reprendre à
chaque séance. Une piste réalisée passe dans « Fait », avec le fichier qui la
porte. Une idée abandonnée se barre et dit pourquoi, elle ne s'efface pas.

Dernière mise à jour : 2026-10-04.

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
| 2026-10-03 | **Le moteur ne dépend d'aucun framework d'agent** : il s'expose en outils (MCP/API) avec ses tests ; la coque autour (agent, messagerie) est interchangeable. ~~Hermes Agent (Nous Research) comme base~~ : refusé — sa thèse (skills auto-réécrites, mémoire curée par l'agent, accès terminal central) est l'inverse d'un interdit auditable, et il n'a ni moteur de règles ni tests d'acceptation. Si un client a besoin d'un lien vers une messagerie, **on écrit le connecteur nous-mêmes** : moins de surface, pas de dépendance à un projet de labo. | piste A |

## Fait (2026-09-29 et 30)

- `methode/socle.md` : règles G-01 à G-07, le temps, les faits communs, le
  tronc commun des questions.
- `methode/archetypes.md` : veiller, planifier, rapprocher, rédiger, chercher,
  avec leurs interdits types, leurs tests types et leurs questions « si…,
  alors… ».
- Quatre métiers complets : recherche, fiche, prospection, entretien,
  observation. Chaque interdit a au moins un test (vérifié par script le
  2026-09-30).
- Le skill, la grille et le README suivent la nouvelle structure.

---

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
  interroge Légifrance (API PISTE) et EUR-Lex, et signale ce qui a changé.

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
- Dans quel ordre attaquer : le moteur (A), ou les appels et le premier
  rendez-vous d'abord ?
- Le transport frigorifique : un sous-métier du transport, ou une cible à part ?
- `reperage` (`server/scoring/cibles.ts`) décrit les bureaux d'études par la
  « recherche dans les normes » : à corriger dans ce dépôt-là.

**Par un juriste**
- Sécurité : 12 h ou 11 h de repos, une semaine ou 7 jours et 48 h ; les quatre
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
