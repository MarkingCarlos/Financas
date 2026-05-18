import { createContext, useContext, useState } from 'react'

const BalanceVisibilityContext = createContext({ hideBalance: false, toggleHideBalance: () => {} })

export function BalanceVisibilityProvider({ children }) {
  const [hideBalance, setHideBalance] = useState(() => {
    return localStorage.getItem('hideBalance') === 'true'
  })

  const toggleHideBalance = () => {
    setHideBalance(prev => {
      const next = !prev
      localStorage.setItem('hideBalance', String(next))
      return next
    })
  }

  return (
    <BalanceVisibilityContext.Provider value={{ hideBalance, toggleHideBalance }}>
      {children}
    </BalanceVisibilityContext.Provider>
  )
}

export function useBalanceVisibility() {
  return useContext(BalanceVisibilityContext)
}
