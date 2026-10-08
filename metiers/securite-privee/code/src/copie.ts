import {
  dureeHeures,
  type Identite,
  passerVeille,
  type TableCopie,
  type Temporal,
} from '@harnais/moteur'
import { METIER, type Session } from './remplacement'
import { intervalleDe } from './semantique'
import { VEILLER } from './veille'

// Les tables de la copie de l'échappée, à l'échelle du rôle : le patron voit
// toute l'entreprise, un agent sa seule ligne et ses seules vacations. C'est
// la copie qui ne contient que ses données, pas un filtre sur la requête
// (PLAN-ESPACES.md § 6.2, D4).

const INCONNU = '`null` = inconnu, rien n’est supposé.'
const ouiNon = (v: boolean | undefined) => (v === undefined ? null : v ? 'oui' : 'non')

export function tablesPour(
  s: Session,
  identite: Identite,
  maintenant: Temporal.ZonedDateTime,
): TableCopie[] {
  // Tout ce qui n'est pas le patron ne voit que ses données (échec fermé).
  const estAgent = identite.role !== 'patron'
  const agents = s.ctx.planning.agents.filter((a) => !estAgent || a.id === identite.agent)
  const vacations = s.ctx.planning.vacations.filter((v) => !estAgent || v.agent === identite.agent)
  const constats = estAgent
    ? []
    : passerVeille(VEILLER, METIER, s.dossier, maintenant.toPlainDate()).constats
  const nomRegle = (id: string) => s.registre.interdits.find((i) => i.id === id)?.nom ?? id

  return [
    {
      nom: 'agents',
      description: `les agents de sécurité de l'entreprise et leurs titres. ${INCONNU}`,
      colonnes: [
        { nom: 'id', type: 'TEXT', description: "l'identifiant de l'agent (A-1)" },
        { nom: 'nom', type: 'TEXT', description: 'prénom et nom' },
        {
          nom: 'carte_activites',
          type: 'TEXT',
          description:
            'les activités de sa carte professionnelle (surveillance-humaine, cynophile…), séparées par « | »',
        },
        { nom: 'carte_du', type: 'TEXT', description: 'début de validité de la carte, AAAA-MM-JJ' },
        {
          nom: 'carte_au',
          type: 'TEXT',
          description: 'fin de validité de la carte (dernier jour), AAAA-MM-JJ',
        },
        {
          nom: 'recepisse_du',
          type: 'TEXT',
          description:
            'date du récépissé de demande de renouvellement, qui permet de travailler en attendant la nouvelle carte',
        },
        {
          nom: 'carte_entreprise_remise',
          type: 'TEXT',
          description:
            "la carte professionnelle propre à l'entreprise lui a été remise : oui ou non",
        },
        {
          nom: 'declare_dracar',
          type: 'TEXT',
          description: 'déclaré dans Dracar Ultimate (le registre du CNAPS) : oui ou non',
        },
        {
          nom: 'mac',
          type: 'TEXT',
          description: 'date du dernier stage MAC (maintien et actualisation des compétences)',
        },
        { nom: 'ssiap_niveau', type: 'INTEGER', description: 'niveau SSIAP (1, 2 ou 3)' },
        { nom: 'ssiap_diplome', type: 'TEXT', description: 'date du diplôme SSIAP' },
        {
          nom: 'secourisme_qualification',
          type: 'TEXT',
          description: 'date de la qualification de secourisme',
        },
        { nom: 'habilitation_du', type: 'TEXT', description: "début de l'habilitation électrique" },
        { nom: 'habilitation_au', type: 'TEXT', description: "fin de l'habilitation électrique" },
      ],
      lignes: agents.map((a) => {
        const carte = a.cartePro?.validites.at(-1)
        return {
          id: a.id,
          nom: a.nom,
          carte_activites: a.cartePro ? a.cartePro.activites.join('|') : null,
          carte_du: carte?.du ?? null,
          carte_au: carte?.au ?? null,
          recepisse_du: a.recepisse?.du ?? null,
          carte_entreprise_remise: ouiNon(a.carteEntrepriseRemise),
          declare_dracar: ouiNon(a.declareDracar),
          mac: a.mac ?? null,
          ssiap_niveau: a.ssiap?.niveau ?? null,
          ssiap_diplome: a.ssiap?.diplome ?? null,
          secourisme_qualification: a.secourisme?.qualification ?? null,
          habilitation_du: a.habilitationElectrique?.du ?? null,
          habilitation_au: a.habilitationElectrique?.au ?? null,
        }
      }),
    },
    {
      nom: 'postes',
      description: `les postes à tenir, chacun sur un site. ${INCONNU}`,
      colonnes: [
        { nom: 'id', type: 'TEXT', description: 'le nom du poste (Accueil)' },
        { nom: 'site', type: 'TEXT', description: 'le site, c’est-à-dire l’établissement' },
        {
          nom: 'activite',
          type: 'TEXT',
          description:
            "l'activité de sécurité privée du poste, qui exige la carte professionnelle ; null pour un poste purement SSIAP",
        },
        { nom: 'ssiap', type: 'INTEGER', description: 'le niveau SSIAP exigé par le poste' },
      ],
      lignes: s.ctx.planning.postes.map((p) => ({
        id: p.id,
        site: p.site,
        activite: p.activite ?? null,
        ssiap: p.ssiap ?? null,
      })),
    },
    {
      nom: 'vacations',
      description: `le planning : une ligne par vacation, en heure de Paris. ${INCONNU}`,
      colonnes: [
        { nom: 'id', type: 'TEXT', description: "l'identifiant de la vacation (V-07)" },
        { nom: 'agent', type: 'TEXT', description: "l'agent qui la tient (agents.id)" },
        { nom: 'poste', type: 'TEXT', description: 'le poste (postes.id)' },
        { nom: 'site', type: 'TEXT', description: 'le site du poste' },
        { nom: 'debut', type: 'TEXT', description: 'début, AAAA-MM-JJTHH:MM' },
        { nom: 'fin', type: 'TEXT', description: 'fin, AAAA-MM-JJTHH:MM' },
        {
          nom: 'nature',
          type: 'TEXT',
          description:
            'jour ou nuit, au sens de la convention collective (service de jour ou de nuit)',
        },
        { nom: 'jour', type: 'TEXT', description: 'le jour où la vacation commence, AAAA-MM-JJ' },
        {
          nom: 'heures',
          type: 'REAL',
          description: 'sa durée en heures réelles (changement d’heure compris)',
        },
      ],
      lignes: vacations.map((v) => ({
        id: v.id,
        agent: v.agent,
        poste: v.poste,
        site: s.ctx.poste(v.poste).site,
        debut: v.debut,
        fin: v.fin,
        nature: v.nature ?? null,
        jour: intervalleDe(v).debut.toPlainDate().toString(),
        heures: dureeHeures(intervalleDe(v)),
      })),
    },
    {
      nom: 'constats',
      description:
        "ce que les règles reprochent au planning tel qu'il est : refus (un interdit s'y oppose) ou à vérifier (une donnée manque)",
      colonnes: [
        { nom: 'regle', type: 'TEXT', description: 'la règle (I-01)' },
        { nom: 'nom_regle', type: 'TEXT', description: 'le nom de la règle' },
        {
          nom: 'objet',
          type: 'TEXT',
          description: 'ce sur quoi porte le constat : une vacation, un agent',
        },
        { nom: 'verdict', type: 'TEXT', description: 'refus, à vérifier, ou ok (avec une note)' },
        { nom: 'motif', type: 'TEXT', description: 'pourquoi' },
      ],
      lignes: constats.map((c) => ({
        regle: c.regle,
        nom_regle: nomRegle(c.regle),
        objet: c.objet,
        verdict: c.verdict,
        motif: c.motif,
      })),
    },
  ]
}
