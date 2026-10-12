# Audit : le moteur est-il agnostique au métier ? (2026-10-12)

Lecture seule de `moteur/`, `interface/`, `evals/`, `agence.yaml` et
`metiers/securite-privee/code/`, par cinq sondes indépendantes, avant
d'ouvrir un second métier (une agence web : dirigeant, graphiste, product
owner, développeur, commercial ; projets, devis, tickets, temps passé,
factures). Ce fichier est l'entrée du futur `PLAN-METIER-2.md` : chaque
constat a un chemin et une ligne, et une classe.

- **(A)** logique câblée au métier : à rendre déclarable ;
- **(B)** vocabulaire seulement : à renommer ou à faire venir du métier ;
- **(C)** commentaire ou doc : sans effet, à nettoyer au passage.

## Verdict en cinq lignes

1. **Le contrat des données, le journal, les règles, Veiller, les pseudonymes
   et la copie en lecture seule sont génériques.** Un second métier les
   prend tels quels.
2. **Le couple patron/agent n'est pas un nom : c'est le type `Identite` du
   moteur**, repris dans une trentaine de points (porte d'entrée, schémas
   persistés, niveaux de désignation, gestes qui écrivent, interface). C'est
   le plus gros morceau.
3. **Trois ensembles fermés** : les rôles, les types de paramètre des gestes
   appris (`agent, date, periode, site, poste, nombre`), et l'unique
   opération d'écriture (`reaffecter {vacation, agent}`).
4. **Les prompts du moteur disent « entreprise de sécurité privée »**
   (traduction, échappée, fabrication, ronde) : le domaine doit venir du
   métier.
5. **La phase D a ajouté ses couplages** : un seul `evals_client`, un seul
   jeu `evals/*.yaml`, une garde qui ne connaît pas le métier du client
   demandeur, un motif d'identifiant `A-\d+` en dur. Et **Rapprocher, le
   cœur d'une agence web, n'existe pas en code**.

## 1. Rôles, identité, accès

