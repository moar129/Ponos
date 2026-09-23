# Opgave-materialer: manuel statusændring under opgaven + fjern automatisk afrapporterings-default

Resumerbar spec - kan åbnes i en ny chat, som så ved præcis hvad der er
lavet, og hvad næste skridt er. Slet denne fil når arbejdet er implementeret,
verificeret i browseren, og skrevet ind i `docs/dbSchema.sql` (samme rutine
som `docs/migrations/README.md`).

## Status: IKKE påbegyndt endnu (kun planlagt)

## Hvor vi kommer fra (allerede bygget og live, ingen ændring her)

Opgaver (`src/components/Task/*`, `src/store/apis/taskApi.ts`) kan i dag
tilknytte Datalager-items som materialer (US-42/US-43), bygget over flere
runder samme dag:

1. **Tilknytning/reservation**: `TaskItemPicker.tsx` (to tilstande - `taskId`
   reservérer med det samme via RPC `reserve_item_units`, `onStage` bruges i
   `CreateTaskModal.tsx` til at samle valg lokalt og reservere dem alle lige
   efter selve opgave-oprettelsen). `TaskMaterialsList.tsx` viser tilknyttede
   materialer + "Frigiv" (RPC `release_item_units`).
2. **Reserved -> InUse automatisk ved start**: da en opgave går til
   `InProgress`, sætter `set_task_status` (dbSchema.sql §15.18) automatisk
   alle dens reserverede enheder til `InUse` - en transaktions-lokal
   bypass-flag (`ponos.bypass_unit_status_guard`, sat via `set_config`)
   omgår guard-triggeren `trg_prevent_direct_status_change_on_reserved_unit`
   (§15.21), som normalt blokerer enhver statusændring på en linket enhed.
   Reserveres et NYT materiale på en allerede-InProgress opgave
   (`reserve_item_units`), sættes det direkte til `InUse`.
3. **Afrapportering udskudt til godkendelse**: for en opgave med
   `requires_approval` gemmes den tildeltes valgte udfald (hvilken status
   materialet får) kun som DATA på færdigmeldingen
   (`task_requests.material_outcomes`, jsonb) - selve statusændringen sker
   FØRST i `approve_task_request` ved godkendelse. Afvises anmodningen i
   stedet, røres materialerne slet ikke (forbliver `Reserved`/`InUse`). Delt
   kernelogik i `apply_task_material_outcomes` (§15.21b), genbrugt af både
   `resolve_task_material_units` (opgaver UDEN godkendelse, afrapporteres
   stadig med det samme) og `approve_task_request`.
4. **`ResolveTaskMaterialsModal.tsx`** (nuværende, FØR denne plan): viser pr.
   uafrapporteret materiale-linje en "Der er afvigelser"-checkbox; er den IKKE
   krydset af, anvendes automatisk 100% `Consumed` ved bekræft - **dette er
   præcis det bruger nu har bedt om at fjerne, se nedenfor**.

Alt dette er verificeret kørende og testet af bruger i denne session - ingen
ændring af punkt 1-3 i denne plan.

## Hvad der skal bygges nu

Bruger (dansk, citeret): *"man skal også kunne vælge at skifte status på et
stykke materiale når man er igang med en opgave, lad os sige at det bliver
beskadigt eller på anden måde. defualt skal bare være at det går fra
reserveret inden opgaven er igang, når opgaven så starter bliver det sat til
i brug, men under opgaven kan det godt ændre status. det vil også sige at når
man afslutter opgaven bør det være sådan at man sætter hvilken status
materialet har når man er færdig det skal ikke være automatisk men skal være
noget brugeren gør."*

To sammenhængende stykker arbejde:

### A) Manuel statusændring MENS opgaven er `InProgress`

En bruger med `update_tasks` skal kunne ændre status på en (del af en)
reserveret/i-brug materiale-linje, MENS opgaven er `InProgress` - UDEN at det
tæller som afslutning: materialet forbliver knyttet til opgaven (kan stadig
frigives, skal stadig afrapporteres ved færdiggørelse), kun dets reelle
status ændres undervejs (fx til `Damaged`).

