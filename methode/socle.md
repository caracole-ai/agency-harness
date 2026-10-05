# Le socle

Ce qui vaut **dans tous les métiers** de l'agence : les règles que tout outil
respecte, la façon de traiter le temps, les faits communs à plusieurs
secteurs, et le tronc commun des questions d'entretien. Établi le 2026-09-30
en croisant les quatre métiers des pages du site : sécurité privée, transport
et logistique, bureaux d'études, avocats d'affaires (`../metiers/*/`).

Les sortes de travail qu'un outil fait (veiller, planifier, rapprocher,
rédiger, chercher) sont dans `archetypes.md`. Ce qui n'est vrai que dans un
métier reste dans sa fiche.

## Méthode ou métier ?

C'est le même test que celui qui sépare le métier du client (`../GRILLE.md`),
un étage plus haut : **est-ce vrai dans au moins deux métiers ?**
- Oui → ici ou dans `archetypes.md`, écrit une fois. Les fiches y renvoient
  et ne le recopient pas.
- Non → dans la fiche du métier.
- Un fait commun se vérifie **une fois**, ici. Les deux recherches du
  2026-09-29 se contredisaient sur l'article 4 de l'AI Act : c'est ce que ce
  fichier évite.

---

## 1. Les règles communes

Elles figurent, en substance, dans les quatre pages du site (« Ce qu'il ne
fera jamais ») et se retrouvent dans chaque recherche. Chacune se vérifie en
**code**, jamais par le modèle.

| ID | Règle | Sécurité | Transport | Études | Avocats |
|---|---|---|---|---|---|
| G-01 | **Rien ne sort sans un humain** : pas d'envoi, de signature, de dépôt, d'affectation ni de publication. L'outil prépare, un humain décide. | affectation confirmée par la permanence (site) | relance, protestation, avoir validés (§ 5) | ne signe, n'émet ni ne transmet (§ 5) | aucun dépôt RPVA, aucun envoi (§ 4) |
| G-02 | **Ne pas deviner** : une donnée absente, illisible ou hors corpus se signale, avec la raison. | aucun remplaçant qualifié : escalade (E-02) | champ illisible « à vérifier » (§ 11) | donnée manquante : il le dit (site) | corpus muet : abstention (§ 5) |
| G-03 | **Chaque sortie porte sa source** : l'extrait, le document, l'article et sa version, la ligne du fichier. | textes ✓ de la fiche | mention de LV, n° de LV (§ 2.1) | édition de la norme citée (§ 2.5) | paragraphe cité (Attendu) |
| G-04 | **L'outil ne qualifie pas en droit** : il détecte, date, calcule et prépare ; la qualification (valable, conforme, fautif) est humaine. | la levée de doute reste à l'opérateur (I-13) | jamais « réserve valable » (§ 3) | déclaration de conformité sous accréditation (§ 2.7) | l'outil ne conclut pas (site) |
| G-05 | **Ce qui appartient à un tiers ne s'écrit pas, et ne s'ingère pas sans son accord.** | registre de sécurité de l'ERP (I-18) | e-CMR : toute modification doit être détectable (§ 11) | normes AFNOR : opposition expresse à l'IA (§ 2.4) | bases juridiques sous licence (§ 4) |
| G-06 | **Les données du client ne servent qu'à lui** : cloisonnées par client, jamais utilisées pour entraîner un modèle, hébergement choisi avec lui. | noms et titres des agents | prix d'achat et de vente du registre (§ 11) | confidentialité CCAG-PI 5.1 (§ 2.9) | secret professionnel (§ 2.1) |
| G-07 | **Le minimum de données personnelles** : la structure plutôt que les personnes, la commune plutôt que l'adresse. | D-06 | nom du signataire, réduit à la preuve (§ 8) | — | nom des clients couvert par le secret (§ 2.1) |

Les références entre parenthèses renvoient à `fiche.md` pour la sécurité, et
à `recherche-2026-09-29.md` pour les trois autres.

**Conséquence** : ces sept règles forment la première couche du moteur. Un
outil livré les passe toutes, quel que soit le métier, et chacune a ses tests
dans le moteur, pas dans une fiche.

---

## 2. Le temps : la mécanique commune la plus importante

Dans les quatre métiers, une erreur sur une date coûte le plus cher :
sanction, recours perdu, caducité, sinistre. Deux mécaniques reviennent
partout. Seuls leurs paramètres changent de métier à métier.

**Valide à une date.** Une chose n'est pas « valide » dans l'absolu, mais à
une date donnée.

