package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"os"
	"sort"
	"strconv"
	"sync"
	"sync/atomic"
	"time"
)

// Global progress counters (updated atomically)
var (
	globalSent    int64
	globalSuccess int64
	globalFailed  int64
)

type BotConfig struct {
	BotID     int
	Persona   string
	TargetURL string
	RateTPS   int
	Duration  time.Duration
}

type BotMetrics struct {
	BotID        int
	TotalSent    int64
	TotalSuccess int64
	TotalFailed  int64
	TotalFilled  int64
	TotalQueued  int64
	Latencies    []int64 // Nanoseconds
	StartTime    time.Time
	EndTime      time.Time
}

type OrderRequest struct {
	ID       string  `json:"id"`
	Side     string  `json:"side"`
	Type     string  `json:"type"`
	Price    float64 `json:"price,omitempty"`
	Quantity int     `json:"quantity"`
}

type OrderResponse struct {
	Status         string  `json:"status"`
	OrderID        string  `json:"order_id"`
	Result         string  `json:"result"`
	FilledQuantity int     `json:"filled_quantity"`
	FilledPrice    float64 `json:"filled_price"`
	Message        string  `json:"message,omitempty"`
}

type FinalReport struct {
	TotalOrders    int64
	SuccessOrders  int64
	FailedOrders   int64
	FilledOrders   int64
	QueuedOrders   int64
	ActualTPS      float64
	P50LatencyMs   float64
	P90LatencyMs   float64
	P99LatencyMs   float64
	MaxLatencyMs   float64
	MinLatencyMs   float64
	CorrectnessPct float64
	DurationSec    float64
	BotCount       int
}

// Helper to format integers with commas
func formatInt(n int64) string {
	in := strconv.FormatInt(n, 10)
	numOfDigits := len(in)
	if numOfDigits <= 3 {
		return in
	}
	var buf bytes.Buffer
	for i, char := range in {
		if (numOfDigits-i)%3 == 0 && i != 0 {
			buf.WriteRune(',')
		}
		buf.WriteRune(char)
	}
	return buf.String()
}

// Get string environment variable with fallback
func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}

// Get integer environment variable with fallback
func getEnvInt(key string, fallback int) int {
	if val, ok := os.LookupEnv(key); ok {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return fallback
}

func sendOrder(client *http.Client, targetURL string, order OrderRequest) (OrderResponse, time.Duration, error) {
	url := fmt.Sprintf("%s/order", targetURL)
	bodyBytes, err := json.Marshal(order)
	if err != nil {
		return OrderResponse{}, 0, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return OrderResponse{}, 0, err
	}
	req.Header.Set("Content-Type", "application/json")

	start := time.Now()
	resp, err := client.Do(req)
	latency := time.Since(start)

	if err != nil {
		return OrderResponse{}, latency, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		var errResp OrderResponse
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		return errResp, latency, fmt.Errorf("HTTP error: %d", resp.StatusCode)
	}

	var orderResp OrderResponse
	err = json.NewDecoder(resp.Body).Decode(&orderResp)
	if err != nil {
		return OrderResponse{}, latency, err
	}

	return orderResp, latency, nil
}

func cancelOrder(client *http.Client, targetURL string, orderID string) (bool, time.Duration, error) {
	url := fmt.Sprintf("%s/order/%s", targetURL, orderID)

	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return false, 0, err
	}

	start := time.Now()
	resp, err := client.Do(req)
	latency := time.Since(start)

	if err != nil {
		return false, latency, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, latency, fmt.Errorf("HTTP error: %d", resp.StatusCode)
	}

	var orderResp OrderResponse
	err = json.NewDecoder(resp.Body).Decode(&orderResp)
	if err != nil {
		return false, latency, err
	}

	return orderResp.Status == "ok", latency, nil
}

