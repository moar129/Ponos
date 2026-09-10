// components/dataLayer/confirmDialogComponent.tsx
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
        className="bg-[#0B132A] border border-slate-800 rounded-xl shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5">
          <div className="shrink-0 p-2 rounded-full bg-red-500/10">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-100">{title}</h2>
            <p className="text-sm text-slate-400 mt-1">{message}</p>
          </div>
          <button onClick={onCancel} className="ml-auto p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-white shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-800">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">
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