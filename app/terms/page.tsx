import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — ViralHook',
  description: 'Terms and conditions for using the ViralHook platform.',
}

const LAST_UPDATED = 'May 17, 2025'
const CONTACT_EMAIL = 'hello@viralhook.media'
const COMPANY = 'ViralHook Media SRL'

export default function TermsPage() {
  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 24px; height: 80px; display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .nav-logo { display: flex; align-items: center; text-decoration: none; }
        .back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: rgba(255,255,255,0.5); text-decoration: none; transition: color 0.2s; }
        .back-link:hover { color: #fff; }
        .page { max-width: 760px; margin: 0 auto; padding: 128px 24px 96px; }
        .page-tag { display: inline-flex; align-items: center; gap: 6px; background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.2); border-radius: 999px; padding: 5px 14px; font-size: 12px; color: #C084FC; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 20px; }
        .page-title { font-size: clamp(28px, 5vw, 44px); font-weight: 800; letter-spacing: -1.5px; margin-bottom: 8px; }
        .page-date { font-size: 13px; color: rgba(255,255,255,0.3); margin-bottom: 48px; }
        .divider { width: 48px; height: 3px; background: linear-gradient(90deg, #7C3AED, #A855F7); border-radius: 999px; margin-bottom: 48px; }
        .section { margin-bottom: 48px; }
        h2 { font-size: 18px; font-weight: 700; color: #A855F7; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid rgba(168,85,247,0.15); }
        p { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.8; margin-bottom: 14px; }
        p:last-child { margin-bottom: 0; }
        ul { padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
        li { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.7; padding-left: 20px; position: relative; }
        li::before { content: '–'; position: absolute; left: 0; color: #A855F7; }
        a { color: #A855F7; text-decoration: none; }
        a:hover { text-decoration: underline; }
        strong { color: rgba(255,255,255,0.85); font-weight: 600; }
        .info-box { background: rgba(168,85,247,0.06); border: 1px solid rgba(168,85,247,0.15); border-radius: 14px; padding: 20px 24px; margin-bottom: 14px; }
        .warning-box { background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.2); border-radius: 14px; padding: 20px 24px; margin-bottom: 14px; }
        .warning-box p { color: rgba(255,255,255,0.55); }
        .footer-legal { border-top: 1px solid rgba(255,255,255,0.06); padding: 32px 24px; text-align: center; }
        .footer-legal p { font-size: 13px; color: rgba(255,255,255,0.25); }
      `}</style>

      {/* Navbar */}
      <nav className="nav">
        <Link href="/" className="nav-logo">
          <div style={{ width: 100, height: 100, backgroundImage: 'url(/viralhook-logo.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
        </Link>
        <Link href="/" className="back-link">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to home
        </Link>
      </nav>

      <main className="page">
        <div className="page-tag">Legal</div>
        <h1 className="page-title">Terms of Service</h1>
        <p className="page-date">Last updated: {LAST_UPDATED}</p>
        <div className="divider" />

        <div className="section">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the ViralHook platform operated by <strong>{COMPANY}</strong> (&quot;ViralHook&quot;, &quot;we&quot;, &quot;us&quot;). By creating an account or using our service, you agree to these Terms. If you do not agree, do not use the platform.
          </p>
        </div>

        <div className="section">
          <h2>1. Eligibility</h2>
          <p>You must be at least <strong>18 years old</strong> to use ViralHook. By using our platform, you confirm that you meet this requirement and have the legal capacity to enter into a binding agreement.</p>
        </div>

        <div className="section">
          <h2>2. Account Registration</h2>
          <ul>
            <li>You must provide accurate and complete information when creating your account</li>
            <li>You are responsible for maintaining the security of your account credentials</li>
            <li>You must not share your account with others or allow unauthorized access</li>
            <li>Phone verification is required before exporting content — you are responsible for providing a valid phone number</li>
            <li>We reserve the right to suspend or terminate accounts that violate these Terms</li>
          </ul>
        </div>

        <div className="section">
          <h2>3. Acceptable Use</h2>
          <p>You agree to use ViralHook only for lawful purposes. You must <strong>not</strong>:</p>
          <ul>
            <li>Upload videos that contain illegal content, including but not limited to content that promotes violence, hate speech, or child exploitation</li>
            <li>Upload content that infringes the intellectual property rights of others (copyright, trademarks, etc.)</li>
            <li>Use the platform to generate content that impersonates real people without their consent (deepfakes)</li>
            <li>Attempt to reverse-engineer, scrape, or abuse the platform&apos;s API</li>
            <li>Use automated tools to create accounts or generate exports in bulk beyond your plan limits</li>
            <li>Circumvent export limits or other technical restrictions of your subscription plan</li>
          </ul>
          <div className="warning-box">
            <p>Violation of acceptable use policies will result in <strong style={{ color: '#fca5a5' }}>immediate account suspension</strong> without refund.</p>
          </div>
        </div>

        <div className="section">
          <h2>4. Your Content</h2>
          <p>You retain full ownership of all videos you upload and all clips you export. By uploading content to ViralHook, you grant us a <strong>limited, non-exclusive license</strong> solely to process, store, and deliver your content as part of the service.</p>
          <p>We do not claim ownership of your content, use it for training AI models, or share it with third parties outside of what is required to deliver the service.</p>
          <p>You are solely responsible for ensuring you have the rights to upload and process any content you submit to our platform.</p>
        </div>

        <div className="section">
          <h2>5. Subscriptions and Payments</h2>
          <ul>
            <li>Paid plans are billed monthly in advance via Stripe</li>
            <li>Prices are shown in EUR and are inclusive of all applicable taxes</li>
            <li>Export limits reset at the beginning of each billing period</li>
            <li>Unused exports do not carry over to the next month</li>
            <li>You may cancel your subscription at any time from your billing dashboard — your plan remains active until the end of the paid period</li>
            <li>We do not offer refunds for partial months or unused exports</li>
            <li>We reserve the right to change pricing with 30 days&apos; notice to existing subscribers</li>
          </ul>
        </div>

        <div className="section">
          <h2>6. Free Plan</h2>
          <p>The Free plan includes 3 exports per month at no cost. No credit card is required. We reserve the right to modify, limit, or discontinue the Free plan at any time with reasonable notice.</p>
        </div>

        <div className="section">
          <h2>7. Intellectual Property</h2>
          <p>The ViralHook platform, including its design, technology, trademarks, and AI models, is the exclusive property of <strong>{COMPANY}</strong>. Nothing in these Terms grants you any rights to our intellectual property beyond the limited license to use the platform as intended.</p>
        </div>

        <div className="section">
          <h2>8. Limitation of Liability</h2>
          <p>To the maximum extent permitted by applicable law:</p>
          <ul>
            <li>ViralHook is provided &quot;as is&quot; without warranties of any kind, express or implied</li>
            <li>We do not guarantee that the platform will be uninterrupted, error-free, or that AI-generated clips will meet any specific quality standard</li>
            <li>Our total liability to you for any claims arising from these Terms shall not exceed the amount you paid us in the 3 months preceding the claim</li>
            <li>We are not liable for any indirect, incidental, consequential, or punitive damages</li>
          </ul>
        </div>

        <div className="section">
          <h2>9. Indemnification</h2>
          <p>You agree to indemnify and hold ViralHook and its directors harmless from any claims, damages, or expenses (including legal fees) arising from: (a) your use of the platform; (b) your uploaded content; or (c) your violation of these Terms or applicable law.</p>
        </div>

        <div className="section">
          <h2>10. Termination</h2>
          <p>Either party may terminate the relationship at any time. You may delete your account from your profile settings. We may suspend or terminate your account for violation of these Terms, fraudulent activity, or non-payment, with or without notice depending on the severity of the violation.</p>
          <p>Upon termination, your right to use the platform ceases immediately. You may request a copy of your data before deletion.</p>
        </div>

        <div className="section">
          <h2>11. Governing Law</h2>
          <p>These Terms are governed by the laws of <strong>Romania</strong> and the applicable EU regulations. Any disputes shall be subject to the exclusive jurisdiction of the courts of Romania. As a consumer in the EU, you may also benefit from mandatory consumer protection provisions of your country of residence.</p>
        </div>

        <div className="section">
          <h2>12. Changes to These Terms</h2>
          <p>We may update these Terms from time to time. We will notify you of material changes by email or via a notice on the platform at least <strong>14 days</strong> before the changes take effect. Continued use of the platform after the effective date constitutes acceptance of the updated Terms.</p>
        </div>

        <div className="section">
          <h2>13. Contact</h2>
          <p>For any questions about these Terms, contact us at:</p>
          <div className="info-box">
            <p><strong>{COMPANY}</strong><br />
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
          </div>
        </div>
      </main>

      <footer className="footer-legal">
        <p>© {new Date().getFullYear()} {COMPANY}. All rights reserved. · <Link href="/privacy" style={{ color: '#A855F7' }}>Privacy Policy</Link></p>
      </footer>
    </div>
  )
}
