import {
  MoonStar,
  Sparkles,
  X,
  LogOut,
} from 'lucide-react'

export default function Sidebar({
  mobileMenuOpen,
  setMobileMenuOpen,
  navigation,
  secondaryNavigation,
  activePage,
  navigate,
  translations: t,
  user,
  handleSignOut,
  signingOut,
}) {
  return (
    <>
      {mobileMenuOpen && (
        <button
          className="mobile-backdrop"
          aria-label={t.closeMenu}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}
      >
        <div className="brand">
          <div className="brand-mark">
            <MoonStar size={24} />
          </div>

          <div>
            <strong>Arcana</strong>
            <span>{t.brandSubtitle}</span>
          </div>

          <button
            className="mobile-close icon-button"
            aria-label={t.closeMenu}
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-label">{t.mainMenu}</div>

        <nav className="nav-list" aria-label={t.mainMenu}>
          {navigation.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.id}
                className={`nav-item ${
                  activePage === item.id ? 'nav-active' : ''
                }`}
                onClick={() => navigate(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>

                {activePage === item.id && (
                  <span className="active-dot" />
                )}
              </button>
            )
          })}
        </nav>

        <div className="workspace-label secondary-label">
          {t.preferences}
        </div>

        <nav className="nav-list" aria-label={t.preferences}>
          {secondaryNavigation.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.id}
                className={`nav-item ${
                  activePage === item.id ? 'nav-active' : ''
                }`}
                onClick={() => navigate(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="moon-card">
            <Sparkles size={17} />
            <p>{t.tagline}</p>
            <span>{t.taglineSubtitle}</span>
          </div>

          <div className="profile-mini">
            <div className="avatar">
              {(user.email?.[0] || 'U').toUpperCase()}
            </div>

            <div className="profile-copy">
              <strong>{user.email}</strong>
              <span>{t.connectedAccount}</span>
            </div>

            <button
              className="icon-button"
              onClick={handleSignOut}
              disabled={signingOut}
              title={t.signOut}
              aria-label={t.signOut}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
