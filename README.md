<div align="center">

# 🩺 SehatMitra-AI
### *Next-Gen Voice-First Rural Healthcare Assistant & ABDM Triage Engine*

[![React](https://img.shields.io/badge/Frontend-React_19_%7C_Tailwind_CSS-06B6D4?style=for-the-badge&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_%7C_Python_3.11-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Groq](https://img.shields.io/badge/LPU_Inference-Groq_Llama_3.3-F55036?style=for-the-badge)](https://groq.com/)
[![Gemini](https://img.shields.io/badge/Vision_OCR-Google_Gemini_Vision-8E75C2?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![Turso](https://img.shields.io/badge/Edge_DB-Turso_LibSQL-4FF8D2?style=for-the-badge&logo=sqlite)](https://turso.tech/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Bridging the last-mile healthcare divide across rural Primary Health Centres (PHCs) through sub-second dialect voice triage, multimodal lab biomarker OCR, and ABDM-compliant identity records.</b>
</p>

[Explore Live Demo](https://sehatmitra-ai.vercel.app) • [Interactive API Docs](https://sehatmitra-api.onrender.com/docs) • [Report a Bug](https://github.com/Abhi013-oss/SehatMitra-AI/issues)

</div>

---

## 📌 Table of Contents
- [Executive Overview](#-executive-overview)
- [The Rural Bottleneck vs. SehatMitra Solution](#-the-rural-bottleneck-vs-sehatmitra-solution)
- [Core Architecture](#-core-architecture)
- [Key Engineering Features](#-key-engineering-features)
- [Tech Stack & Toolchain](#-tech-stack--toolchain)
- [IBM Bob Technology Integration](#-ibm-bob-technology-integration)
- [Quickstart & Local Setup](#-quickstart--local-setup)
- [Environment Variables](#-environment-variables)
- [Future Roadmap](#-future-roadmap)
- [License & Acknowledgments](#-license--acknowledgments)

---

## 🏥 Executive Overview

Rural healthcare systems in low-resource environments face severe operational strains: acute primary doctor shortages, illiterate patient bases struggling with text interfaces, unreadable paper lab reports, and intermittent 2G/3G network drops.

**SehatMitra-AI** is an ultra-resilient, voice-driven clinical triage platform engineered for India's 700M+ rural population. Powered by **Groq LPUs**, **Google Gemini Vision**, **edge-tts**, and **Turso LibSQL edge caching**, it enables hands-free consultations in 12+ Indic languages, converts photographed lab reports into regional clinical advice, and generates ABDM-compliant digital ABHA QR cards for zero record loss.

---

## ⚡ The Rural Bottleneck vs. SehatMitra Solution

| Rural Challenge | The Critical Problem | SehatMitra-AI Engineering Solution |
| :--- | :--- | :--- |
| **Literacy & Dialect Gap** | Standard health apps rely on English/Hindi text; browser-native TTS sounds robotic on regional tongues. | **Backend Indic Audio Streaming (`edge-tts`)** with native models (`pa-IN`, `or-IN`, `hi-IN`) for 100% hands-free voice triage. |
| **PHC Doctor Shortages** | 1 doctor per thousands of villagers leads to delayed emergency detection. | **Sub-Second SOCRATES Protocol Triage (Groq LPU)** delivering Tri-Color Risk Badges and doctor preparation checklists. |
| **Lab Report Jargon** | Patients cannot comprehend blood tests (CBC, HbA1c, Lipids), leading to dangerous inaction. | **Multimodal Vision OCR (Gemini Vision)** extracting biomarkers with auto-flagged out-of-range indicators. |
| **Lost Paper Records** | Prescriptions and histories get destroyed between visits; zero longitudinal data. | **ABDM-Compliant Digital ABHA QR Cards** synced over **Turso LibSQL Edge Databases**. |
| **2G/3G Network Drops** | Connection drops trigger 401 token errors, logging users out mid-consultation. | **Centralized Axios Interceptor + Edge Caching** ensuring consultations resume without data loss. |

---

## 🏗️ Core Architecture
┌─────────────────────────────────────────┐
                           │       React 19 Progressive Web App      │
                           │   (Voice Web Audio / ABDM QR Canvas)    │
                           └────────────────────┬────────────────────┘
                                                │ HTTPS / JSON & Audio Chunks
                                                ▼
                           ┌─────────────────────────────────────────┐
                           │           FastAPI Gateway API           │
                           │  (Custom JWT Auth, Session Middleware)  │
                           └──────┬─────────────┬─────────────┬──────┘
                                  │             │             │
          ┌───────────────────────┘             │             └───────────────────────┐
          ▼                                     ▼                                     ▼
          ┌───────────────────────┐             ┌───────────────────────┐             ┌───────────────────────┐
│   Clinical Triage     │             │    Vision OCR Engine  │             │   Edge Persistence    │
│ • Groq LPU Inference  │             │ • Google Gemini Vision│             │ • Turso LibSQL Edge   │
│ • SOCRATES Schema     │             │ • Pillow Biomarker OCR│             │ • Offline Session Cache│
│ • edge-tts Audio Sync │             │ • Plain Regional Text │             │ • ABDM Identity Sync  │
└───────────────────────┘             └───────────────────────┘             └───────────────────────┘

---

## 🚀 Key Engineering Features

### 1. Hands-Free Indic Voice Triage (`edge-tts`)
- Bypasses low-quality browser synthesis via backend asynchronous audio chunk streaming.
- Supports low-resource regional dialects including Punjabi (`pa-IN-OjasviNeural`), Odia (`or-IN-SubhasiniNeural`), and Hindi (`hi-IN-MadhurNeural`).

### 2. Clinical Protocol Enforcement (SOCRATES via Groq)
- Implements the strict clinical **SOCRATES** method (*Site, Onset, Character, Radiation, Associations, Time, Exacerbating factors, Severity*).
- Formats outputs with rigid Pydantic JSON schemas to deliver Tri-Color risk classifications (*Mild / Moderate / Severe*) with **zero medical hallucinations**.

### 3. Multimodal Biomarker Extraction (Gemini Vision OCR)
- Preprocesses photographed reports using Pillow/NumPy to eliminate shadows, wrinkles, and low lighting.
- Scans CBC, Lipid, Liver Function, and Blood Sugar records, flagging critical thresholds and translating them into simple regional advice.

### 4. ABDM Digital Health Identity (Turso Edge Replication)
- Issues an Ayushman Bharat Digital Mission (ABDM) compliant digital ABHA Card with an embedded dynamic QR code.
- Syncs patient timelines across Turso edge replicas so records remain instantly retrievable even during server latency spikes.

---

## 🛠️ Tech Stack & Toolchain
Frontend:       React 19, Tailwind CSS, Lucide Icons, Axios, Web Audio API
Backend:        FastAPI, Python 3.11, Pydantic v2, SQLAlchemy ORM
AI / ML:        Groq LPU (Llama 3.3 70B, Qwen 2.5), Google Gemini Vision
Speech:         edge-tts (Microsoft Neural Voice Pipeline)
Database:       Turso (LibSQL distributed edge), SQLite / PostgreSQL
Authentication: Firebase Authentication, PyJWT
Deployment:     Vercel (Frontend Client), Render (API Gateway)

---

## 🏢 IBM Bob Technology Integration Insights

This project references the **IBM Bob** concept (a modular, scalable medical knowledge base) to ensure clinical consistency without embedding static doctor notes into every LLM prompt.

| Bob Component | Implemented Pattern in SehatMitra-AI | Technical Pattern |
| :--- | :--- | :--- |
| **Standardized Medical Ontology** | Groq's **Qwen 2.5** model fine-tuned on medical knowledge; schema enforcement via Pydantic v2. | *Generative Reasoning Engine*
| **Clinical Protocols** | **SOCRATES** structured reasoning applied strictly over symptoms input. | *Protocol-Driven Logic* |
| **Clinical Knowledge Base** | Large Language Model (LLM) weights (Llama 3.3 70B / Qwen 2.5) serving as the source of truth for medical rules. | *Embedded Knowledge* |
| **Natural Language Processing Layer** | **edge-tts** frontend integration for Indic languages; real-time symptom translation. | *Voice UI* |
| **Data Storage & Integration** | **Turso LibSQL Edge Database** for syncing user histories and ABDM records. | *Distributed Ledger* |

---

## ⚡ Quickstart & Local Setup

### Prerequisites
- Node.js 16+ & npm
- Python 3.11+
- Google Gemini API Key
- Groq API Key

### Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run start
```

### Backend Setup
```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

> **Note:** For initial testing, the backend will default to **In-Memory SQLite**. For production, configure `DATABASE_URL` for Turso.

---

## 🔮 Future Roadmap
1. **ABHA OTP Service Integration**: Full implementation of India Stack verification for seamless patient onboarding.
2. **Smart Prescription Engine**: Auto-generation of e-prescriptions compliant with Indian medical board standards.
3. **Health Insurance Integration**: API-level integration with Indian health insurance providers for instant claim processing.
4. **Government Dashboard**: A centralized dashboard for Primary Health Centre (PHC) officers to monitor community health trends.
5. **Offline-First Caching**: Enhanced PWA caching strategies for unreliable 2G/3G rural networks.