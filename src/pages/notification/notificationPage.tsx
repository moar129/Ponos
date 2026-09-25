// pages/notifications/NotificationsPage.tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../i18n/config'
import { notificationBody, notificationTitle } from '../../utils/notificationDisplay'
import { Bell, Loader2, CheckCheck, Trash2, EyeOff, Eye, MessageSquare, ListChecks, Newspaper } from 'lucide-react';
import {
  useGetMyNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useUndismissNotificationMutation,
} from '../../store/apis/notificationApi';
import type { AppNotification } from '../../types/notification/notificationTypes';
import { formatNumericDateTime } from '../../utils/formatDate';


// --- Kategorisering af notifikationer ---------------------------------
// Notifikationstyperne kommer fra e_notification-check-constrainten:
// 'message', 'task_assigned', 'task_updated', 'task_completed',
// 'task_approved', 'task_rejected', 'news'. Ukendte typer falder
// tilbage til 'news'.
type NotificationCategory = 'messages' | 'tasks' | 'news';
type CategoryFilter = NotificationCategory | 'all';

function getNotificationCategory(type: string): NotificationCategory {
  if (type === 'message') return 'messages';
  if (type.startsWith('task_')) return 'tasks';
  return 'news';
}

const CATEGORY_ICONS: Record<NotificationCategory, typeof Bell> = {
  messages: MessageSquare,
  tasks: ListChecks,
  news: Newspaper,
};

const CATEGORY_ORDER: NotificationCategory[] = ['messages', 'tasks', 'news'];

export default function NotificationsPage() {
  const { t } = useTranslation(['notifications', 'common'])
  const td = asDynamic(t)
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

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

  // Antal ulæste pr. kategori - styrer prikken ud for hvert link i sidebaren
  const unreadCountByCategory = useMemo(() => {
    const counts: Record<NotificationCategory, number> = { messages: 0, tasks: 0, news: 0 };
    for (const n of notifications) {
      if (!n.isRead) counts[getNotificationCategory(n.type)]++;
    }
    return counts;
  }, [notifications]);

  const totalUnread =
    unreadCountByCategory.messages + unreadCountByCategory.tasks + unreadCountByCategory.news;

  const filteredNotifications = useMemo(() => {
    if (activeCategory === 'all') return notifications;
    return notifications.filter((n) => getNotificationCategory(n.type) === activeCategory);
  }, [notifications, activeCategory]);

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

  // Markér alle som læst: for "Alle" bruges det eksisterende globale
  // endpoint. For en enkelt kategori (fx kun Beskeder) er der endnu ikke
  // et kategori-scoped endpoint på backend, så her løbes de ulæste
  // notifikationer i kategorien igennem og markeres enkeltvis.
  // Hvis I senere tilføjer et endpoint som markCategoryRead({category}),
  // kan denne funktion forenkles til ét kald.
  const handleMarkVisibleRead = async () => {
    if (activeCategory === 'all') {
      await markAllRead();
      return;
    }
    const unreadIds = notifications
      .filter((n) => !n.isRead && getNotificationCategory(n.type) === activeCategory)
      .map((n) => n.id);
    await Promise.all(unreadIds.map((id) => markRead({ id })));
  };

  const activeUnreadCount = activeCategory === 'all' ? totalUnread : unreadCountByCategory[activeCategory];

  return (
    <div className="bg-white rounded-xl border border-border-gray shadow-sm max-w-4xl mx-auto dark:bg-slate-800 dark:border-slate-700 flex flex-col sm:flex-row overflow-hidden">
      {/* --- Sidebar med kategori-links --- */}
      <nav className="sm:w-48 sm:shrink-0 border-b sm:border-b-0 sm:border-r border-border-gray dark:border-slate-700 p-2 sm:p-3 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible">
        <SidebarLink
          label={t('common:all')}
          isActive={activeCategory === 'all'}
          hasUnread={totalUnread > 0}
          icon={Bell}
          onClick={() => setActiveCategory('all')}
        />
        {CATEGORY_ORDER.map((category) => (
          <SidebarLink
            key={category}
            label={td(`notifications:category.${category}`)}
            isActive={activeCategory === category}
            hasUnread={unreadCountByCategory[category] > 0}
            icon={CATEGORY_ICONS[category]}
            onClick={() => setActiveCategory(category)}
          />
        ))}
      </nav>

      {/* --- Indhold --- */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border-gray dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            <h1 className="text-lg font-semibold text-primary dark:text-slate-100">
              {activeCategory === 'all' ? t('title') : td(`notifications:category.${activeCategory}`)}
            </h1>
          </div>
          {activeUnreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkVisibleRead}
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
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-secondary px-4 dark:text-slate-400">
            <Bell className="w-10 h-10 mb-3 stroke-[1.5] text-secondary dark:text-slate-400" />
            <p className="text-sm">
              {activeCategory === 'all'
                ? t('empty')
                : t('emptyCategory', { category: td(`notifications:category.${activeCategory}`).toLowerCase() })}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border-gray dark:divide-slate-700">
            {filteredNotifications.map((notification) => {
              const isDismissed = !!notification.dismissedAt;
              return (
                <li key={notification.id}>
                  <div
                    className={`flex items-start gap-3 px-4 sm:px-6 py-4 transition-colors ${
                      isDismissed
                        ? 'opacity-60'
                        : notification.isRead
                        ? 'hover:bg-bg-gray/50 dark:hover:bg-slate-700/50'
                        : 'bg-accent/5 hover:bg-accent/10'
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
                        <p className="text-sm font-medium text-primary truncate dark:text-slate-100">{notificationTitle(notification, td)}</p>
                        {isDismissed && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-gray text-secondary shrink-0 dark:bg-slate-700 dark:text-slate-400">
                            {t('hidden')}
                          </span>
                        )}
                      </div>
                      {notification.body && (
                        <p className="text-sm text-secondary mt-1 line-clamp-2 dark:text-slate-400">
                          {notificationBody(notification, td)}
                        </p>
                      )}
                      <p className="text-xs text-secondary mt-1.5 dark:text-slate-400">
                        {formatNumericDateTime(notification.createdAt)}
                      </p>
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
    </div>
  );
}

// --- Sidebar link-komponent ---------------------------------------------
function SidebarLink({
  label,
  isActive,
  hasUnread,
  icon: Icon,
  onClick,
}: {
  label: string;
  isActive: boolean;
  hasUnread: boolean;
  icon: typeof Bell;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
        isActive
          ? 'bg-accent/10 text-accent'
          : 'text-secondary hover:bg-bg-gray hover:text-primary dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {hasUnread && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
    </button>
  );
}