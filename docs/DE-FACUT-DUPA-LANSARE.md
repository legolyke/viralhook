# De făcut după lansare — ViralHook

Lista completă cu tot ce am decis să facem după lansarea inițială.

---

## 🚀 Prioritate înaltă (primele 30 zile după lansare)

### Legal & API Approvals
- [ ] **Privacy Policy live** pe viralhook.media (necesar pentru toate aprobările de API)
- [ ] **Terms of Service** live pe viralhook.media
- [ ] **Cookie Policy** live pe viralhook.media
- [ ] **Aplicație TikTok for Developers** — Content Posting API (review 2-4 săptămâni)
- [ ] **Aplicație Meta for Developers** — Instagram Graph API (review 2-6 săptămâni)
- [ ] **Twilio credit** adăugat pentru SMS OTP (verificare telefon la export — Module 11)

### Stripe: test → live
- [ ] Schimbat `STRIPE_SECRET_KEY` din `sk_test_` în `sk_live_`
- [ ] Schimbat `STRIPE_PRICE_CREATOR`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY` cu price ID-urile live
- [ ] `STRIPE_WEBHOOK_SECRET` actualizat pentru endpoint-ul live
- [ ] Webhook URL actualizat pe `viralhook.media` în Stripe Dashboard

### Domeniu & Config
- [ ] Vercel project relinkat pe `viralhook.media` (custom domain)
- [ ] Supabase Site URL + Redirect URLs actualizate la `viralhook.media`
- [ ] `NEXT_PUBLIC_APP_URL` setat la `https://viralhook.media` în Vercel

---

## 💳 Actualizare planuri & feature cards (după fiecare feature nou)

- [ ] **Auto-posting YouTube** — de decis pe ce plan (CREATOR+ sau PRO+)
- [ ] **Auto-posting TikTok/Instagram** — PRO + AGENCY (după aprobare API)
- [ ] **Scheduled posting** — AGENCY only sau PRO+AGENCY
- [ ] **Voiceover AI** — PRO + AGENCY
- [ ] **AI Thumbnail Generator** — PRO + AGENCY
- [ ] **Face tracking / Auto zoom** — CREATOR + PRO + AGENCY
- [ ] **API access** — AGENCY only
- [ ] **Team collaboration** — AGENCY only
- [ ] Actualizat cardurile de pricing din `components/billing/PricingCards.tsx` cu fiecare feature nou
- [ ] Actualizat enforcement server-side în export route pentru fiecare feature gated

---

## 📱 Social Media Auto Posting (după aprobare API)

- [ ] **TikTok posting** — integrare completă după aprobare API (UI-ul e deja ready)
- [ ] **Instagram Reels posting** — integrare completă după aprobare Meta API
- [ ] **Scheduled posting** — programare postări la dată/oră specifică (cron job + UI time picker)
- [ ] **Token refresh automat** pentru OAuth tokens expirate (YouTube, TikTok, Instagram)
- [ ] **Multi-platform publishing simultan** — postează pe toate platformele conectate dintr-un click

---

## 🎨 Watermark pe Free plan
- [ ] **Implementat watermark FFmpeg** în `server/index.ts` — text "viralhook.media" în colț dreapta-jos pentru useri Free
- [ ] Câmpul `has_watermark` din DB e deja acolo, trebuie doar logica în Railway

---

## 🛠 Technical debt & Known limitations

- [ ] **Realtime subscription** pe project detail page — acum userul trebuie să refresheze manual ca să vadă transcrierea gata
- [ ] **Timeout/retry** dacă AssemblyAI nu callbackuiește — proiectul poate rămâne blocat în status `transcribing`
- [ ] **Unit tests** pe webhook route (`/api/transcribe/webhook`)
- [ ] **Yearly billing** — opțiune de plată anuală cu discount (ex: 490€/an în loc de 49€/lună)

---

## 🎯 Features produs (post-MVP)

### Video Processing
- [ ] **Face tracking** — mențineream feței în centrul clipului 9:16 automat
- [ ] **Auto zoom effects** — zoom automat în momente cheie pentru retenție mai bună
- [ ] **Silence removal** — eliminare pauze lungi din clipuri automat
- [ ] **Scene transitions** — tranziții automate între scene

### AI Features
- [ ] **AI Thumbnail Generator** — thumbnail automat pentru YouTube Shorts
- [ ] **Hook Optimizer** — sugestii AI pentru hook-uri mai puternice în primele 3 secunde
- [ ] **Trend Detection** — detectare trenduri populare și sugestii de conținut
- [ ] **Voiceover AI** — voce sintetizată realistă pentru conținut faceless
- [ ] **Faceless Content Creator** — generare video automat fără față

### Module 15 extensions (după lansare Module 15)
- [ ] **Script Generator** avansat cu tone of voice selector
- [ ] **Idea Generator** bazat pe trenduri reale (TikTok trending sounds etc.)

---

## 💼 Business & Scaling

- [ ] **Enterprise plan** — custom pricing pentru clienți mari
- [ ] **API access** — pricing per call pentru developers (menționat în Agency plan)
- [ ] **Credit system** — alternativă la subscription pentru useri ocazionali
- [ ] **Team collaboration** — multiple workspaces, shared assets (Agency plan feature)
- [ ] **Usage-based billing** — plătești per minut procesat, nu subscription fix
- [ ] **Referral system** — useri free câștigă exports extra pentru fiecare referral
- [ ] **Affiliate creators** — program afiliere pentru influenceri care promovează platforma
- [ ] **Template library** — șabloane de stiluri subtitles partajate de comunitate

---

## 📊 Analytics & Monitoring

- [ ] **Performance Insights AI** — sugestii AI pentru îmbunătățirea clipurilor (menționat în Module 13 spec)
- [ ] **Retention Graphs** — grafice retenție per clip (necesită integrare cu platformele)
- [ ] **Views Tracking** — monitorizare views din platformele sociale (după conectare API)
- [ ] **Grafana / Sentry** — monitoring erori și performanță în producție

---

## 📱 Mobile

- [ ] **Mobile app** — iOS + Android (Faza 4 din roadmap, minim 6 luni după lansare)

---

## 🌐 Marketing (în paralel cu lansarea)

- [ ] **Landing page** — homepage cu hero, demo video, pricing, how it works
- [ ] **TikTok content** — 3-5 clipuri/zi cu before/after demos
- [ ] **Build in public** — postare progres pe X/Twitter
- [ ] **SEO articles** — "best AI shorts generator", "Opus Clip alternative" etc.
- [ ] **Reddit** — r/videoediting, r/youtubers, r/contentcreators
- [ ] **Watermark pe Free plan** — asigură-te că e activat (marketing organic gratuit)

---

*Ultima actualizare: 2026-05-16*
*Creat în sesiunea de dezvoltare Module 13-14*
