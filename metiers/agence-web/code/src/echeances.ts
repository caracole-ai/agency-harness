import {
  auPlusTardAvant,
  type Duree,
  dateFr,
  type Echeance,
  type Fenetre,
  Temporal,
} from '@harnais/moteur'
import type { Contexte } from './modele'
import { recetteDuLot } from './semantique'

// Les échéances de l'agence web (PLAN-METIER-2.md M13, § 7.4), d'où
// l'archétype Veiller tire ses alertes : l'entretien § 8, une échéance par clé
// de `config.yaml: veiller.echeances`. Ce fichier dit quelle date est la
// limite et ce qu'il faut faire ; la config dit quand prévenir. Une date
// inconnue est une échéance sans limite : `veiller` en fait une alerte.
// « 45 jours fin de mois » est pour le lot 3 (PLAN-METIER-2.md § 8).

export const ECHEANCES = [
  'facture_echeance',
  'fin_garantie',
  'fin_tma',
  'domaine',
  'certificat',
  'fin_support',
  'attestation_urssaf',
  'pv_non_signe',
  'devis_sans_reponse',
] as const
export type CleEcheance = (typeof ECHEANCES)[number]
export type Fenetres = Record<CleEcheance, Fenetre>

/**
 * L'interdit du registre que tient chaque échéance. Le rapport du moteur
 * (`archetypes/rapport.ts`) exige que toute alerte cite un interdit du
 * registre : une échéance du § 8 qu'aucun interdit ne porte (`null`) est
 * calculée (`echeancesDues`) mais pas encore remise à la veille.
 */
export const INTERDIT_DE_L_ECHEANCE: Record<CleEcheance, string | null> = {
  facture_echeance: null,
  fin_garantie: null,
  fin_tma: null,
  domaine: 'I-13',
  certificat: 'I-13',
  fin_support: null,
  attestation_urssaf: 'I-09',
  pv_non_signe: 'I-01',
  devis_sans_reponse: null,
}

/**
 * Les délais qui font la limite d'une échéance. Ceux de l'entretien § 8 et
 * § 39 sont ceux de la maison ; ceux d'I-09 sont ceux du texte (L8222-1 et
 * D8222-5 du code du travail, non relus), dont la place est
 * `regles.yaml: I-09.parametres`, que le registre ne porte pas encore.
 */
export const DELAIS = {
  /** Le premier rappel d'une facture impayée, le lendemain de l'échéance (J+1). */
  relance_facture: { jours: 1 },
  /** La relance d'un PV non signé, quinze jours après la recette (J+15). */
  pv_non_signe: { jours: 15 },
  /** La première relance d'un devis sans réponse, dix jours après l'envoi (J+10). */
  devis_sans_reponse: { jours: 10 },
  /** L'attestation de vigilance a moins de six mois. */
  attestation_urssaf: { mois: 6 },
} as const satisfies Record<string, Duree>

/** I-09 : le montant annuel HT au-delà duquel l'attestation de vigilance est due. */
export const VIGILANCE_SEUIL_EUR_HT = 5000

/** Une échéance de l'agence, avant qu'un interdit ne la porte. */
export interface EcheanceDue extends Omit<Echeance, 'regle'> {
  cle: CleEcheance
}

const fr = (iso: string) => dateFr(Temporal.PlainDate.from(iso))
const jour = (iso: string) => Temporal.PlainDate.from(iso)
const plus = (iso: string, d: Duree) =>
  jour(iso).add(
    'jours' in d ? { days: d.jours } : 'mois' in d ? { months: d.mois } : { years: d.ans },
  )

/**
 * Toutes les échéances du § 8 sur les données du client, dans l'ordre des
 * clés. Non couvert : la seconde relance d'un devis (J+30), les relances
 * suivantes d'une facture (J+15, J+30), un avenant envoyé (l'export n'a pas
 * sa date d'envoi), le forfait à 90 % puis 100 % (les écarts du lot 3).
 */
