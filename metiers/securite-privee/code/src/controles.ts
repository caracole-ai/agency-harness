import {
  type Constat,
  type Controle,
  type Couverture,
  couverture,
  dateFr,
  dureeHeures,
  FUSEAU,
  heuresDans,
  type Interdit,
  type Intervalle,
  limitePeriodique,
  parametresDe,
  plusGrave,
  reposHeures,
  selonReference,
  Temporal,
  type Verdict,
} from '@harnais/moteur'
import { NOMS_ACTIVITES, type Vacation } from './modele'
import {
  type Contexte,
  date,
  intervalleDe,
  jusquau,
  sousCarte,
  titresDeCarte,
  validite,
} from './semantique'

// Un contrôle par interdit du registre (`../../regles.yaml`). Chaque fonction
// rend son verdict brut ; le moteur le plafonne par le statut de la règle.

interface Resultat {
  verdict: Verdict
  motif: string
}

const ok: Resultat = { verdict: 'ok', motif: 'conforme' }

function constat(
  regle: string,
  objet: string,
  resultats: Resultat[],
  notes: string[] = [],
): Constat {
  const nonOk = resultats.filter((r) => r.verdict !== 'ok')
  return {
    regle,
    objet,
    verdict: resultats.reduce<Verdict>((v, r) => plusGrave(v, r.verdict), 'ok'),
    motif:
      nonOk.length > 0
        ? nonOk.map((r) => r.motif).join(' ; ')
        : // un « ok » qui dit ce qu'il a mesuré (le repos) garde son motif
          (resultats.find((r) => r.motif !== ok.motif)?.motif ?? ok.motif),
    ...(notes.length > 0 ? { notes } : {}),
  }
}

/** Un paramètre numérique du registre ; absent ou mal typé, le contrôle lève (et le moteur refuse). */
function nombre(parametres: Record<string, unknown>, cle: string): number {
  const v = parametres[cle]
  if (typeof v !== 'number') throw new Error(`paramètre ${cle} absent du registre`)
  return v
}

const heures = (h: number) => {
  const entieres = Math.floor(h)
  const minutes = Math.round((h - entieres) * 60)
  return minutes === 0 ? `${entieres} h` : `${entieres} h ${String(minutes).padStart(2, '0')}`
}

/**
 * Le verdict d'une couverture : un titre qui couvre une partie seulement de la vacation ne se tranche pas ici
 * (« à la date de la vacation » : au début, ou sur toute sa durée ? question au juriste, `REFLEXIONS.md`).
 * Le motif s'adresse à l'exploitation : rien sur la fabrication du harnais.
 */
function selonCouverture(c: Couverture, motifAucune: string, quoi: string): Resultat {
  if (c === 'entière') return ok
  if (c === 'partielle') {
    return {
      verdict: 'à vérifier',
      motif: `${quoi} cesse d'être valide pendant la vacation : à décider par l'exploitation`,
    }
  }
  return { verdict: 'refus', motif: motifAucune }
}

const inconnu = (quoi: string): Resultat => ({
  verdict: 'à vérifier',
  motif: `donnée absente : ${quoi} ; rien n'est supposé, à renseigner`,
})

/** La donnée qu'un motif « donnée absente » réclame, pour les regrouper ; sinon `undefined`. */
export const donneeAbsente = (motif: string) =>
  /^donnée absente : (.+?) ; rien n'est supposé/.exec(motif)?.[1]

