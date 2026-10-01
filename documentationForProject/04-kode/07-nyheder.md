# 4.7 Kodegennemgang – Nyheder og rich text

Dækker: `src/store/apis/newsApi.ts`, `src/pages/News/{NewsPage,NewsDetailPage}.tsx` (`/nyheder`, `/nyheder/:id`), `src/components/News/*`, `src/components/TextEditor/RichTextEditor.tsx`, `src/lib/richText.ts`, `src/components/dashboard/NewsSlider.tsx` og tabellen `news`.

---

## 1. Datamodel og regler

`news(id, organisation_id, title, description, picture_url, url, published_at)` – én org-scoped opslagstavle (US-56). Ingen CHECK-constraints ud over FK/PK.

RLS (live) – det klassiske CRUD-mønster:

| Kommando | Regel |
|---|---|
| SELECT | `organisation_id = auth_profile_org() AND has_privilege_or_admin('read_news')` |
| INSERT / UPDATE / DELETE | samme med `create_news` / `update_news` / `delete_news` |

Trigger `trg_notify_news_published` (AFTER INSERT) → `notify_news_published()` opretter en `news`-notifikation til alle medlemmer med `read_news` eller `admin` (undtagen forfatteren) med `link = '/nyheder?news=<id>'`.

> **Observeret – lille bug:** `NewsPage.tsx` læser ikke query-parameteren `?news=`. Et klik på en nyhedsnotifikation lander derfor på listen, ikke på den konkrete nyhed (detaljeruten er `/nyheder/:id`).
>
> **Observeret – drift:** `notify_news_published` og triggeren findes i live-skemaet, men ikke i `docs/dbSchema.sql`.

---

## 2. Fil: `src/store/apis/newsApi.ts`

| Endpoint | Kald | Tags |
|---|---|---|
| `getNews` | `news.select(NEWS_COLUMNS).eq(org).order(published_at desc)` | `listTags('News')` |
| `getNewsById(id)` | `.eq(id).single()` – egen query, så et direkte link/F5 virker uden at have besøgt listen | `News/<id>` |
| `createNews` | insert (tom titel → `errors:required.newsTitle`); `published_at` kun hvis angivet (ellers DB-default `now()`) | inv. `News/LIST` |
| `updateNews` | update af kun de felter, der er sendt med (`!== undefined`-mønstret) | inv. `News/<id>`, `News/LIST` |
| `deleteNews` | delete | inv. `News/LIST` |

`mapNewsRow` oversætter `snake_case` → `camelCase` (`News`-typen i `src/types/news/newsType.ts`).

---

## 3. Rich text – og hvorfor sanitering er kritisk

### `src/components/TextEditor/RichTextEditor.tsx` (309 linjer)
Generisk WYSIWYG-editor på `contentEditable` + `document.execCommand` (kommentaren nævner, at API'et formelt er *deprecated*, men understøttes af alle nuværende browsere og undgår en editor-dependency). Værdien er en HTML-streng.
- Skriver kun til DOM'en, når værdien udefra afviger fra den nuværende (`el.innerHTML !== value`), ellers ville markøren hoppe til start ved hvert tastetryk.
- Gemmer sidste markering (`savedRangeRef`), fordi værktøjslinjen stjæler fokus.
- Links: `normaliseUrl` tilføjer `https://` til "dr.dk"; `isSafeHref` afviser andre protokoller end `http/https/mailto`.

### `src/lib/richText.ts` – whitelist-sanitizer
```ts
const ALLOWED_TAGS = new Set(['P','BR','STRONG','B','EM','I','U','UL','OL','LI','H2','H3','BLOCKQUOTE','A'])
const DROPPED_TAGS = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','NOSCRIPT'])
```
`sanitizeRichText(html)`:
1. Parser med `DOMParser` (inaktivt dokument – scripts kører ikke under parsing).
2. Rekursivt pr. element: `DROPPED_TAGS` fjernes **med** indhold; ukendte tags "pakkes ud" (teksten bevares); tilladte tags får **alle** attributter fjernet (dvs. `onerror`, `style` m.fl.), undtagen `href` på `<a>`, som kun beholdes hvis `isSafeHref`.
3. Returnerer `body.innerHTML`.

Øvrige hjælpere: `escapeHtml`, `isRichText` (regex `<[a-z]…>`), `richTextToPlainText` (til kort/slider med `line-clamp`), `plainTextToRichText` (gamle nyheder i ren tekst → `<p>`/`<br>`), `isEmptyRichText` (`<p><br></p>` tæller som tom).

**Hvor saniteres der?**

| Sted | Hvornår |
|---|---|
| `NewsFormModal.handleSubmit` | **før gem** (`description: sanitizeRichText(form.description)`) |
| `NewsDetailPage` | **ved visning** (`dangerouslySetInnerHTML={{ __html: sanitizeRichText(news.description) }}`) – appens eneste `dangerouslySetInnerHTML` |

> **Hvorfor begge steder?** Kommentaren i `richText.ts` forklarer truslen: indholdet skrives af privilegerede brugere, men læses af alle i organisationen; et injiceret `<script>` ville kunne læse deres Supabase-session fra `localStorage` og dermed handle som dem – forbi RLS. Sanitering ved visning beskytter også mod data indsat direkte via API'et (uden om formularen). Det er korrekt "defense in depth".
>
> **Observeret – `news.url` valideres ikke:** Feltet er et frit tekstinput, gemmes uændret og rendres som `<a href={news.url} target="_blank" rel="noopener noreferrer">`. Der bruges **ikke** `isSafeHref` her. Den værste konsekvens – `javascript:`-URL'er – afbødes af React 19, som i den installerede `react-dom` erstatter dem ("React has blocked a javascript: URL as a security precaution."). Andre protokoller (fx `data:`) og phishing-links filtreres ikke. **Anbefaling:** genbrug `isSafeHref` i formularen og/eller en DB-CHECK.

---

## 4. Sider og komponenter

| Fil | Ansvar |
|---|---|
| `pages/News/NewsPage.tsx` | Liste af `NewsCard`; "Opret" kræver `create_news`; modal til opret/rediger |
| `pages/News/NewsDetailPage.tsx` | Én nyhed; RLS giver "ikke fundet" for en anden orgs nyhed |
| `NewsCard.tsx` | Klikbart kort (titel, uddrag via `richTextToPlainText`, billede, dato); rediger/slet stopper event-propagation |
| `NewsActions.tsx` | Rediger (`update_news`) og slet (`delete_news`) – uafhængigt gatet |
| `NewsFormModal.tsx` | Titel, `RichTextEditor`, billede-URL, link-URL; blødt loft `MAX_DESCRIPTION_LENGTH` på ren tekst; modal kan ikke lukkes under gem |
| `NewsImage.tsx` | Billede eller Ponos-kompas som fallback ved manglende/død URL (`key={pictureUrl}` nulstiller fejl-state) |
| `DeleteNewsDialog.tsx` | Bekræft sletning; fejl bliver stående |
| `dashboard/NewsSlider.tsx` | Auto-roterende slider (pause ved hover) på dashboardets Oversigt |
