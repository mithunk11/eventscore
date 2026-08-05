import { SiteNav, SiteFoot } from '@/components/SiteChrome'

export const metadata = {
  title: 'EventScore — competition scoring without the paperwork',
  description:
    'Judges mark on their phones. Totals, shortlists and the podium work themselves out. For talent shows, spelling bees, fashion, dance, pet shows and anything else judged.',
}

const KINDS = [
  'Talent shows', 'Fashion shows', 'Dance competitions', 'Spelling bees',
  'Pet and livestock shows', 'Bake-offs', 'Quiz finals', 'Sports heats',
  'Pageants', 'Science fairs', 'Music festivals', 'Anything with judges',
]

export default function HomePage() {
  return (
    <div className="site">
      <div className="site-glow" />
      <SiteNav current="home" />

      <section className="hero">
        <p className="eyebrow">For any competition with judges and a podium</p>
        <h1 className="display hero-title">Scoring, without<br />the paperwork.</h1>
        <p className="hero-sub">
          Judges mark on their own phones. Totals, shortlists and the podium work
          themselves out, so nobody is adding up columns backstage while an
          audience waits.
        </p>
        <div className="hero-actions">
          <a className="btn btn-amber" href="/contact">Enquire about an event</a>
          <a className="btn btn-ghost" href="/judge">I am a judge</a>
        </div>

        <div className="proof">
          <div><strong className="nums">3</strong><span>rounds, or thirty</span></div>
          <div><strong className="nums">1&ndash;10</strong><span>judges, marking at once</span></div>
          <div><strong>0</strong><span>sums to do by hand</span></div>
        </div>
      </section>

      <section className="band">
        <p className="eyebrow">The problem</p>
        <h2 className="display band-title">Paper works, until the last ten minutes</h2>
        <div className="twocol">
          <p>
            Scoring a competition on paper is fine right up to the point where it
            isn&rsquo;t. Someone collects the sheets. Someone else adds them up twice
            because the first answer looked wrong. A judge&rsquo;s seven could be a one.
            The audience is waiting, the host is filling, and the person with the
            calculator is the most stressed individual in the building.
          </p>
          <p>
            Then a contestant asks why they placed fourth, and the honest answer is
            that the sheets are in a folder somewhere and nobody wants to go through
            them again in front of a crowd.
          </p>
        </div>
      </section>

      <section className="band band-tint" id="how">
        <p className="eyebrow">How it works</p>
        <h2 className="display band-title">Three steps, one evening</h2>

        <div className="steps">
          <article className="stepcard stepcard-1">
            <span className="stepnum nums">01</span>
            <h3 className="display d-l">Set it up beforehand</h3>
            <p>
              Your rounds, your categories, your marks out of whatever number suits.
              Add entrants with photos and numbers, then invite judges by link or QR
              code. Ten minutes, done the week before.
            </p>
          </article>

          <article className="stepcard stepcard-2">
            <span className="stepnum nums">02</span>
            <h3 className="display d-l">Judges mark on the night</h3>
            <p>
              Big thumb-sized controls, one entrant at a time, and a row of numbers
              to jump straight to whoever walks on next. Every mark saves as it is
              tapped. Judges review everything before committing.
            </p>
          </article>

          <article className="stepcard stepcard-3">
            <span className="stepnum nums">03</span>
            <h3 className="display d-l">Results appear</h3>
            <p>
              Shortlists calculate themselves between rounds, ready to read out. At
              the end, a podium for the projector and a printable record of every
              mark and comment.
            </p>
          </article>
        </div>
      </section>

      <section className="band">
        <p className="eyebrow">Who uses it</p>
        <h2 className="display band-title">If it has judges, it works</h2>
        <p className="sub" style={{ maxWidth: 560, marginBottom: 30 }}>
          Nothing in EventScore assumes what you are judging. You define the rounds
          and what gets marked in each, so the same tool handles a dog show and a
          debating final.
        </p>
        <ul className="kinds">
          {KINDS.map((k) => <li key={k}>{k}</li>)}
        </ul>
      </section>

      <section className="band band-tint">
        <p className="eyebrow">Built for the night itself</p>
        <h2 className="display band-title">The bits that catch people out</h2>

        <div className="feats">
          <div className="feat">
            <h3>A judge&rsquo;s phone dies</h3>
            <p>Close the round without them and carry on. Their marks up to that point still count, and the rest of the panel is not left waiting.</p>
          </div>
          <div className="feat">
            <h3>Nobody sees the leaderboard</h3>
            <p>Judges mark blind. No anchoring on someone else&rsquo;s score, no awkward glances along the table.</p>
          </div>
          <div className="feat">
            <h3>Two entrants tie</h3>
            <p>A private panel vote settles it, with the head judge deciding if the panel splits. The method is printed on the results so it can be explained.</p>
          </div>
          <div className="feat">
            <h3>Someone disputes a placing</h3>
            <p>Every mark is timestamped and attributed. Export the full record and the conversation is about the marks, not about the arithmetic.</p>
          </div>
          <div className="feat">
            <h3>Judges are not technical</h3>
            <p>They tap a link, type four digits, and see one entrant with big plus and minus buttons. There is nothing else on the screen.</p>
          </div>
          <div className="feat">
            <h3>The data is sensitive</h3>
            <p>Photographs and names are stored in Ireland, never on a public address, and deleted automatically after your event. We do not read them.</p>
          </div>
        </div>
      </section>

      <section className="band cta-band">
        <h2 className="display band-title" style={{ marginBottom: 14 }}>
          Running something soon?
        </h2>
        <p className="sub" style={{ maxWidth: 480, margin: '0 auto 26px' }}>
          Accounts are set up by hand so everything is sized to your competition.
          Tell us what you are running and we will come back to you.
        </p>
        <a className="btn btn-amber" href="/contact" style={{ minWidth: 220 }}>Get in touch</a>
      </section>

      <SiteFoot />
    </div>
  )
}
