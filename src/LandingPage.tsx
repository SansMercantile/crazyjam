import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Play, Music, Video, Mic2, Radio, Zap, Shield,
  Check, ArrowRight, Menu, X, Sparkles,
  MapPin, Award, Disc3, ExternalLink,
} from 'lucide-react';

// Brand marks served from /public so they persist across the landing page,
// the favicon, and every route (no bundler path needed).
const ICON_LOGO = '/CrazyJam-Icon-logo-1.png';
const TEXT_LOGO = '/text-logo-1.png';

// Official CrazyJam Records releases (same as /releases) — real, released albums.
// Artwork lives in /public/art (optimized 1000x1000 progressive JPEGs).
const FEATURED_RELEASES = [
  { title: 'Little Ben', kind: 'Album · 12 tracks', url: 'https://ditto.fm/little-ben', art: '/art/little-ben.jpg' },
  { title: 'Cradle of Jazz, Vol. 1', kind: 'Album', url: 'https://ditto.fm/cradle-of-jazz-vol-1', art: '/art/cradle-of-jazz-vol-1.jpg' },
  { title: 'Letters to Carli', kind: 'Album', url: 'https://ditto.fm/letter-s-to-carli', art: '/art/letters-to-carli.jpg' },
];

// Real studio locations — Johannesburg (Records/Studios HQ), Cape Town (head
// office), Kitakyushu (Japan presence).
// Ratings come from our live Google listing (CrazyJam Records™, 118 Pritchard St)
// — only shown where Google actually has reviews, so nothing is invented.
const STUDIO_LOCATIONS = [
  { name: 'CrazyJam Studios — Johannesburg', role: 'Records & Studios HQ', address: '118 Pritchard St, Johannesburg, 2000, South Africa', mapQuery: 'CrazyJam Records 118 Pritchard St Johannesburg', rating: 5.0, reviews: 3 },
  { name: 'CrazyJam Studios — Cape Town', role: 'Head office', address: 'Cape Town, Western Cape, South Africa', mapQuery: 'Cape Town, South Africa', rating: null, reviews: 0 },
  { name: 'CrazyJam Studios — Kitakyushu', role: 'Japan presence', address: 'Kitakyushu, Fukuoka, Japan', mapQuery: 'Kitakyushu, Fukuoka, Japan', rating: null, reviews: 0 },
];

const ARTISTS = ['mF', 'Ben', 'Jay5', 'JinO', 'Cherry Stone', 'Children of the Forest'];

