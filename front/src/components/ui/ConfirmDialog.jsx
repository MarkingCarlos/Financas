import Modal from './Modal'

export default function ConfirmDialog({ title, message, onConfirm, onCancel, loading }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button onClick={onConfirm} disabled={loading} className="btn-danger">
          {loading ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
    </Modal>
  )
}
