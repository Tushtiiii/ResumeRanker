# AI-Powered Candidate Intelligence Platform — Backend Server

Node.js and Express REST API backend powering candidate parsing, authentication, MongoDB candidate persistence, AI inference via Google Gemini, and Python ranking engine execution.

---

## 🚀 Key Features

- **Candidate Intelligence API**: Endpoints for candidate profiles, job postings, resume processing, and custom candidate discovery.
- **Python Ranker Integration Bridge**: Executes the offline Python 5D candidate ranking pipeline directly from Express services (`pythonRanker.js`).
- **AI-Powered Parsing & Matching**: Utilizes Google Gemini (`@google/generative-ai`, `@langchain/google-genai`) for resume feature extraction and semantic matching.
- **Authentication & Authorization**: Passport.js JWT and Google OAuth2 integration with password hashing via `bcryptjs`.
- **File Ingestion**: File upload handling via `multer`, parsing for PDF (`pdf-parse`) and DOCX (`mammoth`), plus Cloudinary storage integration.
- **Security & Reliability**: Express Rate Limiting, Helmet headers, CORS policies, and input validation via `express-validator`.

---

## 🛠️ Technical Stack

- **Runtime**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **AI & ML Integration**: Google Generative AI (Gemini), LangChain, Voyage AI
- **Authentication**: Passport.js (JWT, Google OAuth 2.0), JSON Web Tokens
- **File Parsing**: `pdf-parse`, `mammoth`, `llama-parse`
- **Utility**: `morgan`, `dotenv`, `uuid`, `cloudinary`

---

## 📦 Getting Started

### Prerequisites

- Node.js (v18.x or later)
- MongoDB running locally or a MongoDB Atlas URI
- Python 3.11+ (for Python ranking bridge dependencies)

### Installation & Setup

1. Navigate to the `server` folder:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment Configuration:
   Copy `.env.example` to `.env` and configure your credentials:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/resumeranker
   JWT_SECRET=your_jwt_secret_here
   GEMINI_API_KEY=your_gemini_api_key_here
   CLOUDINARY_URL=your_cloudinary_url_here
   ```

4. Seed Demo Data (Optional):
   ```bash
   npm run seed:demo
   ```

5. Start the Server:
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

---

## 🔌 API Routes Overview

- `/api/auth` — Registration, Login, Google OAuth, Profile retrieval
- `/api/candidate` — Candidate profile management & search
- `/api/job` — Job posting creation, management, and candidate matching
- `/api/resume` — Resume file upload, parsing, and structured JSON extraction
- `/api/ranker` — Trigger Python ranking pipeline, submission generation & retrieval
- `/api/ai` — Google Gemini AI feature extraction & matching utilities
- `/api/admin` — Administrative metrics, user management, and audit logs

---

## 📜 Available Scripts

- `npm run dev` — Starts server in development mode using `nodemon`
- `npm start` — Starts server in production mode (`node src/index.js`)
- `npm run seed:demo` — Seeds MongoDB database with mock candidate and job records
- `npm test` — Executes native Node test suite (`node --test`)
