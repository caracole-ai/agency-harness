# Plan — le second métier : une agence web, pour prouver que le moteur ne sait pas ce qu'est une vacation

Écrit le 2026-10-12 (révisé le soir pour la session qui l'exécute : Claude
Opus 5.5, effort élevé), après la phase D de `PLAN-GENERAL.md`, sur une
demande de Lionel : « créer cette entreprise fictive aussi, pour prouver
que notre moteur est bien agnostique au métier et que le système va bien
pouvoir produire les bons workflows pour ce type d'activité ». Deux sources,
à lire en entier avant le premier lot :

- `methode/audit-second-metier-2026-10-12.md` : l'audit en lecture seule du
  moteur et de l'interface, chemin et ligne de chaque couplage à la sécurité
  privée. Il fonde les lots 1a à 1c. **Les numéros de ligne y datent du
  2026-10-12 : relis le fichier avant de l'éditer, ne te fie pas au numéro.**
- `metiers/agence-web/entretien-simule-2026-10-12.md` : l'entretien,
  répondu par le modèle dans le rôle du dirigeant puis **relu et confirmé par
  Lionel** (statut `declare` ; les incidents restent inventés, donc
  `hypothese` ; les textes restent sans ✓). Il fonde les lots 2 à 4.

Ce plan prouve **deux choses distinctes**, mesurées séparément :

1. **Le moteur est agnostique** : un second métier tourne dans `parler`,
   `veiller`, `ronde`, `chantier`, `nuit` et l'interface, avec le même
   moteur ; le diff de `moteur/` dit exactement ce qui était ajusté à la
   sécurité ; **la sécurité ne bouge pas** (`pnpm check` vert, ses évals GLM
   identiques avant et après, deux passes).
2. **Le système produit les workflows du métier** : on part d'un catalogue
   volontairement petit (huit gestes codés) et on compte ce que l'échappée,
   la promotion, la ronde et le chantier produisent pour les vingt-trois
   autres demandes de l'entretien. **C'est un chiffre, pas une promesse.**

Ce plan ne rouvre rien de `PLAN-GENERAL.md` § 2 (G1 à G11) ni de
`PLAN-RONDE.md` § 10. Il ne touche ni `regles.yaml` de la sécurité, ni ses
contrôles `I01`…`I20`, ni ses scénarios. Rien ne s'écrit chez le client en
v1 pour l'agence web : le harnais lit, compte, rapproche, prépare des
brouillons et alerte. Il **observe** la production (Jira, Notion, GitHub lus
comme des exports), il ne l'exécute jamais : le chantier code le harnais,
jamais le produit d'un client.

**Critère de succès global** (observable), sur `exemples/agence-web-fictive/` :

1. `pnpm parler --client exemples/agence-web-fictive --role po --personne M-3`
   répond à « combien de jours on a brûlés sur PRJ-12 par rapport au devis »
   avec consommé / vendu par personne, chiffres cités des données ; la même
   question posée par `--role developpeur --personne M-5` sur le temps
   d'autrui est **refusée par la capacité du rôle** (code), pas par un prompt ;
2. `pnpm veiller --client exemples/agence-web-fictive` écrit un rapport avec
   les écarts (forfaits au-dessus de 90 %), les échéances (domaines,
   certificats, attestations, factures échues, PV non signés) et les
   constats des interdits codés, chacun au verdict que son statut permet
   (`declare` → « à vérifier », jamais « refus » sans texte relu ni incident
   constaté) ;
3. les évals GLM de l'agence web : traduction ≥ 95 % sur les consignes de
   l'entretien, échappée ≥ 90 % sur ses cas, **fuite 0** (aucun nom de
   personne, de client, de contact ni de sous-traitant ne part au modèle),
   sur **deux passes** ;
4. les évals GLM de la sécurité **identiques** à la référence prise avant le
   lot 1a (traduction, échappée, gestes), sur deux passes ;
5. une ronde réelle sur le journal des évals de l'agence web désigne au
   moins une mission ; un chantier réel la traite (fusion ou refus écrit)
   dans un clone de la nuit dont `origin` est un dépôt nu **local** ; la
   garde refuse un diff qui touche `metiers/securite-privee/` ;
6. l'interface sert l'agence web depuis `config.yaml: metier`, sans un seul
   import de `@harnais/securite-privee`, captures relues.

---

## 0. Règles de travail pour la session qui exécute

Celles de `PLAN-GENERAL.md` § 0, en entier, plus celles-ci. Elles priment
sur l'envie de bien faire.

1. **Ne pose aucune question à Lionel.** Quand ce plan se tait : KISS, et
   note le choix dans `HANDOFF.md` sous « Choix faits faute de consigne ».
   Le § 10 liste ce qui lui revient : prends la première option de chaque
   point et dis-le.
2. **Avant toute édition du lot 1 : la référence.** Sur `main`, `pnpm check`
   vert, puis `pnpm evals traduire`, `pnpm evals echappee` et `pnpm evals
   gestes` sur `exemples/client-fictif`, **deux passes** chacun, résultats
   copiés dans `evals/resultats/reference-securite-<date>-<passe>.json` (ou
   le format que `pnpm evals` écrit déjà ; ne change pas ce format). Sans
   `GMI_API_KEY` : le dire dans `HANDOFF.md`, et le lot 1 ne se fusionne pas.
3. **Après chaque sous-lot du lot 1 : la même mesure, et le diff des comptes
   doit être nul.** Un cas qui passe de vert à rouge ou de rouge à vert est
   un écart. Un écart = le lot a tort, pas l'éval : on corrige le lot, jamais
   l'étiquette. Un écart qu'on ne sait pas corriger arrête le lot et
   s'écrit dans `HANDOFF.md` ; on ne fusionne pas.
