
import { useState } from 'react'
import { Lock, Eye, EyeOff, MoonStar, Sparkles, ArrowRight } from 'lucide-react'
import { supabase } from './lib/supabase'

export default function ResetPassword({ onComplete }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) throw updateError

      setMessage('Senha alterada com sucesso! Você já pode entrar com sua nova senha.')

      await supabase.auth.signOut()

      window.history.replaceState({}, '', '/')

      if (onComplete) {
        onComplete()
      } else {
        window.location.href = '/'
      }
    } catch (err) {
      setError(
        err.message ||
          'Não foi possível alterar sua senha. Solicite um novo link de recuperação.',
      )
    } finally {
      setLoading(false)
    }
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
          <Sparkles size={22} />
          <h1>Crie uma nova senha</h1>
          <p>Escolha uma senha segura para voltar ao seu espaço.</p>
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
          <label className="auth-label" htmlFor="new-password">
            Nova senha
          </label>

          <div className="auth-input-wrap auth-password-wrap">
            <Lock size={18} />

            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo de 6 caracteres"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button
              className="auth-password-toggle"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <label className="auth-label" htmlFor="confirm-password">
            Confirmar nova senha
          </label>

          <div className="auth-input-wrap auth-password-wrap">
            <Lock size={18} />

            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Digite a senha novamente"
              autoComplete="new-password"
              minLength={6}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />

            <button
              className="auth-password-toggle"
              type="button"
              onClick={() =>
                setShowConfirmPassword((current) => !current)
              }
              aria-label={
                showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'
              }
            >
              {showConfirmPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Alterando senha...' : 'Salvar nova senha'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="auth-privacy">
          Nunca compartilhe sua senha com outras pessoas.
        </p>
      </section>
    </main>
  )
}
