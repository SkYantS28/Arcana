
import {
  Plus,
  Sparkles,
  Search,
  MoonStar,
  Trash2,
  Layers3,
} from 'lucide-react'

function PageTitle({ eyebrow, title, description, action }) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={25} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export default function Catalogo({
  t,
  language,
  services,
  servicesLoading,
  deletingServiceId,
  filteredServices,
  search,
  setSearch,
  setNotice,
  setShowServiceForm,
  deleteService,
  money,
}) {
  return (
    <>
      <PageTitle
        eyebrow={t.catalogEyebrow}
        title={t.catalogTitle}
        description={t.catalogDescription}
        action={
          <button
            className="button button-primary"
            onClick={() => {
              setNotice('')
              setShowServiceForm(true)
            }}
            disabled={servicesLoading}
          >
            <Plus size={18} />
            {t.addService}
          </button>
        }
      />

      <div className="info-banner">
        <Sparkles size={20} />
        <div>
          <strong>{t.catalogBannerTitle}</strong>
          <p>{t.catalogBannerDescription}</p>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <h2>{t.yourServices}</h2>
          <span>
            {services.length}{' '}
            {services.length === 1
              ? t.serviceRegistered
              : t.servicesRegistered}
          </span>
        </div>

        <label className="search-box">
          <Search size={17} />
          <input
            aria-label={t.searchServiceLabel}
            placeholder={t.searchService}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {servicesLoading ? (
        <div className="content-card">
          <p>{t.loadingServices}</p>
        </div>
      ) : filteredServices.length > 0 ? (
        <div className="service-list">
          {filteredServices.map((service) => (
            <article className="service-card" key={service.id}>
              <div className="service-symbol">
                <MoonStar size={22} />
              </div>

              <div className="service-details">
                <h3>{service.name}</h3>
                <span>
                  {service.active
                    ? t.activeService
                    : t.inactiveService}
                </span>
              </div>

              <strong className="service-price">
                {money(service.price, language)}
              </strong>

              <button
                className="icon-button danger-hover"
                aria-label={`${t.deleteService}: ${service.name}`}
                title={t.deleteService}
                disabled={deletingServiceId === service.id}
                onClick={() => deleteService(service.id)}
              >
                {deletingServiceId === service.id
                  ? <span>...</span>
                  : <Trash2 size={18} />}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Layers3}
          title={
            services.length
              ? t.noServiceFound
              : t.emptyCatalog
          }
          description={
            services.length
              ? t.tryAnotherSearch
              : t.emptyCatalogDescription
          }
          action={
            !services.length ? (
              <button
                className="button button-primary"
                onClick={() => {
                  setNotice('')
                  setShowServiceForm(true)
                }}
              >
                <Plus size={18} />
                {t.addService}
              </button>
            ) : null
          }
        />
      )}
    </>
  )
}
