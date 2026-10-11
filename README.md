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
| **Client** | données, exceptions, savoir tacite, seuils ; et, depuis la promotion, ses gestes appris (`gestes/<intention>.yaml`, des données que le patron active) et les instantanés de ses échappées (`echappees/<id>.json`) | `clients/<client>/` — **jamais versionné** | ce client seul |

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
  Lots 0 (le journal
  se souvient de chaque échappée), 1 (le geste appris, chargé et exécuté), 2
  (la fabrication par le modèle, vérifiée en code, mesurée) et 3 (l'atelier
  `pnpm gestes`, l'activation par le patron dans l'interface) faits le
  2026-10-10, relus par un sous-agent indépendant, corrigés et fusionnés
  dans `main` le 2026-10-11 (`PLAN-GENERAL.md` phase A) ; le lot 4
  (l'écriture : un geste appris qui propose des réaffectations, traitées
  comme une proposition d'échappée) fait le 2026-10-11, phase C du grand
  plan (G5).
- `PLAN-GENERAL.md` — **le grand plan** (2026-10-10 ; phases A, B et C
  faites le 2026-10-11 ; D en cours : session D1 faite, D2 à faire) : où on en
  est, les décisions G1 à G11 (fusion automatique sous huit conditions en
  code, retrait, clone de la nuit, mémoire dans le dépôt, fabrication,
  écriture, identité, journal chaîné, authentification, sauvegarde,
  livraison signée et tirée, veille et canal, modèles, topologie), et les
  phases A à I dans l'ordre. Écrit pour Claude Opus 5.5 en effort élevé,
  sans décision à prendre ; il appelle les plans ci-dessous.
- `PLAN-PSEUDONYMES.md` — le plan des pseudonymes (2026-10-10 ; phase B de
  `PLAN-GENERAL.md`, faite le 2026-10-11, voir `HANDOFF.md`) :
  le fournisseur ne reçoit plus aucun nom de salarié dans l'échappée ni la
  fabrication ; l'identifiant tient lieu de nom dans la copie, la consigne
  est masquée par la désignation existante, le code restitue, la fuite se
  mesure en code à chaque passe (seuil 0). Quatre lots. Reste hors du plan :
  la traduction, qui reçoit la phrase telle qu'écrite, et son niveau 2
  (`designer`), qui montre au modèle jusqu'à trois noms proches à départager.
- `PLAN-RONDE.md` — le plan de la ronde de nuit et du chantier (2026-10-10,
  rien codé) : chaque nuit un modèle lit un résumé fait en code de ce qui a
  été demandé (jamais une donnée) et désigne des missions ; le chantier fait
  coder un geste par Claude Code en mode non interactif, dans un arbre de
  travail à part, bande métier seulement (garde en code), relu par un autre
  modèle ; `agence.yaml` : Fable 5.1 planifie et relit, Opus 5.5 code, GLM
  reste au quotidien. La fusion est automatique sous les conditions de
  `PLAN-GENERAL.md` G1, dans le clone de la nuit, avec retrait ; la mémoire
  de la nuit est dans `memoire/` (R10). Dépend du lot 1 des pseudonymes.
  Quatre lots ; amendé le 2026-10-11 (§ 0 : au laboratoire, l'abonnement
  claude.ai par le binaire `claude`). Phase D de `PLAN-GENERAL.md`, session
  D1 : lots 0 (config de l'agence, carte, mémoire) et 1 (la ronde, `pnpm
  ronde`, `pnpm evals ronde`) faits le 2026-10-11, branche `general/d-ronde` ;
  session D2 : lot 2 (le chantier, `pnpm chantier`, la fusion et le retrait
  dans le clone de la nuit) fait le 2026-10-11.
- `agence.yaml` — la config de l'agence (`PLAN-RONDE.md` § 4.1, sans
  secret) : le modèle de chaque rôle (ronde, plan, implémentation, relecture)
  et son accès (`claude` : l'abonnement par le binaire, au laboratoire ;
  `anthropic` : la clé d'API, avant la finalisation), les prix relus dans la
  doc d'Anthropic, les bornes de la ronde et du chantier, le clone de la nuit
  (`depot_nuit`, `PLAN-GENERAL.md` G3), les règles d'outils (bornées à
  l'arbre de travail : `Write(./**)`) et les chemins autorisés au chantier.
- `memoire/` — la mémoire de la nuit (`PLAN-RONDE.md` R10), écrite par le
  code : `INDEX.md` (une ligne par événement), `rondes/`, `chantiers/`,
  `CONVENTIONS.md` (on y ajoute, on n'en retire jamais), `MESURES.md`. Aucun
  nom ni identifiant de personne, de conversation ou d'échappée : un test de
  `pnpm check` relit tout le dossier.
- `evals/rondes.yaml` et `evals/rondes/` — les cas de `pnpm evals ronde` :
  des journaux fixés (copies du journal de deux copies du client fictif
  remplies par de vraies consignes, sans les résultats de requête) et les
  missions attendues, en **brouillon** de la session D1 (`etiquettes:
  brouillon`) jusqu'aux étiquettes de Lionel.
- `methode/architecture-pour-modeles.md` — la carte du harnais que lisent la
  ronde, le plan, l'implémentation et la relecture (`PLAN-RONDE.md` R6) :
  les bandes et qui y écrit, ce qu'est un geste, les deux étages, ce qu'un
  modèle ne fait jamais, ce qui mérite une mission, comment finir.
- `methode/chantier.md` — le système ajouté au plan, à l'implémentation et à
  la relecture d'un chantier (`PLAN-RONDE.md` § 6.4) : où écrire et où
  jamais, les conventions du dépôt, ce qu'est un geste (trois cas de
  traduction, un test par règle ; un geste qui écrit rend des `Modification`
  et passe par la proposition), et les trois sections de fin.
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
  modèle ne reçoit que la phrase, sans aucun nom ni poste du client ; au
  niveau 2 seulement, un second appel lui montre jusqu'à trois noms proches
  de la mention à départager),
  `src/personnes/personnes.ts` (le registre d'accès, `personnes.yaml` dans le
  dossier du client : qui peut parler, avec quel rôle, vérifié avant toute
  ouverture du dossier), `src/conversation/designation.ts` (la personne
  qu'une mention désigne : le code décide si c'est sûr, sinon une liste
  courte que le modèle départage, sinon une question au demandeur),
  `src/conversation/conversation.ts` (le déroulé d'un tour : la porte,
  une demande nouvelle du patron qui nomme quelqu'un d'ambigu reçoit
  « Vous parlez de qui ? » avant tout appel d'échappée ;
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
  d'un geste appris, `:agent`, jamais collés dans le SQL ; `pseudonymes.ts`,
  `PLAN-PSEUDONYMES.md`, masque les noms en identifiants dans ce qui part au
  modèle, les restitue dans ce qui est montré et mesure une fuite, au mot
  près). `src/archetypes/candidats.ts` expose
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
  de la liste des demandes nouvelles. Un geste appris qui **écrit**
  (`PLAN-PROMOTION.md` § 10) porte `modifications { pour_chaque, reaffecter }`
  (une réaffectation par ligne d'une de ses requêtes) et n'est ouvert qu'au
  patron : exécuté sans modèle, il ne fait que calculer ses réaffectations,
  que la conversation traite exactement comme une proposition d'échappée
  (contrôles du métier, « oui » du patron, « oui » de chaque agent, clé sur
  la liste exacte). `src/promotion/` (espace 3) compte les
  demandes nouvelles par intention (seules les échappées finies proprement :
  réponse au contrôle `ok`, proposition validée ou écrite), et pour celle qui
  revient **fabrique le geste** (`PLAN-PROMOTION.md` lot 2) : `fabriquer.ts`,
  un appel au modèle avec les échappées entières (jamais l'instantané), un
  outil `proposer_geste` au schéma du geste, relancé une fois sur un échec de
  forme ou une requête qui lève ; la vérification en code (gabarit sur une
  copie vide, rejeu de chaque test sur son instantané, aucune valeur en dur
  venue d'une consigne, description distincte des gestes existants) ;
  `gestes/<id>.yaml` écrit au statut proposé si zéro écart. Une intention qui
  écrit se fabrique depuis ses propositions validées par le patron (les
  consignes masquées, les requêtes, les vérifications, les réaffectations en
  identifiants) ; son rejeu compare les réaffectations, pas un texte : les
  mêmes vacations, chacune à un agent que le patron a validé pour elle.
  `promouvoir.ts` enchaîne pour `pnpm promotions` : hors catalogue, rien
  n'est tenté ; sinon fabrication, écriture, puis la passe de traduction
  avec modèle (`consignes.yaml` entier et les tests du geste, le geste
  chargé) qui dit si le geste est activable ; le dossier de promotion
  (`promotions/<intention>-<date>.md`, requêtes et texte de chaque échappée
  relus par son identifiant) raconte tout, et la purge des instantanés plus
  vieux que `conservation_jours` qu'aucun geste appris ne cite suit.
  `atelier.ts` (lot 3) est ce que l'atelier et le patron font ensuite d'un
  geste, par `pnpm gestes` ou par l'interface, aux mêmes exigences : lister
  (statut, tests, dernière vérification, activable ou pourquoi pas), vérifier
  (la vérification en code, puis avec `--avec-modele` la passe de traduction
  qui décide), activer (exige une ligne `vérifié` sans écart et avec modèle
  sur l'empreinte exacte du fichier ; écrit `statut: actif` et `validation`
  dans le YAML, puis la ligne `activé` au journal, la clé que le chargement
  exige), retirer (`statut: retire`, ligne `retiré` : plus chargé dès la
  consigne suivante).
  `src/agence/config.ts` (`PLAN-RONDE.md` § 4.1) charge `agence.yaml`
  (schéma strict) et fait le préflight au moment de l'appel : sous
  `acces: claude`, `ANTHROPIC_API_KEY` absente et `claude auth status`
  connecté ; sous `acces: anthropic`, la clé exigée. `src/chantier/memoire.ts`
  écrit et relit `memoire/` (R10) : une écriture qui porterait un nom ou un
  identifiant lève, le texte libre d'un modèle y entre nettoyé.
  `src/ronde/` (`PLAN-RONDE.md` § 5, la ronde de nuit) : `resume.ts` fait en
  code le résumé du journal sur une fenêtre de jours (par demande : le rôle, la
  consigne version modèle, ce qu'elle est devenue ; une échappée sans
  `consigne_modele` est comptée, pas montrée ; un geste sans valeur de
  personne ni texte libre ; les comptes sur 30 jours, un abandon par la
  catégorie de son motif), `rapport.ts` le schéma strict du rapport et la
  revalidation en code, `ronde.ts` le catalogue (gestes, intentions et leur
  état de promotion, missions ouvertes), le système, l'appel (par le binaire
  ou par la clé selon `agence.yaml`, une relance sur un échec de forme), les
  fichiers chez le client, la ligne au journal et la mémoire ; rien ne part si
  un nom partirait. `src/chantier/claude.ts` lance le binaire `claude -p`
  (préflight, ligne de commande, délai mural, JSON lu par un schéma) ; la
  ronde s'en sert isolée (`--setting-sources ""`, aucun outil, ni MCP ni
  session), le chantier avec les réglages de l'arbre seulement
  (`--setting-sources project` : ni les hooks ni le `CLAUDE.md` de
  l'utilisateur). Le chantier (`PLAN-RONDE.md` § 6, `PLAN-GENERAL.md` G1 à
  G3) : `mission.ts` (la mission de la ronde, la décision en code :
  promotion en cours, question pour l'atelier, écartée ou retirée ; ce qui
  part au modèle, par types), `arbre.ts` (le clone de la nuit vérifié, un
  `git worktree` par mission, le commit ; jamais merge ni push), `garde.ts`
  (le diff dans la bande, la mémoire en ajout seul aux conventions, aucun
  test retiré ni tu, `lignes_max`, les cas de traduction des gestes
  nouveaux), `fusion.ts` (les huit conditions de G1, `git merge --no-ff`
  dans `main` du clone, l'étiquette, le push, la mémoire commise à part ; le
  retrait par `git revert -m 1` ; le seul module qui fusionne ou pousse),
  `chantier.ts` (plan → implémentation → garde → `pnpm check` → relecture →
  une reprise au plus → honnêteté → dossier → mémoire → fusion).
  `src/evals/` : les contrôles binaires des évals (aucun juge LLM), lancées
  par `pnpm evals` sur les cas écrits à la main dans `evals/` (racine du
  dépôt) ; `traduction.ts` joue les cas sur des copies fraîches, et porte la
  passe de traduction qui décide « activable » (`passeTraduction`), partagée
  entre `pnpm evals`, `pnpm promotions` et `pnpm gestes verifier`.
- `interface/` — l'interface du patron, pour la démo (`@harnais/interface`,
  `PLAN-ESPACES.md` § 10) : `src/app.ts` (Hono : la page et ses routes JSON,
  chaque route passe la porte avant d'ouvrir le dossier), `src/serveur.ts`
  (`pnpm interface`, sur 127.0.0.1 seulement), `public/` (HTML, CSS et
  JavaScript sans framework, la charte de `presentation/`). Cinq onglets
  (à valider, règles, délégations, appris, journal), réservés au patron, et
  la conversation toujours visible ; l'identité est choisie dans le registre
  d'accès, pas authentifiée, et la page le dit. « Appris » (« Ce que l'outil
  a appris », `PLAN-PROMOTION.md` § 7.2) montre les gestes appris proposés
  (activables, ou pourquoi pas), actifs et retirés ; le patron active après
  une confirmation à l'écran, ou retire avec un motif (`/api/gestes`,
  `/api/gestes/activer`, `/api/gestes/retirer` ; « par » est son identité
  vérifiée, jamais un champ du corps).
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
                         # un geste appris (deux appels au plus ; pour une intention qui écrit, un
                         # geste qui propose des réaffectations), le code le vérifie et l'écrit en
                         # gestes/<id>.yaml (proposé), puis une passe de traduction avec modèle dit
                         # s'il est activable ; promotions/<intention>-<date>.md raconte tout et
                         # la ligne « promotion proposée » le porte au journal ; purge
                         # echappees/<id>.json passé conservation_jours, sauf ceux qu'un geste
                         # appris cite. ≈ 0,15 $ par intention au seuil avec GLM-5.3 ; exige la
                         # clé de la config, sauf --sans-modele (le dossier seul, aucun appel).
                         # Sur une COPIE du client fictif
pnpm gestes --client <copie> lister | verifier <id> [--avec-modele] | activer <id> --par <nom> | retirer <id> --motif "<texte>" [--par <nom>]
                         # l'atelier devant les gestes appris (gestes/*.yaml) : la liste avec la
                         # dernière vérification et « activable » ; vérifier = gabarit, rejeu des
                         # tests sur leurs instantanés, valeurs en dur, description (0 $), et avec
                         # --avec-modele la passe de traduction qui décide (≈ 0,15 $) ; activer
                         # exige cette passe sans écart sur l'empreinte exacte du fichier et pose
                         # la clé au journal (--par obligatoire) ; retirer le retire dès la
                         # consigne suivante. <id> : l'identifiant, ou le nom du fichier quand
                         # plusieurs le portent. Le patron fait la même chose dans l'interface.
                         # Sur une COPIE du client fictif
pnpm evals traduire|echappee|gestes|promotion --client exemples/client-fictif [--seulement id,id] [--modele simule]
                         # les évals de la conversation et de la promotion (cas dans evals/,
                         # copie fraîche par cas) : traduire, echappee et promotion appellent le
                         # vrai modèle (≈ 0,3 $ les deux premières passes, ≈ 0,2 $ la
                         # fabrication, avec GLM-5.3 ; une proposition rejouée est validée par le
                         # lanceur, comme le patron) ; gestes rejoue les gestes appris sur leurs
                         # instantanés sans modèle (0 $, seuil 100 % ; textes ou réaffectations
                         # attendus) ; chaque cas avec modèle a
                         # sa colonne « fuite » : les noms du fichier des agents partis au modèle,
                         # comptés en code (la consigne telle qu'écrite permise à la traduction),
                         # seuil 0 (PLAN-PSEUDONYMES.md § 7) ;
                         # traces dans evals/traces/ (non versionné), tableau dans evals/resultats/
pnpm evals ronde --client exemples/client-fictif [--seulement R-1] [--modele simule]
                         # la ronde contre des journaux fixés (evals/rondes/*.json) et les missions
                         # attendues d'evals/rondes.yaml : précision, rappel, fuite ; le modèle
                         # d'agence.yaml, memoire/ ni lue ni écrite. Étiquettes en brouillon
                         # (session D1) : « brouillon, pas une mesure », jusqu'à celles de Lionel
pnpm ronde --client <copie> --date 2026-10-10 [--depuis 2026-10-01] [--refaire] [--sans-modele]
pnpm ronde --verifier-modeles
                         # la ronde de nuit (PLAN-RONDE.md § 5) : le résumé du journal fait en code
                         # (consignes version modèle, issues, comptes ; jamais une donnée, un nom,
                         # un résultat ni un texte montré), le catalogue, la carte et la mémoire
                         # partent au modèle « ronde » d'agence.yaml, qui désigne au plus
                         # missions_max missions ; le code revalide (R3 : échappées de la fenêtre,
                         # consignes-types sans identifiant ni nom, geste actif, mission ouverte
                         # ou retirée, « promotion en cours ») ; écrit rondes/<date>.md, .json, une
                         # mission par fichier rondes/<date>/<id>.yaml, la ligne « ronde » au
                         # journal (des comptes), et memoire/. Une seconde fois pour la même date :
                         # rien, sauf --refaire. --sans-modele : le résumé seul, aucun appel.
                         # Sous acces: claude (le laboratoire), l'abonnement par le binaire
                         # `claude` : ANTHROPIC_API_KEY doit être absente, le coût est « estimé
                         # par le binaire » (≈ 0,2 à 0,4 $ par ronde sur Fable 5.1).
                         # --verifier-modeles : un appel minuscule à chaque modèle de l'agence.
pnpm chantier --mission <copie>/rondes/2026-10-10/<id>.yaml [--sans-modele] [--refaire]
                         # le chantier d'une mission (PLAN-RONDE.md § 6) : décidé en code
                         # (promotion en cours, question pour l'atelier, écartée : aucun appel),
                         # puis, dans un arbre de travail du clone de la nuit (agence.yaml :
                         # depot_nuit, jamais l'arbre courant ni un arbre sale), Fable planifie,
                         # Opus code dans la bande métier, le code garde le diff et rejoue
                         # pnpm check, Fable relit (une reprise au plus sur un bloquant), le
                         # code mesure l'honnêteté (trois cas par geste nouveau, pnpm evals
                         # traduire avec le modèle du quotidien : exige sa clé) ; dossier
                         # <copie>/chantiers/<id>.md, memoire/ du clone, et fusion --no-ff dans
                         # main du clone + étiquette chantier/<id> + push si les huit conditions
                         # de G1 sont vertes. Déjà tentée : rien, sauf --refaire. --sans-modele :
                         # la décision et ce que le plan recevrait, aucun appel ni git.
pnpm chantier retirer <id> --motif "<texte>" --client <copie>
                         # G2 : git revert -m 1 de la fusion sur main du clone, push, la mémoire
                         # (motif, intentions : la ronde ne la repropose pas, même sous un autre
                         # nom), la ligne « retiré » au journal du client.
                         # Sur une COPIE du client fictif
pnpm interface --client <copie> [--port 3777] [--maintenant 2026-10-10T21:40] [--modele simule [--script <réponses.json>]]
                         # l'interface du patron (démo) sur http://127.0.0.1:3777 : à valider, règles,
                         # délégations, appris (activer ou retirer un geste appris), journal, et la
                         # conversation. Exige la clé de la config, sauf
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
