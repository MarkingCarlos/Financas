import { useEffect, useState, useCallback, useMemo } from 'react'
import { transactionService } from '../services/transactionService'
import { accountService } from '../services/accountService'
import { creditCardService } from '../services/creditCardService'
import { categoryService } from '../services/categoryService'
import { establishmentService } from '../services/establishmentService'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import CurrencyInput from '../components/ui/CurrencyInput'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Search, CreditCard, Landmark, Users, X } from 'lucide-react'
import { useBalanceVisibility } from '../context/BalanceVisibilityContext'
import styles from './Transactions.module.css'

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}
function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}
function formatBillMonth(d) {
  if (!d) return '—'
  const [year, month] = d.split('-')
  return `${MONTHS[parseInt(month) - 1]}/${year}`
}
function billDate(month, year) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function TransactionForm({ initial, accounts, cards, categories, establishments, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(() => {
    const now = new Date()
    const isCC = !!(initial?.creditCardId)
    const base = initial ?? {
      type: 'EXPENSE', description: '', amount: '', date: now.toISOString().split('T')[0],
      categoryId: '', accountId: '', creditCardId: '', notes: '',
      recurrenceType: 'NONE', installmentNumber: 1, installmentTotal: 2,
      thirdParty: false, thirdPartyPerson: '', thirdPartyAmount: '',
    }
    const billMonth = isCC ? parseInt(base.date.split('-')[1]) : now.getMonth() + 1
    const billYear  = isCC ? parseInt(base.date.split('-')[0]) : now.getFullYear()
    return {
      ...base,
      billMonth,
      billYear,
      amount: base.amount !== '' && base.amount != null ? Number(base.amount).toFixed(2) : '',
      recurrenceType: base.recurrenceType ?? 'NONE',
      installmentNumber: base.installmentNumber ?? 1,
      installmentTotal: base.installmentTotal ?? 2,
      thirdParty: base.thirdParty ?? false,
      thirdPartyPerson: base.thirdPartyPerson ?? '',
      thirdPartyAmount: base.thirdPartyAmount != null ? Number(base.thirdPartyAmount).toFixed(2) : '',
    }
  })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isExpense = form.type === 'EXPENSE'

  const filteredEstablishments = form.description.length > 0
    ? establishments.filter(e => e.name.toLowerCase().includes(form.description.toLowerCase()))
    : []

  const selectEstablishment = (e) => {
    setForm(f => ({ ...f, description: e.name, categoryId: e.categoryId ?? f.categoryId }))
    setShowSuggestions(false)
  }

  return (
    <form onSubmit={ev => { ev.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div className={styles.transactionTypeToggle}>
        <button type="button"
          className={`${styles.typeButtonExpense} ${form.type === 'EXPENSE' ? styles.typeButtonExpenseActive : styles.typeButtonExpenseInactive}`}
          onClick={() => set('type', 'EXPENSE')}>Despesa</button>
        <button type="button"
          className={`${styles.typeButtonIncome} ${form.type === 'INCOME' ? styles.typeButtonIncomeActive : styles.typeButtonIncomeInactive}`}
          onClick={() => set('type', 'INCOME')}>Receita</button>
      </div>

      <div className="relative">
        <label className="label">Descrição *</label>
        <input className="input" required autoComplete="off" value={form.description}
          onChange={e => { set('description', e.target.value); setShowSuggestions(true) }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
        {showSuggestions && filteredEstablishments.length > 0 && (
          <div className={styles.suggestionDropdown}>
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
        {isExpense && form.creditCardId ? (
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mês da fatura *</label>
              <select className="select" value={form.billMonth} onChange={e => {
                const m = parseInt(e.target.value)
                setForm(f => ({ ...f, billMonth: m, date: billDate(m, f.billYear) }))
              }}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ano *</label>
              <input className="input" type="number" min={2020} max={2100} value={form.billYear}
                onChange={e => {
                  const y = parseInt(e.target.value)
                  setForm(f => ({ ...f, billYear: y, date: billDate(f.billMonth, y) }))
                }} />
            </div>
          </div>
        ) : (
          <div>
            <label className="label">Data *</label>
            <input className="input" type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
        )}
      </div>

      <div>
        <label className="label">Tipo de gasto</label>
        <div className={styles.recurrenceRow}>
          {[
            { value: 'NONE', label: 'Único' },
            { value: 'SUBSCRIPTION', label: 'Assinatura' },
            { value: 'INSTALLMENT', label: 'Parcelado' },
          ].map(opt => (
            <button key={opt.value} type="button"
              onClick={() => set('recurrenceType', opt.value)}
              className={`${styles.recurrenceButton} ${form.recurrenceType === opt.value ? styles.recurrenceButtonActive : styles.recurrenceButtonInactive}`}>
              {opt.label}
            </button>
          ))}
        </div>
        {form.recurrenceType === 'SUBSCRIPTION' && (
          <p className={styles.subscriptionNote}>Será lançada automaticamente todo mês.</p>
        )}
      </div>

      {form.recurrenceType === 'INSTALLMENT' && (
        <div className={styles.installmentSection}>
          <div>
            <label className="label">Parcela atual *</label>
            <input className="input" type="number" min="1" required
              value={form.installmentNumber}
              onChange={e => set('installmentNumber', e.target.value)} />
          </div>
          <div>
            <label className="label">Total de parcelas *</label>
            <input className="input" type="number" min="2" required
              value={form.installmentTotal}
              onChange={e => set('installmentTotal', e.target.value)} />
          </div>
          <p className={styles.installmentNote}>
            As parcelas restantes serão lançadas automaticamente nos meses seguintes.
          </p>
        </div>
      )}

      <div>
        <label className="label">Categoria</label>
        <select className="select" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
          <option value="">Sem categoria</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isExpense && (
        <div className={styles.accountCardRow}>
          <div>
            <label className="label">Conta bancária</label>
            <select className="select" value={form.accountId} onChange={e => { set('accountId', e.target.value); if (e.target.value) { set('creditCardId', ''); set('thirdParty', false) } }}>
              <option value="">Nenhuma</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cartão de crédito</label>
            <select className="select" value={form.creditCardId} onChange={e => {
              const val = e.target.value
              const selectedCard = cards.find(c => c.id === val)
              const openBill = selectedCard?.bills?.find(b => b.status === 'ABERTA')
              setForm(f => {
                const m = openBill ? openBill.mes : f.billMonth
                const y = openBill ? openBill.ano : f.billYear
                return {
                  ...f,
                  creditCardId: val,
                  accountId: val ? '' : f.accountId,
                  billMonth: val ? m : f.billMonth,
                  billYear: val ? y : f.billYear,
                  date: val ? billDate(m, y) : new Date().toISOString().split('T')[0],
                }
              })
            }}>
              <option value="">Nenhum</option>
              {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {isExpense && form.creditCardId && (
        <div className={`${styles.thirdPartySection} ${form.thirdParty ? styles.thirdPartySectionActive : styles.thirdPartySectionInactive}`}>
          <label className={styles.thirdPartyToggleLabel}>
            <div
              onClick={() => set('thirdParty', !form.thirdParty)}
              className={`${styles.thirdPartyToggleTrack} ${form.thirdParty ? styles.thirdPartyToggleTrackOn : styles.thirdPartyToggleTrackOff}`}
            >
              <span className={`${styles.thirdPartyToggleThumb} ${form.thirdParty ? styles.thirdPartyToggleThumbOn : styles.thirdPartyToggleThumbOff}`} />
            </div>
            <span className={styles.thirdPartyToggleName}>
              <Users size={14} /> Compra de terceiro
            </span>
          </label>
          {form.thirdParty && (
            <div className={styles.thirdPartyFields}>
              <div className={styles.thirdPartyFieldFull}>
                <label className="label">Pessoa *</label>
                <input className="input" placeholder="Nome de quem fez a compra"
                  value={form.thirdPartyPerson} onChange={e => set('thirdPartyPerson', e.target.value)} required />
              </div>
              <div className={styles.thirdPartyFieldFull}>
                <label className="label">Valor repassado por parcela *</label>
                <CurrencyInput className="input" value={form.thirdPartyAmount}
                  onChange={v => set('thirdPartyAmount', v)} required />
                {form.thirdPartyAmount && form.amount && (() => {
                  const repayment = parseFloat(form.thirdPartyAmount)
                  const total = parseFloat(form.amount)
                  if (!isNaN(repayment) && !isNaN(total)) {
                    const diff = repayment - total
                    if (diff > 0) return (
                      <p className={styles.thirdPartyExcessNote}>
                        Excedente de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(diff)} será adicionado como receita.
                      </p>
                    )
                    if (diff < 0) return (
                      <p className={styles.thirdPartyPartNote}>
                        Sua parte no cartão: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(-diff)}
                      </p>
                    )
                    return <p className={styles.thirdPartyNeutralNote}>Compra não contabilizada no cartão.</p>
                  }
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="label">Observações</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>

      <div className={styles.formActions}>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </form>
  )
}

function GroupDetailModal({ transaction, onClose }) {
  const [rows, setRows] = useState([])
  const [loadingGroup, setLoadingGroup] = useState(true)
  const isInstallment = transaction.recurrenceType === 'INSTALLMENT'
  const { hideBalance } = useBalanceVisibility()

  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0]

  const getStatus = (date) => {
    if (date > today)         return { label: 'Futuro',     cls: 'bg-gray-100 text-gray-500' }
    if (date >= firstOfMonth) return { label: 'Em aberto',  cls: 'bg-orange-100 text-orange-700' }
    return                           { label: 'Pago',        cls: 'bg-green-100 text-green-700' }
  }

  useEffect(() => {
    transactionService.listGroup(transaction.recurrenceGroupId)
      .then(setRows)
      .finally(() => setLoadingGroup(false))
  }, [transaction.recurrenceGroupId])

  const paidCount = rows.filter(r => r.date < firstOfMonth).length

  return (
    <Modal title={transaction.description} onClose={onClose}>
      <div className="space-y-4">
        <div className={styles.groupDetailBadgeRow}>
          {isInstallment ? (
            <span className={styles.badgeGroupInstallment}>
              {paidCount}/{rows.length} parcelas pagas
            </span>
          ) : (
            <span className={styles.badgeGroupSubscription}>
              Assinatura · {paidCount} cobranças pagas
            </span>
          )}
          {transaction.categoryName && (
            <span className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: (transaction.categoryColor ?? '#e5e7eb') + '33', color: transaction.categoryColor ?? '#374151' }}>
              {transaction.categoryName}
            </span>
          )}
          {transaction.creditCardName && (
            <span className={styles.groupDetailCCBadge}>
              <CreditCard size={12} /> {transaction.creditCardName}
            </span>
          )}
          {transaction.accountName && (
            <span className={styles.groupDetailAccountBadge}>
              <Landmark size={12} /> {transaction.accountName}
            </span>
          )}
        </div>

        {loadingGroup ? (
          <p className="text-sm text-gray-400 py-8 text-center">Carregando...</p>
        ) : (
          <div className={styles.groupDetailTableWrapper}>
            <table className={styles.groupDetailTable}>
              <thead className={styles.groupDetailTableHead}>
                <tr className="text-left text-gray-500">
                  {isInstallment && <th className={styles.groupDetailTableHeadCell}>Parcela</th>}
                  <th className={styles.groupDetailTableHeadCell}>{transaction.creditCardId ? 'Fatura' : 'Data'}</th>
                  <th className={styles.groupDetailTableHeadCell}>Valor</th>
                  <th className={styles.groupDetailTableHeadCell}>Status</th>
                </tr>
              </thead>
              <tbody className={styles.groupDetailTableBody}>
                {rows.map(r => {
                  const status = getStatus(r.date)
                  return (
                    <tr key={r.id} className={r.date > today ? styles.tableRowFuture : ''}>
                      {isInstallment && (
                        <td className={styles.groupDetailInstallmentCell}>
                          {r.installmentNumber}/{r.installmentTotal}
                        </td>
                      )}
                      <td className={styles.groupDetailDateCell}>
                        {transaction.creditCardId ? formatBillMonth(r.date) : formatDate(r.date)}
                      </td>
                      <td className={styles.groupDetailAmountCell}>{hideBalance ? '***' : formatCurrency(r.amount)}</td>
                      <td className={styles.groupDetailStatusCell}>
                        <span className={`${styles.statusBadge} ${status.cls}`}>{status.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}

const CLIENT_PAGE_SIZE = 20

export default function Transactions() {
  const [data, setData] = useState({ content: [] })
  const [accounts, setAccounts] = useState([])
  const [cards, setCards] = useState([])
  const [categories, setCategories] = useState([])
  const [establishments, setEstablishments] = useState([])
  const [modal, setModal] = useState(null)
  const [groupModal, setGroupModal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [clientPage, setClientPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const { hideBalance } = useBalanceVisibility()

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchDraft); setClientPage(0) }, 350)
    return () => clearTimeout(t)
  }, [searchDraft])

  const load = useCallback(() => {
    const params = { size: 500 }
    if (typeFilter) params.type = typeFilter
    if (search) params.search = search
    transactionService.list(params).then(setData)
  }, [typeFilter, search])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    accountService.list().then(setAccounts)
    creditCardService.list().then(setCards)
    categoryService.list().then(setCategories)
    establishmentService.list().then(setEstablishments)
  }, [])

  useEffect(() => { setClientPage(0); setSelectedIds(new Set()) }, [typeFilter, search])

  const groupedTransactions = useMemo(() => {
    const all = data.content ?? []
    if (search) return all

    const today = new Date().toISOString().split('T')[0]

    const groups = {}
    for (const t of all) {
      if (t.recurrenceGroupId) {
        if (!groups[t.recurrenceGroupId]) groups[t.recurrenceGroupId] = []
        groups[t.recurrenceGroupId].push(t)
      }
    }

    const groupMeta = {}
    for (const [id, members] of Object.entries(groups)) {
      const paid = members.filter(t => t.date <= today).sort((a, b) => b.date.localeCompare(a.date))
      const future = members.filter(t => t.date > today).sort((a, b) => a.date.localeCompare(b.date))
      const rep = paid[0] ?? future[0]
      const paidCount = paid[0]?.installmentNumber
        ?? (future[0] ? future[0].installmentNumber - 1 : 0)
      groupMeta[id] = { rep, paidCount, totalCount: members.length }
    }

    const seen = new Set()
    const result = []
    for (const t of all) {
      if (!t.recurrenceGroupId) {
        result.push(t)
      } else if (!seen.has(t.recurrenceGroupId)) {
        seen.add(t.recurrenceGroupId)
        const { rep, paidCount, totalCount } = groupMeta[t.recurrenceGroupId]
        result.push({ ...rep, _paidCount: paidCount, _totalCount: totalCount })
      }
    }

    return result.sort((a, b) =>
      b.date !== a.date
        ? b.date.localeCompare(a.date)
        : (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    )
  }, [data.content, search])

  const totalClientPages = Math.ceil(groupedTransactions.length / CLIENT_PAGE_SIZE)
  const pagedTransactions = groupedTransactions.slice(
    clientPage * CLIENT_PAGE_SIZE,
    (clientPage + 1) * CLIENT_PAGE_SIZE
  )

  const toPayload = (form) => ({
    ...form,
    amount: parseFloat(form.amount),
    categoryId: form.categoryId || null,
    accountId: form.accountId || null,
    creditCardId: form.creditCardId || null,
    recurrenceType: form.recurrenceType || 'NONE',
    installmentNumber: form.recurrenceType === 'INSTALLMENT' ? parseInt(form.installmentNumber) : null,
    installmentTotal: form.recurrenceType === 'INSTALLMENT' ? parseInt(form.installmentTotal) : null,
    thirdParty: !!form.thirdParty,
    thirdPartyPerson: form.thirdParty ? (form.thirdPartyPerson || null) : null,
    thirdPartyAmount: form.thirdParty && form.thirdPartyAmount ? parseFloat(form.thirdPartyAmount) : null,
  })

  const handleCreate = async (form) => {
    setLoading(true)
    try { await transactionService.create(toPayload(form)); setModal(null); load() }
    finally { setLoading(false) }
  }

  const handleUpdate = async (form) => {
    setLoading(true)
    try { await transactionService.update(modal.edit.id, toPayload(form)); setModal(null); load() }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setLoading(true)
    try { await transactionService.remove(modal.delete.id); setModal(null); load() }
    finally { setLoading(false) }
  }

  const handleBulkDelete = async () => {
    setLoading(true)
    try {
      await transactionService.removeMany([...selectedIds])
      setSelectedIds(new Set())
      setModal(null)
      load()
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const pageIds = pagedTransactions.map(t => t.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id))
  const somePageSelected = pageIds.some(id => selectedIds.has(id))

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        pageIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        pageIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Transações</h1>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> Nova Transação
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterButtons}>
          {['', 'EXPENSE', 'INCOME'].map(t => (
            <button key={t}
              onClick={() => setTypeFilter(t)}
              className={`${styles.filterButton} ${typeFilter === t ? styles.filterButtonActive : styles.filterButtonInactive}`}>
              {t === '' ? 'Todas' : t === 'EXPENSE' ? 'Despesas' : 'Receitas'}
            </button>
          ))}
        </div>
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Buscar por nome..."
            value={searchDraft}
            onChange={e => setSearchDraft(e.target.value)}
          />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className={styles.bulkActionBar}>
          <div className={styles.bulkActionInfo}>
            <span className={styles.bulkActionCount}>{selectedIds.size}</span>
            {selectedIds.size === 1 ? 'transação selecionada' : 'transações selecionadas'}
          </div>
          <div className={styles.bulkActionButtons}>
            <button onClick={() => setSelectedIds(new Set())} className={styles.bulkClearButton}>
              <X size={14} /> Limpar seleção
            </button>
            <button
              onClick={() => setModal({ bulkDelete: true })}
              disabled={loading}
              className={styles.bulkDeleteButton}>
              <Trash2 size={14} /> Excluir selecionadas
            </button>
          </div>
        </div>
      )}

      <div className={styles.tableCard}>
        {/* Mobile */}
        <div className={styles.mobileList}>
          {pagedTransactions.length === 0 ? (
            <p className={styles.mobileEmptyState}>Nenhuma transação encontrada.</p>
          ) : pagedTransactions.map(t => {
            const isGroup = t.recurrenceGroupId && t._totalCount > 0
            const isSelected = selectedIds.has(t.id)
            return (
              <div key={t.id} className={`${styles.mobileTransactionRow} ${isSelected ? styles.tableRowSelected : ''}`}>
                <div className={styles.mobileCheckboxWrapper}>
                  <input type="checkbox" className={styles.checkboxInput}
                    checked={isSelected} onChange={() => toggleSelect(t.id)} />
                </div>
                <div className={styles.mobileTransactionContent}>
                  <div className={styles.mobileTransactionNameRow}>
                    <span className={styles.mobileTransactionName}>{t.description}</span>
                    {isGroup && t.recurrenceType === 'SUBSCRIPTION' && (
                      <button onClick={() => setGroupModal(t)} className={styles.badgeSubscriptionMobile}>↻</button>
                    )}
                    {isGroup && t.recurrenceType === 'INSTALLMENT' && (
                      <button onClick={() => setGroupModal(t)} className={styles.badgeInstallmentMobile}>
                        {t._paidCount}/{t.installmentTotal}x
                      </button>
                    )}
                    {t.thirdParty && (
                      <span className={styles.badgeThirdPartyMobile}>
                        <Users size={10} /> {t.thirdPartyPerson}
                      </span>
                    )}
                  </div>
                  <p className={styles.mobileTransactionMeta}>
                    {t.creditCardId ? formatBillMonth(t.date) : formatDate(t.date)}
                    {t.categoryName && ` · ${t.categoryName}`}
                    {(t.creditCardName ?? t.accountName) && ` · ${t.creditCardName ?? t.accountName}`}
                  </p>
                </div>
                <div className={styles.mobileTransactionRight}>
                  <span className={`${styles.mobileTransactionAmount} ${t.type === 'INCOME' ? styles.mobileTransactionAmountIncome : styles.mobileTransactionAmountExpense}`}>
                    {hideBalance ? '***' : `${t.type === 'INCOME' ? '+' : '-'}${formatCurrency(t.amount)}`}
                  </span>
                  <div className={styles.mobileActionButtons}>
                    <button onClick={() => setModal({ edit: { ...t, categoryId: t.categoryId ?? '', accountId: t.accountId ?? '', creditCardId: t.creditCardId ?? '' } })}
                      className={styles.mobileEditButton}><Pencil size={14} /></button>
                    <button onClick={() => setModal({ delete: t })}
                      className={styles.mobileDeleteButton}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop */}
        <div className={styles.desktopTableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.checkboxCellHeader}>
                  <input type="checkbox" className={styles.checkboxInput}
                    checked={allPageSelected}
                    ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                    onChange={toggleSelectAll} />
                </th>
                <th className={styles.tableHeadCell}>Descrição</th>
                <th className={styles.tableHeadCell}>Categoria</th>
                <th className={styles.tableHeadCell}>Conta / Cartão</th>
                <th className={styles.tableHeadCell}>Data</th>
                <th className={styles.tableHeadCellRight}>Valor</th>
                <th className={styles.tableHeadCell} />
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {pagedTransactions.length === 0 ? (
                <tr><td colSpan={7} className={styles.tableEmptyCell}>Nenhuma transação encontrada.</td></tr>
              ) : pagedTransactions.map(t => {
                const isGroup = t.recurrenceGroupId && t._totalCount > 0
                const isSelected = selectedIds.has(t.id)
                return (
                  <tr key={t.id} className={`${styles.tableRow} ${isSelected ? styles.tableRowSelected : ''}`}>
                    <td className={styles.checkboxCell}>
                      <input type="checkbox" className={styles.checkboxInput}
                        checked={isSelected} onChange={() => toggleSelect(t.id)} />
                    </td>
                    <td className={styles.descriptionCell}>
                      <div className={styles.descriptionCellContent}>
                        <div className={styles.descriptionNameRow}>
                          <span className={styles.descriptionName}>{t.description}</span>
                          {isGroup && t.recurrenceType === 'SUBSCRIPTION' && (
                            <button onClick={() => setGroupModal(t)} className={styles.badgeSubscription}>
                              ↻ Assinatura
                            </button>
                          )}
                          {isGroup && t.recurrenceType === 'INSTALLMENT' && (
                            <button onClick={() => setGroupModal(t)} className={styles.badgeInstallment}>
                              {t._paidCount}/{t.installmentTotal} parcelas
                            </button>
                          )}
                          {t.thirdParty && (
                            <span className={styles.badgeThirdParty}>
                              <Users size={11} /> {t.thirdPartyPerson}
                            </span>
                          )}
                        </div>
                        {t.notes && <p className={styles.transactionNotes}>{t.notes}</p>}
                      </div>
                    </td>
                    <td className={styles.categoryCell}>
                      {t.categoryName ? (
                        <span className={styles.categoryChip}
                          style={{ background: (t.categoryColor ?? '#e5e7eb') + '33', color: t.categoryColor ?? '#374151' }}>
                          {t.categoryName}
                        </span>
                      ) : <span className={styles.categoryEmpty}>—</span>}
                    </td>
                    <td className={styles.accountCell}>
                      <div className={styles.accountCellContent}>
                        {t.creditCardId
                          ? <CreditCard size={13} className="text-purple-400 flex-shrink-0" />
                          : t.accountId
                            ? <Landmark size={13} className="text-blue-400 flex-shrink-0" />
                            : null}
                        <span>{t.creditCardName ?? t.accountName ?? '—'}</span>
                      </div>
                    </td>
                    <td className={styles.dateCell}>
                      {t.creditCardId ? formatBillMonth(t.date) : formatDate(t.date)}
                    </td>
                    <td className={`${styles.amountCell} ${t.type === 'INCOME' ? styles.amountIncome : styles.amountExpense}`}>
                      {hideBalance ? '***' : `${t.type === 'INCOME' ? '+' : '-'}${formatCurrency(t.amount)}`}
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionButtonsRow}>
                        <button onClick={() => setModal({ edit: { ...t, categoryId: t.categoryId ?? '', accountId: t.accountId ?? '', creditCardId: t.creditCardId ?? '' } })}
                          className={styles.editButton}><Pencil size={15} /></button>
                        <button onClick={() => setModal({ delete: t })}
                          className={styles.deleteButton}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalClientPages > 1 && (
        <div className={styles.paginationRow}>
          <button onClick={() => setClientPage(p => p - 1)} disabled={clientPage === 0} className="btn-secondary px-3 py-1.5">
            <ChevronLeft size={16} />
          </button>
          <span className={styles.paginationLabel}>Página {clientPage + 1} de {totalClientPages}</span>
          <button onClick={() => setClientPage(p => p + 1)} disabled={clientPage >= totalClientPages - 1} className="btn-secondary px-3 py-1.5">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Nova Transação" onClose={() => setModal(null)}>
          <TransactionForm accounts={accounts} cards={cards} categories={categories} establishments={establishments}
            onSubmit={handleCreate} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.edit && (
        <Modal title="Editar Transação" onClose={() => setModal(null)}>
          <TransactionForm initial={modal.edit} accounts={accounts} cards={cards} categories={categories} establishments={establishments}
            onSubmit={handleUpdate} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.delete && (
        <ConfirmDialog title="Excluir Transação"
          message={`Deseja excluir "${modal.delete.description}"?`}
          onConfirm={handleDelete} onCancel={() => setModal(null)} loading={loading} />
      )}
      {modal?.bulkDelete && (
        <ConfirmDialog title="Excluir Transações"
          message={`Deseja excluir ${selectedIds.size} ${selectedIds.size === 1 ? 'transação selecionada' : 'transações selecionadas'}? Esta ação não pode ser desfeita.`}
          onConfirm={handleBulkDelete} onCancel={() => setModal(null)} loading={loading} />
      )}
      {groupModal && (
        <GroupDetailModal transaction={groupModal} onClose={() => setGroupModal(null)} />
      )}
    </div>
  )
}
