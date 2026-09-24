import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type {
    CompletedTaskDetails,
    ETaskPriority,
    ETaskStatus,
    PendingTaskRequest,
    ReviewTaskRequestInput,
    Room,
    Task,
    TaskAssignee,
    TaskMaterial,
} from '../../types/Task/Task'

import type { ItemStatus } from '../../types/dataLayer/datalayerTypes'
import { mapDbError, mapPermissionError, type QueryError } from './apiError'

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

interface CreateRoomInput {
    name: string
}

interface UpdateRoomInput {
    id: string
    name: string
}

interface UpdateTaskStatusInput {
    id: string
    status: ETaskStatus
}

interface AssignToTaskInput {
    taskId: string
    userId: string
}

interface RemoveAssigneeInput {
    taskId: string
    userId: string
}

interface TaskRequest {
    id: string
    task_id: string
    requested_by: string
    requested_at: string
    status: 'Pending' | 'Accepted' | 'Rejected'
    handled_by: string | null
    done_at: string | null
}


async function getAuthenticatedOrganisationId(): Promise<string> {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
        throw new Error('errors:loginRequiredForAction')
    }

    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_organisation_id')
        .eq('id', authData.user.id)
        .single()

    if (profileError || !profileData?.active_organisation_id) {
        throw new Error('errors:organisationLookupFailed')
    }

    return profileData.active_organisation_id
}

