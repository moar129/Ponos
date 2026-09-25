// components/notifications/notificationBellComponent.tsx
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../i18n/config'
import { notificationBody, notificationTitle } from '../../utils/notificationDisplay'
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2, CheckCheck, X } from 'lucide-react';
import {
  useGetMyNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDismissNotificationMutation, // ændret fra useDeleteNotificationMutation
} from '../../store/apis/notificationApi';
import type { AppNotification } from '../../types/notification/notificationTypes';

function useTimeAgo() {
  const { t } = useTranslation('dashboard');
  return (dateString: string): string => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return t('notifications.justNow');
    if (minutes < 60) return t('notifications.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('notifications.hoursAgo', { count: hours });
    return t('notifications.daysAgo', { count: Math.floor(hours / 24) });
  };
}

export function NotificationBellComponent() {
  const { t } = useTranslation(['notifications', 'common'])
  const td = asDynamic(t)
  const timeAgo = useTimeAgo()
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [], isLoading } = useGetMyNotificationsQuery({ limit: 8 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsReadMutation();
  const [dismissNotification] = useDismissNotificationMutation(); // ændret

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  const handleSelect = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markRead({ id: notification.id });
    }
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleDismiss = async (event: React.MouseEvent, notificationId: string) => {
    event.stopPropagation();
    await dismissNotification({ id: notificationId }); // ændret
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-full transition-colors"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t('title')}
      >
        <Bell className="w-5 h-5 xl:w-6 xl:h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-accent text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 max-h-96 rounded-lg bg-white dark:bg-slate-800 border border-border-gray dark:border-slate-700 shadow-xl z-50 overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-gray dark:border-slate-700 shrink-0">
            <h3 className="text-sm font-semibold text-primary dark:text-slate-100">{t('title')}</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                disabled={isMarkingAll}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover disabled:opacity-60"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t('markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-secondary dark:text-slate-400 text-center py-8 px-4">{t('empty')}</p>
            ) : (
              <ul className="divide-y divide-border-gray dark:divide-slate-700">
                {notifications.map((notification) => (
                  <li key={notification.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => handleSelect(notification)}
                      className={`w-full text-left pl-4 pr-9 py-3 transition-colors ${
                        notification.isRead ? 'hover:bg-bg-gray/50 dark:hover:bg-slate-700' : 'bg-accent/10 hover:bg-accent/15'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-primary dark:text-slate-100 truncate">{notificationTitle(notification, td)}</p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
                        )}
                      </div>
                      {notification.body && (
                        <p className="text-xs text-secondary dark:text-slate-400 truncate mt-0.5">{notificationBody(notification, td)}</p>
                      )}
                      <p className="text-[11px] text-secondary dark:text-slate-400 mt-1">{timeAgo(notification.createdAt)}</p>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDismiss(e, notification.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-red-500/20 text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t('hide')}
                      aria-label={t('hide')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border-gray dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifikationer');
              }}
              className="w-full text-center text-xs text-accent hover:text-accent-hover py-2.5 transition-colors"
            >
              {t('seeAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}