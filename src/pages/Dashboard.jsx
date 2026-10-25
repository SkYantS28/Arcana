import { useCallback, useEffect, useState } from 'react'
import {
  CalendarDays,
  CircleDollarSign,
  Sparkles,
  Users,
  ArrowUpRight,
  MoonStar,
} from 'lucide-react'

import { supabase } from '../lib/supabase'

function PageTitle({ eyebrow, title, description }) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
    </div>
  )
}

export default function Dashboard({ t, language, navigate, money }) {
  const [statsData, setStatsData] = useState({
    appointments: 0,
    clients: 0,
    revenue: 0,
  })

  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState('')

  const loadDashboard = useCallback(async ({ initial = false } = {}) => {
    if (!initial) {
      setLoading(true)
    }

    setDataError('')

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError) throw authError

      const user = authData.user

      if (!user) {
        throw new Error(
          'Faça login novamente para consultar seus dados.',
        )
      }

      const [appointmentsResult, clientsResult] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, status, payment_status, amount')
          .eq('owner_id', user.id),

        supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id),
      ])

      if (appointmentsResult.error) {
        throw appointmentsResult.error
      }

      if (clientsResult.error) {
        throw clientsResult.error
      }

      const appointments = appointmentsResult.data || []

      const activeAppointments = appointments.filter(
        (appointment) => appointment.status !== 'cancelled',
      )

      const revenue = activeAppointments
        .filter(
          (appointment) => appointment.payment_status === 'paid',
        )
        .reduce(
          (total, appointment) =>
            total + Number(appointment.amount || 0),
          0,
        )

      setStatsData({
        appointments: activeAppointments.length,
        clients: clientsResult.count || 0,
        revenue,
      })
    } catch (error) {
      console.error('Erro ao carregar o Dashboard:', error)

      setDataError(
        error.message ||
          'Não foi possível carregar os dados do Dashboard.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function initializeDashboard() {
      try {
        await loadDashboard({ initial: true })
      } catch (error) {
        if (cancelled) return

        console.error(
          'Erro ao inicializar o Dashboard:',
          error,
        )

        setDataError(
          error.message ||
            'Não foi possível carregar os dados do Dashboard.',
        )

        setLoading(false)
      }
    }

    initializeDashboard()

    return () => {
      cancelled = true
    }
  }, [loadDashboard])

  const stats = [
    {
      label: t.appointmentsRegistered,
      value: loading ? '…' : String(statsData.appointments),
      description:
        language === 'pt'
          ? 'Atendimentos não cancelados'
          : 'Appointments not cancelled',
      icon: CalendarDays,
      color: 'green',
    },
    {
      label: t.clients,
      value: loading ? '…' : String(statsData.clients),
      description:
        language === 'pt'
          ? 'Consulentes cadastrados'
          : 'Registered clients',
      icon: Users,
      color: 'blue',
    },
    {
      label: t.revenueReceived,
      value: loading
        ? '…'
        : money(statsData.revenue, language),
      description:
        language === 'pt'
          ? 'Total de pagamentos confirmados'
          : 'Total of confirmed payments',
      icon: CircleDollarSign,
      color: 'gold',
    },
  ]

  const steps = [
    {
      label: t.addServicesStep,
      detail: t.defineNamesPrices,
      page: 'catalogo',
    },
    {
      label: t.organizeSchedule,
      detail: t.registerDates,
      page: 'agenda',
    },
    {
      label: t.configureRewards,
      detail: t.customizeLoyalty,
      page: 'recompensas',
    },
  ]

  return (
    <div className="dashboard-page">
      <PageTitle
        eyebrow={t.dashboardEyebrow}
        title={t.dashboardTitle}
        description={t.dashboardDescription}
      />

      {dataError && (
        <div
          className="dashboard-data-error"
          role="alert"
          style={{
            marginBottom: '20px',
            padding: '14px 16px',
            borderRadius: '10px',
            background: 'var(--surface-secondary, #f8eeee)',
            color: 'var(--text-primary, #713b3b)',
          }}
        >
          <p>{dataError}</p>

          <button
            type="button"
            className="button"
            onClick={() => loadDashboard()}
            disabled={loading}
          >
            {loading ? 'Carregando...' : 'Tentar novamente'}
          </button>
        </div>
      )}

      <section className="welcome-panel">
        <div className="welcome-decoration" aria-hidden="true">
          <Sparkles size={22} />
        </div>

        <div className="welcome-content">
          <span className="welcome-eyebrow">
            {t.welcomeEyebrow}
          </span>

          <h2>{t.welcomeTitle}</h2>

          <p>{t.welcomeDescription}</p>

          <button
            type="button"
            className="button button-light"
            onClick={() => navigate('catalogo')}
          >
            {t.configureCatalog}
            <ArrowUpRight size={17} />
          </button>
        </div>

        <MoonStar
          className="welcome-moon"
          size={104}
          strokeWidth={0.8}
          aria-hidden="true"
        />
      </section>

      <section
        className="dashboard-section"
        aria-labelledby="overview-title"
      >
        <div className="section-heading dashboard-heading">
          <div>
            <h2 id="overview-title">{t.overview}</h2>

            <span>
              {language === 'pt'
                ? 'Dados atualizados da sua conta'
                : 'Updated account data'}
            </span>
          </div>

          <button
            type="button"
            className="button"
            onClick={() => loadDashboard()}
            disabled={loading}
          >
            {loading
              ? language === 'pt'
                ? 'Atualizando...'
                : 'Refreshing...'
              : language === 'pt'
                ? 'Atualizar'
                : 'Refresh'}
          </button>
        </div>

        <div className="stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon

            return (
              <article className="stat-card" key={stat.label}>
                <div className={`stat-icon ${stat.color}`}>
                  <Icon size={21} />
                </div>

                <span className="stat-label">{stat.label}</span>

                <strong className="stat-value">
                  {stat.value}
                </strong>

                <small className="stat-description">
                  {stat.description}
                </small>
              </article>
            )
          })}
        </div>
      </section>

      <section className="content-card next-steps">
        <div className="card-heading">
          <div>
            <h2>{t.firstSteps}</h2>
            <p>{t.firstStepsDescription}</p>
          </div>

          <Sparkles
            size={21}
            className="gold-text"
            aria-hidden="true"
          />
        </div>

        <div className="steps-list">
          {steps.map((item, index) => (
            <button
              type="button"
              className="step-row"
              key={item.page}
              onClick={() => navigate(item.page)}
            >
              <span className="step-number">{index + 1}</span>

              <span className="step-copy">
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>

              <ArrowUpRight
                className="step-arrow"
                size={18}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
