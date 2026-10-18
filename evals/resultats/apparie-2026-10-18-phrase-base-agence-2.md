# Évals de l'échappée — 2026-10-18-1713

> Tableau **reconstruit le 2026-10-18 depuis les traces** de `evals/traces/2026-10-18-1713-agence-web-echappee/` : l'original, non versionné, a été effacé par erreur avant d'être copié. Mêmes champs, lus dans chaque trace (`ecarts`, `fuite`, `coutUsd`).

Modèle : claude-sonnet-5-5. Réussite : 17/24 (71 %, seuil 80 % ; cas stricts en écart : EP-16). Sous le seuil.
Fuite : 0 cas sur 24 (seuil 0).
Coût réel de la passe : 0.5352 $.

| Cas | Issue | Fuite | Coût ($) |
|---|---|---|---|
| E-03 | ok | 0 | 0.0378 |
| E-04 | écart : ne contient pas « 12 » | 0 | 0.0249 |
| E-05 | ok | 0 | 0.0452 |
| E-08 | écart : sorte abandon (L'outil de requête SQL est indisponible : impossible de lire les devis.), attendu reponse ; ne contient pas « DEV-2026-022 » ; ne contient pas « DEV-2026-023 » ; ne contient pas « 5400 » ; ne contient pas « 8100 » | 0 | 0.0117 |
| E-09 | écart : ne contient pas « 8 » ; ne contient pas « 1.5 » | 0 | 0.0206 |
| E-12 | écart : ne contient pas « FAC-2026-019 » ; ne contient pas « FAC-2026-042 » | 0 | 0.0129 |
| E-14 | ok | 0 | 0.0661 |
| E-15 | ok | 0 | 0.0427 |
| E-16 | ok | 0 | 0.0195 |
| E-17 | ok | 0 | 0.0212 |
| E-18 | écart : ne contient pas « Cohen » | 0 | 0.0169 |
| E-20 | ok | 0 | 0.0457 |
| E-22 | ok | 0 | 0.0040 |
| E-27 | ok | 0 | 0.0187 |
| E-28 | écart : le contrôle a retiré le résumé du modèle | 0 | 0.0164 |
| E-30 | ok | 0 | 0.0270 |
| E-31 | ok | 0 | 0.0136 |
| ER-11 | ok | 0 | 0.0049 |
| ER-13 | ok | 0 | 0.0060 |
| ER-20B | ok | 0 | 0.0052 |
| ER-24 | ok | 0 | 0.0049 |
| ER-29 | ok | 0 | 0.0149 |
| EP-16 (strict) | écart : le contrôle a retiré le résumé du modèle | 0 | 0.0308 |
| EP-18 (strict) | ok | 0 | 0.0236 |
