// src/components/public/FaqItem.tsx
import { ChevronDown } from 'lucide-react'
import type { FaqItemProps } from '../../types/public/publicType'

// En FAQ-post bygget på native <details>/<summary> frem for egen state:
// browseren klarer selv åbn/luk, tastaturbetjening (Enter/Mellemrum) og
// den korrekte aria-rolle, og Ctrl+F finder tekst i lukkede punkter.
// Ingen useState, ingen aria-expanded at holde i sync.
export function FaqItem({ question, children }: FaqItemProps) {
    return (
        <details className="group rounded-lg border border-border-gray bg-white">
            {/* list-none fjerner standard-trekanten (og ::-webkit-details-marker
                for ældre Safari), så chevron'en til højre er den eneste
                indikator. */}
            <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden px-5 py-4 font-medium text-primary">
                <span>{question}</span>
                <ChevronDown
                    aria-hidden="true"
                    className="w-5 h-5 shrink-0 text-secondary transition-transform group-open:rotate-180"
                />
            </summary>

            <div className="px-5 pb-4 text-sm text-secondary space-y-2">{children}</div>
        </details>
    )
}