| Métier | Ce qui doit être valide | À quelle date |
|---|---|---|
| Sécurité | carte pro, SSIAP, MAC, récépissé | celle de la vacation (I-01) |
| Transport | inscription au registre, licence, habilitation du substitué | celle de l'affrètement (§ 2.4, 2.5) |
| Études | édition de la norme ; portée d'accréditation | celle fixée par l'arrêté ou le marché (§ 2.5) ; celle du rapport (§ 2.7) |
| Avocats | version de l'article | la date des faits, **qui n'est pas unique** : conclusion du contrat, introduction de l'instance, déclaration d'appel (§ 6) |

**Calculer un délai.** Chaque métier a ses propres règles de décompte.

| Métier | Délai | Règle de décompte |
|---|---|---|
| Sécurité | modification de planning : 7 jours ou 48 h ; renouvellement de carte à J-90 | calendaire (I-06, I-17) |
| Transport | protestation : 3 jours | jours fériés non compris (L133-3) |
| Transport | réserves CMR : 7 jours, ou 21 pour un retard | dimanches et jours fériés non compris, jour de livraison exclu (CMR art. 30) |
| Transport | prescription : 1 an | à compter de la remise (L133-6) |
| Études | responsabilité : 10 ans | à compter de la **réception** de l'ouvrage (C. civ. 1792-4-1) |
| Avocats | appel : 1 mois ; conclusions : 3 mois | report au premier jour ouvrable si le délai tombe un samedi, un dimanche ou un jour férié ; +2 mois pour une partie à l'étranger (CPC 640-643) |

**Conséquence** : le premier composant du moteur est un calendrier juridique.
Il connaît les jours fériés, sait compter en jours francs, ouvrables ou
calendaires, et reporter un délai. Il vérifie aussi « valide à la date D » à
partir d'un historique de versions. Chaque métier ne fournit que ses
paramètres. Les cas limites se codent une fois : vacation à cheval sur minuit,
changement d'heure, délai qui tombe un jour férié, version modifiée entre deux
dates.

---

## 3. Les faits communs à plusieurs métiers

Chacun est vérifié ici, une fois. Les fiches y renvoient.

| Fait | Métiers | Source | Statut |
|---|---|---|---|
| **Facturation électronique** : réception obligatoire depuis le 01/09/2026 pour toutes les entreprises ; émission obligatoire au 01/09/2027 pour les PME, TPE et micro-entreprises, par une plateforme agréée. Pas de sanction pendant le démarrage pour une entreprise « engagée dans une trajectoire sérieuse de mise en conformité ». | tous | guide DGFiP, juillet 2026 (`transport-logistique/recherche`, § 2.7) | `texte` (lu, pas relu mot à mot) |
| **Le prestataire d'IA est un sous-traitant**, au sens du RGPD (art. 28 : contrat écrit, instructions documentées, pas de sous-traitant ultérieur sans autorisation) et souvent au sens du métier : « toute personne qui coopère » avec l'avocat (RIN 2.3), sous-traitant tenu à la confidentialité d'un marché public (CCAG-PI 5.1.3, lecture à confirmer). | tous | `avocats-affaires/recherche` § 2.1, 2.11 ; `bureaux-etudes/recherche` § 2.9, 11 | `texte` ; application à l'agence : `hypothèse` à valider par un juriste |
| **CLOUD Act** : un fournisseur américain peut devoir livrer des données sous son contrôle, où qu'elles soient stockées. Un hébergement en Europe chez lui ne suffit pas. | tous (décisif chez les avocats) | 18 U.S.C. § 2713 (`avocats-affaires/recherche` § 2.11) | `texte` |
| **AI Act, classement** : aucun des usages visés dans les quatre métiers ne figure à l'annexe III (le point 8 vise les autorités judiciaires, pas les avocats ; le point 2, la gestion d'infrastructures critiques). | tous | `avocats-affaires/recherche` § 2.10 ; `bureaux-etudes/recherche` § 11 | `texte` ; le classement est une lecture |
| **AI Act, article 4** (maîtrise de l'IA) : **réécrit par le règlement 2026/1744 du 08/07/2026**. Le déployeur « prend des mesures pour favoriser » la maîtrise de l'IA, et n'a plus à la « garantir ». **Ne pas s'en servir comme accroche d'obligation.** `bureaux-etudes/recherche` § 10 cite le texte initial : c'est ce fichier qui fait foi. | tous | `avocats-affaires/recherche` § 2.10 | `texte` |
| **AI Act, article 50** : dire à une personne qu'elle parle à un système d'IA. Concerne tout outil qui converse, comme l'appel automatique du remplacement en sécurité. | tous les outils qui parlent à quelqu'un | texte initial lu (`bureaux-etudes/recherche` § 11) ; son sort dans l'omnibus 2026/1744 n'est pas vérifié | `texte` ⚠ |
| **L'expert-comptable est le premier conseiller numérique des dirigeants** (41 % dans le transport) : c'est le prescripteur commun à tous les métiers, et la facturation électronique est son sujet. | tous | France Num 2026 (`transport-logistique/recherche` § 10) | `texte` (baromètre) |

---

## 4. Le tronc commun d'un entretien

Ces questions valent partout. Chaque vue d'un métier (`entretien.md`,
`observation.md`) les reprend dans cet ordre et y insère les questions de ses
archétypes et de sa fiche. Rien de ce qui suit ne se propose : on fait
raconter.

