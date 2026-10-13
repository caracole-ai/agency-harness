# Mesure appariée avant la phase E (S6)

## Passes

- tour 1, lot, echappee : 19:21:18 → 19:29:12, code 0, 2026-10-13-1921-securite-privee-echappee.md
- tour 2, lot, echappee : 19:31:12 → 19:37:30, code 0, 2026-10-13-1931-securite-privee-echappee.md
- tour 3, lot, echappee : 19:45:22 → 19:55:53, code 1, 2026-10-13-1945-securite-privee-echappee.md
- tour 4, lot, echappee : 19:57:53 → 20:06:22, code 1, 2026-10-13-1957-securite-privee-echappee.md
- tour 5, lot, echappee : 20:09:22 → 20:21:12, code 1, 2026-10-13-2009-securite-privee-echappee.md
- tour 1, lot, traduire : 19:19:18 → 19:24:28, code 1, 2026-10-13-1919-securite-privee-traduire.md
- tour 2, lot, traduire : 19:29:12 → 19:34:38, code 1, 2026-10-13-1929-securite-privee-traduire.md
- tour 3, lot, traduire : 19:43:22 → 19:48:19, code 1, 2026-10-13-1943-securite-privee-traduire.md
- tour 4, lot, traduire : 19:55:53 → 20:03:35, code 1, 2026-10-13-1955-securite-privee-traduire.md
- tour 5, lot, traduire : 20:07:22 → 20:12:52, code 1, 2026-10-13-2007-securite-privee-traduire.md
- tour 1, main, echappee : 19:20:18 → 19:28:55, code 0, 2026-10-13-1920-securite-privee-echappee.md
- tour 2, main, echappee : 19:32:12 → 19:42:22, code 1, 2026-10-13-1932-securite-privee-echappee.md
- tour 3, main, echappee : 19:44:22 → 19:51:36, code 0, 2026-10-13-1944-securite-privee-echappee.md
- tour 4, main, echappee : 19:58:53 → 20:06:03, code 0, 2026-10-13-1958-securite-privee-echappee.md
- tour 5, main, echappee : 20:08:22 → 20:14:51, code 0, 2026-10-13-2008-securite-privee-echappee.md
- tour 1, main, traduire : 19:18:18 → 19:24:16, code 1, 2026-10-13-1918-securite-privee-traduire.md
- tour 2, main, traduire : 19:30:12 → 19:34:56, code 1, 2026-10-13-1930-securite-privee-traduire.md
- tour 3, main, traduire : 19:42:22 → 19:46:25, code 1, 2026-10-13-1942-securite-privee-traduire.md
- tour 4, main, traduire : 19:56:53 → 20:02:12, code 1, 2026-10-13-1956-securite-privee-traduire.md
- tour 5, main, traduire : 20:06:22 → 20:11:04, code 1, 2026-10-13-2006-securite-privee-traduire.md

Modèles lus dans les en-têtes : ['zai-org/GLM-5.3']

Passes par côté : {('main', 'traduire'): 5, ('lot', 'traduire'): 5, ('main', 'echappee'): 5, ('lot', 'echappee'): 5}

## traduire : rouges par cas (sur 5)

| Cas | rouges main | rouges lot | lot − main | tronqués main | tronqués lot | issues lot rouges |
|---|---|---|---|---|---|---|
| AMB-1 | 1 | 2 | +1 | 0 | 0 | écart : sorte action lancer_veille, attendu inconnue |
| AP-4 | 2 | 0 | -2 | 0 | 0 |  |
| N-4 | 1 | 0 | -1 | 1 | 0 |  |
| P-PLA-2 | 3 | 2 | -1 | 0 | 0 | écart : sorte nouvelle qui_travaille, attendu action |
| R-2 | 1 | 2 | +1 | 0 | 0 | écart : sorte precision (A-11), attendu action |

(cas toujours verts des deux côtés omis ; 60 cas)

## echappee : rouges par cas (sur 5)

| Cas | rouges main | rouges lot | lot − main | tronqués main | tronqués lot | issues lot rouges |
|---|---|---|---|---|---|---|
| E-04 | 1 | 0 | -1 | 0 | 0 |  |
| E-07 | 0 | 2 | +2 | 0 | 2 | écart : sorte abandon (réponse tronquée), attendu proposition |
| E-08 | 1 | 0 | -1 | 1 | 0 |  |
| E-13 | 0 | 1 | +1 | 0 | 1 | écart : sorte abandon (réponse tronquée), attendu proposition |
| E-14 | 1 | 2 | +1 | 0 | 0 | écart : le contrôle a retiré le résumé du modèle |

(cas toujours verts des deux côtés omis ; 18 cas)

**(a)** aucun cas à ≥ 4 rouges de plus sur le lot : VRAIE []

- verts lot echappee : [18, 18, 17, 16, 16] sur [18, 18, 18, 18, 18], moyenne 17.00
- verts lot traduire : [59, 60, 59, 57, 59] sur [60, 60, 60, 60, 60], moyenne 58.80
- verts main echappee : [17, 16, 18, 18, 18] sur [18, 18, 18, 18, 18], moyenne 17.40
- verts main traduire : [57, 59, 60, 59, 57] sur [60, 60, 60, 60, 60], moyenne 58.40

**(b)** traduction 58.80 ≥ 58.40 − 1,5 : True ; échappée 17.00 ≥ 17.40 − 1 : True → VRAIE

- fuite main traduire passe 1 : ['R-2']
- fuite main traduire passe 2 : ['R-2']
- fuite main traduire passe 3 : ['R-2']
- fuite main traduire passe 4 : ['R-2']
- fuite main traduire passe 5 : ['R-2']
- fuite main echappee passe 1 : aucune
- fuite main echappee passe 2 : aucune
- fuite main echappee passe 3 : aucune
- fuite main echappee passe 4 : aucune
- fuite main echappee passe 5 : aucune
- fuite lot traduire passe 1 : ['R-2']
- fuite lot traduire passe 2 : ['R-2']
- fuite lot traduire passe 3 : ['R-2']
- fuite lot traduire passe 4 : ['R-2']
- fuite lot traduire passe 5 : ['R-2']
- fuite lot echappee passe 1 : aucune
- fuite lot echappee passe 2 : aucune
- fuite lot echappee passe 3 : aucune
- fuite lot echappee passe 4 : aucune
- fuite lot echappee passe 5 : aucune

**(c)** VRAIE

- traduire main : entrées du premier appel qui varient d’une passe à l’autre : aucune
- traduire lot : entrées du premier appel qui varient d’une passe à l’autre : aucune
- traduire : 60 cas ; 60 identiques octet pour octet ; 0 ne diffèrent que par les phrases permises ; 0 autres
- echappee main : entrées du premier appel qui varient d’une passe à l’autre : aucune
- echappee lot : entrées du premier appel qui varient d’une passe à l’autre : aucune
- echappee : 18 cas ; 18 identiques octet pour octet ; 0 ne diffèrent que par les phrases permises ; 0 autres

**(d)** VRAIE

**(e)** gestes : {'main': (6, 6), 'lot': (6, 6)} ; lot à 6/6 : True (pnpm check : à lire à part)

## Bilan

- a : VRAIE
- b : VRAIE
- c : VRAIE
- d : VRAIE
- e_gestes : VRAIE
- passes complètes et modèle : True
