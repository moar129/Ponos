# Ponos – User Stories & Acceptance Criteria

Dette dokument beskriver Ponos' funktionelle krav i form af user stories og acceptance criteria.

## Instruktioner til implementering

Når en user story implementeres:

1. Læs hele user story'en og alle acceptance criteria.
2. Implementér kun den funktionalitet, der er nødvendig for story'en og dens acceptance criteria.
3. Eksisterende funktionalitet må ikke brydes.
4. Organisationens data skal altid være isoleret fra andre organisationer.
5. Adgang til funktionalitet skal håndhæves både i frontend og backend/database policies, hvor relevant.
6. Brug eksisterende arkitektur, komponenter, database-tabeller og patterns, hvis de allerede findes.
7. Brug Supabase Auth til autentificering.
8. Roller og privileges skal bruges til authorization.
9. Valider input både i frontend og backend, hvor relevant.
10. Ved ændringer i databasen skal relevante migrations oprettes.
11. Følg eksisterende coding conventions i projektet.
12. Test acceptance criteria, før story'en betragtes som færdig.
13. Undgå at introducere funktionalitet, som ikke er beskrevet i story'en, medmindre den er nødvendig for implementationen.

---

# 1. Bruger og login

## US-01 – Opret konto

**Priority:** Critical

### User Story

Som ny bruger vil jeg kunne oprette en konto, så jeg kan få adgang til Ponos og anmode om medlemskab af en organisation.

### Acceptance Criteria

- Brugeren kan angive en email.
- Brugeren kan angive en adgangskode.
- Brugeren kan angive fornavn.
- Brugeren kan angive efternavn.
- Systemet opretter brugerens autentificering via Supabase Auth.
- Systemet afviser oprettelsen, hvis nødvendige oplysninger mangler.
- Email skal være unik i Supabase Auth.

---

## US-02 – Login

**Priority:** Critical

### User Story

Som bruger vil jeg kunne logge ind med mine brugeroplysninger, så jeg kan få adgang til Ponos.

### Acceptance Criteria

- Given at brugeren har en gyldig email og adgangskode, when brugeren logger ind, then bliver brugeren autentificeret.
- Given at brugeren indtaster forkerte loginoplysninger, when brugeren forsøger at logge ind, then vises en fejlmeddelelse.
- Given at brugeren ikke er logget ind, when brugeren forsøger at tilgå en beskyttet side, then bliver brugeren sendt til login.
- En bruger uden medlemskab af en organisation får ikke adgang til organisationens data.

---

## US-03 – Se profil

**Priority:** Medium

### User Story

Som bruger vil jeg kunne se mine egne brugeroplysninger, så jeg kan kontrollere, at mine oplysninger er korrekte.

### Acceptance Criteria

- Brugeren kan se sit fornavn.
- Brugeren kan se sit efternavn.
- Brugeren kan se sin email.
- Brugeren kan se sin rolle, hvis brugeren er medlem af en organisation.
- Brugeren kan kun se sin egen profil.

---

## US-04 – Rediger profil

**Priority:** Medium

### User Story

Som bruger vil jeg kunne redigere mine egne brugeroplysninger, så mine oplysninger altid er opdaterede.

### Acceptance Criteria

- Brugeren kan ændre sine redigerbare oplysninger.
- Brugeren kan gemme ændringerne.
- De nye oplysninger vises efter en succesfuld opdatering.
- Brugeren får en fejlmeddelelse, hvis oplysningerne ikke kan gemmes.
- Brugeren kan ikke ændre sine egne privilegier.

---

# 2. Organisation og medlemskab

## US-05 – Anmod om medlemskab

**Priority:** Critical

### User Story

Som bruger vil jeg kunne anmode om medlemskab af en organisation, så jeg kan få adgang til organisationens Ponos-platform.

### Acceptance Criteria

- Brugeren kan vælge en organisation.
- Brugeren kan sende en medlemsanmodning.
- Systemet registrerer den valgte organisation.
- Medlemsanmodningen får status `Pending`.
- Brugeren får besked om, at anmodningen er sendt.
- Brugeren får ikke adgang til organisationens data, før anmodningen er accepteret.
- Brugeren kan ikke oprette flere aktive medlemsanmodninger til samme organisation.

---

## US-06 – Se medlemsanmodninger

**Priority:** High

### User Story

Som administrator vil jeg kunne se medlemsanmodninger til min organisation, så jeg kan se, hvem der ønsker adgang.

### Acceptance Criteria

- Administratoren kan se ventende medlemsanmodninger.
- Administratoren kan se brugerens navn.
- Administratoren kan se brugerens email.
- Administratoren kan se tidspunktet for anmodningen.
- Administratoren kan kun se medlemsanmodninger til sin egen organisation.

---

## US-07 – Acceptere medlemsanmodning

**Priority:** Critical

### User Story

Som administrator vil jeg kunne acceptere en medlemsanmodning, så brugeren kan blive medlem af organisationen.

### Acceptance Criteria

- Administratoren kan acceptere en ventende medlemsanmodning.
- Anmodningens status ændres til `Accepted`.
- Anmodningen registrerer, hvornår den blev behandlet.
- Anmodningen registrerer, hvilken bruger der behandlede den.
- Brugeren bliver tilknyttet organisationen.
- Brugeren får ikke automatisk administratorrettigheder.

---

