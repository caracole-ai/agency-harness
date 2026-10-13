import {
  type Constat,
  type Controle,
  dateFr,
  decrireEcart,
  type Interdit,
  parametresDe,
  plusGrave,
  Temporal,
  taux,
  type Verdict,
} from '@harnais/moteur'
import type { ConfigAgenceWeb } from './config'
import type { Contexte } from './modele'
import {
  domaineNomme,
  ecartForfait,
  misesEnProduction,
  recetteDuLot,
  revocationsDues,
} from './semantique'

// Les interdits codés de l'agence web (PLAN-METIER-2.md M15, § 7.4), un
// contrôle par interdit du registre (`../../regles.yaml`), sur le texte de
// l'entretien § 1. Chaque fonction rend son verdict brut ; le moteur le
// plafonne par le statut de la règle : tout est `déclaré` ou `texte` non
// relu, donc « à vérifier » au plus, jamais « refus » en v1.
// I-09 et I-13 dépendent du jour : ils sont tenus par des échéances
// (`echeances.ts`, `VEILLES`), comme I-17 dans la sécurité privée.

/** Les seuils du client (`config.yaml: seuils`). */
export type Seuils = ConfigAgenceWeb['seuils']

/**
 * Le contexte d'une veille : les données du client et ses seuils. Un
 * `Controle` ne reçoit que le contexte et l'interdit : la config y entre par
 * `VEILLER.lire`, le seul point où le métier la tient avant les contrôles,
 * comme la politique de la sécurité entre par le registre.
 */
export type ContexteVeille = Contexte & { seuils: Seuils }

/** Un paramètre numérique du registre (`regles.yaml: parametres`) ; absent ou mal typé, le contrôle lève, et le moteur refuse. */
export function parametre(interdit: Interdit, cle: string): number {
  const v = parametresDe(interdit)[cle]
  if (typeof v !== 'number') throw new Error(`${interdit.id} : paramètre ${cle} absent du registre`)
  return v
}

interface Resultat {
  verdict: Verdict
  motif: string
}

const ok: Resultat = { verdict: 'ok', motif: 'conforme' }

function constat(regle: string, objet: string, resultats: Resultat[]): Constat {
  const nonOk = resultats.filter((r) => r.verdict !== 'ok')
  return {
    regle,
    objet,
    verdict: resultats.reduce<Verdict>((v, r) => plusGrave(v, r.verdict), 'ok'),
    motif: nonOk.length > 0 ? nonOk.map((r) => r.motif).join(' ; ') : ok.motif,
  }
}

const aVerifier = (motif: string): Resultat => ({ verdict: 'à vérifier', motif })

const inconnu = (quoi: string): Resultat =>
  aVerifier(`donnée absente : ${quoi} ; rien n'est supposé, à renseigner`)

const fr = (iso: string) => dateFr(Temporal.PlainDate.from(iso))
const avant = (a: string, b: string) =>
  Temporal.PlainDate.compare(Temporal.PlainDate.from(a), Temporal.PlainDate.from(b)) < 0
/** Un nombre à une décimale au plus, à la française : `36`, `27,5`. */
const nombre = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',')
const pourcent = (x: number) => `${Math.round(x * 100)} %`
const euros = (x: number) => `${x.toFixed(2).replace('.', ',')} € HT`

export const I01: Controle<ContexteVeille> = {
  regle: 'I-01',
  nonCouvert: [
    'le relevé de temps validé par le client avant une facture de régie (absent des exports)',
    "une facture de solde émise sans lot (l'export ne distingue pas le solde de l'acompte)",
  ],
  verifier: (ctx) =>
    [...ctx.factures.values()].flatMap((f) => {
      const lot = f.lot ? ctx.lots.get(f.lot) : undefined
      if (!lot || ctx.projets.get(lot.projet)?.type !== 'forfait') return []
      const r = recetteDuLot(ctx, lot.id)
      if (!r.pv_signe_le) {
        return [
          constat('I-01', f.id, [
            aVerifier(
              `facture du ${fr(f.date)} sur le lot ${lot.id}, ${r.recette_le ? `recetté le ${fr(r.recette_le)}` : 'sans recette'}, sans PV signé`,
            ),
          ]),
        ]
      }
      const resultats: Resultat[] = []
      if (avant(f.date, r.pv_signe_le)) {
        resultats.push(
          aVerifier(
            `facture du ${fr(f.date)}, avant le PV du lot ${lot.id} signé le ${fr(r.pv_signe_le)}`,
          ),
        )
      }
      if (r.bloquante === true) {
        resultats.push(aVerifier(`le PV du lot ${lot.id} porte une réserve bloquante`))
      } else if (r.reserves && r.bloquante === undefined) {
        resultats.push(inconnu(`réserve bloquante ou non au PV du lot ${lot.id}`))
      }
      return [constat('I-01', f.id, resultats.length > 0 ? resultats : [ok])]
    }),
}

