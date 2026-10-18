# Plan — les pseudonymes : le modèle ne voit plus aucun nom, même dans l'échappée

Écrit le 2026-10-10, sur la décision de Lionel du même jour (`REFLEXIONS.md`,
« Décidé ») : « oui, on va faire ça ». Point de départ : depuis le 2026-10-08,
la **traduction** ne reçoit plus aucun nom (le code trouve la personne). Mais
l'**échappée** et la **fabrication** en reçoivent encore : dans les résultats
des requêtes (`agents.nom`, les constats), dans la consigne telle qu'écrite
(« Karim ne vient pas demain »), dans le texte final journalisé et rejoué
pour fabriquer. Ce plan étend la règle du 08/10 aux deux autres usages :
**le fournisseur ne reçoit jamais le nom d'un salarié.** Écrit pour être
exécuté par Claude Opus 5.5, en plusieurs sessions, sans décision à prendre ;
quand le plan se tait, la règle est au § 1.

Ce qu'il ne touche pas : le registre d'accès, la désignation des gestes
(`designation.ts`, réutilisée telle quelle), les contrôles `I01`…`I20`, la
clé d'accord, les colonnes du journal (il **ajoute** des champs dans
`donnees`), la boucle de l'échappée (ses cinq outils, ses bornes), la lecture
seule de la copie, le schéma des gestes appris.

Ce que ça change dans le discours, à dire au client tel quel : l'échappée
reste une sortie de données vers le fournisseur (vacations, titres,
constats), mais **pseudonymisée** au sens du RGPD, art. 4 (5) : le
fournisseur voit `A-7`, jamais « Karim Haddad » ; la correspondance
(`agents.csv`) ne quitte pas le dossier du client. Ce n'est pas une
anonymisation : avec le fichier des agents, on retrouve la personne ; sans
lui, non.

**Critère de succès global** (observable), sur une copie de
`exemples/client-fictif`, avec `--maintenant 2026-10-10T21:40` :

