# La mémoire des chantiers — l'index

<!-- PLAN-RONDE.md R10, PLAN-GENERAL.md (décision 2) : une ligne par événement, écrite par le code (moteur/src/chantier/memoire.ts) dans l'arbre de la fusion ou du retrait, poussée avec eux (PLAN-LIVRAISON.md L2). Colonnes : date · métier (jamais le client : tous les clients tirent cet index ; le client reste au registre de l'agence, décidé le 2026-10-20) · sorte (chantier, fusion, refus, retrait, mise à jour) · clé de la mission (`<métier>/<identifiant>` : deux métiers peuvent porter le même identifiant) · titre · issue · coût. Les entrées : `chantiers/<métier>/<date>-<identifiant>.md`. Aucun nom de salarié, aucun identifiant de personne, de conversation ou d'échappée : un test de pnpm check le vérifie. -->

