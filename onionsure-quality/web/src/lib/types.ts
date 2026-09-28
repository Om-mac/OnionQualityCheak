export interface Detection {
  id: string;
  class: 'healthy' | 'damaged' | 'rotten' | 'sprouted' | 'undersized' | string;
  label: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  diameter_cm?: number;
  weight_g?: number;
  severity?: number;
}

export interface DetectionResponse {
  success: boolean;
  mode: string;
  total: number;
  counts: Record<string, number>;
  percentages: Record<string, number>;
  visionScore: number;
  defect_rate: number;
  confidence: number;
  detections: Detection[];
  statistics?: {
    total_detected: number;
    defect_rate: number;
    vision_score: number;
    confidence: number;
  };
  image_dimensions?: { width: number; height: number };
  annotated_image_base64?: string;
  image?: string;
  error?: string;
}
