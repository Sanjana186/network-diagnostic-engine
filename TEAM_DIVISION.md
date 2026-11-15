# Team Work Division & Technical Specification
**Project:** Network Diagnostic Engine  
**Course:** React JS Course Project (5th Semester Capstone)  
**Team Size:** 2 Engineers  
**Target Timeline:** 4 Weeks (Version 1 Core Deliverable)

---

## 1. Executive Summary & Architectural Overview

The **Network Diagnostic Engine** is a full-stack performance profiling tool designed to dissect HTTP/HTTPS communications into distinct networking stages (DNS lookup, TCP handshake, TLS negotiation, TTFB, and Content Download).

Because browsers enforce security restrictions (CORS, Same-Origin Policy) and do not expose low-level socket timestamps to client-side JavaScript, this application uses a **hybrid architecture**:
1. **Node.js Express Backend**: Interacts directly with the OS networking stack via native modules (`dns`, `net`, `tls`, `http`) to gather microsecond-accurate stage timestamps, execute security filtering, and analyze bottlenecks.
2. **React.js Frontend**: Consumes the backend API, visualizes the timing stages with interactive waterfall charts, provides heuristic recommendations, and tracks historical comparisons.

To ensure both engineers contribute substantially to **both Node.js systems programming and React frontend development**, the work is split into two complementary technical domains:
* **Engineer 1:** Systems Telemetry, Socket Measurement & Waterfall Visualization.
* **Engineer 2:** Network Security (SSRF), Heuristic Intelligence & Historical Analytics.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND (client/)                        │
├──────────────────────────────────┬─────────────────────────────────────┤
│      ENGINEER 1 (Visualization)  │         ENGINEER 2 (Analytics)      │
│  • useDiagnostic Custom Hook     │  • UrlForm & Regex Validation       │
│  • WaterfallChart (Recharts)     │  • BottleneckAlert & Recommendations│
│  • MetricCards Grid              │  • History & LocalStorage Benchmarks│
└──────────────────────────────────┴─────────────────────────────────────┘
                                   │ HTTP API (/api/diagnose)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         NODE.JS BACKEND (server/)                      │
├──────────────────────────────────┬─────────────────────────────────────┤
│      ENGINEER 1 (Telemetry)      │         ENGINEER 2 (Security)       │
│  • networkProber.js (Sockets)    │  • ssrfValidator.js (CIDR/IP Guard) │
│  • timer.js (hrtime utility)     │  • bottleneckAnalyzer.js (Rules)    │
│  • diagnosticController.js       │  • Request sanitization & limits    │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 2. Engineer 1: Systems Telemetry & Visualization Lead

### Focus Area
Low-level networking primitives, event-driven socket lifecycles, and interactive data visualization.

### Backend Responsibilities

#### 1. High-Resolution Timer Utility (`server/src/utils/timer.js`)
* Implement monotonic timing using `process.hrtime.bigint()`.
* Ensure calculations are immune to OS clock drift or NTP adjustments.
* Provide helper functions to convert nanoseconds into milliseconds with fractional precision (`Number(diff) / 1e6`).

#### 2. Socket-Level Network Prober (`server/src/services/networkProber.js`)
* Avoid high-level abstractions (`axios`, `fetch`) that pool or hide socket states.
* Manually hook into Node.js native networking events:
  - **DNS Phase:** `dns.lookup()` measuring the duration to resolve host to IP.
  - **TCP Phase:** `net.createConnection()` capturing socket `connect` event.
  - **TLS Phase:** `tls.connect()` capturing `secureConnect` event (HTTPS only).
  - **TTFB Phase:** Sending `GET` request via `http.request` / `https.request` and capturing the `response` event when the first byte of headers arrives.
  - **Download & Throughput:** Streaming the response body chunks, recording total bytes, and computing transfer rate in Kbps / Mbps.

#### 3. Diagnostic Controller & Route (`server/src/controllers/diagnosticController.js`)
* Coordinate the probe execution, compute relative offsets for each phase, and package the final JSON response.

### Frontend Responsibilities

