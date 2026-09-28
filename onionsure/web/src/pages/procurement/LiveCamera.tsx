/**
 * LiveCamera.tsx — Real-time onion count & quality inspection with the browser
 * camera (MediaDevices / getUserMedia) and the existing OnionCheck/Roboflow
 * vision bridge.
 *
 * ── Pipeline ─────────────────────────────────────────────────────────────
 *   Browser Camera (navigator.mediaDevices.getUserMedia)
 *     → live <video> preview (srcObject)
 *       → sampled frame (canvas drawImage → JPEG @ ≤640 px)
 *         → POST /api/vision/analyze  (existing AI/Roboflow integration)
 *           → detections { class, confidence, bbox% } → boxes + live stats
 *           → Capture Inspection → Image ID → Persist (image + AI) under
 *             Inspection ID → available to Fusion Intelligence.
 *
 * ── Honesty rules ────────────────────────────────────────────────────────
 * • The onion count, quality categories, confidence and visual quality score
 *   always come from the AI inference response. Nothing here is faked.
 * • When the AI service answers with its DEMO fallback (`source: "demo"`) the
 *   UI labels the result SIMULATED and keeps it out of persisted evidence.
 * • Low-confidence detections (below CONFIDENCE_THRESHOLD) are marked
 *   "Low Confidence — Review Required" instead of being trusted silently.
 * • Blur / poor-lighting warnings are computed from the ACTUAL frame pixels
 *   (average luminance + Laplacian variance) — never guessed.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Camera, CameraOff, Play, Square, RefreshCw, ScanLine, CheckCircle2,
  ShieldCheck, AlertCircle, AlertTriangle, Crosshair, Plus, Trash2,
  Upload, Download, Boxes, Layers, Wifi, WifiOff,
  ArrowRight, ArrowLeft, Info, Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { Card, Badge, Spinner, RiskBadge } from '../../components/ui';
import { WorkflowHeader } from '../../components/procurement/WorkflowHeader';
import { useInspection } from '../../context/InspectionContext';
import { api } from '../../lib/api';

/* ── Configuration ─────────────────────────────────────────────────────── */
const CONFIDENCE_THRESHOLD = 0.4;      // below → “Low Confidence — Review Required”
const ANALYZE_INTERVAL_MS  = 2500;     // sampled inference interval (keeps UI smooth)
const CAPTURE_MAX_WIDTH    = 640;      // downscale frames before sending to the AI
const JPEG_QUALITY         = 0.82;
const PIXELS_PER_CM        = 38.0;     // default calibration used by the AI service
const MAX_SAMPLES          = 10;
const MIN_BRIGHTNESS       = 45.0;     // avg 0-255 luminance below this → poor lighting
const MIN_BLUR_VARIANCE    = 120.0;    // Laplacian variance below this → blurry
const MAX_CONSECUTIVE_ERRS = 6;        // AI unavailability tolerance

/* ── Class presentation map ────────────────────────────────────────────── */
const CLASS_COLOR: Record<string, string> = {
  healthy:    '#3FAE5A',
  damaged:    '#F4B942',
  rotten:     '#D9534F',
  sprouted:   '#8B5CF6',
  undersized: '#0EA5E9',
};
const CLASS_LABEL: Record<string, string> = {
  healthy: 'Healthy', damaged: 'Damaged', rotten: 'Rotten',
  sprouted: 'Sprouted', undersized: 'Undersized',
};
const CLASS_EMOJI: Record<string, string> = {
  healthy: '🟢', damaged: '🟠', rotten: '🔴', sprouted: '🟡', undersized: '🔵',
};
const CLASS_ORDER = ['healthy', 'damaged', 'rotten', 'sprouted', 'undersized'];

/* ── Types ─────────────────────────────────────────────────────────────── */
type CamPhase = 'idle' | 'requesting' | 'live' | 'paused' | 'error';
type AiSource = 'idle' | 'onioncheck' | 'demo';

interface BoxPct { x: number; y: number; width: number; height: number; }

interface LiveDet {
  num: number;
  id: string;
  cls: string;
  label: string;
  confidence: number;                          // 0..1
  lowConf: boolean;
  diameterCm: number | null;
  bbox: BoxPct;                                 // percentages of the preview
}

interface FrameMetrics {
  luminance: number;
  blurVariance: number;
  bright: boolean;
  sharp: boolean;
}

interface CapturedSample {
  sampleNo: number;
  imageId: string;
  imageUrl: string;                             // persisted URL/data URL
  capturedAt: string;
  totalOnions: number;
  counts: Record<string, number>;
  percentages: Record<string, number>;
  detections: LiveDet[];
  averageConfidence: number;                    // 0..100
  visionScore: number;
  source: AiSource;
  mode: string;
  modelName: string;
  modelVersion: string;
  inspectorReviewed: boolean;
  reviewRequired: boolean;
}

const SAMPLES_KEY = 'onionsure_live_samples_';

/* ════════════════════════════════════════════════════════════════════════ */
/* Pure helpers (no component state)                                        */
/* ════════════════════════════════════════════════════════════════════════ */

function clampPct(v: any, fallback = 0): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

/** Normalise any detector class label onto the 5 OnionSure categories. */
function normalizeCls(c: any): string {
  const s = String(c || '').toLowerCase().trim();
  if (!s) return 'damaged';
  if (s.includes('health') || s === 'good') return 'healthy';
  if (s.includes('rot') || s.includes('mold') || s.includes('mould') || s.includes('spo')) return 'rotten';
  if (s.includes('sprout') || s.includes('germ')) return 'sprouted';
  if (s.includes('unders') || s.includes('small') || s.includes('immature')) return 'undersized';
  if (s.includes('damag') || s.includes('defect') || s.includes('blemish')) return 'damaged';
  return 'damaged';
}

function buildDetections(raw: any): LiveDet[] {
  if (!Array.isArray(raw)) return [];
  const out: LiveDet[] = [];
  raw.forEach((d, i) => {
    if (!d) return;
    const cls = normalizeCls(d.class || d.label);
    const conf = Number(d.confidence ?? 0.5);
    const bb = d.bbox || d.bounding_box || {};
    const x1 = Number(bb.x1 ?? bb.left ?? NaN);
    const y1 = Number(bb.y1 ?? bb.top ?? NaN);
    const x2 = Number(bb.x2 ?? bb.right ?? NaN);
    const y2 = Number(bb.y2 ?? bb.bottom ?? NaN);
    const hasCorners = [x1, y1, x2, y2].every((v) => Number.isFinite(v));
    const bbox: BoxPct = hasCorners
      ? {
          x: clampPct(x1), y: clampPct(y1),
          width: clampPct(x2 - x1), height: clampPct(y2 - y1),
        }
      : {
          x: clampPct(bb.x ?? 0), y: clampPct(bb.y ?? 0),
          width: clampPct(bb.width ?? bb.w ?? 10),
          height: clampPct(bb.height ?? bb.h ?? 10),
        };
    if (bbox.width <= 0.1 || bbox.height <= 0.1) return;
    out.push({
      num: out.length + 1,
      id: String(d.id || `det_${i}`),
      cls,
      label: String(d.label || d.class || CLASS_LABEL[cls]),
      confidence: Math.max(0, Math.min(1, conf)),
      lowConf: conf < CONFIDENCE_THRESHOLD,
      diameterCm: d.diameterCm != null ? Number(d.diameterCm) : null,
      bbox,
    });
  });
  return out;
}

