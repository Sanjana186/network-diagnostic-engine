# Network Diagnostic Engine

> **React JS Course Project | 5th Semester Capstone**  
> **Team Size:** 2 Engineers (Engineer 1 & Engineer 2)  
> **Status:** Version 1 (Core Deliverable) & Version 2 (Stretch Goals) Complete  
> **Test Coverage:** 322 Automated Unit Tests (100% Passing)

---

## 1. Project Overview

The **Network Diagnostic Engine** is an engineering-grade network profiling and diagnostic application designed to deconstruct HTTP/HTTPS communications into distinct low-level networking stages:
* **DNS Resolution** (OS nameserver lookup)
* **TCP Connection** (Layer-4 3-way SYN/ACK handshake)
* **TLS Negotiation** (SSL/TLS cryptographic cipher & certificate exchange)
* **Time to First Byte / TTFB** (Server-side processing delay)
* **Content Download & Throughput** (Payload streaming and transfer rate in Kbps/Mbps)

### The Architectural Problem It Solves
Web browsers sandbox client-side JavaScript via the **Same-Origin Policy (SOP)** and high-level networking APIs (`fetch`, `XMLHttpRequest`). Consequently, a browser cannot measure raw socket timing (e.g. isolating TCP SYN/ACK duration from TLS negotiation).

This application solves this constraint using a **hybrid decoupled architecture**:
* **Node.js Express Backend:** Directly hooks into the OS networking stack via native modules (`dns`, `net`, `tls`, `http`, `https`) at nanosecond precision (`process.hrtime.bigint`), guarded by an enterprise-grade SSRF security layer.
* **React 18 Frontend:** An interactive, dark-mode dashboard inspired by the *Making Software* technical manual aesthetic, featuring an oscilloscope-style waterfall timeline, live telemetry cards, 3-run jitter filtering, and historical run comparisons.

---

## 2. Key Features

### ⚡ Telemetry & Measurement (Version 1 Scope)
* **Low-Level Native Socket Probing:** Measures raw socket lifecycle events (`lookup`, `connect`, `secureConnect`, `response`, `end`) without synthetic overhead from third-party HTTP libraries.
* **Nanosecond Precision Timing:** Uses monotonic system clocks (`process.hrtime.bigint`) immune to OS clock drift, leap seconds, and NTP synchronization.
* **Oscilloscope Request Waterfall:** Renders sequential phase offsets on a synchronized timeline with in-bar duration labels and hover inspection drawers.
* **Metric Cards with Calculation Tooltips:** Each card displays millisecond latencies, percentage of total request time, and a small `ⓘ` tooltip explaining the underlying networking math.

### 🛡️ Security & Heuristics (Version 1 Scope)
* **SSRF Prevention Firewall:** Validates target URLs and resolves IPs against dangerous subnets using `ipaddr.js`. Rejects loopback (`127.0.0.0/8`, `::1`), private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), cloud metadata (`169.254.169.254`), and URL credentials.
* **Anti-DNS Rebinding (TOCTOU Mitigation):** Injects validated IPs into custom HTTP socket lookup handlers, ensuring the socket physically connects to the pre-approved IP while preserving TLS SNI (Server Name Indication) and certificate validity.
* **Deterministic Rule-Based Bottleneck Analyzer:** Evaluates latency ratio matrices (DNS $> 100\text{ms}$ or $25\%$, TCP $> 200\text{ms}$, TLS $> 1.5\times$ TCP, TTFB $> 40\%$) to categorize root causes and deliver actionable remedies.

