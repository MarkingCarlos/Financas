import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { creditCardService } from '../services/creditCardService'
import { billService } from '../services/billService'
import { accountService } from '../services/accountService'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2, Banknote, Lock } from 'lucide-react'
import { useBalanceVisibility } from '../context/BalanceVisibilityContext'
import styles from './CreditCards.module.css'

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6',
  '#22c55e', '#eab308', '#f97316', '#ef4444',
  '#ec4899', '#8b5cf6', '#64748b', '#1e293b',
]

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

function billLabel(bill) {
  return `${MONTHS[bill.mes - 1]}/${bill.ano}`
}

function CardForm({ initial, onSubmit, onCancel, loading }) {
  const now = new Date()
  const [form, setForm] = useState(initial ?? {
    name: '', currentBalance: '',
    billMonth: now.getMonth() + 1, billYear: now.getFullYear(),
    color: '#6366f1',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedColor = form.color || '#6366f1'

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div>
        <label className="label">Nome do cartão *</label>
        <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      {initial && (
        <div>
          <label className="label">Fatura atual</label>
          <input className="input" type="number" step="0.01" value={form.currentBalance}
            onChange={e => set('currentBalance', e.target.value)} />
        </div>
      )}
      {!initial && (
        <div>
          <label className="label">Mês da fatura inicial *</label>
          <div className={styles.billMonthGrid}>
            <select className="select" value={form.billMonth} onChange={e => set('billMonth', parseInt(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <input className="input" type="number" min={2020} max={2100} value={form.billYear}
              onChange={e => set('billYear', parseInt(e.target.value))} />
          </div>
        </div>
      )}
      <div>
        <label className="label">Cor do cartão</label>
        <div className={styles.colorPickerRow}>
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={styles.colorSwatch}
              style={{ background: c, outline: selectedColor === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
              onClick={() => set('color', c)}
            />
          ))}
          <input
            type="color"
            className={styles.colorCustomInput}
            value={selectedColor}
            onChange={e => set('color', e.target.value)}
            title="Cor personalizada"
          />
        </div>
      </div>
      <div className={styles.formActions}>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

function PayBillModal({ bill, card, accounts, onClose, onSuccess }) {
  const [form, setForm] = useState({
    accountId: accounts[0]?.id ?? '',
    amount: Number(bill.balance ?? 0).toFixed(2),
    date: new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const selectedAccount = accounts.find(a => a.id === form.accountId)
  const insufficient = selectedAccount && parseFloat(form.amount) > selectedAccount.balance

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await billService.pay(bill.id, {
        accountId: form.accountId,
        amount: parseFloat(form.amount),
        date: form.date,
      })
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Pagar fatura ${billLabel(bill)} — ${card.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className={styles.payBillInfoAlert}>
          <p className={styles.payBillInfoText}>
            Fatura <span className="font-medium">{billLabel(bill)}</span> fechada em{' '}
            {bill.fechadoEm ? new Date(bill.fechadoEm + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
          </p>
          <p className={styles.payBillTotalAmount}>{formatCurrency(bill.balance)}</p>
        </div>

        <div>
          <label className="label">Pagar de qual conta *</label>
          <select className="select" required value={form.accountId}
            onChange={e => set('accountId', e.target.value)}>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>
            ))}
          </select>
          {insufficient && <p className={styles.insufficientWarning}>Saldo insuficiente nesta conta.</p>}
        </div>

        <div>
          <label className="label">Valor a pagar *</label>
          <input className="input" type="number" step="0.01" min="0.01" required
            value={form.amount} onChange={e => set('amount', e.target.value)} />
        </div>

        <div>
          <label className="label">Data do pagamento *</label>
          <input className="input" type="date" required value={form.date}
            onChange={e => set('date', e.target.value)} />
        </div>

        <div className={styles.formActions}>
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading || insufficient} className="btn-primary">
            {loading ? 'Pagando...' : 'Confirmar pagamento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function CreditCardItem({ card, onEdit, onDelete, onCloseBill, onPayBill, hideBalance, onClick }) {
  const bills = card.bills ?? []
  const openBills = bills.filter(b => b.status === 'ABERTA').sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)
  const closedBills = bills.filter(b => b.status === 'FECHADA').sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)
  const currentBill = openBills[0]
  const cardColor = card.color || '#6366f1'

  return (
    <div className={styles.creditCard}>
      <div
        className={styles.cardColorHeader}
        style={{ background: `linear-gradient(135deg, ${cardColor} 0%, ${cardColor}aa 100%)` }}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onClick()}
      >
        <div className={styles.cardTopRow}>
          <div className={styles.cardNameGroup}>
            <p className={styles.cardName} style={{ color: '#fff' }}>{card.name}</p>
            {card.bankName && <p className={styles.cardBankName} style={{ color: 'rgba(255,255,255,0.75)' }}>{card.bankName}</p>}
            {card.lastFourDigits && <p className={styles.cardBankName} style={{ color: 'rgba(255,255,255,0.6)' }}>•••• {card.lastFourDigits}</p>}
          </div>
          <div className={styles.cardActionButtons} onClick={e => e.stopPropagation()}>
            <button onClick={onEdit} className={styles.editButtonWhite}><Pencil size={16} /></button>
            <button onClick={onDelete} className={styles.deleteButtonWhite}><Trash2 size={16} /></button>
          </div>
        </div>
      </div>

      <div className={styles.cardBody}>
        {closedBills.map(bill => (
          <div key={bill.id} className={styles.closedBillAlert}>
            <div className={styles.closedBillHeader}>
              <span className={styles.closedBillLabel}>Fatura fechada — {billLabel(bill)}</span>
              <span className={styles.closedBillBadge}>Aguardando pagamento</span>
            </div>
            <p className={styles.closedBillAmount}>{hideBalance ? '***' : formatCurrency(bill.balance)}</p>
            <button onClick={() => onPayBill(bill)} className={styles.payBillButton}>
              <Banknote size={14} /> Pagar fatura
            </button>
          </div>
        ))}

        {currentBill ? (
          <div>
            <p className={styles.openBillLabel}>Fatura aberta — {billLabel(currentBill)}</p>
            <p className={styles.openBillAmount}>{hideBalance ? '***' : formatCurrency(currentBill.balance)}</p>
            {card.creditLimit > 0 && (
              <p className={styles.creditLimitText}>Limite: {hideBalance ? '***' : formatCurrency(card.creditLimit)}</p>
            )}
          </div>
        ) : (
          <p className={styles.noBillText}>Nenhuma fatura aberta</p>
        )}

        {card.pluggyAccountId && (
          <span className={styles.syncedBadge}>Sincronizado via Open Finance</span>
        )}

        {currentBill && (
          <div className={styles.closeBillButtonWrapper}>
            <button onClick={() => onCloseBill(currentBill)} className={styles.closeBillButton}>
              <Lock size={14} /> Fechar fatura de {billLabel(currentBill)}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CreditCards() {
  const navigate = useNavigate()
  const [cards, setCards] = useState([])
  const [accounts, setAccounts] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(false)
  const { hideBalance } = useBalanceVisibility()

  const load = () => {
    creditCardService.list().then(setCards)
    accountService.list().then(setAccounts)
  }
  useEffect(() => { load() }, [])

  const toPayload = (form) => ({
    name: form.name,
    currentBalance: parseFloat(form.currentBalance) || 0,
    billMonth: form.billMonth ? parseInt(form.billMonth) : undefined,
    billYear: form.billYear ? parseInt(form.billYear) : undefined,
    color: form.color || '#6366f1',
  })

  const handleCreate = async (form) => {
    setLoading(true)
    try { await creditCardService.create(toPayload(form)); setModal(null); load() }
    finally { setLoading(false) }
  }

  const handleUpdate = async (form) => {
    setLoading(true)
    try { await creditCardService.update(modal.edit.id, toPayload(form)); setModal(null); load() }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setLoading(true)
    try { await creditCardService.remove(modal.delete.id); setModal(null); load() }
    finally { setLoading(false) }
  }

  const handleCloseBill = async (bill) => {
    await billService.close(bill.id)
    load()
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Cartões de Crédito</h1>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> Novo Cartão
        </button>
      </div>

      {cards.length === 0 ? (
        <div className={styles.emptyState}>Nenhum cartão cadastrado.</div>
      ) : (
        <div className={styles.cardsGrid}>
          {cards.map(card => (
            <CreditCardItem
              key={card.id}
              card={card}
              hideBalance={hideBalance}
              onClick={() => navigate(`/credit-cards/${card.id}`)}
              onEdit={() => setModal({ edit: card })}
              onDelete={() => setModal({ delete: card })}
              onCloseBill={handleCloseBill}
              onPayBill={bill => setModal({ pay: { bill, card } })}
            />
          ))}
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Novo Cartão" onClose={() => setModal(null)}>
          <CardForm onSubmit={handleCreate} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.edit && (
        <Modal title="Editar Cartão" onClose={() => setModal(null)}>
          <CardForm initial={modal.edit} onSubmit={handleUpdate} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.pay && (
        <PayBillModal
          bill={modal.pay.bill}
          card={modal.pay.card}
          accounts={accounts}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); load() }}
        />
      )}
      {modal?.delete && (
        <ConfirmDialog title="Excluir Cartão"
          message={`Deseja excluir o cartão "${modal.delete.name}"?`}
          onConfirm={handleDelete} onCancel={() => setModal(null)} loading={loading} />
      )}
    </div>
  )
}
