# Plan — le patron choisit un autre remplaçant dans une proposition (S9)

Écrit le 2026-10-14 après la demande de Lionel : « quand plusieurs agents sont
disponibles on peut les proposer au patron plutôt que choisir pour lui,
aussi ». Écrit pour être exécuté par Claude Opus 5.5, sans avoir à décider ;
quand le plan se tait, la finalité tranche (le moteur ne sait rien d'aucun
métier ; le métier déclare ; le client règle ; la sécurité ne régresse pas).

Ce qu'il ne touche pas : les interdits, les contrôles `I01`…`I20`, la clé
d'accord, le schéma du journal (des champs s'ajoutent dans `donnees`), les
étiquettes des évals existantes, l'agence web (elle ne propose rien).

**Critère de succès** (observable), sur une copie de `exemples/client-fictif` :
le patron reçoit une proposition de réaffectation à deux vacations (« libère
Karim mardi ») ; il répond « oui, mais Aïcha pour V-03 » ; l'outil rend une
nouvelle proposition où seule V-03 change, passée par les mêmes contrôles,
« Valider ? (oui / non) » ; au « oui », Aïcha et l'autre agent sont sollicités
comme aujourd'hui ; la promotion ne compte pas cette échappée comme une
réponse à reproduire, et son dossier dit « 1 proposition corrigée par le
patron ».

## 1. Ce qui existe déjà

- **Une absence** (`gerer_absence`, demande `D-…`) : l'outil recommande un
  remplaçant, liste les autres possibles avec leurs raisons, et
  `valider_remplacement` laisse le patron en prendre un autre. Rien à faire.
- **Une réaffectation** (`R-…`, proposée par l'échappée ou par un geste
  appris qui écrit) : le texte, rendu par le code (`decrireProposition`,
  `metiers/securite-privee/code/src/conversation.ts`), liste déjà « autres
  possibles » par vacation. Mais le patron ne peut que dire oui ou non à
  l'ensemble (`validerReaffectation`, `reaffectation.ts`) ; pour changer un
  agent, il refuse et reformule.
- **Le moteur sait déjà rouvrir une proposition** : une action du métier
  marquée `propose` qui rend des `modifications` passe par
  `ouvrirProposition` (`moteur/src/conversation/conversation.ts`) : contrôles
  du métier (`PropositionMetier.ouvrir` lève si une règle s'y oppose, le refus
  au journal), nouvelle empreinte, nouveau « oui ». **Aucun changement du
  moteur de conversation n'est nécessaire.**
- **L'apprentissage lit la proposition de l'échappée, pas ce qui a été
  validé.** `relire` (`operation-reaffecter.ts`) rend les modifications de la
  ligne `echappee` de la conversation ; `suiteDe` (`moteur/src/promotion/
  promotion.ts`) la dit « validée » dès qu'un `R-…` de la conversation l'est.
  Aujourd'hui sans conséquence (on ne peut pas changer un agent) ; avec ce
  plan, la promotion apprendrait le choix du modèle que le patron a corrigé.

## 2. Choix faits faute de consigne

- **C1. On garde une recommandation.** Une proposition reste « un agent par
  vacation, les autres listés » : le cas courant se valide en un mot, et la
  recommandation suit les préférences déclarées par le client et le
  départage du métier (S8). Ne rien recommander ferait choisir le patron à
  chaque fois, et rendrait la promotion impossible (rien de stable à
  reproduire).
- **C2. Changer un agent est un geste du métier, `changer_remplacant`**
  (patron seul, `propose: true`) : paramètres `vacation`, `agent` (une
  personne nommée, résolue comme les autres), `demande` (`R-…`, facultatif).
  Sans `demande` : la dernière réaffectation proposée de ce patron qui
  contient cette vacation ; deux ou plus : refus, « laquelle (R-…) ? ». Il
  rend la proposition avec cette seule vacation changée ; le moteur l'ouvre
  (contrôles, empreinte, « oui »). L'ancienne passe au statut `remplacée`
  (nouveau dans `STATUT_R`, avec le `R-…` qui la remplace) et ne peut plus être
  validée. Le nouvel agent peut ne pas être dans « autres possibles » : les
  contrôles décident, comme pour tout agent.
