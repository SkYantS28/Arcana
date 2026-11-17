
import { useEffect, useMemo, useState } from 'react'

import {
  LayoutDashboard,
  CalendarDays,
  Layers3,
  Users,
  Gift,
  Wallet,
  ShieldCheck,
  Settings,
  Bell,
} from 'lucide-react'

import { supabase } from './lib/supabase'
import { TRANSLATIONS } from './data/translations'
import { useNotifications } from './hooks/useNotifications'

import Auth from './Auth'
import ResetPassword from './ResetPassword'
import ProfileSettings from './ProfileSettings'

import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import AppFooter from './components/AppFooter'
import ServiceModal from './components/ServiceModal'
import Notice from './components/Notice'

import Dashboard from './pages/Dashboard'
import Catalogo from './pages/Catalogo'
import Agenda from './pages/Agenda'
import Consulentes from './pages/Consulentes'
import Recompensas from './pages/Recompensas'
import Financeiro from './pages/Financeiro'
import Equipe from './pages/Equipe'
import Notifications from './pages/Notifications'

function money(value, language) {
  const locale =
    language === 'en'
      ? 'en-US'
      : language === 'es'
        ? 'es-ES'
        : 'pt-BR'

  return Number(value || 0).toLocaleString(locale, {
    style: 'currency',
    currency: 'BRL',
  })
}

