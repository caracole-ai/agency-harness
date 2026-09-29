# Banque de questions

Des questions génériques, à reformuler dans les mots du client. Pour chaque
rubrique : les questions d'ouverture, puis les relances qui transforment un
récit en règle. Les questions propres à un métier vivent dans sa fiche
(`metiers/<métier>/fiche.md` § Questions ouvertes) ; elles passent avant
celles-ci.

## Sommaire
- Qui interroger
- Ouverture : l'enregistrement
- 0. La chaîne
- 1. Interdits
- 2. Tests types
- 3. Connecteurs
- 4. Moments d'escalade
- 5. Vocabulaire
- 6. Le bon résultat
- 7. Les données
- 8. Proposer
- Clôture : la suite
- Relances universelles

---

## Qui interroger

Chaque rôle voit une partie de la chaîne. On ne recueille pas les interdits du
terrain auprès du dirigeant, ni les connecteurs auprès d'un agent.

Les durées valent pour l'atelier. Au premier rendez-vous (sa durée : `SKILL.md`
§ Avant), on ne voit qu'une personne : trois questions, un document, et à qui
parler ensuite.

| Rôle (à nommer dans les mots du client) | Rubriques qu'il éclaire le mieux | Durée utile en atelier |
|---|---|---|
| Dirigeant | chaîne d'ensemble, interdits à conséquence (sanction, perte d'un client), escalades de responsabilité, ce qu'on sacrifie en premier | 30–45 min |
| Exploitation, planning, chef d'équipe | chaîne détaillée, tests types (incidents), escalades d'urgence, vocabulaire, bon résultat, données | le plus long : 1 h et plus |
| Terrain (agent, technicien, chauffeur) | vocabulaire réel, contournements, ce que l'outil ne sait pas, ce qu'il accepterait d'un outil | 15–20 min, sur son poste |
| Administratif, paie, facturation | connecteurs, données, interdits d'argent, fin de chaîne | 30 min, devant son écran |
| Commercial, réponse aux appels d'offres | entrée de chaîne, engagements pris au client | 20 min |

Dans une PME, une personne tient souvent deux rôles : garder la grille par
rôle quand même, et noter qui les cumule.

---

## Ouverture : l'enregistrement

À dire avant toute question, et à obtenir de **chaque** personne présente,
enregistrement lancé (l'accord s'entend alors sur la bande) :
- « Est-ce que vous êtes d'accord pour que j'enregistre ? C'est pour ne rien
  perdre de ce que vous me dites. Je le transcris, je vous renvoie par écrit
  ce que j'ai compris, et vous corrigez. »
- Dire où va l'enregistrement : s'il passe par un service de transcription en
  ligne, le nommer. Sur demande, le supprimer une fois la transcription faite.
- Une personne qui arrive en cours de route : lui redemander.
- Un refus : prendre des notes à la main, sans insister.

---

## 0. La chaîne

- « Prenons un client qui arrive. Qu'est-ce qui se passe, du premier appel
  jusqu'au paiement ? »
- « Qui fait ça ? Et après, ça part chez qui ? » (à chaque étape : on cherche
  les passages de main)
- « Sur quoi c'est écrit, à ce moment-là ? » (outil, papier, tableur, mémoire)
- « Qu'est-ce qui revient chaque semaine, chaque mois, chaque année ? » (les
  cycles : planning, paie, renouvellement, contrôle)

Relance : « Où est-ce que ça coince le plus souvent ? » Puis on suit le
coinçage (voir Tests types).

## 1. Interdits

- « Qu'est-ce qui vous ferait perdre un client du jour au lendemain ? »
- « Qu'est-ce qui vous vaudrait une sanction ou un contrôle qui tourne mal ? »
- « Qu'est-ce que vous vérifiez vous-même, parce que vous ne faites confiance à
  personne là-dessus ? »
- « Qu'est-ce qu'un nouveau ne doit surtout pas faire la première semaine ? »

Relances :
- « C'est déjà arrivé ? Racontez. » (un interdit sans incident reste une
  hypothèse)
- « Comment vous vous en rendez compte, aujourd'hui ? » (dit si c'est
  vérifiable par code : date, seuil, document présent)
- « C'est écrit quelque part, ou c'est une règle de la maison ? » (texte ou
  client)

## 2. Tests types

Un test naît d'un incident. La question-clé est toujours la même :
- « Racontez-moi la dernière fois que [ça a coincé]. »

Puis on remonte le récit en Étant donné / Quand / Alors :
- **Étant donné** : « C'était quelle situation ? Qu'est-ce qui était déjà
  en place ? »
- **Quand** : « Qu'est-ce qui s'est passé, exactement ? Qui l'a vu en
  premier ? »
- **Alors** : « Qu'est-ce qui aurait dû se passer ? Et qu'est-ce qui s'est
  passé à la place ? »
- « Ça a coûté quoi ? » (argent, client, sanction, heures)
- « Qu'est-ce que vous avez changé depuis ? » (souvent un interdit maison)

Autres ouvertures :
- « Le cas le plus tordu du mois dernier ? »
- « Qu'est-ce qui revient tout le temps, et qui prend du temps pour rien ? »
- « À quoi vous reconnaissez qu'un [planning, rapport, devis] est bon ? »
  (c'est le critère d'acceptation)

