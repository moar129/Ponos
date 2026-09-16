# Studerende 1 – Fremgangsplan (Adgang, Organisation & Overblik)

Dette er den løbende statusoversigt for de 25 user stories, som Studerende 1 er ansvarlig for (jf. `userStories.md`, afsnit 13 "Arbejdsfordeling"). Filen opdateres efter hver færdig story, så en ny samtale/session altid kan se, hvor langt vi er, og hvad næste skridt er.

## Logbog

| Dato | Tekst |
|---|---|
| 09/09 | Jeg oprettede US-59-specifikationen for medlemskab af flere organisationer og beskrev den videre implementeringsplan. |
| 11/09 | Jeg rettede header- og footer-navigationen: US-65's slettede links (Anmodninger/Roller/Organisation) var kommet tilbage som døde links, US-45's org-gate og US-56's Nyheder-link var gået tabt. Alt gendannet, plus ny login-gate og "Log ind"-knap. Se US-45- og US-56-rækkerne. |
| 11/09 | Jeg byggede en offentlig forside på `/` (ad-hoc, ingen user story) og oprettede `/statistik` som pladsholder-rute, så de fire "Statistik"-links kunne flyttes væk fra `/`. Se afsnittet "Forside (ad-hoc)" nedenfor. |
| 11/09 | Jeg gav den udloggede header samme struktur som den indloggede: Forside/Log ind i nav-slottet med `getNavLinkClass`, nyt "Opret konto" i guld til højre, og fælles hamburger under 1024px. Se "Headeren: samme struktur logget ud som logget ind". |
| 11/09 | Jeg byggede `/om-os`, `/kontakt` og `/hjaelp` (footerens tre døde links) plus en catch-all 404-side, så "Udskudt"-listen er tom. Kontakt er info + mailto uden formular; hjælpesiden har FAQ på native `<details>`. Se afsnittet "Om os, Kontakt og Hjælp & support". |
| 11/09 | Jeg oprettede US-68 (nulstil adgangskode) og US-69 (skift adgangskode) i `userStories.md` og skrev den fulde implementeringsspec ned. **Kun dokumentation - ingen kode skrevet, ingen SQL kørt.** US-68 blev efter bruger-beslutning specificeret uden mailbekræftelse, fordi projektet er en prototype; forbeholdet står både i storyen og i specen. |
| 11/09 | Jeg hentede en fuld skema-eksport fra Supabase (49 policies, 20 funktioner, 8 triggers) og sammenlignede med `dbSchema.sql`. Fandt 7 udokumenterede DB-objekter og **en reel bug i vores egen `memberships`-policy fra Fase 1**. `dbSchema.sql` er bragt i sync, bugfixen er **kørt og testet i browseren**, og den færdigskrevne Fase 2-SQL ligger i den nye `docs/migrations/`-mappe. Se afsnittet "Skema-eksport og drift-fund 2026-09-11". |
| 14/09 | Jeg oprettede US-70 (se afsluttede opgaver) i `userStories.md`. **Kun dokumentation - ingen kode skrevet, ingen SQL kørt.** To forbehold skrevet ind i storyen: (1) intet sted i `src/` sætter status til `Completed` - `updateTaskStatus` findes i `taskApi.ts`, men importeres ingen steder, så visningen er tom indtil US-39's afslut-UI findes; (2) `tasks` har ingen `completed_at`, så `end_date` bruges som afslutningstidspunkt. Se US-70-rækken. |
| 11/09 | Jeg byggede US-68 og US-69 efter specen. `/glemt-adgangskode` + RPC `reset_password_prototype` (§15.17, kørt i Supabase) og "Adgangskode"-afsnittet på `/bruger`. Begge testet i browseren og bekræftet virkende. Prototype-forbeholdet på US-68 står stadig - flowet er uden mail. |
| 15/09 | Jeg startede Fase 3 (granulære CRUD-privilegier) efter bruger-forespørgsel. Trin 1-4 (Medlem-standardrolle, Roller/Organisation, Medlemskab/Medlemmer/Invitationer, Nyheder) er **kørt og bekræftet i Supabase**, `dbSchema.sql` opdateret, og frontend for de fire domæner bygget (`npm run build` grønt). Trin 5-6 (Datalayer/Opgaver) er designet men **venter** på godkendelse fra Studerende 2/3, jf. cross-domain-reglen. Se afsnittet "Fase 3 - granulære CRUD-privilegier" nederst for den fulde spec. **Endnu ikke testet i browseren.** |
| 16/09 | Ad-hoc UI-polish efter bruger-forespørgsel: profilbillede viser nu initialer (som i beskeder) i stedet for et generisk ikon, når intet billede er valgt. Ny delt `Avatar`-komponent (`src/components/common/Avatar.tsx`) + `getInitials`-util (`src/utils/getInitials.ts`), brugt i header-dropdown og på `/bruger` (US-03/US-04). Messages-komponenternes egen duplikerede initial-logik er bevidst urørt (bruger-beslutning). Ingen SQL. `npm run build` grønt, testet og bekræftet virkende i browseren af bruger. |

## Næste op

**1. ~~Kør bugfixen~~ ✅ FÆRDIG 2026-09-11** — `memberships`-policyens escalation-guard er rettet, kørt og testet. Dokumenteret i `dbSchema.sql` §16.10; migrations-filen er slettet efter kørsel, jf. konventionen. De to Fase 2-privilegier er samtidig tilføjet i `privilegeApi.ts`, så de kan tildeles inden gatingen strammes.

**2. ~~US-74 – Se egne opgaver på dashboardet~~ ✅ FÆRDIG 2026-09-14** — ny `MyTasksWidget.tsx` på Oversigt-fanen, testet i browseren. Se US-74-rækken.

**3. Fase 3 – Granulære CRUD-privilegier. ✅ FÆRDIG for alle domæner undtagen Opgaver (15/09).** Erstatter hvert domænes ene `manage_X`-privilegie med separate `create_X`/`read_X`/`update_X`/`delete_X` (kun de operationer der reelt findes pr. domæne), så en rolle fx kan have Create uden Delete. Read er nu også et rigtigt, tildelbart privilegie i stedet for åbent for alle - løst med en ny beskyttet standardrolle "Medlem" (ligesom "Admin"), der auto-tildeles ved medlemskab og som andre roller falder tilbage til ved sletning, så ingen bliver rolleløs. Se afsnittet "Fase 3 - granulære CRUD-privilegier" nederst for den fulde spec, inkl. fire bugfixes fundet+rettet under test.
- **SQL kørt og bekræftet i Supabase:** trin 1-4 (Medlem-standardrolle, Roller/Organisation, Medlemskab/Medlemmer/Invitationer, Nyheder) + trin 5 (Datalayer) + fire bugfixes. `dbSchema.sql` opdateret til at matche. Alle migrationsfiler slettet igen, jf. konventionen.
- **Frontend bygget for alle kørte domæner:** `privilegeApi.ts` (nye CRUD-konstanter, `PRIVILEGE_DOMAINS`, grupperet "Tilføj privilegie"-dropdown, ny `useHasAnyPrivilege`), `roleApi.ts` (`MEMBER_ROLE_NAME`, `AssignRoleInput.roleId` ikke længere nullable), `RolesPrivilegesPanel.tsx` ("Medlem" låst som "Admin"), `AdministrationTab.tsx`/`Dashboard.tsx` (fane-synlighed via `useHasAnyPrivilege`), Nyheder (create/update/delete uafhængige knapper), Datalager (`DataLayerPage.tsx` + kategori/item/lokations-komponenter, `categoryApi.ts` 42501-beskeder), samt header-navigation/Dashboard-genveje skjuler nu "Datalager"/"Nyheder" uden `read_datalayer`/`read_news`.
- **Testet og godkendt i browseren:** hele test-listen A-F inkl. escalation-guards.
- **Opgaver (trin 6) bevidst UDSAT** - talt med Studerende 3, domænet er ikke klar. `fase3-tasks-privileges.sql` ligger klar i `docs/migrations/` til senere, checkpoint-spørgsmålene står i afsnittet nederst.

**4. US-71 → US-72 → US-73 – Notifikationer. ← NÆSTE OPGAVE.** Kun stories skrevet (14/09). Kræver SQL (ny `notifications`-tabel + RLS + triggers) i `docs/migrations/`. Byg trigger-siden i to omgange: medlemskab/invitation, rolleændring og nyheder først (eget domæne, krogene findes allerede i `dbSchema.sql` §15), opgave-hændelserne til sidst, når Tasks-domænet ligger stille.

**5. US-70 – Se afsluttede opgaver.** Kun storyen er skrevet (14/09). Ren frontend, ingen SQL, ingen åbne spørgsmål - men **visningen er tom, indtil Studerende 3 bygger US-39's "marker som færdig"**, så testdata må sættes manuelt i Supabase for at se den virke. Derfor lagt efter notifikationerne. Rammerne står i US-70-rækken: underfane i dashboardets Administration-fane, gated på `admin`/`manage_tasks`, `end_date` i stedet for en `completed_at`-kolonne.

**US-62/US-63 er UDGÅET som selvstændige punkter 2026-09-15** - opslugt af Fase 3 (punkt 3 ovenfor), som designer dem direkte som fuldt CRUD i stedet for det gamle enkelt-privilegie `manage_datalayer`/`manage_tasks`. De to gamle migrationsfiler er slettet og erstattet af `fase3-datalayer-privileges.sql`/`fase3-tasks-privileges.sql`.

**Ny viden siden den gamle spec** (rettet i migrations-filen): `deleteTask` findes nu (både mutation og UI i `EditTaskModal.tsx`). Tabellen `task_rooms` er tilkommet og har **fire** policies, hvoraf to engelske duplikater gør en gating virkningsløs, hvis de ikke droppes samtidig.

I mellemtiden blev US-56 + US-57 (Nyheder) lavet ad-hoc, da de ikke afhænger af andre studerende. US-56 er FÆRDIG, testet og committet af bruger (enkelt-nyhed-side og Dashboard-slider tilføjet undervejs efter bruger-feedback). **US-57 er UDGÅET 2026-09-11** og rullet helt tilbage - browseren kan ikke læse DR's/TV2's feeds (ingen CORS-headers), og ingen organisation havde en nyheds-API; se afsnittet "US-57 udgået" nedenfor.

US-68 + US-69 (adgangskode) er FÆRDIGE 2026-09-11 - bygget, SQL kørt, testet i browseren. Se deres rækker i statustabellen og spec-afsnittet nederst. **Husk:** US-68 er en prototype-løsning uden mailbekræftelse og skal erstattes af et mailbaseret flow, før noget sættes i drift. US-74 er FÆRDIG 2026-09-14. Næste skridt herfra er notifikationerne (US-71/72/73) og derefter US-70 - alle tre uden afhængighed af de andre studerende. US-62/US-63 (Fase 2) ligger til sidst og venter på koordinering med Studerende 2/3.

(US-58, US-59, US-60, US-61, US-64, US-65, US-66, US-67, US-68 og US-69 blev alle tilføjet ad-hoc efter forespørgsel, uden for den planlagte rækkefølge - se noter nedenfor.)

## Status

