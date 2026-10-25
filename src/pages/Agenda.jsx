import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Search,
  Check,
  X,
  Phone,
  Wallet,
  LoaderCircle,
  RefreshCw,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  Pencil,
  RotateCcw,
  Banknote,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import '../styles/Agenda.css'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const DEADLINE_OPTIONS = [
  { value: '24h', label: '24 horas' },
  { value: '48h', label: '48 horas' },
  { value: '7d', label: '1 semana' },
  { value: '30d', label: '1 mês' },
  { value: 'custom', label: 'Personalizar prazo' },
]

const EMPTY_FORM = {
  appointmentType: 'scheduled',
  serviceId: '',
  clientName: '',
  phone: '',
  scheduledAt: '',
  deadlineOption: '24h',
  customDeadline: '',
  amount: '',
  paymentStatus: 'pending',
  notes: '',
}

function dateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getAppointmentDate(appointment) {
  const value =
    appointment.appointment_type === 'scheduled'
      ? appointment.scheduled_at
      : appointment.deadline_at

  return value ? new Date(value) : null
}

function formatDate(date, options = {}) {
  if (!date || Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(date)
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatTime(date) {
  if (!date || Number.isNaN(date.getTime())) return '—'

  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitialDateTime() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())

  return date.toISOString().slice(0, 16)
}

function toLocalDateTimeInput(value) {
  if (!value) return getInitialDateTime()

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return getInitialDateTime()

  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())

  return date.toISOString().slice(0, 16)
}

function getDeadlineDate(option) {
  const date = new Date()

  switch (option) {
    case '24h':
      date.setHours(date.getHours() + 24)
      break

    case '48h':
      date.setHours(date.getHours() + 48)
      break

    case '7d':
      date.setDate(date.getDate() + 7)
      break

    case '30d':
      date.setMonth(date.getMonth() + 1)
      break

    default:
      return null
  }

  return date
}

function getAppointmentStatusLabel(status) {
  switch (status) {
    case 'pending':
      return 'Pendente'
    case 'completed':
      return 'Concluído'
    case 'cancelled':
      return 'Cancelado'
    default:
      return status || 'Indefinido'
  }
}

function getPaymentStatusLabel(status) {
  switch (status) {
    case 'paid':
      return 'Pago'
    case 'refunded':
      return 'Reembolsado'
    default:
      return 'Pagamento pendente'
  }
}

