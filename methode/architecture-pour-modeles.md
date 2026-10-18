# L'architecture du harnais, pour un modèle

<!-- PLAN-RONDE.md § 4.3, R6 : la carte que lisent le plan, l'implémentation et la relecture d'un chantier. Aucune donnée client ici, jamais (un test le vérifie). -->

Tu lis cette page parce que tu travailles sur le harnais sans jamais voir les
données d'un client : le plan d'un chantier, son implémentation, ou sa
relecture. Elle est la même pour
tous ; elle ne change pas quand le modèle change.

## Ce qu'est le harnais

Un outil de travail pour une petite entreprise d'un métier donné. Le patron et
ses salariés lui parlent en français ; il traduit la phrase en un **geste**,
exécute le geste, et répond. Tout ce qui se passe est écrit dans un
**journal** en ajout seul, chez le client.

## Les quatre bandes, et qui y écrit

| Bande | Ce qu'elle contient | Où | Qui y écrit |
|---|---|---|---|
| **Le moteur** | la conversation, la traduction, l'échappée, le journal, les contrôles, le calendrier juridique, l'accès aux modèles | `moteur/` | l'agence, à la main ; **jamais un modèle** |
| **La méthode** | les règles communes à tous les métiers, les archétypes, cette carte | `methode/` | l'agence |
| **Le métier** | les interdits et leurs contrôles (`regles.yaml`, codés `I-01`…`I-20`), les gestes codés, les intentions connues, le vocabulaire, la fiche | `metiers/<métier>/` | l'agence ; le **chantier** n'y écrit que les gestes, les intentions, leurs tests et la fiche, jamais une règle |
| **Le client** | ses données, ses réglages (`config.yaml`), son registre d'accès, son journal, ses missions commandées | son dossier, jamais versionné | le harnais en service et le patron ; **jamais le chantier** |

La hiérarchie se lit de haut en bas : un étage s'appuie sur celui du dessus
et ne le modifie pas. Les **réglages** d'un client (plafonds, modèle du
quotidien, préférences) sont à lui. Les **modèles** sont des outils
interchangeables : ils ne décident d'aucune règle.

## Ce qu'est un geste

Un enchaînement déterministe d'instructions, codé et testé, que la traduction
choisit et que le code exécute. Il a un identifiant (`voir_planning`), une
description de 200 caractères au plus, des paramètres typés, une exécution,
et au moins trois cas de traduction dans les évals. Un geste qui lit répond
tout de suite ; un geste qui écrit attend un « oui » explicite, et une
réaffectation passe par la proposition du métier : contrôles des règles, oui
du patron, oui de chaque agent concerné, clé sur la liste exacte. Un geste
n'écrit jamais lui-même dans le planning.

## D'où vient un geste nouveau

D'une **commande du patron**, et de rien d'autre. Quand l'outil ne sait pas
faire une demande, le patron la voit, regroupée avec celles qui lui
ressemblent ; s'il clique « Créer ce geste », le code écrit une mission
(`missions/<date>/<intention>.yaml` chez le client) depuis les demandes
réelles, des places à la place des noms. À l'agence, un chantier la code dans
la bande métier : plan, implémentation, garde du diff, `pnpm check`,
relecture, mesure de la traduction, rejeu du geste contre l'échappée, puis
fusion si les neuf conditions sont vertes. Le geste porte l'identifiant de
la mission. Aucun modèle ne cherche
lui-même ce qui manque.

## Les trois espaces d'une demande

1. **Un geste du catalogue** : la traduction le choisit, le code l'exécute,
   sans autre appel au modèle.
2. **L'échappée** : une demande nouvelle (aucun geste ne correspond) ; le
   modèle du quotidien interroge une copie jetable des données, en lecture
   seule, à l'échelle du rôle, avec des identifiants à la place des noms ; sa
   réponse passe les contrôles avant d'être montrée.
3. **La commande** : une demande nouvelle est montrée au patron ; un geste
   n'en naît que s'il le commande.

## Ce qu'un modèle ne fait jamais

- Écrire, modifier ou lever une règle (`regles.yaml`, un contrôle
  `I-01`…`I-20`) : elles viennent d'une relecture humaine des textes.
- Toucher le moteur, l'interface, la méthode ou un réglage d'un client.
- Lire une donnée d'un client : ni nom, ni planning, ni résultat de requête,
  ni texte montré. Une mission ne porte que ce qui a été **demandé**, des
  places à la place des noms.
- Fusionner, livrer, pousser : c'est le code qui le fait, sous des conditions
  qu'il vérifie lui-même.
- Deviner : une donnée manque, il le dit.

## Une mission

Une seule sorte : `geste_code`, un geste commandé par le patron. Elle désigne
par identifiants (échappées, intention) et décrit par types : ses
consignes-types ont des places (« combien d'heures a fait <personne> cette
semaine »), jamais un identifiant ni un nom. Ce qui ne tient pas dans la
bande métier se dit au plan (`faisable` faux) : une question pour l'atelier,
rien ne se lance.

## Comment finir

Tout travail finit par le bloc :

- **Vérifié** : les surfaces nommées concrètement (fichiers, commandes,
  tests passés).
- **Non vérifié, risque** : ce qui pourrait casser et n'a pas été testé ; vide
  seulement si une phrase justifie pourquoi rien d'autre n'est en jeu.
