
import { useState } from 'react'
import { supabase } from './lib/supabase'
import {
  MoonStar,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
} from 'lucide-react'

export default function Auth({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const normalizedEmail = email.trim().toLowerCase()

      if (isRecovering) {
        if (!normalizedEmail) {
          throw new Error('Informe seu e-mail para recuperar a senha.')
        }

        const redirectTo = `${window.location.origin}/reset-password`

        const { error } = await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          { redirectTo },
        )

        if (error) throw error

        setMessage(
          'Se houver uma conta cadastrada com esse e-mail, você receberá as instruções para redefinir sua senha. Confira também a caixa de spam.',
        )
        return
      }

      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        })

        if (error) throw error

        if (data.session) {
          onLogin(data.session.user)
        } else {
          setMessage(
            'Conta criada! Confira seu e-mail para confirmar o cadastro antes de entrar.',
          )
          setIsRegister(false)
          setPassword('')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })

        if (error) throw error

        onLogin(data.user)
      }
    } catch (err) {
      setError(
        err.message || 'Não foi possível concluir a operação.',
      )
    } finally {
      setLoading(false)
    }
  }

  function changeMode(mode) {
    setIsRegister(mode === 'register')
    setIsRecovering(mode === 'recover')
    setShowPassword(false)
    setPassword('')
    setMessage('')
    setError('')
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark">
            <MoonStar size={28} />
          </div>
          <span>ESPAÇO ORACULAR</span>
        </div>

        <div className="auth-heading">
          {isRecovering ? (
            <KeyRound size={22} />
          ) : (
            <Sparkles size={22} />
          )}

          <h1>
            {isRecovering
              ? 'Recupere sua senha'
              : isRegister
                ? 'Crie seu espaço'
                : 'Boas-vindas de volta'}
          </h1>

          <p>
            {isRecovering
              ? 'Informe seu e-mail para receber as instruções de redefinição de senha.'
              : isRegister
                ? 'Crie sua conta para organizar seus atendimentos.'
                : 'Entre para acessar seu espaço de trabalho.'}
          </p>
        </div>

        {error && (
          <div className="auth-message auth-error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="auth-message auth-success" role="status">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="auth-email">
            E-mail
          </label>

          <div className="auth-input-wrap">
            <Mail size={18} />

            <input
              id="auth-email"
              type="email"
              placeholder="voce@exemplo.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          {!isRecovering && (
            <>
              <label className="auth-label" htmlFor="auth-password">
                Senha
              </label>

              <div className="auth-input-wrap auth-password-wrap">
                <Lock size={18} />

                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={
                    isRegister
                      ? 'Mínimo de 6 caracteres'
                      : 'Digite sua senha'
                  }
                  autoComplete={
                    isRegister ? 'new-password' : 'current-password'
                  }
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <button
                  className="auth-password-toggle"
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword ? 'Ocultar senha' : 'Mostrar senha'
                  }
                  aria-pressed={showPassword}
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </>
          )}

          {!isRegister && !isRecovering && (
            <div className="auth-forgot-password">
              <button
                type="button"
                onClick={() => changeMode('recover')}
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Aguarde...'
              : isRecovering
                ? 'Enviar instruções'
                : isRegister
                  ? 'Criar minha conta'
                  : 'Entrar'}

            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {isRecovering ? (
          <div className="auth-switch">
            <button
              type="button"
              className="auth-back-button"
              onClick={() => changeMode('login')}
            >
              <ArrowLeft size={15} />
              Voltar para o login
            </button>
          </div>
        ) : (
          <div className="auth-switch">
            {isRegister
              ? 'Já tem uma conta?'
              : 'Ainda não tem uma conta?'}

            <button
              type="button"
              onClick={() =>
                changeMode(isRegister ? 'login' : 'register')
              }
            >
              {isRegister ? 'Entrar' : 'Criar conta'}
            </button>
          </div>
        )}

        <p className="auth-privacy">
          Seus dados devem ser acessados somente por usuários autorizados.
        </p>
      </section>
    </main>
  )
}
