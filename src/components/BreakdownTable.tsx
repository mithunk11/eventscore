'use client'

import { useState } from 'react'
import type { BreakdownRow, RoundBlock, JudgeRef } from '@/lib/breakdown'

function tidy(n: number | null | undefined) {
  if (n === null || n === undefined) return '\u2013'
  return String(Math.round(n * 10) / 10)
}

export function BreakdownTable({
  rounds, judges, rows,
}: {
  rounds: RoundBlock[]
  judges: JudgeRef[]
  rows: BreakdownRow[]
}) {
  const [detail, setDetail] = useState(false)
  const multiJudge = judges.length > 1

  return (
    <>
      <div className="bd-head">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>Every mark</p>
          <p className="sub" style={{ marginTop: 4 }}>
            {rows.length} contestant{rows.length === 1 ? '' : 's'}, {rounds.length} round
            {rounds.length === 1 ? '' : 's'}
            {multiJudge ? ', ' + judges.length + ' judges' : ''}
          </p>
        </div>
        <button className="btn btn-ghost" style={{ minHeight: 42, padding: '0 18px', fontSize: 14 }}
          onClick={() => setDetail((d) => !d)}>
          {detail ? 'Hide detail' : 'Show every judge'}
        </button>
      </div>

      <div className="bd-wrap">
        <table className="bd nums">
          <thead>
            <tr>
              <th className="bd-stick bd-rank">#</th>
              <th className="bd-stick bd-name tl">Contestant</th>
              {rounds.map((r) => {
                const span = detail
                  ? (multiJudge ? judges.length : 1) * (r.categories.length + 1) + 1
                  : 1
                return (
                  <th key={r.id} colSpan={span} className="bd-round">
                    R{r.position} <span className="bd-roundname">{r.name}</span>
                  </th>
                )
              })}
              <th className="bd-total">Total</th>
            </tr>

            {detail && (
              <tr className="bd-sub">
                <th className="bd-stick bd-rank" />
                <th className="bd-stick bd-name" />
                {rounds.map((r) => (
                  <>
                    {judges.map((j) => (
                      <>
                        {r.categories.map((c) => (
                          <th key={r.id + j.id + c.id} className="bd-cat">
                            <span className="bd-judge">{j.name.split(' ')[0]}</span>
                            {c.name}
                          </th>
                        ))}
                        <th key={r.id + j.id + 'sum'} className="bd-jtotal">
                          <span className="bd-judge">{j.name.split(' ')[0]}</span>
                          Total
                        </th>
                      </>
                    ))}
                    <th key={r.id + 'rt'} className="bd-rtotal">Round</th>
                  </>
                ))}
                <th className="bd-total" />
              </tr>
            )}
          </thead>

          <tbody>
            {rows.map((row, i) => (
              <tr key={row.contestantId} className={i < 3 ? 'bd-top' : ''}>
                <td className="bd-stick bd-rank">{i + 1}</td>
                <td className="bd-stick bd-name tl">
                  {row.bib && <span className="bd-bib">{row.bib}</span>}
                  {row.name}
                </td>

                {rounds.map((r) => {
                  const took = row.roundTotals[r.id] !== null && row.roundTotals[r.id] !== undefined
                  if (!detail) {
                    return (
                      <td key={r.id} className={took ? '' : 'bd-out'}>
                        {tidy(row.roundTotals[r.id])}
                      </td>
                    )
                  }
                  return (
                    <>
                      {judges.map((j) => (
                        <>
                          {r.categories.map((c) => (
                            <td key={r.id + j.id + c.id} className={took ? 'bd-cell' : 'bd-out bd-cell'}>
                              {took ? tidy(row.marks[r.id]?.[j.id]?.[c.id] ?? 0) : '\u2013'}
                            </td>
                          ))}
                          <td key={r.id + j.id + 'sum'} className={took ? 'bd-jtotal' : 'bd-out bd-jtotal'}>
                            {took ? tidy(row.judgeTotals[r.id]?.[j.id] ?? 0) : '\u2013'}
                          </td>
                        </>
                      ))}
                      <td key={r.id + 'rt'} className={took ? 'bd-rtotal' : 'bd-out bd-rtotal'}>
                        {tidy(row.roundTotals[r.id])}
                      </td>
                    </>
                  )
                })}

                <td className="bd-total">{tidy(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="sub" style={{ fontSize: 12, marginTop: 12 }}>
        A dash means the contestant was not in that round. Round figures are every
        judge added together. {multiJudge && !detail && 'Tap Show every judge for the individual marks.'}
      </p>
    </>
  )
}
