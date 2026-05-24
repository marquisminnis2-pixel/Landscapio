import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import AccountMenu from './AccountMenu';
import ActiveClientPill from '../Shared/ActiveClientPill';

gsap.registerPlugin(ScrollTrigger);

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@400;500;600;700;800&display=swap');

  .db *, .db *::before, .db *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .db { font-family: 'Inter', -apple-system, sans-serif; background-color: #0d1a0d; color: #f5f5f5; -webkit-font-smoothing: antialiased; overflow-x: hidden; min-height: 100vh; }

  .db { --color-bg: #0d1a0d; --color-bg-elevated: #111f11; --color-bg-card: #142014; --color-text: #f5f5f5; --color-text-muted: #999999; --color-text-dim: #666666; --color-border: #1a2d1a; --color-border-light: #223622; --color-accent-1: #6b8f3e; --color-accent-gradient: linear-gradient(135deg, #6b8f3e, #6b8f3e, #8b5e3c); --font-display: 'Outfit', sans-serif; --font-body: 'Inter', sans-serif; --container-max: 1320px; --padding-global: clamp(1.25rem, 4vw, 2.5rem); --radius-full: 999px; --radius-lg: 20px; --radius-xl: 28px; }

  .db .padding-global { padding-left: var(--padding-global); padding-right: var(--padding-global); }
  .db .container { max-width: var(--container-max); margin: 0 auto; width: 100%; }

  /* Sidebar */
  .db .sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: 220px; background: #0a150a; border-right: 1px solid var(--color-border); z-index: 1001; display: flex; flex-direction: column; padding: 0; }
  .db .sidebar_logo { font-family: var(--font-display); font-size: 1.35rem; font-weight: 700; color: var(--color-text); letter-spacing: -0.02em; padding: 1.25rem 1.25rem 1rem; }
  .db .sidebar_nav { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 0.5rem 0.75rem; overflow-y: auto; }
  .db .sidebar_section { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-text-dim); padding: 1rem 0.5rem 0.4rem; }
  .db .sidebar_item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--color-text-muted); cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
  .db .sidebar_item:hover { background: rgba(255,255,255,0.04); color: var(--color-text); }
  .db .sidebar_item.active { background: rgba(74,124,47,0.06); color: var(--color-accent-1); border-color: rgba(74,124,47,0.15); }
  .db .sidebar_item svg { flex-shrink: 0; opacity: 0.6; }
  .db .sidebar_item:hover svg, .db .sidebar_item.active svg { opacity: 1; }
  .db .sidebar_bottom { padding: 0.75rem; border-top: 1px solid var(--color-border); }
  .db .sidebar_bottom .sidebar_item { font-size: 12px; color: var(--color-text-dim); }

  .db .main-content { margin-left: 220px; }

  /* Navbar */
  .db .navbar { position: fixed; top: 0; left: 220px; right: 0; z-index: 1000; padding: 1.25rem var(--padding-global); transition: background 0.3s ease; }
  .db .navbar.scrolled { background: rgba(10,15,30,0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid #1a2d1a; }
  .db .navbar_inner { display: flex; align-items: center; justify-content: flex-end; max-width: var(--container-max); margin: 0 auto; }
  .db .navbar_logo { font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--color-text); letter-spacing: -0.02em; }

  @media (max-width: 768px) {
    .db .sidebar { width: 60px; padding: 0; }
    .db .sidebar_logo { font-size: 1rem; padding: 1rem 0.5rem; text-align: center; }
    .db .sidebar_item span { display: none; }
    .db .sidebar_section { display: none; }
    .db .main-content { margin-left: 60px; }
    .db .navbar { left: 60px; }
  }

  /* Button */
  .db .button { position: relative; display: inline-flex; align-items: center; justify-content: center; overflow: hidden; border-radius: var(--radius-full); cursor: pointer; background: none; border: none; }
  .db .button_inner { position: relative; z-index: 2; display: flex; align-items: center; padding: 0.85rem 2rem; border-radius: var(--radius-full); background: var(--color-bg); border: 1px solid var(--color-border-light); transition: border-color 0.3s ease; }
  .db .button:hover .button_inner { border-color: #444; }
  .db .button_text { font-family: var(--font-body); font-size: 0.875rem; font-weight: 500; color: var(--color-text); white-space: nowrap; }
  .db .button_gradient { position: absolute; inset: -2px; border-radius: var(--radius-full); background: var(--color-accent-gradient); opacity: 0; transition: opacity 0.4s ease; z-index: 1; }
  .db .button:hover .button_gradient { opacity: 1; }
  .db .button_gradient-glow { position: absolute; inset: -8px; border-radius: var(--radius-full); background: var(--color-accent-gradient); opacity: 0; filter: blur(20px); transition: opacity 0.4s ease; }
  .db .button:hover .button_gradient-glow { opacity: 0.4; }

  /* Hero */
  .db .section_hero { position: relative; min-height: 100vh; display: flex; flex-direction: column; overflow: visible; }
  .db .hero_background-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-family: var(--font-display); font-size: clamp(6rem, 15vw, 16rem); font-weight: 800; white-space: nowrap; user-select: none; pointer-events: none; z-index: 0; letter-spacing: -0.04em; background: linear-gradient(135deg, #6b8f3e, #6b8f3e, #8b5e3c, #4a7c2f, #6b8f3e); background-size: 400% 400%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: db-glow-shift 6s ease infinite; filter: drop-shadow(0 0 40px rgba(74,124,47,0.15)) drop-shadow(0 0 80px rgba(107,143,62,0.1)); }
  @keyframes db-glow-shift { 0% { background-position: 0% 50%; filter: drop-shadow(0 0 40px rgba(74,124,47,0.2)) drop-shadow(0 0 80px rgba(107,143,62,0.1)); } 25% { background-position: 50% 100%; filter: drop-shadow(0 0 40px rgba(107,143,62,0.2)) drop-shadow(0 0 80px rgba(139,94,60,0.1)); } 50% { background-position: 100% 50%; filter: drop-shadow(0 0 40px rgba(139,94,60,0.2)) drop-shadow(0 0 80px rgba(45,80,22,0.1)); } 75% { background-position: 50% 0%; filter: drop-shadow(0 0 40px rgba(45,80,22,0.2)) drop-shadow(0 0 80px rgba(74,124,47,0.1)); } 100% { background-position: 0% 50%; filter: drop-shadow(0 0 40px rgba(74,124,47,0.2)) drop-shadow(0 0 80px rgba(107,143,62,0.1)); } }
  .db .hero_content { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: clamp(6rem, 10vh, 8rem); }
  .db .hero_heading { font-family: var(--font-display); letter-spacing: -0.04em; line-height: 1.05; overflow: hidden; }
  .db .hero_heading._1 { font-size: clamp(1.8rem, 4vw, 3.5rem); font-weight: 800; color: var(--color-text); }
  .db .hero_heading._2 { font-size: clamp(1.2rem, 2.5vw, 2.2rem); font-weight: 600; color: var(--color-text-muted); }
  .db .hero_heading._3 { font-size: clamp(1.2rem, 2.5vw, 2.2rem); font-weight: 600; color: var(--color-text-dim); }
  .db .hero_text { max-width: 480px; font-size: 1rem; line-height: 1.6; color: var(--color-text-muted); margin-top: 1rem; }

  /* Landscapio logo area */
  .db .hero_orbit-wrapper { position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); z-index: 1; display: flex; align-items: center; justify-content: center; }
  .db .orbit_center { font-family: var(--font-display); font-size: clamp(1.5rem, 3vw, 2.5rem); font-weight: 800; color: var(--color-text); letter-spacing: -0.04em; text-align: center; line-height: 1.1; }
  .db .orbit_center-sub { font-size: 0.7rem; font-weight: 500; color: var(--color-text-dim); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0.35rem; }
  .db .orbit_center-glow { width: 120px; height: 120px; border-radius: 50%; background: radial-gradient(circle, rgba(74,124,47,0.08) 0%, transparent 70%); }

  /* Tools grid */
  .db .section_tools { padding: clamp(4rem, 8vw, 7rem) 0; }
  .db .tools_head { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; margin-bottom: clamp(2rem, 5vw, 4rem); }
  .db .tools_heading { font-family: var(--font-display); font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; }
  .db .pill { display: inline-flex; align-items: center; padding: 0.35rem 1rem; border: 1px solid var(--color-border-light); border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); }
  .db .tool-grid-2x2 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  @media (max-width: 1024px) { .db .tool-grid-2x2 { grid-template-columns: repeat(2, 1fr); } }
  .db .tool_card { background: var(--color-bg-card); padding: clamp(1.5rem, 3vw, 2.5rem); display: flex; flex-direction: column; gap: 1rem; cursor: grab; position: relative; border-radius: var(--radius-lg); border: 1px solid var(--color-border-light); transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease; overflow: hidden; }
  .db .tool_card:hover { background: var(--color-bg-elevated); transform: translateY(-4px); }
  .db .tool_card:active { cursor: grabbing; transform: translateY(-4px) scale(0.98); transition: transform 0.1s ease; }
  .db .tool_card .shimmer-overlay { position: absolute; inset: 0; pointer-events: none; overflow: hidden; opacity: 0; z-index: 20; }
  .db .tool_card .shimmer-overlay::after { content: ''; position: absolute; top: 0; left: -100%; width: 60%; height: 100%; background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%); animation: db-shimmer 0.6s linear infinite; }
  .db .tool_card.drag-over .shimmer-overlay { opacity: 1; }
  @keyframes db-shimmer { from { left: -100%; } to { left: 200%; } }
  .db .tool_icon-wrap { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .db .tool_icon-dot { width: 14px; height: 14px; border-radius: 50%; }
  .db .tool_card-top { display: flex; align-items: center; justify-content: space-between; }
  .db .tool_badge { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; padding: 3px 9px; border-radius: 6px; }
  .db .tool_in-progress { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(251,191,36,0.8); background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.2); border-radius: 6px; padding: 2px 7px; margin-top: 4px; display: inline-block; }
  .db .tool_title { font-family: var(--font-display); font-size: clamp(1.25rem, 2vw, 1.75rem); font-weight: 700; letter-spacing: -0.02em; color: var(--color-text); }
  .db .tool_text { font-size: 0.875rem; line-height: 1.6; color: var(--color-text-muted); }
  .db .tool_launch { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 600; margin-top: auto; padding-top: 0.5rem; transition: gap 0.2s ease; }
  .db .tool_card:hover .tool_launch { gap: 10px; }

  /* Footer */
  .db .footer { position: relative; overflow: hidden; padding: clamp(3rem, 6vw, 5rem) 0 0; }
  .db .footer_legal { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; padding: 1.5rem 0; border-top: 1px solid var(--color-border); }
  .db .footer_copyright { font-size: 0.8rem; color: var(--color-text-dim); }
  .db .footer_divider { width: 1px; height: 12px; background: var(--color-border); }
  .db .footer_brand { font-family: var(--font-display); font-size: clamp(5rem, 16vw, 14rem); font-weight: 800; color: rgba(255,255,255,0.03); text-align: center; letter-spacing: -0.04em; line-height: 1; padding: 1rem 0 0; user-select: none; }

  .db .hero_labels { position: absolute; bottom: 2rem; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; max-width: var(--container-max); margin: 0 auto; padding: 0 var(--padding-global); z-index: 4; }
  .db .hero_location { display: flex; align-items: center; gap: 0.5rem; }
  .db .hero_location-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent-1); animation: db-pulse 2s ease infinite; }
  @keyframes db-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
  .db .hero_label { font-size: 0.75rem; font-weight: 500; color: var(--color-text-dim); letter-spacing: 0.04em; }

  .db .reveal { opacity: 0; transform: translateY(30px); }
  .db .reveal.active { opacity: 1; transform: translateY(0); transition: opacity 0.7s ease, transform 0.7s ease; }

  @media (max-width: 768px) {
    .db .tool-grid-2x2 { grid-template-columns: 1fr; }
    .db .hero_background-text { font-size: clamp(3rem, 12vw, 8rem); }
    .db .hero_heading._1 { font-size: clamp(1.4rem, 6vw, 2.2rem); }
    .db .hero_heading._2, .db .hero_heading._3 { font-size: clamp(0.9rem, 4vw, 1.4rem); }
    .db .section_hero { min-height: 70vh; }
    .db .hero_content { padding-top: clamp(3rem, 8vh, 5rem); }
    .db .tools_heading { font-size: clamp(1.5rem, 6vw, 2.5rem); }
    .db .tool_title { font-size: clamp(1.1rem, 4vw, 1.5rem); }
    .db .footer_brand { font-size: clamp(3rem, 14vw, 8rem); }
  }

  @media (max-width: 480px) {
    .db .sidebar { display: none; }
    .db .main-content { margin-left: 0; }
    .db .navbar { left: 0; padding: 0.75rem 1rem; }
    .db .hero_background-text { font-size: 2.5rem; }
    .db .section_tools { padding: 2rem 0; }
    .db .tool_card { padding: 1.25rem; }
  }
