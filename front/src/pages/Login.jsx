import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { PiggyBank, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import * as authService from '../services/authService'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [linked, setLinked] = useState(false)
  const [iconFocused, setIconFocused] = useState(false)

  const clearError = () => setError(null)

  const handleTabChange = (newTab) => {
    setTab(newTab)
    setError(null)
    setLinked(false)
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = tab === 'login'
        ? await authService.loginWithEmail(email, password)
        : await authService.register(name, email, password)
      authService.setToken(result.token)
      if (result.linked) setLinked(true)
      navigate('/', { replace: true })
    } catch (err) {
      const data = err.response?.data
      if (data?.googleOnly) {
        setError({ message: data.detail, googleOnly: true })
      } else {
        setError({ message: data?.detail || 'Algo deu errado. Tente novamente.' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (response) => {
    setLoading(true)
    setError(null)
    try {
      const result = await authService.loginWithGoogle(response.credential)
      authService.setToken(result.token)
      navigate('/', { replace: true })
    } catch (err) {
      setError({ message: 'Falha no login com Google. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (hasError) =>
    `${styles.authInput} ${hasError ? styles.authInputError : styles.authInputDefault}`

  return (
    <div className={styles.pageWrapper}>

      <div className={styles.brandSection}>
        <div className={`${styles.logoContainer} ${iconFocused ? styles.logoContainerFocused : ''}`}>
          <PiggyBank size={40} className="text-white" />
        </div>
        <h1 className={styles.appTitle}>Finanças</h1>
        <p className={styles.appSubtitle}>Gerencie suas finanças pessoais</p>
      </div>

      <div className={styles.card}>

        <div className={styles.tabsRow}>
          {['login', 'register'].map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`${styles.tabButton} ${tab === t ? styles.tabButtonActive : styles.tabButtonInactive}`}
            >
              {t === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <div className={styles.cardBody}>

          {linked && (
            <div className={styles.alertSuccess}>
              <CheckCircle2 size={16} className={styles.alertIcon} />
              <span>Contas vinculadas! Seus dados ficam acessíveis por qualquer método de login.</span>
            </div>
          )}

          {error && (
            <div className={styles.alertError}>
              <AlertCircle size={16} className={styles.alertIcon} />
              <span>{error.message}</span>
            </div>
          )}

          <form
            onSubmit={handleEmailSubmit}
            className={styles.authForm}
            onFocus={() => setIconFocused(true)}
            onBlur={() => setIconFocused(false)}
          >
            {tab === 'register' && (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); clearError() }}
                  placeholder="Seu nome"
                  required
                  autoComplete="name"
                  className={inputClass(false)}
                />
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); clearError() }}
                placeholder="voce@exemplo.com"
                required
                autoComplete="email"
                className={inputClass(false)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Senha</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearError() }}
                  placeholder={tab === 'register' ? 'Mínimo 8 caracteres' : '••••••••'}
                  required
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  className={`${inputClass(false)} ${styles.authInputWithIcon}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? 'Aguarde...' : tab === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>ou</span>
            <div className={styles.dividerLine} />
          </div>

          <div className={`${styles.googleWrapper} ${loading ? styles.googleWrapperDisabled : ''}`}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError({ message: 'Falha no login com Google. Tente novamente.' })}
              shape="rectangular"
              size="large"
              text={tab === 'register' ? 'signup_with' : 'signin_with'}
              locale="pt-BR"
              width="100%"
            />
          </div>

          <p className={styles.footerNote}>
            Seus dados ficam protegidos e vinculados à sua conta.
          </p>
        </div>
      </div>
    </div>
  )
}
