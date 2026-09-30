import { useTranslation } from 'react-i18next'
import { useDeleteItemMutation } from '../../../store/apis/categoryApi';
import { useDeleteMany } from '../../../store/hooks/useDeleteMany';
import type { DeleteItemsComponentProps } from '../../../types/dataLayer/datalayerTypes';
import { ConfirmDialog } from '../../common/ConfirmDialog';

export function DeleteItemsComponent({ items, onClose, onDeleted }: DeleteItemsComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const [deleteItem] = useDeleteItemMutation();
  const { deleteAll, isDeleting, error } = useDeleteMany((id) => deleteItem({ id }).unwrap(), t('deleteItems.deleteFailed'));

  const handleConfirm = async () => {
    const ids = items.map((item) => item.id);
    if (await deleteAll(ids)) {
      onDeleted(ids);
      onClose();
    }
  };

  return (
    <ConfirmDialog
      title={t('deleteItems.heading', { count: items.length })}
      message={t('common:cannotUndo')}
      confirmLabel={t('deleteItems.submit', { count: items.length })}
      isLoading={isDeleting}
      error={error}
      onConfirm={handleConfirm}
      onCancel={onClose}
    >
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-gray/40 border border-border-gray dark:bg-slate-800/40 dark:border-slate-700">
            <span className="text-sm text-primary truncate dark:text-slate-100">{item.name}</span>
            {item.isFromSubCategory && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-bg-gray text-secondary ml-2 dark:bg-slate-700 dark:text-slate-400">
                {item.sourceCategoryTitle}
              </span>
            )}
          </div>
        ))}
      </div>
    </ConfirmDialog>
  );
}
