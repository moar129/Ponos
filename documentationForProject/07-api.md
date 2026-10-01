# 7. API'er

## 7.0 Der er ingen egen backend-API

Ponos har **ingen egen server** og derfor ingen håndskrevne REST-endpoints. "API'et" består af to lag:

1. **Supabase' auto-genererede HTTP-API** (PostgREST + Auth + Realtime), som klienten kalder via `supabase-js`.
2. **RTK Query-endpoints** i `src/store/apis/*Api.ts` (122 i alt), som er appens interne "API-kontrakt" mod komponenterne.

Sammenhængen mellem et RTK-endpoint og den faktiske HTTP-request:

| supabase-js-kald | HTTP (PostgREST/GoTrue) |
|---|---|
| `supabase.from('t').select('a,b').eq('x', v)` | `GET /rest/v1/t?select=a,b&x=eq.v` |
| `.insert(row)` | `POST /rest/v1/t` |
| `.update(patch).eq('id', id)` | `PATCH /rest/v1/t?id=eq.<id>` |
| `.upsert(row)` | `POST /rest/v1/t` med `Prefer: resolution=merge-duplicates` |
| `.delete().eq('id', id)` | `DELETE /rest/v1/t?id=eq.<id>` |
| `supabase.rpc('fn', args)` | `POST /rest/v1/rpc/fn` med JSON-body |
| `supabase.auth.signInWithPassword` | `POST /auth/v1/token?grant_type=password` |
| `supabase.auth.getUser()` | `GET /auth/v1/user` |
| `supabase.channel(...).on('postgres_changes', …)` | WebSocket `/realtime/v1/websocket` |

**Fælles for alle requests (authentication):** Headerne `apikey: <anon-nøgle>` og `Authorization: Bearer <brugerens access token (JWT)>` sættes automatisk af `supabase-js`. Uden login er tokenet anon-nøglen selv → rollen `anon`. RLS og funktionernes guards afgør resten.

**Fælles fejlhåndtering:** se `09-error-handling.md` (alle endpoints returnerer `{ status: 'CUSTOM_ERROR', error: 'errors:<nøgle>' | '<rå tekst>' }`).

---

## 7.1 Endpoint-katalog (alle 122)

Forklaring: **Q** = query, **M** = mutation, **RT** = med realtime-abonnement, **Opt** = optimistisk opdatering. "Privilegie" er det, databasen håndhæver.

### Auth – `authApi.ts`
| Endpoint | Type | HTTP | Privilegie/regel |
|---|---|---|---|
| `getSession` | Q + lytter | lokal session; `onAuthStateChange` | – |
| `signOut` | M | `POST /auth/v1/logout` | logget ind |
| `resetPassword` | M | `POST /rpc/reset_password_prototype` | **anon** (prototype) |
| `changePassword` | M | `POST /auth/v1/token` (re-auth) + `PUT /auth/v1/user` | logget ind + nuværende kode |

### Profil – `profileApi.ts`
| Endpoint | Type | HTTP | Privilegie/regel |
|---|---|---|---|
| `getMyProfile` | Q | `GET /auth/v1/user` → `GET profiles` → `GET memberships` → `GET organisations`/`roles` | egen række |
| `updateMyProfile` | M | `PATCH profiles?id=eq.<mig>` | egen række |

### Organisation – `organisationApi.ts`
| Endpoint | Type | HTTP | Privilegie/regel |
|---|---|---|---|
| `getMyOrganisation` | Q | `GET organisations?id=eq.<aktiv>` | medlem |
| `searchOrganisations(term)` | Q | `GET organisations?name=ilike.*term*&limit=20` | alle indloggede |
| `updateMyOrganisation` | M | `PATCH organisations` | `update_organisation` |
| `createOrganisation` | M | `POST /rpc/create_organisation` | indlogget |
| `getMyMemberships` | Q | `POST /rpc/get_my_memberships` | egne |
| `setActiveOrganisation` | M | `POST /rpc/set_active_organisation` | medlem af målet |
| `leaveOrganisation` | M | `POST /rpc/leave_organisation` | medlem, ikke eneste admin |
| `deleteOrganisation` | M | `POST /rpc/delete_organisation` | admin af org |
| `add/removeSavedOrganisationColor` | M | `GET` + `PATCH organisations` | `update_organisation` |

### Medlemskab – `membershipApi.ts`, `invitationApi.ts`
| Endpoint | Type | HTTP | Privilegie/regel |
|---|---|---|---|
| `getMyPendingRequest` | Q | `GET membership_requests?…&select=…,organisations(name)` | egne |
| `requestMembership` | M | `POST membership_requests` | `user_id = mig` |
| `getPendingMembershipRequests` | Q | `GET membership_requests` + profiler | `read_membership_requests` |
| `reviewMembershipRequest` | M | `PATCH membership_requests?id&status=eq.Pending` | `update_membership_requests` |
| `getMyPendingInvitations` | Q | `GET membership_invitations` | egne |
| `getSentInvitations` | Q | `GET membership_invitations` + profiler | `read_invitations` |
| `inviteMember` | M | `POST /rpc/invite_member` | `create_invitations` |
| `cancelInvitation` | M | `DELETE membership_invitations` | `delete_invitations` |
| `respondToInvitation` | M | `PATCH membership_invitations` | modtager |

