# Distributed Trading Bot Load Generator

A high-concurrency distributed trading bot load generator implemented in Go. It simulates multiple concurrent trading bot personas executing limit, market, and cancellation flows against the C++ order matching engine.

---

## Configurations (Environment Variables)

Customize the load behavior by defining these environment variables:

| Environment Variable | Default | Description |
| :--- | :--- | :--- |
| `TARGET_URL` | `http://localhost:8081` | The target HTTP address of the matching engine. |
| `BOT_COUNT` | `10` | Number of concurrent bot worker goroutines to launch. |
| `DURATION_SEC` | `30` | Duration of the load generation run in seconds. |
| `RATE_TPS` | `100` | Target transactions (orders) per second generated *per bot*. |
| `PERSONA` | `mixed` | Bot personality strategy. Values: `mixed`, `market_maker`, `aggressive_taker`, `cancel_spammer`. |

---

## Bot Personas

If `PERSONA=mixed` is set, bots are randomly assigned one of these types:
1. **`MARKET_MAKER` (40%)**: Submits alternating `BUY` and `SELL` limit orders with random prices (99.00 - 102.00) and quantities (10 - 100).
2. **`AGGRESSIVE_TAKER` (40%)**: Submits market orders only (crossing the spread aggressively) with quantities ranging from 50 to 200.
3. **`CANCEL_SPAMMER` (20%)**: Submits a limit order and immediately deletes it to test the throughput of the cancellation endpoint.

---

## 1. Running Locally (Go)

Ensure you have Go 1.21+ installed.

### Compile
```bash
go build -o bot main.go
```

### Execute
Set the configurations inline or export them, then run:

```bash
# Windows (CMD)
set TARGET_URL=http://localhost:8081
set BOT_COUNT=10
set DURATION_SEC=30
set RATE_TPS=50
bot.exe

# Linux/macOS
TARGET_URL="http://localhost:8081" BOT_COUNT=10 DURATION_SEC=30 RATE_TPS=50 ./bot
```

---

## 2. Running with Docker

You can run the bot inside Docker, targeting the host machine's port.

### Build the Image
```bash
docker build -t bot-worker .
```

### Run the Container
If your C++ matching engine is running on your host machine at port `8081`:
- On **Windows/macOS**, use `host.docker.internal` to point to the host:
  ```bash
  docker run --rm -e TARGET_URL=http://host.docker.internal:8081 bot-worker
  ```
- On **Linux**, use `--network="host"`:
  ```bash
  docker run --rm --network="host" -e TARGET_URL=http://localhost:8081 bot-worker
  ```

---

## 3. Output Format

During the run, the bot prints progress updates every 5 seconds:
```text
[PROGRESS] 5s: 5,000 orders sent | 4,980 ok | TPS: 1000
```

Upon completion, it prints a scorecard report:
```text
============================================
IICPC BOT FLEET — FINAL REPORT
============================================
Target:        http://localhost:8081
Bots:          10
Duration:      30s
--------------------------------------------
THROUGHPUT
  Total Orders:     30,000
  Successful:       29,850  (99.5%)
  Failed:           150     (0.5%)
  Actual TPS:       1,000.0
--------------------------------------------
LATENCY
  P50:    0.82ms
  P90:    1.45ms
  P99:    3.21ms
  Max:    12.40ms
  Min:    0.31ms
--------------------------------------------
CORRECTNESS
  Filled Orders:    14,200
  Queued Orders:    15,650
  Correctness:      98.7%
--------------------------------------------
SCORE ESTIMATE
  Speed Score:      90/100
  Stability Score:  95/100
  Correctness:      99/100
  COMPOSITE:        94.6/100
============================================
```
