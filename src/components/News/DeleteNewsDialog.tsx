// src/components/News/DeleteNewsDialog.tsx
import { useTranslation } from 'react-i18next'
import { readableError } from '../../ErrorMessage'
import { useDeleteNewsMutation } from '../../store/apis/newsApi'
import { ConfirmDialog } from '../common/ConfirmDialog'
import type { DeleteNewsDialogProps } from '../../types/news/newsType'

// "Slet nyhed?" - delt af nyhedslisten og detaljesiden. Ved fejl bliver
// dialogen stående med fejlen, så man kan prøve igen.
export function DeleteNewsDialog({ news, onCancel, onDeleted }: DeleteNewsDialogProps) {
    const { t } = useTranslation(['news', 'common'])
    const [deleteNews, { isLoading, error, reset }] = useDeleteNewsMutation()

    async function handleConfirm() {
        if (!news) return
        try {
            await deleteNews({ id: news.id }).unwrap()
            onDeleted()
        } catch {
            // Fejlen vises i dialogen.
        }
    }

    return (
        <ConfirmDialog
            isOpen={news !== null}
            title={news ? t('deleteTitle', { name: news.title }) : ''}
            message={t('common:cannotUndo')}
            isLoading={isLoading}
            error={readableError(error)}
            onConfirm={handleConfirm}
            onCancel={() => {
                reset()
                onCancel()
            }}
        />
    )
}
