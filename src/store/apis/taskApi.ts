import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { ETaskPriority, ETaskStatus, Room, Task } from '../../types/Task/Task'

type QueryError = { status: 'CUSTOM_ERROR'; error: string }

interface CreateTaskInput {
    title: string
    description: string
    priority: ETaskPriority | null
    max_assignees: number | null
    room_id?: string | null
}

interface UpdateTaskInput {
    id: string
    title: string
    description: string
    priority: ETaskPriority | null
    max_assignees: number | null
    room_id?: string | null
}

interface CreateRoomInput {
    name: string
}

interface UpdateTaskStatusInput {
    id: string
    status: ETaskStatus
}

interface AssignToTaskInput {
    taskId: string
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

        createTask: builder.mutation<Task, CreateTaskInput>({
            queryFn: async ({ title, description, priority, max_assignees, room_id }) => {
                try {
                    const organisationId = await getAuthenticatedOrganisationId()
                    const { data, error } = await supabase
                        .from('tasks')
                        .insert({
                            organisation_id: organisationId,
                            title,
                            description,
                            priority,
                            status: 'Started',
                            max_assignees,
                            room_id,
                        })
                        .select()
                        .single()

                    if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } as QueryError }
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
                            priority,
                            max_assignees,
                            room_id,
                        })
                        .eq('id', id)
                        .eq('organisation_id', organisationId)
                        .select()
                        .single()

                    if (error) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: error.message,
                            } as QueryError,
                        }
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

                    if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } as QueryError }
                    return { data: data as Room }
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Fejl ved oprettelse af rum'
                    return { error: { status: 'CUSTOM_ERROR', error: message } as QueryError }
                }
            },
            invalidatesTags: [{ type: 'TaskRoom', id: 'LIST' }],
        }),

        updateTaskStatus: builder.mutation<Task, UpdateTaskStatusInput>({
            queryFn: async ({ id, status }) => {
                const { data, error } = await supabase
                    .from('tasks')
                    .update({ status })
                    .eq('id', id)
                    .select()
                    .single()

                if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } as QueryError }
                return { data: data as Task }
            },
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Task', id }, { type: 'Task', id: 'LIST' }],
        }),
        getTaskAssignees: builder.query<string[], string>({
            queryFn: async (taskId) => {
                try {
                    const { data, error } = await supabase
                        .from('task_assignees')
                        .select('user_id')
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
                        data: (data ?? []).map((assignee) => assignee.user_id),
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
            queryFn: async ({ taskId }) => {
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
                            user_id: authData.user.id,
                        })
                    if (error) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: error.message,
                            } as QueryError,
                        }
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

    }),
})

export const {
    useGetTasksQuery,
    useGetRoomsQuery,
    useGetTaskAssigneesQuery,
    useCreateTaskMutation,
    useCreateRoomMutation,
    useUpdateTaskMutation,
    useUpdateTaskStatusMutation,
    useAssignToTaskMutation,
    useUnassignFromTaskMutation,
    useGetMyTaskIdsQuery,
} = taskApi
