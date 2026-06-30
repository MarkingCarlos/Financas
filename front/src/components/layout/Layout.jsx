import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'
import styles from './Layout.module.css'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={styles.root}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.contentArea}>
        <header className={styles.mobileHeader}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={styles.menuToggle}
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <span className={styles.brandLabel}>Finanças</span>
        </header>

        <main className={styles.mainContent}>
          <div className={styles.contentWrapper}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