export const I01: Controle<Contexte> = {
  regle: 'I-01',
  verifier: (ctx) =>
    sousCarte(ctx).map((v) => {
      const agent = ctx.agent(v.agent)
      if (!agent.cartePro) return constat('I-01', v.id, [inconnu('carte professionnelle')])
      const derniere = agent.cartePro.validites
        .map((x) => x.au)
        .filter((x) => x !== undefined)
        .sort()
        .at(-1)
      const r = selonCouverture(
        couverture(titresDeCarte(agent), intervalleDe(v)),
        `aucune carte valide ni récépissé à la date de la vacation${derniere ? ` (carte valide jusqu'au ${dateFr(date(derniere))})` : ''}`,
        'la carte professionnelle',
      )
      return constat('I-01', v.id, [r])
    }),
}

export const I02: Controle<Contexte> = {
  regle: 'I-02',
  verifier: (ctx) =>
    sousCarte(ctx).map((v) => {
      const activite = ctx.poste(v.poste).activite
      const carte = ctx.agent(v.agent).cartePro
      if (!carte) return constat('I-02', v.id, [inconnu('carte professionnelle')])
      if (activite && carte.activites.includes(activite)) return constat('I-02', v.id, [ok])
      return constat('I-02', v.id, [
        {
          verdict: 'refus',
          motif: `le poste demande l'activité « ${activite ? NOMS_ACTIVITES[activite] : 'inconnue'} », la carte porte : ${carte.activites.map((a) => NOMS_ACTIVITES[a]).join(' ; ')}`,
        },
      ])
    }),
}

export const I03: Controle<Contexte> = {
  regle: 'I-03',
  verifier: (ctx) =>
    sousCarte(ctx).map((v) => {
      const remise = ctx.agent(v.agent).carteEntrepriseRemise
      if (remise === undefined)
        return constat('I-03', v.id, [inconnu('carte entreprise remise ou non')])
      return constat('I-03', v.id, [
        remise
          ? ok
          : { verdict: 'refus', motif: "carte professionnelle propre à l'entreprise non remise" },
      ])
    }),
}

function doublure(ctx: Contexte, v: Vacation, interdit: Interdit): Resultat {
  if (v.doublure) return ok
  const poste = ctx.poste(v.poste)
  const p = parametresDe(interdit)
  const requises = poste.ssiap === 2 ? nombre(p, 'doublures_chef_equipe') : nombre(p, 'doublures')
  const ssiap = ctx.agent(v.agent).ssiap
  if (ssiap?.etablissementsTenus?.includes(poste.site)) return ok
  const debut = intervalleDe(v).debut
  const faites = ctx
    .vacationsDe(v.agent)
    .filter(
      (x) =>
        x.doublure &&
        ctx.poste(x.poste).site === poste.site &&
        Temporal.ZonedDateTime.compare(intervalleDe(x).fin, debut) <= 0,
    ).length
  if (faites >= requises) return ok
  if (ssiap?.etablissementsTenus === undefined) {
    return inconnu(
      `établissements où l'agent a fait ses doublures (${faites} sur ${requises} au planning)`,
    )
  }
  return {
    verdict: 'refus',
    motif: `${requises} périodes en doublure requises sur le site ${poste.site} avant de tenir le poste seul, ${faites} faites`,
  }
}

export const I04: Controle<Contexte> = {
  regle: 'I-04',
  verifier: (ctx, interdit) => {
    const p = parametresDe(interdit)
    return ctx.planning.vacations
      .filter((v) => ctx.poste(v.poste).ssiap !== undefined)
      .map((v) => {
        const requis = ctx.poste(v.poste).ssiap as number
        const agent = ctx.agent(v.agent)
        const i = intervalleDe(v)
        const r: Resultat[] = []
        if (!agent.ssiap) {
          r.push(inconnu('diplôme SSIAP'))
        } else {
          const s = agent.ssiap
          if (s.niveau < requis) {
            r.push({ verdict: 'refus', motif: `poste SSIAP ${requis}, agent SSIAP ${s.niveau}` })
          } else if (s.niveau > requis) {
            r.push({
              verdict: 'à vérifier',
              motif: `agent SSIAP ${s.niveau} sur un poste SSIAP ${requis} : à confirmer par l'exploitation`,
            })
          }
          const limite = limitePeriodique(
            date(s.diplome),
            { ans: nombre(p, 'recyclage_ssiap_ans') },
            s.recyclages.map(date),
          )
          r.push(
            selonCouverture(
              couverture([jusquau(date(s.diplome), limite)], i),
              `recyclage SSIAP échu le ${dateFr(limite)} : remise à niveau nécessaire`,
              'le recyclage SSIAP',
            ),
          )
          const min = nombre(p, 'heures_activite_36_mois_min')
          if (s.heuresActivite36Mois === undefined) {
            r.push(inconnu("heures d'activité sur les 36 derniers mois"))
          } else if (s.heuresActivite36Mois < min) {
            r.push({
              verdict: 'refus',
              motif: `${s.heuresActivite36Mois} h d'activité sur 36 mois, moins de ${min} h : remise à niveau nécessaire`,
            })
          }
          r.push(doublure(ctx, v, interdit))
        }
        if (!agent.secourisme) {
          r.push(inconnu('qualification de secourisme'))
        } else {
          const base = date(agent.secourisme.qualification)
          const limite = limitePeriodique(
            base,
            { ans: nombre(p, 'recyclage_secourisme_ans') },
            agent.secourisme.recyclages.map(date),
          )
          r.push(
            selonCouverture(
              couverture([jusquau(base, limite)], i),
              `secourisme échu le ${dateFr(limite)}`,
              'le secourisme',
            ),
          )
        }
        if (!agent.habilitationElectrique) {
          r.push(inconnu('habilitation électrique'))
        } else {
          r.push(
            selonCouverture(
              couverture([validite(agent.habilitationElectrique)], i),
              "pas d'habilitation électrique valide à la date de la vacation",
              "l'habilitation électrique",
            ),
          )
        }
        return constat('I-04', v.id, r.length > 0 ? r : [ok])
      })
  },
}

/** Les jours civils qu'une vacation touche, comme fenêtres de 0 h à 24 h, heure de Paris. */
function joursCivils(i: Intervalle): Intervalle[] {
  const jours: Intervalle[] = []
  let jour = i.debut.toPlainDate()
  while (Temporal.ZonedDateTime.compare(jour.toZonedDateTime({ timeZone: FUSEAU }), i.fin) < 0) {
    const suivant = jour.add({ days: 1 })
    jours.push({
      debut: jour.toZonedDateTime({ timeZone: FUSEAU }),
      fin: suivant.toZonedDateTime({ timeZone: FUSEAU }),
    })
    jour = suivant
  }
  return jours
}

interface Repos {
  resultat: Resultat
  notes: string[]
}

/**
 * Le repos entre deux vacations, sous chaque lecture d'I-05. La lecture de
 * référence (la loi générale) décide ; un autre texte qui conclut autrement
 * devient une note, sans changer le verdict.
 */
function repos(avant: Vacation, apres: Vacation, interdit: Interdit): Repos {
  const h = reposHeures(intervalleDe(avant), intervalleDe(apres))
  if (h < 0) {
    return {
      resultat: { verdict: 'refus', motif: `chevauche la vacation ${avant.id}` },
      notes: [],
    }
  }
  if (!interdit.lectures) throw new Error('I-05 : lectures absentes du registre')
  const passageConnu = avant.nature !== undefined && apres.nature !== undefined
  const passage = passageConnu && avant.nature !== apres.nature
  const lectures: Record<string, Verdict> = {}
  const minimum: Record<string, string> = {}
  for (const lecture of interdit.lectures) {
    const p = parametresDe(interdit, lecture)
    const sans = nombre(p, 'repos_min_h')
    const avec = nombre(p, 'repos_passage_nuit_jour_h')
    if (passageConnu) {
      const min = passage ? avec : sans
      lectures[lecture.id] = h < min ? 'refus' : 'ok'
      minimum[lecture.id] = heures(min)
    } else {
      // nature du service inconnue : on ne suppose ni passage ni absence de passage
      lectures[lecture.id] =
        h < sans && h < avec ? 'refus' : h < sans || h < avec ? 'à vérifier' : 'ok'
      minimum[lecture.id] =
        sans === avec
          ? heures(sans)
          : `${heures(sans)}, ou ${heures(avec)} au passage de nuit à jour`
    }
  }
  const { verdict, divergentes } = selonReference(interdit, lectures)
  const reference = interdit.lectures.find((l) => l.reference)
  const notes = divergentes.map(
    ({ lecture, verdict: v }) =>
      `${lecture.source} : minimum de ${minimum[lecture.id]}, ${v === 'refus' ? "que ce repos n'atteint pas" : v === 'ok' ? 'que ce repos atteint' : 'selon la nature du service'}`,
  )
  const repos = `${heures(h)} de repos depuis la vacation ${avant.id}`
  const regle = `minimum de ${reference ? minimum[reference.id] : '?'} (${reference?.source})`
  return {
    resultat:
      verdict === 'ok'
        ? { verdict, motif: `${repos} : conforme au ${regle}` }
        : { verdict, motif: `${repos}, sous le ${regle}` },
    notes,
  }
}

export const I05: Controle<Contexte> = {
  regle: 'I-05',
  nonCouvert: [
    'amplitude de 13 h sur une journée',
    '48 h par semaine',
    '46 h en moyenne sur 12 semaines',
    '24 h de repos après 48 h de travail',
  ],
  verifier: (ctx, interdit) => {
    const max = nombre(parametresDe(interdit), 'duree_max_h')
    return ctx.planning.agents.flatMap((agent) => {
      const vacations = ctx.vacationsDe(agent.id)
      const intervalles = vacations.map(intervalleDe)
      return vacations.map((v, k) => {
        const r: Resultat[] = []
        let notes: string[] = []
        const precedente = vacations[k - 1]
        if (precedente) {
          const rep = repos(precedente, v, interdit)
          r.push(rep.resultat)
          notes = rep.notes
        }
        const i = intervalleDe(v)
        const parService = dureeHeures(i) > max
        const parJour = joursCivils(i).some((j) => heuresDans(intervalles, j) > max)
        if (parService || parJour) {
          r.push({
            verdict: parService && parJour ? 'refus' : 'à vérifier',
            motif:
              parService && parJour
                ? `plus de ${max} h de travail, par service comme par jour civil`
                : `plus de ${max} h ${parService ? "d'affilée, mais pas sur un jour civil" : 'sur un jour civil, mais pas sur un service'} : à décider par l'exploitation`,
          })
        }
        return constat('I-05', v.id, r.length > 0 ? r : [ok], notes)
      })
    })
  },
}

export const I20: Controle<Contexte> = {
  regle: 'I-20',
  verifier: (ctx) =>
    sousCarte(ctx).map((v) => {
      const declare = ctx.agent(v.agent).declareDracar
      if (declare === undefined)
        return constat('I-20', v.id, [inconnu('déclaration dans Dracar Ultimate')])
      return constat('I-20', v.id, [
        declare
          ? ok
          : { verdict: 'refus', motif: 'agent non déclaré dans Dracar Ultimate (R631-15)' },
      ])
    }),
}

/** Les contrôles de la sécurité privée, dans l'ordre du registre. */
export const CONTROLES: Controle<Contexte>[] = [I01, I02, I03, I04, I05, I20]