### B) Ingen automatisk default ved afrapportering

`ResolveTaskMaterialsModal` må ALDRIG stiltiende anvende en status uden at
brugeren selv aktivt har valgt den - hverken via en default der bruges hvis
intet krydses af, eller på anden implicit vis.

## Nøgleindsigt: to forskellige slags "statusændring" på samme enheder

`apply_task_material_outcomes` (afrapportering, eksisterende) kræver at
summen af de angivne udfald matcher HELE den aktuelt linkede mængde, og den
AFLINKER altid det den rører (ellers blokerer guard-triggeren). Korrekt for
"afslut brugen af dette materiale" - forkert for "ret midlertidigt status på
en del af det, mens opgaven fortsætter", som ville tvinge brugeren til at
tage stilling til RESTEN af mængden også, og ville miste opgavens tracking af
den stadig aktivt brugte rest.

Løsning: en ny, separat RPC der (a) kun kræver `p_quantity <= det der
aktuelt er linket` (ikke hele mængden), og (b) BEHOLDER linket til opgaven
(samme transaktions-lokale bypass-flag som `set_task_status` allerede bruger,
i stedet for at aflinke). Splittes en enhed for at ramme en præcis
delmængde (`split_unit_if_needed`), skal den NYE, endnu ulinkede split-række
eksplicit linkes til samme `task_materials`-linje (modsat `apply_task_
material_outcomes`, hvor splitningen bevidst IKKE re-linkes, fordi den SKAL
afsluttes der).

## DB-ændring (én ny migrationsfil, ikke skrevet endnu)

Fil: `docs/migrations/<dags dato>-manual-task-material-status.sql`.

Ny RPC:

```sql
create or replace function public.update_task_material_status(p_task_material_id uuid, p_quantity numeric, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_profile_org();
  v_task_id uuid;
  v_task_status public.e_task_status;
  v_total_linked numeric;
  v_unit record;
  v_remaining numeric;
  v_take numeric;
  v_unit_id uuid;
begin
  if v_org_id is null then
    raise exception 'Du er ikke medlem af en organisation.' using hint = 'NO_ACTIVE_ORG';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Mængden skal være større end 0.' using hint = 'INVALID_QUANTITY';
  end if;

  if not exists (select 1 from unnest(enum_range(null::public.e_item_status)) s where s::text = p_status) then
    raise exception 'Ugyldig status: %', p_status using hint = 'INVALID_OUTCOME_STATUS';
  end if;

  select tm.task_id, t.status into v_task_id, v_task_status
  from public.task_materials tm
  join public.tasks t on t.id = tm.task_id
  where tm.id = p_task_material_id and t.organisation_id = v_org_id;

  if v_task_id is null then
    raise exception 'Materiale-linjen findes ikke i din organisation.' using hint = 'TASK_MATERIAL_NOT_FOUND';
  end if;

  if v_task_status <> 'InProgress' then
    raise exception 'Materialets status kan kun ændres, mens opgaven er i gang.' using hint = 'TASK_NOT_IN_PROGRESS';
  end if;

  if not public.has_privilege_or_admin('update_tasks') then
    raise exception 'Du har ikke rettigheder til at ændre status på et materiale.'
      using errcode = '42501', hint = 'NO_PRIV_UPDATE_MATERIAL_STATUS';
  end if;

  -- Lås linkede rækker (samme mønster som apply_task_material_outcomes).
  perform 1 from public.data_layer_item_units
   where id in (select unit_id from public.task_material_units where task_material_id = p_task_material_id)
   for update;

  select coalesce(sum(u.quantity), 0) into v_total_linked
  from public.task_material_units tmu
  join public.data_layer_item_units u on u.id = tmu.unit_id
  where tmu.task_material_id = p_task_material_id;

  if p_quantity > v_total_linked then
    raise exception 'Mængden (%) overstiger hvad der er tilbage på materiale-linjen (%).', p_quantity, v_total_linked
      using hint = 'QUANTITY_EXCEEDS_LINKED_QUANTITY';
  end if;

  v_remaining := p_quantity;

  for v_unit in
    select u.id, u.quantity
    from public.task_material_units tmu
    join public.data_layer_item_units u on u.id = tmu.unit_id
    where tmu.task_material_id = p_task_material_id
    order by u.created_at
  loop
    exit when v_remaining <= 0;

    v_take := least(v_unit.quantity, v_remaining);
    v_unit_id := public.split_unit_if_needed(v_unit.id, v_take);

    if v_unit_id <> v_unit.id then
      -- Ny, endnu ulinket split-række (den urørte rest beholder det
      -- oprindelige link uændret) - link DENNE til samme materiale-linje,
      -- så den forbliver sporet til opgaven; kun status ændres.
      insert into public.task_material_units (task_material_id, unit_id)
      values (p_task_material_id, v_unit_id);
    end if;

    perform set_config('ponos.bypass_unit_status_guard', 'on', true);

    update public.data_layer_item_units
       set status = p_status::public.e_item_status
     where id = v_unit_id;

    perform set_config('ponos.bypass_unit_status_guard', 'off', true);

    v_remaining := v_remaining - v_take;
  end loop;
end;
$$;

grant execute on function public.update_task_material_status(uuid, numeric, text) to authenticated;
```

