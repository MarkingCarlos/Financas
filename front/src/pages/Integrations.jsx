import { useEffect, useState } from 'react'
import { pluggyService } from '../services/pluggyService'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { RefreshCw, Trash2, Link2, CheckCircle, AlertCircle, Loader } from 'lucide-react'

function StatusBadge({ status }) {
  const map = {
    ACTIVE: { label: 'Ativo', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    UPDATING: { label: 'Sincronizando', color: 'bg-blue-100 text-blue-700', icon: Loader },
    ERROR: { label: 'Erro', color: 'bg-red-100 text-red-700', icon: AlertCircle },
    DISCONNECTED: { label: 'Desconectado', color: 'bg-gray-100 text-gray-500', icon: AlertCircle },
  }
  const cfg = map[status] ?? map.DISCONNECTED
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

export default function Integrations() {
  const [connections, setConnections] = useState([])
  const [loadingSync, setLoadingSync] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [connectLoading, setConnectLoading] = useState(false)

  const load = () => pluggyService.listConnections().then(setConnections)
  useEffect(() => { load() }, [])

  const handleConnect = async () => {
    setConnectLoading(true)
    try {
      const { connectToken } = await pluggyService.getConnectToken()

      // Carrega o SDK da Pluggy dinamicamente
      if (!window.PluggyConnect) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2/pluggy-connect.js'
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }

      new window.PluggyConnect({
        connectToken,
        onSuccess: async ({ item }) => {
          await pluggyService.registerItem(item.id)
          load()
        },
        onError: (err) => console.error('Pluggy error:', err),
      }).init()
    } catch (e) {
      console.error(e)
    } finally {
      setConnectLoading(false)
    }
  }

  const handleSync = async (id) => {
    setLoadingSync(id)
    try { await pluggyService.sync(id); load() }
    finally { setLoadingSync(null) }
  }

  const handleDelete = async () => {
    setLoadingDelete(true)
    try { await pluggyService.disconnect(deleteModal.id); setDeleteModal(null); load() }
    finally { setLoadingDelete(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrações Open Finance</h1>
          <p className="text-sm text-gray-500 mt-1">Conecte suas contas bancárias automaticamente via Pluggy.</p>
        </div>
        <button onClick={handleConnect} disabled={connectLoading} className="btn-primary shrink-0">
          <Link2 size={16} /> {connectLoading ? 'Abrindo...' : 'Conectar banco'}
        </button>
      </div>

      {connections.length === 0 ? (
        <div className="card p-10 text-center">
          <Link2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma integração ativa</p>
          <p className="text-sm text-gray-400 mt-1">Clique em "Conectar banco" para importar seus dados automaticamente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map(conn => (
            <div key={conn.id} className="card p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{conn.connectorName ?? conn.itemId}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <StatusBadge status={conn.status} />
                  {conn.lastSyncAt && (
                    <span className="text-xs text-gray-400">
                      Última sync: {new Date(conn.lastSyncAt).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleSync(conn.id)}
                  disabled={loadingSync === conn.id}
                  className="btn-secondary text-sm px-3 py-1.5">
                  <RefreshCw size={14} className={loadingSync === conn.id ? 'animate-spin' : ''} />
                  Sincronizar
                </button>
                <button onClick={() => setDeleteModal(conn)} className="btn-danger text-sm px-3 py-1.5">
                  <Trash2 size={14} /> Desconectar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteModal && (
        <ConfirmDialog
          title="Desconectar integração"
          message={`Deseja desconectar "${deleteModal.connectorName}"? As transações importadas não serão excluídas.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal(null)}
          loading={loadingDelete}
        />
      )}
    </div>
  )
}