### Roller og privilegier – `roleApi.ts`, `privilegeApi.ts`
| Endpoint | Type | HTTP | Privilegie/regel |
|---|---|---|---|
| `getOrganisationRoles` | Q | `GET roles` | medlem |
| `createRole` | M | `POST roles` | `create_roles` |
| `createRoleWithPrivileges` | M | `POST /rpc/create_role_with_privileges` | `create_roles` + kun egne privilegier |
| `updateRole` / `deleteRole` | M | `PATCH`/`DELETE roles` | `update_roles` / `delete_roles` |
| `getOrganisationMembers` | Q | `GET memberships` + profiler + roller | medlem |
| `assignRole` | M | `PATCH memberships` | `update_roles` + escalation-guard |
| `removeMember` | M | `POST /rpc/remove_member` | `delete_members` |
| `transferAdminRole` | M | `POST /rpc/transfer_admin_role` | admin |
| `getMyPrivileges` | Q | 3–4 kald → `GET privileges?role_id=eq.<min rolle>` | egne |
| `getOrganisationPrivileges` | Q | `GET privileges` | `read_roles` (ellers kun egen rolle) |
| `create/update/deletePrivilege` | M | `POST`/`PATCH`/`DELETE privileges` | `update_roles` |

### Datalager – `categoryApi.ts` (21), `dataLayerFavoriteApi.ts` (3)
| Endpoint | Type | HTTP | Privilegie/regel |
|---|---|---|---|
| `getCategoryTree` | Q | `GET data_layer_categories`, `GET data_layer_items`, `GET data_layer_item_status_counts?item_id=in.(…)` | `read_datalayer` |
| `addCategory` / `updateCategory` / `deleteCategory` | M | `POST`/`PATCH`/`DELETE data_layer_categories` | `create/update/delete_datalayer` |
| `addItem` / `addItems` | M | `POST /rpc/add_item_with_units` (×N) | `create_datalayer` |
| `updateItem` / `deleteItem` | M | `PATCH`/`DELETE data_layer_items` | `update/delete_datalayer` |
| `getAvailableUnitLocations`, `getUnitLocationCounts` | Q | `GET data_layer_item_units` (hele org) | `read_datalayer` |
| `getItemUnits(itemId)` | Q | `GET data_layer_item_units?item_id=eq.…` | `read_datalayer` |
| `addItemUnits` | M | `GET data_layer_items` + `POST data_layer_item_units` (bulk) | `create_datalayer` |
| `updateItemUnit` / `deleteItemUnit` | M | `PATCH`/`DELETE data_layer_item_units` | `update/delete_datalayer` (+ reservations-guard) |
| `reserveItemUnits` | M | `POST /rpc/reserve_item_units` | `update_tasks` |
| `releaseItemUnits` | M | `POST /rpc/release_item_units` | `update_tasks` |
| `changeTaskMaterialStatus` | M | `POST /rpc/update_task_material_status` | `update_tasks`, opgave `InProgress` |
| `getItemLocations` | Q | `GET locations` | `read_datalayer` |
| `addLocation` / `updateLocation` / `deleteLocation` | M | `POST`/`PATCH`/`DELETE locations` | `create/update/delete_datalayer` |
| `getDataLayerFavorites` / `add…` (Opt) / `remove…` (Opt) | Q/M | `GET`/`POST`/`DELETE data_layer_favorites` | `read_datalayer`, egne |

