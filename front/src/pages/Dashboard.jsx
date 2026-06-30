import { useEffect, useState } from 'react'
import { transactionService } from '../services/transactionService'
import { accountService } from '../services/accountService'
import { categoryService } from '../services/categoryService'
import { creditCardService } from '../services/creditCardService'
import { establishmentService } from '../services/establishmentService'
import { TrendingUp, TrendingDown, Landmark, CreditCard, PiggyBank, Plus, ArrowRight, Wallet, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Check, Eye, EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import Modal from '../components/ui/Modal'
import CurrencyInput from '../components/ui/CurrencyInput'
import LifestyleInflationWidget from '../components/dashboard/LifestyleInflationWidget'
import { useBalanceVisibility } from '../context/BalanceVisibilityContext'
import styles from './Dashboard.module.css'

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

function SummaryCard({ title, value, icon: Icon, color, sub }) {
  const { hideBalance } = useBalanceVisibility()
  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryCardTopRow}>
        <span className={styles.summaryLabel}>{title}</span>
        <div className={`${styles.summaryIcon} ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className={styles.summaryValue}>{hideBalance ? '***' : formatCurrency(value)}</p>
      {sub && <p className={styles.summarySubtext}>{sub}</p>}
    </div>
  )
}

function ExpenseCard({ total, real, sub }) {
  const { hideBalance } = useBalanceVisibility()
  const covered = Number(total ?? 0) - Number(real ?? 0)
  const hasThirdParty = covered > 0.005

  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryCardTopRow}>
        <span className={styles.summaryLabel}>Despesas</span>
        <div className={`${styles.summaryIcon} bg-red-500`}>
          <TrendingDown size={16} className="text-white" />
        </div>
      </div>
      {hasThirdParty ? (
        <>
          <div className={styles.expenseRealRow}>
            <p className={styles.summaryValueExpense}>{hideBalance ? '***' : formatCurrency(real)}</p>
            <span className={styles.expenseRealLabel}>reais</span>
          </div>
          <div className={styles.expenseThirdPartyRow}>
            <span className={styles.expenseTotalLabel}>Total: {hideBalance ? '***' : formatCurrency(total)}</span>
            <span className={styles.expenseSavedLabel}>
              -{hideBalance ? '***' : formatCurrency(covered)} terc.
            </span>
          </div>
          {sub && <p className={styles.summarySubtext}>{sub}</p>}
        </>
      ) : (
        <>
          <p className={styles.summaryValue}>{hideBalance ? '***' : formatCurrency(total)}</p>
          {sub && <p className={styles.summarySubtext}>{sub}</p>}
        </>
      )}
    </div>
  )
}

function PieChart({ data, selectedCatId, onSliceClick }) {
  const [hovered, setHovered] = useState(null)
  const { hideBalance } = useBalanceVisibility()

  const total = data.reduce((sum, d) => sum + Number(d.total), 0)

  if (data.length === 0 || total === 0) {
    return <p className={styles.emptyTransactionsText}>Nenhuma despesa registrada este mês.</p>
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
    <div className={styles.pieChartLayout}>
      <div className={styles.pieChartSvgWrapper}>
        <svg width="180" height="180" viewBox="-14 -14 228 228" style={{ overflow: 'visible' }} className="sm:w-[220px] sm:h-[220px]">
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

      <ul className={styles.pieCategoryList}>
        {slices.slice(0, 8).map((c) => {
          const isSelected = c.categoryId === selectedCatId
          return (
            <li key={c.categoryId ?? 'none'}
              className={`${styles.pieCategoryItem} ${isSelected ? styles.pieCategoryItemSelected : styles.pieCategoryItemDefault}`}
              onClick={() => onSliceClick(c)}>
              <span className={styles.pieCategoryDot}
                style={{ background: c.categoryColor ?? '#94a3b8' }} />
              <span className={`${styles.pieCategoryName} ${isSelected ? styles.pieCategoryNameSelected : styles.pieCategoryNameDefault}`}>
                {c.categoryName ?? 'Sem categoria'}
              </span>
              <span className={styles.pieCategoryAmount}>{hideBalance ? '***' : formatCurrency(c.total)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function CategoryPanel({ cat, onClose, from, to }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const { hideBalance } = useBalanceVisibility()

  useEffect(() => {
    setLoading(true)
    const params = { size: 50, from, to }
    if (cat.categoryId) params.categoryId = cat.categoryId
    else params.noCategory = true
    transactionService.list(params)
      .then(r => setTransactions(r.content ?? []))
      .finally(() => setLoading(false))
  }, [cat.categoryId, from, to])

  return (
    <div className="flex flex-col h-full">
      <div className={styles.categoryPanelHeader}>
        <div className={styles.categoryPanelTitleRow}>
          <span className={styles.categoryPanelDot}
            style={{ background: cat.categoryColor ?? '#94a3b8' }} />
          <h2 className={styles.categoryPanelTitle}>
            {cat.categoryName ?? 'Sem categoria'}
          </h2>
          <span className={styles.categoryPanelTotal}>· {hideBalance ? '***' : formatCurrency(cat.total)}</span>
        </div>
        <button onClick={onClose} className={styles.categoryPanelCloseButton} title="Voltar para últimas transações">
          <X size={16} />
        </button>
      </div>

      {loading ? (
        <p className={styles.categoryPanelEmptyText}>Carregando...</p>
      ) : transactions.length === 0 ? (
        <p className={styles.categoryPanelEmptyText}>Nenhuma transação encontrada.</p>
      ) : (
        <div className={styles.categoryPanelList}>
          {transactions.map(t => (
            <div key={t.id} className={styles.categoryPanelItem}>
              <div className={styles.categoryPanelItemInfo}>
                <p className={styles.categoryPanelItemName}>{t.description}</p>
                <p className={styles.categoryPanelItemMeta}>
                  {formatDate(t.date)}
                  {t.accountName ? ` · ${t.accountName}` : ''}
                  {t.creditCardName ? ` · ${t.creditCardName}` : ''}
                </p>
              </div>
              <span className={styles.categoryPanelItemAmount}>
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
        <div className={styles.quickExpenseDescriptionWrapper}>
          <label className="label">Descrição *</label>
          <input className="input" required autoComplete="off" value={form.description}
            onChange={e => { set('description', e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
          {showSuggestions && filteredEstablishments.length > 0 && (
            <div className={styles.quickExpenseSuggestions}>
              {filteredEstablishments.map(e => (
                <button key={e.id} type="button"
                  className={styles.suggestionItem}
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
          <div className={styles.paymentTypeRow}>
            <button type="button" onClick={() => setPaymentType('account')}
              className={`${styles.paymentTypeButtonAccount} ${paymentType === 'account' ? styles.paymentTypeButtonAccountActive : styles.paymentTypeButtonAccountInactive}`}>
              Conta bancária
            </button>
            <button type="button" onClick={() => setPaymentType('card')}
              className={`${styles.paymentTypeButtonCard} ${paymentType === 'card' ? styles.paymentTypeButtonCardActive : styles.paymentTypeButtonCardInactive}`}>
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
          <div className={styles.recurrenceRow}>
            {[
              { value: 'NONE', label: 'Único' },
              { value: 'SUBSCRIPTION', label: 'Assinatura' },
              { value: 'INSTALLMENT', label: 'Parcelado' },
            ].map(opt => (
              <button key={opt.value} type="button" onClick={() => setRecurrenceType(opt.value)}
                className={`${styles.recurrenceButton} ${recurrenceType === opt.value ? styles.recurrenceButtonActive : styles.recurrenceButtonInactive}`}>
                {opt.label}
              </button>
            ))}
          </div>
          {recurrenceType === 'SUBSCRIPTION' && (
            <p className={styles.subscriptionNote}>A despesa será criada automaticamente todo mês até você cancelar.</p>
          )}
        </div>

        {recurrenceType === 'INSTALLMENT' && (
          <div className={styles.installmentSection}>
            <div>
              <label className="label">Parcela atual *</label>
              <input className="input" type="number" min="1" required value={form.installmentNumber} onChange={e => set('installmentNumber', e.target.value)} />
            </div>
            <div>
              <label className="label">Total de parcelas *</label>
              <input className="input" type="number" min="2" required value={form.installmentTotal} onChange={e => set('installmentTotal', e.target.value)} />
            </div>
            <p className={styles.installmentNote}>As parcelas restantes serão lançadas automaticamente nos meses seguintes.</p>
          </div>
        )}

        <div>
          <label className="label">Categoria</label>
          <select className="select" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
            <option value="">Sem categoria</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className={styles.formActions}>
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
  const [receivingId, setReceivingId] = useState(null)
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
    if (accounts.length === 0) accountService.list().then(setAccounts)
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
      <div className={styles.widgetCardSkeleton}>
        <div className={styles.widgetCardSkeletonInner}>
          <div className={styles.widgetSkeletonIcon} />
          <div className={styles.widgetSkeletonTextGroup}>
            <div className={styles.widgetSkeletonLine1} />
            <div className={styles.widgetSkeletonLine2} />
          </div>
        </div>
      </div>
    )
  }

  if (error || !cap) {
    return (
      <div className={`${styles.widgetCard} ${styles.widgetCardWarning}`}>
        <div className={styles.widgetToggleLeft}>
          <div className={`${styles.widgetIcon} ${styles.widgetIconWarning}`}>
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
    <div className={`${styles.widgetCard} ${isPositive ? styles.widgetCardPositive : styles.widgetCardNegative}`}>
      <button onClick={() => setOpen(o => !o)} className={styles.widgetToggleButton}>
        <div className={styles.widgetToggleLeft}>
          <div className={`${styles.widgetIcon} ${isPositive ? styles.widgetIconPositive : styles.widgetIconNegative}`}>
            <Wallet size={18} className="text-white" />
          </div>
          <div className={styles.widgetTextGroup}>
            <p className={styles.widgetLabel}>Previsão de Gastos</p>
            <p className={isPositive ? styles.widgetValuePositive : styles.widgetValueNegative}>
              {hideBalance ? '***' : formatCurrency(capacityDisplay)}
            </p>
          </div>
        </div>
        <div className={styles.widgetToggleRight}>
          <span className={styles.widgetToggleHint}>
            {isPositive ? 'Você pode gastar este valor' : 'Atenção: saldo insuficiente'}
          </span>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className={styles.widgetExpandedBody}>
          <div className={styles.widgetDetailRow}>
            <span className={styles.widgetDetailLabel}>+ Saldo em contas</span>
            <span className={styles.widgetDetailValueBlue}>{hideBalance ? '***' : formatCurrency(cap.bankBalance)}</span>
          </div>

          <div>
            <div className={styles.widgetDetailRow}>
              <span className={styles.widgetDetailLabel}>+ Receitas do mês</span>
              <span className={styles.widgetDetailValueGreen}>{hideBalance ? '***' : formatCurrency(cap.expectedIncome)}</span>
            </div>
            {pending.length > 0 && (
              <div className={styles.pendingIncomeList}>
                {pending.map(income => (
                  <div key={income.id} className={styles.pendingIncomeItem}>
                    <div className={styles.pendingIncomeRow}>
                      <span className={styles.pendingIncomeDescription}>{income.description}</span>
                      <span className={styles.pendingIncomeAmount}>{hideBalance ? '***' : formatCurrency(income.amount)}</span>
                      <span className={styles.pendingIncomeDate}>{formatDate(income.date)}</span>
                      {receivingId === income.id ? (
                        <button onClick={cancelReceive} className={styles.pendingIncomeCancelButton}>
                          <X size={13} />
                        </button>
                      ) : (
                        <button onClick={() => openReceive(income)} className={styles.receiveButton}>
                          Receber
                        </button>
                      )}
                    </div>
                    {receivingId === income.id && (
                      <div className={styles.receiveAccountSelector}>
                        <select className={styles.receiveAccountSelect} value={selectedAccountId}
                          onChange={e => setSelectedAccountId(e.target.value)}>
                          <option value="">Selecione a conta...</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <button onClick={confirmReceive} disabled={!selectedAccountId || receiving}
                          className={styles.receiveConfirmButton} title="Confirmar recebimento">
                          <Check size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.widgetDetailRow}>
            <span className={styles.widgetDetailLabel}>− Dívida em cartões</span>
            <span className={styles.widgetDetailValuePurple}>{hideBalance ? '***' : formatCurrency(cap.creditCardDebt)}</span>
          </div>

          <div className={styles.widgetTotalRow}>
            <span className={styles.widgetTotalLabel}>= Previsão de gastos</span>
            <span className={isPositive ? styles.widgetValuePositive : styles.widgetValueNegative}>
              {hideBalance ? '***' : formatCurrency(capacityDisplay)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function monthLabel(year, month) {
  return new Date(year, month - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
}

function prevYM({ year, month }) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

function nextYM({ year, month }) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

export default function Dashboard() {
  const now = new Date()
  const todayYM = { year: now.getFullYear(), month: now.getMonth() + 1 }
  const defaultYM = nextYM(todayYM)
  const [selectedYM, setSelectedYM] = useState(defaultYM)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [showQuickExpense, setShowQuickExpense] = useState(false)
  const [selectedCat, setSelectedCat] = useState(null)
  const { hideBalance, toggleHideBalance } = useBalanceVisibility()

  const isCurrentMonth =
    selectedYM.year === defaultYM.year && selectedYM.month === defaultYM.month

  const periodFrom = `${selectedYM.year}-${String(selectedYM.month).padStart(2, '0')}-01`
  const periodTo = new Date(selectedYM.year, selectedYM.month, 0).toISOString().split('T')[0]

  const load = (ym = selectedYM) => {
    setLoading(true)
    transactionService.dashboard(ym.year, ym.month)
      .then(d => {
        setData(d)
        setRecentTransactions(d.recentTransactions ?? [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setSelectedCat(null)
    load(selectedYM)
  }, [selectedYM.year, selectedYM.month])

  const handleSliceClick = (slice) => {
    setSelectedCat(prev => prev?.categoryId === slice.categoryId ? null : slice)
  }

  if (loading) return <p className="text-gray-500">Carregando...</p>
  if (!data) return null

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeaderSection}>
        <div className={styles.pageHeaderRow}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <div className={styles.pageHeaderActions}>
            <button onClick={toggleHideBalance}
              className={`${styles.balanceToggleButton} ${hideBalance ? styles.balanceToggleHidden : styles.balanceToggleVisible}`}>
              {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className={styles.balanceToggleLabel}>{hideBalance ? 'Saldo oculto' : 'Esconder saldo'}</span>
            </button>
            <button onClick={() => setShowQuickExpense(true)} className="btn-primary">
              <Plus size={16} />
              <span className="hidden sm:inline">Despesa rápida</span>
            </button>
          </div>
        </div>
        <div className={styles.monthNavRow}>
          <div className={styles.monthNavWrapper}>
            <button onClick={() => setSelectedYM(prevYM(selectedYM))} className={styles.monthNavButton} title="Mês anterior">
              <ChevronLeft size={16} />
            </button>
            <span className={styles.monthNavLabel}>{monthLabel(selectedYM.year, selectedYM.month)}</span>
            <button onClick={() => setSelectedYM(nextYM(selectedYM))} className={styles.monthNavButton} title="Próximo mês">
              <ChevronRight size={16} />
            </button>
          </div>
          {!isCurrentMonth && (
            <button onClick={() => setSelectedYM(defaultYM)} className={styles.currentMonthLink}>
              Mês atual
            </button>
          )}
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <SummaryCard title="Saldo em Contas" value={data.totalBalance} icon={Landmark} color="bg-blue-500" sub="Saldo atual" />
        <SummaryCard title="Dívida em Cartões" value={data.totalCreditCardBalance} icon={CreditCard} color="bg-purple-500" sub="Saldo atual" />
        <SummaryCard title="Dinheiro Guardado" value={data.totalSavings} icon={PiggyBank} color="bg-emerald-500" sub="Saldo atual" />
        <SummaryCard title="Receitas" value={data.incomeCurrentMonth} icon={TrendingUp} color="bg-green-500" sub={monthLabel(selectedYM.year, selectedYM.month)} />
        <ExpenseCard total={data.expensesCurrentMonth} real={data.realExpensesCurrentMonth} sub={monthLabel(selectedYM.year, selectedYM.month)} />
      </div>

      <SpendingCapacityWidget />

      <LifestyleInflationWidget />

      <div className={styles.contentGrid}>
        <div className={styles.pieChartCard}>
          <h2 className={styles.pieChartTitle}>
            Despesas por Categoria
            {!isCurrentMonth && (
              <span className={styles.pieChartTitleMonthLabel}>
                {monthLabel(selectedYM.year, selectedYM.month)}
              </span>
            )}
          </h2>
          <PieChart
            data={data.expensesByCategory}
            selectedCatId={selectedCat?.categoryId}
            onSliceClick={handleSliceClick}
          />
        </div>

        <div className={styles.recentTransactionsCard}>
          {selectedCat ? (
            <CategoryPanel cat={selectedCat} onClose={() => setSelectedCat(null)} from={periodFrom} to={periodTo} />
          ) : (
            <>
              <div className={styles.recentTransactionsHeader}>
                <h2 className={styles.recentTransactionsTitle}>
                  Últimas Transações
                  {!isCurrentMonth && (
                    <span className={styles.recentTransactionsTitleMonthLabel}>
                      {monthLabel(selectedYM.year, selectedYM.month)}
                    </span>
                  )}
                </h2>
                <Link to="/transactions" className={styles.viewAllLink}>
                  Ver todas <ArrowRight size={14} />
                </Link>
              </div>
              {recentTransactions.length === 0 ? (
                <p className={styles.emptyTransactionsText}>Nenhuma transação neste mês.</p>
              ) : (
                <ul className={styles.transactionsList}>
                  {recentTransactions.map((t) => (
                    <li key={t.id} className={styles.transactionItem}>
                      <div className={styles.transactionInfo}>
                        <p className={styles.transactionName}>{t.description}</p>
                        <p className={styles.transactionMeta}>
                          {formatDate(t.date)}
                          {t.categoryName && ` · ${t.categoryName}`}
                        </p>
                      </div>
                      <span className={t.type === 'INCOME' ? styles.transactionAmountIncome : styles.transactionAmountExpense}>
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
          onSuccess={() => { setShowQuickExpense(false); load(selectedYM) }}
        />
      )}
    </div>
  )
}
