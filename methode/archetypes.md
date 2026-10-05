# Les archétypes

Les sortes de travail qu'un outil de l'agence peut faire. Un métier en combine
plusieurs. Chaque archétype a ses interdits types, ses tests types, sa
répartition entre le code et le modèle, et ses questions d'entretien « si…,
alors… », valables dans tout métier où il apparaît. Établi le 2026-09-30
sur les quatre métiers des pages du site. Les règles communes à tous les
outils (G-01 à G-07) et la mécanique du temps sont dans `socle.md`.

**Un nouveau métier** : on dit quels archétypes il combine, et sa fiche ne
porte que ce qui lui est propre (textes, paramètres, vocabulaire, qui
signe).

## Où se trouve chaque archétype

| Archétype | Sécurité | Transport | Études | Avocats |
|---|---|---|---|---|
| **Veiller** : échéances, délais, versions | ● titres, déclarations CNAPS (B-03) | ● délais de réserve et de prescription | ● éditions des normes, portée d'accréditation | ● délais de procédure, textes cités qui changent |
| **Planifier** sous contraintes | ●●● affectation, remplacement (B-01, B-02) | ● choix du substitué ; tournées (49.41) | — | — |
| **Rapprocher** : lire, compléter, relancer | ● heures vers la paie, mains courantes (B-05, B-06) | ●●● POD, LV, registre d'affrètement, facture | ● résultats d'essai vers le rapport ; pièces d'une offre | ● contrôle de conflit (clients et adversaires) |
| **Rédiger** sous règles, un humain signe | ● devis, mémoires (B-04) | ● brouillon de protestation, relance | ●●● rapports, notes | ●● notes, projets d'écritures |
| **Chercher** et citer à la bonne date | — | — | ● registre des références, **sans lire les normes** | ●●● recherche datée (Attendu) |

●●● cœur du métier, ● présent. Les renvois sont à `fiche.md` pour la
sécurité, et à `recherche-2026-09-29.md` § 9 pour les trois autres. Pour ces
trois-là, tout est en `hypothèse` tant qu'aucun entretien n'a eu lieu.

**Ce que le tableau montre** : **Veiller** est le seul archétype présent dans
les quatre métiers. C'est aussi partout le moins risqué : il ne fait que lire,
ne repose que sur du code, et ne touche à aucun document sortant. **C'est le
premier pilote par défaut dans chaque métier**, et la brique que le moteur doit
savoir faire en premier.

---

## Veiller

**Ce que c'est** : connaître les dates qui comptent, calculer à partir de
quand il est trop tard, et prévenir assez tôt pour qu'on puisse encore agir.

**Code ou modèle** : tout en code (le calendrier juridique du socle, § 2). Le
modèle peut seulement lire une date dans un document entrant, et cette date
se marque « à vérifier » tant qu'un humain ne l'a pas confirmée (G-02).

**Interdits types**
- Aucune échéance n'atteint sa limite sans une alerte donnée **assez tôt pour
  faire ce qu'elle exige** : suivre la formation, écrire les conclusions,
  envoyer la protestation. L'alerte se cale sur ce délai de préparation,
  pas sur l'échéance (sécurité I-17 : le MAC avant J-90).
- **Une date inconnue n'est pas une date lointaine** : une donnée absente
  déclenche sa propre alerte, jamais un silence.
- Là où une alarme existe déjà (logiciel de gestion des avocats), l'outil est
  un **second contrôle**. Il n'est jamais présenté comme la seule alarme.

**Tests types**
- Une échéance tombe un samedi, ou un jour férié : la limite est calculée
  avec la règle de report du métier.
- La date source est absente : alerte « date inconnue ».
- La date source change (renouvellement, nouvelle édition, texte modifié) :
  l'alerte suit sans intervention.
- Le délai de préparation dépasse le temps restant : alerte escaladée.

**Questions d'entretien**
- [ ] **« Le dernier délai ou la dernière échéance frôlé(e) : c'était
      quand ? »**
  - Si ça s'est passé → qui s'en est aperçu, combien de temps avant, qu'est-ce
    qui a été rattrapé ou perdu ?
  - Si « jamais » → « Comment le savez-vous ? Qui vérifie ? »
- [ ] **« Ces dates, elles vivent où ? »**
  - Si c'est un tableur → « Qui le met à jour, depuis quelle source, la
    dernière fois quand ? Prenons une ligne au hasard. »
  - Si c'est un logiciel → « Il prévient ? Qui reçoit l'alerte ? Et quand
    cette personne est en congé ? »
  - Si « de tête » → c'est la douleur. Demander combien de dates en tout.
