import { SiteNav, SiteFoot } from '@/components/SiteChrome'
import { ContactForm } from '@/components/ContactForm'

export const metadata = {
  title: 'Contact — EventScore',
  description: 'Tell us about your competition and we will get an account set up for you.',
}

export default function ContactPage() {
  return (
    <div className="site">
      <div className="site-glow" />
      <SiteNav current="contact" />

      <section className="band contact-band">
        <div className="contact-wrap">
          <div>
            <p className="eyebrow">Get in touch</p>
            <h1 className="display band-title" style={{ marginBottom: 18 }}>
              Tell us about your event
            </h1>
            <p className="sub" style={{ maxWidth: 440, marginTop: 0 }}>
              Accounts are set up by hand rather than by signup form, so we can size
              things to your competition and make sure it is ready before the night.
            </p>

            <div className="expect">
              <h3>What happens next</h3>
              <ol>
                <li>We read your message, usually within a day or two.</li>
                <li>We come back with any questions about rounds and judges.</li>
                <li>We create your account and send you sign-in details.</li>
                <li>You set up your event and invite your judges.</li>
              </ol>
            </div>

            <div className="expect">
              <h3>Useful things to mention</h3>
              <ul>
                <li>What kind of competition it is</li>
                <li>Roughly how many entrants and judges</li>
                <li>How many rounds, and whether entrants are eliminated between them</li>
                <li>The date, if you have one</li>
              </ul>
            </div>

            <p className="sub" style={{ fontSize: 13 }}>
              We only use what you send here to reply to you. Nothing is added to a
              mailing list. See our <a href="/privacy">Privacy Policy</a>.
            </p>
          </div>

          <ContactForm />
        </div>
      </section>

      <SiteFoot />
    </div>
  )
}
