import {
  Menu,
  Bell,
} from 'lucide-react'

export default function Topbar({
  setMobileMenuOpen,
  translations: t,
  activeNavigation,
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-menu-button icon-button"
          aria-label={t.openMenu}
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu size={22} />
        </button>

        <div className="breadcrumb">
          <span>{t.workspace}</span>
          <span className="breadcrumb-separator">/</span>
          <strong>
            {activeNavigation?.label || t.navOverview}
          </strong>
        </div>
      </div>

      <div className="topbar-actions">
        <span className="demo-badge">
          <span /> {t.catalogConnected}
        </span>

        <button
          className="icon-button notification-button"
          aria-label={t.notifications}
          title={t.notifications}
        >
          <Bell size={19} />
        </button>
      </div>
    </header>
  )
}
