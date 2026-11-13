# 🌐 Network Diagnostic Engine

> **React JS Course Project (5th Semester)**  
> **Repository:** [github.com/Sanjana186/network-diagnostic-engine](https://github.com/Sanjana186/network-diagnostic-engine)  
> **Team Size:** 2 Members (Dev A: Frontend Lead, Dev B: Backend Lead)  
> **Live GitHub Project Board:** [Open Kanban Board on GitHub Projects](https://github.com/Sanjana186/network-diagnostic-engine/projects)

---

## 📌 1. Project Overview & Scope
The **Network Diagnostic Engine** is a full-stack web diagnostic platform that inspects website performance bottlenecks across individual networking stages:
- **DNS Resolution** (`dns.lookup` / `dns.resolve4`)
- **TCP Connection Latency** (`net.createConnection`)
- **TLS Handshake Latency** (`tls.connect`)
- **HTTP TTFB & Data Transfer** (`http` / `https` streams)
- **Rule-Based Bottleneck Engine** (identifies slowest stage and outputs actionable fixes)
- **Interactive React Dashboard** (waterfall visualization via Recharts)

---

## 📋 2. Agile Kanban Board (Sprint 1)

### Visual Board Status

| 🗄️ Backlog (Version 2) | 📋 Ready / To Do (WIP: 4) | 🔄 In Progress (WIP: 4) | 🔍 In Review / QA (WIP: 3) | ✅ Done |
|---|---|---|---|---|
| **[NDE-10]** LocalStorage Test History (3 SP) | **[NDE-06]** HTTP & TTFB Latency Timer (5 SP / 6h) | **[NDE-04]** TCP & TLS Handshake Timers (5 SP / 7h) | **[NDE-02]** SSRF Mitigation & URL Validation (3 SP / 4h) | **[NDE-01]** Repository Setup & Monorepo Spec (2 SP / 3h) |
| **[NDE-11]** 3-Run Average Testing (5 SP) | **[NDE-07]** Rule-Based Bottleneck Detection (5 SP / 6h) | **[NDE-05]** React Dashboard Shell & Input Bar (3 SP / 4h) | **[NDE-03]** DNS Resolution Timing Module (3 SP / 4h) | |
| **[NDE-12]** PDF Report Generation (3 SP) | **[NDE-08]** Recharts Horizontal Waterfall Chart (5 SP / 7h) | | | |
| | **[NDE-09]** Diagnostic Alert & Remediation Cards (3 SP / 4h) | | | |
| | **[NDE-13]** End-to-End Integration & Error Tests (5 SP / 6h) | | | |

---

## ⏱️ 3. Task Estimation Matrix (Fibonacci Scale)

*Estimation uses the modified Fibonacci scale ($1, 2, 3, 5, 8$) where **1 Point $\approx$ 1.5 - 2 Hours**.*  
*Total Sprint Commitment: **34 Story Points (~51 Hours)** across 2 developers over 5 days.*

| Task ID | Task Description | Domain | Assignee | Story Points | Est. Hours | Status |
|---|---|---|---|:---:|:---:|:---:|
| **NDE-01** | Repository scaffold (Vite + React, Tailwind CSS, Express backend) | Setup | Dev A + B | **2 SP** | 3h | ✅ Done |
| **NDE-02** | URL validation, protocol check & SSRF mitigation (RFC-1918 blacklist) | Security | Dev B | **3 SP** | 4h | 🔍 In Review |
| **NDE-03** | DNS resolution timing module (`dns.lookup` vs `dns.resolve4` hrtime) | Backend | Dev B | **3 SP** | 4h | 🔍 In Review |
| **NDE-04** | TCP connect (`net`) & TLS handshake (`tls`) socket timers | Backend | Dev B | **5 SP** | 7h | 🔄 In Progress |
| **NDE-05** | React dashboard wireframe, URL input bar, loading state | Frontend | Dev A | **3 SP** | 4h | 🔄 In Progress |
| **NDE-06** | HTTP request, TTFB, and data transfer throughput timer | Backend | Dev B | **5 SP** | 6h | 📋 Ready |
| **NDE-07** | Rule-based bottleneck detection algorithm & reasoning rules | Backend/Alg | Dev B + A | **5 SP** | 6h | 📋 Ready |
| **NDE-08** | Interactive Recharts waterfall visualization component | Frontend | Dev A | **5 SP** | 7h | 📋 Ready |
| **NDE-09** | Diagnostic explanation badges & recommendation panels | Frontend | Dev A | **3 SP** | 4h | 📋 Ready |
| **NDE-13** | End-to-end integration, error edge cases & demo testing | QA/Fullstack | Dev A + B | **5 SP** | 6h | 📋 Ready |

---

## 📅 4. 5-Day Mini-Sprint Daily Updates Log (Standup Record)

### 🔹 Day 1: Architecture & Foundation
- **Dev A (Frontend):** Initialized Vite React configuration with Tailwind CSS, Lucide icon kit, and base container layout.
- **Dev B (Backend):** Built Express server boilerplate with CORS and authored strict SSRF IP blacklisting for internal subnets.

### 🔹 Day 2: Network Layer Sockets & Input Form
- **Dev A (Frontend):** Created URL input form with protocol switcher (`http://` vs `https://`) and domain validation regex.
- **Dev B (Backend):** Implemented DNS timer using `process.hrtime()` and started raw TCP `net.Socket` latency measurement.

### 🔹 Day 3: HTTP/TTFB & Waterfall Visualization
- **Dev A (Frontend):** Integrated Recharts library and created horizontal stacked latency chart prototype.
- **Dev B (Backend):** Completed TLS handshake timer via `tls.connect` and measured HTTP TTFB stream timing.

### 🔹 Day 4: Bottleneck Analysis & Diagnostic Cards
- **Dev A (Frontend):** Styled diagnostic summary cards, bottleneck highlight badges (Critical / Warning), and remediation advice.
- **Dev B (Backend):** Coded rule-based bottleneck engine with heuristic thresholds for DNS, TCP, TLS, and TTFB delays.

### 🔹 Day 5: End-to-End Testing & Sprint Demo
- **Dev A (Frontend):** Connected frontend to `/api/diagnose`, handling network timeouts and invalid host errors gracefully.
- **Dev B (Backend):** Added 10s request abort timeout guards and benchmarked system against live domains for course demo.

---

## 🚀 How to Set Up the Live Board in GitHub Projects

1. Navigate to: **[https://github.com/Sanjana186/network-diagnostic-engine/projects](https://github.com/Sanjana186/network-diagnostic-engine/projects)**
2. Click **"New project"**
3. Select the **"Board"** template
4. The columns `Todo`, `In Progress`, and `Done` will appear. Add `Backlog` and `In Review` columns to match the 5-column Kanban layout above.
5. Click **"+ Add item"** under any column to paste the task cards (`[NDE-01]`, `[NDE-02]`, etc.).
