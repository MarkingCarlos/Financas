import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import { PiggyBank } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()

  const handleSuccess = (response) => {
    // response.credential é o Google ID Token (JWT)
    localStorage.setItem('google_id_token', response.credential)
    navigate('/', { replace: true })
  }

  const handleError = () => {
    alert('Falha no login com Google. Tente novamente.')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-3">
        <div className="p-4 bg-blue-600 rounded-2xl">
          <PiggyBank size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Finanças</h1>
        <p className="text-gray-500 text-sm">Gerencie suas finanças pessoais</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Entrar</h2>
          <p className="text-sm text-gray-500 mt-1">Use sua conta Google para acessar</p>
        </div>

        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap
          shape="rectangular"
          size="large"
          text="signin_with"
          locale="pt-BR"
        />

        <p className="text-xs text-gray-400 text-center">
          Seus dados ficam armazenados localmente e protegidos pela sua conta Google.
        </p>
      </div>
    </div>
  )
}
