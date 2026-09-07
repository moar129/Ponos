# Ponos – Projektbeskrivelse og udviklingsspecifikation

## 1. Projektets formål

Ponos er en digital platform til datahåndtering, ressourceoverblik, medarbejderkoordinering og datadrevet indsigt.

Platformens grundidé er at samle information, ressourcer og arbejdsprocesser ét sted, så en organisation kan:

1. Se hvad den allerede har.
2. Se hvem der arbejder med hvad.
3. Forstå hvad organisationens data fortæller.

Ponos er oprindeligt udviklet med Roskilde Festival som konkret case, men arkitekturen skal fra starten være generisk nok til, at platformen senere kan anvendes af andre virksomheder og organisationer.

Den overordnede sammenhæng er:

Data → Mennesker → Opgaver → Handling → Indsigt

Ponos skal ikke blot være et CRUD-system til registrering af information. Data, brugere, opgaver og statistik skal være forbundet, så aktivitet i systemet automatisk skaber mere værdi.

---

# 2. Det problem Ponos løser

Organisationer håndterer ofte data og arbejdsopgaver på tværs af:

- Regneark
- Dokumenter
- E-mails
- Chat
- Separate systemer
- Manuelle processer

Det gør det svært at få et samlet overblik over:

- Hvilke ressourcer organisationen allerede har.
- Hvor ressourcerne befinder sig.
- Hvilken status de har.
- Hvilke opgaver der eksisterer.
- Hvem der er ansvarlig for en opgave.
- Hvilke ressourcer der bruges i forbindelse med en opgave.
- Hvad organisationens samlede data fortæller.

Ponos skal samle disse informationer i én platform.

## Den grundlæggende tankegang

I stedet for:

"Vi mangler noget → køb nyt."

skal Ponos understøtte:

"Vi mangler noget → undersøg hvad vi allerede har."

I stedet for:

"Hvem kan gøre det?"

skal Ponos gøre det muligt at se:

"Hvem er ansvarlig for opgaven?"

Og i stedet for:

"Hvad skete der?"

skal organisationen kunne se:

"Vi har data, der dokumenterer hvad der skete."

---

# 3. Centrale produktprincipper

Claude Code skal udvikle Ponos med følgende principper.

## 3.1 Data skal være genanvendelige

Information, der registreres ét sted, skal kunne anvendes andre steder i systemet.

Eksempel:

Datalayer
↓
Item
↓
Opgave
↓
Statistik
↓
Dashboard

Der bør så vidt muligt undgås unødvendig duplikering af data.

## 3.2 Statistik skal genereres automatisk

Brugeren skal ikke manuelt indtaste statistik.

Statistik skal beregnes ud fra den data, der allerede findes i systemet.

## 3.3 Platformen skal være generisk

Ponos må ikke hardcode logik, der kun giver mening for Roskilde Festival.

Roskilde Festival er en case og ikke selve produktets datamodel.

Nye features skal derfor som udgangspunkt designes generisk, så de også kan anvendes af andre organisationer.

## 3.4 Organisationer skal være isolerede

Data tilhørende én organisation må ikke være tilgængelig for en anden organisation.

Multi-tenancy skal derfor være en central del af arkitekturen.

## 3.5 Rettigheder skal håndteres centralt

Brugere skal have roller og permissions, og adgangen til funktioner og data skal styres gennem disse.

---

# 4. Platformens tre hovedområder

## 4.1 Datalayer

Datalayer er Ponos' centrale system til registrering og håndtering af organisationens data og ressourcer.

Datalayer skal være fleksibel og kunne håndtere forskellige typer information.

Eksempler:

- Materialer
- Udstyr
- Affald
- Events
- Ressourcer
- Lokationer
- Andre organisation-specifikke items

## Items

Et item repræsenterer en konkret registreret ressource eller datapost.

Et item kan eksempelvis indeholde:

- Navn
- Beskrivelse
- Antal
- Kategori
- Status
- Lokation
- Oprettelsesdato
- Senest opdateret
- Eventuelle metadata

## Item-status

Systemet skal understøtte statusser som eksempelvis:

- Available
- Reserved
- In Use
- Missing
- Damaged
- Maintenance

Statusserne bør implementeres på en måde, der gør det muligt at udvide eller tilpasse dem senere.

## Lokationer

Items skal kunne forbindes med lokationer.

Eksempel:

Item:
20 borde

Kategori:
Furniture

Status:
Available

Lokation:
Warehouse A

