import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, ScanLine, Leaf, Bug, Trash2, Sprout, Ruler, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { detectImage, detectBase64, checkHealth } from '../lib/api';
import type { DetectionResponse } from '../lib/types';

const CLASS_THEME: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  healthy: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Healthy', icon: Leaf },
  damaged: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Damaged', icon: Bug },
  rotten: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'Rotten / Smut', icon: Trash2 },
  sprouted: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', label: 'Sprouted', icon: Sprout },
  undersized: { color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', label: 'Undersized', icon: Ruler },
};

export default function QualityDetection() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkHealth().then(() => setServiceOnline(true)).catch(() => setServiceOnline(false));
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (e: any) {
      setError('Camera access denied: ' + e.message);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setImage(dataUrl);
    await runDetection(dataUrl);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setImage(dataUrl);
      await runDetection(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const runDetection = async (dataUrl: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const base64 = dataUrl.split(',')[1];
      const res = await detectBase64(base64);
      setResult(res);
      if (!res.success) setError(res.error || 'No onions detected');
    } catch (e: any) {
      setError(e.message || 'Detection failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onion-detection-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = result?.total || 0;
  const counts = result?.counts || { healthy: 0, damaged: 0, rotten: 0, sprouted: 0, undersized: 0 };
  const score = result?.visionScore ?? null;
  const defectRate = result?.defect_rate ?? null;

  const grade = score !== null
    ? defectRate !== null && (defectRate > 35 || score < 50) ? 'REJECT'
    : score >= 85 && defectRate !== null && defectRate <= 10 ? 'GRADE A'
    : score >= 70 && defectRate !== null && defectRate <= 25 ? 'GRADE B' : 'GRADE C'
    : '—';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-ink md:text-4xl">Onion Quality Detection</h1>
        <p className="mt-2 text-sm text-muted">
          Upload an onion image or use your camera. AI will count, classify, and grade every onion.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold">
          {serviceOnline === null ? 'Checking service…' : serviceOnline ? (
            <span className="flex items-center gap-1.5 text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> AI Engine Online</span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-500" /> AI Engine Offline</span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Input */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
              <Upload size={16} className="text-forest" /> Input Image
            </div>

            {!image ? (
              <div className="space-y-3">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 transition hover:border-forest"
                >
                  <Upload size={32} className="mb-2 text-slate-400" />
                  <p className="text-sm font-bold text-ink">Click to upload onion image</p>
                  <p className="text-xs text-muted">JPG, PNG up to 20MB</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted">OR</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {!cameraActive ? (
                  <button onClick={startCamera} className="btn-primary w-full flex items-center justify-center gap-2">
                    <Camera size={16} /> Open Camera
                  </button>
                ) : (
                  <button onClick={stopCamera} className="btn-secondary w-full flex items-center justify-center gap-2 text-rose-600 border-rose-200">
                    Close Camera
                  </button>
                )}
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-slate-900">
                <img src={image} alt="Input" className="w-full object-contain max-h-[400px]" />
                <button
                  onClick={() => { setImage(null); setResult(null); stopCamera(); }}
                  className="absolute top-3 right-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur"
                >
                  Clear
                </button>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {cameraActive && !image && (
              <div className="mt-3 space-y-2">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
                  <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                </div>
                <button onClick={captureFrame} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  <Camera size={16} /> {loading ? 'Analyzing…' : 'Capture & Detect'}
                </button>
              </div>
            )}

            {image && !result && !loading && (
              <button onClick={() => runDetection(image)} className="btn-primary w-full mt-3 flex items-center justify-center gap-2">
                <ScanLine size={16} /> Re-run Detection
              </button>
            )}
          </div>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {loading && (
            <div className="card p-8 text-center">
              <RefreshCw size={32} className="mx-auto animate-spin text-forest" />
              <p className="mt-3 text-sm font-bold text-ink">AI is analyzing the image…</p>
              <p className="text-xs text-muted">This may take a few seconds</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-2 rounded-xl border border-reject/20 bg-reject/5 px-4 py-3 text-sm text-reject">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Grade & Score */}
              <div className="card p-5 bg-gradient-to-br from-white to-emerald-50/40 border-emerald-100">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted">AI Quality Grade</div>
                    <div className={`mt-1 text-3xl font-black ${
                      grade === 'GRADE A' ? 'text-emerald-700' :
                      grade === 'GRADE B' ? 'text-blue-700' :
                      grade === 'GRADE C' ? 'text-amber-700' : 'text-rose-700'
                    }`}>{grade}</div>
                  </div>
                  <div className="text-center rounded-2xl bg-white p-3 border border-emerald-100 shadow-sm min-w-[80px]">
                    <div className="text-2xl font-black text-forest">{score ?? '—'}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Score / 100</div>
                  </div>
                </div>

                {defectRate !== null && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-ink">Defect Rate</span>
                      <span className={defectRate > 20 ? 'text-rose-600 font-bold' : 'text-emerald-700'}>{defectRate}%</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
                      <div className="bg-emerald-500 h-full transition-all" style={{ width: `${Math.max(0, 100 - defectRate)}%` }} />
                      <div className="bg-rose-500 h-full transition-all" style={{ width: `${Math.min(100, defectRate)}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Detection Breakdown */}
              <div className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-ink">
                    <ScanLine size={16} className="text-fresh" /> Detection Distribution
                  </div>
                  <span className="text-xs text-muted font-mono">{total} total onions</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Object.entries(CLASS_THEME).map(([key, config]) => {
                    const count = counts[key] || 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const Icon = config.icon;
                    return (
                      <div key={key} className="rounded-xl border p-2.5" style={{ backgroundColor: config.bg, borderColor: config.color + '40' }}>
                        <div className="flex items-center justify-between">
                          <Icon size={14} style={{ color: config.color }} />
                          <span className="text-[10px] font-bold font-mono" style={{ color: config.color }}>{pct}%</span>
                        </div>
                        <div className="mt-1 text-lg font-black text-ink">{count}</div>
                        <div className="text-[10px] font-semibold text-muted">{config.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Annotated Image */}
              {result.annotated_image_base64 && (
                <div className="card p-4">
                  <div className="mb-2 text-sm font-bold text-ink">Annotated Result</div>
                  <img src={`data:image/jpeg;base64,${result.annotated_image_base64}`} alt="Annotated" className="w-full rounded-xl" />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={downloadResult} className="btn-secondary flex items-center gap-2">
                  <Download size={15} /> Export JSON
                </button>
                <button onClick={() => { setImage(null); setResult(null); }} className="btn-secondary flex items-center gap-2">
                  <RefreshCw size={15} /> New Image
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
