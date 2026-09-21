// pages/notifications/NotificationsPage.tsx
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../i18n/config'
import { Bell, Loader2, CheckCheck, Trash2, EyeOff, Eye } from 'lucide-react';
import {
  useGetMyNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useUndismissNotificationMutation,
} from '../../store/apis/notificationApi';
import type { AppNotification } from '../../types/notification/notificationTypes';
import { formatNumericDateTime } from '../../utils/formatDate';


export default function NotificationsPage() {
  const { t } = useTranslation(['notifications', 'common'])
  const td = asDynamic(t)
  const navigate = useNavigate();
  // onlyVisible: false - denne side viser ALT, inklusiv skjulte, så
  // brugeren kan finde og evt. rigtigt slette dem eller gøre dem synlige
  // i klokken igen.
  const { data: notifications = [], isLoading, error } = useGetMyNotificationsQuery({
    limit: 200,
    onlyVisible: false,
  });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [undismissNotification] = useUndismissNotificationMutation();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const errorMessage =
    error && typeof error === 'object' && 'error' in error
      ? (error as { error: string }).error
      : null;

  const handleSelect = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markRead({ id: notification.id });
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleDelete = async (event: React.MouseEvent, notificationId: string) => {
    event.stopPropagation();
    await deleteNotification({ id: notificationId });
  };

  const handleUndismiss = async (event: React.MouseEvent, notificationId: string) => {
    event.stopPropagation();
    await undismissNotification({ id: notificationId });
  };

  return (
    <div className="bg-white rounded-xl border border-border-gray shadow-sm max-w-2xl mx-auto dark:bg-slate-800 dark:border-slate-700">
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border-gray dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-semibold text-primary dark:text-slate-100">{t('title')}</h1>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllRead()}
            disabled={isMarkingAll}
            className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover disabled:opacity-60"
          >
            <CheckCheck className="w-4 h-4" />
            {t('markAllRead')}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : errorMessage ? (
        <div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          {errorMessage}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-secondary px-4 dark:text-slate-400">
          <Bell className="w-10 h-10 mb-3 stroke-[1.5] text-secondary dark:text-slate-400" />
          <p className="text-sm">{t('empty')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border-gray dark:divide-slate-700">
          {notifications.map((notification) => {
            const isDismissed = !!notification.dismissedAt;
            return (
              <li key={notification.id}>
                <div
                  className={`flex items-start gap-3 px-4 sm:px-6 py-4 transition-colors ${
                    isDismissed
                      ? 'opacity-60'
                      : notification.isRead
                      ? 'hover:bg-bg-gray/50 dark:hover:bg-slate-700/50'
                      : 'bg-accent/10 hover:bg-accent/15'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(notification)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {!notification.isRead && !isDismissed && (
                        <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                      )}
                      <p className="text-sm font-medium text-primary truncate dark:text-slate-100">{td(`notifications:type.${notification.type}`)}</p>
                      {isDismissed && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-gray text-secondary shrink-0 dark:bg-slate-700 dark:text-slate-400">
                          {t('hidden')}
                        </span>
                      )}
                    </div>
                    {notification.body && (
                      <p className="text-sm text-secondary mt-1 line-clamp-2 dark:text-slate-400">{notification.body}</p>
                    )}
                    <p className="text-xs text-secondary mt-1.5 dark:text-slate-400">{formatNumericDateTime(notification.createdAt)}</p>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {isDismissed ? (
                      <button
                        type="button"
                        onClick={(e) => handleUndismiss(e, notification.id)}
                        className="p-2 rounded-lg hover:bg-bg-gray text-secondary hover:text-primary transition-colors dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
                        title={t('unhide')}
                        aria-label={t('unhide')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleUndismiss(e, notification.id)}
                        className="p-2 rounded-lg hover:bg-bg-gray text-secondary hover:text-primary transition-colors opacity-0 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
                        disabled
                        aria-hidden="true"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, notification.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-secondary hover:text-red-500 transition-colors dark:text-slate-400 dark:hover:text-red-400"
                      title={t('deletePermanently')}
                      aria-label={t('deleteAriaLabel')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}