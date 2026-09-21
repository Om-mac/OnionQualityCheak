import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

export function Card({ className, children, hover = false, ...p }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className={clsx('card p-5', className)} {...(p as any)}
      >
        {children}
      </motion.div>
    );
  }
  return <div className={clsx('card p-5', className)} {...p}>{children}</div>;
}

/** Styled button primitive used across dashboard pages. */
export function Button({
  onClick,
  type = 'button',
  disabled,
  className,
  children,
  ...p
}: React.HTMLAttributes<HTMLButtonElement> & { type?: 'button' | 'submit' | 'reset'; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold', className)}
      {...p}
    >
      {children}
    </button>
  );
}

export function SectionTitle({
  eyebrow, title, subtitle, className, center,
}: {
  eyebrow?: string; title: string; subtitle?: string; className?: string; center?: boolean;
}) {
  return (
    <div className={clsx(className, center && 'text-center')}>
      {eyebrow && (
        <div className="flex items-center gap-2 mb-1">
          {center && <div className="h-px flex-1 bg-gradient-to-r from-transparent to-fresh/30 max-w-[60px] ml-auto" />}
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-fresh">{eyebrow}</div>
          {center && <div className="h-px flex-1 bg-gradient-to-l from-transparent to-fresh/30 max-w-[60px] mr-auto" />}
        </div>
      )}
      <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-emerald-950 tracking-tight">{title}</h2>
      {subtitle && (
        <p className={clsx('mt-2 max-w-2xl text-sm text-emerald-700/80 leading-relaxed', center && 'mx-auto')}>{subtitle}</p>
      )}
    </div>
  );
}

export function StatCard({
  label, value, sub, accent = 'forest', icon: Icon, trend,
}: {
  label: string; value: React.ReactNode; sub?: string; accent?: string; icon?: any; trend?: number;
}) {
  const accents: any = {
    forest: { grad: 'from-forest to-darkgreen', ring: 'bg-forest/10 text-forest' },
    fresh:  { grad: 'from-fresh to-forest',     ring: 'bg-fresh/15 text-forest' },
    amber:  { grad: 'from-amber to-orange-500', ring: 'bg-amber/15 text-amber-700' },
    reject: { grad: 'from-reject to-rose-600',  ring: 'bg-reject/10 text-reject' },
  };
  const a = accents[accent] || accents.forest;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="card p-5 relative overflow-hidden"
    >
      <div className={clsx('absolute -right-5 -top-5 h-24 w-24 rounded-full bg-gradient-to-br opacity-[0.09]', a.grad)} />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
        {Icon && <span className={clsx('rounded-xl p-2', a.ring)}><Icon size={15} /></span>}
      </div>
      <div className="mt-3 text-[30px] font-extrabold text-ink leading-none tracking-tight">{value}</div>
      <div className="mt-1.5 flex items-center justify-between">
        {sub && <div className="text-[12px] text-muted font-medium">{sub}</div>}
        {trend !== undefined && (
          <span className={clsx('text-[11px] font-bold', trend >= 0 ? 'text-forest' : 'text-reject')}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function Badge({
  children, tone = 'forest', className,
}: {
  children: React.ReactNode; tone?: 'forest' | 'fresh' | 'amber' | 'reject' | 'gray' | 'purple' | 'blue'; className?: string;
}) {
  const tones: any = {
    forest: 'bg-forest/10 text-forest border border-forest/15',
    fresh:  'bg-fresh/15 text-forest border border-fresh/20',
    amber:  'bg-amber/15 text-amber-700 border border-amber/20',
    reject: 'bg-reject/10 text-reject border border-reject/15',
    gray:   'bg-[rgba(20,20,25,0.07)] text-muted border border-[rgba(20,20,25,0.10)]',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/60',
    blue:   'bg-blue-50 text-blue-700 border border-blue-200/60',
  };
  return (
    <span className={clsx('chip text-[11px]', tones[tone], className)}>{children}</span>
  );
}

export function ProgressBar({
  value, tone = 'forest', className, showLabel = false,
}: {
  value: number; tone?: 'forest' | 'amber' | 'reject' | 'fresh'; className?: string; showLabel?: boolean;
}) {
  const colors: any = { forest: 'bg-forest', fresh: 'bg-fresh', amber: 'bg-amber', reject: 'bg-reject' };
  const trackColors: any = { forest: 'bg-forest/10', fresh: 'bg-fresh/10', amber: 'bg-amber/10', reject: 'bg-reject/10' };
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx('relative', className)}>
      <div className={clsx('h-2.5 w-full overflow-hidden rounded-full', trackColors[tone] || 'bg-emerald-100')}>
        <motion.div
          className={clsx('h-full rounded-full', colors[tone])}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {showLabel && (
        <span className="absolute right-0 top-3.5 text-[10px] font-bold text-muted">{Math.round(clamped)}%</span>
      )}
    </div>
  );
}

export function GradeBadge({ grade }: { grade: string }) {
  if (grade === 'GRADE A') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-3 py-1 text-[11px] font-bold text-forest border border-forest/15">
      <span className="h-1.5 w-1.5 rounded-full bg-forest" />
      GRADE A
    </span>
  );
  if (grade === 'URS') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-3 py-1 text-[11px] font-bold text-amber-700 border border-amber/20">
      <span className="h-1.5 w-1.5 rounded-full bg-amber" />
      URS
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-reject/10 px-3 py-1 text-[11px] font-bold text-reject border border-reject/15">
      <span className="h-1.5 w-1.5 rounded-full bg-reject" />
      REJECTED
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-muted font-medium">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-forest flex-shrink-0" />
      {label && <span>{label}</span>}
    </div>
  );
}

export function EmptyState({
  title, hint, icon: Icon, action,
}: {
  title: string; hint?: string; icon?: any; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[rgba(20,20,25,0.10)] bg-[rgba(20,20,25,0.02)] p-12 text-center">
      {Icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-50 to-mint text-forest">
          <Icon size={26} />
        </div>
      )}
      <div className="text-[15px] font-bold text-ink">{title}</div>
      {hint && <div className="mt-1.5 max-w-sm text-[13px] text-muted leading-relaxed">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  title, subtitle, action,
}: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-[16px] font-extrabold text-ink leading-tight">{title}</h2>
        {subtitle && <p className="text-[12px] text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[rgba(20,20,25,0.06)] last:border-0">
      <span className="text-[12px] text-muted font-medium">{label}</span>
      <span className="text-[13px] font-semibold text-ink text-right">{value}</span>
    </div>
  );
}

export function RiskBadge({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' | string }) {
  const map: any = {
    LOW:    'bg-forest/10 text-forest border-forest/15',
    MEDIUM: 'bg-amber/15 text-amber-700 border-amber/20',
    HIGH:   'bg-reject/10 text-reject border-reject/15',
  };
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border', map[level] || map.LOW)}>
      {level || 'LOW'}
    </span>
  );
}
