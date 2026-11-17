import {
  Bell,
  CalendarClock,
  Check,
  CircleDollarSign,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'
import '../styles/notifications.css'

function getLocale(language) {
  if (language === 'en') return 'en-US'
  if (language === 'es') return 'es-ES'
  return 'pt-BR'
}

function formatNotification(notification, t, locale) {
  if (notification.kind === 'appointment') {
    const date = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(notification.occurredAt))

    return {
      title: t.notificationAppointmentTitle,
      message: t.notificationAppointmentBody
        .replace('{client}', notification.clientName || t.name)
        .replace('{service}', notification.serviceName || t.service)
        .replace('{date}', date),
      action: t.notificationOpenAgenda,
      destination: 'agenda',
      Icon: CalendarClock,
    }
  }

  return {
    title: t.notificationPointsTitle,
    message: t.notificationPointsBody
      .replace('{client}', notification.clientName || t.name)
      .replace(
        '{points}',
        Number(notification.points).toLocaleString(locale),
      )
      .replace('{reward}', notification.reward || t.available),
    action: t.notificationOpenRewards,
    destination: 'recompensas',
    Icon: CircleDollarSign,
  }
}

export default function Notifications({
  t,
  language,
  notifications,
  loading,
  error,
  unreadIds,
  markAsRead,
  markAllAsRead,
  refresh,
  navigate,
}) {
  const locale = getLocale(language)
  const unreadCount = unreadIds.size

  return (
    <section className="notifications-page">
      <header className="page-title notifications-heading">
        <div>
          <span className="notifications-eyebrow">{t.newNotification}</span>
          <h1>{t.notificationsTitle}</h1>
          <p>{t.notificationsDescription}</p>
        </div>

        <div className="notifications-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={refresh}
            aria-label={t.notificationRefresh}
            title={t.notificationRefresh}
          >
            <RefreshCw size={16} />
            {t.notificationRefresh}
          </button>
          {unreadCount > 0 && (
            <button
              className="button button-primary"
              type="button"
              onClick={markAllAsRead}
            >
              <Check size={16} />
              {t.markAllAsRead}
            </button>
          )}
        </div>
      </header>

      {error && (error === 'storage' || notifications.length > 0) && (
        <div className="notifications-error" role="alert">
          {error === 'storage'
            ? t.notificationSaveError
            : `${t.notificationLoadError} ${error}`}
        </div>
      )}

      {loading ? (
        <div className="notifications-empty" role="status">
          <LoaderCircle className="notifications-spinner" size={25} />
          <span>{t.loading}</span>
        </div>
      ) : error && error !== 'storage' && notifications.length === 0 ? (
        <div className="notifications-empty" role="alert">
          <h2>{t.notificationLoadError}</h2>
          <p>{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty">
          <span className="notifications-empty-icon">
            <Bell size={22} />
          </span>
          <h2>{t.noNotifications}</h2>
          <p>{t.notificationsDescription}</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => {
            const item = formatNotification(notification, t, locale)
            const isUnread = unreadIds.has(notification.id)
            const Icon = item.Icon

            return (
              <article
                className={`notification-card${isUnread ? ' notification-unread' : ''}`}
                key={notification.id}
              >
                <span className="notification-icon">
                  <Icon size={20} />
                </span>

                <div className="notification-copy">
                  <div className="notification-card-heading">
                    <h2>{item.title}</h2>
                    {isUnread && (
                      <span className="notification-new">{t.newNotification}</span>
                    )}
                  </div>
                  <p>{item.message}</p>
                  <time dateTime={notification.occurredAt}>
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(notification.occurredAt))}
                  </time>
                </div>

                <div className="notification-card-actions">
                  <button
                    className="notification-action-link"
                    type="button"
                    onClick={() => {
                      markAsRead(notification.id)
                      navigate(item.destination)
                    }}
                  >
                    {item.action}
                  </button>
                  {isUnread && (
                    <button
                      className="notification-read-button"
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                    >
                      {t.markAsRead}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
