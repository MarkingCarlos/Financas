import { useEffect, useState } from 'react'
import {
  ShoppingBag, Plus, Hourglass, AlertTriangle, CheckCircle2,
  RotateCcw, Trash2, Ban, Unlock,
} from 'lucide-react'
import Modal from '../components/ui/Modal'
import CurrencyInput from '../components/ui/CurrencyInput'
import { wishItemService } from '../services/wishItemService'
import { transactionService } from '../services/transactionService'
import { accountService } from '../services/accountService'
import { creditCardService } from '../services/creditCardService'
import { categoryService } from '../services/categoryService'
import { useBalanceVisibility } from '../context/BalanceVisibilityContext'
import styles from './WishList.module.css'

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

function previewWaitDays(amount) {
  const value = Number(amount)
  if (!value || value <= 0) return null
  if (value < 50) return 1
  if (value < 100) return 7
  if (value <= 200) return 15
  return 30
}

const statusConfig = {
  WAITING:  { chip: 'bg-blue-50 text-blue-700 border-blue-200',     label: 'Em espera' },
  RELEASED: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Liberada' },
  INACTIVE: { chip: 'bg-gray-100 text-gray-500 border-gray-200',    label: 'Desistida' },
  PURCHASED:{ chip: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Comprada' },
}

function NewWishModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', amount: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const waitDays = previewWaitDays(form.amount)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount) return alert('Informe o valor')
    setLoading(true)
    try {
      await wishItemService.create({
        name: form.name,
        amount: parseFloat(form.amount),
        notes: form.notes || null,
      })
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Nova Compra Desejada" onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.formSpaceY}>
        <div>
          <label className="label">O que você quer comprar? *</label>
          <input className="input" required autoComplete="off" value={form.name}
            onChange={e => set('name', e.target.value)} />
        </div>

        <div>
          <label className="label">Valor estimado *</label>
          <CurrencyInput className="input" required value={form.amount} onChange={v => set('amount', v)} />
          {waitDays !== null && (
            <p className={styles.waitHint}>
              <Hourglass size={12} />
              Por esse valor, a compra será liberada em {waitDays} {waitDays === 1 ? 'dia' : 'dias'}.
            </p>
          )}
        </div>

        <div>
          <label className="label">Por que você quer isso? (opcional)</label>
          <textarea className="input" rows={2} value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Reler esse motivo no dia da liberação ajuda a decidir se ainda vale a pena" />
        </div>

        <div className={styles.modalActions}>
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Começar a espera'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function PurchaseModal({ item, onClose, onSuccess }) {
  const [step, setStep] = useState('question')
  const [loading, setLoading] = useState(false)

  const [expenses, setExpenses] = useState([])
  const [selectedTransactionId, setSelectedTransactionId] = useState('')

  const [accounts, setAccounts] = useState([])
  const [cards, setCards] = useState([])
  const [categories, setCategories] = useState([])
  const [paymentType, setPaymentType] = useState('account')
  const [form, setForm] = useState({
    description: item.name,
    amount: String(item.amount),
    date: new Date().toISOString().split('T')[0],
    categoryId: '', accountId: '', creditCardId: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const isEarly = item.remainingDays > 0

  const goToLink = () => {
    setStep('link')
    transactionService.list({ type: 'EXPENSE', size: 30 })
      .then(r => setExpenses(r.content ?? []))
  }

  const goToCreate = () => {
    setStep('create')
    accountService.list().then(setAccounts)
    creditCardService.list().then(data => setCards(Array.isArray(data) ? data : data.content ?? []))
    categoryService.list().then(setCategories)
  }

  const confirmLink = async () => {
    if (!selectedTransactionId) return
    setLoading(true)
    try { await wishItemService.purchase(item.id, selectedTransactionId); onSuccess() }
    finally { setLoading(false) }
  }

  const confirmCreate = async (e) => {
    e.preventDefault()
    if (paymentType === 'account' && !form.accountId) return alert('Selecione uma conta')
    if (paymentType === 'card' && !form.creditCardId) return alert('Selecione um cartão')
    setLoading(true)
    try {
      const transaction = await transactionService.create({
        type: 'EXPENSE',
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
        categoryId: form.categoryId || null,
        accountId: paymentType === 'account' ? form.accountId : null,
        creditCardId: paymentType === 'card' ? form.creditCardId : null,
        recurrenceType: 'NONE',
      })
      await wishItemService.purchase(item.id, transaction.id)
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={isEarly ? 'Comprar antes da hora' : 'Liberar compra'} onClose={onClose}>
      {isEarly && (
        <div className={styles.earlyWarning}>
          <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className={styles.earlyWarningText}>
            Ainda faltam <strong>{item.remainingDays} dias</strong> para esta compra.
            Comprar agora adiciona <strong>+2 dias</strong> ao contador de todas
            as outras compras em espera.
          </p>
        </div>
      )}

      {step === 'question' && (
        <div className={styles.formSpaceY}>
          <p className="text-gray-700">A compra de <strong>{item.name}</strong> já foi feita?</p>
          <div className={styles.questionButtons}>
            <button onClick={goToLink} className="btn-secondary flex-1">Sim, já comprei</button>
            <button onClick={goToCreate} className="btn-primary flex-1">Não, registrar agora</button>
          </div>
        </div>
      )}

      {step === 'link' && (
        <div className={styles.formSpaceY}>
          <p className="text-sm text-gray-600">Selecione a despesa referente a esta compra:</p>
          {expenses.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma despesa encontrada. Volte e registre a compra agora.</p>
          ) : (
            <div className={styles.expenseListScroll}>
              {expenses.map(t => (
                <label key={t.id}
                  className={`${styles.expenseListLabel} ${selectedTransactionId === t.id ? styles.expenseListLabelSelected : styles.expenseListLabelDefault}`}>
                  <input type="radio" name="transaction" className="sr-only"
                    checked={selectedTransactionId === t.id}
                    onChange={() => setSelectedTransactionId(t.id)} />
                  <div className={styles.expenseLabelContent}>
                    <p className={styles.expenseLabelName}>{t.description}</p>
                    <p className={styles.expenseLabelMeta}>
                      {formatDate(t.date)}
                      {t.accountName ? ` · ${t.accountName}` : ''}
                      {t.creditCardName ? ` · ${t.creditCardName}` : ''}
                    </p>
                  </div>
                  <span className={styles.expenseLabelAmount}>-{formatCurrency(t.amount)}</span>
                </label>
              ))}
            </div>
          )}
          <div className={styles.modalActions}>
            <button onClick={() => setStep('question')} className="btn-secondary">Voltar</button>
            <button onClick={confirmLink} disabled={!selectedTransactionId || loading} className="btn-primary">
              {loading ? 'Vinculando...' : 'Vincular compra'}
            </button>
          </div>
        </div>
      )}

      {step === 'create' && (
        <form onSubmit={confirmCreate} className={styles.formSpaceY}>
          <div>
            <label className="label">Descrição *</label>
            <input className="input" required value={form.description}
              onChange={e => set('description', e.target.value)} />
          </div>

          <div className={styles.twoColGrid}>
            <div>
              <label className="label">Valor *</label>
              <CurrencyInput className="input" required value={form.amount} onChange={v => set('amount', v)} />
            </div>
            <div>
              <label className="label">Data *</label>
              <input className="input" type="date" required value={form.date}
                onChange={e => set('date', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Forma de pagamento *</label>
            <div className={styles.paymentTypeRow}>
              <button type="button" onClick={() => setPaymentType('account')}
                className={`${styles.paymentTypeButtonAccount} ${paymentType === 'account' ? styles.paymentTypeButtonAccountActive : styles.paymentTypeButtonAccountInactive}`}>
                Débito (conta)
              </button>
              <button type="button" onClick={() => setPaymentType('card')}
                className={`${styles.paymentTypeButtonCard} ${paymentType === 'card' ? styles.paymentTypeButtonCardActive : styles.paymentTypeButtonCardInactive}`}>
                Crédito (cartão)
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
            <label className="label">Categoria</label>
            <select className="select" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={() => setStep('question')} className="btn-secondary">Voltar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Registrando...' : 'Registrar e concluir'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function WishItemCard({ item, onAction }) {
  const { hideBalance } = useBalanceVisibility()
  const isWaiting = item.status === 'WAITING'
  const config = isWaiting && item.releasable ? statusConfig.RELEASED : statusConfig[item.status]

  const progressPct = isWaiting && item.totalDays > 0
    ? Math.min(100, ((item.totalDays - item.remainingDays) / item.totalDays) * 100)
    : 0

  return (
    <div className={styles.wishCard}>
      <div className={styles.wishCardHeader}>
        <div className={styles.wishCardTitleGroup}>
          <p className={styles.wishItemName}>{item.name}</p>
          <p className={styles.wishItemAmount}>{hideBalance ? '***' : formatCurrency(item.amount)}</p>
        </div>
        <span className={`${styles.wishStatusBadge} ${config.chip}`}>{config.label}</span>
      </div>

      {item.notes && <p className={styles.wishNotes}>"{item.notes}"</p>}

      {isWaiting && !item.releasable && (
        <div className={styles.waitProgressSection}>
          <div className={styles.waitProgressHeader}>
            <span className={styles.waitProgressLeft}>
              <Hourglass size={12} />
              {item.remainingDays} {item.remainingDays === 1 ? 'dia restante' : 'dias restantes'}
            </span>
            <span className={styles.waitProgressRight}>
              {item.totalDays} dias no total
              {item.penaltyDays > 0 && (
                <span className={styles.penaltyText}> (+{item.penaltyDays} de punição)</span>
              )}
            </span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {item.status === 'INACTIVE' && (
        <p className={styles.reactivateNote}>
          {item.reactivatable
            ? 'Quarentena cumprida — pode reativar (o contador volta ao início).'
            : `Pode ser reativada a partir de ${formatDate(item.reactivatableAt)}.`}
        </p>
      )}

      {item.status === 'PURCHASED' && (
        <p className={styles.purchasedNote}>
          <CheckCircle2 size={13} /> Compra registrada no módulo de finanças.
        </p>
      )}

      <div className={styles.wishActions}>
        {isWaiting && item.releasable && (
          <button onClick={() => onAction('purchase', item)} className={styles.releaseButton}>
            <Unlock size={15} /> Liberar compra
          </button>
        )}
        {isWaiting && !item.releasable && (
          <>
            <button onClick={() => onAction('purchase', item)} className={styles.earlyBuyButton}>
              <AlertTriangle size={13} /> Comprar mesmo assim
            </button>
            <button onClick={() => onAction('giveUp', item)} className={styles.giveUpButton}>
              <Ban size={13} /> Desistir
            </button>
          </>
        )}
        {item.status === 'INACTIVE' && (
          <>
            <button onClick={() => onAction('reactivate', item)} disabled={!item.reactivatable}
              className={styles.reactivateButton}>
              <RotateCcw size={13} /> Reativar
            </button>
            <button onClick={() => onAction('delete', item)} className={styles.deleteButton}>
              <Trash2 size={13} />
            </button>
          </>
        )}
        {item.status === 'PURCHASED' && (
          <button onClick={() => onAction('delete', item)} className={styles.deleteButtonRight}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function WishList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [purchaseItem, setPurchaseItem] = useState(null)
  const { hideBalance } = useBalanceVisibility()

  const load = () => {
    setLoading(true)
    wishItemService.list().then(setItems).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAction = async (action, item) => {
    if (action === 'purchase') return setPurchaseItem(item)
    if (action === 'giveUp') {
      if (!confirm(`Desistir de "${item.name}"? Ela ficará inativa por 7 dias e, se voltar, o contador recomeça do zero.`)) return
      await wishItemService.giveUp(item.id)
    }
    if (action === 'reactivate') await wishItemService.reactivate(item.id)
    if (action === 'delete') {
      if (!confirm(`Excluir "${item.name}" definitivamente?`)) return
      await wishItemService.remove(item.id)
    }
    load()
  }

  const waiting = items.filter(i => i.status === 'WAITING')
  const givenUp = items.filter(i => i.status === 'INACTIVE')
  const totalWaiting = waiting.reduce((sum, i) => sum + Number(i.amount), 0)
  const totalAvoided = givenUp.reduce((sum, i) => sum + Number(i.amount), 0)

  if (loading) return <p className="text-gray-500">Carregando...</p>

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Compras Desejadas</h1>
        <button onClick={() => setShowNewModal(true)} className="btn-primary">
          <Plus size={16} /> Nova compra desejada
        </button>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardTopRow}>
            <span className={styles.summaryLabel}>Em espera ({waiting.length})</span>
            <div className={styles.summaryIconWaiting}>
              <Hourglass size={18} className="text-white" />
            </div>
          </div>
          <p className={styles.summaryAmount}>{hideBalance ? '***' : formatCurrency(totalWaiting)}</p>
          <p className={styles.summaryNote}>Desejos passando pelo teste do tempo</p>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardTopRow}>
            <span className={styles.summaryLabel}>Desistências ({givenUp.length})</span>
            <div className={styles.summaryIconSaved}>
              <ShoppingBag size={18} className="text-white" />
            </div>
          </div>
          <p className={styles.summaryAmountSaved}>{hideBalance ? '***' : formatCurrency(totalAvoided)}</p>
          <p className={styles.summaryNote}>Dinheiro que não saiu do bolso — fortuna é o que você não vê</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <ShoppingBag size={36} className={styles.emptyStateIcon} />
          <p className={styles.emptyStateTitle}>Nenhuma compra desejada ainda.</p>
          <p className={styles.emptyStateSubtitle}>
            Quando bater a vontade de comprar algo, registre aqui — se o desejo sobreviver à espera, ele é real.
          </p>
        </div>
      ) : (
        <div className={styles.wishGrid}>
          {items.map(item => (
            <WishItemCard key={item.id} item={item} onAction={handleAction} />
          ))}
        </div>
      )}

      {showNewModal && (
        <NewWishModal
          onClose={() => setShowNewModal(false)}
          onSuccess={() => { setShowNewModal(false); load() }}
        />
      )}

      {purchaseItem && (
        <PurchaseModal
          item={purchaseItem}
          onClose={() => setPurchaseItem(null)}
          onSuccess={() => { setPurchaseItem(null); load() }}
        />
      )}
    </div>
  )
}
