import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '@/lib/api';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@400;500;600;700;800&display=swap');

  .ma *, .ma *::before, .ma *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .ma {
    font-family: 'Inter', -apple-system, sans-serif;
    background-color: #0d1a0d;
    color: #f5f5f5;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
    --color-bg: #0d1a0d;
    --color-bg-card: #142014;
    --color-text: #f5f5f5;
    --color-text-muted: #999999;
    --color-text-dim: #666666;
    --color-border: #1a2d1a;
    --color-border-light: #223622;
    --color-accent-1: #6b8f3e;
    --font-display: 'Outfit', sans-serif;
    --font-body: 'Inter', sans-serif;
  }

  .ma .header { border-bottom: 1px solid var(--color-border); padding: 20px 32px; display: flex; align-items: center; gap: 16px; }
  .ma .back-btn { background: none; border: 1px solid var(--color-border-light); border-radius: 8px; color: var(--color-text-muted); cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .ma .back-btn:hover { background: rgba(255,255,255,0.04); color: var(--color-text); border-color: var(--color-border); }

  .ma .content { max-width: 640px; margin: 0 auto; padding: 40px 32px; display: flex; flex-direction: column; gap: 24px; }

  .ma .card { background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 16px; padding: 28px; }
  .ma .card-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--color-text); margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
  .ma .card-title svg { color: var(--color-text-dim); }

  .ma .field { margin-bottom: 16px; }
  .ma .field:last-child { margin-bottom: 0; }
  .ma .field-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-dim); margin-bottom: 6px; }
  .ma .field-value { padding: 12px 16px; background: rgba(255,255,255,0.03); border: 1px solid var(--color-border); border-radius: 10px; font-size: 14px; color: var(--color-text); }

  .ma .btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: var(--font-body); border: none; }
  .ma .btn-primary { background: rgba(200,255,0,0.1); border: 1px solid rgba(200,255,0,0.25); color: #6b8f3e; }
  .ma .btn-primary:hover { background: rgba(200,255,0,0.15); box-shadow: 0 0 20px rgba(200,255,0,0.1); }
  .ma .btn-danger { background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2); color: #f87171; }
  .ma .btn-danger:hover { background: rgba(248,113,113,0.15); }
  .ma .btn-ghost { background: rgba(255,255,255,0.04); border: 1px solid var(--color-border-light); color: var(--color-text-muted); }
  .ma .btn-ghost:hover { background: rgba(255,255,255,0.08); color: var(--color-text); }

  .ma .plan-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; background: rgba(200,255,0,0.08); border: 1px solid rgba(200,255,0,0.2); color: #6b8f3e; }

  .ma .logout-section { display: flex; justify-content: center; padding-top: 8px; }
`;

const MyAccount = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<{ email: string; name: string }>({ email: '', name: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUserData({ email: data.email, name: data.name });
      }
    } catch (err) {
      console.error('Failed to fetch user data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="ma">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>My Account</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-dim)', marginTop: 2 }}>Manage your profile and settings</p>
        </div>
      </div>

      {/* Content */}
      <div className="content">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 32, height: 32, border: '2px solid var(--color-border-light)', borderTopColor: 'var(--color-accent-1)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* Profile Info */}
            <div className="card">
              <div className="card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profile
              </div>
              <div className="field">
                <span className="field-label">Name</span>
                <div className="field-value">{userData.name}</div>
              </div>
              <div className="field">
                <span className="field-label">Email</span>
                <div className="field-value">{userData.email}</div>
              </div>
            </div>

            {/* Security */}
            <div className="card">
              <div className="card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Security
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 14, color: 'var(--color-text)' }}>Password</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 2 }}>Last changed: Unknown</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/change-password')}>
                  Change Password
                </button>
              </div>
            </div>

            {/* Plan */}
            <div className="card">
              <div className="card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                Plan
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="plan-badge">Landscapio Suite</span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>Full access to all AI tools</span>
                </div>
              </div>
            </div>

            {/* Logout */}
            <div className="logout-section">
              <button className="btn btn-danger" onClick={handleLogout}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Log Out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyAccount;
