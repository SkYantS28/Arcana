
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Gift, Star, Settings2, Save, RefreshCw, Search, CheckCircle2,
  Clock, History, Sparkles, LoaderCircle, AlertCircle, X, Plus,
  Trash2, CalendarCheck, Coins,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import '../styles/recompensas.css'

const DEFAULT_SETTINGS = {
  program_name: 'Círculo da Lua',
  program_description: 'Quanto mais você consulta, mais benefícios acumula.',
  program_type: 'attendance',
  goal_count: 5,
  active: false,
}

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const errorMessage = (error) =>
  error?.message || 'Ocorreu um erro inesperado.'

export default function Recompensas({ t, navigate }) {
  const [userId, setUserId] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [services, setServices] = useState([])
  const [clients, setClients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [transactions, setTransactions] = useState([])
  const [rewards, setRewards] = useState([])
  const [rules, setRules] = useState([])
  const [search, setSearch] = useState('')
  const [ruleType, setRuleType] = useState('attendance')
  const [ruleThreshold, setRuleThreshold] = useState('5')
  const [ruleDescription, setRuleDescription] = useState('')
  const [rulePointsCost, setRulePointsCost] = useState('0')
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedRule, setSelectedRule] = useState('')
  const [rewardDescription, setRewardDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingRule, setSavingRule] = useState(false)
  const [savingReward, setSavingReward] = useState(false)
  const [savingService, setSavingService] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError) throw authError
      const user = authData?.user

      if (!user) throw new Error('Sua sessão expirou. Entre novamente.')

      const results = await Promise.all([
        supabase.from('loyalty_settings')
          .select('id, owner_id, program_name, program_description, program_type, goal_count, active')
          .eq('owner_id', user.id)
          .maybeSingle(),
        supabase.from('services')
          .select('id, name, price, active, loyalty_points')
          .eq('owner_id', user.id)
          .order('name'),
        supabase.from('clients')
          .select('id, name, phone')
          .eq('owner_id', user.id)
          .order('name'),
        supabase.from('appointments')
          .select('id, client_id, service_id, status, appointment_type, scheduled_at, deadline_at, created_at')
          .eq('owner_id', user.id)
          .eq('status', 'completed'),
        supabase.from('loyalty_transactions')
          .select('id, client_id, appointment_id, points, description, created_at')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('loyalty_rewards')
          .select('id, client_id, rule_id, description, reward_date, created_at')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('loyalty_rules')
          .select('id, owner_id, rule_type, threshold, reward_description, points_cost, sort_order, active, created_at')
          .eq('owner_id', user.id)
          .order('sort_order')
          .order('threshold'),
      ])

      for (const result of results) {
        if (result.error) throw result.error
      }

      const [
        settingsResult, servicesResult, clientsResult,
        appointmentsResult, transactionsResult, rewardsResult, rulesResult,
      ] = results

      setUserId(user.id)
      setSettings(settingsResult.data
        ? {
            ...DEFAULT_SETTINGS,
            ...settingsResult.data,
            goal_count: Number(settingsResult.data.goal_count || 5),
            active: Boolean(settingsResult.data.active),
          }
        : DEFAULT_SETTINGS)
      setServices((servicesResult.data || []).map((service) => ({
        ...service,
        loyalty_points: Number(service.loyalty_points ?? 1),
      })))
      setClients(clientsResult.data || [])
      setAppointments(appointmentsResult.data || [])
      setTransactions(transactionsResult.data || [])
      setRewards(rewardsResult.data || [])
      setRules(rulesResult.data || [])
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      if (showLoader) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function initialLoad() {
      if (!mounted) return
      await loadData()
    }

    initialLoad()
    return () => { mounted = false }
  }, [loadData])

  const balances = useMemo(() => {
    const result = {}
    clients.forEach((client) => { result[client.id] = 0 })

    transactions.forEach((transaction) => {
      result[transaction.client_id] =
        (result[transaction.client_id] || 0) + Number(transaction.points || 0)
    })

    return result
  }, [clients, transactions])

  const attendanceCounts = useMemo(() => {
    const result = {}
    clients.forEach((client) => { result[client.id] = 0 })

    appointments.forEach((appointment) => {
      if (appointment.client_id && Object.hasOwn(result, appointment.client_id)) {
        result[appointment.client_id] += 1
      }
    })

    return result
  }, [clients, appointments])

  const pointRules = useMemo(
    () => rules.filter((rule) => rule.active && rule.rule_type === 'points')
      .sort((a, b) => Number(a.threshold) - Number(b.threshold)),
    [rules],
  )

  const attendanceRules = useMemo(
    () => rules.filter((rule) => rule.active && rule.rule_type === 'attendance')
      .sort((a, b) => Number(a.threshold) - Number(b.threshold)),
    [rules],
  )

  const activeRules = settings.program_type === 'attendance'
    ? attendanceRules
    : pointRules

  const filteredClients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return clients.filter((client) => {
      const name = client.name || 'Consulente sem nome'
      return !term ||
        name.toLocaleLowerCase('pt-BR').includes(term) ||
        (client.phone || '').includes(term)
    })
  }, [clients, search])

  const totalPoints = Object.values(balances)
    .reduce((sum, value) => sum + Math.max(0, value), 0)

  const saveSettings = async (event) => {
    event.preventDefault()
    if (!userId) return

    setSavingSettings(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        owner_id: userId,
        program_name: settings.program_name.trim() || 'Programa de Fidelidade',
        program_description: settings.program_description.trim(),
        program_type: settings.program_type,
        goal_count: Math.max(1, Number(settings.goal_count) || 5),
        active: Boolean(settings.active),
      }

      const { error: saveError } = await supabase
        .from('loyalty_settings')
        .upsert(payload, { onConflict: 'owner_id' })

      if (saveError) throw saveError

      setSettings((current) => ({ ...current, ...payload }))
      setSuccess('Configurações do programa salvas.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingSettings(false)
    }
  }

  const addRule = async (event) => {
    event.preventDefault()
    if (!userId) return

    const threshold = Math.floor(Number(ruleThreshold))
    const pointsCost = Math.floor(Number(rulePointsCost))

    if (!ruleDescription.trim()) {
      setError('Escreva a descrição do benefício.')
      return
    }

    if (!Number.isFinite(threshold) || threshold < 1) {
      setError('A meta precisa ser maior que zero.')
      return
    }

    if (ruleType === 'points' && (!Number.isFinite(pointsCost) || pointsCost < 1)) {
      setError('Informe quantos pontos serão necessários para resgatar esse benefício.')
      return
    }

    setSavingRule(true)
    setError('')
    setSuccess('')

    try {
      const { error: insertError } = await supabase
        .from('loyalty_rules')
        .insert({
          owner_id: userId,
          rule_type: ruleType,
          threshold,
          reward_description: ruleDescription.trim(),
          points_cost: ruleType === 'points' ? pointsCost : 0,
          sort_order: threshold,
          active: true,
        })

      if (insertError) throw insertError

      setRuleDescription('')
      setRulePointsCost('0')
      await loadData(false)
      setSuccess('Benefício adicionado ao programa.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingRule(false)
    }
  }

  const deleteRule = async (rule) => {
    const alreadyRedeemed = rewards.some((reward) => reward.rule_id === rule.id)

    if (alreadyRedeemed) {
      setError('Esse benefício já foi resgatado. Desative-o em vez de excluí-lo para preservar o histórico.')
      return
    }

    setError('')
    setSuccess('')

    const { error: deleteError } = await supabase
      .from('loyalty_rules')
      .delete()
      .eq('id', rule.id)
      .eq('owner_id', userId)

    if (deleteError) {
      setError(errorMessage(deleteError))
      return
    }

    await loadData(false)
    setSuccess('Benefício removido.')
  }

  const toggleRule = async (rule) => {
    setError('')
    setSuccess('')

    const { error: updateError } = await supabase
      .from('loyalty_rules')
      .update({ active: !rule.active })
      .eq('id', rule.id)
      .eq('owner_id', userId)

    if (updateError) {
      setError(errorMessage(updateError))
      return
    }

    await loadData(false)
    setSuccess(rule.active ? 'Benefício desativado.' : 'Benefício ativado.')
  }

  const updateServicePoints = async (serviceId, points) => {
    if (!userId) return
    const value = Math.max(0, Math.floor(Number(points) || 0))
    setSavingService(serviceId)
    setError('')
    setSuccess('')

    try {
      const { error: updateError } = await supabase
        .from('services')
        .update({ loyalty_points: value })
        .eq('id', serviceId)
        .eq('owner_id', userId)

      if (updateError) throw updateError

      setServices((current) => current.map((service) =>
        service.id === serviceId
          ? { ...service, loyalty_points: value }
          : service
      ))
      setSuccess('Pontuação do serviço atualizada.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingService(null)
    }
  }

  const syncCompletedAppointments = async () => {
    if (!userId || !settings.active) {
      setError('Ative o programa antes de sincronizar os pontos.')
      return
    }

    if (settings.program_type !== 'points') {
      setError('A sincronização de pontos só é necessária no modelo por pontos.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const existingIds = new Set(
        transactions
          .filter((item) => item.appointment_id)
          .map((item) => item.appointment_id),
      )

      const servicePoints = Object.fromEntries(
        services.map((service) => [
          service.id,
          Number(service.loyalty_points || 0),
        ]),
      )

      const newTransactions = appointments
        .filter((appointment) =>
          appointment.client_id &&
          !existingIds.has(appointment.id) &&
          (servicePoints[appointment.service_id] || 0) > 0 &&
          clients.some((client) => client.id === appointment.client_id),
        )
        .map((appointment) => ({
          owner_id: userId,
          client_id: appointment.client_id,
          appointment_id: appointment.id,
          points: servicePoints[appointment.service_id],
          description: 'Pontos por atendimento concluído',
        }))

      if (newTransactions.length) {
        const { error: insertError } = await supabase
          .from('loyalty_transactions')
          .insert(newTransactions)

        if (insertError) throw insertError
      }

      await loadData(false)
      setSuccess(
        newTransactions.length
          ? `${newTransactions.length} atendimento(s) contabilizado(s).`
          : 'Os pontos já estão sincronizados.',
      )
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const redeemReward = async (event) => {
    event.preventDefault()

    if (!userId || !selectedClient || !selectedRule) {
      setError('Selecione a consulente e o benefício.')
      return
    }

    if (!settings.active) {
      setError('Ative o programa antes de registrar resgates.')
      return
    }

    const rule = rules.find((item) => item.id === selectedRule)
    if (!rule || !rule.active) {
      setError('Esse benefício não está mais disponível.')
      return
    }

    const client = clients.find((item) => item.id === selectedClient)
    if (!client) {
      setError('Consulente não encontrada.')
      return
    }

    if (settings.program_type === 'attendance') {
      const count = attendanceCounts[selectedClient] || 0
      if (count < Number(rule.threshold)) {
        setError(`A consulente precisa concluir ${rule.threshold} atendimentos para esse benefício.`)
        return
      }

      if (rewards.some((item) =>
        item.client_id === selectedClient && item.rule_id === rule.id
      )) {
        setError('Essa consulente já resgatou o benefício deste marco.')
        return
      }
    } else {
      const cost = Number(rule.points_cost)
      const balance = balances[selectedClient] || 0

      if (balance < cost) {
        setError(`Saldo insuficiente. São necessários ${cost} pontos.`)
        return
      }
    }

    setSavingReward(true)
    setError('')
    setSuccess('')

    try {
      const description = rewardDescription.trim() || rule.reward_description

      const { data: insertedReward, error: rewardError } = await supabase
        .from('loyalty_rewards')
        .insert({
          owner_id: userId,
          client_id: selectedClient,
          rule_id: rule.id,
          description,
          reward_date: new Date().toISOString().slice(0, 10),
        })
        .select('id')
        .single()

      if (rewardError) throw rewardError

      if (settings.program_type === 'points') {
        const { error: transactionError } = await supabase
          .from('loyalty_transactions')
          .insert({
            owner_id: userId,
            client_id: selectedClient,
            points: -Number(rule.points_cost),
            description: `Resgate: ${description}`,
          })

        if (transactionError) {
          await supabase.from('loyalty_rewards')
            .delete()
            .eq('id', insertedReward.id)
            .eq('owner_id', userId)
          throw transactionError
        }
      }

      setRewardDescription('')
      setSelectedClient('')
      setSelectedRule('')
      await loadData(false)
      setSuccess('Recompensa registrada com sucesso.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingReward(false)
    }
  }

  const clientName = (clientId) => {
    const client = clients.find((item) => item.id === clientId)
    return client?.name?.trim() || client?.phone || 'Consulente'
  }

  const getAvailableRules = (clientId) => {
    if (!clientId) return []

    if (settings.program_type === 'attendance') {
      const count = attendanceCounts[clientId] || 0
      return attendanceRules.filter((rule) =>
        count >= Number(rule.threshold) &&
        !rewards.some((reward) =>
          reward.client_id === clientId && reward.rule_id === rule.id
        ),
      )
    }

    const balance = balances[clientId] || 0
    return pointRules.filter((rule) => balance >= Number(rule.points_cost))
  }

  const selectedClientRules = getAvailableRules(selectedClient)

  return (
    <main className="rewards-page">
      <header className="rewards-header">
        <div>
          <div className="rewards-eyebrow">
            <Sparkles size={15} />
            {t?.rewardsEyebrow || 'FIDELIDADE'}
          </div>
          <h1>{t?.rewardsTitle || 'Recompensas'}</h1>
          <p>
            {t?.rewardsDescription ||
              'Crie benefícios especiais e valorize cada consulente que retorna.'}
          </p>
        </div>

        <button
          type="button"
          className="rewards-refresh"
          onClick={() => loadData()}
          disabled={loading}
        >
          <RefreshCw size={17} className={loading ? 'rewards-spinning' : ''} />
          Atualizar
        </button>
      </header>

      {error && (
        <div className="rewards-alert rewards-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Fechar aviso">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="rewards-alert rewards-alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess('')} aria-label="Fechar aviso">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="rewards-stats">
        <article className="rewards-stat-card">
          <span className="rewards-stat-icon purple"><Gift size={21} /></span>
          <div><span>Programa</span><strong>{settings.active ? 'Ativo' : 'Desativado'}</strong></div>
        </article>
        <article className="rewards-stat-card">
          <span className="rewards-stat-icon gold">
            {settings.program_type === 'points' ? <Coins size={21} /> : <CalendarCheck size={21} />}
          </span>
          <div>
            <span>{settings.program_type === 'points' ? 'Pontos disponíveis' : 'Atendimentos concluídos'}</span>
            <strong>
              {settings.program_type === 'points'
                ? totalPoints
                : appointments.filter((item) => item.client_id).length}
            </strong>
          </div>
        </article>
        <article className="rewards-stat-card">
          <span className="rewards-stat-icon green"><Star size={21} /></span>
          <div><span>Consulentes</span><strong>{clients.length}</strong></div>
        </article>
        <article className="rewards-stat-card">
          <span className="rewards-stat-icon blue"><History size={21} /></span>
          <div><span>Recompensas entregues</span><strong>{rewards.length}</strong></div>
        </article>
      </section>

      <section className="rewards-section">
        <div className="rewards-section-heading">
          <span className="rewards-section-icon"><Settings2 size={20} /></span>
          <div>
            <h2>Configurações do programa</h2>
            <p>Escolha o modelo de fidelidade e personalize a apresentação.</p>
          </div>
        </div>

        <form className="rewards-settings-form" onSubmit={saveSettings}>
          <label className="rewards-field">
            <span>Nome do programa</span>
            <input
              value={settings.program_name}
              onChange={(event) => setSettings((current) => ({
                ...current, program_name: event.target.value,
              }))}
              maxLength={100}
              required
            />
          </label>

          <label className="rewards-field">
            <span>Modelo de fidelidade</span>
            <select
              value={settings.program_type}
              onChange={(event) => {
                const value = event.target.value
                setSettings((current) => ({ ...current, program_type: value }))
                setRuleType(value)
              }}
            >
              <option value="attendance">Por atendimentos e marcos</option>
              <option value="points">Por pontos acumulados</option>
            </select>
          </label>

          <label className="rewards-field rewards-field-full">
            <span>Descrição exibida no programa</span>
            <textarea
              value={settings.program_description}
              onChange={(event) => setSettings((current) => ({
                ...current, program_description: event.target.value,
              }))}
              maxLength={500}
              rows={3}
            />
          </label>

          <label className="rewards-toggle">
            <input
              type="checkbox"
              checked={settings.active}
              onChange={(event) => setSettings((current) => ({
                ...current, active: event.target.checked,
              }))}
            />
            <span className="rewards-toggle-track" />
            <span className="rewards-toggle-text">
              <strong>{settings.active ? 'Programa ativado' : 'Programa desativado'}</strong>
              <small>Quando ativo, será possível registrar e resgatar benefícios.</small>
            </span>
          </label>

          <button type="submit" className="rewards-primary-button" disabled={savingSettings}>
            {savingSettings ? <LoaderCircle size={17} className="rewards-spinning" /> : <Save size={17} />}
            Salvar configurações
          </button>
        </form>
      </section>

      <section className="rewards-section">
        <div className="rewards-section-heading">
          <span className="rewards-section-icon"><Gift size={20} /></span>
          <div>
            <h2>Regras e benefícios</h2>
            <p>
              {settings.program_type === 'attendance'
                ? 'Defina o número de atendimentos necessários para desbloquear cada benefício.'
                : 'Defina os pontos necessários para cada benefício.'}
            </p>
          </div>
        </div>

        <form className="rewards-rule-form" onSubmit={addRule}>
          <label className="rewards-field">
            <span>{settings.program_type === 'attendance' ? 'Atendimentos necessários' : 'Meta de pontos'}</span>
            <input
              type="number"
              min="1"
              max="100000"
              value={ruleThreshold}
              onChange={(event) => setRuleThreshold(event.target.value)}
              required
            />
          </label>

          {settings.program_type === 'points' && (
            <label className="rewards-field">
              <span>Pontos para resgatar</span>
              <input
                type="number"
                min="1"
                max="100000"
                value={rulePointsCost}
                onChange={(event) => setRulePointsCost(event.target.value)}
                required
              />
            </label>
          )}

          <label className="rewards-field rewards-field-full">
            <span>Benefício oferecido</span>
            <input
              value={ruleDescription}
              onChange={(event) => setRuleDescription(event.target.value)}
              maxLength={500}
              placeholder={settings.program_type === 'attendance'
                ? 'Ex.: 1 pergunta bônus gratuita'
                : 'Ex.: 3 perguntas bônus ou 20% de desconto'}
              required
            />
          </label>

          <button type="submit" className="rewards-primary-button" disabled={savingRule}>
            {savingRule ? <LoaderCircle size={17} className="rewards-spinning" /> : <Plus size={17} />}
            Adicionar benefício
          </button>
        </form>

        {!rules.length ? (
          <div className="rewards-empty">
            <Star size={26} />
            <strong>Seu programa ainda não tem benefícios</strong>
            <p>Adicione as regras acima para criar seu próprio programa de fidelidade.</p>
          </div>
        ) : (
          <div className="rewards-rules-list">
            {rules.map((rule) => (
              <article className={`rewards-rule-row ${!rule.active ? 'is-inactive' : ''}`} key={rule.id}>
                <span className="rewards-rule-number">
                  {rule.threshold}
                </span>
                <div className="rewards-rule-info">
                  <strong>
                    {settings.program_type === 'attendance'
                      ? `${rule.threshold} atendimentos`
                      : `${rule.points_cost} pontos`}
                  </strong>
                  <span>{rule.reward_description}</span>
                  <small>{rule.active ? 'Benefício ativo' : 'Benefício desativado'}</small>
                </div>
                <button
                  type="button"
                  className="rewards-secondary-button"
                  onClick={() => toggleRule(rule)}
                >
                  {rule.active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  type="button"
                  className="rewards-icon-button"
                  onClick={() => deleteRule(rule)}
                  aria-label={`Excluir benefício ${rule.reward_description}`}
                  title="Excluir benefício"
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {settings.program_type === 'points' && (
        <section className="rewards-section">
          <div className="rewards-section-heading rewards-heading-with-action">
            <span className="rewards-section-icon"><Coins size={20} /></span>
            <div>
              <h2>Pontos por serviço</h2>
              <p>Os pontos são contabilizados quando o atendimento é concluído e sincronizado.</p>
            </div>
            <button
              type="button"
              className="rewards-secondary-button"
              onClick={syncCompletedAppointments}
              disabled={loading || !settings.active}
            >
              <RefreshCw size={16} />
              Sincronizar pontos
            </button>
          </div>

          {!services.length ? (
            <div className="rewards-empty">
              <Gift size={26} />
              <strong>Nenhum serviço cadastrado</strong>
              <button type="button" className="rewards-text-button" onClick={() => navigate?.('catalogo')}>
                Ir para o catálogo
              </button>
            </div>
          ) : (
            <div className="rewards-services-list">
              {services.map((service) => (
                <div className="rewards-service-row" key={service.id}>
                  <div className="rewards-service-symbol"><Gift size={18} /></div>
                  <div className="rewards-service-info">
                    <strong>{service.name}</strong>
                    <span>{service.active ? 'Serviço ativo' : 'Serviço inativo'}</span>
                  </div>
                  <label className="rewards-points-input">
                    <span>Pontos</span>
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      value={service.loyalty_points}
                      disabled={savingService === service.id}
                      onChange={(event) => setServices((current) => current.map((item) =>
                        item.id === service.id
                          ? { ...item, loyalty_points: event.target.value }
                          : item
                      ))}
                      onBlur={(event) => updateServicePoints(service.id, event.target.value)}
                    />
                  </label>
                  {savingService === service.id && <LoaderCircle size={16} className="rewards-spinning" />}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="rewards-section">
        <div className="rewards-section-heading">
          <span className="rewards-section-icon">
            {settings.program_type === 'points' ? <Coins size={20} /> : <CalendarCheck size={20} />}
          </span>
          <div>
            <h2>Fidelidade por consulente</h2>
            <p>Veja o progresso de cada pessoa e registre os benefícios já entregues.</p>
          </div>
        </div>

        <div className="rewards-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou WhatsApp..."
          />
        </div>

        {!filteredClients.length ? (
          <div className="rewards-empty">
            <Star size={26} />
            <strong>{clients.length ? 'Nenhum resultado' : 'Nenhum consulente cadastrado'}</strong>
            <p>{clients.length
              ? 'Tente outro nome ou telefone.'
              : 'Cadastre consulentes para acompanhar a fidelidade.'}</p>
            {!clients.length && (
              <button type="button" className="rewards-text-button" onClick={() => navigate?.('consulentes')}>
                Ir para consulentes
              </button>
            )}
          </div>
        ) : (
          <div className="rewards-clients-list">
            {filteredClients.map((client) => {
              const count = attendanceCounts[client.id] || 0
              const balance = balances[client.id] || 0
              const redeemedIds = new Set(rewards
                .filter((reward) => reward.client_id === client.id)
                .map((reward) => reward.rule_id))
              const nextRule = activeRules.find((rule) =>
                settings.program_type === 'attendance'
                  ? Number(rule.threshold) > count && !redeemedIds.has(rule.id)
                  : Number(rule.points_cost) > balance
              )
              const currentValue = settings.program_type === 'attendance' ? count : balance
              const nextValue = nextRule
                ? settings.program_type === 'attendance'
                  ? Number(nextRule.threshold)
                  : Number(nextRule.points_cost)
                : currentValue
              const progress = nextRule
                ? Math.min(100, (currentValue / Math.max(1, nextValue)) * 100)
                : 100

              return (
                <article className="rewards-client-row" key={client.id}>
                  <div className="rewards-client-avatar">
                    {(client.name || client.phone || '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="rewards-client-info">
                    <strong>{client.name?.trim() || 'Consulente sem nome'}</strong>
                    <span>{client.phone}</span>
                    <div className="rewards-progress"><span style={{ width: `${progress}%` }} /></div>
                    <small>
                      {settings.program_type === 'attendance'
                        ? `${count} atendimento(s) concluído(s)`
                        : `${Math.max(0, balance)} ponto(s) disponíveis`}
                      {nextRule
                        ? ` · Próximo benefício: ${nextRule.reward_description}`
                        : ' · Nenhum próximo benefício configurado'}
                    </small>
                  </div>
                  <div className="rewards-client-balance">
                    <strong>{currentValue}</strong>
                    <span>{settings.program_type === 'attendance' ? 'atendimentos' : 'pontos'}</span>
                  </div>
                  <button
                    type="button"
                    className="rewards-use-client"
                    onClick={() => {
                      setSelectedClient(client.id)
                      setSelectedRule('')
                      setRewardDescription('')
                      setError('')
                      setSuccess('')
                    }}
                    disabled={!settings.active || getAvailableRules(client.id).length === 0}
                  >
                    <Gift size={16} />
                    Resgatar
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="rewards-section">
        <div className="rewards-section-heading">
          <span className="rewards-section-icon"><CheckCircle2 size={20} /></span>
          <div>
            <h2>Registrar recompensa entregue</h2>
            <p>Escolha uma consulente e um benefício que ela já tenha desbloqueado.</p>
          </div>
        </div>

        <form className="rewards-redeem-form" onSubmit={redeemReward}>
          <label className="rewards-field">
            <span>Consulente</span>
            <select
              value={selectedClient}
              onChange={(event) => {
                setSelectedClient(event.target.value)
                setSelectedRule('')
              }}
              required
            >
              <option value="">Selecione uma consulente</option>
              {clients.map((client) => (
                <option value={client.id} key={client.id}>
                  {client.name?.trim() || client.phone}
                </option>
              ))}
            </select>
          </label>

          <label className="rewards-field">
            <span>Benefício desbloqueado</span>
            <select
              value={selectedRule}
              onChange={(event) => {
                setSelectedRule(event.target.value)
                setRewardDescription('')
              }}
              required
              disabled={!selectedClient}
            >
              <option value="">Selecione um benefício</option>
              {selectedClientRules.map((rule) => (
                <option value={rule.id} key={rule.id}>
                  {rule.reward_description}
                </option>
              ))}
            </select>
          </label>

          <label className="rewards-field rewards-field-full">
            <span>Observação (opcional)</span>
            <input
              value={rewardDescription}
              onChange={(event) => setRewardDescription(event.target.value)}
              maxLength={500}
              placeholder="Ex.: entregue na consulta de hoje"
            />
          </label>

          {selectedClient && selectedRule && (
            <div className="rewards-redeem-note">
              <Gift size={18} />
              <span>
                Será registrado para <strong>{clientName(selectedClient)}</strong>:
                {' '}{rules.find((rule) => rule.id === selectedRule)?.reward_description}.
                {settings.program_type === 'points' && (
                  <> Serão descontados <strong>
                    {rules.find((rule) => rule.id === selectedRule)?.points_cost} pontos.</strong></>
                )}
              </span>
            </div>
          )}

          <button
            type="submit"
            className="rewards-primary-button"
            disabled={savingReward || !settings.active || !selectedClient || !selectedRule}
          >
            {savingReward
              ? <LoaderCircle size={17} className="rewards-spinning" />
              : <CheckCircle2 size={17} />}
            Registrar resgate
          </button>
        </form>
      </section>

      <section className="rewards-section">
        <div className="rewards-section-heading">
          <span className="rewards-section-icon"><History size={20} /></span>
          <div>
            <h2>Histórico de recompensas</h2>
            <p>Benefícios registrados e entregues.</p>
          </div>
        </div>

        {!rewards.length ? (
          <div className="rewards-empty rewards-empty-compact">
            <Clock size={24} />
            <strong>Nenhuma recompensa registrada</strong>
            <p>Os resgates aparecerão aqui.</p>
          </div>
        ) : (
          <div className="rewards-history-list">
            {rewards.map((reward) => (
              <article className="rewards-history-row" key={reward.id}>
                <span className="rewards-history-icon"><Gift size={18} /></span>
                <div className="rewards-history-info">
                  <strong>{reward.description}</strong>
                  <span>{clientName(reward.client_id)}</span>
                </div>
                <time>{formatDate(reward.reward_date || reward.created_at)}</time>
              </article>
            ))}
          </div>
        )}
      </section>

      {loading && (
        <div className="rewards-loading-indicator">
          <LoaderCircle size={16} className="rewards-spinning" />
          Atualizando dados...
        </div>
      )}
    </main>
  )
}