#### 1. Diagnostic Execution Hook (`client/src/features/diagnostics/hooks/useDiagnostic.js`)
* Custom React hook managing the complete request lifecycle state machine:
  `idle` $\rightarrow$ `probing` $\rightarrow$ `success` $\rightarrow$ `error`.
* Integrate `AbortController` to allow users to cancel long-running or stalled network tests.

#### 2. Request Waterfall Chart (`client/src/features/diagnostics/WaterfallChart.jsx`)
* Build an interactive, Chrome DevTools-style waterfall chart using **Recharts**.
* Compute cumulative starting offsets so stages appear staggered along a unified timeline:
  - DNS starts at `0ms`
  - TCP starts at `dnsTime`
  - TLS starts at `dnsTime + tcpTime`
  - TTFB starts at `dnsTime + tcpTime + tlsTime`
  - Download starts at `dnsTime + tcpTime + tlsTime + ttfbTime`
* Add responsive tooltips showing phase name, duration, and percentage of overall duration.

#### 3. Metric Summary Cards (`client/src/features/diagnostics/MetricCards.jsx`)
* Grid of individual stage metrics with color-coded latency indicators (green for fast, amber for moderate, red for high latency).
* Display total duration, HTTP status code, and payload size.

### Oral Exam / Viva Defense Points
* How Node.js `process.hrtime.bigint()` differs from `Date.now()`.
* The 3-way TCP handshake (SYN $\rightarrow$ SYN-ACK $\rightarrow$ ACK) and how socket events map to OSI Layer 4.
* How the TLS handshake introduces round-trip overhead compared to plain HTTP.
* How horizontal stacked bar charts in Recharts represent relative offsets on a single timeline.

---

## 3. Engineer 2: Security, Heuristics & Analytics Lead

### Focus Area
Application security (SSRF prevention), domain-driven heuristic analysis, input validation, and persistent client-side analytics.

### Backend Responsibilities

#### 1. SSRF & URL Validator Middleware (`server/src/middleware/ssrfValidator.js`)
* Prevent **Server-Side Request Forgery (SSRF)**:
  - Parse and normalize the input URL.
  - Enforce protocol restrictions: only `http:` and `https:` are permitted (block `file:`, `ftp:`, `gopher:`).
  - Perform DNS pre-lookup to resolve the target IP address.
  - Block loopback addresses (`127.0.0.0/8`, `::1`, `localhost`).
  - Block private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  - Block cloud provider metadata endpoints (e.g., `169.254.169.254`).
* Apply request timeouts and response payload size caps (prevent denial-of-service via huge file downloads).

#### 2. Rule-Based Bottleneck Engine (`server/src/services/bottleneckAnalyzer.js`)
* Construct a heuristic decision matrix to evaluate latency ratios:
  - **DNS Bottleneck:** Flagged if DNS $> 100\text{ms}$ or constitutes $> 25\%$ of total request time.
  - **TCP Connection Delay:** Flagged if TCP handshake $> 200\text{ms}$ (indicates physical distance or network congestion).
  - **TLS Overhead:** Flagged if TLS negotiation is significantly higher than the initial TCP handshake.
  - **TTFB / Server Processing:** Flagged if TTFB $> 40\%$ of total time (indicates slow backend queries, heavy un-cached SSR, or overloaded server).
  - **Content Download:** Flagged if transfer time is disproportionate to payload size (bandwidth bottleneck).
* Generate human-readable diagnostics and actionable suggestions (e.g., recommend CDN, DNS caching, or database indexing).

### Frontend Responsibilities

#### 1. URL Form & Input Validation (`client/src/features/diagnostics/UrlForm.jsx`)
* Controlled input with real-time client-side regex validation.
* Protocol selector / auto-prefixing (`https://` by default).
* Clear error messaging for malformed hostnames, spaces, or unsupported schemes.

#### 2. Bottleneck Alert & Recommendation Cards (`client/src/features/diagnostics/BottleneckAlert.jsx`)
* Visually highlight the primary identified bottleneck with severity badges (`Optimal`, `Moderate Delay`, `Critical Bottleneck`).
* Render expandable advice cards with specific optimization steps tailored to the flagged stage.

