// src/store/hooks/useDismissable.ts
import { useEffect, useRef, type RefObject } from 'react'

// Lukker en dropdown/menu ved klik udenfor `ref` eller Escape. Lå før
// som 4 kopier (header-menuen, sprogvælgeren, notifikationsklokken og
// rum-menuen) - to af dem manglede Escape.
export function useDismissable(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void): void {
    const closeRef = useRef(onClose)
    useEffect(() => {
        closeRef.current = onClose
    })

    useEffect(() => {
        if (!open) return

        function handlePointerDown(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) closeRef.current()
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') closeRef.current()
        }

        document.addEventListener('mousedown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [ref, open])
}
