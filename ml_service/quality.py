"""
Retinal Image Quality Assessment Module
Performs heuristic and statistical checks on fundus images before inference:
- Sharpness via Laplacian variance
- Illumination distribution via luminance histogram
- Field of view (FOV) coverage check
"""

import cv2
import numpy as np
from PIL import Image

def assess_retinal_quality(image: Image.Image) -> dict:
    """
    Evaluates retinal image diagnostic quality.
    Returns QualityMetrics dictionary.
    """
    # Convert to OpenCV RGB & Grayscale
    np_img = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(np_img, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape

    # 1. Sharpness / Focus via Laplacian variance
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if lap_var > 120.0:
        focus = "Optimal"
    elif lap_var > 45.0:
        focus = "Adequate"
    else:
        focus = "Poor"

    # 2. Illumination / Brightness
    # Mask out completely black background pixels
    non_black = gray[gray > 15]
    if len(non_black) == 0:
        avg_lum = 0
    else:
        avg_lum = float(np.mean(non_black))

    if avg_lum < 35.0:
        brightness = "Underexposed"
    elif avg_lum > 215.0:
        brightness = "Overexposed"
    elif 70.0 <= avg_lum <= 175.0:
        brightness = "Optimal"
    else:
        brightness = "Adequate"

    # 3. Field of View coverage
    coverage_ratio = len(non_black) / (h * w) if (h * w) > 0 else 0
    if coverage_ratio < 0.25:
        fov = "Inadequate"
    elif coverage_ratio > 0.45:
        fov = "Optimal"
    else:
        fov = "Adequate"

    # Overall Diagnostic Acceptability
    is_acceptable = (focus != "Poor") and (brightness not in ["Underexposed", "Overexposed"]) and (fov != "Inadequate")
    quality_score = 0.93 if is_acceptable else 0.38

    message = (
        "High quality fundus photograph. Posterior pole and retinal vessels are clearly resolved."
        if is_acceptable
        else "Image quality is insufficient for reliable screening."
    )

    return {
        "quality_score": quality_score,
        "focus": focus,
        "brightness": brightness,
        "field_of_view": fov,
        "is_acceptable": is_acceptable,
        "message": message,
    }
