import { useEffect, useState } from 'react'
import { establishmentService } from '../services/establishmentService'
import { categoryService } from '../services/categoryService'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const EMPTY = { name: '', categoryId: '' }

function EstablishmentForm({ initial, categories, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? EMPTY)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, categoryId: form.categoryId || null }) }} className="space-y-4">
      <div>
        <label className="label">Nome *</label>
        <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div>
        <label className="label">Categoria</label>
        <select className="select" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
          <option value="">Sem categoria</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </form>
  )
}

export default function Establishments() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => establishmentService.list().then(setItems)

  useEffect(() => {
    load()
    categoryService.list().then(setCategories)
  }, [])

  const handleCreate = async (form) => {
    setLoading(true)
    try { await establishmentService.create(form); setModal(null); load() }
    finally { setLoading(false) }
  }

  const handleUpdate = async (form) => {
    setLoading(true)
    try { await establishmentService.update(modal.edit.id, form); setModal(null); load() }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setLoading(true)
    try { await establishmentService.remove(modal.delete.id); setModal(null); load() }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Estabelecimentos</h1>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> Novo Estabelecimento
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Categoria</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-10 text-gray-400">Nenhum estabelecimento cadastrado.</td></tr>
            ) : items.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                <td className="px-4 py-3">
                  {e.categoryName ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: (e.categoryColor ?? '#e5e7eb') + '33', color: e.categoryColor ?? '#374151' }}>
                      {e.categoryName}
                    </span>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setModal({ edit: { ...e, categoryId: e.categoryId ?? '' } })}
                      className="text-gray-400 hover:text-blue-600"><Pencil size={15} /></button>
                    <button onClick={() => setModal({ delete: e })}
                      className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'create' && (
        <Modal title="Novo Estabelecimento" onClose={() => setModal(null)}>
          <EstablishmentForm categories={categories} onSubmit={handleCreate} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.edit && (
        <Modal title="Editar Estabelecimento" onClose={() => setModal(null)}>
          <EstablishmentForm initial={modal.edit} categories={categories} onSubmit={handleUpdate} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.delete && (
        <ConfirmDialog title="Excluir Estabelecimento"
          message={`Deseja excluir "${modal.delete.name}"?`}
          onConfirm={handleDelete} onCancel={() => setModal(null)} loading={loading} />
      )}
    </div>
  )
}