export const I02: Controle<ContexteVeille> = {
  regle: 'I-02',
  nonCouvert: [
    "l'accord écrit du client par mail (la messagerie n'est pas lue en v1)",
    'le travail fait sans ticket',
  ],
  verifier: (ctx) => {
    const demiJournee = ctx.seuils.heures_par_jour / 2
    return [...ctx.tickets.values()].flatMap((t) => {
      if (t.type !== 'evolution') return []
      // un projet interne n'a ni devis ni avenant
      if (t.projet && ctx.projets.get(t.projet)?.type === 'interne') return []
      const couverture = t.rattache_a
      if (couverture === undefined) {
        const taille =
          t.estimation_h === undefined
            ? 'sans estimation'
            : t.estimation_h < demiJournee
              ? `estimée à ${nombre(t.estimation_h)} h, moins d'une demi-journée : à facturer au lot suivant ou à offrir explicitement`
              : `estimée à ${nombre(t.estimation_h)} h, une demi-journée ou plus : avenant signé ou accord écrit attendu`
        return [
          constat('I-02', t.cle, [
            aVerifier(`évolution rattachée à aucun lot, avenant ni contrat TMA, ${taille}`),
          ]),
        ]
      }
      // « c'est dans la maintenance » pour une évolution : le piège que nomme
      // l'entretien (§ 5, § 22) ; seul un lot ou un avenant la couvre (§ 36)
      const contrat = ctx.contrats_tma.get(couverture)
      if (contrat) {
        return [
          constat('I-02', t.cle, [
            aVerifier(
              `évolution rattachée au contrat de maintenance ${contrat.id} : une évolution n'est pas dans la maintenance, devis ou avenant attendu`,
            ),
          ]),
        ]
      }
      const lot = ctx.lots.get(couverture)
      const avenant = ctx.avenants.get(couverture)
      const projetCouvert = lot?.projet ?? avenant?.projet
      if (projetCouvert !== undefined && t.projet !== undefined && projetCouvert !== t.projet) {
        return [
          constat('I-02', t.cle, [
            aVerifier(
              `évolution de ${t.projet} rattachée à ${couverture}, qui couvre ${projetCouvert}, pas ce projet`,
            ),
          ]),
        ]
      }
      if (avenant && avenant.etat !== 'signe') {
        return [
          constat('I-02', t.cle, [
            aVerifier(`évolution rattachée à l'avenant ${avenant.id}, non signé (${avenant.etat})`),
          ]),
        ]
      }
      return [constat('I-02', t.cle, [ok])]
    })
  },
}

export const I03: Controle<ContexteVeille> = {
  regle: 'I-03',
  nonCouvert: [
    "l'accord écrit du client (dans la messagerie, non lue en v1)",
    "l'heure de la sauvegarde et de la mise en production : les exports sont datés au jour, une sauvegarde du jour même est tenue pour antérieure",
  ],
  verifier: (ctx) =>
    misesEnProduction(ctx).map((m) => {
      const objet = `${m.projet}/mise-en-prod/${m.date}`
      const sauvegardes = ctx.sauvegardes
        .filter((s) => s.projet === m.projet && !avant(m.date, s.date))
        .map((s) => s.date)
        .sort()
      const derniere = sauvegardes.at(-1)
      if (derniere === m.date) return constat('I-03', objet, [ok])
      return constat('I-03', objet, [
        aVerifier(
          derniere
            ? `mise en production du ${fr(m.date)}, dernière sauvegarde le ${fr(derniere)} : pas de sauvegarde de moins de 24 h`
            : `mise en production du ${fr(m.date)}, aucune sauvegarde avant elle`,
        ),
      ])
    }),
}

/** L'objet d'un accès : la personne, la sorte, la ressource (un domaine par son identifiant). */
export const objetAcces = (
  ctx: Contexte,
  a: { personne: string; sorte: string; ressource: string },
) => `${a.personne}/${a.sorte}/${domaineNomme(ctx, a.ressource)?.id ?? a.ressource}`

