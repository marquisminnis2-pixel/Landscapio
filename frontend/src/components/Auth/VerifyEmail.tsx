import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { API_BASE } from '@/lib/api';

type Status = 'loading' | 'success' | 'error';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setErrorMessage('No verification token found. Please use the link from your email.');
      setStatus('error');
      return;
    }

    fetch(`${API_BASE}/api/auth/verify-email?token=${token}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          localStorage.setItem('token', data.token);
          if (data.defaultOrgId) localStorage.setItem('orgId', data.defaultOrgId);
          if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('orgPlan', 'free');
          setStatus('success');
          setTimeout(() => navigate('/dashboard'), 1800);
        } else {
          setErrorMessage(data.message || 'This verification link is invalid or has expired.');
          setStatus('error');
        }
      })
      .catch(() => {
        setErrorMessage('Network error. Please try again.');
        setStatus('error');
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[#0D1117]">
        <div className="absolute w-[600px] h-[600px] rounded-full blur-[120px] animate-drift-1" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.15) 0%, rgba(52,211,153,0.08) 40%, transparent 70%)', top: '10%', left: '15%' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full blur-[100px] animate-drift-2" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, rgba(74,124,47,0.06) 40%, transparent 70%)', top: '50%', right: '10%' }} />
        <div className="absolute w-[550px] h-[550px] rounded-full blur-[110px] animate-drift-3" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, rgba(79,70,229,0.05) 40%, transparent 70%)', bottom: '15%', left: '20%' }} />
        <div className="absolute w-[450px] h-[450px] rounded-full blur-[90px] animate-drift-4" style={{ background: 'radial-gradient(circle, rgba(249,168,212,0.11) 0%, rgba(74,124,47,0.06) 40%, transparent 70%)', bottom: '25%', right: '25%' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full blur-[95px] animate-drift-5" style={{ background: 'radial-gradient(circle, rgba(255,127,80,0.13) 0%, rgba(255,99,71,0.07) 40%, transparent 70%)', top: '5%', right: '5%' }} />
        <div className="absolute w-[480px] h-[480px] rounded-full blur-[105px] animate-drift-6" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.11) 0%, rgba(245,158,11,0.06) 40%, transparent 70%)', top: '60%', left: '5%' }} />
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="relative w-10 h-10 bg-gradient-to-br from-[#34D399] via-[#10B981] to-[#10B981] rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent transform -translate-x-full animate-shine" />
                <svg className="w-6 h-6 relative z-10" viewBox="0 0 24 24" fill="none">
                  <path d="M8 12C8 12 6 10 4 10C2 10 1 11 1 12C1 13 2 14 4 14C6 14 8 12 8 12Z" fill="white" stroke="#D4AF37" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 12C8 12 7 9 6 7C5 5 4 4 3 4C2 4 1.5 5 2 6C2.5 7 4 8 6 10C7 11 8 12 8 12Z" fill="white" stroke="#D4AF37" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 12C16 12 18 10 20 10C22 10 23 11 23 12C23 13 22 14 20 14C18 14 16 12 16 12Z" fill="white" stroke="#D4AF37" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 12C16 12 17 9 18 7C19 5 20 4 21 4C22 4 22.5 5 22 6C21.5 7 20 8 18 10C17 11 16 12 16 12Z" fill="white" stroke="#D4AF37" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="2" fill="white" stroke="#D4AF37" strokeWidth="0.8"/>
                </svg>
              </div>
              <span className="text-2xl font-semibold text-white flex" style={{ fontFamily: "'Space Grotesk', 'Urbanist', 'Syne', -apple-system, sans-serif" }}>
                {'Landscapio'.split('').map((letter, index) => (
                  <span key={index} className="inline-block animate-letter-float hover:scale-110 transition-transform duration-200 cursor-default" style={{ animationDelay: `${index * 0.1}s`, animationDuration: `${3 + index * 0.3}s` }}>
                    {letter}
                  </span>
                ))}
              </span>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white/5 backdrop-blur-sm p-10 rounded-xl border border-white/10 text-center">
            {status === 'loading' && (
              <>
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <svg className="animate-spin w-7 h-7 text-[#10B981]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">Verifying your email</h3>
                <p className="text-white/40 text-sm">Just a moment...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#34D399]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">Email verified!</h3>
                <p className="text-white/40 text-sm">Redirecting you to your dashboard...</p>
                <div className="mt-4">
                  <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#34D399] to-[#10B981] animate-progress" />
                  </div>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <h3 className="text-white text-xl font-semibold mb-3">Verification failed</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-8">{errorMessage}</p>
                <div className="space-y-3">
                  <Link
                    to="/register"
                    className="block w-full py-3 bg-white/10 hover:bg-white/15 rounded-xl border border-white/10 transition-all duration-200"
                  >
                    <span className="bg-gradient-to-r from-[#34D399] to-[#10B981] bg-clip-text text-transparent font-medium text-sm">
                      Register again
                    </span>
                  </Link>
                  <Link to="/login" className="block text-white/30 text-sm hover:text-white/50 transition-colors duration-200 pt-1">
                    Back to login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drift-1 { 0%,100%{transform:translate(0,0) scale(1);filter:hue-rotate(0deg)} 25%{transform:translate(40px,-30px) scale(1.05);filter:hue-rotate(5deg)} 50%{transform:translate(-20px,40px) scale(0.95);filter:hue-rotate(10deg)} 75%{transform:translate(30px,20px) scale(1.02);filter:hue-rotate(5deg)} }
        @keyframes drift-2 { 0%,100%{transform:translate(0,0) scale(1)} 30%{transform:translate(-35px,45px) scale(1.08)} 60%{transform:translate(25px,-25px) scale(0.92)} 80%{transform:translate(-15px,30px) scale(1.05)} }
        @keyframes drift-3 { 0%,100%{transform:translate(0,0) scale(1)} 20%{transform:translate(30px,35px) scale(0.96)} 55%{transform:translate(-40px,-20px) scale(1.06)} 85%{transform:translate(20px,-35px) scale(1.01)} }
        @keyframes drift-4 { 0%,100%{transform:translate(0,0) scale(1)} 35%{transform:translate(-25px,-40px) scale(1.04)} 65%{transform:translate(35px,30px) scale(0.98)} }
        @keyframes drift-5 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(35px,40px) scale(1.06)} 70%{transform:translate(-30px,-15px) scale(0.94)} }
        @keyframes drift-6 { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(-40px,20px) scale(1.07)} 65%{transform:translate(30px,-35px) scale(0.93)} }
        @keyframes letter-float { 0%,100%{transform:translateY(0px) rotate(0deg)} 25%{transform:translateY(-8px) rotate(1deg)} 50%{transform:translateY(-4px) rotate(-1deg)} 75%{transform:translateY(-6px) rotate(0.5deg)} }
        @keyframes shine { 0%{transform:translateX(-100%) translateY(-100%) rotate(30deg)} 100%{transform:translateX(200%) translateY(200%) rotate(30deg)} }
        @keyframes progress { 0%{width:0%} 100%{width:100%} }
        .animate-drift-1{animation:drift-1 24s ease-in-out infinite}
        .animate-drift-2{animation:drift-2 28s ease-in-out infinite}
        .animate-drift-3{animation:drift-3 20s ease-in-out infinite}
        .animate-drift-4{animation:drift-4 26s ease-in-out infinite}
        .animate-drift-5{animation:drift-5 22s ease-in-out infinite}
        .animate-drift-6{animation:drift-6 30s ease-in-out infinite}
        .animate-letter-float{animation:letter-float ease-in-out infinite}
        .animate-shine{animation:shine 3s ease-in-out infinite}
        .animate-progress{animation:progress 1.8s ease-out forwards}
        @media(prefers-reduced-motion:reduce){.animate-drift-1,.animate-drift-2,.animate-drift-3,.animate-drift-4,.animate-drift-5,.animate-drift-6,.animate-letter-float,.animate-shine,.animate-progress{animation:none}}
      `}</style>
    </div>
  );
};

export default VerifyEmail;
