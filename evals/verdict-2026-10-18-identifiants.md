# Verdict : la phrase à trous, sans perte (2026-10-18, soir)

La règle : `evals/regle-2026-10-18-identifiants.md`, commitée avant la mesure
(500e7aa). Base : `main` d'avant la phrase à trous (3088000) avec
l'adaptateur corrigé (577ac5c). Lot : `echappee/identifiants` (756d3b7, puis
9df013c après la première lecture). Sonnet 5.5 par l'abonnement, trois passes
valides par côté et par métier. Tableaux : `evals/resultats/apparie-2026-10-18-ident-*.md`.

Trois passes du lot se sont effondrées à 19 h 52 sur la limite d'usage de
l'abonnement (« le modèle est injoignable », coût 0 $, 18 abandons sur 18) ;
écartées, refaites à 21 h avec le même code.

| | Base | Lot |
|---|---|---|
| Sécurité privée, justes | 54/54 | 54/54 |
| Agence web, justes | 47/72 (16, 15, 16) | 55/72 (18, 18, 19) |
| Réponses retirées | 8 | 1 |
| Fuite | 0 | 0 |
| Pièges | tous tenus | tous tenus |
| Cas perdus (base ≥ 2/3, lot ≤ 1/3) | | **E-20** |
| Cas gagnés | | E-09, E-28, E-30, EP-16 |

## Les conditions

1. Juste, sans perte : **vraie** (sécurité 54 = 54 ; agence web 55 > 47).
2. Aucun cas perdu : **fausse**, E-20.
3. Fabrication : **vraie** (1 retrait contre 8).
4. Fuite : **vraie**.
5. Sécurité : **vraie**.
6. Lisible : **vraie** (aucun trou brut montré).

**Pas de fusion.**

## E-20

« Quelle est la marge de tous les projets en cours, et lesquels sont sous
20 % ? » L'étiquette attend les marges en euros (12 357,86 €…). Le lot répond
en pourcentage, juste, sur ses trois passes ; la base donnait euros et
pourcentage deux fois sur trois. La phrase « chaque grandeur demandée, dans
son unité » (9df013c) n'a rien changé. E-20 est déjà dans la liste des
étiquettes à relire par Lionel (HANDOFF, « Pour Lionel »). La question lui
revient : si la marge en pourcentage répond, l'étiquette change et la branche
se fusionne telle quelle ; si les euros sont dus, il faut une correction plus
forte de l'échappée, et une mesure de plus.
