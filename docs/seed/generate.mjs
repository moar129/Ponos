// Generator for docs/seed/04_datalayer.sql, 06_tasks.sql og FACIT.md.
// Kør: node docs/seed/generate.mjs
// Én datakilde -> SQL og facit (forventede statistikværdier) er altid i sync.
// Ret data her, ikke direkte i de genererede filer.

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = dirname(fileURLToPath(import.meta.url))
const NOW = new Date('2026-09-29T12:00:00+02:00') // facit-dato
const MAIL = '@ponos-mock.test'

// ---------------------------------------------------------------------
// Hjælpere
// ---------------------------------------------------------------------
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const ts = (v) => (v ? `'${v} Europe/Copenhagen'::timestamptz` : 'null::timestamptz')
const num = (v) => (v === null || v === undefined ? 'null::numeric' : `${v}::numeric`)
const status = (v) => (v ? `'${v}'::public.e_item_status` : 'null::public.e_item_status')
const toDate = (v) => new Date(v.replace(' ', 'T') + ':00+02:00')
const orgGuard = `  select id into v_org from public.organisations where lower(trim(name)) = 'roskilde festival';
  if v_org is null then
    raise exception 'Organisationen "Roskilde Festival" findes ikke.';
  end if;`

// =====================================================================
// DATALAGER
// =====================================================================
const categories = [
  ['Scene & Teknik', ['Lyd', 'Lys', 'Strøm & Kabler', 'Generatorer & Brændstof']],
  ['Hegn & Afspærring', ['Byggehegn', 'Barrierer', 'Skilte & Afmærkning']],
  ['Telte & Møbler', ['Telte', 'Borde & Bænke', 'Scenegulve & Podier']],
  ['Sanitet', ['Toiletter', 'Vand & Håndvask']],
  ['Affald & Genbrug', ['Containere', 'Sække & Poser', 'Pant']],
  ['Sikkerhed', ['Brandslukning', 'Førstehjælp', 'Kommunikation']],
  ['Forbrugsvarer', ['Tape & Fastgørelse', 'Rengøring', 'Kontor & Print']],
  ['Frivilligudstyr', ['Beklædning', 'Adgang & Armbånd', 'Værktøj']],
]

// Enhedstyper:
//   S(prefix, {Status: antal})             serienummereret, quantity 1
//   B(qty, status, loc?)                     batch/målt mængde, serial null
//   C(total, [[level, status], ...], cfg)    kapacitet (tank/container), quantity = niveau
//   K(prefix, total, [[remaining, status]], cfg)  enkeltstyk med indhold
const S = (prefix, counts, loc) => ({ kind: 'S', prefix, counts, loc })
const B = (qty, st = 'Available', loc) => ({ kind: 'B', qty, st, loc })
const C = (total, levels, cfg, loc) => ({ kind: 'C', total, levels, cfg, loc })
const K = (prefix, total, levels, cfg, loc) => ({ kind: 'K', prefix, total, levels, cfg, loc })

const H1 = 'Hal 1 – Scene & teknik'
const H2 = 'Hal 2 – Hegn & telte'
const H3 = 'Hal 3 – Forbrugsvarer'
const CP = 'Containerplads'

