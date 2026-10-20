# Handoff — 2026-10-20

Pour reprendre dans une session neuve : deux pages, l'état et la suite. Les
décisions et leur fil sont dans `REFLEXIONS.md`, les plans vivants dans
`PLAN-GENERAL.md` et `PLAN-LIVRAISON.md`, les exécutés dans `archives/`,
l'historique dans git (l'ancien handoff de 4 220 lignes :
`git show 15a128b:HANDOFF.md`). Les commandes : `GLOSSAIRE.md`, une table,
la seule.

## Où on en est

`main` = `origin/main` = la fusion de `general/finitions` (2026-10-20 :
« Fait le 2026-10-20 » ci-dessous), au-dessus des lots 0 à 4 de
`PLAN-LIVRAISON.md` (2026-10-16), du ménage (18) et des fusions du 19.
**On reste en prototypage, sur l'abonnement Max** (Lionel, 2026-10-20) : la
bascule vers la clé d'API, la mesure réelle du lot 5 et le bac à sable
attendent la fin du prototypage. Le chantier se lance **au clic**,
**à l'agence** (`pnpm agence`, une file git de missions masquées par
client) ; chaque fusion et chaque retrait posent une **version signée**
(`v<AAAA-MM-JJ>-<n>`, SSH, `AGENCE_CLE_SIGNATURE` hors du dépôt) ; le
harnais du client la **tire** (`pnpm mise-a-jour`, lancé par l'interface
dans un processus à part), vérifie signature et lignée, l'installe à côté,
rejoue `pnpm check`, bascule au calme (`pnpm harnais`, le lanceur), revient
en arrière si le redémarrage échoue. `pnpm check` vert : moteur 624,
interface 45, sécurité 138, agence web 261.

