# Studerende 1 – Fremgangsplan (Adgang, Organisation & Overblik)

Dette er den løbende statusoversigt for de 25 user stories, som Studerende 1 er ansvarlig for (jf. `userStories.md`, afsnit 13 "Arbejdsfordeling"). Filen opdateres efter hver færdig story, så en ny samtale/session altid kan se, hvor langt vi er, og hvad næste skridt er.

## Næste op

**US-62 + US-63 – Granulære skriverettigheder i Datalayer/Opgaver (Fase 2)**

Stadig UDSKUDT - kræver Tasks-domænet fra en anden studerende, som endnu ikke er klar (bekræftet med bruger 2026-09-10). Fuld implementeringsspec ligger klar i afsnittet "Fase 2-spec" længere nede. **Bemærk ved genoptagelse:** en frisk session der undersøgte Tasks-domænet 2026-09-10 fandt at der endnu ingen `deleteTask`-mutation/UI findes, og at "Tilmeld/Afmeld" (task_assignees) i dag er en selvbetjenings-handling (enhver kan til-/afmelde sig selv) - Fase 2-specens forslag om at gate task_assignees blankt bag `manage_tasks` ville ændre den eksisterende adfærd. Afklar med bruger, hvordan task_assignees skal gates (selvbetjening åben, kun "administrer ANDRES tilmelding" gated), før SQL'en fra Fase 2-specen køres for Opgave-tabellerne. US-62 (Datalayer) har ingen tilsvarende ubesvarede spørgsmål og kan formentlig køres isoleret, hvis Opgave-delen fortsat er blokeret.

I mellemtiden blev US-56 + US-57 (Nyheder) lavet ad-hoc, da de ikke afhænger af andre studerende. US-56 er FÆRDIG, testet og committet af bruger (enkelt-nyhed-side og Dashboard-slider tilføjet undervejs efter bruger-feedback). **US-57 er UDGÅET 2026-09-11** og rullet helt tilbage - browseren kan ikke læse DR's/TV2's feeds (ingen CORS-headers), og ingen organisation havde en nyheds-API; se afsnittet "US-57 udgået" nedenfor. Næste skridt herfra: US-62/US-63 (Fase 2), når Tasks-domænet er klar - ellers er der ikke flere uafhængige opgaver tilbage på listen.

(US-58, US-59, US-60, US-61, US-64, US-65, US-66 og US-67 blev alle tilføjet ad-hoc efter forespørgsel, uden for den planlagte rækkefølge - se noter nedenfor.)

## Status

