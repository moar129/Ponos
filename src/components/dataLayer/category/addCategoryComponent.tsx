import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next'
import { FolderPlus, Loader2 } from 'lucide-react';
import { useAddCategoryMutation } from '../../../store/apis/categoryApi';
import type { AddCategoryComponentProps } from '../../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../../ErrorMessage';
import { joinPath } from '../../../utils/locationPathLabel';
import { Alert } from '../../common/Alert';
import { Modal } from '../../common/Modal';

export function AddCategoryComponent({
  onClose,
  parentId,
  parentPath,
  nextRank,
  onSuccess,
}: AddCategoryComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const [addCategory, { isLoading }] = useAddCategoryMutation();
  const [title, setTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = title.trim();

    if (!trimmed) {
      setErrorMsg(t('addCategory.titleRequired'));
      return;
    }

    setErrorMsg(null);

    try {
      const newCategoryId = await addCategory({ title: trimmed, parentId, rank: nextRank }).unwrap();
      onSuccess(newCategoryId);
      onClose();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, t('addCategory.createFailed')));
    }
  };

  return (
    <Modal
      onClose={onClose}
      icon={FolderPlus}
      title={parentId ? t('addCategory.titleSub') : t('addCategory.titleMain')}
      subtitle={parentId && parentPath && parentPath.length > 0 && (
        <Trans
          ns="datalayer"
          i18nKey="addCategory.parentPath"
          values={{ path: joinPath(parentPath) }}
          components={{ b: <strong className="text-primary font-medium dark:text-slate-100" /> }}
        />
      )}
      closeOnBackdrop={false}
      disableClose={isLoading}
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-bg-gray hover:bg-border-gray text-primary text-sm font-medium transition-colors dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100"
          >
            {t('common:cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-text text-sm font-medium transition-colors"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('addCategory.submit')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Alert>{errorMsg}</Alert>

        <label className="block text-xs font-medium text-secondary dark:text-slate-400">
          <div className="mb-1.5 flex items-center gap-1">
            {t('addCategory.nameLabel')}
            <span aria-hidden="true" className="text-red-600 dark:text-red-400">*</span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
            aria-required="true"
            placeholder={t('addCategory.placeholder')}
            className="w-full bg-white border border-border-gray rounded-lg px-3.5 py-2 text-sm text-primary focus:outline-none focus:border-accent transition-colors font-normal dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />
        </label>
      </div>
    </Modal>
  );
}