## US-08 – Afvise medlemsanmodning

**Priority:** High

### User Story

Som administrator vil jeg kunne afvise en medlemsanmodning, så brugere uden godkendelse ikke får adgang til organisationen.

### Acceptance Criteria

- Administratoren kan afvise en ventende medlemsanmodning.
- Anmodningens status ændres til `Rejected`.
- Anmodningen registrerer, hvornår den blev behandlet.
- Anmodningen registrerer, hvilken bruger der behandlede den.
- Brugeren bliver ikke medlem af organisationen.
- Brugeren får ikke adgang til organisationens data.

---

## US-09 – Se organisation

**Priority:** Medium

### User Story

Som bruger vil jeg kunne se min organisation, så jeg kan se, hvilken organisation jeg er tilknyttet.

### Acceptance Criteria

- Brugeren kan se organisationens navn.
- Brugeren kan kun se organisationer, som brugeren er medlem af.
- Organisationen er knyttet til brugerens konto.
- Brugeren kan ikke se andre organisationers data.

---

## US-10 – Rediger organisation

**Priority:** Medium

### User Story

Som administrator vil jeg kunne redigere organisationens oplysninger, så informationen altid er opdateret.

### Acceptance Criteria

- Administratoren kan se organisationens nuværende oplysninger.
- Administratoren kan ændre organisationens oplysninger.
- Administratoren kan gemme ændringerne.
- De opdaterede oplysninger vises efter gemning.
- Administratoren kan kun redigere sin egen organisation.

---

# 3. Roller og privileges

## US-11 – Tildel rolle

**Priority:** High

### User Story

Som administrator vil jeg kunne tildele en rolle til en accepteret bruger, så brugeren får de relevante adgangsrettigheder.

### Acceptance Criteria

- Administratoren kan se organisationens tilgængelige roller.
- Administratoren kan vælge en rolle til brugeren.
- Rollen gemmes på brugerens medlemskab af organisationen.
- Brugerens adgang følger den valgte rolle.
- Brugeren kan ikke selv tildele sig en rolle.

---

## US-12 – Opret rolle

**Priority:** Medium

### User Story

Som administrator vil jeg kunne oprette en rolle, så organisationen kan tilpasse systemet til forskellige typer brugere.

### Acceptance Criteria

- Administratoren kan angive et navn på rollen.
- Administratoren kan oprette rollen.
- Den nye rolle bliver tilgængelig for organisationen.
- Rollen kan efterfølgende tildeles en bruger.
- Rollen tilhører kun administratorens organisation.

---

## US-13 – Opret privilege

**Priority:** Medium

### User Story

Som administrator vil jeg kunne tilknytte privileges til en rolle, så jeg kan styre, hvilke funktioner rollen har adgang til.

### Acceptance Criteria

- Administratoren kan se tilgængelige privileges.
- Administratoren kan vælge en privilege.
- Privilegien kan tilknyttes en rolle.
- Brugere med rollen får den tilsvarende adgang.
- Brugere uden den relevante privilege får ikke adgang til funktionen.

---

# 4. Datalayer – Items

## US-14 – Se items

**Priority:** Critical

### User Story

Som bruger vil jeg kunne se organisationens registrerede items, så jeg kan få overblik over de data og ressourcer, organisationen har.

### Acceptance Criteria

- Brugeren kan se en liste over organisationens items.
- Hvert item viser som minimum navn og relevante basisoplysninger.
- Brugeren kan kun se items fra sin egen organisation.

---

## US-15 – Opret item

**Priority:** Critical

### User Story

Som bruger vil jeg kunne oprette et item, så jeg kan registrere ny data i Datalayer.

### Acceptance Criteria

- Brugeren kan angive et navn.
- Brugeren kan angive en beskrivelse.
- Brugeren kan angive en mængde.
- Brugeren kan vælge en kategori.
- Brugeren kan gemme itemet.
- Det nye item vises i Datalayer efter oprettelse.
- Itemet tilhører brugerens organisation.

---

## US-16 – Rediger item

**Priority:** High

### User Story

Som bruger med de nødvendige rettigheder vil jeg kunne redigere et item, så oplysningerne om itemet kan holdes opdaterede.

### Acceptance Criteria

- Brugeren kan åbne et eksisterende item.
- Brugeren kan ændre itemets oplysninger.
- Brugeren kan gemme ændringerne.
- De nye oplysninger vises efter gemning.
- Brugeren kan kun redigere items fra sin egen organisation.

---

## US-17 – Slet item

**Priority:** Medium

### User Story

Som bruger med de nødvendige rettigheder vil jeg kunne slette et item, så irrelevant data kan fjernes.

### Acceptance Criteria

- Brugeren kan vælge et item, som brugeren har rettighed til at slette.
- Systemet beder om bekræftelse før sletning.
- Itemet fjernes efter bekræftelse.
- Det slettede item vises ikke længere i Datalayer.
- Brugeren kan kun slette items fra sin egen organisation.

---

## US-18 – Se itemdetaljer

**Priority:** High

### User Story

Som bruger vil jeg kunne se detaljerne for et item, så jeg kan se itemets relevante information.

### Acceptance Criteria

- Brugeren kan åbne et item.
- Brugeren kan se itemets navn.
- Brugeren kan se beskrivelsen.
- Brugeren kan se mængden.
- Brugeren kan se status.
- Brugeren kan se lokation, hvis en lokation er angivet.
- Brugeren kan se itemets kategori.