`;

const TOOLS = [
  {
    id: 'magic-blog',
    route: '/desktop/magic-blog',
    title: 'Magic\nBlog',
    desc: 'Generate full SEO blog posts with keyword tracking, link management, and Airtable integration.',
    badge: 'Blog',
    color: '#6b8f3e',
    colorRgb: '107,143,62',
  },
  {
    id: 'copyright-social',
    route: '/desktop/copyright-social',
    title: 'Magic\nCopyright',
    desc: 'Social media content calendars with client profiles, platform targeting, and post rotation.',
    badge: 'Social',
    color: '#4a7c2f',
    colorRgb: '74,124,47',
  },
  {
    id: 'magic-pages',
    route: '/desktop/magic-pages',
    title: 'Magic\nPages',
    desc: 'Generate full SEO-optimized page copy (home, about, service, and location pages) with meta tags.',
    badge: 'Pages',
    color: '#9ab897',
    colorRgb: '154,184,151',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const navbarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => navbarRef.current?.classList.toggle('scrolled', window.scrollY > 50);
    window.addEventListener('scroll', onScroll);

    gsap.from('.db .hero_heading._1', { y: 80, opacity: 0, duration: 1, delay: 0.2, ease: 'power3.out' });
    gsap.from('.db .hero_heading._2', { y: 60, opacity: 0, duration: 1, delay: 0.4, ease: 'power3.out' });
    gsap.from('.db .hero_heading._3', { y: 60, opacity: 0, duration: 1, delay: 0.55, ease: 'power3.out' });
    gsap.from('.db .hero_text',        { y: 30, opacity: 0, duration: 0.8, delay: 0.7, ease: 'power3.out' });
    gsap.from('.db .hero_orbit-wrapper', { scale: 0.8, opacity: 0, duration: 1.2, delay: 0.6, ease: 'power3.out' });

    gsap.to('.db .hero_background-text', {
      scrollTrigger: { trigger: '.db .section_hero', start: 'top top', end: 'bottom top', scrub: true },
      y: -100, ease: 'none',
    });

    document.querySelectorAll('.db .reveal').forEach(el => {
      ScrollTrigger.create({ trigger: el, start: 'top 88%', onEnter: () => el.classList.add('active'), once: true });
    });

    gsap.from('.db .footer_brand', {
      scrollTrigger: { trigger: '.db .footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
      y: 60, ease: 'none',
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div className="db">
      <style>{STYLES}</style>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar_logo">Landscapio</div>
        <nav className="sidebar_nav">
          <div className="sidebar_section">Main</div>
          <div className="sidebar_item active" onClick={() => navigate('/dashboard')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            <span>Dashboard</span>
          </div>
          <div className="sidebar_item" onClick={() => navigate('/clients')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Clients</span>
          </div>

          <div className="sidebar_section">Tools</div>
          {TOOLS.map((tool) => (
            <div key={tool.id} className="sidebar_item" onClick={() => navigate(tool.route)}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: tool.color, flexShrink: 0 }} />
              <span>{tool.title.replace('\n', ' ')}</span>
            </div>
          ))}

        </nav>
        <div className="sidebar_bottom">
          <div className="sidebar_item" onClick={() => navigate('/profile')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            <span>Settings</span>
          </div>
        </div>
      </aside>

      <div className="main-content">
      {/* Navbar */}
      <nav className="navbar" ref={navbarRef}>
        <div className="navbar_inner" style={{ justifyContent: 'space-between', gap: 16 }}>
          <ActiveClientPill />
          <AccountMenu />
        </div>
      </nav>

      {/* Hero */}
      <section className="section_hero">
        <div className="hero_background-text">Landscapio</div>

        <div className="hero_content padding-global">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <h1 className="hero_heading _1">Landscapio</h1>
            <h2 className="hero_heading _2">AI tools that create</h2>
            <h3 className="hero_heading _3">Content that converts</h3>
          </div>
        </div>


        <div className="hero_labels">
          <div className="hero_location">
            <div className="hero_location-dot" />
            <div className="hero_label">Landscapio Tools</div>
          </div>
          <div className="hero_label">©2026</div>
        </div>
      </section>

      {/* Tools grid */}
      <section className="section_tools padding-global">
        <div className="container">
          <div className="tools_head reveal">
            <h2 className="tools_heading">AI Tools</h2>
            <div className="pill">Suite</div>
          </div>
          <div className="tool-grid-2x2 reveal">
            {TOOLS.map((tool) => (
              <div
                className="tool_card"
                key={tool.id}
                onClick={() => navigate(tool.route)}
                draggable
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.boxShadow = `0 0 0 1.5px ${tool.color}, 0 8px 32px rgba(${tool.colorRgb},0.2)`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.boxShadow = '';
                }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over'); }}
                onDrop={(e) => { e.currentTarget.classList.remove('drag-over'); }}
              >
                <div className="shimmer-overlay" />
                <div className="tool_card-top">
                  <div className="tool_icon-wrap" style={{ background: `rgba(${tool.colorRgb},0.1)` }}>
                    <div className="tool_icon-dot" style={{ background: tool.color }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span className="tool_badge" style={{ color: tool.color, background: `rgba(${tool.colorRgb},0.1)`, border: `1px solid rgba(${tool.colorRgb},0.2)` }}>
                      {tool.badge}
                    </span>
                    {(tool as any).inProgress && <span className="tool_in-progress">In Progress</span>}
                  </div>
                </div>
                <h3 className="tool_title">
                  {tool.title.split('\n').map((line, i) => (
                    <span key={i}>{line}{i === 0 && tool.title.includes('\n') ? <br /> : ''}</span>
                  ))}
                </h3>
                <p className="tool_text">{tool.desc}</p>
                <div className="tool_launch" style={{ color: tool.color }}>
                  <span>Launch</span>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer padding-global">
        <div className="container">
          <div className="footer_legal">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className="footer_copyright">© 2026 Landscapio</span>
              <div className="footer_divider" />
              <span className="footer_copyright">AI-powered creative suite</span>
            </div>
          </div>
          <div className="footer_brand">Landscapio™</div>
        </div>
      </footer>
      </div>{/* end main-content */}
    </div>
  );
}
