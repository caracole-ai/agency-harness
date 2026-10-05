# Entretien — sécurité privée

Les grandes lignes de l'interview du dirigeant, le jour de l'immersion : ce
qu'il faut obtenir pour poser le devis et les spécifications. C'est une vue de
`fiche.md` (état du 2026-09-29) et de `../../methode/`. Le questionnaire
complet de la journée, avec ses branches, est dans `observation.md`.

Durée : une heure à une heure et demie, avec le dirigeant, en début de
journée. Les codes renvoient à la fiche (I : interdit, O : bon résultat,
D : donnée, B : brique, E : escalade).

---

## Ce qu'il faut avoir en sortant

Sans ces huit éléments, pas de devis. S'il en manque un le soir, c'est la
première question du lendemain.

| # | Élément du devis | La question qui le donne | Rubrique |
|---|---|---|---|
| 1 | **La douleur, chiffrée** : quoi, combien de fois, combien de temps | « Le dernier remplacement au pied levé : combien de temps au téléphone ? Combien par semaine ? » | 8 |
| 2 | **Le périmètre** : quelle piste, et ce qu'elle ne fait pas | « Si on ne réglait qu'une chose, laquelle ? » | 8 |
| 3 | **Les volumes** : agents, sites, postes, vacations par mois, désistements par semaine | « Combien de… ? » sur des chiffres de la semaine dernière, pas des moyennes | 7 |
| 4 | **Les règles applicables à leur cas** : leurs activités (SSIAP, cynophile, télésurveillance), leur sous-traitance, leurs clients ERP | « Quelles activités, pour quels types de sites ? Vous sous-traitez ? » | 1 |
| 5 | **Les tests d'acceptation** : deux ou trois incidents datés | « C'est déjà arrivé ? Quand ? Racontez. » | 2 |
| 6 | **Qui décide** : qui valide une affectation, un planning, une modification, le jour et la nuit | « Qui a le dernier mot sur une affectation ? La nuit ? » | 4 |
| 7 | **Les données et leur fiabilité** : où sont les dates des titres, et sont-elles justes | « Montrez-moi les dates des cartes. Cette ligne, elle est juste ? » | 7 |
| 8 | **Les contraintes** : outil en place et ses exports, hébergement, acceptation par les agents | « Votre logiciel exporte ? Vos agents répondraient à un SMS ? » | 3 |

Plus deux faits hors grille : **qui décide de l'achat**, et **quand** il
faudrait que ça tourne. Ne jamais parler du prix : il se fixe quand on sait ce
qu'on construit.

---

## Le déroulé

Le tronc commun (`../../methode/socle.md` § 4) donne l'ordre. Ce qui suit, ce
sont les questions propres à ce métier. En gras : la question prioritaire de
chaque bloc.

### 1. Ouverture
- Accord pour enregistrer, et ce qu'on en fera.
- « D'abord je vous pose des questions pour comprendre. À la fin, je vous
  montre une ou deux idées. »

### 2. La chaîne
- **« Prenons un site qui démarre : du contrat jusqu'à la paie, que se
  passe-t-il ? »** Noter chaque passage de main : 1→2 (offre vers
  consignes), 5→7 (planning modifié), 6→9 (heures vers la paie).
- « Vous êtes donneur d'ordre ou sous-traitant ? Les deux ? » (I-07)

### 3. Les limites
- **« Vous avez déjà eu un contrôle CNAPS ? Qu'ont-ils regardé, et
  relevé ? »** (I-01 à I-03, E-07)
- « La dernière fois qu'un agent était sur un poste sans la bonne carte ou le
  bon niveau SSIAP : qui s'en est aperçu ? » (I-01, I-02, I-04)
- « Le téléservice de déclaration des agents, depuis le 1er octobre : vous y
  êtes ? Qui s'en occupe ? » (I-20)
- « Qui signe un contrat, accepte un sous-traitant, envoie une offre ? »
  (E-03, E-04)

### 4. Le bon résultat
- **« La semaine où il manquait du monde, vous avez lâché quoi en
  premier ? »** (l'ordre de sacrifice, O-01 à O-07)
- « Qu'est-ce que votre client remarque, et qui vous vaut un appel ? »

### 5. Les données
- **« Les dates des cartes, du MAC, du SSIAP : où sont-elles, qui les met à
  jour ? »** (D-01 : tout en dépend)
- Les volumes de l'élément 3.

### 6. Proposer
- Seulement sur une douleur entendue. Les pistes et leurs questions de
  qualification sont dans `observation.md` § 8 et dans `prospection.md`.
- Le premier pilote par défaut est **la veille des titres (B-03)** : elle ne
  fait que lire et alerter (`../../methode/archetypes.md`, Veiller).

### 7. Clôture
- « Je vous renvoie par écrit les règles que j'ai comprises. Vous les
  corrigez, et elles deviennent l'annexe du devis. Qui les relira avec
  vous ? »

---

## Les signaux « ne le construisez pas »

Si l'un d'eux apparaît, le dire franchement.
- Moins d'un désistement par semaine, et un planning stable : le
  remplacement ne vaut pas un outil.
- Les dates des titres n'existent nulle part, et personne ne pourra les
  saisir : la veille n'a pas de quoi se nourrir. La première brique est alors
  le fichier, pas l'outil.
- Le logiciel en place fait déjà la veille des titres, et elle est suivie.
- Le dirigeant attend de l'outil qu'il décide seul des affectations (G-01).

## Ne pas dire

`../../methode/socle.md` § 5, et en plus, pour ce métier :
- aucune règle de repos présentée comme sûre : deux textes sont en vigueur
  (fiche, en tête) ;
- aucune leçon sur une pratique contraire à un texte, sur le moment.