Dette gør det muligt at besvare spørgsmål som:

- Hvad har vi?
- Hvor meget har vi?
- Hvor befinder det sig?
- Hvilken status har det?

---

# 5. Opgavesystem

Opgavesystemet skal gøre det muligt at oprette, organisere og følge arbejdsopgaver.

Funktionen er inspireret af værktøjer som Trello, hvor opgaver bevæger sig gennem forskellige stadier.

## 5.1 Opgavestatus

En opgave kan eksempelvis have:

- Started
- In Progress
- Completed

Statussystemet skal være struktureret, så det senere kan udvides.

## 5.2 Opgaveinformation

En opgave kan indeholde:

- Titel
- Beskrivelse
- Status
- Ansvarlig medarbejder
- Andre deltagere
- Relevante items
- Antal
- Startdato
- Slutdato
- Oprettelsesdato
- Senest opdateret

## 5.3 Relation mellem opgaver og Datalayer

Opgaver skal kunne referere til items fra Datalayer.

Eksempel:

Opgave:
Opsætning af område A

Ansvarlig:
User A

Ressourcer:

- 20 × Borde
- 10 × Stole
- 4 × Affaldscontainere

Ressourcerne skal hentes fra Datalayer i stedet for at blive oprettet som separat data i opgaven.

Det skaber relationen:

Organisation
↓
Datalayer
↓
Items
↓
Opgaver
↓
Medarbejdere

---

# 6. Dashboard

Dashboardet skal give brugeren et hurtigt overblik over organisationens aktuelle situation.

Dashboardet skal primært være en visualisering af data, der allerede findes i Ponos.

Det bør eksempelvis kunne vise:

- Samlet antal items
- Items fordelt på kategori
- Items fordelt på status
- Items fordelt på lokation
- Antal aktive opgaver
- Antal afsluttede opgaver
- Opgaver fordelt på status
- Eventuelle relevante trends
- Sammenhænge mellem opgaver og ressourcer

Dashboardet skal være modulært, så nye widgets eller statistikker kan tilføjes senere.

---

# 7. Statistik

Statistiksystemet skal generere information automatisk ud fra organisationens eksisterende data.

## Datalayer-statistik

Eksempler:

- Totalt antal items
- Antal items pr. kategori
- Antal items pr. status
- Antal items pr. lokation
- Udvikling i antal items over tid

## Opgavestatistik

Eksempler:

- Totalt antal opgaver
- Aktive opgaver
- Afsluttede opgaver
- Opgaver pr. status
- Opgaver pr. medarbejder
- Opgaver over tid

## Relationel statistik

Systemet skal på sigt kunne analysere relationer mellem data.

Eksempel:

"Hvor mange ressourcer bruges på bestemte typer opgaver?"

eller:

"Hvilke kategorier af ressourcer anvendes mest?"

Statistiksystemet skal være generisk.

Der må ikke bygges et fast KPI-system, som kun giver mening for Roskilde Festival.

---

# 8. Organisationer

Ponos skal understøtte flere organisationer.

Den overordnede struktur er:

Organization
├── Users
├── Roles
├── Permissions
├── Locations
├── Categories
├── Items
├── Tasks
└── Statistics

Alle organisationens data skal være scoped til organisationen.

Data fra én organisation må aldrig kunne læses eller manipuleres af en bruger fra en anden organisation.

Organisation-isolation skal håndhæves server-side og ikke kun i frontend.

---

# 9. Brugere, roller og permissions

Den nuværende version har en administrativ brugerrolle.

Administratorer skal blandt andet kunne:

- Administrere brugere
- Administrere organisationen
- Administrere data
- Administrere relevante platformfunktioner

Arkitekturen skal dog bygges, så flere roller kan introduceres senere.

Eksempler:

- Administrator
- Manager
- Employee
- Viewer

Roller skal kunne forbindes med permissions.

Eksempel:

users.read
users.write

items.read
items.create
items.update
items.delete

tasks.read
tasks.create
tasks.update
tasks.delete

statistics.read

Permissions skal ikke kun implementeres som frontend-logik.

UI'et må gerne skjule funktioner, som brugeren ikke har adgang til, men den egentlige adgangskontrol skal håndhæves server-side/database-side.

---

# 10. Overordnet datamodel

Den overordnede relation mellem systemets centrale entiteter kan beskrives således:

Organization
│
├── Users
│     └── Roles
│           └── Permissions
│
├── Categories
│     └── Items
│           └── Location
│
└── Tasks
      ├── Users
      └── Items