// [kategori, lokation, navn, beskrivelse, emballage, enhed, pakkestørrelse, enheder[]]
const items = [
  // Lyd
  ['Lyd', H1, 'Line array-højttaler', 'Hovedhøjttaler til store scener.', null, 'stk', null, [S('LA', { Available: 22, Maintenance: 2 })]],
  ['Lyd', H1, 'Subwoofer 2x18"', null, null, 'stk', null, [S('SUB', { Available: 14, Damaged: 1 })]],
  ['Lyd', H1, 'Mikrofon SM58', 'Dynamisk vokalmikrofon.', null, 'stk', null, [S('MIC', { Available: 36, Missing: 3, Damaged: 1 })]],
  ['Lyd', H1, 'Trådløst mikrofonsæt', null, 'kuffert', 'stk', null, [S('WMIC', { Available: 10 }), S('WMIC', { InUse: 2 }, 'FOH-tårn')]],
  ['Lyd', H1, 'Digital mixerpult', null, 'flightcase', 'stk', null, [S('MIX', { Available: 3 }), S('MIX', { InUse: 1 }, 'FOH-tårn')]],
  ['Lyd', H1, 'Monitorhøjttaler', null, null, 'stk', null, [S('MON', { Available: 18, Maintenance: 2 })]],
  ['Lyd', H1, 'DI-boks', null, null, 'stk', null, [B(40)]],
  // Lys
  ['Lys', H1, 'LED-spot 200 W', null, null, 'stk', null, [S('SPOT', { Available: 40, Damaged: 3, Maintenance: 2 })]],
  ['Lys', H1, 'Moving head', null, 'flightcase à 2', 'stk', null, [S('MH', { Available: 24, Damaged: 1 })]],
  ['Lys', H1, 'Truss 3 m', 'Aluminium-truss, firkantet.', null, 'stk', null, [B(60), B(4, 'Damaged', 'Værksted')]],
  ['Lys', H1, 'Røgmaskine', null, null, 'stk', null, [S('FOG', { Available: 6, Maintenance: 1 })]],
  ['Lys', H1, 'Lyspult', null, 'flightcase', 'stk', null, [S('LP', { Available: 2 }), S('LP', { InUse: 1 }, 'FOH-tårn')]],
  ['Lys', H1, 'Arbejdslampe LED', null, null, 'stk', null, [B(80), B(10, 'Missing')]],
  // Strøm & Kabler
  ['Strøm & Kabler', H1, 'Kabeltromle 25 m', null, null, 'stk', null, [S('KT', { Available: 30, Damaged: 2 })]],
  ['Strøm & Kabler', H1, 'Stikdåse 6-vejs IP44', null, null, 'stk', null, [B(60)]],
  ['Strøm & Kabler', H1, 'Powercon-kabel 10 m', null, null, 'stk', null, [B(120)]],
  ['Strøm & Kabler', H1, 'Strømkabel 5x16 mm²', null, 'tromle', 'meter', null, [B(1200)]],
  ['Strøm & Kabler', H1, 'Eltavle 63 A', null, null, 'stk', null, [S('ET', { Available: 12, Maintenance: 1 })]],
  ['Strøm & Kabler', H1, 'Kabelbro', 'Kabelbeskytter til gangarealer.', null, 'stk', null, [B(150)]],
  // Generatorer & Brændstof
  ['Generatorer & Brændstof', CP, 'Generator 100 kVA', null, null, 'stk', null, [S('GEN', { Available: 6, Maintenance: 1 })]],
  ['Generatorer & Brændstof', CP, 'Generator 20 kVA', null, null, 'stk', null, [S('GENS', { Available: 10, Damaged: 1 })]],
  ['Generatorer & Brændstof', CP, 'Dieseltank 1000 l', 'Mobil dieseltank til generatorer.', null, 'liter', null,
    [C(1000, [[1000, 'Available'], [350, 'Available'], [0, 'NeedsRefilling']], ['NeedsRefilling', 'Available', 'Available'])]],
  ['Generatorer & Brændstof', CP, 'AdBlue', null, 'dunk', 'liter', 10, [B(240)]],
  // Byggehegn
  ['Byggehegn', H2, 'Byggehegn 3,5 m', null, null, 'stk', null, [B(800), B(40, 'Damaged', 'Værksted')]],
  ['Byggehegn', H2, 'Hegnsfod beton', null, null, 'stk', null, [B(900)]],
  ['Byggehegn', H2, 'Hegnsklemme', null, 'kasse à 50', 'stk', null, [B(1500), B(120, 'Missing')]],
  ['Byggehegn', H2, 'Hegnsdug med print', 'Afskærmning 3,5x1,8 m.', null, 'stk', null, [B(120)]],
  // Barrierer
  ['Barrierer', H2, 'Scenebarriere', 'Crowd barrier foran scener.', null, 'stk', null, [B(300)]],
  ['Barrierer', H2, 'Mobilhegn 2,5 m', null, null, 'stk', null, [B(400), B(30, 'Damaged', 'Værksted')]],
  ['Barrierer', H2, 'Kegle', null, null, 'stk', null, [B(200)]],
  // Skilte & Afmærkning
  ['Skilte & Afmærkning', H2, 'Retningsskilt', null, null, 'stk', null, [B(150)]],
  ['Skilte & Afmærkning', H2, 'Nødudgangsskilt belyst', null, null, 'stk', null, [S('NU', { Available: 40, Damaged: 2 })]],
  ['Skilte & Afmærkning', H3, 'Afspærringsbånd', null, null, 'rulle', null, [B(60)]],
  // Telte
  ['Telte', H2, 'Pagodetelt 5x5 m', null, null, 'stk', null, [S('PT', { Available: 30, Damaged: 2 })]],
  ['Telte', H2, 'Lagertelt 10x20 m', null, null, 'stk', null, [S('LT', { Available: 4 })]],
  ['Telte', H2, 'Pop-up telt 3x3 m', null, null, 'stk', null, [B(50), B(6, 'Damaged', 'Værksted')]],
  // Borde & Bænke
  ['Borde & Bænke', H2, 'Ølbordsæt', 'Bord + 2 bænke.', null, 'sæt', null, [B(600)]],
  ['Borde & Bænke', H2, 'Klapstol', null, null, 'stk', null, [B(400), B(25, 'Damaged')]],
  ['Borde & Bænke', H2, 'Cafébord', null, null, 'stk', null, [B(80)]],
  // Scenegulve & Podier
  ['Scenegulve & Podier', H2, 'Scenegulv-element 2x1 m', null, null, 'stk', null, [B(120)]],
  ['Scenegulve & Podier', H2, 'Podieben justerbart', null, null, 'stk', null, [B(480)]],
  ['Scenegulve & Podier', H2, 'Kørestolsrampe', null, null, 'stk', null, [S('RMP', { Available: 6 })]],
  // Toiletter
  ['Toiletter', CP, 'Toiletvogn 8 kabiner', null, null, 'stk', null, [S('TV', { Available: 10, Maintenance: 2 })]],
  ['Toiletter', CP, 'Pissoir-rondel', null, null, 'stk', null, [B(40)]],
  ['Toiletter', H3, 'Toiletpapir', null, 'pakke à 48', 'rulle', null, [B(3000)]],
  // Vand & Håndvask
  ['Vand & Håndvask', CP, 'Vandtank 1000 l', 'Drikkevandstank.', null, 'liter', null,
    [C(1000, [[1000, 'Available'], [1000, 'Available'], [600, 'Available'], [0, 'NeedsRefilling']], ['NeedsRefilling', 'Available', 'Available'])]],
  ['Vand & Håndvask', CP, 'Håndvaskestation', null, null, 'stk', null, [S('HV', { Available: 24, Damaged: 1 })]],
  ['Vand & Håndvask', H3, 'Vandslange 25 m', null, null, 'stk', null, [B(60)]],
  // Containere
  ['Containere', 'Affaldsstation Øst', 'Affaldscontainer 660 l', null, null, 'liter', null,
    [C(660, [...Array(7).fill([0, 'Available']), [330, 'Available'], [660, 'NeedsEmptying'], [660, 'NeedsEmptying']], ['Available', 'Available', 'NeedsEmptying']),
     C(660, [...Array(7).fill([0, 'Available']), [330, 'Available'], [330, 'Available'], [660, 'NeedsEmptying']], ['Available', 'Available', 'NeedsEmptying'], 'Affaldsstation Vest')]],
  ['Containere', CP, 'Komprimatorcontainer 20 m³', null, null, 'stk', null, [S('KC', { Available: 2 })]],
  ['Containere', CP, 'Glascontainer', null, null, 'stk', null, [B(12)]],
  // Sække & Poser
  ['Sække & Poser', H3, 'Affaldssække 120 l', null, 'rulle à 25', 'stk', null, [B(1500)]],
  ['Sække & Poser', H3, 'Pantsække', null, 'rulle à 25', 'stk', null, [B(2000)]],
  // Pant
  ['Pant', H3, 'Mobil pantstation', null, null, 'stk', null, [S('PS', { Available: 12, Damaged: 1 })]],
  ['Pant', H3, 'Pantkrus 40 cl', null, 'kasse à 500', 'stk', null, [B(25000)]],
  ['Pant', H3, 'Solcreme 1 l', 'Restlager - genbestilles til RF27.', 'pumpeflaske', 'stk', null, [B(2, 'OutOfStock')]],
  // Brandslukning
  ['Brandslukning', 'Sikkerhedscentral', 'Brandslukker 6 kg pulver', null, null, 'stk', null, [S('BS', { Available: 60, Maintenance: 4, Missing: 1 })]],
  ['Brandslukning', 'Sikkerhedscentral', 'CO2-slukker 5 kg', null, null, 'stk', null, [S('CO2', { Available: 20 })]],
  ['Brandslukning', 'Sikkerhedscentral', 'Brandtæppe', null, null, 'stk', null, [B(40)]],
  // Førstehjælp
  ['Førstehjælp', 'Medic-telt', 'Hjertestarter', null, null, 'stk', null, [S('AED', { Available: 8, Maintenance: 1 })]],
  ['Førstehjælp', 'Medic-telt', 'Førstehjælpskasse', 'Indhold tælles i dele.', null, 'stk', null,
    [K('FHK', 30, [[30, 'Available'], [30, 'Available'], [30, 'Available'], [22, 'Available'], [12, 'Available'], [0, 'NeedsRefilling']], ['NeedsRefilling', 'Available', 'Available'])]],
  ['Førstehjælp', 'Medic-telt', 'Båre', null, null, 'stk', null, [S('BAR', { Available: 6 })]],
  ['Førstehjælp', 'Medic-telt', 'Plaster', null, 'æske', 'æske', null, [B(200)]],
  // Kommunikation
  ['Kommunikation', 'Radiodepot', 'Håndradio', 'Digital håndradio med headset.', null, 'stk', null, [S('RAD', { Available: 110, Damaged: 4, Missing: 6, Maintenance: 3 })]],
  ['Kommunikation', 'Radiodepot', 'Radiobatteri', null, null, 'stk', null, [B(180), B(20, 'Damaged')]],
  ['Kommunikation', 'Radiodepot', 'Ladestation 6-slot', null, null, 'stk', null, [S('LS', { Available: 20 })]],
  ['Kommunikation', 'Radiodepot', 'Megafon', null, null, 'stk', null, [S('MEG', { Available: 10 })]],
  // Tape & Fastgørelse
  ['Tape & Fastgørelse', H3, 'Gaffatape sort 50 mm', null, 'kasse à 24', 'rulle', null, [B(240)]],
  ['Tape & Fastgørelse', H3, 'Kabelbindere 300 mm', null, 'pose à 100', 'stk', null, [B(20000)]],
  ['Tape & Fastgørelse', H3, 'Strips 500 mm', null, 'pose à 100', 'stk', null, [B(5000)]],
  ['Tape & Fastgørelse', H3, 'Spændbånd 5 m', null, null, 'stk', null, [B(150)]],
  ['Tape & Fastgørelse', CP, 'Sand', 'Til hegnsfødder og ballast.', 'big bag', 'kg', 500, [B(12000)]],
  ['Tape & Fastgørelse', CP, 'Træflis', 'Til mudrede gangarealer.', null, 'm³', null, [B(40)]],
  // Rengøring
  ['Rengøring', H3, 'Nitrilhandsker', null, 'æske à 100', 'æske', null, [B(80)]],
  ['Rengøring', H3, 'Håndsprit', null, 'dunk', 'liter', 5, [B(150)]],
  ['Rengøring', H3, 'Kost og skovl', null, 'sæt', 'sæt', null, [B(60)]],
  // Kontor & Print
  ['Kontor & Print', 'Sikkerhedscentral', 'Laserprinter A4', null, null, 'stk', null, [S('PR', { Available: 3 })]],
  ['Kontor & Print', H3, 'Printerpapir A4', null, 'pakke à 500', 'pakke', null, [B(40)]],
  ['Kontor & Print', H3, 'Clipboard', null, null, 'stk', null, [B(50)]],
  // Beklædning
  ['Beklædning', 'Frivilligdepot', 'Frivilligvest orange', null, null, 'stk', null, [B(1800), B(150, 'Missing')]],
  ['Beklædning', 'Frivilligdepot', 'Regnslag', null, null, 'stk', null, [B(600)]],
  ['Beklædning', 'Frivilligdepot', 'Arbejdshandsker', null, null, 'par', null, [B(900)]],
  // Adgang & Armbånd
  ['Adgang & Armbånd', 'Frivilligdepot', 'Frivilligarmbånd RF27', null, 'pose à 100', 'stk', null, [B(3000)]],
  ['Adgang & Armbånd', 'Frivilligdepot', 'Billetscanner', null, null, 'stk', null, [S('HS', { Available: 40, Damaged: 2, Missing: 1 })]],
  ['Adgang & Armbånd', 'Frivilligdepot', 'Adgangskort crew', null, null, 'stk', null, [B(500)]],
  // Værktøj
  ['Værktøj', 'Værksted', 'Akku-skruemaskine', null, 'kuffert', 'stk', null, [S('ASK', { Available: 30, Damaged: 2, Missing: 2 })]],
  ['Værktøj', 'Værksted', 'Hammer', null, null, 'stk', null, [B(80)]],
  ['Værktøj', 'Værksted', 'Palleløfter', null, null, 'stk', null, [S('PL', { Available: 8, Maintenance: 1 })]],
  ['Værktøj', 'Værksted', 'Teleskoplæsser', null, null, 'stk', null, [S('TL', { Available: 2, Maintenance: 1 })]],
  ['Værktøj', 'Værksted', 'Trillebør', null, null, 'stk', null, [B(25)]],
]

