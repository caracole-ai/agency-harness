import type { TypeParametreDeclare } from '@harnais/moteur'

// Les types de paramètre des gestes appris de la sécurité privée
// (PLAN-METIER-2.md § 3.3, M5), déplacés du moteur sans changer de nom ni de
// mots : `agent` (une personne), `site` et `poste` (tels que les données les
// écrivent). Les gestes et les évals d'avant restent intacts.

export const TYPES_PARAMETRE: TypeParametreDeclare[] = [
  {
    nom: 'agent',
    enMots:
      'une personne nommée dans la demande, ou null pour celui qui parle ; liée par son identifiant (agents.id)',
    sorte: 'personne',
  },
  { nom: 'site', enMots: 'un site, tel que les données l’écrivent', sorte: 'texte' },
  { nom: 'poste', enMots: 'un poste, tel que les données l’écrivent', sorte: 'texte' },
]