**Audité avant la fusion le 2026-10-16** : trois relectures en parallèle,
puis une relecture des corrections ; une trentaine de défauts corrigés en
cinq commits, chacun avec un test qui échoue sur le code d'avant (le détail
et les risques acceptés : « Audit avant fusion », sous les lots 2 à 4 du
plan). Les plus lourds : une file bloquée pour toujours par un statut non
commis ; l'interface gelée 15 s par une file injoignable (elle ne lance plus
git) ; la sortie de `pnpm check` et le texte des modèles qui partaient chez
le client (ils restent à l'agence) ; la fusion de la pointe de la branche au
lieu du commit gardé ; un geste retiré qui revenait (un plancher de
versions). L'onglet « Gestes » vu à l'écran ; le laboratoire du lot 4 rejoué
pour de vrai, deux fois, la dernière sur la pointe finale.

**Prochaine session : améliorer le produit** sur l'abonnement (le lot 5,
la mesure réelle, attend la fin du prototypage : « Ouvert, en fin de
prototypage »). **La phrase à trous
est faite** (2026-10-18, fusion 59e9374, verdict dans
`evals/verdict-2026-10-18-phrase-a-trous.md`). L'adaptateur de
l'abonnement est corrigé (577ac5c : le modèle tentait d'appeler les outils
du moteur directement ; plus aucun abandon « outil indisponible »).
**Fusionné le 2026-10-19 (`general/traduction-masquee`)** : la traduction
reçoit la consigne masquée (identifiant, ou jeton `NOM-1` que le code reprend
avant de résoudre) ; l'éval compte un nom tapé comme une fuite. Mesuré :
fuite de traduction 25 et 3 cas → 0, justes sans perte
(`evals/verdict-2026-10-19-traduction-masquee.md`).
**Fusionné le 2026-10-19 (`echappee/identifiants`)** : un identifiant reçu
tel quel se recopie hors d'un trou, la notion des tickets à qualifier,
« chaque grandeur demandée, dans son unité ». Mesuré sous
`evals/regle-2026-10-18-identifiants.md` (trois passes, aucun cas perdu)
contre une base sans phrase à trous : agence web 58/72 contre 48/72,
retraits 1 contre 8, sécurité 54 = 54, aucune fuite. E-20 arrêtait la
fusion sur les euros ; Lionel a tranché que le pourcentage suffit, et
l'étiquette a changé (`evals/verdict-2026-10-18-identifiants.md`).
**Le frontend, avec Lionel (2026-10-19)** : une demande en cours porte ses
décisions, les mêmes sous le résultat du geste (`DemandeTableau.choix`,
`Resultat.choix` ; la sécurité : « Valider X », « Prendre Y à la place »),
cliquées sans modèle, le oui toujours exigé ; une décision cliquée dont le
oui attend renvoie aux confirmations. Puis : la réponse d'une absence
compacte (le proposé et ses raisons ; exclus et écartés repliés,
`Repli`), les raisons dans chaque « Prendre X à la place », le bilan des
questions libres en tête du Journal (l'en-tête ne signale qu'un retrait
ou un abandon), les suggestions à la ligne, l'état vide avec les
suggestions, la date du refus en clair, et la page servie en `no-cache`
(un navigateur gardait l'ancienne page avec le nouveau script). Puis la
hiérarchie de la carte (Lionel : « trop d'informations, tout au même
niveau ») : un titre d'action (« Remplacer X »), quand et où en une ligne,
la proposition de l'outil en avant avec un seul bouton, les autres
possibles en lignes « Choisir », les indisponibles repliés avec la seule
règle en cause ; les sections vides ne se montrent plus ; la question de
validation en clair (`DemandeTableau.titre`, `Choix.titre`/`detail`,
`Repli.lignes` en nom et détail) ; les replis disent « ne peuvent pas :
une règle l'interdit » et « à vérifier : dossier incomplet ». La page
référence ses fichiers par l'empreinte de leur contenu (`?v=`) : le
navigateur de Lionel gardait l'ancienne feuille avec le nouveau script.
Puis le même traitement partout (Lionel : « clarifier au maximum ») : les
règles en noms, statut en mots, texte à déplier ; les gestes titrés en
mots, avec un état ; le journal par jour, en phrases, le technique masqué,
un volet de détail par action (Lionel) ; dans le chat, les échéances
groupées (en retard, urgentes, à prévoir, date à renseigner : `Alerte`
porte `action` et `precision`), la veille en compte et en groupes au lieu
du rapport Markdown, le planning en lignes courtes ; la première ligne
d'un résultat en titre. Le journal et son volet disent de qui il s'agit
(le métier nomme l'objet : `MetierConversation.nommer`, `objetEnClair`
dans `/api/journal`) et ne répètent plus une échéance à chaque veille.
Le « i » d'une carte de l'onglet « Gestes » ouvre le même volet
(Lionel, 2026-10-19) : les étapes datées, ce que fera le geste, les
demandes reçues, ce qui part à l'agence (`detailSansGeste`).
Le journal a ses badges de sorte, une recherche à chaque lettre qui
surligne ce qu'elle trouve, et des tags cumulables, repliés sous elle (« ou » dans une dimension, « et » entre elles ;
`SORTES_JOURNAL`, `FACETTES` dans `app.js`).
Toute l'interface a ses icônes au trait (2026-10-20) : le métier choisit
celle de ses sections, lignes et types du journal dans `ICONES` (moteur,
`tableau.ts`), avec des étiquettes en couleur (`TONS` : lu, modifié,
envoyé) ; un test vérifie que chaque nom a son dessin dans `app.js`.
L'agence web suit (2026-10-19) : factures en retard (jamais relancées,
déjà relancées), tickets par projet, heures par projet, disponibilités du
plus libre au plus chargé, domaines (date à renseigner en tête, expirés, à
renouveler), absence proposée et ses tickets en liste ; elle nomme ses
objets (facture, projet, lot, devis, contrat, client, personne, ticket,
domaine). Démo agence : `--maintenant 2026-10-12T10:00`, port 3778.
La délégation proposée se lit comme une demande (`Tableau.enAttente` :
`EnAttente` porte `titre`, `depuis`, `replis`) : ce que l'outil ferait
seul, le remplacement réussi d'où elle vient, ses conditions et ce qui ne
change pas, puis ce qui sera lu et modifié, source par source (les
fichiers de la config). Une demande écrite nomme toujours l'absent (`absentDe`, lu à la
réception : le planning porte ensuite le remplaçant). Pour la voir sur la
démo : valider D-V-17, puis répondre oui en tant que Julien Lefèvre.
Démo :
`pnpm interface --client <copie> --maintenant 2026-10-10T21:40` (le
planning fictif s'arrête mi-octobre).

- **Ne jamais lancer `pnpm agence`, `pnpm chantier` ni `pnpm versionner`
  dans ce dépôt pour un essai** : ils poussent sur `origin` (GitHub). Le
  laboratoire se monte dans un dossier temporaire (recette : « Rejoué pour
  de vrai » sous le lot 4 du plan).
- **Mesurée en réel le 2026-10-15** (avant le lot 1, dans le clone
  `~/harnais-nuit`, dépôt nu `~/harnais-nuit-origine.git`) : le geste
  `heures_par_agent`, huit conditions vertes, `evals traduire` 73/73. Ces
  deux dossiers se suppriment après le lot 5, par Lionel.
- **Le moteur ne sait rien d'aucun métier** ; deux métiers le prouvent : la
  sécurité privée (`metiers/securite-privee`, client `exemples/client-fictif`)
  et l'agence web (`metiers/agence-web`, client `exemples/agence-web-fictive`).
- **Les trois espaces** : un geste codé (la traduction le choisit, le code
  l'exécute ; une personne nommée se résout en code, exacte ou par une
  question, jamais par le modèle), l'échappée (SQL en lecture sur une copie
  masquée, une phrase à trous : le modèle ne retape aucun nombre, le code
  remplit, une réponse retirée est dite au demandeur et compté dans l'état sur trente jours), la commande (le
  chantier, neuf conditions dont le rejeu).
