# Docker Sandbox Manager (Runner)

A secure and isolated Sandbox Manager written in Go that receives contestant C++ uploads, builds them as Docker images inside the host machine's daemon, runs them in resource-constrained container sandboxes, health checks them, and auto-cleans them up after a test.

---

## 1. Configurations (Environment Variables)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `9090` | HTTP Port for the Sandbox Manager server. |
| `MAX_CONTAINERS` | `5` | Maximum number of concurrent active sandbox containers allowed. |
| `CPU_LIMIT` | `1.0` | CPU Core limit per container sandbox (1.0 = 1 Core). |
| `MEMORY_LIMIT` | `512m` | Memory hard limit per sandbox (OOM kills above this limit). |
| `TIMEOUT_SEC` | `120` | Maximum lifetime of a running container in seconds (auto-cleanup). |
| `BASE_PORT` | `10000` | Start of host port range allocated dynamically to submissions. |

---

## 2. Compilation and Build

### Build Docker Image (Recommended)
Building with Docker mounts the Docker socket so the runner can control the host Docker daemon:
```bash
docker build -t sandbox-runner .
```

### Run the Sandbox Runner
You **must** mount the host's Docker socket and expose the port:
```bash
docker run --name sandbox-runner \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 9090:9090 \
  -d sandbox-runner
```
*(On Windows/macOS Desktop, make sure Docker Desktop is active and running).*

---

## 3. Endpoints & API Reference

### 1. POST `/submit`
Submit a contestant's code zip file for evaluation.
- Form field `file`: The `.zip` file of the source code.
- Form field `team`: String identifier of the team.
- Form field `language`: `"cpp"` (currently supported language).

**Request:**
```bash
curl -X POST \
  -F "file=@submission.zip" \
  -F "team=Quantum Strike" \
  -F "language=cpp" \
  http://localhost:9090/submit
```

**Response:**
```json
{
  "status": "ok",
  "submission_id": "sub-123456",
  "message": "Submission received, building..."
}
```

### 2. GET `/status/:id`
Check the compilation and execution status of a submission.

**Request:**
```bash
curl http://localhost:9090/status/sub-123456
```

**Response:**
```json
{
  "submission_id": "sub-123456",
  "team": "Quantum Strike",
  "language": "cpp",
  "created_at": "2026-05-24T14:15:00Z",
  "status": "running",
  "container_url": "http://localhost:10000",
  "build_log": "Step 1/9 : FROM ubuntu:22.04 ... Compilation successful\n",
  "error": ""
}
```

### 3. GET `/submissions`
Retrieve list of all active/historical sandboxes.

**Request:**
```bash
curl http://localhost:9090/submissions
```

### 4. DELETE `/submission/:id`
Force stop and delete a sandbox container, release the port, and clean up temp workspace.

**Request:**
```bash
curl -X DELETE http://localhost:9090/submission/sub-123456
```

### 5. GET `/health`
Check Sandbox Manager metrics.

**Request:**
```bash
curl http://localhost:9090/health
```

---

## 4. Full Validation Workflow Test

Let's test the entire sandbox system using your `matching-engine` code:

### Step 1: Zip the Matching Engine Source Code
Inside the `matching-engine/` folder, compress `main.cpp` into a file named `engine.zip`.
*(Ensure `main.cpp` is directly in the root of the zip file, and not nested inside a subfolder).*

### Step 2: Upload to Sandbox Manager
```bash
curl -X POST \
  -F "file=@engine.zip" \
  -F "team=Golden-Traders" \
  -F "language=cpp" \
  http://localhost:9090/submit
```
Take note of the `"submission_id"` returned.

### Step 3: Monitor Compilation & Status
Repeatedly hit `/status` to watch the pipeline execute (`uploading` -> `extracting` -> `building` -> `running`):
```bash
curl http://localhost:9090/status/sub-XXXXXX
```
When status becomes `"running"`, the compilation has succeeded and you will see the `"container_url"` (e.g. `http://localhost:10000`).

### Step 4: Verify Container Service
Verify that the matching engine is up, healthy, and running inside its isolated container:
```bash
curl http://localhost:10000/health
```
*(This will return the matching engine's health response: `{"status":"ok", "uptime_ms":...}`).*

### Step 5: Test with Load Generator Bot
Set the `TARGET_URL` to point to this container port, and run your Go load generator:
```bash
docker run --rm -e TARGET_URL=http://host.docker.internal:10000 bot-worker
```

### Step 6: Delete Submission (Cleanup)
When testing finishes, release resources manually (or wait 120s for the auto-timeout):
```bash
curl -X DELETE http://localhost:9090/submission/sub-XXXXXX
```

---

## 5. Security Details
1. **Directory Traversal Mitigation**: The unzipper cleans file paths and checks for prefixes to prevent Zip Slip exploits.
2. **File Size Hard Limits**: Uploads are restricted to 10MB using Go's `http.MaxBytesReader`.
3. **Resource Constraint Enforcements**: Docker containers are restricted to exactly 1 CPU core and a hard 512MB RAM ceiling (exceeding RAM will trigger an OOM termination to protect the host).
4. **Isolated Bridge Networking**: Sandbox containers run on default isolated docker bridge networks, exposing only their REST HTTP port.
5. **Pruning Images**: Unused images and containers are fully deleted during cleanup to prevent storage depletion.

---

## 6. CORS Fix Note
The sandbox-runner already has CORS * headers. If the browser blocks requests, run the frontend with:
```bash
VITE_API_URL=http://localhost:9090
```
