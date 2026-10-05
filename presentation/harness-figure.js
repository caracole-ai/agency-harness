/* Port autonome de smart-tailor/app/components/SheetHarness.vue + HarnessTabs.vue + app/data/harness.ts
   (état du 2026-10-05). Le moteur image par image est repris tel quel ; seuls Vue, i18n et GSAP
   sont remplacés par du DOM, un dictionnaire et requestAnimationFrame. */
(function () {
  'use strict';

  // ---------------- les textes (home.json5, harness.*) ----------------
  var STRINGS = {
    harness: {
      consolidation: 'Consolidation',
      approval: 'Approbation humaine',
      tabs: 'Le harnais, par métier',
      legend: { tools: 'Vos outils existants', harness: 'Votre harnais sur-mesure' },
      vente: {
        tab: 'Commerce biens et services',
        tools: { erp: 'ERP', planning: 'Planning', email: 'Email', catalogue: 'Catalogue' },
        checks: { audit: 'Audit', invariants: 'Invariants', seuils: 'Seuils', interdits: 'Interdits', conformite: 'Conformités', reviewAdverse: 'Review adverse' },
        people: { employe: 'Employé', gerant: 'Gérant' },
        tasks: { sav: ['Mail SAV'], appelOffres: ['Réponse à', 'appel d’offres'], relance: ['Relance', 'd’impayé'], administratif: ['Mail', 'administratif', 'urgent'] }
      },
      avocats: {
        tab: 'Cabinet d’avocats',
        tools: { jurisprudence: 'Jurisprudence', dossiers: 'Dossiers', email: 'Email', echeancier: 'Échéancier' },
        checks: { ambiguite: 'Ambiguïtés', juridictions: 'Juridictions', hierarchie: ['Hiérarchie', 'des normes'], temporalite: 'Temporalité', jurisprudence: ['Jurisprudences', 'contradictoires'], interpretation: 'Interprétations', analogies: 'Analogies', contreArguments: ['Contre-', 'arguments'] },
        people: { avocat: 'Avocat', associe: 'Associé' },
        tasks: { consultation: ['Note de', 'consultation'], conclusions: ['Conclusions', 'en réponse'], delai: ['Délai', 'd’appel'], contrat: ['Revue', 'de contrat'] }
      },
      securite: {
        tab: 'Société de sécurité',
        tools: { planning: 'Planning', agents: 'Agents', telephonie: 'Téléphonie', sites: 'Sites' },
        checks: { qualification: 'Qualification', disponibilite: 'Disponibilité', horaires: 'Horaires', repos: 'Repos', affectation: 'Affectation', remplacement: 'Remplacement', contrat: 'Contrat' },
        people: { permanence: 'Permanence', gerant: 'Gérant' },
        tasks: { desistement: ['Désistement', 'de ce soir'], nouveauSite: ['Nouveau site', 'à couvrir'], cartePro: ['Carte pro', 'à échéance'], renfort: ['Demande', 'de renfort'] }
      },
      logistique: {
        tab: 'Transport et logistique',
        tools: { tms: 'TMS', scans: 'Scans', email: 'Email', clients: 'Clients' },
        checks: { lisibilite: 'Lisibilité', rapprochement: 'Rapprochement', completude: 'Complétude', cotation: 'Cotation', exigences: ['Exigences', 'client'], delais: 'Délais', reserves: 'Réserves' },
        people: { exploitant: 'Exploitant', gerant: 'Gérant' },
        tasks: { bl: ['BL à intégrer'], reserves: ['CMR avec', 'réserves'], incomplet: ['Dossier', 'incomplet'], avarie: ['Colis', 'endommagé'] }
      },
      etudes: {
        tab: 'Bureau d’études',
        tools: { affaires: 'Affaires', tableurs: 'Tableurs', normes: 'Normes', rapports: 'Rapports' },
        checks: { completude: 'Complétude', hypotheses: 'Hypothèses', versions: ['Version', 'des normes'], sources: 'Sources', conformite: 'Conformité', verifications: 'Vérifications', modele: 'Modèle' },
        people: { ingenieur: 'Ingénieur', gerant: 'Gérant' },
        tasks: { rapport: ['Rapport', 'à préparer'], normeRevisee: ['Norme', 'révisée'], noteJunior: ['Note', 'du junior'], ecart: ['Écart', 'à la norme'] }
      }
    }
  };
  function lookup(key) { return key.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, STRINGS); }
  function t(key) { var v = lookup(key); return Array.isArray(v) ? v.join(' ') : (v == null ? key : v); }
  function isList(key) { return Array.isArray(lookup(key)); }
  function strings(key) { var v = lookup(key); return Array.isArray(v) ? v.slice() : [v == null ? key : v]; }

  // ---------------- les profils (app/data/harness.ts) ----------------
  var HARNESS_PROFILES = [
    { id: 'vente',
      tools: [{ id: 'erp', glyph: 'sheet' }, { id: 'planning', glyph: 'calendar' }, { id: 'email', glyph: 'mail' }, { id: 'catalogue', glyph: 'binder' }],
      top: ['audit', 'invariants', 'seuils', 'interdits'], right: ['conformite', 'reviewAdverse'], gauge: 'seuils', barrier: 'interdits', people: ['employe', 'gerant'],
      tasks: [
        { id: 'sav', reads: ['email', 'catalogue'], by: 'employe', writes: ['email', 'planning'] },
        { id: 'appelOffres', reads: ['email', 'catalogue', 'planning', 'erp'], by: 'gerant', writes: ['email', 'erp', 'planning'] },
        { id: 'relance', reads: ['erp', 'email'], by: 'employe', writes: ['email', 'erp'] },
        { id: 'administratif', reads: ['email', 'erp'], by: 'gerant', writes: ['email', 'planning'] }] },
    { id: 'avocats',
      tools: [{ id: 'jurisprudence', glyph: 'books' }, { id: 'dossiers', glyph: 'binder' }, { id: 'email', glyph: 'mail' }, { id: 'echeancier', glyph: 'calendar' }],
      top: ['ambiguite', 'juridictions', 'hierarchie', 'temporalite'], right: ['jurisprudence', 'interpretation', 'analogies', 'contreArguments'], gauge: 'ambiguite', barrier: 'temporalite', people: ['avocat', 'associe'],
      tasks: [
        { id: 'consultation', reads: ['dossiers', 'jurisprudence'], by: 'avocat', writes: ['dossiers'] },
        { id: 'conclusions', reads: ['email', 'dossiers', 'jurisprudence', 'echeancier'], by: 'associe', writes: ['dossiers', 'echeancier'] },
        { id: 'delai', reads: ['email', 'echeancier'], by: 'avocat', writes: ['echeancier', 'dossiers'] },
        { id: 'contrat', reads: ['dossiers', 'jurisprudence'], by: 'associe', writes: ['dossiers'] }] },
    { id: 'securite',
      tools: [{ id: 'planning', glyph: 'calendar' }, { id: 'agents', glyph: 'binder' }, { id: 'telephonie', glyph: 'phone' }, { id: 'sites', glyph: 'sheet' }],
      top: ['qualification', 'disponibilite', 'horaires', 'repos'], right: ['affectation', 'remplacement', 'contrat'], gauge: 'contrat', barrier: 'qualification', people: ['permanence', 'gerant'],
      tasks: [
        { id: 'desistement', reads: ['planning', 'agents', 'telephonie'], by: 'permanence', writes: ['planning', 'telephonie'] },
        { id: 'nouveauSite', reads: ['sites', 'agents', 'planning'], by: 'gerant', writes: ['planning', 'sites'] },
        { id: 'cartePro', reads: ['agents', 'planning'], by: 'permanence', writes: ['agents', 'telephonie'] },
        { id: 'renfort', reads: ['telephonie', 'sites', 'planning', 'agents'], by: 'gerant', writes: ['planning', 'telephonie'] }] },
    { id: 'logistique',
      tools: [{ id: 'tms', glyph: 'sheet' }, { id: 'scans', glyph: 'document' }, { id: 'email', glyph: 'mail' }, { id: 'clients', glyph: 'binder' }],
      top: ['lisibilite', 'rapprochement', 'completude', 'cotation'], right: ['exigences', 'delais', 'reserves'], gauge: 'reserves', barrier: 'cotation', people: ['exploitant', 'gerant'],
      tasks: [
        { id: 'bl', reads: ['scans', 'tms'], by: 'exploitant', writes: ['tms'] },
        { id: 'reserves', reads: ['scans', 'tms', 'clients'], by: 'gerant', writes: ['email', 'tms'] },
        { id: 'incomplet', reads: ['tms', 'scans', 'email'], by: 'exploitant', writes: ['email', 'tms'] },
        { id: 'avarie', reads: ['email', 'scans', 'clients', 'tms'], by: 'gerant', writes: ['email', 'tms'] }] },
    { id: 'etudes',
      tools: [{ id: 'affaires', glyph: 'binder' }, { id: 'tableurs', glyph: 'sheet' }, { id: 'normes', glyph: 'books' }, { id: 'rapports', glyph: 'document' }],
      top: ['completude', 'hypotheses', 'versions', 'sources'], right: ['conformite', 'verifications', 'modele'], gauge: 'conformite', barrier: 'hypotheses', people: ['ingenieur', 'gerant'],
      tasks: [
        { id: 'rapport', reads: ['affaires', 'tableurs', 'rapports'], by: 'ingenieur', writes: ['rapports'] },
        { id: 'normeRevisee', reads: ['normes', 'affaires'], by: 'gerant', writes: ['affaires'] },
        { id: 'noteJunior', reads: ['rapports', 'normes', 'tableurs'], by: 'ingenieur', writes: ['rapports'] },
        { id: 'ecart', reads: ['tableurs', 'normes', 'affaires', 'rapports'], by: 'gerant', writes: ['rapports', 'affaires'] }] }
  ];
  function harnessProfile(id) { for (var i = 0; i < HARNESS_PROFILES.length; i++) if (HARNESS_PROFILES[i].id === id) return HARNESS_PROFILES[i]; return HARNESS_PROFILES[0]; }

  // ---------------- DOM SVG ----------------
  var NS = 'http://www.w3.org/2000/svg';
  var uidCounter = 0;
  function S(tag, attrs, parent) {
    var el = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) { if (attrs[k] !== undefined && attrs[k] !== null) el.setAttribute(k, String(attrs[k])); }
    if (parent) parent.appendChild(el);
    return el;
  }
  function TXT(el, s) { el.appendChild(document.createTextNode(s)); return el; }

  // ---------------- la figure ----------------
  function mountHarness(host, profileId, entrance) {
    var PROFILE = harnessProfile(profileId);
    var copy = function (path) { return 'harness.' + PROFILE.id + '.' + path; };
    var uid = 'hh' + (++uidCounter);
    var readClip = function (i) { return 'hh-read-' + uid + '-' + i; };
    var queueFade = 'hh-queue-fade-' + uid, queueMask = 'hh-queue-mask-' + uid;

    var HARNESS_W = 368, SIDE = { left: 104, right: 104 };
    var BOX = { width: SIDE.left + HARNESS_W + SIDE.right, height: 296 };
    var VIEWBOX = '0 0 ' + BOX.width + ' ' + BOX.height;
    var FRAME = { x0: SIDE.left, x1: SIDE.left + HARNESS_W, y0: 46, y1: 246, band: 7 };
    var inset = function (d) { return { x0: FRAME.x0 + d, x1: FRAME.x1 - d, y0: FRAME.y0 + d, y1: FRAME.y1 - d }; };
    var loopPath = function (r) { return 'M' + r.x0 + ' ' + r.y0 + 'H' + r.x1 + 'V' + r.y1 + 'H' + r.x0 + 'Z'; };
    var loopLength = function (r) { return 2 * ((r.x1 - r.x0) + (r.y1 - r.y0)); };
    var OUTER = inset(0), INNER = inset(FRAME.band), AXIS = inset(FRAME.band / 2);
    var AXIS_W = AXIS.x1 - AXIS.x0, AXIS_H = AXIS.y1 - AXIS.y0;
    var PERIMETER = loopLength(AXIS);
    var STRAP_LENGTHS = [loopLength(OUTER), loopLength(INNER), PERIMETER];
    var CX = (FRAME.x0 + FRAME.x1) / 2, CY = (FRAME.y0 + FRAME.y1) / 2;
    var mod = function (v, m) { return ((v % m) + m) % m; };
    var along = function (x, top) { return top ? x - AXIS.x0 : AXIS_W + AXIS_H + (AXIS.x1 - x); };
    function axisPoint(s) {
      var d = mod(s, PERIMETER);
      if (d < AXIS_W) return [AXIS.x0 + d, AXIS.y0];
      if (d < AXIS_W + AXIS_H) return [AXIS.x1, AXIS.y0 + d - AXIS_W];
      if (d < 2 * AXIS_W + AXIS_H) return [AXIS.x1 - (d - AXIS_W - AXIS_H), AXIS.y1];
      return [AXIS.x0, AXIS.y1 - (d - 2 * AXIS_W - AXIS_H)];
    }
    var segmentDash = function (a, b) { return '0 ' + Math.max(0, a).toFixed(2) + ' ' + Math.max(0, b - a).toFixed(2) + ' ' + PERIMETER; };
    function arcDash(a, b) {
      var lo = mod(a, PERIMETER), hi = lo + Math.min(PERIMETER, Math.max(0, b - a));
      if (hi <= PERIMETER) return segmentDash(lo, hi);
      var head = hi - PERIMETER;
      return head.toFixed(2) + ' ' + (lo - head).toFixed(2) + ' ' + (PERIMETER - lo).toFixed(2) + ' ' + PERIMETER;
    }
    var alongSide = function (y, right) { return right ? AXIS_W + (y - AXIS.y0) : 2 * AXIS_W + AXIS_H + (AXIS.y1 - y); };
    var gate = function (id, x, top) { return { id: id, x: x, y: top ? AXIS.y0 : AXIS.y1, side: top ? 'top' : 'bottom', s: along(x, top) }; };
    var sideGate = function (id, right, y) { if (y === undefined) y = CY; return { id: id, x: right ? AXIS.x1 : AXIS.x0, y: y, side: right ? 'right' : 'left', s: alongSide(y, right) }; };
    var CONSOLIDATION = 'consolidation';
    var TOP_STEPS = PROFILE.top, RIGHT_STEPS = PROFILE.right.concat([CONSOLIDATION]);
    var topX = function (k) { return FRAME.x0 + (HARNESS_W * (k + 0.5)) / TOP_STEPS.length; };
    var rightY = function (k) { return AXIS.y0 + (AXIS_H * (k + 0.5)) / RIGHT_STEPS.length; };
    var CHECKS = [sideGate('tache', false)].concat(TOP_STEPS.map(function (id, k) { return gate(id, topX(k), true); }), RIGHT_STEPS.map(function (id, k) { return sideGate(id, true, rightY(k)); }), [gate('approbation', CX, false)]);
    var CHECK = { half: 5, core: 2.25, label: 12.5, labelBelow: 19.5, labelSide: 11, line: 1.25, capMid: 0.35, ringOpacity: 0.85, spin: 7, spinDash: 9 };
    var SPIN_PERIMETER = 8 * CHECK.spin;
    var checkIndex = function (id) { for (var i = 0; i < CHECKS.length; i++) if (CHECKS[i].id === id) return i; return -1; };
    var TASK_GATE = checkIndex('tache'), TASK = CHECKS[TASK_GATE];
    var GAUGED = CHECKS[checkIndex(PROFILE.gauge)], BARRED = CHECKS[checkIndex(PROFILE.barrier)], APPROVAL = CHECKS[checkIndex('approbation')];
    var SHARED_CHECKS = { consolidation: 'harness.consolidation', approbation: 'harness.approval' };
    var checkKey = function (c) { return SHARED_CHECKS[c.id] || copy('checks.' + c.id); };
    var CHECK_LINES = CHECKS.map(function (c) { return c === TASK ? [] : isList(checkKey(c)) ? strings(checkKey(c)) : [t(checkKey(c))]; });
    var sideDy = function (n, k) { return (k ? CHECK.line : CHECK.capMid - ((n - 1) * CHECK.line) / 2).toFixed(3) + 'em'; };
    var rowDy = function (top, n, k) { return k ? CHECK.line + 'em' : top && n > 1 ? (-(n - 1) * CHECK.line).toFixed(3) + 'em' : undefined; };
    var LABELS = CHECKS.map(function (c, i) {
      var n = CHECK_LINES[i].length;
      return c.side === 'top' || c.side === 'bottom'
        ? { x: 0, y: c.side === 'top' ? -CHECK.label : CHECK.labelBelow, anchor: 'middle', dy: CHECK_LINES[i].map(function (_, k) { return rowDy(c.side === 'top', n, k); }) }
        : { x: (c.side === 'left' ? -1 : 1) * CHECK.labelSide, y: 0, anchor: c.side === 'left' ? 'end' : 'start', dy: CHECK_LINES[i].map(function (_, k) { return sideDy(n, k); }) };
    });
    var MARK = { level: 0.6, gap: 1, tick: 2 };
    var MARK_Y = CHECK.half - 2 * CHECK.half * MARK.level;
    var BAR = { x: -(CHECK.half + 3), half: FRAME.band / 2 + 2 };
    var CARD = { w: 14, h: 10 };
    var BAR_REACH = -BAR.x + CARD.w / 2 + 0.5;

    var TILE = 23, TOOL_SCALE = 0.62, TILE_EDGE = TILE * TOOL_SCALE;
    var PLACES = [{ x: CX - 72, y: CY - 44, side: -1 }, { x: CX + 72, y: CY - 44, side: 1 }, { x: CX - 72, y: CY + 44, side: -1 }, { x: CX + 72, y: CY + 44, side: 1 }];
    var TOOLS = PROFILE.tools.map(function (o, i) { return { id: o.id, glyph: o.glyph, x: PLACES[i].x, y: PLACES[i].y, side: PLACES[i].side }; });
    var toolIndex = function (id) { for (var i = 0; i < TOOLS.length; i++) if (TOOLS[i].id === id) return i; return -1; };
    var glyphIndex = function (g) { for (var i = 0; i < TOOLS.length; i++) if (TOOLS[i].glyph === g) return i; return -1; };
    var TOP_LEFT = PLACES[0], TOP_RIGHT = PLACES[1], BOTTOM_LEFT = PLACES[2], BOTTOM_RIGHT = PLACES[3];
    var TOWARD = TOOLS.map(function (o) { return o.y < CY ? 1 : -1; });
    var GLYPH_LAYERS = ['base', 'read'], GLYPH_SCALE = 0.8;

    var withLength = function (l) { l.len = Math.hypot(l.x2 - l.x1, l.y2 - l.y1); return l; };
    var LINKS = [
      { x1: TOP_LEFT.x + TILE_EDGE, y1: TOP_LEFT.y, x2: TOP_RIGHT.x - TILE_EDGE, y2: TOP_RIGHT.y },
      { x1: TOP_RIGHT.x, y1: TOP_RIGHT.y + TILE_EDGE, x2: BOTTOM_RIGHT.x, y2: BOTTOM_RIGHT.y - TILE_EDGE },
      { x1: BOTTOM_LEFT.x + TILE_EDGE, y1: BOTTOM_LEFT.y, x2: BOTTOM_RIGHT.x - TILE_EDGE, y2: BOTTOM_RIGHT.y },
      { x1: TOP_LEFT.x, y1: TOP_LEFT.y + TILE_EDGE, x2: BOTTOM_LEFT.x, y2: BOTTOM_LEFT.y - TILE_EDGE }
    ].map(withLength);
    var PACKETS = [];
    LINKS.forEach(function (_, i) { [0, 1].forEach(function (dir) { PACKETS.push({ link: i, dir: dir, offset: i * 0.9 + dir * 1.7, gap: 0.7 + ((i * 7 + dir * 3) % 5) * 0.35 }); }); });
    var PACKET = { speed: 40, size: 2.4, ghosts: 3, ghostLag: 0.07 };

    var HUB = { r: 10, needleIn: 8, needleOut: 3, dotPeriod: 3, appear: 0.15, turn: 0.5, overshoot: 1.4, fade: 0.3, ping: 2.1, pulse: 0.25 };
    var BRAIN = { grid: 256, cx: 128, cy: 124, width: 240, size: 12.5, d: 'M248,124a56.11,56.11,0,0,0-32-50.61V72a48,48,0,0,0-88-26.49A48,48,0,0,0,40,72v1.39a56,56,0,0,0,0,101.2V176a48,48,0,0,0,88,26.49A48,48,0,0,0,216,176v-1.41A56.09,56.09,0,0,0,248,124ZM88,208a32,32,0,0,1-31.81-28.56A55.87,55.87,0,0,0,64,180h8a8,8,0,0,0,0-16H64A40,40,0,0,1,50.67,86.27,8,8,0,0,0,56,78.73V72a32,32,0,0,1,64,0v68.26A47.8,47.8,0,0,0,88,128a8,8,0,0,0,0,16,32,32,0,0,1,0,64Zm104-44h-8a8,8,0,0,0,0,16h8a55.87,55.87,0,0,0,7.81-.56A32,32,0,1,1,168,144a8,8,0,0,0,0-16,47.8,47.8,0,0,0-32,12.26V72a32,32,0,0,1,64,0v6.73a8,8,0,0,0,5.33,7.54A40,40,0,0,1,192,164Zm16-52a8,8,0,0,1-8,8h-4a36,36,0,0,1-36-36V80a8,8,0,0,1,16,0v4a20,20,0,0,0,20,20h4A8,8,0,0,1,208,112ZM60,120H56a8,8,0,0,1,0-16h4A20,20,0,0,0,80,84V80a8,8,0,0,1,16,0v4A36,36,0,0,1,60,120Z' };
    var BRAIN_TRANSFORM = 'scale(' + BRAIN.size / BRAIN.width + ') translate(' + (-BRAIN.cx) + ' ' + (-BRAIN.cy) + ')';
    var HUB_DASH = (function () { var c = 2 * Math.PI * HUB.r; var period = c / Math.round(c / HUB.dotPeriod); return '1 ' + (period - 1).toFixed(3); })();
    var headingTo = function (x, y) { return (Math.atan2(y - CY, x - CX) * 180) / Math.PI; };
    var hubEdge = function (a, d) { d = d || 0; var rad = (a * Math.PI) / 180; return [CX + Math.cos(rad) * (HUB.r + d), CY + Math.sin(rad) * (HUB.r + d)]; };
    var SPOKES = TOOLS.map(function (o) {
      var x = o.x - Math.sign(o.x - CX) * TILE_EDGE, y = o.y - Math.sign(o.y - CY) * TILE_EDGE;
      var p = hubEdge(headingTo(x, y), 1);
      return withLength({ x1: p[0], y1: p[1], x2: x, y2: y });
    });
    var WRITE_INTO = 5;
    var WRITES = SPOKES.map(function (l) { var k = 1 + WRITE_INTO / l.len; return withLength({ x1: l.x1, y1: l.y1, x2: l.x1 + (l.x2 - l.x1) * k, y2: l.y1 + (l.y2 - l.y1) * k }); });
    var CALL = withLength({ x1: TASK.x + CHECK.half, y1: TASK.y, x2: CX - HUB.r, y2: CY });
    var CALL_BACK = withLength({ x1: CALL.x2, y1: CALL.y2, x2: CALL.x1, y2: CALL.y1 });
    var HEADING_TASK = headingTo(TASK.x, TASK.y);
    var RISE = withLength({ x1: APPROVAL.x, y1: APPROVAL.y, x2: CX, y2: CY + HUB.r });
    var READ_SQ = 2.2;

    var SHEET = { cols: 3, rows: 4, w: 6, h: 4, gap: 2, step: 0.42 };
    var SHEET_X0 = -(SHEET.cols * SHEET.w + (SHEET.cols - 1) * SHEET.gap) / 2, SHEET_Y0 = -(SHEET.rows * SHEET.h + (SHEET.rows - 1) * SHEET.gap) / 2;
    var SHEET_CELLS = []; for (var ci = 0; ci < SHEET.cols * SHEET.rows; ci++) SHEET_CELLS.push({ x: SHEET_X0 + (ci % SHEET.cols) * (SHEET.w + SHEET.gap), y: SHEET_Y0 + Math.floor(ci / SHEET.cols) * (SHEET.h + SHEET.gap), head: ci < SHEET.cols });
    var SHEET_BODY = SHEET_CELLS.filter(function (c) { return !c.head; });
    var CAL = { x0: -12, y0: -11, w: 24, h: 22, band: 5, cols: 4, rows: 3, day: 3, step: 0.6 };
    var CAL_DAYS = []; for (var di = 0; di < CAL.cols * CAL.rows; di++) CAL_DAYS.push({ x: CAL.x0 + 3 + (di % CAL.cols) * 5.4, y: CAL.y0 + CAL.band + 2.5 + Math.floor(di / CAL.cols) * 4.7 });
    var LETTER = { period: 2.8, rise: 5, lift: 8 };
    var BINDER = { x0: -9, y0: -12, w: 18, h: 24, spine: -5.5 };
    var ENTRY = { thumbX: -3, thumb: 3, lineX: 1.5 };
    var ENTRIES = [{ y: -6, w: 5.5 }, { y: 0, w: 4 }, { y: 6, w: 5.5 }];
    var SHELF = { y: 10, x0: -11, x1: 11, lift: 3, step: 0.9, band: 3 };
    var BOOKS = [{ x: -10, w: 4, h: 17 }, { x: -5.25, w: 5, h: 20 }, { x: 0.5, w: 4, h: 15 }, { x: 5.5, w: 5, h: 18 }];
    var PHONE = { x0: -6.5, y0: -11, w: 13, h: 22, period: 3.2, ring: 0.9, lag: 0.15 };
    var WAVES = [{ d: 'M9 -3Q10.5 0 9 3', rank: 0 }, { d: 'M11.5 -5.5Q14 0 11.5 5.5', rank: 1 }, { d: 'M-9 -3Q-10.5 0 -9 3', rank: 0 }, { d: 'M-11.5 -5.5Q-14 0 -11.5 5.5', rank: 1 }];
    var DOC = { d: 'M-8 -11H4L8 -7V11H-8Z', fold: 'M4 -11V-7H8', sign: 'M-5 7.5Q-3.5 4 -2 7.5T1 7.5T4 6.5', period: 3.6, draw: 0.8, fade: 0.3 };
    var DOC_LINES = [{ y: -5, w: 8 }, { y: -2, w: 10 }, { y: 1, w: 6 }];

    var PERSON = { y: APPROVAL.y + 33.5, gap: 28, name: 15 };
    var PEOPLE = PROFILE.people.map(function (id, k) { return { id: id, x: APPROVAL.x + (k ? 1 : -1) * PERSON.gap }; });
    var GAUGE = [0.35, 1];
    var TASKS = PROFILE.tasks;
    var TASK_LINES = TASKS.map(function (k) { return strings(copy('tasks.' + k.id)); });
    var QUEUE = { slot: 40, rest: 0.45, scroll: 0.6, fade: 2 };
    var QUEUE_X = TASK.x - CHECK.labelSide;
    var QUEUE_STOPS = [{ at: 0.03, o: 0 }, { at: 0.32, o: 1 }, { at: 0.68, o: 1 }, { at: 0.97, o: 0 }];
    var queueSlot = function (j, q) { return mod(j - q + TASKS.length / 2, TASKS.length) - TASKS.length / 2; };
    var queueY = function (j, q) { return CY + queueSlot(j, q) * QUEUE.slot; };
    var queueOpacity = function (j, q) { return 1 - (1 - QUEUE.rest) * Math.min(1, Math.abs(queueSlot(j, q))); };
    var LEGEND = { x: BOX.width, y: FRAME.y1 + 28, line: 16, swatch: 6, gap: 6, mid: 0.32 };
    var LEGEND_ROWS = ['tools', 'harness'];

    var THINK = { absorb: 0.2, emerge: 0.15, dur: 0.7, check: 0.45, task: 0.35, seuils: 0.7, decide: 0.9, audit: 0.5, laps: 1.5, kick: 0.25, edge: 0.12 };
    var stopFor = function (c) { if (c === BARRED) return THINK.dur; if (c === GAUGED) return THINK.seuils; if (c === APPROVAL) return THINK.decide; if (c.id === 'audit') return THINK.audit; if (c === TASK) return THINK.task; return THINK.check; };
    var READ = { out: 0.4, scan: 0.55, back: 0.4, step: 0.3, trail: 0.4, fade: 0.5 };
    var READ_T = { scan: READ.out, back: READ.out + READ.scan, home: READ.out + READ.scan + READ.back, end: READ.out + READ.scan + READ.back + READ.trail };
    var SCAN_WASH = 6;
    var PACE = { strap: 330, call: 0.55, spoke: 0.5, dispatch: 0.2 };
    var BEAT = { arrive: 0.3, lead: 0.2, gap: 0.15, gaugeLag: 0.05, gaugeDur: 0.5, close: 0.3, lift: 0.25, linger: 0.8, out: 0.5, blank: 1 };
    var ROUTE = CHECKS.map(function (c, i) { return { i: i, s: TASK.s + (i === TASK_GATE ? PERIMETER : mod(c.s - TASK.s, PERIMETER)) }; }).sort(function (a, b) { return a.s - b.s; });
    var across = function (line, t0, dur) { return { t0: t0, t1: t0 + dur, line: line, s0: 0, s1: 0, keep: false }; };
    var onStrap = function (s0, s1, t0, keep) { return { t0: t0, t1: t0 + (s1 - s0) / PACE.strap, line: null, s0: s0, s1: s1, keep: !!keep }; };
    var HUB_STOP = -1;
    var BOOT = { strap: 0.1, strapDur: 1.2, gatePop: 0.45, scramble: 0.6, tools: 0.45, toolStep: 0.1, toolDur: 0.7, hub: 0.85, names: 0.8, links: 0.9, linksDur: 0.6, stitch: 1.0, foot: 1.3, fadeDur: 0.5, ambient: 1.5, ambientDur: 0.6, end: 1.9 };
    var BOOT_SCRAMBLE = BOOT.scramble;

    function plan(task) {
      var card = [], halts = [];
      var arrive = BEAT.arrive;
      var now = arrive + BOOT_SCRAMBLE + BEAT.lead;
      card.push(across(CALL, now, PACE.call)); now += PACE.call;
      halts.push({ gate: HUB_STOP, at: now, dur: 0 });
      var reads = task.reads.map(function (id, k) { return { tool: toolIndex(id), t0: now + BEAT.gap + k * READ.step }; });
      var readsHome = Math.max.apply(null, reads.map(function (r) { return r.t0 + READ_T.home; }));
      var aim = readsHome + BEAT.gap;
      now = aim + HUB.appear + HUB.turn;
      card.push(across(CALL_BACK, now, PACE.call)); now += PACE.call;
      halts.push({ gate: TASK_GATE, at: now, dur: THINK.task }); now += THINK.task;
      var from = TASK.s, seuilsIn = -1, approvalIn = -1, approve = -1;
      var test = { close: -1, at: -1, open: -1 };
      for (var r = 0; r < ROUTE.length; r++) {
        var step = ROUTE[r], c = CHECKS[step.i], dur = stopFor(c);
        if (c === BARRED) {
          var mb = onStrap(from, step.s - BAR_REACH, now, true); card.push(mb); now = mb.t1;
          halts.push({ gate: step.i, at: now, dur: dur });
          test = { close: now - BEAT.close, at: now, open: now + dur };
          now += dur + BEAT.lift; from = step.s - BAR_REACH; continue;
        }
        var m = onStrap(from, step.s, now); card.push(m); now = m.t1;
        halts.push({ gate: step.i, at: now, dur: dur });
        if (c === GAUGED) seuilsIn = now;
        now += dur; from = step.s;
        if (c === APPROVAL) { approvalIn = m.t1; approve = now; break; }
      }
      var rise = now;
      card.push(across(RISE, now, PACE.call)); now += PACE.call;
      halts.push({ gate: HUB_STOP, at: now, dur: 0 });
      var dispatch = task.writes.map(function (id, k) { var t0 = now + BEAT.gap + k * PACE.dispatch; return { tool: toolIndex(id), t0: t0, t1: t0 + PACE.spoke }; });
      var end = Math.max.apply(null, dispatch.map(function (d) { return d.t1; }));
      var labelOut = end + BEAT.linger;
      var writtenAt = TOOLS.map(function (_, i) { var d = null; for (var q = 0; q < dispatch.length; q++) if (dispatch[q].tool === i) { d = dispatch[q]; break; } return d ? d.t1 : -1; });
      return { task: task, gauge: GAUGE[PROFILE.people.indexOf(task.by)], card: card, halts: halts, reads: reads, aim: aim, arrive: arrive, seuilsIn: seuilsIn, approvalIn: approvalIn, approve: approve, test: test, rise: rise, dispatch: dispatch, writtenAt: writtenAt, end: end, labelOut: labelOut, length: labelOut + BEAT.out + BEAT.blank };
    }
    var PLANS = TASKS.map(plan);
    var STARTS = PLANS.map(function (_, k) { var sum = 0; for (var q = 0; q < k; q++) sum += PLANS[q].length; return sum; });
    var LOOP = PLANS.reduce(function (sum, p) { return sum + p.length; }, 0);
    var ARM_RATIO = 0.35;

    // ---------------- le balisage ----------------
    var root = document.createElement('div'); root.className = 'hh';
    var svg = S('svg', { 'class': 'hh__svg', viewBox: VIEWBOX, 'aria-hidden': 'true', focusable: 'false' }, root);
    var defs = S('defs', null, svg);
    var grad = S('linearGradient', { id: queueFade, gradientUnits: 'userSpaceOnUse', x1: 0, y1: CY - QUEUE.fade * QUEUE.slot, x2: 0, y2: CY + QUEUE.fade * QUEUE.slot }, defs);
    QUEUE_STOPS.forEach(function (st) { S('stop', { 'class': 'hh__fadeStop', offset: st.at, 'stop-opacity': st.o }, grad); });
    var mask = S('mask', { id: queueMask, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: FRAME.x0, height: BOX.height }, defs);
    S('rect', { x: 0, y: CY - QUEUE.fade * QUEUE.slot, width: FRAME.x0, height: 2 * QUEUE.fade * QUEUE.slot, fill: 'url(#' + queueFade + ')' }, mask);

    S('path', { 'class': 'hh__band', d: loopPath(AXIS), 'stroke-width': FRAME.band }, svg);
    S('path', { 'class': 'hh__wash', d: loopPath(AXIS), 'stroke-width': FRAME.band - 1, 'stroke-dasharray': segmentDash(0, 0), opacity: 0 }, svg);
    S('rect', { 'class': 'hh__strap', x: OUTER.x0, y: OUTER.y0, width: OUTER.x1 - OUTER.x0, height: OUTER.y1 - OUTER.y0 }, svg);
    S('rect', { 'class': 'hh__strapInner', x: INNER.x0, y: INNER.y0, width: INNER.x1 - INNER.x0, height: INNER.y1 - INNER.y0 }, svg);
    S('path', { 'class': 'hh__stitch', d: loopPath(AXIS) }, svg);
    LINKS.forEach(function (l) { S('line', { 'class': 'hh__link', x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2 }, svg); });
    var ports = S('g', { 'class': 'hh__ports' }, svg);
    LINKS.forEach(function (l) { S('rect', { 'class': 'hh__port', x: l.x1 - 1, y: l.y1 - 1, width: 2, height: 2 }, ports); S('rect', { 'class': 'hh__port', x: l.x2 - 1, y: l.y2 - 1, width: 2, height: 2 }, ports); });
    S('line', { 'class': 'hh__call', x1: CALL.x1, y1: CALL.y1, x2: CALL.x2, y2: CALL.y2, 'stroke-dasharray': CALL.len + ' ' + CALL.len, 'stroke-dashoffset': CALL.len, opacity: 0 }, svg);
    S('line', { 'class': 'hh__rise', x1: RISE.x1, y1: RISE.y1, x2: RISE.x2, y2: RISE.y2, 'stroke-dasharray': RISE.len + ' ' + RISE.len, 'stroke-dashoffset': RISE.len, opacity: 0 }, svg);
    SPOKES.forEach(function (l) { S('line', { 'class': 'hh__spoke', x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, 'stroke-dasharray': l.len + ' ' + l.len, 'stroke-dashoffset': l.len, opacity: 0 }, svg); });
    var hubG = S('g', { transform: 'translate(' + CX + ' ' + CY + ')' }, svg);
    var hubIn = S('g', { 'class': 'hh__hubIn' }, hubG);
    for (var hp = 0; hp < 2; hp++) S('circle', { 'class': 'hh__hubPing', cx: 0, cy: 0, r: HUB.r, opacity: 0 }, hubIn);
    var hubTurn = S('g', { 'class': 'hh__hubTurn', transform: 'rotate(' + HEADING_TASK.toFixed(2) + ')', opacity: 0 }, hubIn);
    S('circle', { 'class': 'hh__hubRing', cx: 0, cy: 0, r: HUB.r, 'stroke-dasharray': HUB_DASH }, hubTurn);
    S('line', { 'class': 'hh__hubNeedle', x1: HUB.needleIn, y1: 0, x2: HUB.r + HUB.needleOut, y2: 0 }, hubTurn);
    var brainG = S('g', { 'class': 'hh__brain' }, hubIn);
    S('path', { d: BRAIN.d, transform: BRAIN_TRANSFORM }, brainG);
    PACKETS.forEach(function (p, k) {
      var l = LINKS[p.link];
      for (var j = 1; j <= PACKET.ghosts + 1; j++) S('rect', { 'class': 'hh__packet', 'data-k': k, x: -0.5, y: -0.5, width: 1, height: 1, transform: 'translate(' + (l.x1 + l.x2) / 2 + ' ' + (l.y1 + l.y2) / 2 + ') scale(' + PACKET.size + ')', opacity: j === 1 && p.dir === 0 ? 0.85 : 0 }, svg);
    });

    function drawGlyph(o, g) {
      var i, k;
      if (o.glyph === 'sheet') {
        for (k = 0; k < SHEET_CELLS.length; k++) { var c = SHEET_CELLS[k]; S('rect', { 'class': c.head ? 'hh__cellHead' : 'hh__cell', x: c.x, y: c.y, width: SHEET.w, height: SHEET.h, rx: 0.5 }, g); }
        S('rect', { 'class': 'hh__cursor', x: 0, y: 0, width: SHEET.w, height: SHEET.h, rx: 0.5, transform: 'translate(' + SHEET_BODY[0].x + ' ' + SHEET_BODY[0].y + ')' }, g);
      } else if (o.glyph === 'calendar') {
        S('rect', { 'class': 'hh__glyph', x: CAL.x0, y: CAL.y0, width: CAL.w, height: CAL.h, rx: 1 }, g);
        S('rect', { 'class': 'hh__glyphFill', x: CAL.x0, y: CAL.y0, width: CAL.w, height: CAL.band, rx: 1 }, g);
        for (k = 0; k < CAL_DAYS.length; k++) S('rect', { 'class': 'hh__cell', x: CAL_DAYS[k].x, y: CAL_DAYS[k].y, width: CAL.day, height: CAL.day, rx: 0.5 }, g);
        S('rect', { 'class': 'hh__today', x: 0, y: 0, width: CAL.day, height: CAL.day, rx: 0.5, transform: 'translate(' + CAL_DAYS[0].x + ' ' + CAL_DAYS[0].y + ')' }, g);
      } else if (o.glyph === 'mail') {
        var letter = S('g', { 'class': 'hh__letter' }, g);
        S('rect', { 'class': 'hh__paper', x: -7, y: -13, width: 14, height: 13, rx: 0.5 }, letter);
        S('line', { 'class': 'hh__ink', x1: -4, y1: -9.5, x2: 4, y2: -9.5 }, letter);
        S('line', { 'class': 'hh__ink', x1: -4, y1: -6.5, x2: 2, y2: -6.5 }, letter);
        S('rect', { 'class': 'hh__envelope', x: -12, y: -6, width: 24, height: 16, rx: 1 }, g);
        S('path', { 'class': 'hh__glyph', d: 'M-12 -6L0 3L12 -6' }, g);
      } else if (o.glyph === 'binder') {
        S('rect', { 'class': 'hh__glyph', x: BINDER.x0, y: BINDER.y0, width: BINDER.w, height: BINDER.h, rx: 1 }, g);
        S('line', { 'class': 'hh__glyph', x1: BINDER.spine, y1: BINDER.y0, x2: BINDER.spine, y2: BINDER.y0 + BINDER.h }, g);
        for (k = 0; k < ENTRIES.length; k++) { var e = ENTRIES[k];
          S('rect', { 'class': 'hh__thumb', x: ENTRY.thumbX, y: e.y - ENTRY.thumb / 2, width: ENTRY.thumb, height: ENTRY.thumb, rx: 0.4 }, g);
          S('line', { 'class': 'hh__entryLine', x1: ENTRY.lineX, y1: e.y, x2: ENTRY.lineX + e.w, y2: e.y, 'stroke-dasharray': e.w + ' ' + e.w }, g); }
      } else if (o.glyph === 'books') {
        for (k = 0; k < BOOKS.length; k++) { var b = BOOKS[k]; var bg = S('g', { 'class': 'hh__book' }, g);
          S('rect', { 'class': 'hh__volume', x: b.x, y: SHELF.y - b.h, width: b.w, height: b.h, rx: 0.5 }, bg);
          S('line', { 'class': 'hh__ink', x1: b.x + 1, y1: SHELF.y - b.h + SHELF.band, x2: b.x + b.w - 1, y2: SHELF.y - b.h + SHELF.band }, bg); }
        S('line', { 'class': 'hh__glyph', x1: SHELF.x0, y1: SHELF.y, x2: SHELF.x1, y2: SHELF.y }, g);
      } else if (o.glyph === 'phone') {
        S('rect', { 'class': 'hh__glyph', x: PHONE.x0, y: PHONE.y0, width: PHONE.w, height: PHONE.h, rx: 2 }, g);
        S('line', { 'class': 'hh__glyph', x1: -1.5, y1: PHONE.y0 + 2.5, x2: 1.5, y2: PHONE.y0 + 2.5 }, g);
        S('line', { 'class': 'hh__ink', x1: -4, y1: -5, x2: 4, y2: -5 }, g);
        S('line', { 'class': 'hh__ink', x1: -4, y1: -2, x2: 1.5, y2: -2 }, g);
        S('rect', { 'class': 'hh__bubble', x: -4, y: 1.5, width: 8, height: 4, rx: 1, opacity: 0 }, g);
        for (k = 0; k < WAVES.length; k++) S('path', { 'class': 'hh__wave', d: WAVES[k].d, opacity: 0 }, g);
      } else if (o.glyph === 'document') {
        S('path', { 'class': 'hh__paper', d: DOC.d }, g);
        S('path', { 'class': 'hh__glyph', d: DOC.fold }, g);
        for (k = 0; k < DOC_LINES.length; k++) S('line', { 'class': 'hh__ink', x1: -5, y1: DOC_LINES[k].y, x2: -5 + DOC_LINES[k].w, y2: DOC_LINES[k].y }, g);
        S('path', { 'class': 'hh__sign', d: DOC.sign, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 0 }, g);
      }
    }
    TOOLS.forEach(function (o, i) {
      var tg = S('g', { transform: 'translate(' + o.x + ' ' + o.y + ') scale(' + TOOL_SCALE + ')' }, svg);
      var toolIn = S('g', { 'class': 'hh__toolIn' }, tg);
      var tile = S('g', { 'class': 'hh__tile' }, toolIn);
      var cp = S('clipPath', { id: readClip(i) }, tile);
      S('rect', { 'class': 'hh__clipRect', x: -TILE, y: -TILE, width: TILE * 2, height: 0 }, cp);
      S('rect', { 'class': 'hh__tileBox', x: -TILE, y: -TILE, width: TILE * 2, height: TILE * 2, rx: 3 }, tile);
      GLYPH_LAYERS.forEach(function (layer) {
        var lg = S('g', { 'class': 'hh__glyphs hh__glyphs--' + layer, 'clip-path': layer === 'read' ? 'url(#' + readClip(i) + ')' : undefined, opacity: layer === 'read' ? 0 : undefined }, tile);
        if (layer === 'read') S('rect', { 'class': 'hh__readBack', x: -TILE + 1, y: -TILE + 1, width: TILE * 2 - 2, height: TILE * 2 - 2, rx: 2 }, lg);
        var sg = S('g', { transform: 'scale(' + GLYPH_SCALE + ')' }, lg);
        drawGlyph(o, sg);
      });
      var scan = S('g', { 'class': 'hh__scan', opacity: 0 }, tile);
      S('rect', { 'class': 'hh__scanWash', x: -TILE + 1, y: TOWARD[i] > 0 ? 0 : -SCAN_WASH, width: TILE * 2 - 2, height: SCAN_WASH }, scan);
      S('line', { 'class': 'hh__scanLine', x1: -TILE, y1: 0, x2: TILE, y2: 0 }, scan);
      S('rect', { 'class': 'hh__tileLit', x: -TILE, y: -TILE, width: TILE * 2, height: TILE * 2, rx: 3, opacity: 0 }, tile);
      S('rect', { 'class': 'hh__written', x: TILE - 8, y: -TILE + 4, width: 4, height: 4, opacity: 0 }, tile);
    });
    TOOLS.forEach(function (o) { TXT(S('text', { 'class': 'hh__toolName', x: o.x + o.side * (TILE_EDGE + 8), y: o.y + 3.2, 'text-anchor': o.side < 0 ? 'end' : 'start' }, svg), t(copy('tools.' + o.id))); });

    CHECKS.forEach(function (c, i) {
      var gg = S('g', { 'class': 'hh__gate', transform: 'translate(' + c.x + ' ' + c.y + ')' }, svg);
      var gin = S('g', { 'class': 'hh__gateIn' }, gg);
      for (var n = 0; n < 2; n++) S('rect', { 'class': 'hh__gateRing', x: -CHECK.half, y: -CHECK.half, width: CHECK.half * 2, height: CHECK.half * 2, opacity: 0 }, gin);
      S('rect', { 'class': 'hh__gateSpin', x: -CHECK.spin, y: -CHECK.spin, width: CHECK.spin * 2, height: CHECK.spin * 2, 'stroke-dasharray': CHECK.spinDash + ' ' + (SPIN_PERIMETER - CHECK.spinDash), opacity: 0 }, gin);
      S('rect', { 'class': 'hh__gateBox', x: -CHECK.half, y: -CHECK.half, width: CHECK.half * 2, height: CHECK.half * 2 }, gin);
      S('rect', { 'class': 'hh__gateFill', x: -CHECK.half, y: -CHECK.half, width: CHECK.half * 2, height: CHECK.half * 2, opacity: 0 }, gin);
      S('rect', { 'class': 'hh__gateCore', x: -CHECK.core, y: -CHECK.core, width: CHECK.core * 2, height: CHECK.core * 2, opacity: 0 }, gin);
      if (c === BARRED) S('line', { 'class': 'hh__bar', x1: BAR.x, y1: 0, x2: BAR.x, y2: 0, opacity: 0 }, gin);
      if (c === GAUGED) [-1, 1].forEach(function (dx) { S('line', { 'class': 'hh__mark', x1: dx * (CHECK.half + MARK.gap), y1: MARK_Y, x2: dx * (CHECK.half + MARK.gap + MARK.tick), y2: MARK_Y }, gin); });
      if (c.id !== 'tache') {
        var tx = S('text', { 'class': 'hh__checkName', x: LABELS[i].x, y: LABELS[i].y, 'text-anchor': LABELS[i].anchor }, gg);
        CHECK_LINES[i].forEach(function (line, k) { TXT(S('tspan', { x: LABELS[i].x, dy: LABELS[i].dy[k] }, tx), line); });
      }
    });
    var queue = S('g', { 'class': 'hh__queue', mask: 'url(#' + queueMask + ')' }, svg);
    TASK_LINES.forEach(function (lines, j) {
      var tx = S('text', { 'class': 'hh__checkName hh__queueItem', x: QUEUE_X, y: 0, 'text-anchor': 'end', transform: 'translate(0 ' + queueY(j, 0).toFixed(2) + ')', opacity: queueOpacity(j, 0) }, queue);
      lines.forEach(function (line, k) { TXT(S('tspan', { x: QUEUE_X, dy: sideDy(lines.length, k) }, tx), line); });
    });
    var foot = S('g', { 'class': 'hh__foot' }, svg);
    PEOPLE.forEach(function (pp) {
      var pg = S('g', { transform: 'translate(' + pp.x + ' ' + PERSON.y + ')' }, foot);
      var nod = S('g', { 'class': 'hh__personNod' }, pg);
      S('circle', { 'class': 'hh__personBase', cx: 0, cy: -4.5, r: 2.8 }, nod);
      S('path', { 'class': 'hh__personBase', d: 'M-6 5Q-6 -0.5 0 -0.5Q6 -0.5 6 5Z' }, nod);
      var lit = S('g', { 'class': 'hh__personLit', opacity: 0 }, nod);
      S('circle', { cx: 0, cy: -4.5, r: 2.8 }, lit);
      S('path', { d: 'M-6 5Q-6 -0.5 0 -0.5Q6 -0.5 6 5Z' }, lit);
      TXT(S('text', { 'class': 'hh__personName', x: 0, y: PERSON.name, 'text-anchor': 'middle' }, pg), t(copy('people.' + pp.id)));
    });
    LEGEND_ROWS.forEach(function (row, k) {
      var lg = S('g', { transform: 'translate(' + LEGEND.x + ' ' + (LEGEND.y + k * LEGEND.line) + ')' }, foot);
      S('rect', { 'class': 'hh__swatch hh__swatch--' + row, x: -LEGEND.swatch, y: -LEGEND.swatch / 2, width: LEGEND.swatch, height: LEGEND.swatch, rx: 1 }, lg);
      TXT(S('text', { 'class': 'hh__legendText', x: -LEGEND.swatch - LEGEND.gap, y: 0, dy: LEGEND.mid + 'em', 'text-anchor': 'end' }, lg), t('harness.legend.' + row));
    });
    TOOLS.forEach(function () { S('rect', { 'class': 'hh__readSq', x: 0, y: 0, width: 0, height: 0, opacity: 0 }, svg); });
    var cardG = S('g', { 'class': 'hh__card', opacity: 0 }, svg);
    S('rect', { 'class': 'hh__cardBox', x: -CARD.w / 2, y: -CARD.h / 2, width: CARD.w, height: CARD.h, rx: 1 }, cardG);
    S('line', { 'class': 'hh__cardInk', x1: -4.5, y1: -1.5, x2: 4.5, y2: -1.5 }, cardG);
    S('line', { 'class': 'hh__cardInk', x1: -4.5, y1: 1.5, x2: 1.5, y2: 1.5 }, cardG);
    var cardFillG = S('g', { 'class': 'hh__cardFill', opacity: 0 }, cardG);
    S('rect', { x: -CARD.w / 2, y: -CARD.h / 2, width: CARD.w, height: CARD.h, rx: 1 }, cardFillG);
    S('line', { x1: -4.5, y1: -1.5, x2: 4.5, y2: -1.5 }, cardFillG);
    S('line', { x1: -4.5, y1: 1.5, x2: 1.5, y2: 1.5 }, cardFillG);
    TOOLS.forEach(function () { S('rect', { 'class': 'hh__dispatch', x: -0.5, y: -0.5, width: 1, height: 1, opacity: 0 }, svg); });

    host.appendChild(root);

    // ---------------- le moteur ----------------
    var destroyed = false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return { destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); } };
    var one = function (sel, from) { return (from || root).querySelector(sel); };
    var all = function (sel, from) { return Array.prototype.slice.call((from || root).querySelectorAll(sel)); };

    var strapEls = [one('.hh__strap'), one('.hh__strapInner'), one('.hh__band')];
    var stitch = one('.hh__stitch');
    var washRoute = one('.hh__wash');
    var linkEls = all('.hh__link'), linkPorts = one('.hh__ports');
    var toolIns = all('.hh__toolIn'), tiles = all('.hh__tile'), tileLit = all('.hh__tileLit'), names = all('.hh__toolName');
    var readLayers = all('.hh__glyphs--read'), clipRects = all('.hh__clipRect'), scans = all('.hh__scan'), scanWashes = all('.hh__scanWash');
    var cursors = all('.hh__cursor'), todays = all('.hh__today'), letters = all('.hh__letter'), entryLines = all('.hh__entryLine');
    var books = all('.hh__book'), waves = all('.hh__wave'), bubbles = all('.hh__bubble'), signs = all('.hh__sign');
    var writtenEls = all('.hh__written');
    var packetEls = PACKETS.map(function (_, k) { return all('.hh__packet[data-k="' + k + '"]'); });
    var gateIns = all('.hh__gateIn'), gateCores = all('.hh__gateCore'), gateSpins = all('.hh__gateSpin');
    var gateFills = all('.hh__gateFill'), gateLabels = all('.hh__gate').map(function (g) { return g.querySelector('.hh__checkName'); });
    var labelSpans = gateLabels.map(function (el) { return el ? all('tspan', el) : []; });
    var queueItems = all('.hh__queueItem');
    var gateRings = CHECKS.map(function (_, i) { return all('.hh__gateRing', gateIns[i]); });
    var bar = one('.hh__bar');
    var personLits = all('.hh__personLit'), personNods = all('.hh__personNod');
    var callEl = one('.hh__call'), riseEl = one('.hh__rise'), spokeEls = all('.hh__spoke'), readSquares = all('.hh__readSq'), dispatchEls = all('.hh__dispatch');
    var brain = one('.hh__brain'), hubPings = all('.hh__hubPing');
    var card = one('.hh__card'), cardFill = one('.hh__cardFill');

    var memo = new WeakMap();
    var set = function (el, name, value) {
      var v = typeof value === 'number' ? (Math.abs(value) < 5e-4 ? '0' : value.toFixed(3)) : value;
      var m = memo.get(el); if (!m) memo.set(el, (m = new Map()));
      if (m.get(name) === v) return;
      m.set(name, v); el.setAttribute(name, v);
    };
    var place = function (el, x, y, size, opacity, rotate) {
      set(el, 'transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')' + (rotate ? ' rotate(' + rotate.toFixed(1) + ')' : '') + ' scale(' + Math.max(0, size).toFixed(3) + ')');
      set(el, 'opacity', opacity);
    };
    var frame = function (el, x, y, half, opacity) { set(el, 'x', x - half); set(el, 'y', y - half); set(el, 'width', 2 * half); set(el, 'height', 2 * half); set(el, 'opacity', opacity); };
    var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var lerp = function (a, b, k) { return a + (b - a) * k; };
    var prog = function (now, at, dur) { return clamp((now - at) / dur); };
    var ease = function (k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
    var easeOut = function (k) { return 1 - Math.pow(1 - k, 3); };
    var easeOutExpo = function (k) { return k >= 1 ? 1 : 1 - Math.pow(2, -10 * k); };
    var easeIn = function (k) { return k * k; };
    var backOut = function (k, s) { if (s === undefined) s = 2.4; return k <= 0 ? 0 : 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };
    var bump = function (k) { return k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0; };
    var crossed = function (prev, now, at) { return prev < at && at <= now; };
    var onLine = function (l, k) { return [lerp(l.x1, l.x2, k), lerp(l.y1, l.y2, k)]; };
    function trackAt(track, ct) {
      if (ct < 0 || !track.length || ct < track[0].t0) return null;
      var i = 0; while (i < track.length - 1 && ct >= track[i + 1].t0) i++;
      var m = track[i];
      if (ct <= m.t1) {
        var e = ease(prog(ct, m.t0, m.t1 - m.t0));
        var scale = i > 0 && track[i - 1].keep ? 1 : easeOut(prog(ct, m.t0, THINK.emerge));
        if (m.line) { var p = onLine(m.line, e); return { x: p[0], y: p[1], scale: scale, s: null }; }
        var s = lerp(m.s0, m.s1, e), q = axisPoint(s);
        return { x: q[0], y: q[1], scale: scale, s: s };
      }
      var scale2 = m.keep ? 1 : 1 - easeIn(prog(ct, m.t1, THINK.absorb));
      if (m.line) return { x: m.line.x2, y: m.line.y2, scale: scale2, s: null };
      var q2 = axisPoint(m.s1);
      return { x: q2[0], y: q2[1], scale: scale2, s: m.s1 };
    }

    var r0 = host.getBoundingClientRect();
    var booting = !!entrance || r0.top >= window.innerHeight || r0.bottom <= 0;
    var bootDone = !booting;
    var lead = booting ? BOOT.end : 0;
    var time = 0, curTask = 0, prevCt = -1, reach = -Infinity, hoverTool = -1;
    var gates = CHECKS.map(function () { return { flash: 0, stamp: 0, pings: [], popAt: -1, recvAt: -99, think: null }; });
    var reads = TOOLS.map(function () { return null; });
    var hub = { angle: HEADING_TASK, from: HEADING_TASK, to: HEADING_TASK, appearAt: -99, hold: 0, pulseAt: -99, pings: [] };
    var labelText = labelSpans.map(function (spans) { return spans.map(function (el) { return el.textContent || ''; }); });
    var SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', SCRAMBLE_RATE = 20;
    var decode = function (el, text, k, salt) {
      var n = Math.floor(k * text.length), beat = Math.floor(time * SCRAMBLE_RATE);
      var next = k >= 1 ? text : text.slice(0, n) + Array.prototype.map.call(text.slice(n), function (ch, j) { return ch === ' ' ? ch : SCRAMBLE[(beat * 31 + (n + j) * 7 + salt * 13) % SCRAMBLE.length]; }).join('');
      var node = el.firstChild;
      if (!node) { if (next) el.textContent = next; }
      else if (node.nodeValue !== next) node.nodeValue = next;
    };
    var ping = function (i) { var g = gates[i]; g.pings.push(time); if (g.pings.length > 2) g.pings.shift(); };
    var stamp = function (i) { ping(i); gates[i].stamp = 1; };
    var receive = function (i, dur) { if (dur === undefined) dur = THINK.dur; var g = gates[i]; g.recvAt = time; g.think = { at: time, dur: dur }; };
    var hubReceive = function () { hub.pulseAt = time; hub.pings.push(time); if (hub.pings.length > 2) hub.pings.shift(); };
    var hubTurnTo = function (to, hold) { hub.from = mod(hub.angle, 360); hub.to = hub.from + mod(to - hub.from + 180, 360) - 180; hub.appearAt = time; hub.hold = hold; };
    var startRead = function (i) { if (reads[i] || !bootDone) return; reads[i] = { t0: time, home: false }; };

    function renderBoot(bt) {
      var ks = ease(prog(bt, BOOT.strap, BOOT.strapDur));
      strapEls.forEach(function (el, i) { set(el, 'stroke-dashoffset', STRAP_LENGTHS[i] * (1 - ks)); });
      CHECKS.forEach(function (c, i) {
        var g = gates[i];
        if (g.popAt < 0 && ks * PERIMETER >= c.s) g.popAt = bt;
        var popped = g.popAt >= 0;
        set(gateIns[i], 'transform', 'scale(' + (popped ? backOut(prog(bt, g.popAt, BOOT.gatePop)).toFixed(3) : 0) + ')');
        var label = gateLabels[i]; if (!label) return;
        set(label, 'opacity', popped ? 1 : 0);
        var k = popped ? prog(bt, g.popAt + 0.05, BOOT.scramble) : 0;
        labelSpans[i].forEach(function (el, j) { decode(el, labelText[i][j], k, i + j * 5); });
      });
      TOOLS.forEach(function (_, i) {
        var k = easeOutExpo(prog(bt, BOOT.tools + i * BOOT.toolStep, BOOT.toolDur));
        set(toolIns[i], 'transform', 'scale(' + (0.8 + 0.2 * k).toFixed(3) + ')');
        set(toolIns[i], 'opacity', k);
        set(names[i], 'opacity', prog(bt, BOOT.names + i * BOOT.toolStep, BOOT.fadeDur));
      });
      var kh = easeOutExpo(prog(bt, BOOT.hub, BOOT.toolDur));
      set(hubIn, 'transform', 'scale(' + (0.6 + 0.4 * kh).toFixed(3) + ')');
      set(hubIn, 'opacity', kh);
      var kl = ease(prog(bt, BOOT.links, BOOT.linksDur));
      linkEls.forEach(function (el, i) { set(el, 'stroke-dashoffset', LINKS[i].len * (1 - kl)); });
      set(linkPorts, 'opacity', kl);
      set(stitch, 'opacity', prog(bt, BOOT.stitch, BOOT.fadeDur));
      set(queue, 'opacity', prog(bt, BOOT.names, BOOT.fadeDur));
      set(foot, 'opacity', prog(bt, BOOT.foot, BOOT.fadeDur));
      if (bt >= BOOT.end) { bootDone = true; strapEls.concat(linkEls).forEach(function (el) { set(el, 'stroke-dasharray', 'none'); }); }
    }

    function render(dt) {
      if (!bootDone) renderBoot(time);
      var at = time - lead;
      var ambient = booting ? easeOut(prog(time, BOOT.ambient, BOOT.ambientDur)) : 1;
      var k = 0, ct = -1;
      if (at >= 0) { var u = at % LOOP; while (k < PLANS.length - 1 && u >= STARTS[k + 1]) k++; ct = u - STARTS[k]; }
      if (k !== curTask) { curTask = k; prevCt = -1; reach = -Infinity; }
      var p = PLANS[k], task = p.task, on = ct >= 0;
      var fires = function (when) { return on && when >= 0 && crossed(prevCt, ct, when); };
      var fadeOut = on ? 1 - prog(ct, p.labelOut, BEAT.out) : 0;

      var first = at < LOOP && k === 0;
      var q = on && !first ? k - 1 + ease(prog(ct, 0, QUEUE.scroll)) : k;
      queueItems.forEach(function (el, j) { set(el, 'transform', 'translate(0 ' + queueY(j, q).toFixed(2) + ')'); set(el, 'opacity', queueOpacity(j, q)); });
      if (fires(p.arrive)) { ping(TASK_GATE); gates[TASK_GATE].flash = 1; }
      p.halts.forEach(function (h) { if (!fires(h.at)) return; if (h.gate === HUB_STOP) hubReceive(); else receive(h.gate, h.dur); });
      p.reads.forEach(function (r) { if (fires(r.t0)) startRead(r.tool); });
      if (fires(p.aim)) hubTurnTo(HEADING_TASK, PACE.call);

      var call = p.card[0];
      set(callEl, 'stroke-dashoffset', CALL.len * (1 - (on ? ease(prog(ct, call.t0, call.t1 - call.t0)) : 0)));
      set(callEl, 'opacity', on && ct >= call.t0 ? fadeOut : 0);
      set(riseEl, 'stroke-dashoffset', RISE.len * (1 - (on && p.rise >= 0 ? ease(prog(ct, p.rise, PACE.call)) : 0)));
      set(riseEl, 'opacity', on && p.rise >= 0 && ct >= p.rise ? fadeOut : 0);

      TOOLS.forEach(function (o, i) {
        var r = reads[i], tw = TOWARD[i], spoke = SPOKES[i];
        var scanY = -tw * TILE, scanOp = 0, layerOp = 0, lit = 0, spokeDraw = 0, spokeOp = 0;
        if (r) {
          var tt = time - r.t0;
          var ks = prog(tt, READ_T.scan, READ.scan);
          scanY = lerp(-tw * TILE, tw * TILE, ease(ks));
          scanOp = ks > 0 && ks < 1 ? 1 : 0;
          layerOp = tt < READ_T.back ? 1 : 1 - clamp((tt - READ_T.back) / READ.fade);
          lit = tt >= READ_T.scan ? layerOp : 0;
          var x, y, half = READ_SQ, pt;
          if (tt < READ_T.scan) { pt = onLine(spoke, ease(tt / READ.out)); x = pt[0]; y = pt[1]; half *= easeOut(prog(tt, 0, THINK.emerge)); }
          else if (tt < READ_T.back) { x = spoke.x2; y = spoke.y2; half *= 1 - easeIn(prog(tt, READ_T.scan, THINK.absorb)); }
          else if (tt < READ_T.home) { pt = onLine(spoke, 1 - ease(prog(tt, READ_T.back, READ.back))); x = pt[0]; y = pt[1]; half *= easeOut(prog(tt, READ_T.back, THINK.emerge)); }
          else { x = spoke.x1; y = spoke.y1; half *= 1 - easeIn(prog(tt, READ_T.home, THINK.absorb)); }
          if (!r.home && tt >= READ_T.home) { r.home = true; hubReceive(); }
          frame(readSquares[i], x, y, half, half > 0.05 ? 1 : 0);
          spokeDraw = ease(prog(tt, 0, READ.out));
          spokeOp = tt < READ_T.home ? 1 : 1 - prog(tt, READ_T.home, READ.trail);
          if (tt >= READ_T.end) reads[i] = null;
        } else { set(readSquares[i], 'opacity', 0); }
        var d = null; if (on) for (var q2 = 0; q2 < p.dispatch.length; q2++) if (p.dispatch[q2].tool === i) { d = p.dispatch[q2]; break; }
        if (d && ct >= d.t0) {
          var kd = prog(ct, d.t0, PACE.spoke);
          spokeDraw = Math.max(spokeDraw, ease(kd));
          spokeOp = Math.max(spokeOp, fadeOut);
          var dp = onLine(WRITES[i], ease(kd));
          var size = 3.2 * easeOut(prog(ct, d.t0, THINK.emerge)) * (1 - easeIn(prog(ct, d.t1, THINK.absorb)));
          place(dispatchEls[i], dp[0], dp[1], size, size > 0.05 ? 1 : 0);
        } else { set(dispatchEls[i], 'opacity', 0); }
        set(spokeEls[i], 'stroke-dashoffset', spoke.len * (1 - spokeDraw));
        set(spokeEls[i], 'opacity', spokeOp);
        set(scans[i], 'transform', 'translate(0 ' + scanY.toFixed(2) + ')');
        var washH = Math.max(0, Math.min(SCAN_WASH, tw > 0 ? TILE - scanY : scanY + TILE));
        set(scanWashes[i], 'y', tw > 0 ? 0 : -washH);
        set(scanWashes[i], 'height', washH);
        set(scans[i], 'opacity', scanOp);
        set(readLayers[i], 'opacity', layerOp);
        set(clipRects[i], 'y', Math.min(-tw * TILE, scanY));
        set(clipRects[i], 'height', Math.abs(scanY + tw * TILE));
        var wAt = p.writtenAt[i];
        var isWritten = on && wAt >= 0 && ct >= wAt;
        var kw = isWritten ? prog(ct, wAt, 0.36) : 0;
        set(tiles[i], 'transform', 'scale(' + (1 + 0.09 * bump(kw)).toFixed(3) + ')');
        var writeLit = isWritten ? 1 - prog(ct, wAt + 0.6, 0.8) : 0;
        set(tileLit[i], 'opacity', Math.max(lit, writeLit));
        set(writtenEls[i], 'opacity', isWritten ? fadeOut : 0);
      });

      var cell = SHEET_BODY[Math.floor(time / SHEET.step) % SHEET_BODY.length];
      cursors.forEach(function (el) { set(el, 'transform', 'translate(' + cell.x + ' ' + cell.y + ')'); });
      var day = CAL_DAYS[Math.floor(time / CAL.step) % CAL_DAYS.length];
      todays.forEach(function (el) { set(el, 'transform', 'translate(' + day.x + ' ' + day.y + ')'); });
      var mi = glyphIndex('mail'), sentAt = mi >= 0 ? p.writtenAt[mi] : -1;
      var sends = on && sentAt >= 0 && ct >= sentAt ? bump(prog(ct, sentAt - 0.1, 0.8)) : 0;
      var letterY = lerp(-LETTER.rise / 2 * (1 - Math.cos((2 * Math.PI * time) / LETTER.period)), -LETTER.lift, sends);
      letters.forEach(function (el) { set(el, 'transform', 'translate(0 ' + letterY.toFixed(2) + ')'); });
      var bi = glyphIndex('binder'), rewrittenAt = bi >= 0 ? p.writtenAt[bi] : -1;
      var rewrites = on && rewrittenAt >= 0 && ct >= rewrittenAt && ct < rewrittenAt + 1;
      entryLines.forEach(function (el, j) { var line = ENTRIES[j % ENTRIES.length]; var kl = rewrites ? easeOut(prog(ct, rewrittenAt + 0.1 + (j % ENTRIES.length) * 0.08, 0.35)) : 1; set(el, 'stroke-dashoffset', line.w * (1 - kl)); });
      var kr = (time % PHONE.period) / PHONE.ring;
      waves.forEach(function (el, j) { set(el, 'opacity', ambient * bump(kr - WAVES[j % WAVES.length].rank * PHONE.lag)); });
      var pi = glyphIndex('phone'), textedAt = pi >= 0 ? p.writtenAt[pi] : -1;
      bubbles.forEach(function (el) { set(el, 'opacity', on && textedAt >= 0 && ct >= textedAt ? fadeOut : 0); });
      var tSign = time % DOC.period, signDrawn = ease(prog(tSign, 0, DOC.draw)), signOp = 1 - prog(tSign, DOC.period - DOC.fade, DOC.fade);
      signs.forEach(function (el) { set(el, 'stroke-dashoffset', 1 - signDrawn); set(el, 'opacity', signOp); });
      var kb = (time / SHELF.step) % BOOKS.length, consulted = Math.floor(kb);
      books.forEach(function (el, j) { var lift = j % BOOKS.length === consulted ? SHELF.lift * bump(kb - consulted) : 0; set(el, 'transform', 'translate(0 ' + (-lift).toFixed(2) + ')'); });
      PACKETS.forEach(function (pk, j) {
        var l = LINKS[pk.link], travel = l.len / PACKET.speed;
        var u = mod(time + pk.offset, travel + pk.gap) / travel;
        packetEls[j].forEach(function (el, g) {
          var ug = u - (g * PACKET.ghostLag) / travel;
          var visible = ug >= 0 && ug <= 1;
          var v = pk.dir ? 1 - ug : ug;
          var env = Math.min(1, ug / 0.08, (1 - ug) / 0.08);
          place(el, lerp(l.x1, l.x2, v), lerp(l.y1, l.y2, v), PACKET.size * (g ? 1 - g * 0.2 : 1), visible ? ambient * env * (g ? 0.45 * (1 - g / (PACKET.ghosts + 1)) : 0.85) : 0);
        });
      });

      var st = on ? trackAt(p.card, ct) : null;
      if (st) { set(card, 'transform', 'translate(' + st.x.toFixed(2) + ' ' + st.y.toFixed(2) + ') scale(' + st.scale.toFixed(3) + ')'); set(card, 'opacity', 1); if (st.s !== null) reach = Math.max(reach, st.s); }
      else set(card, 'opacity', 0);
      set(cardFill, 'opacity', on && ct >= p.approve ? 1 : 0);
      var washed = on && reach > TASK.s;
      set(washRoute, 'stroke-dasharray', washed ? arcDash(TASK.s, reach) : segmentDash(0, 0));
      set(washRoute, 'opacity', washed ? fadeOut : 0);

      var kBar = on && ct >= p.test.close ? backOut(prog(ct, p.test.close, 0.25), 3) * (1 - ease(prog(ct, p.test.open, BEAT.lift))) : 0;
      var closed = on && ct >= p.test.close && ct < p.test.open + BEAT.lift ? 1 : 0;
      if (bar) { set(bar, 'y1', -BAR.half * kBar); set(bar, 'y2', BAR.half * kBar); set(bar, 'opacity', closed); }

      CHECKS.forEach(function (c, i) {
        var g = gates[i];
        g.flash *= Math.exp(-dt / 0.35); g.stamp *= Math.exp(-dt / 0.45);
        var kThink = 0, thinking = 0;
        if (g.think) { kThink = (time - g.think.at) / g.think.dur; if (kThink >= 1) { g.think = null; kThink = 0; stamp(i); } else thinking = Math.min(1, kThink / THINK.edge, (1 - kThink) / THINK.edge); }
        set(gateSpins[i], 'stroke-dashoffset', -SPIN_PERIMETER * THINK.laps * ease(kThink));
        set(gateSpins[i], 'opacity', thinking);
        set(gateCores[i], 'transform', 'rotate(' + (180 * ease(kThink)).toFixed(1) + ')');
        set(gateCores[i], 'opacity', Math.max(g.flash * 0.75 * ambient, 0.85 * thinking));
        var fill = g.stamp, gauge = 1;
        if (c === GAUGED && on && p.seuilsIn >= 0 && ct >= p.seuilsIn + BEAT.gaugeLag && ct < p.labelOut + BEAT.out) {
          gauge = p.gauge * ease(prog(ct, p.seuilsIn + BEAT.gaugeLag, BEAT.gaugeDur));
          fill = Math.max(fill, 1 - prog(ct, p.seuilsIn + THINK.seuils, 0.4));
        }
        if (c === APPROVAL && on && ct >= p.approve) fill = Math.max(fill, fadeOut);
        if (c === BARRED) fill = Math.max(fill, closed);
        var h = 2 * CHECK.half * gauge;
        set(gateFills[i], 'y', CHECK.half - h); set(gateFills[i], 'height', h); set(gateFills[i], 'opacity', fill);
        gateRings[i].forEach(function (el, j) { var pg = g.pings[g.pings.length - 1 - j]; var kp = pg === undefined ? 1 : prog(time, pg, 0.8); frame(el, 0, 0, CHECK.half * lerp(1, 2.8, easeOut(kp)), kp > 0 && kp < 1 ? CHECK.ringOpacity * (1 - kp) : 0); });
        if (bootDone) { var kick = bump(prog(time, g.recvAt, THINK.kick)) * 0.18 + (c === APPROVAL && on ? bump(prog(ct, p.approve, 0.35)) * 0.35 : 0); set(gateIns[i], 'transform', 'scale(' + (1 + kick).toFixed(3) + ')'); }
      });

      var kPerson = on ? prog(ct, p.approvalIn, 0.3) * fadeOut : 0;
      var nod = on ? -1.6 * bump(prog(ct, p.approve - 0.2, 0.32)) : 0;
      PEOPLE.forEach(function (pp, j) { var decides = pp.id === task.by; set(personLits[j], 'opacity', decides ? kPerson : 0); set(personNods[j], 'transform', 'translate(0 ' + (decides ? nod : 0).toFixed(2) + ')'); });

      var turnAt = hub.appearAt + HUB.appear;
      hub.angle = lerp(hub.from, hub.to, backOut(prog(time, turnAt, HUB.turn), HUB.overshoot));
      set(hubTurn, 'transform', 'rotate(' + hub.angle.toFixed(2) + ')');
      set(hubTurn, 'opacity', easeOut(prog(time, hub.appearAt, HUB.appear)) * (1 - prog(time, turnAt + HUB.turn + hub.hold, HUB.fade)));
      set(brain, 'transform', 'scale(' + (1 + HUB.pulse * bump(prog(time, hub.pulseAt, 0.4))).toFixed(3) + ')');
      hubPings.forEach(function (el, j) { var pg = hub.pings[hub.pings.length - 1 - j]; var kp = pg === undefined ? 1 : prog(time, pg, 0.8); set(el, 'r', HUB.r * lerp(1, HUB.ping, easeOut(kp))); set(el, 'opacity', kp > 0 && kp < 1 ? CHECK.ringOpacity * (1 - kp) : 0); });
      if (on) prevCt = ct;
    }

    var armed = !booting, onScreen = false, running = false, rafId = 0, lastTs = null;
    var tick = function (ts) {
      if (!running || destroyed) return;
      var deltaMs = lastTs === null ? 16 : ts - lastTs; lastTs = ts;
      var dt = Math.min(0.05, deltaMs / 1000); time += dt; render(dt);
      rafId = requestAnimationFrame(tick);
    };
    var sync = function () {
      var want = armed && onScreen && !document.hidden;
      if (want === running) return;
      running = want;
      if (want) { lastTs = null; rafId = requestAnimationFrame(tick); } else cancelAnimationFrame(rafId);
    };
    var io = new IntersectionObserver(function (entries) { var entry = entries[0]; onScreen = !!(entry && entry.isIntersecting); if (!armed && entry && entry.intersectionRatio >= ARM_RATIO) armed = true; sync(); }, { threshold: [0, ARM_RATIO] });
    io.observe(root);
    document.addEventListener('visibilitychange', sync);
    if (booting) strapEls.concat(linkEls).forEach(function (el, i) { var len = i < strapEls.length ? STRAP_LENGTHS[i] : LINKS[i - strapEls.length].len; set(el, 'stroke-dasharray', len + ' ' + len); });
    render(0);

    function toolFrom(evt) {
      var m = svg.getScreenCTM(); if (!m) return -1;
      var pt = new DOMPoint(evt.clientX, evt.clientY).matrixTransform(m.inverse());
      for (var i = 0; i < TOOLS.length; i++) if (Math.abs(pt.x - TOOLS[i].x) <= TILE_EDGE && Math.abs(pt.y - TOOLS[i].y) <= TILE_EDGE) return i;
      return -1;
    }
    var onMove = function (e) { if (e.pointerType === 'touch') return; var i = toolFrom(e); if (i !== hoverTool && i >= 0) startRead(i); hoverTool = i; };
    var onLeave = function () { hoverTool = -1; };
    var onDown = function (e) { var i = toolFrom(e); if (i >= 0) startRead(i); };
    svg.addEventListener('pointermove', onMove); svg.addEventListener('pointerleave', onLeave); svg.addEventListener('pointerdown', onDown);

    return { destroy: function () {
      destroyed = true; running = false; cancelAnimationFrame(rafId); io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      svg.removeEventListener('pointermove', onMove); svg.removeEventListener('pointerleave', onLeave); svg.removeEventListener('pointerdown', onDown);
      if (root.parentNode) root.parentNode.removeChild(root);
    } };
  }

  // ---------------- les onglets (HarnessTabs.vue) ----------------
  function mountTabs(container) {
    var wrap = document.createElement('div'); wrap.className = 'ht';
    var tabs = document.createElement('div'); tabs.className = 'ht__tabs'; tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', t('harness.tabs'));
    var hostEl = document.createElement('div'); hostEl.className = 'ht__figure';
    var current = HARNESS_PROFILES[0].id, instance = null, buttons = [];
    HARNESS_PROFILES.forEach(function (p) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ht__tab'; b.id = 'ht-tab-' + p.id;
      b.setAttribute('aria-pressed', p.id === current ? 'true' : 'false');
      var mark = document.createElement('span'); mark.className = 'ht__mark'; mark.setAttribute('aria-hidden', 'true');
      b.appendChild(mark); b.appendChild(document.createTextNode(t('harness.' + p.id + '.tab')));
      b.addEventListener('click', function () {
        if (p.id === current) return;
        current = p.id;
        buttons.forEach(function (bb, k) { bb.setAttribute('aria-pressed', HARNESS_PROFILES[k].id === current ? 'true' : 'false'); });
        if (instance) instance.destroy();
        instance = mountHarness(hostEl, current, true);
      });
      buttons.push(b); tabs.appendChild(b);
    });
    wrap.appendChild(tabs); wrap.appendChild(hostEl); container.appendChild(wrap);
    instance = mountHarness(hostEl, current, false);
  }

  window.SmartTailorHarness = { mountTabs: mountTabs, mountHarness: mountHarness, profiles: HARNESS_PROFILES };
})();