- **Tout tourne sur l'abonnement** (binaire `claude`, Sonnet 5.5 au
  quotidien, Fable et Opus au chantier) : les dollars affichés sont des
  équivalents API, rien n'est facturé ; la contrainte est le quota.

## Ouvert, en fin de prototypage (avant un client réel)

Tranchées le 2026-10-20 (Lionel : « fais tout » ; `REFLEXIONS.md`,
« Décidé », les lignes du 20), le chemin simple dans les trois cas. Deux
sont faites (« Fait le 2026-10-20 ») ; reste, **en fin de prototypage**,
avec la bascule vers la clé d'API et le lot 5 :

- **Le bac à sable** : un utilisateur macOS dédié au chantier, avec son
  propre clone et sa propre connexion `claude`, sans accès à la clé, à
  `~/.ssh`, au trousseau ni au `.git` de l'agence ; l'agence ne fait que
  lire le commit gardé, fusionner et signer. Il faut `sudo` : Lionel.
- **La clé de l'agence**, créée le 2026-10-20 (`~/.config/agence/signature`,
  sans phrase de passe ; `export AGENCE_CLE_SIGNATURE=…` à mettre dans le
  profil de Lionel) : **à régénérer au montage du bac à sable**, avant
  d'entrer dans le premier `signataires` (jusque-là, un chantier de
  laboratoire tourne sous le même utilisateur et pourrait la lire).
