# Network Diagnostic Engine — Project Kanban Board

> **Project:** Network Diagnostic Engine (React JS + Node.js)  
> **Team Size:** 2 Members (Developer A: Frontend Lead, Developer B: Backend Lead)  
> **Framework:** Kanban with WIP (Work In Progress) Limits  
> **Sprint Cadence:** 1-Week Mini-Sprints  

---

## 📌 Kanban Workflow Columns & Policies

| Column | Description | WIP Limit | Exit Criteria (Definition of Done for Column) |
|---|---|---|---|
| **Backlog** | Prioritized pool of requirements (Version 1 & Version 2 features) | $\infty$ | Clear acceptance criteria, tagged with epic and priority |
| **To Do (Ready)** | Groomed tasks estimated and ready for active sprint pickup | 4 | Story points assigned, dependencies identified, owner assigned |
| **In Progress** | Tasks actively being developed | 2 per dev (Max 4) | Branch created, code actively being written and unit-tested |
| **In Review / Testing** | Code review, API verification, and UI integration testing | 3 | PR reviewed by peer, smoke tests pass, no blocking console errors |
| **Done** | Deployed/merged to `main`, functional verification complete | $\infty$ | Feature verified against acceptance criteria, docs updated |

---

## 📋 Live Kanban Board

```mermaid
kanban
  Backlog
    [NDE-10: LocalStorage History V2]
    [NDE-11: Multi-Run Average Testing V2]
    [NDE-12: PDF Diagnostic Export V2]
  Ready for Sprint
    [NDE-07: Diagnostic Bottleneck Engine (5 pts)]
    [NDE-08: Recharts Waterfall Chart (5 pts)]
    [NDE-09: End-to-End Integration (3 pts)]
  In Progress
    [NDE-04: TCP & TLS Handshake Timers (5 pts)]
    [NDE-05: React Dashboard Shell (3 pts)]
  Review / Testing
    [NDE-02: SSRF & URL Validation (3 pts)]
    [NDE-03: DNS Resolution Timer (3 pts)]
  Done
    [NDE-01: Project Scaffolding & Setup (2 pts)]
```

---

## 🗂️ Task Item Catalog & Detailed Cards

### 1. Project Initialization & Security
- **[NDE-01] Project Scaffolding & Monorepo/Folder Setup**
  - **Points:** 2 SP | **Est. Time:** 3h | **Assignee:** Dev A & Dev B
  - **Status:** `Done`
  - **Scope:** Initialize Vite + React + Tailwind CSS client (`/client`) and Express backend (`/server`). Configure scripts and Git repository.
- **[NDE-02] URL Parser & SSRF Security Gate**
  - **Points:** 3 SP | **Est. Time:** 4h | **Assignee:** Dev B
  - **Status:** `In Review / Testing`
  - **Scope:** Validate URL protocols (`http:`, `https:`). Block localhost (`127.0.0.1`), private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and AWS/cloud metadata addresses (`169.254.169.254`).

### 2. Backend Network Measurement Engine
- **[NDE-03] DNS Resolution Timing Module**
  - **Points:** 3 SP | **Est. Time:** 4h | **Assignee:** Dev B
  - **Status:** `In Review / Testing`
  - **Scope:** Measure time to resolve domain via Node.js `dns.lookup` / `dns.resolve4`. Track cold vs cached DNS resolution times.
- **[NDE-04] TCP Connect & TLS Handshake Timing Modules**
  - **Points:** 5 SP | **Est. Time:** 7h | **Assignee:** Dev B
  - **Status:** `In Progress`
  - **Scope:** Measure raw TCP socket connection latency using Node.js `net.createConnection`. Measure TLS handshake negotiation time using Node.js `tls.connect` with ALPN verification.
- **[NDE-06] HTTP Request, TTFB & Data Transfer Measurement**
  - **Points:** 5 SP | **Est. Time:** 6h | **Assignee:** Dev B
  - **Status:** `Ready for Sprint`
  - **Scope:** Track time to first byte (TTFB) and total payload download duration using Node.js `http`/`https` agents. Calculate throughput (KB/s or MB/s).

### 3. Diagnostic Engine & Rule Analysis
- **[NDE-07] Rule-Based Bottleneck Detection & Recommendation Engine**
  - **Points:** 5 SP | **Est. Time:** 6h | **Assignee:** Dev B & Dev A
  - **Status:** `Ready for Sprint`
  - **Scope:** Compare DNS, TCP, TLS, TTFB, and Transfer against defined relative percentage and absolute thresholds (e.g., DNS > 30% of total or > 300ms = DNS bottleneck; TTFB > 60% = backend processing bottleneck). Produce clear diagnostic explanations.

### 4. Frontend React Dashboard
- **[NDE-05] React Dashboard Layout & Input Component**
  - **Points:** 3 SP | **Est. Time:** 4h | **Assignee:** Dev A
  - **Status:** `In Progress`
  - **Scope:** Build responsive dashboard with Tailwind CSS, URL input bar, test trigger button, protocol selector, and active loading state.
- **[NDE-08] Waterfall Timing Visualization & Recharts Breakdown**
  - **Points:** 5 SP | **Est. Time:** 7h | **Assignee:** Dev A
  - **Status:** `Ready for Sprint`
  - **Scope:** Build interactive horizontal stacked bar waterfall chart depicting DNS $\rightarrow$ TCP $\rightarrow$ TLS $\rightarrow$ TTFB $\rightarrow$ Transfer. Add color-coded bottleneck indicators.
- **[NDE-09] Diagnostic Summary & Recommendation Cards**
  - **Points:** 3 SP | **Est. Time:** 4h | **Assignee:** Dev A
  - **Status:** `Ready for Sprint`
  - **Scope:** Display bottleneck alert badge, bulleted probable causes, and plain-English recommendations based on backend response.

### 5. Integration & Quality Assurance
- **[NDE-13] End-to-End API Integration & Error Resilience**
  - **Points:** 5 SP | **Est. Time:** 6h | **Assignee:** Dev A & Dev B
  - **Status:** `Backlog`
  - **Scope:** Connect React frontend to Express backend `/api/diagnose`. Handle network failures, invalid domains, connection timeouts, and HTTP errors gracefully.

