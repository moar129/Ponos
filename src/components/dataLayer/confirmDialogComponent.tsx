import { AlertTriangle, Loader2, X } from 'lucide-react';
import type { ConfirmDialogComponentProps } from '../../types/dataLayer/datalayerTypes';


export function ConfirmDialogComponent({
  isOpen,
  title,
  message,
  confirmLabel = 'Slet',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogComponentProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5">
          <div className="shrink-0 p-2 rounded-full bg-red-50">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-primary">{title}</h2>
            <p className="text-sm text-secondary mt-1">{message}</p>
          </div>
          <button type="button" onClick={onCancel} className="ml-auto p-1 rounded hover:bg-bg-gray text-secondary hover:text-primary shrink-0" title="Luk" aria-label="Luk dialog">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border-gray">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-secondary hover:bg-bg-gray">
            Annullér
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}