## 3. Connecteurs

À faire **devant l'écran** autant que possible.
- « Vous pouvez me montrer ce que vous ouvrez le matin en arrivant ? »
- « Ça, ça vient d'où ? Et ça part où ? » (sur chaque fichier ou écran)
- « Qui saisit ça ? Deux fois quelque part ? » (la double saisie est un
  connecteur manquant)
- « Le logiciel, vous pouvez en sortir un export ? Sous quelle forme ? »
- « Qui est l'interlocuteur chez l'éditeur ? Il y a un contrat, un accès
  API ? » (souvent : personne ne sait, et c'est à noter tel quel)

Relance : « Si ce logiciel tombait demain, vous feriez comment ? » (révèle le
tableur de secours, souvent le vrai système)

## 4. Moments d'escalade

- « Quand est-ce que vous appelez votre responsable, ou quand est-ce qu'on vous
  appelle ? »
- « Qu'est-ce que vous ne laisseriez jamais décider à quelqu'un d'autre ? »
- « Qui signe quoi ? »
- « La nuit, le week-end, qui décide ? » (les escalades d'urgence se cachent
  dans les astreintes)

Relances :
- « Il a combien de temps pour répondre ? » (le délai)
- « Qu'est-ce qu'il lui faut sous les yeux pour décider vite ? » (ce que
  l'agent devra présenter)

## 5. Vocabulaire

On ne pose pas « quel est votre vocabulaire ? ». On relève les mots au fil de
l'entretien, puis on vérifie :
- « Quand vous dites [mot], c'est quoi exactement ? »
- « Tout le monde ici dit pareil ? » (deux sens dans la même maison)
- « Et votre client, il appelle ça comment ? » (le mot du client final est
  souvent différent, et c'est lui qui arrive dans les mails)
- Les abréviations et les sigles : les faire développer, toujours.

---

## 6. Le bon résultat

Un outil qui respecte toutes les règles peut encore produire dix résultats
différents. Ces questions disent lequel le client choisirait.
- « Montrez-moi [le planning, le devis, la tournée] de la semaine dernière.
  Pourquoi celui-ci là, et pas un autre ? » (chaque « parce que » est une
  préférence)
- « Entre deux solutions qui respectent tout, laquelle vous préférez ? »
- « Qu'est-ce que votre client remarque, et qui vous vaut un appel ? »
- « Qu'est-ce qui vous coûte le plus cher quand c'est mal fait ? »

Relances, pour l'ordre de sacrifice :
- « La semaine où ça ne tenait pas, vous avez lâché quoi en premier ? Et ce
  que vous n'avez jamais lâché ? » (ce qui ne se lâche jamais est un interdit)
- « Qui tranche, quand deux préférences se contredisent ? »

## 7. Les données

Devant l'écran, toujours.
- « Où est-ce que c'est écrit ? Montrez-moi. » (pour chaque donnée dont
  dépend une règle : une date, une qualification, une disponibilité)
- « Qui le met à jour, et quand, la dernière fois ? »
- « Combien : de [personnes, sites, dossiers], par semaine, par mois ? »
- « Qu'est-ce qui n'est écrit nulle part, et que vous avez en tête ? » (le
  tacite : c'est souvent la donnée qui manquera à l'outil)

Relance : « Si je prends cette colonne au hasard, elle est juste ? » (la
réponse honnête est souvent « à peu près » : c'est un risque à lever avant le
devis)

## 8. Proposer

**En fin d'entretien, jamais avant.** On propose une brique parce qu'on a
entendu la douleur qu'elle traite, et on la présente dans ses mots à lui :
« Vous m'avez dit que [la douleur]. Une idée : [la brique, en une phrase]. »

Puis on qualifie. On ne demande pas si ça lui plaît (la réponse est toujours
oui), on demande :
- « Ça arrive combien de fois, et ça vous prend combien de temps
  aujourd'hui ? »
- « Qui l'utiliserait ? Qu'est-ce qui le ferait rejeter ? »
- « Qu'est-ce qu'il faudrait qu'elle sache faire le premier jour, et qu'est-ce
  qui peut attendre ? »
- « Qui doit valider avant qu'elle agisse ? »
- Sur une brique qui contacte des personnes (appel, SMS) : « À quelle heure
  peut-on les joindre, par quel canal, et qu'est-ce qu'ils doivent pouvoir
  répondre ? »

La réaction à une brique est une donnée comme une autre : on la note avec sa
citation, surtout quand elle est négative.

## Clôture : la suite

- « Je vous renvoie par écrit les règles que j'ai comprises. Vous les
  corrigez, et elles deviennent l'annexe du devis. »
- « Qui les relira avec vous ? » (celui qui relit est souvent celui qui
  décidera)
- Si le prix est demandé : il se fixe à l'issue de l'atelier, quand on sait ce
  qu'on construit. Aucun chiffre en l'air.

---

## Relances universelles

- « Vous pouvez me montrer ? »
- « C'était quand, la dernière fois ? »
- « Et ensuite ? »
- « Qui d'autre le sait ? »
- « Qu'est-ce qui se passe si personne ne le fait ? »
- « C'est comme ça chez vos concurrents aussi ? » (le test métier ou client,
  posé au client lui-même)