#### 3. Historical Comparison & Benchmarking (`client/src/features/history/`)
* Persist test records in browser `localStorage`.
* Build a history view allowing users to inspect previous runs for the same domain.
* Provide percentage-based comparison metrics (e.g., *"DNS was 15% faster than your test 2 hours ago"*).

### Oral Exam / Viva Defense Points
* What SSRF is, why it occurs in proxy-like applications, and how IP/CIDR validation blocks it.
* Why rule-based threshold heuristics are preferable to unexplainable ML models for deterministic latency diagnostics.
* How `localStorage` state synchronization is managed in React with custom hooks (`useLocalStorage`).
* Controlled vs. uncontrolled inputs and client-side form validation patterns.

---

## 4. Shared API Contract (`POST /api/diagnose`)

Both engineers will integrate against this exact contract. This enables parallel frontend and backend development.

### Request
```http
POST /api/diagnose
Content-Type: application/json

{
  "url": "https://example.com"
}
```

### Response (`200 OK`)
```json
{
  "target": {
    "url": "https://example.com",
    "protocol": "https:",
    "hostname": "example.com",
    "ip": "93.184.215.14"
  },
  "timings": {
    "dnsLookup": 24.5,
    "tcpConnection": 45.2,
    "tlsHandshake": 62.1,
    "ttfb": 110.4,
    "dataTransfer": 35.8,
    "totalDuration": 278.0
  },
  "metrics": {
    "statusCode": 200,
    "contentLengthBytes": 1256,
    "throughputKbps": 280.6
  },
  "analysis": {
    "primaryBottleneck": "ttfb",
    "severity": "medium",
    "summary": "Server processing delay (TTFB) accounted for 40% of the total request time.",
    "recommendations": [
      "Check server backend execution time, database queries, or server-side rendering overhead.",
      "Consider using a Content Delivery Network (CDN) or edge caching for dynamic assets."
    ]
  }
}
```

### Error Responses (`400 Bad Request` / `403 Forbidden`)
```json
{
  "error": "SSRF_BLOCKED",
  "message": "Access to private or loopback IP address (127.0.0.1) is forbidden."
}
```

---

## 5. 4-Week Capstone Milestone Plan

| Week | Engineer 1 Deliverables | Engineer 2 Deliverables | Integration Goal |
| :--- | :--- | :--- | :--- |
| **Week 1** | • `timer.js` utility<br>• `networkProber.js` (isolated socket timings for DNS, TCP, TLS, TTFB) | • `ssrfValidator.js` middleware<br>• `bottleneckAnalyzer.js` rules<br>• Unit test cases for private IPs | Backend measurement pipeline operational via CLI/cURL |
| **Week 2** | • `diagnosticController.js`<br>• React `useDiagnostic` hook<br>• `MetricCards.jsx` component | • React `UrlForm.jsx`<br>• Client-side URL validator<br>• Error banner UI | Full end-to-end test: URL input triggers live probe and displays numbers |
| **Week 3** | • `WaterfallChart.jsx` (Recharts)<br>• Offset calculations & tooltips<br>• Responsive styling | • `BottleneckAlert.jsx` advice UI<br>• `features/history/` (LocalStorage)<br>• Run comparison logic | Complete Version 1 Dashboard with working charts and bottleneck advice |
| **Week 4** | • Repeated testing (3 runs average)<br>• Performance polishing | • Export to PDF report (Version 2 stretch)<br>• Edge-case testing & error states | Final code freeze, capstone report documentation, and presentation |

---

## 6. Definition of Done (DoD) Checklist

- [ ] All code strictly follows ES Modules (`import/export`).
- [ ] No high-level HTTP client (`axios`, `fetch`) used inside `server/src/services/networkProber.js`.
- [ ] SSRF middleware successfully blocks `localhost`, `127.0.0.1`, `10.x.x.x`, `192.168.x.x`, and cloud metadata IPs.
- [ ] React waterfall diagram correctly displays cumulative offsets and individual stage durations.
- [ ] Responsive UI tested on desktop and mobile viewports.
- [ ] Clear error banners displayed when network requests time out or fail.
