"""
Pydantic Schemas for DrishtiAI ML Inference Service
Matches the API contract required by the Next.js backend gateway.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class PredictionRequest(BaseModel):
    patient_id: str = Field(..., description="Unique patient identifier")
    eye: str = Field(..., description="OD (Right Eye) or OS (Left Eye)")
    image_base64: str = Field(..., description="Base64 or Data URL encoded retinal fundus image")
    options: Optional[Dict[str, Any]] = Field(default_factory=dict)

class QualityMetrics(BaseModel):
    quality_score: float
    focus: str
    brightness: str
    field_of_view: str
    is_acceptable: bool
    message: Optional[str] = None

class Finding(BaseModel):
    type: str
    confidence: float
    description: Optional[str] = None
    location: Optional[str] = None

class InteractiveFinding(BaseModel):
    id: str
    type: str
    label: str
    confidence: float
    location: str
    marker_color: str
    x: float
    y: float
    radius: float
    explanation: str
    contribution_rationale: str

class HeatmapHotspot(BaseModel):
    x: float
    y: float
    radius: float
    intensity: str
    finding_type: str

class ExplanationPayload(BaseModel):
    summary: str
    method: str = "Grad-CAM (Gradient-weighted Class Activation Mapping)"
    attention_map_base64: str
    hotspots: List[HeatmapHotspot]
    interactive_findings: List[InteractiveFinding]

class RecommendationPayload(BaseModel):
    action: str
    label: str
    details: str
    referral_required: bool
    referral_facility: str
    referral_urgency: str
    clinical_review_note: str

class PredictionResponse(BaseModel):
    screening_id: str
    severity: str
    severity_label: str
    confidence: float
    risk_level: str
    image_quality: float
    quality_metrics: QualityMetrics
    findings: List[Finding]
    explanation: ExplanationPayload
    recommendation: RecommendationPayload
    model_version: str
    analyzed_at: str
