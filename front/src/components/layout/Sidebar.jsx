import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Landmark, CreditCard, ArrowLeftRight,
  Tag, Link2, PiggyBank, CalendarClock, LogOut, X, Store, ShoppingBag, Users
} from 'lucide-react'
import styles from './Sidebar.module.css'

const navItems = [
  { to: '/',                icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts',        icon: Landmark,        label: 'Contas' },
  { to: '/credit-cards',    icon: CreditCard,      label: 'Cartões' },
  { to: '/savings',         icon: PiggyBank,       label: 'Dinheiro Guardado' },
  { to: '/wishlist',        icon: ShoppingBag,     label: 'Compras Desejadas' },
  { to: '/third-party',     icon: Users,           label: 'Compras de Terceiros' },
  { to: '/transactions',    icon: ArrowLeftRight,  label: 'Transações' },
  { to: '/upcoming',        icon: CalendarClock,   label: 'Próximos Meses' },
  { to: '/categories',      icon: Tag,             label: 'Categorias' },
  { to: '/establishments',  icon: Store,           label: 'Estabelecimentos' },
  { to: '/integrations',    icon: Link2,           label: 'Integrações' },
]

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const hasToken = !!localStorage.getItem('auth_token')

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    navigate('/login', { replace: true })
  }

  return (
    <>
      {isOpen && (
        <div className={styles.mobileOverlay} onClick={onClose} />
      )}

      <aside className={`${styles.sidebarAside} ${isOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <div className={styles.brandHeader}>
          <span className={styles.brandName}>Finanças</span>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <nav className={styles.navList}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : styles.navLinkInactive}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {hasToken && (
          <div className={styles.footer}>
            <button onClick={handleLogout} className={styles.logoutButton}>
              <LogOut size={18} />
              Sair
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
