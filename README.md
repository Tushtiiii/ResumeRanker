# Intelligent Candidate Discovery & Ranking Platform

An end-to-end AI-powered recruitment candidate discovery, resume parsing, and multi-dimensional ranking platform. Combines a high-throughput, 100% offline CPU Python ranking engine with a Node.js Express REST API backend and a modern React Vite recruiter dashboard.

---

## 🏗️ Repository Architecture

```
Resumeranker/
├── README.md                   # System Architecture & Overview Documentation
├── EVALUATION.md               # Mathematical Formulation & Scoring Specification
├── rank.py                     # High-Speed Offline CPU Python Candidate Ranker
├── evaluate.py                 # Ranking Quality, Audit & Benchmarking Engine
├── candidate_schema.json       # JSON Schema definition for candidate records
├── sample_candidates.json      # Sample input dataset for validation
├── requirements.txt            # Python dependencies
│
├── client/                     # React 19 + Vite + MUI + Tailwind Client App
│   ├── src/                    # Components, Redux Store, Pages, and API services
│   ├── README.md               # Client documentation
│   └── package.json            # Client dependencies and build scripts
│
└── server/                     # Node.js + Express + MongoDB REST API Backend
    ├── src/                    # Controllers, Models, Routes, Services & Python Bridge
    ├── README.md               # Server documentation
    └── package.json            # Server dependencies and launch scripts
```

---

## 🔥 Key Features

### 🎯 1. 5-Dimensional Composite Scoring Engine (`rank.py`)
Multi-criteria candidate evaluation algorithm running fully offline on CPU:
- **Skills Relevance (35%)**: Direct matching, synonym expansion, domain relevance.
- **Experience Match (25%)**: Role duration, career progression, recency weighting.
- **Prestige & Evidence (20%)**: Institutional reputation, open-source signals, verified metrics.
- **Location & Work Mode (10%)**: Remote preferences, timezone fit, relocation willingness.
- **Availability & Velocity (10%)**: Notice period, active status, job-seeking velocity.

### 🛡️ 2. Honeypot & Anomaly Detection Engine
- Detects skill inflation, keyword stuffing, and unreasonable experience duration claims.
- Penalizes unverified profiles, applicant spam rings, prompt injection traps, and incomplete resumes.

### 🤖 3. AI-Powered Resume Parsing & Backend Services (`server/`)
- Powered by Google Gemini (`@google/generative-ai` & `@langchain/google-genai`).
- Extracts structured entity models from raw PDF and DOCX files.
- REST API bridging frontend user interactions to the offline Python ranking engine (`pythonRanker.js`).

### 📊 4. Interactive Recruiter Analytics Dashboard (`client/`)
- Real-time score breakdown visualizations with Recharts.
- Drag-and-drop resume upload and live evaluation feeds.
- Candidate comparison, filtering, and export capability.

---

## ⚡ Quick Start Guide

### 1. Python Ranking Pipeline CLI

Run the offline candidate ranker on candidate datasets:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run candidate ranker
python rank.py --candidates ./candidates.jsonl --out ./submission.csv --top_n 100

# Validate submission CSV against strict competition schema
python server/validate_submission.py submission.csv

# Execute evaluation audit & quality metrics
python evaluate.py --candidates ./candidates.jsonl --submission ./submission.csv
```

---

### 2. Backend REST API Server (`server/`)

```bash
cd server
npm install

# Configure environment (copy .env.example to .env)
cp .env.example .env

# Seed demo dataset into MongoDB (optional)
npm run seed:demo

# Launch development server
npm run dev
```

---

### 3. Frontend Client App (`client/`)

```bash
cd client
npm install

# Launch Vite development server
npm run dev
```

---

### 🐳 4. Docker & Docker Compose Deployment

Run the entire platform (MongoDB, Node.js + Python Backend, React Frontend) in containerized environment:

```bash
# Build and run all services using Docker Compose
docker-compose up --build

# Access services:
# Frontend Client: http://localhost:8080
# Backend API:    http://localhost:5000
# MongoDB:        mongodb://localhost:27017
```

---

## 📝 Documentation Links

- 📖 [`client/README.md`](file:///c:/Projects/Resumeranker/client/README.md) — Frontend setup, structure, and available scripts.
- 📖 [`server/README.md`](file:///c:/Projects/Resumeranker/server/README.md) — Backend API endpoints, Mongoose schemas, and AI integration.
- 📖 [`EVALUATION.md`](file:///c:/Projects/Resumeranker/EVALUATION.md) — Scoring formulas, penalization equations, and submission rules.