export const taskApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        getTasks: builder.query<Task[], void>({
            queryFn: async () => {
                try {
                    const organisationId = await getAuthenticatedOrganisationId()
                    const { data, error } = await supabase
                        .from('tasks')
                        .select('*')
                        .eq('organisation_id', organisationId)

                    if (error) return { error: mapDbError(error) as QueryError }
                    return { data: (data ?? []) as Task[] }
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'errors:generic'
                    return { error: { status: 'CUSTOM_ERROR', error: message } as QueryError }
                }
            },
            providesTags: (result) =>
                result
                    ? [
                        { type: 'Task' as const, id: 'LIST' },
                        ...result.map((task) => ({ type: 'Task' as const, id: task.id })),
                    ]
                    : [{ type: 'Task' as const, id: 'LIST' }],
        }),

        // US-70: alle afsluttede opgaver i aktiv organisation, med rum-navn,
        // tilmeldte (navne) og materialer (navn + mængde) samlet ind via
        // batch-opslag - samme mønster som roleApi.ts/messageApi.ts'
        // profil-batch-opslag, da getTasks ikke selv joiner disse relationer.
        getCompletedTasks: builder.query<CompletedTaskDetails[], void>({
            queryFn: async () => {
                try {
                    const organisationId = await getAuthenticatedOrganisationId()
                    const { data: tasks, error: tasksError } = await supabase
                        .from('tasks')
                        .select('*')
                        .eq('organisation_id', organisationId)
                        .eq('status', 'Completed')

                    if (tasksError) return { error: mapDbError(tasksError) as QueryError }
                    if (!tasks || tasks.length === 0) return { data: [] }

                    const taskIds = tasks.map((task) => task.id)

                    const [assigneesResult, materialsResult] = await Promise.all([
                        supabase.from('task_assignees').select('task_id,user_id').in('task_id', taskIds),
                        supabase.from('task_materials').select('task_id,item_id,quantity').in('task_id', taskIds),
                    ])

                    if (assigneesResult.error) {
                        return { error: { status: 'CUSTOM_ERROR', error: assigneesResult.error.message } as QueryError }
                    }
                    if (materialsResult.error) {
                        return { error: { status: 'CUSTOM_ERROR', error: materialsResult.error.message } as QueryError }
                    }

                    const assigneeRows = assigneesResult.data ?? []
                    const materialRows = materialsResult.data ?? []

                    const userIds = [...new Set(assigneeRows.map((row) => row.user_id))]
                    const itemIds = [...new Set(materialRows.map((row) => row.item_id))]
                    const roomIds = [...new Set(tasks.map((task) => task.room_id).filter((id): id is string => id !== null))]

                    const [profilesResult, itemsResult, roomsResult] = await Promise.all([
                        userIds.length > 0
                            ? supabase.from('profiles').select('id,first_name,last_name').in('id', userIds)
                            : Promise.resolve({ data: [], error: null }),
                        itemIds.length > 0
                            ? supabase.from('data_layer_items').select('id,name').in('id', itemIds)
                            : Promise.resolve({ data: [], error: null }),
                        roomIds.length > 0
                            ? supabase.from('task_rooms').select('id,name').in('id', roomIds)
                            : Promise.resolve({ data: [], error: null }),
                    ])

                    if (profilesResult.error) {
                        return { error: { status: 'CUSTOM_ERROR', error: profilesResult.error.message } as QueryError }
                    }
                    if (itemsResult.error) {
                        return { error: { status: 'CUSTOM_ERROR', error: itemsResult.error.message } as QueryError }
                    }
                    if (roomsResult.error) {
                        return { error: { status: 'CUSTOM_ERROR', error: roomsResult.error.message } as QueryError }
                    }

                    const profileNameById = new Map(
                        (profilesResult.data ?? []).map((profile) => [profile.id, `${profile.first_name} ${profile.last_name}`.trim()])
                    )
                    const itemNameById = new Map((itemsResult.data ?? []).map((item) => [item.id, item.name as string]))
                    const roomNameById = new Map((roomsResult.data ?? []).map((room) => [room.id, room.name as string]))

                    const data: CompletedTaskDetails[] = tasks.map((task) => ({
                        ...(task as Task),
                        roomName: task.room_id ? (roomNameById.get(task.room_id) ?? null) : null,
                        assignees: assigneeRows
                            .filter((row) => row.task_id === task.id)
                            .map((row) => ({ id: row.user_id, name: profileNameById.get(row.user_id) ?? '' })),
                        materials: materialRows
                            .filter((row) => row.task_id === task.id)
                            .map((row) => ({
                                itemId: row.item_id,
                                name: itemNameById.get(row.item_id) ?? 'Ukendt materiale',
                                quantity: row.quantity,
                            })),
                    }))

                    data.sort((a, b) => (b.end_date ?? '').localeCompare(a.end_date ?? ''))

                    return { data }
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'errors:generic'
                    return { error: { status: 'CUSTOM_ERROR', error: message } as QueryError }
                }
            },
            providesTags: [{ type: 'Task' as const, id: 'LIST' }],
        }),

        getRooms: builder.query<Room[], void>({
            queryFn: async () => {
                try {
                    const organisationId = await getAuthenticatedOrganisationId()
                    const { data, error } = await supabase
                        .from('task_rooms')
                        .select('*')
                        .eq('organisation_id', organisationId)
                        .order('created_at', { ascending: true })

                    if (error) return { error: mapDbError(error) as QueryError }
                    return { data: (data ?? []) as Room[] }
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'errors:generic'
                    return { error: { status: 'CUSTOM_ERROR', error: message } as QueryError }
                }
            },
            providesTags: (result) =>
                result
                    ? [
                        { type: 'TaskRoom' as const, id: 'LIST' },
                        ...result.map((room) => ({ type: 'TaskRoom' as const, id: room.id })),
                    ]
                    : [{ type: 'TaskRoom' as const, id: 'LIST' }],
        }),

        getOrganisationEmployees: builder.query<
            {
                id: string
                first_name: string | null
                last_name: string | null
                email: string | null
                url_picture: string | null
            }[],
            void
        >({
            queryFn: async () => {
                try {
                    const organisationId =
                        await getAuthenticatedOrganisationId()

                    // Find brugere i den aktuelle organisation
                    const { data: memberships, error: membershipError } =
                        await supabase
                            .from('memberships')
                            .select('user_id')
                            .eq('organisation_id', organisationId)

                    if (membershipError) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: membershipError.message,
                            } as QueryError,
                        }
                    }

                    if (!memberships || memberships.length === 0) {
                        return {
                            data: [],
                        }
                    }

                    const userIds = memberships.map(
                        (membership) => membership.user_id
                    )

                    // Hent profilerne for brugerne
                    const { data: profiles, error: profileError } =
                        await supabase
                            .from('profiles')
                            .select(
                                'id, first_name, last_name, email, url_picture'
                            )
                            .in('id', userIds)

                    if (profileError) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: profileError.message,
                            } as QueryError,
                        }
                    }

                    return {
                        data: (profiles ?? []).map((profile) => ({
                            id: profile.id,
                            first_name: profile.first_name,
                            last_name: profile.last_name,
                            email: profile.email,
                            url_picture: profile.url_picture,
                        })),
                    }
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'errors:generic'

                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: message,
                        } as QueryError,
                    }
                }
            },
            providesTags: ['Profile'],
        }),

        createTask: builder.mutation<Task, CreateTaskInput>({
            queryFn: async ({ title, description, start_date, end_date, priority, max_assignees, requires_approval, room_id }) => {
                try {
                    const organisationId = await getAuthenticatedOrganisationId()
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
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'errors:generic'
                    return { error: { status: 'CUSTOM_ERROR', error: message } as QueryError }
                }
            },
            invalidatesTags: [{ type: 'Task', id: 'LIST' }],
        }),

        updateTask: builder.mutation<Task, UpdateTaskInput>({
            queryFn: async ({
                id,
                title,
                description,
                start_date,
                end_date,
                priority,
                max_assignees,
                room_id,
            }) => {
                try {
                    const organisationId = await getAuthenticatedOrganisationId()

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
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'errors:generic'

                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: message,
                        } as QueryError,
                    }
                }
            },
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Task', id },
                { type: 'Task', id: 'LIST' },
            ],
        }),

        createRoom: builder.mutation<Room, CreateRoomInput>({
            queryFn: async ({ name }) => {
                try {
                    const organisationId = await getAuthenticatedOrganisationId()
                    const { data, error } = await supabase
                        .from('task_rooms')
                        .insert({
                            organisation_id: organisationId,
                            name,
                        })
                        .select()
                        .single()

                    if (error) return { error: mapPermissionError(error, 'createRoom') }
                    return { data: data as Room }
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'errors:generic'
                    return { error: { status: 'CUSTOM_ERROR', error: message } as QueryError }
                }
            },
            invalidatesTags: [{ type: 'TaskRoom', id: 'LIST' }],
        }),

        updateRoom: builder.mutation<Room, UpdateRoomInput>({
            queryFn: async ({ id, name }) => {
                try {
                    const organisationId = await getAuthenticatedOrganisationId()

                    const { data, error } = await supabase
                        .from('task_rooms')
                        .update({
                            name,
                        })
                        .eq('id', id)
                        .eq('organisation_id', organisationId)
                        .select()
                        .single()

                    if (error) {
                        return { error: mapPermissionError(error, 'updateRoom') }
                    }

                    return { data: data as Room }
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'errors:generic'

                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: message,
                        } as QueryError,
                    }
                }
            },
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'TaskRoom', id },
                { type: 'TaskRoom', id: 'LIST' },
            ],
        }),

        // Fase 3: en rå UPDATE på tasks.status kræver nu update_tasks, hvilket
        // ville blokere en almindelig tilmeldts selvbetjente "markér som
        // færdig"/"genåbn". Kalder i stedet set_task_status-RPC'en
        // (fase3-tasks-privileges.sql), som tillader ENTEN en tilmeldt bruger
        // ELLER update_tasks/admin.
        updateTaskStatus: builder.mutation<Task, UpdateTaskStatusInput>({
            queryFn: async ({ id, status }) => {
                const { error: rpcError } = await supabase.rpc('set_task_status', {
                    p_task_id: id,
                    p_status: status,
                })

                if (rpcError) return { error: mapPermissionError(rpcError, 'setTaskStatus') }

                const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single()

                if (error) return { error: mapDbError(error) as QueryError }
                return { data: data as Task }
            },
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Task', id }, { type: 'Task', id: 'LIST' }],
        }),
        getTaskAssignees: builder.query<TaskAssignee[], string>({
            queryFn: async (taskId) => {
                try {
                    const { data, error } = await supabase
                        .from('task_assignees')
                        .select('user_id, assigned_by, assigned_at')
                        .eq('task_id', taskId)
                    if (error) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: error.message,
                            } as QueryError,
                        }
                    }
                    return {
                        data: (data ?? []) as TaskAssignee[],
                    }
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'errors:generic'
                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: message,
                        } as QueryError,
                    }
                }
            },
            providesTags: (_result, _error, taskId) => [
                {
                    type: 'Task',
                    id: `${taskId}-ASSIGNEES`,
                },
            ],
        }),

        // materialOutcomes: den tildeltes valg af udfald pr. uafrapporteret
        // materiale-linje (US-42), gemt som DATA på anmodningen - selve
        // afrapporteringen (statusændring på enhederne) sker først i
        // approve_task_request, ved godkendelse. Afvises anmodningen i
        // stedet, forbliver materialerne urørt (Reserved/InUse) - se
        // 2026-09-23-defer-material-resolution-to-approval.sql.
        createTaskRequest: builder.mutation<
            TaskRequest,
            { taskId: string; materialOutcomes?: { taskMaterialId: string; outcomes: { status: string; quantity: number }[] }[] }
        >({
            queryFn: async ({ taskId, materialOutcomes }) => {
                try {
                    const { data: authData, error: authError } =
                        await supabase.auth.getUser()

                    if (authError || !authData.user) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: 'errors:loginRequired',
                            } as QueryError,
                        }
                    }
                    const { data: existingRequest, error: existingRequestError } =
                        await supabase
                            .from('task_requests')
                            .select('*')
                            .eq('task_id', taskId)
                            .eq('requested_by', authData.user.id)
                            .eq('status', 'Pending')
                            .maybeSingle()

                    if (existingRequestError) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: existingRequestError.message,
                            } as QueryError,
                        }
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
                            requested_by: authData.user.id,
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
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'errors:generic'

                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: message,
                        } as QueryError,
                    }
                }
            },

            invalidatesTags: (_result, _error, { taskId }) => [
                { type: 'Task', id: 'PENDING-REQUESTS' },
                {
                    type: 'Task',
                    id: `${taskId}-REQUESTS`,
                },
                {
                    type: 'Task',
                    id: taskId,
                },
                {
                    type: 'Task',
                    id: 'LIST',
                },
            ],
        }),

        getTaskRequests: builder.query<TaskRequest[], string>({
            queryFn: async (taskId) => {
                try {
                    const { data, error } = await supabase
                        .from('task_requests')
                        .select('*')
                        .eq('task_id', taskId)
                        .order('requested_at', { ascending: false })

                    if (error) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: error.message,
                            } as QueryError,
                        }
                    }

                    return {
                        data: (data ?? []) as TaskRequest[],
                    }
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'errors:generic'

                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: message,
                        } as QueryError,
                    }
                }
            },
            providesTags: (_result, _error, taskId) => [
                {
                    type: 'Task',
                    id: `${taskId}-REQUESTS`,
                },
            ],
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
                }

                return {
                    data: ((data ?? []) as Row[]).map((row) => ({
                        id: row.id,
                        taskId: row.task_id,
                        taskTitle: row.task_title,
                        requestedBy: row.requested_by,
                        requesterName:
                            `${row.requester_first_name ?? ''} ${row.requester_last_name ?? ''}`.trim() || 'Ukendt bruger',
                        requestedAt: row.requested_at,
                    })),
                }
            },
            providesTags: [{ type: 'Task', id: 'PENDING-REQUESTS' }],
        }),

        approveTaskRequest: builder.mutation<void, ReviewTaskRequestInput>({
            queryFn: async ({ requestId }) => {
                const { error } = await supabase.rpc('approve_task_request', { p_request_id: requestId })

                if (error) return { error: mapPermissionError(error, 'approveTasks') }
                return { data: undefined }
            },
            invalidatesTags: (_result, _error, { taskId }) => [
                { type: 'Task', id: 'PENDING-REQUESTS' },
                { type: 'Task', id: `${taskId}-REQUESTS` },
                { type: 'Task', id: taskId },
                { type: 'Task', id: `${taskId}-MATERIALS` },
                { type: 'Task', id: 'LIST' },
                { type: 'Item', id: 'LIST' },
            ],
        }),

        rejectTaskRequest: builder.mutation<void, ReviewTaskRequestInput>({
            queryFn: async ({ requestId }) => {
                const { error } = await supabase.rpc('reject_task_request', { p_request_id: requestId })

                if (error) return { error: mapPermissionError(error, 'rejectTasks') }
                return { data: undefined }
            },
            invalidatesTags: (_result, _error, { taskId }) => [
                { type: 'Task', id: 'PENDING-REQUESTS' },
                { type: 'Task', id: `${taskId}-REQUESTS` },
            ],
        }),

        assignToTask: builder.mutation<void, AssignToTaskInput>({
            queryFn: async ({ taskId, userId }) => {
                try {
                    const { data: authData, error: authError } =
                        await supabase.auth.getUser()
                    if (authError || !authData.user) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: 'errors:loginRequired',
                            } as QueryError,
                        }
                    }
                    const { error } = await supabase
                        .from('task_assignees')
                        .insert({
                            task_id: taskId,
                            user_id: userId,
                            assigned_by: authData.user.id,
                        })
                    if (error) {
                        return { error: mapPermissionError(error, 'assignEmployee') }
                    }
                    return {
                        data: undefined,
                    }
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'errors:generic'
                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: message,
                        } as QueryError,
                    }
                }
            },
            invalidatesTags: (_result, _error, { taskId }) => [
                'MyTasks',
                { type: 'Task', id: 'LIST' },
                {
                    type: 'Task',
                    id: `${taskId}-ASSIGNEES`,
                },
            ],
        }),
        unassignFromTask: builder.mutation<void, AssignToTaskInput>({
            queryFn: async ({ taskId }) => {
                try {
                    const { data: authData, error: authError } =
                        await supabase.auth.getUser();
                    if (authError || !authData.user) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: 'errors:loginRequired',
                            } as QueryError,
                        };
                    }
                    const { error } = await supabase
                        .from('task_assignees')
                        .delete()
                        .eq('task_id', taskId)
                        .eq('user_id', authData.user.id)
                        .eq('assigned_by', authData.user.id);
                    if (error) {
                        return { error: mapPermissionError(error, 'unassignSelf') };
                    }
                    return {
                        data: undefined,
                    };
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'errors:generic';
                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: message,
                        } as QueryError,
                    };
                }
            },
            invalidatesTags: (_result, _error, { taskId }) => [
                'MyTasks',
                { type: 'Task', id: 'LIST' },
                {
                    type: 'Task',
                    id: `${taskId}-ASSIGNEES`,
                },
            ],
        }),

        removeAssigneeFromTask: builder.mutation<void, RemoveAssigneeInput>({
            queryFn: async ({ taskId, userId }) => {
                try {
                    const { data: authData, error: authError } =
                        await supabase.auth.getUser()

                    if (authError || !authData.user) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: 'errors:loginRequired',
                            } as QueryError,
                        }
                    }

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
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'errors:generic'

                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: message,
                        } as QueryError,
                    }
                }
            },
            invalidatesTags: (_result, _error, { taskId }) => [
                'MyTasks',
                { type: 'Task', id: 'LIST' },
                {
                    type: 'Task',
                    id: `${taskId}-ASSIGNEES`,
                },
            ],
        }),

        getMyTaskIds: builder.query<string[], void>({
            queryFn: async () => {
                try {
                    const { data: authData, error: authError } =
                        await supabase.auth.getUser();
                    if (authError || !authData.user) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: 'errors:loginRequired',
                            } as QueryError,
                        };
                    }
                    const { data, error } = await supabase
                        .from('task_assignees')
                        .select('task_id')
                        .eq('user_id', authData.user.id);
                    if (error) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: error.message,
                            } as QueryError,
                        };
                    }
                    return {
                        data: (data ?? []).map((assignment) => assignment.task_id),
                    };
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'errors:generic';

                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: message,
                        } as QueryError,
                    };
                }
            },
            providesTags: ['MyTasks'],
        }),

        deleteRoom: builder.mutation<
            void,
            {
                roomId: string
                taskIdsToDelete: string[]
            }
        >({
            queryFn: async ({ roomId, taskIdsToDelete }) => {
                try {
                    const organisationId =
                        await getAuthenticatedOrganisationId()

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
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'errors:generic'

                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: message,
                        } as QueryError,
                    }
                }
            },
            invalidatesTags: (_result, _error, { roomId }) => [
                { type: 'TaskRoom', id: roomId },
                { type: 'TaskRoom', id: 'LIST' },
                { type: 'Task', id: 'LIST' },
                'MyTasks',
            ],
        }),

        deleteTask: builder.mutation<void, string>({
            queryFn: async (taskId) => {
                try {
                    const organisationId = await getAuthenticatedOrganisationId()

                    const { error } = await supabase
                        .from('tasks')
                        .delete()
                        .eq('id', taskId)
                        .eq('organisation_id', organisationId)

                    if (error) {
                        return { error: mapPermissionError(error, 'deleteTask') }
                    }

                    return { data: undefined }
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'errors:generic'

                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: message,
                        } as QueryError,
                    }
                }
            },
            invalidatesTags: (_result, _error, taskId) => [
                { type: 'Task', id: taskId },
                { type: 'Task', id: 'LIST' },
                'MyTasks',
            ],
        }),

        // US-42: afrapporterer det faktiske udfald af en opgaves materiale-
        // linje ved færdiggørelse (fx "8 retur, 1 i stykker"). Kræves før
        // set_task_status/approve_task_request tillader Completed - se
        // assert_task_materials_resolved i docs/dbSchema.sql §15.21.
        // outcomes-statusser er 'ItemStatus'-værdier, ikke opgave-statusser.
        resolveTaskMaterialUnits: builder.mutation<
            void,
            { taskMaterialId: string; taskId: string; itemId: string; outcomes: { status: string; quantity: number }[] }
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
            invalidatesTags: (_result, _error, { taskId, itemId }) => [
                { type: 'Task', id: taskId },
                { type: 'Task', id: `${taskId}-MATERIALS` },
                { type: 'Task', id: 'LIST' },
                { type: 'Item', id: 'LIST' },
                { type: 'Item', id: itemId },
                { type: 'ItemUnit', id: `ITEM-${itemId}` },
            ],
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
                    return { error: { status: 'CUSTOM_ERROR', error: materialsError.message } as QueryError }
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
                        .select('task_material_id, data_layer_item_units(status, quantity)')
                        .in('task_material_id', materialIds),
                ])

                if (itemsResult.error) {
                    return { error: { status: 'CUSTOM_ERROR', error: itemsResult.error.message } as QueryError }
                }
                if (linkedUnitsResult.error) {
                    return { error: { status: 'CUSTOM_ERROR', error: linkedUnitsResult.error.message } as QueryError }
                }

                const itemById = new Map((itemsResult.data ?? []).map((i) => [i.id, i]))
                // Sum linked quantity per status per material line.
                const groupsByMaterial = new Map<string, Map<ItemStatus, number>>()
                for (const row of linkedUnitsResult.data ?? []) {
                    const unit = row.data_layer_item_units as unknown as { status: ItemStatus; quantity: number } | null
                    if (!unit) continue
                    const groups = groupsByMaterial.get(row.task_material_id) ?? new Map<ItemStatus, number>()
                    groups.set(unit.status, (groups.get(unit.status) ?? 0) + Number(unit.quantity))
                    groupsByMaterial.set(row.task_material_id, groups)
                }

                return {
                    data: materials.map((m) => {
                        const linkedGroups = [...(groupsByMaterial.get(m.id) ?? new Map<ItemStatus, number>())]
                            .map(([status, quantity]) => ({ status, quantity }))
                        return {
                            id: m.id,
                            itemId: m.item_id,
                            itemName: itemById.get(m.item_id)?.name ?? 'Ukendt materiale',
                            unitOfMeasurement: itemById.get(m.item_id)?.unit_of_measurement ?? '',
                            quantity: m.quantity,
                            linkedGroups,
                            resolved: linkedGroups.length === 0,
                        }
                    }),
                }
            },
            providesTags: (_result, _error, taskId) => [{ type: 'Task', id: `${taskId}-MATERIALS` }],
        }),

    }),
})

export const {
    useGetTasksQuery,
    useGetCompletedTasksQuery,
    useGetRoomsQuery,
    useGetOrganisationEmployeesQuery,
    useGetTaskAssigneesQuery,
    useGetTaskRequestsQuery,
    useCreateTaskRequestMutation,
    useGetPendingTaskRequestsQuery,
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