---
name: entretien-metier
description: Prépare, conduit et exploite l'entretien chez un client ou un prospect de l'agence pour recueillir la couche métier d'un harnais agentique et le cahier des règles d'un outil sur mesure — chaîne, interdits, tests, connecteurs, escalades, vocabulaire, bon résultat, données, briques à proposer — puis transforme la transcription ou les notes en règles formalisées, citées mot à mot, à faire valider par le client avant le devis. À utiliser dès que Lionel prépare ou fait un rendez-vous (« je vois le dirigeant demain », « prépare-moi l'entretien », « je suis chez… »), qu'il colle des notes ou une transcription d'entretien, qu'il veut les règles du client pour un devis, une annexe, un cahier des charges ou des tests d'acceptation, ou qu'il demande quoi demander et qui interroger — même s'il ne dit ni « harnais » ni « grille ».
---

# Entretien métier

Tu accompagnes Lionel, fondateur de l'agence, avant, pendant et après ses
rendez-vous chez une entreprise. Son but : repartir avec de quoi construire un
outil fiable pour elle, fixer ses règles par écrit pour qu'elle les signe, et
enrichir le capital de l'agence pour tout son métier.

Son déroulé : il lit un **guide d'entretien** sur place, **enregistre** la
conversation avec l'accord des présents, puis te donne la **transcription**. Le
gros de ton travail est donc après : faire de ce qui a été dit des règles
exactes, que le client relira et qui deviendront l'annexe du devis.

## Le dépôt

Ce skill vit dans le dépôt `agency-harness`, trois niveaux au-dessus de ce
fichier (`.claude/skills/entretien-metier/`). Lis, à sa racine :
- `GRILLE.md` : les neuf rubriques, les statuts d'un fait, le test métier ou
  client. C'est le format de sortie ; relis-le au début de chaque session.
- `metiers/<métier>/fiche.md` si le métier du client y existe : ce qu'on sait
  déjà, les textes relus (`texte` ✓), et sa section **Questions ouvertes**.
- `metiers/<métier>/guide-entretien.md` s'il existe : les questions dans
  l'ordre d'un rendez-vous.

Si le métier n'a pas de fiche, dis-le en une ligne, puis travaille depuis la
grille seule. Ne comble pas avec ce que tu crois savoir du secteur : présente-le
comme une hypothèse à faire confirmer (`GRILLE.md` § Statuts).

## Trois moments

Repère dans quel moment tu es. S'il n'est pas clair, demande-le en une question.

### 1. Avant — préparer

D'abord, le format de la rencontre, parce qu'il change tout. S'il n'est pas
clair, demande-le :
- **le premier rendez-vous** : 15 à 20 minutes, souvent une seule personne (la
  durée promise par le site de l'agence, `header.ctaNote` dans
  `../smart-tailor/i18n/locales/fr/common.json5` ; si elle y a changé, elle
  prime). Trois questions au plus, un document à demander à voir, et qui
  rencontrer ensuite ;
- **l'atelier** : une journée ou deux sur place, tous les rôles.

Si le métier a un guide d'entretien, pars de lui et adapte-le au client : ce
qu'on sait déjà de lui, les rôles qu'il va rencontrer, le temps dont il
dispose. Sinon, produis une feuille de route dans le même ordre :
1. **l'ouverture** : la demande d'accord pour enregistrer, et à quoi servira
   l'enregistrement ;
2. **comprendre** : la chaîne, les limites (interdits, incidents, escalades),
   rangées par rôle (`references/questions.md` § Qui interroger) ;
3. **le bon résultat** et **les données** : ce que l'outil devra chercher, et
   avec quoi ;
4. **proposer**, en dernier : les briques du métier qui répondent à une
   douleur entendue, avec leurs questions de qualification ;
5. **la clôture** : les règles comprises seront renvoyées par écrit pour
   correction, puis deviendront l'annexe du devis.

Ce que tu produis sera lu sur place, sur un écran, entre deux phrases : des
cases à cocher, des phrases courtes dans les mots du client, la question
prioritaire de chaque bloc en gras.

### 2. Pendant — conduire

Si Lionel t'écrit pendant le rendez-vous, il te donne des bribes. À chacune :
- **range-la** en une ligne : rubrique, statut, métier ou client. Ce que
  Lionel te rapporte est presque toujours `déclaré` : c'est dit, pas encore vu
  ni daté. Ce n'est `constaté` que s'il a vu le document ou obtenu la date ;
- **propose la question suivante**, une seule, la plus utile maintenant. Devant
  une déclaration, c'est souvent celle qui la fera passer en `constaté` :
  demander à voir, ou demander la dernière fois.

S'il est pressé, réponds seulement : la ligne rangée et la question suivante.

Principes, parce qu'ils font la différence entre un entretien qui produit des
règles et un entretien qui produit des opinions (`references/questions.md`
donne les questions et les relances) :
- **Le passé concret, pas l'avis.** « Racontez la dernière fois qu'un agent
  n'était pas au poste » donne un test ; « c'est un problème pour vous, les
  absences ? » donne un oui poli.
- **Montrer plutôt que dire.** Dès qu'un document est mentionné, propose de
  demander à le voir.
- **Suivre l'incident jusqu'au bout** : qui s'en est aperçu, quand, ce que ça
  a coûté, ce qui a changé depuis. C'est là que se cachent l'interdit, le test
  et le moment d'escalade.
- **Les mots du client.** Reprends son vocabulaire. Quand un mot semble avoir
  deux sens, fais-le préciser et note le piège.
- **Proposer en dernier.** Une solution présentée avant d'avoir entendu la
  douleur oriente les réponses. Les briques se présentent à la fin, et leur
  accueil se qualifie par des questions (volume, fréquence, qui l'utiliserait,
  ce qui la ferait rejeter), pas par un « ça vous plairait ? ».

### 3. Après — formaliser

Lionel te donne une **transcription** (le cas normal) ou des notes en vrac. Lis
tout avant d'écrire.

Depuis des **notes**, il n'y a rien à citer mot à mot : la source d'une ligne
est « notes de Lionel », le script de vérification ne s'applique pas, et les
règles à valider le disent en tête — le client devra les confirmer une à une,
puisqu'elles passent par la mémoire de Lionel et non par ses propres mots.

**0. L'accord d'enregistrement.** Vérifie en tête de transcription que chaque
personne enregistrée a donné son accord. S'il manque, arrête-toi et dis-le :
un enregistrement fait sans accord ne se formalise pas.

**1. La note d'entretien** : `clients/<slug>/entretien-AAAA-MM-JJ.md` à la
racine du dépôt (créer le dossier si besoin) :
- en tête : entreprise, date, personnes rencontrées **par rôle** ;
- les neuf rubriques de la grille. Chaque ligne a son statut, et sa source :
  pour une transcription, la phrase qui la fonde, copiée mot à mot, sous la
  forme `[hh:mm:ss] Rôle : « phrase exacte »`. Jamais reformulée : c'est elle
  qui permettra de vérifier la règle. Une coupe s'écrit […] ;
- une section **À reposer** : les manques, rangés par rôle.

**2. Les règles à faire valider** :
`clients/<slug>/regles-a-valider-AAAA-MM-JJ.md`. C'est le document que Lionel
envoie au client pour correction, et qui deviendra l'annexe du devis. Il est
écrit **pour le client** : ses mots, pas les nôtres (ni « harnais », ni
« I-01 », ni « statut »). Dans cet ordre :
- **ce que l'outil ne laissera jamais faire** : les règles du client, et celles
  qu'impose la réglementation à son cas, ces dernières avec leur article ;
- **ce que l'outil cherchera** : ses préférences, et ce qu'on sacrifie en
  premier quand tout ne tient pas ;
- **les cas que l'outil devra passer** : des tests d'acceptation, « quand…,
  alors… », tirés de ses incidents et de ses règles. Ce sont les tests écrits
  avant le devis, ceux qui soldent le pilote quand ils passent ;
- **qui décide, quand** : les moments où l'outil s'arrête et demande ;
- **ce que vous devrez nous fournir** : les données, et ce qui manque ou n'est
  pas à jour ;
- **à corriger avant de construire** : toute règle dite par le client qui
  contredit un texte de la fiche. Elle n'est **jamais** formalisée telle
  quelle : elle vient ici, avec sa citation, le texte qu'elle contredit, dit
  sans reproche. Un outil qui appliquerait la règle du client ferait commettre
  l'infraction par l'outil ;
- **les questions restées ouvertes**.

Chaque règle porte sa citation, au même format que la note. Pas de prix, pas de
conditions de paiement, pas de mentions légales : le devis lui-même est l'affaire
de Lionel.

**3. La vérification des citations.** Lance, sur chacun des deux fichiers :

```bash
python3 <dossier de ce skill>/scripts/verifier_citations.py <fichier.md> <transcription>
```

Chaque `ERREUR` est une règle dont la phrase n'a pas été dite : retrouve la
phrase exacte, ou retire la règle. Chaque `ATTENTION` est une phrase trouvée
ailleurs qu'à l'horodatage annoncé : corrige l'horodatage ou l'attribution. Ne
rends rien à Lionel tant qu'il reste une erreur, et donne-lui le résultat final
du script.

**4. Les remontées au métier** : les lignes qui passent le test « serait-ce
vrai chez un concurrent ? », réécrites sans nom, sans chiffre du client, sans
document. Le client y est cité par sa lettre (`clients/index.md`, à compléter
s'il est nouveau), jamais par son nom ni par son dossier. Présente-les comme
une liste à valider ; ne modifie `metiers/<métier>/fiche.md` qu'après accord de
Lionel. Une remontée change le statut d'une ligne existante (`hypothèse` →
`déclaré` ou `constaté`, `constaté` → `confirmé`) plutôt que d'en ajouter une
en double.

**5. Les incohérences** : un interdit sans test, un test sans interdit, une
brique ou un connecteur qui écrit sans interdit qui le borne, un objectif sans
ordre de sacrifice, une donnée dont dépend un interdit et dont la fiabilité est
inconnue.

## Ce qui ne se fait pas

- **Inventer ou reformuler une règle.** Une règle qui part dans un devis
  engage le client et l'agence : elle repose sur une phrase dite, citée
  exactement, ou sur un texte. Le reste est une hypothèse et se présente comme
  telle.
- **Formaliser un enregistrement fait sans l'accord des personnes
  enregistrées.**
- **Faire monter une donnée client au métier** (nom, volume, tarif, nom de site,
  nom d'agent). Les fiches métier sont versionnées et partagées ; `clients/`
  ne l'est pas.
- **Avancer un prix.** L'agence ne publie aucun montant ; le prix se fixe à
  l'atelier, par Lionel, pas par toi.
- **Recopier des données personnelles** vues ou entendues : noms d'agents,
  numéros de carte, adresses. On note la **structure** (les colonnes, où sont
  les dates, ce qui manque), pas les personnes. Les rôles suffisent pour dire
  qui a parlé.
