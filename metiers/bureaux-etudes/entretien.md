# Entretien — bureaux d'études et laboratoires d'essais

Les grandes lignes de l'interview du dirigeant, le jour de l'immersion : ce
qu'il faut obtenir pour poser le devis et les spécifications. C'est une vue de
`fiche.md` (état du 2026-09-30) et de `../../methode/`. Le questionnaire
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
| 1 | **La douleur, chiffrée** : quoi, combien de fois, combien de temps | « Le dernier rapport : combien de temps en mise en forme, combien en calcul et en vérification ? Combien de rapports par mois ? » | 8 |
| 2 | **Le périmètre** : quelle piste, et ce qu'elle ne fait pas | « Si on ne réglait qu'une chose, laquelle ? » | 8 |
| 3 | **Les volumes** : affaires par an, rapports par mois, ingénieurs et juniors, essais par mois | « Combien de… ? » sur des chiffres du mois dernier, pas des moyennes | 7 |
| 4 | **Les règles applicables à leur cas** : le sous-métier, l'accréditation et sa portée, les marchés publics et leur CCAG, le parasismique | « Vous êtes BET, labo, contrôleur, diagnostiqueur ? Accrédités ? Marchés publics ? » | 1 |
| 5 | **Les tests d'acceptation** : deux ou trois corrections ou incidents datés | « Le dernier rapport repris avant signature, ou revenu après : quand ? Qu'est-ce qui clochait ? » | 2 |
| 6 | **Qui décide** : qui signe, par quelle délégation, et ce qu'un junior ne valide pas | « Qui signe ? Qu'est-ce qu'un junior ne peut pas valider seul ? » | 4 |
| 7 | **Les données et leur fiabilité** : modèles, paragraphes types, références et éditions, portée à jour | « Montrez-moi le modèle de rapport et la liste des normes citées. Qui les tient à jour ? » | 7 |
| 8 | **Les contraintes** : logiciels et exports, confidentialité imposée par les maîtres d'ouvrage, normes sous licence, validation Cofrac, hébergement | « Vos maîtres d'ouvrage vous imposent la confidentialité ? Votre LIMS exporte ? » | 3 |

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
- Dire tout de suite : **l'outil ne lira pas vos normes** (I-05). Ça évite une
  objection qui empoisonnerait la suite.

### 2. La chaîne
- **« Prenons la dernière affaire : de la consultation jusqu'à la facture, que
  se passe-t-il ? »** Noter chaque passage de main : 1→2 (offre vers dossier),
  3→4 (hypothèses et leur source), 4→5 (ce qui a été vérifié), 6→8 (phase
  livrée vers facture).
- « Vous êtes plutôt structure, fluides, thermique, maîtrise d'œuvre ?
  Laboratoire ? Contrôle ? Diagnostic ? » Le sous-métier décide de tout le
  reste (fiche, en tête).

### 3. Les limites
- **« Le dernier rapport repris avant signature, ou revenu après : qu'est-ce
  qui clochait ? »** (I-06 à I-09, I-15)
- « Les normes citées : comment vous savez que c'est la bonne édition ? »
  (I-06)
- « Qui signe ? Par quelle délégation ? » (E-01, I-04, I-12)
- Au laboratoire : « Le dernier écart relevé par le Cofrac ? » (I-07 à I-13)
- En contrôle technique : « Comment vous vérifiez qu'aucune affaire ne vous
  met en situation de concevoir ce que vous contrôlez ? » (I-03)

### 4. Le bon résultat
- **« Entre un rapport livré à temps mais peu soigné, et un rapport soigné
  livré en retard, lequel ? Et qu'est-ce que vous ne lâchez jamais ? »**
  (O-01 à O-05)
- « Qu'est-ce que vos clients remarquent dans un rapport ? »

### 5. Les données
- **« Le modèle de rapport et les paragraphes types : où sont-ils, qui les
  tient à jour ? »** (D-02)
- « La liste des normes citées et leurs éditions, elle existe ? » (D-03)
- Au laboratoire : « La portée d'accréditation est-elle à jour, et où ? »
  (D-04 : si elle est fausse, le garde-fou est faux)
- Les volumes de l'élément 3.

### 6. Proposer
- Seulement sur une douleur entendue. Les pistes et leurs questions de
  qualification sont dans `observation.md` § 8 et dans `prospection.md`.
- Le premier pilote par défaut est **le registre des références (B-02)** : il
  ne fait que lire et alerter (`../../methode/archetypes.md`, Veiller).
- Au laboratoire accrédité : annoncer que la **validation de l'outil** (I-13)
  fait partie du travail.

### 7. Clôture
- « Je vous renvoie par écrit les règles que j'ai comprises. Vous les
  corrigez, et elles deviennent l'annexe du devis. Qui les relira avec
  vous ? »

---

## Les signaux « ne le construisez pas »

Si l'un d'eux apparaît, le dire franchement.
- Quelques rapports par mois, dans un modèle déjà automatisé : le gain ne vaut
  pas un outil.
- Le dirigeant veut un outil qui **lit et résume les normes** : c'est
  précisément ce qu'on ne fera pas (I-05). S'il n'y a pas d'autre douleur, ne
  rien construire.
- Aucun modèle maison, aucun paragraphe type : la première brique est le
  modèle, pas l'outil.
- Au laboratoire, personne ne peut porter la validation de l'outil (I-13).
- Le dirigeant attend de l'outil qu'il valide ou signe à la place d'un
  ingénieur (G-01).

## Ne pas dire

`../../methode/socle.md` § 5, et en plus, pour ce métier :
- jamais « chercher dans les normes » (I-05) ;
- rien sur les Eurocodes de deuxième génération présenté comme sûr ;
- aucune leçon sur une pratique contraire à un texte, sur le moment.
