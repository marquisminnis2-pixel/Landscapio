import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import AccountMenu from '../Dashboard/AccountMenu';

interface AppShellProps {
  title: string;
  accent: string;
  children: ReactNode;
}

const AppShell = ({ title, accent, children }: AppShellProps) => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0d1a0d', fontFamily: "'Space Grotesk', sans-serif", color: '#e0e8f0' }}>
      {/* Top nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(13,21,32,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Back */}
          <button
            onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Dashboard
          </button>

          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 16 }}>/</span>

          {/* App title */}
          <span style={{ fontSize: 14, fontWeight: 600, color: accent }}>{title}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#4a7c2f', letterSpacing: '-0.3px' }}>Landscapio</span>
          <AccountMenu />
        </div>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
};

export default AppShell;
