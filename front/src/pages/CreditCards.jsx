import { useEffect, useState } from 'react'
import { creditCardService } from '../services/creditCardService'
import { accountService } from '../services/accountService'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2, CalendarClock, Banknote } from 'lucide-react'
import { useBalanceVisibility } from '../context/BalanceVisibilityContext'

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}
function formatDate(d) {
  if (!d) return '-'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

function CardForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? {
    name: '', bankName: '', creditLimit: '', currentBalance: '', closingDay: 10, dueDay: 20,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div>
        <label className="label">Nome do cartão *</label>
        <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      {/*<div>*/}
      {/*  <label className="label">Banco</label>*/}
      {/*  <input className="input" value={form.bankName} onChange={e => set('bankName', e.target.value)} />*/}
      {/*</div>*/}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Limite</label>
          <input className="input" type="number" step="0.01" value={form.creditLimit}
            onChange={e => set('creditLimit', e.target.value)} />
        </div>
        <div>
          <label className="label">Fatura atual</label>
          <input className="input" type="number" step="0.01" value={form.currentBalance}
            onChange={e => set('currentBalance', e.target.value)} />
        </div>
        <div>
          <label className="label">Dia do fechamento * (1-28)</label>
          <input className="input" type="number" min={1} max={28} required value={form.closingDay}
            onChange={e => set('closingDay', parseInt(e.target.value))} />
        </div>
        <div>
          <label className="label">Dia do vencimento * (1-28)</label>
          <input className="input" type="number" min={1} max={28} required value={form.dueDay}
            onChange={e => set('dueDay', parseInt(e.target.value))} />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

function PayBillModal({ card, accounts, onClose, onSuccess }) {
  const [form, setForm] = useState({
    accountId: accounts[0]?.id ?? '',
    amount: card.currentBalance ?? '',
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
      await creditCardService.payBill(card.id, {
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
    <Modal title={`Pagar fatura — ${card.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          Fatura atual: <span className="font-bold text-red-600">{formatCurrency(card.currentBalance)}</span>
        </div>

        <div>
          <label className="label">Pagar de qual conta *</label>
          <select className="select" required value={form.accountId}
            onChange={e => set('accountId', e.target.value)}>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.name} — {formatCurrency(a.balance)}
              </option>
            ))}
          </select>
          {insufficient && (
            <p className="text-xs text-red-500 mt-1">Saldo insuficiente nesta conta.</p>
          )}
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

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading || insufficient} className="btn-primary">
            {loading ? 'Pagando...' : 'Confirmar pagamento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function CreditCards() {
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
    bankName: form.bankName || null,
    lastFourDigits: null,
    creditLimit: parseFloat(form.creditLimit) || 0,
    currentBalance: parseFloat(form.currentBalance) || 0,
    closingDay: parseInt(form.closingDay),
    dueDay: parseInt(form.dueDay),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Cartões de Crédito</h1>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> Novo Cartão
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">Nenhum cartão cadastrado.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => (
            <div key={card.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{card.name}</p>
                  {card.bankName && <p className="text-sm text-gray-500">{card.bankName}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal({ edit: card })} className="text-gray-400 hover:text-blue-600"><Pencil size={16} /></button>
                  <button onClick={() => setModal({ delete: card })} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400">Fatura atual</p>
                <p className="text-2xl font-bold text-red-600">{hideBalance ? '***' : formatCurrency(card.currentBalance)}</p>
                {card.creditLimit > 0 && (
                  <p className="text-xs text-gray-400">Limite: {hideBalance ? '***' : formatCurrency(card.creditLimit)}</p>
                )}
              </div>

              <div className="flex gap-4 text-xs text-gray-500 pt-1 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <CalendarClock size={13} /> Fecha dia {card.closingDay}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarClock size={13} /> Vence dia {card.dueDay}
                </span>
              </div>

              <div className="text-xs text-gray-400 space-y-0.5">
                <p>Próximo fechamento: {formatDate(card.nextClosingDate)}</p>
                <p>Próximo vencimento: {formatDate(card.nextDueDate)}</p>
              </div>

              {card.pluggyAccountId && (
                <span className="text-xs text-blue-500">Sincronizado via Open Finance</span>
              )}

              <button
                onClick={() => setModal({ pay: card })}
                disabled={!card.currentBalance || card.currentBalance <= 0}
                className="btn-primary w-full justify-center text-sm py-2"
              >
                <Banknote size={15} /> Pagar fatura
              </button>
            </div>
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
          card={modal.pay}
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
