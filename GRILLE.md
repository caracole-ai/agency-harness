# La grille d'une fiche métier

Une fiche métier (`metiers/<métier>/fiche.md`) décrit la **couche métier** d'un
harnais : ce qui vaut pour toutes les entreprises d'un secteur. Elle se remplit
en trois temps :
1. ce que disent les textes (réglementation, convention collective) ;
2. ce que la prospection a déjà appris (`../reperage`) ;
3. ce que les clients racontent sur place.

À côté de la fiche, un métier peut avoir un **guide d'entretien**
(`metiers/<métier>/guide-entretien.md`) : les mêmes questions dans l'ordre d'un
rendez-vous, à lire sur place. La fiche fait foi ; le guide en est une vue, et
se reprend quand la fiche change.

Elle a neuf rubriques, en trois blocs :
- **les bornes** (0 à 5) : la chaîne, puis ce qui ne doit jamais arriver, les
  tests qui le prouvent, les outils, les moments où l'humain reprend la main,
  les mots. C'est le harnais. La chaîne est la colonne vertébrale : chaque
  rubrique s'y rattache à une étape ;
- **l'objectif** (6 et 7) : ce qu'est un bon résultat à l'intérieur des bornes,
  et les données dont l'outil a besoin pour le chercher. Sans eux, on sait
  protéger un outil, pas le construire ;
- **l'offre** (8) : les briques que l'agence peut construire dans ce métier, et
  les questions qui disent si l'une d'elles vaut le coup chez ce client.

## Statuts d'un fait

Chaque ligne porte un statut. C'est ce qui empêche une hypothèse de se
déguiser en fait.

| Statut | Sens | Exemple de source |
|---|---|---|
| `texte` | écrit dans un texte opposable | l'article : code, convention collective, arrêté |
| `déclaré` | dit sur place par le client, **sans** document vu ni incident daté | client A, entretien du AAAA-MM-JJ, rôle de la personne |
| `constaté` | vu chez un client : document montré, écran, ou incident raconté **avec sa date** | client A, entretien du AAAA-MM-JJ |
| `confirmé` | constaté chez au moins deux clients | clients A et B |
| `hypothèse` | plausible, pas encore entendu ni vu : **à vérifier sur place** | déduction, presse, recherche |

Une hypothèse ou une déclaration ne sert jamais à construire, seulement à poser
une question. Pour une déclaration, la question est toujours la même : « vous
pouvez me montrer ? » ou « c'était quand, la dernière fois ? ». Sa réponse la
fait passer en `constaté`.

Une ligne `texte` ne sert à coder un garde-fou qu'une fois l'article **relu
mot à mot, dans sa version en vigueur**. La ligne relue porte alors `texte` ✓,
et la fiche dit en tête à quelle date et dans quel fichier cette relecture est
consignée. Une recherche peut avoir lu le texte à travers un résumé ou une
reproduction, qui déforment un chiffre sans prévenir. Un texte relu se relit
encore avant chaque livraison : il change (la fiche sécurité privée en a vu
trois modifiés en 2026).

**Aucun nom de client dans une fiche métier, pas même dans une source.** Les
clients y sont désignés par une lettre (client A, client B), dans l'ordre des
premiers entretiens. La table des lettres vit dans `clients/index.md`, qui
n'est pas versionné comme le reste de `clients/`.

## Métier ou client ?

Le test : **est-ce que ce serait vrai chez un concurrent du client ?**
- Oui → couche métier, dans la fiche, sans nom ni chiffre du client.
- Non (ses seuils, ses clients, ses habitudes, ses outils maison) → couche
  client, dans `clients/`.
- Incertain → couche client pour l'instant, avec une note « à reposer chez le
  prochain ». Monter trop tôt au métier est l'erreur la plus coûteuse : une règle
  d'un seul client, appliquée à tous, devient un faux interdit.

---

## 0. La chaîne

Les étapes, de la demande du client final jusqu'à l'encaissement. Une ligne par
étape.

| # | Étape | Entrée | Sortie | Qui | Outil aujourd'hui | Statut |
|---|---|---|---|---|---|---|

On cherche **où le travail change de mains** : chaque passage de main est un
endroit où l'information se perd, et donc un bon candidat pour un interdit ou
un test.

## 1. Interdits

Ce qui ne doit **jamais** arriver. Un interdit est binaire, et sa violation a
une conséquence nommée : sanction, perte du client, accident, argent.

| ID | Interdit | Étape | Conséquence | Vérifiable par | Statut | Source |
|---|---|---|---|---|---|---|

