// src/components/dataLayer/TreeRow.tsx
import { ChevronDown, ChevronRight } from 'lucide-react'
import { FavoriteStarButton } from '../common/FavoriteStarButton'
import type { TreeActionButtonProps, TreeRowProps } from '../../types/dataLayer/datalayerTypes'

// Rækken i kategori- og lager-træet: chevron, ikon, navn, stjerne og
// handlingsknapper. Delt, så de to træer navigeres ens.
export function TreeRow({
  label,
  icon: Icon,
  isSelected,
  onSelect,
  hasChildren,
  isExpanded,
  onToggleExpand,
  nameMinWidthClass,
  favorite,
  actions,
}: TreeRowProps) {
  return (
    <div
      className={`flex flex-wrap lg:flex-nowrap items-center justify-between gap-y-1 p-1.5 rounded-md cursor-pointer transition-colors group ${
        isSelected
          ? 'bg-accent/15 text-primary font-medium dark:text-slate-100'
          : 'text-secondary hover:bg-bg-gray/60 hover:text-primary dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100'
      }`}
      onClick={onSelect}
    >
      {/*
        Minimumsbredde + flex-1 (i stedet for min-w-0) sikrer, at navnet
        altid har plads og aldrig presses til 0px. Kan handlingsknapperne
        (shrink-0) ikke være på samme linje, folder flex-wrap dem ned på en
        ny linje - vigtigt på touch, hvor knapperne altid er synlige. Fra lg
        er knapperne hover-only, så dér holdes rækken på én linje og navnet
        truncater.
      */}
      <div className={`flex items-center gap-1.5 overflow-hidden ${nameMinWidthClass} lg:min-w-0 flex-1`}>
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            className="p-0.5 hover:bg-border-gray rounded text-secondary hover:text-primary shrink-0 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-accent' : 'text-secondary group-hover:text-accent dark:text-slate-400'}`} />
        <span className="text-sm truncate">{label}</span>
      </div>

      {/* Stjernen ligger uden for hover-containeren, så en markeret favorit
          altid er synlig. ml-auto holder knapperne til højre, også når de
          er foldet ned på egen linje. */}
      <div className="flex items-center shrink-0 ml-auto">
        {favorite && <FavoriteStarButton isFavorite={favorite.isFavorite} onToggle={favorite.onToggle} />}
        <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      </div>
    </div>
  )
}

export function TreeActionButton({ icon: Icon, label, onClick, disabled, danger }: TreeActionButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`p-1.5 lg:p-1 rounded text-secondary transition-colors disabled:opacity-30 disabled:pointer-events-none dark:text-slate-400 ${
        danger
          ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400'
          : 'hover:bg-border-gray dark:hover:bg-slate-700'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}
