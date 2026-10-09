# Plan — la promotion : une échappée qui revient devient un geste

Écrit le 2026-10-09, après la décision de Lionel du même jour (`REFLEXIONS.md`,
« Décidé ») : la promotion est **l'auto-amélioration du harnais**, elle est
prioritaire, et « il faut absolument que ce soit sécurisé ». Ce plan remplace
le § 8 de `PLAN-ESPACES.md` (lot 5, le dossier pour l'atelier) : le dossier
reste, mais le harnais **fabrique** le geste et ses tests ; un humain le
**valide** avant qu'il s'active. Écrit pour être **exécuté par Claude Opus 5.5,
en plusieurs sessions, avec des sous-agents, sans avoir à décider**. Quand le
plan se tait, la règle est au § 1.

Ce qu'il ne touche pas : les interdits, les contrôles `I01`…`I20`, la clé
d'accord, le schéma du journal (il **ajoute** des champs dans `donnees`, il ne
change aucune colonne), la traduction, l'échappée elle-même, la réaffectation
groupée. La mise à jour d'un harnais livré reste le chantier de Lionel (D2 de
`PLAN-ESPACES.md`) : ce plan s'arrête au **fichier de geste validé, avec sa
clé**, qui est l'unité que cette mise à jour transportera.

**Critère de succès global** (observable), sur une copie de
`exemples/client-fictif`, avec `--maintenant 2026-10-10T21:40` :

1. trois consignes du patron d'intention `heures_par_agent` (« Combien
   d'heures a fait Karim cette semaine ? », « Combien d'heures Julien a-t-il
   fait du 5 au 11 octobre ? », « Parmi les agents qui ont travaillé du 5 au
   11 octobre, qui a le moins d'heures ? ») passent par l'échappée (modèle
   réel ou simulé) et laissent au journal leur texte final, leur rôle et
   l'instantané de la copie ;
2. `pnpm promotions --client <copie> --date 2026-10-10` écrit
   `<copie>/gestes/heures_par_agent.yaml` (statut `proposé`), avec au moins
   trois tests, et affiche « vérification : 3/3 » ;
3. `pnpm gestes activer heures_par_agent --client <copie>` pose la clé ;
4. `pnpm parler … --consigne "Combien d'heures Julien a-t-il fait du 5 au 11 octobre ?"`
   répond avec « 16 », avec **un seul** `appel_modele` (issue `traduire`),
   sans ligne `echappee`, pour moins de 0,003 $ ;
5. un octet changé dans le YAML → à la consigne suivante, le geste est écarté,
   une ligne `geste appris` / `refusé` est au journal, et la consigne repart
   en échappée comme avant ;
6. `pnpm check` vert ; `pnpm evals traduire` reste au-dessus de 95 % avec le
   geste appris chargé ; `pnpm evals gestes` (rejeu sans modèle) rend 100 %.

---

## 1. Règles de travail pour la session qui exécute

1. **Avant de coder** : lire `HANDOFF.md`, ce plan en entier, puis les fichiers
   que le lot touche. `pnpm check` doit être vert au départ (le 2026-10-09 :
   Biome, types, 229 tests moteur, 111 métier, 15 interface, registre
   cohérent).
2. **Un lot = une branche `promotion/lot-N` = un commit** (pas de push). Avant
   le commit : `pnpm check` vert, README et `HANDOFF.md` à jour. Le commit
   cite le lot : `Promotion, lot N : <titre>`.
3. **Ne jamais** : modifier `metiers/securite-privee/regles.yaml`, les
   contrôles `I01`…`I20`, `moteur/src/approbation/jeton.ts`, les colonnes du
   journal, `moteur/src/echappee/requete.ts` au-delà de ce que le lot 0 dit
   (les mots interdits et la lecture seule ne bougent pas) ; écrire dans
   `exemples/client-fictif/` (toujours une copie) ; mettre une donnée réelle ;
   ajouter une dépendance (tout est déjà là : zod, `node:sqlite`, yaml) ;
   écrire `process.env.X ?? 'valeur'` ; utiliser `any` ; laisser un `TODO` ;
   **exécuter du code venu d'un fichier de geste** (un geste appris est une
   donnée, § 2 P1).
4. **Conventions** : celles de `PLAN-ESPACES.md` § 1.4 (identifiants en
   français sans accents, clés YAML en `snake_case`, champs TS en `camelCase`,
   schéma zod et type du même nom, pas de point-virgule, erreurs en français,
   échec fermé partout, commentaire de tête qui renvoie à `PLAN-PROMOTION.md § n`).
