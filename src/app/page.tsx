import { Brand } from '@/components/Brand'

export default function HomePage() {
  return (
    <div className="app">
      <div className="spot" />
      <div className="screen" style={{ paddingTop: 90 }}>
        <Brand size={30} />
        <p className="eyebrow" style={{ marginTop: 44 }}>Competition scoring</p>
        <h1 className="display d-xl">Scoring, without the paperwork.</h1>
        <p className="sub" style={{ marginBottom: 34 }}>
          Judges mark on their phones. Totals, shortlists and the podium work
          themselves out.
        </p>

        <a className="btn btn-amber btn-full" href="/login">Organiser sign in</a>
        <a className="btn btn-ghost btn-full" href="/judge" style={{ marginTop: 10 }}>
          I am a judge
        </a>

        <nav className="legal-nav" style={{ marginTop: 50 }}>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/dpa">Data Processing</a>
        </nav>
      </div>
    </div>
  )
}
