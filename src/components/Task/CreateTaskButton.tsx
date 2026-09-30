// src/components/Task/CreateTaskButton.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CreateTaskModal } from './CreateTaskModal'

// "Opret opgave" + modalen. Modalen mountes kun når åben, så formularen
// altid starter med det aktuelt valgte rum.
export function CreateTaskButton({ selectedRoomId }: { selectedRoomId: string | null }) {
    const { t } = useTranslation('tasks')
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover transition-colors"
            >
                {t('page.createTask')}
            </button>

            {isOpen && <CreateTaskModal onClose={() => setIsOpen(false)} selectedRoomId={selectedRoomId} />}
        </>
    )
}
