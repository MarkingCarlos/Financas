import { useEffect, useState } from 'react'
import { transactionService } from '../services/transactionService'
import { CalendarClock, ChevronDown, ChevronRight, RefreshCw, Ban } from 'lucide-react'

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

function recurrenceLabel(t) {
  if (t.recurrenceType === 'SUBSCRIPTION') return 'Assinatura'
  if (t.recurrenceType === 'INSTALLMENT') return `${t.installmentNumber}/${t.installmentTotal}`
  return null
}

function recurrenceBadge(t) {
  if (t.recurrenceType === 'SUBSCRIPTION')
    return <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Assinatura</span>
  if (t.recurrenceType === 'INSTALLMENT')
    return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
      Parcela {t.installmentNumber}/{t.installmentTotal}
    </span>
  return null
}

export default function Upcoming() {
  const [months, setMonths] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [canceling, setCanceling] = useState(null)

  const load = () => {
    setLoading(true)
    transactionService.upcoming().then(data => {
      setMonths(data)
      // Expande o primeiro mês por padrão
      if (data.length > 0) {
        setExpanded({ [`${data[0].year}-${data[0].month}`]: true })
      }
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggleMonth = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  const handleCancelGroup = async (groupId, description) => {
    if (!confirm(`Cancelar todas as ocorrências futuras de "${description}"?`)) return
    setCanceling(groupId)
    try {
      await transactionService.cancelGroup(groupId)
      load()
    } finally {
      setCanceling(null)
    }
  }

  const total = months.reduce((sum, m) => sum + (m.totalExpenses ?? 0), 0)

  if (loading) return <p className="text-gray-500">Carregando...</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Próximos Meses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Despesas previstas nos próximos 6 meses
            {total > 0 && <> · Total: <span className="font-semibold text-red-600">{formatCurrency(total)}</span></>}
          </p>
        </div>
        <button onClick={load} className="btn-secondary">
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      {months.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <CalendarClock size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma despesa futura registrada.</p>
          <p className="text-xs mt-1">Assinaturas e parcelas aparecerão aqui automaticamente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {months.map(m => {
            const key = `${m.year}-${m.month}`
            const open = !!expanded[key]
            return (
              <div key={key} className="card overflow-hidden">
                {/* Header do mês */}
                <button
                  onClick={() => toggleMonth(key)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {open ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                    <span className="font-semibold text-gray-900 capitalize">{m.monthLabel}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {m.transactions.length} {m.transactions.length === 1 ? 'despesa' : 'despesas'}
                    </span>
                  </div>
                  <span className="font-bold text-red-600 text-lg">{formatCurrency(m.totalExpenses)}</span>
                </button>

                {/* Lista de transações */}
                {open && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {m.transactions.map(t => (
                      <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: t.categoryColor ?? '#94a3b8' }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
                              {recurrenceBadge(t)}
                            </div>
                            <p className="text-xs text-gray-400">
                              {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              {t.categoryName && ` · ${t.categoryName}`}
                              {(t.creditCardName || t.accountName) && ` · ${t.creditCardName ?? t.accountName}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                          <span className="text-sm font-semibold text-red-600">{formatCurrency(t.amount)}</span>
                          {(t.recurrenceType === 'SUBSCRIPTION' || t.recurrenceType === 'INSTALLMENT') && t.recurrenceGroupId && (
                            <button
                              title="Cancelar futuras ocorrências"
                              onClick={() => handleCancelGroup(t.recurrenceGroupId, t.description)}
                              disabled={canceling === t.recurrenceGroupId}
                              className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                            >
                              <Ban size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
