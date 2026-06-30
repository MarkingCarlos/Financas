import Modal from './Modal'
import styles from './ConfirmDialog.module.css'

export default function ConfirmDialog({ title, message, onConfirm, onCancel, loading }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button onClick={onConfirm} disabled={loading} className="btn-danger">
          {loading ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
    </Modal>
  )
}
