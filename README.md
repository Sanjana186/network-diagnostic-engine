# Network Diagnostic Engine

A full-stack web application designed to dissect and analyze HTTP/HTTPS request latencies across multiple networking stages (DNS, TCP, TLS, TTFB, and Content Download).

## Project Structure

```text
network-diagnostic-engine/
├── client/                     # Frontend Application
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── layout/         # Header, Footer, Page shell
│   │   │   └── ui/             # Buttons, Cards, Inputs, Badges
│   │   ├── features/           # Feature-specific modules
│   │   │   ├── diagnostics/    # URL Form, Metric Cards, Waterfall Chart
│   │   │   └── history/        # LocalStorage test history (V2)
│   │   ├── services/           # Backend API integration
│   │   ├── utils/              # Formatting and validation helpers
│   │   ├── App.jsx             # Root React component
│   │   ├── index.css           # Tailwind CSS directives
│   │   └── main.jsx            # React DOM entrypoint
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                     # Backend API & Network Prober
│   ├── src/
│   │   ├── controllers/        # Request/response handlers
│   │   ├── middleware/         # SSRF validation & security
│   │   ├── services/           # Low-level network timing & heuristics
│   │   ├── utils/              # Timing utilities
│   │   └── server.js           # Express app setup & routes
│   ├── .env                    # Environment configuration
│   └── package.json
│
└── README.md
```

## Getting Started

### 1. Server Setup
```bash
cd server
npm install
npm run dev
```
The server will run on `http://localhost:5000`.

### 2. Client Setup
```bash
cd client
npm install
npm run dev
```
The client will run on `http://localhost:5173`.
