import { Routes, Route, Navigate } from 'react-router-dom'

import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import CreditCards from './pages/CreditCards'
import Savings from './pages/Savings'
import Transactions from './pages/Transactions'
import Upcoming from './pages/Upcoming'
import Categories from './pages/Categories'
import Integrations from './pages/Integrations'
import Establishments from './pages/Establishments'
import Login from './pages/Login'

// Guarda de rota: redireciona para /login se não houver token Google
function RequireAuth({ children }) {
  const token = localStorage.getItem('google_id_token')
  // Em dev sem token configurado, deixa passar (backend com security desabilitado)
  const securityEnabled = import.meta.env.VITE_SECURITY_ENABLED === 'true'
  if (securityEnabled && !token) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="credit-cards" element={<CreditCards />} />
        <Route path="savings" element={<Savings />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="upcoming" element={<Upcoming />} />
        <Route path="categories" element={<Categories />} />
        <Route path="establishments" element={<Establishments />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
