
export default function Notice({ notice, onClose }) {
  if (!notice) return null

  const type = notice.type || 'success'

  return (
    <div
      className={`notice notice-${type}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <span>{notice.message || notice.text || notice}</span>

      {onClose && (
        <button
          type="button"
          className="notice-close"
          onClick={onClose}
          aria-label="Fechar aviso"
        >
          ×
        </button>
      )}
    </div>
  )
}
