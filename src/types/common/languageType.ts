export interface LanguageSelectorProps {
  /**
   * 'dropdown' er headerens variant: en ikonknap der folder et panel ud
   * med søgefelt - nødvendigt ved 19 sprog i en smal topbjælke.
   * 'select' er profilsidens variant: en almindelig <select>, hvor der er
   * plads, og hvor et søgefelt ville være overflødigt.
   */
  variant?: 'dropdown' | 'select'
  className?: string
}