Data fra disse entiteter danner grundlag for:

Statistics
↓
Dashboard
↓
Insights

Den konkrete databaseimplementering skal følge principperne for normaliserede relationelle data og undgå unødvendig duplication.

---

# 11. Platformens sider

Ponos indeholder følgende centrale sider.

## Forside

Offentlig side, der introducerer Ponos og forklarer platformens formål.

## Om os

Beskriver:

- Ponos
- Projektets idé
- Baggrunden for projektet
- Visionen

## Kontakt

Giver mulighed for at kontakte teamet eller organisationen bag Ponos.

## Login

Brugere kan logge ind og få adgang til platformens funktioner.

## Dashboard

Det primære overblik efter login.

Viser relevant information og statistik fra organisationen.

## Opgaver

Brugeren kan:

- Se opgaver
- Oprette opgaver
- Redigere opgaver
- Ændre status
- Tildele ansvarlig
- Tilknytte relevante ressourcer

## Statistik

Viser genereret statistik baseret på organisationens data.

## Datalayer

Brugeren kan:

- Se items
- Oprette items
- Redigere items
- Ændre status
- Tilknytte kategorier
- Tilknytte lokationer
- Administrere relevante data

## Bruger

Indeholder brugerrelaterede funktioner såsom:

- Profilinformation
- Rolle
- Organisation
- Adgang/rettigheder

---

# 12. Roskilde Festival som case

Roskilde Festival er den oprindelige case for Ponos.

Festivalen er relevant, fordi organisationen håndterer:

- Mange forskellige ressourcer
- Materialer
- Events
- Lokationer
- Medarbejdere
- Frivillige
- Arbejdsopgaver
- Store mængder information

Ponos skal dog ikke bygges som et specifikt Roskilde Festival-system.

Roskilde Festival skal bruges som en konkret use case, der demonstrerer platformens funktionalitet.

Eksempel:

Roskilde Festival
↓
Datalayer
↓
Materialer og ressourcer
↓
Opgaver
↓
Medarbejdere/frivillige
↓
Statistik

Den samme struktur skal senere kunne anvendes af andre organisationer med andre datatyper.

---

# 13. Cirkularitet og ressourcespild

Et vigtigt formål med Ponos er at understøtte mere effektiv og cirkulær ressourceanvendelse.

Platformen skal gøre det lettere at identificere eksisterende ressourcer, før organisationen køber nyt.

Den traditionelle proces kan beskrives som:

Behov
↓
Køb
↓
Brug
↓
Kassér

Ponos skal understøtte:

Behov
↓
Undersøg eksisterende ressourcer
↓
Genbrug
↓
Registrér anvendelse
↓
Brug igen

Ponos kan dermed hjælpe organisationer med at:

- Reducere unødvendige indkøb
- Genbruge eksisterende materialer
- Få bedre overblik over ressourcer
- Dokumentere ressourceanvendelse
- Identificere ressourcespild

---

# 14. Teknologistak

Ponos anvender følgende teknologier.

## Frontend

- React
- TypeScript
- React Redux
- Redux Toolkit
- RTK Query
- React router

## Backend

- Supabase
- PostgreSQL

Supabase anvendes blandt andet til:

- Database
- Authentication
- Backend-funktionalitet
- Dataadgang

## Deployment

- Vercel

## Version control

- GitHub

---

# 15. Tekniske udviklingsprincipper

Claude Code skal følge følgende principper ved udvikling af Ponos.

## TypeScript

Projektet skal være stærkt typed.

Undgå så vidt muligt:

any

Brug i stedet konkrete interfaces, types og generiske typer.

## React

Komponenter skal være:

- Genanvendelige
- Små og fokuserede
- Lettest muligt at teste
- Separat fra forretningslogik

Undgå unødvendig kompleksitet i komponenterne.

## State management

Redux Toolkit skal bruges til global client-state, hvor det er relevant.

RTK Query skal anvendes til server-state og API/database-relateret datahentning frem for at håndtere serverdata manuelt gennem lokale React states.

## Database

PostgreSQL skal være den primære source of truth.

Undgå at duplicere data mellem frontend og database uden en klar teknisk grund.

## Security

Sikkerhed skal håndhæves server-side.

UI-baserede permission checks må ikke betragtes som tilstrækkelig sikkerhed.