export const I04: Controle<ContexteVeille> = {
  regle: 'I-04',
  nonCouvert: [
    'les accès aux hébergeurs, registrars et sites hors du registre (seuls les collaborateurs des dépôts sont lus)',
    "l'accès d'une personne de l'agence qu'un contrat TMA justifie : sa fin est portée par l'échéance fin_tma (I-04), qui dit de révoquer ces accès",
  ],
  verifier: (ctx) => {
    const constats: Constat[] = []
    for (const r of revocationsDues(ctx)) {
      const tma = [...ctx.contrats_tma.values()]
        .filter((c) => c.projet !== undefined && r.projets.includes(c.projet))
        .map((c) => c.id)
      // un projet clos qu'un contrat TMA maintient continue pour l'agence : ses
      // personnes en gardent l'accès ; un sous-traitant, jamais (entretien § 42)
      if (r.motif === 'projet_clos' && tma.length > 0 && ctx.personnes.has(r.acces.personne))
        continue
      constats.push(
        constat('I-04', objetAcces(ctx, r.acces), [
          aVerifier(
            r.motif === 'personne_partie'
              ? `${r.acces.personne} n'est plus ni dans l'équipe ni sous-traitant, accès non révoqué`
              : `${r.projets.length > 1 ? 'projets' : 'projet'} ${r.projets.join(', ')} clos, accès non révoqué : à révoquer à la fin du projet${tma.length > 0 ? ` (un contrat TMA porte sur ce projet : ${tma.join(', ')})` : ''}`,
          ),
        ]),
      )
    }
    // les collaborateurs des dépôts, contre le registre
    for (const d of ctx.depots.values()) {
      for (const personne of d.collaborateurs ?? []) {
        const lignes = ctx.acces.filter(
          (a) => a.sorte === 'depot' && a.ressource === d.nom && a.personne === personne,
        )
        const objet = objetAcces(ctx, { personne, sorte: 'depot', ressource: d.nom })
        if (lignes.length === 0) {
          constats.push(
            constat('I-04', objet, [
              aVerifier(`collaborateur du dépôt ${d.nom}, absent du registre des accès`),
            ]),
          )
        } else if (lignes.every((a) => a.revoque_le !== undefined)) {
          const revoque = lignes.map((a) => a.revoque_le as string).sort()[0] as string
          constats.push(
            constat('I-04', objet, [
              aVerifier(
                `révoqué au registre le ${fr(revoque)}, encore collaborateur du dépôt ${d.nom}`,
              ),
            ]),
          )
        }
      }
    }
    return constats
  },
}

export const I07: Controle<ContexteVeille> = {
  regle: 'I-07',
  nonCouvert: ["le montant de l'indemnité inscrit sur la facture (seule sa mention est lue)"],
  verifier: (ctx, interdit) => {
    const max = parametre(interdit, 'delai_paiement_max_jours')
    const maxFdm = parametre(interdit, 'delai_paiement_fin_de_mois_max_jours')
    return [...ctx.factures.values()].map((f) => {
      const r: Resultat[] = []
      const d = f.delai_jours
      if (d === undefined) r.push(inconnu('délai de paiement'))
      else if (d > max)
        r.push(aVerifier(`délai de paiement de ${nombre(d)} jours, au-delà de ${max}`))
      else if (d > maxFdm) {
        if (f.fin_de_mois === true)
          r.push(
            aVerifier(
              `délai de ${nombre(d)} jours fin de mois, au-delà de ${maxFdm} jours fin de mois`,
            ),
          )
        else if (f.fin_de_mois === undefined) r.push(inconnu('délai compté fin de mois ou non'))
      }
      if (f.penalites_mentionnees === false)
        r.push(aVerifier('pénalités de retard non mentionnées'))
      else if (f.penalites_mentionnees === undefined)
        r.push(inconnu('mention des pénalités de retard'))
      if (f.indemnite_40_mentionnee === false)
        r.push(aVerifier('indemnité forfaitaire de 40 € non mentionnée'))
      else if (f.indemnite_40_mentionnee === undefined)
        r.push(inconnu("mention de l'indemnité forfaitaire de 40 €"))
      return constat('I-07', f.id, r.length > 0 ? r : [ok])
    })
  },
}

export const I10: Controle<ContexteVeille> = {
  regle: 'I-10',
  nonCouvert: [
    'le contenu de la clause (étendue, durée, territoire), qui se relit à la main',
    'les créations remises sans mise en production (maquettes, logo)',
  ],
  verifier: (ctx) => {
    const livres = new Set(misesEnProduction(ctx).map((m) => m.projet))
    return [...livres].flatMap((id) => {
      const projet = ctx.projets.get(id)
      // un projet interne ne cède rien à personne
      if (!projet || projet.type === 'interne') return []
      const signes = [...ctx.devis.values()].filter((d) => d.projet === id && d.etat === 'signe')
      if (signes.length === 0) {
        return [constat('I-10', id, [aVerifier('livré sans devis signé au registre des devis')])]
      }
      const r: Resultat[] = signes.flatMap((d): Resultat[] =>
        d.clause_cession === true
          ? []
          : d.clause_cession === false
            ? [aVerifier(`livré, le devis ${d.id} ne porte pas de clause de cession des droits`)]
            : [inconnu(`clause de cession au devis ${d.id}`)],
      )
      return [constat('I-10', id, r.length > 0 ? r : [ok])]
    })
  },
}

