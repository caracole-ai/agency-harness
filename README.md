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
| **Moteur** | calendrier juridique, couche sémantique, contrôles par moment (pre-tool, post-tool, pre-response, stop), machine à états, approbation par jeton, journal, compteur de coût | `moteur/` — en construction selon `PLAN.md` ; existent le registre des règles, le calendrier juridique, les verdicts et l'exécution des contrôles, les premiers interdits codés de la sécurité privée (2026-10-05), et Veiller : `pnpm veiller`, la config client, le journal et le rapport (2026-10-06) ; le remplacement validé par le patron et la délégation (étape 5, 2026-10-06). `caracole-ai/agent-guardrails` n'en est pas l'amorce : il échoue ouvert, le moteur échoue fermé ; seule l'idée des moments en vient | tous métiers |
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
- `HANDOFF.md` — l'état à la dernière passation entre deux sessions : où on
  en est, la suite, les pièges. À lire en premier.
- `PLAN.md` — le plan de construction du moteur, sécurité privée comme
  premier cas (2026-10-05) : phases, décisions, vérifications.
- `PLAN-ESPACES.md` — le plan des trois espaces (2026-10-07), qui remplace la
  phase 6 : la conversation (une liste fermée de gestes), l'échappée (le
  modèle sur une copie des données, résultat passé aux contrôles), la
  réaffectation groupée, la promotion d'une demande qui revient, les évals,
  l'interface web. Écrit lot par lot pour être exécuté sans décision à
  prendre.
