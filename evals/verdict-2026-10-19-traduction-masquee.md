# Verdict : la consigne masquée dès la traduction (2026-10-19, soir)

La règle : `evals/regle-2026-10-19-traduction-masquee.md`, commitée avant la
mesure (8eb0cb5). Base : `main` (8d10405) avec `permis` retiré. Lot :
`general/traduction-masquee` (a7d842e). Sonnet 5.5 par l'abonnement, deux
passes par côté, par métier et par éval, le même soir (20 h 39 – 23 h 00),
aucune passe tombée sur la limite d'usage. Tableaux :
`evals/resultats/apparie-2026-10-19-masque-*.md`.

| | Base | Lot |
|---|---|---|
| Traduction, sécurité privée, justes | 73, 73 | 73, 73 |
| Traduction, sécurité privée, cas en fuite | 25, 25 | **0, 0** |
| Traduction, agence web, justes | 91, 89 | 91, 90 |
| Traduction, agence web, cas en fuite | 3, 3 (« Julie », P29) | **0, 0** |
| Échappée, sécurité privée, justes | 18, 18 | 18, 18 |
| Échappée, agence web, justes | 24, 22 | 24, 24 |
| Échappée, fuite | 0 | 0 |
| Cas perdus (2/2 → 0/2) | | aucun |

## Les conditions

1. Fuite : **vraie** (0 sur les huit passes du lot).
2. Traduction, sans perte : **vraie** (sécurité 146 ≥ 146 − 0 ; agence web
   181 ≥ 180 − 2).
3. Aucun cas perdu : **vraie**.
4. Échappée, sans perte : **vraie** (sécurité 36 ≥ 36 ; agence web 48 ≥
   46 − 2) ; pièges tenus (E-13, E-14 stricts justes).
5. Étiquettes : **vraie** (`git diff 8d10405 a7d842e -- 'metiers/*/evals/*.yaml'` vide).
6. `pnpm check` : **vraie** (moteur 609, interface 43, agence web 260,
   sécurité 137).

**Fusion.**

## Ce que la mesure ne dit pas

- Rouges des deux côtés, sans nom dans la consigne (donc hors du lot) :
  P14-1 à 3 et P22-3 (le modèle choisit `etat_projet`, l'étiquette attend une
  demande nouvelle), P22-2 (« je ne sais pas » : ni projet ni client nommé).
  Question d'étiquette, pour Lionel.
- La fuite ne compte que les noms que les données connaissent : un surnom, un
  nom absent des données, une faute tout en minuscules partiraient, et la
  mesure ne les verrait pas.
- Vu à l'écran (interface, vrai modèle) : « Aïcha ne vient pas demain » part
  « A-11 ne vient pas demain », la carte dit « Remplacer Aïcha Traoré » ;
  « Aisha ne vient pas demain » part « NOM-1 ne vient pas demain », l'outil
  demande « Vous parlez de « Aïcha Traoré » ? ».
