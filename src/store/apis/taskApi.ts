import { listTags, supabaseApi, taskMaterialTags, taskTags, type ApiTag } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type {
    CompletedTaskDetails,
    CreateRoomInput,
    ETaskPriority,
    ETaskStatus,
    PendingTaskRequest,
    RejectTaskRequestInput,
    ReviewTaskRequestInput,
    Room,
    Task,
    TaskAssignee,
    TaskAssignmentInput,
    TaskMaterial,
    TaskMaterialOutcome,
    TaskMaterialStatusGroup,
    TaskRequest,
    TaskRequestDetails,
    UpdateRoomInput,
} from '../../types/Task/Task'

import type { ItemLocation, ItemStatus } from '../../types/dataLayer/datalayerTypes'
import { toItemLocation } from './categoryApi'
import { locationPathLabel } from '../../utils/locationPathLabel'
import { mapDbError, mapPermissionError, runQuery } from './apiError'
import { getActiveOrganisationId, getCurrentUserId } from './session'
import { fetchProfilesByIds } from './profileApi'
import { formatFullName } from '../../utils/personName'
import { OPEN_TASK_STATUSES } from '../../utils/taskDisplay'

interface CreateTaskInput {
    title: string
    description: string
    start_date: string | null
    end_date: string | null
    priority: ETaskPriority | null
    max_assignees: number | null
    requires_approval: boolean
    room_id?: string | null
}

interface UpdateTaskInput {
    id: string
    title: string
    description: string
    priority: ETaskPriority | null
    start_date: string | null
    end_date: string | null
    max_assignees: number | null
    room_id?: string | null
}

type RoomRow = Omit<Room, 'role_ids'> & { task_room_roles?: { role_id: string }[] }

const toRoom = ({ task_room_roles, ...room }: RoomRow): Room => ({
    ...room,
    role_ids: (task_room_roles ?? []).map((r) => r.role_id),
})

interface UpdateTaskStatusInput {
    id: string
    status: ETaskStatus
}

// Tilmeld/afmeld/fjern: tilmeldte, opgavelisten, "Mine opgaver" og
// opgavens chat (deltagerne følger de tilmeldte).
const assignmentTags = (taskId: string): ApiTag[] => ['Conversation', 'MyTasks', taskTags.list, taskTags.assignees(taskId)]

