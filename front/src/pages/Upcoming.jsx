import { useEffect, useState } from 'react'
import { transactionService } from '../services/transactionService'
import { CalendarClock, ChevronDown, ChevronRight, RefreshCw, Ban } from 'lucide-react'
import styles from './Upcoming.module.css'

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

function recurrenceBadge(t) {
  if (t.recurrenceType === 'SUBSCRIPTION')
    return <span className={styles.badgeSubscription}>Assinatura</span>
  if (t.recurrenceType === 'INSTALLMENT')
    return <span className={styles.badgeInstallment}>
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
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Próximos Meses</h1>
          <p className={styles.pageSubtitle}>
            Despesas previstas nos próximos 6 meses
            {total > 0 && <> · Total: <span className={styles.totalHighlight}>{formatCurrency(total)}</span></>}
          </p>
        </div>
        <button onClick={load} className="btn-secondary">
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      {months.length === 0 ? (
        <div className={styles.emptyState}>
          <CalendarClock size={40} className={styles.emptyStateIcon} />
          <p>Nenhuma despesa futura registrada.</p>
          <p className={styles.emptyStateSubtext}>Assinaturas e parcelas aparecerão aqui automaticamente.</p>
        </div>
      ) : (
        <div className={styles.monthList}>
          {months.map(m => {
            const key = `${m.year}-${m.month}`
            const open = !!expanded[key]
            return (
              <div key={key} className={styles.monthCard}>
                <button onClick={() => toggleMonth(key)} className={styles.monthHeader}>
                  <div className={styles.monthHeaderLeft}>
                    {open
                      ? <ChevronDown size={18} className={styles.monthChevron} />
                      : <ChevronRight size={18} className={styles.monthChevron} />}
                    <span className={styles.monthName}>{m.monthLabel}</span>
                    <span className={styles.monthTransactionCount}>
                      {m.transactions.length} {m.transactions.length === 1 ? 'despesa' : 'despesas'}
                    </span>
                  </div>
                  <span className={styles.monthTotal}>{formatCurrency(m.totalExpenses)}</span>
                </button>

                {open && (
                  <div className={styles.transactionList}>
                    {m.transactions.map(t => (
                      <div key={t.id} className={styles.transactionRow}>
                        <div className={styles.transactionLeft}>
                          <span
                            className={styles.categoryDot}
                            style={{ background: t.categoryColor ?? '#94a3b8' }}
                          />
                          <div className={styles.transactionDetails}>
                            <div className={styles.transactionNameRow}>
                              <p className={styles.transactionName}>{t.description}</p>
                              {recurrenceBadge(t)}
                            </div>
                            <p className={styles.transactionMeta}>
                              {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              {t.categoryName && ` · ${t.categoryName}`}
                              {(t.creditCardName || t.accountName) && ` · ${t.creditCardName ?? t.accountName}`}
                            </p>
                          </div>
                        </div>
                        <div className={styles.transactionRight}>
                          <span className={styles.transactionAmount}>{formatCurrency(t.amount)}</span>
                          {(t.recurrenceType === 'SUBSCRIPTION' || t.recurrenceType === 'INSTALLMENT') && t.recurrenceGroupId && (
                            <button
                              title="Cancelar futuras ocorrências"
                              onClick={() => handleCancelGroup(t.recurrenceGroupId, t.description)}
                              disabled={canceling === t.recurrenceGroupId}
                              className={styles.cancelGroupButton}
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
