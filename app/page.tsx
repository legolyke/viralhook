import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ background: '#000000', color: '#ffffff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowX: 'hidden' }}>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* Navbar */
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-links { display: none; gap: 32px; }
        .nav-link { color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #ffffff; }
        .nav-actions { display: flex; align-items: center; gap: 12px; }
        .btn-ghost { color: rgba(255,255,255,0.7); text-decoration: none; font-size: 14px; font-weight: 500; padding: 8px 16px; border-radius: 8px; transition: color 0.2s; }
        .btn-ghost:hover { color: #ffffff; }
        .btn-primary-nav { background: linear-gradient(135deg, #7C3AED, #A855F7); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 9px 20px; border-radius: 9px; transition: opacity 0.2s; white-space: nowrap; }
        .btn-primary-nav:hover { opacity: 0.9; }

        /* Hero */
        .hero { padding: 144px 24px 96px; text-align: center; position: relative; overflow: hidden; }
        .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.25); border-radius: 999px; padding: 6px 16px; font-size: 13px; color: #C084FC; font-weight: 500; margin-bottom: 28px; }
        .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #A855F7; animation: pulse 2s infinite; flex-shrink: 0; }
        .hero-title { font-size: clamp(36px, 6.5vw, 70px); font-weight: 800; line-height: 1.08; letter-spacing: -2px; margin-bottom: 24px; max-width: 900px; margin-left: auto; margin-right: auto; }
        .hero-title-accent { background: linear-gradient(135deg, #A855F7, #EC4899, #7C3AED); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero-sub { font-size: clamp(12px, 1.7vw, 17px); color: rgba(255,255,255,0.5); line-height: 1.65; max-width: 540px; margin: 0 auto 40px; }
        .hero-cta { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
        .btn-hero { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #7C3AED, #A855F7); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 32px; border-radius: 14px; transition: opacity 0.2s, transform 0.2s; min-height: 54px; }
        .btn-hero:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-hero-ghost { display: inline-flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.7); text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 28px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); transition: border-color 0.2s, color 0.2s; min-height: 54px; }
        .btn-hero-ghost:hover { border-color: rgba(168,85,247,0.4); color: #ffffff; }
        .hero-stats { display: flex; justify-content: center; gap: 40px; margin-top: 64px; flex-wrap: wrap; }
        .hero-stat-value { font-size: 30px; font-weight: 800; color: #ffffff; letter-spacing: -1px; }
        .hero-stat-label { font-size: 13px; color: rgba(255,255,255,0.35); margin-top: 4px; }
        .hero-glow { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 800px; height: 600px; background: radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%); pointer-events: none; }

        /* Mockup */
        .mockup-wrap { max-width: 860px; margin: 64px auto 0; position: relative; padding: 0 8px; }
        .mockup-glow { position: absolute; inset: -40px; background: radial-gradient(ellipse at center, rgba(139,92,246,0.2) 0%, transparent 70%); pointer-events: none; }
        .mockup { border-radius: 18px; border: 1px solid rgba(168,85,247,0.2); overflow: hidden; background: rgba(10,10,18,0.95); box-shadow: 0 0 80px rgba(139,92,246,0.2); }
        .mockup-bar { background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 12px 16px; display: flex; align-items: center; gap: 8px; }
        .mockup-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .mockup-url { flex: 1; background: rgba(255,255,255,0.05); border-radius: 6px; padding: 4px 12px; font-size: 12px; color: rgba(255,255,255,0.25); margin: 0 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mockup-body { padding: 24px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        .mockup-clip { border-radius: 12px; background: rgba(168,85,247,0.07); border: 1px solid rgba(168,85,247,0.12); aspect-ratio: 9/16; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; position: relative; overflow: hidden; }
        .mockup-clip video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.85; }
        .mockup-clip-score { position: absolute; top: 10px; right: 10px; background: linear-gradient(135deg,#7C3AED,#A855F7); border-radius: 999px; padding: 3px 10px; font-size: 11px; font-weight: 700; color: #fff; z-index: 1; }
        .mockup-play { width: 40px; height: 40px; border-radius: 50%; background: rgba(168,85,247,0.3); border: 1px solid rgba(168,85,247,0.4); display: flex; align-items: center; justify-content: center; flex-shrink: 0; z-index: 1; }
        .mockup-clip-label { font-size: 11px; color: rgba(255,255,255,0.8); text-align: center; padding: 0 8px; z-index: 1; text-shadow: 0 1px 4px rgba(0,0,0,0.8); position: absolute; bottom: 12px; left: 0; right: 0; }

        /* Social proof */
        .social-bar { border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 28px 24px; text-align: center; }
        .social-bar-text { font-size: 13px; color: rgba(255,255,255,0.3); margin-bottom: 20px; letter-spacing: 0.08em; text-transform: uppercase; }
        .social-platforms { display: flex; justify-content: center; align-items: center; gap: 32px; flex-wrap: wrap; }
        .platform-item { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.25); font-size: 14px; font-weight: 600; }

        /* Sections */
        .section { padding: 96px 24px; }
        .section-center { text-align: center; }
        .section-tag { display: inline-flex; align-items: center; gap: 6px; background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.2); border-radius: 999px; padding: 5px 14px; font-size: 12px; color: #C084FC; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 20px; }
        .section-title { font-size: clamp(28px, 5vw, 52px); font-weight: 800; line-height: 1.1; letter-spacing: -1.5px; margin-bottom: 16px; }
        .section-sub { font-size: clamp(14px, 1.8vw, 18px); color: rgba(255,255,255,0.45); line-height: 1.7; max-width: 560px; margin: 0 auto; }
        .accent { background: linear-gradient(135deg, #A855F7, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* How it works */
        .steps { display: grid; grid-template-columns: 1fr; gap: 24px; max-width: 960px; margin: 64px auto 0; position: relative; }
        .step { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 36px 32px; display: flex; gap: 28px; align-items: flex-start; transition: border-color 0.2s; }
        .step:hover { border-color: rgba(168,85,247,0.25); }
        .step-num { width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, rgba(124,58,237,0.2), rgba(168,85,247,0.1)); border: 1px solid rgba(168,85,247,0.25); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; color: #A855F7; flex-shrink: 0; }
        .step-content h3 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        .step-content p { font-size: 15px; color: rgba(255,255,255,0.5); line-height: 1.65; }

        /* Features */
        .features-grid { display: grid; grid-template-columns: 1fr; gap: 16px; max-width: 1100px; margin: 64px auto 0; }
        .feature-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; padding: 28px; transition: border-color 0.2s, transform 0.2s; }
        .feature-card:hover { border-color: rgba(168,85,247,0.3); transform: translateY(-2px); }
        .feature-icon { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, rgba(124,58,237,0.2), rgba(168,85,247,0.08)); border: 1px solid rgba(168,85,247,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .feature-card h3 { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
        .feature-card p { font-size: 14px; color: rgba(255,255,255,0.45); line-height: 1.65; }

        /* Pricing */
        .pricing-grid { display: grid; grid-template-columns: 1fr; gap: 16px; max-width: 1100px; margin: 64px auto 0; }
        .pricing-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 32px 28px; display: flex; flex-direction: column; position: relative; }
        .pricing-card.featured { border-color: #A855F7; background: rgba(168,85,247,0.05); box-shadow: 0 0 40px rgba(168,85,247,0.1); }
        .pricing-badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #7C3AED, #A855F7); border-radius: 999px; padding: 4px 16px; font-size: 11px; font-weight: 700; color: #fff; white-space: nowrap; }
        .pricing-plan-label { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #A855F7; margin-bottom: 12px; }
        .pricing-price { font-size: 44px; font-weight: 800; letter-spacing: -2px; margin-bottom: 4px; }
        .pricing-price span { font-size: 16px; color: rgba(255,255,255,0.4); font-weight: 400; letter-spacing: 0; }
        .pricing-desc { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 28px; }
        .pricing-features { list-style: none; display: flex; flex-direction: column; gap: 10px; flex: 1; margin-bottom: 28px; }
        .pricing-features li { font-size: 14px; color: rgba(255,255,255,0.6); display: flex; gap: 10px; align-items: flex-start; }
        .pricing-features li svg { flex-shrink: 0; margin-top: 2px; }
        .pricing-cta { display: block; text-align: center; padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 600; text-decoration: none; transition: opacity 0.2s, transform 0.2s; min-height: 48px; display: flex; align-items: center; justify-content: center; }
        .pricing-cta:hover { opacity: 0.9; transform: translateY(-1px); }
        .pricing-cta-primary { background: linear-gradient(135deg, #7C3AED, #A855F7); color: #ffffff; }
        .pricing-cta-ghost { border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.7); background: transparent; }

        /* FAQ */
        .faq-list { max-width: 760px; margin: 56px auto 0; display: flex; flex-direction: column; gap: 2px; }
        .faq-item { border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; overflow: hidden; margin-bottom: 8px; }
        .faq-q { padding: 20px 24px; font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.9); cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 16px; user-select: none; -webkit-tap-highlight-color: transparent; }
        .faq-a { padding: 0 24px 20px; font-size: 15px; color: rgba(255,255,255,0.5); line-height: 1.7; }

        /* CTA band */
        .cta-band { padding: 96px 24px; text-align: center; position: relative; overflow: hidden; }
        .cta-band-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 700px; height: 400px; background: radial-gradient(ellipse, rgba(139,92,246,0.2) 0%, transparent 65%); pointer-events: none; }
        .cta-band h2 { font-size: clamp(28px, 5vw, 52px); font-weight: 800; letter-spacing: -1.5px; margin-bottom: 16px; }
        .cta-band p { font-size: clamp(14px, 1.8vw, 18px); color: rgba(255,255,255,0.45); margin-bottom: 40px; max-width: 460px; margin-left: auto; margin-right: auto; }

        /* Footer */
        .footer { border-top: 1px solid rgba(255,255,255,0.05); padding: 48px 24px 40px; }
        .footer-inner { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; }
        .footer-brand p { font-size: 13px; color: rgba(255,255,255,0.35); margin-top: 12px; max-width: 260px; line-height: 1.6; }
        .footer-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px 32px; }
        .footer-col h4 { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 14px; }
        .footer-col a { display: block; font-size: 14px; color: rgba(255,255,255,0.5); text-decoration: none; margin-bottom: 10px; transition: color 0.2s; }
        .footer-col a:hover { color: #ffffff; }
        .footer-bottom { border-top: 1px solid rgba(255,255,255,0.05); padding-top: 28px; display: flex; gap: 16px; align-items: flex-start; flex-direction: column; }
        .footer-bottom p { font-size: 13px; color: rgba(255,255,255,0.25); }

        /* Divider */
        .divider { width: 48px; height: 3px; background: linear-gradient(90deg, #7C3AED, #A855F7); border-radius: 999px; margin: 0 auto 0; }

        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

        @media (min-width: 600px) {
          .features-grid { grid-template-columns: 1fr 1fr; }
          .pricing-grid { grid-template-columns: 1fr 1fr; }
          .steps { grid-template-columns: 1fr; }
          .footer-cols { grid-template-columns: repeat(3, 1fr); }
          .footer-inner { flex-direction: row; justify-content: space-between; }
          .footer-bottom { flex-direction: row; justify-content: space-between; align-items: center; }
        }

        @media (min-width: 768px) {
          .nav-links { display: flex; }
          .features-grid { grid-template-columns: 1fr 1fr 1fr; }
          .pricing-grid { grid-template-columns: repeat(4, 1fr); }
          .steps { grid-template-columns: 1fr 1fr; }
        }

        @media (min-width: 1024px) {
          .steps { grid-template-columns: 1fr 1fr 1fr; }
        }

        @media (max-width: 480px) {
          .hero { padding: 120px 20px 80px; }
          .hero-stats { gap: 24px; }
          .btn-hero, .btn-hero-ghost { width: 100%; justify-content: center; }
          .hero-cta { flex-direction: column; align-items: stretch; max-width: 320px; margin-left: auto; margin-right: auto; }
          .mockup-body { grid-template-columns: 1fr 1fr; }
          .mockup-clip:last-child { display: none; }
          .section { padding: 72px 20px; }
          .step { flex-direction: column; gap: 20px; padding: 28px 24px; }
          .pricing-card { padding: 28px 22px; }
          .footer-cols { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* Navbar */}
      <nav className="nav">
        <Link href="/" className="nav-logo">
          <div style={{ width: 52, height: 52, backgroundImage: 'url(/viralhook-logo.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
        </Link>
        <div className="nav-links">
          <a href="#how-it-works" className="nav-link">How it works</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <a href="#faq" className="nav-link">FAQ</a>
        </div>
        <div className="nav-actions">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-primary-nav">Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />

        <div className="hero-badge">
          <span className="hero-badge-dot" aria-hidden="true" />
          AI-Powered Video Intelligence
        </div>

        <h1 className="hero-title">
          Turn Long Videos Into<br />
          <span className="hero-title-accent">Viral Shorts</span> With AI
        </h1>

        <p className="hero-sub">
          Upload any video. Our AI finds the most viral moments, cuts perfect 9:16 clips, adds animated subtitles, and generates captions — in minutes.
        </p>

        <div className="hero-cta">
          <Link href="/signup" className="btn-hero">
            Start for free
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <a href="#how-it-works" className="btn-hero-ghost">
            See how it works
          </a>
        </div>

        <div className="hero-stats" role="list">
          {[
            { value: '10x', label: 'Faster than manual editing' },
            { value: '9:16', label: 'Perfect vertical format' },
            { value: '100%', label: 'AI-powered detection' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }} role="listitem">
              <div className="hero-stat-value">{s.value}</div>
              <div className="hero-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* App Mockup */}
        <div className="mockup-wrap" aria-hidden="true">
          <div className="mockup-glow" />
          <div className="mockup" role="img" aria-label="ViralHook dashboard preview">
            <div className="mockup-bar">
              <div className="mockup-dot" style={{ background: '#FF5F57' }} />
              <div className="mockup-dot" style={{ background: '#FFBD2E' }} />
              <div className="mockup-dot" style={{ background: '#28CA41' }} />
              <div className="mockup-url">viralhook.media/dashboard</div>
            </div>
            <div className="mockup-body">
              {[
                { score: '98%', label: 'Hook moment', src: '/demo/demo-1.mp4' },
                { score: '94%', label: 'Emotional peak', src: '/demo/demo-2.mp4' },
                { score: '91%', label: 'Key insight', src: '/demo/demo-3.mp4' },
              ].map((clip, i) => (
                <div key={i} className="mockup-clip">
                  <video
                    src={clip.src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-hidden="true"
                  />
                  <div className="mockup-clip-score">{clip.score}</div>
                  <div className="mockup-clip-label">{clip.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <div className="social-bar">
        <p className="social-bar-text">Optimized for all major platforms</p>
        <div className="social-platforms">
          {[
            { name: 'TikTok', icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.28 8.28 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1Z"/>
              </svg>
            )},
            { name: 'Instagram Reels', icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="rgba(255,255,255,0.4)" stroke="none" />
              </svg>
            )},
            { name: 'YouTube Shorts', icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)" aria-hidden="true">
                <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14C4.5 20.5 12 20.5 12 20.5s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.81zM9.75 15.5V8.5l6.5 3.5-6.5 3.5z"/>
              </svg>
            )},
            { name: 'Facebook Reels', icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            )},
            { name: 'X / Twitter', icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            )},
          ].map(p => (
            <div key={p.name} className="platform-item">
              {p.icon}
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section id="how-it-works" className="section section-center">
        <div className="section-tag">How it works</div>
        <h2 className="section-title">
          From raw footage to <span className="accent">viral clips</span><br />in 3 simple steps
        </h2>
        <p className="section-sub">No editing experience needed. Our AI handles everything from analysis to export.</p>

        <div className="steps">
          {[
            {
              num: '1',
              title: 'Upload your video',
              desc: 'Drop any long-form video — podcast, webinar, interview, vlog, or course. We accept MP4 and MOV files. Free plan supports up to 30 minutes; paid plans up to 6 hours.',
            },
            {
              num: '2',
              title: 'AI finds the best moments',
              desc: 'Our AI transcribes every word, detects emotional peaks, viral hooks, key insights, and high-engagement moments automatically.',
            },
            {
              num: '3',
              title: 'Export & post in one click',
              desc: 'Post clips directly to YouTube Shorts straight from the ViralHook dashboard — no switching apps. TikTok and Instagram Reels direct posting coming soon.',
            },
          ].map(step => (
            <div key={step.num} className="step">
              <div className="step-num" aria-hidden="true">{step.num}</div>
              <div className="step-content">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section section-center" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="section-tag">Features</div>
        <h2 className="section-title">
          Everything you need to<br /><span className="accent">go viral</span>
        </h2>
        <p className="section-sub">A complete toolkit built for creators, marketers, and agencies.</p>

        <div className="features-grid">
          {[
            {
              icon: (
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              ),
              title: 'AI Virality Detection',
              desc: 'Our model scores every moment based on engagement signals, emotional intensity, and hook potential — so you always clip the best parts.',
            },
            {
              icon: (
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
              ),
              title: 'Auto Captions',
              desc: 'Word-perfect animated subtitles generated from your audio. Multiple styles — bold, minimal, gradient — optimized for silent scrollers.',
            },
            {
              icon: (
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              ),
              title: 'Smart Reframing',
              desc: 'Auto-crops horizontal footage to perfect 9:16 vertical format, keeping faces and key subjects in frame at all times.',
            },
            {
              icon: (
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              ),
              title: 'AI Voiceover',
              desc: 'Generate engaging voiceovers for your clips using natural-sounding AI voices. Available on Pro and Agency plans.',
            },
            {
              icon: (
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              ),
              title: 'Analytics Dashboard',
              desc: 'Track which clips perform best, which topics resonate, and how your content evolves over time. Data-driven creation.',
            },
            {
              icon: (
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              ),
              title: 'Secure & Private',
              desc: 'Your videos are encrypted in transit and at rest. Files are processed in isolated environments and auto-deleted after 30 days.',
            },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="section section-center">
        <div className="section-tag">Pricing</div>
        <h2 className="section-title">
          Simple, <span className="accent">transparent pricing</span>
        </h2>
        <p className="section-sub">Start free. Upgrade when you need more. No hidden fees.</p>

        <div className="pricing-grid">
          {[
            {
              label: 'Free',
              price: '€0',
              period: '',
              desc: '3 exports/month',
              featured: false,
              features: [
                '3 video exports/month',
                '1080p export quality',
                'AI clip detection',
                'Auto captions',
                'Email support',
              ],
              cta: { text: 'Get started free', href: '/signup', style: 'ghost' },
            },
            {
              label: 'Creator',
              price: '€19',
              period: '/month',
              desc: '40 exports/month',
              featured: false,
              features: [
                '40 video exports/month',
                '1080p export quality',
                'AI clip detection',
                'Auto captions',
                'AI caption styles',
                'Email support',
                'Priority support',
              ],
              cta: { text: 'Start Creator', href: '/signup', style: 'primary' },
            },
            {
              label: 'Pro',
              price: '€49',
              period: '/month',
              desc: '150 exports/month',
              featured: true,
              features: [
                '150 video exports/month',
                '1080p export quality',
                'AI clip detection',
                'Auto captions',
                'AI Voiceover (50 clips)',
                'Analytics dashboard',
                'Priority rendering',
                'Email support',
                'Priority support',
              ],
              cta: { text: 'Start Pro', href: '/signup', style: 'primary' },
            },
            {
              label: 'Agency',
              price: '€149',
              period: '/month',
              desc: '2,000 exports/month',
              featured: false,
              features: [
                '2,000 video exports/month',
                '1080p export quality',
                'AI clip detection',
                'Auto captions',
                'AI Voiceover (300 clips)',
                'Analytics dashboard',
                'Team members',
                'Priority rendering',
                'Dedicated support',
              ],
              cta: { text: 'Start Agency', href: '/signup', style: 'primary' },
            },
          ].map(plan => (
            <div key={plan.label} className={`pricing-card${plan.featured ? ' featured' : ''}`}>
              {plan.featured && <div className="pricing-badge">Most Popular</div>}
              <div className="pricing-plan-label">{plan.label}</div>
              <div className="pricing-price">
                {plan.price}
                <span>{plan.period}</span>
              </div>
              <div className="pricing-desc">{plan.desc}</div>
              <ul className="pricing-features">
                {plan.features.map(f => (
                  <li key={f}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.cta.href}
                className={`pricing-cta ${plan.cta.style === 'primary' ? 'pricing-cta-primary' : 'pricing-cta-ghost'}`}
              >
                {plan.cta.text}
              </Link>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 32, fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>
          Need 2,000+ exports?{' '}
          <a href="mailto:hello@viralhook.media" style={{ color: '#A855F7', textDecoration: 'none' }}>
            Contact us for Enterprise pricing
          </a>
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="section section-center" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="section-tag">FAQ</div>
        <h2 className="section-title">
          Frequently asked <span className="accent">questions</span>
        </h2>

        <div className="faq-list">
          {[
            {
              q: 'What video formats are supported?',
              a: 'We currently support MP4 and MOV formats. For any other format, convert your file to MP4 first using a free tool like HandBrake. Free plan supports videos up to 30 minutes; Creator up to 2h; Pro up to 4h; Agency up to 6h.',
            },
            {
              q: 'How long does processing take?',
              a: 'Most videos are processed within 2–5 minutes. Longer videos (1h+) may take up to 15 minutes. Pro and Agency users get priority rendering for faster results.',
            },
            {
              q: 'Can I cancel my subscription anytime?',
              a: 'Yes, absolutely. You can cancel at any time from your billing dashboard. Your plan stays active until the end of the current billing period — no questions asked.',
            },
            {
              q: 'Are my videos stored permanently?',
              a: 'Your videos and exported clips are stored securely in your account for as long as you need them. You can delete any project manually from your dashboard at any time. We do not share or sell your content.',
            },
            {
              q: 'Do I own the content I export?',
              a: 'Yes. You retain full ownership of all exported clips. We do not claim any rights to your content. Our platform is a tool — the creative output is entirely yours.',
            },
            {
              q: 'Is there a free trial?',
              a: 'The Free plan includes 3 exports per month at no cost — forever. No credit card required to start. Upgrade only when you need more exports.',
            },
          ].map((item, i) => (
            <details key={i} className="faq-item">
              <summary className="faq-q">
                {item.q}
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.7)" strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </summary>
              <div className="faq-a">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA Band */}
      <section className="cta-band">
        <div className="cta-band-glow" aria-hidden="true" />
        <h2>
          Start creating <span className="accent">viral content</span> today
        </h2>
        <p>Join thousands of creators turning long videos into short-form gold. Free to start, no credit card needed.</p>
        <Link href="/signup" className="btn-hero" style={{ display: 'inline-flex' }}>
          Get started for free
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Link href="/" className="nav-logo" style={{ marginBottom: 12 }}>
              <div style={{ width: 48, height: 48, backgroundImage: 'url(/viralhook-logo.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
            </Link>
            <p>AI-powered short video generation for creators, marketers, and agencies worldwide.</p>
          </div>

          <div className="footer-cols">
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#how-it-works">How it works</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <Link href="/signup">Sign up</Link>
              <Link href="/login">Sign in</Link>
              <Link href="/dashboard">Dashboard</Link>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
              <a href="mailto:hello@viralhook.media">Contact</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom" style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p>© {new Date().getFullYear()} ViralHook Media. All rights reserved.</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>
            Made with AI · Powered by{' '}
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Vercel</a>
          </p>
        </div>
      </footer>

    </div>
  )
}