### Ouverture
- [ ] **Accord de chaque présent pour enregistrer**, avec ce qu'on en fera :
      transcription, règles renvoyées par écrit pour correction, suppression
      sur demande. Sans accord : notes à la main.
- [ ] Dire où va l'enregistrement si la transcription passe par un service en
      ligne. Chez un avocat : **pas d'enregistrement qui contienne un nom de
      client** (secret, RIN 2.2), des cas anonymisés seulement.

### La chaîne
- [ ] **« Prenons le dernier dossier (contrat, site, affaire, envoi) : que
      s'est-il passé, du premier contact jusqu'à l'encaissement ? »**
- Si une étape change de mains → **« Qu'est-ce qui passe avec, et qu'est-ce
  qui se perd ? »** Chaque perte est un candidat à un interdit.
- Si un outil est nommé → **« Montrez-moi. »** Voir `observation.md`.

### Les limites
- [ ] **« Qu'est-ce qui ne doit jamais arriver ? »**
- Pour chaque réponse → **« C'est déjà arrivé ? Racontez. »** Puis suivre
  l'incident jusqu'au bout : qui s'en est aperçu, quand, ce que ça a coûté, ce
  qui a changé depuis. La date fait passer un fait de `déclaré` à
  `constaté`.
- Si la règle citée contredit un texte → la noter **sans commenter**. Elle
  revient par écrit dans « à corriger avant de construire ».
- [ ] **« Qui a le droit de signer, d'envoyer, d'engager l'entreprise ? Et
      quand cette personne est absente ? »** (G-01)

### Le bon résultat
- [ ] **« Entre deux façons de faire qui respectent les règles, laquelle
      préférez-vous, et pourquoi ? »** Sur un cas réel de la semaine.
- [ ] **« La semaine où tout ne tenait pas, qu'avez-vous lâché en premier ? Et
      qu'est-ce que vous n'avez jamais lâché ? »** Ce qui ne se lâche jamais
      est un interdit.

### Les données
- [ ] **« Où vivent les dates, les listes, les modèles dont on a parlé ? Qui
      les met à jour, et la dernière fois, c'était quand ? »**
- [ ] **« Prenons une ligne au hasard : est-elle juste ? »** Une donnée qui
      commande un interdit et dont on ignore la fiabilité est un risque à lever
      avant le devis.
- [ ] Les volumes : combien de dossiers, de documents, de personnes, par
      semaine.

### La confidentialité
- [ ] **« Qu'est-ce qui ne doit jamais sortir de chez vous ? Vos clients vous
      l'imposent par contrat ? »** (G-06)
- [ ] « Où sont hébergés aujourd'hui votre messagerie et vos fichiers ? »
      (le CLOUD Act compte pour les avocats et les marchés publics)

### Proposer, en dernier
- [ ] Seulement sur une douleur entendue : « Vous m'avez dit que… Une piste :
      … » Puis qualifier par des faits (volume, fréquence, temps perdu, qui
      l'utiliserait, ce qui la ferait rejeter). Jamais « ça vous plairait ? ».

### Clôture
- [ ] « Je vous renvoie par écrit les règles que j'ai comprises. Vous les
      corrigez, et elles deviennent l'annexe du devis. Qui les relira avec
      vous ? »
- [ ] Le prix : « il se fixe quand on sait ce qu'on construit ». Aucun
      chiffre.

---

## 5. Ne pas dire, dans aucun métier

- **Ni « nos clients », ni « on nous dit »** tant qu'aucun client n'a
  témoigné dans ce métier. Les citations des pages du site sont des
  hypothèses de ciblage.
- **Aucun montant**, même une fourchette.
- **Pas « l'outil vous met en conformité »** : il alerte et bloque à partir
  des données qu'on lui donne ; la conformité reste celle de l'entreprise.
- **Aucune règle présentée comme sûre si la fiche la marque ⚠** (deux textes
  en vigueur, avis juridique attendu).
- Aucune critique d'une pratique entendue, sur le moment.
