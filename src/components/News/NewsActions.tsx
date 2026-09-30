// src/components/News/NewsActions.tsx
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import type { NewsActionsProps } from '../../types/news/newsType'

// Rediger/slet-ikonerne på et nyhedskort og på detaljesiden - hver gated
// af sit eget privilegie (update_news hhv. delete_news). Klik stopper
// propagation, så de ikke også åbner kortet.
export function NewsActions({ canUpdate, canDelete, onEdit, onDelete }: NewsActionsProps) {
    const { t } = useTranslation('news')
    if (!canUpdate && !canDelete) return null

    return (
        <div className="flex items-center gap-1 shrink-0">
            {canUpdate && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onEdit()
                    }}
                    aria-label={t('edit')}
                    className="p-1.5 rounded-md text-secondary dark:text-slate-400 hover:text-primary dark:hover:text-slate-100 hover:bg-bg-gray dark:hover:bg-slate-700 transition-colors"
                >
                    <Pencil className="w-4 h-4" />
                </button>
            )}
            {canDelete && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                    }}
                    aria-label={t('delete')}
                    className="p-1.5 rounded-md text-secondary dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    )
}
