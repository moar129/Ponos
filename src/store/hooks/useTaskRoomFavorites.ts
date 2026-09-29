import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../ErrorMessage';
import {
  useAddTaskRoomFavoriteMutation,
  useGetTaskRoomFavoritesQuery,
  useRemoveTaskRoomFavoriteMutation,
} from '../apis/taskRoomFavoriteApi';

const EMPTY_FAVORITES: string[] = [];

// Delt af RoomBar og TaskPage-overskriften. Hentefejl
// ignoreres (rum vises bare i normal rækkefølge); togglefejl rulles
// tilbage optimistisk og returneres som besked.
export function useTaskRoomFavorites(enabled: boolean) {
  const { t } = useTranslation('tasks');
  const { data: favorites = EMPTY_FAVORITES } = useGetTaskRoomFavoritesQuery(undefined, { skip: !enabled });
  const [addFavorite] = useAddTaskRoomFavoriteMutation();
  const [removeFavorite] = useRemoveTaskRoomFavoriteMutation();
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  const favoriteIds = useMemo(() => new Set(favorites), [favorites]);

  const toggleFavorite = async (roomId: string) => {
    setFavoriteError(null);
    try {
      if (favoriteIds.has(roomId)) await removeFavorite(roomId).unwrap();
      else await addFavorite(roomId).unwrap();
    } catch (err: unknown) {
      setFavoriteError(getErrorMessage(err, t('favorites.toggleFailed')));
    }
  };

  return { favoriteIds, toggleFavorite, favoriteError };
}