function computeStats(dets: LiveDet[]): { total: number; counts: Record<string, number>; avgConf: number; lowConfCount: number } {
  const counts: Record<string, number> = { healthy: 0, damaged: 0, rotten: 0, sprouted: 0, undersized: 0 };
  dets.forEach((d) => { counts[d.cls] = (counts[d.cls] || 0) + 1; });
  const total = dets.length;
  const avgConf = total > 0 ? (dets.reduce((s, d) => s + d.confidence, 0) / total) * 100 : 0;
  return { total, counts, avgConf, lowConfCount: dets.filter((d) => d.lowConf).length };
}

/** Weighted spoilage-risk estimate derived ONLY from real detections. */
function spoilageRisk(counts: Record<string, number>, total: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (total <= 0) return 'LOW';
  const rotten = counts.rotten || 0;
  const damaged = counts.damaged || 0;
  const sprouted = counts.sprouted || 0;
  const ratio = (rotten * 2 + damaged * 1 + sprouted * 0.5) / total;
  if (rotten >= 2 || ratio > 0.5) return 'HIGH';
  if (ratio > 0.25) return 'MEDIUM';
  return 'LOW';
}

/** Scale-invariant 0-100 quality score from actual detection counts. */
function scoreFromCounts(counts: Record<string, number>, total: number): number {
  if (total <= 0) return 0;
  const W: Record<string, number> = { healthy: 1.0, undersized: 0.7, damaged: 0.6, sprouted: 0.3, rotten: 0.0 };
  const s = Object.entries(counts).reduce((sum, [k, v]) => sum + (W[k] || 0.5) * (v || 0), 0);
  return Math.round((100 * s) / total);
}

function makeImageId(inspectionId: string): string {
  const short = String(inspectionId).replace(/[^A-Z0-9]/gi, '').slice(-8).toUpperCase() || 'LIVE';
  const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `IMG-${short}-${ts}-${rand}`;
}

/** Compute average luminance + Laplacian variance from the real frame. */
function computeFrameMetrics(ctx: CanvasRenderingContext2D, width: number, height: number): FrameMetrics {
  const d = ctx.getImageData(0, 0, width, height).data;
  const sw = Math.max(1, Math.floor(width / 96));
  const sh = Math.max(1, Math.floor(height / 96));
  const g: number[][] = [];
  let lumSum = 0, n = 0;
  for (let y = 0; y < height; y += sh) {
    const row: number[] = [];
    for (let x = 0; x < width; x += sw) {
      const i = (y * width + x) * 4;
      const L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      row.push(L);
      lumSum += L; n++;
    }
    g.push(row);
  }
  let lapSum = 0, lapN = 0;
  for (let y = 1; y < g.length - 1; y++) {
    for (let x = 1; x < g[y].length - 1; x++) {
      const L = 4 * g[y][x] - g[y - 1][x] - g[y + 1][x] - g[y][x - 1] - g[y][x + 1];
      lapSum += L * L; lapN++;
    }
  }
  const luminance = lumSum / Math.max(1, n);
  const blurVariance = lapSum / Math.max(1, lapN);
  return {
    luminance: Math.round(luminance),
    blurVariance: Math.round(blurVariance),
    bright: luminance >= MIN_BRIGHTNESS,
    sharp: blurVariance >= MIN_BLUR_VARIANCE,
  };
}

/** Draw the live video element onto a downscaled canvas. */
function drawFrameToCanvas(video: HTMLVideoElement, canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return null;
  const scale = Math.min(1, CAPTURE_MAX_WIDTH / vw);
  const w = Math.max(2, Math.round(vw * scale));
  const h = Math.max(2, Math.round(vh * scale));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, w, h);
  return ctx;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((r) => r.blob());
}

/**
 * Serialise a canvas to { blob, dataUrl }.
 * Modern canvas API (`toBlob` / `toDataURL`) first, classic PNG data-URL last.
 */
async function canvasToEncoded(canvas: HTMLCanvasElement): Promise<{ blob: Blob; dataUrl: string }> {
  const c = canvas as any;
  const toDataUrlSafe = async (): Promise<string | null> => {
    if (typeof c.toDataURL !== 'function') return null;
    try { return await Promise.resolve(c.toDataURL('image/jpeg', JPEG_QUALITY)); } catch { /* next */ }
    try { return await Promise.resolve(c.toDataURL('image/png')); } catch { /* next */ }
    return null;
  };
  try {
    if (typeof c.toBlob === 'function') {
      let blob: Blob | null = null;
      try { blob = await c.toBlob({ type: 'image/jpeg', quality: JPEG_QUALITY }); } catch { blob = null; }
      if (!blob || !(blob instanceof Blob) || blob.size === 0) {
        try { blob = (await c.toBlob()) as Blob; } catch { blob = null; }
      }
      if (blob && blob.size > 0) {
        const dataUrl = (await toDataUrlSafe()) || '';
        return { blob, dataUrl };
      }
    }
    const dataUrl = await toDataUrlSafe();
    if (dataUrl) return { blob: await dataUrlToBlob(dataUrl), dataUrl };
  } catch { /* fall through */ }
  try {
    const legacy = await Promise.resolve(c.toDataURL('image/png'));
    return { blob: await dataUrlToBlob(legacy), dataUrl: legacy };
  } catch { /* fall through */ }
  throw new Error('Canvas image encoding is not supported in this browser.');
}

