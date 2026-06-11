package main

import (
	"archive/tar"
	"archive/zip"
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
)

type Submission struct {
	ID            string    `json:"submission_id"`
	TeamName      string    `json:"team"`
	Language      string    `json:"language"`
	UploadedAt    time.Time `json:"created_at"`
	Status        string    `json:"status"`
	ContainerID   string    `json:"container_id,omitempty"`
	ContainerPort int       `json:"container_port,omitempty"`
	ContainerURL  string    `json:"container_url"`
	BuildLog      string    `json:"build_log"`
	Error         string    `json:"error"`
	CleanedUp     bool      `json:"cleaned_up"`
	Score         float64   `json:"score,omitempty"`
	PeakTPS       float64   `json:"peak_tps,omitempty"`
	P99LatencyMs  float64   `json:"p99_latency_ms,omitempty"`
	Correctness   float64   `json:"correctness,omitempty"`
}

type SandboxManager struct {
	dockerClient  *client.Client
	submissions   map[string]*Submission
	mutex         sync.RWMutex
	activeCount   int
	maxContainers int
	cpuLimit      int64
	memoryLimit   int64
	timeout       time.Duration
	basePort      int
}

var manager *SandboxManager

func generateID() string {
	return fmt.Sprintf("sub-%d", time.Now().UnixNano()%1000000)
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if val, ok := os.LookupEnv(key); ok {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return fallback
}

func getEnvFloat(key string, fallback float64) float64 {
	if val, ok := os.LookupEnv(key); ok {
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			return f
		}
	}
	return fallback
}

func parseMemoryLimit(memStr string) int64 {
	if memStr == "" {
		return 512 * 1024 * 1024 // 512MB default
	}
	unit := memStr[len(memStr)-1]
	valStr := memStr[:len(memStr)-1]
	val, err := strconv.ParseInt(valStr, 10, 64)
	if err != nil {
		return 512 * 1024 * 1024
	}
	switch unit {
	case 'g', 'G':
		return val * 1024 * 1024 * 1024
	case 'm', 'M':
		return val * 1024 * 1024
	case 'k', 'K':
		return val * 1024
	default:
		if fullVal, err := strconv.ParseInt(memStr, 10, 64); err == nil {
			return fullVal
		}
		return 512 * 1024 * 1024
	}
}

func (s *Submission) updateStatus(status string) {
	manager.mutex.Lock()
	s.Status = status
	manager.mutex.Unlock()
}

func (s *Submission) setError(errMsg string) {
	manager.mutex.Lock()
	s.Status = "failed"
	s.Error = errMsg
	manager.mutex.Unlock()
	fmt.Printf("[SANDBOX] Error on %s: %s\n", s.ID, errMsg)
}

// Unzip extracts files safely, preventing Zip Slip directory traversals
func unzip(srcFile string, destDir string) error {
	r, err := zip.OpenReader(srcFile)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		fpath := filepath.Join(destDir, f.Name)
		if !strings.HasPrefix(fpath, filepath.Clean(destDir)+string(filepath.Separator)) {
			return fmt.Errorf("%s: illegal file path (Zip Slip attempt)", f.Name)
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(fpath, os.ModePerm)
			continue
		}

		if err = os.MkdirAll(filepath.Dir(fpath), os.ModePerm); err != nil {
			return err
		}

		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}

		_, err = io.Copy(outFile, rc)
		outFile.Close()
		rc.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

// Creates a tarball in-memory of the build context directory for Docker ImageBuild API
func createTarReader(srcDir string) (io.Reader, error) {
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	defer tw.Close()

	err := filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		relPath, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}
		if relPath == "." {
			return nil
		}

		header, err := tar.FileInfoHeader(info, info.Name())
		if err != nil {
			return err
		}

		header.Name = filepath.ToSlash(relPath)
		if err := tw.WriteHeader(header); err != nil {
			return err
		}

		if info.Mode().IsDir() {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		_, err = io.Copy(tw, file)
		return err
	})

	if err != nil {
		return nil, err
	}
	return &buf, nil
}

