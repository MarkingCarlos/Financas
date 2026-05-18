import { useEffect, useState, useCallback, useMemo } from 'react'
import { transactionService } from '../services/transactionService'
import { accountService } from '../services/accountService'
import { creditCardService } from '../services/creditCardService'
import { categoryService } from '../services/categoryService'
import { establishmentService } from '../services/establishmentService'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import CurrencyInput from '../components/ui/CurrencyInput'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Search, CreditCard, Landmark } from 'lucide-react'
import { useBalanceVisibility } from '../context/BalanceVisibilityContext'

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}
function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

function TransactionForm({ initial, accounts, cards, categories, establishments, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(() => {
    const base = initial ?? {
      type: 'EXPENSE', description: '', amount: '', date: new Date().toISOString().split('T')[0],
      categoryId: '', accountId: '', creditCardId: '', notes: '',
      recurrenceType: 'NONE', installmentNumber: 1, installmentTotal: 2,
    }
    return {
      ...base,
      amount: base.amount !== '' && base.amount != null ? Number(base.amount).toFixed(2) : '',
      recurrenceType: base.recurrenceType ?? 'NONE',
      installmentNumber: base.installmentNumber ?? 1,
      installmentTotal: base.installmentTotal ?? 2,
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
      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
        <button type="button"
          className={`flex-1 py-2 text-sm font-medium transition-colors ${form.type === 'EXPENSE' ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          onClick={() => set('type', 'EXPENSE')}>Despesa</button>
        <button type="button"
          className={`flex-1 py-2 text-sm font-medium transition-colors ${form.type === 'INCOME' ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          onClick={() => set('type', 'INCOME')}>Receita</button>
      </div>

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
        <label className="label">Tipo de gasto</label>
        <div className="flex gap-2">
          {[
            { value: 'NONE', label: 'Único' },
            { value: 'SUBSCRIPTION', label: 'Assinatura' },
            { value: 'INSTALLMENT', label: 'Parcelado' },
          ].map(opt => (
            <button key={opt.value} type="button"
              onClick={() => set('recurrenceType', opt.value)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                form.recurrenceType === opt.value
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
        {form.recurrenceType === 'SUBSCRIPTION' && (
          <p className="text-xs text-purple-600 mt-1">Será lançada automaticamente todo mês.</p>
        )}
      </div>

      {form.recurrenceType === 'INSTALLMENT' && (
        <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg">
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
          <p className="col-span-2 text-xs text-blue-600">
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Conta bancária</label>
            <select className="select" value={form.accountId} onChange={e => { set('accountId', e.target.value); if (e.target.value) set('creditCardId', '') }}>
              <option value="">Nenhuma</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cartão de crédito</label>
            <select className="select" value={form.creditCardId} onChange={e => { set('creditCardId', e.target.value); if (e.target.value) set('accountId', '') }}>
              <option value="">Nenhum</option>
              {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="label">Observações</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
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
        <div className="flex items-center gap-2 flex-wrap">
          {isInstallment ? (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
              {paidCount}/{rows.length} parcelas pagas
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
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
            <span className="flex items-center gap-1 text-xs text-purple-600">
              <CreditCard size={12} /> {transaction.creditCardName}
            </span>
          )}
          {transaction.accountName && (
            <span className="flex items-center gap-1 text-xs text-blue-600">
              <Landmark size={12} /> {transaction.accountName}
            </span>
          )}
        </div>

        {loadingGroup ? (
          <p className="text-sm text-gray-400 py-8 text-center">Carregando...</p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-gray-200">
                <tr className="text-left text-gray-500">
                  {isInstallment && <th className="pb-2 pr-4 font-medium">Parcela</th>}
                  <th className="pb-2 pr-4 font-medium">Data</th>
                  <th className="pb-2 pr-4 font-medium">Valor</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(r => {
                  const status = getStatus(r.date)
                  return (
                    <tr key={r.id} className={r.date > today ? 'opacity-60' : ''}>
                      {isInstallment && (
                        <td className="py-2.5 pr-4 text-gray-500 text-xs font-medium">
                          {r.installmentNumber}/{r.installmentTotal}
                        </td>
                      )}
                      <td className="py-2.5 pr-4 text-gray-700">{formatDate(r.date)}</td>
                      <td className="py-2.5 pr-4 font-semibold text-red-600">{hideBalance ? '***' : formatCurrency(r.amount)}</td>
                      <td className="py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
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

  // When filters change, reset client page
  useEffect(() => { setClientPage(0) }, [typeFilter, search])

  const groupedTransactions = useMemo(() => {
    const all = data.content ?? []
    if (search) return all  // Searching: show individual results without grouping

    const today = new Date().toISOString().split('T')[0]

    // Build groups
    const groups = {}
    for (const t of all) {
      if (t.recurrenceGroupId) {
        if (!groups[t.recurrenceGroupId]) groups[t.recurrenceGroupId] = []
        groups[t.recurrenceGroupId].push(t)
      }
    }

    // Compute representative + metadata per group
    const groupMeta = {}
    for (const [id, members] of Object.entries(groups)) {
      const paid = members
        .filter(t => t.date <= today)
        .sort((a, b) => b.date.localeCompare(a.date))
      const rep = paid[0] ?? [...members].sort((a, b) => a.date.localeCompare(b.date))[0]
      groupMeta[id] = { rep, paidCount: paid.length, totalCount: members.length }
    }

    // Deduplicate
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

    // Re-sort by date desc (rep dates can differ from first-seen order)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> Nova Transação
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {['', 'EXPENSE', 'INCOME'].map(t => (
            <button key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${typeFilter === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
              {t === '' ? 'Todas' : t === 'EXPENSE' ? 'Despesas' : 'Receitas'}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="input pl-8 py-1.5 text-sm w-56"
            placeholder="Buscar por nome..."
            value={searchDraft}
            onChange={e => setSearchDraft(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Descrição</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Categoria</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Conta / Cartão</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Data</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Valor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedTransactions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Nenhuma transação encontrada.</td></tr>
              ) : pagedTransactions.map(t => {
                const isGroup = t.recurrenceGroupId && t._totalCount > 0

                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{t.description}</span>
                          {isGroup && t.recurrenceType === 'SUBSCRIPTION' && (
                            <button
                              onClick={() => setGroupModal(t)}
                              className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors font-medium">
                              ↻ Assinatura
                            </button>
                          )}
                          {isGroup && t.recurrenceType === 'INSTALLMENT' && (
                            <button
                              onClick={() => setGroupModal(t)}
                              className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-medium">
                              {t._paidCount}/{t.installmentTotal} parcelas
                            </button>
                          )}
                        </div>
                        {t.notes && <p className="text-xs text-gray-400 truncate max-w-xs">{t.notes}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {t.categoryName ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: (t.categoryColor ?? '#e5e7eb') + '33', color: t.categoryColor ?? '#374151' }}>
                          {t.categoryName}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        {t.creditCardId
                          ? <CreditCard size={13} className="text-purple-400 flex-shrink-0" />
                          : t.accountId
                            ? <Landmark size={13} className="text-blue-400 flex-shrink-0" />
                            : null}
                        <span>{t.creditCardName ?? t.accountName ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(t.date)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                      {hideBalance ? '***' : `${t.type === 'INCOME' ? '+' : '-'}${formatCurrency(t.amount)}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setModal({ edit: { ...t, categoryId: t.categoryId ?? '', accountId: t.accountId ?? '', creditCardId: t.creditCardId ?? '' } })}
                          className="text-gray-400 hover:text-blue-600"><Pencil size={15} /></button>
                        <button onClick={() => setModal({ delete: t })}
                          className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
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
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setClientPage(p => p - 1)} disabled={clientPage === 0} className="btn-secondary px-3 py-1.5">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600">Página {clientPage + 1} de {totalClientPages}</span>
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
      {groupModal && (
        <GroupDetailModal transaction={groupModal} onClose={() => setGroupModal(null)} />
      )}
    </div>
  )
}
