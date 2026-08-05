import type { LegalDoc } from '@/lib/legal/types'

export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <a className="back" href="/" aria-label="Back">&lsaquo;</a>
        <span className="topbar-title">{doc.title}</span>
      </header>

      <div className="screen">
        <h1 className="display d-xl">{doc.title}</h1>
        <p className="sub" style={{ marginBottom: 30 }}>Last updated {doc.updated}</p>

        {doc.sections.map((s, i) => (
          <section key={i} className="legal-block">
            <h2 className="display d-m">{s.h}</h2>
            {s.p?.map((para, j) => <p key={j} className="legal-p">{para}</p>)}
            {s.list && (
              <ul className="legal-list">
                {s.list.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            )}
            {s.table && (
              <div className="legal-table-wrap">
                <table className="legal-table">
                  {s.table.head.some(Boolean) && (
                    <thead><tr>{s.table.head.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
                  )}
                  <tbody>
                    {s.table.rows.map((row, j) => (
                      <tr key={j}>{row.map((cell, k) => <td key={k}>{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}

        <nav className="legal-nav">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/dpa">Data Processing</a>
        </nav>
      </div>
    </div>
  )
}
