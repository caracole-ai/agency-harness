# Mesure appariée du lot 3 (S4)

## Passes

- tour 1, lot, echappee : 12:45:34 → 12:54:08, code 0, 2026-10-13-1245-securite-privee-echappee.md
- tour 2, lot, echappee : 12:56:08 → 13:04:18, code 0, 2026-10-13-1256-securite-privee-echappee.md
- tour 3, lot, echappee : 13:10:30 → 13:19:23, code 0, 2026-10-13-1310-securite-privee-echappee.md
- tour 4, lot, echappee : 13:21:35 → 13:27:36, code 1, 2026-10-13-1321-securite-privee-echappee.md
- tour 5, lot, echappee : 13:31:27 → 13:42:14, code 0, 2026-10-13-1331-securite-privee-echappee.md
- tour 1, lot, traduire : 12:43:34 → 12:48:30, code 1, 2026-10-13-1243-securite-privee-traduire.md
- tour 2, lot, traduire : 12:54:08 → 12:58:49, code 1, 2026-10-13-1254-securite-privee-traduire.md
- tour 3, lot, traduire : 13:08:30 → 13:13:47, code 1, 2026-10-13-1308-securite-privee-traduire.md
- tour 4, lot, traduire : 13:19:35 → 13:25:32, code 1, 2026-10-13-1319-securite-privee-traduire.md
- tour 5, lot, traduire : 13:29:27 → 13:33:44, code 1, 2026-10-13-1329-securite-privee-traduire.md
- tour 1, main, echappee : 12:44:34 → 12:53:58, code 0, 2026-10-13-1244-securite-privee-echappee.md
- tour 2, main, echappee : 12:57:08 → 13:07:30, code 1, 2026-10-13-1257-securite-privee-echappee.md
- tour 3, main, echappee : 13:09:30 → 13:19:35, code 1, 2026-10-13-1309-securite-privee-echappee.md
- tour 4, main, echappee : 13:22:35 → 13:28:27, code 0, 2026-10-13-1322-securite-privee-echappee.md
- tour 5, main, echappee : 13:30:27 → 13:37:09, code 0, 2026-10-13-1330-securite-privee-echappee.md
- tour 1, main, traduire : 12:42:34 → 12:47:44, code 1, 2026-10-13-1242-securite-privee-traduire.md
- tour 2, main, traduire : 12:55:08 → 12:59:36, code 1, 2026-10-13-1255-securite-privee-traduire.md
- tour 3, main, traduire : 13:07:30 → 13:13:54, code 1, 2026-10-13-1307-securite-privee-traduire.md
- tour 4, main, traduire : 13:20:35 → 13:25:43, code 1, 2026-10-13-1320-securite-privee-traduire.md
- tour 5, main, traduire : 13:28:27 → 13:32:34, code 1, 2026-10-13-1328-securite-privee-traduire.md

Modèles lus dans les en-têtes : ['zai-org/GLM-5.3']

Passes par côté : {('main', 'traduire'): 5, ('lot', 'traduire'): 5, ('main', 'echappee'): 5, ('lot', 'echappee'): 5}

## traduire : rouges par cas (sur 5)

| Cas | rouges main | rouges lot | lot − main | tronqués main | tronqués lot | issues lot rouges |
|---|---|---|---|---|---|---|
| AMB-1 | 0 | 1 | +1 | 0 | 0 | écart : sorte action lancer_veille, attendu inconnue |
| AP-4 | 1 | 1 | +0 | 0 | 0 | écart : sorte action repondre_sollicitation, attendu inconnue ou nouvelle |
| P-PLA-2 | 2 | 3 | +1 | 0 | 1 | écart : sorte inconnue (réponse tronquée), attendu action ; écart : sorte nouvelle qui_travaille, attendu action |
| R-2 | 1 | 0 | -1 | 0 | 0 |  |

(cas toujours verts des deux côtés omis ; 60 cas)

## echappee : rouges par cas (sur 5)

| Cas | rouges main | rouges lot | lot − main | tronqués main | tronqués lot | issues lot rouges |
|---|---|---|---|---|---|---|
| E-07 | 1 | 3 | +2 | 1 | 3 | écart : sorte abandon (réponse tronquée), attendu proposition |
| E-08 | 1 | 1 | +0 | 1 | 0 | écart : sorte abandon (plafond de temps atteint), attendu proposition |
| E-10 | 1 | 0 | -1 | 0 | 0 |  |
| E-11 | 1 | 0 | -1 | 0 | 0 |  |
| E-13 | 2 | 1 | -1 | 2 | 1 | écart : sorte abandon (réponse tronquée), attendu proposition |
| E-16 | 0 | 1 | +1 | 0 | 0 | écart : le contrôle a retiré le résumé du modèle |

(cas toujours verts des deux côtés omis ; 18 cas)

**(a)** aucun cas à ≥ 4 rouges de plus sur le lot : VRAIE []

- verts lot echappee : [17, 18, 16, 17, 16] sur [18, 18, 18, 18, 18], moyenne 16.80
- verts lot traduire : [60, 58, 60, 58, 59] sur [60, 60, 60, 60, 60], moyenne 59.00
- verts main echappee : [18, 15, 16, 18, 17] sur [18, 18, 18, 18, 18], moyenne 16.80
- verts main traduire : [59, 60, 59, 59, 59] sur [60, 60, 60, 60, 60], moyenne 59.20

**(b)** traduction 59.00 ≥ 59.20 − 1,5 : True ; échappée 16.80 ≥ 16.80 − 1 : True → VRAIE

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
