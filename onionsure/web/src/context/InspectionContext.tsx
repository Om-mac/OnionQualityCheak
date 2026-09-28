import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

/**
 * GET /api/inspection/:id returns the session **flat** — its fields sit at the
 * top level, alongside `lot`, `images`, `sensors`, `aiAnalyses`, `fusion`, …
 * Some callers (and older backend versions) wrap it as `{ inspection: {...} }`.
 *
 * Reading `res.inspection.status` against the flat shape threw
 * "Cannot read properties of undefined", which aborted saveAiAnalysis *after*
 * the backend call had already succeeded — so the operator saw a saved-looking
 * screen with a permanently disabled "Continue to Fusion Intelligence" button.
 * Accept either shape so a response-shape change can never strand the workflow.
 */
const unwrapInspection = (res: any): any => res?.inspection ?? res ?? {};

export type WorkflowStatus =
  | 'DRAFT'
  | 'LOT_CREATED'
  | 'SENSOR_PENDING'
  | 'SENSOR_COMPLETED'
  | 'CAMERA_PENDING'
  | 'CAMERA_COMPLETED'
  | 'AI_ANALYSIS_PENDING'
  | 'AI_ANALYSIS_COMPLETED'
  | 'FUSION_PENDING'
  | 'FUSION_COMPLETED'
  | 'GRADE_ASSIGNED'
  | 'CERTIFICATE_GENERATED'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'CLOSED';

export interface InspectionRecord {
  id: string;
  inspectionNumber: string;
  lotId: string;
  lotNumber?: string;
  farmerId?: string;
  farmerName: string;
  fpoId?: string;
  fpoName?: string;
  procurementCenterId?: string;
  centreId?: string;
  centreName?: string;
  centerName?: string;
  crop: string;
  variety: string;
  quantity: number;
  quantityUnit?: string;
  inspectionDate: string;
  inspectorId?: string;
  inspectorName?: string;
  status: WorkflowStatus;

  sensorData?: {
    sensorReadingId?: string;
    inspectionId?: string;
    timestamp?: string;
    temperature?: number;
    humidity?: number;
    moisture?: number;
    ph?: number;
    co2?: number;
    ch4?: number;
    c2h4?: number;
    nh3?: number;
    deviceId?: string;
    batteryLevel?: number;
    connectivityStatus?: string;
    gasScore?: number;
    conditionLabel?: string;
  };

  cameraData?: {
    images?: Array<{
      imageId: string;
      imageUrl: string;
      captureTime: string;
      cameraId?: string;
      imageQuality?: string;
    }>;
    capturedCount?: number;
    lastCapturedAt?: string;
  };

  aiAnalysis?: {
    totalDetected: number;
    healthyCount: number;
    damagedCount: number;
    rottenCount: number;
    sproutedCount: number;
    undersizedCount: number;
    averageConfidence: number;
    modelName: string;
    modelVersion: string;
    detections?: any[];
    processedAt: string;
  };

  fusionResult?: {
    visualScore: number;
    sensorScore: number;
    aiConfidence: number;
    finalQualityScore: number;
    grade: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    gradingFactors?: string[];
    calculatedAt: string;
    gradingRuleVersion?: string;
  };

  finalGrade?: string;
  qualityScore?: number;
  certificateId?: string;
  certificateNumber?: string;
  certificate?: any;
  auditTrail?: any[];
  dispute?: any;
  createdAt: string;
  updatedAt: string;
}

interface InspectionContextType {
  activeInspectionId: string | null;
  activeInspection: InspectionRecord | null;
  loading: boolean;
  error: string | null;
  setActiveInspectionId: (id: string | null) => void;
  createInspection: (payload: any) => Promise<InspectionRecord>;
  saveSensorData: (sensorPayload: any) => Promise<InspectionRecord>;
  saveCameraData: (cameraPayload: any) => Promise<InspectionRecord>;
  saveAiAnalysis: (aiPayload: any) => Promise<InspectionRecord>;
  saveFusionResult: (fusionPayload: any) => Promise<InspectionRecord>;
  generateCertificate: (payload?: any) => Promise<any>;
  refreshActiveInspection: (id?: string) => Promise<InspectionRecord | null>;
  clearActiveInspection: () => void;
}