Nye fejlnøgler (`src/i18n/locales/{da,en}/errors.json`):
- `permission.updateTaskMaterialStatus`: "Du har ikke rettigheder til at
  ændre status på et materiale." / engelsk ækvivalent.
- `db.TASK_NOT_IN_PROGRESS`: "Materialets status kan kun ændres, mens
  opgaven er i gang." / engelsk ækvivalent.
- `db.QUANTITY_EXCEEDS_LINKED_QUANTITY`: "Mængden overstiger hvad der er
  tilbage på denne materiale-linje." / engelsk ækvivalent.
- Genbruger `db.INVALID_OUTCOME_STATUS`/`db.INVALID_QUANTITY`/
  `db.TASK_MATERIAL_NOT_FOUND` (findes allerede) for de tre andre fejl.

## Frontend-ændringer (ikke lavet endnu)

### 1. `src/types/Task/Task.ts`

`TaskMaterial` udvides med en status-fordeling for den del der stadig er
linket, så UI kan vise fx "3 kg I brug, 2 kg Beskadiget" i stedet for ét tal;
`resolved` udledes af den:

```ts
export interface TaskMaterialStatusGroup {
  status: ItemStatus; // fra datalayerTypes.ts
  quantity: number;
}

export interface TaskMaterial {
  id: string;
  itemId: string;
  itemName: string;
  unitOfMeasurement: string;
  quantity: number;                         // oprindelig, samlet reserveret mængde
  linkedGroups: TaskMaterialStatusGroup[];   // aktuel fordeling af det der STADIG er linket - tom = fuldt afrapporteret
  resolved: boolean;                         // linkedGroups.length === 0
}
```

### 2. `src/store/apis/taskApi.ts`: `getTaskMaterials`

I dag (linje ~1079-1123) henter den kun `task_material_units.task_material_id`
(til at udlede en boolean `resolved`). Udvides til også at hente
`status`+`quantity` for hver linket enhed (join til `data_layer_item_units`),
og gruppere/summere pr. status client-side til `linkedGroups`. `resolved`
bliver `linkedGroups.length === 0`.

### 3. `src/store/apis/categoryApi.ts`: ny mutation

Ved siden af `reserveItemUnits`/`releaseItemUnits` (samme fil, samme
mønster, linje ~636-678):

```ts
changeTaskMaterialStatus: builder.mutation<void, { taskMaterialId: string; itemId: string; taskId: string; quantity: number; status: string }>({
  queryFn: async ({ taskMaterialId, quantity, status }) => {
    const { error } = await supabase.rpc('update_task_material_status', {
      p_task_material_id: taskMaterialId,
      p_quantity: quantity,
      p_status: status,
    });
    if (error) return { error: mapPermissionError(error, 'changeTaskMaterialStatus') };
    return { data: undefined };
  },
  invalidatesTags: (_result, _error, { taskId, itemId }) => [
    { type: 'ItemUnit', id: `ITEM-${itemId}` },
    { type: 'Item', id: itemId },
    { type: 'Item', id: 'LIST' },
    { type: 'Task', id: taskId },
    { type: 'Task', id: `${taskId}-MATERIALS` },
  ],
}),
```
Eksportér `useChangeTaskMaterialStatusMutation`.

