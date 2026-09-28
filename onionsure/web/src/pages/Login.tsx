import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  ShieldCheck, UserCog, Sprout, Tractor, Store, LogIn,
  ArrowRight, Eye, EyeOff, CheckCircle2, Sparkles,
  Leaf, Brain, Truck, ShoppingCart, MapPin, Package, Phone, Home, User,
} from 'lucide-react';
import { useAuth, ROLE_HOME } from '../lib/auth';
import type { Role } from '../lib/types';

const ROLES: { role: Role; label: string; icon: any; hint: string }[] = [
  { role: 'procurement_officer', label: 'Procurement Officer', icon: UserCog, hint: 'Run inspections & grading' },
  { role: 'farmer',              label: 'Farmer',             icon: Tractor, hint: 'Track your lot quality' },
];

const DEMO: Record<Role, string> = {
  procurement_officer: 'officer1', fpo: 'fpo1', farmer: 'farmer1', buyer: 'buyer1', admin: 'admin',
};

/* ---------------- onionsure feature data ---------------- */
const FEATURES = [
  {
    icon: ShoppingCart,
    title: 'Direct Marketplace',
    desc: 'Connect directly & get better prices',
  },
  {
    icon: Brain,
    title: 'AI-Powered Intelligence',
    desc: 'Smarter insights for better decisions',
  },
  {
    icon: Truck,
    title: 'Smart Logistics',
    desc: 'Real-time tracking & optimized deliveries',
  },
  {
    icon: ShieldCheck,
    title: 'Trust & Transparency',
    desc: 'Quality verified, secure payments & blockchain traceability',
  },
] as const;

const STATS = [
  { value: 10000, suffix: '+', label: 'Farmers & FPOs',     icon: Tractor },
  { value: 2000,  suffix: '+', label: 'Buyers',             icon: ShoppingCart },
  { value: 50000, suffix: '+', label: 'Transactions',       icon: Package },
  { value: 25,    suffix: '+', label: 'States Connected',   icon: MapPin },
] as const;