---

## US-19 – Angiv mængde

**Priority:** High

### User Story

Som bruger vil jeg kunne angive en mængde på et item, så jeg kan registrere, hvor mange enheder der findes.

### Acceptance Criteria

- Brugeren kan angive en numerisk mængde.
- Mængden gemmes sammen med itemet.
- Systemet accepterer ikke en ugyldig mængde.
- Den gemte mængde vises på itemet.
- Mængden kan ikke være negativ.

---

## US-20 – Angiv status

**Priority:** High

### User Story

Som bruger vil jeg kunne angive status på et item, så jeg kan se itemets aktuelle tilstand.

### Acceptance Criteria

- Brugeren kan vælge en status fra de tilgængelige item-statusser.
- Status gemmes på itemet.
- Den aktuelle status vises på itemets detaljer.
- Brugeren kan ændre status senere.

---

## US-21 – Angiv lokation

**Priority:** High

### User Story

Som bruger vil jeg kunne angive en lokation på et item, så jeg kan se, hvor itemet befinder sig.

### Acceptance Criteria

- Brugeren kan vælge en eksisterende lokation.
- Lokationen gemmes på itemet.
- Lokationen vises på itemets detaljer.
- Brugeren kan ændre lokationen senere.

---

## US-22 – Søg efter item

**Priority:** High

### User Story

Som bruger vil jeg kunne søge efter et item, så jeg hurtigt kan finde bestemt data.

### Acceptance Criteria

- Brugeren kan indtaste et søgeord.
- Systemet viser items, der matcher søgningen.
- Søgningen tager udgangspunkt i itemets navn.
- Søgningen viser kun items fra brugerens organisation.
- Hvis ingen items matcher, vises en relevant besked.

---

## US-23 – Filtrer items efter kategori

**Priority:** Medium

### User Story

Som bruger vil jeg kunne filtrere items efter kategori, så jeg lettere kan finde relevante items.

### Acceptance Criteria

- Brugeren kan vælge en kategori som filter.
- Systemet viser kun items fra den valgte kategori.
- Brugeren kan fjerne filteret.
- Når filteret fjernes, vises alle relevante items igen.

---

## US-24 – Filtrer items efter status

**Priority:** Medium

### User Story

Som bruger vil jeg kunne filtrere items efter status, så jeg eksempelvis kan finde alle tilgængelige items.

### Acceptance Criteria

- Brugeren kan vælge en item-status.
- Systemet viser kun items med den valgte status.
- Brugeren kan fjerne statusfilteret.
- Alle relevante items vises igen efter fjernelse af filteret.

---

# 5. Datalayer – Kategorier

## US-25 – Opret kategori

**Priority:** Critical

### User Story

Som administrator vil jeg kunne oprette en kategori, så items kan organiseres efter type.

### Acceptance Criteria

- Administratoren kan angive et kategorinavn.
- Administratoren kan gemme kategorien.
- Den nye kategori vises i Datalayer.
- Kategorien kan bruges ved oprettelse af et item.
- Kategorien tilhører administratorens organisation.

---

## US-26 – Rediger kategori

**Priority:** Medium

### User Story

Som administrator vil jeg kunne redigere en kategori, så kategoriernes oplysninger kan holdes opdaterede.

### Acceptance Criteria

- Administratoren kan vælge en eksisterende kategori.
- Administratoren kan ændre kategoriens navn.
- Ændringen kan gemmes.
- Den nye kategoriinformation vises efter gemning.

---

## US-27 – Opret underkategori

**Priority:** Medium

### User Story

Som administrator vil jeg kunne oprette en underkategori, så items kan organiseres mere detaljeret.

### Acceptance Criteria

- Administratoren kan vælge en overordnet kategori.
- Administratoren kan angive et navn på underkategorien.
- Underkategorien gemmes under den valgte kategori.
- Underkategorien kan vælges ved oprettelse af relevante items.

---

## US-28 – Se kategori

**Priority:** Medium

### User Story

Som bruger vil jeg kunne se en kategori og dens items, så jeg kan få overblik over en bestemt type data.

### Acceptance Criteria

- Brugeren kan vælge en kategori.
- Brugeren kan se kategoriens navn.
- Brugeren kan se items tilknyttet kategorien.
- Items fra andre kategorier vises ikke i kategorivisningen.

---

# 6. Lokationer

## US-29 – Opret lokation

**Priority:** High

### User Story

Som administrator vil jeg kunne oprette en lokation, så items kan placeres fysisk i organisationen.

### Acceptance Criteria

- Administratoren kan angive navn.
- Administratoren kan angive beskrivelse.
- Administratoren kan angive adresse.
- Lokationen kan gemmes.
- Den nye lokation kan vælges på et item.
- Lokationen tilhører administratorens organisation.

---

## US-30 – Rediger lokation

**Priority:** Medium

### User Story

Som administrator vil jeg kunne redigere en lokation, så oplysningerne altid er aktuelle.

### Acceptance Criteria

- Administratoren kan åbne en eksisterende lokation.
- Administratoren kan ændre lokationens oplysninger.
- Ændringerne kan gemmes.
- De opdaterede oplysninger vises efter gemning.

---

## US-31 – Se lokation

**Priority:** Medium

### User Story