// Enhedernes oprettelsesdato: deterministisk spredt over 2 år.
const unitDates = [
  '2024-09-10', '2024-10-15', '2024-11-20', '2025-01-08', '2025-02-12', '2025-03-18',
  '2025-04-22', '2025-05-27', '2025-08-19', '2025-10-07', '2026-01-13', '2026-03-10',
  '2026-04-21', '2026-05-26', '2026-08-18',
]
const unitDate = (i) => `${unitDates[i % unitDates.length]} 10:00`

// Udfold til rækker (bruges både til SQL og til facit-model).
const unitRows = []
items.forEach(([, itemLoc, name, , , , , specs], idx) => {
  const serialNo = {} // løbenummer pr. prefix
  for (const s of specs) {
    const loc = s.loc ?? itemLoc
    const created = unitDate(idx)
    if (s.kind === 'S') {
      for (const [st, n] of Object.entries(s.counts)) {
        for (let k = 0; k < n; k++) {
          serialNo[s.prefix] = (serialNo[s.prefix] ?? 0) + 1
          unitRows.push({ item: name, loc, serial: `${s.prefix}-${String(serialNo[s.prefix]).padStart(3, '0')}`, qty: 1, st, created })
        }
      }
    } else if (s.kind === 'B') {
      unitRows.push({ item: name, loc, serial: null, qty: s.qty, st: s.st, created })
    } else if (s.kind === 'C') {
      for (const [level, st] of s.levels) {
        unitRows.push({ item: name, loc, serial: null, qty: level, st, created, ct: s.total, cfg: s.cfg })
      }
    } else if (s.kind === 'K') {
      s.levels.forEach(([rem, st]) => {
        serialNo[s.prefix] = (serialNo[s.prefix] ?? 0) + 1
        unitRows.push({ item: name, loc, serial: `${s.prefix}-${String(serialNo[s.prefix]).padStart(3, '0')}`, qty: 1, st, created, ct: s.total, cr: rem, cfg: s.cfg })
      })
    }
  }
})

// ---------------------------------------------------------------------
// 04_datalayer.sql
// ---------------------------------------------------------------------
function buildDatalayerSql() {
  const top = categories.map(([t], i) => `    (v_org, null, ${q(t)}, ${i + 1})`).join(',\n')
  const sub = categories
    .flatMap(([p, subs]) => subs.map((s, i) => `    (${q(p)}, ${q(s)}, ${i + 1})`))
    .join(',\n')
  const itemVals = items
    .map(([cat, loc, name, desc, pack, uom, size]) =>
      `    (${q(cat)}, ${q(loc)}, ${q(name)}, ${q(desc)}, ${q(pack)}, ${q(uom)}, ${num(size)})`)
    .join(',\n')

  // Serienumre komprimeres til generate_series pr. (item, prefix, status, lok).
  const groups = []
  for (const r of unitRows) {
    const last = groups[groups.length - 1]
    const m = r.serial?.match(/^(.*)-(\d{3})$/)
    if (m && !r.ct && last && last.kind === 'S' && last.item === r.item && last.prefix === m[1]
        && last.st === r.st && last.loc === r.loc && last.to + 1 === Number(m[2])) {
      last.to++
      continue
    }
    if (m && !r.ct) groups.push({ kind: 'S', item: r.item, prefix: m[1], from: Number(m[2]), to: Number(m[2]), st: r.st, loc: r.loc, created: r.created })
    else groups.push({ kind: 'R', ...r })
  }

  const serialStmts = groups.filter((g) => g.kind === 'S').map((g) => `  insert into public.data_layer_item_units (organisation_id, item_id, location_id, serial_number, quantity, status, created_at)
  select v_org, i.id, l.id, ${q(g.prefix + '-')} || lpad(n::text, 3, '0'), 1, ${status(g.st)}, ${ts(g.created)}
  from generate_series(${g.from}, ${g.to}) n
  join public.data_layer_items i on i.organisation_id = v_org and i.name = ${q(g.item)}
  left join public.locations l on l.organisation_id = v_org and l.name = ${q(g.loc)};`).join('\n\n')

  const rowVals = groups.filter((g) => g.kind === 'R').map((r) =>
    `    (${q(r.item)}, ${q(r.loc)}, ${q(r.serial)}, ${num(r.qty)}, ${status(r.st)}, ${ts(r.created)}, ${num(r.ct)}, ${num(r.cr)}, ${status(r.cfg?.[0])}, ${status(r.cfg?.[1])}, ${status(r.cfg?.[2])})`,
  ).join(',\n')

  return `-- =====================================================================
-- SEED 04 - DATALAGER (kategorier -> varer -> enheder)
-- GENERERET af docs/seed/generate.mjs - ret dér, ikke her.
-- Kræver 03_locations.sql. ${categories.length} hovedkategorier, ${categories.reduce((a, [, s]) => a + s.length, 0)} underkategorier,
-- ${items.length} varer, ${unitRows.length} enhedsrækker.
-- Enhedstyper: serienummereret (quantity 1), batch (serial null),
-- kapacitet (contents_total, niveau = quantity), enkeltstyk m. indhold.
-- =====================================================================
do $$
declare
  v_org uuid;
begin
${orgGuard}

  if exists (select 1 from public.data_layer_categories where organisation_id = v_org) then
    raise exception 'Allerede seedet - kør 99_cleanup.sql først.';
  end if;

  if not exists (select 1 from public.locations where organisation_id = v_org and name = 'Centrallager') then
    raise exception 'Kør 03_locations.sql først.';
  end if;

  -- Hovedkategorier
  insert into public.data_layer_categories (organisation_id, parent_category_id, title, rank)
  values
${top};

  -- Underkategorier
  insert into public.data_layer_categories (organisation_id, parent_category_id, title, rank)
  select v_org, p.id, c.title, c.rank
  from (values
${sub}
  ) as c(parent_title, title, rank)
  join public.data_layer_categories p
    on p.organisation_id = v_org and p.title = c.parent_title and p.parent_category_id is null;

  -- Varer (item-definitioner)
  insert into public.data_layer_items (organisation_id, category_id, location_id, name, description, packaging, unit_of_measurement, package_size)
  select v_org, c.id, l.id, i.name, i.description, i.packaging, i.uom, i.package_size
  from (values
${itemVals}
  ) as i(category_title, location_name, name, description, packaging, uom, package_size)
  join public.data_layer_categories c on c.organisation_id = v_org and c.title = i.category_title
  left join public.locations l on l.organisation_id = v_org and l.name = i.location_name;

  -- Serienummererede enheder
${serialStmts}

  -- Batches, kapacitets-enheder og enheder med indhold
  insert into public.data_layer_item_units (
    organisation_id, item_id, location_id, serial_number, quantity, status, created_at,
    contents_total, contents_remaining, contents_empty_status, contents_partial_status, contents_full_status
  )
  select v_org, i.id, l.id, u.serial_number, u.quantity, u.status, u.created_at,
         u.contents_total, u.contents_remaining, u.empty_status, u.partial_status, u.full_status
  from (values
${rowVals}
  ) as u(item_name, location_name, serial_number, quantity, status, created_at,
         contents_total, contents_remaining, empty_status, partial_status, full_status)
  join public.data_layer_items i on i.organisation_id = v_org and i.name = u.item_name
  left join public.locations l on l.organisation_id = v_org and l.name = u.location_name;

  raise notice 'Seed 04 færdig: ${items.length} varer, ${unitRows.length} enhedsrækker.';
end $$;
`
}

