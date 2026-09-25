// src/utils/notificationDisplay.ts
import type { AppNotification } from '../types/notification/notificationTypes'
import type { DynamicTFunction } from '../i18n/config'

// Overskriften på en notifikation. Alle typer undtagen 'message' (opgaver og
// 'news') oversættes via notifications:type.<type>. For opgave-typerne er notifications.title
// i databasen en fast dansk etiket der følger type-kolonnen 1:1 ('En opgave er
// afsluttet' osv.), så den oversættes via notifications:type.<type>.
//
// 'message' er undtagelsen: dér sætter notify_new_message-triggeren title til
// AFSENDERENS navn, eller gruppens navn for gruppesamtaler - altså brugerdata,
// der aldrig må oversættes. Kun triggerens egne fallbacks ('Ny besked' når
// afsenderen ikke har et navn, 'Gruppe' for en unavngiven gruppe) er danske,
// og dem oversætter vi.
export function notificationTitle(notification: AppNotification, t: DynamicTFunction): string {
    if (notification.type !== 'message') {
        return t(`notifications:type.${notification.type}`)
    }

    if (!notification.title || notification.title === 'Ny besked') {
        return t('notifications:type.message')
    }
    if (notification.title === 'Gruppe') {
        return t('messages:unnamedGroup')
    }
    return notification.title
}

// Brødteksten. For 'message' er body beskedens indhold, men delete_message
// overskriver den med den faste danske sentinel 'Denne besked er slettet',
// så den gamle tekst ikke kan ses - den oversætter vi.
export function notificationBody(notification: AppNotification, t: DynamicTFunction): string | null {
    if (notification.type === 'message' && notification.body === 'Denne besked er slettet') {
        return t('messages:messageDeleted')
    }
    return notification.body
}