- **Vérifiable par** : `code` si une règle déterministe suffit (date, seuil,
  présence d'un document), `humain` si ça demande un jugement. Un interdit
  vérifiable par code ne passe jamais par le modèle : c'est un garde-fou, pas
  un prompt.
- Le libellé est une phrase qu'on peut tester : « aucun agent affecté sans
  carte professionnelle valide à la date de la vacation », pas « respecter la
  réglementation ».

## 2. Tests types

Des cas concrets, rejouables, qu'un harnais doit passer **avant** d'être livré,
et à chaque changement de modèle. La plupart naissent d'un incident raconté.

| ID | Étant donné | Quand | Alors | Interdit couvert | Statut | Source |
|---|---|---|---|---|---|---|

- Chaque interdit a au moins un test. Un test sans interdit est soit un
  interdit oublié, soit un test de confort à retirer.
- Les données du test sont **fictives et génériques**. Le cas réel du client
  vit dans `clients/`, et il ne sert qu'à écrire la version générique.

## 3. Connecteurs

Les logiciels, fichiers et formats par lesquels le harnais lit et agit.

| Outil ou catégorie | Usage | Étape | Accès (API, export, fichier, saisie) | Lecture / écriture | Qui le tient | Statut |
|---|---|---|---|---|---|---|

Au niveau métier, on note les **catégories** et les **éditeurs récurrents**.
L'outil précis d'un client, ses identifiants et ses exports vont dans `clients/`.
Un connecteur en écriture est un risque : il se note avec l'interdit qui le
borne.

## 4. Moments d'escalade

Quand l'agent s'arrête et rend la main à un humain.

| ID | Déclencheur | Étape | Qui reprend (rôle) | Délai | Ce qu'on lui présente | Statut |
|---|---|---|---|---|---|---|

Trois familles, toujours à chercher :
- **responsabilité** : quelqu'un doit signer ou engager l'entreprise ;
- **incertitude** : l'entrée ne ressemble à rien de connu ;
- **urgence** : le délai est plus court que la boucle de l'agent.

## 5. Vocabulaire

Les mots du métier, dans **leurs** définitions, pas les nôtres.

| Terme | Définition (leurs mots) | Synonymes, abréviations | Piège | Statut |
|---|---|---|---|---|

La colonne **Piège** est la plus précieuse : c'est le mot qui a un autre sens
ailleurs, ou deux sens dans la même maison. Un agent qui l'ignore se trompe
avec aplomb.

## 6. Le bon résultat

Entre deux résultats qui respectent tous les interdits, lequel le client
préfère-t-il, et pourquoi ? C'est ce qu'un outil **optimise** : un interdit est
une contrainte dure, un objectif est une préférence qu'on peut sacrifier.

| ID | Objectif ou préférence | Étape | Qui y tient | Ordre de sacrifice | Statut | Source |
|---|---|---|---|---|---|---|

- **Ordre de sacrifice** : quand tout ne tient pas, ce qu'on lâche en premier.
  C'est la colonne qui manque toujours, et c'est elle qui fait qu'un outil
  décide comme le client. On l'obtient par un cas : « la semaine où il manquait
  deux agents, qu'avez-vous laissé tomber ? »
- Une préférence qui ne se sacrifie jamais est en fait un interdit : elle
  descend en rubrique 1.
- Au niveau métier, on note les préférences **récurrentes** du secteur ; leur
  poids chez un client donné est une donnée client.

## 7. Les données

Ce dont l'outil a besoin pour respecter les interdits et chercher le bon
résultat : d'où ça vient, et à quel point c'est fiable.

| ID | Donnée | Sert à | Où elle vit | Fraîcheur, fiabilité | Qui la tient | Statut |
|---|---|---|---|---|---|---|

- Une donnée dont dépend un interdit et dont la fiabilité est inconnue est un
  **risque à lever avant le devis** : un garde-fou juste nourri d'une date
  fausse laisse passer l'erreur avec aplomb.
- Les volumes (combien d'agents, de sites, de dossiers par semaine) sont des
  données client : la fiche métier dit seulement qu'il faut les mesurer.
- Une donnée personnelle se prend au plus juste de ce que l'outil en fait
  (une commune plutôt qu'une adresse pour un temps de trajet).

## 8. Briques à proposer

Ce que l'agence sait construire dans ce métier. Une brique **se propose en fin
d'entretien, jamais avant d'avoir entendu la douleur** : une solution présentée
tôt oriente les réponses, et le client se met à décrire ce qu'il croit qu'on
veut entendre.

| ID | Brique | Douleur qu'elle traite | Interdits qu'elle doit respecter | Ce qui la qualifie (questions) | Statut |
|---|---|---|---|---|---|

- **Ce qui la qualifie** : les questions dont les réponses disent si la brique
  vaut le coup chez ce client (volume, fréquence, temps perdu aujourd'hui, qui
  décide) et si elle est faisable (données, accès, acceptation par ceux qui
  l'utiliseront).
- Une brique qui écrit quelque part (planning, message à un salarié, document
  sortant) se note avec les interdits qui la bornent, comme un connecteur en
  écriture.

---

## Questions ouvertes

La liste de ce qui reste en `hypothèse` ou en `déclaré`, rangée par rôle à
interroger. C'est le guide du prochain entretien. Ce qui se tranche en relisant
un texte, et non chez un client, a sa propre liste.