### 4. `src/components/Task/TaskMaterialsList.tsx`

- Ny prop `taskStatus: ETaskStatus` (kaldestedet, `TaskCard.tsx`, har
  `task.status` i forvejen).
- Visning pr. linje: itererer `linkedGroups` og viser hver status for sig
  (fx "3 kg I brug", "2 kg Beskadiget" som separate linjer under varenavnet)
  i stedet for kun ét `quantity unitOfMeasurement -
  Reserveret/Afrapporteret`-tal. Genbruger `td('datalayer:status.…')`-
  mønsteret fra `ItemStatusBadges`/`ResolveTaskMaterialsModal.tsx` til at
  oversætte statusnavnet.
- Ny inline kontrol pr. linje, kun når `taskStatus === 'InProgress' &&
  canManage && linkedGroups.length > 0`: en "Skift status"-knap der åbner et
  lille form (status-`<select>` med `ALL_ITEM_STATUSES`, mængde-input, `max`
  = summen af `linkedGroups`) + Bekræft/Annuller, kalder
  `useChangeTaskMaterialStatusMutation`. Samme lette inline-mønster som
  "Frigiv"/`confirmReleaseId` i samme fil i dag - egen lille lokal state,
  ikke en separat modal-komponent (proportionalt for en ét-felt-ad-gangen
  handling).
- Kendt, BEVIDST urørt kant-tilfælde: "Frigiv" sætter i dag altid HELE
  linjen til `Available`, uanset om en del af den er blevet manuelt sat til
  fx `Damaged` undervejs - eksisterende antagelse i `release_item_units`,
  IKKE noget der ændres i denne omgang (nævnes i migrationsfilens header som
  kendt afgrænsning, kan følges op som separat forbedring).

### 5. `src/components/Task/ResolveTaskMaterialsModal.tsx`

Fjerner den automatiske default fuldstændigt:
- `hasDeviations`-checkbox/state og `defaultOutcomeHint`-teksten fjernes helt
  - outcome-linjerne er altid synlige, ingen skjult/synlig-skiftende tilstand.
- `getOutcomes(material)`s default ændres fra ét hardkodet `Consumed`-forslag
  til at forudfylde ÉN linje PR. eksisterende `linkedGroups`-post (samme
  status + mængde materialet FAKTISK har lige nu - inkl. evt. allerede-satte
  manuelle statusser fra punkt A). Stadig brugerens eget, synlige,
  redigerbare udgangspunkt - intet anvendes før brugeren selv klikker
  "Bekræft og afslut opgave", så "ikke automatisk, skal være noget brugeren
  gør" er opfyldt: alt er synligt, intet skjules, og en linje der stadig
  står på `InUse` (ikke en reel slutstatus) er tydeligt brugerens eget ansvar
  at ændre inden bekræft.
- `isValid` udvides til også at kræve at INGEN outcome-linje har tom status
  (ikke kun at summen matcher) - `<select>` får en deaktiveret
  placeholder-option (`materials.chooseStatusPlaceholder`, "Vælg status...")
  som `value=""`, og "Bekræft"-knappen forbliver deaktiveret mens nogen linje
  står på den.

### 6. `src/components/Task/TaskCard.tsx`

Én linje ændres:
`<TaskMaterialsList taskId={task.id} canManage={canUpdate} />` →
`<TaskMaterialsList taskId={task.id} canManage={canUpdate} taskStatus={task.status} />`.

### 7. i18n (`src/i18n/locales/{da,en}/tasks.json`, `materials`-blokken)

Fjern (ikke længere brugt): `resolve.hasDeviations`, `resolve.
defaultOutcomeHint`.