// =====================================================================
// OPGAVER
// =====================================================================
const rooms = [
  // [kode, navn, oprettet, låst til roller]
  ['PLAN', 'Planlægning', '2024-10-01 09:00', ['Festivalledelse', 'Frivilligkoordinator', 'Lagerchef', 'Holdleder']],
  ['OPB', 'Opbygning', '2024-10-01 09:05', []],
  ['SCN', 'Scener & Teknik', '2024-10-01 09:10', []],
  ['AFF', 'Affald & Genbrug', '2024-10-01 09:15', []],
  ['SAN', 'Sanitet', '2024-10-01 09:20', []],
  ['SIK', 'Sikkerhed', '2024-10-01 09:25', ['Sikkerhed & Vagt', 'Festivalledelse']],
  ['FRI', 'Frivillige', '2024-10-01 09:30', []],
  ['NED', 'Nedtagning', '2024-10-01 09:35', []],
]
const roomName = Object.fromEntries(rooms.map(([c, n]) => [c, n]))

// Hvem godkender/tildeler i hvert rum (første, der ikke selv er tildelt).
const roomApprovers = {
  PLAN: ['admin'],
  SIK: ['mette.hansen', 'admin'],
  FRI: ['mette.hansen', 'admin'],
  OPB: ['camilla.thorsen', 'rasmus.kristensen', 'admin'],
  SCN: ['camilla.thorsen', 'admin'],
  AFF: ['line.vestergaard', 'camilla.thorsen', 'admin'],
  SAN: ['line.vestergaard', 'camilla.thorsen', 'admin'],
  NED: ['rasmus.kristensen', 'camilla.thorsen', 'admin'],
}

// Felter: nr, rum, titel, beskrivelse, oprettet, start, slut, status, prioritet,
// kræver godkendelse, færdig (finished_at), tildelte, max, requests, materialer.
// requests: [status, anmodet, behandlet, begrundelse] - anmoder = første tildelte.
// materialer: [varenavn, antal] - status Started -> Reserved, InProgress -> InUse.
const T = (nr, room, title, desc, created, start, end, st, prio, appr, finished, assignees, extra = {}) =>
  ({ nr, room, title, desc, created, start, end, st, prio, appr, finished, assignees, max: extra.max ?? null, requests: extra.requests ?? [], materials: extra.materials ?? [] })