5. **Quand le plan se tait** : `~/.claude/CLAUDE.md` et KISS ; noter le choix
   dans `HANDOFF.md` sous « Choix faits faute de consigne ». Ne jamais bloquer
   une session sur une question.
6. **Sous-agents** : un par fichier de test ou par module indépendant (§ 9) ;
   ils ne reçoivent que les règles propres à leur tâche.
7. **Mesurer avant de déclarer** : un lot qui touche ce que le modèle lit
   (lot 1 : les outils de la traduction ; lot 2 : la fabrication) n'est fini
   qu'avec une passe réelle d'évals (§ 8), coût affiché, résultat dans
   `evals/resultats/`. Sans clé dans la session : le dire dans `HANDOFF.md`,
   ne pas écrire « mesuré ».

---

## 2. Décisions (tranchées le 2026-10-09)

| # | Décision | Pourquoi |
|---|---|---|
| P1 | **Un geste appris est une donnée, pas du code.** Un fichier YAML dans le dossier du client (`gestes/<intention>.yaml`), validé par un schéma zod fermé : des paramètres typés (liste fermée de types), des requêtes SQL **paramétrées** sur la copie, un gabarit de réponse rendu par le code. Aucun JavaScript, jamais. | C'est la condition « sécurisé » : ce qu'un geste appris peut faire est borné par le schéma, pas par la relecture d'un code généré. Et c'est ce qui le rend diffable, lisible par le client, transportable par la mise à jour à distance. |
| P2 | **Aucun appel au modèle quand un geste appris s'exécute.** La traduction choisit le geste (comme pour les neuf gestes codés) ; ensuite tout est déterministe : copie du rôle, SQL lié, rendu par le code. | Décision du 2026-10-04 (le modèle ne touche que ce que le code ne sait pas faire) ; une question qui revient coûte alors 0,002 $ au lieu de 0,01 $, et répond en un appel au lieu de douze tours. |
| P3 | **Un geste appris ne lit que la copie de son rôle, en lecture seule** : les mêmes `tablesPour`, `creerCopie`, `executerRequete` que l'échappée, avec les mêmes mots interdits, le même processus enfant, le même délai. Les paramètres sont **liés** (`:agent`), jamais interpolés dans le SQL. | Pas de surface nouvelle : un geste appris ne peut rien voir ni faire de plus qu'une échappée, et moins (pas de modèle). |
| P4 | **Lecture seule aux lots 0 à 3. L'écriture (lot 4) attend une décision de Lionel**, après mesure. Quand elle viendra, elle passera par la réaffectation groupée telle quelle (contrôles, oui du patron, oui de chaque agent, clé sur la liste exacte). | Le seul endroit où sécurité et flexibilité se contredisent est l'écriture d'une demande nouvelle ; on la sépare pour la mesurer seule. |
| P5 | **Fabriqué par le modèle, vérifié par le code, activé par un humain.** La fabrication est **un seul appel**, un seul outil (`proposer_geste`, schéma strict = le schéma du geste), pas de boucle ; ce qui ne se lit pas proprement finit en « fabrication échouée : à coder à l'atelier » (le chemin d'aujourd'hui reste le repli). La vérification est en code (§ 6.2). L'activation pose une clé sur l'empreinte du fichier. | Même grammaire que la traduction (un appel, un choix, un repli clair). Un juge LLM ne vérifie rien ici : tout ce qui compte (le SQL tourne, le rejeu reproduit le texte validé, la description tient en 200 caractères) se vérifie en code. |
| P6 | **Qui active : l'agence** (Lionel, à l'atelier), pas le patron, pour les premiers clients. Le patron **voit** les gestes appris et leur statut dans l'interface. Donner l'activation au patron est un choix ultérieur, avec des chiffres. | Le geste activé est ce que l'annexe du devis engage ; l'agence doit l'avoir relu. À relire par Lionel. |
| P7 | **Un fichier de geste ne vaut que par sa clé.** Au chargement, l'empreinte du contenu doit être celle de la dernière ligne `geste appris` / `activé` du journal (et aucune ligne `retiré` après). Sinon le geste est **écarté** (pas chargé), une ligne `geste appris` / `refusé` est écrite, et la consigne repart en échappée. Le reste du harnais démarre. | Même mécanisme que la clé d'accord (`empreinte`, `exigerValidation`) : rien de nouveau à auditer. Écarter plutôt qu'arrêter : une altération d'un geste ne doit pas rendre le service muet, mais elle doit se voir (alerte Veiller). |
| P8 | **Le journal se souvient de chaque échappée** : un identifiant d'échappée sur ses lignes, le rôle, le texte final montré, et **l'instantané de la copie** dans un fichier `echappees/<id>.json` du dossier client (pas dans le journal : il refuse `DELETE`, un instantané doit pouvoir se purger). Conservation : `conversation.promotion.conservation_jours` (défaut 90), purge par `pnpm promotions`. | Sans instantané, « le geste reproduit ce que le patron a validé » n'est pas un test : les données changent entre l'échappée et la promotion. L'instantané est déjà ce que le modèle a vu : rien de plus ne sort du dossier client. À relire par Lionel (durée). |
| P9 | **Seules les échappées finies proprement comptent** pour le seuil : `reponse` avec `controle: ok`, ou `proposition` validée ou écrite. Les abandons et les résumés retirés ne comptent pas. Le seuil reste **3 en 30 jours** (D3). | On n'apprend que de ce qui a marché et a été vu. |
| P10 | **Le modèle de fabrication reçoit les échappées entières** (consigne, rôle, requêtes, résultats, texte final) entre balises `<donnees>`, avec `FRONTIERE`. Il ne reçoit pas l'instantané. | Rien de nouveau ne part chez le fournisseur : tout cela y est déjà passé pendant l'échappée. L'instantané ne lui sert pas : la vérification le rejoue en code. |
| P11 | **Les paramètres d'un geste appris, liste fermée** : `agent` (une mention, résolue par le moteur comme pour les gestes codés), `date`, `periode` (`du`, `au`), `site`, `poste`, `nombre`. Pas de texte libre. | Un paramètre libre serait une consigne cachée dans un SQL. Six types couvrent les 14 cas d'évals de l'échappée. |
| P12 | **Le rendu d'une réponse, deux formes et pas plus** : un gabarit d'une ligne qui ne peut citer que `{{requete.colonne}}` (première ligne du résultat) et `{{param}}`, ou un tableau rendu par `rendreResultat` ; plus un texte `vide` quand il n'y a aucune ligne. Pas de condition, pas de boucle, pas de calcul. | D10 (le texte montré est rendu par le code). Un gabarit qui ne peut citer que des colonnes ne peut rien inventer : `verifierReponse` n'est même pas nécessaire à l'exécution. |
| P13 | **Un geste appris est évalué comme les autres** : ses tests sont des cas de traduction (la consigne d'origine → lui, avec ses paramètres) et des cas de rejeu (paramètres + instantané → texte qui contient les chiffres validés). Le test métier qui garde les étiquettes honnêtes exige trois tests par geste appris, comme pour les gestes codés. | Le capital, ce sont les tests. Un geste appris en a au moins trois le jour de sa naissance : les trois échappées qui l'ont fait naître. |
| P14 | **L'intention promue sort de la liste des intentions** de la traduction au chargement du geste (le commentaire de `metiers/securite-privee/code/src/conversation.ts:37` le prévoit). | Deux portes pour la même demande seraient une ambiguïté de plus pour le modèle. |

### Coût d'inférence annoncé (décision du 2026-10-04, à vérifier au § 8)

| Unité | Estimation (prix GMI, `config.yaml`) | Plafond |
|---|---|---|
| Une fabrication (3 échappées, leurs tableaux, un appel) | ≈ 6 000 tokens en entrée, 1 500 en sortie : ≈ 0,015 $ (≈ 0,06 $ sur Claude) | `max_tokens: 4096`, un appel |
| Une vérification avec modèle (passe de traduction) | ≈ 0,12 $ | une passe |
| Une exécution d'un geste appris | la traduction seule, ≈ 0,002 $ | — |
| Une question posée trois fois par mois, avant / après | 0,03 $ / 0,006 $ : la promotion se rembourse le mois suivant | — |

---

## 3. Où vit le code

```
moteur/src/
  echappee/
    requete.ts        (lot 0) executerRequete accepte des paramètres liés
    echappee.ts       (lot 0) id d'échappée, rôle, texte final, instantané
  gestes/             (lot 1) nouveau dossier
    geste-appris.ts   schéma zod GesteAppris, types de paramètres, rendu
    charger.ts        chargement des fichiers, empreinte, statut
    action-apprise.ts un GesteAppris devient une Action<S, Params>
  promotion/
    promotion.ts      (lot 0 : comptage ; lot 2 : le dossier dit « geste proposé »)
    fabriquer.ts      (lot 2) l'appel au modèle, la vérification, l'écriture
  cli/
    promotions.ts     (lot 2) fabrication + vérification
    gestes.ts         (lot 3) lister | verifier | activer | retirer
    evals.ts          (lot 2, 3) pnpm evals gestes, pnpm evals promotion
  evals/evals.ts      (lot 2, 3) contrôles des deux nouvelles évals
metiers/securite-privee/code/src/
  conversation.ts     (lot 1) copie exposée au moteur, intentions filtrées
  evals.test.ts       (lot 3) trois tests par geste appris
interface/src/app.ts  (lot 3) /api/gestes (patron)
evals/
  gestes.yaml         (lot 2) cas de rejeu
  promotions.yaml     (lot 2) cas de fabrication
<dossier client>/
  gestes/<intention>.yaml     (lot 1) les gestes appris
  echappees/<id>.json         (lot 0) les instantanés
  promotions/<intention>-<date>.md  (existe) le dossier
```

---

## 4. Lot 0 — Le journal se souvient de l'échappée

### 4.1 `moteur/src/echappee/requete.ts`

`executerRequete(copie, sql, parametres?: Record<string, string | number | null>, delaiMs?)`.
Les paramètres partent au processus enfant en JSON (par `argv`, jamais
collés dans le SQL) et sont liés par `prepare(sql).all(parametres)`. Le SQL
nomme ses paramètres `:agent`, `:du`, `:au`… ; `node:sqlite` accepte les clés
nues (`{ agent: 'A-2' }`) par défaut — **à vérifier sur Node 22.22 dans le
test**, comme `readOnly` l'a été. Un paramètre nommé dans le SQL et absent de
l'objet → `{ erreur }`. Tout le reste (mots interdits, `LIMIT 201`, délai,
`SIGKILL`) ne bouge pas. Sans `parametres`, comportement identique.