- [ ] « Combien de temps faut-il pour faire ce que l'échéance exige ? »
      (formation, rédaction, collecte de pièces) : c'est ce qui fixe l'avance
      de l'alerte.

---

## Planifier

**Ce que c'est** : affecter des personnes ou des moyens à des créneaux, dans
des limites dures, en cherchant la meilleure solution.

**Code ou modèle** : **un solveur de contraintes choisit**, et les interdits
sont codés en dur. Un modèle de langage qui déciderait qui va où finirait par
inventer ou oublier une contrainte. Le modèle sert aux bords : lire une
absence reçue par message, parler à la personne, expliquer un choix, traiter
l'exception (sécurité, fiche § 8).

**Interdits types**
- Aucune affectation sans le **titre valide à la date du créneau** (socle,
  § 2).
- Aucune affectation qui dépasse un **plafond de temps** ou laisse moins que
  le **repos minimal**, sur une période glissante.
- Le **niveau requis par le poste** est respecté, même en urgence : c'est
  une escalade, pas une dérogation.
- Toute modification sous le délai de prévenance porte **l'accord tracé** de
  la personne.
- Une affectation publiée passe par un humain (G-01).

**Tests types** : vacation à cheval sur minuit ; nuit du changement d'heure ;
semaine à cheval sur deux périodes de décompte ; titre qui expire au milieu du
planning (seuls les créneaux suivants sont bloqués) ; aucun candidat qualifié
(escalade avec les plus proches et ce qui leur manque).

**Questions d'entretien**
- [ ] **« Le planning de la semaine dernière : pourquoi cette personne à cet
      endroit ? »** Chaque « parce que » est une préférence (rubrique 6).
- [ ] **« La dernière fois qu'il a fallu remplacer au pied levé :
      racontez. »**
  - Si ça a pris des heures → combien de fois par semaine, à quelle heure,
    par quel canal ?
  - Si quelqu'un a été envoyé sans vérifier → ce qui aurait dû être vérifié
    est un interdit, et le cas est un test.
- [ ] **« La semaine où il manquait du monde, vous avez lâché quoi en
      premier ? »** C'est l'ordre de sacrifice.
- [ ] « Qui valide le planning avant qu'il parte ? Et un changement de
      dernière minute ? »

---

## Rapprocher

**Ce que c'est** : lire ce qui arrive (document, scan, message, export),
le rattacher au bon dossier, dire ce qui manque, et préparer la relance.

**Code ou modèle** : le modèle **lit**, et chaque champ lu garde son extrait
et un indice de doute (G-03). Le code **juge** : la liste des mentions
obligatoires est fermée et vient du texte (lettre de voiture, CMR, facture,
rapport d'essai, mentions de L612-14). La relance est un brouillon, jamais un
envoi (G-01).

**Interdits types**
- **Aucun champ deviné** : un champ illisible ou ambigu se marque « à
  vérifier » (G-02).
- **Aucune écriture dans le document source** : on n'écrit jamais dans un
  document de transport, un registre tiers ou un rapport émis (G-05).
- Un dossier n'est déclaré **complet** que si toutes les mentions
  obligatoires du texte sont présentes.
- Une information **sensible entre parties** (prix d'achat et prix de vente,
  nom d'un client) ne passe jamais d'un dossier ou d'un destinataire à un
  autre (G-06).

**Tests types** : un document auquel il manque une mention obligatoire est
déclaré incomplet ; un champ taché est marqué « à vérifier » ; un document
arrive en double ; un document sans dossier correspondant est mis de côté,
pas rattaché au plus proche ; une signature sans nom ni cachet affaiblit la
preuve et le signale (transport, § 2.2).

**Questions d'entretien**
- [ ] **« Montrez-moi un document tel qu'il arrive, le pire de la
      semaine. »** Le voir, en noter la structure, jamais les noms.
- [ ] **« Le dernier dossier incomplet découvert trop tard : racontez. »**
  - Si c'était à la facturation → combien de jours perdus, et combien de
    dossiers par mois dans ce cas ?
  - Si c'était au litige → quel délai a été dépassé ? (retour à **Veiller**)
- [ ] **« Qui ressaisit quoi, et combien de temps par jour ? »**
  - Si c'est une ressaisie depuis du papier → « Manuscrit ? Photographié ?
    Par qui, et quand ? »
- [ ] « Les exigences de chaque client, elles sont écrites où ? »
  - Si « dans la tête de deux personnes » → les faire dire, une par une : ce
    sont des règles à faire valider.

---

## Rédiger

**Ce que c'est** : préparer un document dans le modèle maison, avec les
données du dossier, et le faire passer par les vérifications, avant qu'un
humain relise et signe.

**Code ou modèle** : le modèle rédige, à partir des paragraphes déjà validés
de la maison. Le code vérifie avant de rendre la main : mentions obligatoires
présentes, formulations interdites absentes, références citées avec leur
version, rien d'inventé hors des données du dossier. La signature est humaine
(G-01).

**Interdits types**
- Aucune **donnée d'entrée modifiée** : hypothèse de calcul, montant, date,
  résultat d'essai (garde-fou de la page des bureaux d'études).
- Les **mentions obligatoires** du métier sont présentes : sécurité I-08,
  facture de transport (contrat type, art. 19.4), rapport d'essai (« ne vaut
  que pour l'objet soumis à essai »).
- Les **formulations interdites** sont absentes : ancien policier ou
  militaire (sécurité I-09), « spécialiste » sans certificat (avocats, RIN
  10.2), référence trompeuse à l'accréditation (études, GEN REF 11 § 9).
- **Toute nouvelle version est tracée**, et l'original est conservé (études,
  17025 § 7.8.8).

