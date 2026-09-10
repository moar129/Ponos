import { X, MapPin, Package } from 'lucide-react';
import type { LocationItemsComponentProps } from '../../types/dataLayer/datalayerTypes';


export function LocationItemsComponent({ isOpen, location, items, onClose, onSelectItem }: LocationItemsComponentProps) {
  if (!isOpen || !location) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-[#0B132A] border border-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-5 h-5 text-[#C7975D] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-100 truncate">{location.name}</h2>
              {location.address && <p className="text-xs text-slate-400 truncate">{location.address}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white shrink-0" title="Luk" aria-label="Luk modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Package className="w-10 h-10 mb-3 stroke-[1.5] text-slate-500" />
              <p className="text-sm">Ingen items er registreret på denne lokation.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className="w-full flex items-center justify-between gap-4 p-3 bg-slate-900 hover:bg-slate-800/70 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 truncate">{item.sourceCategoryTitle}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400">
                    <span>Antal: {item.quantity}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">{item.itemStatus}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}