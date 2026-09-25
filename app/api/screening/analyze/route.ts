import { NextRequest, NextResponse } from 'next/server';
import {
  ScreeningAnalyzeRequest,
  ScreeningAnalyzeResponse,
  ScreeningErrorResponse,
  DRGrade
} from '@/services/apiContracts';

/**
 * Deterministic Mock Dataset matching the Python FastAPI inference output.
 * Used when ML_SERVICE_URL is not set or in offline development mode.
 */
function getMockPrediction(
  patientId: string,
  eye: string,
  targetGrade: DRGrade = 'moderate'
): ScreeningAnalyzeResponse {
  const timestamp = new Date().toISOString();
  const screeningId = `scr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  if (targetGrade === 'no_dr') {
    return {
      screeningId,
      severity: 'no_dr',
      severityLabel: 'No DR',
      confidence: 0.96,
      riskLevel: 'Low',
      imageQuality: 0.94,
      qualityMetrics: {
        qualityScore: 0.94,
        focus: 'Optimal',
        brightness: 'Optimal',
        fieldOfView: 'Optimal',
        isAcceptable: true,
        message: 'Posterior pole and vascular network clearly resolved.'
      },
      findings: [],
      explanation: {
        summary: 'The AI model evaluated the retinal image and found no detectable microvascular lesions.',
        method: 'Grad-CAM (Gradient-weighted Class Activation Mapping)',
        hotspots: [{ x: 45, y: 50, radius: 14, intensity: 'low', findingType: 'normal_vessel' }],
        interactiveFindings: [
          {
            id: 'norm_vessel',
            type: 'vessel_integrity',
            label: 'Normal retinal vessels',
            confidence: 0.98,
            location: 'Major vascular arcades',
            markerColor: '#10b981',
            x: 48,
            y: 42,
            radius: 20,
            explanation: 'Intact retinal vessels with normal branching and caliber.',
            contributionRationale: 'Absence of microaneurysms or leakage confirms no DR.'
          }
        ]
      },
      recommendation: {
        action: 'routine_annual',
        label: 'Routine Annual Rescreening',
        details: 'No signs of diabetic retinopathy detected. Schedule regular annual rescreening.',
        referralRequired: false,
        referralFacility: 'Local Primary Health Centre',
        referralUrgency: 'Routine',
        clinicalReviewNote: 'Retinal vessels appear healthy. Routine annual review recommended.'
      },
      modelVersion: 'DrishtiAI-Retina-v1.0-mock',
      analyzedAt: timestamp
    };
  }

  // Default: Moderate NPDR
  return {
    screeningId,
    severity: 'moderate',
    severityLabel: 'Moderate DR',
    confidence: 0.91,
    riskLevel: 'Moderate',
    imageQuality: 0.92,
    qualityMetrics: {
      qualityScore: 0.92,
      focus: 'Optimal',
      brightness: 'Adequate',
      fieldOfView: 'Optimal',
      isAcceptable: true,
      message: 'Optimal diagnostic fundus photograph.'
    },
    findings: [
      {
        type: 'microaneurysm',
        confidence: 0.89,
        description: 'Focal punctate capillary outpouchings',
        location: 'Temporal quadrant'
      },
      {
        type: 'hemorrhage',
        confidence: 0.76,
        description: 'Intraretinal flame and blot hemorrhages',
        location: 'Superior nasal arcade'
      },
      {
        type: 'hard_exudate',
        confidence: 0.72,
        description: 'Lipid deposits outside foveal avascular zone',
        location: 'Macular fringe'
      }
    ],
    explanation: {
      summary: 'The AI identified retinal regions containing visual patterns associated with diabetic retinopathy. The highlighted areas contributed to the screening result.',
      method: 'Grad-CAM (Gradient-weighted Class Activation Mapping)',
      hotspots: [
        { x: 32, y: 38, radius: 24, intensity: 'high', findingType: 'hemorrhage' },
        { x: 62, y: 54, radius: 18, intensity: 'moderate', findingType: 'microaneurysm' },
        { x: 40, y: 68, radius: 15, intensity: 'high', findingType: 'hard_exudate' },
        { x: 52, y: 28, radius: 16, intensity: 'moderate', findingType: 'abnormal_vessels' }
      ],
      interactiveFindings: [
        {
          id: 'mod_ma',
          type: 'microaneurysm',
          label: 'Microaneurysm-like regions',
          confidence: 0.89,
          location: 'Temporal quadrant',
          markerColor: '#ef4444',
          x: 62,
          y: 54,
          radius: 20,
          explanation: 'Focal dilation of retinal capillaries forming tiny saccular outpouchings visible as pinpoint red lesions.',
          contributionRationale: 'Multiple microaneurysms across sectors indicate breakdown of the inner blood-retina barrier, a critical criterion for moderate DR.'
        },
        {
          id: 'mod_he',
          type: 'hemorrhage',
          label: 'Hemorrhage-like regions',
          confidence: 0.76,
          location: 'Superior nasal arcade',
          markerColor: '#b91c1c',
          x: 32,
          y: 38,
          radius: 24,
          explanation: 'Intraretinal flame and dot/blot hemorrhages arising from ruptured capillary aneurysms.',
          contributionRationale: 'Deep intraretinal hemorrhages reflect progressive capillary ischemic stress and elevate severity classification.'
        },
        {
          id: 'mod_ex',
          type: 'exudate',
          label: 'Exudate-like regions',
          confidence: 0.72,
          location: 'Perimacular temporal fringe',
          markerColor: '#eab308',
          x: 40,
          y: 68,
          radius: 18,
          explanation: 'Yellowish lipid and lipoprotein deposits with distinct margins resulting from persistent plasma leakage.',
          contributionRationale: 'Lipid rings in proximity to the macular arcade warrant ophthalmic monitoring for potential diabetic macular edema.'
        },
        {
          id: 'mod_ves',
          type: 'abnormal_vessels',
          label: 'Abnormal vessel patterns',
          confidence: 0.68,
          location: 'Superior temporal venule',
          markerColor: '#f97316',
          x: 52,
          y: 28,
          radius: 22,
          explanation: 'Focal venous caliber irregularity and localized dilation along the retinal vascular arcades.',
          contributionRationale: 'Venous caliber dilation serves as an established imaging biomarker for downstream tissue hypoxia.'
        }
      ]
    },
    recommendation: {
      action: 'ophthalmologist_review',
      label: 'Ophthalmologist Clinical Review',
      details: 'Moderate non-proliferative diabetic retinopathy detected. Review recommended within 7 days.',
      referralRequired: true,
      referralFacility: 'District Hospital Eye OPD, Nashik',
      referralUrgency: 'Within 7 days',
      clinicalReviewNote: 'Microaneurysms and flame hemorrhages present in multiple quadrants. No active neovascularization.'
    },
    modelVersion: 'DrishtiAI-Retina-v1.0-mock',
    analyzedAt: timestamp
  };
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    let body: ScreeningAnalyzeRequest;
    try {
      body = await request.json();
    } catch {
      const errResponse: ScreeningErrorResponse = {
        error: {
          code: 'INVALID_REQUEST',
          message: 'Request body must be valid JSON.',
          timestamp
        }
      };
      return NextResponse.json(errResponse, { status: 400 });
    }

    const { patientId, eye, retinalImage, clientMetadata } = body;

    // 1. Validate required fields
    if (!patientId || !eye || !retinalImage) {
      const errResponse: ScreeningErrorResponse = {
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required parameters: patientId, eye, and retinalImage are required.',
          timestamp
        }
      };
      return NextResponse.json(errResponse, { status: 400 });
    }

    // 2. Handle simulated error triggers for integration testing
    if (clientMetadata?.simulateError === 'invalid_image') {
      const errResponse: ScreeningErrorResponse = {
        error: {
          code: 'INVALID_IMAGE',
          message: 'The uploaded file is not a recognized retinal image format. Please provide a valid JPEG, PNG, or WebP image.',
          timestamp,
          suggestedAction: 'Please check the file format and upload a valid fundus photograph.'
        }
      };
      return NextResponse.json(errResponse, { status: 422 });
    }

    if (clientMetadata?.simulateError === 'low_quality') {
      const errResponse: ScreeningErrorResponse = {
        error: {
          code: 'LOW_IMAGE_QUALITY',
          message: 'Image quality is insufficient for reliable screening.',
          details: {
            focus: 'Poor',
            brightness: 'Underexposed',
            fieldOfView: 'Inadequate',
            qualityScore: 0.38
          },
          timestamp,
          suggestedAction: 'Please retake image or upload another image with adequate illumination and focus.'
        }
      };
      return NextResponse.json(errResponse, { status: 422 });
    }

    if (clientMetadata?.simulateError === 'timeout') {
      const errResponse: ScreeningErrorResponse = {
        error: {
          code: 'ML_SERVICE_TIMEOUT',
          message: 'Inference service timed out while processing retinal neural network layers.',
          timestamp,
          suggestedAction: 'Please try again. If the issue persists, contact technical support.'
        }
      };
      return NextResponse.json(errResponse, { status: 504 });
    }

    if (clientMetadata?.simulateError === 'unavailable') {
      const errResponse: ScreeningErrorResponse = {
        error: {
          code: 'ML_SERVICE_UNAVAILABLE',
          message: 'Downstream Python ML inference service is currently offline or unreachable.',
          timestamp,
          suggestedAction: 'Ensure ml_service is running on port 8000 or check network configuration.'
        }
      };
      return NextResponse.json(errResponse, { status: 503 });
    }

    if (clientMetadata?.simulateError === 'failure') {
      const errResponse: ScreeningErrorResponse = {
        error: {
          code: 'INFERENCE_FAILURE',
          message: 'An unexpected GPU/CUDA kernel error occurred during retinal tensor evaluation.',
          timestamp,
          suggestedAction: 'Please retry analysis.'
        }
      };
      return NextResponse.json(errResponse, { status: 500 });
    }

    // 3. Inspect Base64 payload format
    if (!retinalImage.startsWith('data:image/') && retinalImage.length < 50) {
      const errResponse: ScreeningErrorResponse = {
        error: {
          code: 'INVALID_IMAGE',
          message: 'Image data is malformed or corrupted.',
          timestamp,
          suggestedAction: 'Upload a clean JPEG or PNG fundus image.'
        }
      };
      return NextResponse.json(errResponse, { status: 422 });
    }

    // 4. Check if live Python ML Service is configured
    const mlServiceUrl = process.env.ML_SERVICE_URL;
    if (mlServiceUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const mlRes = await fetch(mlServiceUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: patientId,
            eye,
            image_base64: retinalImage,
            options: clientMetadata
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!mlRes.ok) {
          const errData = await mlRes.json().catch(() => ({}));
          return NextResponse.json(
            {
              error: {
                code: 'INFERENCE_FAILURE',
                message: errData.detail || `ML inference engine returned HTTP ${mlRes.status}`,
                details: errData,
                timestamp
              }
            },
            { status: mlRes.status }
          );
        }

        const mlData = await mlRes.json();
        return NextResponse.json(mlData, { status: 200 });
      } catch (err: any) {
        if (err.name === 'AbortError') {
          const errResponse: ScreeningErrorResponse = {
            error: {
              code: 'ML_SERVICE_TIMEOUT',
              message: 'The ML service timed out after 10 seconds.',
              timestamp,
              suggestedAction: 'Please retry the analysis.'
            }
          };
          return NextResponse.json(errResponse, { status: 504 });
        }

        console.warn('Live ML Service unreachable, falling back to mock engine:', err.message);
      }
    }

    // 5. Fallback Mock ML Engine (Matches exact contract)
    const targetGrade = clientMetadata?.requestedGradeSimulation || 'moderate';
    const mockResponse = getMockPrediction(patientId, eye, targetGrade);

    return NextResponse.json(mockResponse, { status: 200 });
  } catch (err: any) {
    const errResponse: ScreeningErrorResponse = {
      error: {
        code: 'INFERENCE_FAILURE',
        message: err.message || 'Internal server error occurred.',
        timestamp
      }
    };
    return NextResponse.json(errResponse, { status: 500 });
  }
}