Supabase Row Level Security (RLS) skal anvendes til at sikre organisationernes dataadskillelse, hvor relevant.

---

# 16. Arkitektur

Den ønskede overordnede arkitektur er:

React App
│
│ TypeScript
│
▼
Redux Toolkit / RTK Query
│
▼
Supabase
│
├── Authentication
├── API
└── Backend
│
▼
PostgreSQL
│
├── Organizations
├── Users
├── Roles
├── Permissions
├── Categories
├── Locations
├── Items
└── Tasks

Arkitekturen skal holde UI, state management, server/data access og database-logik så adskilt som praktisk muligt.

---

# 17. UX-principper

Ponos skal være et værktøj, der hurtigt giver brugeren et overblik.

UI'et skal derfor prioritere:

- Simplicitet
- Tydelig navigation
- Visuelt hierarki
- Hurtig adgang til centrale funktioner
- Responsivt design
- Tydelige statusser
- Genkendelige UI-mønstre
- Lav kognitiv belastning

Brugeren skal hurtigt kunne forstå:

Hvad har vi?

Hvad sker der?

Hvem gør hvad?

Hvad fortæller dataene?

---

# 18. Ikke-funktionelle krav

## Skalerbar

Arkitekturen skal kunne håndtere flere organisationer og større datamængder.

## Vedligeholdelsesvenlig

Kode skal være struktureret, modulær og forståelig.

## Typesikker

TypeScript skal anvendes konsekvent.

## Sikker

Dataadgang skal valideres server-side, og organisationernes data skal være isoleret.

## Responsiv

Platformen skal fungere på desktop, tablet og mobile enheder.

## Udvidelig

Det skal senere være muligt at tilføje:

- Flere roller
- Flere permissions
- Flere datatyper
- Flere statistikker
- Flere dashboard-widgets
- Flere organisationstyper
- Flere integrationer

uden at skulle omskrive hele systemet.

---

# 19. Platformens vigtigste brugerflow

Det vigtigste brugerflow kan beskrives således:

Bruger logger ind
↓
Bruger får adgang til sin organisation
↓
Bruger åbner Dashboard
↓
Bruger ser organisationens aktuelle data
↓
Bruger åbner Datalayer
↓
Bruger finder eller opretter ressourcer
↓
Bruger opretter eller åbner en opgave
↓
Bruger tildeler ansvarlig
↓
Bruger tilknytter relevante ressourcer
↓
Opgaven udføres
↓
Data opdateres
↓
Ponos genererer/opdaterer statistik
↓
Dashboard og Statistik viser den nye indsigt

Dette flow er centralt for produktets værdi.

---

# 20. Produktets kerne

Ponos skal grundlæggende besvare tre spørgsmål.

## Hvad har vi?

Datalayer.

Organisationen får overblik over sine eksisterende ressourcer og data.

## Hvem gør hvad?

Opgaver.

Organisationen kan koordinere medarbejdere og arbejdsopgaver.

## Hvad fortæller data os?

Dashboard + Statistik.

Organisationen kan bruge den eksisterende data til at skabe indsigt.

Den samlede produktidé er:

Datalayer
"Hvad har vi?"

↓

Opgaver
"Hvem gør hvad?"

↓

Statistik & Dashboard
"Hvad viser data?"

---

# 21. Vision

Visionen er at skabe en generisk digital platform, der hjælper organisationer med at få mere værdi ud af de data, ressourcer og mennesker, de allerede har.

Ponos skal skabe forbindelsen mellem:

Data → Mennesker → Opgaver → Handling → Indsigt

Den langsigtede ambition er at udvikle Ponos fra en løsning med udgangspunkt i Roskilde Festival til en platform, som forskellige virksomheder og organisationer kan anvende og konfigurere efter deres egne behov.

---

# 22. Kort produktbeskrivelse

Ponos er en digital platform til datahåndtering, ressourceoverblik, medarbejderkoordinering og datadrevet indsigt.

Platformen samler organisationens data, ressourcer og arbejdsopgaver ét sted og bruger den eksisterende data til automatisk at skabe statistik og indsigt.

Den centrale idé er:

"Se hvad du har. Organisér hvem der gør hvad. Brug dine data til at forstå, hvad der sker."

---

# 23. Instruktioner til Claude Code

Når du arbejder på Ponos, skal du følge disse regler.

## Før du ændrer kode

