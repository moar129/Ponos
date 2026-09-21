// scripts/i18n-split.mjs
//
// Deler én samlet oversættelsesfil op i de 14 namespace-filer under
// src/i18n/locales/<sprog>/. Bruges når et nyt sprog tilføjes: det er
// nemmere at skrive og gennemgå ét dokument end 14 små.
//
//   node scripts/i18n-split.mjs <sprogkode> <sti-til-samlet.json>
//
// Den samlede fil har namespace-navnet som yderste nøgle:
//   { "common": { ... }, "nav": { ... }, ... }
//
// Kør npm run i18n:check bagefter - den fejler hvis et namespace mangler
// nøgler i forhold til dansk.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const [lang, file] = process.argv.slice(2)
if (!lang || !file) {
  console.error('Brug: node scripts/i18n-split.mjs <sprogkode> <samlet.json>')
  process.exit(1)
}

const LOCALES = 'src/i18n/locales'
const namespaces = readdirSync(join(LOCALES, 'da'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))

const all = JSON.parse(readFileSync(file, 'utf8'))
const outDir = join(LOCALES, lang)
mkdirSync(outDir, { recursive: true })

const missing = []
for (const ns of namespaces) {
  const data = all[ns]
  if (data === undefined) {
    missing.push(ns)
    writeFileSync(join(outDir, `${ns}.json`), '{}\n', 'utf8')
    continue
  }
  writeFileSync(join(outDir, `${ns}.json`), JSON.stringify(data, null, 2) + '\n', 'utf8')
}

const extra = Object.keys(all).filter((k) => !namespaces.includes(k))

console.log(`${lang}: skrev ${namespaces.length - missing.length}/${namespaces.length} namespaces`)
if (missing.length) console.log(`  tomme (manglede i kilden): ${missing.join(', ')}`)
if (extra.length) console.log(`  ADVARSEL ukendte namespaces i kilden: ${extra.join(', ')}`)