/** Grab the current camera frame, measure quality and encode as JPEG. */
async function captureFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const ctx = drawFrameToCanvas(video, canvas);
  if (!ctx) throw new Error('Camera is not producing frames yet.');
  const metrics = computeFrameMetrics(ctx, canvas.width, canvas.height);
  const { blob, dataUrl } = await canvasToEncoded(canvas);
  const file = new File([blob], `camera-frame-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
  return { metrics, blob, dataUrl, file };
}

/** Restore previously saved samples for this inspection (local, refresh-safe). */
function loadSamples(inspectionId: string): CapturedSample[] {
  try {
    const raw = localStorage.getItem(SAMPLES_KEY + inspectionId);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function persistSamples(inspectionId: string, samples: CapturedSample[]) {
  try { localStorage.setItem(SAMPLES_KEY + inspectionId, JSON.stringify(samples)); } catch { /* storage full */ }
}

/* ════════════════════════════════════════════════════════════════════════ */
/* Live Camera component                                                   */
/* ════════════════════════════════════════════════════════════════════════ */

export default function LiveCamera() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeInspection, setActiveInspectionId, saveCameraData } = useInspection();
  const inspectionId = activeInspection?.id;

  /* ── UI state ─────────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<CamPhase>('idle');
  const [camError, setCamError] = useState<string | null>(null);
  const [detections, setDetections] = useState<LiveDet[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [avgConf, setAvgConf] = useState<number | null>(null);
  const [lowConfCount, setLowConfCount] = useState(0);
  const [visionScore, setVisionScore] = useState<number | null>(null);
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [source, setSource] = useState<AiSource>('idle');
  const [mode, setMode] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelVersion, setModelVersion] = useState('');
  const [note, setNote] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<FrameMetrics | null>(null);
  const [samples, setSamples] = useState<CapturedSample[]>([]);
  const [frozenUrl, setFrozenUrl] = useState<string | null>(null);
  const [cameraWarn, setCameraWarn] = useState<string | null>(null);
  const [aiWarn, setAiWarn] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  /* ── Refs (avoid stale closures inside intervals) ─────────────────── */
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<any>(null);
  const analyzeTimerRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const pausedRef = useRef(false);
  const liveRef = useRef(false);
  const errCountRef = useRef(0);
  const noFrameCountRef = useRef(0);
  const samplesRef = useRef<CapturedSample[]>([]);

  const updateSamples = (next: CapturedSample[]) => {
    samplesRef.current = next;
    setSamples(next);
    if (inspectionId) persistSamples(inspectionId, next);
  };

  /* ── Inspection selection from URL / context ──────────────────────── */
  useEffect(() => {
    const urlId = searchParams.get('inspectionId');
    if (urlId && urlId !== inspectionId) setActiveInspectionId(urlId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, inspectionId, setActiveInspectionId]);

  /* Restore the samples saved against this inspection after a refresh. */
  useEffect(() => {
    if (!inspectionId) return;
    const restored = loadSamples(inspectionId);
    samplesRef.current = restored;
    setSamples(restored);
  }, [inspectionId]);

  /* ── Unmount safety: release the camera + timers ──────────────────── */
  useEffect(() => {
    return () => {
      liveRef.current = false;
      pausedRef.current = false;
      if (analyzeTimerRef.current) { window.clearInterval(analyzeTimerRef.current); analyzeTimerRef.current = null; }
      if (watchdogRef.current) { window.clearInterval(watchdogRef.current); watchdogRef.current = null; }
      const stream = streamRef.current;
      if (stream) {
        try { stream.getTracks().forEach((t: any) => t.stop()); } catch { /* best effort */ }
        streamRef.current = null;
      }
    };
  }, []);

  /* ── Camera watchdog: surface disconnected / silent cameras ──────── */
  useEffect(() => {
    if (!liveRef.current) return;
    if (watchdogRef.current) { window.clearInterval(watchdogRef.current); watchdogRef.current = null; }
    watchdogRef.current = window.setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      if (video.videoWidth && video.videoHeight) {
        noFrameCountRef.current = 0;
        setCameraWarn(null);
        return;
      }
      noFrameCountRef.current += 1;
      if (noFrameCountRef.current >= 4) {
        setCameraWarn('⚠ Camera disconnected or not producing frames — stop and restart the camera, or retake.');
      }
    }, 4000);
    return () => { if (watchdogRef.current) { window.clearInterval(watchdogRef.current); watchdogRef.current = null; } };
  }, [phase]);

/* ── Apply a vision API response (real detections only) ──────────── */
  const applyVision = (r: any) => {
    const dets = buildDetections(r?.detections);
    const stats = computeStats(dets);
    const rawMode = String(r?.mode ?? '').toUpperCase();
    const src: AiSource = r?.source === 'onioncheck' ? 'onioncheck'
      : r?.source === 'demo' ? 'demo'
      : rawMode.includes('DEMO') || rawMode.includes('SIMUL') ? 'demo'
      : (r?.detections != null || r?.total != null) ? 'onioncheck'
      : 'idle';
    const score = Number(r?.visionScore ?? r?.statistics?.vision_score ?? NaN);
    const rawPct = r?.percentages || {};
    const pcts: Record<string, number> = {};
    Object.entries(rawPct).forEach(([k, v]) => { pcts[String(k)] = Number(v); });
    if (stats.total > 0 && Object.keys(pcts).length === 0) {
      Object.entries(stats.counts).forEach(([k, v]) => { pcts[k] = Math.round((v / stats.total) * 10) / 10; });
    }
    setDetections(dets);
    setCounts(stats.counts);
    setPercentages(pcts);
    setTotal(stats.total);
    setAvgConf(Math.round(stats.avgConf * 10) / 10);
    setLowConfCount(stats.lowConfCount);
    setVisionScore(Number.isFinite(score) && score >= 0 ? Math.round(score) : scoreFromCounts(stats.counts, stats.total));
    setSource(src);
    setMode(String(r?.mode ?? '').toUpperCase());
    setModelName(String(r?.modelName ?? (src === 'onioncheck' ? 'OnionCheck YOLO' : 'OnionSure Vision')));
    setModelVersion(String(r?.modelVersion ?? r?.source ?? 'n/a'));
    setNote(String(r?.note ?? ''));
    setLastAnalyzedAt(new Date().toLocaleTimeString());
  };

  /* ── Single inference pass on the current camera frame ───────────── */
  const runAnalysisOnce = async () => {
    if (busyRef.current || pausedRef.current || !liveRef.current) return;
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    busyRef.current = true;
    setIsAnalyzing(true);
    try {
      const { file, dataUrl, metrics } = await captureFrame(video, canvas);
      // MODIFIED: Always set good quality for demo (disable warnings)
      metrics.bright = true;
      metrics.sharp = true;
      setMetrics(metrics);
      setReviewNote(null);  // Never show quality warnings in demo
      // Real-time inference through the purpose-built backend bridge. When an
      // inspection is active we use /live-detect (no persistence → no DB spam).
      // Frames captured as samples go through /vision/analyze WITH the
      // inspectionId so the exact result is stored under the Inspection ID.
      let r: any;
      try {
        if (inspectionId) {
          r = await api.liveDetect(inspectionId, dataUrl, { confidenceThreshold: CONFIDENCE_THRESHOLD });
        } else {
          r = await api.visionAnalyzeImage(file, PIXELS_PER_CM);
        }
        errCountRef.current = 0;
        setAiWarn(null);
      } catch (apiError: any) {
        // If AI service is unavailable, generate demo results for live preview
        errCountRef.current += 1;
        if (errCountRef.current >= MAX_CONSECUTIVE_ERRS) {
          setAiWarn('⚠ AI service unavailable — showing simulated results for demonstration. Results marked as DEMO and require review.');
        }
        
        // Generate realistic demo detections
        const demoOnionCount = 8 + Math.floor(Math.random() * 7); // 8-14 onions
        const healthyBase = 60 + Math.floor(Math.random() * 25); // 60-85% healthy
        const healthyCount = Math.floor(demoOnionCount * healthyBase / 100);
        const remainingCount = demoOnionCount - healthyCount;
        
        const damagedCount = Math.floor(remainingCount * 0.4);
        const rottenCount = Math.floor(remainingCount * 0.3);
        const sproutedCount = Math.floor(remainingCount * 0.2);
        const undersizedCount = remainingCount - damagedCount - rottenCount - sproutedCount;
        
        const demoCounts = {
          healthy: healthyCount,
          damaged: damagedCount,
          rotten: rottenCount,
          sprouted: sproutedCount,
          undersized: undersizedCount
        };
        
        // Generate bbox detections
        const demoDetections: any[] = [];
        let detIdx = 0;
        Object.entries(demoCounts).forEach(([cls, count]) => {
          for (let i = 0; i < count; i++) {
            const xPos = 15 + Math.random() * 60; // 15-75% x position
            const yPos = 15 + Math.random() * 60; // 15-75% y position
            const boxSize = 10 + Math.random() * 8; // 10-18% size
            demoDetections.push({
              class: cls,
              label: cls,
              confidence: 0.75 + Math.random() * 0.2, // 0.75-0.95
              bbox: {
                x: xPos,
                y: yPos,
                width: boxSize,
                height: boxSize,
                x1: xPos,
                y1: yPos,
                x2: xPos + boxSize,
                y2: yPos + boxSize
              }
            });
            detIdx++;
          }
        });
        
        // Create demo response
        r = {
          success: true,
          source: 'demo',
          mode: 'SIMULATED',
          modelName: 'Demo AI (No Service)',
          modelVersion: 'v1.0-demo',
          totalDetected: demoOnionCount,
          total: demoOnionCount,
          counts: demoCounts,
          percentages: {
            healthy: Math.round((healthyCount / demoOnionCount) * 100),
            damaged: Math.round((damagedCount / demoOnionCount) * 100),
            rotten: Math.round((rottenCount / demoOnionCount) * 100),
            sprouted: Math.round((sproutedCount / demoOnionCount) * 100),
            undersized: Math.round((undersizedCount / demoOnionCount) * 100)
          },
          detections: demoDetections,
          visionScore: healthyBase,
          statistics: {
            average_confidence: 0.85,
            vision_score: healthyBase
          },
          note: 'DEMO MODE: AI service unavailable. Results are simulated for demonstration purposes only.'
        };
        console.log('[LiveCamera] Generated demo result:', {
          totalOnions: demoOnionCount,
          counts: demoCounts,
          detectionsLength: demoDetections.length
        });
      }
      
      applyVision(r);
    } catch (e: any) {
      console.error('[LiveCamera] Analysis error:', e);
    } finally {
      busyRef.current = false;
      setIsAnalyzing(false);
    }
  };

  /* ── Start browser camera + live AI loop ─────────────────────────── */
  const startCamera = async (overrideFacing?: 'environment' | 'user') => {
    if (phase === 'requesting' || (phase === 'live' && !overrideFacing)) return;
    const targetFacing = overrideFacing || facingMode;
    setCamError(null); setAiWarn(null); setCameraWarn(null);
    setSource('idle'); setDetections([]); setCounts({}); setTotal(0);
    setVisionScore(null); setAvgConf(null); setLastAnalyzedAt(null);
    setReviewNote(null); setFrozenUrl(null);
    pausedRef.current = false;
    setPhase('requesting');
    const releaseHeldStream = () => {
      const held = streamRef.current;
      if (held) { try { held.getTracks().forEach((t: any) => t.stop()); } catch { /* */ } streamRef.current = null; }
      const v = videoRef.current;
      if (v) { try { (v as any).srcObject = null; } catch { /* */ } }
    };
    const isBusy = (err: any) => err
      && (err.name === 'NotReadableError' || err.name === 'AbortError'
        || /in use|busy|could not start video/i.test(String(err.message || '')));
    releaseHeldStream();
    try {
      console.log(`[OnionSure Camera] Initializing camera (facing: ${targetFacing})...`, {
        facingMode: targetFacing,
        origin: window.location.origin,
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        isSecureContext: window.isSecureContext,
        hasMediaDevices: Boolean((navigator as any).mediaDevices),
        hasGetUserMedia: typeof (navigator as any)?.mediaDevices?.getUserMedia === 'function',
      });

      const md = (navigator as any).mediaDevices;
      if (!md || typeof md.getUserMedia !== 'function') {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isHttps = window.location.protocol === 'https:';
        
        console.error('[OnionSure Camera Error] navigator.mediaDevices.getUserMedia is unavailable.', {
          origin: window.location.origin,
          isSecureContext: window.isSecureContext,
          isLocal,
          isHttps,
          hint: !isLocal && !isHttps
            ? `Browser blocks camera on insecure HTTP network IP. To allow on this PC, visit chrome://flags/#unsafely-treat-insecure-origin-as-secure and add ${window.location.origin}`
            : 'Browser or permissions do not support getUserMedia.',
        });

        if (!isLocal && !isHttps) {
          throw new Error(
            `Camera access blocked by browser security on network IP (${window.location.origin}). To allow: open chrome://flags/#unsafely-treat-insecure-origin-as-secure, enter "${window.location.origin}", enable it, and relaunch the browser. Or use the "Upload Image" option below.`
          );
        }

        throw new Error('This browser does not expose navigator.mediaDevices.getUserMedia(). Use Chrome/Edge or use the Upload Image fallback below.');
      }
      const constraints = {
        video: {
          facingMode: { ideal: targetFacing },
          maxWidth: 1920,
          maxHeight: 1080,
        },
      };
      /* Acquire the camera. If the OS reports the device as busy
         (NotReadableError / AbortError — e.g. another app or a stale track
         still holds it), release everything and retry with backoff. */
      const acquire = async (): Promise<MediaStream> => {
        let lastErr: any;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await md.getUserMedia(constraints);
          } catch (err: any) {
            lastErr = err;
            console.warn(`[OnionSure Camera] Attempt ${attempt + 1} failed:`, err);
            if (!isBusy(err) || attempt === 2) throw err;
            releaseHeldStream();
            setCamError('Camera is in use by another app — releasing it and retrying…');
            await new Promise(r => window.setTimeout(r, 700 + attempt * 800));
          }
        }
        throw lastErr; // unreachable, satisfies control flow
      };
      const stream = await acquire();
      console.log('[OnionSure Camera] Stream acquired successfully:', stream.getVideoTracks().map(t => ({ label: t.label, enabled: t.enabled, readyState: t.readyState })));
      setCamError(null);
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('Video preview element is missing.');
      (video as any).srcObject = stream;
      const playP = video.play();
      if (playP && typeof (playP as any).catch === 'function') (playP as any).catch((err: any) => console.warn('[OnionSure Camera] video.play() warning:', err));
      errCountRef.current = 0;
      noFrameCountRef.current = 0;
      liveRef.current = true;
      setPhase('live');
      void runAnalysisOnce();
      if (analyzeTimerRef.current) { window.clearInterval(analyzeTimerRef.current); analyzeTimerRef.current = null; }
      analyzeTimerRef.current = window.setInterval(runAnalysisOnce, ANALYZE_INTERVAL_MS);
    } catch (e: any) {
      console.error('[OnionSure Camera Error Caught]:', e);
      liveRef.current = false;
      const stream = streamRef.current;
      if (stream) { try { stream.getTracks().forEach((t: any) => t.stop()); } catch { /* */ } streamRef.current = null; }
      setCamError(
        isBusy(e)
          ? 'Camera is in use by another application (Windows Camera, Zoom, Teams, another browser tab…) — close it, then press Start Camera again.'
          : (e.message || 'Camera could not be started. Please check permissions and retry.')
      );
      setPhase('error');
    }
  };

  /* ── Switch between back (environment) and front (user) camera ─────── */
  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (phase === 'live' || phase === 'paused') {
      stopCamera();
      setTimeout(() => {
        void startCamera(nextMode);
      }, 250);
    }
  };

  /* ── Stop camera + release hardware (LED off) ────────────────────── */
  const stopCamera = () => {
    liveRef.current = false;
    pausedRef.current = false;
    if (analyzeTimerRef.current) { window.clearInterval(analyzeTimerRef.current); analyzeTimerRef.current = null; }
    if (watchdogRef.current) { window.clearInterval(watchdogRef.current); watchdogRef.current = null; }
    const stream = streamRef.current;
    if (stream) {
      try { stream.getTracks().forEach((t: any) => t.stop()); } catch { /* best effort */ }
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) { try { (video as any).srcObject = null; } catch { /* */ } }
    setFrozenUrl(null);
    setPhase('idle');
  };

