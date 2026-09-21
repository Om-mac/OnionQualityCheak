import type {
  Certificate, DashboardStats, EnvResult, FusionResult, FusionContextResponse, GasResult, Lot, SensorReading, User, VisionResult,
} from './types';

const TOKEN_KEY = 'onionsure_token';
const USER_KEY = 'onionsure_user';

export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t: string | null) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }
export function getStoredUser(): User | null {
  const u = localStorage.getItem(USER_KEY);
  return u ? JSON.parse(u) : null;
}
export function setStoredUser(u: User | null) { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); }

/**
 * API base URL. Defaults to the Vite dev proxy path (`/api` → server:4000).
 * In production set `VITE_API_BASE_URL` (e.g. https://api.onionsure.in) so the
 * same build can target a different host with no source changes (spec §31).
 */
const API_BASE: string = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Hook for global 401 handling. The AuthProvider registers a callback that
 * clears the session and redirects to /login when the backend rejects the
 * token (spec §5: "redirect to login after unauthorized response").
 */
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: (() => void) | null) { onUnauthorized = fn; }

async function req<T = any>(path: string, opts: { method?: string; body?: any } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    let msg = res.statusText;
    try { const e = await res.json(); msg = e.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? (null as any) : res.json();
}

export const api = {
  // auth
  login: (username: string, password: string) => req<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { username, password } }),
  register: (payload: any) => req<{ token: string; user: User }>('/auth/farmer-signup', { method: 'POST', body: payload }),

  // lots
  getLots: () => req<Lot[]>('/lots'),
  createLot: (payload: any) => req<Lot>('/lots', { method: 'POST', body: payload }),
  getLot: (id: string) => req<Lot>(`/lots/${id}`),
  getCenters: () => req<any[]>('/centers'),
  getFarmers: () => req<any[]>('/farmers'),
  searchFarmers: (query: string) => req<any[]>(`/farmers/search?q=${encodeURIComponent(query)}`),
  registerFarmer: (payload: { fullName: string; mobile: string; village: string; farmName?: string; fpoId?: string }) => 
    req<any>('/farmers', { method: 'POST', body: payload }),
  getFpos: () => req<any[]>('/fpos'),

  // inspection
  startInspection: (payload: any) => req<any>('/inspection/start', { method: 'POST', body: payload }),
  getInspection: (id: string) => req<any>(`/inspection/${id}`),
  addImage: (id: string, payload: any) => req(`/inspection/${id}/images`, { method: 'POST', body: payload }),
  addSensor: (id: string, payload: any) => req(`/inspection/${id}/sensors`, { method: 'POST', body: payload }),
  runAIAnalysis: (id: string, payload: any) => req<any>(`/inspections/${id}/ai-analysis`, { method: 'POST', body: payload }),

  // live camera — upload a captured frame as a real file (persisted on disk so
  // the AI service can run inference on it). Returns { images:[{id,url,...}] }.
  uploadInspectionImage: (id: string, file: File, meta?: { imageType?: string; captureDevice?: string; description?: string }) => {
    const form = new FormData();
    form.append('images', file);
    if (meta?.imageType) form.append('imageType', meta.imageType);
    if (meta?.captureDevice) form.append('captureDevice', meta.captureDevice);
    if (meta?.description) form.append('description', meta.description);
    return fetch(`${API_BASE}/inspections/${id}/images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() || ''}` },
      body: form,
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || 'Image upload failed');
      return r.json();
    });
  },
  // live camera — real-time detection: forwards a browser frame (data URL) to the
  // Python YOLO service and returns the ACTUAL detections + counts.
  // (mounted under /ai-analysis/live-detect on the backend, reusing the same
  //  ONIONCHECK / Roboflow integration as the capture-time analysis)
  liveDetect: (id: string, dataUrl: string, opts?: { confidenceThreshold?: number }) =>
    req<any>(`/inspections/${id}/ai-analysis/live-detect`, { method: 'POST', body: { image: dataUrl, confidenceThreshold: opts?.confidenceThreshold || 0.25 } }),
  // live camera — mark image capture complete (status -> CAMERA_COMPLETED)
  completeCameraCapture: (id: string) => req<any>(`/inspections/${id}/images/complete`, { method: 'POST' }),
  // live camera — remove a captured sample image
  deleteInspectionImage: (id: string, imageId: string) => req<any>(`/inspections/${id}/images/${imageId}`, { method: 'DELETE' }),
  analyzeInspection: (id: string, payload: any) => req<{ vision: VisionResult; gas: GasResult; environment: EnvResult; fusion: FusionResult }>(`/inspection/${id}/analyze`, { method: 'POST', body: payload }),
  updateInspectionStep: (id: string, step: number, status?: string) => req<any>(`/inspection/${id}/step`, { method: 'PATCH', body: { step, status } }),

  // vision
  visionAnalyze: (payload: any) => req<VisionResult>('/vision/analyze', { method: 'POST', body: payload }),
  /**
   * Multipart vision analysis (OnionCheck / Roboflow bridge).
   *
   * When `inspectionId` is provided the backend persists the resulting AI
   * analysis + per-detection boxes under that exact Inspection ID, so the
   * captured evidence survives a refresh and is available to Fusion
   * Intelligence, History, Reports and Certificates.
   */
  visionAnalyzeImage: (file: File, pixelsPerCm?: number, inspectionId?: string) => {
    const form = new FormData();
    form.append('image', file);
    if (pixelsPerCm != null) form.append('pixels_per_cm', String(pixelsPerCm));
    if (inspectionId) form.append('inspectionId', inspectionId);
    return fetch(`${API_BASE}/vision/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() || ''}` },
      body: form,
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || 'Vision analysis failed');
      return r.json();
    });
  },

  // iot
  postReadings: (payload: any) => req<{ reading: SensorReading; gas: GasResult }>('/iot/readings', { method: 'POST', body: payload }),
  getReadings: (inspectionId: string) => req<SensorReading[]>(`/iot/${inspectionId}`),
  simulateStart: (payload: any) => req<any>('/iot/simulate/start', { method: 'POST', body: payload }),
  simulateTick: (payload: any) => req<{ device: any; gas: GasResult }>('/iot/simulate/tick', { method: 'POST', body: payload }),
  simulateStop: (payload: any) => req('/iot/simulate/stop', { method: 'POST', body: payload }),
  /**
   * Compute IoT quality condition from demo sensor readings.
   * Never returns raw sensor values — only condition label, score, confidence, stage.
   * Optionally persists against an open inspection session.
   */
  iotCompute: (payload?: { inspectionId?: string; deviceId?: string; scenario?: 'normal' | 'spoilage' }) =>
    req<{
      success: boolean;
      condition: 'EXCELLENT' | 'GOOD';
      conditionLabel: string;
      gasScore: number;
      confidence: number;
      stage: 'LOW' | 'MEDIUM' | 'HIGH';
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      mode: string;
      source: string;
      sourceLabel: string;
      timestamp: string;
      readingId?: string;
      inspectionId?: string;
    }>('/iot/compute', { method: 'POST', body: payload || {} }),

  // fusion
  /**
   * Scoped evidence loader — returns ONLY vision + IoT evidence belonging to
   * this exact inspectionId. Never leaks data from another lot or inspection.
   *
   * Use this as the entry-point for the Fusion Intelligence page instead of
   * getFusionContext() which hardcodes lot ON-2026-00421.
   */
  getFusionEvidence: (inspectionId: string) => req<{
    inspectionId: string;
    lotId: string | null;
    lotNumber: string | null;
    centralLotId: string | null;
    hasVision: boolean;
    hasIoT: boolean;
    vision: {
      source: string;
      total: number;
      counts: Record<string, number>;
      percentages: Record<string, number>;
      visionScore: number;
      confidence: number;
    } | null;
    iot: {
      source: string;
      gasScore: number;
      stage: 'LOW' | 'MEDIUM' | 'HIGH';
      condition: 'EXCELLENT' | 'GOOD';
      conditionLabel: string;
      confidence: number;
      environmentScore?: number;
      timestamp: string;
    } | null;
    storedFusion: FusionResult | null;
    session: {
      status: string;
      workflowState: string;
      startedAt: string;
      completedAt: string | null;
    };
    lot: {
      lotNumber: string | null;
      centralLotId: string | null;
      variety: string | null;
      crop: string | null;
      quantityKg: number | null;
      farmerId: string | null;
      fpoId: string | null;
      procurementCenterId: string | null;
    };
  }>(`/fusion/evidence/${encodeURIComponent(inspectionId)}`),

  getFusionContext: (lotNumber?: string) => req<FusionContextResponse>(`/fusion/context${lotNumber ? `?lotNumber=${encodeURIComponent(lotNumber)}` : ''}`),
  calculateFusion: (payload: any) => req<FusionResult>('/fusion/calculate', { method: 'POST', body: payload }),
  commitFusion: (inspectionId: string, lotId: string | undefined, fusionResult: FusionResult) =>
    req<{ success: boolean; message: string; recordId: string; persistedAt: string; grade: string; score: number }>('/fusion/commit', {
      method: 'POST',
      body: { inspectionId, lotId, fusionResult },
    }),

  // certificates
  generateCertificate: (payload: any) => req<any>('/certificates/generate', { method: 'POST', body: payload }),
  getCertificates: () => req<Certificate[]>('/certificates'),
  getCertificate: (id: string) => req<any>(`/certificates/${id}`),
  certificatePdf: (id: string) => req<any>(`/certificates/${id}/pdf`),

  // inspection history — single enriched call (cert + lot + fusion)
  getInspections: () => req<any[]>('/inspections'),

  // override & audit
  overrideInspection: (id: string, payload: { newGrade: string; reason: string }) =>
    req<{ success: boolean; override: any; updatedGrade: string }>(`/inspections/${id}/override`, { method: 'POST', body: payload }),
  getInspectionAudit: (id: string) => req<{ inspectionId: string; overrides: any[]; auditTrail: any[] }>(`/inspections/${id}/audit`),
  getAuditLogs: () => req<{ logs: any[]; overrides: any[] }>('/audit/logs'),
  getAuditLogsByLot: (lotNumber: string) => req<{ logs: any[]; overrides: any[]; inspections: any[] }>(`/audit/lot/${lotNumber}`),

  // disputes
  getDisputes: () => req<any[]>('/disputes'),
  getDispute: (id: string) => req<{ dispute: any; lot: any; inspections: any[] }>(`/disputes/${id}`),
  createDispute: (payload: { lotId: string; inspectionId?: string; reason: string; description?: string }) =>
    req<any>('/disputes', { method: 'POST', body: payload }),
  reviewDispute: (id: string) => req<{ success: boolean; dispute: any }>(`/disputes/${id}/review`, { method: 'POST' }),
  reinspectDispute: (id: string, payload: { newGrade: string; newScore?: number; reason: string }) =>
    req<{ success: boolean; dispute: any; reassessment: any }>(`/disputes/${id}/reinspect`, { method: 'POST', body: payload }),
  acceptDispute: (id: string, payload: { reason: string }) =>
    req<{ success: boolean; dispute: any }>(`/disputes/${id}/accept`, { method: 'POST', body: payload }),
  rejectDispute: (id: string, payload: { reason: string }) =>
    req<{ success: boolean; dispute: any }>(`/disputes/${id}/reject`, { method: 'POST', body: payload }),

  // central lot lookup & variation check
  lookupLot: (lotNumber: string) => req<{ lot: Lot; inspections: any[]; resultVariationDetected: boolean; variationDetails?: string | null }>(`/lots/lookup/${lotNumber}`),

  // farmer pre-check (preliminary estimate)
  preCheck: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    form.append('preliminary', 'true');
    return fetch(`${API_BASE}/vision/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() || ''}` },
      body: form,
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || 'Pre-check failed');
      return r.json();
    });
  },

  // verify (public)
  verify: (certId: string) => req<any>(`/verify/${certId}`),

  // analytics
  analyticsDashboard: () => req<DashboardStats>('/analytics/dashboard'),
  analyticsQuality: () => req<any>('/analytics/quality'),
  analyticsDefects: () => req<Record<string, number>>('/analytics/defects'),

  // config
  configFusion: () => req<{ weights: Record<string, number>; grading: { gradeA: number; urs: number } }>('/config/fusion'),
  updateConfigFusion: (payload: any) => req('/config/fusion', { method: 'PATCH', body: payload }),

  // demo
  demoRun: (payload: any) => req<any>('/demo/run', { method: 'POST', body: payload }),
  demoPublic: (payload: any) => req<any>('/demo/public', { method: 'POST', body: payload }),
};
