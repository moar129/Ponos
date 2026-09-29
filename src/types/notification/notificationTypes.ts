export type NotificationType =
  | 'message'
  | 'task_assigned'
  | 'task_updated'
  | 'task_completed'
  | 'task_approved'
  | 'task_rejected'
  | 'task_favorite_room'
  | 'news'
  | 'membership_invitation'

// Brugerens notifikationsindstillinger (notification_preferences, US-79).
// Ingen række i DB = alt slået til.
export interface NotificationPreferences {
  enabled: boolean
  mutedTypes: NotificationType[]
}

export interface NotificationTypeGroup {
  // Nøgle i notifications:category.<key>
  key: 'messages' | 'tasks' | 'news' | 'organisation'
  types: NotificationType[]
}

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  referenceId: string | null
  isRead: boolean
  dismissedAt: string | null
  createdAt: string
}