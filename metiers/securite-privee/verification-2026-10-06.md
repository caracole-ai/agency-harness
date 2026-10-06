<!-- Vérification à la source du 2026-10-06 (pages Légifrance affichées dans Chrome
en mode visible, piloté par playwright-cli, sans résumé automatique ; la recherche
web n'a servi qu'à trouver l'URL de la section). Instantané daté : ne pas corriger
en place. Complète verification-2026-10-05.md. -->

# Vérification à la source — sécurité privée, 2026-10-06

But : relire la lecture de référence d'I-05 (repos quotidien) avant de montrer
un refus de repos en démonstration. Versions en vigueur au 06/10/2026.

**1. C. trav. L3131-1 — CONFIRMÉ**

- En vigueur depuis le 10/08/2016 (loi 2016-1088, art. 8 (V)).
  > Tout salarié bénéficie d'un repos quotidien d'une durée minimale de onze heures consécutives, sauf dans les cas prévus aux articles L. 3131-2 et L. 3131-3 ou en cas d'urgence, dans des conditions déterminées par décret.
- Le paramètre `repos_min_h: 11` de la lecture `loi` est exact.

**2. L3131-2 et L3131-3 — À VERSER AU DOSSIER DU JURISTE**

- L3131-2 (en vigueur depuis le 10/08/2016) :
  > Une convention ou un accord d'entreprise ou d'établissement ou, à défaut, une convention ou un accord de branche peut déroger à la durée minimale de repos quotidien prévue à l'article L. 3131-1, dans des conditions déterminées par décret, notamment pour des activités caractérisées par la nécessité d'assurer une continuité du service ou par des périodes d'intervention fractionnées.
- L3131-3 : à défaut d'accord, dérogation en cas de « surcroît exceptionnel d'activité », par décret.

**3. D3131-1 à D3131-7 (décret 2016-1553, en vigueur depuis le 01/01/2017)**

- D3131-4, 2° : la dérogation par accord (L3131-2) est ouverte aux « Activités de garde, de surveillance et de permanence caractérisées par la nécessité d'assurer la protection des biens et des personnes ».
- D3131-6 : « Un accord collectif de travail ne peut avoir pour effet de réduire la durée du repos quotidien en deçà de neuf heures. »
- D3131-2 : une dérogation suppose « l'attribution de périodes au moins équivalentes de repos », ou, à défaut, une contrepartie équivalente prévue par accord collectif.
- D3131-1 : dérogation de l'employeur seul pour travaux urgents (sauvetage, accident imminent, réparation), en informant l'inspecteur du travail.

## Ce que ça change

- **Le refus de la démo tient** (8 h de repos après une nuit) : il est sous les
  11 h de L3131-1, sous les 10 h de la CCN 7.01, et sous le plancher absolu
  de 9 h (D3131-6). Aucune lecture ne le sauve.
- **La loi elle-même renvoie à la branche.** La sécurité privée est
  nommément une activité où un accord de branche peut descendre sous 11 h
  (D3131-4, 2°). Les 10 h de la CCN 7.01 au passage de nuit à jour peuvent
  donc être une dérogation valide, et non une lecture concurrente de la loi.
  Si c'est le cas, T-07d (10 h 30 au passage de nuit à jour → refus) rend un
  refus que le droit ne fonde pas. Question posée au juriste
  (`REFLEXIONS.md`) ; le moteur ne change pas avant sa réponse.
- Non relus ce jour : L3121-18, L3121-19, et l'article 7.01 de la CCN
  lui-même (sa contrepartie en repos, au sens de D3131-2).