Som bruger vil jeg kunne se en lokation, så jeg kan se, hvor den befinder sig.

### Acceptance Criteria

- Brugeren kan se lokationens navn.
- Brugeren kan se lokationens beskrivelse.
- Brugeren kan se lokationens adresse.
- Brugeren kan kun se lokationer fra sin egen organisation.

---

## US-32 – Se items på lokation

**Priority:** High

### User Story

Som bruger vil jeg kunne se items på en bestemt lokation, så jeg kan se, hvilke ressourcer der befinder sig dér.

### Acceptance Criteria

- Brugeren kan vælge en lokation.
- Systemet viser items tilknyttet lokationen.
- Items fra andre lokationer vises ikke.
- Items uden lokation vises ikke i lokationens liste.

---

# 7. Opgaver

## US-33 – Se opgaver

**Priority:** Critical

### User Story

Som bruger vil jeg kunne se relevante opgaver, så jeg kan få overblik over arbejdet, der skal udføres.

### Acceptance Criteria

- Brugeren kan se en liste over relevante opgaver.
- Hver opgave viser mindst titel og status.
- Brugeren kan åbne en opgave for at se flere detaljer.
- Brugeren kan kun se opgaver fra sin egen organisation.

---

## US-34 – Opret opgave

**Priority:** Critical

### User Story

Som bruger vil jeg kunne oprette en opgave, så arbejde kan registreres i Ponos.

### Acceptance Criteria

- Brugeren kan angive en titel.
- Brugeren kan angive en beskrivelse.
- Brugeren kan gemme opgaven.
- Den nye opgave vises i opgavelisten.
- Opgaven får en gyldig status.
- Opgaven tilhører brugerens organisation.

---

## US-35 – Rediger opgave

**Priority:** High

### User Story

Som bruger med de nødvendige rettigheder vil jeg kunne redigere en opgave, så oplysningerne om opgaven kan holdes opdaterede.

### Acceptance Criteria

- Brugeren kan åbne en eksisterende opgave.
- Brugeren kan ændre opgavens oplysninger.
- Brugeren kan gemme ændringerne.
- De nye oplysninger vises efter gemning.
- Brugeren kan kun redigere opgaver fra sin egen organisation.

---

## US-36 – Se opgavedetaljer

**Priority:** High

### User Story

Som bruger vil jeg kunne se detaljerne for en opgave, så jeg ved, hvad opgaven går ud på.

### Acceptance Criteria

- Brugeren kan åbne en opgave.
- Brugeren kan se titel.
- Brugeren kan se beskrivelse.
- Brugeren kan se status.
- Brugeren kan se ansvarlige brugere.
- Brugeren kan se eventuelle deltagere.
- Brugeren kan se eventuelle tilknyttede items.
- Brugeren kan se start- og slutdato, hvis de er angivet.

---

## US-37 – Tage ansvar for opgave

**Priority:** Critical

### User Story

Som bruger vil jeg kunne tage ansvar for en opgave, så andre kan se, hvem der arbejder på den.

### Acceptance Criteria

- Brugeren kan vælge en tilgængelig opgave.
- Brugeren kan tage ansvar for opgaven.
- Brugeren fremgår derefter som ansvarlig.
- Opgaven vises blandt brugerens egne opgaver.

---

## US-38 – Tildele opgave

**Priority:** High

### User Story

Som bruger med de nødvendige rettigheder vil jeg kunne tildele en opgave til en medarbejder, så ansvaret for opgaven er tydeligt.

### Acceptance Criteria

- Brugeren kan vælge en medarbejder fra organisationen.
- Brugeren kan tildele medarbejderen til opgaven.
- Den valgte medarbejder fremgår af opgaven.
- Den tildelte medarbejder kan se opgaven blandt sine opgaver.
- Brugeren kan kun tildele opgaver til brugere fra sin egen organisation.

---

## US-39 – Ændre opgavestatus

**Priority:** Critical

### User Story

Som bruger vil jeg kunne ændre status på en opgave, så andre kan se, hvor langt opgaven er.

### Acceptance Criteria

- Brugeren kan ændre opgavens status.
- Status kan sættes til en af systemets gyldige task-statusser.
- Den nye status gemmes.
- Den nye status vises på opgaven.

---

## US-40 – Angiv startdato

**Priority:** Medium

### User Story

Som bruger vil jeg kunne angive en startdato for en opgave, så opgaven kan planlægges.

### Acceptance Criteria

- Brugeren kan angive en startdato.
- Startdatoen gemmes på opgaven.
- Startdatoen vises på opgavens detaljer.

---

## US-41 – Angiv slutdato

**Priority:** Medium

### User Story

Som bruger vil jeg kunne angive en slutdato for en opgave, så det er tydeligt, hvornår opgaven skal være færdig.

### Acceptance Criteria

- Brugeren kan angive en slutdato.
- Slutdatoen gemmes på opgaven.
- Slutdatoen vises på opgavens detaljer.
- Slutdatoen kan ikke være tidligere end startdatoen.

---

## US-42 – Tilknyt item

**Priority:** Critical

### User Story

Som bruger vil jeg kunne tilknytte et Datalayer-item til en opgave, så opgaven kan forbindes med de ressourcer, den kræver.

### Acceptance Criteria