1. Undersøg den eksisterende kodebase.
2. Forstå projektets struktur.
3. Identificér eksisterende komponenter, hooks, services, API-kald og patterns.
4. Genbrug eksisterende løsninger, hvor det giver mening.
5. Undgå at introducere en ny arkitektur eller pattern uden en konkret grund.

## Ved implementation

1. Brug TypeScript konsekvent.
2. Undgå `any`, medmindre det er teknisk nødvendigt.
3. Brug eksisterende komponenter frem for at skabe duplicates.
4. Brug RTK Query til server-state.
5. Brug Redux Toolkit til relevant global client-state.
6. Hold UI, business logic og data access adskilt.
7. Hold komponenter små og fokuserede.
8. Undgå unødvendig prop drilling.
9. Undgå unødvendig abstraction.
10. Prioritér enkel og vedligeholdelsesvenlig kode.

## Database

1. PostgreSQL er source of truth.
2. Undgå unødvendig data duplication.
3. Brug relationer frem for at kopiere data.
4. Organisation-isolation skal altid håndhæves.
5. Brug Supabase RLS, hvor det er relevant.
6. Security må aldrig kun afhænge af frontend-checks.

## Produktarkitektur

1. Roskilde Festival er en case og må ikke definere hele datamodellen.
2. Nye funktioner skal som udgangspunkt være generiske.
3. Organisationer skal kunne have forskellige typer data.
4. Roller og permissions skal kunne udvides.
5. Statistik skal genereres fra eksisterende data.
6. Dashboardet skal være baseret på systemets faktiske data.
7. Nye features skal integreres med eksisterende dataflows, hvor det giver mening.

## UX

1. Hold brugeroplevelsen simpel.
2. Prioritér tydelig navigation.
3. Giv brugeren feedback ved loading, success og errors.
4. Implementér relevante empty states.
5. UI'et skal være responsivt.
6. Brug konsistente komponenter og patterns.
7. Undgå unødvendige klik og komplekse flows.

## Kvalitet

Før en ændring betragtes som færdig, skal du kontrollere:

- TypeScript errors
- Lint errors
- Build errors
- Relevante runtime errors
- Loading states
- Error states
- Empty states
- Permissions
- Organisation-isolation
- Data consistency
- Responsive behavior
- Om eksisterende funktionalitet stadig fungerer

---

# 24. Definition of Done

En funktion er som udgangspunkt færdig, når:

- Den fungerer i UI'et.
- Data gemmes korrekt.
- Data hentes korrekt.
- Loading states er håndteret.
- Error states er håndteret.
- Empty states er håndteret.
- Permissions er håndteret korrekt.
- Organisationens data er korrekt isoleret.
- TypeScript-typer er korrekte.
- Eksisterende funktionalitet fortsat fungerer.
- Der ikke er unødvendig duplication.
- Koden følger eksisterende projektstruktur og patterns.
- Relevante edge cases er håndteret.
- Løsningen kan udvides uden større omskrivning.
- Projektet kan buildes uden errors.

---

# 25. Samlet systemmodel

Den samlede Ponos-model er:

Organization
│
├── Users
│   └── Roles
│       └── Permissions
│
├── Categories
│   └── Items
│       └── Locations
│
└── Tasks
    ├── Users
    └── Items
            │
            ▼
       Collected Data
            │
            ▼
        Statistics
            │
            ▼
         Dashboard
            │
            ▼
          Insight

Ponos' kernefunktion er dermed ikke blot at gemme data.

Platformen skal skabe en sammenhæng mellem:

Ressourcer
+
Mennesker
+
Arbejdsopgaver
+
Data
↓
Indsigt
↓
Bedre beslutninger

---

# 26. Endelig produktdefinition

Ponos er en digital platform, der samler data, ressourcer, mennesker og arbejdsopgaver i én sammenhængende løsning.

Platformen består primært af:

1. Datalayer – hvad har organisationen?
2. Opgaver – hvem gør hvad?
3. Dashboard og Statistik – hvad fortæller dataene?

Systemets værdi opstår, når disse tre områder arbejder sammen.

Ponos skal derfor udvikles som en sammenhængende platform og ikke som tre isolerede funktioner.

Den vigtigste produktfilosofi er:

"Hvad har vi?"
↓
"Hvem gør hvad?"
↓
"Hvad fortæller data os?"
↓
"Hvordan kan vi bruge den indsigt til at træffe bedre beslutninger?"

Den langsigtede vision er at skabe en generisk, skalerbar og fleksibel platform, som kan bruges af forskellige organisationer og tilpasses deres egne behov.