// Hvor en nyhed stammer fra - 'manual' er skrevet direkte af en admin,
// 'api' er importeret via organisationens konfigurerede nyheds-API.
export type NewsSourceKind = 'manual' | 'api'

export interface News {
    id: string
    organisationId: string
    title: string
    description: string | null
    pictureUrl: string | null
    publishedAt: string
    // Link til original-artiklen (valgfri) - vises som "Læs mere" på kortet.
    url: string | null
    source: NewsSourceKind
    // Dedup-nøgle for API-importerede nyheder (null ved manuel oprettelse) -
    // undgår at samme nyhed importeres flere gange ved gentagne "Hent nu".
    externalRef: string | null
}

export interface CreateNewsInput {
    title: string
    description?: string | null
    pictureUrl?: string | null
    url?: string | null
    // Udelades = 'nu' (DB-default).
    publishedAt?: string
}

export interface UpdateNewsInput {
    id: string
    title?: string
    description?: string | null
    pictureUrl?: string | null
    url?: string | null
    publishedAt?: string
}

// En organisations konfigurerede nyheds-API (US-57) - 0-1 pr. organisation.
// api_key er credential-agtig data, kun manage_news-indehavere kan
// læse/redigere den (RLS), ligesom denne type kun bruges bag samme gate.
export interface NewsSource {
    id: string
    organisationId: string
    endpointUrl: string
    apiKey: string | null
}

export interface UpsertNewsSourceInput {
    endpointUrl: string
    apiKey?: string | null
}

export interface NewsCardProps {
    news: News
    canManage: boolean
    onEdit: (news: News) => void
    onDelete: (news: News) => void
}

export interface NewsFormModalProps {
    isOpen: boolean
    onClose: () => void
    editingNews: News | null
}
