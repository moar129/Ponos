// src/utils/systemMessageDisplay.ts
import type { DynamicTFunction } from '../i18n/config'

// Systembeskeder i opgave-/rum-chats skrives af DB-triggere som faste danske
// sætninger (messages.content, message_type = 'system'). Samme sentinel-
// mønster som 'Denne besked er slettet' i notificationDisplay.ts: kendte
// sætninger oversættes, alt andet (fx ældre systembeskeder) vises uændret.
// Teksterne SKAL matche migrationen 2026-09-27-task-room-conversations.sql.
const SYSTEM_MESSAGE_KEYS: Record<string, string> = {
    'Gruppe oprettet for opgaven': 'messages:system.taskChatCreated',
    'Opgaven er afsluttet': 'messages:system.taskCompleted',
    'Opgaven er genåbnet': 'messages:system.taskReopened',
    'Gruppe oprettet for rummet': 'messages:system.roomChatCreated',
    'Rummet er ikke længere rolle-låst - chatten er lukket': 'messages:system.roomChatClosed',
    'Rummet er rolle-låst igen - chatten er genåbnet': 'messages:system.roomChatReopened',
}

export function systemMessageText(content: string, t: DynamicTFunction): string {
    const key = SYSTEM_MESSAGE_KEYS[content]
    return key ? t(key) : content
}