export default function Agenda() {
  const [userId, setUserId] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [services, setServices] = useState([])
  const [appointments, setAppointments] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  const [selectedDate, setSelectedDate] = useState(() =>
    dateKey(new Date()),
  )

  const [showForm, setShowForm] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    scheduledAt: getInitialDateTime(),
    customDeadline: getInitialDateTime(),
  }))

  const loadData = useCallback(async (id, options = {}) => {
    if (!options.silent) {
      setLoading(true)
    }

    setError('')

    try {
      const [servicesResult, appointmentsResult] = await Promise.all([
        supabase
          .from('services')
          .select('id, name, price, active')
          .eq('owner_id', id)
          .eq('active', true)
          .order('name', { ascending: true }),

        supabase
          .from('appointments')
          .select(`
            id,
            client_id,
            service_id,
            appointment_type,
            scheduled_at,
            deadline_at,
            status,
            payment_status,
            amount,
            notes,
            created_at,
            clients (
              name,
              phone
            ),
            services (
              name,
              price
            )
          `)
          .eq('owner_id', id)
          .order('created_at', { ascending: false }),
      ])

      if (servicesResult.error) throw servicesResult.error
      if (appointmentsResult.error) throw appointmentsResult.error

      setServices(servicesResult.data || [])
      setAppointments(appointmentsResult.data || [])
    } catch (err) {
      console.error('Erro ao carregar a agenda:', err)

      setError(
        `Não foi possível carregar a agenda. ${
          err.message || 'Tente novamente.'
        }`,
      )
    } finally {
      if (!options.silent) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function initialize() {
      try {
        const { data, error: authError } =
          await supabase.auth.getUser()

        if (!mounted) return

        if (authError || !data.user) {
          setUserId(null)
          setError(
            'Sua sessão não foi encontrada. Entre novamente na sua conta.',
          )
          setAuthLoading(false)
          setLoading(false)
          return
        }

        setUserId(data.user.id)
        setAuthLoading(false)

        await loadData(data.user.id)
      } catch (err) {
        if (!mounted) return

        console.error('Erro ao verificar a sessão:', err)
        setError('Não foi possível verificar sua sessão. Entre novamente.')
        setAuthLoading(false)
        setLoading(false)
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [loadData])

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    const mondayOffset = (firstDay.getDay() + 6) % 7
    const start = new Date(year, month, 1 - mondayOffset)

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)

      return {
        date,
        key: dateKey(date),
        inMonth: date.getMonth() === month,
      }
    })
  }, [currentMonth])

  const appointmentCounts = useMemo(() => {
    const counts = {}

    appointments.forEach((appointment) => {
      if (appointment.status === 'cancelled') return

      const date = getAppointmentDate(appointment)

      if (!date || Number.isNaN(date.getTime())) return

      const key = dateKey(date)
      counts[key] = (counts[key] || 0) + 1
    })

    return counts
  }, [appointments])

  // Os indicadores financeiros consideram todo o histórico,
  // independentemente do mês selecionado no calendário.
  const stats = useMemo(() => {
    const activeAppointments = appointments.filter(
      (item) => item.status !== 'cancelled',
    )

    const pending = activeAppointments.filter(
      (item) => item.status === 'pending',
    ).length

    const completed = activeAppointments.filter(
      (item) => item.status === 'completed',
    ).length

    const cancelled = appointments.filter(
      (item) => item.status === 'cancelled',
    )

    const refunded = appointments.filter(
      (item) =>
        item.payment_status === 'refunded' &&
        item.status !== 'cancelled',
    )

    const unpaid = activeAppointments
      .filter((item) => item.payment_status === 'pending')
      .reduce((total, item) => total + Number(item.amount || 0), 0)

    const received = activeAppointments
      .filter((item) => item.payment_status === 'paid')
      .reduce((total, item) => total + Number(item.amount || 0), 0)

    // Faturamento bruto: serviços não cancelados, incluindo os
    // pendentes e os que posteriormente tiveram reembolso.
    const billed = activeAppointments.reduce(
      (total, item) => total + Number(item.amount || 0),
      0,
    )

    const refundedAmount = refunded.reduce(
      (total, item) => total + Number(item.amount || 0),
      0,
    )

    const cancelledAmount = cancelled.reduce(
      (total, item) => total + Number(item.amount || 0),
      0,
    )

    return {
      total: activeAppointments.length,
      pending,
      completed,
      cancelledCount: cancelled.length,
      refundedCount: refunded.length,
      unpaid,
      received,
      billed,
      refundedAmount,
      cancelledAmount,
    }
  }, [appointments])

  const selectedAppointments = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')

    return appointments
      .filter((appointment) => {
        const date = getAppointmentDate(appointment)

        if (!date || dateKey(date) !== selectedDate) return false

        if (
          statusFilter !== 'all' &&
          appointment.status !== statusFilter
        ) {
          return false
        }

        if (
          paymentFilter !== 'all' &&
          appointment.payment_status !== paymentFilter
        ) {
          return false
        }

        if (!normalizedSearch) return true

        const name = appointment.clients?.name || ''
        const phone = appointment.clients?.phone || ''
        const service = appointment.services?.name || ''

        return `${name} ${phone} ${service}`
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedSearch)
      })
      .sort((a, b) => {
        const dateA = getAppointmentDate(a)?.getTime() || 0
        const dateB = getAppointmentDate(b)?.getTime() || 0

        return dateA - dateB
      })
  }, [
    appointments,
    selectedDate,
    search,
    statusFilter,
    paymentFilter,
  ])

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function changeMonth(direction) {
    setCurrentMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + direction,
          1,
        ),
    )
  }

  function openForm() {
    setError('')
    setSuccess('')
    setEditingAppointment(null)

    const firstService = services[0]

    setForm({
      ...EMPTY_FORM,
      serviceId: firstService?.id || '',
      amount: firstService ? String(firstService.price ?? 0) : '',
      scheduledAt: getInitialDateTime(),
      customDeadline: getInitialDateTime(),
      paymentStatus: 'pending',
    })

    setShowForm(true)
  }

  function openEditForm(appointment) {
    setError('')
    setSuccess('')
    setEditingAppointment(appointment)

    const appointmentType =
      appointment.appointment_type === 'deadline'
        ? 'deadline'
        : 'scheduled'

    setForm({
      ...EMPTY_FORM,
      appointmentType,
      serviceId: appointment.service_id || '',
      clientName: appointment.clients?.name || '',
      phone: appointment.clients?.phone || '',
      scheduledAt:
        appointmentType === 'scheduled'
          ? toLocalDateTimeInput(appointment.scheduled_at)
          : getInitialDateTime(),
      deadlineOption: 'custom',
      customDeadline:
        appointmentType === 'deadline'
          ? toLocalDateTimeInput(appointment.deadline_at)
          : getInitialDateTime(),
      amount: String(appointment.amount ?? ''),
      paymentStatus: appointment.payment_status || 'pending',
      notes: appointment.notes || '',
    })

    const appointmentDate = getAppointmentDate(appointment)

    if (appointmentDate && !Number.isNaN(appointmentDate.getTime())) {
      setSelectedDate(dateKey(appointmentDate))
      setCurrentMonth(
        new Date(
          appointmentDate.getFullYear(),
          appointmentDate.getMonth(),
          1,
        ),
      )
    }

    setShowForm(true)
  }

  function closeForm() {
    if (saving) return

    setShowForm(false)
    setEditingAppointment(null)
  }

  async function handleSave(event) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!userId) {
      setError('Sua sessão expirou. Entre novamente na sua conta.')
      return
    }

    if (!form.serviceId) {
      setError('Selecione um serviço do seu catálogo.')
      return
    }

    const service = services.find((item) => item.id === form.serviceId)

    if (!service) {
      setError(
        'O serviço selecionado não está disponível. Atualize o catálogo e tente novamente.',
      )
      return
    }

    const phone = form.phone.trim()
    const name = form.clientName.trim()

    if (!phone) {
      setError('Informe o WhatsApp do consulente.')
      return
    }

    if (phone.replace(/\D/g, '').length < 8) {
      setError('Informe um número de WhatsApp válido.')
      return
    }

    const amountText = String(form.amount).trim().replace(',', '.')
    const amount = Number(amountText)

    if (
      amountText === '' ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > 999999999
    ) {
      setError('Informe um valor válido para o atendimento.')
      return
    }

    if (!['pending', 'paid', 'refunded'].includes(form.paymentStatus)) {
      setError('Selecione uma situação de pagamento válida.')
      return
    }

    // Evita reembolsar ou alterar o pagamento de um atendimento
    // pela edição comum. Reembolsos são controlados pela ação própria.
    if (
      editingAppointment &&
      editingAppointment.payment_status === 'refunded' &&
      form.paymentStatus !== 'refunded'
    ) {
      setError(
        'Use a ação de reembolso para alterar a situação deste pagamento.',
      )
      return
    }

    let scheduledAt = null
    let deadlineAt = null

    if (form.appointmentType === 'scheduled') {
      const date = new Date(form.scheduledAt)

      if (!form.scheduledAt || Number.isNaN(date.getTime())) {
        setError('Informe a data e o horário do atendimento.')
        return
      }

      scheduledAt = date.toISOString()
    } else if (form.deadlineOption === 'custom') {
      const date = new Date(form.customDeadline)

      if (!form.customDeadline || Number.isNaN(date.getTime())) {
        setError('Informe uma data e hora válidas para a entrega.')
        return
      }

      deadlineAt = date.toISOString()
    } else {
      const date = getDeadlineDate(form.deadlineOption)

      if (!date) {
        setError('Selecione um prazo de entrega válido.')
        return
      }

      deadlineAt = date.toISOString()
    }

    setSaving(true)

    try {
      if (editingAppointment) {
        const appointment = editingAppointment

        const { error: clientError } = await supabase
          .from('clients')
          .update({
            name: name || null,
            phone,
          })
          .eq('id', appointment.client_id)
          .eq('owner_id', userId)

        if (clientError) throw clientError

        const { data: updatedAppointment, error: appointmentError } =
          await supabase
            .from('appointments')
            .update({
              service_id: service.id,
              appointment_type: form.appointmentType,
              scheduled_at: scheduledAt,
              deadline_at: deadlineAt,
              payment_status: form.paymentStatus,
              amount,
              notes: form.notes.trim() || null,
            })
            .eq('id', appointment.id)
            .eq('owner_id', userId)
            .select('id')
            .maybeSingle()

        if (appointmentError) throw appointmentError

        if (!updatedAppointment) {
          throw new Error(
            'Nenhuma alteração foi confirmada pelo banco. Verifique suas permissões de acesso e tente novamente.',
          )
        }

        const appointmentDate = scheduledAt
          ? new Date(scheduledAt)
          : new Date(deadlineAt)

        setSelectedDate(dateKey(appointmentDate))
        setCurrentMonth(
          new Date(
            appointmentDate.getFullYear(),
            appointmentDate.getMonth(),
            1,
          ),
        )

        setShowForm(false)
        setEditingAppointment(null)

        setSuccess('Atendimento atualizado com sucesso.')

        await loadData(userId, { silent: true })
      } else {
        // Cria o consulente e, em seguida, o atendimento.
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .insert({
            owner_id: userId,
            name: name || null,
            phone,
          })
          .select('id')
          .single()

        if (clientError) throw clientError

        const { error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            owner_id: userId,
            client_id: client.id,
            service_id: service.id,
            appointment_type: form.appointmentType,
            scheduled_at: scheduledAt,
            deadline_at: deadlineAt,
            status: 'pending',
            payment_status: form.paymentStatus,
            amount,
            notes: form.notes.trim() || null,
          })

        if (appointmentError) {
          const { error: cleanupError } = await supabase
            .from('clients')
            .delete()
            .eq('id', client.id)
            .eq('owner_id', userId)

          if (cleanupError) {
            console.error(
              'Não foi possível remover o consulente criado:',
              cleanupError,
            )
          }

          throw appointmentError
        }

        const appointmentDate = scheduledAt
          ? new Date(scheduledAt)
          : new Date(deadlineAt)

        setSelectedDate(dateKey(appointmentDate))
        setCurrentMonth(
          new Date(
            appointmentDate.getFullYear(),
            appointmentDate.getMonth(),
            1,
          ),
        )

        setShowForm(false)
        setForm({
          ...EMPTY_FORM,
          scheduledAt: getInitialDateTime(),
          customDeadline: getInitialDateTime(),
        })

        setSuccess(
          form.paymentStatus === 'paid'
            ? 'Atendimento cadastrado com pagamento confirmado.'
            : 'Atendimento cadastrado com sucesso.',
        )

        await loadData(userId, { silent: true })
      }
    } catch (err) {
      console.error(
        editingAppointment
          ? 'Erro ao editar atendimento:'
          : 'Erro ao cadastrar atendimento:',
        err,
      )

      setError(
        `Não foi possível ${
          editingAppointment ? 'editar' : 'cadastrar'
        } o atendimento. ${err.message || 'Tente novamente.'}`,
      )
    } finally {
      setSaving(false)
    }
  }

  async function updateAppointment(
    appointment,
    changes,
    successMessage,
  ) {
    if (!userId) return

    setUpdatingId(appointment.id)
    setError('')
    setSuccess('')

    try {
      const { data: updated, error: updateError } = await supabase
        .from('appointments')
        .update(changes)
        .eq('id', appointment.id)
        .eq('owner_id', userId)
        .select('id')
        .maybeSingle()

      if (updateError) throw updateError

      if (!updated) {
        throw new Error(
          'Nenhuma alteração foi confirmada pelo banco. Verifique suas permissões de acesso.',
        )
      }

      setAppointments((current) =>
        current.map((item) =>
          item.id === appointment.id
            ? { ...item, ...changes }
            : item,
        ),
      )

      setSuccess(successMessage)
    } catch (err) {
      console.error('Erro ao atualizar atendimento:', err)

      setError(
        `Não foi possível atualizar o atendimento. ${
          err.message || 'Tente novamente.'
        }`,
      )
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleRefund(appointment) {
    if (appointment.payment_status !== 'paid') {
      setError(
        'Só é possível registrar reembolso para um atendimento que já foi pago.',
      )
      return
    }

    const confirmed = window.confirm(
      `Confirmar o reembolso de ${formatMoney(appointment.amount)}?\n\n` +
        'O atendimento continuará no histórico, mas deixará de contar como valor recebido.',
    )

    if (!confirmed) return

    await updateAppointment(
      appointment,
      { payment_status: 'refunded' },
      'Reembolso registrado. O valor foi retirado dos recebimentos.',
    )
  }

  async function handleUndoRefund(appointment) {
    const confirmed = window.confirm(
      'Deseja desfazer o registro de reembolso?\n\n' +
        'O pagamento voltará a ser marcado como recebido. Confirme apenas se o reembolso foi registrado por engano.',
    )

    if (!confirmed) return

    await updateAppointment(
      appointment,
      { payment_status: 'paid' },
      'Registro de reembolso desfeito. O pagamento voltou a ser marcado como recebido.',
    )
  }

  function goToToday() {
    const today = new Date()

    setCurrentMonth(
      new Date(today.getFullYear(), today.getMonth(), 1),
    )

    setSelectedDate(dateKey(today))
  }

  const selectedDateObject = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number)

    return new Date(year, month - 1, day)
  }, [selectedDate])

  if (authLoading || loading) {
    return (
      <section className="agenda-page">
        <div className="agenda-loading">
          <LoaderCircle className="agenda-spin" size={28} />
          <p>Carregando sua agenda...</p>
        </div>
      </section>
    )
  }

  if (!userId) {
    return (
      <section className="agenda-page">
        <div className="agenda-alert agenda-alert-error">
          {error || 'Entre na sua conta para acessar a agenda.'}
        </div>
      </section>
    )
  }

  return (
    <section className="agenda-page">
      <header className="agenda-header">
        <div>
          <span className="agenda-eyebrow">ORGANIZAÇÃO</span>
          <h1>Sua agenda</h1>
          <p>
            Organize seus atendimentos, acompanhe os prazos e mantenha
            tudo em um só lugar.
          </p>
        </div>

        <button
          type="button"
          className="agenda-primary-button"
          onClick={openForm}
        >
          <Plus size={18} />
          Novo atendimento
        </button>
      </header>

      {error && (
        <div className="agenda-alert agenda-alert-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            aria-label="Fechar mensagem"
            onClick={() => setError('')}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="agenda-alert agenda-alert-success" role="status">
          <span>{success}</span>
          <button
            type="button"
            aria-label="Fechar mensagem"
            onClick={() => setSuccess('')}
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div className="agenda-stats">
        <article className="agenda-stat-card">
          <div className="agenda-stat-icon">
            <ClipboardList size={20} />
          </div>
          <div>
            <p>Atendimentos ativos</p>
            <strong>{stats.total}</strong>
          </div>
        </article>

        <article className="agenda-stat-card">
          <div className="agenda-stat-icon">
            <Clock3 size={20} />
          </div>
          <div>
            <p>Pendentes</p>
            <strong>{stats.pending}</strong>
          </div>
        </article>

        <article className="agenda-stat-card">
          <div className="agenda-stat-icon">
            <Check size={20} />
          </div>
          <div>
            <p>Concluídos</p>
            <strong>{stats.completed}</strong>
          </div>
        </article>

        <article className="agenda-stat-card">
          <div className="agenda-stat-icon">
            <Wallet size={20} />
          </div>
          <div>
            <p>Valor a receber</p>
            <strong>{formatMoney(stats.unpaid)}</strong>
          </div>
        </article>

        <article className="agenda-stat-card">
          <div className="agenda-stat-icon">
            <Banknote size={20} />
          </div>
          <div>
            <p>Valor recebido</p>
            <strong>{formatMoney(stats.received)}</strong>
          </div>
        </article>

        <article className="agenda-stat-card">
          <div className="agenda-stat-icon">
            <CircleDollarSign size={20} />
          </div>
          <div>
            <p>Total faturado</p>
            <strong>{formatMoney(stats.billed)}</strong>
          </div>
        </article>

        <article className="agenda-stat-card">
          <div className="agenda-stat-icon">
            <RotateCcw size={20} />
          </div>
          <div>
            <p>Valor reembolsado</p>
            <strong>{formatMoney(stats.refundedAmount)}</strong>
            <small>{stats.refundedCount} atendimento(s)</small>
          </div>
        </article>

        <article className="agenda-stat-card">
          <div className="agenda-stat-icon">
            <X size={20} />
          </div>
          <div>
            <p>Cancelados</p>
            <strong>{stats.cancelledCount}</strong>
            <small>{formatMoney(stats.cancelledAmount)} em cancelamentos</small>
          </div>
        </article>
      </div>

      <div className="agenda-layout">
        <section className="agenda-calendar-card">
          <div className="agenda-calendar-heading">
            <div>
              <span className="agenda-section-eyebrow">CALENDÁRIO</span>
              <h2>
                {MONTHS[currentMonth.getMonth()]}{' '}
                {currentMonth.getFullYear()}
              </h2>
            </div>

            <div className="agenda-calendar-actions">
              <button
                type="button"
                className="agenda-icon-button"
                onClick={goToToday}
                title="Ir para hoje"
                aria-label="Ir para hoje"
              >
                <CalendarDays size={17} />
              </button>

              <button
                type="button"
                className="agenda-icon-button"
                onClick={() => changeMonth(-1)}
                title="Mês anterior"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={19} />
              </button>

              <button
                type="button"
                className="agenda-icon-button"
                onClick={() => changeMonth(1)}
                title="Próximo mês"
                aria-label="Próximo mês"
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>

          <div className="agenda-calendar-grid">
            {WEEKDAYS.map((weekday) => (
              <div className="agenda-weekday" key={weekday}>
                {weekday}
              </div>
            ))}

            {calendarDays.map(({ date, key, inMonth }) => {
              const isToday = key === dateKey(new Date())
              const isSelected = key === selectedDate
              const count = appointmentCounts[key] || 0

              return (
                <button
                  type="button"
                  key={key}
                  className={[
                    'agenda-day',
                    !inMonth ? 'agenda-day-outside' : '',
                    isToday ? 'agenda-day-today' : '',
                    isSelected ? 'agenda-day-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setSelectedDate(key)}
                  aria-pressed={isSelected}
                  aria-label={`${formatDate(date)}${
                    count ? `, ${count} atendimento(s)` : ''
                  }`}
                >
                  <span>{date.getDate()}</span>
                  {count > 0 && (
                    <span className="agenda-day-count">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="agenda-calendar-legend">
            <span>
              <span className="agenda-legend-dot agenda-legend-today" />
              Hoje
            </span>
            <span>
              <span className="agenda-legend-dot agenda-legend-events" />
              Com atendimentos
            </span>
          </div>
        </section>

        <section className="agenda-list-card">
          <div className="agenda-list-heading">
            <div>
              <span className="agenda-section-eyebrow">
                SEUS COMPROMISSOS
              </span>
              <h2>
                {formatDate(selectedDateObject, {
                  day: 'numeric',
                  month: 'long',
                })}
              </h2>
              <p>
                {selectedAppointments.length === 1
                  ? '1 atendimento neste dia'
                  : `${selectedAppointments.length} atendimentos neste dia`}
              </p>
            </div>

            <button
              type="button"
              className="agenda-icon-button"
              onClick={() => loadData(userId)}
              title="Atualizar agenda"
              aria-label="Atualizar agenda"
            >
              <RefreshCw size={17} />
            </button>
          </div>

          <div className="agenda-filters">
            <label className="agenda-search">
              <Search size={17} />
              <input
                type="search"
                placeholder="Buscar consulente ou serviço..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <select
              className="agenda-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filtrar por situação do atendimento"
            >
              <option value="all">Todos os atendimentos</option>
              <option value="pending">Atendimentos pendentes</option>
              <option value="completed">Atendimentos concluídos</option>
              <option value="cancelled">Atendimentos cancelados</option>
            </select>

            <select
              className="agenda-status-filter"
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
              aria-label="Filtrar por situação do pagamento"
            >
              <option value="all">Todos os pagamentos</option>
              <option value="pending">Pagamento pendente</option>
              <option value="paid">Pagamentos recebidos</option>
              <option value="refunded">Pagamentos reembolsados</option>
            </select>
          </div>

          {selectedAppointments.length === 0 ? (
            <div className="agenda-empty">
              <div className="agenda-empty-icon">
                <CalendarClock size={27} />
              </div>
              <h3>Nenhum atendimento por aqui</h3>
              <p>
                Não há atendimentos que correspondam à data e aos filtros
                selecionados.
              </p>
              <button
                type="button"
                className="agenda-text-button"
                onClick={openForm}
              >
                <Plus size={16} />
                Cadastrar atendimento
              </button>
            </div>
          ) : (
            <div className="agenda-appointment-list">
              {selectedAppointments.map((appointment) => {
                const date = getAppointmentDate(appointment)
                const isUpdating = updatingId === appointment.id
                const isCancelled = appointment.status === 'cancelled'
                const isRefunded =
                  appointment.payment_status === 'refunded'

                return (
                  <article
                    className={`agenda-appointment-card agenda-status-${appointment.status}`}
                    key={appointment.id}
                  >
                    <div className="agenda-appointment-time">
                      <strong>{formatTime(date)}</strong>
                      <span>
                        {appointment.appointment_type === 'scheduled'
                          ? 'Horário'
                          : 'Prazo de entrega'}
                      </span>
                    </div>

                    <div className="agenda-appointment-main">
                      <div className="agenda-appointment-title-row">
                        <h3>
                          {appointment.clients?.name ||
                            'Consulente sem nome'}
                        </h3>
                        <span
                          className={`agenda-status-badge agenda-badge-${appointment.status}`}
                        >
                          {getAppointmentStatusLabel(appointment.status)}
                        </span>
                      </div>

                      <p className="agenda-appointment-service">
                        {appointment.services?.name ||
                          'Serviço indisponível'}
                      </p>

                      <div className="agenda-appointment-meta">
                        <span>
                          <Phone size={14} />
                          {appointment.clients?.phone || 'Sem telefone'}
                        </span>
                        <span>
                          <Wallet size={14} />
                          {formatMoney(appointment.amount)}
                        </span>
                      </div>

                      {appointment.notes && (
                        <p className="agenda-appointment-notes">
                          {appointment.notes}
                        </p>
                      )}

                      <div className="agenda-appointment-footer">
                        <span
                          className={`agenda-payment-badge ${
                            appointment.payment_status === 'paid'
                              ? 'agenda-payment-paid'
                              : appointment.payment_status === 'refunded'
                                ? 'agenda-payment-refunded'
                                : 'agenda-payment-pending'
                          }`}
                        >
                          {getPaymentStatusLabel(
                            appointment.payment_status,
                          )}
                        </span>

                        <div className="agenda-appointment-actions">
                          <button
                            type="button"
                            className="agenda-small-button"
                            disabled={isUpdating || saving}
                            onClick={() => openEditForm(appointment)}
                          >
                            <Pencil size={14} />
                            Editar
                          </button>

                          {!isCancelled && !isRefunded && (
                            <button
                              type="button"
                              className="agenda-small-button"
                              disabled={isUpdating}
                              onClick={() =>
                                updateAppointment(
                                  appointment,
                                  {
                                    payment_status:
                                      appointment.payment_status === 'paid'
                                        ? 'pending'
                                        : 'paid',
                                  },
                                  appointment.payment_status === 'paid'
                                    ? 'Pagamento marcado como pendente.'
                                    : 'Pagamento confirmado.',
                                )
                              }
                            >
                              {appointment.payment_status === 'paid'
                                ? 'Desmarcar pago'
                                : 'Marcar como pago'}
                            </button>
                          )}

                          {!isCancelled &&
                            appointment.payment_status === 'paid' && (
                              <button
                                type="button"
                                className="agenda-small-button"
                                disabled={isUpdating}
                                onClick={() => handleRefund(appointment)}
                              >
                                <RotateCcw size={14} />
                                Reembolsar
                              </button>
                            )}

                          {!isCancelled && isRefunded && (
                            <button
                              type="button"
                              className="agenda-small-button"
                              disabled={isUpdating}
                              onClick={() =>
                                handleUndoRefund(appointment)
                              }
                            >
                              <RotateCcw size={14} />
                              Desfazer reembolso
                            </button>
                          )}

                          {appointment.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                className="agenda-small-button agenda-complete-button"
                                disabled={isUpdating}
                                onClick={() =>
                                  updateAppointment(
                                    appointment,
                                    { status: 'completed' },
                                    'Atendimento concluído.',
                                  )
                                }
                              >
                                <Check size={14} />
                                Concluir
                              </button>

                              <button
                                type="button"
                                className="agenda-small-button agenda-cancel-button"
                                disabled={isUpdating}
                                onClick={() => {
                                  const confirmed = window.confirm(
                                    'Deseja realmente cancelar este atendimento? Ele deixará de entrar no faturamento.',
                                  )

                                  if (confirmed) {
                                    updateAppointment(
                                      appointment,
                                      { status: 'cancelled' },
                                      'Atendimento cancelado.',
                                    )
                                  }
                                }}
                              >
                                <X size={14} />
                                Cancelar
                              </button>
                            </>
                          )}

                          {isCancelled && (
                            <button
                              type="button"
                              className="agenda-small-button agenda-complete-button"
                              disabled={isUpdating}
                              onClick={() => {
                                const confirmed = window.confirm(
                                  'Deseja reativar este atendimento? Ele voltará a entrar nos indicadores financeiros conforme a situação do pagamento.',
                                )

                                if (confirmed) {
                                  updateAppointment(
                                    appointment,
                                    { status: 'pending' },
                                    'Atendimento reativado.',
                                  )
                                }
                              }}
                            >
                              <RotateCcw size={14} />
                              Reativar
                            </button>
                          )}

                          {isUpdating && (
                            <LoaderCircle
                              className="agenda-spin"
                              size={17}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {showForm && (
        <div
          className="agenda-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm()
          }}
        >
          <section
            className="agenda-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agenda-form-title"
          >
            <header className="agenda-modal-header">
              <div>
                <span className="agenda-section-eyebrow">
                  {editingAppointment ? 'EDITAR REGISTRO' : 'NOVO REGISTRO'}
                </span>
                <h2 id="agenda-form-title">
                  {editingAppointment
                    ? 'Editar atendimento'
                    : 'Novo atendimento'}
                </h2>
                <p>
                  {editingAppointment
                    ? 'Altere os dados desejados e salve as modificações.'
                    : 'Preencha os dados para organizar seu atendimento.'}
                </p>
              </div>

              <button
                type="button"
                className="agenda-icon-button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Fechar formulário"
              >
                <X size={20} />
              </button>
            </header>

            <form className="agenda-form" onSubmit={handleSave}>
              {editingAppointment &&
                editingAppointment.payment_status === 'refunded' && (
                  <div className="agenda-alert agenda-alert-success">
                    Este atendimento possui um reembolso registrado. Para
                    alterar essa situação, use a ação de reembolso na agenda.
                  </div>
                )}

              <fieldset className="agenda-type-options">
                <legend>Como deseja organizar?</legend>

                <label
                  className={
                    form.appointmentType === 'scheduled'
                      ? 'agenda-type-option agenda-type-active'
                      : 'agenda-type-option'
                  }
                >
                  <input
                    type="radio"
                    name="appointmentType"
                    value="scheduled"
                    checked={form.appointmentType === 'scheduled'}
                    onChange={() =>
                      updateForm('appointmentType', 'scheduled')
                    }
                  />
                  <CalendarDays size={19} />
                  <span>
                    <strong>Data e horário</strong>
                    <small>Atendimento agendado</small>
                  </span>
                </label>

                <label
                  className={
                    form.appointmentType === 'deadline'
                      ? 'agenda-type-option agenda-type-active'
                      : 'agenda-type-option'
                  }
                >
                  <input
                    type="radio"
                    name="appointmentType"
                    value="deadline"
                    checked={form.appointmentType === 'deadline'}
                    onChange={() =>
                      updateForm('appointmentType', 'deadline')
                    }
                  />
                  <Clock3 size={19} />
                  <span>
                    <strong>Prazo de entrega</strong>
                    <small>Leitura ou serviço a entregar</small>
                  </span>
                </label>
              </fieldset>

              {form.appointmentType === 'scheduled' ? (
                <label className="agenda-form-field">
                  <span>Data e horário *</span>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) =>
                      updateForm('scheduledAt', event.target.value)
                    }
                    required
                  />
                </label>
              ) : (
                <>
                  <label className="agenda-form-field">
                    <span>Prazo de entrega *</span>
                    <select
                      value={form.deadlineOption}
                      onChange={(event) =>
                        updateForm('deadlineOption', event.target.value)
                      }
                    >
                      {DEADLINE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {form.deadlineOption === 'custom' && (
                    <label className="agenda-form-field">
                      <span>Data e horário limite *</span>
                      <input
                        type="datetime-local"
                        value={form.customDeadline}
                        onChange={(event) =>
                          updateForm('customDeadline', event.target.value)
                        }
                        required
                      />
                    </label>
                  )}
                </>
              )}

              <label className="agenda-form-field">
                <span>Serviço do catálogo *</span>
                <select
                  value={form.serviceId}
                  onChange={(event) => {
                    const service = services.find(
                      (item) => item.id === event.target.value,
                    )

                    setForm((current) => ({
                      ...current,
                      serviceId: event.target.value,
                      amount: service
                        ? String(service.price ?? 0)
                        : '',
                    }))
                  }}
                  required
                >
                  <option value="">Selecione um serviço</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — {formatMoney(service.price)}
                    </option>
                  ))}
                </select>

                {services.length === 0 && (
                  <small className="agenda-field-help">
                    Cadastre e ative um serviço no catálogo antes de criar
                    um atendimento.
                  </small>
                )}
              </label>

              <div className="agenda-form-row">
                <label className="agenda-form-field">
                  <span>Nome do consulente</span>
                  <input
                    type="text"
                    value={form.clientName}
                    onChange={(event) =>
                      updateForm('clientName', event.target.value)
                    }
                    placeholder="Nome (opcional)"
                    maxLength={120}
                  />
                </label>

                <label className="agenda-form-field">
                  <span>WhatsApp *</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateForm('phone', event.target.value)
                    }
                    placeholder="(00) 00000-0000"
                    autoComplete="tel"
                    required
                    maxLength={30}
                  />
                </label>
              </div>

              <label className="agenda-form-field">
                <span>Valor do atendimento (R$) *</span>
                <input
                  type="number"
                  min="0"
                  max="999999999"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) =>
                    updateForm('amount', event.target.value)
                  }
                  placeholder="0,00"
                  required
                />
                <small className="agenda-field-help">
                  Você pode ajustar o preço do serviço para este
                  atendimento sem alterar o preço original do catálogo.
                </small>
              </label>

              <label className="agenda-form-field">
                <span>Situação do pagamento *</span>
                <select
                  value={form.paymentStatus}
                  onChange={(event) =>
                    updateForm('paymentStatus', event.target.value)
                  }
                  required
                  disabled={
                    editingAppointment?.payment_status === 'refunded'
                  }
                >
                  <option value="pending">Pendente</option>
                  <option value="paid">Já pago</option>
                  {editingAppointment?.payment_status === 'refunded' && (
                    <option value="refunded">Reembolsado</option>
                  )}
                </select>
              </label>

              <label className="agenda-form-field">
                <span>Observações</span>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    updateForm('notes', event.target.value)
                  }
                  placeholder="Anotações importantes sobre o atendimento..."
                  rows={3}
                  maxLength={5000}
                />
              </label>

              <footer className="agenda-form-footer">
                <button
                  type="button"
                  className="agenda-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="agenda-primary-button"
                  disabled={saving || services.length === 0}
                >
                  {saving ? (
                    <>
                      <LoaderCircle className="agenda-spin" size={17} />
                      Salvando...
                    </>
                  ) : editingAppointment ? (
                    <>
                      <Check size={17} />
                      Salvar alterações
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Salvar atendimento
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}
