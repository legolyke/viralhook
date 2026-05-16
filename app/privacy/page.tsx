import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — ViralHook',
  description: 'How ViralHook collects, uses, and protects your personal data.',
}

const LAST_UPDATED = 'May 17, 2025'
const CONTACT_EMAIL = 'hello@viralhook.media'
const COMPANY = 'ViralHook Media SRL'
const AUTHORITY = 'ANSPDCP (Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal)'
const AUTHORITY_URL = 'https://www.dataprotection.ro'

export default function PrivacyPage() {
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
        <h1 className="page-title">Privacy Policy</h1>
        <p className="page-date">Last updated: {LAST_UPDATED}</p>
        <div className="divider" />

        <div className="section">
          <p>
            This Privacy Policy explains how <strong>{COMPANY}</strong> (&quot;ViralHook&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and protects your personal data when you use our platform at <strong>viralhook.media</strong>. We are committed to protecting your privacy in accordance with the <strong>General Data Protection Regulation (GDPR)</strong> and applicable Romanian law.
          </p>
        </div>

        <div className="section">
          <h2>1. Data Controller</h2>
          <div className="info-box">
            <p><strong>{COMPANY}</strong><br />
            Romania<br />
            Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
          </div>
        </div>

        <div className="section">
          <h2>2. Data We Collect</h2>
          <p>We collect the following categories of personal data:</p>
          <ul>
            <li><strong>Account data:</strong> Full name, email address, and password (hashed) when you register</li>
            <li><strong>Phone number:</strong> Required for identity verification via SMS before exporting content</li>
            <li><strong>Authentication data:</strong> If you sign in with Google, we receive your name, email address, and profile picture from Google</li>
            <li><strong>Video content:</strong> Videos you upload for processing. These are stored securely on our servers</li>
            <li><strong>Usage data:</strong> Information about how you use the platform (clips created, exports generated, features used)</li>
            <li><strong>Payment data:</strong> Billing details processed by Stripe. We do not store card numbers — only subscription status and Stripe customer ID</li>
            <li><strong>Technical data:</strong> IP address, browser type, device type, and access timestamps for security and analytics purposes</li>
          </ul>
        </div>

        <div className="section">
          <h2>3. How We Use Your Data</h2>
          <ul>
            <li>To provide, operate, and improve the ViralHook platform</li>
            <li>To verify your identity via SMS before allowing content export</li>
            <li>To send transactional emails (account confirmation, password reset)</li>
            <li>To process payments and manage your subscription</li>
            <li>To prevent fraud, abuse, and unauthorized access</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p>We do not use your data for advertising or sell it to third parties.</p>
        </div>

        <div className="section">
          <h2>4. Legal Basis for Processing</h2>
          <ul>
            <li><strong>Contract performance</strong> — processing necessary to provide the service you signed up for (Art. 6(1)(b) GDPR)</li>
            <li><strong>Legitimate interest</strong> — security monitoring, fraud prevention, platform analytics (Art. 6(1)(f) GDPR)</li>
            <li><strong>Legal obligation</strong> — compliance with applicable Romanian and EU law (Art. 6(1)(c) GDPR)</li>
            <li><strong>Consent</strong> — where explicitly requested (e.g. marketing communications)</li>
          </ul>
        </div>

        <div className="section">
          <h2>5. Third-Party Services</h2>
          <p>We use the following third-party processors, each bound by appropriate data protection agreements:</p>
          <ul>
            <li><strong>Supabase</strong> — database and authentication infrastructure (EU region)</li>
            <li><strong>Vercel</strong> — hosting and content delivery</li>
            <li><strong>Cloudflare R2</strong> — encrypted video file storage</li>
            <li><strong>Twilio</strong> — SMS verification for phone number confirmation</li>
            <li><strong>Resend</strong> — transactional email delivery</li>
            <li><strong>Google</strong> — optional OAuth sign-in</li>
            <li><strong>Stripe</strong> — payment processing and subscription management</li>
          </ul>
        </div>

        <div className="section">
          <h2>6. Data Retention</h2>
          <ul>
            <li><strong>Account data</strong> is retained for as long as your account is active. You may delete your account at any time</li>
            <li><strong>Videos and exported clips</strong> are stored in your account until you delete them manually from your dashboard</li>
            <li><strong>Payment records</strong> are retained for 5 years as required by Romanian fiscal law</li>
            <li><strong>Server logs</strong> are retained for up to 90 days for security purposes</li>
          </ul>
        </div>

        <div className="section">
          <h2>7. Data Security</h2>
          <p>We protect your data using industry-standard measures:</p>
          <ul>
            <li>All data transmitted between your browser and our servers is encrypted via <strong>HTTPS/TLS</strong></li>
            <li>Video files are stored with <strong>server-side encryption</strong> at rest</li>
            <li>Passwords are hashed and never stored in plain text</li>
            <li>Access to production systems is restricted and audited</li>
            <li>Phone verification is required before any content export</li>
          </ul>
        </div>

        <div className="section">
          <h2>8. Your Rights Under GDPR</h2>
          <p>As a data subject, you have the following rights:</p>
          <ul>
            <li><strong>Right of access</strong> — request a copy of the personal data we hold about you</li>
            <li><strong>Right to rectification</strong> — correct inaccurate or incomplete data</li>
            <li><strong>Right to erasure</strong> — request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
            <li><strong>Right to data portability</strong> — receive your data in a structured, machine-readable format</li>
            <li><strong>Right to restriction</strong> — request that we limit how we process your data</li>
            <li><strong>Right to object</strong> — object to processing based on legitimate interest</li>
            <li><strong>Right to withdraw consent</strong> — where processing is based on consent, you may withdraw it at any time</li>
          </ul>
          <p>To exercise any of these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will respond within 30 days.</p>
        </div>

        <div className="section">
          <h2>9. Cookies</h2>
          <p>We use only <strong>strictly necessary cookies</strong> for authentication and session management (Supabase auth cookies). We do not use tracking, advertising, or analytics cookies.</p>
          <p>No cookie consent banner is required for strictly necessary cookies under the ePrivacy Directive.</p>
        </div>

        <div className="section">
          <h2>10. International Transfers</h2>
          <p>Some of our third-party processors (e.g. Vercel, Cloudflare) may process data outside the EU/EEA. Where this occurs, appropriate safeguards are in place (Standard Contractual Clauses or adequacy decisions) to ensure your data is protected to GDPR standards.</p>
        </div>

        <div className="section">
          <h2>11. Supervisory Authority</h2>
          <p>If you believe we have not handled your data correctly, you have the right to lodge a complaint with the Romanian data protection supervisory authority:</p>
          <div className="info-box">
            <p><strong>{AUTHORITY}</strong><br />
            <a href={AUTHORITY_URL} target="_blank" rel="noopener noreferrer">{AUTHORITY_URL}</a></p>
          </div>
        </div>

        <div className="section">
          <h2>12. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by displaying a notice on the platform. The &quot;Last updated&quot; date at the top of this page reflects the most recent revision.</p>
        </div>

        <div className="section">
          <h2>13. Contact</h2>
          <p>For any privacy-related questions or requests, contact us at:</p>
          <div className="info-box">
            <p><strong>{COMPANY}</strong><br />
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
          </div>
        </div>
      </main>

      <footer className="footer-legal">
        <p>© {new Date().getFullYear()} {COMPANY}. All rights reserved. · <Link href="/terms" style={{ color: '#A855F7' }}>Terms of Service</Link></p>
      </footer>
    </div>
  )
}
