export interface News {
    id: string
    organisationId: string
    title: string
    description: string | null
    pictureUrl: string | null
    publishedAt: string
    // Link til en original-artikel (valgfri, indtastet af admin) - vises som
    // "Læs mere" på detalje-siden.
    url: string | null
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
