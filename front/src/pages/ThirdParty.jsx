import { useEffect, useState } from 'react'
import { transactionService } from '../services/transactionService'
import { Users, CreditCard, CheckCircle2 } from 'lucide-react'
import { useBalanceVisibility } from '../context/BalanceVisibilityContext'
import styles from './ThirdParty.module.css'

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}
function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

function PurchaseCard({ item, hideBalance }) {
  const isDone = item.remainingInstallments === 0
  const effectiveCost = item.effectiveCostPerInstallment ?? 0
  const hasUserCost = effectiveCost > 0

  return (
    <div className={`${styles.purchaseCard} ${isDone ? styles.purchaseCardDone : styles.purchaseCardActive}`}>
      <div className={styles.purchaseCardHeader}>
        <div className={styles.purchaseCardTitleGroup}>
          <p className={styles.purchaseTitle}>{item.description}</p>
          {item.creditCardName && (
            <p className={styles.purchaseCardName}>
              <CreditCard size={11} /> {item.creditCardName}
            </p>
          )}
        </div>
        {isDone
          ? <span className={styles.badgeSettled}><CheckCircle2 size={11} /> Quitado</span>
          : <span className={styles.badgePending}>{item.remainingInstallments}/{item.totalInstallments} restantes</span>
        }
      </div>

      <div className={styles.installmentGrid}>
        <div className={styles.installmentCellBase}>
          <p className={styles.installmentCellLabel}>Parcela</p>
          <p className={styles.installmentCellValue}>
            {hideBalance ? '***' : formatCurrency(item.amountPerInstallment)}
          </p>
        </div>
        <div className={styles.installmentCellRepayment}>
          <p className={styles.installmentCellLabelRepayment}>Repasse</p>
          <p className={styles.installmentCellValueRepayment}>
            {hideBalance ? '***' : formatCurrency(item.repaymentPerInstallment)}
          </p>
        </div>
        <div className={hasUserCost ? styles.installmentCellCostPositive : styles.installmentCellCostZero}>
          <p className={hasUserCost ? styles.installmentCellLabelCostPositive : styles.installmentCellLabelCostZero}>
            Seu custo
          </p>
          <p className={hasUserCost ? styles.installmentCellValueCostPositive : styles.installmentCellValueCostZero}>
            {hideBalance ? '***' : (hasUserCost ? formatCurrency(effectiveCost) : 'R$ 0')}
          </p>
        </div>
      </div>

      {!isDone && (
        <div className={styles.nextInstallmentRow}>
          <span className={styles.nextInstallmentDate}>
            Próxima: {formatDate(item.nextInstallmentDate)}
          </span>
          <span className={styles.totalRemaining}>
            Total a receber: {hideBalance ? '***' : formatCurrency(item.totalRemainingRepayment)}
          </span>
        </div>
      )}
    </div>
  )
}

export default function ThirdParty() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const { hideBalance } = useBalanceVisibility()

  useEffect(() => {
    transactionService.thirdParty()
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  const active = items.filter(i => i.remainingInstallments > 0)
  const done = items.filter(i => i.remainingInstallments === 0)

  const groupByPerson = (list) => {
    const groups = {}
    for (const item of list) {
      const key = item.thirdPartyPerson ?? 'Sem nome'
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }
    return groups
  }

  const totalAReceber = active.reduce((sum, i) => sum + (i.totalRemainingRepayment ?? 0), 0)
  const totalCustoMeuAtivo = active.reduce((sum, i) => sum + (i.effectiveCostPerInstallment ?? 0) * i.remainingInstallments, 0)

  if (loading) return <p className="text-gray-500">Carregando...</p>

  const activeGroups = groupByPerson(active)

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Compras de Terceiros</h1>
      </div>

      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <Users size={40} className={styles.emptyStateIcon} />
          <p>Nenhuma compra de terceiro registrada.</p>
          <p className={styles.emptyStateSubtext}>Ao criar uma despesa no cartão, ative "Compra de terceiro".</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Total a receber (restantes)</p>
                <p className={styles.summaryValueReceivable}>
                  {hideBalance ? '***' : formatCurrency(totalAReceber)}
                </p>
              </div>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Seu custo restante no cartão</p>
                <p className={styles.summaryValueCost}>
                  {hideBalance ? '***' : formatCurrency(totalCustoMeuAtivo)}
                </p>
              </div>
            </div>
          )}

          {active.length === 0 && (
            <div className={styles.allSettledCard}>
              <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
              <p className="text-sm">Todas as compras estão quitadas!</p>
            </div>
          )}

          {Object.entries(activeGroups).map(([person, personItems]) => (
            <div key={person} className={styles.personGroupContainer}>
              <div className={styles.personGroupHeader}>
                <Users size={16} className="text-amber-500" />
                <h2 className={styles.personGroupName}>{person}</h2>
                <span className={styles.personGroupCount}>
                  {personItems.length} compra{personItems.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className={styles.purchasesGrid}>
                {personItems.map(item => (
                  <PurchaseCard key={item.transactionId} item={item} hideBalance={hideBalance} />
                ))}
              </div>
            </div>
          ))}

          {done.length > 0 && (
            <div>
              <button onClick={() => setShowDone(v => !v)} className={styles.showDoneButton}>
                <CheckCircle2 size={14} className="text-green-400" />
                {showDone ? 'Ocultar' : 'Ver'} {done.length} compra{done.length !== 1 ? 's' : ''} já quitada{done.length !== 1 ? 's' : ''}
              </button>
              {showDone && (
                <div className={styles.doneGrid}>
                  {done.map(item => (
                    <PurchaseCard key={item.transactionId} item={item} hideBalance={hideBalance} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
