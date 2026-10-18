# Verdict : la phrase à trous (2026-10-18)

La règle : `evals/regle-2026-10-18-phrase-a-trous.md`, commitée avant la
mesure (628a017). Base `main` 7032109, lot `echappee/phrase-a-trous` 4350cd2,
Sonnet 5.5 par l'abonnement, deux passes par métier et par côté, le même
après-midi. Les huit tableaux : `evals/resultats/apparie-2026-10-18-phrase-*.md`
(les quatre de la base reconstruits depuis leurs traces, l'original effacé
par erreur avant copie ; mêmes scores que lus avant l'effacement).

| Métier | Base, passes 1 et 2 | Lot, passes 1 et 2 |
|---|---|---|
| Sécurité privée, justes | 18/18, 18/18 | 18/18, 18/18 |
| Agence web, justes | 16/24, 17/24 (16,5 en moyenne) | 16/24, 15/24 (15,5 en moyenne) |
| Résumés retirés, les deux métiers | 0 + 0 + 2 + 2 = 4 | 0 + 0 + 1 + 0 = 1 |
| Fuite | 0 partout | 0 partout |

## Les conditions

1. **Juste : vraie, à la limite.** Lue par passe, comme le bruit qu'elle
   cite (16 contre 17 entre deux passes de la base) : la sécurité est égale ;
   l'agence web perd un cas en moyenne (15,5 contre 16,5), au plus ce que la
   règle permet. Additionnées sur les deux passes, elles donneraient 31 contre
   33 : la règle ne dit pas « additionnées », et elle ne se réécrit pas après
   coup ; la lecture retenue est notée ici pour qu'on la conteste.
2. **Fabrication : vraie.** 1 résumé retiré contre 4.
3. **Fuite : vraie.** 0 de chaque côté.
4. **Sécurité : vraie.** L'échappée n'écrit rien ; les pièges (`ER-*`, et
   les deux de la sécurité) passent de chaque côté.
5. **Lisible : vraie.** Aucune des réponses du lot ne montre un trou brut ni
   un nombre mal formé (toutes les traces lues en code, les écarts lus à la
   main).

## Les écarts du lot, lus dans leurs traces

- Les mêmes cas que la base : E-04, E-08, E-09, E-12, E-18, E-20 (étiquettes
  qui demandent plus que la question, connues), E-28.
- **E-16**, nouveau : la requête du modèle filtre les tickets « à qualifier »
  autrement que l'étiquette, TK-1005 n'en sort pas ; les sept trous de sa
  phrase sont remplis juste. Classe connue E2 (notion du métier), pas les
  trous.
- **E-28, passe 1** : retiré parce que la phrase cite « I-04 » (le code d'une
  règle) hors d'un trou. Faux retrait probable : les codes des règles ne
  sont pas des données ; à rendre citables, au prochain lot.
- **Abandons « l'outil de requête n'est pas disponible »** (E-04, E-08, E-28,
  EP-18), des deux côtés : la trace d'EP-18 dit « No such tool available ».
  Un défaut de l'adaptateur de l'abonnement, antérieur au lot, à chercher.

Fusion.
