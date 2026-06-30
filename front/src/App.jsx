import { Routes, Route, Navigate } from 'react-router-dom'

import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import CreditCards from './pages/CreditCards'
import CreditCardTransactions from './pages/CreditCardTransactions'
import Savings from './pages/Savings'
import WishList from './pages/WishList'
import ThirdParty from './pages/ThirdParty'
import Transactions from './pages/Transactions'
import Upcoming from './pages/Upcoming'
import Categories from './pages/Categories'
import Integrations from './pages/Integrations'
import Establishments from './pages/Establishments'
import Login from './pages/Login'

function RequireAuth({ children }) {
  const token = localStorage.getItem('auth_token')
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
        <Route path="credit-cards/:id" element={<CreditCardTransactions />} />
        <Route path="savings" element={<Savings />} />
        <Route path="wishlist" element={<WishList />} />
        <Route path="third-party" element={<ThirdParty />} />
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
