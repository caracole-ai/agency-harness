# agency-harness

Le capital de l'agence : un harnais agentique **par métier**, réutilisable d'un
client à l'autre.

Point de départ (2026-09-29) : une chaîne de production obéit à des règles.
Le réglementé se code, le tacite se recueille chez le client, le jugement
reste humain. Un harnais ne décrit pas le processus : il en décrit les
**bornes**, c'est-à-dire ce que l'agent sait, ce qu'il peut faire, ce qu'il ne
doit jamais faire, comment on reconnaît un travail juste, et quand il rend la
main.

## Les trois couches

| Couche | Contenu | Où | Réutilisable |
|---|---|---|---|
| **Moteur** | calendrier juridique, couche sémantique, contrôles par moment (pre-tool, post-tool, pre-response, stop), machine à états, approbation par jeton, journal, compteur de coût | (à venir) — forme concrète dans `REFLEXIONS.md` (piste A) et `presentation/` ; `caracole-ai/agent-guardrails` en est l'amorce | tous métiers |
| **Méthode** | règles communes à tous les outils, le temps (validité à une date, calcul des délais), les archétypes (veiller, planifier, rapprocher, rédiger, chercher) et leurs questions | `methode/` | tous métiers ; c'est la spécification du moteur |
| **Métier** | chaîne, interdits, tests types, connecteurs, escalades, vocabulaire, préférences récurrentes, données à réunir, briques à proposer | `metiers/<métier>/fiche.md` | tous les clients d'un métier |
| **Client** | données, exceptions, savoir tacite, seuils | `clients/<client>/` — **jamais versionné** | ce client seul |

Le capital, ce sont les **interdits et les tests**, pas les prompts : un prompt
se réécrit à chaque changement de modèle, un test reste vrai des années.

## Structure

- `GRILLE.md` — la grille d'une fiche métier : neuf rubriques (les bornes, le
  bon résultat et les données, les briques à proposer), les statuts d'un fait,
  la règle qui sépare le métier du client.
- `REFLEXIONS.md` — le fil de la réflexion sur le système : décisions,
  enseignements, pistes ouvertes, questions à trancher. À relire en début de
  séance.
- `methode/` — ce qui vaut dans au moins deux métiers, écrit une fois (établi
  le 2026-09-30 en croisant les quatre métiers) :
  - `socle.md` : les règles communes à tous les outils (G-01 à G-07), le
    temps, les faits communs (facturation électronique, AI Act, CLOUD Act,
    sous-traitance), le tronc commun des questions d'entretien ;
  - `archetypes.md` : les cinq sortes de travail, leur présence par métier,
    leurs interdits et tests types, leurs questions « si…, alors… ». Veiller
    est le seul présent partout : c'est le premier pilote par défaut.
- `metiers/<métier>/` — la couche métier d'un secteur :
  - `fiche.md`, remplie selon la grille : fait foi ;
  - `recherche-AAAA-MM-JJ.md` (et `verification-…` quand elle existe) :
    instantanés datés, d'où viennent les lignes `texte` ;
  - trois vues pour le terrain, qui en dérivent : `prospection.md` (l'appel
    et le premier rendez-vous), `entretien.md` (le dirigeant, pour le devis),
    `observation.md` (la journée sur place, avec ses branches).

  Les quatre métiers des pages du site :
  - `securite-privee/` — première cible (NAF 80.10Z), 2026-09-29 ; la seule
    fiche dont des lignes sont relues à la source (`texte` ✓,
    `verification-2026-09-29.md`) ;
  - `transport-logistique/` — cible : le commissionnaire-affréteur (52.29B),
    puis le transporteur routier ;
  - `bureaux-etudes/` — bureaux d'études et laboratoires (71.12B, 71.20B) ;
    AFNOR s'oppose à ce qu'une IA lise ses normes ;
  - `avocats-affaires/` — prescripteurs et démonstration d'Attendu, pas une
    cible d'appels (arbitrage du 2026-09-22).
- `presentation/` — la page « Schéma du harnais » (2026-10-05) : le
  fonctionnement complet du moteur tel que décidé dans `REFLEXIONS.md`, pour
  la mini-conférence et pour validation avant le plan ; `harness-figure.js`
  est le port autonome de la figure animée du site (`smart-tailor`), à
  régénérer depuis la fiche quand la piste G sera faite. Publiée sur
  claude.ai (lien dans la conversation du 2026-10-05).
- `clients/` — les notes d'entretien, une par client, et `index.md`, la table
  des lettres (client A, client B) sous lesquelles les fiches les citent.
  Ignoré par git (voir `.gitignore`) : ce que dit un client chez lui ne part
  nulle part.
- `.claude/skills/entretien-metier/` — le skill qui prépare l'entretien, puis
  fait de la transcription des règles à faire valider par le client, chacune
  citée mot à mot ; `scripts/verifier_citations.py` contrôle que chaque
  citation existe dans la transcription. Actif quand Claude Code est lancé
  depuis ce dossier.

## Le déroulé d'un rendez-vous

0. **L'appel** : `prospection.md` du métier ; son seul but est le premier
   rendez-vous.
1. **La veille** : le skill adapte au client `entretien.md` et
   `observation.md` du métier.
2. **Sur place** : l'entretien du dirigeant, puis la journée d'observation ;
   tout s'enregistre avec l'accord de chaque présent ; les briques se
   proposent en dernier.
3. **Après** : la transcription donne `clients/<slug>/entretien-….md` (la
   grille remplie) et `clients/<slug>/regles-a-valider-….md` (les règles, dans
   les mots du client, chacune avec sa citation), vérifiés par le script.
4. **Le client corrige** les règles ; elles deviennent l'annexe du devis. Le
   prix, les conditions et les mentions du devis sont posés par le fondateur,
   jamais par le skill.
5. **Le métier s'enrichit** : ce qui vaut chez un concurrent remonte dans la
   fiche, sans nom ni chiffre du client, après accord. Ce qui se retrouve
   dans deux métiers remonte dans `methode/`.

## Règles

- **Rien d'inventé.** Chaque fait d'une fiche porte sa source et son statut
  (`GRILLE.md` § Statuts). Une hypothèse se marque comme telle, elle ne se
  déguise pas en fait.
- **Aucune donnée client dans `metiers/`.** Un fait monte du client au métier
  seulement s'il vaut pour tout le secteur, et il monte sans nom, sans
  chiffre du client, sans document.
- **Aucun montant.** Même règle que le site : le prix se fixe à l'atelier.
