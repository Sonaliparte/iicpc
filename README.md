# IICPC Summer Hackathon 2026 — Distributed Benchmarking Platform

> **Architect and benchmark contestant-submitted trading infrastructure at scale.**  
> A fully distributed system that accepts C++ matching engine submissions, containerizes them in isolated sandboxes, unleashes a coordinated fleet of trading bots to stress-test them, and streams live telemetry to a real-time leaderboard.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Services](#services)
  - [Sandbox Runner](#sandbox-runner-go--port-9090)
  - [Bot Worker Fleet](#bot-worker-fleet-go)
  - [Matching Engine (Reference Implementation)](#matching-engine-reference-implementation-c)
  - [Frontend Dashboard](#frontend-dashboard-reacttypescript--vite)
- [Scoring Model](#scoring-model)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Running Locally (Docker)](#running-locally-docker)
  - [Running the Frontend](#running-the-frontend)
- [Submission Format](#submission-format)
- [Bot Personas](#bot-personas)
- [Configuration Reference](#configuration-reference)
- [Project Structure](#project-structure)

---

## Overview

The IICPC platform evaluates contestant-submitted **order-matching engines** under extreme simulated market conditions. The full pipeline is:

```
Code Upload (.zip)
    └─► Sandbox Runner (extracts, compiles, containerizes)
            └─► Docker Container (contestant's engine, port-mapped)
                    └─► Bot Fleet (concurrent trading bots)
                            └─► Telemetry Aggregation
                                    └─► Live Leaderboard + Analytics Dashboard
```

Each submission is scored on three pillars: **Speed** (latency), **Stability** (error rate), and **Correctness** (fill accuracy).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Host Machine / Cloud VM                       │
│                                                                       │
│  ┌──────────────────┐        ┌─────────────────────────────────────┐ │
│  │  React Frontend  │        │         Docker Socket (DinD)         │ │
│  │  (Vite + TS)     │        │                                     │ │
│  │  Port: 5173      │        │  ┌───────────────────────────────┐  │ │
│  │                  │        │  │    sandbox-runner (Go)         │  │ │
│  │  • Upload Page   │◄──────►│  │    Port: 9090                 │  │ │
│  │  • Leaderboard   │  REST  │  │                               │  │ │
│  │  • Analytics     │        │  │  • Accepts .zip uploads       │  │ │
│  └──────────────────┘        │  │  • Builds Docker images       │  │ │
│                               │  │  • Spawns isolated containers │  │ │
│                               │  │  • Health-checks submissions  │  │ │
│                               │  │  • Auto-cleanup on timeout   │  │ │
│                               │  └───────────────────────────────┘  │ │
│                               │           │ Docker API               │ │
│                               │           ▼                          │ │
│                               │  ┌───────────────────────────────┐  │ │
│                               │  │  Contestant Container(s)       │  │ │
│                               │  │  Port: 10000–10004 (mapped)   │  │ │
│                               │  │                               │  │ │
│                               │  │  • Compiled C++ engine        │  │ │
│                               │  │  • REST API on :8080          │  │ │
│                               │  │  • 512 MB RAM limit           │  │ │
│                               │  │  • 1 CPU limit (NanoCPUs)    │  │ │
│                               │  └───────────────────────────────┘  │ │
│                               │           ▲                          │ │
│                               │           │ HTTP Orders              │ │
│                               │  ┌───────────────────────────────┐  │ │
│                               │  │   bot-worker (Go)             │  │ │
│                               │  │                               │  │ │
│                               │  │  • N concurrent goroutines    │  │ │
│                               │  │  • 3 bot personas (mixed)     │  │ │
│                               │  │  • Atomic latency tracking    │  │ │
│                               │  │  • Final composite report     │  │ │
│                               │  └───────────────────────────────┘  │ │
│                               └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Services

### Sandbox Runner (Go · Port 9090)

**Path:** `sandbox-runner/`

The orchestration brain. It manages the full lifecycle of every submission:

| Step | What happens |
|------|-------------|
| **1. Upload** | Accepts `.zip` via `POST /submit` (max 10 MB) |
| **2. Extract** | Unzips safely (Zip Slip protection). Searches recursively for `main.cpp` and copies it to workspace root if nested inside a subfolder. |
| **3. Build** | Dynamically generates a `Dockerfile`, downloads `httplib.h` + `nlohmann/json.hpp` at build time, and compiles with `g++ -O2 -std=c++17 -pthread` |
| **4. Run** | Creates a container with strict resource limits and a unique mapped port (`10000–10004`) |
| **5. Health Check** | Polls `GET /health` every 2s with a 30s timeout before declaring the submission live |
| **6. Auto-cleanup** | After the configured `TIMEOUT_SEC`, stops the container, removes the image, and frees the port slot |

**Key properties:**
- Concurrent submission limit enforced (default: 5)
- Full build log streaming from Docker daemon
- In-memory submission registry with `RWMutex` for safe concurrent access
- Supports Docker-in-Docker (`RUNNING_IN_DOCKER=true`) for bridge IP resolution

---

### Bot Worker Fleet (Go)

**Path:** `bot-worker/`

A standalone Go binary that spawns `N` concurrent goroutines, each acting as an independent trading bot. Designed to be launched by the sandbox runner (or manually) pointed at any running submission container.

**Bot behavior:**
- Each bot alternates BUY/SELL sides per tick
- Rate-controlled via `time.Ticker` at `RATE_TPS` orders/second per bot
- Connection pooling with `MaxIdleConnsPerHost: 100` for minimal overhead
- Per-bot `rand.Source` seeded with `BotID` to eliminate global lock contention
- Atomic global counters (`globalSent`, `globalSuccess`, `globalFailed`) for live progress logging every 5 seconds

**Metrics collected:**
- All round-trip latencies captured in nanoseconds
- P50, P90, P99, min, max latency computed post-run
- Fill rate, queue rate, cancel rate per bot
- Composite score emitted to stdout at completion

---

### Matching Engine (Reference Implementation · C++)

**Path:** `matching-engine/`

A working **price-time priority order book** written in C++17. This is the reference implementation that contestants' submissions are benchmarked against — and is itself a valid submission.

**Order Book design:**
- `bids`: `std::map<double, std::queue<Order>, std::greater<double>>` — highest price first
- `asks`: `std::map<double, std::queue<Order>, std::less<double>>` — lowest price first
- `all_orders`: `std::unordered_map<string, Order>` — O(1) lookup for cancel & status
- Single `std::mutex` protecting all book operations

**Supported order types:**

| Type | Behavior |
|------|---------|
| `LIMIT` | Rests in book at specified price if not immediately matchable; responds `QUEUED` |
| `MARKET` | Matches aggressively at best available price; any unfilled remainder is cancelled |

**Cancellations:** Lazy — cancelled orders are marked in `all_orders` and skipped during matching traversal. The book queue is cleaned during the next matching pass.

**HTTP endpoints (port 8080):**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/order` | Submit a new order |
| `DELETE` | `/order/:id` | Cancel an existing order |
| `GET` | `/orderbook` | Snapshot of current bids/asks + stats |
| `GET` | `/health` | Health check with uptime |

Dependencies (`httplib.h`, `json.hpp`) are fetched at Docker build time — no local setup required.

---

### Frontend Dashboard (React/TypeScript · Vite)

**Path:** `src/`

A three-page dashboard built with React 18, Zustand for state management, and Recharts for real-time charting.

| Page | Description |
|------|-------------|
| **Upload** | Drag-and-drop `.zip` submission form with live build status polling |
| **Leaderboard** | Ranked table of all submissions by composite score, with latency and TPS columns |
| **Analytics** | Per-submission deep-dive charts: latency distribution, TPS over time, fill/queue breakdown |

**Tech stack:** React 18 · TypeScript · Vite · Tailwind CSS · Zustand · Recharts · Framer Motion · Lucide Icons

---

## Scoring Model

The bot fleet computes a **composite score out of 100** from three independent sub-scores:

```
Composite = (Speed × 0.40) + (Stability × 0.35) + (Correctness × 0.25)
```

### Speed Score (based on P99 latency)

| P99 Latency | Score |
|------------|-------|
| < 1 ms | 100 |
| 1–5 ms | 90 |
| 5–10 ms | 75 |
| 10–50 ms | 50 |
| ≥ 50 ms | 25 |

### Stability Score (based on error rate)

| Failed Order % | Score |
|---------------|-------|
| < 0.1% | 100 |
| 0.1–1% | 90 |
| 1–5% | 75 |
| ≥ 5% | 50 |

### Correctness Score

```
Correctness = (Filled Orders / Successful Orders) × 100
```

Orders that return `FILLED` indicate proper price-time priority matching. A high fill rate under mixed buy/sell traffic signals a well-implemented, liquid order book.

---

## API Reference

### Sandbox Runner (`http://localhost:9090`)

#### `POST /submit`
Upload a submission zip.

**Form fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | ✅ | `.zip` archive containing `main.cpp` (max 10 MB) |
| `team` | string | ✅ | Team name |
| `language` | string | ✅ | Must be `cpp` |

**Response:**
```json
{
  "status": "ok",
  "submission_id": "sub-123456",
  "message": "Submission received, building..."
}
```

#### `GET /status/{submission_id}`
Poll submission build/run status.

**Response:**
```json
{
  "submission_id": "sub-123456",
  "team": "TeamName",
  "language": "cpp",
  "status": "running",
  "container_url": "http://localhost:10000",
  "container_port": 10000,
  "build_log": "...",
  "score": 87.5,
  "peak_tps": 4200.0,
  "p99_latency_ms": 3.2,
  "correctness": 94.1
}
```

**Status values:** `uploading` → `extracting` → `building` → `running` → `completed` / `failed`

#### `GET /submissions`
List all submissions with active container count.

#### `DELETE /submission/{submission_id}`
Immediately stop and clean up a running submission.

#### `GET /health`
Sandbox runner health check.

---

### Contestant Engine Contract

Your `main.cpp` **must** implement:

#### `POST /order`
**Request body:**
```json
{
  "id": "unique-order-id",
  "side": "BUY",
  "type": "LIMIT",
  "price": 100.50,
  "quantity": 10
}
```

**Response:**
```json
{
  "status": "ok",
  "order_id": "unique-order-id",
  "result": "FILLED | QUEUED | PARTIAL | CANCELLED",
  "filled_quantity": 10,
  "filled_price": 100.50
}
```

#### `DELETE /order/:id`
Cancel an open or partial order.

#### `GET /health`
Must return HTTP 200 with `{"status": "ok"}`. Used by the sandbox health-check loop.

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine on Linux)
- [Node.js 18+](https://nodejs.org/) and npm (for the frontend)
- Git

### Running Locally (Docker)

#### 1. Build and run the Sandbox Runner

```bash
cd sandbox-runner
docker build -t sandbox-runner .
docker run -d \
  --name sandbox-runner \
  -p 9090:9090 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e MAX_CONTAINERS=5 \
  -e CPU_LIMIT=1.0 \
  -e MEMORY_LIMIT=512m \
  -e TIMEOUT_SEC=120 \
  -e BASE_PORT=10000 \
  sandbox-runner
```

> **Note:** Mounting `/var/run/docker.sock` gives the sandbox runner access to the host Docker daemon to spawn contestant containers. On Windows with Docker Desktop, use `//var/run/docker.sock`.

#### 2. Submit the reference matching engine

```bash
# Zip the matching engine
cd matching-engine
zip -r ../engine.zip main.cpp

# Upload via curl
curl -X POST http://localhost:9090/submit \
  -F "file=@../engine.zip" \
  -F "team=ReferenceTeam" \
  -F "language=cpp"
```

#### 3. Poll status until `running`

```bash
curl http://localhost:9090/status/sub-XXXXXX
```

#### 4. Run the bot fleet against it

```bash
cd bot-worker
docker build -t bot-worker .
docker run --rm \
  -e TARGET_URL=http://host.docker.internal:10000 \
  -e BOT_COUNT=50 \
  -e DURATION_SEC=60 \
  -e RATE_TPS=100 \
  -e PERSONA=mixed \
  bot-worker
```

On Linux, replace `host.docker.internal` with `172.17.0.1` (default Docker bridge gateway).

#### 5. Run the bot fleet directly (without Docker)

```bash
cd bot-worker
go run main.go
# Or with overrides:
TARGET_URL=http://localhost:10000 BOT_COUNT=100 DURATION_SEC=30 RATE_TPS=50 go run main.go
```

---

### Running the Frontend

```bash
# From the project root
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

The frontend polls `http://localhost:9090` for submission status and leaderboard data.

---

## Submission Format

Contestants must upload a **`.zip` file** containing their matching engine source:

```
submission.zip
├── main.cpp          ← Required (can be in root or one subdirectory deep)
└── (optional files)  ← Other .h / .cpp files will be included in the build
```

**Rules:**
- Only C++ submissions are currently supported (`language=cpp`)
- `main.cpp` is the build entry point — it is found recursively if nested in a subdirectory
- All files from the discovered subdirectory are copied to the build root
- The sandbox injects `httplib.h` (cpp-httplib) and `json.hpp` (nlohmann/json) automatically — do **not** include them
- Your engine must listen on port `8080`
- Your engine must expose `GET /health` returning HTTP 200
- Build timeout: limited by Docker image build time (~5 min typical)
- Container lifetime: 120 seconds (configurable via `TIMEOUT_SEC`)
- Resource limits: 512 MB RAM, 1 vCPU

---

## Bot Personas

The bot fleet supports three trading personas, configurable via `PERSONA` env var:

| Persona | `PERSONA` value | Order Type | Quantity | Behavior |
|---------|----------------|------------|----------|----------|
| Market Maker | `MARKET_MAKER` | `LIMIT` | 10–100 | Posts both-sided limit orders near mid-price ($99–$102). Creates book depth. |
| Aggressive Taker | `AGGRESSIVE_TAKER` | `MARKET` | 50–200 | Hits best available price with large market orders. Drains liquidity. |
| Cancel Spammer | `CANCEL_SPAMMER` | `LIMIT` then `DELETE` | 1–10 | Immediately cancels queued or partial orders. Tests cancel throughput and book GC. |
| Mixed | `mixed` (default) | — | — | 40% Market Maker, 40% Aggressive Taker, 20% Cancel Spammer |

---

## Configuration Reference

### Sandbox Runner Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9090` | HTTP server port |
| `MAX_CONTAINERS` | `5` | Maximum concurrent running submission containers |
| `CPU_LIMIT` | `1.0` | CPU cores per container (converted to NanoCPUs) |
| `MEMORY_LIMIT` | `512m` | Memory limit per container (`512m`, `1g`, etc.) |
| `TIMEOUT_SEC` | `120` | Seconds before auto-cleanup of a running container |
| `BASE_PORT` | `10000` | First host port to assign to containers |
| `RUNNING_IN_DOCKER` | `false` | Set `true` when running inside Docker to use container bridge IPs for health checks |

### Bot Worker Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TARGET_URL` | `http://localhost:8081` | Base URL of the target matching engine |
| `BOT_COUNT` | `10` | Number of concurrent bots |
| `DURATION_SEC` | `30` | Test duration in seconds |
| `RATE_TPS` | `100` | Orders per second per bot |
| `PERSONA` | `mixed` | Bot persona: `mixed`, `MARKET_MAKER`, `AGGRESSIVE_TAKER`, `CANCEL_SPAMMER` |

---

## Project Structure

```
iicpc-platform/
│
├── sandbox-runner/          # Go service: submission ingestion + Docker orchestration
│   ├── main.go              # Full sandbox pipeline (extract → build → run → health-check)
│   ├── Dockerfile           # golang:1.23-alpine + docker-cli (DinD support)
│   └── go.mod
│
├── bot-worker/              # Go service: distributed load generator
│   ├── main.go              # Bot fleet, latency tracking, scoring report
│   ├── Dockerfile           # golang:1.21-alpine
│   └── go.mod
│
├── matching-engine/         # C++ reference implementation (valid submission)
│   ├── main.cpp             # Price-time priority order book with REST API
│   └── Dockerfile           # ubuntu:22.04 + g++ build
│
├── src/                     # React/TypeScript frontend
│   ├── pages/
│   │   ├── UploadPage.tsx   # Submission form + live status polling
│   │   ├── LeaderboardPage.tsx  # Ranked scores table
│   │   └── AnalyticsPage.tsx    # Per-submission charts
│   ├── components/          # Shared UI components
│   ├── hooks/               # Custom React hooks
│   ├── store/               # Zustand state management
│   ├── types/               # TypeScript type definitions
│   └── lib/                 # Utility functions
│
├── package.json             # npm/Vite frontend config
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## Security Notes

- **Zip Slip protection:** The sandbox validates all extracted paths are strictly under the destination directory before writing any file.
- **Resource isolation:** Every container runs with hard `Memory` and `NanoCPUs` limits via the Docker API — a runaway submission cannot starve the host.
- **Network isolation:** Containers run in `bridge` mode. They cannot reach other containers or the sandbox runner's internal network by default.
- **Auto-cleanup:** Containers, images, and temp directories are garbage-collected after `TIMEOUT_SEC` seconds, whether the test completes normally or not.
- **Max upload size:** Submissions are capped at 10 MB.
- **No shell execution:** The sandbox never shells out — all Docker operations go through the Docker SDK API (`github.com/docker/docker/client`).

---

> 
