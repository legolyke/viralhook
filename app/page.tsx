import Link from 'next/link'
import Image from 'next/image'

export default function LandingPage() {
  return (
    <div style={{ background: '#000000', color: '#ffffff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* Navbar */
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-links { display: none; gap: 32px; }
        .nav-link { color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #ffffff; }
        .nav-actions { display: flex; align-items: center; gap: 12px; }
        .btn-ghost { color: rgba(255,255,255,0.7); text-decoration: none; font-size: 14px; font-weight: 500; padding: 8px 16px; border-radius: 8px; transition: color 0.2s; }
        .btn-ghost:hover { color: #ffffff; }
        .btn-primary { background: linear-gradient(135deg, #7C3AED, #A855F7); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 9px 20px; border-radius: 9px; transition: opacity 0.2s; white-space: nowrap; }
        .btn-primary:hover { opacity: 0.9; }

        /* Hero */
        .hero { padding: 160px 24px 100px; text-align: center; position: relative; overflow: hidden; }
        .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.25); border-radius: 999px; padding: 6px 16px; font-size: 13px; color: #C084FC; font-weight: 500; margin-bottom: 32px; }
        .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #A855F7; animation: pulse 2s infinite; }
        .hero-title { font-size: clamp(40px, 7vw, 80px); font-weight: 800; line-height: 1.08; letter-spacing: -2px; margin-bottom: 24px; max-width: 900px; margin-left: auto; margin-right: auto; }
        .hero-title-accent { background: linear-gradient(135deg, #A855F7, #EC4899, #7C3AED); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero-sub { font-size: clamp(16px, 2vw, 20px); color: rgba(255,255,255,0.5); line-height: 1.65; max-width: 560px; margin: 0 auto 48px; }
        .hero-cta { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .btn-hero { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #7C3AED, #A855F7); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 36px; border-radius: 14px; transition: opacity 0.2s, transform 0.2s; }
        .btn-hero:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-hero-ghost { display: inline-flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.7); text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 32px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); transition: border-color 0.2s, color 0.2s; }
        .btn-hero-ghost:hover { border-color: rgba(168,85,247,0.4); color: #ffffff; }
        .hero-stats { display: flex; justify-content: center; gap: 48px; margin-top: 72px; flex-wrap: wrap; }
        .hero-stat-value { font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -1px; }
        .hero-stat-label { font-size: 13px; color: rgba(255,255,255,0.35); margin-top: 4px; }

        /* Glow */
        .hero-glow { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 800px; height: 600px; background: radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%); pointer-events: none; }

        /* Mockup */
        .mockup-wrap { max-width: 900px; margin: 72px auto 0; position: relative; }
        .mockup-glow { position: absolute; inset: -40px; background: radial-gradient(ellipse at center, rgba(139,92,246,0.2) 0%, transparent 70%); pointer-events: none; }
        .mockup { border-radius: 20px; border: 1px solid rgba(168,85,247,0.2); overflow: hidden; background: rgba(10,10,18,0.9); box-shadow: 0 0 80px rgba(139,92,246,0.2); }
        .mockup-bar { background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 12px 20px; display: flex; align-items: center; gap: 8px; }
        .mockup-dot { width: 10px; height: 10px; border-radius: 50%; }
        .mockup-url { flex: 1; background: rgba(255,255,255,0.05); border-radius: 6px; padding: 4px 12px; font-size: 12px; color: rgba(255,255,255,0.25); margin: 0 16px; }
        .mockup-body { padding: 32px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .mockup-clip { border-radius: 12px; background: rgba(168,85,247,0.07); border: 1px solid rgba(168,85,247,0.12); aspect-ratio: 9/16; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; position: relative; overflow: hidden; }
        .mockup-clip-score { position: absolute; top: 10px; right: 10px; background: linear-gradient(135deg,#7C3AED,#A855F7); border-radius: 999px; padding: 3px 10px; font-size: 11px; font-weight: 700; color: #fff; }
        .mockup-play { width: 40px; height: 40px; border-radius: 50%; background: rgba(168,85,247,0.3); border: 1px solid rgba(168,85,247,0.4); display: flex; align-items: center; justify-content: center; }
        .mockup-clip-label { font-size: 11px; color: rgba(255,255,255,0.4); text-align: center; padding: 0 8px; }

        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

        @media (min-width: 768px) {
          .nav-links { display: flex; }
        }
        @media (max-width: 600px) {
          .mockup-body { grid-template-columns: 1fr 1fr; }
          .mockup-clip:last-child { display: none; }
          .hero-stats { gap: 28px; }
        }
      `}</style>

      {/* Navbar */}
      <nav className="nav">
        <Link href="/" className="nav-logo">
          <div style={{ width: 36, height: 36, backgroundImage: 'url(/viralhook-logo.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>Viral<span style={{ color: '#A855F7' }}>Hook</span></span>
        </Link>
        <div className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How it works</a>
          <a href="#pricing" className="nav-link">Pricing</a>
        </div>
        <div className="nav-actions">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-primary">Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />

        <div className="hero-badge">
          <span className="hero-badge-dot" />
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
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <a href="#how-it-works" className="btn-hero-ghost">
            See how it works
          </a>
        </div>

        <div className="hero-stats">
          {[
            { value: '10x', label: 'Faster than manual editing' },
            { value: '9:16', label: 'Perfect vertical format' },
            { value: '100%', label: 'AI-powered detection' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div className="hero-stat-value">{s.value}</div>
              <div className="hero-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* App Mockup */}
        <div className="mockup-wrap">
          <div className="mockup-glow" aria-hidden="true" />
          <div className="mockup">
            <div className="mockup-bar">
              <div className="mockup-dot" style={{ background: '#FF5F57' }} />
              <div className="mockup-dot" style={{ background: '#FFBD2E' }} />
              <div className="mockup-dot" style={{ background: '#28CA41' }} />
              <div className="mockup-url">www.viralhook.media/dashboard</div>
            </div>
            <div className="mockup-body">
              {[
                { score: '98%', label: 'Hook moment — 0:12' },
                { score: '94%', label: 'Emotional peak — 1:45' },
                { score: '91%', label: 'Key insight — 3:22' },
              ].map((clip, i) => (
                <div key={i} className="mockup-clip">
                  <div className="mockup-clip-score">{clip.score}</div>
                  <div className="mockup-play">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#A855F7">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className="mockup-clip-label">{clip.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
