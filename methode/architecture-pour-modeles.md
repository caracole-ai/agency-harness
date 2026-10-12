# L'architecture du harnais, pour un modèle

<!-- PLAN-RONDE.md § 4.3, R6 : la carte que lisent la ronde, le plan, l'implémentation et la relecture. Aucune donnée client ici, jamais (un test le vérifie). -->

Tu lis cette page parce que tu travailles sur le harnais sans jamais voir les
données d'un client : la ronde de nuit (tu désignes ce qui manque), le plan
d'un chantier, son implémentation, ou sa relecture. Elle est la même pour
tous ; elle ne change pas quand le modèle change.

## Ce qu'est le harnais

Un outil de travail pour une petite entreprise d'un métier donné. Le patron et
ses salariés lui parlent en français ; il traduit la phrase en un **geste**,
exécute le geste, et répond. Tout ce qui se passe est écrit dans un
**journal** en ajout seul, chez le client.

## Les quatre bandes, et qui y écrit

| Bande | Ce qu'elle contient | Où | Qui y écrit |
|---|---|---|---|
| **Le moteur** | la conversation, la traduction, l'échappée, la promotion, le journal, les contrôles, le calendrier juridique, l'accès aux modèles | `moteur/` | l'agence, à la main ; **jamais un modèle** |
| **La méthode** | les règles communes à tous les métiers, les archétypes, cette carte | `methode/` | l'agence |
| **Le métier** | les interdits et leurs contrôles (`regles.yaml`, codés `I-01`…`I-20`), les gestes codés, les intentions connues, le vocabulaire, la fiche | `metiers/<métier>/` | l'agence ; le **chantier** n'y écrit que les gestes, les intentions, leurs tests et la fiche, jamais une règle |
| **Le client** | ses données, ses réglages (`config.yaml`), son registre d'accès, son journal, ses gestes appris | son dossier, jamais versionné | le harnais en service et le patron ; **jamais le chantier** |

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

## Deux étages de geste

1. **Le geste appris** : une donnée (un fichier YAML chez le client), pas du
   code. Des paramètres d'une liste fermée, des requêtes SQL paramétrées sur
   une copie en lecture seule, un gabarit de réponse rendu par le code ; ou,
   pour une écriture, des réaffectations proposées. Fabriqué par le modèle du
   quotidien depuis trois échappées validées, vérifié en code par rejeu,
   activé par le patron. C'est le chemin court, pour une intention du
   catalogue qui revient (`pnpm promotions`).
2. **Le geste codé** : du TypeScript dans la bande métier, comme les gestes
   d'origine. Écrit par le chantier pour ce que l'étage 1 ne sait pas dire :
   une simulation qui demande les règles, une intention nouvelle, plusieurs
   demandes à factoriser, une fabrication qui a échoué (« à coder à
   l'atelier »).

## Les trois espaces d'une demande

1. **Un geste du catalogue** : la traduction le choisit, le code l'exécute,
   sans autre appel au modèle.
2. **L'échappée** : une demande nouvelle (aucun geste ne correspond) ; le
   modèle du quotidien interroge une copie jetable des données, en lecture
   seule, à l'échelle du rôle, avec des identifiants à la place des noms ; sa
   réponse passe les contrôles avant d'être montrée.
3. **La promotion** : une demande nouvelle qui revient (trois fois en trente
   jours) devient un geste appris.

## Ce qu'un modèle ne fait jamais

- Écrire, modifier ou lever une règle (`regles.yaml`, un contrôle
  `I-01`…`I-20`) : elles viennent d'une relecture humaine des textes.
- Toucher le moteur, l'interface, la méthode ou un réglage d'un client.
- Lire une donnée d'un client : ni nom, ni planning, ni résultat de requête,
  ni texte montré. La ronde lit ce qui a été **demandé** (des consignes où
  un identifiant tient lieu de nom) et **comment ça a fini**, en comptes.
- Fusionner, livrer, pousser : c'est le code qui le fait, sous des conditions
  qu'il vérifie lui-même.
- Deviner : une donnée manque, il le dit.

## Ce qui mérite une mission (la ronde)

- une demande nouvelle qui revient sans intention commune (plusieurs
  consignes qui se ressemblent sous des mots-clés différents) ;
- une intention du catalogue qu'un geste appris ne peut pas exprimer (une
  simulation, une règle à appliquer), ou dont la fabrication a échoué ;
- des abandons ou des « je ne sais pas faire » qui se ressemblent ;
- une demande coûteuse (beaucoup de tours, beaucoup de dollars) qui revient ;
- plusieurs intentions de lecture proches, qu'un seul geste servirait
  (factorisation).

Ce qui n'en mérite pas :

- une demande vue une seule fois ;
- une intention du catalogue au seuil de promotion : `pnpm promotions` la
  prend déjà (« promotion en cours ») ;
- une intention qui a déjà un geste actif ;
- une mission déjà ouverte, ou retirée (la mémoire le dit).

Les sortes de mission : `geste_code`, `intention_nouvelle`, `factorisation`,
et `question_pour_l_atelier` (ce qui ne tient pas dans la bande métier, ou
qu'il faut découper : rien ne se lance). Une mission désigne par
identifiants (échappées, intentions) et décrit par types : ses consignes-types
ont des places (« combien d'heures a fait <agent> entre <du> et <au> »),
jamais un identifiant ni un nom.

## Comment finir

Tout travail finit par le bloc :

- **Vérifié** : les surfaces nommées concrètement (fichiers, commandes,
  tests passés).
- **Non vérifié, risque** : ce qui pourrait casser et n'a pas été testé ; vide
  seulement si une phrase justifie pourquoi rien d'autre n'est en jeu.
