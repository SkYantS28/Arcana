
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Check,
  RefreshCw,
  CalendarDays,
  Receipt,
  CircleDollarSign,
  AlertCircle,
  LoaderCircle,
  Filter,
  FileSpreadsheet,
  FileText,
  Download,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../lib/supabase'
import '../styles/financeiro.css'

const today = () => {
  const date = new Date()

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const emptyForm = {
  entry_type: 'income',
  description: '',
  amount: '',
  entry_date: today(),
  payment_status: 'paid',
}

const currency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0)

const formatDate = (value) => {
  if (!value) return '—'

  const [year, month, day] = String(value).slice(0, 10).split('-')

  if (!year || !month || !day) return '—'

  return `${day}/${month}/${year}`
}

const getLocalDate = (value) => {
  if (!value) return today()

  const raw = String(value)

  // Datas sem horário não devem sofrer conversão de fuso horário.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return raw.slice(0, 10)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const getErrorMessage = (error) => {
  if (!error) return 'Ocorreu um erro inesperado.'

  if (error.code === '42501') {
    return 'O banco de dados bloqueou esta operação. Confira as políticas de acesso do Supabase.'
  }

  if (error.code === '42P01' || error.code === 'PGRST205') {
    return 'Uma tabela necessária não foi encontrada. Confira appointments, finance_entries, clients e services no Supabase.'
  }

  if (error.code === '42703' || error.code === 'PGRST204') {
    return 'Uma coluna necessária não foi encontrada no banco de dados.'
  }

  if (error.code === 'PGRST200') {
    return 'Não foi possível identificar a relação entre atendimentos, consulentes e serviços. Confira as chaves estrangeiras no Supabase.'
  }

  return error.message || 'Não foi possível concluir a operação.'
}

const padDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const getPeriodRange = (period, referenceDate = today()) => {
  const reference = new Date(`${referenceDate}T12:00:00`)
  let start
  let end

  if (period === 'week') {
    start = new Date(reference)
    const day = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - day)

    end = new Date(start)
    end.setDate(end.getDate() + 6)
  } else if (period === 'month') {
    start = new Date(reference.getFullYear(), reference.getMonth(), 1, 12)
    end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 12)
  } else if (period === 'year') {
    start = new Date(reference.getFullYear(), 0, 1, 12)
    end = new Date(reference.getFullYear(), 11, 31, 12)
  } else {
    return { start: '', end: '' }
  }

  return {
    start: padDate(start),
    end: padDate(end),
  }
}

const getPeriodLabel = (period, start, end) => {
  if (period === 'week') {
    return `Semana de ${formatDate(start)} a ${formatDate(end)}`
  }

  if (period === 'month') {
    const date = new Date(`${start}T12:00:00`)

    return date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    })
  }

  if (period === 'year') return `Ano ${start.slice(0, 4)}`

  if (period === 'custom') {
    return `Período de ${formatDate(start)} a ${formatDate(end)}`
  }

  return 'Todo o período'
}

const cleanFileName = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

