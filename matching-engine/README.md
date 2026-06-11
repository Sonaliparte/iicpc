# C++ Order Matching Engine

A high-performance C++17 order matching engine running as a multi-threaded HTTP server. This engine utilizes price-time priority for order matches, supports both LIMIT and MARKET order types, allows partial fills, supports order cancellation, and maintains a clean live order book state.

---

## Project Structure
```text
matching-engine/
  main.cpp          # Core server and matching engine logic
  httplib.h         # cpp-httplib single-header HTTP server
  json.hpp          # nlohmann/json single-header JSON parser
  Dockerfile        # Containerization build configuration
  README.md         # Instructions and API examples
```

---

## 1. Setup Dependencies

Before compiling, you need to download the two header-only library dependencies and place them in the `matching-engine` directory.

### Download via Curl
Run the following commands inside the `matching-engine` directory:

```bash
# Download cpp-httplib
curl -L -o httplib.h https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h

# Download nlohmann/json
curl -L -o json.hpp https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp
```

### Download via PowerShell (Windows)
```powershell
# Download cpp-httplib
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h" -OutFile "httplib.h"

# Download nlohmann/json
Invoke-WebRequest -Uri "https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp" -OutFile "json.hpp"
```

---

## 2. Compilation and Execution

### Manual Compilation
To compile the server locally using `g++` (requires C++17 support):

```bash
g++ -O2 -std=c++17 -pthread main.cpp -o engine
```

### Run the Server
```bash
./engine
```
*The server will start and listen on port `8080`.*

---

## 3. Running with Docker

### Build the Image
```bash
docker build -t matching-engine .
```

### Run the Container
```bash
docker run -p 8080:8080 matching-engine
```

---

## 4. API Endpoints and Example Commands

### Endpoint 1 — POST `/order`
Submits a new order to the engine.

**LIMIT BUY Order:**
```bash
curl -X POST http://localhost:8080/order \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ORD-001",
    "side": "BUY",
    "type": "LIMIT",
    "price": 101.50,
    "quantity": 100
  }'
```

**MARKET SELL Order:**
```bash
curl -X POST http://localhost:8080/order \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ORD-002",
    "side": "SELL",
    "type": "MARKET",
    "quantity": 50
  }'
```

**Success Response:**
```json
{
  "status": "ok",
  "order_id": "ORD-001",
  "result": "QUEUED",
  "filled_quantity": 0,
  "filled_price": 0.0,
  "timestamp": 1716556550000000000
}
```

### Endpoint 2 — DELETE `/order/:id`
Cancels an active order (status must be `OPEN` or `PARTIAL`).

```bash
curl -X DELETE http://localhost:8080/order/ORD-001
```

**Success Response:**
```json
{
  "status": "ok",
  "order_id": "ORD-001",
  "result": "CANCELLED"
}
```

### Endpoint 3 — GET `/orderbook`
Returns the aggregated active bids/asks, last trade price, and execution statistics.

```bash
curl http://localhost:8080/orderbook
```

**Success Response:**
```json
{
  "bids": [
    {"price": 101.50, "quantity": 100, "orders": 1}
  ],
  "asks": [],
  "last_trade_price": 0.0,
  "last_trade_time": 0,
  "total_trades": 0
}
```

### Endpoint 4 — GET `/health`
Health check endpoint returning the server status and uptime.

```bash
curl http://localhost:8080/health
```

**Success Response:**
```json
{
  "status": "ok",
  "uptime_ms": 12450
}
```

---

## 5. Walkthrough: Full Matching Scenario

Here is a step-by-step scenario simulating order entries and a trade execution:

1. **Submit resting BUY Limit Order:**
   ```bash
   curl -X POST http://localhost:8080/order \
     -H "Content-Type: application/json" \
     -d '{"id": "ORD-001", "side": "BUY", "type": "LIMIT", "price": 101.50, "quantity": 100}'
   ```
   **Output:** Returns `"result": "QUEUED"` and the order rests in the bids map.

2. **Submit matching SELL Limit Order:**
   ```bash
   curl -X POST http://localhost:8080/order \
     -H "Content-Type: application/json" \
     -d '{"id": "ORD-002", "side": "SELL", "type": "LIMIT", "price": 99.00, "quantity": 100}'
   ```
   **Output:** Returns `"result": "FILLED"`, `"filled_quantity": 100`, `"filled_price": 101.50`.

3. **Check Terminal Logs:**
   The server prints trade details on standard output:
   ```text
   [TRADE] ORD-001 x ORD-002 | 100 shares @ 101.50
   ```

4. **Verify OrderBook state:**
   ```bash
   curl http://localhost:8080/orderbook
   ```
   **Output:** Both bids and asks are empty since the orders matched completely, and statistics are updated:
   ```json
   {
     "bids": [],
     "asks": [],
     "last_trade_price": 101.50,
     "last_trade_time": 1716556600000000000,
     "total_trades": 1
   }
   ```
