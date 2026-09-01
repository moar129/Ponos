import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'
import type { RootState, AppDispatch } from '../store'

// Brug disse i stedet for de "rå" useDispatch/useSelector i komponenter -
// giver fuld autocomplete og typetjek uden ekstra skriveri hver gang.
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector