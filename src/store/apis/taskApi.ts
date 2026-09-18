import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { CompletedTaskDetails, ETaskPriority, ETaskStatus, Room, Task, TaskAssignee } from '../../types/Task/Task'

type QueryError = { status: 'CUSTOM_ERROR'; error: string }

interface CreateTaskInput {
    title: string
    description: string
    start_date: string | null
    end_date: string | null
    priority: ETaskPriority | null
    max_assignees: number | null
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

// 42501 = RLS afviste - bruger uden det relevante privilegie
// (create_tasks/update_tasks/delete_tasks, Fase 3) forsøgte at
// oprette/redigere/slette. Samme mønster som newsApi.ts/categoryApi.ts.
function mapTaskError(error: { code?: string; message: string }, action: string): QueryError {
    if (error.code === '42501') {
        return { status: 'CUSTOM_ERROR', error: `Du har ikke rettigheder til at ${action}.` }
    }
    return { status: 'CUSTOM_ERROR', error: error.message }
}

async function getAuthenticatedOrganisationId(): Promise<string> {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
        throw new Error('Du skal være logget ind for at udføre denne handling.')
    }

    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_organisation_id')
        .eq('id', authData.user.id)
        .single()

    if (profileError || !profileData?.active_organisation_id) {
        throw new Error('Kunne ikke hente din organisationstilknytning.')
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

                    if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } as QueryError }
                    return { data: (data ?? []) as Task[] }
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Fejl ved hentning af opgaver'
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

                    if (tasksError) return { error: { status: 'CUSTOM_ERROR', error: tasksError.message } as QueryError }
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
                            .map((row) => ({ id: row.user_id, name: profileNameById.get(row.user_id) ?? 'Ukendt bruger' })),
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
                    const message = err instanceof Error ? err.message : 'Fejl ved hentning af afsluttede opgaver'
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

                    if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } as QueryError }
                    return { data: (data ?? []) as Room[] }
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Fejl ved hentning af rum'
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
                            : 'Fejl ved hentning af medarbejdere'

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
            queryFn: async ({ title, description, start_date, end_date, priority, max_assignees, room_id }) => {
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
                            room_id,
                        })
                        .select()
                        .single()

                    if (error) return { error: mapTaskError(error, 'oprette denne opgave') }
                    return { data: data as Task }
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Fejl ved oprettelse af opgave'
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
                        return { error: mapTaskError(error, 'redigere denne opgave') }
                    }

                    return { data: data as Task }
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'Fejl ved redigering af opgave'

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

                    if (error) return { error: mapTaskError(error, 'oprette dette rum') }
                    return { data: data as Room }
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Fejl ved oprettelse af rum'
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
                        return { error: mapTaskError(error, 'redigere dette rum') }
                    }

                    return { data: data as Room }
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'Fejl ved redigering af rum'

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

                if (rpcError) return { error: mapTaskError(rpcError, 'ændre denne opgaves status') }

                const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single()

                if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } as QueryError }
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
                            : 'Fejl ved hentning af ansvarlige'
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
        assignToTask: builder.mutation<void, AssignToTaskInput>({
            queryFn: async ({ taskId, userId }) => {
                try {
                    const { data: authData, error: authError } =
                        await supabase.auth.getUser()
                    if (authError || !authData.user) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: 'Du skal være logget ind.',
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
                        return { error: mapTaskError(error, 'tilmelde en medarbejder til opgaven') }
                    }
                    return {
                        data: undefined,
                    }
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'Fejl ved tilmelding til opgaven'
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
                                error: 'Du skal være logget ind.',
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
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: error.message,
                            } as QueryError,
                        };
                    }
                    return {
                        data: undefined,
                    };
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'Fejl ved afmelding fra opgaven';
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
                                error: 'Du skal være logget ind.',
                            } as QueryError,
                        }
                    }

                    const { error } = await supabase
                        .from('task_assignees')
                        .delete()
                        .eq('task_id', taskId)
                        .eq('user_id', userId)

                    if (error) {
                        return { error: mapTaskError(error, 'fjerne en medarbejder fra opgaven') }
                    }

                    return {
                        data: undefined,
                    }
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'Fejl ved fjernelse af medarbejder fra opgaven'

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
                                error: 'Du skal være logget ind.',
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
                            : 'Fejl ved hentning af egne opgaver';

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
                            return { error: mapTaskError(deleteTasksError, 'slette opgaverne i rummet') }
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
                        return { error: mapTaskError(updateTasksError, 'flytte opgaverne ud af rummet') }
                    }

                    // Slet selve rummet
                    const { error: deleteRoomError } =
                        await supabase
                            .from('task_rooms')
                            .delete()
                            .eq('id', roomId)
                            .eq('organisation_id', organisationId)

                    if (deleteRoomError) {
                        return { error: mapTaskError(deleteRoomError, 'slette dette rum') }
                    }

                    return { data: undefined }
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'Fejl ved sletning af rum'

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
                        return { error: mapTaskError(error, 'slette denne opgave') }
                    }

                    return { data: undefined }
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'Fejl ved sletning af opgave'

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

    }),
})

export const {
    useGetTasksQuery,
    useGetCompletedTasksQuery,
    useGetRoomsQuery,
    useGetOrganisationEmployeesQuery,
    useGetTaskAssigneesQuery,
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
} = taskApi