func (sm *SandboxManager) releaseSlotAndCleanup(id string, finalStatus string) {
	sm.mutex.Lock()
	sub, exists := sm.submissions[id]
	if !exists || sub.CleanedUp {
		sm.mutex.Unlock()
		return
	}

	sub.CleanedUp = true
	sm.mutex.Unlock()

	ctx := context.Background()

	// Stop & Remove Container
	if sub.ContainerID != "" {
		stopTimeout := 5
		_ = sm.dockerClient.ContainerStop(ctx, sub.ContainerID, container.StopOptions{Timeout: &stopTimeout})
		_ = sm.dockerClient.ContainerRemove(ctx, sub.ContainerID, types.ContainerRemoveOptions{Force: true})
	}

	// Remove Compiled Image
	imageName := fmt.Sprintf("submission-%s:latest", sub.ID)
	_, _ = sm.dockerClient.ImageRemove(ctx, imageName, types.ImageRemoveOptions{Force: true, PruneChildren: true})

	// Remove Temp Folder
	destDir := filepath.Join("/tmp/submissions", sub.ID)
	_ = os.RemoveAll(destDir)

	sm.mutex.Lock()
	sub.Status = finalStatus
	sub.ContainerPort = 0
	sm.activeCount--
	sm.mutex.Unlock()
}

