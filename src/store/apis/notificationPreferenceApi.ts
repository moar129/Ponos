import { supabaseApi } from './supabaseApi';
import { supabase } from '../../lib/supabase';
import { mapDbError, runQuery } from './apiError';
import { getCurrentUserId } from './session';
import type { NotificationPreferences, NotificationType } from '../../types/notification/notificationTypes';

// US-79: brugerens notifikationsindstillinger (notification_preferences).
// Selve filtreringen sker i databasen (trigger skip_muted_notification på
// notifications) - her læses og gemmes kun valgene. Ingen række = alt til.
const DEFAULT_PREFERENCES: NotificationPreferences = { enabled: true, mutedTypes: [] };


export const notificationPreferenceApi = supabaseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotificationPreferences: builder.query<NotificationPreferences, void>({
      queryFn: () => runQuery(async () => {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('enabled, muted_types')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) return { error: mapDbError(error) };
        if (!data) return { data: DEFAULT_PREFERENCES };

        return {
          data: {
            enabled: data.enabled as boolean,
            mutedTypes: (data.muted_types ?? []) as NotificationType[],
          },
        };
      }),
      providesTags: ['NotificationPreference'],
    }),

    updateNotificationPreferences: builder.mutation<void, NotificationPreferences>({
      queryFn: (preferences) => runQuery(async () => {
        const userId = await getCurrentUserId();
        const { error } = await supabase.from('notification_preferences').upsert({
          user_id: userId,
          enabled: preferences.enabled,
          muted_types: preferences.mutedTypes,
          updated_at: new Date().toISOString(),
        });

        if (error) return { error: mapDbError(error) };
        return { data: undefined };
      }),
      // Optimistisk: kontakten skifter med det samme; rulles tilbage ved fejl.
      async onQueryStarted(preferences, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          notificationPreferenceApi.util.updateQueryData('getNotificationPreferences', undefined, () => preferences),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ['NotificationPreference'],
    }),
  }),
});

export const { useGetNotificationPreferencesQuery, useUpdateNotificationPreferencesMutation } = notificationPreferenceApi;