| # | Story | Prioritet | Status | Note |
|---|---|---|---|---|
| US-01 | Opret konto | Critical | Done | SignUp.tsx + DB trigger komplet |
| US-02 | Login | Critical | Delvist | Login/redirect virker; banner viser nu "ingen organisation" + link til anmodning; `/`-ruten er stadig ikke beskyttet |
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
| US-62 | Granulære skriverettigheder i Datalayer | Medium | Mangler | Tilhører nu Studerende 1 (ikke Studerende 2); bevidst udskudt til efter US-59/60/61/Dashboard (trin 8) - fuld spec klar, se "Fase 2-spec" nedenfor |
| US-63 | Granulære skriverettigheder i Opgaver | Medium | Mangler | Tilhører nu Studerende 1 (ikke Studerende 3); bevidst udskudt til efter US-59/60/61/Dashboard (trin 8) - fuld spec klar, se "Fase 2-spec" nedenfor |
| US-45 | Se dashboard | Critical | Done | `Dashboard.tsx` omskrevet fra placeholder til Oversigt/Organisation/Administration-faner - se US-65-rækken. Manuelt testet og bekræftet virkende i browseren. Genvejskort til Statistik tilføjet på Oversigt-fanen (ad-hoc, `OverviewTab.tsx`) - peger på "/" ligesom header-navigationen, da Statistik-siden endnu ikke er bygget (anden studerendes domæne). Manuelt testet og bekræftet virkende. Stat-kortene (Antal items/Antal opgaver/Dine opgaver, `StatCard.tsx`) er efterfølgende fjernet igen (ad-hoc bruger-forespørgsel) og erstattet af: Genveje-grid'et flyttet øverst, derunder to nye "kommer snart"-placeholder-bjælker (`PlaceholderBar.tsx`) til "Dine opgaver" og "Notifikationer" (efter bruger-feedback vist side om side i et 2-kolonne grid, ikke stablet), og nederst en tredje til "Nyheder". Alle tre er rent visuelle - ingen data/queries/SQL. Manuelt testet og bekræftet virkende i browseren. "Dine opgaver" afventer at Opgave-siden/task-modellen bliver færdig (Task har intet direkte assignee/deadline-felt, kun `task_assignees`-join); "Nyheder" afventer bevidst US-56/US-57. **Sidefund (ikke rettet, kun flagget):** "Notifikationer" har intet datamodel eller user story i projektet endnu - kun en død klokke-ikon-knap i header der linker til `/notifikationer` (ingen rute). Bør formaliseres som en ny user story (ny tabel+triggers, læst/ulæst) når den skal bygges færdig. `StatCard.tsx`/`StatCardProps` slettet som ubrugt kode. Header-navigationen (`headerComponent.tsx`) skjuler nu Opgaver/Statistik/Datalager for brugere uden aktiv organisation (samme `useGetMyOrganisationQuery`-mønster som Oversigt-fanen) - Dashboard-linket forbliver altid synligt. Manuelt testet og bekræftet virkende i browseren (bruger uden org ser kun Dashboard, links dukker op igen med aktiv org). |
| US-46 | Se antal items | High | Done | `OverviewTab.tsx` tæller items rekursivt via eksisterende `useGetCategoryTreeQuery` (categoryApi.ts) - intet nyt count-endpoint. Manuelt testet og bekræftet virkende |
| US-47 | Se antal opgaver | High | Done | `OverviewTab.tsx` bruger `tasks.length` fra eksisterende `useGetTasksQuery` (taskApi.ts) - auto-opdaterer via samme tags som resten af appen. Manuelt testet og bekræftet virkende |
| US-56 | Se og administrere nyheder | Low | Done | Omdefineret efter afklaring med bruger (2026-09-10): nyheder er organisationens egne (opslagstavle, ikke globalt feed) - `news`-tabellen ændret fra global+select-only til org-scoped med skrivning gated af nyt `manage_news`-privilegie (`dbSchema.sql` §13/§16.9). Nyheder oprettes udelukkende manuelt (US-57's API-import er udgået 2026-09-11, se den række). `newsApi.ts` (getNews/getNewsById/createNews/updateNews/deleteNews), type `newsType.ts`, side `/nyheder` (`NewsPage.tsx` + `NewsCard.tsx`/`NewsFormModal.tsx`) + enkelt-nyhed-side `/nyheder/:id` (`NewsDetailPage.tsx`, tilføjet efter bruger opdagede man ikke kunne klikke ind på en enkelt nyhed), nav-link i header (gated bag `hasOrganisation`). Dashboard-Oversigtens "Nyheder"-placeholder er nu en auto-kørende slider (`NewsSlider.tsx`) gennem de seneste 10 nyheder - billedet fylder hele slidet som baggrund (gradient + hvid tekst) når sat, ellers hvid baggrund. `news` har desuden et valgfrit `url`-felt (link til original-artiklen, vist som "Læs mere"). SQL kørt og bekræftet i Supabase. **Testet med 10 manuelle test-nyheder og bekræftet virkende i browseren af bruger, committet.** **Opfølgning 2026-09-11 (efter US-57 udgik):** beskrivelsen kan nu formateres som i et tekstbehandlingsprogram - ny genbrugelig `RichTextEditor.tsx` (`src/components/TextEditor/`, bevidst uden for News-mappen så fx opgavebeskrivelser kan bruge den senere) med fed/kursiv/understreget, punktopstilling/nummereret liste, typografi-dropdown (Normal/Overskrift/Underoverskrift), ryk ind/ud og link-indsættelse. Bygget på `document.execCommand` uden nye dependencies, samme linje som `NewsSlider.tsx`. Da indholdet renderes med `dangerouslySetInnerHTML`, er der en egen whitelist-sanitizer (`src/lib/richText.ts`): kun kendte tags overlever, ALLE attributter fjernes undtagen `href`, og `href` kun med http/https/mailto - uden det kunne en `manage_news`-indehaver køre script i alle organisationsmedlemmers browser og læse deres Supabase-session, altså eskalere forbi RLS. Saniteres både ved gem, ved indsæt fra udklipsholder (Word-paste) og igen ved visning. Kort og slider viser uddraget via `richTextToPlainText` (ellers rå tags gennem `line-clamp`); gamle rene tekst-nyheder detekteres med `isRichText` og vises som hidtil, så ingen datamigration var nødvendig. Blødt loft på 20.000 tegn i formularen, ingen DB-constraint. **Bugs fundet+rettet under test:** (1) et indsat link landede altid i begyndelsen af beskrivelsen i stedet for ved markøren - `run()` genskabte kun den gemte markering, hvis den lå UDEN FOR editoren, men `el.focus()` sætter selv markøren tilbage i starten af feltet, så betingelsen var falsk; rettet til altid at genskabe fra `savedRangeRef`. (2) man kunne kun angive selve adressen, ikke linkets tekst - linkpanelet har nu to felter ("Tekst der vises" + adresse), forudfylder teksten fra markeringen og forudfylder begge felter, hvis markøren står i et eksisterende link (som så erstattes frem for at få et link indlejret i sig). Samtidig omdøbt "Link (valgfri)" → "Link til oprindelig artikel (valgfri)" og "Læs mere" → "Læs hele artiklen" efter bruger-feedback om at labellen var intetsigende. `.rich-text`-styling i `index.css` (Tailwind-preflight nulstiller h2/ul/ol, og typography-pluginnet er ikke installeret). **Ingen SQL** - `description` er allerede `text`. |
| US-57 | Hente nyheder fra en organisations egen eksterne API | Low | Udgået | **UDGÅET 2026-09-11 efter bruger-beslutning - al kode og alle DB-objekter fjernet igen** (se afsnittet "US-57 udgået" nederst for målingerne bag beslutningen og den SQL, der ruller det tilbage). Var implementeret som: org-konfigurerbar API-adresse+nøgle (`news_sources`), admin-trigget "Hent nu" (`NewsSourcePanel.tsx`, `fetchFromNewsSource`), fast JSON-kontrakt. Blev aldrig testet mod et rigtigt endpoint, fordi ingen organisation havde en nyheds-API at pege på (kandidat `godtgoerelse-api.roskilde-festival.dk` undersøgt og forkastet - er Roskilde Festivals interne udlægsrefusions-API). Nyheder oprettes nu udelukkende manuelt på siden (US-56). |
| US-59 | Være medlem af flere organisationer | High | Done | DB-migration kørt og bekræftet (memberships-tabel, `active_organisation_id`, nye RPC'er `set_active_organisation`/opdateret `create_organisation`) + `dbSchema.sql` opdateret; `categoryApi.ts`/`taskApi.ts` rettet til nyt kolonnenavn. Frontend: profileApi/organisationApi/roleApi/privilegeApi omlagt til memberships; `/organisation` har 4 faner når man har en aktiv org: "Organisation", "Mine organisationer" (liste + skift aktiv), "Anmod om medlemskab", "Opret organisation" (sidste to tilføjet undervejs - opdaget under test at en bruger med en org allerede ikke havde nogen UI-vej til at anmode/oprette en 2. org, kun no-org-fligen havde det). Manuelt testet og bekræftet virkende i browseren. **Bugs fundet+rettet under test:** (1) `profiles`-SELECT-policyen "Se egen profil eller profiler i egen organisation" sammenlignede stadig `active_organisation_id` direkte i stedet for at tjekke `memberships` - et medlem af 2 organisationer blev usynligt for administratorer i den organisation, der IKKE var brugerens aktive (fx forsvandt fra medlemslisten på `/roller`). Rettet til at bruge `exists (... memberships ...)`, se `dbSchema.sql` §16.2. (2) "Mine organisationer" viste "Ingen rolle tildelt" for enhver organisation der ikke var aktiv, fordi roles-RLS er scopet til aktiv organisation - løst med ny security definer-funktion `get_my_memberships()` (§15.12), som `organisationApi.ts`s `getMyMemberships` nu kalder i stedet for 3 separate klient-forespørgsler. (3) Efter login som en anden bruger viste siden forkert rolle/organisation indtil F5 - `authApi.ts`s login/logout-tag-invalidering var en hardcoded liste fra FØR US-59, som aldrig fik `'Membership'` (eller `'Role'`/datalag/opgave-tags) tilføjet. Rettet ved at udtrække én delt, eksporteret `USER_SCOPED_TAGS`-liste i `supabaseApi.ts`, som nu bruges af BÅDE `authApi.ts` (login/logout) og `organisationApi.ts` (skift aktiv org/opret/forlad organisation) - undgår at de to lister kan drive fra hinanden igen. Ingen SQL, kun frontend. |
| US-60 | Oprette flere organisationer | Medium | Done | `create_organisation`-RPC'ens "allerede medlem"-blokering fjernet; en nyoprettet organisation bliver altid aktiv med det samme (også ved 2./3. org - ændret undervejs efter bruger-feedback om at "kan vælge som aktiv" skulle betyde automatisk skift + kvitteringsbesked, ikke manuelt skift bagefter). "Opret organisation"-fane på `/organisation` for brugere med en aktiv org, med besked "Organisationen X er oprettet og er nu din aktive organisation". Manuelt testet og bekræftet virkende (auto-skift af aktiv org bekræftet af bruger). |
| US-61 | Forlade en organisation | Medium | Done | Ny RPC `leave_organisation` (`dbSchema.sql` §15.11) - blokerer hvis brugeren er organisationens eneste administrator; hvis den forladte organisation var aktiv, vælges automatisk en anden af de resterende medlemskaber som ny aktiv (eller ingen, hvis der ikke er flere) + besked om det, samme mønster som US-60. "Forlad"-knap pr. række under "Mine organisationer" på `/organisation`, med bekræft-trin. Manuelt testet og bekræftet virkende i browseren, inkl. de 3 bugs fundet undervejs (se US-59-rækken). |
| US-64 | Slette en organisation | Medium | Done | Ny RPC `delete_organisation` (`dbSchema.sql` §15.13) - kan teknisk slette enhver organisation brugeren administrerer (samme manuelle memberships/privileges-opslag som `leave_organisation`, da `has_privilege_or_admin()` kun tjekker aktiv organisation); ingen "sidste medlem"-restriktion, dækker både "alene tilbage" og "organisationen lukker ned med andre medlemmer tilbage". Al data cascader automatisk via eksisterende FK'er. `get_my_memberships()` (§15.12) udvidet med `is_admin`/`member_count`. "Slet organisation"-knap under "Mine organisationer", men - efter bruger-feedback - kun vist på den AKTIVE organisations række (bevidst UI-begrænsning, ikke RPC-begrænsning, for at undgå fejlagtig sletning af den forkerte org i listen). Bekræft-flow: skriv organisationens navn + 2 tjekbokse (datatab, og - hvis relevant - antal andre medlemmer der mister adgang). **Bugs fundet+rettet under test:** (1) `delete_organisation`s kaskade ned til `roles`/`privileges` ramte `trg_prevent_admin_role_change`/`trg_prevent_admin_privilege_change` (15.5/15.6), som normalt (med god grund) blokerer sletning af organisationens "Admin"-rolle/privilegie - men her forsvinder hele organisationen alligevel. Rettet ved at give begge triggere et nyt `ponos.bypass_admin_protection`-flag (samme mønster som `ponos.bypass_self_role_org_change`), som `delete_organisation` nu sætter før sletningen. (2) `delete_organisation` BEREGNEDE den nye aktive organisation efter sletning (`v_next_org_id`), men glemte den faktiske `update profiles set active_organisation_id = ...` - kolonnen stod derfor på null (nulstillet af FK-cascaden) selvom brugeren havde et andet medlemskab tilbage. Rettet ved at tilføje den manglende UPDATE. (3) Da active_organisation_id var null, var der ingen UI-vej tilbage til "Mine organisationer" - `/organisation`s "ingen organisation"-visning viste kun opret/anmod-faner. Rettet defensivt (uafhængigt af om bug (2) skulle opstå igen): den visning tjekker nu `getMyMemberships` og tilbyder en "Mine organisationer"-fane, hvis brugeren rent faktisk har medlemskaber, med en forklarende tekst i stedet for at antage "ingen aktiv org" = "ingen organisationer overhovedet". Manuelt testet og bekræftet virkende i browseren. |
| US-65 | Administration og organisation samlet på dashboardet | Medium | Done | Ny story, tilføjet ad-hoc efter bruger-forespørgsel under planlægning af US-45/46/47, siden udvidet efter endnu en forespørgsel (se `userStories.md`). Roller & privilegier (`RolesPage.tsx`), medlemsanmodninger (`MembershipRequestsPage.tsx`) og organisationens rediger/slet (dele af `OrganisationPage.tsx`) er flyttet ind i dashboardets Administration-fane som selvstændige, individuelt privilegie-gatede paneler (`RolesPrivilegesPanel.tsx`, `MembershipRequestsPanel.tsx`, `OrganisationAdminPanel.tsx`). Resten af `OrganisationPage.tsx` (se org, mine organisationer, anmod, opret) er flyttet til en ny, ikke-privilegie-gated Organisation-fane (`OrganisationTab.tsx`). De tre gamle sider og deres ruter (`/roller`, `/medlemsanmodninger`, `/organisation`) samt header-nav/dropdown-links er slettet - dashboardet har nu URL-drevet fane-state (`?tab=...`). Oversigt-fanen udvidet med "dine opgaver"-tal og genvejskort til Datalager/Opgaver (`QuickLinkCard.tsx`), samt en venlig tom-tilstand for brugere uden aktiv organisation i stedet for tre ens fejlbeskeder. Organisation-tab/Administration-organisation-panel fik desuden en header (ikon + navn + "Administrator"-badge) og et "Antal medlemmer"-nøgletal i stedet for bare navnet (genbruger allerede hentet `useGetMyMembershipsQuery`-data, ingen nye kald/SQL). **Bug fundet+rettet under test:** "Roller & privilegier"-panelet havde en nestet underfane til "Medlemmer" - tre niveauer af faner oven i hinanden (Dashboard > Administration > Roller & privilegier > Medlemmer) med to identisk navngivne "Roller & privilegier" (top-niveau og fane-niveau) virkede forvirrende. Rettet ved at gøre "Medlemmer" til en sideordnet fane ved siden af "Roller & privilegier" i Administration (ny `MembersPanel.tsx`, udtrukket fra `RolesPrivilegesPanel.tsx`). Ren frontend-omstrukturering, ingen RLS/SQL-ændringer. Manuelt testet og bekræftet virkende i browseren efter rettelsen. |
| US-66 | Fjerne medlem fra organisation | Medium | Done | Ny story, tilføjet ad-hoc efter bruger-forespørgsel. Ny RPC `remove_member(p_user_id)` (security definer, modelleret efter `leave_organisation`) - scopet til administratorens AKTIVE organisation, blokerer selv-fjernelse, og har en escalation-guard: kun en reel administrator (`admin`-privilegiet) må fjerne et medlem, hvis rolle bærer admin-privilegiet. Ny privilegie `manage_members`. Frontend: `MembersPanel.tsx` har nu en uafhængigt gated "Fjern"-knap pr. medlem (bekræft-trin), med samme escalation-guard genskabt client-side (skjuler knappen for en manage_members-only bruger over for et admin-medlem). SQL kørt og bekræftet i Supabase - `dbSchema.sql` opdateret (§15.14). Manuelt testet og bekræftet virkende i browseren (fjern almindeligt medlem, knap skjult for manage_members-only over for admin, fuld admin kan fjerne admin, fjernet bruger mister adgang/får ny aktiv org). |
| US-67 | Invitere bruger til organisation | Medium | Done | Ny story, tilføjet ad-hoc efter bruger-forespørgsel. Ny tabel `membership_invitations` (mirror af `membership_requests`, men admin-initieret i stedet for bruger-initieret) + trigger `handle_membership_invitation_status_change` (samme mønster som `handle_membership_request_status_change`) + RPC `invite_member(p_email)` (slår email op, validerer, opretter invitation) + RLS-policies (modtager svarer selv, admin kan annullere en ventende invitation). To nye, snævre RLS-tilføjelser på `organisations`/`profiles` lader hhv. modtageren se organisationens navn og administratoren se den invitteredes navn/email, uden at det kræver et eksisterende medlemskab (samme mønster som `is_pending_requester_to_my_org()`). Ny privilegie `manage_invitations`. Frontend: ny `InvitationsPanel.tsx` (admin-side: invitér + annullér), ny `InvitationsSection` i `OrganisationTab.tsx` (modtager-side: acceptér/afvis, betinget fane som "Mine organisationer"), `PendingRequestBanner.tsx` viser nu også en ventende invitation. **Bug fundet+rettet under test:** modtageren kunne ikke acceptere en invitation. Årsag: `handle_membership_invitation_status_change` opdaterer `profiles.active_organisation_id` for `invited_user_id` - ved en ANMODNING er det altid en ADMIN der godkender (rammer aldrig admins egen profil-række), men ved en INVITATION er det MODTAGEREN SELV der accepterer sin egen række, så opdateringen rammer `auth.uid()`s egen profil og udløste `trg_prevent_self_role_org_change` ("Du kan ikke ændre din egen organisationstilknytning direkte."). Rettet ved at tilføje samme `ponos.bypass_self_role_org_change`-flag som `create_organisation`/`set_active_organisation`/`leave_organisation`/`delete_organisation` allerede bruger - samme klasse fejl som er set flere gange før i dette projekt (se US-59/64-rækkerne). SQL kørt og bekræftet i Supabase - `dbSchema.sql` opdateret (§6.6, §15.15-15.16, §16.1/16.2/16.11). Manuelt testet og bekræftet virkende i browseren efter rettelsen (invitér, fejlbeskeder for ikke-eksisterende/allerede-medlem/dublet, accept, afvis, annullér, banner, inviteret bruger uden aktiv org). |

**Sidefund under planlægning (ikke rettet, kun flagget):** `organisations`-tabellens eneste SELECT-policy er scopet til `id = auth_profile_org()` - en bruger uden aktiv organisation (eller med en anden aktiv) kan formentlig ikke se andre organisationers navn/id via "vælg organisation"-dropdownen i `OrganisationTab.tsx` (anmod/opret-fanerne). Ikke undersøgt til bunds eller rettet - værd at teste/tjekke ved lejlighed.

## Anbefalet rækkefølge

1. ~~**US-03 + US-04** — Profile view/edit~~ ✅
2. ~~**US-06/07/08** — Admin: se + acceptere/afvise medlemsanmodninger~~ ✅
3. ~~**US-09 + US-10** — Se/rediger organisation~~ ✅
4. ~~**US-11 + US-12 + US-13** — Roller & privileges (Fase 1: granulære privilegier)~~ ✅
5. ~~**US-59** — Være medlem af flere organisationer (stor migration: erstatter `profiles.organisation_id`/`role_id` med en medlemskabsmodel + "aktiv organisation"-koncept)~~ ✅
6. ~~**US-60 + US-61** — Oprette flere organisationer / Forlade en organisation (bygger direkte på US-59's medlemskabsmodel, gøres derfor lige efter)~~ ✅
7. ~~**US-45 + US-46 + US-47 + US-65** — Rigtigt dashboard + Administration/Organisation-konsolidering~~ ✅
8. ~~**US-66 + US-67** — Fjerne medlem / Invitere bruger (ad-hoc tilføjet, nye privilegier `manage_members`/`manage_invitations`)~~ ✅
9. **US-62 + US-63** — Granulære skriverettigheder i Datalayer/Opgaver (Fase 2, samme mønster som US-11-13 - tilhører Studerende 1, ikke Studerende 2/3). Bevidst rykket til her, EFTER US-59/60/61: undgår at RLS-policies på Datalayer/Opgave-tabellerne skal rettes til igen når US-59 ændrer medlemskabsmodellen, og reducerer risikoen for at kollidere med Studerende 2/3's igangværende arbejde i de tabeller/komponenter. Fuld spec: se "Fase 2-spec" nedenfor.
10. ~~**US-02 polish** — vis "ingen organisation"-tilstand i UI~~ ✅ (banner med link til `/organisation`, som nu rummer både opret- og anmod-flow)
11. ~~**US-56 + US-57** — Nyheder (lavest prioritet, ingen afhængigheder — gøres sidst)~~ ✅ (gjort ud af rækkefølge, 2026-09-10, da US-62/63 var blokeret af Tasks-domænet). US-57 efterfølgende udgået og rullet tilbage 2026-09-11 — kun US-56 (manuelt oprettede nyheder) står tilbage.

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

## Fase 2-spec (US-62 + US-63) — klar til udførelse ved trin 8

Skrevet på forhånd, så en fremtidig session (evt. på en anden computer) kan gå direkte i gang uden at skulle genudlede noget. Samme mønster som Fase 1 (US-11-13), oven på det allerede eksisterende `has_privilege_or_admin()` (dbSchema.sql afsnit 14) — ingen ny SQL-infrastruktur nødvendig, kun nye privilegienavne og opdaterede policies.

**Privilegienavne:**
- `manage_datalayer` (US-62 — dækker `locations` + `data_layer_categories` + `data_layer_items` samlet, ligesom `manage_roles` dækker US-11+12+13 samlet)
- `manage_tasks` (US-63 — dækker `tasks` + `task_assignees` + `task_participants` + `task_materials` samlet)

**OBS opdaget 2026-09-10 (se "Næste op"):** "Tilmeld/Afmeld" (task_assignees) er i den faktiske Tasks-implementering en SELVBETJENINGS-handling (`TaskCard.tsx`, enhver kan til-/afmelde sig selv), ikke en "administrer andre"-handling. At gate task_assignees blankt bag `manage_tasks`, som nedenfor, ville forhindre almindelige medlemmer i selv at til-/afmelde sig. Afklar med bruger før SQL køres: enten (a) lad task_assignees forblive åben for selvbetjening (egen RLS-policy: `user_id = auth.uid()` uden privilegie-krav, `manage_tasks` kræves kun for at (av)tilmelde ANDRE), eller (b) gate den alligevel hvis det er en bevidst skærpelse. Ingen `deleteTask`-mutation/UI findes heller endnu (kun opret/rediger) - gating af "slet" er derfor ikke relevant før den bygges.

**SQL (dbSchema.sql afsnit 16.6 og 16.7):** De nuværende policies dér er `for all` (select+insert+update+delete i én policy) og tjekker kun `organisation_id = auth_profile_org()` — ingen skelnen mellem læse- og skriveadgang. Der findes desuden allerede separate, åbne SELECT-policies for hver tabel (fx "Se lokationer i egen organisation") — de skal IKKE ændres, læseadgang forbliver åben for alle organisationsmedlemmer. For hver af de 7 `for all`-policies (lokationer, kategorier, items, tasks, task_assignees, task_participants, task_materials): `drop policy` + `create policy` med samme navn/struktur, men tilføj `and public.has_privilege_or_admin('manage_datalayer')` (Datalayer-tabellerne) hhv. `and public.has_privilege_or_admin('manage_tasks')` (Opgave-tabellerne) til både `using` og `with check`. Ingen escalation-guard nødvendig her (modsat Fase 1) — der er ingen vej til at eskalere til admin via Datalayer/Opgave-data.

**Frontend:**
- `privilegeApi.ts`: tilføj `MANAGE_DATALAYER_PRIVILEGE = 'manage_datalayer'` og `MANAGE_TASKS_PRIVILEGE = 'manage_tasks'`-konstanter (samme mønster som de tre eksisterende fra Fase 1).
- Gate opret/rediger/slet-knapper i Datalayer- og Opgave-UI'en med `useHasPrivilege(MANAGE_DATALAYER_PRIVILEGE)` hhv. `useHasPrivilege(MANAGE_TASKS_PRIVILEGE)`.
- **VIGTIGT:** check `src/pages/`s aktuelle Datalayer-/Tasks-mapper og de tilsvarende API-filer først — de tilhører Studerende 2/3 og kan se helt anderledes ud end nu, da US-14 til US-44 slet ikke var startet, da denne spec blev skrevet (jf. status i `userStories.md`).
- 42501-fejlbesked-mapping i de relevante mutations, samme mønster som `roleApi.ts`/`privilegeApi.ts` fra Fase 1.

**Efter SQL er kørt af bruger og bekræftet:** opdatér `dbSchema.sql` (som med Fase 1) og status-tabellens US-62/US-63-rækker til "Done".

## Konventioner

- Kode (variabelnavne, funktionsnavne, kommentarer) skrives på engelsk.
- UI-tekst til brugeren (labels, knapper, fejlbeskeder) forbliver på dansk.
- Denne fil og øvrig `docs/`-dokumentation forbliver på dansk.
- Git commits laves af brugeren selv.
- DB-ændringer køres manuelt af brugeren og skal derfor have sql kode til at kunne bruges i Supabase SQL Editor. `dbSchema.sql` opdateres bagefter som dokumentation.
- `supabaseTables.sql` er et genereret dump af de faktiske tabeller. Det indeholder **ikke** indexes, tabel-niveau constraints, triggers, RLS-policies eller funktioner - fraværet af noget dér beviser derfor ikke, at det mangler i databasen.

## Sådan bruges filen

Efter hver færdig story: opdater status-tabellen og "Næste op"-linjen øverst.


