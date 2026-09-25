# DrishtiAI

DrishtiAI is an offline-first, AI-powered retinal screening platform designed for grassroots health workers (e.g., ASHA workers) to perform Diabetic Retinopathy screening in rural and low-resource settings.

## Features

- **Offline-first Architecture**: Designed for low-bandwidth environments. Data is cached locally and synchronized with central portals when a network connection is available.
- **Explainable AI**: Features integrated AI analysis with attention heatmaps to identify and explain high-risk retinal conditions, enabling clear clinical handoffs.
- **Multilingual Support**: Native support for English, Hindi, and Marathi, making it accessible to local healthcare workers.
- **Comprehensive Patient Journey**: Manages the complete workflow from patient registration and retinal image capture to AI analysis, risk identification, and clinical referrals.

## Tech Stack

- **Frontend**: Next.js (React), Tailwind CSS, Shadcn UI
- **Machine Learning / Backend**: Python (`ml_service` directory)

## Getting Started

First, install the dependencies for the web application:

```bash
npm install
# or
pnpm install
# or
yarn install
```

Then, run the development server:

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Machine Learning Service

The `ml_service` directory contains the Python-based AI models and utilities for image quality assessment, retinal fundus analysis, and generating Grad-CAM heatmaps. Refer to `ml_service/README.md` for specific instructions on setting up and running the ML API.