func (sm *SandboxManager) runPipeline(sub *Submission, zipPath string, destDir string) {
	defer os.Remove(zipPath)
	ctx := context.Background()

	// 1. EXTRACT
	sub.updateStatus("extracting")
	fmt.Printf("[SANDBOX] Extracting: %s\n", sub.ID)
	err := unzip(zipPath, destDir)
	if err != nil {
		sub.setError("Extraction failed: " + err.Error())
		sm.releaseSlotAndCleanup(sub.ID, "failed")
		return
	}

	// Validate code structure
	mainCppRoot := filepath.Join(destDir, "main.cpp")
	if _, err := os.Stat(mainCppRoot); os.IsNotExist(err) {
		// main.cpp not in root, look for it recursively in subdirectories
		var foundPath string
		_ = filepath.Walk(destDir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() && info.Name() == "main.cpp" {
				foundPath = path
				return fmt.Errorf("found") // stop walk
			}
			return nil
		})

		if foundPath == "" {
			sub.setError("missing main.cpp")
			sm.releaseSlotAndCleanup(sub.ID, "failed")
			return
		}

		// Copy ALL files from the subfolder UP to the root directory
		subDir := filepath.Dir(foundPath)
		err = filepath.Walk(subDir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if path == subDir {
				return nil
			}

			rel, err := filepath.Rel(subDir, path)
			if err != nil {
				return err
			}

			targetPath := filepath.Join(destDir, rel)
			if info.IsDir() {
				return os.MkdirAll(targetPath, info.Mode())
			}

			return func() error {
				srcFile, err := os.Open(path)
				if err != nil {
					return err
				}
				defer srcFile.Close()

				destFile, err := os.OpenFile(targetPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, info.Mode())
				if err != nil {
					return err
				}
				defer destFile.Close()

				_, err = io.Copy(destFile, srcFile)
				return err
			}()
		})

		if err != nil {
			sub.setError("Failed to copy files from subfolder: " + err.Error())
			sm.releaseSlotAndCleanup(sub.ID, "failed")
			return
		}
	}

	// 2. BUILD DOCKERFILE
	sub.updateStatus("building")
	dockerfilePath := filepath.Join(destDir, "Dockerfile")
	dockerfileContent := `FROM ubuntu:22.04
RUN apt-get update && apt-get install -y g++ curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN curl -L -o httplib.h https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h
RUN curl -L -o json.hpp https://raw.githubusercontent.com/nlohmann/json/develop/single_include/nlohmann/json.hpp
RUN g++ -O2 -std=c++17 -pthread main.cpp -o engine
EXPOSE 8080
CMD ["./engine"]
`
	err = os.WriteFile(dockerfilePath, []byte(dockerfileContent), 0644)
	if err != nil {
		sub.setError("Failed to write Dockerfile: " + err.Error())
		sm.releaseSlotAndCleanup(sub.ID, "failed")
		return
	}

	// 3. BUILD IMAGE
	fmt.Printf("[SANDBOX] Building image: %s\n", sub.ID)
	buildContextTar, err := createTarReader(destDir)
	if err != nil {
		sub.setError("Failed to archive build context: " + err.Error())
		sm.releaseSlotAndCleanup(sub.ID, "failed")
		return
	}

	buildStartTime := time.Now()
	buildResponse, err := sm.dockerClient.ImageBuild(ctx, buildContextTar, types.ImageBuildOptions{
		Dockerfile: "Dockerfile",
		Tags:       []string{fmt.Sprintf("submission-%s:latest", sub.ID)},
		Remove:     true,
	})
	if err != nil {
		sub.setError("Docker ImageBuild API error: " + err.Error())
		sm.releaseSlotAndCleanup(sub.ID, "failed")
		return
	}
	defer buildResponse.Body.Close()

	// Stream compile outputs
	scanner := bufio.NewScanner(buildResponse.Body)
	for scanner.Scan() {
		var logLine struct {
			Stream string `json:"stream"`
			Error  string `json:"error"`
		}
		lineBytes := scanner.Bytes()
		if err := json.Unmarshal(lineBytes, &logLine); err == nil {
			sm.mutex.Lock()
			if logLine.Error != "" {
				sub.BuildLog += "ERROR: " + logLine.Error + "\n"
				sub.Error = logLine.Error
			} else {
				sub.BuildLog += logLine.Stream
			}
			sm.mutex.Unlock()
		} else {
			sm.mutex.Lock()
			sub.BuildLog += string(lineBytes) + "\n"
			sm.mutex.Unlock()
		}
	}

	if sub.Error != "" {
		sm.releaseSlotAndCleanup(sub.ID, "failed")
		return
	}

	buildDuration := time.Since(buildStartTime)
	fmt.Printf("[SANDBOX] Build complete: %s (took %s)\n", sub.ID, buildDuration.Round(time.Second))

	// 4. RUN CONTAINER
	sm.mutex.Lock()
	assignedPort := -1
	for p := sm.basePort; p < sm.basePort+sm.maxContainers; p++ {
		portUsed := false
		for _, otherSub := range sm.submissions {
			if (otherSub.Status == "running" || otherSub.Status == "building") && otherSub.ContainerPort == p {
				portUsed = true
				break
			}
		}
		if !portUsed {
			assignedPort = p
			break
		}
	}

	if assignedPort == -1 {
		sm.mutex.Unlock()
		sub.setError("No host port available")
		sm.releaseSlotAndCleanup(sub.ID, "failed")
		return
	}

	sub.ContainerPort = assignedPort
	sub.ContainerURL = fmt.Sprintf("http://localhost:%d", assignedPort)
	sm.mutex.Unlock()

	config := &container.Config{
		Image:        fmt.Sprintf("submission-%s:latest", sub.ID),
		ExposedPorts: nat.PortSet{"8080/tcp": {}},
	}

	hostConfig := &container.HostConfig{
		PortBindings: nat.PortMap{
			"8080/tcp": []nat.PortBinding{
				{HostIP: "0.0.0.0", HostPort: strconv.Itoa(assignedPort)},
			},
		},
		Resources: container.Resources{
			Memory:   sm.memoryLimit,
			NanoCPUs: sm.cpuLimit,
		},
		NetworkMode: "bridge",
	}

	containerName := "submission-container-" + sub.ID
	containerResp, err := sm.dockerClient.ContainerCreate(ctx, config, hostConfig, nil, nil, containerName)
	if err != nil {
		sub.setError("ContainerCreate failed: " + err.Error())
		sm.releaseSlotAndCleanup(sub.ID, "failed")
		return
	}

	sm.mutex.Lock()
	sub.ContainerID = containerResp.ID
	sm.mutex.Unlock()

	err = sm.dockerClient.ContainerStart(ctx, containerResp.ID, types.ContainerStartOptions{})
	if err != nil {
		sub.setError("ContainerStart failed: " + err.Error())
		sm.releaseSlotAndCleanup(sub.ID, "failed")
		return
	}

	fmt.Printf("[SANDBOX] Container started: %s -> port %d\n", sub.ID, assignedPort)
	sub.updateStatus("running")

	// 5. HEALTH CHECK
	// Default to hitting port 8080 on the Docker bridge IP if we are inside a docker container
	healthURL := fmt.Sprintf("http://localhost:%d/health", assignedPort)
	if os.Getenv("RUNNING_IN_DOCKER") == "true" {
		inspect, err := sm.dockerClient.ContainerInspect(ctx, containerResp.ID)
		if err == nil && inspect.NetworkSettings != nil && inspect.NetworkSettings.IPAddress != "" {
			healthURL = fmt.Sprintf("http://%s:8080/health", inspect.NetworkSettings.IPAddress)
		}
	}

	ready := false
	timeout := time.After(30 * time.Second)
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for !ready {
		select {
		case <-timeout:
			sub.setError("Health check timeout (sandbox not ready)")
			sm.releaseSlotAndCleanup(sub.ID, "failed")
			return
		case <-ticker.C:
			// Check if container exited prematurely
			inspect, err := sm.dockerClient.ContainerInspect(ctx, containerResp.ID)
			if err == nil && (inspect.State.Status == "exited" || inspect.State.Status == "dead") {
				sub.setError(fmt.Sprintf("Container exited prematurely with exit code %d", inspect.State.ExitCode))
				sm.releaseSlotAndCleanup(sub.ID, "failed")
				return
			}

			hc := http.Client{Timeout: 1 * time.Second}
			resp, err := hc.Get(healthURL)
			if err == nil {
				resp.Body.Close()
				if resp.StatusCode == http.StatusOK {
					ready = true
				}
			}
		}
	}

	fmt.Printf("[SANDBOX] Health check passed: %s\n", sub.ContainerURL)

	// 6. AUTO CLEANUP
	go func() {
		time.Sleep(sm.timeout)
		sm.mutex.RLock()
		isCleaned := sub.CleanedUp
		sm.mutex.RUnlock()
		if !isCleaned {
			fmt.Printf("[SANDBOX] Auto-cleanup: %s (timeout reached)\n", sub.ID)
			sm.releaseSlotAndCleanup(sub.ID, "completed")
		}
	}()
}

