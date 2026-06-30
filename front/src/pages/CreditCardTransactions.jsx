import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { creditCardService } from '../services/creditCardService'
import { transactionService } from '../services/transactionService'
import { billService } from '../services/billService'
import { ArrowLeft, CreditCard, ChevronDown, ChevronUp } from 'lucide-react'
import { useBalanceVisibility } from '../context/BalanceVisibilityContext'
import styles from './CreditCardTransactions.module.css'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}
function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}
function lightenHex(hex, amount = 0.85) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.round(r + (255 - r) * amount)},${Math.round(g + (255 - g) * amount)},${Math.round(b + (255 - b) * amount)})`
}
function billKey(mes, ano) {
  return `${ano}-${String(mes).padStart(2, '0')}`
}
function billLabel(mes, ano) {
  return `${MONTHS[mes - 1]}/${ano}`
}

const STATUS_CONFIG = {
  ABERTA:  { label: 'Aberta',               bg: '#dcfce7', text: '#166534' },
  FECHADA: { label: 'Aguardando pagamento',  bg: '#fef9c3', text: '#854d0e' },
  PAGA:    { label: 'Paga',                  bg: '#f3f4f6', text: '#6b7280' },
  FUTURA:  { label: 'Futura',                bg: '#eff6ff', text: '#1e40af' },
}

function BillSection({ bill, transactions, hideBalance, cardColor }) {
  const [open, setOpen] = useState(bill.status === 'ABERTA' || bill.status === 'FECHADA')
  const cfg = STATUS_CONFIG[bill.status] ?? STATUS_CONFIG.ABERTA
  const total = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)
  const bgLight = lightenHex(cardColor)

  return (
    <div className={styles.billSection}>
      <button className={styles.billHeader} onClick={() => setOpen(o => !o)}>
        <div className={styles.billHeaderLeft}>
          <span className={styles.billMonth}>{billLabel(bill.mes, bill.ano)}</span>
          <span className={styles.billStatusBadge} style={{ background: cfg.bg, color: cfg.text }}>
            {cfg.label}
          </span>
          {transactions.length > 0 && (
            <span className={styles.billTxCount}>{transactions.length} transação{transactions.length !== 1 ? 'ões' : ''}</span>
          )}
        </div>
        <div className={styles.billHeaderRight}>
          {transactions.length > 0 && (
            <span className={styles.billTotal} style={{ color: cardColor }}>
              {hideBalance ? '***' : formatCurrency(total)}
            </span>
          )}
          {open ? <ChevronUp size={16} className={styles.chevron} /> : <ChevronDown size={16} className={styles.chevron} />}
        </div>
      </button>

      {open && (
        <div className={styles.billBody}>
          {transactions.length === 0 ? (
            <p className={styles.billEmpty}>Nenhuma transação nesta fatura.</p>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} className={styles.txRow}>
                <div className={styles.txLeft}>
                  <span
                    className={styles.txTypeDot}
                    style={{ background: tx.type === 'EXPENSE' ? '#ef4444' : '#22c55e' }}
                  />
                  <div>
                    <p className={styles.txDesc}>{tx.description}</p>
                    <p className={styles.txMeta}>
                      {formatDate(tx.date)}
                      {tx.categoryName && <> · {tx.categoryName}</>}
                      {tx.recurrenceType === 'SUBSCRIPTION' && <> · Assinatura</>}
                      {tx.installmentTotal > 1 && (
                        <> · Parcela {tx.installmentNumber}/{tx.installmentTotal}</>
                      )}
                    </p>
                  </div>
                </div>
                <span className={tx.type === 'EXPENSE' ? styles.txAmountExpense : styles.txAmountIncome}>
                  {hideBalance ? '***' : (tx.type === 'EXPENSE' ? '− ' : '+ ') + formatCurrency(tx.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function CreditCardTransactions() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hideBalance } = useBalanceVisibility()

  const [card, setCard] = useState(null)
  const [bills, setBills] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cardData, billsData, txData] = await Promise.all([
        creditCardService.getById(id),
        billService.listForCard(id),
        transactionService.list({ creditCardId: id, page: 0, size: 500 }),
      ])
      setCard(cardData)
      setBills(billsData)
      setTransactions(txData.content)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const cardColor = card?.color ?? '#6366f1'

  // Agrupa transações por YYYY-MM
  const txByMonth = transactions.reduce((acc, tx) => {
    const key = tx.date.slice(0, 7)
    if (!acc[key]) acc[key] = []
    acc[key].push(tx)
    return acc
  }, {})

  // ABERTA primeiro, depois FUTURA crescente (próximos meses), depois FECHADA e PAGA decrescente
  const statusGroup = { ABERTA: 0, FUTURA: 1, FECHADA: 2, PAGA: 3 }
  const sortedBills = [...bills].sort((a, b) => {
    const ga = statusGroup[a.status] ?? 9
    const gb = statusGroup[b.status] ?? 9
    if (ga !== gb) return ga - gb
    const dateA = a.ano * 12 + a.mes
    const dateB = b.ano * 12 + b.mes
    // FUTURA: crescente (próximos meses primeiro); FECHADA/PAGA: decrescente (mais recente primeiro)
    return a.status === 'FUTURA' ? dateA - dateB : dateB - dateA
  })

  return (
    <div className={styles.page}>
      <button onClick={() => navigate('/credit-cards')} className={styles.backButton}>
        <ArrowLeft size={16} /> Voltar aos cartões
      </button>

      {card && (
        <div
          className={styles.cardHeader}
          style={{ background: `linear-gradient(135deg, ${cardColor} 0%, ${lightenHex(cardColor, 0.3)} 100%)` }}
        >
          <div className={styles.cardHeaderIcon}>
            <CreditCard size={28} color="#fff" />
          </div>
          <div>
            <h1 className={styles.cardHeaderName}>{card.name}</h1>
            {card.bankName && <p className={styles.cardHeaderBank}>{card.bankName}</p>}
            {card.lastFourDigits && <p className={styles.cardHeaderDigits}>•••• {card.lastFourDigits}</p>}
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingBox}>Carregando...</div>
      ) : sortedBills.length === 0 ? (
        <div className={styles.loadingBox}>Nenhuma fatura encontrada.</div>
      ) : (
        <div className={styles.billList}>
          {sortedBills.map(bill => (
            <BillSection
              key={bill.id}
              bill={bill}
              transactions={txByMonth[billKey(bill.mes, bill.ano)] ?? []}
              hideBalance={hideBalance}
              cardColor={cardColor}
            />
          ))}
        </div>
      )}
    </div>
  )
}
