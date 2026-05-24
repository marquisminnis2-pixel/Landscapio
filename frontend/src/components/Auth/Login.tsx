import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '@/lib/api';

type ViewState = 'intro' | 'auth';

const Login = () => {
  const navigate = useNavigate();
  const [viewState, setViewState] = useState<ViewState>('intro');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) navigate('/dashboard');
  }, [navigate]);

  const handleBegin = () => setViewState('auth');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        if (data.defaultOrgId) localStorage.setItem('orgId', data.defaultOrgId);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        if (data.orgs && data.defaultOrgId) {
          const defaultOrg = data.orgs.find((o: any) => o._id === data.defaultOrgId) || data.orgs[0];
          if (defaultOrg?.plan) localStorage.setItem('orgPlan', defaultOrg.plan);
        }
        navigate('/clients');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse at top left,    rgba(45,80,22,.13)   0%, transparent 50%),
          radial-gradient(ellipse at top right,   rgba(139,94,60,.13) 0%, transparent 50%),
          radial-gradient(ellipse at bottom,      rgba(107,143,62,.11) 0%, transparent 50%),
          linear-gradient(135deg, #0d1a0d 0%, #060d06 100%)
        `
      }} />

      {/* Grid */}
      <div className="absolute inset-0 auth-grid" />

      {/* Scan line */}
      <div className="absolute left-0 right-0 h-[2px] auth-scan pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(74,124,47,0.4), rgba(139,94,60,0.4), transparent)', top: 0 }} />

      {/* Morphing blobs */}
      <div className="absolute w-[600px] h-[600px] rounded-full blur-[120px] animate-drift-1"
        style={{ background: 'radial-gradient(circle, rgba(45,80,22,0.15) 0%, rgba(45,80,22,0.06) 40%, transparent 70%)', top: '5%', left: '10%', willChange: 'transform' }} />
      <div className="absolute w-[500px] h-[500px] rounded-full blur-[100px] animate-drift-2"
        style={{ background: 'radial-gradient(circle, rgba(139,94,60,0.14) 0%, rgba(139,94,60,0.06) 40%, transparent 70%)', top: '40%', right: '8%', willChange: 'transform' }} />
      <div className="absolute w-[550px] h-[550px] rounded-full blur-[110px] animate-drift-3"
        style={{ background: 'radial-gradient(circle, rgba(107,143,62,0.12) 0%, rgba(107,143,62,0.05) 40%, transparent 70%)', bottom: '10%', left: '25%', willChange: 'transform' }} />

      {/* STEP 1: Intro Screen */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-out ${
        viewState === 'intro' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`}>
        {/* Big Landscapio title */}
        <div className="mb-20 relative">
          <h1 className="text-[2.8rem] sm:text-[4rem] md:text-[5.5rem] font-black tracking-tight flex flex-wrap justify-center"
            style={{ fontFamily: "'Space Grotesk','Urbanist','Syne',-apple-system,sans-serif", letterSpacing: '-0.04em', fontWeight: 900 }}>
            {'Landscapio'.split('').map((letter, i) => (
              <span key={i}
                className="inline-block hover:scale-110 transition-transform duration-200 cursor-default"
                style={{
                  animation: `letter-float ${3 + i * 0.3}s ease-in-out ${i * 0.1}s infinite, auth-neon-pulse 3s ease-in-out ${i * 0.15}s infinite`,
                  background: 'linear-gradient(90deg, #4a7c2f, #6b8f3e, #8b5e3c)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                {letter}
              </span>
            ))}
          </h1>
        </div>

        {/* Tagline */}
        <h2 className="text-[1.3rem] sm:text-[1.6rem] md:text-[2rem] font-light tracking-tight text-white/80 mb-16 text-center leading-tight px-4"
          style={{ fontFamily: "'Inter',sans-serif", letterSpacing: '-0.02em' }}>
          Beautiful spaces.<br />
          <span className="font-normal" style={{ background: 'linear-gradient(90deg,#6b8f3e,#8b5e3c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Intelligently designed.
          </span>
        </h2>

        {/* Begin button */}
        <button onClick={handleBegin} className="auth-begin-btn group relative px-12 py-4 font-medium text-lg overflow-hidden">
          <span className="relative z-10 flex items-center gap-3"
            style={{ background: 'linear-gradient(90deg,#6b8f3e,#8b5e3c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Begin
            <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <path stroke="url(#lg1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              <defs>
                <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6b8f3e" />
                  <stop offset="100%" stopColor="#8b5e3c" />
                </linearGradient>
              </defs>
            </svg>
          </span>
        </button>
      </div>

      {/* STEP 2: Auth Screen */}
      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${
        viewState === 'auth' ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
      }`}>
        <div className="w-full max-w-md px-6">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="relative w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden"
                style={{ background: 'linear-gradient(135deg,#2d5016,#6b8f3e,#8b5e3c)' }}>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent transform -translate-x-full animate-shine" />
                <svg className="w-6 h-6 relative z-10" viewBox="0 0 24 24" fill="white">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
                </svg>
              </div>
              <span className="text-2xl font-semibold flex" style={{ fontFamily: "'Space Grotesk','Urbanist','Syne',-apple-system,sans-serif" }}>
                {'Landscapio'.split('').map((letter, i) => (
                  <span key={i} className="inline-block animate-letter-float hover:scale-110 transition-transform duration-200 cursor-default auth-neon-title"
                    style={{ animationDelay: `${i * 0.1}s`, animationDuration: `${3 + i * 0.3}s` }}>
                    {letter}
                  </span>
                ))}
              </span>
            </div>
          </div>

          {/* Auth Card */}
          <div className="auth-card p-10 rounded-xl">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-white/50 text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input w-full px-4 py-3 rounded-lg text-white placeholder-white/30 transition-all duration-200"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-white/50 text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input w-full px-4 py-3 rounded-lg text-white placeholder-white/30 transition-all duration-200"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="auth-submit-btn w-full py-3.5 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2" style={{ background: 'linear-gradient(90deg,#6b8f3e,#8b5e3c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    <svg className="animate-spin w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" style={{ color: '#6b8f3e' }}>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <span style={{ background: 'linear-gradient(90deg,#6b8f3e,#8b5e3c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Sign In
                  </span>
                )}
              </button>
            </form>
            <div className="mt-8 text-center space-y-3">
              <p className="text-white/40 text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="text-white hover:text-[#6b8f3e] font-medium transition-colors duration-200">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Background grid */
        .auth-grid {
          background-image:
            linear-gradient(rgba(74,124,47,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74,124,47,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        /* Scan line */
        @keyframes auth-scan {
          0%   { transform: translateY(-2px); opacity: 0; }
          5%   { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .auth-scan { animation: auth-scan 12s linear infinite; will-change: transform; }

        /* Neon title */
        .auth-neon-title {
          background: linear-gradient(90deg, #4a7c2f, #6b8f3e, #8b5e3c);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 20px rgba(74,124,47,0.3));
        }

        /* Begin button */
        .auth-begin-btn {
          border: 1px solid rgba(74,124,47,0.45);
          border-radius: 8px;
          background: rgba(74,124,47,0.06);
          position: relative;
          overflow: hidden;
        }
        .auth-begin-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(74,124,47,0.12), rgba(139,94,60,0.12));
          opacity: 0;
          transition: opacity 0.3s;
        }
        .auth-begin-btn:hover::before { opacity: 1; }
        .auth-begin-btn:hover { border-color: rgba(74,124,47,0.8); box-shadow: 0 0 20px rgba(74,124,47,0.2); }

        /* Card */
        .auth-card {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(74,124,47,0.15);
          position: relative;
          overflow: hidden;
        }
        .auth-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(74,124,47,0.5), rgba(139,94,60,0.5), transparent);
          pointer-events: none;
        }

        /* Inputs */
        .auth-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          outline: none;
        }
        .auth-input:focus {
          border-color: rgba(74,124,47,0.5);
          background: rgba(74,124,47,0.05);
          box-shadow: 0 0 0 3px rgba(74,124,47,0.08);
        }

        /* Submit button */
        .auth-submit-btn {
          background: rgba(74,124,47,0.08);
          border: 1px solid rgba(74,124,47,0.3);
          position: relative;
          overflow: hidden;
        }
        .auth-submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(74,124,47,0.15), rgba(139,94,60,0.15));
          opacity: 0;
          transition: opacity 0.3s;
        }
        .auth-submit-btn:not(:disabled):hover::before { opacity: 1; }
        .auth-submit-btn:not(:disabled):hover { border-color: rgba(74,124,47,0.6); box-shadow: 0 0 20px rgba(74,124,47,0.15); }

        /* Blob drift animations */
        @keyframes drift-1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-45px) scale(1.1)} 66%{transform:translate(-30px,65px) scale(.92)} }
        @keyframes drift-2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,40px) scale(1.08)} 66%{transform:translate(40px,-30px) scale(.94)} }
        @keyframes drift-3 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,50px) scale(.96)} 66%{transform:translate(-45px,-25px) scale(1.06)} }
        .animate-drift-1 { animation: drift-1 26s ease-in-out infinite; }
        .animate-drift-2 { animation: drift-2 32s ease-in-out infinite; }
        .animate-drift-3 { animation: drift-3 28s ease-in-out infinite; }

        /* Letter float */
        @keyframes letter-float {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          25%  { transform: translateY(-8px) rotate(1deg); }
          50%  { transform: translateY(-4px) rotate(-1deg); }
          75%  { transform: translateY(-6px) rotate(0.5deg); }
        }
        .animate-letter-float { animation: letter-float ease-in-out infinite; }

        /* Neon pulse */
        @keyframes auth-neon-pulse {
          0%,100% { filter: drop-shadow(0 0 8px rgba(74,124,47,0.7)) drop-shadow(0 0 22px rgba(74,124,47,0.35)); }
          50%     { filter: drop-shadow(0 0 12px rgba(139,94,60,0.7)) drop-shadow(0 0 28px rgba(139,94,60,0.35)); }
        }

        /* Logo shine */
        @keyframes shine {
          0%   { transform: translateX(-100%) translateY(-100%) rotate(30deg); }
          100% { transform: translateX(200%) translateY(200%) rotate(30deg); }
        }
        .animate-shine { animation: shine 3s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .auth-scan, .animate-drift-1, .animate-drift-2, .animate-drift-3,
          .animate-letter-float, .animate-shine { animation: none; }
          span[style*="letter-float"] { animation: none !important; filter: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Login;
