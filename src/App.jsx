
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
} from 'lucide-react'

import { supabase } from './lib/supabase'
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

const TRANSLATIONS = {
  'pt-BR': {
    navOverview: 'Visão geral',
    navAgenda: 'Agenda',
    navCatalog: 'Meu catálogo',
    navClients: 'Consulentes',
    navRewards: 'Recompensas',
    navFinance: 'Financeiro',
    navTeam: 'Equipe e acessos',
    navSettings: 'Configurações',
    mainMenu: 'MENU PRINCIPAL',
    preferences: 'PREFERÊNCIAS',
    workspace: 'Seu espaço',
    brandSubtitle: 'ESPAÇO ORACULAR',
    tagline: 'Seu espaço, seu ritmo.',
    taglineSubtitle: 'Um atendimento de cada vez.',
    connectedAccount: 'Conta conectada',
    signOut: 'Sair da conta',
    closeMenu: 'Fechar menu',
    openMenu: 'Abrir menu',
    notifications: 'Notificações',
    catalogConnected: 'Catálogo conectado',
    email: 'E-mail',
    footerRights: 'Todos os direitos reservados.',
    footerNote: 'Seus atendimentos, organizados com cuidado.',
    loading: 'Carregando seu espaço...',
    loadingServices: 'Carregando seus serviços...',
    catalogEyebrow: 'PERSONALIZE SEU TRABALHO',
    catalogTitle: 'Meu catálogo',
    catalogDescription:
      'Cadastre somente os serviços que você oferece e defina seus preços.',
    addService: 'Adicionar serviço',
    catalogBannerTitle: 'Seu catálogo, suas regras.',
    catalogBannerDescription:
      'Você decide quais serviços oferece. Não existe uma lista obrigatória.',
    yourServices: 'Seus serviços',
    serviceRegistered: 'serviço cadastrado',
    servicesRegistered: 'serviços cadastrados',
    searchService: 'Buscar serviço...',
    searchServiceLabel: 'Buscar serviço',
    activeService: 'Serviço ativo',
    inactiveService: 'Serviço inativo',
    deleteService: 'Excluir serviço',
    noServiceFound: 'Nenhum serviço encontrado',
    emptyCatalog: 'Seu catálogo está vazio',
    tryAnotherSearch: 'Tente buscar usando outro nome.',
    emptyCatalogDescription:
      'Adicione seu primeiro serviço para começar a organizar seus atendimentos.',
    dashboardEyebrow: 'SEU ESPAÇO DE TRABALHO',
    dashboardTitle: 'Sua jornada, em harmonia.',
    dashboardDescription:
      'Organize seus atendimentos e acompanhe seu trabalho em um só lugar.',
    welcomeEyebrow: 'UM MOMENTO PARA VOCÊ',
    welcomeTitle: 'Um espaço feito para a sua prática.',
    welcomeDescription:
      'Comece cadastrando seus serviços e prepare sua agenda.',
    configureCatalog: 'Configurar meu catálogo',
    overview: 'Visão geral',
    availableIndicators: 'Indicadores disponíveis nesta etapa',
    appointmentsRegistered: 'Atendimentos cadastrados',
    clients: 'Consulentes',
    revenueReceived: 'Receita recebida',
    appointmentsNotConnected:
      'A agenda ainda não foi conectada ao banco',
    clientsComingLater:
      'O cadastro de consulentes será implementado depois',
    financeNotConnected:
      'O financeiro ainda não foi conectado ao banco',
    firstSteps: 'Primeiros passos',
    firstStepsDescription: 'Prepare seu espaço para começar a usar.',
    addServicesStep: 'Adicione os serviços que oferece',
    defineNamesPrices: 'Defina nomes e preços',
    organizeSchedule: 'Organize sua agenda',
    registerDates: 'Cadastre prazos e horários',
    configureRewards: 'Configure suas recompensas',
    customizeLoyalty: 'Personalize seu sistema de fidelidade',
    scheduleEyebrow: 'ORGANIZAÇÃO',
    scheduleTitle: 'Sua agenda',
    scheduleDescription:
      'Organize os atendimentos por prazo de entrega ou por data e horário.',
    scheduleMessage:
      'A agenda será implementada na próxima etapa, com calendário, horários e status de atendimento.',
    clientsEyebrow: 'RELACIONAMENTO',
    clientsTitle: 'Seus consulentes',
    clientsDescription:
      'Mantenha seus contatos organizados pelo número de WhatsApp.',
    clientsMessage:
      'O cadastro terá WhatsApp obrigatório, nome opcional, histórico, atendimentos e saldo de pontos.',
    rewardsEyebrow: 'FIDELIDADE',
    rewardsTitle: 'Recompensas',
    rewardsDescription:
      'Crie um sistema de fidelidade que combine com sua forma de atender.',
    rewardsMessage:
      'Você poderá ativar ou desativar a fidelidade, atribuir pontos a cada serviço e registrar suas próprias recompensas.',
    financeEyebrow: 'CONTROLE FINANCEIRO',
    financeTitle: 'Seu financeiro',
    financeDescription:
      'Acompanhe as receitas e consulte os resultados de cada mês.',
    financeMessage:
      'O relatório considerará os valores e os pagamentos registrados, com opção de exportação mensal.',
    teamEyebrow: 'ACESSO COMPARTILHADO',
    teamTitle: 'Equipe e acessos',
    teamDescription:
      'Compartilhe sua agenda com pessoas autorizadas.',
    teamMessage:
      'Os convites e as permissões serão vinculados à conta proprietária, com controle de acesso no servidor.',
    preparingSpace: 'Estamos preparando este espaço.',
    viewCatalog: 'Ver meu catálogo',
    viewServices: 'Ver meus serviços',
    backToHome: 'Voltar ao início',
    noticeCatalogError: 'Não foi possível carregar o catálogo:',
    signInToAdd: 'Entre na sua conta para cadastrar serviços.',
    validServiceForm: 'Preencha o nome e informe um preço válido.',
    serviceSaved: 'Serviço salvo no Supabase com sucesso.',
    serviceDeleted: 'Serviço excluído do catálogo.',
    deleteConfirmation:
      'Deseja realmente excluir este serviço? Essa ação não pode ser desfeita.',
    serviceDeleteError: 'Não foi possível excluir o serviço:',
    serviceSaveError: 'Não foi possível salvar o serviço:',
    signOutError: 'Não foi possível sair:',
    serviceName: 'Nome do serviço',
    serviceNamePlaceholder: 'Ex.: Pergunta objetiva',
    servicePrice: 'Valor do serviço (R$)',
    servicePricePlaceholder: '0.00',
    required: '*',
    serviceFormHint:
      'O serviço será salvo na sua conta e ficará disponível quando você entrar novamente.',
    cancel: 'Cancelar',
    saving: 'Salvando...',
    saveService: 'Salvar serviço',
    closeForm: 'Fechar formulário',
    myCatalog: 'MEU CATÁLOGO',
    addServiceTitle: 'Adicionar serviço',
    addServiceDescription: 'Cadastre o serviço do seu jeito.',
    loginError: 'Não foi possível carregar sua conta.',
  },

  en: {
    navOverview: 'Overview',
    navAgenda: 'Schedule',
    navCatalog: 'My catalog',
    navClients: 'Clients',
    navRewards: 'Rewards',
    navFinance: 'Finances',
    navTeam: 'Team and access',
    navSettings: 'Settings',
    mainMenu: 'MAIN MENU',
    preferences: 'PREFERENCES',
    workspace: 'Your workspace',
    brandSubtitle: 'ORACULAR SPACE',
    tagline: 'Your space, your pace.',
    taglineSubtitle: 'One session at a time.',
    connectedAccount: 'Connected account',
    signOut: 'Sign out',
    closeMenu: 'Close menu',
    openMenu: 'Open menu',
    notifications: 'Notifications',
    catalogConnected: 'Catalog connected',
    email: 'Email',
    footerRights: 'All rights reserved.',
    footerNote: 'Your sessions, thoughtfully organized.',
    loading: 'Loading your workspace...',
    loadingServices: 'Loading your services...',
    catalogEyebrow: 'CUSTOMIZE YOUR WORK',
    catalogTitle: 'My catalog',
    catalogDescription:
      'Add only the services you offer and set your prices.',
    addService: 'Add service',
    catalogBannerTitle: 'Your catalog, your rules.',
    catalogBannerDescription:
      'You decide which services to offer. There is no required list.',
    yourServices: 'Your services',
    serviceRegistered: 'service registered',
    servicesRegistered: 'services registered',
    searchService: 'Search services...',
    searchServiceLabel: 'Search services',
    activeService: 'Active service',
    inactiveService: 'Inactive service',
    deleteService: 'Delete service',
    noServiceFound: 'No services found',
    emptyCatalog: 'Your catalog is empty',
    tryAnotherSearch: 'Try searching for another name.',
    emptyCatalogDescription:
      'Add your first service to start organizing your sessions.',
    dashboardEyebrow: 'YOUR WORKSPACE',
    dashboardTitle: 'Your journey, in harmony.',
    dashboardDescription:
      'Organize your sessions and keep track of your work in one place.',
    welcomeEyebrow: 'A MOMENT FOR YOU',
    welcomeTitle: 'A space designed for your practice.',
    welcomeDescription:
      'Start by adding your services and preparing your schedule.',
    configureCatalog: 'Set up my catalog',
    overview: 'Overview',
    availableIndicators: 'Indicators available at this stage',
    appointmentsRegistered: 'Registered appointments',
    clients: 'Clients',
    revenueReceived: 'Revenue received',
    appointmentsNotConnected:
      'The schedule has not been connected to the database yet',
    clientsComingLater:
      'Client registration will be implemented later',
    financeNotConnected:
      'Finances have not been connected to the database yet',
    firstSteps: 'First steps',
    firstStepsDescription: 'Get your workspace ready to use.',
    addServicesStep: 'Add the services you offer',
    defineNamesPrices: 'Set names and prices',
    organizeSchedule: 'Organize your schedule',
    registerDates: 'Add deadlines and times',
    configureRewards: 'Set up your rewards',
    customizeLoyalty: 'Customize your loyalty program',
    scheduleEyebrow: 'ORGANIZATION',
    scheduleTitle: 'Your schedule',
    scheduleDescription:
      'Organize sessions by delivery deadline or by date and time.',
    scheduleMessage:
      'The schedule will be implemented in the next stage, with a calendar, times, and session statuses.',
    clientsEyebrow: 'RELATIONSHIPS',
    clientsTitle: 'Your clients',
    clientsDescription:
      'Keep your contacts organized by WhatsApp number.',
    clientsMessage:
      'Client records will include a required WhatsApp number, an optional name, history, sessions, and points balance.',
    rewardsEyebrow: 'LOYALTY',
    rewardsTitle: 'Rewards',
    rewardsDescription:
      'Create a loyalty program that suits the way you work.',
    rewardsMessage:
      'You will be able to enable or disable loyalty, assign points to each service, and register your own rewards.',
    financeEyebrow: 'FINANCIAL MANAGEMENT',
    financeTitle: 'Your finances',
    financeDescription:
      'Track revenue and review each month’s results.',
    financeMessage:
      'Reports will include recorded amounts and payments, with a monthly export option.',
    teamEyebrow: 'SHARED ACCESS',
    teamTitle: 'Team and access',
    teamDescription:
      'Share your schedule with authorized people.',
    teamMessage:
      'Invitations and permissions will be linked to the owner account, with access control on the server.',
    preparingSpace: 'We are preparing this space.',
    viewCatalog: 'View my catalog',
    viewServices: 'View my services',
    backToHome: 'Back to overview',
    noticeCatalogError: 'Could not load the catalog:',
    signInToAdd: 'Sign in to add services.',
    validServiceForm: 'Enter a name and a valid price.',
    serviceSaved: 'Service saved to Supabase successfully.',
    serviceDeleted: 'Service deleted from the catalog.',
    deleteConfirmation:
      'Are you sure you want to delete this service? This action cannot be undone.',
    serviceDeleteError: 'Could not delete the service:',
    serviceSaveError: 'Could not save the service:',
    signOutError: 'Could not sign out:',
    serviceName: 'Service name',
    serviceNamePlaceholder: 'E.g. Direct question',
    servicePrice: 'Service price (R$)',
    servicePricePlaceholder: '0.00',
    required: '*',
    serviceFormHint:
      'The service will be saved to your account and will be available when you sign in again.',
    cancel: 'Cancel',
    saving: 'Saving...',
    saveService: 'Save service',
    closeForm: 'Close form',
    myCatalog: 'MY CATALOG',
    addServiceTitle: 'Add service',
    addServiceDescription: 'Set up your service your way.',
    loginError: 'Could not load your account.',
  },

  es: {
    navOverview: 'Resumen',
    navAgenda: 'Agenda',
    navCatalog: 'Mi catálogo',
    navClients: 'Consultantes',
    navRewards: 'Recompensas',
    navFinance: 'Finanzas',
    navTeam: 'Equipo y accesos',
    navSettings: 'Configuración',
    mainMenu: 'MENÚ PRINCIPAL',
    preferences: 'PREFERENCIAS',
    workspace: 'Tu espacio',
    brandSubtitle: 'ESPACIO ORACULAR',
    tagline: 'Tu espacio, tu ritmo.',
    taglineSubtitle: 'Una consulta a la vez.',
    connectedAccount: 'Cuenta conectada',
    signOut: 'Cerrar sesión',
    closeMenu: 'Cerrar menú',
    openMenu: 'Abrir menú',
    notifications: 'Notificaciones',
    catalogConnected: 'Catálogo conectado',
    email: 'Correo electrónico',
    footerRights: 'Todos los derechos reservados.',
    footerNote: 'Tus consultas, organizadas con cuidado.',
    loading: 'Cargando tu espacio...',
    loadingServices: 'Cargando tus servicios...',
    catalogEyebrow: 'PERSONALIZA TU TRABAJO',
    catalogTitle: 'Mi catálogo',
    catalogDescription:
      'Registra solo los servicios que ofreces y define sus precios.',
    addService: 'Añadir servicio',
    catalogBannerTitle: 'Tu catálogo, tus reglas.',
    catalogBannerDescription:
      'Tú decides qué servicios ofrecer. No hay una lista obligatoria.',
    yourServices: 'Tus servicios',
    serviceRegistered: 'servicio registrado',
    servicesRegistered: 'servicios registrados',
    searchService: 'Buscar servicios...',
    searchServiceLabel: 'Buscar servicios',
    activeService: 'Servicio activo',
    inactiveService: 'Servicio inactivo',
    deleteService: 'Eliminar servicio',
    noServiceFound: 'No se encontraron servicios',
    emptyCatalog: 'Tu catálogo está vacío',
    tryAnotherSearch: 'Intenta buscar con otro nombre.',
    emptyCatalogDescription:
      'Añade tu primer servicio para empezar a organizar tus consultas.',
    dashboardEyebrow: 'TU ESPACIO DE TRABAJO',
    dashboardTitle: 'Tu camino, en armonía.',
    dashboardDescription:
      'Organiza tus consultas y sigue tu trabajo desde un solo lugar.',
    welcomeEyebrow: 'UN MOMENTO PARA TI',
    welcomeTitle: 'Un espacio creado para tu práctica.',
    welcomeDescription:
      'Empieza registrando tus servicios y preparando tu agenda.',
    configureCatalog: 'Configurar mi catálogo',
    overview: 'Resumen',
    availableIndicators: 'Indicadores disponibles en esta etapa',
    appointmentsRegistered: 'Consultas registradas',
    clients: 'Consultantes',
    revenueReceived: 'Ingresos recibidos',
    appointmentsNotConnected:
      'La agenda aún no está conectada a la base de datos',
    clientsComingLater:
      'El registro de consultantes se implementará más adelante',
    financeNotConnected:
      'Las finanzas aún no están conectadas a la base de datos',
    firstSteps: 'Primeros pasos',
    firstStepsDescription: 'Prepara tu espacio para empezar a usarlo.',
    addServicesStep: 'Añade los servicios que ofreces',
    defineNamesPrices: 'Define nombres y precios',
    organizeSchedule: 'Organiza tu agenda',
    registerDates: 'Registra plazos y horarios',
    configureRewards: 'Configura tus recompensas',
    customizeLoyalty: 'Personaliza tu programa de fidelidad',
    scheduleEyebrow: 'ORGANIZACIÓN',
    scheduleTitle: 'Tu agenda',
    scheduleDescription:
      'Organiza las consultas por plazo de entrega o por fecha y hora.',
    scheduleMessage:
      'La agenda se implementará en la próxima etapa, con calendario, horarios y estados de las consultas.',
    clientsEyebrow: 'RELACIONES',
    clientsTitle: 'Tus consultantes',
    clientsDescription:
      'Mantén tus contactos organizados por número de WhatsApp.',
    clientsMessage:
      'El registro incluirá WhatsApp obligatorio, nombre opcional, historial, consultas y saldo de puntos.',
    rewardsEyebrow: 'FIDELIDAD',
    rewardsTitle: 'Recompensas',
    rewardsDescription:
      'Crea un programa de fidelidad que se adapte a tu forma de trabajar.',
    rewardsMessage:
      'Podrás activar o desactivar la fidelidad, asignar puntos a cada servicio y registrar tus propias recompensas.',
    financeEyebrow: 'GESTIÓN FINANCIERA',
    financeTitle: 'Tus finanzas',
    financeDescription:
      'Sigue los ingresos y consulta los resultados de cada mes.',
    financeMessage:
      'El informe incluirá los importes y pagos registrados, con opción de exportación mensual.',
    teamEyebrow: 'ACCESO COMPARTIDO',
    teamTitle: 'Equipo y accesos',
    teamDescription:
      'Comparte tu agenda con personas autorizadas.',
    teamMessage:
      'Las invitaciones y los permisos estarán vinculados a la cuenta propietaria, con control de acceso en el servidor.',
    preparingSpace: 'Estamos preparando este espacio.',
    viewCatalog: 'Ver mi catálogo',
    viewServices: 'Ver mis servicios',
    backToHome: 'Volver al resumen',
    noticeCatalogError: 'No se pudo cargar el catálogo:',
    signInToAdd: 'Inicia sesión para registrar servicios.',
    validServiceForm: 'Introduce un nombre y un precio válido.',
    serviceSaved: 'Servicio guardado correctamente en Supabase.',
    serviceDeleted: 'Servicio eliminado del catálogo.',
    deleteConfirmation:
      '¿Realmente deseas eliminar este servicio? Esta acción no se puede deshacer.',
    serviceDeleteError: 'No se pudo eliminar el servicio:',
    serviceSaveError: 'No se pudo guardar el servicio:',
    signOutError: 'No se pudo cerrar la sesión:',
    serviceName: 'Nombre del servicio',
    serviceNamePlaceholder: 'Ej.: Pregunta directa',
    servicePrice: 'Precio del servicio (R$)',
    servicePricePlaceholder: '0.00',
    required: '*',
    serviceFormHint:
      'El servicio se guardará en tu cuenta y estará disponible cuando vuelvas a iniciar sesión.',
    cancel: 'Cancelar',
    saving: 'Guardando...',
    saveService: 'Guardar servicio',
    closeForm: 'Cerrar formulario',
    myCatalog: 'MI CATÁLOGO',
    addServiceTitle: 'Añadir servicio',
    addServiceDescription: 'Configura tu servicio a tu manera.',
    loginError: 'No se pudo cargar la sesión.',
  },
}

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

  useEffect(() => {
    let cancelled = false

    async function loadPreferences() {
      if (!session?.user?.id || isPasswordRecovery) {
        setPreferences({ theme: 'light', language: 'pt-BR' })
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

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
    document.documentElement.lang = language
  }, [preferences.theme, language])

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
      setNotice(`${t.signOutError} ${error.message}`)
    } finally {
      setSigningOut(false)
    }
  }

  function navigate(page) {
    setActivePage(page)
    setMobileMenuOpen(false)
    setNotice('')
  }

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
      setNotice(`${t.serviceSaveError} ${error.message}`)
    } finally {
      setSavingService(false)
    }
  }

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
      setNotice(`${t.serviceDeleteError} ${error.message}`)
    } finally {
      setDeletingServiceId(null)
    }
  }

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

  if (authLoading) {
    return <div className="auth-page">{t.loading}</div>
  }

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

  if (!session) {
    return (
      <Auth
        onLogin={() => {
          setNotice('')
        }}
      />
    )
  }

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

      case 'agenda':
        return <Agenda />

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
        return <Consulentes t={t} navigate={navigate} />

      case 'recompensas':
        return <Recompensas t={t} navigate={navigate} />

      case 'financeiro':
        return <Financeiro t={t} navigate={navigate} />

      case 'equipe':
        return <Equipe t={t} navigate={navigate} />

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