**Tests types** : un brouillon qui contient une formulation interdite est
arrêté avant la relecture ; un résultat hors portée d'accréditation n'est
rapporté que marqué « non couvert » ; une hypothèse d'entrée changée entre
deux versions est signalée ; un document sans ses mentions n'est pas rendu.

**Questions d'entretien**
- [ ] **« Montrez-moi un document que vous avez corrigé récemment. Qu'est-ce
      qui a été corrigé ? »**
  - Si la même correction revient → c'est une vérification à coder, et un
    test.
  - Si c'est de la mise en forme → combien de temps par document ?
- [ ] **« Qui relit, et qu'est-ce qu'il vérifie à chaque fois ? »** Faire
      dire la liste mentale : elle devient la liste de vérifications.
- [ ] « Le modèle maison et les paragraphes types : où sont-ils, qui les tient
      à jour ? »
- [ ] « Qui signe ? Qu'est-ce qu'un junior ne peut pas valider seul ? »

---

## Chercher

**Ce que c'est** : trouver dans un corpus ce qui répond à une question, dans
la version applicable à une date, et ne rien écrire qu'on ne puisse
rattacher à un passage.

**Code ou modèle** : le modèle cherche et rédige. Le code garantit qu'une
citation ne désigne qu'un paragraphe enregistré, que l'extrait s'y trouve mot
pour mot, et que la version est la bonne à la date (le démonstrateur Attendu
le fait par construction). Le corpus lui-même est une décision juridique
avant d'être technique (G-05).

**Interdits types**
- Aucune citation d'un **passage inexistant** (Mata v. Avianca, 2023).
- Aucune citation d'un passage qui **ne dit pas ce qu'on lui fait dire**
  (Al-Haroun, 2025 : 18 citations inexistantes sur 45).
- Aucune version **non applicable à la date** donnée. La date se demande :
  elle n'est jamais supposée (avocats, § 2.7 et 6).
- **Abstention** quand le corpus ne répond pas, avec la raison et la borne du
  corpus.
- **Aucun corpus sous licence ingéré sans l'accord écrit de son titulaire.**
  Les normes AFNOR sont exclues par opposition expresse (études, § 2.4). Pour
  ce métier, l'archétype se réduit à un **registre des références et des
  éditions**. ⚠ `../reperage` décrit encore les bureaux d'études par la
  « recherche dans les normes » (`cibles.ts`) : ne pas le promettre au
  téléphone.

**Tests types** : les échecs connus d'Attendu (`../attendu/docs/known-failures.md`
: version ancienne non retrouvée, arrêt qui applique un texte hors corpus) ;
un contrat de 2014 et l'article 1195 (droit transitoire) ; une référence
fournie par le client, reprise sans contrôle.

**Questions d'entretien**
- [ ] **« Votre dernière recherche : combien de temps, où, et comment
      avez-vous su que c'était la bonne version ? »**
- [ ] **« La dernière référence fausse ou périmée repérée dans un écrit : par
      qui, et avant ou après l'envoi ? »**
  - Si c'était après → c'est l'incident : le suivre jusqu'au bout.
- [ ] « Utilisez-vous déjà une IA ? Laquelle, pour quoi, et qui vérifie ce
      qu'elle produit ? »
- [ ] « Vos bases payantes : que dit leur licence sur un outil tiers ? »
      (à lire avant de construire, pas à trancher sur place)