| # | Story | Prioritet | Status | Note |
|---|---|---|---|---|
| US-01 | Opret konto | Critical | Done | SignUp.tsx + DB trigger komplet |
| US-02 | Login | Critical | Delvist | Login/redirect virker; banner viser nu "ingen organisation" + link til anmodning; `/`-ruten er stadig ikke beskyttet. En glemt adgangskode kan man nu selv nulstille (US-68, link på loginsiden), og skifte den fra profilen (US-69) - begge Done |
| US-58 | Opret organisation | Critical | Done | `create_organisation`-RPC (`dbSchema.sql` §15.7-15.8) + case-insensitivt unikt navn (`organisations_name_unique`) kørt og testet i Supabase; opret-formular på `/organisation`, slået sammen med US-05's anmod-flow i samme UI (faner) |
| US-03 | Se profil | Medium | Done | `/bruger` (ProfilePage.tsx) + profileApi.ts; header viser nu rigtigt navn/rolle |
| US-04 | Rediger profil | Medium | Done | Rediger navn, beskrivelse, billed-URL; email/rolle/org er read-only |
| US-05 | Anmod om medlemskab | Critical | Done | Flyttet fra egen side (`RequestMembership.tsx`/`/request-membership`, nu slettet) ind i `OrganisationPage.tsx` som en fane ved siden af "Opret organisation"; membershipApi.ts uændret |
| US-06/07/08 | Se, acceptere og afvise medlemsanmodninger (admin) | Critical | Done | `/medlemsanmodninger` + membershipApi/privilegeApi; ny RLS-policy så admin kan se ansøgeres navn/email; adgang nu granulær via `manage_membership_requests`-privilegie (Fase 1) |
| US-09 | Se organisation | Medium | Done | `/organisation` (OrganisationPage.tsx) + organisationApi.ts |
| US-10 | Rediger organisation | Medium | Done | Kun `name` redigerbar (organisations-tabel har pt. kun denne kolonne); adgang nu granulær via `manage_organisation`-privilegie (Fase 1) |
| US-11 | Tildel rolle | High | Done | Roller & privilegier-panelet i dashboardets Administration-fane (`RolesPrivilegesPanel.tsx`, tidligere `/roller`/`RolesPage.tsx`) + roleApi.ts (`assignRole`); egen række er skrivebeskyttet, DB-trigger blokerer selv-tildeling; adgang nu granulær via `manage_roles`, med escalation-guard mod at give admin-rolle væk uden selv at være admin (Fase 1). **Fundet under test (efter dashboard-flytning):** dropdownen kunne kun vælge mellem eksisterende roller - ingen måde at fjerne en rolle igen og gøre medlemmet til et almindeligt medlem uden privilegier. RLS'ens escalation-guard tillod allerede eksplicit `role_id is null` for enhver med `manage_roles` (ikke kun fulde administratorer) - rettet ved at tillade `roleId: string \| null` i `AssignRoleInput`/`assignRole`, og tilføje "Standard medlem (ingen rolle)" som valgmulighed i dropdownen (sentinel-værdi `__none__`, mappes til `null`). Ren frontend-rettelse, ingen SQL-ændring |
| US-12 | Opret rolle | Medium | Done | roleApi.ts (`createRole`); udvidet med `updateRole`/`deleteRole` (fuld CRUD, ikke krævet af story men RLS var allerede klar), UI på `/roller`; adgang nu granulær via `manage_roles` (Fase 1) |
| US-13 | Opret privilege | Medium | Done | privilegeApi.ts udvidet (`getOrganisationPrivileges`, `createPrivilege`, `updatePrivilege`, `deletePrivilege` - fuld CRUD), UI på `/roller`; adgang nu granulær via `manage_roles`, med escalation-guard mod at oprette/omdøbe et privilegie til `admin` uden selv at være admin (Fase 1). "Tilføj privilegie" er en dropdown af kendte privilegier (`KNOWN_PRIVILEGES`/`privilegeLabel` i privilegeApi.ts) + "Andet"-fritekst, i stedet for rent fritekstfelt — undgår tastefejl på de bogstavelige RLS-privilegienavne |
| US-62 | Granulære skriverettigheder i Datalayer | Medium | Opslugt af Fase 3 - Done | 2026-09-15: designet direkte som fuldt CRUD (`create/read/update/delete_datalayer`). Studerende 2 godkendte. Frontend-gating bygget og `npm run build` grønt: `DataLayerPage.tsx` (opret kategori/tilføj items/bulk-slet + tom-tilstand uden `read_datalayer`), `CategoriTreeNodeComponent.tsx`, `itemsDetailComponent.tsx`, `locationsManagerComponent.tsx`, `locationsPickerComponent.tsx`, `addItemsComponent.tsx` (alle rediger/slet/opret-knapper gated pr. operation), `categoryApi.ts` (42501-fejlbeskeder på alle 10 mutations). SQL **kørt og bekræftet i Supabase**, `dbSchema.sql` §16.6 opdateret. **Mangler:** browser-test (se "Fase 3" nederst) |
| US-63 | Granulære skriverettigheder i Opgaver | Medium | Opslugt af Fase 3 | 2026-09-15: designes nu direkte som fuldt CRUD. SQL klar i `docs/migrations/fase3-tasks-privileges.sql` (erstatter den slettede `us-63-...sql`), løser 2 af de 3 gamle blokerings-spørgsmål (selvbetjent tilmelding bevares, selvbetjent statusskift via ny `set_task_status`-RPC) - `task_rooms.required_role_id` forbliver uafklaret. Venter på aftale med Studerende 3 - se "Fase 3" nederst |
| US-45 | Se dashboard | Critical | Done | `Dashboard.tsx` omskrevet fra placeholder til Oversigt/Organisation/Administration-faner - se US-65-rækken. Manuelt testet og bekræftet virkende i browseren. Genvejskort til Statistik tilføjet på Oversigt-fanen (ad-hoc, `OverviewTab.tsx`) - peger på "/" ligesom header-navigationen, da Statistik-siden endnu ikke er bygget (anden studerendes domæne). Manuelt testet og bekræftet virkende. Stat-kortene (Antal items/Antal opgaver/Dine opgaver, `StatCard.tsx`) er efterfølgende fjernet igen (ad-hoc bruger-forespørgsel) og erstattet af: Genveje-grid'et flyttet øverst, derunder to nye "kommer snart"-placeholder-bjælker (`PlaceholderBar.tsx`) til "Dine opgaver" og "Notifikationer" (efter bruger-feedback vist side om side i et 2-kolonne grid, ikke stablet), og nederst en tredje til "Nyheder". Alle tre er rent visuelle - ingen data/queries/SQL. Manuelt testet og bekræftet virkende i browseren. "Dine opgaver" er nu formaliseret 2026-09-14 som US-74 - `task_assignees`-join'et (via `getMyTaskIds` i `taskApi.ts`) er nok til at fylde bjælken, det er kun linket ind til den enkelte opgave der afventer en detaljevisning med egen adresse (US-36); "Nyheder" afventer bevidst US-56/US-57. **Sidefund (ikke rettet, kun flagget):** "Notifikationer" har intet datamodel eller user story i projektet endnu - kun en død klokke-ikon-knap i header der linker til `/notifikationer` (ingen rute). Nu formaliseret 2026-09-14 som US-71 (tabel+triggers), US-72 (visning) og US-73 (læst/ulæst) - se deres rækker nedenfor. `StatCard.tsx`/`StatCardProps` slettet som ubrugt kode. Header-navigationen (`headerComponent.tsx`) skjuler nu Opgaver/Statistik/Datalager for brugere uden aktiv organisation (samme `useGetMyOrganisationQuery`-mønster som Oversigt-fanen) - Dashboard-linket forbliver altid synligt. Manuelt testet og bekræftet virkende i browseren (bruger uden org ser kun Dashboard, links dukker op igen med aktiv org). **Regression fundet+rettet 2026-09-11:** org-gaten gik tabt i UI-commits `e94f566`/`be7b8f9`, som samtidig bragte de US-65-slettede links (`/roller`, `/medlemsanmodninger`, `/organisation`) tilbage i header og footer - alle tre døde ruter. Gendannet, men nu med `profile.activeOrganisationId` fra headerens allerede hentede `useGetMyProfileQuery` i stedet for et separat `useGetMyOrganisationQuery`-kald (samme ja/nej-svar, ingen ekstra request pr. side), og uden den gamle "antag org under load"-adfærd - links vises først når profilen er hentet, så en org-løs bruger aldrig ser dem blinke forbi. Headeren gater nu også hele nav'en, klokken, profil-dropdownen og hamburgeren på `useGetSessionQuery` (samme mønster som footeren) - før rendrede de også på `/login`/`/signup` - og viser en "Log ind"-knap til udloggede; logoet peger på `/` i stedet for `/dashboard` når man ikke er logget ind. `footerComponent.tsx` er bragt i sync med samme regler, så de to nav-lister ikke kan drive fra hinanden igen. Klokke-ikonet er nu en deaktiveret knap ("Kommer snart") i stedet for et link til den ikke-eksisterende `/notifikationer`-rute. Ingen SQL, ingen nye endpoints/typer. **Kriterium justeret 2026-09-14:** "Dashboardet indeholder mindst én oversigt over Datalayer-data" krævede reelt nøgletals-kortene, som nu er droppet (US-46/47 udgået) - kriteriet lyder nu på adgang til Datalayer via genvej, og opgave-oversigten peger på US-74. Skal der igen vises Datalayer-data direkte på dashboardet, kræver det en ny story. |
| US-46 | Se antal items | High | Udgået | **UDGÅET 2026-09-14 efter bruger-beslutning: nøgletals-kortene på dashboardet er droppet helt.** Var Done: `OverviewTab.tsx` talte items rekursivt via eksisterende `useGetCategoryTreeQuery` (categoryApi.ts) i et `StatCard`, intet nyt count-endpoint. Kortene blev fjernet igen under US-65, og `StatCard.tsx` slettet - denne række blev bare aldrig opdateret. Bygges ikke op på ny |
| US-47 | Se antal opgaver | High | Udgået | **UDGÅET 2026-09-14, samme beslutning som US-46.** Var Done: `OverviewTab.tsx` brugte `tasks.length` fra eksisterende `useGetTasksQuery` (taskApi.ts) i et `StatCard`, fjernet igen under US-65. Opgave-overblikket på dashboardet dækkes i stedet af US-74, som viser brugerens faktiske opgaver frem for et samlet tal. Bygges ikke op på ny |
| US-56 | Se og administrere nyheder | Low | Done | Omdefineret efter afklaring med bruger (2026-09-10): nyheder er organisationens egne (opslagstavle, ikke globalt feed) - `news`-tabellen ændret fra global+select-only til org-scoped med skrivning gated af nyt `manage_news`-privilegie (`dbSchema.sql` §13/§16.9). Nyheder oprettes udelukkende manuelt (US-57's API-import er udgået 2026-09-11, se den række). `newsApi.ts` (getNews/getNewsById/createNews/updateNews/deleteNews), type `newsType.ts`, side `/nyheder` (`NewsPage.tsx` + `NewsCard.tsx`/`NewsFormModal.tsx`) + enkelt-nyhed-side `/nyheder/:id` (`NewsDetailPage.tsx`, tilføjet efter bruger opdagede man ikke kunne klikke ind på en enkelt nyhed), nav-link i header (gated bag `hasOrganisation`). Dashboard-Oversigtens "Nyheder"-placeholder er nu en auto-kørende slider (`NewsSlider.tsx`) gennem de seneste 10 nyheder - billedet fylder hele slidet som baggrund (gradient + hvid tekst) når sat, ellers hvid baggrund. `news` har desuden et valgfrit `url`-felt (link til original-artiklen, vist som "Læs mere"). SQL kørt og bekræftet i Supabase. **Testet med 10 manuelle test-nyheder og bekræftet virkende i browseren af bruger, committet.** **Opfølgning 2026-09-11 (efter US-57 udgik):** beskrivelsen kan nu formateres som i et tekstbehandlingsprogram - ny genbrugelig `RichTextEditor.tsx` (`src/components/TextEditor/`, bevidst uden for News-mappen så fx opgavebeskrivelser kan bruge den senere) med fed/kursiv/understreget, punktopstilling/nummereret liste, typografi-dropdown (Normal/Overskrift/Underoverskrift), ryk ind/ud og link-indsættelse. Bygget på `document.execCommand` uden nye dependencies, samme linje som `NewsSlider.tsx`. Da indholdet renderes med `dangerouslySetInnerHTML`, er der en egen whitelist-sanitizer (`src/lib/richText.ts`): kun kendte tags overlever, ALLE attributter fjernes undtagen `href`, og `href` kun med http/https/mailto - uden det kunne en `manage_news`-indehaver køre script i alle organisationsmedlemmers browser og læse deres Supabase-session, altså eskalere forbi RLS. Saniteres både ved gem, ved indsæt fra udklipsholder (Word-paste) og igen ved visning. Kort og slider viser uddraget via `richTextToPlainText` (ellers rå tags gennem `line-clamp`); gamle rene tekst-nyheder detekteres med `isRichText` og vises som hidtil, så ingen datamigration var nødvendig. Blødt loft på 20.000 tegn i formularen, ingen DB-constraint. **Bugs fundet+rettet under test:** (1) et indsat link landede altid i begyndelsen af beskrivelsen i stedet for ved markøren - `run()` genskabte kun den gemte markering, hvis den lå UDEN FOR editoren, men `el.focus()` sætter selv markøren tilbage i starten af feltet, så betingelsen var falsk; rettet til altid at genskabe fra `savedRangeRef`. (2) man kunne kun angive selve adressen, ikke linkets tekst - linkpanelet har nu to felter ("Tekst der vises" + adresse), forudfylder teksten fra markeringen og forudfylder begge felter, hvis markøren står i et eksisterende link (som så erstattes frem for at få et link indlejret i sig). Samtidig omdøbt "Link (valgfri)" → "Link til oprindelig artikel (valgfri)" og "Læs mere" → "Læs hele artiklen" efter bruger-feedback om at labellen var intetsigende. `.rich-text`-styling i `index.css` (Tailwind-preflight nulstiller h2/ul/ol, og typography-pluginnet er ikke installeret). **Ingen SQL** - `description` er allerede `text`. **Regression fundet+rettet 2026-09-11:** Nyheder-nav-linket forsvandt fra headeren i samme UI-commits som US-45's org-gate (`e94f566`/`be7b8f9`) - ruten `/nyheder` fandtes, men der var ingen vej til den fra navigationen. Gendannet i både header og footer, inde i `hasOrganisation`-gaten som oprindeligt. |
| US-57 | Hente nyheder fra en organisations egen eksterne API | Low | Udgået | **UDGÅET 2026-09-11 efter bruger-beslutning - al kode og alle DB-objekter fjernet igen** (se afsnittet "US-57 udgået" nederst for målingerne bag beslutningen og den SQL, der ruller det tilbage). Var implementeret som: org-konfigurerbar API-adresse+nøgle (`news_sources`), admin-trigget "Hent nu" (`NewsSourcePanel.tsx`, `fetchFromNewsSource`), fast JSON-kontrakt. Blev aldrig testet mod et rigtigt endpoint, fordi ingen organisation havde en nyheds-API at pege på (kandidat `godtgoerelse-api.roskilde-festival.dk` undersøgt og forkastet - er Roskilde Festivals interne udlægsrefusions-API). Nyheder oprettes nu udelukkende manuelt på siden (US-56). |
| US-59 | Være medlem af flere organisationer | High | Done | DB-migration kørt og bekræftet (memberships-tabel, `active_organisation_id`, nye RPC'er `set_active_organisation`/opdateret `create_organisation`) + `dbSchema.sql` opdateret; `categoryApi.ts`/`taskApi.ts` rettet til nyt kolonnenavn. Frontend: profileApi/organisationApi/roleApi/privilegeApi omlagt til memberships; `/organisation` har 4 faner når man har en aktiv org: "Organisation", "Mine organisationer" (liste + skift aktiv), "Anmod om medlemskab", "Opret organisation" (sidste to tilføjet undervejs - opdaget under test at en bruger med en org allerede ikke havde nogen UI-vej til at anmode/oprette en 2. org, kun no-org-fligen havde det). Manuelt testet og bekræftet virkende i browseren. **Bugs fundet+rettet under test:** (1) `profiles`-SELECT-policyen "Se egen profil eller profiler i egen organisation" sammenlignede stadig `active_organisation_id` direkte i stedet for at tjekke `memberships` - et medlem af 2 organisationer blev usynligt for administratorer i den organisation, der IKKE var brugerens aktive (fx forsvandt fra medlemslisten på `/roller`). Rettet til at bruge `exists (... memberships ...)`, se `dbSchema.sql` §16.2. (2) "Mine organisationer" viste "Ingen rolle tildelt" for enhver organisation der ikke var aktiv, fordi roles-RLS er scopet til aktiv organisation - løst med ny security definer-funktion `get_my_memberships()` (§15.12), som `organisationApi.ts`s `getMyMemberships` nu kalder i stedet for 3 separate klient-forespørgsler. (3) Efter login som en anden bruger viste siden forkert rolle/organisation indtil F5 - `authApi.ts`s login/logout-tag-invalidering var en hardcoded liste fra FØR US-59, som aldrig fik `'Membership'` (eller `'Role'`/datalag/opgave-tags) tilføjet. Rettet ved at udtrække én delt, eksporteret `USER_SCOPED_TAGS`-liste i `supabaseApi.ts`, som nu bruges af BÅDE `authApi.ts` (login/logout) og `organisationApi.ts` (skift aktiv org/opret/forlad organisation) - undgår at de to lister kan drive fra hinanden igen. Ingen SQL, kun frontend. |
| US-60 | Oprette flere organisationer | Medium | Done | `create_organisation`-RPC'ens "allerede medlem"-blokering fjernet; en nyoprettet organisation bliver altid aktiv med det samme (også ved 2./3. org - ændret undervejs efter bruger-feedback om at "kan vælge som aktiv" skulle betyde automatisk skift + kvitteringsbesked, ikke manuelt skift bagefter). "Opret organisation"-fane på `/organisation` for brugere med en aktiv org, med besked "Organisationen X er oprettet og er nu din aktive organisation". Manuelt testet og bekræftet virkende (auto-skift af aktiv org bekræftet af bruger). |
| US-61 | Forlade en organisation | Medium | Done | Ny RPC `leave_organisation` (`dbSchema.sql` §15.11) - blokerer hvis brugeren er organisationens eneste administrator; hvis den forladte organisation var aktiv, vælges automatisk en anden af de resterende medlemskaber som ny aktiv (eller ingen, hvis der ikke er flere) + besked om det, samme mønster som US-60. "Forlad"-knap pr. række under "Mine organisationer" på `/organisation`, med bekræft-trin. Manuelt testet og bekræftet virkende i browseren, inkl. de 3 bugs fundet undervejs (se US-59-rækken). |
| US-64 | Slette en organisation | Medium | Done | Ny RPC `delete_organisation` (`dbSchema.sql` §15.13) - kan teknisk slette enhver organisation brugeren administrerer (samme manuelle memberships/privileges-opslag som `leave_organisation`, da `has_privilege_or_admin()` kun tjekker aktiv organisation); ingen "sidste medlem"-restriktion, dækker både "alene tilbage" og "organisationen lukker ned med andre medlemmer tilbage". Al data cascader automatisk via eksisterende FK'er. `get_my_memberships()` (§15.12) udvidet med `is_admin`/`member_count`. "Slet organisation"-knap under "Mine organisationer", men - efter bruger-feedback - kun vist på den AKTIVE organisations række (bevidst UI-begrænsning, ikke RPC-begrænsning, for at undgå fejlagtig sletning af den forkerte org i listen). Bekræft-flow: skriv organisationens navn + 2 tjekbokse (datatab, og - hvis relevant - antal andre medlemmer der mister adgang). **Bugs fundet+rettet under test:** (1) `delete_organisation`s kaskade ned til `roles`/`privileges` ramte `trg_prevent_admin_role_change`/`trg_prevent_admin_privilege_change` (15.5/15.6), som normalt (med god grund) blokerer sletning af organisationens "Admin"-rolle/privilegie - men her forsvinder hele organisationen alligevel. Rettet ved at give begge triggere et nyt `ponos.bypass_admin_protection`-flag (samme mønster som `ponos.bypass_self_role_org_change`), som `delete_organisation` nu sætter før sletningen. (2) `delete_organisation` BEREGNEDE den nye aktive organisation efter sletning (`v_next_org_id`), men glemte den faktiske `update profiles set active_organisation_id = ...` - kolonnen stod derfor på null (nulstillet af FK-cascaden) selvom brugeren havde et andet medlemskab tilbage. Rettet ved at tilføje den manglende UPDATE. (3) Da active_organisation_id var null, var der ingen UI-vej tilbage til "Mine organisationer" - `/organisation`s "ingen organisation"-visning viste kun opret/anmod-faner. Rettet defensivt (uafhængigt af om bug (2) skulle opstå igen): den visning tjekker nu `getMyMemberships` og tilbyder en "Mine organisationer"-fane, hvis brugeren rent faktisk har medlemskaber, med en forklarende tekst i stedet for at antage "ingen aktiv org" = "ingen organisationer overhovedet". Manuelt testet og bekræftet virkende i browseren. |
| US-65 | Administration og organisation samlet på dashboardet | Medium | Done | Ny story, tilføjet ad-hoc efter bruger-forespørgsel under planlægning af US-45/46/47, siden udvidet efter endnu en forespørgsel (se `userStories.md`). Roller & privilegier (`RolesPage.tsx`), medlemsanmodninger (`MembershipRequestsPage.tsx`) og organisationens rediger/slet (dele af `OrganisationPage.tsx`) er flyttet ind i dashboardets Administration-fane som selvstændige, individuelt privilegie-gatede paneler (`RolesPrivilegesPanel.tsx`, `MembershipRequestsPanel.tsx`, `OrganisationAdminPanel.tsx`). Resten af `OrganisationPage.tsx` (se org, mine organisationer, anmod, opret) er flyttet til en ny, ikke-privilegie-gated Organisation-fane (`OrganisationTab.tsx`). De tre gamle sider og deres ruter (`/roller`, `/medlemsanmodninger`, `/organisation`) samt header-nav/dropdown-links er slettet - dashboardet har nu URL-drevet fane-state (`?tab=...`). Oversigt-fanen udvidet med "dine opgaver"-tal og genvejskort til Datalager/Opgaver (`QuickLinkCard.tsx`), samt en venlig tom-tilstand for brugere uden aktiv organisation i stedet for tre ens fejlbeskeder. Organisation-tab/Administration-organisation-panel fik desuden en header (ikon + navn + "Administrator"-badge) og et "Antal medlemmer"-nøgletal i stedet for bare navnet (genbruger allerede hentet `useGetMyMembershipsQuery`-data, ingen nye kald/SQL). **Bug fundet+rettet under test:** "Roller & privilegier"-panelet havde en nestet underfane til "Medlemmer" - tre niveauer af faner oven i hinanden (Dashboard > Administration > Roller & privilegier > Medlemmer) med to identisk navngivne "Roller & privilegier" (top-niveau og fane-niveau) virkede forvirrende. Rettet ved at gøre "Medlemmer" til en sideordnet fane ved siden af "Roller & privilegier" i Administration (ny `MembersPanel.tsx`, udtrukket fra `RolesPrivilegesPanel.tsx`). Ren frontend-omstrukturering, ingen RLS/SQL-ændringer. Manuelt testet og bekræftet virkende i browseren efter rettelsen. **UI-fejl fundet+rettet 2026-09-11:** alle tre fanerækker (top-fanerne i `Dashboard.tsx`, Administrations underfaner, Organisations underfaner) var `flex gap-2` uden hverken ombrydning eller scroll, så fanerne løb ud over kortets kant på mobil - top-fanerne fylder ~380px mod ~295px tilgængelig bredde på 375px, og underfanerne har op til fem faner. Rettet med `overflow-x-auto` + ny `.no-scrollbar`-utility i `index.css` (Tailwind har ingen, og en synlig vandret scrollbar over den grå fane-linje ser ud som en fejl), `shrink-0 whitespace-nowrap` på hver fane så den ikke mases sammen, og skalerende afstand (`gap-1 sm:gap-2`, `px-3 sm:px-4`) så scrollen først træder i kraft, når der reelt ikke er plads. Dashboard-kortets `p-8` er samtidig gjort responsivt (`p-4 sm:p-6 lg:p-8`) - 32px polstring hele vejen rundt på en telefon var i sig selv en del af pladsproblemet. Top-fanerne og Administrations underfaner manglede desuden `-mb-px`, som Organisations underfaner havde, så den aktive streg lå forskelligt i forhold til den grå linje de tre steder; nu ens. |
| US-66 | Fjerne medlem fra organisation | Medium | Done | Ny story, tilføjet ad-hoc efter bruger-forespørgsel. Ny RPC `remove_member(p_user_id)` (security definer, modelleret efter `leave_organisation`) - scopet til administratorens AKTIVE organisation, blokerer selv-fjernelse, og har en escalation-guard: kun en reel administrator (`admin`-privilegiet) må fjerne et medlem, hvis rolle bærer admin-privilegiet. Ny privilegie `manage_members`. Frontend: `MembersPanel.tsx` har nu en uafhængigt gated "Fjern"-knap pr. medlem (bekræft-trin), med samme escalation-guard genskabt client-side (skjuler knappen for en manage_members-only bruger over for et admin-medlem). SQL kørt og bekræftet i Supabase - `dbSchema.sql` opdateret (§15.14). Manuelt testet og bekræftet virkende i browseren (fjern almindeligt medlem, knap skjult for manage_members-only over for admin, fuld admin kan fjerne admin, fjernet bruger mister adgang/får ny aktiv org). |
| US-67 | Invitere bruger til organisation | Medium | Done | Ny story, tilføjet ad-hoc efter bruger-forespørgsel. Ny tabel `membership_invitations` (mirror af `membership_requests`, men admin-initieret i stedet for bruger-initieret) + trigger `handle_membership_invitation_status_change` (samme mønster som `handle_membership_request_status_change`) + RPC `invite_member(p_email)` (slår email op, validerer, opretter invitation) + RLS-policies (modtager svarer selv, admin kan annullere en ventende invitation). To nye, snævre RLS-tilføjelser på `organisations`/`profiles` lader hhv. modtageren se organisationens navn og administratoren se den invitteredes navn/email, uden at det kræver et eksisterende medlemskab (samme mønster som `is_pending_requester_to_my_org()`). Ny privilegie `manage_invitations`. Frontend: ny `InvitationsPanel.tsx` (admin-side: invitér + annullér), ny `InvitationsSection` i `OrganisationTab.tsx` (modtager-side: acceptér/afvis, betinget fane som "Mine organisationer"), `PendingRequestBanner.tsx` viser nu også en ventende invitation. **Bug fundet+rettet under test:** modtageren kunne ikke acceptere en invitation. Årsag: `handle_membership_invitation_status_change` opdaterer `profiles.active_organisation_id` for `invited_user_id` - ved en ANMODNING er det altid en ADMIN der godkender (rammer aldrig admins egen profil-række), men ved en INVITATION er det MODTAGEREN SELV der accepterer sin egen række, så opdateringen rammer `auth.uid()`s egen profil og udløste `trg_prevent_self_role_org_change` ("Du kan ikke ændre din egen organisationstilknytning direkte."). Rettet ved at tilføje samme `ponos.bypass_self_role_org_change`-flag som `create_organisation`/`set_active_organisation`/`leave_organisation`/`delete_organisation` allerede bruger - samme klasse fejl som er set flere gange før i dette projekt (se US-59/64-rækkerne). SQL kørt og bekræftet i Supabase - `dbSchema.sql` opdateret (§6.6, §15.15-15.16, §16.1/16.2/16.11). Manuelt testet og bekræftet virkende i browseren efter rettelsen (invitér, fejlbeskeder for ikke-eksisterende/allerede-medlem/dublet, accept, afvis, annullér, banner, inviteret bruger uden aktiv org). |
| US-68 | Nulstil adgangskode | High | Done | Ny story, tilføjet ad-hoc efter bruger-forespørgsel 2026-09-11. Opdaget under arbejdet med `/hjaelp`: der fandtes intet `resetPasswordForEmail`/`updateUser` i `src/`, så FAQ-posten "Jeg har glemt min adgangskode" måtte skrives som "skriv til os". Bygget 2026-09-11 efter specen i afsnittet "US-68 + US-69 – Adgangskode" nederst. Ny RPC `reset_password_prototype(p_email, p_first_name, p_last_name, p_new_password)` (`dbSchema.sql` §15.17, security definer, `grant` til `anon` + `authenticated`, skriver bcrypt-hash direkte i `auth.users`). Frontend: ny side `ForgotPassword.tsx` → offentlig rute `/glemt-adgangskode`, `resetPassword`-mutation i `authApi.ts` (RTK Query, ikke direkte `supabase`-kald som de ældre login-sider), `ResetPasswordInput` i ny `src/types/auth/authType.ts`, "Glemt din adgangskode?"-link + grøn `?nulstillet=1`-kvittering på `Login.tsx`. SQL kørt og bekræftet i Supabase. Manuelt testet og bekræftet virkende i browseren (validering uden serverkald, identisk fejl for forkert navn og ukendt email, gammel kode afvist / ny kode virker efter nulstilling). **Prototype-forbehold (bruger-beslutning):** hele flowet foregår på hjemmesiden uden mail, fordi projektet ikke deployes. Identitetstjekket er kun email + fornavn + efternavn, og RPC'en er `grant`et til `anon` - enhver, der kender en brugers navn og email, kan overtage kontoen. Bevidst valgt, men **skal erstattes af et mailbaseret flow, før noget sættes i drift**; kun RPC-kaldet i `resetPassword` skal skiftes den dag, siden og mutationen består. |
| US-69 | Skift adgangskode | Medium | Done | Ny story, tilføjet ad-hoc efter bruger-forespørgsel 2026-09-11, sammen med US-68. Den indloggede halvdel: `/bruger` kunne rette navn/beskrivelse/billede, men ikke adgangskoden. Bygget 2026-09-11. **Ingen SQL** - ren Supabase Auth. `changePassword`-mutation i `authApi.ts` med to trin: `signInWithPassword` med den nuværende kode (dét er verifikationen - Supabase kræver den ikke selv for `updateUser`, så uden trinnet kunne en efterladt, åben browser låse ejeren ude af sin egen konto), derefter `updateUser({ password })`. Emailen tages fra den eksisterende session, så brugeren ikke skal taste den igen. Ny `ChangePasswordForm.tsx` (`src/components/profile/`, egen komponent frem for endnu 60 linjer i den 281 linjer lange `ProfilePage.tsx`) som eget "Adgangskode"-afsnit nederst på siden. Har **ikke** US-68's prototype-forbehold: brugeren er logget ind og bekræfter sin nuværende adgangskode, så identiteten er faktisk bevist. **Ændret efter bruger-feedback under test:** formularen lå oprindeligt åben på siden; den er nu foldet sammen bag en "Skift adgangskode"-knap med Skift/Annuller nedenunder, samme mønster som sidens "Rediger profil". Manuelt testet og bekræftet virkende i browseren (forkert nuværende kode ændrer intet, ny = nuværende fanges af valideringen, rigtigt skift giver grøn kvittering og brugeren forbliver logget ind). |
| US-70 | Se afsluttede opgaver | Medium | Mangler (kun story skrevet) | Ny story, tilføjet ad-hoc efter bruger-forespørgsel 2026-09-14. Kun `userStories.md` er opdateret - ingen kode, ingen spec, ingen SQL. **Afklaret med bruger under planlægningen:** visningen lægges som en underfane i dashboardets Administration-fane (US-65's mønster, ikke en ny rute); gates på `admin` ELLER `manage_tasks` (findes allerede i `privilegeApi.ts` + `KNOWN_PRIVILEGES`, så det kan tildeles med det samme); "marker som færdig" er bevidst UDE af scope (hører til US-39, Studerende 3); ingen `completed_at`-kolonne tilføjes - `end_date` bruges i stedet. **Ingen SQL forventes:** RLS lader allerede org-medlemmer læse `tasks`/`task_assignees`/`task_materials`/`data_layer_items` og profiler i egen organisation (`dbSchema.sql` §16.2, §16.7), så privilegie-gatingen bliver ren UX - samme forbehold som `manage_datalayer`/`manage_tasks` i øvrigt har, indtil US-62/63 kører. **OBS ved implementering:** intet sted i `src/` sætter status til `Completed` (`useUpdateTaskStatusMutation` er eksporteret i `taskApi.ts`, men importeres ingen steder), så visningen er tom indtil US-39 er bygget - testdata skal sættes manuelt i Supabase |
| US-71 | Notifikationer ved relevante hændelser | High | Mangler (kun story skrevet) | Ny story, tilføjet ad-hoc efter bruger-forespørgsel 2026-09-14. Lukker sidefundet i US-45-rækken. Kun `userStories.md` er opdateret - ingen kode, ingen spec, ingen SQL. Fundamentet: ny `notifications`-tabel (modtager, organisation, type, tekst, valgfrit link, læst-status, tidspunkt) + RLS (kun egne rækker) + server-side triggers/RPC'er. **Afklaret med bruger:** hændelser er medlemskab/invitation, opgaver, rolleændring og nye nyheder; ingen email og ingen Supabase Realtime (kun polling/cache-invalidering, samme mønster som `PendingRequestBanner.tsx`); ingen brugerindstillinger for til/fravalg. **OBS ved implementering:** `tasks` har hverken `created_by` eller `updated_at`, og tilmelding er selvbetjening indtil US-63, så "du er tildelt en opgave" er reelt egen tilmelding og kan ikke navngive en afsender. Trigger-krogene findes allerede i `dbSchema.sql` §15 (`handle_membership_request_status_change`, `handle_membership_invitation_status_change`, `invite_member`, `remove_member`). Nyt `'Notification'`-tag skal tilføjes BÅDE i `tagTypes` og i `USER_SCOPED_TAGS` i `supabaseApi.ts` - de to lister er drevet fra hinanden før (se US-59-rækken) |
| US-72 | Se egne notifikationer | High | Mangler (kun story skrevet) | Ny story, 2026-09-14. Afhænger af US-71 - visningen er tom uden datamodellen. Erstatter den deaktiverede klokke i `headerComponent.tsx` (ulæst-tæller) og `PlaceholderBar`-feltet "Notifikationer" i `OverviewTab.tsx`. Kun `userStories.md` er opdateret |
| US-73 | Markér notifikationer som læst | Medium | Mangler (kun story skrevet) | Ny story, 2026-09-14. Afhænger af US-71 + US-72. Markér enkelt/alle som læst, ingen fortryd og ingen sletning (bevidst afgrænsning). Kun `userStories.md` er opdateret |
| US-74 | Se egne opgaver på dashboardet | High | Done | Ny story, tilføjet ad-hoc efter bruger-forespørgsel 2026-09-14. Udfylder "Dine opgaver"-placeholderen fra US-65. **Bygget 2026-09-14:** ny `MyTasksWidget.tsx` (`src/components/dashboard/`) erstatter `PlaceholderBar`-feltet i `OverviewTab.tsx`, side om side med Notifikationer-placeholderen (`PlaceholderBar` beholdt til den). Snit af `getTasks` (filtreret på aktiv org) og `getMyTaskIds`, uden `Completed`, sorteret og skåret til 5. Række viser titel, status-badge (Tilgængelig/I gang - samme ord som opgavesidens filter), prioritets-badge (Lav/Mellem/Høj/Kritisk, `TaskCard.tsx`'s farver) og slutdato - de to sidste udelades, hvis null. Loading-, fejl- og tom-tilstand i feltet. Org-skift refetcher automatisk, da `Task`/`MyTasks` allerede ligger i `USER_SCOPED_TAGS`. Ingen props → ingen ny type. Ingen SQL, ingen nye endpoints, ingen ændringer i Studerende 3's filer. Manuelt testet og bekræftet virkende i browseren. **Oprindelig afgrænsning:** **Ingen SQL og ingen nye endpoints:** `getMyTaskIds` (`taskApi.ts`) + `getTasks` findes allerede, og RLS scoper `task_assignees` til den aktive organisation (`dbSchema.sql` §16.7). **Afklaret med bruger:** højst 5 opgaver, sorteret efter prioritet og derefter slutdato; ikke-afsluttede kun; intet "Se alle"-link (genvejskortet til `/tasks` findes allerede i `OverviewTab.tsx`); kun `task_assignees`, ikke `task_participants` (den relation røres af nul kodelinjer). **Rækkerne er bevidst IKKE klikbare:** opgavedetaljer er en modal uden egen adresse (`TaskCard.tsx`), og en rigtig detaljeside hører under US-36 hos Studerende 3 - linket tilføjes som opfølgning, når den findes. **OBS ved implementering:** sorteringslogikken `sortTasks` ligger inde i `TaskPage.tsx` (Studerende 3's fil) og genskabes bevidst i widget'en frem for at blive trukket ud i en delt util - accepteret dublering for ikke at røre andres filer, kan samles senere. `priority` og `end_date` er begge nullable, så sorteringen skal have en fallback (TaskPage bruger rang 5) |

**~~Sidefund under planlægning~~ - AFKLARET 2026-09-11, intet problem:** bekymringen var, at `organisations`-tabellens eneste SELECT-policy var scopet til `id = auth_profile_org()`, så en bruger uden aktiv organisation ikke ville kunne se andre organisationer i "vælg organisation"-dropdownen i `OrganisationTab.tsx`. Skema-eksporten viser, at der findes **endnu en** SELECT-policy, `"Alle autentificerede kan se organisationsliste"` (`using (true)`), som bare aldrig var skrevet ind i `dbSchema.sql`. Da RLS-policies OR'es, er listen synlig for enhver indlogget bruger, og anmod-flowet virker. Policyen er nu dokumenteret i `dbSchema.sql` §16.1 med en note om afvejningen: navn og id på alle organisationer er læsbare (nødvendigt for at kunne anmode), men ingen data BAG dem - alle øvrige tabeller er stadig scopet til `auth_profile_org()`.

## Anbefalet rækkefølge

1. ~~**US-03 + US-04** — Profile view/edit~~ ✅
2. ~~**US-06/07/08** — Admin: se + acceptere/afvise medlemsanmodninger~~ ✅
3. ~~**US-09 + US-10** — Se/rediger organisation~~ ✅
4. ~~**US-11 + US-12 + US-13** — Roller & privileges (Fase 1: granulære privilegier)~~ ✅
5. ~~**US-59** — Være medlem af flere organisationer (stor migration: erstatter `profiles.organisation_id`/`role_id` med en medlemskabsmodel + "aktiv organisation"-koncept)~~ ✅
6. ~~**US-60 + US-61** — Oprette flere organisationer / Forlade en organisation (bygger direkte på US-59's medlemskabsmodel, gøres derfor lige efter)~~ ✅
7. ~~**US-45 + US-46 + US-47 + US-65** — Rigtigt dashboard + Administration/Organisation-konsolidering~~ ✅
8. ~~**US-66 + US-67** — Fjerne medlem / Invitere bruger (ad-hoc tilføjet, nye privilegier `manage_members`/`manage_invitations`)~~ ✅
9. ~~**US-02 polish** — vis "ingen organisation"-tilstand i UI~~ ✅ (banner med link til `/organisation`, som nu rummer både opret- og anmod-flow)
10. ~~**US-56 + US-57** — Nyheder (lavest prioritet, ingen afhængigheder — gøres sidst)~~ ✅ (gjort ud af rækkefølge, 2026-09-10, da US-62/63 var blokeret af Tasks-domænet). US-57 efterfølgende udgået og rullet tilbage 2026-09-11 — kun US-56 (manuelt oprettede nyheder) står tilbage.

### Kan laves nu — ingen afhængighed af de andre studerende

Rækkefølgen herunder er omlagt 2026-09-14 efter det samme princip som US-56 blev hevet frem efter: tag det, der kan gøres færdigt alene, frem for at vente på Tasks-domænet.

11. ~~**US-74** — Se egne opgaver på dashboardet~~ ✅ (2026-09-14, `MyTasksWidget.tsx`). US-46 + US-47 (nøgletals-kortene) er udgået og skal IKKE bygges op igen - "Dine opgaver" er hele opgave-overblikket på Oversigt-fanen.
12. **US-71 → US-72 → US-73** — Notifikationer. **Start her.** Skal tages i den rækkefølge: US-71 er tabel+RLS+triggers (kræver SQL i `docs/migrations/`), US-72 er klokke/tæller/liste, US-73 er læst-håndtering. **Byg US-71's triggers i to omgange:** først medlemskab/invitation, rolleændring og nyheder - alt sammen eget domæne, hvor trigger-krogene allerede findes (`dbSchema.sql` §15.3/15.14/15.15/15.16) - og lad opgave-hændelserne (tilmeldt, statusskift, redigeret, slettet) vente til Tasks-domænet ligger stille og US-63's spørgsmål om selvbetjent tilmelding er afklaret. Det er en byggerækkefølge, ikke en indsnævring af story'en; US-71 er først opfyldt, når opgave-hændelserne også er med. Tabel, RLS, US-72 og US-73 kan bygges færdige uafhængigt af det. **Opgave-delen afhænger af Studerende 3 på tre punkter:** (1) triggerne skal sidde på `tasks`/`task_assignees`, som er deres skema og udvides aktivt (`priority`, `max_assignees`, `task_rooms` er kommet til undervejs) - samme kollisionsrisiko som US-63 allerede er parkeret på; (2) så længe tilmelding er selvbetjening, er "du er blevet tildelt en opgave" reelt "du tilmeldte dig selv", så teksten kan først låses, når US-63's spørgsmål er afklaret; (3) notifikationens link har intet mål, før der findes en adresse på en enkelt opgave (US-36) - samme blokering som US-74's rækker. Resten - medlemskab, invitation, rolleændring, nyheder - rammer kun egne tabeller, og link-målene (`/dashboard?tab=…`, `/nyheder/:id`) findes allerede. Eneste delte frontend-fil er `supabaseApi.ts` (nyt `'Notification'`-tag i BÅDE `tagTypes` og `USER_SCOPED_TAGS`).
13. **US-70** — Se afsluttede opgaver. Ren frontend: ingen SQL, ingen ændringer i andres filer, ingen åbne spørgsmål; bruger det eksisterende `manage_tasks`-privilegie og de RLS-policies, der allerede findes. Lagt EFTER notifikationerne, selvom den er lille: intet sted i `src/` sætter status til `Completed` (`useUpdateTaskStatusMutation` importeres ingen steder), så visningen er tom, indtil Studerende 3 bygger US-39 - testdata må sættes manuelt i Supabase for overhovedet at se den virke. Lav den, når der er brug for en lille opgave, eller når US-39 lander.

### Skal vente — afhænger af de andre studerende

14. **US-62** — Granulære skriverettigheder i Datalayer. Kørselsklar SQL ligger i `docs/migrations/us-62-datalayer-write-privileges.sql`, ingen åbne spørgsmål. Men SQL'en må først køres, når frontend-gatingen i Studerende 2's `DataLayerPage.tsx` + 42501-beskederne i `categoryApi.ts` er på plads - ellers mister alle menige medlemmer skriveadgang uden at UI'et forklarer hvorfor. Kræver altså en aftale med Studerende 2, ikke kodetid. Privilegiet `manage_datalayer` findes allerede i dropdownen og kan tildeles i forvejen.
15. **US-63** — Granulære skriverettigheder i Opgaver. Stadig **BLOKERET**. SQL'en ligger med "MÅ IKKE KØRES ENDNU"-header i `docs/migrations/us-63-tasks-write-privileges.sql` med tre ubesvarede spørgsmål i toppen, og Studerende 3 arbejder aktivt i domænet. Tages til sidst - den låser også op for US-71's opgave-hændelser.

## US-59-spec — udført og testet (historik)

Skrevet på forhånd (2026-09-09) og siden implementeret, kørt og manuelt testet i browseren - bevaret som dokumentation af den faktiske migration, ikke som en ventende opgave. Dækkede oprindeligt KUN US-59's acceptkriterier (se, blive medlem af flere, skifte aktiv organisation); US-60 blev trukket ind i samme omgang undervejs (se status-tabellen og "Anbefalet rækkefølge") - "Eksplicit UDENFOR scope"-noten nederst er derfor forældet: US-60 og US-61 er begge implementeret og testet siden (se deres egne rækker i status-tabellen), og US-64 (slette en organisation) er tilføjet som en helt ny, efterfølgende story - ikke en del af det oprindelige US-59-scope.

**Kerneidé:** `profiles.organisation_id` omdøbes til `active_organisation_id` og betyder herefter "den organisation, hvis data brugeren p.t. ser" - IKKE længere "den ene organisation brugeren er medlem af". Faktisk medlemskab (many-to-many, én rolle pr. organisation) flyttes til en ny `memberships`-tabel. Fordi `auth_profile_org()` (bruges af stort set alle RLS-policies i afsnit 16) beholder samme signatur og bare læser `active_organisation_id` i stedet for `organisation_id`, skal INGEN af de eksisterende org-scopede RLS-policies (organisations, locations, categories, items, tasks, task_*, statistics_*) ændres - kun de policies/funktioner der direkte rører `role_id` eller selve medlemskabet.

**SQL - nye/ændrede DB-objekter (dbSchema.sql):**

1. Ny tabel `memberships`: `id uuid pk`, `user_id uuid references profiles(id) on delete cascade`, `organisation_id uuid references organisations(id) on delete cascade`, `role_id uuid references roles(id) on delete set null`, `created_at timestamptz default now()`. `unique (user_id, organisation_id)`, index på begge FK-kolonner.
2. Backfill (kør FØR omdøbning): `insert into memberships (user_id, organisation_id, role_id) select id, organisation_id, role_id from profiles where organisation_id is not null;`
3. `alter table profiles rename column organisation_id to active_organisation_id;`
4. Drop `profiles_role_id_fkey` + drop kolonnen `profiles.role_id` (rollen findes nu kun på `memberships`).
5. `auth_profile_org()`: eneste ændring er `select active_organisation_id from profiles ...` (kolonnenavn).
6. `has_privilege(p_name)`: join skal nu gå `profiles pr join memberships m on m.user_id = pr.id and m.organisation_id = pr.active_organisation_id join privileges p on p.role_id = m.role_id where pr.id = auth.uid() and p.name = p_name` (i stedet for `p.role_id = pr.role_id`).
7. `prevent_self_role_org_change()`: fjern role_id-grenen (kolonnen findes ikke længere på profiles), behold active_organisation_id-grenen + `ponos.bypass_self_role_org_change`-flaget uændret (genbruges af `create_organisation` og den nye `set_active_organisation` nedenfor).
8. Ny trigger på `memberships`, fx `prevent_self_membership_role_change`: blokerer at en bruger selv ændrer sit eget `role_id` i en `memberships`-række (samme escalation-tanke som den gamle profiles-trigger havde for rolle - forhindrer at man tildeler sig selv en rolle). Rammer kun UPDATE, ikke INSERT (INSERT sker udelukkende via security-definer-funktionerne nedenfor).
9. `handle_membership_request_status_change()` (kører ved Accept af en `membership_requests`-række): i stedet for `update profiles set organisation_id = new.organisation_id ...` skal den nu `insert into memberships (user_id, organisation_id) values (new.user_id, new.organisation_id) on conflict do nothing;` og derefter `update profiles set active_organisation_id = new.organisation_id where id = new.user_id and active_organisation_id is null;` (kun sæt aktiv, hvis brugeren ikke allerede har en aktiv organisation - jf. AC "påvirkes brugerens medlemskab eller rolle i de øvrige organisationer ikke").
10. `create_organisation(p_name)`: guard-tjekket `exists (select 1 from profiles where id = v_user_id and organisation_id is not null)` erstattes af `exists (select 1 from memberships where user_id = v_user_id)` (samme opførsel som i dag - blokerer stadig en 2. organisation, det er US-60's opgave at løsne). Selve tildelingen `update profiles set organisation_id = v_org.id, role_id = v_role_id` erstattes af `insert into memberships (user_id, organisation_id, role_id) values (v_user_id, v_org.id, v_role_id)` + `update profiles set active_organisation_id = v_org.id where id = v_user_id` (stadig under samme bypass-flag).
11. Ny RPC `set_active_organisation(p_organisation_id uuid)` (security definer, `grant execute ... to authenticated`): tjekker `exists (select 1 from memberships where user_id = auth.uid() and organisation_id = p_organisation_id)` (fejl hvis ikke), sætter bypass-flaget, og `update profiles set active_organisation_id = p_organisation_id where id = auth.uid()`. Klienten må ALDRIG opdatere `active_organisation_id` direkte - kun via denne funktion.
12. RLS: `drop policy "Tildel rolle til profiler i egen organisation" on profiles` (rammer ikke længere noget, role_id er væk fra profiles) og opret i stedet samme escalation-guard-mønster som ny UPDATE-policy på `memberships`: `using (organisation_id = auth_profile_org() and has_privilege_or_admin('manage_roles'))`, `with check (samme + (has_privilege('admin') or role_id is null or not exists (select 1 from privileges where role_id = memberships.role_id and name = 'admin')))`.
13. RLS på `memberships` (enable row level security + ny SELECT-policy): `using (user_id = auth.uid() or organisation_id = auth_profile_org())` - dækker både "se mine egne medlemskaber" (US-59 AC "liste over alle organisationer brugeren er medlem af") og "se medlemmer i min aktive organisation" (US-11's medlemsliste, som i dag læste `profiles`). Ingen INSERT/DELETE-policy for almindelige brugere - inserts sker kun via `create_organisation`/`handle_membership_request_status_change` (security definer, samme mønster som allerede bruges for `roles`/`privileges`), DELETE hører til US-61.

**Frontend:**

- `profileApi.ts`, `organisationApi.ts`, `roleApi.ts` (`getMyOrganisationId`-helper), `categoryApi.ts`, `taskApi.ts` (`getAuthenticatedOrganisationId`-helpere): omdøb `.select('organisation_id')`/feltnavn fra `profiles` til `active_organisation_id` alle steder.
- `profileApi.ts` `getMyProfile`: rolle-navn kan ikke længere slås op via `profiles.role_id` - hent i stedet brugerens `memberships`-række for `(auth.uid(), active_organisation_id)`, brug dens `role_id` til `lookupName('roles', ...)`.
- `privilegeApi.ts` `getMyPrivileges`: samme omlægning - slå `role_id` op via `memberships` (self + active org) i stedet for `profiles.role_id`, derefter uændret privileges-opslag.
- `roleApi.ts`: `getOrganisationMembers` skal query'e `memberships` (filtreret på aktiv org) joinet med `profiles` for navn/email, i stedet for at query'e `profiles` direkte. `assignRole` skal `update memberships set role_id = ... where user_id = X and organisation_id = activeOrgId` i stedet for `update profiles set role_id = ...`.
- Ny fil ELLER nye endpoints i `organisationApi.ts`: `getMyMemberships` (liste af `{organisationId, organisationName, roleName}` for alle brugerens medlemskaber - bruges af US-59 AC "se liste over alle organisationer") + `setActiveOrganisation`-mutation (kalder RPC'en fra punkt 11).
- Ny UI: fane "Mine organisationer" på `/organisation` (`OrganisationPage.tsx`, ved siden af de eksisterende "Opret organisation"/"Anmod om medlemskab"-faner) - viser listen fra `getMyMemberships`, fremhæver aktiv org, lader brugeren vælge en anden som aktiv.
- `supabaseApi.ts`: tilføj tag `'Membership'`. `setActiveOrganisation` skal invalidere ALLE org-scopede tags, samme liste som `authApi.ts`'s login/logout-invalidering plus datalag/opgave-tags: `'Profile', 'Privilege', 'Organisation', 'Role', 'Membership', 'MembershipRequest', 'PendingRequest', 'Category', 'Item', 'ItemLocation', 'Task', 'TaskRoom', 'MyTasks'`.
- Typer: `profileType.ts` (`organisationId`→`activeOrganisationId`), `roleType.ts` (`OrganisationMember` får nu sin `roleId` fra en membership-række, ikke en profil-række) - opdatér efter behov.
- `PendingRequestBanner.tsx`: `profile.organisationId` → `profile.activeOrganisationId` (uændret logik ellers).

**Oprindeligt eksplicit UDENFOR scope her (siden implementeret, se noten ovenfor):** at løsne `create_organisation`s blokering af en 2. organisation (US-60), og at forlade en organisation (US-61). Skemaet ovenfor (`memberships`-tabellen, bypass-flag-mønsteret) var lagt til rette, så de kunne bygges ovenpå uden endnu en migration - hvilket de blev.

**Efter SQL er kørt af bruger og bekræftet:** opdatér `dbSchema.sql` og status-tabellens US-59-række til "Done".

## US-64-spec — udført og testet (historik)

Opstod som opfølgende spørgsmål under test af US-59/60/61 ("hvordan sletter man en organisation?"), dækker to scenarier: (1) sidste medlem tilbage, der ikke vil have organisationen mere, (2) organisationen lukker ned permanent, selvom andre medlemmer stadig er i den.

**Nøglefund:** Stort set alt i skemaet cascader allerede fra `organisations(id)` via `on delete cascade` (roller→privilegier, medlemskaber, lokationer, kategorier, items, opgaver→task_assignees/participants/materials, statistik, medlemsanmodninger) - en simpel `delete from organisations` rydder derfor det hele op selv. `profiles.active_organisation_id` (`on delete set null`) rydder samtidig automatisk op for ALLE berørte brugere, ikke kun den der sletter. Faldgrube (samme klasse som US-59-bugs): denne FK-cascade er internt en UPDATE på `profiles`, som rammer `trg_prevent_self_role_org_change` for netop den slettende brugers egen række, hvis den slettede org var deres egen aktive - kræver derfor samme `ponos.bypass_self_role_org_change`-flag som de tre andre RPC'er. `has_privilege_or_admin()` kan heller ikke bruges til autorisationstjekket, da den kun tjekker brugerens AKTIVE organisation - en bruger skal kunne slette en organisation, de administrerer, uden at den er deres aktive, så samme manuelle `memberships`/`privileges`-opslag som `leave_organisation`s "sidste admin"-tjek bruges i stedet.

**Beslutninger (bekræftet med bruger):**
- Kun bogstavelig `admin`-privilegie må slette - ikke `manage_organisation` (som i dag kun gælder omdøbning, en langt mindre destruktiv handling).
- Ingen "sidste medlem"-restriktion i RPC'en - samme kode-sti for begge scenarier, beskyttelsen ligger i UI'ets bekræft-flow.
- Bekræft-UX skal være meget bevidst: udover at skrive organisationens navn præcist, skal brugeren afkrydse (a) at al data slettes permanent, og (b) - hvis der er andre medlemmer - at de mister adgang med det samme.

**SQL (`dbSchema.sql` §15.12+15.13):**
- `get_my_memberships()` (§15.12) udvidet med `is_admin` (styrer "Slet organisation"-knappen) og `member_count` (til bekræft-teksten) - beregnet i samme security definer-kald som resten af listen, for at undgå et separat klient-opslag der ville ramme `memberships`-RLS'ens aktiv-org-scoping (samme faldgrube som roller-bugfixen i US-59).
- Ny RPC `delete_organisation(p_organisation_id uuid)` (§15.13): tjekker admin-status for DEN organisation via `memberships`/`privileges`, sætter bypass-flag, sletter organisationen (cascade rydder resten), og hvis den slettede org var den kaldende brugers aktive, vælges automatisk en anden af deres resterende medlemskaber som ny aktiv (eller ingen) - samme returmønster som `leave_organisation`.
- Ingen ny RLS-policy - samme konvention som `create_organisation`/`set_active_organisation`/`leave_organisation`: udelukkende security definer-RPC.

**Frontend:**
- `types/organisation/organisationType.ts`: `MyMembership` udvidet med `isAdmin`/`memberCount`.
- `organisationApi.ts`: `getMyMemberships`-mapping udvidet; ny `deleteOrganisation`-mutation (samme skabelon som `leaveOrganisation`, `invalidatesTags: [...USER_SCOPED_TAGS]`).
- `OrganisationPage.tsx`: ny `DeleteOrganisationControl`-komponent under hver admin-række i "Mine organisationer" - inline bekræft-panel (ingen modal-komponent findes andetsteds i kodebasen) med navne-input + op til 2 tjekbokse, "Slet permanent"-knap disabled indtil alt er opfyldt. Besked efter succes løftet til `MyMembershipsSection` (samme mønster som `handleLeft`), da rækken forsvinder fra listen med det samme.

**Docs:** Ny story US-64 tilføjet i `userStories.md` (afsnit "Prioriteringsoversigt" + "Arbejdsfordeling", 25 stories nu for Studerende 1).

**Bugs fundet+rettet under test** (se også status-tabellens US-64-række): (1) `delete_organisation`s kaskade ramte `trg_prevent_admin_role_change`/`trg_prevent_admin_privilege_change` - rettet med nyt `ponos.bypass_admin_protection`-flag. (2) Den manglende `update profiles set active_organisation_id = ...` efter valg af ny aktiv org - rettet. (3) Ingen UI-vej til "Mine organisationer" når `active_organisation_id` var null - `/organisation`s no-org-visning tjekker nu `getMyMemberships` og tilbyder fanen defensivt. (4) Efter bruger-feedback: "Slet organisation"-knappen er begrænset til kun at vise på den AKTIVE organisations række (ikke en bug, en bevidst UX-stramning).

## US-66/67-spec — udført og testet (historik)

SQL'en nedenfor er kørt af brugeren i Supabase SQL Editor, og hele funktionen (fjern medlem + invitér bruger, inkl. accept/afvis/annullér) er manuelt testet og bekræftet virkende i browseren (se status-tabellens US-66/US-67-rækker). `dbSchema.sql` er opdateret (§6.6, §15.14-15.16, §16.1/16.2/16.11). Bevaret her som dokumentation af den faktiske implementering, ikke som en ventende opgave.

**US-66 (fjern medlem) - ny RPC, ingen nye tabeller/policies:**
```sql
create or replace function public.remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_org_id uuid;
  v_target_role_id uuid;
  v_target_is_admin boolean;
  v_next_org_id uuid;
begin
  if v_caller_id is null then
    raise exception 'Du skal være logget ind for at fjerne et medlem.';
  end if;

  if p_user_id = v_caller_id then
    raise exception 'Du kan ikke fjerne dig selv - brug "Forlad organisation" i stedet.';
  end if;

  v_org_id := public.auth_profile_org();
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.';
  end if;

  if not public.has_privilege_or_admin('manage_members') then
    raise exception 'Du har ikke rettigheder til at fjerne medlemmer.';
  end if;

  select role_id into v_target_role_id
  from public.memberships
  where user_id = p_user_id and organisation_id = v_org_id;

  if not found then
    raise exception 'Brugeren er ikke medlem af organisationen.';
  end if;

  v_target_is_admin := v_target_role_id is not null and exists (
    select 1 from public.privileges where role_id = v_target_role_id and name = 'admin'
  );
  if v_target_is_admin and not public.has_privilege('admin') then
    raise exception 'Du skal være administrator for at fjerne en anden administrator.';
  end if;

  delete from public.memberships
  where user_id = p_user_id and organisation_id = v_org_id;

  select organisation_id into v_next_org_id
  from public.memberships
  where user_id = p_user_id
  order by created_at
  limit 1;

  update public.profiles
    set active_organisation_id = v_next_org_id
    where id = p_user_id and active_organisation_id = v_org_id;
end;
$$;

grant execute on function public.remove_member(uuid) to authenticated;
```

**US-67 (invitér bruger) - ny tabel + trigger + RPC + policies:**
```sql
create table public.membership_invitations (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  invited_user_id  uuid not null references public.profiles(id) on delete cascade,
  invited_by       uuid references public.profiles(id) on delete set null,
  status           e_membership_request_status not null default 'Pending',
  created_at       timestamptz not null default now(),
  reviewed_at      timestamptz
);

create unique index membership_invitations_unique_pending
  on public.membership_invitations (invited_user_id, organisation_id)
  where (status = 'Pending');

create index idx_membership_invitations_org on public.membership_invitations (organisation_id);
create index idx_membership_invitations_user on public.membership_invitations (invited_user_id);

alter table public.membership_invitations enable row level security;

-- RETTET under test (se status-tabellens US-67-note): modtageren
-- accepterer sin EGEN invitation, så profiles-opdateringen nedenfor
-- rammer auth.uid()s egen række og skal derfor bypasse
-- trg_prevent_self_role_org_change, ligesom create_organisation/
-- set_active_organisation/leave_organisation/delete_organisation gør.
create or replace function public.handle_membership_invitation_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Accepted' and old.status is distinct from 'Accepted' then
    new.reviewed_at := coalesce(new.reviewed_at, now());

    insert into public.memberships (user_id, organisation_id)
    values (new.invited_user_id, new.organisation_id)
    on conflict (user_id, organisation_id) do nothing;

    perform set_config('ponos.bypass_self_role_org_change', 'true', true);

    update public.profiles
      set active_organisation_id = new.organisation_id
      where id = new.invited_user_id and active_organisation_id is null;
  elsif new.status = 'Rejected' and old.status is distinct from 'Rejected' then
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  return new;
end;
$$;

create trigger trg_membership_invitation_status_change
  before update on public.membership_invitations
  for each row execute function public.handle_membership_invitation_status_change();

create or replace function public.invite_member(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_profile_org();
  v_target_id uuid;
begin
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.';
  end if;

  if not public.has_privilege_or_admin('manage_invitations') then
    raise exception 'Du har ikke rettigheder til at invitere medlemmer.';
  end if;

  select id into v_target_id
  from public.profiles
  where lower(email) = lower(trim(p_email));

  if v_target_id is null then
    raise exception 'Ingen bruger findes med denne email.';
  end if;

  if exists (
    select 1 from public.memberships
    where user_id = v_target_id and organisation_id = v_org_id
  ) then
    raise exception 'Brugeren er allerede medlem af organisationen.';
  end if;

  insert into public.membership_invitations (organisation_id, invited_user_id, invited_by)
  values (v_org_id, v_target_id, auth.uid())
  on conflict (invited_user_id, organisation_id) where status = 'Pending' do nothing;

  if not found then
    raise exception 'Brugeren har allerede en ventende invitation til organisationen.';
  end if;
end;
$$;

grant execute on function public.invite_member(text) to authenticated;

create policy "Se egne invitationer eller invitationer i egen organisation"
  on public.membership_invitations for select
  to authenticated
  using (
    invited_user_id = auth.uid()
    or (organisation_id = public.auth_profile_org() and public.has_privilege_or_admin('manage_invitations'))
  );

create policy "Modtager kan svare på egen invitation"
  on public.membership_invitations for update
  to authenticated
  using (invited_user_id = auth.uid())
  with check (invited_user_id = auth.uid());

create policy "Admin kan annullere ventende invitation i egen organisation"
  on public.membership_invitations for delete
  to authenticated
  using (
    organisation_id = public.auth_profile_org()
    and public.has_privilege_or_admin('manage_invitations')
    and status = 'Pending'
  );

create policy "Se organisation man er inviteret til"
  on public.organisations for select
  to authenticated
  using (
    exists (
      select 1 from public.membership_invitations mi
      where mi.organisation_id = organisations.id
        and mi.invited_user_id = auth.uid()
        and mi.status = 'Pending'
    )
  );

create policy "Admin kan se inviterede profiler i egen organisation"
  on public.profiles for select
  to authenticated
  using (
    public.has_privilege_or_admin('manage_invitations')
    and exists (
      select 1 from public.membership_invitations mi
      where mi.invited_user_id = profiles.id
        and mi.organisation_id = public.auth_profile_org()
        and mi.status = 'Pending'
    )
  );
```

**Frontend (allerede kodet):** nye privilegier `manage_members`/`manage_invitations` (privilegeApi.ts); `roleApi.ts` (`removeMember`); ny `invitationApi.ts` (`getMyPendingInvitations`, `getSentInvitations`, `inviteMember`, `cancelInvitation`, `respondToInvitation`); ny tag `'MembershipInvitation'` (supabaseApi.ts, i USER_SCOPED_TAGS); `MembersPanel.tsx` (Fjern-knap + escalation-guard); ny `InvitationsPanel.tsx` (admin-side); `OrganisationTab.tsx` (ny `InvitationsSection`, modtager-side); `PendingRequestBanner.tsx` (viser nu også ventende invitation); `AdministrationTab.tsx`/`Dashboard.tsx` (nye faner/gates).

## US-56/57-spec — udført, SQL kørt og bekræftet (historik)

Lavet ud af rækkefølge 2026-09-10, da US-62/63 (næste op) var blokeret af Tasks-domænet (anden studerende). Bevaret her som dokumentation af den faktiske implementering.

**Omdefinering (afklaret med bruger, se "Næste op" for datering):** Original spec i `userStories.md`/`dbSchema.sql` antog news var GLOBAL, læses af alle, skrives KUN af en service-role-proces (ingen client-insert-policy, ingen admin-UI). Bruger ønskede i stedet: nyheder er organisationens egne (B2B opslagstavle-stil, ikke et RSS-aggregat), admin opretter/redigerer/sletter manuelt, OG en organisation skal kunne konfigurere sin egen eksterne API som supplerende kilde ("fremtidssikret" - ingen konkret API findes endnu). Da repoet ikke har cron/edge-function-infrastruktur, er API-hentning admin-trigget ("Hent nu"), ikke automatisk baggrunds-sync - bruger samme autentificerede skrive-vej som manuel oprettelse, ingen service-role nødvendig.

**SQL (kørt og bekræftet i Supabase, `dbSchema.sql` §13/§13.1/§16.9):**
- `news`-tabellen udvidet: `organisation_id` (not null, FK til organisations), `source` ('manual'|'api'), `external_ref` (dedup-nøgle for API-import, null ved manuel oprettelse). Unikt index `(organisation_id, external_ref) where external_ref is not null`.
- RLS: gammel "alle kan se, ingen kan skrive"-policy droppet. Ny SELECT-policy (org-scoped) + ny ALL-policy (`organisation_id = auth_profile_org() and has_privilege_or_admin('manage_news')`) - samme mønster som Fase 1/2.
- Ny tabel `news_sources` (0-1 række pr. organisation): `endpoint_url`, `api_key` (nullable). RLS: KUN `manage_news`-indehavere kan se/redigere (ingen SELECT-for-alle-policy) - `api_key` er credential-agtig data.
- Nyt privilegie `manage_news` (ingen ekstra SQL-infrastruktur, samme generiske `has_privilege_or_admin()` som resten).

**Frontend (allerede kodet, build+typecheck grønt, IKKE manuelt testet i browseren endnu):**
- `privilegeApi.ts`: `MANAGE_NEWS_PRIVILEGE` + `KNOWN_PRIVILEGES`-entry.
- `supabaseApi.ts`: nye tags `'News'`/`'NewsSource'`, tilføjet til `USER_SCOPED_TAGS` (org-scoped, skal invalideres ved skift aktiv org).
- Ny `src/types/news/newsType.ts`, ny `src/store/apis/newsApi.ts` (getNews/createNews/updateNews/deleteNews/getNewsSource/upsertNewsSource/fetchFromNewsSource - 42501-fejlmapping som Fase 1's mønster).
- Ny side `/nyheder` (`src/pages/News/NewsPage.tsx`) + `src/components/News/` (`NewsCard.tsx`, `NewsFormModal.tsx` opret/rediger i én modal, `NewsSourcePanel.tsx` API-konfig+"Hent nu", gated bag `manage_news`). Route tilføjet i `App.tsx`, nav-link i `headerComponent.tsx` (gated bag `hasOrganisation`, som Datalager/Opgaver - nyheder er nu org-scoped, ikke global).
- Dashboard: `OverviewTab.tsx`s "Nyheder"-`PlaceholderBar` erstattet med `NewsPreview` (seneste 2 nyheder, klikbare, + "Se alle nyheder"-link).
- Antaget, IKKE konfigurerbar JSON-kontrakt for en organisations eksterne API: `{title, description, imageUrl?, publishedAt?}[]` - bevidst valg (ingen rigtig API at teste imod endnu, undgår over-engineering); kan udvides til konfigurerbar feltmapping senere hvis en konkret API viser sig at afvige.

**Docs:** `userStories.md` US-56/US-57 omskrevet (org-scoped + admin-manuel + org-konfigurerbar API, ikke global service-role-sync).

**Testet og bekræftet af bruger i browseren, committet (2026-09-10)** - opret/rediger/slet nyheder, `/nyheder` + `/nyheder/:id`, Dashboard-slideren. Eneste resterende ubekræftede del: "Hent nu" mod et RIGTIGT eksternt API-endpoint (ingen organisation har konfigureret en endnu, se US-57-status-rækken).

**Opfølgning 1 (samme dag) - kandidat-API undersøgt, ikke egnet:** bruger foreslog `https://godtgoerelse-api.roskilde-festival.dk/index.html`. Swagger-spec hentet og undersøgt: det er `RF.Godtgoerelse.Backend`, Roskilde Festivals interne system til refusion af udlæg/kørsel (endpoints `/api/expense`, `/api/drive`, `/api/rate`, `/api/admin/*`, `/api/pdf/{type}`; felter som `amount`, `purpose`, `distance`, `registrationNumber`) - helt urelateret domæne, ingen nyheds-agtige felter. Ikke brugt. Kontrakten står stadig som antaget generisk shape, afventer en rigtig kandidat.

**Opfølgning 2 (samme dag) - tilføjet `url`-felt:** bekræftet med bruger at rigtige nyheds-API'er (NewsAPI.org, GNews, RSS) typisk har et link tilbage til original-artiklen, som manglede i vores kontrakt. Tilføjet til BÅDE manuel oprettelse og API-import: `news.url` (nullable, SQL kørt og bekræftet i Supabase, `dbSchema.sql` §13 opdateret), `News`/`CreateNewsInput`/`UpdateNewsInput`-typerne, `newsApi.ts` (mapNewsRow/createNews/updateNews/ExternalNewsItem/fetchFromNewsSource), `NewsFormModal.tsx` (nyt "Link (valgfri)"-felt), `NewsCard.tsx` (viser "Læs mere"-link når sat), `NewsSourcePanel.tsx`s kontrakt-tekst. `userStories.md` US-56/US-57 AC opdateret til at nævne linket. Build grønt.

**Opfølgning 3 (samme dag) - enkelt-nyhed-side:** bruger testede med 10 manuelt indsatte test-nyheder (org `3303c93d-3512-4503-a813-4bd6fefc86de`) og opdagede at hverken Dashboard-previewet eller nyhedskortene på `/nyheder` kunne klikkes ind på den enkelte nyhed - kun "Se alle nyheder"/hele listen. Rettet: ny route `/nyheder/:id` (`NewsDetailPage.tsx`, App.tsx) + ny `getNewsById`-query i `newsApi.ts` (egen query frem for kun cache-opslag, så et direkte link/F5 virker uden at have besøgt listen først). `NewsCard.tsx` (brugt på `/nyheder`) er nu klikbar og navigerer til detalje-siden (rediger/slet-knapperne stopper propagation); "Læs mere"-linket er flyttet FRA kortet TIL detalje-siden (kortet er nu selv linket ind). Dashboard-previewets links (`OverviewTab.tsx`s `NewsPreview`) peger nu på `/nyheder/:id` i stedet for blot `/nyheder`. Detalje-siden har sine egne rediger/slet-knapper (gated `manage_news`, genbruger `NewsFormModal`). Build grønt.

**Opfølgning 4 (samme dag) - Dashboard-widget lavet om til slider:** bruger ønskede Dashboard-nyhedswidgeten som en auto-kørende slider gennem de seneste nyheder i stedet for en statisk liste af 2. Ny `NewsSlider.tsx` (`src/components/dashboard/`, erstatter den tidligere inline `NewsPreview` i `OverviewTab.tsx`): viser 1 nyhed ad gangen (billede/titel/dato/uddrag), auto-skifter hvert 6. sekund gennem de seneste 10 nyheder, pause on hover, manuel prev/next-pile + dot-indikatorer, klik navigerer til `/nyheder/:id`. Ingen ny dependency (ingen carousel-bibliotek i repoet i forvejen - bygget med almindelig React state/interval). Build grønt.

**Opfølgning 5 (samme dag) - billede som baggrund:** bruger ønskede at et sat billede fylder hele slide'et som baggrund (med gradient + hvid tekst ovenpå for læsbarhed) i stedet for et lille thumbnail ved siden af teksten; uden billede er baggrunden bare hvid med normale tekstfarver. Rettet i `NewsSlider.tsx` (fast højde h-48/h-56, `hasImage`-forgrening for begge visuelle varianter, prev/next-knapper og dots tilpasset kontrast for begge). **Testet og bekræftet virkende af bruger i browseren, committet.**

## US-57 udgået (2026-09-11) — nyheds-API fjernet igen

Under planlægning af at gøre API-hentningen **generisk** (så en organisation selv kunne vælge kilde - DR, TV2 eller noget helt tredje) viste undersøgelsen, at den vej ikke kan gå uden ny server-side infrastruktur. Bruger besluttede derfor at droppe hele ideen: nyheder oprettes på siden, punktum.

**Målinger bag beslutningen:**
- **CORS spærrer.** `dr.dk/nyheder/service/feeds/allenyheder`, `tv2east.dk/rss`, `tv2kosmopol.dk/rss`, `tv2fyn.dk/rss`, `tv2nord.dk/rss` svarer alle 200, men uden `Access-Control-Allow-Origin` - browseren må ikke læse svaret. Kun 2 af 8 testede danske feeds (Altinget, TV2 Bornholm) sender headeren. Generisk hentning ville kræve en Supabase Edge Function.
- **Autodiscovery virker ikke.** Ingen af dr.dk, nyheder.tv2.dk, altinget.dk, tv2east.dk, politiken.dk, berlingske.dk har `<link rel="alternate" type="application/rss+xml">`. DR's forside er 1 MB HTML og nævner ikke "rss" én gang, selvom feedet findes.
- **Aggregatorer udelukket.** Bing News Search API nedlagt 11. aug 2025. Bing/Google News RSS virker, men uden billeder, med tracking-redirect-links og med vilkår om "personlig, ikke-kommerciel" brug.
- **Sites uden feed.** graspfestival.dk (Next.js) har intet feed overhovedet - `/rss`, `/feed`, `/atom.xml`, `/wp-json/...`, `/api/news` giver alle 404. Kun `sitemap.xml`, hvilket ville kræve HTML/OpenGraph-skrabning.

**SQL kørt og bekræftet i Supabase af bruger 2026-09-11 (rul-tilbage):**
```sql
drop table if exists public.news_sources;
drop index if exists public.news_org_external_ref_unique;
alter table public.news drop column if exists external_ref;
alter table public.news drop column if exists source;
```

**Frontend fjernet:** `NewsSourcePanel.tsx` (slettet), `getNewsSource`/`upsertNewsSource`/`fetchFromNewsSource` + `ExternalNewsItem`/`deriveExternalRef` (newsApi.ts), `NewsSource`/`UpsertNewsSourceInput`/`NewsSourceKind` + `News.source`/`News.externalRef` (newsType.ts), tag `'NewsSource'` (supabaseApi.ts, også ude af `USER_SCOPED_TAGS`), panel-renderingen i `NewsPage.tsx`.

**Bevaret:** hele US-56 - `/nyheder`, `/nyheder/:id`, opret/rediger/slet, Dashboard-slideren, `manage_news`-privilegiet og `news.url`-feltet ("Læs mere", nu altid indtastet manuelt).

## Forside (ad-hoc, 2026-09-11) — offentlig landing page på `/`

Ingen user story; tilføjet efter bruger-forespørgsel. `/` renderede før `<div />` — en tom side mellem header og footer, og intet sted der forklarede hvad Ponos er.

**Ny forside** `src/pages/landing/LandingPage.tsx` + seks sektioner i `src/components/landing/` (Hero, Problem, Features, Flow, Partner, Cta), tekst hentet fra `Project.md` §1-5. Indloggede redirectes til `/dashboard` (`useGetSessionQuery` + `<Navigate replace />`), så forsiden kun er for udloggede. Headeren har fået et "Forside"-link, der kun vises udlogget.

**`App.tsx`:** `<main>`'ens `max-w-7xl mx-auto p-6`-wrapper er gjort betinget (`pathname === '/'`), så forsidens hero kan gå kant-til-kant og flyde sammen med den navy header. Kun ruten `/` rammer den nye gren; alle andre sider er uændrede.

**`/statistik` oprettet som pladsholder** (`src/pages/statistik/StatisticsPage.tsx`, bag `ProtectedRoute` + eget `activeOrganisationId`-tjek med samme tom-tilstand som `OverviewTab`). Dette var en **forudsætning, ikke en ekstra:** fire steder brugte `/` som stand-in for den endnu ikke byggede Statistik-side (`headerComponent.tsx` desktop+mobil, `footerComponent.tsx`, `OverviewTab.tsx`) — uden repegning ville enhver indlogget bruger, der klikkede "Statistik", lande på marketing-forsiden. Selve Statistik-siden tilhører en anden studerende; her står kun skallen med en "kommer snart"-bjælke (genbruger `PlaceholderBar.tsx`), så URL'en er reserveret til dem.

### Headeren: samme struktur logget ud som logget ind (2026-09-11)

Den udloggede header var skrevet ad-hoc omkring ét enkelt "Log ind"-link og lignede derfor et andet design end den indloggede. Rettet i `headerComponent.tsx`, så begge tilstande deler de samme tre zoner: logo til venstre, `<nav>` i midten, handlinger til højre.

- **Fælles stil:** Forside og Log ind bruger nu den eksisterende `getNavLinkClass` frem for egne klassestrenge — samme padding, tekststørrelse, ikoner og hvide aktiv-underline som Dashboard/Opgaver/Statistik. Log ind blev `NavLink` i stedet for `Link`, så den også markeres aktiv på `/login`. Pointen med at genbruge funktionen frem for at kopiere dens klasser er, at de to tilstande så ikke kan drive fra hinanden igen.
- **Nyt "Opret konto"** → `/signup` i guld (`bg-accent`/`hover:bg-accent-hover`, samme tokens som forsidens CTA'er). Headeren havde ingen vej til `/signup` før. Bevidst `Link` og ikke `NavLink`: en aktiv-underline oven på en fyldt knap giver ikke mening.
- **Fælles hamburger:** knappen lå inde i `isAuthenticated`-grenen og gælder nu begge tilstande. Under 1024px klapper både nav'en og guldknappen sammen, præcis som de indloggede links gør, og alle tre punkter ligger i mobilmenuen. Genbruger den eksisterende `mobileNavOpen`-state og resize-effekten — ingen ny state.
- **Bemærk:** udlogget under 1024px består headeren dermed af logo + hamburger alene. Hverken Log ind eller Opret konto er ét klik væk på mobil; forsidens egne CTA'er er den direkte vej derhen. Valgt bevidst frem for at lade guldknappen blive stående og kun gemme Log ind bag menuen.

Corolab nævnes i Partner-sektionen (medlemsdrevet non-profit i Roskilde siden 2016, link til corolab.dk). Testmiljøet nævnes bevidst **ikke** ved navn — forsiden holdes generisk, jf. `Project.md` §3.3.

Ingen SQL, ingen RLS, ingen nye dependencies eller endpoints.

## Om os, Kontakt og Hjælp & support (ad-hoc, 2026-09-11) — de sidste døde links

Ingen user story; tilføjet efter bruger-forespørgsel. Footeren har siden US-65-oprydningen linket til `/om-os`, `/kontakt` og `/hjaelp`, men ingen af ruterne fandtes — og uden catch-all stod siden bare blank mellem header og footer. Begge punkter på "Udskudt"-listen er hermed lukket.

**Tre nye offentlige sider** i `src/pages/public/` med fælles navy titel-bånd (`components/public/PageHero.tsx` — samme `bg-primary` som headeren, men uden hero'ens vandmærke og CTA'er og med lavere højde, så en underside ikke ligner endnu en forside):

- **`/om-os`** — hvorfor Ponos findes (dybere end forsidens `LandingProblem`: prisen ved manglende overblik), fire principper som `<dl>` (generisk, data genbruges, tal der regner sig selv, adgang håndhævet i databasen), og "Bag projektet". Sidstnævnte er bevidst **upersonlig** (afklaret med bruger): studieprojekt i samarbejde med Corolab, ingen navne, intet uddannelsessted. Corolabs nøgletal og de seks CO-områder bliver liggende i `LandingPartner` og gentages **ikke** — forsiden er den korte udgave, `/om-os` den lange, og de er linket sammen ("Mere om projektet").
- **`/kontakt`** — ren kontaktinfo + mailto, **ingen formular** (afklaret med bruger). En formular ville kræve en `contact_messages`-tabel med anon insert-policy og en, der læser den; en formular der lover et svar, ingen modtager kan give, er værre end en adresse.
- **`/hjaelp`** — "Kom godt i gang" i tre trin plus FAQ som native `<details>/<summary>` (`FaqItem.tsx`): ingen state, ingen `aria-expanded` at holde i sync, tastatur og Ctrl+F virker gratis. **Svarene er skrevet ud fra koden, ikke ud fra hvordan det burde virke** — aktiv organisation som forudsætning, privilegier der skjuler knapper, flere medlemskaber med én aktiv, invitation kræver eksisterende konto, sidste-admin-spærren. Ændrer man den adfærd, skal svaret rettes med.

**404-rute** (`NotFoundPage.tsx`, `<Route path="*">` sidst i `<Routes>`) — ligger bevidst i `<main>`s almindelige wrapper, ikke kant-til-kant: en fejlside skal ikke ligne en marketingside. Knappen peger på `/` udlogget og `/dashboard` indlogget.

**Adgang:** siderne er offentlige for **alle**, også indloggede (afklaret med bruger) — ingen redirect som forsidens. Derfor gater `LandingCta.tsx` nu sig selv på `useGetSessionQuery()` og returnerer `null`, når der er en session: "Opret konto" giver ingen mening for en, der har en. Gaten ligger ét sted i stedet for som en gentaget betingelse på hver af de tre sider; adfærden på `/` er uændret, da `LandingPage` allerede redirecter indloggede væk.

**`App.tsx`:** `isLanding` er blevet til `FULL_WIDTH_ROUTES` (`/`, `/om-os`, `/kontakt`, `/hjaelp`), da fire ruter nu styrer deres egne bredder.

**`src/lib/contact.ts`:** `CONTACT_EMAIL`/`CONTACT_LOCATION` ét sted, brugt af både footeren og `/kontakt` — to hardcodede kopier er præcis det mønster, der lod header- og footer-navigationen drive fra hinanden tidligere. Adressen `info@ponos.dk` er **en pladsholder** (bekræftet med bruger); når den rigtige kommer, rettes den dér og kun dér.

**Footeren:** de tre sider har fået deres **egen liste** ("Om Ponos") i stedet for en plads i Navigation. Navigation er appens egne sider og skifter med login-tilstanden; "Om Ponos" handler om produktet selv og er ens for alle, så den har ingen login-gate. De to lister deler ét felt i footerens 3-kolonne-grid (indre `grid-cols-2`) og står derfor tæt sammen — et fjerde topniveau-felt skubbede dem for langt fra hinanden. (Rækkefølge af rettelser efter bruger-feedback: først lagt ind i begge Navigation-lister, så egen kolonne, så trukket sammen.) Headeren er urørt; de tre sider hører til i footeren.

**Kendt, accepteret adfærd:** FAQ'ens dyb-links til `/dashboard?tab=organisation` og `/bruger` er beskyttede ruter, og `ProtectedRoute` sender en udlogget læser til `/login` **uden** at huske destinationen. Login er det rigtige næste skridt for dem alligevel; at få ProtectedRoute til at huske målet rører alle beskyttede ruter og er en selvstændig ændring.

**Fundet undervejs (RETTET 2026-09-11):** der fandtes **ingen nulstil-adgangskode-funktion** i appen — intet `resetPasswordForEmail`/`updateUser` nogen steder i `src/`. FAQ-posten henviste derfor til mail. Bruger besluttede, at nulstilling blev en **egen user story** — det blev US-68 (og US-69 for den indloggede variant), se spec-afsnittet nedenfor. Begge er nu bygget, og de to FAQ-poster er rettet: "Jeg har glemt min adgangskode" peger på `/glemt-adgangskode` (mail står tilbage som sidste udvej), og "Hvordan retter jeg mit navn eller profilbillede?" nævner nu også adgangskoden.

Ingen SQL, ingen RLS, ingen nye dependencies eller endpoints.

## US-68 + US-69 – Adgangskode (spec — UDFØRT 2026-09-11)

Skrevet 2026-09-11 efter aftale med bruger: **dokumentationen først, koden bagefter.** Specen blev derefter **udført samme dag**: SQL'en er kørt i Supabase, alle filerne nedenfor er skrevet, og begge stories er testet i browseren og bekræftet virkende. Afsnittet står uændret som beskrivelse af det byggede — **én afvigelse**, aftalt med bruger under test: US-69's formular ligger ikke åben på profilsiden, men er foldet sammen bag en "Skift adgangskode"-knap med Skift/Annuller nedenunder (samme mønster som sidens "Rediger profil"), og kvitteringen vises over knappen, når formularen folder sig sammen igen.

Prototype-forbeholdet nedenfor gælder stadig og er ikke løst af, at koden nu findes.

To stories i samme runde, fordi de deler kode og deres tekster skal passe sammen:

- **US-68 – Nulstil adgangskode** (udlogget, prototype uden mail) — hoveddelen.
- **US-69 – Skift adgangskode på profilsiden** (indlogget, bekræftet med den nuværende kode) — lille tilføjelse, bygges bagefter oven på samme `authApi`-mønster.

### Prototype-forbeholdet (US-68)

Uden mail findes der intet bevis for, at det er den rigtige person, der beder om en ny kode: **enhver, der kender en brugers email og navn, kan overtage kontoen.** Anon-nøglen ligger i browser-bundtet, så RPC'en kan kaldes af hvem som helst, ikke kun af vores egen side.

Det er en bevidst beslutning truffet med bruger (prototype-projekt, deployes ikke), ikke en forglemmelse. Flowet er specificeret, så **kun ét lag skal skiftes**, hvis der senere kommer mail på: siderne og `authApi`-mutationen består, kun RPC-kaldet bliver til `resetPasswordForEmail`/`verifyOtp`. Som et lille værn — ikke som rigtig sikkerhed — kræver formularen både email, fornavn og efternavn, og RPC'en svarer med én og samme fejl uanset hvad der ikke passede, så den ikke kan bruges til at afprøve, hvilke emails der findes.

US-69 har ikke forbeholdet: dér er brugeren logget ind og bekræfter sin nuværende kode.

### SQL (US-68) — køres først, når vi går i gang

Én ny funktion, `dbSchema.sql` §15.17. Samme facon som `invite_member` (§15.16): `security definer`, `raise exception` med danske beskeder, `grant execute` til sidst — her dog til **`anon`**, da den, der har glemt sin kode, per definition ikke er logget ind.

```sql
create or replace function public.reset_password_prototype(
  p_email text, p_first_name text, p_last_name text, p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions   -- pgcrypto ligger i extensions på Supabase
as $$
declare v_user_id uuid;
begin
  if length(p_new_password) < 6 then
    raise exception 'Adgangskoden skal være mindst 6 tegn.';
  end if;

  select id into v_user_id
  from public.profiles
  where lower(email)      = lower(trim(p_email))
    and lower(first_name) = lower(trim(p_first_name))
    and lower(last_name)  = lower(trim(p_last_name));

  -- Én samlet fejl: afslører hverken om emailen findes, eller hvilket
  -- felt der ikke passede.
  if v_user_id is null then
    raise exception 'Oplysningerne passer ikke på en konto.';
  end if;

  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
      updated_at = now()
  where id = v_user_id;
end;
$$;

grant execute on function public.reset_password_prototype(text, text, text, text) to anon, authenticated;
```

Detaljer der er tjekket, ikke gættet: `pgcrypto` er allerede installeret (`dbSchema.sql:4`), `profiles` har `first_name`/`last_name`/`email` og `id` som FK til `auth.users` (`dbSchema.sql:44-54`), og `gen_salt('bf', 10)` giver samme bcrypt-cost, som GoTrue selv skriver, så hashet kan læses af login bagefter. `search_path` udvides med `extensions`, fordi husets funktioner ellers kun har `public`, og `crypt`/`gen_salt` bor i `extensions` på et Supabase-projekt.

**Bevidst udeladt:** `delete from auth.sessions where user_id = …`. Det ville logge brugeren ud på alle andre enheder, men er en ekstra rørelse ved GoTrues egne tabeller, som prototypen ikke har brug for.

### Frontend US-68

**Ny fil `src/pages/logIn/ForgotPassword.tsx` → rute `/glemt-adgangskode`.** Én formular, samme kort som `Login.tsx` (`flex items-center justify-center px-2 py-15 …` + `bg-white rounded-lg shadow-md p-8 max-w-md w-full`) og samme input-/knapklasser. Felter: E-mail, Fornavn, Efternavn, Ny adgangskode, Gentag ny adgangskode.

- Klient-validering først, med *præcis samme danske tekster* som `SignUp.tsx`, så de to steder ikke driver fra hinanden: alle felter udfyldt, mindst 6 tegn (`'Adgangskoden skal være mindst 6 tegn.'`), felterne skal matche (`'Adgangskoderne matcher ikke.'`).
- Fejl fra RPC'en vises, som de kommer (de er allerede danske), i den røde boks fra `Login.tsx:46`.
- Succes → `navigate('/login?nulstillet=1', { replace: true })`.
- Under knappen en lille, ærlig note i `text-xs text-secondary`: "Prototype: der sendes ingen bekræftelse på mail." Fjernes igen, når rigtig mailbekræftelse kommer på.
- Nederst link tilbage til `/login`. Siden tager ingen props → ingen ny fil i `src/types/`.

**`src/store/apis/authApi.ts`:** én ny mutation ved siden af `signOut`, samme `queryFn`-mønster og `CUSTOM_ERROR`-form som resten af filen:

```ts
resetPassword: builder.mutation<void, { email: string; firstName: string; lastName: string; password: string }>(…)
```

Kalder `supabase.rpc('reset_password_prototype', { … })`. Ingen `invalidatesTags` — brugeren er ikke logget ind, og der er intet i cachen at opdatere. Argumenttypen lægges i `src/types/auth/authType.ts` (ny mappe; der findes ingen `auth`-domænemappe endnu) efter husreglen om at prop-/argumenttyper ikke står inline.

Hvorfor RTK Query, når `Login.tsx`/`SignUp.tsx` kalder `supabase` direkte? Fordi CLAUDE.md foreskriver RTK Query til serverkald, og de to login-sider er ældre kode fra før migreringen. Nyt arbejde lægges det rigtige sted; de gamle sider omskrives **ikke** i denne omgang.

**`src/pages/logIn/Login.tsx`:** link "Glemt din adgangskode?" under adgangskode-feltet i samme `text-accent hover:underline` som "Opret konto"-linket. Læser `useSearchParams()`: med `?nulstillet=1` vises den grønne kvittering øverst — samme klasser som resten af appen (`rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2`, jf. `ProfilePage.tsx:139`): "Din adgangskode er ændret. Log ind med den nye." `signInWithPassword`-kaldet røres ikke.

**`src/App.tsx`:** én offentlig rute ved siden af `/login`/`/signup` (uden for `ProtectedRoute`, og **før** catch-all'en). `FULL_WIDTH_ROUTES` udvides **ikke** — formularsider bruger `<main>`s almindelige wrapper, som `/login` gør.

### Frontend US-69

**Ny fil `src/components/profile/ChangePasswordForm.tsx`** (ny mappe) — egen komponent frem for endnu 60 linjer i `ProfilePage.tsx` (281 linjer i forvejen), jf. CLAUDE.mds "keep components small and focused". Tager ingen props → ingen ny fil i `src/types/`. Tre felter: Nuværende adgangskode, Ny adgangskode, Gentag ny adgangskode. Samme validering og tekster som `SignUp.tsx`, plus "Den nye adgangskode skal være forskellig fra den nuværende."

**`src/store/apis/authApi.ts`:** `changePassword: builder.mutation<void, { currentPassword: string; newPassword: string }>` med to trin i samme `queryFn`:

1. `signInWithPassword({ email: <brugerens egen fra sessionen>, password: currentPassword })` — **det er verifikationen**. Supabase kræver ikke selv den nuværende kode for `updateUser`, så uden dette trin kunne en efterladt, åben browser bruges til at låse ejeren ude af sin egen konto. Fejler kaldet → `'Din nuværende adgangskode er forkert.'`, og intet er ændret.
2. `updateUser({ password: newPassword })` → ved fejl `'Adgangskoden kunne ikke ændres. Prøv igen.'`

Emailen tages fra den session, `useGetSessionQuery` allerede holder i cachen — ingen ekstra opslag, og brugeren skal ikke taste sin egen email igen.

**Bivirkning, som er i orden:** trin 1 giver en ny session for den samme bruger, så `onAuthStateChange` fyrer `SIGNED_IN` og invaliderer `USER_SCOPED_TAGS` (`authApi.ts:44`). Profil/organisation/privilegier hentes altså friskt bagefter — et par spildte kald, men det er den eksisterende, korrekte adfærd, og der laves ingen undtagelse i listeneren for at undgå det.

Brugeren forbliver **logget ind** efter skiftet (modsat US-68, hvor intet var bevist) og får kvitteringen "Din adgangskode er ændret."

**`src/pages/profile/ProfilePage.tsx`:** `<ChangePasswordForm />` indsættes som eget afsnit nederst under kontooplysningerne, med overskriften "Adgangskode" i samme stil som sidens øvrige afsnit. Resten af siden røres ikke.

### `src/pages/public/HelpPage.tsx` — to FAQ-poster, når koden er lavet

- **"Jeg har glemt min adgangskode"** (`HelpPage.tsx:174`): fra "den funktion er på vej — skriv til os" til den rigtige vej (klik "Glemt din adgangskode?" på loginsiden, bekræft med email og navn, vælg en ny kode), med link til `/glemt-adgangskode`. Sætningen om at skrive til `CONTACT_EMAIL` bliver stående som sidste udvej.
- **"Hvordan retter jeg mit navn eller billede?"** (`HelpPage.tsx:165`): "Navn, beskrivelse og billede kan du selv rette" udvides med adgangskoden.

### Verifikationsliste (til den runde, hvor der kodes)

1. SQL'en køres af bruger i Supabase SQL Editor; `dbSchema.sql` opdateres først bagefter, som dokumentation af det kørte.
2. `npm run build` + `npm run lint`. Baseline: **14 præeksisterende `no-explicit-any`-fejl + 1 warning** (`categoryApi.ts`/`newsApi.ts`/dataLayer) — ingen nye må komme til.
3. US-68 i browseren: link på loginsiden; forkert navn til rigtig email og ukendt email giver *nøjagtig samme* besked; validering fanger korte/uens koder uden kald til Supabase; rigtige oplysninger fører til `/login` med grøn kvittering, hvor den gamle kode afvises og den nye virker.
4. US-69 i browseren: "Adgangskode"-afsnit på `/bruger`; forkert nuværende kode giver fejl og ændrer intet; ny kode = nuværende afvises af valideringen; rigtigt skift giver grøn kvittering, brugeren er stadig logget ind, og siden viser stadig rigtigt navn/organisation.
5. `/hjaelp`: begge FAQ-poster passer. 375px: `/glemt-adgangskode` står som `/login`, og `/bruger`s nye afsnit bryder ikke layoutet.

## Skema-eksport og drift-fund (2026-09-11)

Hele det faktiske skema blev hentet ud af Supabase med `docs/exportSchema.sql` (read-only select fra systemkatalogerne, køres i SQL Editor, resultatet downloades som CSV). Den viste **49 policies, 20 funktioner, 8 triggers, 54 constraints, 47 indexes** — og at `dbSchema.sql` var drevet fra virkeligheden.

**Kør den igen, når du er i tvivl om dokumentationen holder.** Den er det eneste værktøj i repoet, der viser hele skemaet — `dbSchema.sql` er håndskrevet og kan drive fra databasen, som den gjorde her.

Selve CSV-eksporten gemmes ikke i repoet — den er et øjebliksbillede, der hurtigt bliver forældet og misvisende. Værktøjet bliver, resultatet slettes efter brug.

Af samme grund blev `docs/supabaseTables.sql` slettet 2026-09-11: et delvist tabel-dump uden indexes, constraints, triggers, policies og funktioner, som man ikke kunne konkludere noget ud fra. `dbSchema.sql` er nu i sync, og `exportSchema.sql` henter resten.

### Bug fundet: `memberships`-policyens escalation-guard

Policyen indeholdt `where p.role_id = role_id`. Et ukvalificeret kolonnenavn opløses til den **inderste** tabel, så Postgres havde gemt udtrykket som `p.role_id = p.role_id` — altid sandt, og `not exists (...)` dermed altid falsk.

Guarden skulle kun blokere tildeling af roller, der bærer `admin`-privilegiet. I stedet blokerede den **alt**: en bruger med `manage_roles` men uden `admin` kunne ikke tildele nogen rolle overhovedet, kun "Standard medlem (ingen rolle)". Aldrig opdaget under test, fordi en fuld administrator kortslutter OR-udtrykket på `has_privilege('admin')` og derfor er upåvirket — al test af rolletildeling er foregået som administrator.

Rettelsen (`p.role_id = memberships.role_id`) er **kørt og testet i browseren 2026-09-11** og står i `dbSchema.sql` §16.10 med hele forklaringen. En `manage_roles`-bruger uden `admin` kan nu tildele almindelige roller, mens roller der bærer `admin`-privilegiet stadig er spærret for dem.

**Bekræftet under samme test (ikke en fejl):** en `manage_roles`-bruger kan ikke tildele privilegiet "Fuld administrator (kan alt)" til en rolle — valgmuligheden vises slet ikke. Det er tilsigtet og gates to steder: `RolesPrivilegesPanel.tsx:165` filtrerer den ud af dropdownen, og `privileges`-policyen (§16.4) ville afvise den server-side med `name <> 'admin' or has_privilege('admin')`. At samme bruger godt kan give Admin-rollen *andre* privilegier er også tilsigtet: `manage_roles` betyder "må administrere roller og privilegier", og kun selve `admin`-navnet er spærret.

**Værd at være bevidst om:** `manage_roles` er derfor et næsten-administrator-privilegie. Indehaveren kan tilføje ethvert privilegie undtagen `admin` til en hvilken som helst rolle i organisationen — også til sin egen rolle — og dermed i praksis give sig selv `manage_members`, `manage_organisation`, `manage_datalayer` osv. `trg_prevent_self_membership_role_change` (§15.9) blokerer kun, at man skifter sin egen rolle ud, ikke at man udvider den rolle man allerede har. Loftet er `admin`, som forbliver uopnåeligt. Bevidst afvejning, ikke en fejl — men `manage_roles` bør kun gives til nogen, man i forvejen ville betro administratorrettigheder.

### 7 udokumenterede DB-objekter — nu skrevet ind i `dbSchema.sql`

Alle Studerende 3's, undtagen den sidste. Markeret i `dbSchema.sql` som *dokumenteret fra DB-eksport, ikke ændret af os*.

| # | Objekt | Placering i `dbSchema.sql` |
|---|---|---|
| 1 | Enum `e_task_priority` | §1 |
| 2 | `tasks.room_id` / `priority` / `max_assignees` | §10 |
| 3 | Index `idx_tasks_room` | §10 |
| 4 | Tabellen `task_rooms` (+ `required_role_id`, `idx_task_rooms_org`) | Nyt §9.5 |
| 5 | `task_rooms` i RLS-listen | §16 |
| 6 | `task_rooms`' **fire** policies | Nyt §16.7b |
| 7 | Policy `"Alle autentificerede kan se organisationsliste"` | §16.1 |

Punkt 7 lukkede samtidig det gamle sidefund om organisations-dropdownen (se noten under statustabellen).

### Noteret, ikke rettet

- **Alle security definer-funktioner er EXECUTE-grantet til `anon`**, ikke kun `authenticated`. Det er Postgres' default (`PUBLIC` får EXECUTE på nye funktioner), så vores `grant execute ... to authenticated`-linjer er redundante og giver et falsk indtryk af, at anon er lukket ude. **Ikke udnytteligt:** hver RPC afviser selv en udlogget kalder. Eneste uden eksplicit `auth.uid() is null`-guard er `invite_member`, som reddes af at `auth_profile_org()` returnerer null — held, ikke design. Kan lukkes med `revoke execute ... from anon, public` + `grant ... to authenticated` pr. funktion (begge linjer kræves — `revoke from public` fjerner også authenticated's arvede rettighed); mønsteret står i `dbSchema.sql` §15. Ikke gjort: ingen kendt sårbarhed at lukke.
- **`task_rooms.required_role_id`** (FK → `roles`) er Studerende 3's eget rolle-gate-koncept på rum-niveau. Findes i skemaet og i `src/types/Task/Task.ts`, men bruges ingen steder. Overlapper konceptuelt med US-63's `manage_tasks` — to forskellige adgangsmodeller. Skal afklares med Studerende 3.
- **`tasks` har ingen `created_by`** — en "opret-ejeren må redigere sin egen opgave"-regel kræver en ny kolonne først.

## Fase 2-spec (US-62 + US-63) — historik, OPSLUGT AF FASE 3 2026-09-15

**Denne sektion er historisk.** Fase 2's ét-privilegie-pr-domæne (`manage_datalayer`/`manage_tasks`) er opslugt af Fase 3 (se afsnittet "Fase 3 - granulære CRUD-privilegier" nedenfor), som designer begge domæner direkte som fuldt CRUD i stedet. `us-62-datalayer-write-privileges.sql`/`us-63-tasks-write-privileges.sql` er slettet og erstattet af `fase3-datalayer-privileges.sql`/`fase3-tasks-privileges.sql`. Resten af sektionen står som dokumentation af den oprindelige analyse (tabellen, "fælderne", de tre blokerings-spørgsmål for Opgaver) - selve konklusionen (privilegienavne, hvilke policies der gates) er ikke længere gældende.

Den gamle prosa-spec her er **erstattet af kørselsklar SQL**, revideret 2026-09-11 mod den faktiske database:

| Fil | Status |
|---|---|
| `docs/migrations/us-62-datalayer-write-privileges.sql` | Klar — ingen åbne spørgsmål |
| `docs/migrations/us-63-tasks-write-privileges.sql` | **MÅ IKKE KØRES** — 3 spørgsmål i header |

Hver fil indeholder selve SQL'en, en "hvem mister adgang"-query til at køre først, hvad der mangler i frontenden, og rollback nederst. `docs/migrations/README.md` beskriver konventionen.

**Hvad den gamle spec tog fejl af** (derfor er den fjernet, ikke bare flyttet):

- Den regnede med **7 tabeller**. Der er 8 — `task_rooms` er tilkommet.
- Den antog, at `deleteTask` ikke fandtes. Den gør nu, både mutation og UI i `EditTaskModal.tsx`.
- Den antog, at det var nok at gate hver tabels ene `for all`-policy. For `task_rooms` er det **forkert**: to engelske duplikat-policies (`Users can create/view task rooms in their organisation`) ville stadig slippe INSERT igennem, fordi policies OR'es. De skal droppes samtidig.

**Uændret fra den gamle spec:** privilegienavnene `manage_datalayer` og `manage_tasks`, mønsteret med `has_privilege_or_admin()` oven på Fase 1-infrastrukturen, at de åbne SELECT-policies ikke røres, og at der ikke er brug for en escalation-guard (der er ingen vej til admin via Datalayer/Opgave-data).

Begge privilegier er allerede tilføjet i `src/store/apis/privilegeApi.ts` (`KNOWN_PRIVILEGES`), **før** RLS gates. Det er bevidst: så kan en organisation nå at tildele privilegierne til sine roller, inden skrivning strammes — ellers mister alle menige medlemmer, inkl. de andre studerendes testbrugere, skriveadgang i samme sekund SQL'en køres. Indtil da har konstanterne ingen effekt.

## Fase 3 - granulære CRUD-privilegier

Startet 2026-09-15 efter bruger-forespørgsel: "en rolle kan have at de må gerne Create noget men ikke må Delete". Erstatter hvert domænes ene `manage_X`-privilegie (Fase 1/2-mønsteret) med separate `create_X`/`read_X`/`update_X`/`delete_X` - kun de operationer der faktisk findes pr. domæne. Read bliver samtidig et rigtigt, tildelbart privilegie i stedet for åbent for alle organisationsmedlemmer, som det var i Fase 1/2.

**Låse-ude-problemet og løsningen:** et medlem uden rolle havde i Fase 1/2 fuld læseadgang (ingen policy tjekkede read). Med Read gated ville det medlem miste alt. Løsning, bekræftet af bruger: hver organisation får en beskyttet standardrolle **"Medlem"** (samme beskyttelse mod omdøb/slet som "Admin"), som:
- seedes automatisk sammen med "Admin", når en organisation oprettes (`create_organisation`)
- tildeles automatisk (i stedet for `role_id null`) når et medlemskab oprettes via accepteret anmodning eller invitation
- er fallback, hvis en anden rolle slettes (ny `before delete on roles`-trigger flytter medlemmerne til "Medlem" i stedet for at lade dem blive rolleløse - erstatter `on delete set null` som reel adfærd)
- starter bevidst med MINIMAL adgang (kun `read_news`) - bruger var eksplicit: "Medlem"-rollen skal "mere eller mindre kun have adgang til dashboard". Alt andet skal en admin eksplicit tildele en anden rolle.
- Konsekvens: eksisterende rolleløse medlemmer mister bred læseadgang, de havde før, når migrationerne køres - forventet og tilsigtet, ikke en bug. Hver migrations-fil har sin egen "hvem mister adgang"-preflight-query.

**Domæne → privilegie-mapping** (kun operationer der reelt findes oprettes - ingen døde no-op-navne):

| Domæne | Privilegier | Note |
|---|---|---|
| roles (roller+privilegier+rolletildeling) | create/read/update/delete_roles | `update_roles` dækker OGSÅ at redigere en rolles privilegier (insert/update/delete på `privileges`-tabellen) og at tildele rollen til et medlem (`memberships.role_id`) - bevidst ikke splittet yderligere ud, jf. bruger-beslutning |
| organisation | update_organisation | Ingen create/read/delete-privilegier: create er selvbetjent RPC, read er bevidst globalt åbent (anmod-om-medlemskab-flowet), delete forbliver HARDCODED til ægte `admin` (bruger-beslutning: for destruktivt til uddelegering) |
| membership_requests | read/update_membership_requests | Ingen create/delete - ansøger opretter selv, admin sletter aldrig en anmodning |
| members | delete_members | Kun `remove_member`-RPC'en. Ingen read_members (bruger-beslutning: medlemslisten forbliver åben for alle - for lav risiko/for bredt brugt til at gate) |
| invitations | create/read/delete_invitations | Ingen update - modtageren svarer selv, ikke privilegie-gated |
| news | create/read/update/delete_news | Fuldt CRUD - rent eksempel-domæne, `read_news` gives til "Medlem" som standard |
| datalayer (`locations`/`data_layer_categories`/`data_layer_items`) | create/read/update/delete_datalayer | Aldrig kørt som Fase 2 (`manage_datalayer`) - designet direkte som CRUD i stedet |
| tasks (`tasks`/`task_participants`/`task_materials`/`task_rooms`/`task_assignees`) | create/read/update/delete_tasks | Aldrig kørt som Fase 2 (`manage_tasks`). `task_assignees`: selvbetjening (til-/afmeld sig selv) bevares uafhængigt af privilegier; tilmelde/afmelde EN ANDEN kræver create_tasks/delete_tasks. Ny RPC `set_task_status(p_task_id, p_status)` lader en tilmeldt selv ændre status på egne opgaver uafhængigt af `update_tasks` (RLS kan ikke kolonne-begrænse en almindelig UPDATE-policy) |

**Migrations-filer** (`docs/migrations/`):
1. ~~`fase3-medlem-rolle.sql`~~ - **KØRT 2026-09-15**, bekræftet i Supabase, `dbSchema.sql` opdateret. Filen er slettet igen (jf. konventionen).
2. ~~`fase3-roles-organisation-privileges.sql`~~ - **KØRT 2026-09-15**, samme.
3. ~~`fase3-membership-members-invitations-privileges.sql`~~ - **KØRT 2026-09-15**, samme.
4. ~~`fase3-news-privileges.sql`~~ - **KØRT 2026-09-15**, samme.
5. ~~`fase3-datalayer-privileges.sql`~~ - **KØRT 2026-09-15**, bekræftet i Supabase (Studerende 2 godkendte, frontend-gating bygget - se US-62-rækken). `dbSchema.sql` opdateret, filen slettet igen.
6. `fase3-tasks-privileges.sql` - stadig **IKKE kørt**, ligger i `docs/migrations/`. **Vent** til Studerende 3 har godkendt frontend-ændringerne OG taget stilling til `task_rooms.required_role_id` (se checkpoint nedenfor)

Alle seks er skrevet 2026-09-15. Erstatter de slettede `us-62-datalayer-write-privileges.sql`/`us-63-tasks-write-privileges.sql`.

**Checkpoint - spørg FØR der skrives kode i Studerende 2/3's filer** (aftalt med bruger: byg alt, men stop op ved dette punkt):

Til Studerende 2 (Datalayer), før `DataLayerPage.tsx` + kategori/item-komponenter + `categoryApi.ts` ændres:
> Indfører granulære CRUD-privilegier (create/read/update/delete_datalayer) i stedet for ét manage_datalayer. Betyder: opret/redigér/slet-knapper i DataLayerPage.tsx (og kategori/item-komponenterne) bliver vist/skjult efter brugerens privilegier, ny 42501-fejlbesked-mapping i categoryApi.ts, og en tom-tilstand hvis brugeren ikke har read_datalayer. Ingen ændring i layout/struktur. Må jeg lave de ændringer i dine filer?

Til Studerende 3 (Opgaver), før `TaskPage.tsx`/`TaskCard.tsx`/`EditTaskModal.tsx`/`taskApi.ts` ændres:
> Samme princip for Opgaver: create/read/update/delete_tasks. Opret/redigér/slet-knapper gates efter privilegie, ny 42501-mapping i taskApi.ts, tom-tilstand uden read_tasks. Selvbetjening bevares uafhængigt af privilegier: til-/afmelde sig selv (task_assignees) og ændre status på egne tildelte opgaver (ny set_task_status-RPC). Må jeg lave de ændringer i dine filer? Og: har du en holdning til task_rooms.required_role_id (ubrugt kolonne, konkurrerende adgangs-koncept) - skal den ryddes op, eller ignorerer vi den stadig?

**Frontend bygget 2026-09-15** (de fire domæner der ikke kræver godkendelse fra andre): `src/store/apis/privilegeApi.ts` (alle nye CRUD-konstanter, `PRIVILEGE_DOMAINS`, `privilegeOpLabel`, ny `useHasAnyPrivilege`-hook), `src/store/apis/roleApi.ts` (`MEMBER_ROLE_NAME`), `src/types/role/roleType.ts` (`AssignRoleInput.roleId` ikke længere nullable), `src/components/dashboard/MembersPanel.tsx` ("Standard medlem (ingen rolle)"-sentinel fjernet), `src/components/dashboard/RolesPrivilegesPanel.tsx` ("Medlem" låst ligesom "Admin", "Tilføj privilegie"-dropdown grupperet pr. domæne), `src/components/dashboard/AdministrationTab.tsx` + `src/pages/dashboard/Dashboard.tsx` (fane-synlighed via `useHasAnyPrivilege`), `src/pages/News/NewsPage.tsx`/`NewsDetailPage.tsx`/`src/components/News/NewsCard.tsx`/`src/types/news/newsType.ts` (canManage → canUpdate/canDelete, siden gates nu også af read_news). `npm run build` (tsc + vite) grønt. `npm run lint` kunne ikke køre (typescript-eslint understøtter ikke den installerede TS 7.0 - forudeksisterende værktøjsproblem, ikke relateret til denne ændring).

Migrationsfil 1-4 er kørt og bekræftet (2026-09-15). **To bugs fundet+rettet under browser-test samme dag:**
1. **`privileges`-SELECT blokerede selv-læsning.** "Se privilegier i egen organisation"-policyen gated ALLE læsninger bag `read_roles`/admin - herunder `privilegeApi.ts`s `getMyPrivileges()`, som hver bruger kalder for at læse SIN EGEN rolles privilegier (til `useHasPrivilege`). Uden `read_roles` blev den tavst RLS-filtreret til 0 rækker (ingen fejl), så en nytildelt rolle virkede i admin-oversigten, men brugeren selv fik aldrig privilegiets effekt. Rettet ved en ny gren i policyen, der altid tillader en bruger at se privilegierne på egen aktuelle rolle. Samtidig rettet en relateret svaghed: escalation-guarden på "Tildel rolle"-policyen (16.10) læste også `privileges` direkte i en subquery og ramte samme tavse filtrering for en `update_roles`-uden-`read_roles`-bruger - flyttet ind i ny security definer-funktion `role_has_privilege()` (bypasser RLS, ligesom `has_privilege()`). `dbSchema.sql` opdateret.
2. **Eksisterende roller migreret aldrig fra gamle `manage_X`-navne.** Trin 2-4 omdøbte alle RLS-policies til de nye CRUD-navne, men rørte aldrig privilegie-RÆKKERNE på roller, der havde `manage_X` FØR Fase 3 (fundet: en testrolle "KlapTorsk" med `manage_roles`/`manage_datalayer`/`manage_tasks` - ingen policy tjekkede de navne længere, så rollen gav reelt ingen adgang). Rettet med en data-migrering (kørt og bekræftet, ingen `dbSchema.sql`-ændring nødvendig - ren data): for hver gammel `manage_X`-række, indsæt de tilsvarende nye CRUD-privilegier på samme rolle, slet den gamle række.

3. **`roles`-SELECT havde samme fejl som privileges (fundet lige efter).** "Se roller i egen organisation"-policyen gated også ALT bag `read_roles`/admin - herunder `profileApi.ts`s `lookupName('roles', roleId)`, kaldt fra `getMyProfile()` for at vise EGET rollenavn på `/bruger`. Viste "Ingen rolle tildelt" for enhver uden `read_roles`. Rettet med samme mønster: en bruger må altid se sin egen rolle-række. **Denne fejl gjorde samtidig privileges-fixet (punkt 1) ufuldstændigt** - dens org-scoping-subquery (`role_id in (select id from roles where ...)`) var selv underlagt roles' RLS, så en almindelig brugers egen privilegie-læsning fortsat fejlede indtil roles-fixet også var kørt. Alle tre rettelser er nu kørt, bekræftet i browseren (profilside + nyhedsadgang virker for en testbruger med en custom rolle), og `dbSchema.sql` opdateret.

**Testet og bekræftet virkende i browseren 2026-09-15:** Nyheder (custom rolle med kun `create_news`+`read_news`, profilsiden viser korrekt rollenavn efter de tre rettelser), rolle-sletning-fallback til "Medlem", medlemsanmodninger (read/update-split), invitationer (create/read/delete-split), medlemmer (`delete_members`), roller (`read_roles`), organisation (`update_organisation`), og Datalayer (create/read/update/delete_datalayer, alle knapper gated pr. operation) - alle uden problemer.

**Ekstra polish samme dag (efter bruger-forespørgsel):** header-navigationen og Dashboardets Oversigt-fane viste stadig "Datalager"/"Nyheder"-links/widgets til alle organisationsmedlemmer, uanset `read_datalayer`/`read_news` - RLS/siderne selv var korrekt gated, men indgangene var det ikke. Rettet i `headerComponent.tsx` (desktop + mobil-nav) og `OverviewTab.tsx` (genvejskort hhv. `NewsSlider`), begge nu betinget af `useHasPrivilege(READ_DATALAYER_PRIVILEGE)`/`useHasPrivilege(READ_NEWS_PRIVILEGE)`. Testet og bekræftet i browseren. Ingen SQL-ændring.

**Escalation-guards testet og bekræftet 2026-09-15** (punkt E i test-listen) - hele test-listen (A-F, punkt 12-16) er nu gennemgået og godkendt af bruger uden problemer.

**Status ved dagens afslutning (2026-09-15):** Fase 3 er FÆRDIG og testet for alle domæner undtagen Opgaver. **Opgaver afventer bevidst** - talt med Studerende 3, domænet er ikke klar endnu. `fase3-tasks-privileges.sql` ligger fortsat klar i `docs/migrations/` til den dag det kan tages op igen (spørgsmålene til Studerende 3 står i checkpoint-afsnittet nedenfor).

**4. Merge med `origin/main` (2026-09-15):** en stor merge (notifikationer, beskeder, Task-rum m.m. fra andre studerende) landede på branchen. Kun `headerComponent.tsx` gav en reel konflikt - løst ved at beholde begge sider (notifikationsklokke + Beskeder-link fra `origin/main`, `read_datalayer`/`read_news`-gating fra Fase 3). `npm run build` grønt efter løsning, filen staged - **merge'et er IKKE committet, det er brugerens skridt.** Fundet samtidig: `roleApi.ts` er ændret af merge'et til at bruge `getOrganisationMembers()` som kontaktliste til den nye besked-funktion, og slår nu rollenavne op for ALLE medlemmer (ikke kun egen) direkte i `roles`-tabellen - ramte `read_roles`-gatingen fra bugfix #1 ovenfor, så rollenavne forsvandt for alle uden `read_roles` i kontaktlisten. **Rettet (bugfix #2, kørt og bekræftet):** `roles`-SELECT åbnet helt for org-medlemmer igen (kun id/name - intet følsomt), samme adfærd som før Fase 3. `privileges`-tabellen (den faktiske rettighedsliste) forbliver korrekt gated. `dbSchema.sql` §16.3 opdateret.

## Konventioner

- Kode (variabelnavne, funktionsnavne, kommentarer) skrives på engelsk.
- UI-tekst til brugeren (labels, knapper, fejlbeskeder) forbliver på dansk.
- Denne fil og øvrig `docs/`-dokumentation forbliver på dansk.
- Git commits laves af brugeren selv.
- DB-ændringer køres manuelt af brugeren og skal derfor have sql kode til at kunne bruges i Supabase SQL Editor. `dbSchema.sql` opdateres bagefter som dokumentation.
- **SQL lægges i `docs/migrations/`** (siden 2026-09-11): én fil pr. ændring, header med story + om den er kørt, rollback nederst som kommentar. **Når en fil er kørt og indholdet står i `dbSchema.sql`, slettes filen igen** — mappen rummer kun det, der mangler at blive kørt; git har historikken. `dbSchema.sql` er den samlede, autoritative dokumentation. Se `docs/migrations/README.md`.
- **`docs/exportSchema.sql`** henter til gengæld det hele (enums, kolonner, constraints, indexes, RLS-status, policies, funktioner, triggers, grants). Kør den i SQL Editor og download resultatet som CSV, når du vil tjekke om `dbSchema.sql` stadig matcher databasen. CSV'en er et øjebliksbillede og skal **slettes efter brug** — den bliver misvisende, så snart nogen ændrer noget.

## Sådan bruges filen

Efter hver færdig story: opdater status-tabellen og "Næste op"-linjen øverst.


