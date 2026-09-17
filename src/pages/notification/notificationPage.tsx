// pages/notifications/NotificationsPage.tsx
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2, CheckCheck, Trash2, EyeOff, Eye } from 'lucide-react';
import {
  useGetMyNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useUndismissNotificationMutation,
} from '../../store/apis/notificationApi';
import type { AppNotification } from '../../types/notification/notificationTypes';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('da-DK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
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
    <div className="bg-[#0B132A] rounded-xl border border-slate-800 shadow-sm max-w-2xl mx-auto">
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#C7975D]" />
          <h1 className="text-lg font-semibold text-slate-100">Notifikationer</h1>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllRead()}
            disabled={isMarkingAll}
            className="flex items-center gap-1.5 text-sm text-[#C7975D] hover:text-[#e0ac6f] disabled:opacity-60"
          >
            <CheckCheck className="w-4 h-4" />
            Markér alle som læst
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#C7975D]" />
        </div>
      ) : errorMessage ? (
        <div className="m-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {errorMessage}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 px-4">
          <Bell className="w-10 h-10 mb-3 stroke-[1.5] text-slate-500" />
          <p className="text-sm">Ingen notifikationer endnu.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-800">
          {notifications.map((notification) => {
            const isDismissed = !!notification.dismissedAt;
            return (
              <li key={notification.id}>
                <div
                  className={`flex items-start gap-3 px-4 sm:px-6 py-4 transition-colors ${
                    isDismissed
                      ? 'opacity-60'
                      : notification.isRead
                      ? 'hover:bg-slate-800/40'
                      : 'bg-slate-800/30 hover:bg-slate-800/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(notification)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {!notification.isRead && !isDismissed && (
                        <span className="w-2 h-2 rounded-full bg-[#C7975D] shrink-0" />
                      )}
                      <p className="text-sm font-medium text-slate-100 truncate">{notification.title}</p>
                      {isDismissed && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 shrink-0">
                          Skjult
                        </span>
                      )}
                    </div>
                    {notification.body && (
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">{notification.body}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1.5">{formatDate(notification.createdAt)}</p>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {isDismissed ? (
                      <button
                        type="button"
                        onClick={(e) => handleUndismiss(e, notification.id)}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors"
                        title="Vis i klokken igen"
                        aria-label="Vis i klokken igen"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleUndismiss(e, notification.id)}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors opacity-0"
                        disabled
                        aria-hidden="true"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, notification.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                      title="Slet permanent"
                      aria-label="Slet notifikation permanent"
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