- Brugeren kan vælge et eksisterende Datalayer-item.
- Itemet kan tilknyttes opgaven.
- Det tilknyttede item vises på opgaven.
- Itemet forbliver registreret i Datalayer.
- Brugeren kan kun tilknytte items fra sin egen organisation.

---

## US-43 – Angiv item-mængde på opgave

**Priority:** Medium

### User Story

Som bruger vil jeg kunne angive, hvor mange enheder af et item en opgave kræver, så ressourceforbruget kan registreres.

### Acceptance Criteria

- Brugeren kan angive en numerisk mængde.
- Mængden gemmes på opgaven sammen med det tilknyttede item.
- Mængden vises sammen med det tilknyttede item.
- Systemet accepterer ikke en ugyldig eller negativ mængde.

---

## US-44 – Se egne opgaver

**Priority:** High

### User Story

Som bruger vil jeg kunne se de opgaver, jeg er ansvarlig for eller deltager i, så jeg kan få overblik over mit eget arbejde.

### Acceptance Criteria

- Brugeren kan åbne en visning af egne opgaver.
- Visningen indeholder kun opgaver, som brugeren er ansvarlig for eller deltager i.
- Brugeren kan se status på sine opgaver.
- Brugeren kan åbne den enkelte opgave.

---

# 8. Dashboard

## US-45 – Se dashboard

**Priority:** Critical

### User Story

Som bruger vil jeg kunne se et dashboard, så jeg hurtigt kan få et overblik over organisationens aktivitet.

### Acceptance Criteria

- Brugeren kan åbne dashboardet.
- Dashboardet viser data fra brugerens organisation.
- Dashboardet indeholder mindst én oversigt over Datalayer-data.
- Dashboardet indeholder mindst én oversigt over opgaver.
- Brugeren kan ikke se data fra andre organisationer.

---

## US-46 – Se antal items

**Priority:** High

### User Story

Som bruger vil jeg kunne se det samlede antal items, så jeg kan få et hurtigt overblik over mængden af registreret data.

### Acceptance Criteria

- Dashboardet viser det samlede antal items.
- Antallet beregnes ud fra organisationens Datalayer-data.
- Antallet opdateres, når Datalayer-data ændres.

---

## US-47 – Se antal opgaver

**Priority:** High

### User Story

Som bruger vil jeg kunne se det samlede antal opgaver, så jeg kan få et overblik over organisationens arbejdsopgaver.

### Acceptance Criteria

- Dashboardet viser det samlede antal opgaver.
- Antallet beregnes ud fra organisationens aktuelle opgaver.
- Antallet opdateres, når opgaver oprettes eller fjernes.

---

# 9. Statistik

## US-48 – Generer statistik

**Priority:** Critical

### User Story

Som system vil jeg kunne generere statistik ud fra organisationens eksisterende data, så brugeren ikke selv skal registrere statistiske værdier.

### Acceptance Criteria

- Statistik genereres ud fra eksisterende Datalayer-data og opgavedata.
- Statistikken kan indeholde forskellige typer statistiske værdier.
- Brugeren behøver ikke manuelt at indtaste selve statistikværdierne.
- Statistikken er knyttet til den relevante organisation.

---

## US-49 – Statistik over kategorier

**Priority:** High

### User Story

Som bruger vil jeg kunne se antallet af items fordelt på kategorier, så jeg kan se fordelingen af organisationens data.

### Acceptance Criteria

- Systemet henter items fra organisationens Datalayer.
- Items grupperes efter kategori.
- Statistikken viser antallet for hver kategori.
- Statistikken ændres, når den aktuelle Datalayer-data ændres.

---

## US-50 – Statistik over itemstatus

**Priority:** High

### User Story

Som bruger vil jeg kunne se antallet af items fordelt på status, så jeg kan se deres aktuelle tilstand.

### Acceptance Criteria

- Systemet henter aktuelle item-statusser.
- Items grupperes efter status.
- Statistikken viser antallet for hver status.
- Statistikken opdateres, når et items status ændres.

---

## US-51 – Statistik over opgavestatus

**Priority:** High

### User Story

Som bruger vil jeg kunne se antallet af opgaver fordelt på status, så jeg kan se, hvor langt organisationens arbejde er.

### Acceptance Criteria

- Systemet henter organisationens opgaver.
- Opgaver grupperes efter status.
- Statistikken viser antallet for hver status.
- Statistikken opdateres, når en opgaves status ændres.

---

## US-52 – Gem statistik

**Priority:** High

### User Story

Som bruger vil jeg kunne gemme et statistisk snapshot, så organisationen kan dokumentere sine data på et bestemt tidspunkt.

### Acceptance Criteria

- Systemet kan oprette et `StatisticsSnapshot`.
- Snapshot'et indeholder en start- og slutdato for perioden.
- Snapshot'et indeholder relevante statistiske værdier.
- Snapshot'et er knyttet til den relevante organisation.
- Snapshot'et gemmes med tidspunktet for oprettelsen.
- Et eksisterende snapshot ændres ikke, når nye data registreres.

---

## US-53 – Statistik over tid

**Priority:** Medium

### User Story

Som bruger vil jeg kunne se udviklingen i organisationens data over tid, så jeg kan identificere ændringer i organisationens aktivitet.

### Acceptance Criteria

- Systemet registrerer relevante statistiske datapunkter over tid.
- Brugeren kan vælge en tidsperiode.
- Statistikken viser udviklingen inden for den valgte periode.
- Data fra andre organisationer indgår ikke i statistikken.

