import { Brand } from '@/components/Brand'

export function SiteNav({ current }: { current?: 'home' | 'contact' }) {
  return (
    <header className="site-nav">
      <a href="/" aria-label="EventScore home"><Brand size={44} badge /></a>
      <nav>
        <a href="/" className={current === 'home' ? 'nav-on' : ''}>Home</a>
        <a href="/#how">How it works</a>
        <a href="/contact" className={current === 'contact' ? 'nav-on' : ''}>Contact</a>
        <a className="btn btn-ghost nav-btn" href="/login">Sign in</a>
      </nav>
    </header>
  )
}

export function SiteFoot() {
  return (
    <footer className="site-foot">
      <Brand size={32} />
      <nav>
        <a href="/">Home</a>
        <a href="/contact">Contact</a>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="/dpa">Data Processing</a>
        <a href="/login">Sign in</a>
      </nav>
      <p>&copy; {new Date().getFullYear()} EventScore</p>
    </footer>
  )
}
