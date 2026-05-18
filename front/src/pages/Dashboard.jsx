import { useEffect, useState } from 'react'
import { transactionService } from '../services/transactionService'
import { accountService } from '../services/accountService'
import { categoryService } from '../services/categoryService'
import { creditCardService } from '../services/creditCardService'
import { establishmentService } from '../services/establishmentService'
import { TrendingUp, TrendingDown, Landmark, CreditCard, PiggyBank, Plus, ArrowRight, Wallet, ChevronDown, ChevronUp, X, Check, Eye, EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import Modal from '../components/ui/Modal'
import CurrencyInput from '../components/ui/CurrencyInput'
import { useBalanceVisibility } from '../context/BalanceVisibilityContext'

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

function SummaryCard({ title, value, icon: Icon, color, sub }) {
  const { hideBalance } = useBalanceVisibility()
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{title}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{hideBalance ? '***' : formatCurrency(value)}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function PieChart({ data, selectedCatId, onSliceClick }) {
  const [hovered, setHovered] = useState(null)
  const { hideBalance } = useBalanceVisibility()

  const total = data.reduce((sum, d) => sum + Number(d.total), 0)

  if (data.length === 0 || total === 0) {
    return <p className="text-sm text-gray-400">Nenhuma despesa registrada este mês.</p>
  }

  const cx = 100, cy = 100, outerR = 78, innerR = 46

  const polar = (r, angle) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  })

  let cumAngle = -Math.PI / 2
  const slices = data
    .slice()
    .sort((a, b) => Number(b.total) - Number(a.total))
    .map((item) => {
      const pct = Number(item.total) / total
      const sweep = Math.max(pct * 2 * Math.PI, 0.02)
      const startAngle = cumAngle
      cumAngle += sweep
      const endAngle = cumAngle
      const midAngle = startAngle + sweep / 2
      return { ...item, startAngle, endAngle, midAngle, sweep, pct }
    })

  const arcPath = (slice) => {
    const largeArc = slice.sweep > Math.PI ? 1 : 0
    const oS = polar(outerR, slice.startAngle)
    const oE = polar(outerR, slice.endAngle)
    const iS = polar(innerR, slice.startAngle)
    const iE = polar(innerR, slice.endAngle)
    const f = (n) => n.toFixed(3)
    return [
      `M ${f(oS.x)} ${f(oS.y)}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${f(oE.x)} ${f(oE.y)}`,
      `L ${f(iE.x)} ${f(iE.y)}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${f(iS.x)} ${f(iS.y)}`,
      'Z',
    ].join(' ')
  }

  const hovSlice = hovered !== null ? slices[hovered] : null
  const activeSlice = hovSlice ?? (selectedCatId !== undefined
    ? slices.find(s => s.categoryId === selectedCatId) ?? null
    : null)

  return (
    <div className="flex flex-col sm:flex-row gap-5 items-start">
      <div className="flex-shrink-0 mx-auto sm:mx-0">
        <svg width="220" height="220" viewBox="-14 -14 228 228" style={{ overflow: 'visible' }}>
          {slices.map((slice, i) => {
            const isHov = hovered === i
            const isSelected = slice.categoryId === selectedCatId
            const isActive = isHov || isSelected
            const isDimmed = selectedCatId !== undefined && !isSelected && !isHov
            const dx = isActive ? Math.cos(slice.midAngle) * 10 : 0
            const dy = isActive ? Math.sin(slice.midAngle) * 10 : 0
            return (
              <g key={slice.categoryId ?? 'none'}
                transform={`translate(${dx.toFixed(3)}, ${dy.toFixed(3)})`}
                style={{ cursor: 'pointer', transition: 'transform 0.15s ease, opacity 0.15s ease' }}
                opacity={isDimmed ? 0.4 : 1}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSliceClick(slice)}>
                <path d={arcPath(slice)} fill={slice.categoryColor ?? '#94a3b8'}
                  stroke="white" strokeWidth="1.5" />
              </g>
            )
          })}

          {/* Center labels */}
          <text x={cx} y={cy - 12} textAnchor="middle"
            style={{ fontSize: '10px', fill: '#6b7280', fontFamily: 'inherit' }}>
            {activeSlice ? activeSlice.categoryName ?? 'Sem cat.' : 'Total do mês'}
          </text>
          <text x={cx} y={cy + 6} textAnchor="middle"
            style={{ fontSize: '13px', fontWeight: '700', fill: '#111827', fontFamily: 'inherit' }}>
            {hideBalance ? '***' : formatCurrency(activeSlice ? activeSlice.total : total)}
          </text>
          {activeSlice && (
            <text x={cx} y={cy + 22} textAnchor="middle"
              style={{ fontSize: '10px', fill: '#9ca3af', fontFamily: 'inherit' }}>
              {(activeSlice.pct * 100).toFixed(1)}%
            </text>
          )}
        </svg>
      </div>

      <ul className="flex-1 w-full space-y-1.5 mt-1">
        {slices.slice(0, 8).map((c) => {
          const isSelected = c.categoryId === selectedCatId
          return (
            <li key={c.categoryId ?? 'none'}
              className={`flex items-center gap-2.5 px-2 py-1 rounded cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => onSliceClick(c)}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: c.categoryColor ?? '#94a3b8' }} />
              <span className={`text-sm flex-1 truncate ${isSelected ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                {c.categoryName ?? 'Sem categoria'}
              </span>
              <span className="text-sm font-medium text-gray-900">{hideBalance ? '***' : formatCurrency(c.total)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* Painel inline de transações por categoria */
function CategoryPanel({ cat, onClose }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const { hideBalance } = useBalanceVisibility()

  useEffect(() => {
    setLoading(true)
    const params = { size: 50 }
    if (cat.categoryId) params.categoryId = cat.categoryId
    else params.noCategory = true
    transactionService.list(params)
      .then(r => setTransactions(r.content ?? []))
      .finally(() => setLoading(false))
  }, [cat.categoryId])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: cat.categoryColor ?? '#94a3b8' }} />
          <h2 className="text-base font-semibold text-gray-800">
            {cat.categoryName ?? 'Sem categoria'}
          </h2>
          <span className="text-sm text-gray-400">· {hideBalance ? '***' : formatCurrency(cat.total)}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          title="Voltar para últimas transações"
        >
          <X size={16} />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-6 text-center">Carregando...</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">Nenhuma transação encontrada.</p>
      ) : (
        <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
          {transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-800">{t.description}</p>
                <p className="text-xs text-gray-400">
                  {formatDate(t.date)}
                  {t.accountName ? ` · ${t.accountName}` : ''}
                  {t.creditCardName ? ` · ${t.creditCardName}` : ''}
                </p>
              </div>
              <span className="text-sm font-semibold text-red-600 ml-4">
                {hideBalance ? '***' : `-${formatCurrency(t.amount)}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QuickExpenseModal({ onClose, onSuccess }) {
  const [accounts, setAccounts] = useState([])
  const [cards, setCards] = useState([])
  const [categories, setCategories] = useState([])
  const [establishments, setEstablishments] = useState([])
  const [paymentType, setPaymentType] = useState('account')
  const [recurrenceType, setRecurrenceType] = useState('NONE')
  const [form, setForm] = useState({
    description: '', amount: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '', accountId: '', creditCardId: '',
    installmentNumber: '1', installmentTotal: '2',
  })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filteredEstablishments = form.description.length > 0
    ? establishments.filter(e => e.name.toLowerCase().includes(form.description.toLowerCase()))
    : []

  const selectEstablishment = (e) => {
    setForm(f => ({ ...f, description: e.name, categoryId: e.categoryId ?? f.categoryId }))
    setShowSuggestions(false)
  }

  useEffect(() => {
    accountService.list().then(setAccounts)
    creditCardService.list().then(data => setCards(Array.isArray(data) ? data : data.content ?? []))
    categoryService.list().then(setCategories)
    establishmentService.list().then(setEstablishments)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (paymentType === 'account' && !form.accountId) return alert('Selecione uma conta')
    if (paymentType === 'card' && !form.creditCardId) return alert('Selecione um cartão')
    if (!form.amount) return alert('Informe o valor')
    setLoading(true)
    try {
      await transactionService.create({
        type: 'EXPENSE',
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
        categoryId: form.categoryId || null,
        accountId: paymentType === 'account' ? form.accountId : null,
        creditCardId: paymentType === 'card' ? form.creditCardId : null,
        recurrenceType,
        installmentNumber: recurrenceType === 'INSTALLMENT' ? parseInt(form.installmentNumber) : null,
        installmentTotal: recurrenceType === 'INSTALLMENT' ? parseInt(form.installmentTotal) : null,
      })
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Despesa Rápida" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label className="label">Descrição *</label>
          <input className="input" required autoComplete="off" value={form.description}
            onChange={e => { set('description', e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
          {showSuggestions && filteredEstablishments.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredEstablishments.map(e => (
                <button key={e.id} type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex justify-between items-center text-sm"
                  onMouseDown={() => selectEstablishment(e)}>
                  <span>{e.name}</span>
                  {e.categoryName && (
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: (e.categoryColor ?? '#e5e7eb') + '33', color: e.categoryColor ?? '#374151' }}>
                      {e.categoryName}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Valor *</label>
            <CurrencyInput className="input" required value={form.amount} onChange={v => set('amount', v)} />
          </div>
          <div>
            <label className="label">Data *</label>
            <input className="input" type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Pagar com *</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPaymentType('account')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${paymentType === 'account' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
              Conta bancária
            </button>
            <button type="button" onClick={() => setPaymentType('card')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${paymentType === 'card' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
              Cartão de crédito
            </button>
          </div>
        </div>

        {paymentType === 'account' ? (
          <div>
            <label className="label">Conta *</label>
            <select className="select" required value={form.accountId} onChange={e => set('accountId', e.target.value)}>
              <option value="">Selecione...</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="label">Cartão *</label>
            <select className="select" required value={form.creditCardId} onChange={e => set('creditCardId', e.target.value)}>
              <option value="">Selecione...</option>
              {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="label">Tipo de gasto</label>
          <div className="flex gap-2">
            {[
              { value: 'NONE', label: 'Único' },
              { value: 'SUBSCRIPTION', label: 'Assinatura' },
              { value: 'INSTALLMENT', label: 'Parcelado' },
            ].map(opt => (
              <button key={opt.value} type="button" onClick={() => setRecurrenceType(opt.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${recurrenceType === opt.value ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                {opt.label}
              </button>
            ))}
          </div>
          {recurrenceType === 'SUBSCRIPTION' && (
            <p className="text-xs text-purple-600 mt-1">A despesa será criada automaticamente todo mês até você cancelar.</p>
          )}
        </div>

        {recurrenceType === 'INSTALLMENT' && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg">
            <div>
              <label className="label">Parcela atual *</label>
              <input className="input" type="number" min="1" required value={form.installmentNumber} onChange={e => set('installmentNumber', e.target.value)} />
            </div>
            <div>
              <label className="label">Total de parcelas *</label>
              <input className="input" type="number" min="2" required value={form.installmentTotal} onChange={e => set('installmentTotal', e.target.value)} />
            </div>
            <p className="col-span-2 text-xs text-blue-600">As parcelas restantes serão lançadas automaticamente nos meses seguintes.</p>
          </div>
        )}

        <div>
          <label className="label">Categoria</label>
          <select className="select" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
            <option value="">Sem categoria</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Registrar despesa'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function SpendingCapacityWidget() {
  const [cap, setCap] = useState(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState([])
  const [receivingId, setReceivingId] = useState(null)   // id da receita sendo recebida
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [receiving, setReceiving] = useState(false)
  const { hideBalance } = useBalanceVisibility()

  const fetchCap = () => {
    setLoading(true)
    setError(false)
    transactionService.spendingCapacity()
      .then(data => { setCap(data); setError(false) })
      .catch(err => { console.error('spending-capacity error:', err); setError(true) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCap() }, [])

  const openReceive = (income) => {
    setReceivingId(income.id)
    setSelectedAccountId('')
    if (accounts.length === 0) {
      accountService.list().then(setAccounts)
    }
  }

  const cancelReceive = () => { setReceivingId(null); setSelectedAccountId('') }

  const confirmReceive = async () => {
    if (!selectedAccountId) return
    setReceiving(true)
    try {
      await transactionService.receiveIncome(receivingId, selectedAccountId)
      setReceivingId(null)
      setSelectedAccountId('')
      fetchCap()
    } finally {
      setReceiving(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-5 border-l-4 border-gray-200 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-200" />
          <div className="space-y-2">
            <div className="h-3 w-40 bg-gray-200 rounded" />
            <div className="h-6 w-28 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !cap) {
    return (
      <div className="card p-5 border-l-4 border-yellow-400">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-400">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Capacidade de Gasto Real</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Reinicie o backend para carregar este dado (endpoint <code className="bg-gray-100 px-1 rounded">/api/transactions/spending-capacity</code>).
            </p>
          </div>
        </div>
      </div>
    )
  }

  const capacityDisplay = Number(cap.bankBalance) + Number(cap.expectedIncome) - Number(cap.creditCardDebt)
  const isPositive = capacityDisplay >= 0

  const pending = cap.pendingIncomeList ?? []

  return (
    <div className={`card p-5 border-l-4 ${isPositive ? 'border-emerald-500' : 'border-red-500'}`}>
      {/* Header clicável */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}>
            <Wallet size={18} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm text-gray-500">Previsão de Gastos</p>
            <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-700' : 'text-red-600'}`}>
              {hideBalance ? '***' : formatCurrency(capacityDisplay)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400 hidden sm:block">
            {isPositive ? 'Você pode gastar este valor' : 'Atenção: saldo insuficiente'}
          </span>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">

          {/* Saldo em contas */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">+ Saldo em contas</span>
            <span className="font-semibold text-blue-600">{hideBalance ? '***' : formatCurrency(cap.bankBalance)}</span>
          </div>

          {/* Receitas do mês */}
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">+ Receitas do mês</span>
              <span className="font-semibold text-green-600">{hideBalance ? '***' : formatCurrency(cap.expectedIncome)}</span>
            </div>
            {/* Lista de receitas pendentes */}
            {pending.length > 0 && (
              <div className="mt-2 ml-3 space-y-2">
                {pending.map(income => (
                  <div key={income.id} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-500 truncate flex-1">{income.description}</span>
                      <span className="text-gray-700 font-medium shrink-0">{hideBalance ? '***' : formatCurrency(income.amount)}</span>
                      <span className="text-gray-400 shrink-0">{formatDate(income.date)}</span>
                      {receivingId === income.id ? (
                        <button onClick={cancelReceive} className="text-gray-400 hover:text-gray-600 shrink-0">
                          <X size={13} />
                        </button>
                      ) : (
                        <button
                          onClick={() => openReceive(income)}
                          className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shrink-0"
                        >
                          Receber
                        </button>
                      )}
                    </div>
                    {/* Seletor de conta inline */}
                    {receivingId === income.id && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <select
                          className="select text-xs py-1 flex-1"
                          value={selectedAccountId}
                          onChange={e => setSelectedAccountId(e.target.value)}
                        >
                          <option value="">Selecione a conta...</option>
                          {accounts.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={confirmReceive}
                          disabled={!selectedAccountId || receiving}
                          className="p-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                          title="Confirmar recebimento"
                        >
                          <Check size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dívida em cartões */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">− Dívida em cartões</span>
            <span className="font-semibold text-purple-600">{hideBalance ? '***' : formatCurrency(cap.creditCardDebt)}</span>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between text-sm font-bold border-t border-dashed border-gray-200 pt-2 mt-1">
            <span className="text-gray-800">= Previsão de gastos</span>
            <span className={isPositive ? 'text-emerald-700' : 'text-red-600'}>
              {hideBalance ? '***' : formatCurrency(capacityDisplay)}
            </span>
          </div>

        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [showQuickExpense, setShowQuickExpense] = useState(false)
  const [selectedCat, setSelectedCat] = useState(null)
  const { hideBalance, toggleHideBalance } = useBalanceVisibility()

  const loadRecent = () => {
    const today = new Date().toISOString().split('T')[0]
    return transactionService.list({ size: 5, sort: 'id,desc', to: today })
      .then(r => setRecentTransactions(r.content ?? []))
  }

  const load = () => {
    setLoading(true)
    Promise.all([
      transactionService.dashboard().then(setData),
      loadRecent(),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSliceClick = (slice) => {
    setSelectedCat(prev =>
      prev?.categoryId === slice.categoryId ? null : slice
    )
  }

  if (loading) return <p className="text-gray-500">Carregando...</p>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleHideBalance}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors ${hideBalance ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
          >
            {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
            {hideBalance ? 'Saldo oculto' : 'Esconder saldo'}
          </button>
          <button onClick={() => setShowQuickExpense(true)} className="btn-primary">
            <Plus size={16} /> Despesa rápida
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <SummaryCard title="Saldo em Contas" value={data.totalBalance} icon={Landmark} color="bg-blue-500" />
        <SummaryCard title="Dívida em Cartões" value={data.totalCreditCardBalance} icon={CreditCard} color="bg-purple-500" />
        <SummaryCard title="Dinheiro Guardado" value={data.totalSavings} icon={PiggyBank} color="bg-emerald-500" />
        <SummaryCard title="Receitas do Mês" value={data.incomeCurrentMonth} icon={TrendingUp} color="bg-green-500" />
        <SummaryCard title="Despesas do Mês" value={data.expensesCurrentMonth} icon={TrendingDown} color="bg-red-500" />
      </div>

      <SpendingCapacityWidget />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de pizza */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Despesas por Categoria</h2>
          <PieChart
            data={data.expensesByCategory}
            selectedCatId={selectedCat?.categoryId}
            onSliceClick={handleSliceClick}
          />
        </div>

        {/* Painel direito: últimas transações OU transações da categoria */}
        <div className="card p-5 flex flex-col">
          {selectedCat ? (
            <CategoryPanel cat={selectedCat} onClose={() => setSelectedCat(null)} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800">Últimas Transações</h2>
                <Link to="/transactions" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  Ver todas <ArrowRight size={14} />
                </Link>
              </div>
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma transação registrada.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {recentTransactions.map((t) => (
                    <li key={t.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.description}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(t.date)}
                          {t.categoryName && ` · ${t.categoryName}`}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                        {hideBalance ? '***' : `${t.type === 'INCOME' ? '+' : '-'}${formatCurrency(t.amount)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {showQuickExpense && (
        <QuickExpenseModal
          onClose={() => setShowQuickExpense(false)}
          onSuccess={() => { setShowQuickExpense(false); load() }}
        />
      )}
    </div>
  )
}