export function echeancesDues(ctx: Contexte, fenetres: Fenetres): EcheanceDue[] {
  const e: EcheanceDue[] = []
  const de = (
    cle: CleEcheance,
    objet: string,
    action: string,
    limite?: Temporal.PlainDate,
    precision?: string,
  ) => {
    e.push({
      cle,
      objet,
      action,
      fenetre: fenetres[cle],
      ...(limite ? { limite } : {}),
      ...(precision ? { precision } : {}),
    })
  }

  for (const f of ctx.factures.values()) {
    if (f.etat === 'payee' || f.payee_le !== undefined) continue
    const relances = ctx.relances
      .filter((r) => r.facture === f.id)
      .sort((a, b) => a.date.localeCompare(b.date))
    const derniere = relances.at(-1)
    const precision = derniere
      ? `dernière relance : niveau ${derniere.niveau}, le ${fr(derniere.date)}`
      : 'aucune relance faite'
    if (f.echeance === undefined) {
      de(
        'facture_echeance',
        `${f.id}/echeance`,
        `renseigner l'échéance de la facture ${f.id}`,
        undefined,
        precision,
      )
    } else {
      de(
        'facture_echeance',
        `${f.id}/echeance`,
        `préparer la relance de la facture ${f.id}, échue le ${fr(f.echeance)}, à faire valider par le dirigeant`,
        plus(f.echeance, DELAIS.relance_facture),
        precision,
      )
    }
  }

  for (const p of ctx.projets.values()) {
    if (p.etat !== 'livre' && p.etat !== 'garantie') continue
    if ([...ctx.contrats_tma.values()].some((c) => c.projet === p.id)) continue
    de(
      'fin_garantie',
      `${p.id}/garantie`,
      p.garantie_fin
        ? `proposer un contrat TMA avant la fin de la garantie`
        : `renseigner la fin de garantie du projet ${p.id}`,
      p.garantie_fin ? jour(p.garantie_fin) : undefined,
      'après elle, les bugs ne sont plus gratuits',
    )
  }

  for (const c of ctx.contrats_tma.values()) {
    const objet = `${c.id}/fin`
    if (c.fin === undefined || c.preavis_jours === undefined) {
      de('fin_tma', objet, `renseigner la fin et le préavis du contrat ${c.id}`)
      continue
    }
    de(
      'fin_tma',
      objet,
      `renégocier ou dénoncer le contrat ${c.id} (fin le ${fr(c.fin)})`,
      auPlusTardAvant(jour(c.fin), { jours: c.preavis_jours }),
      `préavis de ${c.preavis_jours} jours`,
    )
  }

  // le nom du domaine et son client sont dans `decrire`, pas dans le motif (journalisé)
  for (const d of ctx.domaines.values()) {
    de(
      'domaine',
      `${d.id}/domaine`,
      d.expire_le
        ? `renouveler le domaine ${d.id}`
        : `renseigner la date d'expiration du domaine ${d.id}`,
      d.expire_le ? jour(d.expire_le) : undefined,
      'sans renouvellement, le site et les mails sont coupés',
    )
    de(
      'certificat',
      `${d.id}/certificat`,
      d.certificat_expire_le
        ? `renouveler le certificat du domaine ${d.id}`
        : `renseigner la date d'expiration du certificat du domaine ${d.id}`,
      d.certificat_expire_le ? jour(d.certificat_expire_le) : undefined,
    )
  }

  for (const v of ctx.versions) {
    de(
      'fin_support',
      `${v.projet}/support/${v.composant}`,
      v.fin_de_support_le
        ? `migrer ${v.composant} ${v.version} avant la fin de son support`
        : `renseigner la fin de support de ${v.composant} ${v.version}`,
      v.fin_de_support_le ? jour(v.fin_de_support_le) : undefined,
    )
  }

  for (const s of ctx.sous_traitants.values()) {
    const montant = s.montant_annuel_ht_eur
    if (montant !== undefined && montant <= VIGILANCE_SEUIL_EUR_HT) continue
    const precision =
      montant === undefined
        ? 'montant annuel inconnu : tenu pour au-delà du seuil'
        : `payé ${montant.toFixed(2).replace('.', ',')} € HT par an, au-delà de ${VIGILANCE_SEUIL_EUR_HT} €`
    de(
      'attestation_urssaf',
      `${s.id}/attestation`,
      s.attestation_urssaf_le
        ? `obtenir une attestation de vigilance URSSAF à jour (la dernière date du ${fr(s.attestation_urssaf_le)})`
        : 'obtenir une attestation de vigilance URSSAF (aucune au dossier)',
      s.attestation_urssaf_le
        ? plus(s.attestation_urssaf_le, DELAIS.attestation_urssaf)
        : undefined,
      precision,
    )
  }

  for (const l of ctx.lots.values()) {
    const r = recetteDuLot(ctx, l.id)
    if (!r.recette_le || r.pv_signe_le) continue
    de(
      'pv_non_signe',
      `${l.id}/pv`,
      `relancer la signature du PV du lot ${l.id}, recetté le ${fr(r.recette_le)}`,
      plus(r.recette_le, DELAIS.pv_non_signe),
      'sans PV signé, le lot ne se facture pas',
    )
  }

  for (const d of ctx.devis.values()) {
    if (d.etat !== 'envoye') continue
    de(
      'devis_sans_reponse',
      `${d.id}/relance`,
      d.envoye_le
        ? `relancer le devis ${d.id}, envoyé le ${fr(d.envoye_le)}`
        : `renseigner la date d'envoi du devis ${d.id}`,
      d.envoye_le ? plus(d.envoye_le, DELAIS.devis_sans_reponse) : undefined,
    )
  }
  return e
}

/** Les échéances remises à la veille : celles qu'un interdit du registre porte. */
export function echeancesAgenceWeb(ctx: Contexte, fenetres: Fenetres): Echeance[] {
  return echeancesDues(ctx, fenetres).flatMap(({ cle, ...e }) => {
    const regle = INTERDIT_DE_L_ECHEANCE[cle]
    return regle ? [{ regle, ...e }] : []
  })
}

/** Les règles tenues par des échéances plutôt que par des contrôles : elles dépendent du jour. */
export const VEILLES = [
  {
    regle: 'I-09',
    nonCouvert: ["les sommes réellement versées dans l'année (seul le montant déclaré est lu)"],
  },
  { regle: 'I-13', nonCouvert: ['les domaines et certificats absents du registre des domaines'] },
]
