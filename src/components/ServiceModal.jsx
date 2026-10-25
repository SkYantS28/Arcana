import { Plus, X } from 'lucide-react'

export default function ServiceModal({
  showServiceForm,
  setShowServiceForm,
  savingService,
  t,
  serviceName,
  setServiceName,
  servicePrice,
  setServicePrice,
  addService,
}) {
  if (!showServiceForm) return null

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !savingService
        ) {
          setShowServiceForm(false)
        }
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-modal-title"
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">{t.myCatalog}</span>
            <h2 id="service-modal-title">
              {t.addServiceTitle}
            </h2>
            <p>{t.addServiceDescription}</p>
          </div>

          <button
            className="icon-button"
            aria-label={t.closeForm}
            disabled={savingService}
            onClick={() => setShowServiceForm(false)}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={addService}>
          <label className="form-label" htmlFor="service-name">
            {t.serviceName} <span>{t.required}</span>
          </label>

          <input
            id="service-name"
            autoFocus
            className="form-input"
            placeholder={t.serviceNamePlaceholder}
            value={serviceName}
            onChange={(event) =>
              setServiceName(event.target.value)
            }
            maxLength={100}
            required
          />

          <label className="form-label" htmlFor="service-price">
            {t.servicePrice} <span>{t.required}</span>
          </label>

          <div className="price-input-wrap">
            <span>R$</span>
            <input
              id="service-price"
              className="form-input"
              type="number"
              min="0"
              max="999999"
              step="0.01"
              placeholder={t.servicePricePlaceholder}
              value={servicePrice}
              onChange={(event) =>
                setServicePrice(event.target.value)
              }
              required
            />
          </div>

          <p className="form-hint">
            {t.serviceFormHint}
          </p>

          <div className="modal-actions">
            <button
              type="button"
              className="button button-secondary"
              disabled={savingService}
              onClick={() => setShowServiceForm(false)}
            >
              {t.cancel}
            </button>

            <button
              type="submit"
              className="button button-primary"
              disabled={savingService}
            >
              <Plus size={17} />
              {savingService ? t.saving : t.saveService}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}