const LandingPage = () => {
  const { loginWithRedirect } = useAuth0();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const features = [
    { icon: Music, title: 'Full Songs with Vocals', desc: 'Generate complete songs with real sung vocals on our own GPU models — two takes per generation.' },
    { icon: Mic2, title: 'Dima Voices', desc: 'Train a reusable voice/style identity from 3-12 reference takes, then every song sings in that voice.' },
    { icon: Video, title: 'Music Video Creator', desc: 'Composite your clips with the real track audio into a downloadable music video, in the browser.' },
    { icon: Sparkles, title: 'Album Art Studio', desc: 'Design 1400×1400 cover art with text, shapes, images, and AI-generated art.' },
    { icon: Radio, title: 'CrazyJam Music', desc: 'Publish your releases to CrazyJam Music and share them on your public artist page.' },
    { icon: Shield, title: 'Commercial Licence', desc: 'Commercial-safe models on client-facing output. You own what you create.' },
  ];

  // Subscriptions cover MUSIC creation. Video creation + album art are
  // credit-based (top up credits to spend on those renders).
  const plans = [
    { name: 'Free', price: '$0', period: '/mo', features: ['Instrumental sequencer + blueprint', 'Render Real Audio (MusicGen)', 'CrazyJam Music publishing', 'Community releases'], popular: false, cta: 'Start free' },
    { name: 'Pro', price: '$5', period: '/mo', features: ['Full songs WITH vocals on our own GPU', 'Two takes per generation', 'Dima voices (voice/style identity)', 'Stems export', 'Unlimited music creation'], popular: false, cta: 'Subscribe to Pro' },
    { name: 'Premier', price: '$15', period: '/mo', features: ['Everything in Pro', 'Priority GPU queue', 'Longer songs (up to 4 minutes)', 'Commercial licence on every take', 'Unlimited music creation'], popular: true, cta: 'Subscribe to Premier' },
  ];

  // Credit packs for video creation + album art (one-off top-ups, not a subscription).
  const creditPacks = [
    { name: 'Starter', credits: '100 credits', price: '$6.99', note: '~20 album covers or a short video render' },
    { name: 'Creator', credits: '500 credits', price: '$24.99', note: '~100 album covers or several videos' },
    { name: 'Studio', credits: '1,200 credits', price: '$49.99', note: 'Best value for heavy video + art work' },
  ];

  const faqs = [
    { q: 'What is CrazyJam?', a: 'CrazyJam is the AI-native music studio. Make full songs with vocals, design album art, build music videos, and publish to CrazyJam Music — all on our own GPU models.' },
    { q: 'How does pricing work?', a: 'Two parts: a monthly subscription covers unlimited MUSIC creation (Free, Pro $5/mo, Premier $15/mo). Video creation and album art are credit-based — top up a credit pack and spend credits on those renders. Secure checkout by PayFast.' },
    { q: 'Do credits expire?', a: 'No. Credit packs are one-off top-ups and your credits stay on your account until you spend them on video or album-art renders.' },
    { q: 'Do I own what I create?', a: 'Yes. Client-facing output uses commercial-safe models, and you own the songs, videos, and artwork you make.' },
    { q: 'What are Dima voices?', a: 'Dima is our vocal-identity model. Train it once from 3-12 reference vocal takes and it becomes a reusable voice — every new song then sings in that exact voice and style.' },
    { q: 'Where are the studios?', a: 'CrazyJam Studios is headquartered in Johannesburg, South Africa, with our head office in Cape Town and a presence in Kitakyushu, Japan.' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0c]/85 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <img src={TEXT_LOGO} alt="CrazyJam" className="h-7 w-auto object-contain" />
            </div>
            <div className="hidden md:flex items-center gap-7">
              <a href="#features" className="text-sm text-white/70 hover:text-white transition">Features</a>
              <a href="#releases" className="text-sm text-white/70 hover:text-white transition">Releases</a>
              <a href="#pricing" className="text-sm text-white/70 hover:text-white transition">Pricing</a>
              <a href="#studios" className="text-sm text-white/70 hover:text-white transition">Studios</a>
              <a href="/releases" className="text-sm text-amber-400 hover:underline transition">Catalog</a>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => loginWithRedirect()} className="hidden sm:block text-sm text-white/70 hover:text-white transition">Log In</button>
              <button onClick={() => loginWithRedirect()} className="px-4 py-2 bg-amber-400 text-black rounded-lg text-sm font-semibold hover:bg-amber-300 transition">
                Start free
              </button>
              <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 px-6 py-4 flex flex-col gap-3 bg-[#0a0a0c]">
            {['features', 'releases', 'pricing', 'studios'].map((id) => (
              <a key={id} href={`#${id}`} onClick={() => setMobileMenuOpen(false)} className="text-sm text-white/70 capitalize">{id}</a>
            ))}
            <a href="/releases" className="text-sm text-amber-400">Catalog</a>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-16 px-6 border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-400/[0.06] via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative flex flex-col gap-5">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-[0.2em]">The AI-native music studio</span>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Make full songs with vocals,
            <span className="block text-amber-400">on your own terms</span>
          </h1>
          <p className="text-lg text-white/75 max-w-2xl mx-auto leading-relaxed">
            Generate complete songs with real sung vocals, train your own Dima voice,
            design album art, and build music videos — all on our own GPU models.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button onClick={() => loginWithRedirect()} className="px-7 py-3.5 bg-amber-400 text-black rounded-xl font-semibold hover:bg-amber-300 transition inline-flex items-center justify-center gap-2">
              Start creating free <ArrowRight className="h-4 w-4" />
            </button>
            <a href="/releases" className="px-7 py-3.5 border border-white/20 rounded-xl font-semibold hover:border-amber-400/50 transition inline-flex items-center justify-center gap-2">
              <Play className="h-4 w-4" /> Hear the releases
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-5 text-[13px] text-white/60 pt-2">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-amber-400" /> Free to start</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-amber-400" /> You own what you create</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-amber-400" /> Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 flex flex-col gap-3">
            <h2 className="text-3xl md:text-4xl font-bold">One studio, everything you need</h2>
            <p className="text-white/60 max-w-xl mx-auto">From a prompt to a released song — composition, vocals, art, video, and publishing.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-xl hover:border-amber-400/40 transition-all hover:-translate-y-0.5">
                <div className="h-11 w-11 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold mb-1.5">{f.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Official Releases */}
      <section id="releases" className="py-16 px-6 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
            <div>
              <h2 className="text-3xl font-bold text-amber-400">CrazyJam Records — Official Releases</h2>
              <p className="text-white/60 mt-1">Our released albums, out now on every major music service.</p>
            </div>
            <a href="/releases" className="text-sm text-amber-400 hover:underline inline-flex items-center gap-1">
              Full catalog <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {FEATURED_RELEASES.map((r) => (
              <a key={r.title} href={r.url} target="_blank" rel="noopener noreferrer"
                className="group bg-white/5 border border-amber-400/20 rounded-xl overflow-hidden transition-all hover:border-amber-400/60 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(217,196,143,0.12)]">
                <div className="relative aspect-square bg-white/5 overflow-hidden">
                  <img
                    src={r.art}
                    alt={`${r.title} album cover`}
                    loading="lazy"
                    width={1000}
                    height={1000}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-black">Official</span>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-white group-hover:text-amber-300 transition-colors">{r.title}</h3>
                  <p className="text-[12px] text-amber-400/80 mt-0.5">{r.kind}</p>
                  <span className="inline-flex items-center gap-1 mt-3 text-[12px] text-amber-400 group-hover:underline">
                    Listen <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              </a>
            ))}
          </div>
          {/* Artists */}
          <div>
            <h3 className="text-lg font-bold mb-4">CrazyJam Artists</h3>
            <div className="flex flex-wrap gap-2.5">
              {ARTISTS.map((name) => (
                <span key={name} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/80 hover:border-amber-400/50 hover:text-amber-300 transition-all">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 flex flex-col gap-3">
            <h2 className="text-3xl md:text-4xl font-bold">Priced to create</h2>
            <p className="text-white/60">Free to start. Simple monthly plans, cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {plans.map((p) => (
              <div key={p.name} className={`relative rounded-2xl p-6 flex flex-col gap-4 border ${p.popular ? 'bg-amber-400/10 border-amber-400/40 scale-[1.02]' : 'bg-white/5 border-white/10'}`}>
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-black text-[10px] font-bold uppercase tracking-wider">Best value</span>
                )}
                <div>
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-bold">{p.price}</span>
                    <span className="text-white/60 text-sm">{p.period}</span>
                  </div>
                </div>
                <ul className="flex flex-col gap-2 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-white/75">
                      <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => loginWithRedirect()}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${p.popular ? 'bg-amber-400 text-black hover:bg-amber-300' : 'border border-white/20 hover:border-amber-400/50'}`}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-white/60 text-[13px] mt-6">Secure checkout by PayFast — your card never touches our servers.</p>

          {/* Credit packs — one-off top-ups for video + album art */}
          <div className="mt-12">
            <h3 className="text-lg font-bold text-center mb-1">Credit packs — video & album art</h3>
            <p className="text-white/60 text-center text-[13px] mb-6">One-off top-ups, never expire. Spend them on video renders and album covers.</p>
            <div className="grid sm:grid-cols-3 gap-5">
              {creditPacks.map((c) => (
                <div key={c.name} className="rounded-2xl p-5 bg-white/5 border border-white/10 flex flex-col gap-2 hover:border-amber-400/40 transition-all">
                  <div className="flex items-baseline justify-between">
                    <h4 className="font-bold">{c.name}</h4>
                    <span className="text-2xl font-bold text-amber-400">{c.price}</span>
                  </div>
                  <p className="text-[13px] text-white/80 font-medium">{c.credits}</p>
                  <p className="text-[12px] text-white/50">{c.note}</p>
                  <button onClick={() => loginWithRedirect()}
                    className="mt-2 w-full py-2 rounded-xl border border-white/20 text-sm font-semibold hover:border-amber-400/50 transition">
                    Buy credits
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Studio Locations */}
      <section id="studios" className="py-16 px-6 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 flex flex-col gap-3">
            <h2 className="text-3xl md:text-4xl font-bold">CrazyJam Studios — Locations</h2>
            <p className="text-white/60">Studio-crafted releases and production showcases. Find the studios.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {STUDIO_LOCATIONS.map((loc) => (
              <div key={loc.name} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-amber-400/50 transition-all">
                <div className="h-40 bg-white/5">
                  <iframe
                    title={loc.name}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(loc.mapQuery)}&output=embed`}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-[14px]">{loc.name}</h3>
                      <p className="text-[12px] text-amber-400/80">{loc.role}</p>
                    </div>
                  </div>
                  <p className="text-[12px] text-white/60 mt-2 pl-6">{loc.address}</p>
                  {loc.rating != null ? (
                    <div className="flex items-center gap-1.5 mt-2 pl-6">
                      <span className="text-amber-400 text-[13px] font-bold">★ {loc.rating.toFixed(1)}</span>
                      <span className="text-[12px] text-white/50">
                        Google · {loc.reviews} review{loc.reviews === 1 ? '' : 's'}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[12px] text-white/40 mt-2 pl-6">New location — no Google reviews yet</p>
                  )}
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.mapQuery)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 pl-6 text-[12px] text-amber-400 hover:underline">
                    Open in Google Maps <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Questions</h2>
          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                <button
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-white/5 transition font-semibold"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {faq.q}
                  <ArrowRight className={`h-4 w-4 transition-transform ${openFaq === i ? 'rotate-90' : ''}`} />
                </button>
                {openFaq === i && <div className="px-4 pb-4 text-white/70 text-sm leading-relaxed">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-amber-400/[0.05] border-t border-amber-400/20">
        <div className="max-w-3xl mx-auto text-center flex flex-col gap-4">
          <Award className="h-9 w-9 text-amber-400 mx-auto" />
          <h2 className="text-3xl md:text-4xl font-bold">Start your first song</h2>
          <p className="text-white/70">Free to start. Make a full song with vocals in the next few minutes.</p>
          <button onClick={() => loginWithRedirect()} className="mx-auto mt-2 px-8 py-3.5 bg-amber-400 text-black rounded-xl font-semibold hover:bg-amber-300 transition inline-flex items-center gap-2">
            Start creating free <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={ICON_LOGO} alt="CrazyJam" className="h-8 w-8 object-contain" />
            <img src={TEXT_LOGO} alt="CrazyJam" className="h-6 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-6 text-[13px] text-white/60">
            <a href="/releases" className="hover:text-white transition">Releases</a>
            <a href="/pricing" className="hover:text-white transition">Pricing</a>
            <a href="#studios" className="hover:text-white transition">Studios</a>
          </div>
          <p className="text-[12px] text-white/50">CrazyJam Artists · CrazyJam Music · CrazyJam Studios</p>
        </div>
      </footer>
    </div>
  );
};

export { LandingPage };
export default LandingPage;
