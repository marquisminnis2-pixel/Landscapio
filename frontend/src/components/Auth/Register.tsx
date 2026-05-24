import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (response.ok || response.status === 201) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('orgId', data.defaultOrgId);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        setError(data.message || 'Registration failed. Please try again.');
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
          radial-gradient(ellipse at top left,    rgba(74,124,47,.13)   0%, transparent 50%),
          radial-gradient(ellipse at top right,   rgba(139,94,60,.13) 0%, transparent 50%),
          radial-gradient(ellipse at bottom,      rgba(139,94,60,.11) 0%, transparent 50%),
          linear-gradient(135deg, #0d1a0d 0%, #050810 100%)
        `
      }} />

      {/* Cyberpunk grid */}
      <div className="absolute inset-0 auth-grid" />

      {/* Scan line */}
      <div className="absolute left-0 right-0 h-[2px] auth-scan pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(74,124,47,0.4), rgba(139,94,60,0.4), transparent)', top: 0 }} />

      {/* Blobs */}
      <div className="absolute w-[600px] h-[600px] rounded-full blur-[120px] animate-drift-1"
        style={{ background: 'radial-gradient(circle, rgba(74,124,47,0.15) 0%, rgba(74,124,47,0.06) 40%, transparent 70%)', top: '5%', left: '10%', willChange: 'transform' }} />
      <div className="absolute w-[500px] h-[500px] rounded-full blur-[100px] animate-drift-2"
        style={{ background: 'radial-gradient(circle, rgba(139,94,60,0.14) 0%, rgba(139,94,60,0.06) 40%, transparent 70%)', top: '40%', right: '8%', willChange: 'transform' }} />
      <div className="absolute w-[550px] h-[550px] rounded-full blur-[110px] animate-drift-3"
        style={{ background: 'radial-gradient(circle, rgba(139,94,60,0.12) 0%, rgba(139,94,60,0.05) 40%, transparent 70%)', bottom: '10%', left: '25%', willChange: 'transform' }} />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="relative w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden"
                style={{ background: 'linear-gradient(135deg,#4a7c2f,#8b5e3c,#8b5e3c)' }}>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent transform -translate-x-full animate-shine" />
                <svg className="w-6 h-6 relative z-10" viewBox="0 0 24 24" fill="none">
                  <path d="M8 12C8 12 6 10 4 10C2 10 1 11 1 12C1 13 2 14 4 14C6 14 8 12 8 12Z" fill="white" stroke="#D4AF37" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 12C8 12 7 9 6 7C5 5 4 4 3 4C2 4 1.5 5 2 6C2.5 7 4 8 6 10C7 11 8 12 8 12Z" fill="white" stroke="#D4AF37" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 12C16 12 18 10 20 10C22 10 23 11 23 12C23 13 22 14 20 14C18 14 16 12 16 12Z" fill="white" stroke="#D4AF37" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 12C16 12 17 9 18 7C19 5 20 4 21 4C22 4 22.5 5 22 6C21.5 7 20 8 18 10C17 11 16 12 16 12Z" fill="white" stroke="#D4AF37" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="2" fill="white" stroke="#D4AF37" strokeWidth="0.8"/>
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

          {/* Card */}
          <div className="auth-card p-10 rounded-xl">
            <>
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-white/50 text-sm font-medium mb-2">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="auth-input w-full px-4 py-3 rounded-lg text-white placeholder-white/30 transition-all duration-200"
                      placeholder="Your name"
                      required
                    />
                  </div>
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
                      placeholder="Min. 6 characters"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white/50 text-sm font-medium mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="auth-input w-full px-4 py-3 rounded-lg text-white placeholder-white/30 transition-all duration-200"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="auth-submit-btn w-full py-3.5 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98] mt-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2" style={{ background: 'linear-gradient(90deg,#4a7c2f,#8b5e3c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        <svg className="animate-spin w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" style={{ color: '#4a7c2f' }}>
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating account...
                      </span>
                    ) : (
                      <span style={{ background: 'linear-gradient(90deg,#4a7c2f,#8b5e3c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Create Account
                      </span>
                    )}
                  </button>
                </form>
                <div className="mt-8 text-center">
                  <p className="text-white/40 text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-white hover:text-[#4a7c2f] font-medium transition-colors duration-200">
                      Log in
                    </Link>
                  </p>
                </div>
            </>
          </div>
        </div>
      </div>

      <style>{`
        .auth-grid {
          background-image:
            linear-gradient(rgba(74,124,47,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74,124,47,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        @keyframes auth-scan {
          0%   { transform: translateY(-2px); opacity: 0; }
          5%   { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .auth-scan { animation: auth-scan 12s linear infinite; will-change: transform; }
        .auth-neon-title {
          background: linear-gradient(90deg, #4a7c2f, #8b5e3c, #8b5e3c);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 20px rgba(74,124,47,0.3));
        }
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
        @keyframes drift-1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-45px) scale(1.1)} 66%{transform:translate(-30px,65px) scale(.92)} }
        @keyframes drift-2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,40px) scale(1.08)} 66%{transform:translate(40px,-30px) scale(.94)} }
        @keyframes drift-3 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,50px) scale(.96)} 66%{transform:translate(-45px,-25px) scale(1.06)} }
        .animate-drift-1 { animation: drift-1 26s ease-in-out infinite; }
        .animate-drift-2 { animation: drift-2 32s ease-in-out infinite; }
        .animate-drift-3 { animation: drift-3 28s ease-in-out infinite; }
        @keyframes letter-float {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          25%  { transform: translateY(-8px) rotate(1deg); }
          50%  { transform: translateY(-4px) rotate(-1deg); }
          75%  { transform: translateY(-6px) rotate(0.5deg); }
        }
        .animate-letter-float { animation: letter-float ease-in-out infinite; }
        @keyframes shine {
          0%   { transform: translateX(-100%) translateY(-100%) rotate(30deg); }
          100% { transform: translateX(200%) translateY(200%) rotate(30deg); }
        }
        .animate-shine { animation: shine 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .auth-scan, .animate-drift-1, .animate-drift-2, .animate-drift-3,
          .animate-letter-float, .animate-shine { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default Register;