const tasks = [
  // --- RF25-cyklus ---
  T(1, 'PLAN', 'Budget for sceneteknik RF25', 'Udarbejd budget for lyd, lys og strøm til alle scener.', '2024-10-07 09:00', '2024-10-14 08:00', '2024-11-15 16:00', 'Completed', 'High', true, '2024-11-12 14:00', ['mette.hansen', 'camilla.thorsen']),
  T(2, 'PLAN', 'Indhent tilbud på toiletvogne', 'Mindst tre tilbud på leje af toiletvogne.', '2024-10-21 09:00', '2024-10-28 08:00', '2024-12-01 16:00', 'Completed', 'Medium', false, '2024-11-25 11:00', ['henrik.dahl']),
  T(3, 'PLAN', 'Rekrutteringskampagne frivillige RF25', 'Plan for opslag, infomøder og tilmelding.', '2024-11-04 09:00', '2024-11-11 08:00', '2025-02-28 16:00', 'Completed', 'High', true, '2025-02-20 15:00', ['sofie.andersen', 'anders.moeller']),
  T(4, 'SIK', 'Opdater sikkerhedsplan RF25', 'Gennemgå og opdater sikkerheds- og beredskabsplanen.', '2024-11-18 09:00', '2024-12-01 08:00', '2025-03-01 16:00', 'Completed', 'Critical', true, '2025-02-26 13:00', ['nanna.bech', 'kasper.winther']),
  T(5, 'FRI', 'Planlæg layout for frivilligcamp', 'Placering af telte, depot og toiletter i frivilligcampen.', '2024-12-09 09:00', '2025-01-06 08:00', '2025-02-15 16:00', 'Completed', 'Low', false, '2025-02-10 12:00', ['anders.moeller']),
  T(6, 'OPB', 'Bestil hegn og mobilhegn', 'Opgør behov og bestil manglende hegn.', '2025-01-13 09:00', '2025-01-20 08:00', '2025-03-15 16:00', 'Completed', 'Medium', true, '2025-03-10 10:00', ['henrik.dahl', 'emma.nielsen']),
  T(7, 'SCN', 'Serviceeftersyn af generatorer', 'Årligt eftersyn af alle generatorer.', '2025-02-03 09:00', '2025-03-01 08:00', '2025-04-30 16:00', 'Completed', 'High', true, '2025-04-22 15:00', ['mikkel.brandt', 'peter.skov']),
  T(8, 'SIK', 'Test af radioer og ladestationer', 'Test alle håndradioer og ladestationer før sæsonen.', '2025-03-03 09:00', '2025-04-01 08:00', '2025-05-15 16:00', 'Completed', 'Medium', false, '2025-05-09 14:00', ['kasper.winther', 'nanna.bech']),
  T(9, 'OPB', 'Opstil hegn omkring Camp Øst', 'Byggehegn langs hele Camp Østs yderkant.', '2025-04-07 09:00', '2025-06-02 07:00', '2025-06-13 16:00', 'Completed', 'High', true, '2025-06-12 17:00', ['rasmus.kristensen', 'ida.mortensen', 'oliver.juhl', 'mads.poulsen'], { max: 6 }),
  T(10, 'OPB', 'Rejs Orange Scene – stålkonstruktion', 'Opbygning af scenens stålkonstruktion og tag.', '2025-04-14 09:00', '2025-05-26 07:00', '2025-06-20 16:00', 'Completed', 'Critical', true, '2025-06-19 18:00', ['camilla.thorsen', 'mikkel.brandt', 'peter.skov']),
  T(11, 'SAN', 'Placer toiletvogne i campingområderne', 'Placering efter layoutplanen.', '2025-05-05 09:00', '2025-06-16 07:00', '2025-06-24 16:00', 'Completed', 'Medium', false, '2025-06-23 15:00', ['line.vestergaard', 'freja.lassen']),
  T(12, 'AFF', 'Opstil pantstationer', 'Opstil mobile pantstationer ved alle scener.', '2025-05-12 09:00', '2025-06-18 07:00', '2025-06-26 16:00', 'Completed', 'Medium', true, '2025-06-25 16:00', ['line.vestergaard', 'sara.oestergaard']),
  T(13, 'FRI', 'Opsæt frivilligcamp og depot', 'Telte, strøm og depot til udlevering.', '2025-05-19 09:00', '2025-06-10 07:00', '2025-06-20 16:00', 'Completed', 'Low', false, '2025-06-19 17:00', ['anders.moeller', 'ida.mortensen']),
  T(14, 'SCN', 'Lydcheck Arena', null, '2025-06-02 09:00', '2025-06-26 10:00', '2025-06-27 18:00', 'Completed', 'High', false, '2025-06-27 16:00', ['mikkel.brandt']),
  T(15, 'SIK', 'Brandsyn af scener', 'Gennemgang med brandvæsenet.', '2025-06-09 09:00', '2025-06-25 09:00', '2025-06-27 16:00', 'Completed', 'Critical', true, '2025-06-27 12:00', ['nanna.bech']),
  T(16, 'AFF', 'Daglig tømning af affaldsstationer RF25', 'Tøm og sortér ved alle affaldsstationer.', '2025-06-16 09:00', '2025-06-28 08:00', '2025-07-05 20:00', 'Completed', 'Medium', false, '2025-07-05 19:00', ['sara.oestergaard', 'oliver.juhl', 'mads.poulsen']),
  T(17, 'SAN', 'Påfyld vandtanke i Camp Vest', null, '2025-06-23 09:00', '2025-06-28 08:00', '2025-07-05 20:00', 'Completed', 'High', false, '2025-07-04 18:00', ['freja.lassen']),
  T(18, 'NED', 'Nedtag hegn Camp Øst RF25', null, '2025-07-01 09:00', '2025-07-07 07:00', '2025-07-18 16:00', 'Completed', 'Medium', true, '2025-07-17 15:00', ['rasmus.kristensen', 'oliver.juhl', 'ida.mortensen']),
  T(19, 'NED', 'Returner lejede generatorer RF25', null, '2025-07-02 09:00', '2025-07-08 08:00', '2025-07-15 16:00', 'Completed', 'High', true, '2025-07-14 13:00', ['peter.skov']),
  T(20, 'NED', 'Lageroptælling efter RF25', 'Optæl og registrer alt udstyr i datalageret.', '2025-07-14 09:00', '2025-07-21 08:00', '2025-08-15 16:00', 'Completed', 'Medium', true, '2025-08-20 12:00', ['henrik.dahl', 'emma.nielsen', 'jonas.holm']),
  T(21, 'PLAN', 'Evaluering RF25 – frivilligområdet', null, '2025-08-04 09:00', '2025-08-11 08:00', '2025-09-12 16:00', 'Completed', 'Low', false, '2025-09-10 11:00', ['sofie.andersen']),
  T(22, 'NED', 'Opdater registrering af beskadiget hegn', 'Registrér beskadigede hegnselementer i datalageret.', '2025-08-11 09:00', '2025-08-18 08:00', '2025-09-01 16:00', 'InProgress', 'Low', true, null, ['emma.nielsen']),
  T(23, 'SCN', 'Reparer beskadigede lyskabler', null, '2025-08-25 09:00', '2025-09-01 08:00', '2025-10-31 16:00', 'InProgress', 'Medium', true, null, ['peter.skov']),
  // --- RF26-cyklus ---
  T(24, 'PLAN', 'Budget og scenetekniske behov RF26', null, '2025-09-15 09:00', '2025-10-01 08:00', '2025-11-14 16:00', 'Completed', 'High', true, '2025-11-10 14:00', ['camilla.thorsen']),
  T(25, 'PLAN', 'Kontrakt med affaldsleverandør', 'Forhandl og underskriv kontrakt for RF26.', '2025-10-06 09:00', '2025-10-13 08:00', '2025-12-01 16:00', 'Completed', 'Medium', true, '2025-11-28 10:00', ['line.vestergaard'], {
    requests: [['Rejected', '2025-11-19 15:00', '2025-11-20 09:00', 'Mangler underskrevet kontrakt fra leverandøren.']] }),
  T(26, 'FRI', 'Rekrutteringskampagne frivillige RF26', null, '2025-10-20 09:00', '2025-11-03 08:00', '2026-03-01 16:00', 'Completed', 'High', true, '2026-02-25 15:00', ['sofie.andersen', 'anders.moeller']),
  T(27, 'SIK', 'Opdater beredskabsplan RF26', null, '2025-11-10 09:00', '2025-12-01 08:00', '2026-02-28 16:00', 'Completed', 'Critical', true, '2026-02-27 11:00', ['nanna.bech', 'kasper.winther']),
  T(28, 'SCN', 'Vinteropbevaring – tjek af lysudstyr', null, '2025-12-01 09:00', '2026-01-05 08:00', '2026-02-15 16:00', 'Completed', 'Low', false, '2026-02-12 14:00', ['mikkel.brandt']),
  T(29, 'PLAN', 'Opdater frivilligkontrakter', null, '2026-01-12 09:00', '2026-01-19 08:00', '2026-03-01 16:00', 'Completed', 'Low', false, '2026-02-27 10:00', ['anders.moeller']),
  T(30, 'SCN', 'Service af generatorer før RF26', null, '2026-02-02 09:00', '2026-03-02 08:00', '2026-04-30 16:00', 'Completed', 'High', true, '2026-04-28 15:00', ['mikkel.brandt', 'peter.skov']),
  T(31, 'FRI', 'Førstehjælpskursus for holdledere', null, '2026-02-16 09:00', '2026-04-06 17:00', '2026-04-30 21:00', 'Completed', 'Medium', false, '2026-04-24 21:00', ['nanna.bech', 'camilla.thorsen', 'rasmus.kristensen', 'line.vestergaard']),
  T(32, 'OPB', 'Opmåling af campingområder', null, '2026-03-09 09:00', '2026-04-13 08:00', '2026-05-08 16:00', 'Completed', 'Medium', true, '2026-05-06 13:00', ['rasmus.kristensen']),
  T(33, 'OPB', 'Opstil hegn omkring Camp Øst og Vest', null, '2026-04-06 09:00', '2026-06-01 07:00', '2026-06-12 16:00', 'Completed', 'High', true, '2026-06-11 18:00', ['rasmus.kristensen', 'ida.mortensen', 'oliver.juhl', 'mads.poulsen', 'freja.lassen'], {
    max: 6, requests: [['Rejected', '2026-06-10 17:00', '2026-06-10 19:00', 'Hegnet ved indgang C mangler stadig.']] }),
  T(34, 'OPB', 'Rejs Orange Scene – RF26', null, '2026-04-13 09:00', '2026-05-25 07:00', '2026-06-19 16:00', 'Completed', 'Critical', true, '2026-06-18 17:00', ['camilla.thorsen', 'mikkel.brandt', 'peter.skov']),
  T(35, 'SAN', 'Placer toiletvogne og håndvask', null, '2026-05-04 09:00', '2026-06-15 07:00', '2026-06-23 16:00', 'Completed', 'Medium', false, '2026-06-22 16:00', ['line.vestergaard', 'freja.lassen']),
  T(36, 'AFF', 'Opstil affalds- og pantstationer', null, '2026-05-11 09:00', '2026-06-17 07:00', '2026-06-25 16:00', 'Completed', 'Medium', true, '2026-06-24 15:00', ['sara.oestergaard', 'oliver.juhl']),
  T(37, 'FRI', 'Opsæt frivilligcamp RF26', null, '2026-05-18 09:00', '2026-06-08 07:00', '2026-06-19 16:00', 'Completed', 'Low', false, '2026-06-18 17:00', ['anders.moeller', 'ida.mortensen']),
  T(38, 'SIK', 'Uddel radioer til vagtholdene', null, '2026-06-01 09:00', '2026-06-26 08:00', '2026-06-27 12:00', 'Completed', 'High', false, '2026-06-26 18:00', ['kasper.winther', 'nanna.bech']),
  T(39, 'SCN', 'Lydcheck Orange Scene', null, '2026-06-08 09:00', '2026-06-26 10:00', '2026-06-27 18:00', 'Completed', 'High', true, '2026-06-27 17:00', ['mikkel.brandt']),
  T(40, 'SCN', 'Påfyld diesel i generatorer under festivalen', null, '2026-06-15 09:00', '2026-06-27 06:00', '2026-07-04 23:00', 'Completed', 'Critical', false, '2026-07-04 22:00', ['peter.skov']),
  T(41, 'AFF', 'Daglig tømning af affaldsstationer RF26', null, '2026-06-22 09:00', '2026-06-27 08:00', '2026-07-04 20:00', 'Completed', 'Medium', false, '2026-07-04 19:00', ['sara.oestergaard', 'oliver.juhl', 'mads.poulsen']),
  T(42, 'NED', 'Nedtag Orange Scene', null, '2026-06-29 09:00', '2026-07-05 07:00', '2026-07-24 16:00', 'Completed', 'High', true, '2026-07-23 16:00', ['camilla.thorsen', 'mikkel.brandt', 'peter.skov']),
  T(43, 'NED', 'Nedtag hegn og mobilhegn', null, '2026-07-01 09:00', '2026-07-06 07:00', '2026-07-17 16:00', 'Completed', 'Medium', true, '2026-07-16 15:00', ['rasmus.kristensen', 'ida.mortensen', 'oliver.juhl', 'freja.lassen']),
  T(44, 'NED', 'Returner lejede toiletvogne', null, '2026-07-06 09:00', '2026-07-07 08:00', '2026-07-14 16:00', 'Completed', 'Medium', false, '2026-07-13 12:00', ['line.vestergaard']),
  T(45, 'NED', 'Lageroptælling efter RF26', null, '2026-07-13 09:00', '2026-07-20 08:00', '2026-08-14 16:00', 'Completed', 'Medium', true, '2026-08-12 14:00', ['henrik.dahl', 'emma.nielsen', 'jonas.holm'], {
    requests: [['Rejected', '2026-08-10 15:00', '2026-08-10 17:00', 'Hal 2 er ikke optalt endnu.']] }),
  T(46, 'AFF', 'Opgørelse af affaldsmængder RF26', null, '2026-07-20 09:00', '2026-07-27 08:00', '2026-08-21 16:00', 'Completed', 'Low', true, '2026-08-19 11:00', ['sara.oestergaard']),
  // --- Åbne opgaver (efterår 2026 / RF27) ---
  T(47, 'SIK', 'Evaluering RF26 – sikkerhed', null, '2026-08-03 09:00', '2026-08-10 08:00', '2026-09-11 16:00', 'InProgress', 'High', true, null, ['nanna.bech'], {
    requests: [['Pending', '2026-09-10 16:00']] }),
  T(48, 'NED', 'Reparer beskadigede hegnselementer', null, '2026-08-10 09:00', '2026-08-17 08:00', '2026-09-18 16:00', 'InProgress', 'Medium', true, null, ['emma.nielsen', 'jonas.holm'], {
    requests: [['Rejected', '2026-09-14 15:00', '2026-09-15 09:00', 'Der mangler billeder af de reparerede elementer.']], materials: [['Byggehegn 3,5 m', 30]] }),
  T(49, 'SCN', 'Service af lysudstyr før vinteropbevaring', null, '2026-08-17 09:00', '2026-08-24 08:00', '2026-09-25 16:00', 'InProgress', 'Medium', true, null, ['mikkel.brandt'], {
    requests: [['Pending', '2026-09-24 15:00']], materials: [['LED-spot 200 W', 4]] }),
  T(50, 'NED', 'Sorter returneret frivilligudstyr', 'Veste, armbånd og værktøj sorteres og registreres.', '2026-08-24 09:00', '2026-09-01 08:00', '2026-09-20 16:00', 'Started', 'Low', false, null, ['ida.mortensen']),
  T(51, 'PLAN', 'Evaluering RF26 – frivilligområdet', null, '2026-08-31 09:00', '2026-09-07 08:00', '2026-10-09 16:00', 'InProgress', 'Medium', true, null, ['sofie.andersen'], {
    requests: [['Pending', '2026-09-28 10:00']] }),
  T(52, 'AFF', 'Tøm og rengør affaldscontainere', null, '2026-09-01 09:00', '2026-09-07 08:00', '2026-09-22 16:00', 'InProgress', 'High', true, null, ['sara.oestergaard', 'mads.poulsen'], {
    requests: [['Rejected', '2026-09-21 14:00', '2026-09-21 16:00', 'Tre containere i Camp Øst er stadig fulde.']], materials: [['Affaldssække 120 l', 250]] }),
  T(53, 'SAN', 'Rengør og opbevar vandtanke', null, '2026-09-07 09:00', '2026-09-14 08:00', '2026-10-02 16:00', 'InProgress', 'Medium', true, null, ['freja.lassen', 'oliver.juhl'], {
    requests: [['Pending', '2026-09-27 12:00']] }),
  T(54, 'NED', 'Vinteropbevaring af scenegulve', null, '2026-09-08 09:00', '2026-09-21 08:00', '2026-10-16 16:00', 'InProgress', 'Medium', false, null, ['camilla.thorsen', 'peter.skov'], {
    materials: [['Scenegulv-element 2x1 m', 40]] }),
  T(55, 'PLAN', 'Budgetudkast RF27', null, '2026-09-14 09:00', '2026-10-01 08:00', '2026-11-13 16:00', 'Started', 'High', true, null, ['mette.hansen']),
  T(56, 'SIK', 'Kontrol af brandslukkere', 'Årligt eftersyn af pulverslukkere.', '2026-09-15 09:00', '2026-09-21 08:00', '2026-10-09 16:00', 'InProgress', 'Critical', true, null, ['kasper.winther'], {
    requests: [['Pending', '2026-09-28 14:00']], materials: [['Brandslukker 6 kg pulver', 6]] }),
  T(57, 'SCN', 'Test og opladning af radioer', null, '2026-09-21 09:00', '2026-09-28 08:00', '2026-10-05 16:00', 'InProgress', 'Medium', true, null, ['jonas.holm'], {
    requests: [['Rejected', '2026-09-28 15:00', '2026-09-28 17:00', 'Batterierne er ikke testet.']], materials: [['Håndradio', 8]] }),
  T(58, 'FRI', 'Planlæg frivilligfest', null, '2026-09-22 09:00', '2026-10-05 08:00', '2026-10-31 16:00', 'Started', 'Low', false, null, [], { max: 4 }),
  T(59, 'PLAN', 'Indhent tilbud på hegn til RF27', null, '2026-09-24 09:00', '2026-10-12 08:00', '2026-12-01 16:00', 'Started', 'Medium', true, null, ['henrik.dahl']),
  T(60, 'OPB', 'Opdater kort over campingområder', null, '2026-09-26 09:00', '2026-10-05 08:00', '2026-11-06 16:00', 'Started', 'Low', false, null, []),
  T(61, 'SIK', 'Gennemgå hændelsesrapporter fra RF26', null, '2026-09-28 09:00', '2026-09-29 08:00', '2026-10-23 16:00', 'Started', 'High', true, null, ['nanna.bech']),
  T(62, 'SCN', 'Udskift defekte stikdåser', null, '2026-09-29 09:00', '2026-09-30 08:00', '2026-10-10 16:00', 'Started', 'Medium', true, null, ['mikkel.brandt'], {
    max: 2, materials: [['Stikdåse 6-vejs IP44', 10], ['Kabeltromle 25 m', 2]] }),
  T(63, 'AFF', 'Bestil nye pantstationer', null, '2026-09-29 09:30', '2026-10-06 08:00', '2026-10-30 16:00', 'Started', 'Low', false, null, []),
  T(64, 'SAN', 'Tjek toiletvogne for skader', null, '2026-09-29 10:00', '2026-10-01 08:00', '2026-10-15 16:00', 'Started', 'Medium', true, null, ['line.vestergaard']),
  T(65, 'PLAN', 'Opdater frivillighåndbog', null, '2026-02-23 09:00', '2026-03-02 08:00', '2026-04-30 16:00', 'Started', 'Low', false, null, ['anders.moeller']),
  // --- Færdige i september 2026 (så Dag/Uge/Måned har afsluttede opgaver) ---
  T(66, 'NED', 'Returner lejede telte', null, '2026-08-20 09:00', '2026-08-31 08:00', '2026-09-11 16:00', 'Completed', 'Medium', false, '2026-09-04 14:00', ['oliver.juhl', 'freja.lassen']),
  T(67, 'FRI', 'Rengør frivilligcamp efter RF26', null, '2026-08-25 09:00', '2026-09-01 08:00', '2026-09-15 16:00', 'Completed', 'Low', false, '2026-09-10 15:00', ['anders.moeller', 'mads.poulsen']),
  T(68, 'AFF', 'Afregning med affaldsleverandør', null, '2026-08-28 09:00', '2026-09-07 08:00', '2026-09-25 16:00', 'Completed', 'Medium', true, '2026-09-17 13:00', ['line.vestergaard']),
  T(69, 'SCN', 'Evaluering RF26 – scener og teknik', null, '2026-09-02 09:00', '2026-09-07 08:00', '2026-09-30 16:00', 'Completed', 'High', true, '2026-09-24 16:00', ['camilla.thorsen', 'mikkel.brandt']),
  T(70, 'PLAN', 'Opdater kontaktliste for holdledere', null, '2026-09-23 09:00', '2026-09-28 08:00', '2026-10-02 16:00', 'Completed', 'Low', false, '2026-09-29 11:00', ['sofie.andersen']),
]