---

## US-54 – Sammenlign statistik

**Priority:** Medium

### User Story

Som bruger vil jeg kunne sammenligne statistiske snapshots fra forskellige perioder, så jeg kan se udviklingen i organisationens data.

### Acceptance Criteria

- Brugeren kan vælge flere statistiske snapshots.
- Systemet viser de valgte perioders statistiske værdier.
- Brugeren kan sammenligne samme statistiske værdi på tværs af perioder.
- Brugeren kan eksempelvis sammenligne forskellige år.
- Statistik fra andre organisationer indgår ikke i sammenligningen.

---

## US-55 – Filtrer statistik

**Priority:** Low

### User Story

Som bruger vil jeg kunne filtrere statistik efter relevante data, så jeg kan fokusere på den information, jeg har brug for.

### Acceptance Criteria

- Brugeren kan vælge et relevant filter.
- Statistikken opdateres ud fra det valgte filter.
- Brugeren kan fjerne filteret.
- Statistikken viser igen den samlede relevante data efter fjernelse af filteret.

---

# 10. News / API

## US-56 – Se nyheder

**Priority:** Low

### User Story

Som bruger vil jeg kunne se aktuelle nyheder, så jeg kan holde mig opdateret om relevant information.

### Acceptance Criteria

- Brugeren kan se en liste over tilgængelige nyheder.
- En nyhed viser titel.
- En nyhed viser beskrivelse.
- En nyhed kan vise et billede, hvis et billede er tilgængeligt.
- En nyhed viser dato/tidspunkt.

---

## US-57 – Hent nyheder fra ekstern API

**Priority:** Low

### User Story

Som system vil jeg kunne hente nyheder fra en ekstern API, så aktuelle nyheder kan vises automatisk på Ponos' forside.

### Acceptance Criteria

- Systemet kan sende en forespørgsel til den valgte API.
- Systemet kan modtage nyhedsdata.
- Modtagne nyheder kan vises på forsiden.
- Nyheder kan indeholde titel, beskrivelse, billede og publiceringstidspunkt.
- Hvis API'et ikke er tilgængeligt, håndteres fejlen uden at resten af Ponos stopper.

---

## US-58 – Opret organisation

**Priority:** Critical

### User Story

Som kommende virksomhedsejer vil jeg kunne oprette en organisation, så jeg automatisk får tildelt rollen som administrator og kan administrere organisationen og dens indhold.

### Acceptance Criteria

- Givet at brugeren er logget ind, når brugeren udfylder de påkrævede oplysninger og vælger "Opret organisation", så oprettes organisationen.
- Givet at brugeren opretter en organisation, når organisationen er oprettet, så tildeles brugeren automatisk rollen Admin for organisationen.
- Givet at organisationen er oprettet, når brugeren fortsætter efter oprettelsen, så kan brugeren tilgå organisationens administration.
- Givet at brugeren har rollen Admin, når brugeren tilgår organisationens administrationsfunktioner, så kan brugeren administrere organisationens relevante indhold og indstillinger.
- Givet at organisationen ikke kan oprettes, når brugeren forsøger at oprette organisationen, så får brugeren en tydelig fejlbesked, og organisationen oprettes ikke delvist.

---

## US-59 – Være medlem af flere organisationer

**Priority:** High

### User Story

Som bruger vil jeg kunne være medlem af flere organisationer samtidig, så jeg kan deltage i flere organisationers arbejde uden at miste adgang til de andre.

### Acceptance Criteria

- Givet at brugeren allerede er medlem af en organisation, når brugeren får accepteret en medlemsanmodning til en anden organisation, så bliver brugeren medlem af begge organisationer samtidig.
- Givet at brugeren er medlem af flere organisationer, så har brugeren en rolle pr. organisation, uafhængigt af de øvrige organisationer.
- Brugeren kan se en liste over alle organisationer, brugeren er medlem af.
- Givet at brugeren er medlem af flere organisationer, når brugeren vælger hvilken organisation der skal være aktiv, så viser Ponos kun data fra den valgte organisation.
- Givet at brugeren skifter aktiv organisation, så påvirkes brugerens medlemskab eller rolle i de øvrige organisationer ikke.
- Brugeren kan ikke se data fra andre organisationer end den aktuelt aktive.

---

## US-60 – Oprette flere organisationer

**Priority:** Medium

### User Story

Som bruger, der allerede er medlem af én eller flere organisationer, vil jeg kunne oprette endnu en organisation, så jeg kan blive administrator for flere organisationer samtidig.

### Acceptance Criteria

- Givet at brugeren allerede er medlem af mindst én organisation, når brugeren opretter en ny organisation, så oprettes organisationen uden at brugerens eksisterende medlemskaber påvirkes.
- Givet at organisationen er oprettet, når oprettelsen er gennemført, så tildeles brugeren automatisk rollen Admin for den nye organisation, ved siden af eksisterende medlemskaber.
- Givet at organisationen er oprettet, så kan brugeren vælge den nye organisation som aktiv organisation.
- Givet at organisationen ikke kan oprettes, når brugeren forsøger, så får brugeren en tydelig fejlbesked, og hverken organisationen eller nogen tilknytning oprettes delvist.

---

## US-61 – Forlade en organisation

**Priority:** Medium

### User Story