1. `pnpm parler … --consigne "Combien d'heures a fait Karim cette semaine ?"`
   (patron) : la trace de chaque appel au modèle (système, messages,
   résultats d'outils) ne contient aucun des prénoms ni des noms de
   `agents.csv` ; la réponse montrée au patron dit « Karim Haddad » et
   « 16 h » ; le journal porte, sur la ligne `echappee`, `consigne_modele`
   (« Combien d'heures a fait A-1 cette semaine ? ») et `texte_modele` ;
2. idem avec « Kareem » (faute) : le harnais demande « Vous parlez de qui :
   Karim Haddad ? » **avant tout appel d'échappée** (aucune ligne
   `appel_modele` d'issue `echappee` avant la réponse) ; « 1 » ou « Karim »
   relance la demande avec `A-1` ;
3. `pnpm evals echappee` (modèle réel) : taux au moins égal à la dernière
   passe (41/42 le 2026-10-09) et la colonne **fuite** à 0 sur tous les cas ;
   `pnpm evals promotion` : la fabrication reçoit des échappées sans aucun
   nom, fuite 0 ; `pnpm evals gestes` reste à 100 % ; `pnpm evals traduire`
   inchangé (ce plan ne touche pas la traduction) ;
4. `pnpm check` vert ; un test du moteur prouve en simulé qu'aucune table
   remise à `creerCopie` et aucun message remis au modèle ne porte un nom
   connu ;
5. un agent (`A-2`) qui demande « mes heures cette semaine » : son système
   dit « l'agent A-2 », jamais son nom.

---

## 1. Règles de travail pour la session qui exécute

1. **Avant de coder** : lire `HANDOFF.md`, ce plan en entier, puis les fichiers
   que le lot touche. `pnpm check` doit être vert au départ.
2. **Un lot = une branche `pseudonymes/lot-N` = un commit** (pas de push),
   partie de la branche où se trouvent les lots de la promotion (ou de `main`
   une fois fusionnés). Avant le commit : `pnpm check` vert, README et
   `HANDOFF.md` à jour. Le commit cite le lot : `Pseudonymes, lot N : <titre>`.
3. **Ne jamais** : envoyer un nom au modèle sous quelque forme que ce soit
   (le test le prouve) ; changer les règles de `designation.ts` (une
   correspondance approximative ne décide jamais seule) ; écrire dans
   `exemples/client-fictif/` (toujours une copie) ; mettre une donnée réelle ;
   ajouter une dépendance ; écrire `process.env.X ?? 'valeur'` ; utiliser
   `any` ; laisser un `TODO` ; modifier `requete.ts` (mots interdits,
   lecture seule), `jeton.ts`, `regles.yaml`, les contrôles.
4. **Conventions** : celles de `PLAN-ESPACES.md` § 1.4 et `PLAN-PROMOTION.md`
   § 1.4 (identifiants en français sans accents, pas de point-virgule, échec
   fermé partout, commentaire de tête qui renvoie à `PLAN-PSEUDONYMES.md § n`).
5. **Quand le plan se tait** : `~/.claude/CLAUDE.md` et KISS ; noter le choix
   dans `HANDOFF.md` sous « Choix faits faute de consigne ».
6. **Sous-agents** : un par fichier de test (§ 9).
7. **Mesurer avant de déclarer** : les lots 1 et 2 touchent ce que le modèle
   lit ; ils ne sont finis qu'avec une passe réelle (§ 8), coût affiché,
   résultat dans `evals/resultats/`. Sans clé dans la session : le dire dans
   `HANDOFF.md`, ne pas écrire « mesuré ».

---

## 2. Décisions (prises par Claude le 2026-10-10 ; à trancher au § 10)

| # | Décision | Pourquoi |
|---|---|---|
| S1 | **Le pseudonyme d'un salarié est son identifiant** (`agents.id`, `A-7`) : déjà stable, déjà la clé de jointure de la copie (`vacations.agent`), déjà ce que les gestes et les propositions manipulent. Aucune table de pseudonymes à inventer, conserver ni purger : `agents.csv` **est** la correspondance, et elle ne sort pas. | KISS. La pseudonymisation (RGPD 4 (5)) exige une correspondance gardée à part, pas une anonymisation. Un identifiant stable laisse le modèle joindre les tables sans rien apprendre d'une personne. L'alternative (pseudonymes tirés au sort par échappée) est écartée au § 10. |
| S2 | **La copie est pseudonymisée avant d'être construite.** Dans toute cellule texte de toute table, chaque forme connue d'un nom (prénom, nom, les deux ; accents, casse, espaces et tirets près : `formes` et `normaliserNom` de `designation.ts`) est remplacée par l'identifiant ; `agents.nom` vaut l'identifiant et sa description dit « l'identifiant, qui tient lieu de nom ». L'instantané (`echappees/<id>.json`) garde les vraies tables : il ne sort jamais. | Une passe générique sur les cellules couvre `agents.nom`, `constats.motif` et toute colonne future : on ne tient pas une liste de colonnes à jour. Le rejeu des gestes appris travaille sur l'instantané réel, comme aujourd'hui. |
| S3 | **La consigne est masquée avant l'échappée**, par la désignation existante, aux trois niveaux du 08/10 : une correspondance sûre → l'identifiant ; deux ou trois noms proches → « Vous parlez de qui : … ? » **avant tout appel** (le mécanisme `precision_attendue` de `conversation.ts`, réutilisé) ; aucune correspondance → le mot reste tel quel. Un agent ne désigne que lui-même : sa consigne masquée ne porte que son identifiant. | La règle du 08/10, telle quelle ; jamais une approximation qui décide seule. Le mot inconnu (surnom, faute lourde) est la fuite résiduelle : mesurée (S7), pas niée. |
| S4 | **Le contrôle se fait dans l'espace des pseudonymes, la restitution après.** `nomsConnus` = les identifiants visibles du rôle ; `verifierReponse` reçoit le texte du modèle et les sources telles qu'envoyées (pseudonymes des deux côtés). Puis `restituer` remplace chaque identifiant connu par « Prénom Nom » dans le texte montré. Un seul endroit : la fin de `echappee()`. | Cohérence du contrôle (texte et sources dans le même espace). La restitution est une substitution inverse en code ; un identifiant inconnu reste tel quel (le contrôle l'a déjà jugé). |
| S5 | **Le journal garde les deux versions** : `consigne` mot pour mot et `texte` tel que montré (P8, inchangés), plus `consigne_modele` et `texte_modele` dans `donnees` de la ligne `echappee`. **La fabrication lit les versions modèle** (P10) : ce qui part pour fabriquer est exactement ce qui est déjà parti pour répondre. | P10 reste vrai à la lettre : rien de nouveau ne part. Le rejeu (instantané réel, texte montré) ne change pas. |
| S6 | **Ce qui n'est pas pseudonymisé** : identifiants de vacations et de demandes, postes et sites (des données de l'entreprise, pas d'une personne), dates, heures, titres et leurs échéances, préférences du patron, règles. | Le périmètre est la donnée à caractère personnel. Une date de carte reste liée à un pseudonyme : c'est ce que la pseudonymisation protège. Les sites en option au § 10. |
| S7 | **Une fuite se mesure en code, à chaque passe.** Pour chaque appel d'une trace (système, messages, résultats d'outils envoyés), aucune forme d'un nom du fichier des agents (mots de trois lettres au moins, normalisés) ne doit apparaître. Colonne **fuite** du tableau de résultats de `pnpm evals echappee` et `pnpm evals promotion` ; seuil **0**. Un test unitaire le prouve en simulé dans `pnpm check`. | Objectif, binaire, sans juge : la règle du projet. C'est aussi la preuve qu'on montre au client. |
| S8 | **« Tu travailles pour … » ne porte jamais un nom** : `quiParle` (`traduire.ts:63`) rend « le patron » ou « l'agent A-7 ». | Même règle, même endroit ; aujourd'hui la fonction reçoit la liste des agents avec leurs noms : à vérifier au lot 1 et corriger si elle en cite un. |

---

## 3. Où vit le code

```
moteur/src/
  echappee/
    pseudonymes.ts    (lot 0) nouveau : formesConnues, masquerTables, masquerTexte, restituer, fuites
    echappee.ts       (lot 1) copie masquée, nomsConnus = identifiants, restitution, texte_modele
  conversation/
    conversation.ts   (lot 1) consigne masquée avant l'échappée ; précision demandée avant tout appel
    traduire.ts       (lot 1) quiParle sans nom (S8)
  promotion/
    promotion.ts      (lot 2) EchappeeJournalisee lit consigne_modele et texte_modele
    fabriquer.ts      (lot 2) messageFabriquer sur les versions modèle ; completerGeste résout un identifiant
  evals/evals.ts      (lot 3) la colonne « fuite », en code, sur chaque trace
  cli/evals.ts        (lot 3) l'affiche dans le tableau
metiers/securite-privee/code/src/
  conversation.ts     (lot 1) expose les personnes visibles (id, nom) au moteur ; nomsConnus = identifiants
evals/
  echappees.yaml      inchangé (les étiquettes citent les noms montrés, pas ceux envoyés)
  resultats/          les passes des lots 1 et 2
```

---

## 4. Lot 0 — `pseudonymes.ts`, pur, testé

Fonctions, toutes pures, sans accès au disque ni au journal :

- `formesConnues(personnes: { id; nom }[]) : { id; formes: string[] }[]` —
  les formes de `designation.ts` (`formes(nom)` : prénom, nom, les deux,
  avec et sans accents, tirets et apostrophes) ; les formes de moins de trois
  lettres sont ignorées (un prénom « Al » ne masque pas « al »).
- `masquerTexte(texte, personnes) : string` — remplace, **au mot près**
  (frontières de mots, comparaison normalisée comme `noms()` de
  `reponse.ts`), chaque forme connue par l'identifiant ; la forme la plus
  longue d'abord (« Karim Haddad » avant « Karim ») ; idempotent ; ne touche
  pas un identifiant déjà là.
- `masquerTables(tables: TableCopie[], personnes) : TableCopie[]` — applique
  `masquerTexte` à toute cellule de type `TEXT` ; la colonne `nom` de la
  table `agents` reçoit l'identifiant et sa description devient
  « l'identifiant de l'agent, qui tient lieu de nom ». Ne modifie pas
  l'entrée (retourne de nouveaux objets).
- `restituer(texte, personnes) : string` — remplace chaque identifiant connu
  (frontière de mot, `A-7` et pas `A-71`) par le nom complet ; un identifiant
  inconnu reste.
- `fuites(texte, personnes) : string[]` — les formes connues trouvées dans un
  texte (celles que `masquerTexte` aurait remplacées) ; vide = pas de fuite.

Tests (`pseudonymes.test.ts`, 20 cas au moins) : accents (« Aïcha » /
« Aicha »), casse, tiret (« Jean-Pierre »), apostrophe (« D'Angelo »), prénom
seul, nom seul, deux homonymes de prénom (chacun son identifiant, le nom
complet tranche ; un prénom partagé seul **n'est pas** masqué vers un seul
identifiant : il reste tel quel et `fuites` le signale), un mot qui contient
un prénom (« Alice » ne contient pas « Ali » au mot près), un nom de site qui
ressemble à un nom (« Nord »), `constats.motif` qui cite un agent,
idempotence (`masquerTexte(masquerTexte(x)) === masquerTexte(x)`), aller-retour
(`restituer(masquerTexte(x)) === x` quand `x` n'écrit que des noms complets).

---

## 5. Lot 1 — L'échappée masquée (S2, S3, S4, S5, S8)

### 5.1 `metiers/securite-privee/code/src/conversation.ts`

`EchappeeDuMetier` reçoit `personnes: { id; nom }[]` (les agents **visibles
du rôle** : tous pour le patron, lui seul pour un agent) ; `nomsConnus`
devient `visibles.map((a) => a.id)`. `quiParle(identite, visibles)` ne cite
plus un nom (S8) : vérifier `traduire.ts:63`, corriger, tester.

### 5.2 `moteur/src/echappee/echappee.ts`

Dans `echappee()` : l'instantané s'écrit avec `metier.tables` (réel), puis
`creerCopie(masquerTables(metier.tables, metier.personnes))`. La boucle reçoit
`metier.nomsConnus` (identifiants). À la fin, pour `reponse` et `abandon`
(le motif) : `texte_modele = texte`, `texte = restituer(texte, personnes)`.
La ligne `echappee` du journal porte `consigne_modele` et `texte_modele` dans
`donnees`. Une proposition ne change pas : elle manipule déjà des
identifiants ; sa description montrée (rendue par le code du métier) n'est
pas touchée.

### 5.3 `moteur/src/conversation/conversation.ts`

Avant de lancer `m.echappee(...)` (ligne 421) : `masquerConsigne(consigne,
personnes)` → `{ texte }` ou `{ precision: { mention, candidats } }`. Niveau
sûr (`correspondances` : une seule) → identifiant. Niveau 2 (`proches` : 2 à
3) → la question « Vous parlez de qui ? » par le mécanisme
`precision_attendue` existant (`question()`, `precisionEnAttente`,
`choisirParmi`), **sans appel au modèle** ; la réponse relance la même
consigne, masquée. Aucune correspondance → le mot reste. Un agent : seule
sa propre mention est masquée ; une autre reste (la copie ne contient que
lui : une requête sur un autre nom ne rend rien, comme aujourd'hui).

### 5.4 Tests du lot 1

- `echappee.test.ts` : en simulé, chaque message et chaque résultat d'outil
  remis au modèle passe `fuites(...)` à vide ; le texte rendu porte les noms ;
  la ligne du journal porte les deux versions ; un agent voit « l'agent A-2 ».
- `conversation.test.ts` : les trois niveaux de S3 ; la précision est posée
  avant tout appel d'échappée (aucun `appel_modele` d'issue `echappee` au
  journal) ; un agent qui nomme un autre agent dans une demande nouvelle.
- Métier : `nomsConnus` = identifiants ; `quiParle` sans nom.
- **Passe réelle** `pnpm evals echappee` (§ 8).

---

## 6. Lot 2 — La fabrication lit les versions modèle (S5)

`EchappeeJournalisee` (`promotion.ts`) gagne `consigneModele` et
`texteModele`, lus dans `donnees` de la ligne `echappee` ; une échappée
d'avant ce plan (sans ces champs) **n'est pas fabricable** : le dossier le
dit (« échappée antérieure aux pseudonymes »), on ne refabrique pas avec des
noms. `messageFabriquer` écrit `Consigne : <consigneModele>` et
`Réponse montrée : <texteModele>` ; les requêtes et résultats journalisés
sont déjà ceux envoyés (pseudonymes). `completerGeste` : la valeur d'un
paramètre `agent` dans un test est désormais un identifiant (la demande
masquée l'écrit ainsi) : `estId` le résout ; la forme « telle que la demande
l'écrit » reste acceptée pour un mot inconnu. Le rejeu (`contient` sur le
texte montré, instantané réel) ne change pas.

Tests : `fabriquer.test.ts` (le message ne porte aucun nom : `fuites` vide ;
une échappée sans `consigne_modele` est refusée avec le motif) ;
`promotion.test.ts`. **Passe réelle** `pnpm evals promotion` (§ 8).

---

## 7. Lot 3 — La mesure de fuite, partout (S7), et la doc

`evals/evals.ts` : pour chaque trace, `fuites` sur le système et sur chaque
message envoyé (consigne, résultats d'outils, relances) avec les personnes
du client fictif ; le cas porte `fuite: [...]` ; le tableau de
`evals/resultats/<date>-<passe>.md` gagne une colonne « fuite » et une ligne
de total ; seuil 0, affiché comme les autres seuils. Pour `traduire` aussi
(déjà à 0 depuis le 08/10 : on le prouve au lieu de l'affirmer).

Doc : README (§ Structure : `pseudonymes.ts` ; § Commandes : la colonne),
`HANDOFF.md`, le mini-site « Le harnais en clair » (la section « L'échappée »
passe de « décidé, à construire » à « construit, mesuré »), la présentation
(diapositive 8 : « rendue entre balises » + « sans aucun nom »).

---

## 8. Mesures avant de déclarer fini

| Quoi | Comment | Seuil |
|---|---|---|
| Fuite | colonne « fuite » sur `echappee`, `promotion`, `traduire` | 0, sans exception |
| Échappée avec pseudonymes | `pnpm evals echappee`, modèle réel, trois passes comme le 2026-10-09 | ≥ 41/42 ; chaque écart lu dans sa trace et classé (harnais, modèle, étiquette, point d'accès) |
| Promotion | `pnpm evals promotion` sur la copie du lot 2 de la promotion | fabrication : pas moins qu'avant (0/3 le 2026-10-10 : à comparer après que Lionel a tranché la fabrication) ; fuite 0 |
| Gestes appris | `pnpm evals gestes` | 100 % |
| Coût | tokens d'entrée d'une échappée avant / après (un identifiant est plus court qu'un nom) | mesure |

Ce qu'on regarde dans les écarts : le modèle qui écrit « A 1 » ou « l'agent
1 » (restitution manquée → le patron lit un identifiant, pas une fuite) ; une
requête `WHERE nom LIKE '%Karim%'` écrite malgré la consigne masquée (le
modèle aurait inventé un nom : impossible sans fuite, à vérifier) ; un
surnom dans une consigne d'éval (fuite attendue : l'étiquette le dit).

---

## 9. Ordre et parallélisme

Lot 0 seul. Lot 1 après (5.1, 5.2, 5.3 par trois sous-agents, un fichier de
test chacun ; la passe réelle à la fin). Lot 2 après le lot 1 (il lit les
champs que le lot 1 écrit). Lot 3 à la fin. Le plan `PLAN-RONDE.md` dépend du
lot 1 : la ronde lit `consigne_modele`, jamais la consigne mot pour mot.

---

## 10. À trancher par Lionel

1. **S1, identifiant stable** (recommandé) — ou des pseudonymes tirés au sort
   à chaque échappée : plus opaque pour le fournisseur (il ne peut pas relier
   deux échappées), mais il faudrait remapper `vacations.agent`, les
   propositions, les tests de fabrication ; et l'identifiant stable est
   précisément ce que le RGPD appelle pseudonymisation.
2. **S6, les sites et les postes en clair** (recommandé : ce sont des données
   de l'entreprise, pas des personnes) — ou masqués (`S-1`, `P-1`) si un client
   l'exige : même mécanisme, un jour de travail, à la demande.
3. **S3, une mention ambiguë** : la question avant l'échappée (recommandé) —
   ou laisser passer le mot tel quel (fuite acceptée, un aller-retour de moins).
4. **S3, un mot inconnu** passe tel quel et se mesure (recommandé) — ou la
   demande est refusée (« je ne connais pas ce nom ») : plus sûr, plus agaçant
   pour un surnom, et un faux refus sur un mot qui n'est pas un nom.
5. **Les constats dans la copie** : S2 masque leur motif ; confirmer qu'on les
   garde (ils servent aux questions « qui est en infraction ? »).
