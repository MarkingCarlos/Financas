import { useEffect, useState } from 'react'
import { savingsService } from '../services/savingsService'
import { accountService } from '../services/accountService'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2, PiggyBank, ArrowRightLeft, ArrowDownToLine } from 'lucide-react'
import { useBalanceVisibility } from '../context/BalanceVisibilityContext'

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function SavingsForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? { name: '', amount: '', color: COLORS[0], icon: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div>
        <label className="label">Nome *</label>
        <input className="input" required value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="Ex: Reserva de emergência" />
      </div>
      <div>
        <label className="label">Valor inicial</label>
        <input className="input" type="number" step="0.01" min="0" value={form.amount}
          onChange={e => set('amount', e.target.value)} />
      </div>
      <div>
        <label className="label">Cor</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} type="button"
              onClick={() => set('color', c)}
              className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
              style={{ background: c }}
            />
          ))}
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

function DepositModal({ saving, onClose, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await savingsService.deposit(saving.id, parseFloat(amount))
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Depositar — ${saving.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          Saldo atual: <span className="font-bold text-gray-900">{formatCurrency(saving.amount)}</span>
        </div>
        <div>
          <label className="label">Valor a depositar *</label>
          <input className="input" type="number" step="0.01" min="0.01" required
            value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Depositando...' : 'Confirmar depósito'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function TransferModal({ saving, accounts, onClose, onSuccess }) {
  const [form, setForm] = useState({
    accountId: accounts[0]?.id ?? '',
    amount: saving.amount ?? '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const insufficient = parseFloat(form.amount) > saving.amount

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await savingsService.transfer(saving.id, {
        accountId: form.accountId,
        amount: parseFloat(form.amount),
      })
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Transferir para conta — ${saving.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          Disponível: <span className="font-bold text-gray-900">{formatCurrency(saving.amount)}</span>
        </div>

        <div>
          <label className="label">Conta de destino *</label>
          <select className="select" required value={form.accountId}
            onChange={e => set('accountId', e.target.value)}>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Valor a transferir *</label>
          <input className="input" type="number" step="0.01" min="0.01" required
            value={form.amount} onChange={e => set('amount', e.target.value)} />
          {insufficient && (
            <p className="text-xs text-red-500 mt-1">Valor maior que o saldo disponível.</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading || insufficient} className="btn-primary">
            {loading ? 'Transferindo...' : 'Confirmar transferência'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function Savings() {
  const [savings, setSavings] = useState([])
  const [accounts, setAccounts] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(false)
  const { hideBalance } = useBalanceVisibility()

  const load = () => {
    savingsService.list().then(setSavings)
    accountService.list().then(setAccounts)
  }
  useEffect(() => { load() }, [])

  const toPayload = (form) => ({
    name: form.name,
    amount: parseFloat(form.amount) || 0,
    color: form.color || null,
    icon: form.icon || null,
  })

  const handleCreate = async (form) => {
    setLoading(true)
    try { await savingsService.create(toPayload(form)); setModal(null); load() }
    finally { setLoading(false) }
  }

  const handleUpdate = async (form) => {
    setLoading(true)
    try { await savingsService.update(modal.edit.id, toPayload(form)); setModal(null); load() }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setLoading(true)
    try { await savingsService.remove(modal.delete.id); setModal(null); load() }
    finally { setLoading(false) }
  }

  const total = savings.reduce((sum, s) => sum + (s.amount ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dinheiro Guardado</h1>
          {savings.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">Total: <span className="font-semibold text-emerald-600">{hideBalance ? '***' : formatCurrency(total)}</span></p>
          )}
        </div>
        <button onClick={() => setModal('create')} className="btn-primary shrink-0">
          <Plus size={16} /> Novo Cofre
        </button>
      </div>

      {savings.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <PiggyBank size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum cofre cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savings.map(s => (
            <div key={s.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: s.color ?? '#10b981' }}>
                    <PiggyBank size={20} className="text-white" />
                  </div>
                  <p className="font-semibold text-gray-900">{s.name}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal({ edit: s })} className="text-gray-400 hover:text-blue-600"><Pencil size={16} /></button>
                  <button onClick={() => setModal({ delete: s })} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>

              <p className="text-2xl font-bold text-gray-900">{hideBalance ? '***' : formatCurrency(s.amount)}</p>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setModal({ deposit: s })}
                  className="flex-1 btn-secondary text-sm py-2 justify-center"
                >
                  <ArrowDownToLine size={14} /> Depositar
                </button>
                <button
                  onClick={() => setModal({ transfer: s })}
                  disabled={!s.amount || s.amount <= 0 || accounts.length === 0}
                  className="flex-1 btn-primary text-sm py-2 justify-center"
                >
                  <ArrowRightLeft size={14} /> Transferir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Novo Cofre" onClose={() => setModal(null)}>
          <SavingsForm onSubmit={handleCreate} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.edit && (
        <Modal title="Editar Cofre" onClose={() => setModal(null)}>
          <SavingsForm initial={modal.edit} onSubmit={handleUpdate} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.deposit && (
        <DepositModal
          saving={modal.deposit}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); load() }}
        />
      )}
      {modal?.transfer && (
        <TransferModal
          saving={modal.transfer}
          accounts={accounts}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); load() }}
        />
      )}
      {modal?.delete && (
        <ConfirmDialog
          title="Excluir Cofre"
          message={`Deseja excluir o cofre "${modal.delete.name}"? O saldo será perdido.`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
          loading={loading}
        />
      )}
    </div>
  )
}
