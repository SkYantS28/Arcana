import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

const CONSENT_VERSION = '1.0'
const MESSAGE_DURATION = 3500

const PROFILE_COLUMNS =
  'id, full_name, created_at, theme, language, trial_started_at, billing_consent_at, billing_consent_version'

const TEXT = {
  'pt-BR': {
    title: 'Configurações',
    subtitle: 'Personalize sua experiência.',
    profile: 'Perfil',
    name: 'Nome completo',
    email: 'E-mail',
    edit: 'Editar',
    cancel: 'Cancelar',
    appearance: 'Aparência',
    light: 'Claro',
    dark: 'Escuro',
    language: 'Idioma',
    portuguese: 'Português',
    english: 'Inglês',
    spanish: 'Espanhol',
    trial: 'Período de teste',
    trialDescription:
      'Você pode testar os recursos disponíveis durante o período de avaliação.',
    daysRemaining: 'dias restantes',
    trialEnded: 'Seu período de teste terminou.',
    monthlyPrice: 'Após o teste: R$ 14,99/mês',
    billingTitle: 'Consentimento de cobrança',
    billingDescription:
      'Ao autorizar, você registra sua concordância com a cobrança mensal informada. Isso não ativa pagamentos automáticos nem cadastra uma forma de pagamento.',
    authorize: 'Registrar consentimento',
    withdraw: 'Retirar consentimento',
    consentActive: 'Consentimento registrado.',
    consentInactive: 'Nenhum consentimento de cobrança registrado.',
    security: 'Segurança',
    securityDescription:
      'Sua conta utiliza autenticação pelo Supabase. Nunca compartilhe sua senha.',
    save: 'Salvar alterações',
    saving: 'Salvando...',
    nameRequired: 'Informe seu nome completo.',
    saved: 'Configurações salvas com sucesso.',
    consentSaved: 'Consentimento atualizado com sucesso.',
    error: 'Não foi possível salvar as alterações.',
    loading: 'Carregando configurações...',
    loadError: 'Não foi possível carregar seu perfil.',
    userError: 'Não foi possível identificar o usuário conectado.',
  },

  en: {
    title: 'Settings',
    subtitle: 'Customize your experience.',
    profile: 'Profile',
    name: 'Full name',
    email: 'Email',
    edit: 'Edit',
    cancel: 'Cancel',
    appearance: 'Appearance',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
    portuguese: 'Portuguese',
    english: 'English',
    spanish: 'Spanish',
    trial: 'Trial period',
    trialDescription:
      'Try the available features during your evaluation period.',
    daysRemaining: 'days remaining',
    trialEnded: 'Your trial period has ended.',
    monthlyPrice: 'After the trial: R$ 14.99/month',
    billingTitle: 'Billing consent',
    billingDescription:
      'By authorizing, you record your agreement with the stated monthly charge. This does not activate automatic payments or add a payment method.',
    authorize: 'Record consent',
    withdraw: 'Withdraw consent',
    consentActive: 'Consent recorded.',
    consentInactive: 'No billing consent recorded.',
    security: 'Security',
    securityDescription:
      'Your account uses Supabase authentication. Never share your password.',
    save: 'Save changes',
    saving: 'Saving...',
    nameRequired: 'Enter your full name.',
    saved: 'Settings saved successfully.',
    consentSaved: 'Consent updated successfully.',
    error: 'Unable to save changes.',
    loading: 'Loading settings...',
    loadError: 'Unable to load your profile.',
    userError: 'Unable to identify the signed-in user.',
  },

  es: {
    title: 'Configuración',
    subtitle: 'Personaliza tu experiencia.',
    profile: 'Perfil',
    name: 'Nombre completo',
    email: 'Correo electrónico',
    edit: 'Editar',
    cancel: 'Cancelar',
    appearance: 'Apariencia',
    light: 'Claro',
    dark: 'Oscuro',
    language: 'Idioma',
    portuguese: 'Portugués',
    english: 'Inglés',
    spanish: 'Español',
    trial: 'Período de prueba',
    trialDescription:
      'Prueba las funciones disponibles durante el período de evaluación.',
    daysRemaining: 'días restantes',
    trialEnded: 'Tu período de prueba ha terminado.',
    monthlyPrice: 'Después de la prueba: R$ 14,99/mes',
    billingTitle: 'Consentimiento de cobro',
    billingDescription:
      'Al autorizar, registras tu conformidad con el cobro mensual indicado. Esto no activa pagos automáticos ni añade un método de pago.',
    authorize: 'Registrar consentimiento',
    withdraw: 'Retirar consentimiento',
    consentActive: 'Consentimiento registrado.',
    consentInactive: 'No hay consentimiento de cobro registrado.',
    security: 'Seguridad',
    securityDescription:
      'Tu cuenta utiliza la autenticación de Supabase. Nunca compartas tu contraseña.',
    save: 'Guardar cambios',
    saving: 'Guardando...',
    nameRequired: 'Introduce tu nombre completo.',
    saved: 'Configuración guardada correctamente.',
    consentSaved: 'Consentimiento actualizado correctamente.',
    error: 'No se pudieron guardar los cambios.',
    loading: 'Cargando configuración...',
    loadError: 'No se pudo cargar tu perfil.',
    userError: 'No se pudo identificar al usuario conectado.',
  },
}