export const taskApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        getTasks: builder.query<Task[], void>({
            queryFn: () => runQuery(async () => {
                const organisationId = await getActiveOrganisationId()
                const { data, error } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('organisation_id', organisationId)

                if (error) return { error: mapDbError(error) }
                return { data: (data ?? []) as Task[] }
            }),
            providesTags: (result) => listTags('Task', result),
        }),

        // US-70: alle afsluttede opgaver i aktiv organisation, med rum-navn,
        // tilmeldte (navne) og materialer (navn + mængde) samlet ind via
        // batch-opslag - samme mønster som roleApi.ts/messageApi.ts'
        // profil-batch-opslag, da getTasks ikke selv joiner disse relationer.
        getCompletedTasks: builder.query<CompletedTaskDetails[], void>({
            queryFn: () => runQuery(async () => {
                const organisationId = await getActiveOrganisationId()
                const { data: tasks, error: tasksError } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('organisation_id', organisationId)
                    .eq('status', 'Completed')

                if (tasksError) return { error: mapDbError(tasksError) }
                if (!tasks || tasks.length === 0) return { data: [] }

                const taskIds = tasks.map((task) => task.id)

                const [assigneesResult, materialsResult] = await Promise.all([
                    supabase.from('task_assignees').select('task_id,user_id').in('task_id', taskIds),
                    supabase.from('task_materials').select('task_id,item_id,quantity').in('task_id', taskIds),
                ])

                if (assigneesResult.error) {
                    return { error: mapDbError(assigneesResult.error) }
                }
                if (materialsResult.error) {
                    return { error: mapDbError(materialsResult.error) }
                }

                const assigneeRows = assigneesResult.data ?? []
                const materialRows = materialsResult.data ?? []

                const userIds = assigneeRows.map((row) => row.user_id)
                const itemIds = [...new Set(materialRows.map((row) => row.item_id))]
                const roomIds = [...new Set(tasks.map((task) => task.room_id).filter((id): id is string => id !== null))]

                const [profileById, itemsResult, roomsResult] = await Promise.all([
                    fetchProfilesByIds(userIds),
                    itemIds.length > 0
                        ? supabase.from('data_layer_items').select('id,name').in('id', itemIds)
                        : Promise.resolve({ data: [], error: null }),
                    roomIds.length > 0
                        ? supabase.from('task_rooms').select('id,name').in('id', roomIds)
                        : Promise.resolve({ data: [], error: null }),
                ])

                if (itemsResult.error) {
                    return { error: mapDbError(itemsResult.error) }
                }
                if (roomsResult.error) {
                    return { error: mapDbError(roomsResult.error) }
                }

                const itemNameById = new Map((itemsResult.data ?? []).map((item) => [item.id, item.name as string]))
                const roomNameById = new Map((roomsResult.data ?? []).map((room) => [room.id, room.name as string]))

                const data: CompletedTaskDetails[] = tasks.map((task) => ({
                    ...(task as Task),
                    roomName: task.room_id ? (roomNameById.get(task.room_id) ?? null) : null,
                    assignees: assigneeRows
                        .filter((row) => row.task_id === task.id)
                        .map((row) => {
                            const profile = profileById.get(row.user_id)
                            return { id: row.user_id, name: formatFullName(profile?.first_name, profile?.last_name) }
                        }),
                    materials: materialRows
                        .filter((row) => row.task_id === task.id)
                        .map((row) => ({
                            itemId: row.item_id,
                            name: itemNameById.get(row.item_id) ?? '',
                            quantity: row.quantity,
                        })),
                }))

                // Sorted client-side in CompletedTasksPanel (user-selectable).
                return { data }
            }),
            providesTags: [{ type: 'Task' as const, id: 'LIST' }],
        }),

        // Navne på tilmeldte pr. åben opgave (Started/InProgress) i aktiv
        // organisation - bruges af søgefeltet på /tasks og /tasks/mine.
        // Samme batch-mønster som getCompletedTasks. Tilmeld/afmeld
        // invaliderer 'MyTasks' + Task LIST, så navnene følger med.
        getOpenTaskAssigneeNames: builder.query<Record<string, string[]>, void>({
            queryFn: () => runQuery(async () => {
                const organisationId = await getActiveOrganisationId()
                const { data: tasks, error: tasksError } = await supabase
                    .from('tasks')
                    .select('id')
                    .eq('organisation_id', organisationId)
                    .in('status', OPEN_TASK_STATUSES)

                if (tasksError) return { error: mapDbError(tasksError) }
                if (!tasks || tasks.length === 0) return { data: {} }

                const { data: assigneeRows, error: assigneesError } = await supabase
                    .from('task_assignees')
                    .select('task_id,user_id')
                    .in('task_id', tasks.map((task) => task.id))

                if (assigneesError) return { error: mapDbError(assigneesError) }

                const profileById = await fetchProfilesByIds((assigneeRows ?? []).map((row) => row.user_id))

                const data: Record<string, string[]> = {}
                for (const row of assigneeRows ?? []) {
                    const profile = profileById.get(row.user_id)
                    const name = formatFullName(profile?.first_name, profile?.last_name)
                    if (!name) continue
                    ;(data[row.task_id] ??= []).push(name)
                }
                return { data }
            }),
            providesTags: ['MyTasks', taskTags.list],
        }),

        getRooms: builder.query<Room[], void>({
            queryFn: () => runQuery(async () => {
                const organisationId = await getActiveOrganisationId()
                const { data, error } = await supabase
                    .from('task_rooms')
                    .select('*, task_room_roles(role_id)')
                    .eq('organisation_id', organisationId)
                    .order('created_at', { ascending: true })

                if (error) return { error: mapDbError(error) }
                return { data: ((data ?? []) as RoomRow[]).map(toRoom) }
            }),
            providesTags: (result) => listTags('TaskRoom', result),
        }),

        createTask: builder.mutation<Task, CreateTaskInput>({
            queryFn: ({ title, description, start_date, end_date, priority, max_assignees, requires_approval, room_id }) => runQuery(async () => {
                const organisationId = await getActiveOrganisationId()
                const { data, error } = await supabase
                    .from('tasks')
                    .insert({
                        organisation_id: organisationId,
                        title,
                        description,
                        start_date,
                        end_date,
                        priority,
                        status: 'Started',
                        max_assignees,
                        requires_approval,
                        room_id,
                    })
                    .select()
                    .single()

                if (error) return { error: mapPermissionError(error, 'createTask') }
                return { data: data as Task }
            }),
            invalidatesTags: [{ type: 'Task', id: 'LIST' }],
        }),

        updateTask: builder.mutation<Task, UpdateTaskInput>({
            queryFn: ({
                id,
                title,
                description,
                start_date,
                end_date,
                priority,
                max_assignees,
                room_id,
            }) => runQuery(async () => {
                const organisationId = await getActiveOrganisationId()

                const { data, error } = await supabase
                    .from('tasks')
                    .update({
                        title,
                        description,
                        start_date,
                        end_date,
                        priority,
                        max_assignees,
                        room_id,
                    })
                    .eq('id', id)
                    .eq('organisation_id', organisationId)
                    .select()
                    .single()

                if (error) {
                    return { error: mapPermissionError(error, 'updateTask') }
                }

                return { data: data as Task }
            }),
            invalidatesTags: (_result, _error, { id }) => [
                'Conversation',
                { type: 'Task', id },
                { type: 'Task', id: 'LIST' },
            ],
        }),

        // Rum + rolle-begrænsning oprettes/redigeres atomisk via RPC'er
        // (task_room_roles har kun en select-policy).
        createRoom: builder.mutation<Room, CreateRoomInput>({
            queryFn: ({ name, roleIds }) => runQuery(async () => {
                const { data, error } = await supabase.rpc('create_task_room', {
                    p_name: name,
                    p_role_ids: roleIds,
                })

                if (error) return { error: mapPermissionError(error, 'createRoom') }
                return { data: { ...(data as Omit<Room, 'role_ids'>), role_ids: roleIds } }
            }),
            invalidatesTags: [{ type: 'TaskRoom', id: 'LIST' }, 'Conversation'],
        }),

        updateRoom: builder.mutation<Room, UpdateRoomInput>({
            queryFn: ({ id, name, roleIds }) => runQuery(async () => {
                const { data, error } = await supabase.rpc('update_task_room', {
                    p_room_id: id,
                    p_name: name,
                    p_role_ids: roleIds,
                })

                if (error) {
                    return { error: mapPermissionError(error, 'updateRoom') }
                }

                return { data: { ...(data as Omit<Room, 'role_ids'>), role_ids: roleIds } }
            }),
            // Rollerne styrer hvilke opgaver der er synlige (RLS).
            invalidatesTags: (_result, _error, { id }) => [
                'Conversation',
                { type: 'TaskRoom', id },
                { type: 'TaskRoom', id: 'LIST' },
                { type: 'Task', id: 'LIST' },
                'MyTasks',
            ],
        }),

        // Fase 3: en rå UPDATE på tasks.status kræver nu update_tasks, hvilket
        // ville blokere en almindelig tilmeldts selvbetjente "markér som
        // færdig"/"genåbn". Kalder i stedet set_task_status-RPC'en
        // (fase3-tasks-privileges.sql), som tillader ENTEN en tilmeldt bruger
        // ELLER update_tasks/admin.
        // Returnerer null, hvis opgaven ikke længere er synlig efter
        // statusskiftet (Completed uden view_completed_tasks og uden at være
        // tilmeldt) - statusskiftet er stadig lykkedes.
        updateTaskStatus: builder.mutation<Task | null, UpdateTaskStatusInput>({
            queryFn: async ({ id, status }) => {
                const { error: rpcError } = await supabase.rpc('set_task_status', {
                    p_task_id: id,
                    p_status: status,
                })

                if (rpcError) return { error: mapPermissionError(rpcError, 'setTaskStatus') }

                const { data, error } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle()

                if (error) return { error: mapDbError(error) }
                return { data: (data as Task | null) ?? null }
            },
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Task', id }, { type: 'Task', id: 'LIST' }, 'Conversation'],
        }),
        getTaskAssignees: builder.query<TaskAssignee[], string>({
            queryFn: (taskId) => runQuery(async () => {
                const { data, error } = await supabase
                    .from('task_assignees')
                    .select('user_id, assigned_by, assigned_at')
                    .eq('task_id', taskId)
                if (error) {
                    return { error: mapDbError(error) }
                }
                return {
                    data: (data ?? []) as TaskAssignee[],
                }
            }),
            providesTags: (_result, _error, taskId) => [taskTags.assignees(taskId)],
        }),

        // materialOutcomes: den tildeltes valg af udfald pr. uafrapporteret
        // materiale-linje (US-42), gemt som DATA på anmodningen - selve
        // afrapporteringen (statusændring på enhederne) sker først i
        // approve_task_request, ved godkendelse. Afvises anmodningen i
        // stedet, forbliver materialerne urørt (Reserved/InUse) - se
        // 2026-09-23-defer-material-resolution-to-approval.sql.
        createTaskRequest: builder.mutation<
            TaskRequest,
            { taskId: string; materialOutcomes?: TaskMaterialOutcome[] }
        >({
            queryFn: ({ taskId, materialOutcomes }) => runQuery(async () => {
                const userId = await getCurrentUserId()
                const { data: existingRequest, error: existingRequestError } =
                    await supabase
                        .from('task_requests')
                        .select('*')
                        .eq('task_id', taskId)
                        .eq('requested_by', userId)
                        .eq('status', 'Pending')
                        .maybeSingle()

                if (existingRequestError) {
                    return { error: mapDbError(existingRequestError) }
                }

                if (existingRequest) {
                    return {
                        data: existingRequest as TaskRequest,
                    }
                }

                // Opret ny completion request
                const { data, error } = await supabase
                    .from('task_requests')
                    .insert({
                        task_id: taskId,
                        requested_by: userId,
                        status: 'Pending',
                        material_outcomes: materialOutcomes ?? null,
                    })
                    .select()
                    .single()

                if (error) {
                    return {
                        error: mapPermissionError(error, 'finishTask'),
                    }
                }

                return {
                    data: data as TaskRequest,
                }
            }),

            invalidatesTags: (_result, _error, { taskId }) => [
                taskTags.pendingRequests,
                taskTags.requests(taskId),
                taskTags.one(taskId),
                taskTags.list,
            ],
        }),

        getTaskRequests: builder.query<TaskRequest[], string>({
            queryFn: (taskId) => runQuery(async () => {
                const { data, error } = await supabase
                    .from('task_requests')
                    .select('*')
                    .eq('task_id', taskId)
                    .order('requested_at', { ascending: false })

                if (error) {
                    return { error: mapDbError(error) }
                }

                return {
                    data: (data ?? []) as TaskRequest[],
                }
            }),
            providesTags: (_result, _error, taskId) => [taskTags.requests(taskId)],
        }),

        // Godkend/afvis opgave-færdigmelding. Listen og begge handlinger går
        // via security definer-RPC'er (approve_task_request/
        // reject_task_request/get_pending_task_requests), som selv tjekker
        // approve_task/reject_task - 42501 mappes til en dansk fejlbesked.
        getPendingTaskRequests: builder.query<PendingTaskRequest[], void>({
            queryFn: async () => {
                const { data, error } = await supabase.rpc('get_pending_task_requests')

                if (error) return { error: mapPermissionError(error, 'readTaskApprovals') }

                type Row = {
                    id: string
                    task_id: string
                    task_title: string
                    requested_by: string
                    requester_first_name: string | null
                    requester_last_name: string | null
                    requested_at: string
                    rejection_count?: number
                    room_id: string | null
                    room_name: string | null
                    priority: ETaskPriority | null
                    end_date: string | null
                }

                return {
                    data: ((data ?? []) as Row[]).map((row) => ({
                        id: row.id,
                        taskId: row.task_id,
                        taskTitle: row.task_title,
                        requestedBy: row.requested_by,
                        requesterName:
                            formatFullName(row.requester_first_name, row.requester_last_name),
                        requestedAt: row.requested_at,
                        rejectionCount: row.rejection_count ?? 0,
                        roomId: row.room_id,
                        roomName: row.room_name,
                        priority: row.priority,
                        endDate: row.end_date,
                    })),
                }
            },
            providesTags: [taskTags.pendingRequests],
        }),

        // Detaljer for én færdigmelding (opgave, tilmeldte, materialer +
        // foreslåede udfald), til godkenderens detalje-modal. Security
        // definer-RPC, da en godkender ikke nødvendigvis har read_tasks.
        getTaskRequestDetails: builder.query<TaskRequestDetails, string>({
            queryFn: async (requestId) => {
                const { data, error } = await supabase.rpc('get_task_request_details', { p_request_id: requestId })

                if (error) return { error: mapPermissionError(error, 'readTaskApprovals') }

                type Row = {
                    task: {
                        id: string
                        title: string
                        description: string | null
                        priority: ETaskPriority | null
                        status: ETaskStatus
                        start_date: string | null
                        end_date: string | null
                        requires_approval: boolean
                        room_name: string | null
                    }
                    requester_name: string
                    requested_at: string
                    assignees: string[]
                    materials: {
                        id: string
                        item_name: string
                        unit_of_measurement: string | null
                        quantity: number
                        linked_groups: TaskMaterialStatusGroup[]
                        location_labels: string[]
                        has_units_without_location: boolean
                        proposed_outcomes: TaskMaterialStatusGroup[] | null
                    }[]
                    previous_rejections?: {
                        reason: string | null
                        rejected_at: string | null
                        rejected_by_name: string
                        requester_name: string
                        requested_at: string
                    }[]
                }

                const row = data as Row
                const toGroups = (groups: TaskMaterialStatusGroup[]) =>
                    groups.map((g) => ({ status: g.status, quantity: Number(g.quantity) }))

                return {
                    data: {
                        task: {
                            id: row.task.id,
                            title: row.task.title,
                            description: row.task.description,
                            priority: row.task.priority,
                            status: row.task.status,
                            start_date: row.task.start_date,
                            end_date: row.task.end_date,
                            requires_approval: row.task.requires_approval,
                        },
                        roomName: row.task.room_name,
                        requesterName: row.requester_name ?? '',
                        requestedAt: row.requested_at,
                        assignees: row.assignees,
                        materials: row.materials.map((m) => ({
                            id: m.id,
                            itemName: m.item_name,
                            unitOfMeasurement: m.unit_of_measurement ?? '',
                            quantity: Number(m.quantity),
                            linkedGroups: toGroups(m.linked_groups),
                            locationLabels: m.location_labels,
                            hasUnitsWithoutLocation: m.has_units_without_location,
                            proposedOutcomes: m.proposed_outcomes ? toGroups(m.proposed_outcomes) : null,
                        })),
                        previousRejections: (row.previous_rejections ?? []).map((r) => ({
                            reason: r.reason,
                            rejectedAt: r.rejected_at,
                            rejectedByName: r.rejected_by_name ?? '',
                            requesterName: r.requester_name ?? '',
                            requestedAt: r.requested_at,
                        })),
                    },
                }
            },
            // Samme tag som listen, så godkend/afvis også genindlæser detaljerne.
            providesTags: [taskTags.pendingRequests],
        }),

        approveTaskRequest: builder.mutation<void, ReviewTaskRequestInput>({
            queryFn: async ({ requestId }) => {
                const { error } = await supabase.rpc('approve_task_request', { p_request_id: requestId })

                if (error) return { error: mapPermissionError(error, 'approveTasks') }
                return { data: undefined }
            },
            invalidatesTags: (_result, _error, { taskId }) => [
                'Conversation',
                taskTags.pendingRequests,
                taskTags.requests(taskId),
                taskTags.one(taskId),
                taskTags.materials(taskId),
                taskTags.list,
                { type: 'Item', id: 'LIST' },
            ],
        }),

        // reason er påkrævet (håndhæves også i RPC'en) - gemmes på anmodningen
        // og sendes med i task_rejected-notifikationen til de tilmeldte.
        rejectTaskRequest: builder.mutation<void, RejectTaskRequestInput>({
            queryFn: async ({ requestId, reason }) => {
                const { error } = await supabase.rpc('reject_task_request', { p_request_id: requestId, p_reason: reason })

                if (error) return { error: mapPermissionError(error, 'rejectTasks') }
                return { data: undefined }
            },
            invalidatesTags: (_result, _error, { taskId }) => [taskTags.pendingRequests, taskTags.requests(taskId)],
        }),

        assignToTask: builder.mutation<void, TaskAssignmentInput>({
            queryFn: ({ taskId, userId }) => runQuery(async () => {
                const assignedBy = await getCurrentUserId()
                const { error } = await supabase
                    .from('task_assignees')
                    .insert({
                        task_id: taskId,
                        user_id: userId,
                        assigned_by: assignedBy,
                    })
                if (error) {
                    return { error: mapPermissionError(error, 'assignEmployee') }
                }
                return {
                    data: undefined,
                }
            }),
            invalidatesTags: (_result, _error, { taskId }) => assignmentTags(taskId),
        }),
        unassignFromTask: builder.mutation<void, Pick<TaskAssignmentInput, 'taskId'>>({
            queryFn: ({ taskId }) => runQuery(async () => {
                const userId = await getCurrentUserId()
                const { error } = await supabase
                    .from('task_assignees')
                    .delete()
                    .eq('task_id', taskId)
                    .eq('user_id', userId)
                    .eq('assigned_by', userId);
                if (error) {
                    return { error: mapPermissionError(error, 'unassignSelf') };
                }
                return {
                    data: undefined,
                };
            }),
            invalidatesTags: (_result, _error, { taskId }) => assignmentTags(taskId),
        }),

        removeAssigneeFromTask: builder.mutation<void, TaskAssignmentInput>({
            queryFn: ({ taskId, userId }) => runQuery(async () => {
                await getCurrentUserId()

                const { error } = await supabase
                    .from('task_assignees')
                    .delete()
                    .eq('task_id', taskId)
                    .eq('user_id', userId)

                if (error) {
                    return { error: mapPermissionError(error, 'removeEmployee') }
                }

                return {
                    data: undefined,
                }
            }),
            invalidatesTags: (_result, _error, { taskId }) => assignmentTags(taskId),
        }),

        getMyTaskIds: builder.query<string[], void>({
            queryFn: () => runQuery(async () => {
                const userId = await getCurrentUserId()
                const { data, error } = await supabase
                    .from('task_assignees')
                    .select('task_id')
                    .eq('user_id', userId);
                if (error) {
                    return { error: mapDbError(error) };
                }
                return {
                    data: (data ?? []).map((assignment) => assignment.task_id),
                };
            }),
            providesTags: ['MyTasks'],
        }),

        deleteRoom: builder.mutation<
            void,
            {
                roomId: string
                taskIdsToDelete: string[]
            }
        >({
            queryFn: ({ roomId, taskIdsToDelete }) => runQuery(async () => {
                const organisationId =
                    await getActiveOrganisationId()

                // Slet de opgaver brugeren har valgt
                if (taskIdsToDelete.length > 0) {
                    const { error: deleteTasksError } =
                        await supabase
                            .from('tasks')
                            .delete()
                            .in('id', taskIdsToDelete)
                            .eq('organisation_id', organisationId)

                    if (deleteTasksError) {
                        return { error: mapPermissionError(deleteTasksError, 'deleteRoomTasks') }
                    }
                }

                // Flyt resterende opgaver til "Uden rum"
                const { error: updateTasksError } =
                    await supabase
                        .from('tasks')
                        .update({
                            room_id: null,
                        })
                        .eq('room_id', roomId)
                        .eq('organisation_id', organisationId)

                if (updateTasksError) {
                    return { error: mapPermissionError(updateTasksError, 'moveRoomTasks') }
                }

                // Slet selve rummet
                const { error: deleteRoomError } =
                    await supabase
                        .from('task_rooms')
                        .delete()
                        .eq('id', roomId)
                        .eq('organisation_id', organisationId)

                if (deleteRoomError) {
                    return { error: mapPermissionError(deleteRoomError, 'deleteRoom') }
                }

                return { data: undefined }
            }),
            invalidatesTags: (_result, _error, { roomId }) => [
                'Conversation',
                { type: 'TaskRoom', id: roomId },
                { type: 'TaskRoom', id: 'LIST' },
                { type: 'Task', id: 'LIST' },
                'MyTasks',
                // Slettede opgavers materialer frigives af en trigger.
                { type: 'Item', id: 'LIST' },
            ],
        }),

        deleteTask: builder.mutation<void, string>({
            queryFn: (taskId) => runQuery(async () => {
                const organisationId = await getActiveOrganisationId()

                const { error } = await supabase
                    .from('tasks')
                    .delete()
                    .eq('id', taskId)
                    .eq('organisation_id', organisationId)

                if (error) {
                    return { error: mapPermissionError(error, 'deleteTask') }
                }

                return { data: undefined }
            }),
            invalidatesTags: (_result, _error, taskId) => [
                'Conversation',
                { type: 'Task', id: taskId },
                { type: 'Task', id: 'LIST' },
                'MyTasks',
                // Triggeren release_units_on_task_material_delete frigiver materialer.
                { type: 'Item', id: 'LIST' },
            ],
        }),

        // US-42: afrapporterer det faktiske udfald af en opgaves materiale-
        // linje ved færdiggørelse (fx "8 retur, 1 i stykker"). Kræves før
        // set_task_status/approve_task_request tillader Completed - se
        // assert_task_materials_resolved i docs/dbSchema.sql §15.21.
        // outcomes-statusser er 'ItemStatus'-værdier, ikke opgave-statusser.
        resolveTaskMaterialUnits: builder.mutation<
            void,
            { taskMaterialId: string; taskId: string; itemId: string; outcomes: TaskMaterialStatusGroup[] }
        >({
            queryFn: async ({ taskMaterialId, outcomes }) => {
                const { error } = await supabase.rpc('resolve_task_material_units', {
                    p_task_material_id: taskMaterialId,
                    p_outcomes: outcomes,
                })

                if (error) {
                    return { error: mapPermissionError(error, 'resolveTaskMaterialUnits') }
                }

                return { data: undefined }
            },
            invalidatesTags: (_result, _error, { taskId, itemId }) => taskMaterialTags(taskId, itemId),
        }),

        // Materialer tilknyttet en opgave (US-42/US-43) - task_materials
        // joinet med item-navn/enhed, plus om linjen stadig har linkede
        // task_material_units (= stadig reserveret, ikke afrapporteret),
        // summeret pr. aktuel enheds-status (linkedGroups).
        getTaskMaterials: builder.query<TaskMaterial[], string>({
            queryFn: async (taskId) => {
                const { data: materials, error: materialsError } = await supabase
                    .from('task_materials')
                    .select('id, item_id, quantity')
                    .eq('task_id', taskId)

                if (materialsError) {
                    return { error: mapDbError(materialsError) }
                }
                if (!materials || materials.length === 0) {
                    return { data: [] }
                }

                const materialIds = materials.map((m) => m.id)
                const itemIds = [...new Set(materials.map((m) => m.item_id))]

                const [itemsResult, linkedUnitsResult] = await Promise.all([
                    supabase.from('data_layer_items').select('id, name, unit_of_measurement').in('id', itemIds),
                    supabase
                        .from('task_material_units')
                        .select('task_material_id, data_layer_item_units(status, quantity, location_id)')
                        .in('task_material_id', materialIds),
                ])

                if (itemsResult.error) {
                    return { error: mapDbError(itemsResult.error) }
                }
                if (linkedUnitsResult.error) {
                    return { error: mapDbError(linkedUnitsResult.error) }
                }

                const itemById = new Map((itemsResult.data ?? []).map((i) => [i.id, i]))
                // Sum linked quantity per status per material line, and
                // collect which locations the linked units are on.
                const groupsByMaterial = new Map<string, Map<ItemStatus, number>>()
                const locationIdsByMaterial = new Map<string, Set<string | null>>()
                for (const row of linkedUnitsResult.data ?? []) {
                    const unit = row.data_layer_item_units as unknown as
                        { status: ItemStatus; quantity: number; location_id: string | null } | null
                    if (!unit) continue
                    const groups = groupsByMaterial.get(row.task_material_id) ?? new Map<ItemStatus, number>()
                    groups.set(unit.status, (groups.get(unit.status) ?? 0) + Number(unit.quantity))
                    groupsByMaterial.set(row.task_material_id, groups)
                    const locationIds = locationIdsByMaterial.get(row.task_material_id) ?? new Set<string | null>()
                    locationIds.add(unit.location_id)
                    locationIdsByMaterial.set(row.task_material_id, locationIds)
                }

                // Linked units' locations, plus their parent warehouses (for
                // "Lager > Sektion" labels).
                const fetchLocations = async (ids: string[]) => {
                    if (ids.length === 0) return { rows: [] as ItemLocation[], error: null }
                    const { data, error } = await supabase
                        .from('locations')
                        .select('id, name, organisation_id, parent_location_id')
                        .in('id', ids)
                    return { rows: (data ?? []).map(toItemLocation), error }
                }

                const unitLocationIds = [...new Set(
                    [...locationIdsByMaterial.values()].flatMap((ids) => [...ids]).filter((id): id is string => id !== null)
                )]
                const unitLocations = await fetchLocations(unitLocationIds)
                if (unitLocations.error) {
                    return { error: mapDbError(unitLocations.error) }
                }
                const parentIds = [...new Set(
                    unitLocations.rows
                        .map((l) => l.parentLocationId)
                        .filter((id): id is string => !!id && !unitLocationIds.includes(id))
                )]
                const parentLocations = await fetchLocations(parentIds)
                if (parentLocations.error) {
                    return { error: mapDbError(parentLocations.error) }
                }
                const locations = [...unitLocations.rows, ...parentLocations.rows]

                // null = units without a location; the UI translates that.
                const locationLabelOf = (id: string | null): string | null => {
                    if (id === null) return null
                    const location = locations.find((l) => l.id === id)
                    return location ? locationPathLabel(location, locations) : null
                }

                return {
                    data: materials.map((m) => {
                        const linkedGroups = [...(groupsByMaterial.get(m.id) ?? new Map<ItemStatus, number>())]
                            .map(([status, quantity]) => ({ status, quantity }))
                        return {
                            id: m.id,
                            itemId: m.item_id,
                            itemName: itemById.get(m.item_id)?.name ?? '',
                            unitOfMeasurement: itemById.get(m.item_id)?.unit_of_measurement ?? '',
                            quantity: m.quantity,
                            linkedGroups,
                            resolved: linkedGroups.length === 0,
                            locationLabels: [...(locationIdsByMaterial.get(m.id) ?? [])]
                                .map(locationLabelOf)
                                .filter((label): label is string => label !== null),
                            hasUnitsWithoutLocation: (locationIdsByMaterial.get(m.id) ?? new Set()).has(null),
                        }
                    }),
                }
            },
            providesTags: (_result, _error, taskId) => [taskTags.materials(taskId)],
        }),

    }),
})

export const {
    useGetTasksQuery,
    useGetCompletedTasksQuery,
    useGetOpenTaskAssigneeNamesQuery,
    useGetRoomsQuery,
    useGetTaskAssigneesQuery,
    useGetTaskRequestsQuery,
    useCreateTaskRequestMutation,
    useGetPendingTaskRequestsQuery,
    useGetTaskRequestDetailsQuery,
    useApproveTaskRequestMutation,
    useRejectTaskRequestMutation,
    useCreateTaskMutation,
    useCreateRoomMutation,
    useUpdateTaskMutation,
    useUpdateTaskStatusMutation,
    useUpdateRoomMutation,
    useDeleteRoomMutation,
    useDeleteTaskMutation,
    useAssignToTaskMutation,
    useUnassignFromTaskMutation,
    useRemoveAssigneeFromTaskMutation,
    useGetMyTaskIdsQuery,
    useResolveTaskMaterialUnitsMutation,
    useGetTaskMaterialsQuery,
} = taskApi