Tilføj: `chooseStatusPlaceholder` ("Vælg status..."/"Choose status..."),
`changeStatus` ("Skift status"/"Change status"), `changeStatusConfirm`
("Bekræft"/"Confirm" - genbrug en fælles `common:confirm`-nøgle hvis den
findes, ellers ny), `changingStatus` ("Ændrer status..."/"Changing
status...").

## Rækkefølge til udførelse

1. Skriv migrationsfil (kun den nye RPC + grant, ingen ændring af
   eksisterende funktioner/tabeller).
2. Bruger kører den i Supabase SQL Editor, Claude verificerer (funktions-
   signatur + evt. et testkald).
3. `docs/dbSchema.sql` opdateres (nyt §15.21c), migrationsfilen slettes,
   `docs/migrations/README.md`s log opdateres (samme rutine som hidtil).
4. Frontend, i denne rækkefølge: `Task.ts` → `taskApi.ts` (`getTaskMaterials`)
   → `categoryApi.ts` (`changeTaskMaterialStatus`) →
   `TaskMaterialsList.tsx` (fordelt visning + skift-status-kontrol) →
   `ResolveTaskMaterialsModal.tsx` (fjern auto-default, forudfyld fra
   `linkedGroups`, kræv eksplicit valg) → `TaskCard.tsx` (ny prop) → i18n.
5. `npm run build` (typecheck) og `npm run lint` - skal være rene (baseline
   er pt. 13 problemer/11 fejl, alle i filer denne opgave ikke rører:
   `addItemsComponent.tsx`, `deleteCategoryComponent.tsx`,
   `editCategoryComponent.tsx`, `itemsDetailComponent.tsx`,
   `DataLayerPage.tsx`, `messagePage.tsx`, `newsApi.ts` - hvis det tal
   stiger, er noget nyt introduceret).
6. Browser-test (se tjekliste nedenfor).
7. Når alt er bekræftet: slet DENNE fil (`docs/task-materials-status-change-
   plan.md`).

## Verifikation / browser-test-tjekliste

1. Reservér et materiale (fx 5 kg) på en opgave, status Tilgængelig →
   materiale-linjen viser "5 kg Reserveret", ingen "Skift status"-knap
   (opgaven er ikke i gang endnu).
2. Start opgaven → linjen viser nu "5 kg I brug" (uændret fra tidligere
   arbejde), og "Skift status"-knappen er nu synlig.
3. Skift status på 2 af de 5 kg til "Beskadiget" → linjen viser nu to
   grupper, fx "3 kg I brug" + "2 kg Beskadiget" - materialet er STADIG
   knyttet til opgaven (ikke forsvundet fra listen, "Frigiv" virker stadig på
   hele linjen).
4. I Datalager: itemets statusfordeling viser nu 3 `InUse` + 2 `Damaged` for
   de pågældende enheder (ikke `Reserved` for nogen af dem).
5. Prøv at skifte status på mere end de resterende 3 kg (fx 4 kg) → afvist
   med `QUANTITY_EXCEEDS_LINKED_QUANTITY`, dansk besked.
6. Meld opgaven færdig → afrapporterings-modalen åbner med linjen FORUDFYLDT
   som to rækker (3 kg "I brug", 2 kg "Beskadiget") - intet er endnu anvendt.
   Ret "I brug"-rækken til en rigtig slutstatus (fx "Brugt op") → Bekræft.
7. Regressionstjek: en helt urørt (ingen manuel statusskift undervejs)
   materiale-linje viser stadig sin ene gruppe (fx "5 kg I brug") forudfyldt
   ved afrapportering - kræver stadig et eksplicit valg, ingen automatisk
   "Brugt op" længere, uanset om brugeren rører noget eller ej ("Bekræft"
   forbliver deaktiveret indtil status er valgt på alle linjer).
8. Prøv "Skift status" på en opgave der IKKE er `InProgress` (fx via en
   ældre fane/race) → serverfejl `TASK_NOT_IN_PROGRESS` vises korrekt
   oversat, ingen crash.
9. Bruger med kun `read_tasks` (ingen `update_tasks`): ser status-
   fordelingen, men ingen "Skift status"-knap.

## Åbne spørgsmål

Ingen - RPC-mønster, bypass-flag og split-håndtering er alle direkte
genbrugt/spejlet fra allerede-verificeret kode i samme fil
(`reserve_item_units`/`apply_task_material_outcomes`/`set_task_status`).
