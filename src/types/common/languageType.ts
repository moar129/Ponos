export interface LanguageSelectorProps {
  /**
   * 'dropdown' er headerens variant: en ikonknap der folder et panel ud
   * med søgefelt - nødvendigt ved 19 sprog i en smal topbjælke.
   * 'select' er profilsidens variant: en almindelig <select>, hvor der er
   * plads, og hvor et søgefelt ville være overflødigt.
   */
  variant?: 'dropdown' | 'select'
  /**
   * Hvilken kant dropdown-panelet flugter med. 'right' i topbaren (højre
   * side); 'left' i mobilmenuen, hvor knappen står yderst til venstre og
   * et højrestillet panel ville løbe ud af skærmen.
   */
  align?: 'left' | 'right'
  className?: string
}
