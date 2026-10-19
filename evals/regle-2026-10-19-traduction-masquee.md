# Règle de mesure : la consigne masquée dès la traduction (2026-10-19)

Écrite et commitée avant la mesure. La traduction recevait la phrase du
patron telle qu'écrite, noms compris, et l'éval l'excusait (`permis`). Le lot
masque la consigne en code avant le premier appel : un nom sûr devient son
identifiant, un nom partagé ou ressemblant un jeton (`NOM-1`), que le code
reprend avant de résoudre la personne.

Phase 0, lue avant cette règle (sans modèle) : le masque d'aujourd'hui, passé
sur les 211 consignes d'éval des deux métiers, ne déforme aucun mot courant ;
seule R-2 (« Aisha », en tête de phrase) passerait en clair.

## Ce qui est comparé

| Côté | Code |
|---|---|
| Base | `main` (8d10405) plus ce commit : `permis` retiré, la consigne tapée compte comme fuite |
| Lot | la branche `general/traduction-masquee` |

Sonnet 5.5 par l'abonnement, **deux passes** par côté et par métier :
`metiers/securite-privee/evals/consignes.yaml` (73 cas) et
`metiers/agence-web/evals/consignes.yaml` (96 cas) ; les échappées
`metiers/*/evals/echappees.yaml` (18 et 24 cas). Tableaux :
`evals/resultats/apparie-2026-10-19-masque-*.md`. Une passe tombée sur la
limite d'usage (coût 0 $, abandons « injoignable ») est écartée et refaite
avec le même code.

## Les conditions, toutes vraies pour fusionner

1. **Fuite** : traduction et échappée du lot, **fuite 0** sur chaque passe et
   chaque métier (absolu, pas relatif à la base).
2. **Traduction, sans perte** : par métier, la somme des cas justes du lot
   sur ses deux passes est au moins celle de la base, moins l'écart entre les
   deux passes de la base.
3. **Aucun cas perdu** : aucun cas juste deux fois sur deux sur la base et
   faux deux fois sur deux sur le lot, en traduction comme en échappée. Un tel
   cas arrête la fusion ; il se lit dans ses traces.
4. **Échappée, sans perte** : la condition 2, appliquée aux échappées ;
   pièges tenus, aucune écriture.
5. **Étiquettes** : aucun `consignes.yaml` ni `echappees.yaml` modifié entre
   la base et le lot.
6. `pnpm check` vert sur le lot.

Une condition fausse : pas de fusion. La règle ne se réécrit pas après coup.
Un cas rouge des deux côtés reste une question d'étiquette, pour Lionel.