export const I11: Controle<ContexteVeille> = {
  regle: 'I-11',
  nonCouvert: [
    "l'absence du dirigeant quand la cheffe de projet signe sous son plafond (aucune donnée de congé en v1)",
  ],
  verifier: (ctx) => {
    const { delegation_eur_ht: plafond, remise_max } = ctx.seuils
    const engages = [
      ...[...ctx.devis.values()].map((d) => ({ ...d, sorte: 'devis' })),
      ...[...ctx.avenants.values()].map((a) => ({ ...a, remise: undefined, sorte: 'avenant' })),
    ].filter((d) => d.etat === 'signe')
    return engages.map((d) => {
      if (d.signataire === undefined) return constat('I-11', d.id, [inconnu('signataire')])
      const role = ctx.personnes.get(d.signataire)?.role
      if (role === 'dirigeant') return constat('I-11', d.id, [ok])
      const remise =
        d.remise !== undefined && d.remise > remise_max
          ? `, remise de ${pourcent(d.remise)} (au-delà de ${pourcent(remise_max)})`
          : ''
      if (role === 'po') {
        return constat('I-11', d.id, [
          d.montant_ht_eur > plafond
            ? aVerifier(
                `${d.sorte} de ${euros(d.montant_ht_eur)} signé par la cheffe de projet ${d.signataire}, au-delà de sa délégation de ${euros(plafond)}${remise}`,
              )
            : ok,
        ])
      }
      return constat('I-11', d.id, [
        aVerifier(
          `${d.sorte} engagé par ${d.signataire} (${role ?? "hors de l'équipe"}), pas par le dirigeant${remise}`,
        ),
      ])
    })
  },
}

export const I12: Controle<ContexteVeille> = {
  regle: 'I-12',
  nonCouvert: [
    'le dirigeant prévenu avant le dépassement (aucune trace en v1)',
    'le dépassement par lot (le temps est saisi par projet)',
  ],
  verifier: (ctx) => {
    const { forfait_refus, heures_par_jour } = ctx.seuils
    return [...ctx.projets.values()]
      .filter((p) => p.type === 'forfait')
      .map((p) => {
        // l'écart de la section « Écarts », au seuil du refus (PLAN-METIER-2.md § 8)
        const e = ecartForfait(ctx, p.id, heures_par_jour, forfait_refus)
        const part = taux(e)
        if (part === null) return constat('I-12', p.id, [inconnu('jours vendus du forfait')])
        // « ne dépasse pas 110 % » : le seuil pile est conforme, là où `depasse` prévient dès le seuil
        if (part <= e.seuil) return constat('I-12', p.id, [ok])
        return constat('I-12', p.id, [
          aVerifier(`${decrireEcart(e)}, au-delà de ${pourcent(e.seuil)}`),
        ])
      })
  },
}

export const I14: Controle<ContexteVeille> = {
  regle: 'I-14',
  nonCouvert: [
    "les données personnelles confiées hors de l'hébergement (préproduction, exports) ; tout site hébergé est tenu pour en contenir",
  ],
  verifier: (ctx) => {
    const hebergees = ctx.acces.filter((a) => a.sorte === 'hebergeur')
    const clients = new Map<string, Resultat[]>()
    const constats: Constat[] = []
    for (const a of hebergees) {
      const client = domaineNomme(ctx, a.ressource)?.client
      if (client === undefined) {
        constats.push(constat('I-14', objetAcces(ctx, a), [inconnu('client du site hébergé')]))
        continue
      }
      if (clients.has(client)) continue
      const art28 = ctx.clients.get(client)?.contrat_art28
      clients.set(client, [
        art28 === true
          ? ok
          : art28 === false
            ? aVerifier(
                "site hébergé par l'agence, sans contrat de sous-traitance (article 28 du RGPD)",
              )
            : inconnu('contrat de sous-traitance (article 28 du RGPD)'),
      ])
    }
    return [...constats, ...[...clients].map(([client, r]) => constat('I-14', client, r))]
  },
}

/** Les contrôles de l'agence web, dans l'ordre du registre. */
export const CONTROLES: Controle<ContexteVeille>[] = [I01, I02, I03, I04, I07, I10, I11, I12, I14]
