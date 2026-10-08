# Handoff — 2026-10-07

Pour reprendre dans une session neuve. À lire avant `REFLEXIONS.md` (le fil
des décisions), `PLAN.md` (les phases 0 à 5, faites) et `PLAN-ESPACES.md` (le
chantier en cours). Ce fichier se remplace à chaque passation ; il ne fait pas
foi, les fichiers qu'il cite, si.

## Où on en est

- Branche `main`, à jour de l'étape 5 (2026-10-06). Le 2026-10-07 n'a ajouté
  que de la documentation : `PLAN-ESPACES.md`, les mises à jour de `PLAN.md`,
  `REFLEXIONS.md`, README et ce fichier. **Aucun code n'a changé.**
- `presentation/schema-harnais.html` est modifié et **pas commité** : travail
  de Lionel d'avant le 2026-10-05, ne pas y toucher sans lui.
- `pnpm check` passe (2026-10-07) : Biome, types, 70 tests du moteur, 42 du
  métier, registre cohérent (21 interdits, 34 tests, 10 escalades).
- Le mini-site « Le harnais en clair » (artefact claude.ai, trois pages avec
  une navigation commune : le projet, la démo, **parler à l'outil**) :
  https://claude.ai/artifact/TustZJh4FbAG17ZcDjBG52 — les pages s'ouvrent
  depuis la barre du haut, jamais par une adresse `…/espaces.html`. Sources
  non versionnées (elles se relisent depuis l'artefact).

**Phases de `PLAN.md` faites (0 à 5)**, sécurité privée comme premier cas :
registre, calendrier juridique, contrôles I-01 à I-05 (I-05 en partie) et
I-20, Veiller (`pnpm veiller`), le remplacement validé par le patron et la
délégation (`pnpm remplacer`). Détail dans `PLAN.md`.

## `PLAN-ESPACES.md` : l'avancement

Un lot = une branche `espaces/lot-N` partie de la précédente = un commit.
Pas de push, pas de fusion dans `main` : à Lionel de relire et fusionner.

- **Lot 0 (socle)** fait le 2026-10-08, branche `espaces/lot-0` :
  `moteur/src/modele/` (`Modele`, adaptateurs Anthropic et simulé, coût,
  compteur du mois), `moteur/src/conversation/config.ts`, section
  `conversation` de `ConfigSecurite` (facultative) et du client fictif.
  `@anthropic-ai/sdk@0.132.0` ajouté au moteur.
- **Lot 1 (gestes)** fait le 2026-10-08, branche `espaces/lot-1` :
  `moteur/src/conversation/actions.ts`, `moteur/src/archetypes/veille-client.ts`
  (extrait de `cli/veiller.ts` ; rapport et journal de `pnpm veiller`
  comparés avant/après : identiques), `metiers/securite-privee/code/src/actions.ts`
  (`ACTIONS` : les huit gestes), `decrireEtape` dans `remplacement.ts`
  (sortie de `pnpm remplacer` comparée avant/après sur tout le déroulé :
  identique). Les gestes eux-mêmes sont testés au lot 2 (`conversation.test.ts`).
- **Lot 2 (traduction, CLI)** fait le 2026-10-08, branche `espaces/lot-2` :
  `moteur/src/conversation/{traduire,conversation,id}.ts`,
  `moteur/src/cli/parler.ts` (`pnpm parler`),
  `metiers/securite-privee/code/src/conversation.ts` (`CONVERSATION`).
  Testé en simulé (`traduire.test.ts`, `conversation.test.ts` : 13 cas sur
  une copie). Critère du lot : `pnpm parler … --modele simule --consigne
  "bonjour"` affiche `Réponse (je_ne_sais_pas)`. **Aucune consigne n'a encore
  été traduite par le vrai modèle** (pas de clé dans cette session).

## La suite : `PLAN-ESPACES.md`, lots suivants

Lionel a accepté le 2026-10-07 les **trois espaces** (gestes du quotidien,
échappée sur une copie, promotion) et a délégué les choix de conception ; ils
sont tranchés au § 2 du plan avec leur raison. Le plan est écrit pour être
exécuté par Opus 5.5, en plusieurs sessions, avec des sous-agents, **sans
décision à prendre** : commencer par le § 1 (règles de travail), puis le lot 0
(§ 4). Un lot = une branche `espaces/lot-N` = un commit, `pnpm check` vert.

Chaque lot a ses tests et son critère d'acceptation. Les évals (§ 9) appellent
le modèle et coûtent (≈ 3 $ la passe) : elles exigent `ANTHROPIC_API_KEY`,
que Lionel met ; elles ne font pas partie de `pnpm check`.

Quand le plan se tait : choisir la version la plus simple qui ne ferme rien,
et le noter ici sous « Choix faits faute de consigne ».

## Décisions à respecter (détail et dates : `REFLEXIONS.md`, « Décidé »)

- **La loi générale décide** d'une règle ⚠ (I-05 : 11 h de repos) ; les autres
  textes ne font que des **notes**. La politique du client peut changer le
  texte de référence (`politique.lectures_reference`).
- **Le statut d'une règle borne son verdict** : seul un `texte` relu (✓) ou une
  règle constatée chez le client peut refuser ; une hypothèse ne devient pas un
  contrôle.
- **La veille des textes appartient au fabricant** : relecture mensuelle,
  notification à Lionel seul (canal Telegram, en **réception seule**). La mise
  à jour d'un harnais à distance est **hors plan** : Lionel la conçoit lui-même
  (mémoire `pre-livraison-client-reel`). Le dossier de promotion
  (`PLAN-ESPACES.md` § 8) en est l'entrée.
- **Le rapport client ne parle pas de la fabrication** : pas de « juriste »,
  « non relu », « G-02 » dans un motif.
- **Les trois espaces** et leurs **neuf sécurités** (`REFLEXIONS.md`,
  2026-10-07) : l'IA n'a pas les clés ; les interdits ne se lèvent pas ; tout
  résultat passe les règles ; une demande nouvelle ne se délègue jamais ; pas
  un chiffre ni un nom hors des données ; une demande finit toujours
  clairement ; un plafond par demande ; les données ne sont jamais des
  consignes ; tout au journal.
- **KISS** : éviter l'over-engineering, ne jamais sacrifier la qualité.
- Durée maximale d'une vacation : **12 h**.

## Non vérifié, risques ouverts

- **Coût du mois** (`coutDuMois`) : il compare le mois au début de
  l'horodatage du journal, qui est en UTC (comme le plan le prescrit). Entre
  minuit et 1 h ou 2 h, heure de Paris, le premier jour du mois, un appel
  compte dans le mois précédent. Sans effet sur un plafond mensuel ; à
  changer si un jour le plafond doit être exact à l'heure près.
- **`valider_remplacement` sans agent** : la confirmation nomme le premier
  possible au moment de la consigne ; si le planning change avant le « oui »,
  `valider` reprend le premier possible du moment, qui peut être un autre.
  Sans effet dans la démo (rien ne change entre les deux) ; à fermer si la
  conversation sert sur un vrai planning (inscrire l'agent dans les paramètres
  confirmés).
- **L'adaptateur Anthropic n'a jamais appelé le vrai modèle** (lot 0) : seul
  le typage contre le SDK 0.132.0 le vérifie ; le premier appel réel se fera
  au critère du lot 3 ou aux évals, avec la clé de Lionel.

- `PLAN-ESPACES.md` n'a encore été exécuté par personne : les signatures qu'il
  prescrit viennent d'un inventaire du code du 2026-10-07, les estimations de
  coût d'un calcul sur les prix publiés, l'option `readOnly` de `node:sqlite`
  de la documentation v22 (à confirmer sur Node 22.22 au lot 3).
- Non relus mot à mot : C. trav. L3121-18, L3121-19 ; la liste des activités
  de la carte (arrêté du 01/09/2025) ; les jours fériés (L3133-1, L3134-13) ;
  l'agrément du dirigeant.
- Hypothèse codée à confirmer : un poste purement SSIAP n'exige pas de carte
  professionnelle (référentiel CNAPS p. 3).
- Non couverts, affichés dans le rapport : I-05 (amplitude 13 h, 48 h/semaine,
  46 h sur 12 semaines, 24 h après 48 h), I-17 (agrément du dirigeant). I-19
  hors périmètre : paie.
- Le format CSV « agence » est provisoire : aucun vrai tableur vu.
- `node:sqlite` est expérimental dans Node 22 (avertissement masqué par
  `NODE_OPTIONS` dans les scripts).
- Les évals du skill `entretien-metier` n'ont pas été relancées depuis le
  2026-09-30.
- **Juriste** : la note de 12 questions est prête
  (https://claude.ai/code/artifact/127e1e97-6225-4685-9356-1e854d4fb656) ; la
  délégation qui choisit entre des personnes, et maintenant la réaffectation
  groupée (`PLAN-ESPACES.md` § 7), s'y ajoutent (RGPD art. 22).

## Pièges pour la session suivante

- **Ne jamais éditer à la main les tables 1, 2, 4 de `fiche.md`** : modifier
  `regles.yaml` ou `scenarios/`, puis `pnpm registre:generer`.
- **`attendu*.yaml` s'écrit à la main**, jamais en recopiant la sortie du code.
- **Toujours une copie du client fictif** pour tout ce qui écrit
  (`remplacement.test.ts` montre comment : `mkdtempSync` + `cpSync`).
- Importer `@harnais/securite-privee` lit `exemples/client-fictif/config.yaml`
  (`cas.ts`, `FENETRES_SCENARIOS`) ; `Session.ctx` n'est pas rechargé après
  une écriture (rouvrir) ; `historique(objet)` ne filtre pas par `type`.
- `ConfigSecurite` est un `strictObject` : toute nouvelle section se déclare
  au schéma, sinon le client fictif ne démarre plus.
- Aucune donnée client dans `metiers/` ni `exemples/` ; `clients/` n'est pas
  versionné.
- Shell : le hook RTK réécrit `cat a b` en un `read` qui échoue ; lire avec
  l'outil Read. Légifrance bloque les robots : relire dans un navigateur
  visible (playwright-cli), pas par curl ni WebFetch.
- pnpm : passer par la version épinglée (10.32.1).

## Choix faits faute de consigne

- **Numérotation des lots 6 et 7** : le § 3 dit « interface (lot 6), évals
  (lot 7) », les §§ 9 à 11 disent l'inverse. Suivi : §§ 9 à 11 (6 = évals,
  7 = interface).
- **Refus simulé** (§ 4.3) : le type du SDK n'accepte pas `category:
  'simulé'` (catégories fermées, ou `null`) ; l'adaptateur simulé rend
  `{ type: 'refusal', category: null, explanation: 'refus simulé' }`.
- **Lot 0 écrit sans sous-agent** : huit petits fichiers, plus court à écrire
  qu'à décrire à un sous-agent ; la règle 6 du § 1 sert là où des modules
  indépendants sont gros (lot 3).
- **`META_OUTILS` vit dans `actions.ts`**, pas dans `traduire.ts` (§ 5.3) :
  `outilsDe` (lot 1) en a besoin et `traduire.ts` importe `actions.ts` ;
  les mettre dans `traduire.ts` aurait créé un import circulaire.
- **`pnpm parler --confirmer` exige `--conversation <C-…>`** : la
  confirmation en attente est rangée au journal sous l'identifiant de la
  conversation, que le § 5.5 ne fait pas passer. Le CLI affiche la commande
  complète à taper. En mode `--interactif`, « oui » ou « non » répond à la
  dernière confirmation ; une session est rouverte à chaque échange (le
  planning est relu après une écriture).
- **La ligne `consigne` d'une action s'écrit après son exécution** (ou après
  sa reformulation, pour une action qui écrit), avec `erreur` dans `donnees`
  quand l'action refuse ; de même la ligne `confirmation`. Ainsi l'échec d'un
  geste reste au journal (sécurité n° 9). Une erreur du modèle : ligne
  `consigne` en `issue: 'refus'`, le motif reste la consigne mot pour mot
  (§ 4.6), le message d'erreur va dans `donnees.erreur` (le § 5.4 disait
  « motif = message » : le tableau du § 4.6 a primé).
- **Une confirmation refusée (empreinte fausse, autre demandeur) n'écrit
  rien** : une ligne `confirmation` consommerait l'attente, et n'importe qui
  pourrait alors annuler la confirmation d'un autre.
- **`MetierConversation.echappee` et la réponse `proposition`** ne sont
  ajoutées qu'aux lots 3 et 4, où elles servent.
- **`decrireEtape(s, etape, demande)`** prend la demande en plus (§ 5.2 dit
  `(s, etape)`) : une étape « trop tard » ou « escaladée » ne la porte pas,
  et le texte doit la nommer. Le texte n'a pas les commandes à taper : le CLI
  les ajoute, et garde son bloc YAML de délégation ; la conversation dit la
  délégation proposée en une phrase.
- **`valider_remplacement` sans agent** : la reformulation nomme le premier
  possible (« Valider Julien Lefèvre (A-2) pour … ? », comme le test du § 5.7
  l'attend, plutôt que « Valider la proposition pour … »).
- **`declarer_absence` par le patron sans agent** : refus « Précisez l'agent
  absent. ».
- **`mes_titres`** : une ligne par titre, « non renseigné » quand la donnée
  manque, la carte avec ses activités et sa dernière période de validité.
- **Le test « `ConfigSecurite` sans `conversation` passe »** est dans
  `exemple.test.ts` (le test de la config du client fictif).

## Commandes

```sh
pnpm install
pnpm check                 # lint, types, tests, cohérence du registre
pnpm registre:generer      # réécrit les tables de la fiche depuis le registre
pnpm registre:verifier     # couverture, codes cités, veille des textes en retard
pnpm veiller --client exemples/client-fictif --date 2026-10-06 [--sortie rapport.md]
pnpm remplacer absence|valider|reponse|suivre --client <copie> …   # voir README
```

À venir avec `PLAN-ESPACES.md` : `pnpm parler`, `pnpm promotions`,
`pnpm evals`, `pnpm interface`.