func runBot(config BotConfig) BotMetrics {
	metrics := BotMetrics{
		BotID:     config.BotID,
		StartTime: time.Now(),
		Latencies: make([]int64, 0, 1000),
	}

	// Connection pooling configuration inside the local client
	client := &http.Client{
		Timeout: 5 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 100,
		},
	}

	// Create local rand source to prevent lock contention on global rand
	r := rand.New(rand.NewSource(time.Now().UnixNano() + int64(config.BotID)))

	tickerInterval := time.Second / time.Duration(config.RateTPS)
	ticker := time.NewTicker(tickerInterval)
	defer ticker.Stop()

	stopChan := time.After(config.Duration)

	seq := 0
	isBuy := true

	for {
		select {
		case <-stopChan:
			metrics.EndTime = time.Now()
			return metrics
		case <-ticker.C:
			seq++
			orderID := fmt.Sprintf("BOT%03d-ORD-%06d", config.BotID, seq)

			side := "BUY"
			if !isBuy {
				side = "SELL"
			}
			isBuy = !isBuy

			var req OrderRequest
			req.ID = orderID
			req.Side = side

			switch config.Persona {
			case "MARKET_MAKER":
				req.Type = "LIMIT"
				req.Price = math.Round((r.Float64()*3.0+99.0)*100) / 100
				req.Quantity = r.Intn(91) + 10 // 10 to 100
			case "AGGRESSIVE_TAKER":
				req.Type = "MARKET"
				req.Price = 0.0
				req.Quantity = r.Intn(151) + 50 // 50 to 200
			case "CANCEL_SPAMMER":
				req.Type = "LIMIT"
				req.Price = math.Round((r.Float64()*3.0+99.0)*100) / 100
				req.Quantity = r.Intn(10) + 1 // 1 to 10
			}

			atomic.AddInt64(&globalSent, 1)
			metrics.TotalSent++

			resp, latency, err := sendOrder(client, config.TargetURL, req)
			metrics.Latencies = append(metrics.Latencies, latency.Nanoseconds())

			if err != nil {
				atomic.AddInt64(&globalFailed, 1)
				metrics.TotalFailed++
				continue
			}

			atomic.AddInt64(&globalSuccess, 1)
			metrics.TotalSuccess++

			if resp.Result == "FILLED" {
				metrics.TotalFilled++
			} else if resp.Result == "QUEUED" || resp.Result == "PARTIAL" {
				metrics.TotalQueued++
			}

			// CANCEL_SPAMMER immediately cancels the order if queued or partial
			if config.Persona == "CANCEL_SPAMMER" && (resp.Result == "QUEUED" || resp.Result == "PARTIAL") {
				_, cancelLatency, _ := cancelOrder(client, config.TargetURL, resp.OrderID)
				metrics.Latencies = append(metrics.Latencies, cancelLatency.Nanoseconds())
			}
		}
	}
}

func calculatePercentile(latencies []int64, p float64) float64 {
	if len(latencies) == 0 {
		return 0.0
	}
	idx := int(math.Ceil(float64(len(latencies))*p/100.0)) - 1
	if idx < 0 {
		idx = 0
	} else if idx >= len(latencies) {
		idx = len(latencies) - 1
	}
	return float64(latencies[idx]) / 1000000.0 // Return in Milliseconds
}

func aggregateMetrics(allMetrics []BotMetrics, durationSec float64, botCount int) FinalReport {
	var totalSent, totalSuccess, totalFailed, totalFilled, totalQueued int64
	var allLatencies []int64

	for _, bm := range allMetrics {
		totalSent += bm.TotalSent
		totalSuccess += bm.TotalSuccess
		totalFailed += bm.TotalFailed
		totalFilled += bm.TotalFilled
		totalQueued += bm.TotalQueued
		allLatencies = append(allLatencies, bm.Latencies...)
	}

	sort.Slice(allLatencies, func(i, j int) bool {
		return allLatencies[i] < allLatencies[j]
	})

	p50 := calculatePercentile(allLatencies, 50.0)
	p90 := calculatePercentile(allLatencies, 90.0)
	p99 := calculatePercentile(allLatencies, 99.0)

	var maxVal, minVal float64
	if len(allLatencies) > 0 {
		maxVal = float64(allLatencies[len(allLatencies)-1]) / 1000000.0
		minVal = float64(allLatencies[0]) / 1000000.0
	}

	actualTPS := float64(totalSent) / durationSec

	correctnessPct := 0.0
	if totalSuccess > 0 {
		correctnessPct = float64(totalFilled) / float64(totalSuccess) * 100.0
	}

	return FinalReport{
		TotalOrders:    totalSent,
		SuccessOrders:  totalSuccess,
		FailedOrders:   totalFailed,
		FilledOrders:   totalFilled,
		QueuedOrders:   totalQueued,
		ActualTPS:      actualTPS,
		P50LatencyMs:   p50,
		P90LatencyMs:   p90,
		P99LatencyMs:   p99,
		MaxLatencyMs:   maxVal,
		MinLatencyMs:   minVal,
		CorrectnessPct: correctnessPct,
		DurationSec:    durationSec,
		BotCount:       botCount,
	}
}