### 🔁 Advanced Features (Version 2 Scope - Completed Ahead of Schedule)
* **Multi-Run Benchmarking (Jitter Filtering):** Executes 3 sequential tests to compute mathematical averages ($\bar{x}$) across all stages, filtering transient Wi-Fi jitter from persistent server delays. Allows toggling between the steady-state Average and individual runs (Cold Run #1 vs. Warm Runs #2 & #3).
* **Persistent Diagnostic History:** Stores past runs locally in browser `localStorage` using a custom React hook (`useDiagnosticHistory`) with delete and clear management.
* **Side-by-Side Run Comparison:** Compares tests of the same domain over time, displaying differential percentage deltas (`+14.2% faster`).
* **Tactile Custom Cursor:** Smooth, dual-layer hardware-accelerated cursor follower with interactive magnetic scaling over clickable elements.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 + Vite | Single Page Application with sub-second HMR |
| **Styling** | Tailwind CSS | Technical blueprint dark mode (`#07080c`) |
| **Icons & Typography** | Lucide React + JetBrains Mono | Monospaced technical telemetry & iconography |
| **Client Testing** | Vitest + React Testing Library | 279 automated unit tests for components & hooks |
| **Backend Framework** | Node.js (v20+) + Express (ES Modules) | High-performance RESTful API |
| **Network Telemetry** | Node native `dns`, `net`, `tls`, `http`, `https` | Raw socket hooks & event-driven timing |
| **Security** | `ipaddr.js` + Custom Socket Lookup | CIDR subnet filtering & anti-DNS rebinding |
| **Server Testing** | Node.js Built-in Test Runner (`node --test`) | 43 automated unit tests for SSRF & heuristics |

---

## 4. Team Work Division

| Area | Engineer 1 (Sanjana K R) | Engineer 2 (Sinchana Ganapati Naik) |
| :--- | :--- | :--- |
| **Backend** | • `utils/timer.js` (hrtime utility)<br>• `services/networkProber.js` (raw sockets)<br>• `controllers/diagnosticController.js`<br>• Anti-DNS rebinding socket lookup | • `middleware/ssrfValidator.js` (SSRF guard)<br>• `services/bottleneckAnalyzer.js` (heuristics)<br>• Unit test suites (`ssrfValidator.test.js`, `bottleneckAnalyzer.test.js`) |
| **Frontend** | • `features/diagnostics/WaterfallChart.jsx`<br>• `features/diagnostics/MetricCards.jsx`<br>• `features/diagnostics/hooks/useDiagnostic.js`<br>• 3-Run repeated testing & jitter filter<br>• `components/ui/CustomCursor.jsx`<br>• Dashboard integration (`App.jsx`) | • `features/diagnostics/UrlForm.jsx`<br>• `features/history/HistoryPanel.jsx`<br>• `features/history/HistoryComparison.jsx`<br>• `features/history/useDiagnosticHistory.js`<br>• LocalStorage wrapper & comparison math |

---

## 5. Project Directory Structure

```text
network-diagnostic-engine/
├── client/                               # Frontend (React 18 + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/
│   │   │       └── CustomCursor.jsx      # Magnetic smooth cursor follower
│   │   ├── features/
│   │   │   ├── diagnostics/
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useDiagnostic.js  # Multi-run state machine & AbortController
│   │   │   │   ├── MetricCards.jsx       # Latency cards with info calculation tooltips
│   │   │   │   ├── UrlForm.jsx           # Controlled input form
│   │   │   │   └── WaterfallChart.jsx    # Sequential offset waterfall timeline
│   │   │   └── history/
│   │   │       ├── HistoryComparison.jsx # Side-by-side run delta comparison
│   │   │       ├── HistoryPanel.jsx      # LocalStorage history manager
│   │   │       ├── historyStorage.js     # Safe browser storage operations
│   │   │       ├── historyUtils.js       # Comparison algorithms & normalization
│   │   │       └── useDiagnosticHistory.js# History custom hook
│   │   ├── App.jsx                       # Root application shell & tab switcher
│   │   ├── index.css                     # Technical blueprint grid & typography
│   │   └── main.jsx                      # React DOM mount point
│   ├── package.json
│   └── vite.config.js
│
├── server/                               # Backend (Node.js + Express)
│   ├── src/
│   │   ├── controllers/
│   │   │   └── diagnosticController.js   # Request handler & prober orchestrator
│   │   ├── middleware/
│   │   │   ├── ssrfValidator.js          # CIDR & IP firewall middleware
│   │   │   └── ssrfValidator.test.js     # 23 SSRF security unit tests
│   │   ├── services/
│   │   │   ├── bottleneckAnalyzer.js     # Deterministic heuristic decision matrix
│   │   │   ├── bottleneckAnalyzer.test.js# 20 heuristic analysis unit tests
│   │   │   └── networkProber.js          # Socket lifecycle prober with lookup hook
│   │   ├── utils/
│   │   │   └── timer.js                  # Nanosecond monotonic timer
│   │   └── server.js                     # Server setup, CORS, and route registration
│   ├── .env.example                      # Environment template
│   └── package.json
│
├── TEAM_DIVISION.md                      # Detailed technical responsibilities
└── README.md                             # Project documentation
```

---

## 6. API Specification

### `POST /api/diagnose`

#### Request Body
```json
{
  "url": "https://example.com"
}
```

#### Success Response (`200 OK`)
```json
{
  "target": {
    "url": "https://example.com",
    "protocol": "https:",
    "hostname": "example.com",
    "ip": "104.20.23.154",
    "port": 443
  },
  "timings": {
    "dnsLookup": 7.40,
    "tcpConnection": 9.87,
    "tlsHandshake": 17.92,
    "ttfb": 19.30,
    "dataTransfer": 2.30,
    "totalDuration": 58.13
  },
  "metrics": {
    "statusCode": 200,
    "contentLengthBytes": 577,
    "throughputKbps": 2006.96,
    "httpVersion": "1.1"
  },
  "analysis": {
    "primaryBottleneck": "ttfb",
    "severity": "optimal",
    "summary": "No bottlenecks were detected by the configured V1 rules.",
    "recommendations": []
  }
}
```

#### Error Response (`403 Forbidden` / `400 Bad Request`)
```json
{
  "error": "SSRF_BLOCKED",
  "message": "The target resolves to a non-public or special-use IP address."
}
```

---

## 7. Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### 1. Start the Backend API Server
```bash
cd "server"
npm install
npm run dev
```
*Runs on `http://localhost:5000`.*

### 2. Start the React Frontend Client
Open a second terminal:
```bash
cd "client"
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 8. Running the Automated Test Suites

### Server Tests (43 Tests)
```bash
cd "server"
npm test
```
*Runs native Node test suites for SSRF protection and bottleneck decision rules.*

### Client Tests (279 Tests)
```bash
cd "client"
npm test
```
*Runs Vitest suites for UrlForm, HistoryPanel, HistoryComparison, custom hooks, and storage operations.*

---

## 9. Capstone Submission Summary

* **Course**: React JS Course Project (5th Sem)
* **Committed Scope**: Version 1 Core Engine (100% Complete)
* **Stretch Goals Delivered**: Version 2 Repeated Testing & Historical Benchmarks (100% Complete)
* **Status**: Complete & Ready for Final Evaluation
