#!/usr/bin/env python3
"""Vérifie que chaque citation d'un document existe dans la transcription.

Une règle formalisée à partir d'un entretien porte la phrase du client qui la
fonde, sous la forme :

    [00:12:34] « texte exact dit par le client »

Ce script cherche chaque citation dans la transcription, mot pour mot (à la
casse, aux apostrophes, à la ponctuation et aux espaces près). Une coupe dans
la citation s'écrit […] : chaque morceau doit alors se trouver, dans l'ordre.

Une citation introuvable est une erreur : la règle qu'elle porte n'a pas été
dite telle quelle, et ne part pas dans un devis. Une citation trouvée loin de
l'horodatage annoncé est un avertissement : la phrase existe, mais peut-être
pas dans la bouche ni au moment qu'on lui prête.

Usage :
    python3 verifier_citations.py <document.md> <transcription.txt> [--tolerance 120]

Sortie : 0 si toutes les citations sont trouvées, 1 sinon, 2 si l'usage est
faux ou si le document ne contient aucune citation.
"""

import argparse
import re
import sys
import unicodedata

# Une citation : un horodatage entre crochets, puis un texte entre guillemets
# français. Les deux peuvent être séparés par un rôle (« Dirigeant : »).
CITATION = re.compile(
    r"\[(?P<ts>\d{1,2}:\d{2}(?::\d{2})?)\][^«\n]{0,60}«\s*(?P<texte>.+?)\s*»",
    re.S,
)
# Début de ligne d'une transcription : horodatage, puis nom de l'orateur.
TETE_DE_LIGNE = re.compile(
    r"^\s*\[?(?P<ts>\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–—]?\s*(?:[^:\n]{1,40}:\s+)?"
)
COUPE = re.compile(r"\s*(?:\[…\]|\[\.\.\.\]|\(…\)|\(\.\.\.\))\s*")


def secondes(ts: str) -> int:
    parts = [int(p) for p in ts.split(":")]
    while len(parts) < 3:
        parts.insert(0, 0)
    h, m, s = parts
    return h * 3600 + m * 60 + s


def normaliser(texte: str) -> str:
    texte = unicodedata.normalize("NFKC", texte).lower()
    texte = texte.replace("’", "'").replace("‘", "'").replace("…", "...")
    # La ponctuation ne compte pas : un transcripteur la place à sa guise.
    texte = re.sub(r"[^\w'\s]", " ", texte)
    return re.sub(r"\s+", " ", texte).strip()


def lire_transcription(chemin: str):
    """Rend le texte normalisé et, pour chaque position, l'horodatage courant."""
    morceaux, horodatages = [], []
    courant = None
    with open(chemin, encoding="utf-8") as f:
        for ligne in f:
            tete = TETE_DE_LIGNE.match(ligne)
            if tete:
                courant = secondes(tete.group("ts"))
                ligne = ligne[tete.end():]
            propre = normaliser(ligne)
            if not propre:
                continue
            morceau = propre + " "
            morceaux.append(morceau)
            horodatages.extend([courant] * len(morceau))
    return "".join(morceaux), horodatages


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("document")
    parser.add_argument("transcription")
    parser.add_argument("--tolerance", type=int, default=120,
                        help="écart toléré, en secondes, avec l'horodatage cité")
    args = parser.parse_args()

    with open(args.document, encoding="utf-8") as f:
        document = f.read()
    texte, horodatages = lire_transcription(args.transcription)

    citations = list(CITATION.finditer(document))
    if not citations:
        print("Aucune citation au format [hh:mm:ss] « … » dans le document.")
        return 2

    introuvables, decalees = [], []
    for c in citations:
        cite = secondes(c.group("ts"))
        morceaux = [normaliser(m) for m in COUPE.split(c.group("texte"))]
        morceaux = [m for m in morceaux if m]
        position, trouve_a = 0, None
        for m in morceaux:
            i = texte.find(m, position)
            if i < 0:
                trouve_a = None
                break
            if trouve_a is None:
                trouve_a = i
            position = i + len(m)
        extrait = c.group("texte").replace("\n", " ")
        if trouve_a is None:
            introuvables.append((c.group("ts"), extrait))
            continue
        reel = horodatages[trouve_a] if trouve_a < len(horodatages) else None
        if reel is not None and abs(reel - cite) > args.tolerance:
            decalees.append((c.group("ts"), reel, extrait))

    print(f"{len(citations)} citation(s) vérifiée(s).")
    for ts, extrait in introuvables:
        print(f"ERREUR  [{ts}] introuvable : « {extrait[:100]} »")
    for ts, reel, extrait in decalees:
        h, reste = divmod(reel, 3600)
        print(f"ATTENTION [{ts}] trouvée à {h:02d}:{reste // 60:02d}:{reste % 60:02d} : « {extrait[:100]} »")
    if not introuvables and not decalees:
        print("Toutes les citations sont dans la transcription, à leur place.")
    return 1 if introuvables else 0


if __name__ == "__main__":
    sys.exit(main())
