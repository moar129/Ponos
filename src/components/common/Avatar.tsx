import { getInitials } from '../../utils/getInitials'
import type { AvatarProps } from '../../types/common/avatarType'

export function Avatar({ firstName, lastName, urlPicture, className = '', textClassName = '' }: AvatarProps) {
  return (
    <div className={`rounded-full flex items-center justify-center overflow-hidden shrink-0 ${className}`}>
      {urlPicture ? (
        <img src={urlPicture} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className={`font-semibold ${textClassName}`}>{getInitials(firstName, lastName)}</span>
      )}
    </div>
  )
}
