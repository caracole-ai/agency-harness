# Handoff — 2026-10-06

Pour reprendre dans une session neuve. À lire avant `REFLEXIONS.md` (le fil
des décisions) et `PLAN.md` (les phases). Ce fichier se remplace à chaque
passation ; il ne fait pas foi, les fichiers qu'il cite, si.

## Où on en est

- Branche `main` à `917f497`, poussée. `moteur-securite` pointe au même
  endroit (à supprimer ou garder : décision de Lionel).
- `presentation/schema-harnais.html` est modifié et **pas commité** : c'est un
  travail de Lionel d'avant le 2026-10-05, ne pas y toucher sans lui.
- `pnpm check` passe : Biome, types, 64 tests du moteur, 26 du métier, registre
  cohérent (21 interdits, 34 tests, 10 escalades).

**Phases de `PLAN.md` faites (0 à 4), sécurité privée comme premier cas :**
0. Workspace pnpm (10.32.1 épinglé), TypeScript strict, zod, Biome, Vitest.
1. Registre : `metiers/securite-privee/regles.yaml` + `scenarios/T-xx.yaml`
   font foi ; les tables 1, 2, 4 de `fiche.md` en sont **générées**.
2. Calendrier juridique : `moteur/src/temps/`.
3. Contrôles codés : I-01 à I-05 (I-05 en partie), I-20
   (`metiers/securite-privee/code/src/controles.ts`).
4. **Premier jalon, Veiller** : `pnpm veiller --client exemples/client-fictif
   --date 2026-10-06` → rapport (à corriger, à décider, conforme à noter,
   échéances), journal SQLite en ajout seul, config client validée au
   démarrage. Sur l'entreprise fictive, il trouve exactement les 19 erreurs
   posées (`exemples/client-fictif/attendu.yaml`, écrit à la main).

## Décisions à respecter (détail et dates : `REFLEXIONS.md`, « Décidé »)

- **La loi générale décide** d'une règle ⚠ (I-05 : 11 h de repos) ; les autres
  textes (accord de 1993, CCN 7.01) ne font que des **notes**. La politique du
  client peut changer le texte de référence (`politique.lectures_reference`).
- **Le statut d'une règle borne son verdict** : seul un `texte` relu (✓) ou une
  règle constatée chez le client peut refuser ; une hypothèse ne devient pas un
  contrôle. L'âge d'une relecture ne change **jamais** ce que voit le client.
- **La veille des textes appartient au fabricant** : relecture mensuelle,
  notification à Lionel seul (canal Telegram, en **réception seule**, sans
  donnée client). La mise à jour d'un harnais à distance est **hors plan** :
  Lionel la conçoit plus tard (mémoire `pre-livraison-client-reel`).
- **Le rapport client ne parle pas de la fabrication** : pas de « juriste »,
  « non relu », « G-02 » dans un motif. Les questions juridiques restent dans
  `REFLEXIONS.md` et la fiche.
- **KISS** : éviter l'over-engineering, ne jamais sacrifier la qualité (tests,
  vérifications, sources, échec fermé). Pas de champ ni de mécanisme générique
  tant que rien ne s'en sert.
- Durée maximale d'une vacation : **12 h** (pas les 10 h de la loi générale :
  les textes de branche concordent et la loi autorise la dérogation).

## La suite (recommandée le 2026-10-06, acceptée par Lionel)

1. **Terrain** : l'appel (`metiers/securite-privee/prospection.md`), puis le
   premier rendez-vous avec la démo sur l'entreprise fictive. **Jamais** sur
   les données réelles d'un prospect avant contrat (RGPD). En rapporter : son
   vrai tableur, sa politique de repos, ses fenêtres d'alerte (exemple actuel :
   MAC prévenu 2 mois avant le dépôt), la réalité de ses remplacements.
   Proposition en attente : préparer la démo (rapport mis en page, quoi dire,
   quoi taire).
2. **Juriste**, en parallèle : `REFLEXIONS.md`, « À trancher par un juriste »
   (les quatre questions du remplacement B-02, la carte qui expire pendant une
   nuit, le poste purement SSIAP sans carte).
3. **Phase 5** (le désistement) seulement après, en version simple : une
   demande avec un statut dans le journal, les candidats triés par les
   contrôles existants, le « oui » humain qui débloque l'écriture. Pas de
   moteur de statecharts générique ni de MCP tant qu'un client ne le demande.
4. **Phase 7** (veille des textes par l'API PISTE, compte au nom de Lionel ;
   canal Telegram) **avant toute livraison**. Phase 6 (modèle de langage) :
   peut-être jamais, si l'entrée peut être un bouton ou un formulaire.

## Non vérifié, risques ouverts

- Non relus mot à mot : C. trav. L3131-1, L3121-18, L3121-19 (la loi qui décide
  d'I-05) ; la liste des activités de la carte (arrêté du 01/09/2025) ; les
  jours fériés (L3133-1, L3134-13) ; l'agrément du dirigeant.
- Hypothèse codée à confirmer : un poste purement SSIAP n'exige pas de carte
  professionnelle (référentiel CNAPS p. 3).
- Non couverts, affichés dans le rapport : I-05 (amplitude 13 h, 48 h/semaine,
  46 h sur 12 semaines, 24 h après 48 h), I-17 (agrément du dirigeant). I-19
  (6 h minimum payées) hors périmètre : paie.
- Le format CSV « agence » est provisoire : aucun vrai tableur vu.
- `node:sqlite` est expérimental dans Node 22 (avertissement masqué par
  `NODE_OPTIONS` dans les scripts).
- Les évals du skill `entretien-metier` n'ont pas été relancées depuis le
  2026-09-30 ; `fiche.md` contient maintenant des marqueurs HTML.

## Pièges pour la session suivante

- **Ne jamais éditer à la main les tables 1, 2, 4 de `fiche.md`** : modifier
  `regles.yaml` ou `scenarios/`, puis `pnpm registre:generer`.
- **`attendu.yaml` s'écrit à la main**, depuis les erreurs posées, jamais en
  recopiant la sortie du code (sinon le test ne prouve rien).
- Les tests du métier lisent les fenêtres d'alerte dans
  `exemples/client-fictif/config.yaml` : les changer change T-16 et T-16b.
- Aucune donnée client dans `metiers/` ni `exemples/` ; `clients/` n'est pas
  versionné.
- Shell : le hook RTK réécrit `cat a b` en un `read` qui échoue ; lire avec
  l'outil Read. Légifrance bloque les robots : relire dans un navigateur
  visible (playwright-cli), pas par curl ni WebFetch.
- pnpm : passer par la version épinglée (le cache corepack de pnpm 12.4.2 est
  cassé sur cette machine).

## Commandes

```sh
pnpm install
pnpm check                 # lint, types, tests, cohérence du registre
pnpm registre:generer      # réécrit les tables de la fiche depuis le registre
pnpm registre:verifier     # couverture, codes cités, veille des textes en retard
pnpm veiller --client exemples/client-fictif --date 2026-10-06 [--sortie rapport.md]
```