function addMonthsClamped(date, months) {
  const result = new Date(date)
  const originalDay = result.getDate()

  result.setDate(1)
  result.setMonth(result.getMonth() + months)

  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate()

  result.setDate(Math.min(originalDay, lastDay))

  return result
}

function getTrialInfo(startedAt) {
  if (!startedAt) {
    return {
      end: null,
      remaining: 0,
      ended: true,
    }
  }

  const start = new Date(startedAt)

  if (Number.isNaN(start.getTime())) {
    return {
      end: null,
      remaining: 0,
      ended: true,
    }
  }

  const end = addMonthsClamped(start, 5)

  const remaining = Math.max(
    0,
    Math.ceil(
      (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  )

  return {
    end,
    remaining,
    ended: Date.now() >= end.getTime(),
  }
}

function getLocale(language) {
  if (language === 'es') return 'es-ES'
  if (language === 'en') return 'en-US'
  return 'pt-BR'
}

export default function ProfileSettings({
  user,
  onPreferencesChanged,
}) {
  const userId = user?.id
  const userEmail = user?.email || ''
  const metadataFullName = user?.user_metadata?.full_name || ''
  const metadataName = user?.user_metadata?.name || ''

  const [name, setName] = useState('')
  const [savedName, setSavedName] = useState('')
  const [editingProfile, setEditingProfile] = useState(false)

  const [theme, setTheme] = useState('light')
  const [language, setLanguage] = useState('pt-BR')
  const [consent, setConsent] = useState(false)
  const [consentAt, setConsentAt] = useState(null)
  const [trialStartedAt, setTrialStartedAt] = useState(null)

  const [loading, setLoading] = useState(Boolean(user?.id))
  const [loadedUserId, setLoadedUserId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const preferencesCallbackRef = useRef(onPreferencesChanged)
  const savingRef = useRef(false)
  const messageTimeoutRef = useRef(null)

  useEffect(() => {
    preferencesCallbackRef.current = onPreferencesChanged
  }, [onPreferencesChanged])

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current)
      }
    }
  }, [])

  function showMessage(text) {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current)
    }

    setMessage(text)

    messageTimeoutRef.current = setTimeout(() => {
      setMessage('')
      messageTimeoutRef.current = null
    }, MESSAGE_DURATION)
  }

  function clearMessage() {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current)
      messageTimeoutRef.current = null
    }

    setMessage('')
  }

  const t = TEXT[language] || TEXT['pt-BR']

  function applyPreferences(nextTheme, nextLanguage) {
    document.documentElement.dataset.theme = nextTheme
    document.documentElement.lang = nextLanguage

    preferencesCallbackRef.current?.({
      theme: nextTheme,
      language: nextLanguage,
    })
  }

  useEffect(() => {
    // Não altera estados diretamente para lidar com a ausência de usuário.
    // A tela de erro é exibida pela condição de renderização abaixo.
    if (!userId) return undefined

    let cancelled = false

    async function loadProfile() {
      try {
        const { data, error: queryError } = await supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .eq('id', userId)
          .maybeSingle()

        if (cancelled) return

        if (queryError) {
          setError(
            queryError.message || TEXT['pt-BR'].loadError,
          )
          setLoadedUserId(userId)
          setLoading(false)
          return
        }

        let currentProfile = data

        if (!currentProfile) {
          const fallbackName =
            metadataFullName || metadataName

          const { data: inserted, error: insertError } =
            await supabase
              .from('profiles')
              .upsert(
                {
                  id: userId,
                  full_name: fallbackName,
                  theme: 'light',
                  language: 'pt-BR',
                  trial_started_at: new Date().toISOString(),
                },
                { onConflict: 'id' },
              )
              .select(PROFILE_COLUMNS)
              .single()

          if (cancelled) return

          if (insertError) {
            setError(
              insertError.message || TEXT['pt-BR'].loadError,
            )
            setLoadedUserId(userId)
            setLoading(false)
            return
          }

          currentProfile = inserted
        }

        const nextName =
          currentProfile.full_name ||
          metadataFullName ||
          metadataName ||
          ''

        const nextTheme =
          currentProfile.theme === 'dark' ? 'dark' : 'light'

        const nextLanguage = TEXT[currentProfile.language]
          ? currentProfile.language
          : 'pt-BR'

        const nextTrialStartedAt =
          currentProfile.trial_started_at ||
          currentProfile.created_at ||
          null

        setName(nextName)
        setSavedName(nextName)
        setEditingProfile(false)
        setTheme(nextTheme)
        setLanguage(nextLanguage)
        setConsent(Boolean(currentProfile.billing_consent_at))
        setConsentAt(currentProfile.billing_consent_at || null)
        setTrialStartedAt(nextTrialStartedAt)

        applyPreferences(nextTheme, nextLanguage)

        setError('')
        setLoadedUserId(userId)
        setLoading(false)
      } catch (loadError) {
        if (cancelled) return

        setError(
          loadError?.message || TEXT['pt-BR'].loadError,
        )
        setLoadedUserId(userId)
        setLoading(false)
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [userId, metadataFullName, metadataName])

  async function saveChanges(overrides = {}) {
    if (!userId || savingRef.current) return

    savingRef.current = true
    setSaving(true)
    setError('')
    clearMessage()

    try {
      const hasNameOverride =
        Object.prototype.hasOwnProperty.call(
          overrides,
          'full_name',
        )

      const nextName = hasNameOverride
        ? String(overrides.full_name ?? '').trim()
        : name.trim()

      if (hasNameOverride && !nextName) {
        setError(t.nameRequired)
        return
      }

      const updates = {
        theme: overrides.theme ?? theme,
        language: overrides.language ?? language,
      }

      if (hasNameOverride) {
        updates.full_name = nextName
      }

      if (
        Object.prototype.hasOwnProperty.call(
          overrides,
          'consent',
        )
      ) {
        const nextConsent = Boolean(overrides.consent)

        updates.billing_consent_at = nextConsent
          ? new Date().toISOString()
          : null

        updates.billing_consent_version = nextConsent
          ? CONSENT_VERSION
          : null
      }

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select(PROFILE_COLUMNS)
        .single()

      if (updateError) {
        setError(updateError.message || t.error)
        return
      }

      const nextSavedName = data.full_name || ''
      const nextTheme = data.theme === 'dark' ? 'dark' : 'light'
      const nextLanguage = TEXT[data.language]
        ? data.language
        : 'pt-BR'

      setName(nextSavedName)
      setSavedName(nextSavedName)
      setTheme(nextTheme)
      setLanguage(nextLanguage)
      setConsent(Boolean(data.billing_consent_at))
      setConsentAt(data.billing_consent_at || null)
      setTrialStartedAt(
        data.trial_started_at || data.created_at || null,
      )

      if (hasNameOverride) {
        setEditingProfile(false)
      }

      applyPreferences(nextTheme, nextLanguage)

      const savedText =
        Object.prototype.hasOwnProperty.call(
          overrides,
          'consent',
        )
          ? (TEXT[nextLanguage] || TEXT['pt-BR']).consentSaved
          : (TEXT[nextLanguage] || TEXT['pt-BR']).saved

      showMessage(savedText)
    } catch (saveError) {
      setError(saveError?.message || t.error)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function handleThemeChange(value) {
    if (savingRef.current || value === theme) return

    setTheme(value)
    applyPreferences(value, language)
    saveChanges({ theme: value })
  }

  function handleLanguageChange(value) {
    if (savingRef.current || value === language) return

    setLanguage(value)
    applyPreferences(theme, value)
    saveChanges({ language: value })
  }

  function handleEditProfile() {
    setName(savedName)
    setError('')
    clearMessage()
    setEditingProfile(true)
  }

  function handleCancelEdit() {
    setName(savedName)
    setEditingProfile(false)
    setError('')
    clearMessage()
  }

  if (!userId) {
    return (
      <section className="settings-page">
        <div
          className="settings-alert settings-alert-error"
          role="alert"
        >
          {TEXT['pt-BR'].userError}
        </div>
      </section>
    )
  }

  if (loading || loadedUserId !== userId) {
    return (
      <section className="settings-page">
        <p>{t.loading}</p>
      </section>
    )
  }

  const trial = getTrialInfo(trialStartedAt)
  const locale = getLocale(language)

  return (
    <main className="settings-page">
      <header className="settings-header">
        <div>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
      </header>

      {error && (
        <div
          className="settings-alert settings-alert-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          className="settings-alert settings-alert-success"
          role="status"
        >
          {message}
        </div>
      )}

      <section className="settings-card">
        <h2>{t.profile}</h2>

        <label
          className="settings-label"
          htmlFor="profile-name"
        >
          {t.name}
        </label>

        {editingProfile ? (
          <input
            id="profile-name"
            className="settings-input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            maxLength={120}
            disabled={saving}
          />
        ) : (
          <div className="settings-profile-value">
            <span>{savedName || '—'}</span>

            <button
              className="settings-edit-button"
              type="button"
              disabled={saving}
              onClick={handleEditProfile}
            >
              {t.edit}
            </button>
          </div>
        )}

        <label
          className="settings-label"
          htmlFor="profile-email"
        >
          {t.email}
        </label>

        <input
          id="profile-email"
          className="settings-input"
          type="email"
          value={userEmail}
          disabled
          readOnly
        />

        {editingProfile && (
          <div className="settings-profile-actions">
            <button
              className="settings-button"
              type="button"
              disabled={saving}
              onClick={() =>
                saveChanges({ full_name: name })
              }
            >
              {saving ? t.saving : t.save}
            </button>

            <button
              className="settings-cancel-button"
              type="button"
              disabled={saving}
              onClick={handleCancelEdit}
            >
              {t.cancel}
            </button>
          </div>
        )}
      </section>

      <section className="settings-card">
        <h2>{t.appearance}</h2>

        <div className="settings-choice-row">
          <button
            type="button"
            className={`settings-choice ${
              theme === 'light' ? 'selected' : ''
            }`}
            aria-pressed={theme === 'light'}
            disabled={saving}
            onClick={() => handleThemeChange('light')}
          >
            ☀️ {t.light}
          </button>

          <button
            type="button"
            className={`settings-choice ${
              theme === 'dark' ? 'selected' : ''
            }`}
            aria-pressed={theme === 'dark'}
            disabled={saving}
            onClick={() => handleThemeChange('dark')}
          >
            🌙 {t.dark}
          </button>
        </div>
      </section>

      <section className="settings-card">
        <h2>{t.language}</h2>

        <select
          className="settings-input"
          value={language}
          disabled={saving}
          onChange={(event) =>
            handleLanguageChange(event.target.value)
          }
          aria-label={t.language}
        >
          <option value="pt-BR">{t.portuguese}</option>
          <option value="en">{t.english}</option>
          <option value="es">{t.spanish}</option>
        </select>
      </section>

      <section className="settings-card">
        <h2>{t.trial}</h2>
        <p>{t.trialDescription}</p>

        <div className="settings-trial-status">
          {trial.ended ? (
            <strong>{t.trialEnded}</strong>
          ) : (
            <strong>
              {trial.remaining} {t.daysRemaining}
            </strong>
          )}
        </div>

        <p>{t.monthlyPrice}</p>

        {trial.end && (
          <p>{trial.end.toLocaleDateString(locale)}</p>
        )}
      </section>

      <section className="settings-card">
        <h2>{t.billingTitle}</h2>
        <p>{t.billingDescription}</p>

        <p>
          {consent ? t.consentActive : t.consentInactive}
        </p>

        {consentAt && (
          <p className="settings-muted">
            {new Date(consentAt).toLocaleString(locale)}
          </p>
        )}

        <button
          className="settings-button"
          type="button"
          disabled={saving}
          onClick={() => saveChanges({ consent: !consent })}
        >
          {saving
            ? t.saving
            : consent
              ? t.withdraw
              : t.authorize}
        </button>
      </section>

      <section className="settings-card">
        <h2>{t.security}</h2>
        <p>{t.securityDescription}</p>
      </section>
    </main>
  )
}
