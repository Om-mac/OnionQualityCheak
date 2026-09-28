import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Radio, WifiOff, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { realtime, useRealtimeStatus, useRealtimeEvent, useLastDataUpdated, type RealtimeFrame } from '../lib/realtime';
import { useToast } from './Toast';
import { gradeLabel } from '../lib/grades';

/** Turn a raw DB event into something a human would want to see. */
function describe(frame: RealtimeFrame): { title: string; body?: string; tone: any } | null {
  const p = frame.payload || {};
  const col = p.collection as string;
  const op = p.op as string;

  if (col === 'quality_certificates' && op === 'insert') {
    return { title: 'Certificate issued', body: p.certificateNumber || undefined, tone: 'success' };
  }
  if (col === 'quality_certificates' && op === 'update') {
    return { title: 'Certificate updated', body: p.certificateNumber || undefined, tone: 'info' };
  }
  if (col === 'lots' && op === 'insert') {
    return { title: 'New lot registered', body: p.lotNumber || p.variety || undefined, tone: 'live' };
  }
  if (col === 'inspection_sessions' && op === 'insert') {
    return { title: 'Inspection started', body: p.lotNumber || undefined, tone: 'live' };
  }
  if (col === 'inspection_sessions' && op === 'update') {
    return { title: 'Inspection updated', body: p.status ? `Status: ${p.status}` : undefined, tone: 'info' };
  }
  if (col === 'fusion_results' && op === 'insert') {
    return { title: 'Quality result ready', body: p.grade ? `${gradeLabel(p.grade)} · ${p.finalScore ?? ''}/100` : undefined, tone: 'success' };
  }
  if (col === 'config' && op === 'update') {
    return { title: 'Settings updated', body: 'Fusion weights or thresholds changed', tone: 'warn' };
  }
  if (col === 'sensor_readings') return null; // too noisy to toast
  return null;
}

/**
 * Mounted once inside the dashboard shell: opens the socket, toasts meaningful
 * changes, and renders the connection pill.
 */
export function LiveActivity() {
  const toast = useToast();
  const lastToast = useRef<{ key: string; at: number }>({ key: '', at: 0 });

  useEffect(() => { realtime.connect(); }, []);

  useRealtimeEvent('db:changed', (frame) => {
    const d = describe(frame);
    if (!d) return;
    // De-duplicate identical messages arriving in a burst.
    const key = `${d.title}|${d.body || ''}`;
    const now = Date.now();
    if (lastToast.current.key === key && now - lastToast.current.at < 3000) return;
    lastToast.current = { key, at: now };
    toast.push(d);
  }, 400);

  return null;
}

/** Small pill showing whether live sync is connected and how fresh the data is. */
export function LiveIndicator() {
  const status = useRealtimeStatus();
  const { at: lastUpdated, refreshing } = useLastDataUpdated();
  const [ago, setAgo] = React.useState('');

  useEffect(() => {
    if (!lastUpdated) return;
    const tick = () => {
      const s = Math.round((Date.now() - lastUpdated) / 1000);
      setAgo(s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`);
    };
    tick();
    const iv = setInterval(tick, 5000);
    return () => clearInterval(iv);
  }, [lastUpdated]);

  const live = status === 'live';
  const connecting = status === 'connecting';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
        live ? 'bg-forest/10 text-forest' : connecting ? 'bg-amber/15 text-amber-700' : 'bg-reject/10 text-reject',
      )}
      title={live ? 'Live sync connected' : connecting ? 'Connecting…' : 'Offline — polling instead'}
    >
      {live ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fresh opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-fresh" />
        </span>
      ) : connecting ? (
        <RefreshCw size={12} className="animate-spin" />
      ) : (
        <WifiOff size={12} />
      )}
      {live ? 'Live' : connecting ? 'Connecting' : 'Offline'}
      {lastUpdated && !refreshing && <span className="font-normal opacity-70">· {ago}</span>}
      {refreshing && <Radio size={11} className="animate-pulse" />}
    </span>
  );
}
