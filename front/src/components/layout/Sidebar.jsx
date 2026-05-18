import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Landmark, CreditCard, ArrowLeftRight,
  Tag, Link2, PiggyBank, CalendarClock, LogOut, X, Store
} from 'lucide-react'

const navItems = [
  { to: '/',                icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts',        icon: Landmark,        label: 'Contas' },
  { to: '/credit-cards',    icon: CreditCard,      label: 'Cartões' },
  { to: '/savings',         icon: PiggyBank,       label: 'Dinheiro Guardado' },
  { to: '/transactions',    icon: ArrowLeftRight,  label: 'Transações' },
  { to: '/upcoming',        icon: CalendarClock,   label: 'Próximos Meses' },
  { to: '/categories',      icon: Tag,             label: 'Categorias' },
  { to: '/establishments',  icon: Store,           label: 'Estabelecimentos' },
  { to: '/integrations',    icon: Link2,           label: 'Integrações' },
]

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const hasToken = !!localStorage.getItem('google_id_token')

  const handleLogout = () => {
    localStorage.removeItem('google_id_token')
    navigate('/login', { replace: true })
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col
        transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 lg:z-auto lg:transition-none lg:shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xl font-bold text-blue-600">Finanças</span>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {hasToken && (
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
