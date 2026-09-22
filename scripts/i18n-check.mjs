// scripts/i18n-check.mjs
//
// Sammenligner hver sprogmappe under src/i18n/locales mod dansk, som er
// master. Fejler hvis et sprog mangler nøgler eller har nøgler, dansk
// ikke har (typisk en tastefejl eller en nøgle der er omdøbt ét sted).
//
// Kør: npm run i18n:check
//
// Et sprog med TOMME namespace-filer ({}) regnes som "ikke oversat endnu"
// og rapporteres som en optælling i stedet for som hundredvis af fejl -
// ordbøgerne bygges op ét sprog ad gangen.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const LOCALES_DIR = 'src/i18n/locales'
const MASTER = 'da'

function flatten(obj, prefix = '', out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, path, out)
    } else {
      out.add(path)
    }
  }
  return out
}

// i18next's flertalsformer (key_one, key_few, ...) er gyldige varianter af
// samme nøgle. Dansk har kun _one/_other, mens fx polsk også har _few og
// _many, så de må ikke tælle som "overskydende".
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

function baseKey(key) {
  return key.replace(PLURAL_SUFFIX, '')
}

// Hvilke flertalsformer et sprog FAKTISK kræver. Uden dette tjek ville en
// manglende polsk _few bare falde tilbage på _other - grammatisk forkert
// polsk, som ingen automatisk kontrol ville opdage. Intl kender reglerne,
// så vi behøver ikke vedligeholde en liste selv.
function requiredPluralCategories(locale) {
  try {
    return new Intl.PluralRules(locale).resolvedOptions().pluralCategories
  } catch {
    return ['one', 'other']
  }
}

/** Nøgler i master der har mindst én flertalsform, som basisnavn. */
function pluralBaseKeys(keys) {
  const bases = new Set()
  for (const key of keys) {
    if (PLURAL_SUFFIX.test(key)) bases.add(baseKey(key))
  }
  return bases
}

function readNamespace(locale, ns) {
  const file = join(LOCALES_DIR, locale, `${ns}.json`)
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (err) {
    throw new Error(`${file} er ikke gyldig JSON: ${err.message}`)
  }
}

const namespaces = readdirSync(join(LOCALES_DIR, MASTER))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))

const locales = readdirSync(LOCALES_DIR).filter((l) => l !== MASTER)

const master = new Map(
  namespaces.map((ns) => [ns, flatten(readNamespace(MASTER, ns) ?? {})]),
)
const masterTotal = [...master.values()].reduce((a, s) => a + s.size, 0)

let failed = false

for (const locale of locales) {
  const missing = []
  const extra = []
  const badPlurals = []
  const categories = requiredPluralCategories(locale)
  let translated = 0

  for (const ns of namespaces) {
    const data = readNamespace(locale, ns)
    if (data === null) {
      missing.push(`${ns}: HELE FILEN mangler`)
      continue
    }

    const keys = flatten(data)
    const expected = master.get(ns)
    translated += keys.size

    // En tom fil er "ikke oversat endnu", ikke en fejl.
    if (keys.size === 0 && expected.size > 0) continue

    const expectedBases = new Set([...expected].map(baseKey))
    for (const key of expected) {
      if (!keys.has(key) && !PLURAL_SUFFIX.test(key)) missing.push(`${ns}:${key}`)
    }
    for (const key of keys) {
      if (!expected.has(key) && !expectedBases.has(baseKey(key))) extra.push(`${ns}:${key}`)
    }

    // Hver flertalsnøgle skal have præcis de former sproget kræver.
    for (const base of pluralBaseKeys(expected)) {
      for (const category of categories) {
        if (!keys.has(`${base}_${category}`)) {
          badPlurals.push(`${ns}:${base}_${category}`)
        }
      }
    }
  }

  const pct = masterTotal === 0 ? 100 : Math.round((translated / masterTotal) * 100)
  const clean = missing.length === 0 && extra.length === 0 && badPlurals.length === 0
  const status = clean ? 'OK' : 'FEJL'
  console.log(
    `${locale}: ${translated}/${masterTotal} nøgler (${pct}%) - ${status}` +
      `  [flertal: ${categories.join('/')}]`,
  )

  if (badPlurals.length > 0) {
    failed = true
    console.log(`  Manglende flertalsform (${badPlurals.length}):`)
    for (const key of badPlurals.slice(0, 20)) console.log(`    ~ ${key}`)
    if (badPlurals.length > 20) console.log(`    ... og ${badPlurals.length - 20} mere`)
  }

  if (missing.length > 0) {
    failed = true
    console.log(`  Mangler (${missing.length}):`)
    for (const key of missing.slice(0, 20)) console.log(`    - ${key}`)
    if (missing.length > 20) console.log(`    ... og ${missing.length - 20} mere`)
  }
  if (extra.length > 0) {
    failed = true
    console.log(`  Findes ikke i ${MASTER} (${extra.length}):`)
    for (const key of extra.slice(0, 20)) console.log(`    + ${key}`)
    if (extra.length > 20) console.log(`    ... og ${extra.length - 20} mere`)
  }
}

console.log(`\n${MASTER} (master): ${masterTotal} nøgler i ${namespaces.length} namespaces`)

if (failed) {
  console.error('\ni18n:check fejlede.')
  process.exit(1)
}
