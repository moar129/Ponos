export type NotificationType = 'message' | 'task_assigned' | 'task_updated' | 'task_completed'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  referenceId: string | null
  isRead: boolean
  createdAt: string
}