// Afledte felter
const addHours = (s, h) => {
  const d = new Date(toDate(s).getTime() + h * 3600_000)
  const p = (n) => String(n).padStart(2, '0')
  const local = new Date(d.getTime() + 2 * 3600_000) // vises som +02 (kun til seed-tidspunkter)
  return `${local.getUTCFullYear()}-${p(local.getUTCMonth() + 1)}-${p(local.getUTCDate())} ${p(local.getUTCHours())}:${p(local.getUTCMinutes())}`
}
for (const t of tasks) {
  const approvers = roomApprovers[t.room].filter((a) => !t.assignees.includes(a))
  t.approver = approvers[0] ?? 'admin'
  t.assigner = roomApprovers[t.room][0]
  // Tildelt 1 dag efter oprettelse, dog 2 timer efter ved opgaver oprettet de sidste dage.
  t.assignedAt = toDate(t.created) > new Date('2026-09-27T00:00:00+02:00') ? addHours(t.created, 2) : addHours(t.created, 24)
  // Godkendt opgave -> Accepted-anmodning 3 timer før finished_at.
  t.allRequests = [...t.requests.map(([st, at, done, reason]) => ({ st, at, done: done ?? null, reason: reason ?? null }))]
  if (t.st === 'Completed' && t.appr) {
    t.allRequests.push({ st: 'Accepted', at: addHours(t.finished, -3), done: t.finished, reason: null })
  }
  if (t.st === 'Completed' && !t.finished) throw new Error(`Opgave ${t.nr} mangler finished_at`)
  if (t.max && t.assignees.length > t.max) throw new Error(`Opgave ${t.nr} har for mange tildelte`)
  if (t.allRequests.length && !t.assignees.length) throw new Error(`Opgave ${t.nr}: anmodning uden tildelte`)
}
if (new Set(tasks.map((t) => t.title)).size !== tasks.length) throw new Error('Opgavetitler skal være unikke')

