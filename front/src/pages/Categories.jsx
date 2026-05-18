import { useEffect, useState } from 'react'
import { categoryService } from '../services/categoryService'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const COLORS = ['#f97316','#ec4899','#8b5cf6','#3b82f6','#10b981','#f59e0b','#06b6d4','#84cc16','#22c55e','#94a3b8','#ef4444','#14b8a6']

function CategoryForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? { name: '', color: '#3b82f6', icon: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div>
        <label className="label">Nome *</label>
        <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div>
        <label className="label">Cor</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {COLORS.map(c => (
            <button key={c} type="button"
              onClick={() => set('color', c)}
              className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
              style={{ background: c }}
            />
          ))}
          <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
            className="w-7 h-7 rounded-full cursor-pointer border-0 p-0" />
        </div>
      </div>
      <div>
        <label className="label">Ícone (nome)</label>
        <input className="input" placeholder="ex: shopping-cart" value={form.icon} onChange={e => set('icon', e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </form>
  )
}

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => categoryService.list().then(setCategories)
  useEffect(() => { load() }, [])

  const handleCreate = async (form) => {
    setLoading(true)
    try { await categoryService.create(form); setModal(null); load() }
    finally { setLoading(false) }
  }

  const handleUpdate = async (form) => {
    setLoading(true)
    try { await categoryService.update(modal.edit.id, form); setModal(null); load() }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setLoading(true)
    try { await categoryService.remove(modal.delete.id); setModal(null); load() }
    finally { setLoading(false) }
  }

  const defaults = categories.filter(c => c.isDefault)
  const customs = categories.filter(c => !c.isDefault)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> Nova Categoria
        </button>
      </div>

      {defaults.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Padrão</h2>
          <div className="flex flex-wrap gap-2">
            {defaults.map(c => (
              <span key={c.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                style={{ background: c.color ?? '#94a3b8' }}>
                {c.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {customs.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Personalizadas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customs.map(c => (
              <div key={c.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: c.color ?? '#94a3b8' }} />
                  <span className="font-medium text-gray-800">{c.name}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal({ edit: c })} className="text-gray-400 hover:text-blue-600"><Pencil size={15} /></button>
                  <button onClick={() => setModal({ delete: c })} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {categories.length === 0 && (
        <div className="card p-10 text-center text-gray-400">Nenhuma categoria encontrada.</div>
      )}

      {modal === 'create' && (
        <Modal title="Nova Categoria" onClose={() => setModal(null)}>
          <CategoryForm onSubmit={handleCreate} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.edit && (
        <Modal title="Editar Categoria" onClose={() => setModal(null)}>
          <CategoryForm initial={modal.edit} onSubmit={handleUpdate} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.delete && (
        <ConfirmDialog title="Excluir Categoria"
          message={`Deseja excluir a categoria "${modal.delete.name}"?`}
          onConfirm={handleDelete} onCancel={() => setModal(null)} loading={loading} />
      )}
    </div>
  )
}