func main() {
	// Seed math/rand
	rand.Seed(time.Now().UnixNano())

	// Read environment variables
	targetURL := getEnv("TARGET_URL", "http://localhost:8081")
	botCount := getEnvInt("BOT_COUNT", 10)
	durationSec := getEnvInt("DURATION_SEC", 30)
	rateTPS := getEnvInt("RATE_TPS", 100)
	personaConfig := getEnv("PERSONA", "mixed")

	fmt.Printf("[BOT FLEET] Starting %d bots against %s\n", botCount, targetURL)
	fmt.Printf("[BOT FLEET] Duration: %ds | Rate: %d TPS per bot\n", durationSec, rateTPS)

	var wg sync.WaitGroup
	metricsChan := make(chan BotMetrics, botCount)

	duration := time.Duration(durationSec) * time.Second

	// Run background progress logger
	progressStop := make(chan struct{})
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()
		elapsed := 0
		for {
			select {
			case <-progressStop:
				return
			case <-ticker.C:
				elapsed += 5
				sent := atomic.LoadInt64(&globalSent)
				success := atomic.LoadInt64(&globalSuccess)
				tps := float64(sent) / float64(elapsed)
				fmt.Printf("[PROGRESS] %ds: %s orders sent | %s ok | TPS: %.0f\n",
					elapsed, formatInt(sent), formatInt(success), tps)
			}
		}
	}()

	// Launch bot fleet
	for i := 1; i <= botCount; i++ {
		wg.Add(1)

		botPersona := personaConfig
		if personaConfig == "mixed" {
			val := rand.Intn(100)
			if val < 40 {
				botPersona = "MARKET_MAKER"
			} else if val < 80 {
				botPersona = "AGGRESSIVE_TAKER"
			} else {
				botPersona = "CANCEL_SPAMMER"
			}
		}

		config := BotConfig{
			BotID:     i,
			Persona:   botPersona,
			TargetURL: targetURL,
			RateTPS:   rateTPS,
			Duration:  duration,
		}

		go func(cfg BotConfig) {
			defer wg.Done()
			metricsChan <- runBot(cfg)
		}(config)
	}

	wg.Wait()
	close(progressStop)

	var allMetrics []BotMetrics
	for i := 0; i < botCount; i++ {
		allMetrics = append(allMetrics, <-metricsChan)
	}

	report := aggregateMetrics(allMetrics, float64(durationSec), botCount)

	// Score calculations
	var speedScore int
	if report.P99LatencyMs < 1.0 {
		speedScore = 100
	} else if report.P99LatencyMs < 5.0 {
		speedScore = 90
	} else if report.P99LatencyMs < 10.0 {
		speedScore = 75
	} else if report.P99LatencyMs < 50.0 {
		speedScore = 50
	} else {
		speedScore = 25
	}

	var stabilityScore int
	failedPct := 0.0
	if report.TotalOrders > 0 {
		failedPct = float64(report.FailedOrders) / float64(report.TotalOrders) * 100.0
	}

	if failedPct < 0.1 {
		stabilityScore = 100
	} else if failedPct < 1.0 {
		stabilityScore = 90
	} else if failedPct < 5.0 {
		stabilityScore = 75
	} else {
		stabilityScore = 50
	}

	correctnessScore := report.CorrectnessPct

	composite := (float64(speedScore) * 0.40) + (float64(stabilityScore) * 0.35) + (correctnessScore * 0.25)

	successPct := 0.0
	if report.TotalOrders > 0 {
		successPct = float64(report.SuccessOrders) / float64(report.TotalOrders) * 100.0
	}

	fmt.Println("============================================")
	fmt.Println("IICPC BOT FLEET — FINAL REPORT")
	fmt.Println("============================================")
	fmt.Printf("Target:        %s\n", targetURL)
	fmt.Printf("Bots:          %d\n", report.BotCount)
	fmt.Printf("Duration:      %.0fs\n", report.DurationSec)
	fmt.Println("--------------------------------------------")
	fmt.Println("THROUGHPUT")
	fmt.Printf("  Total Orders:     %s\n", formatInt(report.TotalOrders))
	fmt.Printf("  Successful:       %s  (%.1f%%)\n", formatInt(report.SuccessOrders), successPct)
	fmt.Printf("  Failed:           %s  (%.1f%%)\n", formatInt(report.FailedOrders), failedPct)
	fmt.Printf("  Actual TPS:       %.1f\n", report.ActualTPS)
	fmt.Println("--------------------------------------------")
	fmt.Println("LATENCY")
	fmt.Printf("  P50:    %.2fms\n", report.P50LatencyMs)
	fmt.Printf("  P90:    %.2fms\n", report.P90LatencyMs)
	fmt.Printf("  P99:    %.2fms\n", report.P99LatencyMs)
	fmt.Printf("  Max:    %.2fms\n", report.MaxLatencyMs)
	fmt.Printf("  Min:    %.2fms\n", report.MinLatencyMs)
	fmt.Println("--------------------------------------------")
	fmt.Println("CORRECTNESS")
	fmt.Printf("  Filled Orders:    %s\n", formatInt(report.FilledOrders))
	fmt.Printf("  Queued Orders:    %s\n", formatInt(report.QueuedOrders))
	fmt.Printf("  Correctness:      %.1f%%\n", report.CorrectnessPct)
	fmt.Println("--------------------------------------------")
	fmt.Println("SCORE ESTIMATE")
	fmt.Printf("  Speed Score:      %d/100\n", speedScore)
	fmt.Printf("  Stability Score:  %d/100\n", stabilityScore)
	fmt.Printf("  Correctness:      %.0f/100\n", correctnessScore)
	fmt.Printf("  COMPOSITE:        %.1f/100\n", composite)
	fmt.Println("============================================")
}