func handleSubmit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limit request size to 10MB
	r.Body = http.MaxBytesReader(w, r.Body, 10*1024*1024)
	err := r.ParseMultipartForm(10 * 1024 * 1024)
	if err != nil {
		http.Error(w, "Request file size exceeds 10MB limit", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Missing 'file' parameter", http.StatusBadRequest)
		return
	}
	defer file.Close()

	team := r.FormValue("team")
	language := r.FormValue("language")

	if team == "" || language == "" {
		http.Error(w, "Missing 'team' or 'language' parameter", http.StatusBadRequest)
		return
	}

	if language != "cpp" {
		http.Error(w, "Unsupported language. Currently only 'cpp' is supported.", http.StatusBadRequest)
		return
	}

	if !strings.HasSuffix(strings.ToLower(header.Filename), ".zip") {
		http.Error(w, "Only .zip files are allowed", http.StatusBadRequest)
		return
	}

	subID := generateID()

	// Ensure /tmp/submissions directory exists inside the container
	err = os.MkdirAll("/tmp/submissions", 0755)
	if err != nil {
		http.Error(w, "Failed to create submissions directory", http.StatusInternalServerError)
		return
	}

	// Save zip as /tmp/submissions/{submission_id}.zip
	zipPath := filepath.Join("/tmp/submissions", subID+".zip")
	destFile, err := os.OpenFile(zipPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		http.Error(w, "Failed to create temp zip storage", http.StatusInternalServerError)
		return
	}

	_, err = io.Copy(destFile, file)
	destFile.Close()
	if err != nil {
		os.Remove(zipPath)
		http.Error(w, "Failed to save zip file", http.StatusInternalServerError)
		return
	}

	manager.mutex.Lock()
	if manager.activeCount >= manager.maxContainers {
		manager.mutex.Unlock()
		os.Remove(zipPath)
		http.Error(w, "Max concurrent sandboxes reached. Please try again later.", http.StatusServiceUnavailable)
		return
	}
	manager.activeCount++
	manager.mutex.Unlock()

	destDir := filepath.Join("/tmp/submissions", subID)
	err = os.MkdirAll(destDir, 0755)
	if err != nil {
		manager.mutex.Lock()
		manager.activeCount--
		manager.mutex.Unlock()
		os.Remove(zipPath)
		http.Error(w, "Failed to create submission workspace", http.StatusInternalServerError)
		return
	}

	submission := &Submission{
		ID:         subID,
		TeamName:   team,
		Language:   language,
		UploadedAt: time.Now(),
		Status:     "uploading",
	}

	manager.mutex.Lock()
	manager.submissions[subID] = submission
	manager.mutex.Unlock()

	fmt.Printf("[SANDBOX] New submission: %s (Team: %s)\n", subID, team)

	// Async building, compiling, and running in sandbox container
	go manager.runPipeline(submission, zipPath, destDir)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":        "ok",
		"submission_id": subID,
		"message":       "Submission received, building...",
	})
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/status/")
	if id == "" {
		http.Error(w, "Missing submission ID", http.StatusBadRequest)
		return
	}

	manager.mutex.RLock()
	sub, exists := manager.submissions[id]
	manager.mutex.RUnlock()

	if !exists {
		http.Error(w, "Submission not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sub)
}

func handleListSubmissions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	manager.mutex.RLock()
	list := make([]Submission, 0, len(manager.submissions))
	for _, sub := range manager.submissions {
		list = append(list, *sub)
	}
	active := manager.activeCount
	max := manager.maxContainers
	manager.mutex.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"submissions":    list,
		"active_count":   active,
		"max_containers": max,
	})
}

func handleDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/submission/")
	if id == "" {
		http.Error(w, "Missing submission ID", http.StatusBadRequest)
		return
	}

	manager.mutex.Lock()
	_, exists := manager.submissions[id]
	manager.mutex.Unlock()

	if !exists {
		http.Error(w, "Submission not found", http.StatusNotFound)
		return
	}

	go manager.releaseSlotAndCleanup(id, "completed")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"message": "Container stopped and cleaned up",
	})
}

func handleHealth(startTime time.Time) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		manager.mutex.RLock()
		active := manager.activeCount
		max := manager.maxContainers
		manager.mutex.RUnlock()

		uptime := time.Since(startTime).Milliseconds()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":            "ok",
			"active_containers": active,
			"max_containers":    max,
			"uptime_ms":         uptime,
		})
	}
}

func main() {
	startTime := time.Now()

	// Initialize Docker API client
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		fmt.Printf("Error initializing Docker client: %s\n", err.Error())
		os.Exit(1)
	}

	port := getEnv("PORT", "9090")
	maxContainers := getEnvInt("MAX_CONTAINERS", 5)
	cpuLimit := getEnvFloat("CPU_LIMIT", 1.0)
	memLimitStr := getEnv("MEMORY_LIMIT", "512m")
	timeoutSec := getEnvInt("TIMEOUT_SEC", 120)
	basePort := getEnvInt("BASE_PORT", 10000)

	manager = &SandboxManager{
		dockerClient:  cli,
		submissions:   make(map[string]*Submission),
		maxContainers: maxContainers,
		cpuLimit:      int64(cpuLimit * 1000000000), // Convert to NanoCPUs
		memoryLimit:   parseMemoryLimit(memLimitStr),
		timeout:       time.Duration(timeoutSec) * time.Second,
		basePort:      basePort,
	}

	// Register Routes
	http.HandleFunc("/submit", handleSubmit)
	http.HandleFunc("/status/", handleStatus)
	http.HandleFunc("/submissions", handleListSubmissions)
	http.HandleFunc("/submission/", handleDelete)
	http.HandleFunc("/health", handleHealth(startTime))

	fmt.Printf("[SANDBOX RUNNER] Sandbox manager running on port %s\n", port)
	if err := http.ListenAndServe("0.0.0.0:"+port, nil); err != nil {
		fmt.Printf("HTTP server failed: %s\n", err.Error())
		os.Exit(1)
	}
}
