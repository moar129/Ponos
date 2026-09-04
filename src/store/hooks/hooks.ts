// This file contains custom hooks for using the Redux store in a React application.
// It provides typed versions of the useDispatch and useSelector hooks from react-redux, 
// allowing for better type safety and autocompletion when working with the Redux store.

import type { TypedUseSelectorHook } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;