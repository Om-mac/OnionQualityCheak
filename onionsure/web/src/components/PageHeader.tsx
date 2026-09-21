import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface PageHeaderProps {
  icon: React.ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  gradient?: string;
  badge?: React.ReactNode;
}

export function PageHeader({
  icon,
  eyebrow,
  title,
  subtitle,
  actions,
  gradient = 'from-forest via-[#0e6b44] to-darkgreen',
  badge,
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={clsx(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white',
        gradient,
      )}
      style={{ boxShadow: '0 8px 32px rgba(11,93,59,0.28), 0 2px 8px rgba(11,93,59,0.12)' }}
    >
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/[0.06]" />
      <div className="pointer-events-none absolute right-24 bottom-0 h-36 w-36 rounded-full bg-white/[0.04]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-full w-1/2 bg-gradient-to-l from-black/[0.08] to-transparent" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.15)]"
            style={{ height: 52, width: 52 }}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              {eyebrow && (
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">{eyebrow}</p>
              )}
              {badge && badge}
            </div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-0.5 text-sm text-white/70 font-medium max-w-lg">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </motion.div>
  );
}

interface StatGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5;
}

export function StatGrid({ children, cols = 4 }: StatGridProps) {
  const gridClass = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-5',
  }[cols];
  return <div className={clsx('grid gap-4', gridClass)}>{children}</div>;
}

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ComponentType<any>;
  accent?: 'green' | 'blue' | 'amber' | 'red' | 'purple';
  suffix?: string;
  trend?: { value: number; label?: string };
}

const ACCENT_MAP = {
  green:  { ring: 'bg-forest/10 text-forest',      grad: 'from-forest to-[#0e6b44]',        glow: 'rgba(11,93,59,0.12)'  },
  blue:   { ring: 'bg-sb-100 text-sb-700',          grad: 'from-sb-500 to-sb-700',           glow: 'rgba(63,130,246,0.10)' },
  amber:  { ring: 'bg-amber/15 text-amber-700',     grad: 'from-amber-400 to-amber-600',     glow: 'rgba(244,185,66,0.12)' },
  red:    { ring: 'bg-rose-50 text-reject',         grad: 'from-rose-400 to-reject',         glow: 'rgba(217,83,79,0.10)'  },
  purple: { ring: 'bg-purple-50 text-purple-700',   grad: 'from-purple-400 to-purple-600',   glow: 'rgba(139,92,246,0.10)' },
};

export function StatTile({ label, value, sub, icon: Icon, accent = 'green', suffix, trend }: StatTileProps) {
  const a = ACCENT_MAP[accent];
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="relative overflow-hidden rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5"
      style={{ boxShadow: `0 1px 3px rgba(20,20,25,0.04), 0 8px 24px rgba(20,20,25,0.05), 0 0 0 1px rgba(20,20,25,0.03)` }}
    >
      {/* Subtle gradient blob */}
      <div className={clsx('pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-gradient-to-br opacity-[0.08]', a.grad)} />

      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
        <span className={clsx('grid h-9 w-9 place-items-center rounded-xl', a.ring)}>
          <Icon size={15} />
        </span>
      </div>

      <div className="mt-3 flex items-end gap-1.5">
        <span className="text-[30px] font-extrabold leading-none text-ink tracking-tight">{value}</span>
        {suffix && <span className="mb-0.5 text-[14px] font-semibold text-muted">{suffix}</span>}
      </div>

      {sub && (
        <p className="mt-1.5 text-[12px] text-muted font-medium">{sub}</p>
      )}

      {trend && (
        <div className={clsx(
          'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
          trend.value >= 0 ? 'bg-forest/10 text-forest' : 'bg-reject/10 text-reject',
        )}>
          <span>{trend.value >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value)}%{trend.label ? ` ${trend.label}` : ''}</span>
        </div>
      )}
    </motion.div>
  );
}
