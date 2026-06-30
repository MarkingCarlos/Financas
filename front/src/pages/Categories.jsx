import { useEffect, useState } from 'react'
import { categoryService } from '../services/categoryService'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import styles from './Categories.module.css'

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
        <div className={styles.colorPickerRow}>
          {COLORS.map(c => (
            <button key={c} type="button"
              onClick={() => set('color', c)}
              className={`${styles.colorSwatch} ${form.color === c ? styles.colorSwatchSelected : ''}`}
              style={{ background: c }}
            />
          ))}
          <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
            className={styles.colorInputNative} />
        </div>
      </div>
      <div>
        <label className="label">Ícone (nome)</label>
        <input className="input" placeholder="ex: shopping-cart" value={form.icon} onChange={e => set('icon', e.target.value)} />
      </div>
      <div className={styles.formActions}>
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
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Categorias</h1>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> Nova Categoria
        </button>
      </div>

      {defaults.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Padrão</h2>
          <div className={styles.defaultCategoryList}>
            {defaults.map(c => (
              <span key={c.id} className={styles.defaultCategoryChip}
                style={{ background: c.color ?? '#94a3b8' }}>
                {c.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {customs.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Personalizadas</h2>
          <div className={styles.customCategoryGrid}>
            {customs.map(c => (
              <div key={c.id} className={styles.customCategoryCard}>
                <div className={styles.categoryNameRow}>
                  <span className={styles.categoryColorDot} style={{ background: c.color ?? '#94a3b8' }} />
                  <span className={styles.categoryName}>{c.name}</span>
                </div>
                <div className={styles.categoryActions}>
                  <button onClick={() => setModal({ edit: c })} className={styles.editButton}><Pencil size={15} /></button>
                  <button onClick={() => setModal({ delete: c })} className={styles.deleteButton}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {categories.length === 0 && (
        <div className={styles.emptyState}>Nenhuma categoria encontrada.</div>
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
