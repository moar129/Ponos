import type { Room } from '../types/Task/Task';

// Favoritrum først, resten bagefter - begge i rummenes egen rækkefølge
// (created_at fra getRooms), så listen er stabil.
export function splitFavoriteRooms(rooms: Room[], favoriteIds: Set<string>): { favoriteRooms: Room[]; otherRooms: Room[] } {
  return {
    favoriteRooms: rooms.filter((room) => favoriteIds.has(room.id)),
    otherRooms: rooms.filter((room) => !favoriteIds.has(room.id)),
  };
}