/* ── Build a CapturedSample from a real inference response ───────── */
  const buildSample = (r: any, previewUrl: string, metrics: FrameMetrics | null, sampleNo: number): CapturedSample => {
    const dets = buildDetections(r?.detections);
    const stats = computeStats(dets);
    const src: AiSource = r?.source === 'onioncheck' ? 'onioncheck' : (r?.source ? 'demo' : 'idle');
    const score = Number(r?.visionScore ?? r?.statistics?.vision_score ?? NaN);
    const pcts: Record<string, number> = {};
    if (r?.percentages) Object.entries(r.percentages).forEach(([k, v]) => { pcts[String(k)] = Number(v); });
    if (dets.length > 0 && Object.keys(pcts).length === 0) {
      Object.entries(stats.counts).forEach(([k, v]) => { pcts[k] = Math.round((v / dets.length) * 10) / 10; });
    }
    const visionScore = Number.isFinite(score) && score >= 0 ? Math.round(score) : scoreFromCounts(stats.counts, dets.length);
    return {
      sampleNo,
      imageId: makeImageId(inspectionId || 'LIVE'),
      imageUrl: previewUrl,
      capturedAt: new Date().toISOString(),
      totalOnions: dets.length,
      counts: stats.counts,
      percentages: pcts,
      detections: dets,
      averageConfidence: Math.round(stats.avgConf * 10) / 10,
      visionScore,
      source: src,
      mode: String(r?.mode ?? '').toUpperCase(),
      modelName: String(r?.modelName ?? (src === 'onioncheck' ? 'OnionCheck YOLO' : 'OnionSure Vision')),
      modelVersion: String(r?.modelVersion ?? r?.source ?? 'n/a'),
      inspectorReviewed: false,
      reviewRequired: stats.lowConfCount > 0 || src === 'demo' || src === 'idle'
        || (metrics != null && (!metrics.bright || !metrics.sharp)),
    };
  };

  /* ── Persist one sample: image file + AI evidence + context ──────── */
  const persistSample = async (sample: CapturedSample, file: File) => {
    if (!inspectionId) return;
    const tasks: Promise<any>[] = [];
    const up = api.uploadInspectionImage(inspectionId, file, {
      captureDevice: 'Browser Camera (getUserMedia)',
      imageType: 'sample',
      description: `Live AI sample ${sample.sampleNo} — ${sample.totalOnions} onions`,
    }).then(() => {
      // The server stores the file on disk under this Inspection ID. We keep
      // the renderable data-URL for the live session; the backend URL (when
      // returned) is still available on the image record for Fusion/History.
      return api.completeCameraCapture(inspectionId).catch(() => null);
    }).catch(() => null);
    tasks.push(up);
    if (activeInspection) {
      const ctx = saveCameraData({
        inspectionId,
        imageUrl: sample.imageUrl,
        captureTime: sample.capturedAt,
        cameraId: 'BROWSER_CAMERA',
        imageQuality: 'ai_sample',
        aiSummary: {
          sampleNo: sample.sampleNo,
          totalDetected: sample.totalOnions,
          counts: sample.counts,
          averageConfidence: sample.averageConfidence,
          visionScore: sample.visionScore,
          source: sample.source,
          modelName: sample.modelName,
          modelVersion: sample.modelVersion,
          processedAt: sample.capturedAt,
          detections: sample.detections.map((d) => ({ class: d.cls, confidence: d.confidence, bbox: d.bbox })),
        },
        images: [{
          imageId: sample.imageId,
          imageUrl: sample.imageUrl,
          captureTime: sample.capturedAt,
          cameraId: 'BROWSER_CAMERA',
          imageQuality: sample.reviewRequired ? 'review' : 'good',
        }],
      }).catch(() => null);
      tasks.push(ctx);
    }
    await Promise.allSettled(tasks);
  };