export default function Financeiro({ t = {} }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [userId, setUserId] = useState(null)

  const [period, setPeriod] = useState('month')
  const [referenceDate, setReferenceDate] = useState(today())
  const [customStart, setCustomStart] = useState(
    getPeriodRange('month').start,
  )
  const [customEnd, setCustomEnd] = useState(
    getPeriodRange('month').end,
  )
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [deleteTarget, setDeleteTarget] = useState(null)

  const text = (key, fallback) => t[key] || fallback

  const periodRange = useMemo(() => {
    if (period === 'custom') {
      return { start: customStart, end: customEnd }
    }

    if (period === 'all') {
      return { start: '', end: '' }
    }

    return getPeriodRange(period, referenceDate)
  }, [period, referenceDate, customStart, customEnd])

  const periodLabel = useMemo(
    () => getPeriodLabel(period, periodRange.start, periodRange.end),
    [period, periodRange],
  )

  const loadEntries = useCallback(async () => {
    try {
      // A primeira operação é assíncrona. Assim, o carregamento inicial
      // não executa setState de forma síncrona dentro do useEffect.
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      setLoading(true)
      setError('')

      if (authError) throw authError

      const user = authData?.user

      if (!user) {
        setUserId(null)
        setEntries([])
        setError(
          'Sua sessão expirou. Entre novamente para acessar o financeiro.',
        )
        return
      }

      setUserId(user.id)

      const entriesRequest = supabase
        .from('finance_entries')
        .select(
          'id, owner_id, entry_type, description, amount, entry_date, payment_status, created_at',
        )
        .eq('owner_id', user.id)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })

      const appointmentsRequest = supabase
        .from('appointments')
        .select(`
          id,
          owner_id,
          client_id,
          service_id,
          status,
          payment_status,
          amount,
          scheduled_at,
          deadline_at,
          created_at,
          clients ( name ),
          services ( name )
        `)
        .eq('owner_id', user.id)
        .neq('status', 'cancelled')
        .in('payment_status', ['paid', 'pending'])
        .order('created_at', { ascending: false })

      const [
        { data: manualEntries, error: entriesError },
        { data: appointments, error: appointmentsError },
      ] = await Promise.all([entriesRequest, appointmentsRequest])

      if (entriesError) throw entriesError
      if (appointmentsError) throw appointmentsError

      const normalizedEntries = (manualEntries || []).map((entry) => ({
        ...entry,
        source: 'manual',
      }))

      const appointmentEntries = (appointments || []).map((appointment) => {
        const clientName =
          appointment.clients?.name?.trim() || 'Consulente sem nome'

        const serviceName =
          appointment.services?.name?.trim() || 'Atendimento'

        return {
          id: `appointment-${appointment.id}`,
          appointment_id: appointment.id,
          owner_id: appointment.owner_id,
          entry_type: 'income',
          description: `${serviceName} — ${clientName}`,
          amount: appointment.amount,
          entry_date: getLocalDate(
            appointment.scheduled_at || appointment.deadline_at,
          ),
          payment_status: appointment.payment_status,
          created_at: appointment.created_at,
          source: 'appointment',
        }
      })

      const combinedEntries = [
        ...normalizedEntries,
        ...appointmentEntries,
      ].sort((a, b) => {
        const dateComparison = (b.entry_date || '').localeCompare(
          a.entry_date || '',
        )

        if (dateComparison !== 0) return dateComparison

        return (b.created_at || '').localeCompare(a.created_at || '')
      })

      setEntries(combinedEntries)
    } catch (err) {
      console.error('Erro ao carregar o financeiro:', err)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    const initialize = async () => {
      // Deixa o efeito iniciar o trabalho assíncrono sem chamar
      // diretamente uma função que atualiza estados antes de aguardar.
      await Promise.resolve()

      if (active) {
        await loadEntries()
      }
    }

    initialize()

    return () => {
      active = false
    }
  }, [loadEntries])

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')

    return entries.filter((entry) => {
      const date = (entry.entry_date || '').slice(0, 10)

      const matchesStart = !periodRange.start || date >= periodRange.start
      const matchesEnd = !periodRange.end || date <= periodRange.end

      const matchesType =
        typeFilter === 'all' || entry.entry_type === typeFilter

      const matchesStatus =
        statusFilter === 'all' || entry.payment_status === statusFilter

      const matchesSearch =
        !normalizedSearch ||
        (entry.description || '')
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedSearch)

      return (
        matchesStart &&
        matchesEnd &&
        matchesType &&
        matchesStatus &&
        matchesSearch
      )
    })
  }, [entries, periodRange, typeFilter, statusFilter, search])

  const summary = useMemo(() => {
    const sum = (predicate) =>
      filteredEntries
        .filter(predicate)
        .reduce((total, entry) => total + Number(entry.amount || 0), 0)

    const income = sum(
      (entry) =>
        entry.entry_type === 'income' && entry.payment_status === 'paid',
    )

    const expenses = sum(
      (entry) =>
        entry.entry_type === 'expense' && entry.payment_status === 'paid',
    )

    const pendingIncome = sum(
      (entry) =>
        entry.entry_type === 'income' && entry.payment_status === 'pending',
    )

    const pendingExpenses = sum(
      (entry) =>
        entry.entry_type === 'expense' && entry.payment_status === 'pending',
    )

    return {
      income,
      expenses,
      balance: income - expenses,
      pendingIncome,
      pendingExpenses,
    }
  }, [filteredEntries])

  const chartData = useMemo(() => {
    const months = []
    const now = new Date()

    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      months.push({
        key,
        label: new Intl.DateTimeFormat('pt-BR', {
          month: 'short',
        })
          .format(date)
          .replace('.', ''),
        income: 0,
        expenses: 0,
      })
    }

    entries.forEach((entry) => {
      if (entry.payment_status !== 'paid') return

      const month = months.find(
        (item) => item.key === (entry.entry_date || '').slice(0, 7),
      )

      if (!month) return

      if (entry.entry_type === 'income') {
        month.income += Number(entry.amount || 0)
      } else {
        month.expenses += Number(entry.amount || 0)
      }
    })

    const max = Math.max(
      1,
      ...months.flatMap((month) => [month.income, month.expenses]),
    )

    return { months, max }
  }, [entries])

  const openNewForm = (type = 'income') => {
    setEditingId(null)
    setForm({ ...emptyForm, entry_type: type, entry_date: today() })
    setError('')
    setNotice('')
    setFormOpen(true)
  }

  const openEditForm = (entry) => {
    if (entry.source === 'appointment') {
      setNotice(
        'Este registro vem da Agenda. Altere o pagamento diretamente no atendimento.',
      )
      return
    }

    setEditingId(entry.id)

    setForm({
      entry_type: entry.entry_type,
      description: entry.description || '',
      amount: String(entry.amount ?? ''),
      entry_date: (entry.entry_date || today()).slice(0, 10),
      payment_status: entry.payment_status || 'paid',
    })

    setError('')
    setNotice('')
    setFormOpen(true)
  }

  const closeForm = () => {
    if (saving) return

    setFormOpen(false)
    setEditingId(null)
    setForm({ ...emptyForm })
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!userId) {
      setError('Sua sessão expirou. Entre novamente.')
      return
    }

    const amount = Number(String(form.amount).replace(',', '.'))

    if (!form.description.trim()) {
      setError('Informe uma descrição para o lançamento.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }

    if (!form.entry_date) {
      setError('Informe a data do lançamento.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        owner_id: userId,
        entry_type: form.entry_type,
        description: form.description.trim(),
        amount: Number(amount.toFixed(2)),
        entry_date: form.entry_date,
        payment_status: form.payment_status,
      }

      const result = editingId
        ? await supabase
            .from('finance_entries')
            .update(payload)
            .eq('id', editingId)
            .eq('owner_id', userId)
            .select('id')
            .single()
        : await supabase
            .from('finance_entries')
            .insert(payload)
            .select('id')
            .single()

      if (result.error) throw result.error

      const wasEditing = Boolean(editingId)

      setFormOpen(false)
      setEditingId(null)
      setForm({ ...emptyForm })

      setNotice(
        wasEditing
          ? 'Lançamento atualizado com sucesso.'
          : 'Lançamento registrado com sucesso.',
      )

      await loadEntries()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !userId) return

    if (deleteTarget.source === 'appointment') {
      setDeleteTarget(null)
      setNotice(
        'Este registro pertence à Agenda. Gerencie o atendimento diretamente por lá.',
      )
      return
    }

    setError('')
    setNotice('')

    try {
      const { error: deleteError } = await supabase
        .from('finance_entries')
        .delete()
        .eq('id', deleteTarget.id)
        .eq('owner_id', userId)

      if (deleteError) throw deleteError

      setEntries((current) =>
        current.filter((entry) => entry.id !== deleteTarget.id),
      )

      setDeleteTarget(null)
      setNotice('Lançamento excluído.')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const clearFilters = () => {
    setPeriod('month')
    setReferenceDate(today())
    setCustomStart(getPeriodRange('month').start)
    setCustomEnd(getPeriodRange('month').end)
    setTypeFilter('all')
    setStatusFilter('all')
    setSearch('')
  }

  const hasFilters =
    period !== 'month' ||
    referenceDate !== today() ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    search.trim() !== ''

  const invalidCustomPeriod =
    period === 'custom' &&
    Boolean(customStart && customEnd) &&
    customStart > customEnd

  const exportRows = useMemo(
    () =>
      filteredEntries.map((entry) => ({
        data: entry.entry_date || '',
        descricao: entry.description || '',
        origem:
          entry.source === 'appointment'
            ? 'Agenda'
            : 'Lançamento manual',
        tipo: entry.entry_type === 'income' ? 'Receita' : 'Despesa',
        situacao:
          entry.payment_status === 'paid'
            ? 'Pago/recebido'
            : 'Pendente',
        valor: Number(entry.amount || 0),
        valorFormatado: currency(entry.amount),
      })),
    [filteredEntries],
  )

  const exportExcel = async () => {
    if (invalidCustomPeriod) {
      setError('A data inicial não pode ser posterior à data final.')
      return
    }

    if (!filteredEntries.length) {
      setError('Não há movimentações neste período para exportar.')
      return
    }

    setExporting(true)
    setError('')
    setNotice('')

    try {
      const workbook = XLSX.utils.book_new()

      const summaryRows = [
        ['RELATÓRIO FINANCEIRO — ARCANA'],
        ['Período', periodLabel],
        ['Gerado em', formatDate(today())],
        [],
        ['RESUMO'],
        ['Receitas recebidas', summary.income],
        ['Despesas pagas', summary.expenses],
        ['Saldo do período', summary.balance],
        ['Receitas pendentes', summary.pendingIncome],
        ['Despesas pendentes', summary.pendingExpenses],
        ['Quantidade de movimentações', filteredEntries.length],
        [],
        ['MOVIMENTAÇÕES'],
      ]

      const transactionRows = exportRows.map((row) => [
        formatDate(row.data),
        row.descricao,
        row.origem,
        row.tipo,
        row.situacao,
        row.valor,
      ])

      const sheet = XLSX.utils.aoa_to_sheet([
        ...summaryRows,
        ['Data', 'Descrição', 'Origem', 'Tipo', 'Situação', 'Valor (R$)'],
        ...transactionRows,
      ])

      sheet['!cols'] = [
        { wch: 14 },
        { wch: 42 },
        { wch: 22 },
        { wch: 14 },
        { wch: 20 },
        { wch: 16 },
      ]

      // Formata os campos monetários do resumo como números no Excel.
      const range = XLSX.utils.decode_range(sheet['!ref'])

      for (let row = range.s.r; row <= range.e.r; row += 1) {
        for (let col = range.s.c; col <= range.e.c; col += 1) {
          const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })]

          if (cell && col === 1 && row >= 5 && row <= 9) {
            cell.z = '"R$" #,##0.00'
          }
        }
      }

      // Localiza a coluna de valores da tabela de movimentações.
      const headerRowIndex = summaryRows.length
      const firstDataRowIndex = headerRowIndex + 1

      for (
        let row = firstDataRowIndex;
        row < firstDataRowIndex + transactionRows.length;
        row += 1
      ) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: 5 })]

        if (cell) cell.z = '"R$" #,##0.00'
      }

      XLSX.utils.book_append_sheet(workbook, sheet, 'Financeiro')

      XLSX.writeFile(
        workbook,
        `arcana-financeiro-${cleanFileName(periodLabel)}-${today()}.xlsx`,
      )

      setNotice('Planilha Excel exportada com sucesso.')
    } catch (err) {
      console.error('Erro ao exportar planilha:', err)
      setError('Não foi possível gerar a planilha. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  const exportPDF = async () => {
    if (invalidCustomPeriod) {
      setError('A data inicial não pode ser posterior à data final.')
      return
    }

    if (!filteredEntries.length) {
      setError('Não há movimentações neste período para exportar.')
      return
    }

    setExporting(true)
    setError('')
    setNotice('')

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text('Relatório financeiro — Arcana', 14, 16)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Período: ${periodLabel}`, 14, 24)
      doc.text(`Gerado em: ${formatDate(today())}`, 14, 30)

      doc.setFont('helvetica', 'bold')
      doc.text('Resumo financeiro', 14, 40)

      autoTable(doc, {
        startY: 44,
        head: [[
          'Receitas recebidas',
          'Despesas pagas',
          'Saldo do período',
          'A receber',
          'A pagar',
        ]],
        body: [[
          currency(summary.income),
          currency(summary.expenses),
          currency(summary.balance),
          currency(summary.pendingIncome),
          currency(summary.pendingExpenses),
        ]],
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [72, 57, 94],
        },
      })

      const tableStartY = (doc.lastAutoTable?.finalY || 60) + 9

      doc.setFont('helvetica', 'bold')
      doc.text('Detalhamento das movimentações', 14, tableStartY)

      autoTable(doc, {
        startY: tableStartY + 4,
        head: [[
          'Data',
          'Descrição',
          'Origem',
          'Tipo',
          'Situação',
          'Valor',
        ]],
        body: exportRows.map((row) => [
          formatDate(row.data),
          row.descricao,
          row.origem,
          row.tipo,
          row.situacao,
          row.valorFormatado,
        ]),
        theme: 'striped',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2.5,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [72, 57, 94],
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 82 },
          2: { cellWidth: 30 },
          3: { cellWidth: 23 },
          4: { cellWidth: 30 },
          5: { cellWidth: 27, halign: 'right' },
        },
        didDrawPage: () => {
          const pageCount = doc.internal.getNumberOfPages()
          const pageWidth = doc.internal.pageSize.getWidth()
          const pageHeight = doc.internal.pageSize.getHeight()

          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')

          doc.text(
            `Arcana • Página ${doc.internal.getCurrentPageInfo().pageNumber} de ${pageCount}`,
            pageWidth - 14,
            pageHeight - 7,
            { align: 'right' },
          )
        },
      })

      doc.save(
        `arcana-financeiro-${cleanFileName(periodLabel)}-${today()}.pdf`,
      )

      setNotice('Relatório PDF exportado com sucesso.')
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      setError('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="finance-page">
      <header className="page-title finance-page-heading">
        <div>
          <div className="eyebrow">
            {text('financeEyebrow', 'ORGANIZAÇÃO FINANCEIRA')}
          </div>

          <h1>{text('financeTitle', 'Financeiro')}</h1>

          <p>
            {text(
              'financeDescription',
              'Acompanhe suas receitas, despesas e resultados em um só lugar.',
            )}
          </p>
        </div>

        <div className="finance-heading-actions">
          <button
            type="button"
            className="finance-button finance-button-secondary"
            onClick={loadEntries}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? 'finance-spinning' : ''}
            />
            Atualizar
          </button>

          <button
            type="button"
            className="finance-button finance-button-primary"
            onClick={() => openNewForm('income')}
          >
            <Plus size={18} />
            Novo lançamento
          </button>
        </div>
      </header>

      {error && (
        <div className="finance-alert finance-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Fechar aviso"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {notice && (
        <div className="finance-alert finance-alert-success" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Fechar aviso"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <section
        className="finance-summary-grid"
        aria-label="Resumo financeiro"
      >
        <article className="finance-summary-card finance-balance-card">
          <div className="finance-summary-top">
            <span className="finance-summary-icon">
              <Wallet size={21} />
            </span>
            <span className="finance-summary-caption">
              Resultado do período
            </span>
          </div>

          <strong className="finance-summary-value">
            {currency(summary.balance)}
          </strong>

          <span className="finance-summary-footnote">
            Receitas recebidas menos despesas pagas
          </span>
        </article>

        <article className="finance-summary-card">
          <div className="finance-summary-top">
            <span className="finance-summary-icon finance-icon-income">
              <TrendingUp size={21} />
            </span>
            <span className="finance-summary-caption">
              Receitas recebidas
            </span>
          </div>

          <strong className="finance-summary-value finance-income-text">
            {currency(summary.income)}
          </strong>

          <span className="finance-summary-footnote">
            {currency(summary.pendingIncome)} a receber
          </span>
        </article>

        <article className="finance-summary-card">
          <div className="finance-summary-top">
            <span className="finance-summary-icon finance-icon-expense">
              <TrendingDown size={21} />
            </span>
            <span className="finance-summary-caption">
              Despesas pagas
            </span>
          </div>

          <strong className="finance-summary-value finance-expense-text">
            {currency(summary.expenses)}
          </strong>

          <span className="finance-summary-footnote">
            {currency(summary.pendingExpenses)} a pagar
          </span>
        </article>

        <article className="finance-summary-card">
          <div className="finance-summary-top">
            <span className="finance-summary-icon finance-icon-neutral">
              <CircleDollarSign size={21} />
            </span>
            <span className="finance-summary-caption">
              Movimentações
            </span>
          </div>

          <strong className="finance-summary-value">
            {filteredEntries.length}
          </strong>

          <span className="finance-summary-footnote">
            Registros no período filtrado
          </span>
        </article>
      </section>

      <section className="finance-quick-actions">
        <div className="finance-quick-copy">
          <span className="finance-quick-icon">
            <Receipt size={21} />
          </span>

          <div>
            <h2>Registrar movimentação</h2>
            <p>
              Adicione entradas ou saídas que não estejam registradas na Agenda.
            </p>
          </div>
        </div>

        <div className="finance-quick-buttons">
          <button
            type="button"
            className="finance-button finance-button-income"
            onClick={() => openNewForm('income')}
          >
            <ArrowDownLeft size={18} />
            Registrar receita
          </button>

          <button
            type="button"
            className="finance-button finance-button-expense"
            onClick={() => openNewForm('expense')}
          >
            <ArrowUpRight size={18} />
            Registrar despesa
          </button>
        </div>
      </section>

      <section className="finance-chart-card">
        <div className="finance-section-heading">
          <div>
            <h2>Visão geral</h2>
            <p>
              Comparativo mensal de receitas recebidas e despesas pagas.
            </p>
          </div>

          <span className="finance-chart-legend">
            <span>
              <i className="finance-legend-income" /> Receitas
            </span>
            <span>
              <i className="finance-legend-expense" /> Despesas
            </span>
          </span>
        </div>

        <div className="finance-chart">
          {chartData.months.map((month) => (
            <div className="finance-chart-month" key={month.key}>
              <div className="finance-chart-bars">
                <div
                  className="finance-chart-bar finance-chart-bar-income"
                  style={{
                    height: `${Math.max(3, (month.income / chartData.max) * 100)}%`,
                  }}
                  title={`Receitas: ${currency(month.income)}`}
                />

                <div
                  className="finance-chart-bar finance-chart-bar-expense"
                  style={{
                    height: `${Math.max(3, (month.expenses / chartData.max) * 100)}%`,
                  }}
                  title={`Despesas: ${currency(month.expenses)}`}
                />
              </div>

              <span className="finance-chart-month-label">
                {month.label}
              </span>
            </div>
          ))}
        </div>

        <p className="finance-chart-note">
          O gráfico considera os registros pagos dos últimos seis meses,
          incluindo atendimentos da Agenda.
        </p>
      </section>

      <section className="finance-entries-card">
        <div className="finance-section-heading finance-entries-heading">
          <div>
            <h2>Movimentações financeiras</h2>
            <p>
              Filtre por período e exporte seus dados para planilha ou PDF.
            </p>
          </div>

          <span className="finance-entry-count">
            {filteredEntries.length}{' '}
            {filteredEntries.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className="finance-filters">
          <label className="finance-filter-control">
            <CalendarDays size={17} />

            <select
              aria-label="Período do relatório"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="week">Esta semana</option>
              <option value="month">Este mês</option>
              <option value="year">Este ano</option>
              <option value="custom">Período personalizado</option>
              <option value="all">Todo o período</option>
            </select>
          </label>

          {period !== 'all' && period !== 'custom' && (
            <label className="finance-filter-control">
              <CalendarDays size={17} />

              <input
                aria-label="Data de referência"
                type="date"
                value={referenceDate}
                onChange={(event) => setReferenceDate(event.target.value)}
              />
            </label>
          )}

          {period === 'custom' && (
            <>
              <label className="finance-filter-control">
                <span>De</span>

                <input
                  aria-label="Data inicial"
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                />
              </label>

              <label className="finance-filter-control">
                <span>Até</span>

                <input
                  aria-label="Data final"
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                />
              </label>
            </>
          )}

          <label className="finance-search">
            <Search size={18} />

            <input
              type="search"
              placeholder="Buscar por descrição..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="finance-filter-control">
            <Filter size={17} />

            <select
              aria-label="Filtrar por tipo"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">Todos os tipos</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
            </select>
          </label>

          <label className="finance-filter-control">
            <select
              aria-label="Filtrar por situação"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Todas as situações</option>
              <option value="paid">Pago/recebido</option>
              <option value="pending">Pendente</option>
            </select>
          </label>

          {hasFilters && (
            <button
              type="button"
              className="finance-clear-filters"
              onClick={clearFilters}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {invalidCustomPeriod && (
          <div className="finance-alert finance-alert-error" role="alert">
            A data inicial não pode ser posterior à data final.
          </div>
        )}

        <div className="finance-export-panel">
          <div className="finance-export-copy">
            <Download size={20} />

            <div>
              <strong>Exportar relatório</strong>
              <p>
                {periodLabel}. A exportação respeita os filtros selecionados.
              </p>
            </div>
          </div>

          <div className="finance-export-buttons">
            <button
              type="button"
              className="finance-button finance-button-secondary"
              onClick={exportExcel}
              disabled={
                exporting ||
                loading ||
                !filteredEntries.length ||
                invalidCustomPeriod
              }
            >
              {exporting ? (
                <LoaderCircle size={17} className="finance-spinning" />
              ) : (
                <FileSpreadsheet size={17} />
              )}
              Exportar Excel
            </button>

            <button
              type="button"
              className="finance-button finance-button-primary"
              onClick={exportPDF}
              disabled={
                exporting ||
                loading ||
                !filteredEntries.length ||
                invalidCustomPeriod
              }
            >
              {exporting ? (
                <LoaderCircle size={17} className="finance-spinning" />
              ) : (
                <FileText size={17} />
              )}
              Exportar PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="finance-state">
            <LoaderCircle size={27} className="finance-spinning" />
            <p>Carregando movimentações...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="finance-state">
            <span className="finance-empty-icon">
              <Receipt size={27} />
            </span>

            <h3>
              {entries.length
                ? 'Nenhum resultado encontrado'
                : 'Seu financeiro começa aqui'}
            </h3>

            <p>
              {entries.length
                ? 'Tente mudar o período, os filtros ou a busca.'
                : 'Seus pagamentos da Agenda e os lançamentos financeiros aparecerão aqui.'}
            </p>

            {entries.length === 0 && (
              <button
                type="button"
                className="finance-button finance-button-primary"
                onClick={() => openNewForm('income')}
              >
                <Plus size={18} />
                Criar primeiro lançamento
              </button>
            )}
          </div>
        ) : (
          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Situação</th>
                  <th className="finance-align-right">Valor</th>
                  <th className="finance-align-right">Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredEntries.map((entry) => {
                  const isIncome = entry.entry_type === 'income'
                  const isPaid = entry.payment_status === 'paid'
                  const isAppointment = entry.source === 'appointment'

                  return (
                    <tr key={`${entry.source}-${entry.id}`}>
                      <td>
                        <div className="finance-description-cell">
                          <span
                            className={`finance-entry-icon ${isIncome ? 'is-income' : 'is-expense'}`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft size={17} />
                            ) : (
                              <ArrowUpRight size={17} />
                            )}
                          </span>

                          <span className="finance-entry-description">
                            <strong>{entry.description}</strong>

                            <small>
                              {isAppointment
                                ? 'Atendimento da Agenda'
                                : isIncome
                                  ? 'Entrada financeira'
                                  : 'Saída financeira'}
                            </small>
                          </span>
                        </div>
                      </td>

                      <td className="finance-date-cell">
                        {formatDate(entry.entry_date)}
                      </td>

                      <td>
                        <span
                          className={`finance-type-pill ${isIncome ? 'is-income' : 'is-expense'}`}
                        >
                          {isIncome ? 'Receita' : 'Despesa'}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`finance-status-pill ${isPaid ? 'is-paid' : 'is-pending'}`}
                        >
                          <span />
                          {isPaid ? 'Pago/recebido' : 'Pendente'}
                        </span>
                      </td>

                      <td
                        className={`finance-amount-cell ${isIncome ? 'finance-income-text' : 'finance-expense-text'}`}
                      >
                        {isIncome ? '+' : '−'} {currency(entry.amount)}
                      </td>

                      <td>
                        <div className="finance-row-actions">
                          {isAppointment ? (
                            <span
                              title="Este registro é gerenciado pela Agenda"
                              aria-label="Gerenciado pela Agenda"
                            >
                              Agenda
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditForm(entry)}
                                aria-label={`Editar ${entry.description}`}
                                title="Editar lançamento"
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                className="finance-delete-action"
                                onClick={() => setDeleteTarget(entry)}
                                aria-label={`Excluir ${entry.description}`}
                                title="Excluir lançamento"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen && (
        <div
          className="finance-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm()
          }}
        >
          <section
            className="finance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="finance-form-title"
          >
            <div className="finance-modal-heading">
              <div>
                <span className="finance-modal-eyebrow">
                  {editingId ? 'EDITAR REGISTRO' : 'NOVO REGISTRO'}
                </span>

                <h2 id="finance-form-title">
                  {editingId ? 'Editar lançamento' : 'Adicionar lançamento'}
                </h2>

                <p>
                  Preencha as informações da movimentação financeira.
                </p>
              </div>

              <button
                type="button"
                className="finance-modal-close"
                onClick={closeForm}
                aria-label="Fechar formulário"
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form className="finance-form" onSubmit={handleSave}>
              <fieldset className="finance-type-selector" disabled={saving}>
                <legend>Tipo de movimentação</legend>

                <button
                  type="button"
                  className={
                    form.entry_type === 'income'
                      ? 'selected income-choice'
                      : ''
                  }
                  onClick={() =>
                    setForm((old) => ({
                      ...old,
                      entry_type: 'income',
                    }))
                  }
                >
                  <ArrowDownLeft size={18} />
                  Receita
                </button>

                <button
                  type="button"
                  className={
                    form.entry_type === 'expense'
                      ? 'selected expense-choice'
                      : ''
                  }
                  onClick={() =>
                    setForm((old) => ({
                      ...old,
                      entry_type: 'expense',
                    }))
                  }
                >
                  <ArrowUpRight size={18} />
                  Despesa
                </button>
              </fieldset>

              <label className="finance-form-field">
                <span>Descrição</span>

                <input
                  type="text"
                  value={form.description}
                  onChange={(event) =>
                    setForm((old) => ({
                      ...old,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Ex.: Consulta de tarot, internet..."
                  maxLength={200}
                  required
                  disabled={saving}
                />
              </label>

              <div className="finance-form-row">
                <label className="finance-form-field">
                  <span>Valor (R$)</span>

                  <input
                    type="number"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((old) => ({
                        ...old,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="0,00"
                    min="0.01"
                    step="0.01"
                    required
                    disabled={saving}
                  />
                </label>

                <label className="finance-form-field">
                  <span>Data</span>

                  <input
                    type="date"
                    value={form.entry_date}
                    onChange={(event) =>
                      setForm((old) => ({
                        ...old,
                        entry_date: event.target.value,
                      }))
                    }
                    required
                    disabled={saving}
                  />
                </label>
              </div>

              <label className="finance-form-field">
                <span>Situação do pagamento</span>

                <select
                  value={form.payment_status}
                  onChange={(event) =>
                    setForm((old) => ({
                      ...old,
                      payment_status: event.target.value,
                    }))
                  }
                  disabled={saving}
                >
                  <option value="paid">Pago/recebido</option>
                  <option value="pending">Pendente</option>
                </select>
              </label>

              {error && (
                <div
                  className="finance-alert finance-alert-error"
                  role="alert"
                >
                  <AlertCircle size={17} />
                  <span>{error}</span>
                </div>
              )}

              <div className="finance-form-actions">
                <button
                  type="button"
                  className="finance-button finance-button-secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="finance-button finance-button-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle
                      size={17}
                      className="finance-spinning"
                    />
                  ) : (
                    <Check size={17} />
                  )}

                  {saving
                    ? 'Salvando...'
                    : editingId
                      ? 'Salvar alterações'
                      : 'Salvar lançamento'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="finance-modal-backdrop">
          <section
            className="finance-modal finance-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="finance-delete-title"
          >
            <span className="finance-confirm-icon">
              <Trash2 size={24} />
            </span>

            <h2 id="finance-delete-title">Excluir lançamento?</h2>

            <p>
              Você está prestes a excluir{' '}
              <strong>{deleteTarget.description}</strong>, no valor de{' '}
              <strong>{currency(deleteTarget.amount)}</strong>. Essa ação não
              pode ser desfeita.
            </p>

            {error && (
              <div
                className="finance-alert finance-alert-error"
                role="alert"
              >
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}

            <div className="finance-form-actions">
              <button
                type="button"
                className="finance-button finance-button-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="finance-button finance-button-danger"
                onClick={handleDelete}
              >
                <Trash2 size={17} />
                Confirmar exclusão
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