### Opgaver – `taskApi.ts` (24), `taskRoomFavoriteApi.ts` (3)
| Endpoint | Type | HTTP | Privilegie/regel |
|---|---|---|---|
| `getTasks` | Q | `GET tasks?organisation_id=eq.…` | `read_tasks` + rum/afsluttet-regler |
| `getCompletedTasks` | Q | `GET tasks?status=eq.Completed` + 4 batch-opslag | `view_completed_tasks` (eller tilmeldt) |
| `getOpenTaskAssigneeNames` | Q | `GET tasks`, `GET task_assignees`, profiler | `read_tasks` |
| `getRooms` | Q | `GET task_rooms?select=*,task_room_roles(role_id)` | `read_tasks` + rum-adgang |
| `createTask` / `updateTask` / `deleteTask` | M | `POST`/`PATCH`/`DELETE tasks` | `create/update/delete_tasks` |
| `updateTaskStatus` | M | `POST /rpc/set_task_status` + `GET tasks?id` | tilmeldt eller `update_tasks` |
| `createRoom` / `updateRoom` | M | `POST /rpc/create_task_room` / `update_task_room` | `create_tasks` / `update_tasks` |
| `deleteRoom` | M | `DELETE tasks?id=in.(…)` + `PATCH tasks` + `DELETE task_rooms` | `delete_tasks` + `update_tasks` |
| `getTaskAssignees(taskId)` | Q | `GET task_assignees?task_id=eq.…` | `read_tasks` (eller egne) |
| `assignToTask` / `unassignFromTask` / `removeAssigneeFromTask` | M | `POST`/`DELETE task_assignees` | selv / `assign_tasks` |
| `getMyTaskIds` | Q | `GET task_assignees?user_id=eq.<mig>` | egne |
| `createTaskRequest` | M | `GET` + `POST task_requests` | tilmeldt |
| `getTaskRequests(taskId)` | Q | `GET task_requests?task_id=eq.…` | `read_tasks` eller godkender |
| `getPendingTaskRequests` | Q | `POST /rpc/get_pending_task_requests` | `approve_task`/`reject_task` |
| `getTaskRequestDetails(id)` | Q | `POST /rpc/get_task_request_details` | `approve_task`/`reject_task` |
| `approveTaskRequest` / `rejectTaskRequest` | M | `POST /rpc/approve_task_request` / `reject_task_request` | `approve_task` / `reject_task` + rum-adgang |
| `resolveTaskMaterialUnits` | M | `POST /rpc/resolve_task_material_units` | `update_tasks` |
| `getTaskMaterials(taskId)` | Q | `GET task_materials` → `GET data_layer_items` + `GET task_material_units?select=…,data_layer_item_units(…)` → `GET locations` ×2 | `read_tasks` |
| `getTaskRoomFavorites` / `add…` (Opt) / `remove…` (Opt) | Q/M | `GET`/`POST`/`DELETE task_room_favorites` | `read_tasks`, egne, rum-adgang |

### Beskeder – `messageApi.ts` (15)
| Endpoint | Type | HTTP | Privilegie/regel |
|---|---|---|---|
| `getMyConversations` | Q | `POST /rpc/get_my_conversations` | egne, aktiv org |
| `getOrCreateDirectConversation` | M | `POST /rpc/get_or_create_direct_conversation` | |
| `getMessages(id)` | Q + RT | `GET messages?conversation_id=eq.…&order=created_at.asc` + WS INSERT/UPDATE | deltager (eller admin – se 08) |
| `sendMessage` | M | `POST messages` | deltager, kan skrive |
| `createGroupConversation` | M | `POST /rpc/create_group_conversation` | |
| `getConversationParticipants(id)` | Q + RT | `GET conversation_participants` + profiler + WS UPDATE | deltager |
| `markConversationRead` (Opt) | M | `POST /rpc/mark_conversation_read` | deltager |
| `add/removeGroupParticipant(s)`, `leaveGroupConversation` | M | RPC'er | deltager, ikke system-chat |
| `editMessage` / `deleteMessage` | M | `POST /rpc/edit_message` / `delete_message` | egen besked |
| `getOrJoinRoomConversation`, `joinTaskConversation`, `setTaskChatChoice` | M | RPC'er | rum-adgang / tilmeldt |

### Notifikationer – `notificationApi.ts` (6), `notificationPreferenceApi.ts` (2)
| Endpoint | Type | HTTP | Privilegie/regel |
|---|---|---|---|
| `getMyNotifications({limit, onlyVisible})` | Q + RT | `GET notifications?order=created_at.desc&limit=…` + WS INSERT/UPDATE | egne, aktiv org (invitationer undtaget) |
| `markNotificationRead`, `markAllNotificationsRead`, `dismiss…`, `undismiss…` | M | `PATCH notifications` | egne |
| `deleteNotification` | M | `DELETE notifications` | egne |
| `getNotificationPreferences` / `updateNotificationPreferences` (Opt) | Q/M | `GET` / `POST (upsert) notification_preferences` | egne |

### Nyheder – `newsApi.ts` (5)
`getNews` (Q, `read_news`), `getNewsById` (Q), `createNews` / `updateNews` / `deleteNews` (M, `create/update/delete_news`).

### Statistik – `statisticApi.ts` (4)
`getStatistics` (Q, `POST /rpc/get_statistics`, `read_statistics`), `getStatisticsSnapshots` (Q, `GET statistics_snapshots?select=…,statistics_values(…)`), `saveStatisticsSnapshot` (M, RPC, `create_statistics`), `deleteStatisticsSnapshot` (M, `DELETE … &select=id`, `delete_statistics`).

---

## 7.2 Detaljeret dokumentation af de vigtigste endpoints

