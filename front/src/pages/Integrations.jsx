import { useEffect, useState } from 'react'
import { pluggyService } from '../services/pluggyService'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { RefreshCw, Trash2, Link2, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import styles from './Integrations.module.css'

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
    <span className={`${styles.statusBadge} ${cfg.color}`}>
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
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Integrações Open Finance</h1>
          <p className={styles.pageSubtitle}>Conecte suas contas bancárias automaticamente via Pluggy.</p>
        </div>
        <button onClick={handleConnect} disabled={connectLoading} className="btn-primary shrink-0">
          <Link2 size={16} /> {connectLoading ? 'Abrindo...' : 'Conectar banco'}
        </button>
      </div>

      {connections.length === 0 ? (
        <div className={styles.emptyState}>
          <Link2 size={40} className={styles.emptyStateIcon} />
          <p className={styles.emptyStateTitle}>Nenhuma integração ativa</p>
          <p className={styles.emptyStateSubtitle}>Clique em "Conectar banco" para importar seus dados automaticamente.</p>
        </div>
      ) : (
        <div className={styles.connectionList}>
          {connections.map(conn => (
            <div key={conn.id} className={styles.connectionCard}>
              <div className={styles.connectionInfo}>
                <p className={styles.connectionName}>{conn.connectorName ?? conn.itemId}</p>
                <div className={styles.connectionMeta}>
                  <StatusBadge status={conn.status} />
                  {conn.lastSyncAt && (
                    <span className={styles.lastSyncText}>
                      Última sync: {new Date(conn.lastSyncAt).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.connectionActions}>
                <button
                  onClick={() => handleSync(conn.id)}
                  disabled={loadingSync === conn.id}
                  className={styles.syncButton}>
                  <RefreshCw size={14} className={loadingSync === conn.id ? 'animate-spin' : ''} />
                  Sincronizar
                </button>
                <button onClick={() => setDeleteModal(conn)} className={styles.disconnectButton}>
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
