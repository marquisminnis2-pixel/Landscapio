import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@400;500;600;700;800&display=swap');

  .lp *, .lp *::before, .lp *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .lp { font-family: 'Inter', -apple-system, sans-serif; background-color: #0d1a0d; color: #f5f5f5; -webkit-font-smoothing: antialiased; overflow-x: hidden; min-height: 100vh; }
  .lp a { text-decoration: none; color: inherit; }
  .lp img { max-width: 100%; display: block; }
  .lp button { border: none; background: none; cursor: pointer; font-family: inherit; }

  .lp { --color-bg: #0d1a0d; --color-bg-elevated: #111f11; --color-bg-card: #142014; --color-text: #f5f5f5; --color-text-muted: #999999; --color-text-dim: #666666; --color-border: #1a2d1a; --color-border-light: #223622; --color-accent-1: #6b8f3e; --color-accent-2: #8b5e3c; --color-accent-gradient: linear-gradient(135deg, #6b8f3e, #6b8f3e, #8b5e3c); --color-white: #ffffff; --font-display: 'Outfit', sans-serif; --font-body: 'Inter', sans-serif; --container-max: 1320px; --padding-global: clamp(1.25rem, 4vw, 2.5rem); --section-padding: clamp(4rem, 10vw, 8rem); --radius-sm: 8px; --radius-md: 12px; --radius-lg: 20px; --radius-xl: 28px; --radius-full: 999px; }

  .lp .padding-global { padding-left: var(--padding-global); padding-right: var(--padding-global); }
  .lp .container { max-width: var(--container-max); margin: 0 auto; width: 100%; }
  .lp .container-medium { max-width: 1080px; margin: 0 auto; width: 100%; }
  .lp .text-style-label { font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); }
  .lp .pill { display: inline-flex; align-items: center; padding: 0.35rem 1rem; border: 1px solid var(--color-border-light); border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); }
  .lp .line { width: 100%; height: 1px; background: var(--color-border); }

  .lp .button { position: relative; display: inline-flex; align-items: center; justify-content: center; overflow: hidden; border-radius: var(--radius-full); cursor: pointer; text-decoration: none; }
  .lp .button_inner { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; padding: 0.85rem 2rem; border-radius: var(--radius-full); background: var(--color-bg); border: 1px solid var(--color-border-light); gap: 0.5rem; transition: border-color 0.3s ease; }
  .lp .button:hover .button_inner { border-color: #444; }
  .lp .button_text { font-family: var(--font-body); font-size: 0.875rem; font-weight: 500; color: var(--color-text); white-space: nowrap; }
  .lp .button_gradient { position: absolute; inset: -2px; border-radius: var(--radius-full); background: var(--color-accent-gradient); opacity: 0; transition: opacity 0.4s ease; z-index: 1; }
  .lp .button:hover .button_gradient { opacity: 1; }
  .lp .button_gradient-glow { position: absolute; inset: -8px; border-radius: var(--radius-full); background: var(--color-accent-gradient); opacity: 0; filter: blur(20px); transition: opacity 0.4s ease; z-index: 0; }
  .lp .button:hover .button_gradient-glow { opacity: 0.4; }

  .lp .navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding-top: 1.25rem; padding-bottom: 1.25rem; transition: background 0.3s ease; }
  .lp .navbar.scrolled { background: rgba(10, 15, 30, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
  .lp .navbar_component { display: flex; align-items: center; justify-content: space-between; max-width: var(--container-max); margin: 0 auto; }
  .lp .navbar_logo { font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--color-text); letter-spacing: -0.02em; cursor: pointer; }
  .lp .navbar_hamburger { display: flex; flex-direction: column; gap: 6px; width: 28px; cursor: pointer; padding: 4px 0; }
  .lp .navbar_hamburger-line { width: 100%; height: 2px; background: var(--color-text); border-radius: 2px; transition: all 0.3s ease; transform-origin: center; }
  .lp .navbar_hamburger:hover .navbar_hamburger-line._1 { transform: translateX(4px); }
  .lp .navbar_hamburger:hover .navbar_hamburger-line._2 { transform: translateX(-4px); }

  .lp .nav-overlay { position: fixed; inset: 0; z-index: 999; background: var(--color-bg); display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.4s ease; }
  .lp .nav-overlay.active { opacity: 1; pointer-events: all; }
  .lp .nav-overlay_links { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .lp .nav-overlay_link { font-family: var(--font-display); font-size: clamp(2.5rem, 6vw, 5rem); font-weight: 700; color: var(--color-text); opacity: 0.4; transition: opacity 0.3s ease; letter-spacing: -0.03em; cursor: pointer; }
  .lp .nav-overlay_link:hover { opacity: 1; }

  .lp .section_hero { position: relative; min-height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  .lp .hero_background-text { position: absolute; top: 55%; left: 50%; transform: translate(-50%, -50%); font-family: var(--font-display); font-size: clamp(6rem, 18vw, 20rem); font-weight: 800; white-space: nowrap; user-select: none; pointer-events: none; z-index: 0; letter-spacing: -0.04em; background: linear-gradient(135deg, #6b8f3e, #6b8f3e, #8b5e3c, #6b8f3e, #6b8f3e); background-size: 400% 400%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: lp-glow-shift 6s ease infinite; filter: drop-shadow(0 0 40px rgba(200,255,0,0.15)) drop-shadow(0 0 80px rgba(0,229,255,0.1)); }
  @keyframes lp-glow-shift { 0% { background-position: 0% 50%; filter: drop-shadow(0 0 40px rgba(200,255,0,0.2)) drop-shadow(0 0 80px rgba(0,229,255,0.1)); } 25% { background-position: 50% 100%; filter: drop-shadow(0 0 40px rgba(0,229,255,0.2)) drop-shadow(0 0 80px rgba(255,107,53,0.1)); } 50% { background-position: 100% 50%; filter: drop-shadow(0 0 40px rgba(255,107,53,0.2)) drop-shadow(0 0 80px rgba(168,85,247,0.1)); } 75% { background-position: 50% 0%; filter: drop-shadow(0 0 40px rgba(168,85,247,0.2)) drop-shadow(0 0 80px rgba(200,255,0,0.1)); } 100% { background-position: 0% 50%; filter: drop-shadow(0 0 40px rgba(200,255,0,0.2)) drop-shadow(0 0 80px rgba(0,229,255,0.1)); } }
  .lp .hero_content { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: clamp(6rem, 12vh, 9rem); }
  .lp .hero_headings { display: flex; flex-direction: column; align-items: center; gap: 0; }
  .lp .hero_heading { font-family: var(--font-display); letter-spacing: -0.04em; line-height: 1.05; overflow: hidden; }
  .lp .hero_heading._1 { font-size: clamp(3rem, 8vw, 7rem); font-weight: 800; color: var(--color-text); }
  .lp .hero_heading._2 { font-size: clamp(2rem, 5vw, 4.5rem); font-weight: 600; color: var(--color-text-muted); }
  .lp .hero_heading._3 { font-size: clamp(2rem, 5vw, 4.5rem); font-weight: 600; color: var(--color-text-dim); }
  .lp .hero_text { max-width: 480px; font-size: 1rem; line-height: 1.6; color: var(--color-text-muted); margin-top: 1.5rem; }
  .lp .hero_button-wrap { margin-top: 2rem; }

  .lp .hero_orbit-wrapper { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; margin-top: clamp(2rem, 4vh, 4rem); padding-bottom: clamp(3rem, 6vh, 5rem); }
  .lp .orbit_container { position: relative; width: clamp(320px, 50vw, 560px); height: clamp(320px, 50vw, 560px); }
  .lp .orbit_ring { position: absolute; inset: 0; border-radius: 50%; border: 1px solid var(--color-border); }
  .lp .orbit_ring._inner { inset: 25%; border-style: dashed; border-color: var(--color-border-light); }
  .lp .orbit_center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; font-family: var(--font-display); font-size: clamp(1.5rem, 3vw, 2.5rem); font-weight: 800; color: var(--color-text); letter-spacing: -0.04em; text-align: center; line-height: 1.1; }
  .lp .orbit_center-sub { font-size: 0.7rem; font-weight: 500; color: var(--color-text-dim); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0.35rem; }
  .lp .orbit_center-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 120px; height: 120px; border-radius: 50%; background: radial-gradient(circle, rgba(200, 255, 0, 0.08) 0%, transparent 70%); z-index: 5; }
  .lp .orbit_track { position: absolute; inset: 0; }
  .lp .orbit_tool { position: absolute; display: flex; align-items: center; justify-content: center; white-space: nowrap; transform: translate(-50%, -50%); }
  .lp .orbit_tool-link { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.25rem; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: var(--radius-full); font-family: var(--font-body); font-size: clamp(0.7rem, 1.2vw, 0.85rem); font-weight: 600; color: var(--color-text); transition: all 0.3s ease; text-decoration: none; cursor: pointer; }
  .lp .orbit_tool-link:hover { border-color: var(--color-accent-1); background: rgba(200, 255, 0, 0.06); box-shadow: 0 0 20px rgba(200, 255, 0, 0.1); transform: scale(1.05); }
  .lp .orbit_tool-icon { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .lp .orbit_tool-icon._copyright { background: rgba(200, 255, 0, 0.2); }
  .lp .orbit_tool-icon._blog { background: rgba(0, 229, 255, 0.2); }
  .lp .orbit_tool-icon._copyrighter { background: rgba(255, 107, 53, 0.2); }
  .lp .orbit_tool-icon._pages { background: rgba(168, 85, 247, 0.2); }
  .lp .orbit_tool-icon._content { background: rgba(59, 130, 246, 0.2); }
  .lp .orbit_tool-icon._writing { background: rgba(236, 72, 153, 0.2); }
  .lp .orbit_tool-dot { width: 8px; height: 8px; border-radius: 50%; }
  .lp .orbit_tool-dot._copyright { background: #6b8f3e; }
  .lp .orbit_tool-dot._blog { background: #6b8f3e; }
  .lp .orbit_tool-dot._copyrighter { background: #8b5e3c; }
  .lp .orbit_tool-dot._pages { background: #6b8f3e; }
  .lp .orbit_tool-dot._content { background: #3b82f6; }
  .lp .orbit_tool-dot._writing { background: #6b8f3e; }
  .lp .orbit_tool:nth-child(1) { top: 0%; left: 50%; }
  .lp .orbit_tool:nth-child(2) { top: 25%; left: 93.3%; }
  .lp .orbit_tool:nth-child(3) { top: 75%; left: 93.3%; }
  .lp .orbit_tool:nth-child(4) { top: 100%; left: 50%; }
  .lp .orbit_tool:nth-child(5) { top: 75%; left: 6.7%; }
  .lp .orbit_tool:nth-child(6) { top: 25%; left: 6.7%; }

  .lp .hero_labels { display: flex; justify-content: space-between; align-items: center; max-width: var(--container-max); margin: 1.5rem auto 0; padding: 0 var(--padding-global); }
  .lp .hero_location { display: flex; align-items: center; gap: 0.5rem; }
  .lp .hero_location-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent-1); animation: lp-pulse-dot 2s ease infinite; }
  @keyframes lp-pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
  .lp .hero_label { font-size: 0.75rem; font-weight: 500; color: var(--color-text-dim); letter-spacing: 0.04em; }

  .lp .scroll-note { position: fixed; right: var(--padding-global); bottom: 2rem; z-index: 50; display: flex; align-items: center; gap: 0.5rem; writing-mode: vertical-rl; font-size: 0.7rem; font-weight: 500; color: var(--color-text-dim); letter-spacing: 0.1em; text-transform: uppercase; }
  .lp .scroll-note_line { width: 1px; height: 40px; background: linear-gradient(to bottom, var(--color-text-dim), transparent); animation: lp-scroll-line 1.5s ease infinite; }
  @keyframes lp-scroll-line { 0% { transform: scaleY(1); opacity: 1; } 50% { transform: scaleY(0.5); opacity: 0.3; } 100% { transform: scaleY(1); opacity: 1; } }

  .lp .section_about { position: relative; padding: var(--section-padding) 0; }
  .lp .about_component { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(2rem, 5vw, 5rem); align-items: center; }
  .lp .about_image-wrap { position: relative; border-radius: var(--radius-lg); overflow: hidden; aspect-ratio: 4/5; }
  .lp .about_image { width: 100%; height: 100%; object-fit: cover; }
  .lp .about_image-text { position: absolute; bottom: 1.5rem; left: 1.5rem; right: 1.5rem; font-family: var(--font-display); font-size: clamp(1.5rem, 3vw, 2.5rem); font-weight: 700; color: var(--color-white); letter-spacing: -0.02em; line-height: 1.15; }
  .lp .about_content { display: flex; flex-direction: column; gap: 1.5rem; }
  .lp .about_heading { font-family: var(--font-display); font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; color: var(--color-text); }
  .lp .about_text { font-size: 1rem; line-height: 1.7; color: var(--color-text-muted); max-width: 480px; }

  .lp .section_services { padding: var(--section-padding) 0; }
  .lp .services_head { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; margin-bottom: clamp(2rem, 5vw, 4rem); }
  .lp .services_heading { font-family: var(--font-display); font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; }
  .lp .services_grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
  .lp .service_card { background: var(--color-bg); padding: clamp(1.5rem, 3vw, 2.5rem); display: flex; flex-direction: column; gap: 1rem; transition: background 0.3s ease; cursor: pointer; }
  .lp .service_card:hover { background: var(--color-bg-elevated); }
  .lp .service_icon-wrap { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .lp .service_icon-wrap._copyright { background: rgba(200, 255, 0, 0.1); }
  .lp .service_icon-wrap._blog { background: rgba(0, 229, 255, 0.1); }
  .lp .service_icon-wrap._copyrighter { background: rgba(255, 107, 53, 0.1); }
  .lp .service_icon-wrap._pages { background: rgba(168, 85, 247, 0.1); }
  .lp .service_icon-wrap._content { background: rgba(59, 130, 246, 0.1); }
  .lp .service_icon-wrap._writing { background: rgba(236, 72, 153, 0.1); }
  .lp .service_icon-dot { width: 14px; height: 14px; border-radius: 50%; }
  .lp .service_icon-dot._copyright { background: #6b8f3e; }
  .lp .service_icon-dot._blog { background: #6b8f3e; }
  .lp .service_icon-dot._copyrighter { background: #8b5e3c; }
  .lp .service_icon-dot._pages { background: #6b8f3e; }
  .lp .service_icon-dot._content { background: #3b82f6; }
  .lp .service_icon-dot._writing { background: #6b8f3e; }
  .lp .service_title { font-family: var(--font-display); font-size: clamp(1.25rem, 2vw, 1.75rem); font-weight: 700; letter-spacing: -0.02em; color: var(--color-text); }
  .lp .service_text { font-size: 0.9rem; line-height: 1.6; color: var(--color-text-muted); }

  .lp .section_brands { padding: var(--section-padding) 0; }
  .lp .brands_list { display: flex; align-items: center; justify-content: center; gap: clamp(2rem, 6vw, 5rem); flex-wrap: wrap; opacity: 0.35; }
  .lp .brand_item { font-family: var(--font-display); font-size: clamp(1.25rem, 2.5vw, 2rem); font-weight: 700; color: var(--color-text); letter-spacing: -0.02em; white-space: nowrap; transition: opacity 0.3s ease; }
  .lp .brands_list:hover .brand_item { opacity: 0.4; }
  .lp .brands_list:hover .brand_item:hover { opacity: 1; }

  .lp .section_blog { padding: var(--section-padding) 0; }
  .lp .blog_head { display: flex; align-items: center; gap: 1rem; margin-bottom: clamp(2rem, 5vw, 3rem); }
  .lp .blog_head .line { flex: 1; }
  .lp .blog_list { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(1rem, 2vw, 1.5rem); }
  .lp .blog_card { display: flex; flex-direction: column; background: var(--color-bg-card); border-radius: var(--radius-lg); overflow: hidden; transition: transform 0.4s ease; }
  .lp .blog_card:hover { transform: translateY(-4px); }
  .lp .blog_card-img-wrap { aspect-ratio: 16/10; overflow: hidden; }
  .lp .blog_card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
  .lp .blog_card:hover .blog_card-img { transform: scale(1.04); }
  .lp .blog_card-content { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
  .lp .blog_card-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-dim); }
  .lp .blog_card-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; letter-spacing: -0.01em; line-height: 1.3; }
  .lp .blog_card-desc { font-size: 0.85rem; line-height: 1.5; color: var(--color-text-muted); }

  .lp .section_cta { padding: var(--section-padding) 0; }
  .lp .cta_component { display: grid; grid-template-columns: 1fr 1fr; border-radius: var(--radius-xl); overflow: hidden; background: var(--color-bg-card); min-height: 400px; }
  .lp .cta_graphic-wrap { position: relative; overflow: hidden; }
  .lp .cta_graphic { width: 100%; height: 100%; animation: lp-cta-bg-shift 8s ease infinite; }
  @keyframes lp-cta-bg-shift { 0%, 100% { background: linear-gradient(135deg, #1a0033, #0d001a, #000d1a); } 33% { background: linear-gradient(135deg, #0d001a, #000d1a, #001a0d); } 66% { background: linear-gradient(135deg, #000d1a, #001a0d, #1a0033); } }
  .lp .cta_content { padding: clamp(2rem, 4vw, 3.5rem); display: flex; flex-direction: column; justify-content: space-between; gap: 2rem; }
  .lp .cta_pill { display: inline-flex; align-items: center; padding: 0.3rem 0.9rem; border: 1px solid var(--color-border-light); border-radius: var(--radius-full); font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); }
  .lp .cta_heading { font-family: var(--font-display); font-size: clamp(1.25rem, 2vw, 1.75rem); font-weight: 600; letter-spacing: -0.02em; line-height: 1.3; margin-top: 1rem; }
  .lp .cta_bottom { display: flex; flex-direction: column; gap: 1rem; }
  .lp .cta_text { font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.5; }

  .lp .footer { position: relative; overflow: hidden; }
  .lp .footer_wrap { padding: clamp(3rem, 6vw, 5rem) 0 0; }
  .lp .footer_component { display: flex; flex-direction: column; gap: clamp(2rem, 5vw, 4rem); }
  .lp .footer_main { display: flex; justify-content: space-between; align-items: flex-start; gap: 2rem; flex-wrap: wrap; }
  .lp .footer_link-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-dim); margin-bottom: 1.25rem; }
  .lp .footer_lists { display: flex; gap: clamp(2rem, 5vw, 5rem); }
  .lp .footer_links-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .lp .footer_link { font-size: 0.9rem; color: var(--color-text-muted); transition: color 0.3s ease; cursor: pointer; }
  .lp .footer_link:hover { color: var(--color-text); }
  .lp .footer_social { display: flex; gap: 0.75rem; }
  .lp .footer_social-icon { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--color-border-light); display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
  .lp .footer_social-icon:hover { border-color: var(--color-text-muted); background: rgba(255,255,255,0.05); }
  .lp .footer_legal { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; padding: 1.5rem 0; border-top: 1px solid var(--color-border); }
  .lp .footer_legal-wrap { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .lp .footer_copyright { font-size: 0.8rem; color: var(--color-text-dim); }
  .lp .footer_legal-divider { width: 1px; height: 12px; background: var(--color-border); }
  .lp .footer_brand { font-family: var(--font-display); font-size: clamp(5rem, 16vw, 14rem); font-weight: 800; color: rgba(255,255,255,0.03); text-align: center; letter-spacing: -0.04em; line-height: 1; padding: 1rem 0 0; user-select: none; overflow: hidden; }

  .lp .reveal { opacity: 0; transform: translateY(30px); }
  .lp .reveal.active { opacity: 1; transform: translateY(0); transition: opacity 0.7s ease, transform 0.7s ease; }
  .lp .reveal-scale { opacity: 0; transform: scale(0.95); }
  .lp .reveal-scale.active { opacity: 1; transform: scale(1); transition: opacity 0.7s ease, transform 0.7s ease; }

  @media (max-width: 991px) {
    .lp .about_component { grid-template-columns: 1fr; gap: 2rem; }
    .lp .about_image-wrap { aspect-ratio: 16/9; }
    .lp .services_grid { grid-template-columns: 1fr; }
    .lp .cta_component { grid-template-columns: 1fr; }
    .lp .cta_graphic-wrap { min-height: 200px; }
    .lp .blog_list { grid-template-columns: 1fr; }
    .lp .scroll-note { display: none; }
    .lp .orbit_container { width: 300px; height: 300px; }
    .lp .orbit_tool-link { font-size: 0.65rem; padding: 0.45rem 0.9rem; }
  }
  @media (max-width: 600px) {
    .lp .services_head { flex-direction: column; align-items: flex-start; }
    .lp .services_grid { grid-template-columns: 1fr 1fr; }
    .lp .footer_main { flex-direction: column; }
    .lp .orbit_container { width: 260px; height: 260px; }
    .lp .orbit_tool-link { font-size: 0.6rem; padding: 0.35rem 0.7rem; gap: 0.3rem; }
    .lp .orbit_tool-icon { width: 14px; height: 14px; }
    .lp .orbit_tool-dot { width: 6px; height: 6px; }
  }
`;

export default function LandingPage() {
  const navigate = useNavigate();
  const navOpenRef = useRef(false);
  const navbarRef = useRef<HTMLElement>(null);
  const navOverlayRef = useRef<HTMLDivElement>(null);

  const scrollTo = (id: string) => {
    if (navOpenRef.current) {
      navOpenRef.current = false;
      if (navOverlayRef.current) navOverlayRef.current.classList.remove('active');
      document.body.style.overflow = '';
    }
    if (id === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleNav = () => {
    navOpenRef.current = !navOpenRef.current;
    navOverlayRef.current?.classList.toggle('active', navOpenRef.current);
    document.body.style.overflow = navOpenRef.current ? 'hidden' : '';
  };

  useEffect(() => {
    // Scroll → navbar bg
    const onScroll = () => {
      navbarRef.current?.classList.toggle('scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', onScroll);

    // Hero entrance
    gsap.from('.lp .hero_heading._1', { y: 80, opacity: 0, duration: 1, delay: 0.2, ease: 'power3.out' });
    gsap.from('.lp .hero_heading._2', { y: 60, opacity: 0, duration: 1, delay: 0.4, ease: 'power3.out' });
    gsap.from('.lp .hero_heading._3', { y: 60, opacity: 0, duration: 1, delay: 0.55, ease: 'power3.out' });
    gsap.from('.lp .hero_text',        { y: 30, opacity: 0, duration: 0.8, delay: 0.7, ease: 'power3.out' });
    gsap.from('.lp .hero_button-wrap', { y: 20, opacity: 0, duration: 0.8, delay: 0.85, ease: 'power3.out' });
    gsap.from('.lp .hero_orbit-wrapper', { scale: 0.8, opacity: 0, duration: 1.2, delay: 0.6, ease: 'power3.out' });

    // Background text parallax
    gsap.to('.lp .hero_background-text', {
      scrollTrigger: { trigger: '.lp .section_hero', start: 'top top', end: 'bottom top', scrub: true },
      y: -100, ease: 'none',
    });

    // Scroll reveal
    document.querySelectorAll('.lp .reveal, .lp .reveal-scale').forEach(el => {
      ScrollTrigger.create({
        trigger: el, start: 'top 88%',
        onEnter: () => el.classList.add('active'),
        once: true,
      });
    });

    // Footer parallax
    gsap.from('.lp .footer_brand', {
      scrollTrigger: { trigger: '.lp .footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
      y: 60, ease: 'none',
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      ScrollTrigger.getAll().forEach(t => t.kill());
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="lp">
      <style>{STYLES}</style>

      {/* Scroll note */}
      <div className="scroll-note">
        <div className="scroll-note_line" />
        <span>Scroll</span>
      </div>

      {/* Navbar */}
      <nav className="navbar padding-global" ref={navbarRef}>
        <div className="navbar_component">
          <span className="navbar_logo" onClick={() => scrollTo('top')}>Landscapio</span>
          <div className="navbar_hamburger" onClick={toggleNav}>
            <div className="navbar_hamburger-line _1" />
            <div className="navbar_hamburger-line _2" />
          </div>
        </div>
      </nav>

      {/* Nav overlay */}
      <div className="nav-overlay" ref={navOverlayRef}>
        <div className="nav-overlay_links">
          <span className="nav-overlay_link" onClick={() => scrollTo('top')}>Home</span>
          <span className="nav-overlay_link" onClick={() => scrollTo('about')}>About</span>
          <span className="nav-overlay_link" onClick={() => scrollTo('tools')}>AI Tools</span>
          <span className="nav-overlay_link" onClick={() => scrollTo('blog')}>Blog</span>
          <span className="nav-overlay_link" onClick={() => scrollTo('contact')}>Contact</span>
        </div>
      </div>

      {/* Page wrapper */}
      <div className="page-wrapper">

        {/* Hero */}
        <section className="section_hero">
          <div className="hero_background-text">Landscapio</div>
          <div className="hero_content padding-global">
            <div className="hero_headings">
              <h1 className="hero_heading _1">Landscapio</h1>
              <h2 className="hero_heading _2">Websites that perform</h2>
              <h3 className="hero_heading _3">Apps that deliver</h3>
            </div>
            <p className="hero_text">An AI tool ready for you to work</p>
            <div className="hero_button-wrap">
              <button className="button" onClick={() => navigate('/login')}>
                <div className="button_gradient" />
                <div className="button_inner">
                  <div className="button_text">Get started</div>
                </div>
                <div className="button_gradient-glow" />
              </button>
            </div>
          </div>


          <div className="hero_labels">
            <div className="hero_location">
              <div className="hero_location-dot" />
              <div className="hero_label">Seattle</div>
            </div>
            <div className="hero_label">©2026</div>
          </div>
        </section>

        {/* About */}
        <section className="section_about padding-global" id="about">
          <div className="container">
            <div className="about_component reveal">
              <div className="about_image-wrap">
                <img
                  src="https://images.unsplash.com/photo-1677442136019-21780ecad995?w=700&h=900&fit=crop"
                  alt="AI technology visualization"
                  className="about_image"
                  loading="lazy"
                />
                <div className="about_image-text">AI-powered tools<br />that amplify your<br />creative output</div>
              </div>
              <div className="about_content">
                <div className="pill">About Landscapio</div>
                <h2 className="about_heading">Your AI-powered creative suite</h2>
                <p className="about_text">Landscapio brings together a suite of AI tools designed to supercharge your creative workflow — from copywriting and blogging to full page generation and content strategy.</p>
                <p className="about_text">Each tool is built to work seamlessly together, giving you an integrated AI workspace that adapts to how you create.</p>
                <div style={{ height: '1rem' }} />
                <button className="button" onClick={() => navigate('/login')}>
                  <div className="button_gradient" />
                  <div className="button_inner">
                    <div className="button_text">Learn more</div>
                  </div>
                  <div className="button_gradient-glow" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* AI Tools */}
        <section className="section_services padding-global" id="tools">
          <div className="container">
            <div className="services_head reveal">
              <h2 className="services_heading">AI Tools</h2>
              <div className="pill">Suite</div>
            </div>
            <div className="services_grid reveal">
              {[
                { cls: '_copyright', title: 'Copyright\nfor DLO', desc: 'AI-powered copyright protection and content originality verification for your digital assets.' },
                { cls: '_blog',       title: 'Magic\nBlog',       desc: 'Generate full blog posts with structure, tone, and SEO optimization built in from the start.' },
                { cls: '_copyrighter',title: 'DLO\nCopyrighter', desc: 'Professional ad copy, taglines, and marketing content crafted by AI with your brand voice.' },
                { cls: '_pages',      title: 'Magic\nPages',      desc: 'Full web pages generated from a prompt — layouts, content, and design decisions handled by AI.' },
                { cls: '_content',    title: 'Magic\nContent',    desc: 'Multi-format content generation — social posts, newsletters, product descriptions, and more.' },
                { cls: '_writing',    title: 'Writing',           desc: 'Long-form writing assistant for articles, documentation, scripts, and creative prose.' },
              ].map(({ cls, title, desc }) => (
                <div className="service_card" key={cls} onClick={() => navigate('/login')}>
                  <div className={`service_icon-wrap ${cls}`}><div className={`service_icon-dot ${cls}`} /></div>
                  <h3 className="service_title">{title.split('\n').map((l, i) => <span key={i}>{l}{i === 0 && title.includes('\n') ? <br /> : ''}</span>)}</h3>
                  <p className="service_text">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Brands */}
        <section className="section_brands padding-global">
          <div className="container">
            <div className="brands_list reveal">
              {['Stripe', 'Notion', 'Figma', 'Linear', 'Vercel', 'Arc'].map(b => (
                <div className="brand_item" key={b}>{b}</div>
              ))}
            </div>
          </div>
        </section>

        {/* Blog */}
        <section className="section_blog padding-global" id="blog">
          <div className="container">
            <div className="blog_head reveal">
              <div className="line" />
              <div className="text-style-label">Latest posts</div>
            </div>
            <div className="blog_list">
              {[
                { img: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=600&h=380&fit=crop', label: 'AI',      title: 'How AI is reshaping content creation in 2026',       desc: 'Exploring how AI writing tools are changing the way teams produce content at scale.' },
                { img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=380&fit=crop', label: 'Product', title: 'Introducing Magic Pages — AI-generated web pages',       desc: 'From a single prompt to a full landing page — here\'s how Magic Pages works.' },
                { img: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=380&fit=crop',label: 'Workflow',title: '5 ways Landscapio speeds up your creative workflow',         desc: 'Real use cases from teams using the Landscapio AI suite to ship faster.' },
              ].map(({ img, label, title, desc }) => (
                <div className="blog_card reveal-scale" key={title}>
                  <div className="blog_card-img-wrap">
                    <img src={img} alt={title} className="blog_card-img" loading="lazy" />
                  </div>
                  <div className="blog_card-content">
                    <div className="blog_card-label">{label}</div>
                    <h3 className="blog_card-title">{title}</h3>
                    <p className="blog_card-desc">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section_cta padding-global" id="contact">
          <div className="container-medium">
            <div className="cta_component reveal">
              <div className="cta_graphic-wrap">
                <div className="cta_graphic" />
              </div>
              <div className="cta_content">
                <div className="cta_head">
                  <div className="cta_pill">Get started</div>
                  <h2 className="cta_heading">Ready to supercharge your content with AI-powered tools?</h2>
                </div>
                <div className="cta_bottom">
                  <button className="button" onClick={() => navigate('/register')}>
                    <div className="button_gradient" />
                    <div className="button_inner">
                      <div className="button_text">Try Landscapio free</div>
                    </div>
                    <div className="button_gradient-glow" />
                  </button>
                  <p className="cta_text">No credit card required. Start creating with all 6 AI tools today.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer padding-global">
          <div className="container">
            <div className="footer_wrap">
              <div className="footer_component">
                <div className="footer_main">
                  <div className="footer_group">
                    <div className="footer_link-label">Pages</div>
                    <div className="footer_lists">
                      <div className="footer_links-list">
                        <span className="footer_link" onClick={() => scrollTo('top')}>Home</span>
                        <span className="footer_link" onClick={() => scrollTo('about')}>About</span>
                        <span className="footer_link" onClick={() => scrollTo('tools')}>AI Tools</span>
                      </div>
                      <div className="footer_links-list">
                        <span className="footer_link" onClick={() => scrollTo('blog')}>Blog</span>
                        <span className="footer_link" onClick={() => scrollTo('contact')}>Contact</span>
                      </div>
                    </div>
                  </div>
                  <div className="footer_social">
                    <a href="https://instagram.com" target="_blank" rel="noreferrer" className="footer_social-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                        <rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </svg>
                    </a>
                    <a href="https://x.com" target="_blank" rel="noreferrer" className="footer_social-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                        <path d="M4 4l11.733 16h4.267l-11.733 -16h-4.267z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
                      </svg>
                    </a>
                    <a href="https://youtube.com" target="_blank" rel="noreferrer" className="footer_social-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.5 12 19.5 12 19.5s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.37z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                      </svg>
                    </a>
                  </div>
                </div>
                <div className="footer_legal">
                  <div className="footer_legal-wrap">
                    <div className="footer_copyright">© 2026 Landscapio</div>
                    <div className="footer_legal-divider" />
                    <div className="footer_copyright">Built with purpose</div>
                  </div>
                </div>
              </div>
              <div className="footer_brand">Landscapio™</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
