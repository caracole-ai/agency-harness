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
| **Moteur** | boucle agent, hooks, journaux, escalade | (à venir) — `caracole-ai/agent-guardrails` en est l'amorce | tous métiers |
| **Métier** | chaîne, interdits, tests types, connecteurs, escalades, vocabulaire, préférences récurrentes, données à réunir, briques à proposer | `metiers/<métier>/fiche.md` | tous les clients d'un métier |
| **Client** | données, exceptions, savoir tacite, seuils | `clients/<client>/` — **jamais versionné** | ce client seul |

Le capital, ce sont les **interdits et les tests**, pas les prompts : un prompt
se réécrit à chaque changement de modèle, un test reste vrai des années.

## Structure

- `GRILLE.md` — la grille d'une fiche métier : neuf rubriques (les bornes, le
  bon résultat et les données, les briques à proposer), les statuts d'un fait,
  la règle qui sépare le métier du client.
- `metiers/<métier>/fiche.md` — la couche métier d'un secteur, remplie selon
  la grille.
  - `securite-privee/` — première cible (NAF 80.10Z), 2026-09-29 ; avec
    deux instantanés datés : `recherche-2026-09-29.md` (la recherche
    documentaire) et `verification-2026-09-29.md` (sa relecture à la source,
    qui fait foi en cas d'écart et d'où viennent les lignes `texte` ✓), et
    `guide-entretien.md`, la vue de la fiche dans l'ordre d'un rendez-vous,
    à lire sur place.
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

1. **La veille** : le skill adapte le guide d'entretien du métier au client.
2. **Sur place** : le guide se lit dans l'ordre ; l'entretien s'enregistre
   avec l'accord de chaque présent ; les briques se proposent en dernier.
3. **Après** : la transcription donne `clients/<slug>/entretien-….md` (la
   grille remplie) et `clients/<slug>/regles-a-valider-….md` (les règles, dans
   les mots du client, chacune avec sa citation), vérifiés par le script.
4. **Le client corrige** les règles ; elles deviennent l'annexe du devis. Le
   prix, les conditions et les mentions du devis sont posés par le fondateur,
   jamais par le skill.
5. **Le métier s'enrichit** : ce qui vaut chez un concurrent remonte dans la
   fiche, sans nom ni chiffre du client, après accord.

## Règles

- **Rien d'inventé.** Chaque fait d'une fiche porte sa source et son statut
  (`GRILLE.md` § Statuts). Une hypothèse se marque comme telle, elle ne se
  déguise pas en fait.
- **Aucune donnée client dans `metiers/`.** Un fait monte du client au métier
  seulement s'il vaut pour tout le secteur, et il monte sans nom, sans
  chiffre du client, sans document.
- **Aucun montant.** Même règle que le site : le prix se fixe à l'atelier.
