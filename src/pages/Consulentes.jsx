
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Users,
  Search,
  Plus,
  Star,
  Pencil,
  Trash2,
  Phone,
  CalendarDays,
  CheckCircle2,
  X,
  Save,
  Clock,
  LoaderCircle,
  RefreshCw,
  Heart,
  UserRound,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import '../styles/consulentes.css'

const EMPTY_FORM = {
  name: '',
  phone: '',
  description: '',
}

function formatDate(dateValue) {
  if (!dateValue) return 'Nenhuma consulta registrada'

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return 'Data indisponível'
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getAppointmentDate(appointment) {
  if (appointment.appointment_type === 'deadline') {
    return appointment.deadline_at
  }

  return appointment.scheduled_at
}

function getInitials(name) {
  if (!name?.trim()) return '?'

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function getErrorMessage(error, fallback) {
  if (error?.code === '23505') {
    return 'Já existe um registro com esses dados.'
  }

  if (error?.code === '42501') {
    return 'Você não tem permissão para realizar essa ação.'
  }

  return error?.message || fallback
}

export default function Consulentes() {
  const [userId, setUserId] = useState(null)
  const [clients, setClients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError

      if (!user) {
        setUserId(null)
        setClients([])
        setAppointments([])
        setError('Sua sessão expirou. Entre novamente para continuar.')
        return
      }

      setUserId(user.id)

      const [clientsResult, appointmentsResult] = await Promise.all([
        supabase
          .from('clients')
          .select(
            'id, owner_id, name, phone, description, is_favorite, created_at',
          )
          .eq('owner_id', user.id)
          .order('name', { ascending: true }),

        supabase
          .from('appointments')
          .select(
            'id, owner_id, client_id, status, scheduled_at, deadline_at, appointment_type, created_at',
          )
          .eq('owner_id', user.id),
      ])

      if (clientsResult.error) throw clientsResult.error
      if (appointmentsResult.error) throw appointmentsResult.error

      setClients(clientsResult.data || [])
      setAppointments(appointmentsResult.data || [])
    } catch (err) {
      console.error('Erro ao carregar consulentes:', err)
      setError(
        getErrorMessage(
          err,
          'Não foi possível carregar os consulentes. Tente novamente.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [loadData])

  const appointmentsByClient = useMemo(() => {
    const grouped = {}

    for (const appointment of appointments) {
      if (!appointment.client_id) continue

      if (!grouped[appointment.client_id]) {
        grouped[appointment.client_id] = []
      }

      grouped[appointment.client_id].push(appointment)
    }

    return grouped
  }, [appointments])

  const clientStats = useMemo(() => {
    const stats = {}

    for (const client of clients) {
      const clientAppointments = appointmentsByClient[client.id] || []

      const completed = clientAppointments.filter(
        (appointment) => appointment.status === 'completed',
      )

      const pending = clientAppointments.filter(
        (appointment) => appointment.status === 'pending',
      )

      const cancelled = clientAppointments.filter(
        (appointment) => appointment.status === 'cancelled',
      )

      const datedAppointments = clientAppointments
        .filter((appointment) => getAppointmentDate(appointment))
        .sort(
          (a, b) =>
            new Date(getAppointmentDate(b)).getTime() -
            new Date(getAppointmentDate(a)).getTime(),
        )

      stats[client.id] = {
        total: clientAppointments.length,
        completed: completed.length,
        pending: pending.length,
        cancelled: cancelled.length,
        lastConsultation: datedAppointments[0]
          ? getAppointmentDate(datedAppointments[0])
          : null,
      }
    }

    return stats
  }, [clients, appointmentsByClient])

  const summary = useMemo(() => {
    const favorites = clients.filter(
      (client) => client.is_favorite,
    ).length

    const completedConsultations = appointments.filter(
      (appointment) => appointment.status === 'completed',
    ).length

    const clientsConsulted = clients.filter(
      (client) => (clientStats[client.id]?.completed || 0) > 0,
    ).length

    return {
      totalClients: clients.length,
      favorites,
      completedConsultations,
      clientsConsulted,
    }
  }, [clients, appointments, clientStats])

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')

    return clients.filter((client) => {
      const name = (client.name || '').toLocaleLowerCase('pt-BR')
      const phone = (client.phone || '').toLocaleLowerCase('pt-BR')
      const stats = clientStats[client.id]

      const matchesSearch =
        !normalizedSearch ||
        name.includes(normalizedSearch) ||
        phone.includes(normalizedSearch)

      const matchesFilter =
        filter === 'all' ||
        (filter === 'favorites' && client.is_favorite) ||
        (filter === 'consulted' && (stats?.completed || 0) > 0)

      return matchesSearch && matchesFilter
    })
  }, [clients, clientStats, search, filter])

  function openCreateForm() {
    setEditingClient(null)
    setForm(EMPTY_FORM)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  function openEditForm(client) {
    setEditingClient(client)
    setForm({
      name: client.name || '',
      phone: client.phone || '',
      description: client.description || '',
    })
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  function closeForm() {
    if (saving) return

    setShowForm(false)
    setEditingClient(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  function handleFormChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!userId) {
      setError('Sua sessão expirou. Entre novamente.')
      return
    }

    const name = form.name.trim()
    const phone = form.phone.trim()
    const description = form.description.trim()

    if (!name) {
      setError('Informe o nome do consulente.')
      return
    }

    if (!phone) {
      setError('Informe o telefone do consulente.')
      return
    }

    setSaving(true)

    try {
      const clientData = {
        name,
        phone,
        description: description || null,
      }

      if (editingClient) {
        const { data, error: updateError } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id)
          .eq('owner_id', userId)
          .select(
            'id, owner_id, name, phone, description, is_favorite, created_at',
          )
          .single()

        if (updateError) throw updateError

        setClients((previous) =>
          previous
            .map((client) =>
              client.id === editingClient.id ? data : client,
            )
            .sort((a, b) =>
              (a.name || '').localeCompare(b.name || '', 'pt-BR'),
            ),
        )

        setSuccess('Consulente atualizado com sucesso.')
      } else {
        const { data, error: insertError } = await supabase
          .from('clients')
          .insert({
            ...clientData,
            owner_id: userId,
            is_favorite: false,
          })
          .select(
            'id, owner_id, name, phone, description, is_favorite, created_at',
          )
          .single()

        if (insertError) throw insertError

        setClients((previous) =>
          [...previous, data].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '', 'pt-BR'),
          ),
        )

        setSuccess('Consulente cadastrado com sucesso.')
      }

      setShowForm(false)
      setEditingClient(null)
      setForm(EMPTY_FORM)
    } catch (err) {
      console.error('Erro ao salvar consulente:', err)
      setError(
        getErrorMessage(
          err,
          'Não foi possível salvar o consulente. Tente novamente.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleFavorite(client) {
    if (!userId) return

    setFavoriteLoadingId(client.id)
    setError('')
    setSuccess('')

    try {
      const nextFavorite = !client.is_favorite

      const { data, error: updateError } = await supabase
        .from('clients')
        .update({ is_favorite: nextFavorite })
        .eq('id', client.id)
        .eq('owner_id', userId)
        .select(
          'id, owner_id, name, phone, description, is_favorite, created_at',
        )
        .single()

      if (updateError) throw updateError

      setClients((previous) =>
        previous.map((item) => (item.id === client.id ? data : item)),
      )

      setSuccess(
        nextFavorite
          ? 'Consulente adicionado aos favoritos.'
          : 'Consulente removido dos favoritos.',
      )
    } catch (err) {
      console.error('Erro ao atualizar favorito:', err)
      setError(
        getErrorMessage(
          err,
          'Não foi possível atualizar o favorito.',
        ),
      )
    } finally {
      setFavoriteLoadingId(null)
    }
  }

  async function handleDelete(client) {
    const confirmed = window.confirm(
      `Tem certeza de que deseja excluir ${client.name || 'este consulente'}? Os atendimentos existentes serão preservados, mas deixarão de estar vinculados a esse consulente.`,
    )

    if (!confirmed || !userId) return

    setDeletingId(client.id)
    setError('')
    setSuccess('')

    try {
      const { error: unlinkError } = await supabase
        .from('appointments')
        .update({ client_id: null })
        .eq('owner_id', userId)
        .eq('client_id', client.id)

      if (unlinkError) throw unlinkError

      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id)
        .eq('owner_id', userId)

      if (deleteError) throw deleteError

      setClients((previous) =>
        previous.filter((item) => item.id !== client.id),
      )

      setAppointments((previous) =>
        previous.map((appointment) =>
          appointment.client_id === client.id
            ? { ...appointment, client_id: null }
            : appointment,
        ),
      )

      setSuccess('Consulente excluído com sucesso.')
    } catch (err) {
      console.error('Erro ao excluir consulente:', err)
      setError(
        getErrorMessage(
          err,
          'Não foi possível excluir o consulente. Tente novamente.',
        ),
      )
      await loadData()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="consulentes-page">
      <div className="page-title consulentes-page-title">
        <div>
          <div className="eyebrow">RELACIONAMENTO</div>
          <h1>Consulentes</h1>
          <p>
            Organize seus consulentes, acompanhe o histórico de consultas e
            mantenha por perto as pessoas mais importantes para você.
          </p>
        </div>

        <button
          type="button"
          className="button button-primary consulentes-add-button"
          onClick={openCreateForm}
        >
          <Plus size={18} />
          Novo consulente
        </button>
      </div>

      {error && (
        <div className="consulentes-alert consulentes-alert-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => setError('')}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div
          className="consulentes-alert consulentes-alert-success"
          role="status"
        >
          <span>{success}</span>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => setSuccess('')}
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div className="consulentes-summary">
        <div className="consulentes-summary-card">
          <div className="consulentes-summary-icon">
            <Users size={21} />
          </div>
          <div>
            <span>Total de consulentes</span>
            <strong>{summary.totalClients}</strong>
          </div>
        </div>

        <div className="consulentes-summary-card">
          <div className="consulentes-summary-icon">
            <Star size={21} />
          </div>
          <div>
            <span>Favoritos</span>
            <strong>{summary.favorites}</strong>
          </div>
        </div>

        <div className="consulentes-summary-card">
          <div className="consulentes-summary-icon">
            <CheckCircle2 size={21} />
          </div>
          <div>
            <span>Consultas concluídas</span>
            <strong>{summary.completedConsultations}</strong>
          </div>
        </div>

        <div className="consulentes-summary-card">
          <div className="consulentes-summary-icon">
            <Heart size={21} />
          </div>
          <div>
            <span>Já se consultaram</span>
            <strong>{summary.clientsConsulted}</strong>
          </div>
        </div>
      </div>

      <div className="consulentes-toolbar">
        <div className="consulentes-search">
          <Search size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou telefone..."
            aria-label="Buscar consulentes"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="consulentes-filters" aria-label="Filtrar consulentes">
          <button
            type="button"
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            Todos
          </button>
          <button
            type="button"
            className={filter === 'favorites' ? 'active' : ''}
            onClick={() => setFilter('favorites')}
          >
            <Star size={15} />
            Favoritos
          </button>
          <button
            type="button"
            className={filter === 'consulted' ? 'active' : ''}
            onClick={() => setFilter('consulted')}
          >
            <CheckCircle2 size={15} />
            Já consultaram
          </button>
        </div>

        <button
          type="button"
          className="consulentes-refresh-button"
          onClick={loadData}
          disabled={loading}
          title="Atualizar lista"
          aria-label="Atualizar lista"
        >
          <RefreshCw size={17} className={loading ? 'consulentes-spinning' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="consulentes-state">
          <LoaderCircle size={30} className="consulentes-spinning" />
          <p>Carregando consulentes...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="consulentes-empty">
          <div className="consulentes-empty-icon">
            {search || filter !== 'all' ? (
              <Search size={30} />
            ) : (
              <UserRound size={30} />
            )}
          </div>

          <h2>
            {search || filter !== 'all'
              ? 'Nenhum consulente encontrado'
              : 'Sua lista está começando'}
          </h2>

          <p>
            {search || filter !== 'all'
              ? 'Experimente mudar a busca ou selecionar outro filtro.'
              : 'Cadastre seu primeiro consulente ou vincule uma pessoa a um atendimento na Agenda.'}
          </p>

          {!search && filter === 'all' && (
            <button
              type="button"
              className="button button-primary"
              onClick={openCreateForm}
            >
              <Plus size={17} />
              Cadastrar consulente
            </button>
          )}
        </div>
      ) : (
        <div className="consulentes-grid">
          {filteredClients.map((client) => {
            const stats = clientStats[client.id] || {
              total: 0,
              completed: 0,
              pending: 0,
              cancelled: 0,
              lastConsultation: null,
            }

            return (
              <article className="consulentes-card" key={client.id}>
                <div className="consulentes-card-header">
                  <div className="consulentes-avatar">
                    {getInitials(client.name)}
                  </div>

                  <div className="consulentes-card-identity">
                    <h2>{client.name || 'Consulente sem nome'}</h2>
                    <div className="consulentes-phone">
                      <Phone size={14} />
                      <span>{client.phone || 'Telefone não informado'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`consulentes-favorite-button ${
                      client.is_favorite ? 'is-favorite' : ''
                    }`}
                    onClick={() => toggleFavorite(client)}
                    disabled={favoriteLoadingId === client.id}
                    title={
                      client.is_favorite
                        ? 'Remover dos favoritos'
                        : 'Adicionar aos favoritos'
                    }
                    aria-label={
                      client.is_favorite
                        ? `Remover ${client.name} dos favoritos`
                        : `Adicionar ${client.name} aos favoritos`
                    }
                  >
                    {favoriteLoadingId === client.id ? (
                      <LoaderCircle
                        size={19}
                        className="consulentes-spinning"
                      />
                    ) : (
                      <Star
                        size={19}
                        fill={client.is_favorite ? 'currentColor' : 'none'}
                      />
                    )}
                  </button>
                </div>

                {client.description && (
                  <p className="consulentes-description">
                    {client.description}
                  </p>
                )}

                <div className="consulentes-card-stats">
                  <div>
                    <span>Concluídas</span>
                    <strong>{stats.completed}</strong>
                  </div>
                  <div>
                    <span>Pendentes</span>
                    <strong>{stats.pending}</strong>
                  </div>
                  <div>
                    <span>Canceladas</span>
                    <strong>{stats.cancelled}</strong>
                  </div>
                </div>

                <div className="consulentes-card-total">
                  <CalendarDays size={16} />
                  <span>
                    {stats.completed === 1
                      ? '1 consulta concluída'
                      : `${stats.completed} consultas concluídas`}
                  </span>
                </div>

                <div className="consulentes-last-consultation">
                  <Clock size={15} />
                  <span>
                    Último atendimento: {formatDate(stats.lastConsultation)}
                  </span>
                </div>

                <div className="consulentes-card-actions">
                  <button
                    type="button"
                    className="consulentes-edit-button"
                    onClick={() => openEditForm(client)}
                  >
                    <Pencil size={16} />
                    Editar
                  </button>

                  <button
                    type="button"
                    className="consulentes-delete-button"
                    onClick={() => handleDelete(client)}
                    disabled={deletingId === client.id}
                  >
                    {deletingId === client.id ? (
                      <LoaderCircle
                        size={16}
                        className="consulentes-spinning"
                      />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    Excluir
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {!loading && filteredClients.length > 0 && (
        <p className="consulentes-results-count">
          Exibindo {filteredClients.length}{' '}
          {filteredClients.length === 1
            ? 'consulente'
            : 'consulentes'}
        </p>
      )}

      {showForm && (
        <div
          className="consulentes-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm()
          }}
        >
          <section
            className="consulentes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="consulentes-form-title"
          >
            <div className="consulentes-modal-header">
              <div>
                <span className="eyebrow">
                  {editingClient ? 'ATUALIZAÇÃO' : 'NOVO CADASTRO'}
                </span>
                <h2 id="consulentes-form-title">
                  {editingClient ? 'Editar consulente' : 'Novo consulente'}
                </h2>
                <p>Preencha as informações da pessoa.</p>
              </div>

              <button
                type="button"
                className="consulentes-modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Fechar formulário"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="consulentes-form-body">
                {error && (
                  <div
                    className="consulentes-alert consulentes-alert-error"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <label className="consulentes-field">
                  <span>Nome completo *</span>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="Nome do consulente"
                    autoComplete="name"
                    maxLength={150}
                    required
                  />
                </label>

                <label className="consulentes-field">
                  <span>Telefone *</span>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="(00) 00000-0000"
                    autoComplete="tel"
                    maxLength={30}
                    required
                  />
                </label>

                <label className="consulentes-field">
                  <span>Observações</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Anotações sobre o consulente..."
                    rows={4}
                    maxLength={2000}
                  />
                  <small>
                    Use este campo para anotações que ajudem a organizar seus
                    atendimentos.
                  </small>
                </label>

                {editingClient?.is_favorite && (
                  <p className="consulentes-favorite-note">
                    <Star size={15} fill="currentColor" />
                    Este consulente está nos seus favoritos. Editar os dados
                    não altera essa preferência.
                  </p>
                )}
              </div>

              <div className="consulentes-modal-footer">
                <button
                  type="button"
                  className="consulentes-cancel-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="button button-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle
                      size={17}
                      className="consulentes-spinning"
                    />
                  ) : (
                    <Save size={17} />
                  )}
                  {saving
                    ? 'Salvando...'
                    : editingClient
                      ? 'Salvar alterações'
                      : 'Cadastrar consulente'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
