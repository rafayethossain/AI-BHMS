import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

function FloatingMotifs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Scissors */}
      <svg className="login-motif login-motif-1" width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="36" r="6" opacity="0.15" />
        <circle cx="12" cy="12" r="6" opacity="0.15" />
        <line x1="16" y1="16" x2="42" y2="36" opacity="0.12" />
        <line x1="16" y1="32" x2="42" y2="12" opacity="0.12" />
      </svg>

      {/* Thread Spool */}
      <svg className="login-motif login-motif-2" width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.2">
        <ellipse cx="28" cy="12" rx="14" ry="5" opacity="0.1" />
        <ellipse cx="28" cy="44" rx="14" ry="5" opacity="0.1" />
        <line x1="14" y1="12" x2="14" y2="44" opacity="0.08" />
        <line x1="42" y1="12" x2="42" y2="44" opacity="0.08" />
        <ellipse cx="28" cy="20" rx="14" ry="4" opacity="0.06" />
        <ellipse cx="28" cy="28" rx="14" ry="4" opacity="0.06" />
        <ellipse cx="28" cy="36" rx="14" ry="4" opacity="0.06" />
      </svg>

      {/* Measurement Tape */}
      <svg className="login-motif login-motif-3" width="200" height="30" viewBox="0 0 200 30" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M0 15 Q50 5, 100 15 T200 15" opacity="0.08" strokeWidth="2" />
        <line x1="20" y1="10" x2="20" y2="20" opacity="0.06" />
        <line x1="40" y1="10" x2="40" y2="20" opacity="0.06" />
        <line x1="60" y1="10" x2="60" y2="20" opacity="0.06" />
        <line x1="80" y1="10" x2="80" y2="20" opacity="0.06" />
        <line x1="100" y1="10" x2="100" y2="20" opacity="0.06" />
        <line x1="120" y1="10" x2="120" y2="20" opacity="0.06" />
        <line x1="140" y1="10" x2="140" y2="20" opacity="0.06" />
        <line x1="160" y1="10" x2="160" y2="20" opacity="0.06" />
        <line x1="180" y1="10" x2="180" y2="20" opacity="0.06" />
      </svg>

      {/* Needle */}
      <svg className="login-motif login-motif-4" width="60" height="20" viewBox="0 0 60 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <line x1="0" y1="10" x2="48" y2="10" opacity="0.1" />
        <ellipse cx="52" cy="10" rx="4" ry="6" opacity="0.08" />
        <path d="M48 10 Q54 2, 56 10 Q54 18, 48 10" opacity="0.06" fill="currentColor" />
      </svg>

      {/* Fabric swatch pattern (top-right) */}
      <svg className="login-motif login-motif-5" width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="0.5">
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110].map(i => (
          <g key={i}>
            <line x1={i} y1="0" x2={i} y2="120" opacity="0.04" />
            <line x1="0" y1={i} x2="120" y2={i} opacity="0.04" />
          </g>
        ))}
      </svg>

      {/* Buttons / Buttonholes */}
      <svg className="login-motif login-motif-6" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="8" opacity="0.1" />
        <circle cx="12" cy="12" r="3" opacity="0.15" />
      </svg>
      <svg className="login-motif login-motif-7" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="8" opacity="0.08" />
        <circle cx="12" cy="12" r="3" opacity="0.12" />
      </svg>

      {/* Garment outline (very subtle) */}
      <svg className="login-motif login-motif-8" width="160" height="180" viewBox="0 0 160 180" fill="none" stroke="currentColor" strokeWidth="0.8">
        <path d="M50 0 L40 0 L20 30 L30 40 L45 25 L45 170 L115 170 L115 25 L130 40 L140 30 L120 0 L110 0 L95 15 L65 15 Z" opacity="0.04" />
        <line x1="65" y1="15" x2="65" y2="170" opacity="0.03" strokeDasharray="4 4" />
        <line x1="95" y1="15" x2="95" y2="170" opacity="0.03" strokeDasharray="4 4" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      // error handled by context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex login-root">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 overflow-hidden">
        <FloatingMotifs />

        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Top: Logo */}
          <div className={`flex items-center gap-3 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <svg className="w-5 h-5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <span className="text-white/90 font-semibold text-lg tracking-tight">BHMS</span>
          </div>

          {/* Center: Tagline */}
          <div className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-white text-3xl xl:text-4xl font-bold leading-tight max-w-md">
              The complete operating system for{' '}
              <span className="text-emerald-300">garment buying houses</span>
            </h2>
            <p className="mt-4 text-emerald-100/60 text-base max-w-md leading-relaxed">
              From style development to shipment tracking — manage orders,
              production, quality, and logistics in one unified platform.
            </p>

          </div>

          {/* Bottom: Features */}
          <div className={`flex gap-6 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {['Multi-tenant', 'Real-time Tracking', 'Role-based Access'].map(f => (
              <div key={f} className="flex items-center gap-2 text-emerald-200/50 text-xs">
                <svg className="w-3.5 h-3.5 text-emerald-400/60" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-page">
        <div className={`w-full max-w-[400px] transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <span className="text-heading font-semibold text-lg">BHMS</span>
          </div>

          {/* Welcome text */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-heading">Welcome back</h1>
            <p className="text-muted text-sm mt-1">Sign in to your account</p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-6 p-3.5 rounded-xl bg-red-500/8 border border-red-500/20 text-red-500 text-sm flex items-center gap-2.5 cursor-pointer animate-fade-in"
              onClick={clearError}
            >
              <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="login-field-group">
              <label htmlFor="email" className="login-label">Email address</label>
              <div className="login-input-wrapper">
                <svg className="login-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  className="login-input"
                  placeholder="admin@demo.com"
                />
              </div>
            </div>

            <div className="login-field-group">
              <label htmlFor="password" className="login-label">Password</label>
              <div className="login-input-wrapper">
                <svg className="login-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="login-input pr-11"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-input-action"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-button"
            >
              {loading ? (
                <span className="flex items-center gap-2.5">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-8 p-4 rounded-xl bg-surface-alt border border-border-subtle">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-body">Demo Access</p>
                <p className="text-xs text-muted mt-0.5">
                  Use <span className="font-mono text-emerald-600 dark:text-emerald-400">admin@demo.com</span> with password{' '}
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">admin123!@#</span>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-faint text-xs">
            Bangladesh RMG Industry ERP &middot; v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
