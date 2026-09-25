# DrishtiAI - Python ML Inference Microservice

This microservice provides PyTorch-based deep learning inference and Grad-CAM explainability for diabetic retinopathy screening.

## Architecture

```
Next.js Frontend
   │
   ▼
Next.js Backend Route (/api/screening/analyze)
   │ (HTTP POST with timeout & circuit breaker)
   ▼
Python FastAPI Service (ml_service/main.py :8000)
   ├── Quality Assessment (quality.py - Laplacian focus, illumination, FOV)
   ├── PyTorch Classifier (model.py - 5-class ICDR ResNet/ViT)
   └── Grad-CAM Generator (gradcam.py - gradient-weighted activation maps)
```

## Setup & Running

```bash
cd ml_service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Environment Variable in Next.js

Add to `.env.local`:
```bash
ML_SERVICE_URL=http://localhost:8000/predict
```

When `ML_SERVICE_URL` is set, the Next.js API route proxies to this live Python service. If the service is offline or unset, Next.js falls back to the deterministic mock engine following the identical API contract.
