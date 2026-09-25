# IBM Bob Integration & Development Report: SehatMitra-AI

This document outlines how **IBM Bob** was utilized as an AI engineering companion, code scaffolding engine, and architectural workbench during the development of **SehatMitra-AI** (Smart Rural Healthcare Assistant).

---

## 1. Overview & Development Role

IBM Bob was embedded throughout the full-stack development lifecycle to accelerate developer velocity, ensure strict clinical output structures, resolve platform-specific runtime dependencies, and engineer resilience for low-connectivity rural networks (2G/3G).
┌────────────────────────────────────────────────────────────────────────┐
│                          IBM BOB AI WORKBENCH                          │
├───────────────────┬───────────────────┬────────────────────────────────┤
│   Backend Logic   │   Frontend & UI   │    Resilience & Testing        │
│ • FastAPI Routes  │ • React 19 Hooks  │ • Axios 401 Interceptors       │
│ • Pydantic Schema │ • Audio Decoders  │ • Pytest Integration Suites    │
│ • Groq LPU Engine │ • ABHA Card Canvas│ • Synthetic Clinical Datasets  │
└───────────────────┴───────────────────┴────────────────────────────────┘
---

## 2. Core Workflows & Engineering Contributions

### A. Clinical Protocol Validation & Backend Scaffolding
* **Deterministic SOCRATES Data Modeling:** Generated strict Pydantic models enforcing the clinical SOCRATES triage protocol (Site, Onset, Character, Radiation, Associations, Time, Exacerbating factors, Severity), reducing unstructured LLM output (backed by a rule-based fallback and clinician review).
* **FastAPI Microservices Architecture:** Scaffolding asynchronous routes for:
  * Multimodal lab report parsing via Gemini Vision OCR.
  * Low-latency streaming endpoints for Indic voice synthesis via `edge-tts`.
  * Dynamic Groq LPU inference (runtime model discovery across gpt-oss / Qwen / Llama) with fallback routing to Gemini, then a rule-based engine.
* **Edge Persistence Configuration:** Drafted resilient SQLAlchemy session management with automated connection retry mechanisms (`pool_pre_ping=True`) for Turso (LibSQL) edge databases.

### B. Frontend Audio & Identity UI Engineering
* **Indic Voice Streaming Engine:** Built reusable React 19 hooks (`useVoiceConsultation`) managing real-time microphone capture, chunked base64 stream decoding, and audio waveform visualization across 12 Indic languages (e.g., Punjabi `pa-IN`, Odia `or-IN`, Hindi `hi-IN`).
* **Digital ABHA Identity Canvas:** Scaffolded the dynamic QR generation and profile verification component compliant with India's Ayushman Bharat Digital Mission (ABDM).

### C. Dependency Diagnostics & Environment Synchronization
* **Cross-Platform Compatibility:** Diagnosed and resolved build conflicts between asynchronous event loops, `psycopg2-binary`, and `libsql-client` across Linux and Windows environments.
* **Network Interceptor Logic:** Architected a centralized Axios request/response interceptor that attaches the JWT to every call and clears the session only when an auth endpoint returns 401, so a 401 from an optional endpoint doesn't log the user out.

### D. Quality Assurance & Synthetic Health Testing
* **Clinical Triage Test Generation:** Created synthetic patient conversation transcripts and noisy scanned lab test reports (CBC, HbA1c, Lipid profiles) to benchmark the diagnostic risk classifier.
* **Automated Test Suites:** Generated unit and integration tests covering JWT token lifecycles, route validation, and audio streaming payloads.

---

## 3. Toolchain & Tech Stack Matrix

| Project Layer | Core Technology | IBM Bob Role |
| :--- | :--- | :--- |
| **API Gateway** | FastAPI, Python 3.11 | Scaffolding asynchronous endpoints and dependency injection (`deps.py`) |
| **Clinical Triage** | Groq LPU (gpt-oss / Qwen / Llama 3.3, pre-trained — not fine-tuned) | Pydantic JSON schema generation and prompt optimization |
| **Multimodal Vision** | Google Gemini Vision, Pillow | Image normalisation (EXIF orientation, RGB, HEIC/DICOM conversion) and biomarker extraction logic |
| **Voice Streaming** | `edge-tts` (Indic models) | Asynchronous buffer streaming and locale mappings |
| **Storage** | Turso (libSQL), SQLAlchemy | Engine configuration and schema/migration setup |
| **Frontend UI** | React 19, Tailwind CSS | Voice hook design, responsive grid layouts, and ABHA card canvas |
| **Network Resilience**| Axios Interceptors, PyJWT | Offline state caching and session recovery architecture |

---

## 4. Impact on Project Delivery

* **60%+ Reduction in Scaffolding Time:** Automated repetitive boilerplate generation for schemas, APIs, and UI components.
* **Structured Clinical Output:** JSON-mode responses validated against fixed schemas, with a rule-based safety net and human review.
* **Low-Connectivity Support:** PWA caching in the citizen app; offline cache and sync outbox in the ASHA portal.
