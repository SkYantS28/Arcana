import { ExternalLink, Mail } from 'lucide-react'

export default function AppFooter({ year, translations: t }) {
  return (
    <footer className="app-footer">
      <div>
        © {year} Sky Crizosti. {t.footerRights}
      </div>

      <div className="footer-links">
        <a href="mailto:crizostisky@gmail.com">
          <Mail size={14} /> {t.email}
        </a>

        <a
          href="https://www.linkedin.com/in/sky-crizosti-127b9a25b"
          target="_blank"
          rel="noreferrer"
        >
          LinkedIn <ExternalLink size={13} />
        </a>
      </div>

      <span className="footer-note">
        {t.footerNote}
      </span>
    </footer>
  )
}
