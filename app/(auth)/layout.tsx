import Image from 'next/image'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="auth-page">
      <style>{`
        .auth-page {
          min-height: 100vh;
          background: #000000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px 16px;
          position: relative;
          box-sizing: border-box;
        }
        .auth-bg-glow {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 0%, rgba(139,92,246,0.14) 0%, transparent 60%);
        }
        .auth-logo {
          text-align: center;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
        }
        .auth-logo h1 {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -1px;
          margin: 0;
          color: #ffffff;
          line-height: 1;
        }
        .auth-logo p {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          margin: 6px 0 0;
        }
        .auth-hook-gradient {
          background: linear-gradient(90deg, #7C3AED, #C026D3);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .auth-card {
          width: 100%;
          max-width: 520px;
          border-radius: 20px;
          background: rgba(10,10,18,0.95);
          border: 1px solid rgba(168,85,247,0.25);
          backdrop-filter: blur(20px);
          box-shadow: 0 0 60px rgba(139,92,246,0.15), 0 0 120px rgba(139,92,246,0.08);
          display: flex;
          position: relative;
          z-index: 1;
          overflow: hidden;
        }
        .auth-left {
          display: none;
        }
        .auth-right {
          flex: 1;
          padding: 28px 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        @media (min-width: 900px) {
          .auth-page { padding: 40px 24px; }
          .auth-logo h1 { font-size: 64px; letter-spacing: -1.5px; }
          .auth-logo p { font-size: 15px; }
          .auth-logo { margin-bottom: 32px; }
          .auth-card {
            max-width: 1050px;
            border-radius: 32px;
            min-height: 680px;
          }
          .auth-left {
            display: flex;
            width: 40%;
            flex-shrink: 0;
            flex-direction: column;
            gap: 36px;
            padding: 52px 44px;
            position: relative;
            overflow: hidden;
            border-right: 1px solid rgba(168,85,247,0.1);
          }
          .auth-right {
            padding: 48px 52px;
          }
        }

        @media (min-width: 1200px) {
          .auth-card { max-width: 1150px; }
          .auth-logo h1 { font-size: 72px; letter-spacing: -2px; }
          .auth-left { width: 42%; padding: 56px 52px; }
          .auth-right { padding: 48px 56px; }
        }

        @keyframes floatUp1 { 0%,100% { transform:translateY(0); opacity:.4; } 50% { transform:translateY(-18px); opacity:.8; } }
        @keyframes floatUp2 { 0%,100% { transform:translateY(0); opacity:.3; } 50% { transform:translateY(-12px); opacity:.6; } }
        @keyframes floatUp3 { 0%,100% { transform:translateY(0); opacity:.5; } 50% { transform:translateY(-22px); opacity:.9; } }
      `}</style>

      <div className="auth-bg-glow" aria-hidden="true" />

      {/* Logo */}
      <div className="auth-logo">
        <Image src="/viralhook-logo.png" alt="ViralHook" width={675} height={646} style={{ width: 'auto', height: '80px', objectFit: 'contain' }} priority />
        <p>AI-Powered Viral Shorts Generator</p>
      </div>

      {/* Card */}
      <div className="auth-card">

        {/* Left panel */}
        <div className="auth-left">
          {/* Layer 1 — BG glow */}
          <div aria-hidden="true" style={{
            position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
            background:'radial-gradient(circle at top left, rgba(139,92,246,0.22) 0%, rgba(139,92,246,0.08) 25%, transparent 65%)',
          }} />
          {/* Layer 2 — Dot particles */}
          <div aria-hidden="true" style={{
            position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
            backgroundImage:'radial-gradient(circle, rgba(168,85,247,0.75) 1px, transparent 1px)',
            backgroundSize:'28px 28px', opacity:0.18,
          }} />
          {/* Layer 3 — Floating animated dots */}
          {([
            { top:'20%', left:'75%', size:5, anim:'floatUp1', dur:'3.2s' },
            { top:'35%', left:'15%', size:4, anim:'floatUp2', dur:'4.1s' },
            { top:'55%', left:'85%', size:3, anim:'floatUp3', dur:'2.8s' },
            { top:'70%', left:'40%', size:4, anim:'floatUp1', dur:'3.7s' },
            { top:'15%', left:'50%', size:3, anim:'floatUp2', dur:'5s'   },
            { top:'80%', left:'65%', size:5, anim:'floatUp3', dur:'3.5s' },
          ] as const).map((p, i) => (
            <div key={i} aria-hidden="true" style={{
              position:'absolute', top:p.top, left:p.left,
              width:p.size, height:p.size, borderRadius:'50%',
              background:'rgba(168,85,247,0.9)', boxShadow:'0 0 8px rgba(168,85,247,0.8)',
              animation:`${p.anim} ${p.dur} ease-in-out infinite`,
              pointerEvents:'none', zIndex:1,
            }} />
          ))}
          {/* Layer 4 — Wave SVG */}
          <div aria-hidden="true" style={{
            position:'absolute', bottom:0, left:0, width:'100%', height:240,
            pointerEvents:'none', zIndex:1,
          }}>
            <svg viewBox="0 0 500 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
              <path d="M0 240 C 40 195, 100 225, 160 175 S 280 125, 380 85 S 480 45, 520 10" stroke="#A855F7" strokeWidth="0.9" opacity="0.18" fill="none"/>
              <path d="M0 220 C 50 180, 120 210, 180 162 S 300 115, 400 75 S 490 35, 530 5"  stroke="#7C3AED" strokeWidth="0.7" opacity="0.14" fill="none"/>
              <path d="M0 200 C 60 165, 130 195, 200 148 S 320 100, 420 62 S 510 22, 540 0"  stroke="#C026D3" strokeWidth="0.6" opacity="0.10" fill="none"/>
              <path d="M0 240 C 30 190, 90 222, 150 170 S 270 118, 360 80 S 460 40, 510 8"   stroke="#A855F7" strokeWidth="0.5" opacity="0.08" fill="none"/>
              <path d="M0 230 C 70 190, 140 218, 210 170 S 330 122, 430 84 S 510 44, 545 14" stroke="#7C3AED" strokeWidth="0.4" opacity="0.12" fill="none"/>
            </svg>
          </div>

          {/* Content */}
          <div style={{position:'relative', zIndex:2, display:'flex', flexDirection:'column', gap:36}}>
            {/* Rocket */}
            <div style={{position:'relative', width:120, height:120, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <div style={{position:'absolute', width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle, rgba(168,85,247,0.22), transparent 70%)', filter:'blur(18px)'}} />
              <div style={{width:88, height:88, borderRadius:999, background:'linear-gradient(180deg, rgba(168,85,247,0.35), rgba(124,58,237,0.12))', border:'1px solid rgba(255,255,255,0.08)', boxShadow:'0 0 40px rgba(168,85,247,0.35)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D8B4FE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                </svg>
              </div>
            </div>

            {/* Heading */}
            <div>
              <h2 style={{fontSize:34, fontWeight:700, lineHeight:1.15, color:'#ffffff', margin:'0 0 12px'}}>
                Welcome <span style={{color:'#A855F7'}}>back!</span>
              </h2>
              <p style={{fontSize:14, color:'rgba(255,255,255,0.5)', lineHeight:1.65, margin:0}}>
                Sign in to your account and continue creating viral content.
              </p>
            </div>

            {/* Benefits */}
            <div style={{display:'flex', flexDirection:'column', gap:16}}>
              {[
                {emoji:'⚡', text:'Generate viral shorts with AI'},
                {emoji:'📊', text:'Save time & boost productivity'},
                {emoji:'🚀', text:'Grow your audience fast'},
              ].map(({emoji, text}) => (
                <div key={text} style={{display:'flex', alignItems:'center', gap:14}}>
                  <div style={{width:48, height:48, borderRadius:13, flexShrink:0, background:'linear-gradient(180deg, rgba(139,92,246,0.25), rgba(139,92,246,0.08))', border:'1px solid rgba(168,85,247,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20}}>
                    {emoji}
                  </div>
                  <span style={{fontSize:13, color:'rgba(255,255,255,0.72)'}}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="auth-right">
          {children}
        </div>
      </div>
    </div>
  )
}
