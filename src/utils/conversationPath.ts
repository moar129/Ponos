// src/utils/conversationPath.ts

/** Link der åbner en bestemt samtale på /beskeder (læses af messagePage). */
export function conversationPath(conversationId: string): string {
    return `/beskeder?conversation=${conversationId}`
}
