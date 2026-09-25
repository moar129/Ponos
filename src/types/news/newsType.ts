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
    canUpdate: boolean
    canDelete: boolean
    onEdit: (news: News) => void
    onDelete: (news: News) => void
}

export interface NewsFormModalProps {
    isOpen: boolean
    onClose: () => void
    editingNews: News | null
}

// Selve formularen i NewsFormModal - kun monteret mens modalen er åben.
export type NewsFormProps = Omit<NewsFormModalProps, 'isOpen'>

export interface NewsImageProps {
    pictureUrl: string | null
    className?: string
    // Til placeholderen, hvis den skal have anden størrelse end et rigtigt billede.
    placeholderClassName?: string
}