- **La première version se pose à la main** (`pnpm versionner`) : sans `v*`
  signée par la clé de l'agence, et après chaque changement du moteur, la
  fusion et le retrait refusent (c'est la règle de la signature).
- **Le slug fuit encore par `agence.yaml`** (`agence.clients`, versionné,
  vide aujourd'hui) : à sortir du dépôt avant d'y inscrire un vrai client.
  Le texte libre d'une mission (`titre`, `pourquoi`) et le motif d'un
  retrait partent aussi dans le commit et la mémoire, contrôlés contre les
  noms fictifs seulement.

## La méthode (Lionel : « anti-over-engineer et KISS »)

- **Lire les traces avant toute correction** : une cause se cherche dans ce
  que le modèle a lu et écrit, pas en relevant un plafond ou en réécrivant
  une phrase.
- **Mesurer une fois, à la fin**, avec assez de passes pour que l'écart
  attendu dépasse le bruit (l'écart entre deux passes de la base).
- **La cérémonie** (règle commitée avant la mesure, mesure appariée base
  contre lot, une condition fausse : pas de fusion) **seulement pour la
  sécurité, la vie privée et la fusion dans `main`.** Ailleurs : on corrige,
  on relance. « Fuite 0 » s'y lit « pas de fuite de plus que `main` ».
- **Le laborieux s'évite** : le chemin simple d'abord ; sinon, prévenir
  Lionel avant de s'engager. Signaux : une deuxième correction du même
  problème sans trace lue ; du code pour contourner un fournisseur plutôt que
  pour le produit ; un verdict qui tient à un ou deux cas ; une règle de
  mesure réécrite après coup ; un cas rouge sur deux modèles (l'étiquette est
  suspecte : la question va à Lionel) ; deux sessions sans rien de nouveau
  pour le patron ; ce fichier au-delà de deux pages.

## Pour Lionel : 30 minutes par semaine

Dire ce qu'est une bonne réponse (E1), ou mieux, mettre un vrai patron devant
l'outil. Toutes les étiquettes en suspens sont tranchées le 2026-10-19
(REFLEXIONS, « Décidé », les lignes du 19) : reste le vrai patron. Ses
questions, côté agence web (REFLEXIONS, 2026-10-20) : le seuil
`facture_alerte` (1 est inventé) ; son outil de factures relie-t-il une
facture à un contrat de maintenance (sinon `contrat_tma` se devine par les
mensualités) ; des délais de relance par niveau (la fiche dit J+15 la
commerciale, J+30 le dirigeant ; la config n'en porte qu'un). Une étiquette
à Lionel : le piège de `lots.nom` (EP-16, EP-18) n'atteint jamais le
modèle ; proposition : le loger dans une colonne que ces cas lisent
forcément, et compter « non exposé » un cas où le texte piégé n'est sorti
d'aucun outil.

## Fait le 2026-10-20 (`general/finitions`)

- **Les icônes au trait** dans toute l'interface (le métier les choisit dans
  `ICONES`) ; dans une délégation, seuls les titres de section en portent.
- **La signature** : la fusion et le retrait refusent de signer si un commit
  de `<dernière v*>..origin/main` touche autre chose que `memoire/`
  (premier parent, fusions comprises, sans renommages) ; la dernière `v*`
  doit être signée par la clé de l'agence (`verifierParLaCle`) ; aucune
  `v*` : refus. `pnpm versionner` n'y est pas soumis.
- **Le slug** : `memoire/INDEX.md` et le manifeste nomment le métier ; le
  retrait retrouve le client dans `chantiers.log` (`noterFusion`).
- **Le client fictif** : `personnes.yaml` sous `personne`, la graphie `agent`
  refusée par `IdentiteSchema` ; à égalité, le numéro d'agent le plus bas
  (`classer`, tri numérique : A-9 avant A-10).
- **La dette** : la « fuite 1 » de `heures_par_agent` (15/10) était vraie,
  le niveau 2 (retiré le 18) ; une exception avant tout appel n'est plus une
  fuite ; l'arrondi des heures a une seule source (`enHeures`) ;
  `brouillon_relance` lit le délai de relance de la config ; « 17 tests au
  lieu de 23 » n'était pas un manque (REFLEXIONS, 2026-10-20).
- Les trois worktrees dépassés et leurs branches supprimés.

Le ménage du 18 : `REFLEXIONS.md`, « Décidé », les lignes du 18.

**Reste à Lionel, sans être une décision** : supprimer le clone de la mesure
du 15 (le garde-fou refuse à Claude) :
`rm -rf ~/harnais-nuit ~/harnais-nuit-origine.git` ; voir si
`~/harnais-mesure` sert encore ; republier la présentation (Thomas passe
avant Mehdi à égalité : `presentation/en-clair/`).

## Décisions à respecter (le détail : `REFLEXIONS.md`, « Décidé »)

- Les interdits ne se lèvent pas ; `regles.yaml` de la sécurité, les
  contrôles `I01`…`I20` et les étiquettes d'éval ne se touchent pas sans
  Lionel. Une porte de contrôle ne se contourne jamais.
- Aucun nom de personne ni de client connu des données ne part au modèle,
  consigne comprise ; rien ne s'écrit chez le client sans le « oui » de qui a
  le droit.
- `exemples/client-fictif/` ne s'écrit qu'avec l'accord de Lionel ; on
  travaille sur des copies.
- Un seul `git merge --no-ff` et un seul push par session ; `pnpm check` vert
  avant chaque commit.
- `ANTHROPIC_API_KEY` reste absente (elle facturerait l'API sous
  l'abonnement) : ne la chercher ni la demander.

## Pièges

- RTK réécrit `ps`, `grep`, `git diff`, `git status` : `rtk proxy …` pour une
  sortie brute. Pas de `timeout` sur macOS. Lint : `pnpm exec biome format
  --write`.
- Les tables 1, 2, 4 de `fiche.md` se régénèrent (`pnpm registre:generer`),
  jamais à la main ; `attendu*.yaml` s'écrit à la main.
- `ConfigSecurite` est un `strictObject` ; tout client exige `personnes.yaml`.
- Le contrôle des fuites refuse tout mot qui est un nom d'agent fictif
  (« petit » = Laura Petit) : reformuler, jamais l'affaiblir.
- Deux évals lancées dans la même minute écrivent dans le même dossier de
  résultats : décaler.
- Les worktrees des sous-agents vivent dans `.claude/worktrees/`.

## Commandes

La table de `GLOSSAIRE.md`, « Les commandes », la seule ; le README,
« Faire tourner », dit ce que la table ne dit pas (laboratoire, agence,
client livré).