### `POST /rest/v1/rpc/create_organisation` (← `organisationApi.createOrganisation`)
- **Formål:** Opret organisation + standardroller + admin-medlemskab og gør den aktiv.
- **Auth:** indlogget (`auth.uid()` ikke null).
- **Body:** `{ "p_name": "Roskilde Festival" }` (trimmet i klienten; tomt navn afvises både i klient og RPC).
- **Validering:** navn ikke tomt (`ORG_NAME_REQUIRED`); unikt case-/whitespace-insensitivt (`organisations_name_unique` på `lower(trim(name))` → 23505 → `errors:duplicateOrganisationName`).
- **Business logic / DB:** se `04-kode/03-organisation-roller.md` §3.
- **Response:** organisationsrækken → `toOrganisation()`.
- **Cache:** invaliderer `Organisation, Profile, Privilege, Membership`.

### `POST /rest/v1/rpc/reserve_item_units` (← `categoryApi.reserveItemUnits`)
- **Formål:** Reservér N af et item til en opgave; systemet vælger/splitter enheder (FIFO efter `created_at`).
- **Body:** `{ p_task_id, p_item_id, p_quantity, p_location_id, p_restrict_location }` – `p_restrict_location = locationId !== undefined` (dvs. `null` betyder "enheder uden lager", udeladt betyder "alle lagre").
- **Guards:** aktiv org, `p_quantity > 0`, opgave og item i org, `update_tasks`.
- **Fejl:** `INSUFFICIENT_AVAILABLE_QUANTITY` (med manglende mængde i teksten), `TASK_NOT_FOUND`, `ITEM_NOT_FOUND`, 42501 → `errors:permission.reserveItemUnits`.
- **Response:** `task_material_id`.
- **Cache:** `taskMaterialTags(taskId, itemId)`.

### `POST /rest/v1/rpc/set_task_status` (← `taskApi.updateTaskStatus`)
- **Body:** `{ p_task_id, p_status: 'Started'|'InProgress'|'Completed' }`.
- **Auth:** tilmeldt **eller** `update_tasks`.
- **Logik:** `Completed` kræver afrapporterede materialer; `InProgress` flytter `Reserved → InUse`; `finished_at` sættes/nulstilles.
- **Mangler:** tjek af `requires_approval` og gyldige overgange (se `04-kode/05-opgaver.md`).
- **Response:** `void`; klienten henter derefter opgaven igen (kan være `null`, hvis den ikke længere er synlig).

### `POST /rest/v1/rpc/approve_task_request` (← `taskApi.approveTaskRequest`)
- **Body:** `{ p_request_id }`.
- **Auth:** `approve_task` + rum-adgang til opgaven.
- **Logik:** anvend gemte materialeudfald → tjek afrapportering → anmodning(er) `Accepted` → opgave `Completed` → notifikation.
- **Fejl:** `TASK_REQUEST_NOT_FOUND`, `TASK_REQUEST_ALREADY_HANDLED`, `OUTCOME_QUANTITY_MISMATCH`, `MATERIALS_NOT_RESOLVED`.
- **Cache:** invaliderer opgavens tags, `Item/LIST` og `Conversation`.

### `POST /rest/v1/rpc/get_statistics` (← `statisticApi.getStatistics`)
- **Body:** `{ p_start, p_end, p_granularity: 'hour'|'day'|'week'|'month'|'quarter', p_tz, p_room_id?, p_category_id? }` – `null/null` = hele perioden.
- **Auth:** `read_statistics`.
- **Validering:** `p_end > p_start`, rum/kategori i org (kategori skal være hovedkategori).
- **Response:** `jsonb` med KPI'er, trends, serier, fordelinger, "lige nu" m.m. (`StatisticsResult`).

### `GET /rest/v1/messages` + Realtime (← `messageApi.getMessages`)
- **Query:** `?select=id,conversation_id,sender_id,content,created_at,message_type,edited_at,deleted_at&conversation_id=eq.<id>&order=created_at.asc`.
- **Auth:** RLS (deltager eller org-admin; aktiv org; rum-adgang).
- **Realtime:** kanal `messages:<id>`, `INSERT` og `UPDATE` filtreret på `conversation_id`.
- **Begrænsning:** ingen paginering (se `10-performance.md`).

### `POST /rest/v1/rpc/reset_password_prototype` (← `authApi.resetPassword`)
- **Auth:** **ingen** (anon). **Body:** `{ p_email, p_first_name, p_last_name, p_new_password }`.
- **Validering:** kode ≥ 6 tegn; email+navne skal matche én profil (case-insensitivt).
- **Fejl:** `PASSWORD_TOO_SHORT`, `RESET_DETAILS_NO_MATCH` (samme fejl uanset hvilket felt der var forkert).
- **Sikkerhed:** se `08-security.md` §8.3.1 – må ikke deployes.
