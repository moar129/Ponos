// src/components/News/NewsImage.tsx
import { useState } from 'react'
import compass from '../../assets/logo/ponos_compass.svg'
import type { NewsImageProps } from '../../types/news/newsType'

// Nyhedens billede - eller Ponos-kompasset på navy, hvis nyheden intet
// billede har, eller URL'en er død. Kalderen sætter key={pictureUrl}, så
// fejl-state nulstilles når billedet skiftes.
export function NewsImage({ pictureUrl, className, placeholderClassName }: NewsImageProps) {
    const [failed, setFailed] = useState(false)

    if (pictureUrl && !failed) {
        return <img src={pictureUrl} alt="" onError={() => setFailed(true)} className={className} />
    }

    return (
        <div className={`${placeholderClassName ?? className ?? ''} bg-gradient-to-br from-primary to-secondary flex items-center justify-center`}>
            <img src={compass} alt="" aria-hidden="true" className="h-3/5 max-h-40 opacity-90 select-none pointer-events-none" />
        </div>
    )
}
