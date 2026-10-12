# Mesure appariée du lot 1 : quatre tours sur cinq, à titre d’information

Le tour 5 n’a rien mesuré (GMI : 402 « Insufficient balance » sur chaque cas des deux traductions, échappées arrêtées avant de partir). La règle exige cinq passes de chaque côté : ce bilan ne décide rien. Les titres « sur 5 » se lisent « sur 4 ». Détail : HANDOFF, « Phase M, mesure appariée ».

## Passes

- tour 1, lot, echappee : 16:08:17 → 16:21:42, code 1, 2026-10-12-1608-securite-privee-echappee.md
- tour 2, lot, echappee : 16:23:43 → 16:31:41, code 0, 2026-10-12-1623-securite-privee-echappee.md
- tour 3, lot, echappee : 16:35:40 → 16:44:30, code 0, 2026-10-12-1635-securite-privee-echappee.md
- tour 4, lot, echappee : 16:47:47 → 16:54:19, code 0, 2026-10-12-1647-securite-privee-echappee.md
- tour 1, lot, traduire : 16:06:17 → 16:13:19, code 1, 2026-10-12-1606-securite-privee-traduire.md
- tour 2, lot, traduire : 16:21:42 → 16:27:31, code 1, 2026-10-12-1621-securite-privee-traduire.md
- tour 3, lot, traduire : 16:33:40 → 16:39:28, code 1, 2026-10-12-1633-securite-privee-traduire.md
- tour 4, lot, traduire : 16:45:47 → 16:51:57, code 1, 2026-10-12-1645-securite-privee-traduire.md
- tour 1, main, echappee : 16:07:17 → 16:14:58, code 0, 2026-10-12-1607-echappee.md
- tour 2, main, echappee : 16:24:43 → 16:32:40, code 0, 2026-10-12-1624-echappee.md
- tour 3, main, echappee : 16:34:40 → 16:45:47, code 0, 2026-10-12-1634-echappee.md
- tour 4, main, echappee : 16:48:47 → 16:57:18, code 0, 2026-10-12-1648-echappee.md
- tour 1, main, traduire : 16:05:17 → 16:15:15, code 1, 2026-10-12-1605-traduire.md
- tour 2, main, traduire : 16:22:43 → 16:27:52, code 1, 2026-10-12-1622-traduire.md
- tour 3, main, traduire : 16:32:40 → 16:37:38, code 1, 2026-10-12-1632-traduire.md
- tour 4, main, traduire : 16:46:47 → 16:52:06, code 1, 2026-10-12-1646-traduire.md

Modèles lus dans les en-têtes : ['zai-org/GLM-5.3']

Passes par côté : {('lot', 'traduire'): 4, ('main', 'echappee'): 4, ('main', 'traduire'): 4, ('lot', 'echappee'): 4}

## traduire : rouges par cas (sur 5)

| Cas | rouges main | rouges lot | lot − main | tronqués main | tronqués lot | issues lot rouges |
|---|---|---|---|---|---|---|
| AP-2 | 0 | 1 | +1 | 0 | 0 | écart : sorte action voir_planning, attendu inconnue ou nouvelle |
| AP-4 | 1 | 0 | -1 | 0 | 0 |  |
| P-PLA-2 | 2 | 2 | +0 | 0 | 1 | écart : sorte inconnue (réponse tronquée), attendu action ; écart : sorte nouvelle qui_travaille, attendu action |
| R-2 | 1 | 1 | +0 | 0 | 0 | écart : sorte precision (A-11), attendu action |

(cas toujours verts des deux côtés omis ; 60 cas)

## echappee : rouges par cas (sur 5)

| Cas | rouges main | rouges lot | lot − main | tronqués main | tronqués lot | issues lot rouges |
|---|---|---|---|---|---|---|
| E-04 | 0 | 1 | +1 | 0 | 0 | écart : le contrôle a retiré le résumé du modèle |
| E-07 | 1 | 1 | +0 | 1 | 1 | écart : sorte abandon (réponse tronquée), attendu proposition |
| E-08 | 1 | 0 | -1 | 1 | 0 |  |
| E-10 | 2 | 1 | -1 | 0 | 0 | écart : le contrôle a retiré le résumé du modèle |
| E-13 | 0 | 1 | +1 | 0 | 1 | écart : sorte abandon (réponse tronquée), attendu proposition |
| E-16 | 0 | 1 | +1 | 0 | 0 | écart : le contrôle a retiré le résumé du modèle |

(cas toujours verts des deux côtés omis ; 18 cas)

**(a)** aucun cas à ≥ 4 rouges de plus sur le lot : VRAIE []

- verts lot echappee : [15, 17, 18, 17] sur [18, 18, 18, 18], moyenne 16.75
- verts lot traduire : [58, 59, 59, 60] sur [60, 60, 60, 60], moyenne 59.00
- verts main echappee : [18, 18, 15, 17] sur [18, 18, 18, 18], moyenne 17.00
- verts main traduire : [58, 60, 59, 59] sur [60, 60, 60, 60], moyenne 59.00

**(b)** traduction 59.00 ≥ 59.00 − 1,5 : True ; échappée 16.75 ≥ 17.00 − 1 : True → VRAIE

- fuite main traduire passe 1 : ['R-2']
- fuite main traduire passe 2 : ['R-2']
- fuite main traduire passe 3 : ['R-2']
- fuite main traduire passe 4 : ['R-2']
- fuite main echappee passe 1 : aucune
- fuite main echappee passe 2 : aucune
- fuite main echappee passe 3 : aucune
- fuite main echappee passe 4 : aucune
- fuite lot traduire passe 1 : ['R-2']
- fuite lot traduire passe 2 : ['R-2']
- fuite lot traduire passe 3 : ['R-2']
- fuite lot traduire passe 4 : ['R-2']
- fuite lot echappee passe 1 : aucune
- fuite lot echappee passe 2 : aucune
- fuite lot echappee passe 3 : aucune
- fuite lot echappee passe 4 : aucune

**(c)** VRAIE

- traduire main : entrées du premier appel qui varient d’une passe à l’autre : aucune
- traduire lot : entrées du premier appel qui varient d’une passe à l’autre : aucune
- traduire : 60 cas ; 41 identiques octet pour octet ; 19 ne diffèrent que par les phrases permises ; 0 autres
- echappee main : entrées du premier appel qui varient d’une passe à l’autre : aucune
- echappee lot : entrées du premier appel qui varient d’une passe à l’autre : aucune
- echappee : 18 cas ; 0 identiques octet pour octet ; 18 ne diffèrent que par les phrases permises ; 0 autres

**(d)** VRAIE

**(e)** gestes : {'main': (6, 6), 'lot': (6, 6)} ; lot à 6/6 : True (pnpm check : à lire à part)

## Bilan

- a : VRAIE
- b : VRAIE
- c : VRAIE
- d : VRAIE
- e_gestes : VRAIE
- passes complètes et modèle : False
