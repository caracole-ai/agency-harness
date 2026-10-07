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

## La suite : `PLAN-ESPACES.md`, lot 0

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

(vide : à remplir par la session qui exécute le plan)

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