| Où | Constat | Cl. |
|---|---|---|
| `moteur/src/conversation/actions.ts:14-21` | `ROLES = ['patron','agent']`, `Identite { role; agent?: string }` | A |
| `moteur/src/personnes/personnes.ts:16-22, 70-77` | `personnes.yaml` : union discriminée patron (sans identifiant, unique) / agent (identifiant) ; refus à la porte hors de ces deux rôles | A |
| `moteur/src/gestes/geste-appris.ts:80,100`, `moteur/src/evals/evals.ts:39,66` | `z.enum(ROLES)` dans les schémas persistés (gestes sur disque, cas d'éval) | A |
| `moteur/src/conversation/conversation.ts:476, 615, 690` | « de qui parlez-vous ? » réservé au patron ; un agent ne se désigne que lui-même, pas de niveau 2 | A |
| `moteur/src/conversation/conversation.ts:660` | `role === 'agent'` → tutoiement | A (petit) |
| `moteur/src/gestes/geste-appris.ts:226` ; `action-apprise.ts:83-85` ; `promotion/fabriquer.ts:431-437` ; `evals/traduction.ts:215-222` | un geste qui écrit est réservé au patron ; pour un agent, tout paramètre `agent` vaut celui qui parle | A |
| `nuit.ts:216`, `chantier.ts:200`, `ronde.ts:521`, `promouvoir.ts:133`, `atelier.ts:409`, `cli/chantier.ts:87`, `evals/traduction.ts:153` | `m.vocabulaire(s, {role:'patron'}).agents` : façon détournée d'obtenir « toutes les personnes » | A |
| `moteur/src/conversation/traduire.ts:62-68` | `quiParle`, `ROLES_EN_MOTS: Record<Role,…>` fermé | B |
| `moteur/src/ronde/rapport.ts:147`, `moteur/src/chantier/mission.ts:92` | `/\bA-\d+\b/` : le format d'identifiant des agents, en dur, pour masquer | A |
| `moteur/src/conversation/traduire.ts:31-33` | `Vocabulaire { agents: Designable[] }` : le champ s'appelle `agents` (10 appelants) ; le contenu vient des données du client par le connecteur, pas de `personnes.yaml` | B |
| `moteur/src/echappee/pseudonymes.ts`, `conversation/designation.ts` | génériques (`Designable {id, nom}`) ; commentaires « salarié », `A-7` | C |
| `metiers/securite-privee/code/src/copie.ts:26`, `conversation.ts:149-151,170-171,197` | la copie par rôle est déclarable par le métier (`copie`, `masquee`), mais binaire : `estAgent = role !== 'patron'` | — (côté métier) |

Ce qu'un métier déclare déjà : ses actions et leurs rôles (parmi deux),
`ecrit`/`propose`, les paramètres qui désignent une personne, la liste des
personnes désignables, les tables et colonnes masquées de sa copie, le
droit de proposer dans l'échappée, le circuit `proposition.ouvrir/valider`,
le second niveau de l'identité (`verifierIdentite`).

## 2. Gestes appris, échappée, promotion

| Où | Constat | Cl. |
|---|---|---|
| `moteur/src/gestes/geste-appris.ts:26,39` | `TYPES_PARAMETRE` fermé (`z.enum`) ; aucun point d'extension (projet, client, ticket impossibles) | A |
| `moteur/src/gestes/action-apprise.ts:39-40, 51-54, 63-71` | seul `agent` est résolu (vers `Designable`) ; `site`/`poste` sont des chaînes libres mal nommées | A/B |
| `moteur/src/gestes/geste-appris.ts:56-74, 250-287` ; `action-apprise.ts:185` ; `fabriquer.ts:265-272, 490-537` | l'unique écriture : `reaffecter {vacation, agent}` ; le moteur fabrique lui-même la `Modification` du métier ; relecture du journal et rejeu comparent vacation par vacation | A |
| `moteur/src/promotion/fabriquer.ts:159-167, 191-220` | `TYPES_EN_MOTS` (`agents.id`) ; prompt : « outil de planning d'une entreprise de sécurité privée… réaffectations… accord du patron et de chaque agent », tables `vacations`/`agents` supposées | B (en dur) |
| `moteur/src/echappee/echappee.ts:101-117` | prompt : « pas de détail par vacation », « une modification réaffecte une vacation à un autre agent ; créer ou supprimer n'est pas possible », « préférences du patron » | A/B (règle métier dans le prompt du moteur) |
| `moteur/src/echappee/boucle.ts:140-184` | descriptions d'outils : « réaffectations », « que le patron validera » | B |
| `pour_chaque`, `requetes`, `reponse`, `tests.contient` | génériques : SQL paramétré sur la `TableCopie` du métier | — |

## 3. Évals et fuite

| Où | Constat | Cl. |
|---|---|---|
| `moteur/src/cli/evals.ts:148,165,203,261,347,350` | un seul jeu `evals/{consignes,echappees,gestes,promotions,rondes}.yaml`, chemins fixes, aucun champ métier dans les schémas (`evals/evals.ts:57-118`) | A |
| `evals/gestes.yaml:26-45`, `consignes.yaml:19-23`, `echappees.yaml:5-12` | contenu sécurité (SQL sur `agents`/`vacations`, `agents.csv`, cartes) | données |
| `moteur/src/evals/evals.ts:76-79, 217-231` | critères d'échappée `vacations_modifiables`, `interdit_vers`, `max_modifications` vérifiés sur `m.vacation`/`m.agent` | A |
| `moteur/src/cli/evals.ts:93-99` | le métier est chargé depuis le `config.yaml` du `--client` : dynamique, mais contre des cas globaux | — |
| `moteur/src/agence/fictif.ts:12-20` | `personnesFictives()` lit `exemples/client-fictif/agents.csv` : les tests de fuite (carte, mémoire, ronde, chantier) ne connaissent que les noms de la sécurité | A (tests) |

## 4. Archétypes, règles, journal, temps

| Où | Constat | Cl. |
|---|---|---|
| `methode/archetypes.md:16-22` | cinq archétypes ; en code : Veiller (moteur), briques de Planifier (`candidats.ts`) ; **Rapprocher, Rédiger, Chercher : rien** | — |
| `moteur/src/archetypes/metier.ts:22-38` | `MetierVeiller` : `config`, `lire` **synchrone**, `resume`, `controles`, `veilles`, `echeances`, `decrire` ; un WHOIS/RDAP ou un certificat TLS ne tient pas dans `lire` | A |
| `moteur/src/archetypes/rapport.ts:27-34, 29, 95` | six parties figées ; « À décider par l'exploitation » ; `'Aucune vacation contraire à une règle.'` rendu au client | A / B |
| `moteur/src/regles/schema.ts`, `verdict.ts:66-80` | statuts, identifiants `I-\d{2}`/`E-`/`T-`, plafond du verdict : génériques ; un métier avec peu de textes tient (constaté → refus, déclaré → à vérifier) | — |
| `moteur/src/regles/registre.ts:20, 60-62, 104-108` ; `fiche.ts:86` | exigés : `scenarios/`, un test par interdit, `cas`/`cas_absent` par scénario codé, marqueurs `registre:` dans `fiche.md` | A (générique) |
| `moteur/src/config.ts:11-14` | `Politique` ne porte que `lectures_reference` : un seuil client (écart temps/devis) ira dans la config du métier | A |
| `moteur/src/journal/journal.ts` | générique ; les types sécurité (`remplacement`, `reaffectation`, `absence`, `message`, `délégation proposée`) sont dans le métier | — |
| `moteur/src/temps/delais.ts:20` | `Duree = {jours}|{mois}|{ans}` : « 45 jours fin de mois » ne s'exprime pas | A |
| `moteur/src/temps/intervalles.ts:13-21` | `intervalle()` exige début et fin : un export de temps passé en durées seules n'a pas de forme | A (déduit) |
| commentaires : `veiller.ts:20-22`, `metier.ts:26`, `rapport.ts:6-20`, `candidats.ts:14,27`, `intervalles.ts:3-5,55-57,76`, `delais.ts:93`, `verdict.ts:11`, `journal.ts:86`, `schema.ts:45` | vacations, cartes, SSIAP | C |

## 5. Données, connecteurs, contrôle des chiffres

| Où | Constat | Cl. |
|---|---|---|
| `moteur/src/config.ts:42-47`, `archetypes/metier.ts:9-15`, `conversation/config.ts:15` | exigés du client : `client`, `metier`, `journal`, `conversation` ; le reste est au métier | — |
| `metiers/securite-privee/code/src/connecteurs/csv-agence.ts:18-41,123,157` ; `copie.ts:20-191` | aucune interface de connecteur ; le schéma vu par le modèle est généré (`copie.ts:93-103`) depuis des `TableCopie` **écrites à la main**, en parallèle du connecteur : deux listes à garder alignées | A (côté métier) |
| `moteur/src/echappee/copie.ts:13, 42-73` | copie `STRICT`, rouverte en lecture seule, détruite à la fin ; types `TEXT|INTEGER|REAL` seulement, ni clé étrangère, ni date, ni décimal | A |
| `moteur/src/echappee/reponse.ts:155, 92` | `NON_QUANTITES` : `\b(19|20)\d{2}\b` → un montant de 1900 à 2099 est pris pour une année ; un nombre égal à l'année courante passe sans vérification | A |
| `moteur/src/echappee/reponse.ts:13` ; `requete.ts:154-161` | `NOMBRE = /\d+([.,]\d+)?/` coupe « 12 500,00 » ; la sortie SQL est `String(v)` : un `SUM` sur `REAL` rend `1234.5600000000002` que le modèle ne recopie pas | A |
| `moteur/src/echappee/reponse.ts:10` | `DATE` lit « 3/4 » comme une date | A |
| `moteur/src/echappee/requete.ts:14,17,27-28` ; `boucle.ts:122,337` | 200 lignes, 2 000 caractères, 5 s ; `MOTS_REFUSES` sur le SQL brut, chaînes comprises (`WHERE type='update'` refusé) | A |
| `moteur/src/temps/temporal.ts:6` | `FUSEAU = 'Europe/Paris'` global | A (sans gêne) |

Aucun type monétaire dans `moteur/src`. Le prompt impose que tout agrégat
soit rendu par une requête (`echappee.ts:103`) : la marge d'un projet
passe si une requête SQL la rend, et seulement en centimes (`INTEGER`).

## 6. Interface, CLI, ronde, chantier, nuit

| Où | Constat | Cl. |
|---|---|---|
| `interface/package.json:11` ; `interface/src/serveur.ts:11` ; `app.ts:31-48` | dépendance et import en dur de `@harnais/securite-privee` : 17 symboles (`Session`, `vacationDe`, `reaffectation`, `STATUT`, `TYPE_DELEGATION_PROPOSEE`, `aParis`…) | A |
| `interface/src/app.ts:109,161,217,223,232` | `s.ctx.agent(id).nom`, `s.registre.interdits`, `s.config.delegations` : la `Session` de la sécurité partout | A |
| `interface/src/app.ts:152-197, 234` | `demandesEnCours` code les deux workflows (préfixes `D-`/`R-`, `sorte: remplacement|réaffectation`) ; `etat()` filtre sur `TYPE_DELEGATION_PROPOSEE` | A |
| `interface/src/app.ts:85-86, 316-394` | `exigerPatron` sur cinq routes | A |
| `interface/public/static/app.js:21-35, 152-158, 231, 273, 421, 452, 855-856, 1018` ; `index.html:69,79` | suggestions, conditions de délégation (`connait_site`), `optgroup 'Un agent'`, clé `agent:${id}`, phrases « remplacement », « planning », « titres » | B |
| `moteur/src/cli/*.ts` | tous chargent le métier depuis `config.yaml: metier` (`CONVERSATION`, `VEILLER`, `CONTROLES`) ; aucun import en dur | — |
| `package.json:18` | `pnpm remplacer` pointe en dur sur `metiers/securite-privee/code/src/cli/remplacer.ts` | A |
| `moteur/src/ronde/ronde.ts:208-213, 548` ; `rapport.ts:57,59` | prompt : « outil de planning » ; places imposées `(<agent>, <du>, <au>, <site>, <vacation>)` ; « modifie le planning » ; la carte dit « ici, la sécurité privée » (`methode/architecture-pour-modeles.md:12-13`) | B (envoyé au modèle) |
| `moteur/src/ronde/resume.ts` | générique (`<personne>`, `<texte>`, `<valeur>`) | — |
| `agence.yaml:64-68` | `evals_client` unique ; `chemins_autorises: metiers/*/…` ouvre tous les métiers ; `chemins_interdits` nomme des fichiers de la sécurité (`echeances.ts`) | A |
| `moteur/src/chantier/garde.ts:26, 67-72` | la garde ne reçoit pas `mission.metier` ; `FICHIER_CONSIGNES` fixe : un chantier d'agence-web pourrait modifier la sécurité | A |
| `moteur/src/chantier/chantier.ts:456, 509, 685-700` | « trois cas dans `evals/consignes.yaml` » ; la condition 4 mesure toujours sur `evals_client`, donc sur la sécurité, quel que soit le métier de la mission | A |
| `methode/chantier.md:14, 75` | `<agent>`, `<site>`, `{ type: 'reaffecter', vacation, agent }` | B/C |
| `moteur/src/chantier/memoire.ts:100` | exemple « client fictif (sécurité privée) » | C |
| `pnpm-workspace.yaml:4` | `metiers/*/code` couvre un nouveau paquet ; il lui faut `package.json` (scripts `typecheck`/`test`), `tsconfig.json`, `index.ts` exportant `CONVERSATION`, `VEILLER`, `CONTROLES` (+ `VEILLES`) ; **non vérifié** : `vitest run` sans fichier de test sort en échec | — |

## Ce que ça veut dire pour le plan

**Lot 1 : rendre le moteur agnostique, sans changer la sécurité.** Le
critère : `pnpm check` et les évals GLM de la sécurité identiques avant et
après ; le diff de `moteur/` est la réponse chiffrée à « était-ce
agnostique ? ».

1. **Les rôles** : `ROLES` exporté par le métier (`{id, enMots, tutoie?}`),
   `Identite { role, personne }` avec un identifiant pour tous (un
   dirigeant peut être deux associés), les schémas zod construits depuis la
   liste du métier ; **migration** du champ `agent` persisté (journal,
   gestes, instantanés, `personnes.yaml`).
2. **Les capacités par rôle** à la place de `=== 'patron'` : voit tout,
   désigne autrui, propose, écrit, valide, administre l'interface.
3. **`m.personnes(s)`** explicite, à la place des sept
   `vocabulaire(s, {role:'patron'}).agents` ; `Vocabulaire.agents` →
   `personnes`.
4. **Les types de paramètre** déclarés par le métier (nom, description,
   schéma, résolution vers une entité désignable : projet, client, ticket).
5. **L'opération d'écriture** déclarée (nom, clé, cible, relecture du
   journal, comparaison au rejeu) ; `reaffecter` devient celle de la
   sécurité.
6. **Le domaine des prompts** (traduction, échappée, fabrication, ronde,
   carte) et **les places de la ronde** fournis par le métier.
7. **Le motif d'identifiant** fourni par le métier (`A-\d+` → déclaré).
8. **Les évals par métier** (`metiers/<m>/evals/*.yaml` ou un champ), des
   critères d'échappée génériques, `evals_client` et `chemins_interdits`
   par métier, la garde qui reçoit `mission.metier`, la condition 4
   mesurée sur le client fictif du métier de la mission,
   `personnesFictives(client)`.
9. **L'interface** chargée depuis `config.yaml: metier`, un « tableau de
   bord » optionnel rendu par le métier (demandes en cours, nom à
   afficher), `exigerPatron` → capacité, suggestions et phrases servies
   par le métier, `aParis` dans le moteur, `pnpm remplacer` sous le
   métier.
10. **Le contrôle des chiffres** : montants en centimes, `NON_QUANTITES`
    et `NOMBRE` revus pour l'argent, `MOTS_REFUSES` hors des chaînes.
11. `MetierVeiller.lire` asynchrone (ou une récupération préalable) ;
    `Duree` avec « fin de mois » ; `rapport.ts:95` sans « vacation ».

**Lot 2 : le métier et son client fictif.** `regles.yaml` (peu de
textes, tous `hypothèse` tant que non relus ; les constatés viennent de
l'entretien), `scenarios/`, `fiche.md` avec ses marqueurs, `code/`
(modèle zod, connecteur en lecture seule sur des exports fictifs,
contrôles, échéances, `copie.ts` par rôle, `CONVERSATION`),
`exemples/agence-web-fictive/`. Rien n'écrit en v1.

**Lot 3 : Rapprocher dans le moteur**, puis Veiller pour l'agence web.
Manquent : un type « champ lu » avec extrait et doute (G-03), un
vérificateur de mentions obligatoires, le rattachement à un dossier, une
table d'états générique pour une relance (aujourd'hui recopiée deux fois
dans la sécurité), un rapport à sections déclarables.

**Lot 4 : la mesure.** Traduction et échappée sur les phrases de
l'entretien, plusieurs passes GLM ; une ronde et un chantier réels sur
ce métier ; les tests de fuite sur les deux clients fictifs.

**Deux choix à tenir** : cinq rôles internes, pas de client final en v1
(un accès venu de l'extérieur relève de la phase F) ; le harnais observe la
production (git, tickets, CI lus comme des données), il ne l'exécute
jamais.
