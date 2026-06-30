import { useEffect, useState } from 'react'
import { accountService } from '../services/accountService'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useBalanceVisibility } from '../context/BalanceVisibilityContext'
import styles from './Accounts.module.css'

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
      <div className={styles.formActions}>
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
  const [modal, setModal] = useState(null)
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
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Contas Bancárias</h1>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> Nova Conta
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className={styles.emptyState}>Nenhuma conta cadastrada.</div>
      ) : (
        <div className={styles.accountsGrid}>
          {accounts.map(acc => (
            <div key={acc.id} className={styles.accountCard}>
              <div className={styles.accountCardTopRow}>
                <div className={styles.accountActionButtons}>
                  <button onClick={() => setModal({ edit: acc })} className={styles.editButton}><Pencil size={16} /></button>
                  <button onClick={() => setModal({ delete: acc })} className={styles.deleteButton}><Trash2 size={16} /></button>
                </div>
              </div>
              <h2 className={styles.accountName}>{acc.name}</h2>
              <p className={styles.accountBalance}>{hideBalance ? '***' : formatCurrency(acc.balance)}</p>
              <p className={styles.accountType}>{ACCOUNT_TYPES.find(t => t.value === acc.accountType)?.label}</p>
              {acc.pluggyAccountId && <span className={styles.syncedBadge}>Sincronizado via Open Finance</span>}
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