const person = (key) => (key === 'admin' ? 'v_admin' : `(select id from public.profiles where email = ${q(key + MAIL)})`)

// 04 skal bygges FØR reservationerne nedenfor ændrer unitRows.
const datalayerSql = buildDatalayerSql()

// ---------------------------------------------------------------------
// Materiale-reservationer: modelleres også i JS, så facit passer.
// ---------------------------------------------------------------------
for (const t of tasks) {
  for (const [itemName, amount] of t.materials) {
    const newStatus = t.st === 'Started' ? 'Reserved' : 'InUse'
    const rows = unitRows.filter((r) => r.item === itemName)
    if (!rows.length) throw new Error(`Ukendt vare: ${itemName}`)
    if (rows[0].serial) {
      const picked = rows.filter((r) => r.st === 'Available').sort((a, b) => b.serial.localeCompare(a.serial)).slice(0, amount)
      if (picked.length < amount) throw new Error(`For få enheder: ${itemName}`)
      picked.forEach((r) => { r.st = newStatus })
    } else {
      const batch = rows.filter((r) => r.st === 'Available' && !r.ct && r.qty > amount).sort((a, b) => b.qty - a.qty)[0]
      if (!batch) throw new Error(`Ingen batch til: ${itemName}`)
      batch.qty -= amount
      unitRows.push({ ...batch, qty: amount, st: newStatus })
    }
  }
}

// ---------------------------------------------------------------------
// 06_tasks.sql
// ---------------------------------------------------------------------
function buildTasksSql() {
  const roomVals = rooms.map(([, n, c]) => `    (v_org, ${q(n)}, ${ts(c)})`).join(',\n')
  const roomRoleVals = rooms.flatMap(([, n, , roles]) => roles.map((r) => `    (${q(n)}, ${q(r)})`)).join(',\n')

  const taskBlocks = tasks.map((t) => {
    const lines = [`  -- #${t.nr} ${t.title}`]
    lines.push(`  insert into public.tasks (organisation_id, title, description, start_date, end_date, status, room_id, priority, max_assignees, created_at, finished_at, requires_approval)
  values (v_org, ${q(t.title)}, ${q(t.desc)}, ${ts(t.start)}, ${ts(t.end)}, '${t.st}', (select id from public.task_rooms where organisation_id = v_org and name = ${q(roomName[t.room])}), '${t.prio}', ${t.max ?? 'null'}, ${ts(t.created)}, ${ts(t.finished)}, ${t.appr})
  returning id into v_task;`)
    for (const a of t.assignees) {
      lines.push(`  insert into public.task_assignees (task_id, user_id, assigned_by, assigned_at) values (v_task, ${person(a)}, ${person(t.assigner)}, ${ts(t.assignedAt)});`)
    }
    for (const r of t.allRequests) {
      lines.push(`  insert into public.task_requests (task_id, requested_by, requested_at, status, handled_by, done_at, rejection_reason)
  values (v_task, ${person(t.assignees[0])}, ${ts(r.at)}, '${r.st}', ${r.st === 'Pending' ? 'null' : person(t.approver)}, ${ts(r.done)}, ${q(r.reason)});`)
    }
    for (const [itemName, amount] of t.materials) {
      const newStatus = t.st === 'Started' ? 'Reserved' : 'InUse'
      const isSerial = unitRows.find((r) => r.item === itemName)?.serial
      lines.push(`  select id into v_item from public.data_layer_items where organisation_id = v_org and name = ${q(itemName)};
  insert into public.task_materials (task_id, item_id, quantity) values (v_task, v_item, ${amount}) returning id into v_tm;`)
      if (isSerial) {
        lines.push(`  select array_agg(id) into v_ids from (
    select id from public.data_layer_item_units
    where item_id = v_item and status = 'Available' and serial_number is not null
    order by serial_number desc limit ${amount}
  ) s;
  update public.data_layer_item_units set status = '${newStatus}' where id = any(v_ids);
  insert into public.task_material_units (task_material_id, unit_id) select v_tm, unnest(v_ids);`)
      } else {
        lines.push(`  select id into v_unit from public.data_layer_item_units
  where item_id = v_item and status = 'Available' and serial_number is null and contents_total is null and quantity > ${amount}
  order by quantity desc limit 1;
  update public.data_layer_item_units set quantity = quantity - ${amount} where id = v_unit;
  insert into public.data_layer_item_units (organisation_id, item_id, location_id, quantity, status, created_at)
  select organisation_id, item_id, location_id, ${amount}, '${newStatus}', ${ts(t.assignedAt)} from public.data_layer_item_units where id = v_unit
  returning id into v_unit;
  insert into public.task_material_units (task_material_id, unit_id) values (v_tm, v_unit);`)
      }
    }
    return lines.join('\n')
  }).join('\n\n')

  return `-- =====================================================================
-- SEED 06 - OPGAVERUM, OPGAVER, TILDELINGER, GODKENDELSER, MATERIALER
-- GENERERET af docs/seed/generate.mjs - ret dér, ikke her.
-- Kræver 01, 02 og 04. ${rooms.length} rum, ${tasks.length} opgaver spredt okt 2024 -> sep 2026.
-- Opgave-chats oprettes automatisk af trg_sync_task_conversation, når en
-- opgave får 2+ tildelte. Materialer: enhedernes status sættes FØR de
-- linkes (guard-triggeren blokerer statusskift på linkede enheder).
-- =====================================================================
do $$
declare
  v_org   uuid;
  v_admin uuid;
  v_task  uuid;
  v_item  uuid;
  v_tm    uuid;
  v_unit  uuid;
  v_ids   uuid[];
begin
${orgGuard}

  if exists (select 1 from public.task_rooms where organisation_id = v_org)
     or exists (select 1 from public.tasks where organisation_id = v_org) then
    raise exception 'Allerede seedet - kør 99_cleanup.sql først.';
  end if;

  if not exists (select 1 from public.profiles where email like '%${MAIL}') then
    raise exception 'Kør 02_users.sql først.';
  end if;

  if not exists (select 1 from public.data_layer_items where organisation_id = v_org) then
    raise exception 'Kør 04_datalayer.sql først.';
  end if;

  select m.user_id into v_admin
  from public.memberships m
  join public.roles ro on ro.id = m.role_id
  where m.organisation_id = v_org and ro.name = 'Admin'
  limit 1;

  -- Rum
  insert into public.task_rooms (organisation_id, name, created_at)
  values
${roomVals};

  -- Rolle-låste rum
  insert into public.task_room_roles (room_id, role_id)
  select r.id, ro.id
  from (values
${roomRoleVals}
  ) as x(room_name, role_name)
  join public.task_rooms r on r.organisation_id = v_org and r.name = x.room_name
  join public.roles ro on ro.organisation_id = v_org and ro.name = x.role_name;

${taskBlocks}

  raise notice 'Seed 06 færdig: ${tasks.length} opgaver.';
end $$;
`
}