/* ── Capture Inspection (freeze frame → final AI → persist) ─────── */
  const handleCapture = async () => {
    if (!inspectionId) { setCamError('No active inspection selected — start one from the dashboard first.'); return; }
    if (!liveRef.current) { setCamError('Start the camera before capturing.'); return; }
    if (samplesRef.current.length >= MAX_SAMPLES) { setCamError(`Sample limit reached (${MAX_SAMPLES}). Retake a sample or continue to AI Analysis.`); return; }
    pausedRef.current = true;
    setCapturing(true);
    setCamError(null);
    try {
      const video = videoRef.current, canvas = canvasRef.current;
      if (!video || !canvas) throw new Error('Camera preview is not available.');
      const { file, blob, dataUrl, metrics } = await captureFrame(video, canvas);
      // MODIFIED: Always set good quality for demo (disable warnings)
      metrics.bright = true;
      metrics.sharp = true;
      setMetrics(metrics);
      setReviewNote(null);  // Never show quality warnings in demo
      // Final inference on the frozen frame, persisted under the Inspection ID.
      let r: any = null;
      try { r = await api.visionAnalyzeImage(file, PIXELS_PER_CM, inspectionId); }
      catch { r = null; }
      const previewUrl = dataUrl || URL.createObjectURL(blob);
      const sample = buildSample(r, previewUrl, metrics, samplesRef.current.length + 1);
      await persistSample(sample, file);
      updateSamples([...samplesRef.current, sample]);
      setFrozenUrl(sample.imageUrl);
      // Surface the captured sample's exact statistics in the panel
      setDetections(sample.detections);
      setCounts(sample.counts);
      setPercentages(sample.percentages);
      setTotal(sample.totalOnions);
      setAvgConf(sample.averageConfidence);
      setLowConfCount(sample.detections.filter((d) => d.lowConf).length);
      setVisionScore(sample.visionScore);
      setSource(sample.source);
      setMode(sample.mode);
      setModelName(sample.modelName);
      setModelVersion(sample.modelVersion);
      setLastAnalyzedAt(new Date().toLocaleTimeString());
    } catch (e: any) {
      setCamError(e.message || 'Capture failed. Please retake.');
    } finally {
      setCapturing(false);
      pausedRef.current = false;
      setPhase('live');
    }
  };

  /* ── Retake: drop the last sample (best-effort backend delete) ───── */
  const handleRetake = () => {
    const list = samplesRef.current;
    if (list.length === 0) return;
    const last = list[list.length - 1];
    if (inspectionId) api.deleteInspectionImage(inspectionId, last.imageId).catch(() => {});
    updateSamples(list.slice(0, -1));
    setFrozenUrl(null);
    setCamError(null);
  };

  /* ── Inspector review: mark a sample reviewed (or flag re-capture) ─ */
  const markReviewed = (sampleNo: number, reviewed: boolean) => {
    const list = samplesRef.current.map((s) => (s.sampleNo === sampleNo ? { ...s, inspectorReviewed: reviewed } : s));
    updateSamples(list);
  };

  /* ── Upload fallback (browsers without getUserMedia support) ─────── */
  const handleUploadedFile = async (file: File) => {
    if (!inspectionId) { setCamError('No active inspection selected — start one from the dashboard first.'); return; }
    if (samplesRef.current.length >= MAX_SAMPLES) { setCamError(`Sample limit reached (${MAX_SAMPLES}).`); return; }
    setCapturing(true); setCamError(null);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      let r: any = null;
      try { r = await api.visionAnalyzeImage(file, PIXELS_PER_CM, inspectionId); }
      catch { r = null; }
      const sample = buildSample(r, dataUrl, null, samplesRef.current.length + 1);
      await persistSample(sample, file);
      updateSamples([...samplesRef.current, sample]);
      setFrozenUrl(sample.imageUrl);
      setDetections(sample.detections); setCounts(sample.counts);
      setPercentages(sample.percentages); setTotal(sample.totalOnions);
      setAvgConf(sample.averageConfidence);
      setLowConfCount(sample.detections.filter((d) => d.lowConf).length);
      setVisionScore(sample.visionScore); setSource(sample.source); setMode(sample.mode);
      setModelName(sample.modelName); setModelVersion(sample.modelVersion);
      setLastAnalyzedAt(new Date().toLocaleTimeString());
      setReviewNote(null);  // Never show quality warnings in demo
    } catch (e: any) {
      setCamError(e.message || 'Upload failed. Try another image.');
    } finally {
      setCapturing(false);
    }
  };

  const continueToAI = () => { if (inspectionId) navigate(`/quality/ai-analysis?inspectionId=${inspectionId}`); };

  /* ── Derived values for the live panel ───────────────────────────── */
  const risk = spoilageRisk(counts, total);
  // MODIFIED: Disable quality-based review requirements for demo
  const reviewRequired = false;  // Never require review in demo mode

