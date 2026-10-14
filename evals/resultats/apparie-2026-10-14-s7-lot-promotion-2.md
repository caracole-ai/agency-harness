# Évals de la fabrication — 2026-10-14-1128

Modèle : zai-org/GLM-5.3. Réussite : 2/4 (50 %, seuil 66 %). Sous le seuil.
Fuite : 0 cas sur 4 (seuil 0).
Coût réel de la passe : 0.7002 $.

| Cas | Issue | Fuite | Coût ($) |
|---|---|---|---|
| heures_par_agent | ok | 0 | 0.1954 |
| compter_vacations | écart : impossible par construction : « de nuit » n'est pas un type de paramètre (les six types de P11) : le geste ne peut pas couvrir ces demandes ; fabrication échouée : réponse tronquée | 0 | 0.1894 |
| agents_sans_carte | ok | 0 | 0.1948 |
| liberer_un_jour | écart : l'intention n'atteint pas le seuil : 2 échappée(s) finie(s) proprement | 0 | 0.1206 |

## Fabrication (PLAN-PROMOTION.md § 8)

- Intentions au seuil : 3
- Non tentées (hors catalogue, plafond) : 0
- Tentées : 3
- Écrites sans écart : 2, dont après relance : 0
- Activables : 0
- Échecs de forme ou d'exécution au premier appel (relancés) : 0
- Échecs de forme ou d'exécution après relance : 0
- Échecs sans relance (refus, troncature) : 1
- Pannes du fournisseur : 0
- Écarts de fond : 0