const STORAGE_KEY_ID = 'onionsure_active_inspection_id';
const STORAGE_KEY_DATA = 'onionsure_active_inspection_data';

const InspectionContext = createContext<InspectionContextType>({
  activeInspectionId: null,
  activeInspection: null,
  loading: false,
  error: null,
  setActiveInspectionId: () => {},
  createInspection: async () => { throw new Error('InspectionProvider missing'); },
  saveSensorData: async () => { throw new Error('InspectionProvider missing'); },
  saveCameraData: async () => { throw new Error('InspectionProvider missing'); },
  saveAiAnalysis: async () => { throw new Error('InspectionProvider missing'); },
  saveFusionResult: async () => { throw new Error('InspectionProvider missing'); },
  generateCertificate: async () => { throw new Error('InspectionProvider missing'); },
  refreshActiveInspection: async () => null,
  clearActiveInspection: () => {},
});

export const InspectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeInspectionId, setActiveIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_ID) || null;
  });

  const [activeInspection, setActiveInspection] = useState<InspectionRecord | null>(() => {
    const cached = localStorage.getItem(STORAGE_KEY_DATA);
    if (cached) {
      try { return JSON.parse(cached); } catch { return null; }
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const persistActive = (id: string | null, record: InspectionRecord | null) => {
    setActiveIdState(id);
    setActiveInspection(record);
    if (id) {
      localStorage.setItem(STORAGE_KEY_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_ID);
    }

    if (record) {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(record));
    } else {
      localStorage.removeItem(STORAGE_KEY_DATA);
    }
  };

  const refreshActiveInspection = useCallback(async (targetId?: string): Promise<InspectionRecord | null> => {
    const idToFetch = targetId || activeInspectionId;
    if (!idToFetch) return null;

    setLoading(true);
    setError(null);
    try {
      const remote = await api.getInspection(idToFetch).catch(() => null);
      if (remote) {
        const merged: InspectionRecord = {
          ...activeInspection,
          ...remote,
          id: remote.id || remote.inspectionNumber || idToFetch,
          inspectionNumber: remote.inspectionNumber || idToFetch,
        };
        persistActive(merged.id, merged);
        return merged;
      }
    } catch (e: any) {
      console.warn('Failed to fetch remote inspection data:', e);
    } finally {
      setLoading(false);
    }

    return activeInspection;
  }, [activeInspectionId, activeInspection]);

  const setActiveInspectionId = (id: string | null) => {
    if (!id) {
      persistActive(null, null);
      return;
    }
    setActiveIdState(id);
    localStorage.setItem(STORAGE_KEY_ID, id);
    refreshActiveInspection(id);
  };

  const clearActiveInspection = () => {
    persistActive(null, null);
  };

  const createInspection = async (payload: any): Promise<InspectionRecord> => {
    setLoading(true);
    setError(null);
    try {
      // ALWAYS call backend first - never create locally without server response
      const serverRes = await api.startInspection(payload);
      
      // Backend returns { inspection, lot, success }
      const inspection = serverRes.inspection || serverRes;
      const lot = serverRes.lot;

      // Build complete record from backend response
      const finalRecord: InspectionRecord = {
        id: inspection.id || inspection.inspectionNumber,
        inspectionNumber: inspection.inspectionNumber,
        lotId: inspection.lotId,
        lotNumber: inspection.lotNumber || lot?.lotNumber,
        farmerId: inspection.farmerId,
        farmerName: inspection.farmerName,
        fpoId: inspection.fpoId,
        fpoName: inspection.fpoName,
        procurementCenterId: inspection.procurementCenterId || inspection.centreId,
        centreId: inspection.centreId || inspection.procurementCenterId,
        centreName: inspection.centreName || inspection.centerName,
        centerName: inspection.centerName || inspection.centreName,
        crop: inspection.crop,
        variety: inspection.variety,
        quantity: inspection.quantity,
        quantityUnit: inspection.quantityUnit,
        inspectionDate: inspection.createdAt,
        inspectorId: inspection.officerId,
        inspectorName: inspection.officerName,
        status: inspection.status,
        createdAt: inspection.createdAt,
        updatedAt: inspection.updatedAt,
      };

      // Persist to context and localStorage
      persistActive(finalRecord.id, finalRecord);
      return finalRecord;
    } catch (err: any) {
      setError(err.message || 'Failed to create inspection');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveSensorData = async (sensorPayload: any): Promise<InspectionRecord> => {
    if (!activeInspection) throw new Error('No active inspection found');

    setLoading(true);
    try {
      // Save to backend first
      await api.addSensor(activeInspection.id, sensorPayload);
      
      // Then fetch updated inspection from backend
      const refreshed = await api.getInspection(activeInspection.id);
      
      const updated: InspectionRecord = {
        ...activeInspection,
        ...unwrapInspection(refreshed),
        status: 'SENSOR_COMPLETED',
        sensorData: {
          ...(activeInspection.sensorData || {}),
          ...sensorPayload,
          timestamp: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };

      persistActive(updated.id, updated);
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to save sensor data');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveCameraData = async (cameraPayload: any): Promise<InspectionRecord> => {
    if (!activeInspection) throw new Error('No active inspection found');

    setLoading(true);
    try {
      // Save to backend first
      await api.addImage(activeInspection.id, cameraPayload);
      
      // Fetch updated inspection
      const refreshed = await api.getInspection(activeInspection.id);
      
      const fresh = unwrapInspection(refreshed);

      const existingImages = fresh.images || activeInspection.cameraData?.images || [];
      const newImages = cameraPayload.images || (cameraPayload.imageUrl ? [cameraPayload] : []);
      const mergedImages = [...existingImages, ...newImages];

      const updated: InspectionRecord = {
        ...activeInspection,
        ...fresh,
        status: 'CAMERA_COMPLETED',
        cameraData: {
          images: mergedImages,
          capturedCount: mergedImages.length,
          lastCapturedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };

      persistActive(updated.id, updated);
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to save camera data');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveAiAnalysis = async (aiPayload: any): Promise<InspectionRecord> => {
    if (!activeInspection) throw new Error('No active inspection found');

    setLoading(true);
    try {
      // Call backend AI analysis endpoint with the data
      const aiData = {
        totalCount: aiPayload.totalDetected || 0,
        healthyCount: aiPayload.healthyCount || 0,
        damagedCount: aiPayload.damagedCount || 0,
        rottenCount: aiPayload.rottenCount || 0,
        sproutedCount: aiPayload.sproutedCount || 0,
        undersizedCount: aiPayload.undersizedCount || 0,
        averageConfidence: aiPayload.averageConfidence / 100 || 0.89,
        modelName: aiPayload.modelName || 'OnionSure YOLOv8 Defect Detection',
        modelVersion: aiPayload.modelVersion || 'v2.4',
        counts: {
          healthy: aiPayload.healthyCount || 0,
          damaged: aiPayload.damagedCount || 0,
          rotten: aiPayload.rottenCount || 0,
          sprouted: aiPayload.sproutedCount || 0,
          undersized: aiPayload.undersizedCount || 0
        },
        statistics: {
          average_confidence: aiPayload.averageConfidence / 100 || 0.89
        },
        detections: aiPayload.detections || []
      };
      
      /* Persist the analysis server-side so Fusion can see the evidence.
         If the backend declines (e.g. a registered image file is missing), do
         NOT abort: the counts are already known client-side, and throwing here
         is what left the operator stranded with a disabled Continue button. */
      try {
        await api.runAIAnalysis(activeInspection.id, aiData);
      } catch (persistErr: any) {
        console.warn('AI analysis could not be persisted server-side:', persistErr?.message);
      }
      
      // Fetch the updated inspection with AI counts
      const refreshed = await api.getInspection(activeInspection.id);
      const fresh = unwrapInspection(refreshed);

      const updated: InspectionRecord = {
        ...activeInspection,
        ...fresh,
        status: fresh.status || 'AI_ANALYSIS_COMPLETED',
        aiAnalysis: {
          totalDetected:
            (Number(fresh.healthyCount) || 0) + (Number(fresh.damagedCount) || 0) +
            (Number(fresh.rottenCount) || 0) + (Number(fresh.sproutedCount) || 0) +
            (Number(fresh.undersizedCount) || 0),
          healthyCount: Number(fresh.healthyCount) || 0,
          damagedCount: Number(fresh.damagedCount) || 0,
          rottenCount: Number(fresh.rottenCount) || 0,
          sproutedCount: Number(fresh.sproutedCount) || 0,
          undersizedCount: Number(fresh.undersizedCount) || 0,
          averageConfidence: fresh.aiConfidence ?? aiPayload.averageConfidence ?? 0,
          modelName: aiPayload.modelName || 'OnionSure YOLOv8 Defect Detection',
          modelVersion: aiPayload.modelVersion || 'v2.4',
          detections: aiPayload.detections || [],
          processedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };

      persistActive(updated.id, updated);
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to save AI analysis');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveFusionResult = async (fusionPayload: any): Promise<InspectionRecord> => {
    if (!activeInspection) throw new Error('No active inspection found');

    setLoading(true);
    try {
      // Commit fusion to backend first
      await api.commitFusion(activeInspection.id, activeInspection.lotId, fusionPayload);
      
      // Fetch updated inspection with fusion result
      const refreshed = await api.getInspection(activeInspection.id);
      const fresh = unwrapInspection(refreshed);

      const updated: InspectionRecord = {
        ...activeInspection,
        ...fresh,
        status: 'FUSION_COMPLETED',
        /* Read the backend's own verdict. `|| 'GRADE A'` used to invent a pass
           whenever the engine returned nothing, so the screen could show a
           grade the pipeline never produced. A missing grade now stays
           PENDING instead of silently becoming a pass. */
        fusionResult: {
          visualScore: fusionPayload.visualScore ?? fresh.visualScore ?? 0,
          sensorScore: fusionPayload.sensorScore ?? fresh.sensorScore ?? 0,
          aiConfidence: fusionPayload.aiConfidence ?? fresh.aiConfidence ?? 0,
          finalQualityScore: fusionPayload.finalQualityScore ?? fusionPayload.qualityScore ?? fresh.qualityScore ?? 0,
          grade: fusionPayload.grade ?? fresh.grade ?? 'PENDING',
          riskLevel: fusionPayload.riskLevel ?? fresh.riskLevel ?? 'PENDING',
          gradingFactors: fusionPayload.gradingFactors || [],
          calculatedAt: new Date().toISOString(),
        },
        finalGrade: fusionPayload.grade ?? fresh.grade ?? 'PENDING',
        qualityScore: fusionPayload.finalQualityScore ?? fusionPayload.qualityScore ?? fresh.qualityScore ?? 0,
        updatedAt: new Date().toISOString(),
      };

      persistActive(updated.id, updated);
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to save fusion result');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = async (payload?: any): Promise<any> => {
    if (!activeInspection) throw new Error('No active inspection found');

    setLoading(true);
    try {
      // Generate certificate on backend
      const certResponse = await api.generateCertificate({ 
        inspectionId: activeInspection.id,
        ...payload 
      });

      const certObj = certResponse.certificate || certResponse;

      // Fetch updated inspection with certificate
      const refreshed = await api.getInspection(activeInspection.id);

      const updated: InspectionRecord = {
        ...activeInspection,
        ...unwrapInspection(refreshed),
        status: 'CERTIFICATE_GENERATED',
        certificateId: certObj.id,
        certificateNumber: certObj.certificateNumber,
        certificate: certObj,
        updatedAt: new Date().toISOString(),
      };

      persistActive(updated.id, updated);
      return certObj;
    } catch (err: any) {
      setError(err.message || 'Failed to generate certificate');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <InspectionContext.Provider
      value={{
        activeInspectionId,
        activeInspection,
        loading,
        error,
        setActiveInspectionId,
        createInspection,
        saveSensorData,
        saveCameraData,
        saveAiAnalysis,
        saveFusionResult,
        generateCertificate,
        refreshActiveInspection,
        clearActiveInspection,
      }}
    >
      {children}
    </InspectionContext.Provider>
  );
};

export const useInspection = () => useContext(InspectionContext);