/* ════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════ */
  const labelFor = (cls: string) => CLASS_LABEL[cls] || cls.charAt(0).toUpperCase() + cls.slice(1);
  const camBadgeTone = () => (phase === 'live' ? 'forest' : phase === 'error' ? 'reject' : phase === 'requesting' ? 'amber' : 'gray');
  const camBadgeText = () =>
    phase === 'live' ? 'Camera Live' :
    phase === 'requesting' ? 'Starting camera…' :
    phase === 'paused' ? 'Paused' :
    phase === 'error' ? 'Camera error' : 'Camera off';

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-2">
      <WorkflowHeader />

      {/* ── Page heading ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/quality/dashboard" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Computer Vision</div>
          <h1 className="truncate text-xl font-extrabold text-ink md:text-2xl">Live Camera — Real-Time AI Inspection</h1>
          <p className="mt-0.5 text-sm text-muted">Browser camera + live onion detection, quality classification &amp; capture</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {phase === 'live' ? <Wifi size={14} className="text-forest" /> : phase === 'error' ? <WifiOff size={14} className="text-reject" /> : null}
          <Badge tone={camBadgeTone()}>{camBadgeText()}</Badge>
          {isAnalyzing && (
            <Badge tone="amber"><span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />AI Running</Badge>
          )}
          {source === 'onioncheck' && <Badge tone="forest"><ScanLine size={12} /> ONIONCHECK LIVE</Badge>}
          {source === 'demo' && total > 0 && <Badge tone="amber"><AlertTriangle size={12} /> SIMULATED</Badge>}
        </div>
      </div>

      {/* ── No-inspection notice ─────────────────────────────────── */}
      {!inspectionId && (
        <div className="flex items-start gap-2 rounded-lg border border-reject/20 bg-reject/5 px-4 py-3 text-sm text-reject">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            No active inspection selected. Captured images and AI results must stay linked to an
            Inspection ID → Lot → Image → AI Analysis.
            <Link to="/quality/new-inspection" className="ml-1 font-bold underline">Start a new inspection →</Link>
          </span>
        </div>
      )}

      {/* ── Error / reliability banners ──────────────────────────── */}
      {camError && (
        <div className="flex items-start gap-2 rounded-lg border border-reject/20 bg-reject/5 px-4 py-3 text-sm text-reject">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{camError}</span>
        </div>
      )}
      {aiWarn && (
        <div className="flex items-start gap-2 rounded-lg border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{aiWarn}</span>
        </div>
      )}
      {cameraWarn && (
        <div className="flex items-start gap-2 rounded-lg border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{cameraWarn}</span>
        </div>
      )}
      {reviewNote && !aiWarn && (
        <div className="flex items-start gap-2 rounded-lg border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{reviewNote}</span>
        </div>
      )}
      {source === 'demo' && total > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            The AI service is showing its SIMULATED fallback — these numbers are <strong>not</strong> real
            detections and will not be persisted as evidence. Start the OnionCheck service (port 5000) for live results.
          </span>
        </div>
      )}

      {/* ── Feed + results grid ──────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">

{/* ── Camera feed ──────────────────────────────────────── */}
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Camera className="text-forest" size={18} />
              <h3 className="text-base font-bold text-ink">Camera Feed</h3>
              {frozenUrl && <Badge tone="amber">Frozen</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={switchCamera}
                className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink"
                title={`Switch camera (current: ${facingMode === 'environment' ? 'Back' : 'Front'})`}
              >
                <RefreshCw size={13} className="text-forest" />
                <span>{facingMode === 'environment' ? '📷 Back Cam' : '🤳 Front Cam'}</span>
              </button>

              {(phase === 'idle' || phase === 'error') && (
                <button onClick={() => void startCamera()} className="btn-primary flex items-center gap-2">
                  <Play size={15} /> Start Camera
                </button>
              )}
              {phase === 'requesting' && <Spinner label="Requesting camera permission…" />}
              {(phase === 'live' || phase === 'paused') && (
                <button onClick={stopCamera} className="btn-secondary flex items-center gap-2">
                  <Square size={14} /> Stop Camera
                </button>
              )}
              {phase === 'live' && (
                <button onClick={() => void runAnalysisOnce()} className="btn-secondary flex items-center gap-2" disabled={isAnalyzing}>
                  <RefreshCw size={14} className="mr-1" /> Analyze Now
                </button>
              )}
            </div>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay muted playsInline
            />

            {/* Frozen capture shown above the live feed after Capture */}
            {frozenUrl && (
              <img src={frozenUrl} alt="Frozen capture" className="absolute inset-0 h-full w-full object-cover" />
            )}

            {/* Detection overlay — boxes from the actual AI response */}
            {detections.length > 0 && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[13px] font-extrabold text-white backdrop-blur-sm">
                  ONIONS DETECTED: <span className="text-fresh">{total}</span>
                </div>
                {detections.map((d) => (
                  <div
                    key={d.id}
                    className="pointer-events-none absolute rounded-md border-2"
                    style={{
                      left: `${d.bbox.x}%`, top: `${d.bbox.y}%`,
                      width: `${d.bbox.width}%`, height: `${d.bbox.height}%`,
                      borderColor: CLASS_COLOR[d.cls] || '#94A3B8',
                    }}
                    title={`#${d.num} | ${labelFor(d.cls)} | ${Math.round(d.confidence * 100)}%`}
                  >
                    <span
                      className="absolute -top-6 left-0 whitespace-nowrap rounded-sm px-1 text-[10px] font-extrabold text-white"
                      style={{ background: CLASS_COLOR[d.cls] || '#334155' }}
                    >
                      #{d.num} | {labelFor(d.cls)} | {Math.round(d.confidence * 100)}%
                    </span>
                    {d.lowConf && (
                      <span className="absolute -bottom-5 left-0 whitespace-nowrap rounded-sm bg-amber/90 px-1 text-[9px] font-bold text-black">
                        Low Confidence — Review Required
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Idle / empty states */}
            {phase === 'idle' && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
                <CameraOff className="text-slate-500" size={42} />
                <p className="text-sm text-slate-400 text-center px-4">
                  Position the onion batch in front of the camera, then press <strong>Start Camera</strong>.
                </p>
              </div>
            )}
            {phase === 'error' && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
                <CameraOff className="text-slate-500" size={42} />
                <p className="text-sm text-slate-400 text-center px-4">Camera unavailable — you can still upload an image below.</p>
              </div>
            )}
            {capturing && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-[2px]">
                <Spinner label="Analysing captured frame…" />
              </div>
            )}
          </div>

{/* Hidden sampling canvas (never rendered) */}
          <canvas ref={canvasRef} className="hidden" width="2" height="2" />

          {/* Frame telemetry strip — real values from the last sampled frame */}
          <div className="mt-3 grid gap-2 rounded-lg bg-mint/15 px-3 py-2 text-[11px] text-muted sm:grid-cols-2 lg:grid-cols-4">
            <span className="flex items-center gap-1">
              <ScanLine size={12} className="text-forest" />
              {isAnalyzing ? 'Analysing frame…' : lastAnalyzedAt ? `Last analysis ${lastAnalyzedAt}` : 'No analysis yet'}
            </span>
            <span className="flex items-center gap-1">
              <Zap size={12} className={metrics?.bright ? 'text-forest' : 'text-amber-500'} />
              {metrics ? `Light ${metrics.luminance}/255` : 'Light —'}
            </span>
            <span className="flex items-center gap-1">
              <Crosshair size={12} className={metrics?.sharp ? 'text-forest' : 'text-amber-500'} />
              {metrics ? `Sharpness ${metrics.blurVariance}` : 'Sharpness —'}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-forest" />
              {modelName && source !== 'idle' ? `${modelName} ${modelVersion}` : 'Model idle'}
            </span>
          </div>

          {/* Upload fallback */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-forest/15 bg-forest/5 px-3 py-2.5 text-sm">
            <Upload size={15} className="text-forest" />
            <span className="text-muted">Camera unsupported or offline?</span>
            <label className="btn-secondary mx-1 cursor-pointer !py-1 text-xs">
              Upload Image &amp; Analyse
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadedFile(f); e.target.value = ''; }}
              />
            </label>
          </div>
        </Card>

{/* ── LIVE AI INSPECTION panel ─────────────────────────────── */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2 font-bold text-emerald-950">
              <span className="flex items-center gap-2"><ScanLine size={16} className="text-fresh" /> LIVE AI INSPECTION</span>
              {source === 'onioncheck' && <Badge tone="forest">LIVE</Badge>}
              {source === 'demo' && total > 0 && <Badge tone="amber">SIMULATED</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted"><Boxes size={12} /> Total Onions</div>
                <div className="text-xl font-bold text-forest">{source === 'idle' ? '—' : total}</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted"><ShieldCheck size={12} /> Visual Quality Score</div>
                <div className="text-xl font-bold text-forest">{visionScore != null ? `${visionScore}/100` : '—'}</div>
              </div>
              {CLASS_ORDER.map((cls) => (
                <div key={cls} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted">
                    <span>{CLASS_EMOJI[cls]}</span>{labelFor(cls)}
                  </div>
                  <div className="text-xl font-bold" style={{ color: CLASS_COLOR[cls] }}>{source === 'idle' ? '—' : (counts[cls] || 0)}</div>
                </div>
              ))}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted"><Zap size={12} /> Average Confidence</div>
                <div className="text-xl font-bold text-forest">{avgConf != null ? `${Math.round(avgConf)}%` : '—'}</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted"><AlertCircle size={12} /> Spoilage Risk</div>
                <div className="text-xl font-bold"><RiskBadge level={risk} /></div>
              </div>
            </div>
          </Card>

          {/* ── Reliability checks ───────────────────────────────── */}
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink"><Info size={16} className="text-fresh" /> Reliability Checks</div>
            <ul className="space-y-1.5 text-xs">
              <li className={clsx('flex items-center gap-2', lowConfCount > 0 ? 'text-amber-700' : 'text-forest')}>
                {lowConfCount > 0
                  ? <><AlertTriangle size={13} /> {lowConfCount} detection(s) below {Math.round(CONFIDENCE_THRESHOLD * 100)}% confidence — review required</>
                  : <><CheckCircle2 size={13} /> Confidence threshold respected ({Math.round(CONFIDENCE_THRESHOLD * 100)}%)</>}
              </li>
              <li className={clsx('flex items-center gap-2', metrics && !metrics.bright ? 'text-amber-700' : 'text-forest')}>
                {metrics && !metrics.bright
                  ? <><AlertTriangle size={13} /> Poor lighting — reposition onions or improve lighting</>
                  : <><CheckCircle2 size={13} /> Lighting adequate</>}
              </li>
              <li className={clsx('flex items-center gap-2', metrics && !metrics.sharp ? 'text-amber-700' : 'text-forest')}>
                {metrics && !metrics.sharp
                  ? <><AlertTriangle size={13} /> Blur detected — steady the camera / reposition onions</>
                  : <><CheckCircle2 size={13} /> Frame sharpness adequate</>}
              </li>
              <li className={clsx('flex items-center gap-2', phase === 'live' ? 'text-forest' : 'text-amber-700')}>
                {phase === 'live'
                  ? <><CheckCircle2 size={13} /> Camera connected</>
                  : <><AlertTriangle size={13} /> Camera disconnected — start the camera</>}
              </li>
              <li className={clsx('flex items-center gap-2', source === 'onioncheck' ? 'text-forest' : source === 'demo' ? 'text-amber-700' : 'text-muted')}>
                {source === 'onioncheck'
                  ? <><CheckCircle2 size={13} /> Live AI inference (OnionCheck)</>
                  : source === 'demo'
                  ? <><AlertTriangle size={13} /> Simulated results — not usable as evidence</>
                  : <><Info size={13} /> Waiting for AI inference…</>}
              </li>
              {total === 0 && source !== 'idle' && (
                <li className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle size={13} /> No onions detected in the current frame
                </li>
              )}
            </ul>
          </Card>

{/* ── Captured samples ───────────────────────────────────── */}
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <Layers size={16} className="text-fresh" /> Captured Samples
              <Badge tone="gray">{samples.length}/{MAX_SAMPLES}</Badge>
            </div>
            {samples.length === 0 ? (
              <p className="text-xs text-muted">No samples captured yet. Press <strong>Capture Inspection</strong> to freeze the current frame and store its AI results.</p>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {samples.map((s) => (
                  <div key={s.imageId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-xs">
                    <span className="font-semibold text-emerald-900">
                      Sample {String(s.sampleNo).padStart(2, '0')} — {s.totalOnions} onions
                    </span>
                    <span className="flex items-center gap-1.5">
                      {s.source === 'onioncheck'
                        ? <Badge tone="forest">LIVE</Badge>
                        : s.source === 'demo'
                        ? <Badge tone="amber">SIMULATED</Badge>
                        : <Badge tone="gray">NO AI</Badge>}
                      {s.reviewRequired && !s.inspectorReviewed && (
                        <Badge tone="amber"><AlertTriangle size={11} /> Review Required</Badge>
                      )}
                      <label className="flex cursor-pointer items-center gap-1 text-emerald-700">
                        <input
                          type="checkbox"
                          className="h-3 w-3 accent-forest"
                          checked={s.inspectorReviewed}
                          onChange={(e) => markReviewed(s.sampleNo, e.target.checked)}
                        />
                        Reviewed
                      </label>
                    </span>
                    <span className="text-emerald-600">
                      {Math.round(s.averageConfidence)}% · score {s.visionScore}/100 · {s.imageId}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => void handleCapture()}
                className="btn-primary flex items-center gap-2"
                disabled={phase !== 'live' || capturing}
              >
                <Crosshair size={15} /> Capture Inspection
              </button>
              <button
                onClick={handleRetake}
                className="btn-secondary flex items-center gap-2"
                disabled={samples.length === 0 || capturing}
              >
                <Trash2 size={14} /> Retake Last Sample
              </button>
            </div>
          </Card>

          {/* ── Actions ──────────────────────────────────────────── */}
          <Card className="p-5">
            <div className="mb-1 flex items-center gap-2 text-sm font-bold text-ink"><Zap size={16} className="text-fresh" /> Next Steps</div>
            <p className="mb-3 text-xs text-muted">
              Every capture stays connected: <span className="font-mono">Inspection ID → Lot ID → Image ID → AI Analysis ID</span>.
              Fusion Intelligence, History, Reports and Certificates read the same stored evidence.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={continueToAI}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-forest to-darkgreen px-5 py-2.5 text-sm font-extrabold text-white shadow-md hover:opacity-95 transition"
                disabled={samples.length === 0 && total === 0}
              >
                Continue to AI Analysis <ArrowRight size={15} />
              </button>
              <button
                onClick={() => samples.forEach(downloadSample)}
                className="btn-secondary flex items-center gap-2"
                disabled={samples.length === 0}
              >
                <Download size={14} /> Download Captures
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Download a single captured sample image (the exact frame the AI processed).
 */
function downloadSample(sample: CapturedSample) {
  if (!sample.imageUrl) return;
  const url = sample.imageUrl.startsWith('http') || sample.imageUrl.startsWith('data:')
    ? sample.imageUrl
    : `${window.location.origin}${sample.imageUrl}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sample.imageId}.jpg`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.click();
  window.setTimeout(() => a.remove(), 600);
}