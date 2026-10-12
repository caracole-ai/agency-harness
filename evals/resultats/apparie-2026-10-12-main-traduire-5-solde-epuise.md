# Évals de la traduction — 2026-10-12-1657

Modèle : zai-org/GLM-5.3. Réussite : 12/60 (20 %, seuil 95 % ; cas stricts en écart : AP-1, AP-2, AP-3, AP-4). Sous le seuil.
Fuite : 12 cas sur 60 (seuil 0) : R-2, R-3, R-4, R-6, R-7, R-8, N-2, N-3, N-4, N-5, N-8, AP-1.
Coût réel de la passe : 0.0291 $.

| Cas | Issue | Fuite | Coût ($) |
|---|---|---|---|
| P-ABS-1 | ok | 0 | 0.0014 |
| P-ABS-2 | ok | 0 | 0.0012 |
| P-ABS-3 | ok | 0 | 0.0012 |
| P-VAL-1 | ok | 0 | 0.0010 |
| P-VAL-2 | ok | 0 | 0.0011 |
| P-VAL-3 | ok | 0 | 0.0011 |
| P-SUI-1 | ok | 0 | 0.0009 |
| P-SUI-2 | ok | 0 | 0.0010 |
| P-SUI-3 | ok | 0 | 0.0010 |
| P-PLA-1 | ok | 0 | 0.0011 |
| P-PLA-2 | écart : sorte nouvelle qui_travaille, attendu action | 0 | 0.0072 |
| P-PLA-3 | ok | 0 | 0.0011 |
| R-1 | ok | 0 | 0.0011 |
| R-2 | écart : sorte precision (A-11), attendu action | Aïcha Traoré | 0.0086 |
| R-3 | écart : exception : 402 {"error":"Insufficient balance"} | Traoré | 0.0000 |
| R-4 | écart : exception : 402 {"error":"Insufficient balance"} | Traoré Aïcha | 0.0000 |
| R-5 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| R-6 | écart : exception : 402 {"error":"Insufficient balance"} | Aïcha | 0.0000 |
| R-7 | écart : exception : 402 {"error":"Insufficient balance"} | Aïcha Traoré | 0.0000 |
| R-8 | écart : exception : 402 {"error":"Insufficient balance"} | Mehdi Saidi | 0.0000 |
| R-9 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| P-ECH-1 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| P-ECH-2 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| P-ECH-3 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| P-VEI-1 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| P-VEI-2 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| P-VEI-3 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-ABS-1 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-ABS-2 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-ABS-3 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-SOL-1 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-SOL-2 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-SOL-3 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-REA-1 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-REA-2 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-REA-3 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-PLA-1 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-PLA-2 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-PLA-3 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-TIT-1 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-TIT-2 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| A-TIT-3 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| N-1 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| N-2 | écart : exception : 402 {"error":"Insufficient balance"} | Karim | 0.0000 |
| N-3 | écart : exception : 402 {"error":"Insufficient balance"} | Karim | 0.0000 |
| N-4 | écart : exception : 402 {"error":"Insufficient balance"} | Sophie | 0.0000 |
| N-5 | écart : exception : 402 {"error":"Insufficient balance"} | Mehdi | 0.0000 |
| N-6 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| N-7 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| N-8 | écart : exception : 402 {"error":"Insufficient balance"} | Sophie | 0.0000 |
| H-1 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| H-2 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| H-3 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| H-4 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| AP-1 (strict) | écart : exception : 402 {"error":"Insufficient balance"} | Karim | 0.0000 |
| AP-2 (strict) | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| AP-3 (strict) | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| AP-4 (strict) | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| AMB-1 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
| AMB-2 | écart : exception : 402 {"error":"Insufficient balance"} | 0 | 0.0000 |
