import { useEffect, useState } from 'react'
import { accountService } from '../services/accountService'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useBalanceVisibility } from '../context/BalanceVisibilityContext'

const ACCOUNT_TYPES = [
  { value: 'Corrente', label: 'Conta Corrente' },
  { value: 'SAVINGS',  label: 'Conta Poupança' },
  { value: 'INVESTMENT', label: 'Investimento' },
]

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

function AccountForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? { name: '', balance: '', accountType: 'Corrente' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div>
        <label className="label">Nome da conta *</label>
        <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div>
        <label className="label">Saldo atual</label>
        <input className="input" type="number" step="0.01" value={form.balance} onChange={e => set('balance', e.target.value)} />
      </div>
      <div>
        <label className="label">Tipo *</label>
        <select className="select" required value={form.accountType} onChange={e => set('accountType', e.target.value)}>
          {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
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

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [modal, setModal] = useState(null) // null | 'create' | {edit: account} | {delete: account}
  const [loading, setLoading] = useState(false)
  const { hideBalance } = useBalanceVisibility()

  const load = () => accountService.list().then(setAccounts)
  useEffect(() => { load() }, [])

  const handleCreate = async (form) => {
    setLoading(true)
    try {
      await accountService.create({ ...form, balance: parseFloat(form.balance) || 0 })
      setModal(null); load()
    } finally { setLoading(false) }
  }

  const handleUpdate = async (form) => {
    setLoading(true)
    try {
      await accountService.update(modal.edit.id, { ...form, balance: parseFloat(form.balance) || 0 })
      setModal(null); load()
    } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await accountService.remove(modal.delete.id)
      setModal(null); load()
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Contas Bancárias</h1>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> Nova Conta
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">Nenhuma conta cadastrada.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => (
            <div key={acc.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-2">
                  <button onClick={() => setModal({ edit: acc })} className="text-gray-400 hover:text-blue-600 transition-colors"><Pencil size={16} /></button>
                  <button onClick={() => setModal({ delete: acc })} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">{acc.name}</h2>
              <p className="text-2xl font-bold text-gray-900">{hideBalance ? '***' : formatCurrency(acc.balance)}</p>
              <p className="text-xs text-gray-400 mt-1">{ACCOUNT_TYPES.find(t => t.value === acc.accountType)?.label}</p>
              {acc.pluggyAccountId && <span className="text-xs text-blue-500 mt-1 block">Sincronizado via Open Finance</span>}
            </div>
          ))}
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Nova Conta" onClose={() => setModal(null)}>
          <AccountForm onSubmit={handleCreate} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.edit && (
        <Modal title="Editar Conta" onClose={() => setModal(null)}>
          <AccountForm initial={modal.edit} onSubmit={handleUpdate} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.delete && (
        <ConfirmDialog
          title="Excluir Conta"
          message={`Deseja excluir a conta "${modal.delete.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
          loading={loading}
        />
      )}
    </div>
  )
}
