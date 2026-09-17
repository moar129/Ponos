// components/notifications/notificationBellComponent.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2, CheckCheck } from 'lucide-react';
import {
  useGetMyNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../../store/apis/notificationApi';
import type { AppNotification } from '../../types/notification/notificationTypes';

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Lige nu';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} t`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

export function NotificationBellComponent() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [], isLoading } = useGetMyNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsReadMutation();

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

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-full transition-colors"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Notifikationer"
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
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg bg-white border border-border-gray shadow-xl z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-gray">
            <h3 className="text-sm font-semibold text-primary">Notifikationer</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                disabled={isMarkingAll}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover disabled:opacity-60"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Markér alle som læst
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-secondary text-center py-8 px-4">Ingen notifikationer endnu.</p>
          ) : (
            <ul className="divide-y divide-border-gray">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(notification)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      notification.isRead ? 'hover:bg-bg-gray/50' : 'bg-accent/10 hover:bg-accent/15'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-primary truncate">{notification.title}</p>
                      {!notification.isRead && (
                        <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
                      )}
                    </div>
                    {notification.body && (
                      <p className="text-xs text-secondary truncate mt-0.5">{notification.body}</p>
                    )}
                    <p className="text-[11px] text-secondary mt-1">{timeAgo(notification.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}