- `PLAN-PROMOTION.md` — le plan de la promotion (2026-10-09), qui remplace
  le § 8 du précédent : une demande nouvelle qui revient devient un **geste
  appris**, une donnée (paramètres typés, SQL paramétré sur la copie du rôle,
  gabarit rendu par le code), fabriquée par le modèle, vérifiée en code par
  rejeu sur l'instantané de la copie, activée par un humain avec une clé.
  Lecture seule tant que Lionel n'a pas tranché l'écriture. Lots 0 (le journal
  se souvient de chaque échappée), 1 (le geste appris, chargé et exécuté) et 2
  (la fabrication par le modèle, vérifiée en code, mesurée) faits le
  2026-10-10 ; lot 3 (l'atelier, l'activation, l'interface) à faire.
- `moteur/` — le code générique (TypeScript, `@harnais/moteur`). Pour
  l'instant : `src/regles/` (schéma du registre, chargement, cohérence,
  rendu des tables de la fiche ; `verdict.ts` : plafond du verdict par le
  statut de la règle, lecture de référence et notes), `src/controles/`
  (exécution des contrôles, fermée en cas d'erreur), `src/cli/registre.ts`,
  `src/temps/` (jours fériés, décompte et report des délais, obligations
  périodiques, intervalles en heures réelles, validité d'un titre à une
  date ; testé avec la sécurité, le transport et les avocats),
  `src/archetypes/` (Veiller : échéances, fenêtres d'alerte et de
  préparation, niveaux ; le déroulé d'une veille, `passe.ts` ; le rapport ;
  ce qu'un métier fournit, `metier.ts`), `src/config.ts` (config client
  validée au démarrage, politique du client), `src/journal/` (SQLite en
  ajout seul, tenu par la base), `src/archetypes/candidats.ts` (évaluer des
  candidats par les contrôles, les classer), `src/approbation/jeton.ts` (la
  clé d'accord : pas d'écriture sans validation de ce contenu exact au
  journal) et `src/cli/veiller.ts`. Depuis `PLAN-ESPACES.md` :
  `src/modele/` (l'accès au modèle derrière une interface à nous, `Modele` ;
  l'adaptateur du SDK d'Anthropic, délai lu dans la config, un appel long
  en flux avec une borne haute du coût quand le fournisseur ne compte pas ;
  l'adaptateur simulé des tests ; le coût d'un appel et le coût du mois lu
  dans le journal) et
  `src/conversation/config.ts` (la section `conversation` de la config
  client : modèle, prix, effort, plafonds, seuil de promotion),
  `src/conversation/actions.ts` (la forme d'un geste du quotidien, les rôles
  `patron` et `agent`, les outils stricts envoyés au modèle et les deux
  méta-outils), `src/conversation/traduire.ts` (une consigne → une action,
  une demande nouvelle ou « je ne sais pas » : un appel, aucun réessai ; le
  modèle ne reçoit que la phrase, sans aucun nom ni poste du client),
  `src/personnes/personnes.ts` (le registre d'accès, `personnes.yaml` dans le
  dossier du client : qui peut parler, avec quel rôle, vérifié avant toute
  ouverture du dossier), `src/conversation/designation.ts` (la personne
  qu'une mention désigne : le code décide si c'est sûr, sinon une liste
  courte que le modèle départage, sinon une question au demandeur),
  `src/conversation/conversation.ts` (le déroulé d'un tour : la porte,
  plafond du mois et traduction sur le journal seul, puis le dossier, la
  personne nommée, exécution ou confirmation par « oui » à la
  reformulation, tout au journal), `src/cli/parler.ts` et
  `src/archetypes/veille-client.ts` (la veille d'un client
  journal compris, partagée par `pnpm veiller` et le geste `lancer_veille`),
  `src/echappee/` (l'échappée, espace 2 : la copie SQLite jetable en lecture
  seule, le garde-fou SQL, le contrôle « pas un chiffre, pas un nom hors des
  données », la boucle bornée (tours, tokens, temps ; un seul outil par
  tour demandé, que GMI ignore : chaque appel reçoit son résultat), et
  `echappee.ts` qui assemble copie, système et journal ; chaque échappée
  laisse au journal son identifiant `E-…`, le rôle, le texte final tel que
  montré et l'instantané de sa copie, `echappees/<id>.json` chez le client,
  pour que la promotion puisse la rejouer ; `requete.ts` lie les paramètres
  d'un geste appris, `:agent`, jamais collés dans le SQL). `src/archetypes/candidats.ts` expose
  aussi `constatsApparus` (ce qu'un planning modifié fait apparaître). Une
  proposition de l'échappée s'écrit par une réaffectation groupée
  (`metiers/securite-privee/code/src/reaffectation.ts`) : validée par le
  patron, acceptée par chaque agent qui reçoit une vacation, écrite d'un
  coup sous la clé d'accord. `src/gestes/` (la promotion, `PLAN-PROMOTION.md`
  lot 1) : un **geste appris** est une donnée, `gestes/<intention>.yaml` chez
  le client (`geste-appris.ts` : schéma fermé, six types de paramètres, SQL
  paramétré, gabarit rendu par le code, empreinte) ; il ne se charge que si
  son empreinte est celle de la dernière ligne `geste appris` / `activé` du
  journal, sinon écarté, `refusé` et alerte G-01 (`charger.ts`, relu à chaque
  consigne) ; chargé, il devient une action comme les autres, exécutée sans
  modèle sur la copie du rôle (`action-apprise.ts`), et son intention sort
  de la liste des demandes nouvelles. `src/promotion/` (espace 3) compte les
  demandes nouvelles par intention (seules les échappées finies proprement :
  réponse au contrôle `ok`, proposition validée ou écrite), et pour celle qui
  revient **fabrique le geste** (`PLAN-PROMOTION.md` lot 2) : `fabriquer.ts`,
  un appel au modèle avec les échappées entières (jamais l'instantané), un
  outil `proposer_geste` au schéma du geste, relancé une fois sur un échec de
  forme ou une requête qui lève ; la vérification en code (gabarit sur une
  copie vide, rejeu de chaque test sur son instantané, aucune valeur en dur
  venue d'une consigne, description distincte des gestes existants) ;
  `gestes/<id>.yaml` écrit au statut proposé si zéro écart. `promouvoir.ts`
  enchaîne pour `pnpm promotions` : hors catalogue ou intention qui écrit,
  rien n'est tenté ; sinon fabrication, écriture, puis la passe de traduction
  avec modèle (`consignes.yaml` entier et les tests du geste, le geste
  chargé) qui dit si le geste est activable ; le dossier de promotion
  (`promotions/<intention>-<date>.md`, requêtes et texte de chaque échappée
  relus par son identifiant) raconte tout, et la purge des instantanés plus
  vieux que `conservation_jours` qu'aucun geste appris ne cite suit.
  `src/evals/` : les contrôles binaires des évals (aucun juge LLM), lancées
  par `pnpm evals` sur les cas écrits à la main dans `evals/` (racine du
  dépôt) ; `traduction.ts` joue les cas sur des copies fraîches, partagé
  entre `pnpm evals` et `pnpm promotions`.
  qui revient (`pnpm promotions`).
- `interface/` — l'interface du patron, pour la démo (`@harnais/interface`,
  `PLAN-ESPACES.md` § 10) : `src/app.ts` (Hono : la page et ses routes JSON,
  chaque route passe la porte avant d'ouvrir le dossier), `src/serveur.ts`
  (`pnpm interface`, sur 127.0.0.1 seulement), `public/` (HTML, CSS et
  JavaScript sans framework, la charte de `presentation/`). Quatre onglets
  (à valider, règles, délégations, journal), réservés au patron, et la
  conversation toujours visible ; l'identité est choisie dans le registre
  d'accès, pas authentifiée, et la page le dit.
- `metiers/<métier>/` — la couche métier d'un secteur :
  - `fiche.md`, remplie selon la grille : fait foi. Quand le métier a un
    registre, ses tables 1 (interdits), 2 (tests) et 4 (escalades) sont
    **générées** : on les modifie dans le registre, jamais dans la fiche ;
  - `regles.yaml` (interdits, escalades, avec leurs paramètres et leurs
    lectures) et `scenarios/T-xx.yaml` (un test par fichier, avec ses
    données rejouables) : le registre, source de ces trois tables et des
    contrôles du moteur. Seule la sécurité privée en a un ;
  - `code/` : le paquet du métier (`@harnais/securite-privee`) — le modèle
    canonique (`modele.ts`), les notions (`semantique.ts`), un contrôle par
    interdit codé (`controles.ts` : I-01 à I-05, I-20 ; I-05 en partie), les
    échéances d'I-17 (`echeances.ts`), le connecteur CSV « format agence »
    (`connecteurs/`, lecture et écriture du planning), la config et la
    description pour Veiller (`veille.ts`), le remplacement validé par le
    patron et la délégation (`remplacement.ts`, `cli/remplacer.ts`) et le
    rejeu des scénarios (`cas.ts`). `registre:verifier` l'importe et
    vérifie que code, registre et scénarios concordent ;
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
  claude.ai (lien dans la conversation du 2026-10-05). Le mini-site « Le
  harnais en clair » (trois pages pour un lecteur non technique : le projet,
  la démo, parler à l'outil) est un autre artefact claude.ai, dont les
  sources ne sont pas versionnées : lien dans `HANDOFF.md`.
- `exemples/client-fictif/` — une entreprise de sécurité fictive (13 agents,
  19 vacations, des erreurs posées exprès), sa config, son registre d'accès
  (`personnes.yaml` : le patron et les 13 agents) et `attendu.yaml`, la
  liste écrite à la main de ce que la veille doit trouver ; un test la
  compare au résultat. Sert aux démonstrations : jamais de données réelles
  ici.
- `clients/` — les notes d'entretien, une par client, et `index.md`, la table
  des lettres (client A, client B) sous lesquelles les fiches les citent.
  Ignoré par git (voir `.gitignore`) : ce que dit un client chez lui ne part
  nulle part.
- `.claude/skills/entretien-metier/` — le skill qui prépare l'entretien, puis
  fait de la transcription des règles à faire valider par le client, chacune
  citée mot à mot ; `scripts/verifier_citations.py` contrôle que chaque
  citation existe dans la transcription. Actif quand Claude Code est lancé
  depuis ce dossier.

## Commandes

Node 22.12 ou plus, pnpm 10.32.1 (épinglé dans `package.json`).

```sh
pnpm install
pnpm check               # Biome, types, tests, cohérence des registres
pnpm registre:generer    # réécrit les tables 1, 2, 4 des fiches depuis leur registre
pnpm registre:verifier   # identifiants, couverture interdit ↔ test, codes cités par les vues, fiche à jour
pnpm veiller --client exemples/client-fictif --date 2026-10-06 [--sortie rapport.md]
                         # la veille d'un client : planning contrôlé, échéances, rapport ; écrit dans son journal
pnpm rapport:html rapport.md rapport.html [--bandeau "texte"]
                         # le rapport mis en page (A4), à imprimer en PDF depuis un navigateur
pnpm remplacer absence --client <copie> --agent A-11 --jour 2026-10-11 --maintenant 2026-10-10T21:40
pnpm remplacer valider --client <copie> --demande D-V-17 [--agent A-1]
pnpm remplacer reponse --client <copie> --demande D-V-17 --oui | --non
pnpm remplacer suivre  --client <copie> --demande D-V-17
                         # un remplacement : proposition, validation du patron, accord de
                         # l'agent, écriture du planning ; sur une COPIE du client fictif
pnpm parler --client <copie> --role patron|agent [--agent A-2] [--maintenant 2026-10-10T21:40] [--modele simule]
            --consigne "Aïcha ne vient pas demain" [--conversation <C-…>]
            | --confirmer <empreinte> --conversation <C-…> --oui|--non
            | --interactif
                         # parler à l'outil : la consigne devient un geste de la liste, ou « je ne
                         # sais pas » ; ce qui écrit attend un « oui ». Exige la clé que nomme la
                         # config, sauf --modele simule (aucun appel). Sur une COPIE du client fictif
                         # Le modèle et sa clé viennent de la config (`conversation.modele`) :
                         # sans `acces`, l'API d'Anthropic et ANTHROPIC_API_KEY ; avec `acces`, un
                         # autre point d'accès au même format et la variable qu'il nomme. Le client
                         # fictif désigne GLM-5.3 chez GMI Cloud (GMI_API_KEY), la référence
                         # jusqu'à nouvel ordre (2026-10-08)
pnpm promotions --client <copie> [--date 2026-10-08] [--sans-modele]
                         # le coût de l'IA du mois et son plafond, les demandes nouvelles par
                         # intention (échappées finies proprement) ; au seuil, le modèle fabrique
                         # un geste appris (deux appels au plus), le code le vérifie et l'écrit en
                         # gestes/<id>.yaml (proposé), puis une passe de traduction avec modèle dit
                         # s'il est activable ; promotions/<intention>-<date>.md raconte tout et
                         # la ligne « promotion proposée » le porte au journal ; purge
                         # echappees/<id>.json passé conservation_jours, sauf ceux qu'un geste
                         # appris cite. ≈ 0,15 $ par intention au seuil avec GLM-5.3 ; exige la
                         # clé de la config, sauf --sans-modele (le dossier seul, aucun appel).
                         # Sur une COPIE du client fictif
pnpm evals traduire|echappee|gestes|promotion --client exemples/client-fictif [--seulement id,id] [--modele simule]
                         # les évals de la conversation et de la promotion (cas dans evals/,
                         # copie fraîche par cas) : traduire, echappee et promotion appellent le
                         # vrai modèle (≈ 0,3 $ les deux premières passes, ≈ 0,2 $ la
                         # fabrication, avec GLM-5.3) ; gestes rejoue les gestes appris sur leurs
                         # instantanés sans modèle (0 $, seuil 100 %) ;
                         # traces dans evals/traces/ (non versionné), tableau dans evals/resultats/
pnpm interface --client <copie> [--port 3777] [--maintenant 2026-10-10T21:40] [--modele simule [--script <réponses.json>]]
                         # l'interface du patron (démo) sur http://127.0.0.1:3777 : à valider, règles,
                         # délégations, journal, et la conversation. Exige la clé de la config, sauf
                         # --modele simule (rejoue --script, un tableau de réponses). Sur une COPIE
```

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