Som bruger vil jeg kunne forlade en organisation, jeg er medlem af, så jeg ikke længere har adgang til organisationens data, når jeg ikke længere har brug for det.

### Acceptance Criteria

- Givet at brugeren er medlem af en organisation, når brugeren vælger at forlade organisationen, så fjernes brugerens medlemskab af organisationen.
- Givet at brugeren har forladt organisationen, så mister brugeren adgang til organisationens data.
- Givet at brugeren forlader en organisation, så påvirkes brugerens medlemskab af eventuelle andre organisationer ikke.
- Givet at brugeren er den eneste administrator i organisationen, når brugeren forsøger at forlade, så blokeres handlingen, og brugeren får en tydelig besked om at organisationen skal have mindst én administrator.
- Givet at brugeren forlader den organisation, der er valgt som aktiv, så skal brugeren vælge en anden aktiv organisation blandt sine resterende medlemskaber (eller stå uden aktiv organisation, hvis ingen er tilbage).

---

## US-62 – Granulære skriverettigheder i Datalayer

**Priority:** Medium

### User Story

Som administrator vil jeg kunne styre adgangen til at oprette, redigere og slette Datalayer-data (items, kategorier, lokationer) via granulære privilegier, så ikke alle organisationsmedlemmer automatisk har skriveadgang.

### Acceptance Criteria

- RLS-policies for items, kategorier og lokationer skelner mellem læse- og skriveadgang.
- Skriveadgang (opret/rediger/slet) kræver et dedikeret privilegie pr. ressourcetype eller et samlet Datalayer-privilegie.
- En bruger med kun læseadgang kan se data, men ikke oprette/redigere/slette.
- Administratoren (admin-privilegiet) har altid fuld adgang, uanset øvrige privilegier.
- Ændringen bryder ikke eksisterende funktionalitet for brugere med admin-privilegiet.

---

## US-63 – Granulære skriverettigheder i Opgaver

**Priority:** Medium

### User Story

Som administrator vil jeg kunne styre adgangen til at oprette, redigere og slette opgaver via granulære privilegier, så ikke alle organisationsmedlemmer automatisk har skriveadgang.

### Acceptance Criteria

- RLS-policies for opgaver (tasks, task_assignees, task_participants, task_materials) skelner mellem læse- og skriveadgang.
- Skriveadgang (opret/rediger/slet) kræver et dedikeret privilegie.
- En bruger med kun læseadgang kan se opgaver, men ikke oprette/redigere/slette dem.
- Administratoren (admin-privilegiet) har altid fuld adgang, uanset øvrige privilegier.
- Ændringen bryder ikke eksisterende funktionalitet for brugere med admin-privilegiet.

---

## US-64 – Slette en organisation

**Priority:** Medium

### User Story

Som administrator vil jeg kunne slette min organisation permanent, så jeg kan lukke den ned, når jeg enten er det eneste tilbageværende medlem og ikke længere har brug for den, eller når organisationen som helhed skal lukke - uanset om der stadig er andre medlemmer i den.

### Acceptance Criteria

- Kun en administrator af organisationen kan slette den.
- Givet at administratoren sletter organisationen, når sletningen gennemføres, så fjernes organisationens data (roller, privilegier, medlemskaber, lokationer, kategorier, items, opgaver, statistik) permanent.
- Givet at organisationen har andre medlemmer end den, der sletter, når organisationen slettes, så mister alle øvrige medlemmer deres adgang til organisationen med det samme.
- Givet at den slettede organisation var administratorens (eller et andet medlems) aktive organisation, så står brugeren uden aktiv organisation, eller får automatisk en anden af sine resterende organisationer som aktiv, hvis brugeren er medlem af flere.
- Givet at administratoren forsøger at slette organisationen, når handlingen udføres, så kræves en tydelig bekræftelse, da sletningen ikke kan fortrydes.

---

# 11. Prioriteringsoversigt

## Critical

- US-01 – Opret konto
- US-02 – Login
- US-58 – Opret organisation
- US-05 – Anmod om medlemskab
- US-07 – Acceptere medlemsanmodning
- US-14 – Se items
- US-15 – Opret item
- US-25 – Opret kategori
- US-33 – Se opgaver
- US-34 – Opret opgave
- US-37 – Tage ansvar for opgave
- US-39 – Ændre opgavestatus
- US-42 – Tilknyt item
- US-45 – Se dashboard
- US-48 – Generer statistik

## High

- US-06 – Se medlemsanmodninger
- US-08 – Afvise medlemsanmodning
- US-11 – Tildel rolle
- US-59 – Være medlem af flere organisationer
- US-16 – Rediger item
- US-18 – Se itemdetaljer
- US-19 – Angiv mængde
- US-20 – Angiv status
- US-21 – Angiv lokation
- US-22 – Søg efter item
- US-29 – Opret lokation
- US-32 – Se items på lokation
- US-35 – Rediger opgave
- US-36 – Se opgavedetaljer
- US-38 – Tildele opgave
- US-44 – Se egne opgaver
- US-46 – Se antal items
- US-47 – Se antal opgaver
- US-49 – Statistik over kategorier
- US-50 – Statistik over itemstatus
- US-51 – Statistik over opgavestatus
- US-52 – Gem statistik

## Medium