### 4.2 `moteur/src/echappee/echappee.ts`

- Un identifiant d'échappée `E-<id court>` (`conversation/id.ts`) généré à
  l'entrée ; porté dans `donnees.echappee` de chaque `outil_echappee` et de la
  ligne `echappee`.
- La ligne `echappee` porte en plus : `role`, `agent?` (l'identité),
  `texte` (le texte final **tel que montré**, après contrôle : donc le repli
  en tableaux quand le résumé est retiré), `instantane` (le chemin du
  fichier).
- `ecrireInstantane(dossierClient, id, tables: TableCopie[]): string` écrit
  `echappees/<id>.json` (`{ echappee, horodatage, role, agent?, tables }`),
  avant la boucle (c'est ce que le modèle va voir). Le dossier est créé au
  besoin ; un fichier existant du même id lève.
- `CadreEchappee` reçoit `dossierClient` (il a déjà `client`, le nom).

### 4.3 `moteur/src/promotion/promotion.ts`

- `intentions()` ne compte que les échappées finies proprement (P9) : issue
  `reponse` avec `controle_reponse` absent ou `ok`, ou `proposition` suivie
  d'une ligne `reaffectation` validée ou écrite pour cette conversation.
- `EchappeeJournalisee { echappee: string; conversation; horodatage; role; agent?; consigne; intention; requetes: { sql; sortie; erreur? }[]; texte; instantane: string }` et
  `echappeesDe(journal, intention, depuis): EchappeeJournalisee[]` : les
  requêtes sont celles **de cette échappée** (par `donnees.echappee`), dans
  l'ordre des tours, erreurs comprises mais marquées.
- `ecrireDossier` utilise `echappeesDe` (il mélangeait les requêtes d'une
  conversation entière).
- `purgerInstantanes(dossierClient, journal, avant: PlainDate)` : supprime
  les fichiers `echappees/*.json` plus vieux que `conservation_jours` **qui ne
  sont cités par aucun geste appris** (les tests d'un geste gardent leur
  instantané tant que le geste existe).

### 4.4 Config

`conversation.promotion` gagne `conservation_jours` (entier, défaut 90, dans
le schéma, pas dans le code). Client fictif : `conservation_jours: 90`.

### 4.5 Tests du lot 0

- `requete.test.ts` : paramètres liés (`:agent`), paramètre manquant →
  erreur, un paramètre qui contient `'; DROP` est une valeur, pas du SQL.
- `echappee.test.ts` (simulé) : les lignes portent l'id ; le texte final
  journalisé est celui rendu ; l'instantané existe et contient les tables du
  rôle (un agent : sa seule ligne `agents`).
- `promotion.test.ts` : un abandon ne compte pas ; une réponse retirée ne
  compte pas ; `echappeesDe` sépare deux échappées de la même conversation ;
  la purge épargne l'instantané cité par un geste.

---

## 5. Lot 1 — Le geste appris, chargé et exécuté

### 5.1 `moteur/src/gestes/geste-appris.ts`

```ts
export const TYPES_PARAMETRE = ['agent', 'date', 'periode', 'site', 'poste', 'nombre'] as const
export const ParametreAppris = z.strictObject({ type: z.enum(TYPES_PARAMETRE), description: z.string().max(200) })
export const RequeteApprise = z.strictObject({ nom: z.string().regex(/^[a-z][a-z0-9_]*$/), sql: z.string().max(SQL_MAX) })
export const ReponseApprise = z.strictObject({
  ligne: z.string().max(400).nullable(),   // gabarit : {{requete.colonne}} et {{param}}
  tableau: z.string().nullable(),          // nom d'une requête rendue en tableau
  vide: z.string().max(200),               // quand la requête du gabarit ne rend aucune ligne
})
export const TestAppris = z.strictObject({
  echappee: z.string(),                    // l'id de l'échappée d'origine
  consigne: z.string(), role: z.enum(ROLES), agent: z.string().nullable(),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  instantane: z.string(),                  // echappees/<id>.json
  contient: z.array(z.string()).min(1),    // les nombres et noms du texte validé
})
export const GesteAppris = z.strictObject({
  id: z.string().regex(FORMAT_INTENTION),
  description: z.string().max(DESCRIPTION_MAX),
  roles: z.array(z.enum(ROLES)).min(1),
  parametres: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/), ParametreAppris),
  requetes: z.array(RequeteApprise).min(1).max(5),
  reponse: ReponseApprise,
  tests: z.array(TestAppris).min(3),
  origine: z.strictObject({ fabrique_le: z.iso.date(), modele: z.string(), cout_usd: z.number(), conversations: z.array(z.string()) }),
})
```

Un gabarit n'accepte que `{{nom_requete.colonne}}` et `{{nom_param}}`
(regex fermée) ; `rendre(geste, params, resultats): string` lève sur toute
référence inconnue — et `verifierGabarit(geste)` le fait statiquement au
chargement (les colonnes se lisent en exécutant chaque requête sur une copie
vide : `SELECT` sur une table vide rend ses colonnes). `periode` donne deux
clés liées (`:du`, `:au`) ; `agent` donne `:agent` (l'identifiant résolu).

Le fichier YAML a deux clés de plus, hors du schéma du geste et jamais
envoyées au modèle : `statut` (`propose | actif | retire`) et `validation`
(`{ par, le, jeton }`), écrites par le CLI du lot 3. `empreinteGeste(geste)` =
`empreinte({ geste: JSON canonique du GesteAppris })` (hors `statut` et
`validation`).

### 5.2 `moteur/src/gestes/charger.ts`

`chargerGestesAppris(dossierClient, journal): { actifs: GesteAppris[]; ecartes: { fichier; motif }[] }`.
Pour chaque `gestes/*.yaml` : lecture, schéma, `verifierGabarit`, puis
**la clé** (P7) : la dernière ligne `geste appris` du journal pour cet `objet`
doit être `activé` avec `donnees.jeton === empreinteGeste(geste)`, et aucune
ligne `retiré` ne doit la suivre. Sinon : écarté, ligne `geste appris` /
`refusé` (motif : « empreinte différente », « jamais activé », « retiré »),
et **une alerte** (`alerte`, règle `G-01` du socle, « rien ne sort sans un
humain » : un geste qui tournerait sans la clé d'un humain est exactement
ça ; aucune autre règle du socle ne couvre le cas, ne pas en inventer). Relu
**à chaque consigne**, comme le registre des personnes : retirer vaut tout de
suite.

### 5.3 `moteur/src/gestes/action-apprise.ts`

`actionApprise<S>(geste, copie: (s: S, identite: Identite, maintenant) => TableCopie[]): Action<S, Record<string, unknown>>` :

- `id`, `description`, `roles`, `ecrit: false` ;
- `parametres` : construit depuis `geste.parametres` (`agent` →
  `z.string().regex(/^A-\d+$/).nullable()` ; `date` → `z.iso.date()` ;
  `periode` → `du`, `au` ; `site`, `poste` → `z.string()` ; `nombre` →
  `z.number().int()`), chaque champ `.describe()` ; `personnes` pour chaque
  `agent` ;
- `reformuler` : « Je réponds à : <description>. » (jamais montré, lecture) ;
- `executer` : `creerCopie(copie(s, identite, maintenant))` → pour chaque
  requête `executerRequete(copie, sql, liaison(params))` (erreur → le geste
  rend « Je n'ai pas pu lire les données : <erreur> », ligne au journal) →
  `rendre` → `fermer()` dans `finally`. Rend `{ texte, donnees: { echappee: null, requetes } }`.
- `executer` est **synchrone** dans `Action` et `executerRequete` est
  asynchrone (processus enfant) : **`Action.executer` devient
  `Resultat | Promise<Resultat>`**, `conversation.ts` fait `await` (les neuf
  gestes codés ne changent pas). C'est le seul changement du moteur de
  conversation.

### 5.4 Câblage

- `MetierConversation<S>` gagne `copie: (s, identite, maintenant) => TableCopie[]` ;
  le métier y met `tablesPour`.
- `traiterConsigne` : `actions = [...m.actions, ...actifs.map(actionApprise)]`,
  `intentions = m.intentions.filter(i => !actifs.some(g => g.id === i.id))`
  (P14). Les gestes appris viennent **après** les codés dans la liste lue par
  le modèle.
- `evals.ts` (traduction) charge les gestes appris du dossier passé en
  `--client`, pour que la passe mesure la liste réelle.

### 5.5 Tests du lot 1

- `geste-appris.test.ts` : schéma (un `requetes` vide, un type de paramètre
  inconnu, un gabarit qui cite une colonne absente → refus) ; `rendre` sur
  un résultat d'une ligne, sur un tableau, sur zéro ligne (`vide`) ;
  `empreinteGeste` ignore `statut` et `validation`.
- `charger.test.ts` : jamais activé → écarté ; activé puis un octet changé →
  écarté avec `refusé` au journal ; activé puis retiré → écarté ; activé →
  chargé.
- `conversation.test.ts` (métier, simulé) : avec un `heures_par_agent.yaml`
  écrit à la main dans une copie du client fictif et activé dans le journal
  du test, `tour(s, PATRON, outil('heures_par_agent', { agent: 'A-2', du: '2026-10-05', au: '2026-10-11' }))`
  rend un texte qui contient « 16 », une seule ligne `appel_modele`, aucune
  ligne `echappee` ; le même geste pour un agent ne voit que ses lignes
  (D4) ; `heures_par_agent` n'est plus dans les intentions du système de
  traduction (lire le système du modèle simulé).

---

## 6. Lot 2 — La fabrication

### 6.1 `moteur/src/promotion/fabriquer.ts`, l'appel

```ts
export function systemeFabriquer(roles: Role[], types: typeof TYPES_PARAMETRE, gestesExistants: { id; description }[]): string
export async function fabriquerGeste(modele, effort, echappees: EchappeeJournalisee[], roles, gestesExistants): Promise<{ sorte: 'geste'; geste: GesteAppris; usage } | { sorte: 'echec'; raison; usage }>
```

Un appel, `maxTokens: 4096`, `unSeulOutil: true`, un outil `proposer_geste`
dont `input_schema` est `schemaJson(GesteAppris.omit({ origine, tests }))`
étendu d'un champ `tests: [{ echappee, params }]` (le modèle **relie** chaque
échappée d'origine aux paramètres qu'elle instancie ; le code complète
`consigne`, `role`, `instantane`, `contient`). Le système dit : la liste
fermée des types, la règle des paramètres liés (`:nom`, jamais de valeur
littérale venue d'une consigne dans le SQL), les deux formes de réponse, que
la description tient en 200 caractères et ne doit ressembler à aucun geste
existant (liste fournie), `FRONTIERE`. Les échappées sont données entre
`<donnees>` : consigne, rôle, requêtes et sorties, texte final. Lecture comme
`traduire.lire` : refus, troncature, zéro ou deux outils → `echec`.

### 6.2 La vérification, en code

`verifierGeste(geste, echappees, copieVide: TableCopie[]): Ecart[]`, chaque
écart une phrase :

1. schéma et `verifierGabarit` ;
2. chaque échappée d'origine a un test, chaque test cite une échappée
   d'origine ;
3. **pour chaque test, rejeu sur son instantané** : `creerCopie(instantane.tables)`,
   les requêtes avec les paramètres du test, `rendre` ; le texte rendu doit
   contenir chaque nombre et chaque nom du texte final de l'échappée
   (extraction par les mêmes règles que `verifierReponse` : nombres entiers,
   dates, mots de trois lettres des noms connus) → c'est `contient`, écrit par
   le code dans le test ;
4. le SQL ne cite aucune valeur littérale présente dans une consigne
   d'origine (un identifiant `A-2`, une date, un nom) : les paramètres doivent
   être liés ;
5. la description est à plus de 0,5 de distance normalisée (Damerau,
   `designation.ts`) de chaque geste existant.

`ecrireGeste(dossierClient, geste): string` écrit `gestes/<id>.yaml` avec
`statut: propose`, sans `validation`. Un fichier existant au même id n'est
jamais écrasé : le nouveau est écrit en `<id>-<date>.yaml`, le dossier le dit.

### 6.3 `pnpm promotions`

Pour chaque intention à proposer : `echappeesDe` → `fabriquerGeste` →
`verifierGeste` → `ecrireGeste` si zéro écart, sinon rien d'écrit dans
`gestes/`. Le dossier Markdown gagne une section « Geste proposé » (chemin,
« vérification : n/n », ou « fabrication échouée : <raison> » / les écarts)
qui remplace la liste « À faire à l'atelier » par : relire le YAML, `pnpm
gestes verifier --avec-modele`, `pnpm gestes activer`. Journal :
`appel_modele` (issue `fabriquer`), `promotion proposée` (existe), `geste
appris` / `proposé` (`objet` = id, `donnees { fichier, jeton: empreinte, ecarts }`).
`--sans-modele` : le dossier seul, comme aujourd'hui. Le coût de la
fabrication compte dans le plafond du mois.

### 6.4 Évals du lot 2

- `evals/gestes.yaml` + `pnpm evals gestes --client <dossier>` (**sans
  modèle**) : pour chaque geste du dossier, chaque test rejoué sur son
  instantané ; seuil 100 %. Le client fictif reçoit, dans une **copie faite
  par le test**, un `heures_par_agent.yaml` et ses trois instantanés écrits à
  la main (lot 1).
- `evals/promotions.yaml` + `pnpm evals promotion --client <dossier>`
  (**avec modèle**) : un cas = une intention et les ids de cas de
  `echappees.yaml` qui la portent ; le lanceur rejoue ces échappées (modèle
  réel), puis fabrique, puis vérifie en code (§ 6.2) ; un cas passe si le
  geste est écrit avec zéro écart. Premier jeu : `heures_par_agent`
  (E-01, E-02, E-03, E-10), `compter_vacations` (E-04 + deux consignes à
  ajouter à `echappees.yaml`, avec leurs chiffres à la main), `agents_sans_carte`
  (E-05 + deux à ajouter). Seuil 2/3 au départ (c'est une mesure, pas une
  promesse : l'écrire dans le fichier). Coût affiché.

### 6.5 Tests du lot 2

- `fabriquer.test.ts` (simulé) : un `proposer_geste` bien formé → geste
  écrit ; un SQL avec `'A-2'` en dur → écart 4 ; un test manquant → écart 2 ;
  un rejeu qui ne contient pas « 16 » → écart 3 ; deux outils → `echec`.
- `promotion.test.ts` : le dossier porte « vérification : 3/3 » ; une
  intention sous le seuil ne fabrique rien ; `--sans-modele` n'appelle pas le
  modèle (le simulé compte ses appels).

---

## 7. Lot 3 — L'atelier, l'activation, l'interface

### 7.1 `pnpm gestes --client <dossier> <commande>`

- `lister` : id, statut, date, nombre de tests, dernier résultat de
  vérification.
- `verifier <id> [--avec-modele]` : `verifierGeste` (sans modèle) ; avec
  `--avec-modele`, en plus une passe de traduction (`evals.ts`) sur les
  tests du geste **et** sur `evals/consignes.yaml` entier, le geste chargé :
  le seuil des 95 % doit tenir (une liste qui s'allonge peut faire baisser la
  traduction : c'est ce qu'on mesure). Journal : `geste appris` / `vérifié`
  (`donnees { jeton, ecarts, traduction?: { taux, atteint, cout_usd } }`).
- `activer <id>` : exige une ligne `vérifié` **sans écart, avec modèle, sur la
  même empreinte**, postérieure à toute modification du fichier ; écrit
  `statut: actif` et `validation { par: <nom lu dans --par>, le, jeton }` dans
  le YAML, et la ligne `geste appris` / `activé` (`donnees { jeton, par }`).
  `--par` obligatoire (pas de valeur par défaut).
- `retirer <id> --motif "<texte>"` : `statut: retire`, ligne `retiré`.

### 7.2 Interface (`interface/src/app.ts`)

`POST /api/gestes` (patron, mêmes gardes que `/api/etat`) : la liste
(`id`, `description`, `statut`, `validation.le`, `tests.length`). Lecture
seule : l'activation reste à l'atelier (P6). L'écran du patron l'affiche
sous « Ce que l'outil a appris ».

### 7.3 Le test d'honnêteté

`metiers/securite-privee/code/src/evals.test.ts` : chaque geste appris du
client fictif (copie du test) a au moins trois tests, de rôles autorisés,
aux échappées distinctes ; ses `contient` ne sont pas vides ; sa description
ne dépasse pas 200 caractères.

### 7.4 Documents

README (la couche Client gagne `gestes/` et `echappees/` ; « la promotion »
dans les trois espaces), `HANDOFF.md`, `PLAN-ESPACES.md` § 8 (renvoi vers ce
plan), le mini-site et la présentation (la page « Parler à l'outil » dit
« codé à l'atelier » : à corriger **avec Lionel**, ce sont ses artefacts).

---

## 8. Mesures avant de déclarer fini

| Quoi | Commande | Seuil | Coût |
|---|---|---|---|
| La traduction avec un geste appris chargé | `pnpm evals traduire --client <copie avec le geste>` | 95 % | ≈ 0,12 $ |
| Le rejeu des gestes appris | `pnpm evals gestes --client <copie>` | 100 % | 0 |
| La fabrication | `pnpm evals promotion --client <copie>` | 2/3 (mesure) | ≈ 0,2 $ |
| L'échappée, inchangée mais relue (lot 0 touche ses lignes) | `pnpm evals echappee` | 80 % sur **trois** passes | ≈ 0,45 $ |

Chaque passe laisse `evals/resultats/<date>-<quoi>.md` ; l'analyse va dans
`evals/erreurs-<date>.md` (catégories observées, lecture, correction ou non),
comme `evals/erreurs-2026-10-08.md`.

---

## 9. Ordre et parallélisme

Lot 0 → lot 1 → lot 2 → lot 3, chacun sur le précédent. Dans un lot : un
sous-agent par fichier de test ; `geste-appris.ts` et `charger.ts` (lot 1)
sont indépendants ; `fabriquer.ts` et `evals/gestes.yaml` (lot 2) aussi.
Après le lot 3 : **une relecture indépendante de tout le chantier** par un
sous-agent en lecture seule (douze défauts trouvés ainsi le 2026-10-08), ses
corrections, puis la fusion dans `main`.

---

## 10. Lot 4 — L'écriture (ne pas exécuter sans une décision de Lionel)

Quand les lots 0 à 3 sont mesurés et que l'échappée tient 80 % sur trois
passes : un geste appris peut porter `modifications: { pour_chaque: <nom de
requête>, reaffecter: { vacation: <colonne>, agent: <colonne> } }`. Son
`executer` rend alors, au lieu d'un texte, la liste des `Modification`
calculée par le SQL ; `conversation.ts` la traite **exactement** comme une
proposition d'échappée (`m.proposition.ouvrir` → `confirmation_attendue` →
réaffectation groupée : contrôles, oui du patron, oui de chaque agent, clé
sur la liste exacte). `ecrit: true`. Le rejeu de ses tests compare les
modifications, pas un texte. Rien d'autre ne change : c'est la raison de P4.

## 11. Ce que Lionel doit relire (choix faits par Claude)

- P6 : l'agence active, le patron voit.
- P8 : 90 jours de conservation des instantanés ; un instantané cité par un
  geste reste tant que le geste existe.
- P11 : les six types de paramètres.
- § 6.4 : un seuil de 2/3 pour la fabrication, annoncé comme une mesure.
- § 10 : l'écriture attend.
