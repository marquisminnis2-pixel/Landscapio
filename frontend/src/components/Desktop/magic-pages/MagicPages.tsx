import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagicPagesProvider } from './context/MagicPagesContext';
import { MagicPagesSidebar } from './MagicPagesSidebar';
import { LocationLandingPage } from './page-types/LocationLandingPage';
import { LocationServicePage } from './page-types/LocationServicePage';
import { MainServicePage } from './page-types/MainServicePage';
import { HomePage } from './page-types/HomePage';
import { AboutPage } from './page-types/AboutPage';

const PAGE_TYPES = [
  { value: 'location-landing-page', label: 'Location Landing Page', description: 'Full landing page for a landscaping service in a specific city. Example: Lawn Care in Dallas, TX' },
  { value: 'location-service-page', label: 'Location Service Page', description: 'Sub-service page for a specific landscaping service. Example: Spring Cleanup Service in Dallas, TX — links back to main Landscaping Dallas page' },
  { value: 'main-service-page', label: 'Main Service Page', description: 'Service page with no city targeting for core landscaping services. Example: Landscape Design' },
  { value: 'home-page', label: 'Home Page', description: 'Main website home page covering who you are, what landscaping services you offer, where you serve, and why homeowners should choose you' },
  { value: 'about-page', label: 'About Page', description: 'About page with business story, team, values, and trust builders for your landscaping company' },
];

const Inner = () => {
  const navigate = useNavigate();
  const [selectedPageType, setSelectedPageType] = useState('');
  const [kwSidebarOpen, setKwSidebarOpen] = useState(true);

  const selectedMeta = PAGE_TYPES.find(p => p.value === selectedPageType);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', 'Space Grotesk', sans-serif", background: '#0d1a0d', color: '#f0f4ee', overflow: 'hidden' }}>
      <style>{`
        .mp-main-scroll::-webkit-scrollbar { width: 5px; }
        .mp-main-scroll::-webkit-scrollbar-track { background: transparent; }
        .mp-main-scroll::-webkit-scrollbar-thumb { background: rgba(74,124,47,0.3); border-radius: 3px; }
        select.mp-type-sel { width: 100%; background: rgba(240,244,238,0.06); border: 1px solid rgba(240,244,238,0.12); border-radius: 8px; color: #f0f4ee; padding: 12px 14px; font-size: 14px; outline: none; font-family: inherit; box-sizing: border-box; transition: border-color 0.2s; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(240,244,238,0.4)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
        select.mp-type-sel:focus { border-color: rgba(74,124,47,0.5); }
        select.mp-type-sel option { background: #0d1a0d; color: #f0f4ee; }
        .mp-panel-fade { animation: mpFadeIn 0.25s ease; }
        @keyframes mpFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Main area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top nav */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 52, borderBottom: '1px solid rgba(240,244,238,0.07)', background: '#0d1a0d', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'rgba(240,244,238,0.35)', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>← Dashboard</button>
            <span style={{ color: 'rgba(240,244,238,0.15)' }}>|</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'rgba(240,244,238,0.8)' }}>Magic Pages</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {!kwSidebarOpen && (
              <button onClick={() => setKwSidebarOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(154,184,151,0.08)', border: '1px solid rgba(154,184,151,0.2)', borderRadius: 6, color: '#9ab897', padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                SEO
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="mp-main-scroll" style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          {/* Page header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f0f4ee', margin: '0 0 6px', letterSpacing: '-0.4px' }}>Magic Pages</h1>
            <p style={{ fontSize: 13, color: 'rgba(240,244,238,0.4)', margin: 0 }}>Select a page type and generate complete SEO-optimized copy</p>
          </div>

          {/* Page type dropdown */}
          <div style={{ marginBottom: 24, maxWidth: 640 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(240,244,238,0.45)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Page Type</label>
            <select className="mp-type-sel" value={selectedPageType} onChange={e => setSelectedPageType(e.target.value)}>
              <option value="" disabled>Choose the type of page you want to write...</option>
              {PAGE_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            {selectedMeta && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'rgba(240,244,238,0.35)', lineHeight: 1.5 }}>{selectedMeta.description}</p>
            )}
          </div>

          {/* Page type panels */}
          {selectedPageType && (
            <div key={selectedPageType} className="mp-panel-fade">
              {selectedPageType === 'location-landing-page' && <LocationLandingPage />}
              {selectedPageType === 'location-service-page' && <LocationServicePage />}
              {selectedPageType === 'main-service-page' && <MainServicePage />}
              {selectedPageType === 'home-page' && <HomePage />}
              {selectedPageType === 'about-page' && <AboutPage />}
            </div>
          )}

          {!selectedPageType && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, maxWidth: 900, marginTop: 8 }}>
              {PAGE_TYPES.map(p => (
                <div key={p.value} onClick={() => setSelectedPageType(p.value)} style={{ background: 'rgba(240,244,238,0.03)', border: '1px solid rgba(240,244,238,0.08)', borderRadius: 12, padding: '18px 18px', cursor: 'pointer', transition: 'all 0.18s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(154,184,151,0.06)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(154,184,151,0.25)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(240,244,238,0.03)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(240,244,238,0.08)'; }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#f0f4ee', marginBottom: 5 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(240,244,238,0.4)', lineHeight: 1.5 }}>{p.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Right SEO Sidebar */}
      <MagicPagesSidebar open={kwSidebarOpen} onClose={() => setKwSidebarOpen(false)} />
    </div>
  );
};

const MagicPages = () => (
  <MagicPagesProvider>
    <Inner />
  </MagicPagesProvider>
);

export default MagicPages;
