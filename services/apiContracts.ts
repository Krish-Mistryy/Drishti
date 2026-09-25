/**
 * DrishtiAI - Screening API Contracts
 * Defines strict TypeScript interfaces for API communication between:
 * Frontend <-> Next.js API Gateway <-> Python FastAPI ML Microservice
 */

export type DRGrade = 'no_dr' | 'mild' | 'moderate' | 'severe' | 'proliferative';
export type DRGradeLabel = 'No DR' | 'Mild DR' | 'Moderate DR' | 'Severe DR' | 'Proliferative DR';
export type RiskLevel = 'Low' | 'Moderate' | 'High';
export type EyeSide = 'OD' | 'OS';

export interface FindingItem {
  type: string;
  confidence: number;
  description?: string;
  location?: string;
}

export interface InteractiveFindingItem {
  id: string;
  type: string;
  label: string;
  confidence: number;
  location: string;
  markerColor: string;
  x: number; // Percentage 0-100 from left
  y: number; // Percentage 0-100 from top
  radius: number; // Pixels
  explanation: string;
  contributionRationale: string;
}

export interface HeatmapHotspotItem {
  x: number;
  y: number;
  radius: number;
  intensity: 'high' | 'moderate' | 'low';
  findingType: string;
}

export interface QualityMetricsItem {
  qualityScore: number;
  focus: 'Optimal' | 'Adequate' | 'Poor';
  brightness: 'Optimal' | 'Adequate' | 'Underexposed' | 'Overexposed' | 'Poor';
  fieldOfView: 'Optimal' | 'Adequate' | 'Inadequate';
  isAcceptable: boolean;
  message?: string;
}

/**
 * POST /api/screening/analyze - Request Payload
 */
export interface ScreeningAnalyzeRequest {
  patientId: string;
  eye: EyeSide;
  retinalImage: string; // Base64 or Data URL
  retinalImageLeft?: string; // Optional companion left eye
  clientMetadata?: {
    appVersion?: string;
    requestedGradeSimulation?: DRGrade;
    simulateError?: 'invalid_image' | 'low_quality' | 'timeout' | 'unavailable' | 'failure';
  };
}

/**
 * POST /api/screening/analyze - Successful Response
 */
export interface ScreeningAnalyzeResponse {
  screeningId: string;
  severity: DRGrade;
  severityLabel: DRGradeLabel;
  confidence: number;
  riskLevel: RiskLevel;
  imageQuality: number;
  qualityMetrics: QualityMetricsItem;
  findings: FindingItem[];
  explanation: {
    summary: string;
    method: string;
    attentionMapDataUrl?: string;
    hotspots: HeatmapHotspotItem[];
    interactiveFindings: InteractiveFindingItem[];
  };
  recommendation: {
    action: 'routine_annual' | 'regular_followup' | 'ophthalmologist_review' | 'urgent_retina_specialist' | 'emergency_intervention';
    label: string;
    details: string;
    referralRequired: boolean;
    referralFacility: string;
    referralUrgency: string;
    clinicalReviewNote: string;
  };
  modelVersion: string;
  analyzedAt: string;
}

/**
 * API Error Codes
 */
export type ScreeningErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_IMAGE'
  | 'LOW_IMAGE_QUALITY'
  | 'INFERENCE_FAILURE'
  | 'ML_SERVICE_TIMEOUT'
  | 'ML_SERVICE_UNAVAILABLE';

/**
 * Structured Error Response
 */
export interface ScreeningErrorResponse {
  error: {
    code: ScreeningErrorCode;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    suggestedAction?: string;
  };
}