// =====================================================================
// FACIT
// =====================================================================
function buildFacit() {
  const count = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); m[k] = (m[k] ?? 0) + 1; return m }, {})
  const table = (head, rows) => `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}`
  const ym = (s) => s.slice(0, 7)
  const quarter = (s) => `${s.slice(0, 4)}-Q${Math.floor((Number(s.slice(5, 7)) - 1) / 3) + 1}`

  const byStatus = count(tasks, (t) => t.st)
  const byPrio = count(tasks, (t) => t.prio)
  const byRoom = count(tasks, (t) => roomName[t.room])
  const overdue = tasks.filter((t) => t.st !== 'Completed' && toDate(t.end) < NOW)
  const reqs = tasks.flatMap((t) => t.allRequests)
  const reqByStatus = count(reqs, (r) => r.st)
  const approved = reqByStatus.Accepted ?? 0
  const rejected = reqByStatus.Rejected ?? 0
  const pending = reqByStatus.Pending ?? 0
  const pendingTasks = new Set(tasks.filter((t) => t.allRequests.some((r) => r.st === 'Pending')).map((t) => t.nr))

  const months = [...new Set([...tasks.map((t) => ym(t.created)), ...tasks.filter((t) => t.finished).map((t) => ym(t.finished))])].sort()
  const createdM = count(tasks, (t) => ym(t.created))
  const finishedM = count(tasks.filter((t) => t.finished), (t) => ym(t.finished))
  const quarters = [...new Set(months.map((m) => quarter(m + '-01')))].sort()
  const createdQ = count(tasks, (t) => quarter(t.created))
  const finishedQ = count(tasks.filter((t) => t.finished), (t) => quarter(t.finished))
  const createdY = count(tasks, (t) => t.created.slice(0, 4))
  const finishedY = count(tasks.filter((t) => t.finished), (t) => t.finished.slice(0, 4))

  const today = '2026-09-29'
  const weekStart = new Date('2026-09-28T00:00:00+02:00')
  const createdToday = tasks.filter((t) => t.created.startsWith(today)).length
  const createdWeek = tasks.filter((t) => toDate(t.created) >= weekStart).length
  const finishedLast30 = tasks.filter((t) => t.finished && toDate(t.finished) >= new Date('2026-08-30T00:00:00+02:00')).length
  const finishedToday = tasks.filter((t) => t.finished?.startsWith(today)).length
  const finishedWeek = tasks.filter((t) => t.finished && toDate(t.finished) >= weekStart).length

  const perMember = count(tasks.flatMap((t) => t.assignees), (a) => a)
  const members = ['mette.hansen', 'lars.boegh', 'sofie.andersen', 'anders.moeller', 'henrik.dahl', 'emma.nielsen', 'jonas.holm',
    'camilla.thorsen', 'rasmus.kristensen', 'line.vestergaard', 'mikkel.brandt', 'peter.skov', 'nanna.bech', 'kasper.winther',
    'ida.mortensen', 'oliver.juhl', 'freja.lassen', 'mads.poulsen', 'sara.oestergaard', 'tobias.krogh', 'ahmad.rahimi']
  const activeMembers = members.filter((m) => perMember[m])
  const assignedLast90 = new Set(tasks.filter((t) => toDate(t.assignedAt) >= new Date('2026-07-01T00:00:00+02:00')).flatMap((t) => t.assignees))

  const unitsByStatus = count(unitRows, (r) => r.st)
  const qtyByStatus = unitRows.reduce((m, r) => { m[r.st] = (m[r.st] ?? 0) + (r.ct ? 1 : r.qty); return m }, {})
  const statuses = Object.keys(unitsByStatus).sort()

  const pct = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10} %` : '-')

  return `# Facit for mockdata (Roskilde Festival)

GENERERET af \`docs/seed/generate.mjs\`. Tallene gælder pr. **2026-09-29** (forfaldne og
"i dag/denne uge" ændrer sig, når datoen flytter sig). Admin-brugeren (dig) er ikke
tildelt nogen opgaver og ikke talt med i mock-brugerne nedenfor.

## Opgaver – overblik

| Udsagn | Værdi |
|---|---|
| Oprettet i alt | ${tasks.length} |
| Completed | ${byStatus.Completed ?? 0} |
| InProgress | ${byStatus.InProgress ?? 0} |
| Started | ${byStatus.Started ?? 0} |
| Startet, ikke færdige (Started + InProgress) | ${(byStatus.Started ?? 0) + (byStatus.InProgress ?? 0)} |
| Forfaldne (ikke Completed, end_date < nu) | ${overdue.length} |
| Oprettet i dag (29/9) | ${createdToday} |
| Oprettet denne uge (fra man 28/9) | ${createdWeek} |
| Færdige i dag / denne uge / sidste 30 dage | ${finishedToday} / ${finishedWeek} / ${finishedLast30} |
| Uden tildelte | ${tasks.filter((t) => !t.assignees.length).length} |
| requires_approval = true | ${tasks.filter((t) => t.appr).length} |
| requires_approval = false | ${tasks.filter((t) => !t.appr).length} |

Forfaldne: ${overdue.map((t) => `#${t.nr} ${t.title} (${t.st}, slut ${t.end.slice(0, 10)})`).join('; ')}.

## Fordeling

${table(['Prioritet', 'Antal'], ['Critical', 'High', 'Medium', 'Low'].map((p) => [p, byPrio[p] ?? 0]))}

${table(['Rum', 'Antal', 'Completed', 'Åbne'], rooms.map(([c, n]) => [n, byRoom[n] ?? 0,
    tasks.filter((t) => t.room === c && t.st === 'Completed').length, tasks.filter((t) => t.room === c && t.st !== 'Completed').length]))}

Rolle-låste rum: ${rooms.filter(([, , , r]) => r.length).map(([, n, , r]) => `${n} (${r.join(', ')})`).join('; ')}.

## Godkendelser (task_requests)

| Udsagn | Værdi |
|---|---|
| Anmodninger i alt | ${reqs.length} |
| Accepted | ${approved} |
| Rejected | ${rejected} |
| Pending | ${pending} |
| Opgaver der afventer godkendelse | ${pendingTasks.size} |
| Godkendelsesrate (accepted / (accepted + rejected)) | ${pct(approved, approved + rejected)} |

Opgaver afvist og senere godkendt: ${tasks.filter((t) => t.st === 'Completed' && t.allRequests.some((r) => r.st === 'Rejected')).map((t) => `#${t.nr}`).join(', ')}.

## Medarbejdere / teamaktivitet

| Udsagn | Værdi |
|---|---|
| Medlemmer i org (inkl. dig) | ${members.length + 1} |
| Mock-medlemmer | ${members.length} |
| Mock-medlemmer med mindst én opgave (Maks) | ${activeMembers.length} |
| Mock-medlemmer uden opgaver | ${members.length - activeMembers.length} (${members.filter((m) => !perMember[m]).join(', ')}) |
| Tildelt en opgave siden 1/7-2026 | ${assignedLast90.size} |
| Tildelinger i alt | ${tasks.reduce((a, t) => a + t.assignees.length, 0)} |
| Ikke-medlemmer: Pending ansøgninger / Rejected / Pending invitationer | 3 / 1 / 2 |

${table(['Medlem', 'Opgaver'], Object.entries(perMember).sort((a, b) => b[1] - a[1]).map(([m, n]) => [m, n]))}

## Materialer (data_layer_item_units, efter reservationer i 06)

"Rækker" = antal enhedsrækker. "Mængde" = som viewet \`data_layer_item_status_counts\`
(kapacitets-rækker tæller 1, ellers \`quantity\` – blander stk/kg/meter).

${table(['Status', 'Rækker', 'Mængde'], statuses.map((s) => [s, unitsByStatus[s], qtyByStatus[s]]))}
| **I alt** | **${unitRows.length}** | **${Object.values(qtyByStatus).reduce((a, b) => a + b, 0)}** |

Varer: ${items.length}. Kategorier: ${categories.length} + ${categories.reduce((a, [, s]) => a + s.length, 0)} underkategorier.
Linkede materialer: ${tasks.filter((t) => t.materials.length).map((t) => `#${t.nr} (${t.materials.map(([n, a]) => `${a} ${n}`).join(', ')})`).join('; ')}.

## Udvikling over tid

${table(['Måned', 'Oprettet', 'Færdige'], months.map((m) => [m, createdM[m] ?? 0, finishedM[m] ?? 0]))}

${table(['Kvartal', 'Oprettet', 'Færdige'], quarters.map((k) => [k, createdQ[k] ?? 0, finishedQ[k] ?? 0]))}

${table(['År', 'Oprettet', 'Færdige'], Object.keys(createdY).sort().map((y) => [y, createdY[y] ?? 0, finishedY[y] ?? 0]))}

## Kontrol-queries (kør som postgres i SQL Editor)

\`\`\`sql
-- org-id
select id from organisations where lower(trim(name)) = 'roskilde festival';

select status, count(*) from tasks where organisation_id = '<org>' group by 1;
select priority, count(*) from tasks where organisation_id = '<org>' group by 1;
select count(*) from tasks where organisation_id = '<org>' and status <> 'Completed' and end_date < now();
select tr.status, count(*) from task_requests tr join tasks t on t.id = tr.task_id
  where t.organisation_id = '<org>' group by 1;
select status, count(*), sum(case when contents_total is not null then 1 else quantity end)
  from data_layer_item_units where organisation_id = '<org>' group by 1;
select to_char(created_at at time zone 'Europe/Copenhagen', 'YYYY-MM') m, count(*)
  from tasks where organisation_id = '<org>' group by 1 order by 1;
\`\`\`
`
}

writeFileSync(join(OUT, '04_datalayer.sql'), datalayerSql)
writeFileSync(join(OUT, '06_tasks.sql'), buildTasksSql())
writeFileSync(join(OUT, 'FACIT.md'), buildFacit())
console.log(`OK: ${items.length} varer, ${unitRows.length} enhedsrækker, ${tasks.length} opgaver.`)