/* ---------------- Animated counter (no deps) ---------------- */
function CountUp({ value, duration = 1600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return <span ref={ref}>{display.toLocaleString('en-IN')}</span>;
}

/* ---------------- onionsure leaf logo ---------------- */
function FarmLeaf({ size = 26, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="fl-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3FAE5A" />
          <stop offset="100%" stopColor="#0B5D3B" />
        </linearGradient>
      </defs>
      <path
        d="M26 4C14 6 6 14 5 26c0 0 0 1 1 1 12-1 20-9 22-21 0 0 0-2-2-2z"
        fill="url(#fl-leaf)"
      />
      <path
        d="M7 27c4-7 10-12 16-16"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
    </svg>
  );
}

/* ============================================================
   onionsure Login
   - Left 52%: premium promotional panel (new)
   - Right 48%: existing authentication (unchanged behavior)
   ============================================================ */
export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<Role>('procurement_officer');
  const [username, setUsername] = useState('officer1');
  const [password, setPassword] = useState('password123');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Signup form fields
  const [suFullName, setSuFullName] = useState('');
  const [suMobile, setSuMobile] = useState('');
  const [suVillage, setSuVillage] = useState('');
  const [suFpo, setSuFpo] = useState('');
  const [suUsername, setSuUsername] = useState('');
  const [suPassword, setSuPassword] = useState('');

  const pickRole = (r: Role) => {
    setRole(r);
    setUsername(DEMO[r]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const loggedInUser = await login(username, password);
      navigate(ROLE_HOME[loggedInUser.role] || ROLE_HOME[role] || '/');
    } catch (e: any) {
      setErr(e.message || 'Login failed');
    } finally { setBusy(false); }
  };

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!suFullName.trim()) { setErr('Full Name is required'); return; }
    if (!suMobile.trim()) { setErr('Mobile Number is required'); return; }
    if (!suVillage.trim()) { setErr('Village is required'); return; }
    if (!suUsername.trim()) { setErr('Username is required'); return; }
    if (suPassword.length < 6) { setErr('Password must be at least 6 characters'); return; }
    setBusy(true);
    try {
      const user = await register({
        fullName: suFullName,
        mobile: suMobile,
        village: suVillage,
        fpoName: suFpo || undefined,
        username: suUsername,
        password: suPassword,
      });
      navigate(ROLE_HOME[user.role] || '/farmer/dashboard');
    } catch (e: any) {
      setErr(e.message || 'Registration failed');
    } finally { setBusy(false); }
  };

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m);
    setErr('');
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* ============== LEFT — onionsure Premium Panel ============== */}
      <div className="relative hidden lg:flex w-[52%] flex-col overflow-hidden bg-emerald-950 text-white">
        {/* Background photo — smooth panning high-res smart agriculture image */}
        <motion.img
          src="/login-hero.jpg"
          alt="Smart Agriculture Onion Fields with IoT Nodes"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
          initial={{ scale: 1.05 }}
          animate={{ scale: [1.05, 1.12, 1.05], x: [0, -12, 0], y: [0, -8, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Multi-layered gradient dark overlays for high contrast and readability */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/90 via-emerald-950/70 to-emerald-900/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(63,174,90,0.3),transparent_65%)]" />

        {/* Soft glowing moving lights */}
        <motion.div
          aria-hidden
          className="absolute -top-32 -left-20 h-[520px] w-[520px] rounded-full bg-fresh/25 blur-3xl"
          animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-sb-400/25 blur-3xl"
          animate={{ x: [0, -60, 0], y: [0, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Subtle dot field */}
        <svg className="absolute top-6 right-8 opacity-40" width="120" height="60" viewBox="0 0 120 60" aria-hidden>
          {Array.from({ length: 5 }).map((_, r) =>
            Array.from({ length: 20 }).map((_, c) => (
              <circle key={`${r}-${c}`} cx={c * 6 + 3} cy={r * 12 + 6} r="1" fill="#3FAE5A" opacity={0.4} />
            )),
          )}
        </svg>

        {/* Soft curving boundary on the right side */}
        <svg
          className="absolute top-0 right-0 h-full w-24 pointer-events-none text-[#F7F7F5] fill-current"
          viewBox="0 0 100 800"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0,0 C60,200 40,400 60,600 C40,720 30,800 30,800 L100,800 L100,0 Z"
          />
        </svg>

        {/* Content stack */}
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14 pr-24">
          {/* Logo (fade in from top) */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-soft">
              <FarmLeaf size={26} />
            </div>
            <div className="leading-none">
              <div className="text-xl font-extrabold tracking-tight text-white">
                Onion<span className="text-fresh">Sure</span>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
                Quality Intelligence Platform
              </div>
            </div>
          </motion.div>

          {/* Hero text + features + ecosystem */}
          <div className="relative">
            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="text-[40px] xl:text-[44px] font-extrabold leading-[1.08] tracking-tight text-white"
            >
              Smart Agriculture.<br />
              Stronger Connections.<br />
              <span className="bg-gradient-to-r from-fresh via-sb-400 to-emerald-200 bg-clip-text text-transparent">
                Better Tomorrow.
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 max-w-[440px] text-[14px] xl:text-[15px] leading-relaxed text-emerald-100/80"
            >
              OnionSure is an AI-powered digital quality platform that connects Farmers, FPOs and Buyers in a transparent, trusted and efficient agri-ecosystem.
            </motion.p>

            {/* Ecosystem graphic (right of features on wide) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-0 hidden xl:block"
              style={{ width: 320, height: 320 }}
            >
              <EcosystemGraphic />
            </motion.div>

            {/* Feature cards (sequential) */}
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[560px]">
              {FEATURES.map((f, i) => (
                <FeatureCard key={f.title} feature={f} index={i} />
              ))}
            </div>
          </div>

          {/* Statistics bar */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl p-4 xl:p-5"
          >
            <div className="grid grid-cols-4 gap-3 xl:gap-4">
              {STATS.map((s, i) => (
                <React.Fragment key={s.label}>
                  <StatItem stat={s} />
                  {i < STATS.length - 1 && (
                    <div className="hidden sm:block w-px bg-white/20 self-stretch" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ============== RIGHT — Login panel (unchanged behavior) ============== */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-10 lg:bg-gradient-to-br lg:from-white lg:via-sb-50/30 lg:to-white">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white border border-border shadow-soft">
              <FarmLeaf size={24} />
            </div>
            <div className="leading-none">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted">OnionSure</div>
              <div className="text-lg font-extrabold text-ink">Quality Intelligence Platform</div>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-[28px] font-extrabold tracking-tight text-ink">
            {mode === 'login' ? 'Welcome to OnionSure' : 'Create Farmer Account'}
          </h2>
          <p className="mt-1.5 text-[14px] text-muted">
            {mode === 'login'
              ? 'Choose your role to access your dashboard.'
              : 'Register as a farmer to track your lot quality and access digital certificates.'}
          </p>

          {mode === 'login' && (
          <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {ROLES.map((r) => {
              const active = role === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => pickRole(r.role)}
                  title={r.hint}
                  className={`group flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all duration-300 ${
                    active
                      ? 'border-forest bg-sb-50 text-forest shadow-[0_0_0_3px_rgba(63,174,90,0.12),0_8px_24px_-8px_rgba(11,93,59,0.25)]'
                      : 'border-border bg-white text-muted hover:border-sb-300 hover:bg-sb-50/50'
                  }`}
                >
                  <r.icon size={18} className={active ? 'text-forest' : ''} />
                  <span className="text-[10px] font-semibold">{r.label}</span>
                </button>
              );
            })}
          </div>
          </>
          )}

          {/* Form */}
          {mode === 'login' ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-[13px] font-semibold text-ink">Username</label>
              <div className="relative mt-1.5">
                <input
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-ink">Password</label>
                <button type="button" className="text-[12px] font-semibold text-muted hover:text-forest transition">Forgot?</button>
              </div>
              <div className="relative mt-1.5">
                <input
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 pr-11 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-border text-forest focus:ring-sb-200"
                defaultChecked
              />
              <label htmlFor="remember" className="text-[12px] text-muted">Remember me</label>
            </div>

            {err && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-reject/20 bg-reject/5 px-4 py-2.5 text-[13px] font-medium text-reject"
              >
                {err}
              </motion.div>
            )}

            <button
              className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-[#0B5D3B] via-[#0e6b44] to-[#3FAE5A] px-4 py-3.5 text-[14px] font-bold text-white transition-all duration-300 hover:-translate-y-[1px] disabled:opacity-60 disabled:hover:translate-y-0"
              style={{ boxShadow: '0 8px 28px -6px rgba(11,93,59,0.55), inset 0 1px 0 rgba(255,255,255,0.15)' }}
              disabled={busy}
            >
              {/* Shimmer sweep on hover */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[150%]" />
              {busy ? (
                <>
                  <Spinner />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
          ) : (
          <form onSubmit={submitSignup} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[13px] font-semibold text-ink">Full Name *</label>
                <div className="relative mt-1.5">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    className="w-full rounded-xl border border-border bg-white pl-10 pr-3 py-3 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                    value={suFullName}
                    onChange={(e) => setSuFullName(e.target.value)}
                    placeholder="Ramesh Patil"
                  />
                </div>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-ink">Mobile *</label>
                <div className="relative mt-1.5">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    className="w-full rounded-xl border border-border bg-white pl-10 pr-3 py-3 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                    value={suMobile}
                    onChange={(e) => setSuMobile(e.target.value)}
                    placeholder="9876543210"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[13px] font-semibold text-ink">Village *</label>
                <div className="relative mt-1.5">
                  <Home size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    className="w-full rounded-xl border border-border bg-white pl-10 pr-3 py-3 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                    value={suVillage}
                    onChange={(e) => setSuVillage(e.target.value)}
                    placeholder="Nashik"
                  />
                </div>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-muted">FPO (optional)</label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-3 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                  value={suFpo}
                  onChange={(e) => setSuFpo(e.target.value)}
                  placeholder="Ramesh Farmer Producer Organization"
                />
              </div>
            </div>

            <div>
              <label className="text-[13px] font-semibold text-ink">Username *</label>
              <input
                className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-3 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                value={suUsername}
                onChange={(e) => setSuUsername(e.target.value)}
                placeholder="ramesh_patil"
              />
            </div>

            <div>
              <label className="text-[13px] font-semibold text-ink">Password *</label>
              <div className="relative mt-1.5">
                <input
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 pr-11 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                  type={showPw ? 'text' : 'password'}
                  value={suPassword}
                  onChange={(e) => setSuPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {err && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-reject/20 bg-reject/5 px-4 py-2.5 text-[13px] font-medium text-reject"
              >
                {err}
              </motion.div>
            )}

            <button
              className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl px-4 py-3.5 text-[14px] font-bold text-white transition-all duration-300 hover:-translate-y-[1px] disabled:opacity-60 disabled:hover:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, #0B5D3B 0%, #0e6b44 40%, #3FAE5A 100%)',
                boxShadow: '0 8px 28px -6px rgba(11,93,59,0.55), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
              disabled={busy}
            >
              {/* Shimmer sweep */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[150%]" />
              {busy ? (
                <>
                  <Spinner />
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <Sprout size={17} className="shrink-0" />
                  <span>Create Farmer Account</span>
                </>
              )}
            </button>
          </form>
          )}

          {mode === 'login' && (
            <div className="mt-5 rounded-xl border border-sb-200/60 bg-sb-50/60 backdrop-blur-sm px-4 py-3">
              <div className="text-[12px] font-semibold text-forest">Demo Credentials</div>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-ink">
                <code className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] border border-border">{username}</code>
                <span className="text-muted">/</span>
                <code className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] border border-border">password123</code>
              </div>
            </div>
          )}

          {/* Footer link */}
          <div className="mt-6 text-center text-[13px] text-muted">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button onClick={() => switchMode('signup')} className="font-semibold text-forest hover:text-sb-700 transition">Create Farmer Account</button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => switchMode('login')} className="font-semibold text-forest hover:text-sb-700 transition">Sign In</button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ---------------- Sub-components ---------------- */

function FeatureCard({ feature, index }: { feature: typeof FEATURES[number]; index: number }) {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.45 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, scale: 1.02 }}
      className="group relative flex items-start gap-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md p-3 shadow-lg transition-all duration-300 hover:bg-white/20 hover:border-fresh/50 hover:shadow-[0_0_20px_rgba(63,174,90,0.25)]"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fresh/20 border border-fresh/30 text-fresh transition-transform duration-300 group-hover:scale-110">
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-white">{feature.title}</div>
        <div className="mt-0.5 text-[11.5px] text-emerald-100/75 leading-snug">{feature.desc}</div>
      </div>
    </motion.div>
  );
}

function StatItem({ stat }: { stat: typeof STATS[number] }) {
  const Icon = stat.icon;
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fresh text-emerald-950 shadow-[0_4px_14px_-4px_rgba(63,174,90,0.6)] font-bold">
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <div className="text-[20px] xl:text-[22px] font-extrabold leading-none text-white">
          <CountUp value={stat.value} />
          <span className="text-fresh">{stat.suffix}</span>
        </div>
        <div className="mt-1 text-[10.5px] font-medium uppercase tracking-wide text-emerald-200/70">
          {stat.label}
        </div>
      </div>
    </div>
  );
}

/* Animated ecosystem graphic — central onionsure icon, satellite nodes, connecting lines */
function EcosystemGraphic() {
  // Central pulse rings
  return (
    <div className="relative h-full w-full">
      {/* Outer ring */}
      <motion.svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 200 200"
        aria-hidden
      >
        {/* concentric dashed circles */}
        {[90, 70, 50].map((r, i) => (
          <motion.circle
            key={r}
            cx="100" cy="100" r={r}
            fill="none"
            stroke="#3FAE5A"
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity={0.35 - i * 0.07}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.35 - i * 0.07 }}
            transition={{ duration: 1.4, delay: 0.7 + i * 0.15 }}
          />
        ))}
        {/* connecting lines */}
        {[
          { x1: 100, y1: 100, x2: 30,  y2: 40  },
          { x1: 100, y1: 100, x2: 170, y2: 40  },
          { x1: 100, y1: 100, x2: 25,  y2: 130 },
          { x1: 100, y1: 100, x2: 175, y2: 130 },
          { x1: 100, y1: 100, x2: 100, y2: 175 },
        ].map((l, i) => (
          <motion.line
            key={i}
            {...l}
            stroke="#3FAE5A"
            strokeWidth="1.2"
            strokeDasharray="3 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            transition={{ duration: 1.2, delay: 1.1 + i * 0.12 }}
          />
        ))}
      </motion.svg>

      {/* Central node (pulsing) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="absolute inset-0 rounded-full bg-sb-400/40"
          animate={{ scale: [1, 1.7, 1.7], opacity: [0.45, 0, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          style={{ width: 56, height: 56, left: -28, top: -28 }}
        />
        <div className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-forest to-sb-600 text-white shadow-[0_10px_24px_-8px_rgba(11,93,59,0.55)]">
          <FarmLeaf size={26} className="text-white [&_path]:fill-white [&_path]:stroke-none" />
        </div>
      </div>

      {/* Satellite nodes */}
      <Node x="15%"  y="20%"  delay={1.3} icon={<ShoppingCart size={16} />} />
      <Node x="85%"  y="20%"  delay={1.45} icon={<Truck size={16} />} />
      <Node x="12%"  y="65%"  delay={1.6} icon={<Sprout size={16} />} />
      <Node x="88%"  y="65%"  delay={1.75} icon={<ShieldCheck size={16} />} />
      <Node x="50%"  y="88%"  delay={1.9} icon={<Store size={16} />} />
    </div>
  );
}

function Node({ x, y, delay, icon }: { x: string; y: string; delay: number; icon: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="absolute grid h-9 w-9 place-items-center rounded-full bg-white border border-sb-200 text-forest shadow-[0_6px_18px_-8px_rgba(11,93,59,0.35)]"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
    >
      {icon}
    </motion.div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}