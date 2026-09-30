// src/components/common/SideNavLayout.tsx
import type { SideNavLayoutProps } from '../../types/common/layoutType'

// Lodret fane-nav i sin egen boks til venstre og indholdet til højre
// (under md: en vandret scrollende fanerække over indholdet). Delt af
// dashboardets Organisation- og Administration-faner. 12-kolonne-grid som
// DataLayerPage; nav'et strammes fra 4/12 til 3/12 på xl, så indholdet
// får mere plads på brede skærme.
export function SideNavLayout<K extends string>({ tabs, active, onSelect, children }: SideNavLayoutProps<K>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
      <nav className="md:col-span-4 xl:col-span-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible no-scrollbar rounded-lg border border-border-gray bg-white p-2 md:p-3 dark:border-slate-700 dark:bg-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            aria-current={active === tab.key ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap md:whitespace-normal rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active === tab.key
                ? 'bg-accent/15 text-primary dark:text-slate-100'
                : 'text-secondary hover:bg-bg-gray hover:text-primary dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
            }`}
          >
            <tab.icon className="w-4 h-4 shrink-0" />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="md:col-span-8 xl:col-span-9 min-w-0 rounded-lg border border-border-gray bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-800">
        {children}
      </div>
    </div>
  )
}