4. **La sécurité ne bouge pas, sauf le renommage mécanique** qu'impose le
   lot 1 (`identite.agent` → `identite.personne`, `vocabulaire().agents` →
   `.noms`, le déplacement d'un fichier). Aucune ligne de
   `metiers/securite-privee/` n'est réécrite pour une autre raison. Un
   déplacement de code est un déplacement : `git diff -M` doit le voir
   comme tel.
5. **Chirurgical.** Chaque ligne modifiée trace à une décision M1…M18. Pas
   d'amélioration adjacente, pas de renommage « pour la cohérence » hors
   de ceux listés, pas de factorisation d'un code voisin. Un défaut
   préexistant vu en passant va dans `HANDOFF.md`, pas dans le diff.
6. **Portes de contrôle**, à exécuter telles quelles et à coller dans
   `HANDOFF.md` avec leur sortie :
   - après le lot 1b : `grep -rniE "sécurité privée|vacation|carte pro|\bpatron\b|\bagents?\b" moteur/src --include='*.ts' | grep -v '\.test\.' | grep -v "exemple :"` doit être vide ; un commentaire qui cite un exemple de la sécurité s'écrit `// exemple : …` ;
   - après le lot 1c : `grep -rn "securite-privee" moteur/src interface/src --include='*.ts' | grep -v '\.test\.' | grep -v fictif` doit être vide ; `grep -n "harnais/securite-privee" interface/package.json` doit être vide ;
   - après le lot 2b : `grep -rniE "jira|notion|confluence|github" moteur/src` doit être vide.
7. **Aucun nom de modèle, prix, plafond, chemin, jeton en dur ; `assertEnv` ;
   pas de `any` ni de `TODO` ; aucune donnée réelle ; jamais d'écriture dans
   `exemples/client-fictif/` ; commentaire de tête qui cite ce plan
   (`PLAN-METIER-2.md § n`) sur tout fichier nouveau ; aucun nom de personne
   ni de client ne part au modèle ; la ronde ne reçoit ni instantané, ni
   résultat de requête, ni texte montré, ni nom.**
8. **Accès aux modèles** : la ronde et le chantier sur l'abonnement
   (`acces: claude`, mémoire `abonnement-avant-cle`) ; `ANTHROPIC_API_KEY`
   n'est pas dans l'environnement : ne la cherche pas, ne la demande pas ;
   le coût s'écrit « estimé par le binaire ». GLM via `GMI_API_KEY`, extraite
   vers un fichier `600` du scratchpad, jamais affichée. **Jamais une
   conclusion sur une seule passe réelle.**
9. **Branches et commits** : `metier-2/lot-1a`, `1b`, `1c`, `2a`, `2b`, `3`,
   `4`, créées depuis `main` ; `pnpm check` vert avant chaque commit ; un
   commit par lot (« Métier 2, lot 1a : … ») ; relecture indépendante
   (un sous-agent qui n'a pas écrit le code, en lecture seule, qui lit ce
   plan et l'audit) à la fin de chaque session ; corrections dans un commit
   à part ; puis fusion `--no-ff` dans `main` et push. Aucun `git merge` ni
   `git push` ailleurs qu'à ce moment-là.
10. **Sous-agents** : un par ligne de la table de propriété du lot (§ 11) ;
    deux sous-agents ne touchent jamais le même fichier ; chacun reçoit son
    extrait du plan, la liste de ses fichiers et la règle 5 ; les
    sous-agents ne chargent pas `CLAUDE.md`.
11. **Fin de session** : `README.md` (structure, commandes), `HANDOFF.md`
    (« Où on en est », risques, « Phase M, session Sn » avec choix et
    pièges, les portes de contrôle collées), puis le bloc « Vérifié / Non
    vérifié, risque », puis arrête-toi.

---

## 1. Décisions (prises par Claude le 2026-10-12 ; le § 10 dit ce que Lionel peut rouvrir)

| # | Décision | Pourquoi |
|---|---|---|
| M1 | **Les rôles sont déclarés par le métier, `Role` devient `string`.** `MetierConversation.roles: RoleDeclare[]` (§ 3.1) ; `Identite { role: string; personne?: string }` ; chaque `z.enum(ROLES)` devient `z.string().min(1)` validé à l'exécution contre `m.roles` là où le métier est connu ; `ROLES` et `ROLES_EN_MOTS` disparaissent du moteur. La sécurité déclare `patron` (non identifié, unique) et `agent` (identifié) : son `personnes.yaml` ne change pas. | Le couple patron/agent est le type `Identite` du moteur (audit § 1). Un type littéral ne peut pas être déclaré par un métier : la liste devient une donnée, la validation un contrôle à l'exécution. |
| M2 | **Le champ persisté `agent` devient `personne` ; l'ancien se lit, le nouveau s'écrit.** Partout où `agent: string` désigne l'identifiant de qui parle (journal `donnees.identite`, `TestAppris.agent`, `Instantane.agent`, `personnes.yaml`, la CLI `--agent`) : les lecteurs acceptent les deux graphies, les écrivains n'écrivent que `personne`. Aucun fichier existant n'est réécrit. | Le journal est en ajout seul ; une migration qui réécrit est un risque sans gain. |
| M3 | **Les capacités remplacent `=== 'patron'`.** `Capacite = 'voit_tout' \| 'designe_autrui' \| 'propose' \| 'ecrit' \| 'valide' \| 'administre'` ; `aCapacite(roles, identite, c)` partout où le moteur testait le rôle (§ 3.2). Sécurité : `patron` = toutes, `agent` = aucune. Agence web : `dirigeant` = toutes ; `po` = `voit_tout, designe_autrui, propose, valide` ; `commercial` = `designe_autrui, propose` ; `graphiste`, `developpeur` = aucune. Le tutoiement vient de `RoleDeclare.tutoie`. | L'entretien § 10 : trois niveaux de vue, pas cinq ; la différence dirigeant / PO est un droit d'engager, pas une donnée. |
| M4 | **`Vocabulaire.agents` devient `Vocabulaire.noms` ; `m.noms(s)` donne tous les noms.** `Designable` gagne `sorte: 'personne' \| 'organisation'`. `vocabulaire(s, identite).noms` = ce que ce rôle peut désigner (inchangé dans son sens) ; `m.noms(s): Designable[]` = **tout nom qui ne part jamais au modèle** (personnes, clients, contacts, sous-traitants), à la place des sept `vocabulaire(s, {role:'patron'}).agents`. La désignation (« de qui parlez-vous ? ») ne regarde que `sorte: 'personne'` ; les pseudonymes et `fuites` masquent tout. | Pour une agence, la liste des clients est aussi confidentielle que celle des salariés (G-06). Une seule liste à prouver vide dans la trace. |
| M5 | **Les types de paramètre sont déclarés.** Le moteur garde `date`, `periode`, `nombre` ; tout le reste vient de `m.typesParametre: TypeParametreDeclare[]` avec une `sorte` parmi `'personne' \| 'entite' \| 'texte'` (§ 3.3). Sécurité : `agent` (personne), `site`, `poste` (texte). Agence web : `personne` (personne) ; `projet`, `client`, `ticket`, `lot`, `facture`, `devis` (entite, résolus par le métier : identifiant exact, sinon nom unique, sinon le geste répond « lequel ? » avec les identifiants) ; `nombre`, `date`, `periode` du moteur. `ParametreAppris.type` devient `z.string().regex(FORMAT_NOM)` validé au chargement. | `TYPES_PARAMETRE` est un `z.enum` fermé (audit § 2). Le type `agent` gardé tel quel garde les gestes et les évals de la sécurité intacts. |
| M6 | **L'opération d'écriture d'un geste appris est déclarée par le métier** (`OperationApprise`, § 3.4). `ModificationsApprises` devient `{ pour_chaque, operation, colonnes }` ; l'ancienne forme `{ pour_chaque, reaffecter: {vacation, agent} }` se lit encore et devient `{ pour_chaque, operation: 'reaffecter', colonnes: {vacation, agent} }`. La sécurité déclare `reaffecter` ; son code (`reaffectationsDe`, `reaffectationsJournalisees`, la comparaison du rejeu) **déménage** dans `metiers/securite-privee/code/src/operation-reaffecter.ts` sans réécriture. L'agence web n'en déclare aucune en v1. | Le moteur fabrique aujourd'hui lui-même la modification de la sécurité (audit § 2). |
| M7 | **Le domaine des prompts vient du métier** (`Domaine`, § 3.5) : la phrase du cadre, les objets du travail, la phrase des modifications possibles, les places des consignes-types de la ronde, le motif des identifiants à masquer. Injecté dans `traduire.ts`, `echappee.ts`, `boucle.ts`, `fabriquer.ts`, `ronde.ts`, `rapport.ts` (ronde), `mission.ts`, `chantier.md`. La carte (`methode/architecture-pour-modeles.md`) perd « ici, la sécurité privée… » ; la ronde injecte `domaine.cadre` à la place. | Audit § 2 et § 6 : quatre prompts et deux regex disent la sécurité. |
| M8 | **Les évals vivent chez le métier** : `metiers/<m>/evals/{consignes,echappees,gestes,promotions,rondes}.yaml`. `evals/` garde `resultats/`, `traces/`, `rondes/`, `erreurs-*.md`, dont les noms de fichiers portent le métier. `pnpm evals` lit le dossier du métier du `--client`. Les critères d'échappée propres à la sécurité (`vacations_modifiables`, `interdit_vers`, `max_modifications`) deviennent `modifications: { autorisees?: string[]; interdites?: string[]; max?: number }` sur l'identifiant de l'objet de l'opération déclarée. | Un seul jeu d'évals pour tous les métiers (audit § 3) rend la condition 4 du chantier fausse dès le second métier. |
| M9 | **Le chantier connaît le métier.** `agence.yaml: chantier.evals_clients: { <metier>: <dossier> }` remplace `evals_client` ; `chemins_autorises` et `chemins_interdits` s'écrivent avec `${metier}` et sont résolus avec `mission.metier` avant la garde ; la condition 4 mesure sur `evals_clients[mission.metier]` (absent → refus écrit « aucun client d'évals pour ce métier ») ; `personnesFictives(dossierClient)` prend le client en paramètre et les tests de fuite tournent sur les deux. **Convention de nommage** : tout métier a `controles.ts`, `echeances.ts`, `connecteurs/` sous `code/src/`, pour que `chemins_interdits` le protège. | Audit § 6 : un chantier d'agence web pourrait modifier la sécurité, et la condition 4 mesurerait sur le mauvais client. |
| M10 | **L'interface charge le métier depuis `config.yaml`** comme les CLI (`metierDe` de `cli/chantier.ts` déplacé dans `moteur/src/cli/metier.ts` et réutilisé par toutes les CLI et par l'interface) ; `interface/package.json` ne dépend plus de la sécurité ; `MetierConversation.tableau` (§ 3.6) porte ce que `app.ts` prenait à la `Session` de la sécurité ; `exigerPatron` → `exigerCapacite('administre')` ; `aParis` → `moteur/src/temps/temporal.ts` ; `pnpm remplacer` → `pnpm --filter @harnais/securite-privee remplacer`. | Audit § 6 : 17 symboles importés, deux workflows codés en dur. |
| M11 | **L'argent** : des euros en `REAL` arrondis à deux décimales dans la copie, `ColonneCopie.decimales?: 2` pour que `decrireTables` dise « en euros, deux décimales » ; `rendreResultat` rend **tout nombre non entier avec deux décimales** (`toFixed(2)`, jamais un flottant brut) ; `NOMBRE` accepte un séparateur de milliers (espace, espace fine, point) et la comparaison des citations se fait sur une **forme canonique** (séparateurs retirés, virgule → point, zéros de fin retirés : `12 500,00` ≡ `12500` ≡ `12500.0`) ; `NON_QUANTITES` n'exclut une année `(19\|20)\d{2}` que si elle n'est ni décimale, ni suivie de `€`/`euros`, ni précédée d'un séparateur de milliers ; `DATE` exige `JJ/MM` avec un mois ≤ 12 et un jour ≤ 31 ; `MOTS_REFUSES` est vérifié sur le SQL **après** retrait des chaînes `ENTRE_GUILLEMETS`. | Audit § 5 : sans ça, aucune réponse avec un montant ne passe le contrôle « pas un chiffre hors des données ». Des centimes obligeraient le modèle à convertir : une source d'erreur de plus. |
| M12 | **Rapprocher, v1 minimale** : `moteur/src/archetypes/ecarts.ts` (§ 3.7) ; les écarts sont calculés par le métier et rendus par le rapport dans une section déclarée par `MetierVeiller.sections?`. Les seuils vivent dans la config du métier. **Reportés, à écrire dans HANDOFF comme tels** : le champ lu avec son doute (G-03), la table d'états générique de relance, le brouillon de relance comme archétype Rédiger. | Rien ne lit de document ni n'écrit en v1 ; le rapprochement qui fait fuir la marge est un calcul sur des exports. |
| M13 | **Veiller pour l'agence web** : `MetierVeiller.lire` **reste synchrone** ; les connecteurs de la v1 lisent des exports (CSV) ; une récupération en ligne (RDAP, GitHub) serait une étape préalable, hors v1, notée dans HANDOFF. `Duree` gagne `{ jours: number; fin_de_mois: true }` = les jours, puis la fin du mois atteint. Échéances : entretien § 8, table de M13 au § 7. Une date inconnue est une alerte. | Rendre `lire` asynchrone remonte jusqu'à `copie` (contrat synchrone) et à la sécurité : hors du périmètre. |
| M14 | **Catalogue initial : huit gestes codés** (§ 7.3), pas trente et un. Les vingt-trois autres phrases de l'entretien § 12 vont à l'échappée, puis à la promotion et à la ronde : **c'est la mesure du critère 2**. | Lionel veut savoir si « le système va bien pouvoir produire les bons workflows » : on ne le sait qu'en ne les codant pas d'avance. |
| M15 | **Les interdits de l'agence web entrent en `declare`**, les cinq adossés à un texte en `texte` sans `relu` ; donc, en v1, le verdict le plus grave est « à vérifier » (`verdict.ts`). Contrôles codés : I-01, I-02, I-03, I-04, I-07, I-09, I-10, I-11, I-12, I-13, I-14 ; humains : I-05, I-06, I-15. Un scénario `T-xx` par interdit au moins ; `cas` ou `cas_absent` pour chaque interdit codé. | La méthode : un refus exige un texte relu ou un incident constaté. L'agence fictive n'a ni l'un ni l'autre. |
| M16 | **Le client fictif** : `exemples/agence-web-fictive/`, des CSV commis (§ 6.3), produits par un générateur déterministe commis (`metiers/agence-web/code/src/cli/fictif.ts`, graine fixe, générateur congruentiel écrit dans le fichier, aucune dépendance), avec les volumes de l'entretien § 7 et sept erreurs posées (§ 6.4). Noms inventés, d'origines et de genres mêlés, erreurs réparties sans lien avec les noms (règle de `exemples/client-fictif`). | Des volumes réalistes à la main sont infaisables ; un générateur commis est rejouable, et les CSV commis rendent les tests indépendants de lui. |
| M17 | **Identifiants** : `M-nn` (personne de l'agence), `CLI-nn`, `CT-nn` (contact), `PRJ-nn`, `LOT-nnn`, `DEV-AAAA-nnn`, `AVE-AAAA-nnn`, `FAC-AAAA-nnn`, `TK-nnnn`, `TMA-nn`, `ST-nn`, `DOM-nn`. Jamais `D-`, `E-`, `T-`, `O-`, `R-`, `A-`, `V-` : pris par la grille, les scénarios et la sécurité. | Éviter toute collision avec `regles/schema.ts` et avec l'interface de la sécurité. |
| M18 | **Pas de client final, pas de sous-traitant dans `personnes.yaml` en v1.** Six personnes, cinq rôles. | Un accès venu de l'extérieur est un autre modèle de risque : phase F. |

### Coût annoncé (estimation, à vérifier au lot 4)

GLM : deux passes de trois évals, deux métiers, à chaque sous-lot du lot 1
et au lot 4 : de l'ordre de 10 $. Ronde et chantier réels (lot 4) : une
ronde et un ou deux chantiers, 7 à 10 $ chacun estimés par le binaire, sur
l'abonnement.

---

## 2. Où vit le code

```
moteur/src/
  conversation/roles.ts          M1, M3 : RoleDeclare, Capacite, aCapacite, Identite, schemaRegistre
  conversation/noms.ts           M4 : Designable (avec sorte), est déplacé depuis designation.ts si c'est là qu'il vit
  conversation/domaine.ts        M7 : Domaine
  gestes/types-parametre.ts      M5 : TypeParametreDeclare, TYPES_MOTEUR, typeDe()
  gestes/operation.ts            M6 : OperationApprise
  archetypes/ecarts.ts           M12
  cli/metier.ts                  M10 : metierDe(dossierClient) → le module du métier
metiers/securite-privee/code/src/
  roles.ts, domaine.ts, types-parametre.ts, operation-reaffecter.ts   (déclarations ; code déplacé, pas réécrit)
  evals/*.yaml                   M8 : déplacés depuis evals/ (git mv)
metiers/agence-web/
  fiche.md, regles.yaml, scenarios/T-xx.yaml, entretien-simule-2026-10-12.md
  evals/{consignes,echappees,gestes,promotions,rondes}.yaml
  code/package.json, code/tsconfig.json, code/src/
    index.ts                     export * : CONVERSATION, VEILLER, CONTROLES, VEILLES
    modele.ts                    zod des 19 tables (§ 6.3) et Contexte
    semantique.ts                consommé / vendu, périmètre recetté, accès attendu, heures TMA du mois
    connecteurs/csv-exports.ts   lit les CSV ; lecture seule ; aucune écriture
    controles.ts                 I-01 … I-14 codés (M15)
    echeances.ts                 M13
    veille.ts                    ConfigAgenceWeb, decrire, VEILLER
    copie.ts                     TableCopie par capacité
    actions.ts                   les huit gestes (M14)
    conversation.ts              roles, domaine, typesParametre, noms, tableau, CONVERSATION
    cli/fictif.ts                M16 : le générateur
    *.test.ts                    au moins un dès la création du paquet (vitest sans test = échec)
exemples/agence-web-fictive/     config.yaml, personnes.yaml, *.csv (§ 6.3), journal.sqlite créé au premier usage
```

Conventions : `PLAN-ESPACES.md` § 1.4 ; `package.json` et `tsconfig.json`
du nouveau paquet copiés de `metiers/securite-privee/code/` (nom
`@harnais/agence-web`, mêmes scripts `typecheck` et `test`, mêmes
dépendances) ; `pnpm install` après création.

---

## 3. Les contrats nouveaux du moteur (signatures exactes ; lot 1)

Les noms ci-dessous sont ceux à écrire. Un nom différent est un écart, pas
une amélioration.

### 3.1 `conversation/roles.ts` (M1, M2, M3)

```ts
export const CAPACITES = ['voit_tout', 'designe_autrui', 'propose', 'ecrit', 'valide', 'administre'] as const
export type Capacite = (typeof CAPACITES)[number]

export interface RoleDeclare {
  /** snake_case ASCII, c'est la valeur de `Identite.role` et de `personnes.yaml`. */
  id: string
  /** « le patron », « un agent », « la cheffe de projet » : pour les prompts, jamais un nom. */
  enMots: string
  /** true : `Identite.personne` est exigé et doit exister chez le client. false : le rôle est unique dans le registre. */
  identifie: boolean
  tutoie?: true
  capacites: Capacite[]
}

export type Role = string
export interface Identite { role: Role; personne?: string }

export const aCapacite = (roles: RoleDeclare[], identite: Identite, c: Capacite): boolean
/** Le rôle déclaré de cette identité ; lève si le métier ne le déclare pas. */
export const roleDe = (roles: RoleDeclare[], identite: Identite): RoleDeclare
/** « le patron », « l'agent A-2 », « la cheffe de projet M-3 » : enMots, puis l'identifiant si le rôle est identifié. */
export const quiParle = (roles: RoleDeclare[], identite: Identite): string
/** Le schéma zod de `personnes.yaml` pour ces rôles : un rôle non identifié est unique ; un rôle identifié exige `personne` (ancienne graphie `agent` acceptée et renommée). */
export const schemaRegistre = (roles: RoleDeclare[]): z.ZodType<{ personnes: Identite[] }>
/** Lit `{ role, personne? , agent? }` et rend `{ role, personne? }` : la lecture des deux graphies, partout. */
export const IdentiteSchema: z.ZodType<Identite>
```

`personnes.ts` garde `FICHIER_PERSONNES`, `recevoir`, `IdentiteVerifiee` ;
son `Personne` et `RegistrePersonnes` deviennent `schemaRegistre(m.roles)`.
`recevoir` reçoit `roles` en paramètre de plus (la porte est avant le
dossier : `m.roles` est une propriété statique de `CONVERSATION`, lisible
sans ouvrir).

**Où `=== 'patron'` / `=== 'agent'` deviennent une capacité** (audit § 1 ;
relis chaque ligne avant d'éditer) :

| Endroit | Devient |
|---|---|
| `conversation.ts` « de qui parlez-vous ? » réservé au patron | `aCapacite(m.roles, identite, 'designe_autrui')` |
| `conversation.ts` un agent ne désigne que lui-même (niveau 2 interdit) | `!aCapacite(..., 'designe_autrui')` → tout paramètre de sorte `personne` vaut `identite.personne` |
| `conversation.ts` tutoiement | `roleDe(...).tutoie` |
| `geste-appris.ts` « un geste qui écrit n'est ouvert qu'au patron » | `aCapacite(..., 'ecrit')` |
| `action-apprise.ts`, `fabriquer.ts`, `evals/traduction.ts` « pour un agent, le paramètre agent vaut lui-même » | même règle que la ligne 2, sur la sorte `personne` |
| `interface/src/app.ts` `exigerPatron` | `exigerCapacite('administre')` |
| `boucle.ts` `proposer: false` pour un agent | `aCapacite(..., 'propose')` |
| `echappee`/`proposition` « validée par le patron » | `aCapacite(..., 'valide')` |

### 3.2 `conversation/noms.ts` (M4)

```ts
export interface Designable { id: string; nom: string; sorte: 'personne' | 'organisation' }
```

`MetierConversation` : `vocabulaire(s, identite): { noms: Designable[] }`
(renommé) et **nouveau** `noms(s: Session): Designable[]` (tout). Les sept
appels `vocabulaire(s, { role: 'patron' }).agents` (`nuit.ts`,
`chantier.ts`, `ronde.ts`, `promouvoir.ts`, `atelier.ts`, `cli/chantier.ts`,
`evals/traduction.ts`) deviennent `m.noms(s)`. `EchappeeDuMetier.personnes`
et `.toutes` gardent leur nom (leur sens ne change pas) mais reçoivent des
`Designable` avec `sorte`. La désignation filtre `sorte === 'personne'`.

### 3.3 `gestes/types-parametre.ts` (M5)

```ts
export interface TypeParametreDeclare {
  nom: string                                   // FORMAT_NOM
  enMots: string                                // pour TYPES_EN_MOTS de la fabrication
  sorte: 'personne' | 'entite' | 'texte'
  /** sorte `entite` : l'identifiant exact, sinon le nom unique (insensible à la casse), sinon tous les candidats ; le geste décide. */
  resoudre?: (mention: string, s: unknown) => Designable[]
}
export const TYPES_MOTEUR = ['date', 'periode', 'nombre'] as const
/** Le type d'un paramètre appris : du moteur ou du métier ; lève s'il n'existe pas. */
export const typeDe = (types: TypeParametreDeclare[], nom: string): { sorte: ... }
```

`MetierConversation.typesParametre: TypeParametreDeclare[]`. `ParametreAppris.type`
= `z.string().regex(FORMAT_NOM)` ; au chargement d'un geste (`chargerGestes`
ou l'équivalent), chaque type est vérifié par `typeDe`. `action-apprise.ts`
construit le schéma zod par sorte (`personne` → mention texte résolue par
`vocabulaire().noms` ; `entite` → mention texte résolue par `resoudre` ;
`texte` → `z.string().min(1)` ; `nombre` → `z.number()` ; `date`, `periode`
inchangés).

### 3.4 `gestes/operation.ts` (M6)

```ts
export interface OperationApprise<Modif> {
  nom: string                                   // 'reaffecter'
  enMots: string                                // « réaffecter une vacation à un autre agent »
  /** Les colonnes de `pour_chaque` que l'opération lit : `{ vacation: 'colonne', agent: 'colonne' }`. */
  colonnes: z.ZodType<Record<string, string>>
  /** Une modification telle qu'un test l'attend ou qu'un rejeu la rend. */
  modification: z.ZodType<Modif>
  /** Fabrique la modification d'une ligne de `pour_chaque`. */
  depuisLigne(ligne: Record<string, unknown>, colonnes: Record<string, string>): Modif
  /** Les modifications validées, relues dans le journal pour une conversation. */
  relire(journal: Journal, conversation: string): Modif[]
  egal(a: Modif, b: Modif): boolean
  /** L'identifiant de l'objet modifié (`vacation`), pour les critères d'éval M8. */
  objet(m: Modif): string
}
```

`MetierConversation.operation?: OperationApprise<unknown>` ; absente, aucun
geste qui écrit ne se fabrique ni ne se charge (« ce métier n'écrit pas »).
`ModificationsApprises = { pour_chaque, operation: string, colonnes: Record<string,string> }`
avec la lecture de l'ancienne forme (M6). `TestAppris.modifications` devient
`z.array(z.unknown())` validé par `operation.modification` au chargement.

### 3.5 `conversation/domaine.ts` (M7)

```ts
export interface Domaine {
  /** « l'outil de planning d'une entreprise de sécurité privée » */
  cadre: string
  /** « le planning et les agents » : ce qui, demandé autrement, est « je ne sais pas ». */
  objets: string
  /** « Une modification réaffecte une vacation à un autre agent ; créer ou supprimer une vacation n'est pas possible. » ; null = aucune modification possible. */
  modifications: string | null
  /** Les places des consignes-types de la ronde : ['<agent>', '<du>', '<au>', '<site>', '<vacation>']. */
  places: string[]
  /** Le motif des identifiants à masquer avant la ronde et la mission : /\bA-\d+\b/g. */
  identifiants: RegExp
  /** La phrase rendue quand aucun constat : « Aucune vacation contraire à une règle. » */
  rienASignaler: string
}
```

`MetierConversation.domaine: Domaine`. Chaque phrase en dur citée à l'audit
§ 2 et § 6 lit le champ correspondant ; `boucle.ts` dit « modifications »
là où il disait « réaffectations » ; `fabriquer.ts` compose son prompt avec
`domaine.cadre`, `operation?.enMots`, `typesParametre[].enMots`.

### 3.6 `tableau` pour l'interface (M10)

```ts
export interface DemandeTableau { id: string; sorte: string; texte: string; statut: string; depuis: string }
export interface Tableau {
  demandes: DemandeTableau[]
  /** Les lignes « en attente d'une réponse » que l'interface montre à part (la sécurité : les délégations proposées). */
  enAttente: { id: string; texte: string }[]
  /** Le nom à afficher pour celui qui parle (« le patron », « Aïcha Traoré »). Il ne part jamais au modèle. */
  nom: string
  /** Chaque chaîne de l'interface qui nomme un objet du métier : suggestions par rôle, phrases d'accueil et d'état vide, libellés des conditions. Liste exacte à tirer de `app.js` et `index.html`, et à coller dans HANDOFF. */
  textes: { suggestions: string[]; accueil: string; vide: string; conditions: Record<string, string> }
}
```

`MetierConversation.tableau?: (s, identite, maintenant) => Tableau` ; la
sécurité y déplace `demandesEnCours`, `TYPE_DELEGATION_PROPOSEE` et les
chaînes. Les règles (`s.registre.interdits`) passent par un nouveau
`MetierConversation.registre(s): Registre`.

### 3.7 `archetypes/ecarts.ts` (M12)

```ts
export interface Ecart {
  objet: string                                 // 'PRJ-12', 'PRJ-12/LOT-003', 'TMA-04/2026-10'
  mesure: string                                // « jours consommés / vendus »
  consomme: number
  vendu: number
  unite: 'jours' | 'heures' | 'euros'
  seuil: number                                 // 0.9
}
export const taux = (e: Ecart): number | null  // null si vendu = 0
export const depasse = (e: Ecart): boolean
export const decrireEcart = (e: Ecart): string  // « PRJ-12 : 23,5 j consommés sur 18 vendus (131 %) »
```

`MetierVeiller.sections?(ctx, config, aujourdhui): { titre: string; lignes: string[] }[]` ;
le rapport (`archetypes/rapport.ts`) rend ces sections après les siennes.

---

## 4. Lot 1a — Rôles, identité, capacités, noms (M1 à M4)

**Fichiers** : `roles.ts`, `noms.ts` (nouveaux) ; `actions.ts`,
`personnes.ts`, `conversation.ts`, `traduire.ts`, `geste-appris.ts`,
`action-apprise.ts`, `fabriquer.ts`, `promotion.ts`, `atelier.ts`,
`promouvoir.ts`, `resume.ts`, `ronde.ts`, `chantier.ts`, `nuit.ts`,
`cli/chantier.ts`, `cli/parler.ts`, `evals/evals.ts`, `evals/traduction.ts`,
`echappee/echappee.ts` (`Instantane`), `boucle.ts` ; leurs tests ; côté
sécurité : `roles.ts` (nouveau), `conversation.ts` (`roles`, `noms`,
`vocabulaire`), le renommage `identite.agent` → `identite.personne`.

**Tests à écrire** (`roles.test.ts`, et les tests existants adaptés) : chaque
capacité accordée et refusée ; `schemaRegistre` sur le `personnes.yaml` de la
sécurité tel quel ; sur un registre à cinq rôles identifiés ; sur un rôle non
identifié présent deux fois (refus) ; `IdentiteSchema` lit `{ role: 'agent',
agent: 'A-2' }` et rend `personne: 'A-2'` ; un journal simulé portant
`identite.agent` relu par `resume.ts` ; `quiParle` pour un rôle identifié et
non identifié ; `cli/parler.ts --role agent --agent A-2` encore accepté.

**Mesure de sortie** : règle 3 du § 0.

## 5. Lot 1b — Types, opération, domaine (M5 à M7)

**Fichiers** : `types-parametre.ts`, `operation.ts`, `domaine.ts`
(nouveaux) ; `geste-appris.ts`, `action-apprise.ts`, `fabriquer.ts`,
`echappee.ts`, `boucle.ts`, `ronde.ts`, `ronde/rapport.ts`, `mission.ts`,
`archetypes/rapport.ts` (`rienASignaler`), `methode/chantier.md`,
`methode/architecture-pour-modeles.md` ; côté sécurité : `types-parametre.ts`,
`operation-reaffecter.ts`, `domaine.ts` (nouveaux, par déplacement),
`conversation.ts` (les trois propriétés).

**Tests** : un geste appris dont un paramètre a un type déclaré par un métier
simulé (sorte `entite`, résolu) ; un type inconnu refusé au chargement ; une
opération déclarée : `depuisLigne`, `relire`, `egal` ; l'ancienne forme
`reaffecter` lue et convertie ; le prompt de traduction contient `cadre` et
`objets` et **aucune autre phrase que celles du métier simulé** ; le prompt
de la ronde contient `places` ; `mission.ts` masque avec `identifiants`.

**Mesure de sortie** : règle 3 et porte 1 de la règle 6. Les prompts
changent de texte : c'est ici que la mesure de la sécurité peut bouger.

## 6. Lot 1c — Évals, chantier, interface, argent (M8 à M11)

**6.1 Évals** : `git mv evals/{consignes,echappees,gestes,promotions,rondes}.yaml metiers/securite-privee/evals/` ;
consommateurs à mettre à jour (grep du 2026-10-12) : `agence.yaml`,
`cli/evals.ts`, `evals/evals.ts`, `evals/evals.test.ts`, `chantier.ts`,
`chantier.test.ts`, `essai.ts`, `garde.ts`, `garde.test.ts`,
`metiers/securite-privee/code/src/conversation.test.ts`, `methode/chantier.md`,
`README.md`, `HANDOFF.md` (la section « Commandes » seulement ; l'historique
ne se réécrit pas). Les plans (`PLAN-*.md`) ne se réécrivent pas.

**6.2 Chantier** : `agence/config.ts` (`evals_clients`, `${metier}`),
`agence.yaml`, `garde.ts` (`garderDiff(..., metier)` résout les motifs),
`chantier.ts` (`mesurerHonnetete` sur `evals_clients[mission.metier]`),
`agence/fictif.ts` (`personnesFictives(dossierClient)`), les tests de fuite
(`carte.test.ts`, `memoire.test.ts`, `ronde.test.ts`, `chantier.test.ts`)
sur les deux clients dès que le second existe (lot 2a ; d'ici là, sur le
premier, paramétré).

**6.3 Interface** : `cli/metier.ts` ; `interface/src/serveur.ts`, `app.ts`,
`package.json`, `serveur.test.ts` ; `public/static/app.js`, `index.html`
(les chaînes deviennent `textes`) ; `temps/temporal.ts` (`aParis`) ;
`package.json` racine (`remplacer`) ; côté sécurité : `tableau` dans
`conversation.ts` par déplacement du code de `app.ts`.

**6.4 Argent** : `copie.ts` (`decimales`), `requete.ts` (`rendreResultat`,
`MOTS_REFUSES` hors chaînes), `reponse.ts` (`NOMBRE`, `NON_QUANTITES`,
`DATE`, la forme canonique). Tests : « 12 500,00 € » cité pour `12500` ;
« 2 026,00 € » n'est pas une année ; `SUM` de `1234.56 + 0.1` rend
`1234.66` ; « 3/4 » n'est pas une date ; `WHERE type='update'` accepté,
`UPDATE t` refusé.

**Mesure de sortie** : règle 3, portes 1 et 2 ; `pnpm interface` sur
`exemples/client-fictif`, le flux du patron (connexion, une absence, une
confirmation) capturé avec `playwright-cli`, captures relues ; **relecture
indépendante du lot 1 entier**, corrections, fusion, push.

---

## 7. Lot 2 — Le métier et son client fictif

### 7.1 Lot 2a — Fiche, règles, modèle, connecteur, générateur

- `metiers/agence-web/fiche.md` au format `GRILLE.md`, rubriques 0 à 8 tirées
  de l'entretien (sans les numéros de question), marqueurs `registre:`
  comme la fiche de la sécurité, « Questions ouvertes » : les cinq textes à
  relire (juriste), les seuils, les incidents à dater, l'accessibilité.
- `regles.yaml` : I-01 à I-15 (entretien § 1, `statut: declare` ; I-07,
  I-08, I-09, I-10, I-14 : `statut: texte` sans `relu`, `source` = la
  référence citée), E-01 à E-08 (§ 4) ; `scenarios/T-01` à `T-15` ;
  `pnpm registre:generer` puis `registre:verifier` verts.
- `modele.ts` : un zod par table du § 7.2, `Contexte` indexé (par
  identifiant) ; `connecteurs/csv-exports.ts` : `lireAgenceWeb(dossier,
  fichiers): Contexte`, `csv-parse` comme la sécurité, colonnes exactes du
  § 7.2, une colonne manquante lève.
- `cli/fictif.ts` : `pnpm --filter @harnais/agence-web fictif --vers
  <dossier>` ; refuse `exemples/client-fictif` ; écrit les CSV du § 7.2 avec
  les volumes et les erreurs du § 7.3 ; graine fixe ; prénoms et noms
  inventés dans le fichier (quarante de chaque, origines mêlées).
- `exemples/agence-web-fictive/config.yaml` : `client: agence web fictive`,
  `metier: agence-web`, `donnees: { <table>: <fichier>.csv }`, `journal:
  journal.sqlite`, `seuils: { forfait_alerte: 0.9, forfait_refus: 1.1,
  tma_alerte: 0.8, delegation_eur_ht: 5000, remise_max: 0.1 }`,
  `veiller.echeances` (M13), `conversation` recopiée de
  `exemples/client-fictif/config.yaml` (même modèle, mêmes plafonds, même
  `acces`) ; `personnes.yaml` : six lignes `{ role, personne }`.
- Tests : le connecteur lit chaque table ; les volumes ; chaque erreur
  posée retrouvée par `semantique.ts`.

### 7.2 Les tables (colonnes exactes, snake_case, en-tête en première ligne, `;` comme séparateur comme la sécurité)

| Fichier | Colonnes |
|---|---|
| `personnes.csv` | `id;nom;role;tjm_vente_eur;cout_journalier_eur;entree_le` |
| `clients.csv` | `id;nom;secteur;nda;contrat_art28;bon_de_commande_obligatoire;portail_fournisseur` |
| `contacts.csv` | `id;client;nom;fonction` |
| `projets.csv` | `id;client;nom;type;etat;debut;fin_prevue;mise_en_prod_le;garantie_fin;po` (`type` ∈ forfait, regie, interne ; `etat` ∈ cadrage, en_cours, recette, livre, garantie, clos) |
| `lots.csv` | `id;projet;nom;jours_vendus;montant_ht_eur;recette_le;pv_signe_le` |
| `devis.csv` | `id;client;projet;date;montant_ht_eur;jours;etat;signataire;remise;clause_cession;envoye_le;signe_le` (`etat` ∈ brouillon, envoye, signe, refuse, expire) |
| `avenants.csv` | `id;devis;projet;date;montant_ht_eur;jours;etat;signataire;motif` |
| `tickets.csv` | `cle;projet;lot;contrat_tma;resume;type;etat;assigne;estimation_h;cree_le;resolu_le;rattache_a` (`type` ∈ bug, evolution, tache, vide ; `rattache_a` = `LOT-`/`AVE-`/`TMA-` ou vide) |
| `temps.csv` | `personne;projet;date;heures;commentaire` (la maille de Notion : par projet, jamais par ticket) |
| `factures.csv` | `id;client;projet;lot;date;montant_ht_eur;tva;montant_ttc_eur;echeance;delai_jours;fin_de_mois;etat;payee_le;penalites_mentionnees;indemnite_40_mentionnee` |
| `paiements.csv` | `facture;date;montant_eur` |
| `relances.csv` | `facture;date;niveau;par` |
| `contrats_tma.csv` | `id;client;projet;heures_incluses_mois;montant_ht_mois_eur;debut;fin;preavis_jours` |
| `recettes.csv` | `projet;lot;date;pv_signe_le;reserves;bloquante` |
| `acces.csv` | `ressource;sorte;personne;depuis;jusqua;revoque_le` (`sorte` ∈ depot, hebergeur, registrar, admin_site, tiers) |
| `depots.csv` | `nom;projet;collaborateurs;derniere_mise_en_prod_le;par` (`collaborateurs` = identifiants séparés par `,`) |
| `sauvegardes.csv` | `projet;date;par` |
| `domaines.csv` | `id;nom;client;registrar;expire_le;certificat_expire_le` |
| `sous_traitants.csv` | `id;nom;montant_annuel_ht_eur;attestation_urssaf_le` |
| `versions.csv` | `projet;composant;version;fin_de_support_le` (fournie par le client, jamais devinée) |

Volumes (entretien § 7) : 6 personnes, 25 clients, 30 contacts, 18 projets
(8 en cours), 45 lots, 40 devis, 6 avenants, 300 tickets, 1 500 lignes de
temps sur 12 mois, 60 factures, 12 contrats TMA, 20 recettes, 40 accès,
18 dépôts, 30 sauvegardes, 30 domaines, 3 sous-traitants, 18 versions.

### 7.3 Les erreurs posées (chacune retrouvée par un contrôle ou une échéance)

1. un forfait à 150 % des jours vendus (I-12, écart) ;
2. un domaine expiré et un certificat qui expire dans 10 jours (I-13) ;
3. un accès `depot` d'un `ST-` jamais révoqué sur un projet clos (I-04) ;
4. une facture de solde émise sur un lot sans `pv_signe_le` (I-01) ;
5. un ticket `evolution` résolu, `rattache_a` vide, sur un projet en garantie (I-02) ;
6. un ticket `bug` sur un lot sans recette (I-05 : à l'humain, mais listé) ;
7. une attestation URSSAF de plus de six mois pour un `ST-` à 8 000 € (I-09) ;
8. une facture à `delai_jours: 90` sans pénalités mentionnées (I-07) ;
9. un devis à `remise: 0.15` signé par `commercial` (I-11) ;
10. une mise en prod sans sauvegarde datée de moins de 24 h (I-03).

### 7.4 Lot 2b — Contrôles, veille, conversation

- `controles.ts` (M15), `echeances.ts` et `veille.ts` (M13), `copie.ts`
  (trois niveaux : `voit_tout` → toutes les tables ; `commercial` →
  `clients`, `contacts`, `projets` (sans `po`), `lots` (sans jours), `devis`,
  `avenants`, `factures`, `paiements`, `relances`, `contrats_tma`,
  `domaines`, jamais `temps`, `personnes.cout_journalier_eur`,
  `personnes.tjm_vente_eur` ; sinon → `tickets` et `temps` filtrés sur
  `identite.personne`, `projets` de ces tickets, `acces` de la personne,
  `depots` de ses projets ; **jamais un montant**), `actions.ts` (§ 7.5),
  `conversation.ts` (`roles`, `domaine`, `typesParametre`, `noms`,
  `vocabulaire`, `copie`, `echappee` sans `outils.proposer` ni opération,
  `tableau`, `registre`, `CONVERSATION`).
- Tests : les onze contrôles codés sur les erreurs posées ; les échéances
  (y compris « date inconnue » sur un domaine sans `expire_le`) ; la copie
  par capacité **prouvée sur les tables rendues** (un `developpeur` : aucune
  colonne `*_eur`, aucune ligne de `temps` d'autrui) ; `fuites` sur
  `noms(s)` (personnes, clients, contacts, sous-traitants) ; les huit gestes
  par chaque rôle, avec les refus.
- `pnpm veiller --client exemples/agence-web-fictive` : rapport avec
  constats, échéances et (après le lot 3) écarts ; `pnpm parler` sur les
  huit gestes.
- Relecture indépendante, fusion, push.

### 7.5 Les huit gestes (M14)

| id | rôles | paramètres | rend |
|---|---|---|---|
| `etat_projet` | tous (un `graphiste`/`developpeur` seulement sur ses projets) | `projet: entite` | état, lot en cours, jours consommés / vendus (si `voit_tout`), PV en attente, prochaine échéance |
| `factures_en_retard` | `voit_tout`, `commercial` | `client: entite \| null` | par facture : client, montant, jours de retard, dernière relance |
| `mes_tickets` | tous | `periode \| null` | ses tickets par projet, état, estimation |
| `mon_temps` | tous | `periode` | ses heures par projet (pour `voit_tout` avec `personne: entite \| null` : celles d'une autre) |
| `disponibilites` | `voit_tout`, `commercial` | `periode` | par personne : heures estimées restantes, absences |
| `domaines_expirant` | `voit_tout`, `developpeur` | `nombre` (jours) | domaines et certificats qui expirent dans n jours, date inconnue en tête |
| `declarer_absence` (`ecrit: true`, `propose: true`) | tous | `periode` | la proposition : les tickets de la période listés pour la PO ; rien d'écrit (pas d'opération en v1 : la proposition est montrée, le journal porte la ligne, c'est tout) |
| `brouillon_relance` (`ecrit: true`) | `voit_tout`, `commercial` | `facture: entite` | un brouillon rendu par le code (niveau selon `relances.csv`), **jamais envoyé** ; la confirmation écrit une ligne `brouillon` au journal |

Les refus par capacité (entretien § 12 : phrases 11, 13, 20 bis, 24, 29)
sont des refus de `reformuler` (« ce geste n'est pas ouvert à votre rôle »)
ou d'absence du geste dans la liste du rôle : les deux sont testés.

---

## 8. Lot 3 — Rapprocher et le rapport

- `archetypes/ecarts.ts` (§ 3.7) ; `archetypes/rapport.ts` rend
  `sections` ; `temps/delais.ts` : `Duree` fin de mois et `ajouter` ;
  `semantique.ts` de l'agence web : consommé / vendu par projet (la maille
  du temps) et par lot quand `temps.commentaire` nomme un `LOT-`, heures TMA
  du mois courant, facturé contre vendu par projet ; `veille.ts` déclare
  `sections` (« Écarts ») et I-12 lit `ecarts`.
- Tests : le forfait à 150 % en écart et en constat I-12 ; un TMA à 80 % en
  écart ; « 45 jours fin de mois » sur trois dates (31/01 → 31/03 ;
  15/02 → 30/04 ; 28/02 → 30/04 en année non bissextile) ; `vendu = 0` →
  `taux` null, pas de division.
- Rien n'appelle un modèle. Relecture, fusion, push.

---

## 9. Lot 4 — La mesure

1. `metiers/agence-web/evals/consignes.yaml` : les trente et une phrases de
   l'entretien § 12, plus deux variantes de forme par phrase, étiquetées :
   `action` (l'un des huit), `nouvelle` (intention), ou `refus` (capacité) ;
   `echappees.yaml` : les vingt-trois demandes hors catalogue avec ce que
   la réponse doit contenir (chiffres attendus, calculés depuis les CSV par
   le test, jamais écrits à la main) ; `gestes.yaml` : les huit ;
   `promotions.yaml`, `rondes.yaml` : vides, avec un commentaire qui le dit.
2. `pnpm evals traduire`, `echappee`, `gestes` sur l'agence web, **deux
   passes GLM** ; fuite 0 ; résultats dans `evals/resultats/`.
3. `pnpm promotions` sur le journal des évals : ce qui est promu en geste
   appris (lecture) ; rejoué ; compté.
4. Ronde réelle (abonnement) sur ce journal ; au moins une mission ;
   chantier réel sur un clone de la nuit avec `origin` nu local (procédure
   de `HANDOFF.md`, « Phase D, session D2 ») ; `agence.yaml` modifié pour le
   critère puis **restauré** ; la garde testée contre un diff qui touche
   `metiers/securite-privee/` ; fusion ou refus écrit.
5. `pnpm interface --client exemples/agence-web-fictive` : connexion en
   `po`, une demande, un refus en `developpeur`, l'onglet Règles ; captures
   `playwright-cli` relues.
6. Analyse d'erreurs (skill `error-discovery`) sur les traces GLM des deux
   passes : une passe de plus dans `evals/erreurs-<date>.md`.
7. **Le compte du critère 2** : sur vingt-trois demandes hors catalogue,
   combien répondues juste par l'échappée, promues, désignées par la ronde,
   codées par le chantier. Un tableau, dans `HANDOFF.md` et dans
   `memoire/MESURES.md`.
8. README, HANDOFF (« Phase M »), mini-site et présentation : « deux
   métiers » là où ils disent « un », rien de plus. Mémoire auto.

---

## 10. À trancher par Lionel (le plan prend la première ligne de chaque point faute de réponse)

1. **M14** : huit gestes codés, le reste mesuré ; ou les trente et un
   codés (la démo).
2. **M3, la PO** : `voit_tout, designe_autrui, propose, valide` ; ou
   `ecrit` aussi.
3. **M15** : tout en `declare` → jamais de refus en v1 ; ou dater un
   incident réel pour I-01, I-03, I-04 ou I-13 (→ `constate`, refus permis).
4. **M8** : `metiers/<m>/evals/` ; ou `evals/<m>/`.
5. **M7, le domaine comme texte libre du métier** ; ou un gabarit du
   moteur à trous.
6. **M13, « 45 jours fin de mois »** : les jours puis la fin du mois ; ou
   la fin du mois puis les jours (les deux lectures existent ; le juriste).
7. **Le juriste** : L441-9, L441-10 (code de commerce), L8222-1 (code du
   travail), L131-3 (CPI), article 28 (RGPD), et l'accessibilité
   (e-commerce depuis 2025), absente du plan.

---

## 11. Sessions, propriété des fichiers, parallélisme

Cinq sessions. Chaque session commence par la règle 2 du § 0 (la référence)
si elle n'existe pas encore sur `main`, lit `HANDOFF.md` « Où on en est »,
ce plan en entier, l'audit, puis les fichiers de ses lots.

| Session | Lots | Sous-agents (un par ligne ; fichiers possédés, exclusifs) |
|---|---|---|
| **S1** | 1a, 1b | A : `roles.ts`, `personnes.ts`, `actions.ts`, `conversation.ts`, `traduire.ts`, `cli/parler.ts`, sécurité `roles.ts` + `conversation.ts` + renommage ; B : `noms.ts`, les sept appelants de `vocabulaire`, `echappee.ts` (`Instantane`, `EchappeeDuMetier`), `evals/evals.ts`, `evals/traduction.ts`, `resume.ts`, `promotion.ts` ; **puis, après fusion locale de A et B** : C : `types-parametre.ts`, `operation.ts`, `geste-appris.ts`, `action-apprise.ts`, `fabriquer.ts`, sécurité `types-parametre.ts` + `operation-reaffecter.ts` ; D : `domaine.ts`, `boucle.ts`, `ronde.ts`, `ronde/rapport.ts`, `mission.ts`, `archetypes/rapport.ts`, `methode/chantier.md`, la carte, sécurité `domaine.ts`. La relecture indépendante à la fin ; deux commits (1a, 1b) ; pas de fusion dans `main` avant la fin de S2. |
| **S2** | 1c | E : évals (6.1) + chantier (6.2) ; F : interface (6.3) ; G : argent (6.4). Relecture du lot 1 entier ; corrections ; fusion `--no-ff` de `metier-2/lot-1c` (qui contient 1a et 1b) dans `main` ; push. |
| **S3** | 2a, 2b | H : fiche, `regles.yaml`, scénarios ; I : `modele.ts`, `connecteurs/`, `cli/fictif.ts`, le client fictif ; **puis** J : `controles.ts`, `echeances.ts`, `veille.ts` ; K : `copie.ts`, `actions.ts`, `conversation.ts`. Relecture, fusion, push. |
| **S4** | 3 | L : `ecarts.ts`, `archetypes/rapport.ts`, `delais.ts` ; M : `semantique.ts`, `veille.ts` (sections), I-12. Relecture, fusion, push. |
| **S5** | 4 | N : les évals de l'agence web ; puis la session elle-même pour les passes réelles (jamais un sous-agent avec la clé) ; relecture ; fusion ; push ; mini-site et présentation. |

Le lot 2a (H et I) ne dépend pas du lot 1 : il peut être fait par une
session à part pendant S2, sur `metier-2/lot-2a` depuis `main`, à condition
de ne pas créer `exemples/agence-web-fictive/personnes.yaml` avant que
`schemaRegistre` existe (le mettre dans le lot 2b, sinon `pnpm check`
échouerait sur un registre à cinq rôles). Les nuits de la phase E peuvent
tourner sur la sécurité dès la fin de S2.
