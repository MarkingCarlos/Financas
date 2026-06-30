import { useEffect, useState } from 'react'
import { savingsService } from '../services/savingsService'
import { accountService } from '../services/accountService'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2, PiggyBank, ArrowRightLeft, ArrowDownToLine, Wallet } from 'lucide-react'
import { useBalanceVisibility } from '../context/BalanceVisibilityContext'
import CurrencyInput from '../components/ui/CurrencyInput'
import styles from './Savings.module.css'

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
        <CurrencyInput className="input" value={form.amount} onChange={v => set('amount', v)} />
      </div>
      <div>
        <label className="label">Cor</label>
        <div className={styles.colorPickerRow}>
          {COLORS.map(c => (
            <button key={c} type="button"
              onClick={() => set('color', c)}
              className={`${styles.colorSwatch} ${form.color === c ? styles.colorSwatchSelected : ''}`}
              style={{ background: c }}
            />
          ))}
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

function DepositModal({ saving, onClose, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try { await savingsService.deposit(saving.id, parseFloat(amount)); onSuccess() }
    finally { setLoading(false) }
  }

  return (
    <Modal title={`Depositar — ${saving.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className={styles.currentBalanceInfo}>
          Saldo atual: <span className={styles.balanceLabel}>{formatCurrency(saving.amount)}</span>
        </div>
        <div>
          <label className="label">Valor a depositar *</label>
          <CurrencyInput className="input" required value={amount} onChange={setAmount} />
        </div>
        <div className={styles.formActions}>
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
    amount: saving.amount != null ? Number(saving.amount).toFixed(2) : '',
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
        <div className={styles.currentBalanceInfo}>
          Disponível: <span className={styles.balanceLabel}>{formatCurrency(saving.amount)}</span>
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
          <CurrencyInput className="input" required value={form.amount} onChange={v => set('amount', v)} />
          {insufficient && (
            <p className={styles.insufficientWarning}>Valor maior que o saldo disponível.</p>
          )}
        </div>

        <div className={styles.formActions}>
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

  const handleToggleAvailable = async (id) => {
    await savingsService.toggleAvailable(id)
    load()
  }

  const total = savings.reduce((sum, s) => sum + (s.amount ?? 0), 0)

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Dinheiro Guardado</h1>
          {savings.length > 0 && (
            <p className={styles.totalSavingsText}>
              Total: <span className={styles.totalSavingsAmount}>{hideBalance ? '***' : formatCurrency(total)}</span>
            </p>
          )}
        </div>
        <button onClick={() => setModal('create')} className="btn-primary shrink-0">
          <Plus size={16} /> Novo Cofre
        </button>
      </div>

      {savings.length === 0 ? (
        <div className={styles.emptyState}>
          <PiggyBank size={40} className={styles.emptyStateIcon} />
          <p>Nenhum cofre cadastrado.</p>
        </div>
      ) : (
        <div className={styles.savingsGrid}>
          {savings.map(s => (
            <div key={s.id} className={styles.savingsCard}>
              <div className={styles.savingsCardTopRow}>
                <div className={styles.savingsCardIdentity}>
                  <div className={styles.savingsCardIcon} style={{ background: s.color ?? '#10b981' }}>
                    <PiggyBank size={20} className="text-white" />
                  </div>
                  <p className={styles.savingsCardName}>{s.name}</p>
                </div>
                <div className={styles.savingsCardActions}>
                  <button onClick={() => setModal({ edit: s })} className={styles.editButton}><Pencil size={16} /></button>
                  <button onClick={() => setModal({ delete: s })} className={styles.deleteButton}><Trash2 size={16} /></button>
                </div>
              </div>

              <p className={styles.savingsBalance}>{hideBalance ? '***' : formatCurrency(s.amount)}</p>

              <button
                onClick={() => handleToggleAvailable(s.id)}
                className={`${styles.availabilityToggle} ${s.available ? styles.availabilityToggleOn : styles.availabilityToggleOff}`}
              >
                <span className={styles.availabilityToggleLabel}>
                  <Wallet size={14} />
                  {s.available ? 'Disponível no saldo' : 'Guardado (não conta no saldo)'}
                </span>
                <div className={`${styles.toggleTrack} ${s.available ? styles.toggleTrackOn : styles.toggleTrackOff}`}>
                  <span className={`${styles.toggleThumb} ${s.available ? styles.toggleThumbOn : styles.toggleThumbOff}`} />
                </div>
              </button>

              <div className={styles.savingsButtonRow}>
                <button onClick={() => setModal({ deposit: s })} className={styles.depositButton}>
                  <ArrowDownToLine size={14} /> Depositar
                </button>
                <button
                  onClick={() => setModal({ transfer: s })}
                  disabled={!s.amount || s.amount <= 0 || accounts.length === 0}
                  className={styles.transferButton}>
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
        <DepositModal saving={modal.deposit} onClose={() => setModal(null)} onSuccess={() => { setModal(null); load() }} />
      )}
      {modal?.transfer && (
        <TransferModal saving={modal.transfer} accounts={accounts} onClose={() => setModal(null)} onSuccess={() => { setModal(null); load() }} />
      )}
      {modal?.delete && (
        <ConfirmDialog title="Excluir Cofre"
          message={`Deseja excluir o cofre "${modal.delete.name}"? O saldo será perdido.`}
          onConfirm={handleDelete} onCancel={() => setModal(null)} loading={loading} />
      )}
    </div>
  )
}
