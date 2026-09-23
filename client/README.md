# Candidate Intelligence & Recruitment Platform — Frontend Client

A modern, high-performance React web application for recruiter analytics, candidate discovery, resume evaluation, and AI-powered ranking visualizations.

---

## 🚀 Features

- **Recruiter Dashboard**: Comprehensive candidate search, filtering, and 5D composite scoring visualization.
- **Interactive Scoring Breakdown**: Visual charts powered by Recharts detailing Skill Relevance, Experience Match, Prestige, Location/Work Mode, and Availability.
- **Resume Upload & Parsing**: Drag-and-drop resume ingestion supporting PDF, DOCX, and text formats with real-time feedback.
- **Candidate Portal**: Profile management, application tracking, and automated matching highlights.
- **Role-Based Views**: Separate workflows and analytics for recruiters, candidates, and system administrators.
- **Dark/Light Theming & Modern UI**: Built with Material UI (MUI), Tailwind CSS, Emotion, and Framer Motion micro-animations.

---

## 🛠️ Tech Stack

- **Framework**: React 19, Vite
- **State Management**: Redux Toolkit, React Redux
- **Data Fetching**: Axios, TanStack React Query
- **UI & Styling**: Material UI (MUI) v9, Tailwind CSS v4, Emotion, Tailwind-Merge
- **Visualization**: Recharts
- **Animations**: Motion (Framer Motion)
- **Routing**: React Router v7
- **Linter & Code Quality**: Oxlint

---

## 📦 Getting Started

### Prerequisites

- Node.js (v18.x or later)
- npm (v9.x or later)

### Installation

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the `client` root (if needed):
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

4. Start Development Server:
   ```bash
   npm run dev
   ```

5. Build for Production:
   ```bash
   npm run build
   ```

---

## 📁 Project Structure

```
client/
├── public/              # Static public assets
├── src/
│   ├── api/             # Axios instances and API client services
│   ├── assets/          # Images, logos, and vector assets
│   ├── components/      # Reusable UI components (Navbar, Modals, Charts, Cards)
│   ├── pages/           # Page routes (Landing, Auth, Candidate, Recruiter)
│   ├── store/           # Redux store slices and state management
│   ├── App.jsx          # Main App component & Router config
│   ├── main.jsx         # Application entry point
│   └── index.css        # Global CSS & Tailwind directives
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
└── vite.config.js       # Vite configuration
```

---

## 📜 Available Scripts

- `npm run dev` — Starts local Vite development server
- `npm run build` — Compiles production bundle
- `npm run preview` — Previews production build locally
- `npm run lint` — Runs `oxlint` for high-speed code linting