function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    () => window.location.pathname.replace(/\/+$/, '') === '/reset-password',
  )

  const [activePage, setActivePage] = useState('inicio')

  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [savingService, setSavingService] = useState(false)
  const [deletingServiceId, setDeletingServiceId] = useState(null)

  const [showServiceForm, setShowServiceForm] = useState(false)
  const [serviceName, setServiceName] = useState('')
  const [servicePrice, setServicePrice] = useState('')
  const [search, setSearch] = useState('')

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'pt-BR',
  })
  const notificationCenter = useNotifications(session?.user?.id)

  // Garante que o aplicativo sempre utilize um idioma existente.
  const language = TRANSLATIONS[preferences.language]
    ? preferences.language
    : 'pt-BR'

  const t = TRANSLATIONS[language]

  const navigation = useMemo(
    () => [
      { id: 'inicio', label: t.navOverview, icon: LayoutDashboard },
      { id: 'agenda', label: t.navAgenda, icon: CalendarDays },
      { id: 'catalogo', label: t.navCatalog, icon: Layers3 },
      { id: 'consulentes', label: t.navClients, icon: Users },
      { id: 'recompensas', label: t.navRewards, icon: Gift },
      { id: 'financeiro', label: t.navFinance, icon: Wallet },
      { id: 'notificacoes', label: t.navNotifications, icon: Bell },
    ],
    [t],
  )

  const secondaryNavigation = useMemo(
    () => [
      { id: 'equipe', label: t.navTeam, icon: ShieldCheck },
      { id: 'configuracoes', label: t.navSettings, icon: Settings },
    ],
    [t],
  )

  const activeNavigation = [...navigation, ...secondaryNavigation].find(
    (item) => item.id === activePage,
  )

  // Carrega a sessão do usuário e acompanha alterações de autenticação.
  useEffect(() => {
    let mounted = true

    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('Erro ao verificar sessão:', error.message)
          setSession(null)
        } else {
          setSession(data.session)
        }
      } catch (error) {
        if (mounted) {
          console.error('Erro inesperado ao verificar sessão:', error)
          setSession(null)
        }
      } finally {
        if (mounted) setAuthLoading(false)
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      }

      setSession(currentSession)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Carrega as preferências de idioma e tema do perfil.
  useEffect(() => {
    let cancelled = false

    async function loadPreferences() {
      if (!session?.user?.id || isPasswordRecovery) {
        setPreferences({
          theme: 'light',
          language: 'pt-BR',
        })
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('theme, language')
        .eq('id', session.user.id)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('Erro ao carregar preferências:', error.message)
        return
      }

      setPreferences({
        theme: data?.theme === 'dark' ? 'dark' : 'light',
        language: TRANSLATIONS[data?.language]
          ? data.language
          : 'pt-BR',
      })
    }

    loadPreferences()

    return () => {
      cancelled = true
    }
  }, [session?.user?.id, isPasswordRecovery])

  // Aplica o tema e o idioma ao documento.
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
    document.documentElement.lang = language
  }, [preferences.theme, language])

  // Carrega os serviços cadastrados pelo usuário.
  useEffect(() => {
    let cancelled = false

    async function loadServices() {
      if (!session?.user?.id || isPasswordRecovery) {
        setServices([])
        setServicesLoading(false)
        return
      }

      setServicesLoading(true)

      const { data, error } = await supabase
        .from('services')
        .select('id, name, price, description, active, created_at')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        console.error('Erro ao carregar serviços:', error.message)
        setServices([])
        setNotice(`${t.noticeCatalogError} ${error.message}`)
      } else {
        setServices(data || [])
      }

      setServicesLoading(false)
    }

    loadServices()

    return () => {
      cancelled = true
    }
  }, [session?.user?.id, t.noticeCatalogError, isPasswordRecovery])

  // Encerra a sessão do usuário.
  async function handleSignOut() {
    setSigningOut(true)
    setNotice('')

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        setNotice(`${t.signOutError} ${error.message}`)
      } else {
        setSession(null)
        setServices([])
        setActivePage('inicio')
        setMobileMenuOpen(false)
      }
    } catch (error) {
      console.error('Erro ao sair da conta:', error)
      setNotice(
        `${t.signOutError} ${error?.message || 'Erro inesperado.'}`,
      )
    } finally {
      setSigningOut(false)
    }
  }

  // Navegação entre as páginas.
  function navigate(page) {
    setActivePage(page)
    setMobileMenuOpen(false)
    setNotice('')
  }

  // Cadastra um novo serviço no Supabase.
  async function addService(event) {
    event.preventDefault()

    if (!session?.user?.id) {
      setNotice(t.signInToAdd)
      return
    }

    const name = serviceName.trim()
    const price = Number(servicePrice.trim().replace(',', '.'))

    if (
      !name ||
      servicePrice.trim() === '' ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 999999
    ) {
      setNotice(t.validServiceForm)
      return
    }

    setSavingService(true)
    setNotice('')

    try {
      const { data, error } = await supabase
        .from('services')
        .insert({
          owner_id: session.user.id,
          name,
          price,
          active: true,
        })
        .select('id, name, price, description, active, created_at')
        .single()

      if (error) {
        console.error('Erro ao cadastrar serviço:', error.message)
        setNotice(`${t.serviceSaveError} ${error.message}`)
        return
      }

      setServices((current) => [data, ...current])
      setServiceName('')
      setServicePrice('')
      setShowServiceForm(false)
      setNotice(t.serviceSaved)
    } catch (error) {
      console.error('Erro inesperado ao cadastrar serviço:', error)
      setNotice(
        `${t.serviceSaveError} ${error?.message || 'Erro inesperado.'}`,
      )
    } finally {
      setSavingService(false)
    }
  }

  // Exclui um serviço do Supabase.
  async function deleteService(id) {
    if (!session?.user?.id) return

    if (!window.confirm(t.deleteConfirmation)) return

    setDeletingServiceId(id)
    setNotice('')

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)
        .eq('owner_id', session.user.id)

      if (error) {
        console.error('Erro ao excluir serviço:', error.message)
        setNotice(`${t.serviceDeleteError} ${error.message}`)
        return
      }

      setServices((current) =>
        current.filter((service) => service.id !== id),
      )

      setNotice(t.serviceDeleted)
    } catch (error) {
      console.error('Erro inesperado ao excluir serviço:', error)
      setNotice(
        `${t.serviceDeleteError} ${error?.message || 'Erro inesperado.'}`,
      )
    } finally {
      setDeletingServiceId(null)
    }
  }

  // Filtra os serviços respeitando o idioma selecionado.
  const localeForSearch =
    language === 'en'
      ? 'en'
      : language === 'es'
        ? 'es'
        : 'pt-BR'

  const filteredServices = services.filter((service) =>
    service.name
      .toLocaleLowerCase(localeForSearch)
      .includes(search.toLocaleLowerCase(localeForSearch)),
  )

  // Estado de carregamento da autenticação.
  if (authLoading) {
    return <div className="auth-page">{t.loading}</div>
  }

  // Tela de recuperação de senha.
  if (isPasswordRecovery) {
    return (
      <ResetPassword
        onComplete={() => {
          setIsPasswordRecovery(false)
          setSession(null)
          setServices([])
          setActivePage('inicio')
          window.history.replaceState({}, '', '/')
        }}
      />
    )
  }

  // Tela de autenticação.
  if (!session) {
    return (
      <Auth
        onLogin={() => {
          setNotice('')
        }}
      />
    )
  }

  // Renderiza a página selecionada.
  function renderActivePage() {
    switch (activePage) {
      case 'inicio':
        return (
          <Dashboard
            t={t}
            language={language}
            navigate={navigate}
            money={money}
          />
        )

      case 'notificacoes':
        return (
          <Notifications
            t={t}
            language={language}
            notifications={notificationCenter.notifications}
            loading={notificationCenter.loading}
            error={notificationCenter.error}
            unreadIds={notificationCenter.unreadIds}
            markAsRead={notificationCenter.markAsRead}
            markAllAsRead={notificationCenter.markAllAsRead}
            refresh={notificationCenter.refresh}
            navigate={navigate}
          />
        )

      case 'agenda':
        return (
          <Agenda
            t={t}
            language={language}
          />
        )

      case 'catalogo':
        return (
          <Catalogo
            t={t}
            language={language}
            services={services}
            servicesLoading={servicesLoading}
            deletingServiceId={deletingServiceId}
            filteredServices={filteredServices}
            search={search}
            setSearch={setSearch}
            setNotice={setNotice}
            setShowServiceForm={setShowServiceForm}
            deleteService={deleteService}
            money={money}
          />
        )

      case 'consulentes':
        return (
          <Consulentes
            t={t}
            language={language}
            navigate={navigate}
          />
        )

      case 'recompensas':
        return (
          <Recompensas
            t={t}
            navigate={navigate}
          />
        )

      case 'financeiro':
        return (
          <Financeiro
            t={t}
            navigate={navigate}
          />
        )

      case 'equipe':
        return (
          <Equipe
            t={t}
            navigate={navigate}
          />
        )

      case 'configuracoes':
        return (
          <ProfileSettings
            user={session.user}
            onPreferencesChanged={(next) => {
              setPreferences((current) => ({
                ...current,
                ...next,
              }))
            }}
          />
        )

      default:
        return (
          <Dashboard
            t={t}
            language={language}
            navigate={navigate}
            money={money}
          />
        )
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        translations={t}
        navigation={navigation}
        secondaryNavigation={secondaryNavigation}
        activePage={activePage}
        navigate={navigate}
        user={session.user}
        handleSignOut={handleSignOut}
        signingOut={signingOut}
      />

      <main className="main-area">
        <Topbar
          translations={t}
          activeNavigation={activeNavigation}
          setMobileMenuOpen={setMobileMenuOpen}
          onNotificationsClick={() => navigate('notificacoes')}
          unreadNotificationCount={notificationCenter.unreadCount}
        />

        <div className="page-content">
          <Notice
            notice={notice}
            onClose={() => setNotice('')}
          />

          {renderActivePage()}

          <AppFooter
            year={new Date().getFullYear()}
            translations={t}
          />
        </div>
      </main>

      <ServiceModal
        translations={t}
        showServiceForm={showServiceForm}
        setShowServiceForm={setShowServiceForm}
        savingService={savingService}
        serviceName={serviceName}
        setServiceName={setServiceName}
        servicePrice={servicePrice}
        setServicePrice={setServicePrice}
        addService={addService}
      />
    </div>
  )
}

export default App
