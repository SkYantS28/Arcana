
import { useCallback, useEffect, useState } from 'react'
import {
  ShieldCheck,
  ArrowUpRight,
  Users,
  Mail,
  CalendarDays,
  ContactRound,
  BriefcaseBusiness,
  Gift,
  Wallet,
  Eye,
  Pencil,
  Trash2,
  LoaderCircle,
  RefreshCw,
  LockKeyhole,
  Check,
  AlertCircle,
  UserPlus,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import '../styles/equipe.css'

const MODULES = [
  {
    id: 'appointments',
    label: 'Agenda',
    description: 'Agendamentos, prazos e status das consultas.',
    icon: CalendarDays,
  },
  {
    id: 'clients',
    label: 'Consulentes',
    description: 'Cadastro e histórico dos consulentes.',
    icon: ContactRound,
  },
  {
    id: 'services',
    label: 'Meu catálogo',
    description: 'Serviços, descrições e preços.',
    icon: BriefcaseBusiness,
  },
  {
    id: 'loyalty',
    label: 'Recompensas',
    description: 'Programa de fidelidade, pontos e recompensas.',
    icon: Gift,
  },
  {
    id: 'finance',
    label: 'Financeiro',
    description: 'Receitas, despesas e pagamentos.',
    icon: Wallet,
  },
]

const EMPTY_PERMISSIONS = {
  appointments: { view: false, manage: false },
  clients: { view: false, manage: false },
  services: { view: false, manage: false },
  loyalty: { view: false, manage: false },
  finance: { view: false, manage: false },
}

function normalizePermissions(permissions = {}) {
  const normalized = {}

  for (const module of MODULES) {
    normalized[module.id] = {
      view: Boolean(permissions?.[module.id]?.view),
      manage: Boolean(permissions?.[module.id]?.manage),
    }
  }

  return normalized
}

function getStatus(status) {
  const statuses = {
    active: {
      label: 'Ativo',
      className: 'team-status-active',
    },
    pending: {
      label: 'Convite pendente',
      className: 'team-status-pending',
    },
    revoked: {
      label: 'Acesso revogado',
      className: 'team-status-revoked',
    },
  }

  return (
    statuses[status] || {
      label: status || 'Desconhecido',
      className: 'team-status-revoked',
    }
  )
}

function getPermissionSummary(permissions) {
  const normalized = normalizePermissions(permissions)

  const allowed = MODULES.filter((module) => {
    const permission = normalized[module.id]
    return permission.view || permission.manage
  })

  if (allowed.length === 0) {
    return 'Sem permissões concedidas'
  }

  return allowed.map((module) => module.label).join(', ')
}

export default function Equipe({ t = {}, navigate }) {
  const [members, setMembers] = useState([])
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState(
    normalizePermissions(EMPTY_PERMISSIONS),
  )
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [revokingId, setRevokingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [notice, setNotice] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const pageTitle = t.teamTitle || 'Equipe e acessos'

  const pageDescription =
    t.teamDescription ||
    'Compartilhe seu espaço de trabalho com pessoas de confiança e defina exatamente o que cada uma pode acessar.'

  const showNotice = useCallback((message, type = 'success') => {
    setNotice({ message, type })
  }, [])

  const loadMembers = useCallback(async () => {
    try {
      // O primeiro await evita atualizar o estado sincronamente
      // quando esta função é iniciada pelo useEffect.
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError || !authData?.user) {
        setMembers([])
        setLoading(false)
        showNotice(
          'Sua sessão expirou. Entre novamente no Arcana.',
          'error',
        )
        return
      }

      const { data, error } = await supabase
        .from('team_members')
        .select(
          'id, invited_email, permissions, status, invited_at, accepted_at, member_user_id',
        )
        .eq('owner_id', authData.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao carregar equipe:', error)

        showNotice(
          'Não foi possível carregar a equipe. Verifique sua conexão e as políticas RLS.',
          'error',
        )

        return
      }

      setMembers(data || [])
    } catch (error) {
      console.error('Erro inesperado ao carregar equipe:', error)

      showNotice(
        'Ocorreu um erro ao carregar a equipe. Tente novamente.',
        'error',
      )
    } finally {
      setLoading(false)
    }
  }, [showNotice])

  useEffect(() => {
    let cancelled = false

    async function initializeMembers() {
      if (cancelled) return
      await loadMembers()
    }

    initializeMembers()

    return () => {
      cancelled = true
    }
  }, [loadMembers])

  function togglePermission(moduleId, action, checked) {
    setPermissions((current) => {
      const next = {
        ...current,
        [moduleId]: {
          ...current[moduleId],
          [action]: checked,
        },
      }

      // Gerenciar também concede visualização.
      if (action === 'manage' && checked) {
        next[moduleId].view = true
      }

      // Não permite desmarcar visualização enquanto gerenciar
      // continuar habilitado.
      if (action === 'view' && !checked) {
        next[moduleId].manage = false
      }

      return next
    })
  }

  function resetForm() {
    setEmail('')
    setPermissions(normalizePermissions(EMPTY_PERMISSIONS))
    setEditingId(null)
    setShowForm(false)
  }

  async function saveMember(event) {
    event.preventDefault()
    setNotice(null)

    const normalizedEmail = email.trim().toLowerCase()

    if (!editingId) {
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (!validEmail.test(normalizedEmail)) {
        showNotice('Informe um endereço de e-mail válido.', 'error')
        return
      }
    }

    const hasPermission = MODULES.some((module) => {
      const item = permissions[module.id]
      return item.view || item.manage
    })

    if (!hasPermission) {
      showNotice(
        'Conceda pelo menos uma permissão antes de salvar.',
        'error',
      )
      return
    }

    const action = editingId ? 'update_permissions' : 'invite'

    setSending(true)

    try {
      const { data, error } = await supabase.functions.invoke(
        'team-manage',
        {
          body: editingId
            ? {
                action,
                member_id: editingId,
                permissions,
              }
            : {
                action,
                email: normalizedEmail,
                permissions,
              },
        },
      )

      if (error) {
        throw new Error(
          data?.error ||
            error.message ||
            'Não foi possível concluir a operação.',
        )
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      showNotice(
        editingId
          ? 'Permissões atualizadas.'
          : 'Solicitação de convite processada. Confira o status na lista.',
      )

      resetForm()
      await loadMembers()
    } catch (error) {
      console.error('Erro ao salvar integrante:', error)

      showNotice(
        error.message ||
          'Não foi possível salvar. Verifique a configuração da Edge Function team-manage.',
        'error',
      )
    } finally {
      setSending(false)
    }
  }

  function startEditing(member) {
    setEditingId(member.id)
    setEmail(member.invited_email || '')
    setPermissions(normalizePermissions(member.permissions))
    setShowForm(true)
    setNotice(null)
  }

  async function revokeMember(member) {
    const confirmed = window.confirm(
      `Deseja revogar o acesso de ${member.invited_email}? A pessoa deixará de acessar os dados autorizados desta equipe.`,
    )

    if (!confirmed) return

    setRevokingId(member.id)
    setNotice(null)

    try {
      const { data, error } = await supabase.functions.invoke(
        'team-manage',
        {
          body: {
            action: 'revoke',
            member_id: member.id,
          },
        },
      )

      if (error) {
        throw new Error(
          data?.error ||
            error.message ||
            'Não foi possível revogar o acesso.',
        )
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      showNotice('Acesso revogado.')
      await loadMembers()
    } catch (error) {
      console.error('Erro ao revogar integrante:', error)

      showNotice(
        error.message ||
          'Não foi possível revogar o acesso. Verifique a Edge Function team-manage.',
        'error',
      )
    } finally {
      setRevokingId(null)
    }
  }

  const activeCount = members.filter(
    (member) => member.status === 'active',
  ).length

  const pendingCount = members.filter(
    (member) => member.status === 'pending',
  ).length

  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">
            {t.teamEyebrow || 'ESPAÇO COMPARTILHADO'}
          </div>

          <h1>{pageTitle}</h1>

          <p>{pageDescription}</p>
        </div>

        <button
          type="button"
          className="button button-primary"
          onClick={() => {
            setNotice(null)

            if (showForm && !editingId) {
              resetForm()
            } else {
              setEditingId(null)
              setEmail('')
              setPermissions(normalizePermissions(EMPTY_PERMISSIONS))
              setShowForm(true)
            }
          }}
        >
          <UserPlus size={17} />
          Convidar pessoa
        </button>
      </div>

      {notice && (
        <div
          className={`team-notice ${
            notice.type === 'error'
              ? 'team-notice-error'
              : 'team-notice-success'
          }`}
          role="status"
        >
          {notice.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <Check size={18} />
          )}

          <span>{notice.message}</span>

          <button
            type="button"
            className="team-notice-close"
            onClick={() => setNotice(null)}
            aria-label="Fechar aviso"
          >
            ×
          </button>
        </div>
      )}

      <div className="team-summary-grid">
        <div className="team-summary-card">
          <div className="team-summary-icon">
            <Users size={21} />
          </div>

          <div>
            <span>Pessoas com acesso</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="team-summary-card">
          <div className="team-summary-icon">
            <Mail size={21} />
          </div>

          <div>
            <span>Convites pendentes</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>

        <div className="team-summary-card">
          <div className="team-summary-icon">
            <LockKeyhole size={21} />
          </div>

          <div>
            <span>Controle de acesso</span>
            <strong className="team-summary-text">Personalizado</strong>
          </div>
        </div>
      </div>

      {showForm && (
        <section className="team-panel">
          <div className="team-panel-heading">
            <div>
              <div className="eyebrow">
                {editingId ? 'CONFIGURAÇÃO' : 'NOVO INTEGRANTE'}
              </div>

              <h2>
                {editingId
                  ? 'Editar permissões'
                  : 'Convide alguém para sua equipe'}
              </h2>

              <p>
                Escolha quais áreas a pessoa poderá consultar ou gerenciar.
              </p>
            </div>

            <button
              type="button"
              className="team-icon-button"
              onClick={resetForm}
              aria-label="Fechar formulário"
            >
              ×
            </button>
          </div>

          <form onSubmit={saveMember}>
            {!editingId && (
              <div className="team-field">
                <label htmlFor="team-email">E-mail da pessoa</label>

                <div className="team-input-wrap">
                  <Mail size={18} />

                  <input
                    id="team-email"
                    type="email"
                    autoComplete="email"
                    placeholder="pessoa@exemplo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <small>
                  O convite deverá ser associado à conta correta no Supabase.
                </small>
              </div>
            )}

            <div className="team-permissions-heading">
              <div>
                <h3>Permissões por área</h3>
                <p>
                  Visualizar permite consultar. Gerenciar permite realizar
                  alterações.
                </p>
              </div>
            </div>

            <div className="team-permissions-list">
              {MODULES.map((module) => {
                const Icon = module.icon
                const permission = permissions[module.id]

                return (
                  <div className="team-permission-row" key={module.id}>
                    <div className="team-permission-info">
                      <div className="team-permission-icon">
                        <Icon size={19} />
                      </div>

                      <div>
                        <strong>{module.label}</strong>
                        <p>{module.description}</p>
                      </div>
                    </div>

                    <div className="team-permission-controls">
                      <label className="team-check">
                        <input
                          type="checkbox"
                          checked={permission.view}
                          onChange={(event) =>
                            togglePermission(
                              module.id,
                              'view',
                              event.target.checked,
                            )
                          }
                        />
                        <Eye size={15} />
                        <span>Visualizar</span>
                      </label>

                      <label className="team-check">
                        <input
                          type="checkbox"
                          checked={permission.manage}
                          onChange={(event) =>
                            togglePermission(
                              module.id,
                              'manage',
                              event.target.checked,
                            )
                          }
                        />
                        <Pencil size={15} />
                        <span>Gerenciar</span>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="team-form-footer">
              <p>
                <ShieldCheck size={16} />
                As permissões devem ser validadas também no servidor.
              </p>

              <div className="team-form-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={resetForm}
                  disabled={sending}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="button button-primary"
                  disabled={sending}
                >
                  {sending ? (
                    <>
                      <LoaderCircle className="team-spin" size={17} />
                      Salvando...
                    </>
                  ) : (
                    <>
                      {editingId ? 'Salvar permissões' : 'Enviar convite'}
                      <ArrowUpRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      <section className="team-panel">
        <div className="team-panel-heading team-list-heading">
          <div>
            <div className="eyebrow">GERENCIAMENTO</div>
            <h2>Pessoas da equipe</h2>
            <p>
              Gerencie os convites e os acessos vinculados à sua conta.
            </p>
          </div>

          <button
            type="button"
            className="team-icon-button"
            onClick={() => {
              setLoading(true)
              loadMembers()
            }}
            disabled={loading}
            aria-label="Atualizar equipe"
            title="Atualizar equipe"
          >
            <RefreshCw
              size={17}
              className={loading ? 'team-spin' : ''}
            />
          </button>
        </div>

        {loading ? (
          <div className="team-empty-state">
            <LoaderCircle className="team-spin" size={27} />
            <p>Carregando equipe...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="team-empty-state">
            <div className="team-empty-icon">
              <Users size={29} />
            </div>

            <h3>Sua equipe começa aqui</h3>

            <p>
              Convide uma secretária, assistente ou pessoa de confiança e
              escolha quais áreas ela poderá acessar.
            </p>

            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                setEditingId(null)
                setEmail('')
                setPermissions(normalizePermissions(EMPTY_PERMISSIONS))
                setShowForm(true)
              }}
            >
              <UserPlus size={17} />
              Convidar primeira pessoa
            </button>
          </div>
        ) : (
          <div className="team-member-list">
            {members.map((member) => {
              const status = getStatus(member.status)
              const isRevoked = member.status === 'revoked'

              return (
                <article className="team-member-card" key={member.id}>
                  <div className="team-member-avatar">
                    <Users size={21} />
                  </div>

                  <div className="team-member-main">
                    <div className="team-member-title">
                      <strong>{member.invited_email}</strong>

                      <span
                        className={`team-status ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <p className="team-member-permissions">
                      {getPermissionSummary(member.permissions)}
                    </p>

                    <small>
                      Convite criado em{' '}
                      {member.invited_at
                        ? new Date(member.invited_at).toLocaleDateString(
                            'pt-BR',
                          )
                        : 'data não disponível'}
                    </small>
                  </div>

                  <div className="team-member-actions">
                    {!isRevoked && (
                      <>
                        <button
                          type="button"
                          className="team-action-button"
                          onClick={() => startEditing(member)}
                          title="Editar permissões"
                          aria-label={`Editar permissões de ${member.invited_email}`}
                          disabled={sending || revokingId === member.id}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          className="team-action-button team-action-danger"
                          onClick={() => revokeMember(member)}
                          title="Revogar acesso"
                          aria-label={`Revogar acesso de ${member.invited_email}`}
                          disabled={revokingId === member.id}
                        >
                          {revokingId === member.id ? (
                            <LoaderCircle
                              className="team-spin"
                              size={17}
                            />
                          ) : (
                            <Trash2 size={17} />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <div className="team-security-note">
        <ShieldCheck size={21} />

        <div>
          <strong>Seus dados continuam protegidos</strong>
          <p>
            Cada operação deve ser autorizada no banco de dados. Revogar um
            integrante deve desativar o vínculo e impedir novos acessos,
            mesmo que a pessoa mantenha uma sessão aberta.
          </p>
        </div>
      </div>

      <div className="team-back-home">
        <button
          type="button"
          className="button button-secondary"
          onClick={() => navigate?.('inicio')}
        >
          Voltar ao início
          <ArrowUpRight size={17} />
        </button>
      </div>
    </>
  )
}
