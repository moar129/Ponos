// src/store/hooks/useDeleteMany.ts
import { useState } from 'react'
import { getErrorMessage } from '../../ErrorMessage'

// Sletter flere rækker parallelt (én mutation pr. id) og holder styr på
// "sletter..." og fejlbeskeden. Delt af slet kategori og slet items.
export function useDeleteMany(remove: (id: string) => Promise<unknown>, fallbackError: string) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const deleteAll = async (ids: string[]): Promise<boolean> => {
        setIsDeleting(true)
        setError(null)
        try {
            await Promise.all(ids.map(remove))
            return true
        } catch (err) {
            setError(getErrorMessage(err, fallbackError))
            return false
        } finally {
            setIsDeleting(false)
        }
    }

    return { deleteAll, isDeleting, error }
}