- US-03 – Se profil
- US-04 – Rediger profil
- US-09 – Se organisation
- US-10 – Rediger organisation
- US-12 – Opret rolle
- US-13 – Opret privilege
- US-17 – Slet item
- US-23 – Filtrer items efter kategori
- US-24 – Filtrer items efter status
- US-26 – Rediger kategori
- US-27 – Opret underkategori
- US-28 – Se kategori
- US-30 – Rediger lokation
- US-31 – Se lokation
- US-40 – Angiv startdato
- US-41 – Angiv slutdato
- US-43 – Angiv item-mængde på opgave
- US-53 – Statistik over tid
- US-54 – Sammenlign statistik
- US-60 – Oprette flere organisationer
- US-61 – Forlade en organisation
- US-62 – Granulære skriverettigheder i Datalayer
- US-63 – Granulære skriverettigheder i Opgaver
- US-64 – Slette en organisation

## Low

- US-55 – Filtrer statistik
- US-56 – Se nyheder
- US-57 – Hent nyheder fra ekstern API

---

# 12. MVP

MVP'en skal indeholde den funktionalitet, der er nødvendig for at demonstrere et sammenhængende Ponos-system med autentificering, organisationer, Datalayer, opgaver og grundlæggende statistik.

## Adgang og organisation

- US-01 – Opret konto
- US-02 – Login
- US-58 – Opret organisation
- US-05 – Anmod om medlemskab
- US-06 – Se medlemsanmodninger
- US-07 – Acceptere medlemsanmodning
- US-09 – Se organisation
- US-11 – Tildel rolle

## Datalayer

- US-14 – Se items
- US-15 – Opret item
- US-18 – Se itemdetaljer
- US-19 – Angiv mængde
- US-20 – Angiv status
- US-21 – Angiv lokation
- US-25 – Opret kategori
- US-29 – Opret lokation

## Tasks

- US-33 – Se opgaver
- US-34 – Opret opgave
- US-37 – Tage ansvar for opgave
- US-39 – Ændre opgavestatus
- US-42 – Tilknyt item

## Dashboard og statistik

- US-45 – Se dashboard
- US-46 – Se antal items
- US-47 – Se antal opgaver
- US-48 – Generer statistik

---

# 13. Arbejdsfordeling

## Studerende 1 – Adgang, Organisation & Overblik

**25 stories**

### Bruger & login

- US-01
- US-02
- US-03
- US-04

### Organisation & medlemskab

- US-58
- US-05
- US-06
- US-07
- US-08
- US-09
- US-10
- US-59
- US-60
- US-61
- US-64

### Roller & privileges

- US-11
- US-12
- US-13
- US-62
- US-63

### Dashboard

- US-45
- US-46
- US-47

### News/API

- US-56
- US-57

---

## Studerende 2 – Datalayer

**19 stories**

### Items

- US-14
- US-15
- US-16
- US-17
- US-18
- US-19
- US-20
- US-21
- US-22
- US-23
- US-24

### Kategorier

- US-25
- US-26
- US-27
- US-28

### Lokationer

- US-29
- US-30
- US-31
- US-32

---

## Studerende 3 – Opgaver & Statistik

**20 stories**

### Opgaver

- US-33
- US-34
- US-35
- US-36
- US-37
- US-38
- US-39
- US-40
- US-41
- US-42
- US-43
- US-44

### Statistik

- US-48
- US-49
- US-50
- US-51
- US-52
- US-53
- US-54
- US-55

---

# 14. Definition of Done

En user story betragtes som færdig, når:

- Alle acceptance criteria er implementeret.
- Funktionaliteten fungerer i UI'et.
- Backend/database-logik er implementeret, hvor relevant.
- Authorization er håndhævet.
- Organisationens data er isoleret korrekt.
- Inputvalidering er implementeret.
- Relevante fejltilstande håndteres.
- Eksisterende funktionalitet fungerer fortsat.
- Relevante tests er oprettet eller opdateret.
- Lint/typecheck/build passerer, hvis projektet anvender disse checks.
- Der er ikke introduceret unødvendig funktionalitet uden for story'ens scope.

---

# 15. Vigtige arkitekturregler

Disse regler gælder på tværs af alle user stories.

## Authentication

Supabase Auth er source of truth for brugerens autentificering.

## Authorization

En autentificeret bruger må ikke automatisk få adgang til organisationens data.

Adgang skal baseres på:

`User → Organization Membership → Role → Privileges`

## Multi-tenancy

Organisationer skal være isoleret fra hinanden.

En bruger må aldrig kunne:

- se en anden organisations items
- se en anden organisations opgaver
- se en anden organisations kategorier
- se en anden organisations lokationer
- se en anden organisations statistik
- ændre data i en anden organisation

## Ownership

Data, der tilhører en organisation, skal være knyttet til organisationen gennem database-relationer.

## Database security

Supabase Row Level Security (RLS) skal anvendes til at håndhæve organisationens dataisolering, hvor relevant.

Frontend authorization må ikke være den eneste sikkerhedsmekanisme.

## Roles

Roller skal være scoped til organisationen.

En bruger må ikke kunne ændre sin egen rolle eller sine egne privileges.

## Validation

Alle numeriske mængder skal være gyldige og ikke-negative.

Datoer skal valideres, så en slutdato ikke kan være tidligere end en startdato.

## Error handling

Eksterne API-fejl, databasefejl og valideringsfejl skal håndteres kontrolleret og må ikke få resten af applikationen til at fejle.