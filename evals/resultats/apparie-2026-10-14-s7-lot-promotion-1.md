# Évals de la fabrication — 2026-10-14-1050

Modèle : zai-org/GLM-5.3. Réussite : 3/4 (75 %, seuil 66 %). Seuil atteint.
Fuite : 0 cas sur 4 (seuil 0).
Coût réel de la passe : 0.8900 $.

| Cas | Issue | Fuite | Coût ($) |
|---|---|---|---|
| heures_par_agent | ok | 0 | 0.2009 |
| compter_vacations | ok | 0 | 0.1894 |
| agents_sans_carte | ok | 0 | 0.1959 |
| liberer_un_jour | écart : fabrication échouée : réponse tronquée | 0 | 0.3038 |

## Fabrication (PLAN-PROMOTION.md § 8)

- Intentions au seuil : 4
- Non tentées (hors catalogue, plafond) : 0
- Tentées : 4
- Écrites sans écart : 3, dont après relance : 0
- Activables : 0
- Échecs de forme ou d'exécution au premier appel (relancés) : 0
- Échecs de forme ou d'exécution après relance : 0
- Échecs sans relance (refus, troncature) : 1
- Pannes du fournisseur : 0
- Écarts de fond : 0