- **C3. Une proposition corrigée par le patron n'apprend rien, et se
  compte.** La promotion ne retient une échappée qui propose que si ce qui a
  été validé est exactement ce qu'elle a proposé (`operation.egal`, objet par
  objet). Sinon elle n'est pas « finie proprement », et le dossier de
  promotion de l'intention dit combien de propositions le patron a corrigées.
  Raison : apprendre ses corrections demanderait une règle que les
  préférences déclarées ne disent pas (c'est l'échec de `liberer_un_jour`
  en S8) ; des corrections qui reviennent disent plutôt que les préférences
  du client sont à revoir, ce qui est à l'atelier, pas au modèle.
- **C4. D'abord en mots, ensuite des boutons.** Lot 2 : le patron le dit
  dans la conversation (« oui mais Aïcha pour V-03 », « mets plutôt Mehdi sur
  mardi »), la traduction choisit `changer_remplacant`. Lot 3 : dans
  l'interface, chaque autre possible d'une proposition en attente devient un
  bouton qui appelle le geste directement, sans modèle.

## 3. Les lots

**Lot 1 — l'apprentissage ne lit que ce qui a été validé tel quel.**
- `relire` (métier) rend les modifications du `R-…` validé de la
  conversation (son contenu à la clé), plus celles de la ligne `echappee`.
- `lireEchappee` (moteur, promotion) : une échappée qui propose n'est propre
  que si `relire` (validé) et ses `modifications` (proposées) sont égales par
  `operation.egal`, objet pour objet ; sinon elle est comptée « corrigée »,
  et le dossier le dit. Le moteur ne lit que l'opération déclarée : rien du
  métier.
- Tests : une conversation dont le `R-…` validé diffère de l'échappée ne
  compte pas, et se compte ; une conversation inchangée compte comme avant.
  `pnpm evals gestes` (0 $) inchangé.

**Lot 2 — le geste `changer_remplacant`.**
- `actions.ts` (le geste, sa description avec exemples entre parenthèses),
  `reaffectation.ts` (trouver la proposition, la changer, le statut
  `remplacée`), `conversation.ts` (l'intention n'en est pas une : c'est un
  geste codé).
- Tests : la proposition rouverte ne diffère que par la vacation ; une règle
  violée refuse et journalise ; un agent (rôle) ne peut pas l'appeler ; une
  vacation absente de la proposition, un `R-…` déjà validé, trop tard :
  refus ; l'ancienne ne se valide plus ; au « oui », les sollicitations
  partent comme aujourd'hui.
- Cas d'éval neufs dans `metiers/securite-privee/evals/consignes.yaml`
  (traduction, 4 à 6 : « oui mais Aïcha pour V-03 », « mets plutôt Mehdi sur
  la vacation de mardi », un agent qui tente de le dire, une vacation qui
  n'est pas dans la proposition). Aucune étiquette existante ne change.

**Lot 3 — l'interface.** Sur une proposition en attente, chaque autre
possible est un bouton (« Prendre Aïcha pour V-03 ») qui appelle
`changer_remplacant` sans modèle. Vérification visuelle (playwright) après
le changement.

**Lot 4 — la mesure, sa règle écrite et commitée avant elle.** Sonnet 5.5
par l'abonnement, base = `main`, lot = la branche, arbres détachés.
- Au modèle simulé : l'échappée (sécurité 18, agence 24) identique octet
  pour octet ; la traduction ne diffère que par la ligne du geste neuf.
- Traduction : deux passes de chaque côté sur les 60 cas existants (lot ≥
  base − 1, fuite 0) ; les cas neufs ≥ 80 % sur le lot.
- `liberer_un_jour` : trois passes, au moins une à zéro écart (non-régression
  du lot 1).
- `pnpm evals gestes` 6/6 ; `pnpm check` vert.

## 4. Hors périmètre

- Proposer à l'atelier de changer l'ordre des préférences quand les
  corrections reviennent (la ronde pourrait en faire une mission) : après.
- Aligner le départage de `gerer_absence` (par nom) sur celui des
  propositions (par numéro) : ouvert, à Lionel.
- L'agence web : elle ne propose rien.

## 5. Coût

Sur l'abonnement, aucun débit ; en équivalent API estimé : traduction
≈ 1,4 $ la passe (60 cas), quatre passes ≈ 5,6 $ ; `liberer_un_jour`
≈ 1,1 $ ; ≈ 7 $ en tout. Une session pour les lots 1, 2 et 4 ; le lot 3
peut suivre.
