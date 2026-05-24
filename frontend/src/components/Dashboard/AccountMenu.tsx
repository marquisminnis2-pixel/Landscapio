import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AccountMenu = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleToggle = () => {
    if (!showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setShowDropdown((v) => !v);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('orgId');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Account Button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        title="Account menu"
        style={{ width: 40, height: 40, borderRadius: '50%', background: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 0, transition: 'opacity 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="8" r="4" fill="#0d1a0d" />
          <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" fill="#0d1a0d" />
        </svg>
      </button>

      {/* Dropdown Menu — fixed so parent overflow:hidden doesn't clip it */}
      {showDropdown && (
        <div style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999, width: 224, background: '#111f11', border: '1px solid rgba(74,124,47,0.15)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#e0e8f0', margin: 0 }}>Account</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '3px 0 0' }}>Manage your profile</p>
          </div>

          <div style={{ padding: '4px 0' }}>
            <button
              onClick={() => { setShowDropdown(false); navigate('/profile'); }}
              style={{ width: '100%', padding: '9px 16px', textAlign: 'left', fontSize: 13, color: 'rgba(255,255,255,0.75)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <svg width="15" height="15" fill="none" stroke="rgba(255,255,255,0.4)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Profile
            </button>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '4px 0' }}>
            <button
              onClick={handleLogout}
              style={{ width: '100%', padding: '9px 16px', textAlign: 'left', fontSize: 13, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.07)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;