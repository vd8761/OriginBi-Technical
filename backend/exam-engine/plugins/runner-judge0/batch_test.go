package runnerjudge0

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// fakeJudge0 minimally simulates POST /submissions/batch and GET
// /submissions/batch?tokens=… so PostBatch can be exercised end to end.
type fakeJudge0 struct {
	mu      sync.Mutex
	results map[string]RawResult // token -> result
	pollHit int32                // number of GET /submissions/batch calls
	postHit int32                // number of POST /submissions/batch calls
}

func (f *fakeJudge0) handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/submissions/batch", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			atomic.AddInt32(&f.postHit, 1)
			var body struct {
				Submissions []map[string]any `json:"submissions"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			resp := make([]map[string]string, 0, len(body.Submissions))
			f.mu.Lock()
			defer f.mu.Unlock()
			for i, sub := range body.Submissions {
				stdinB64, _ := sub["stdin"].(string)
				stdin, _ := base64.StdEncoding.DecodeString(stdinB64)
				token := "tok-" + strings.TrimSpace(string(stdin))
				if token == "tok-" {
					token = "tok-empty"
				}
				_ = i
				if _, ok := f.results[token]; !ok {
					// default: instantly accepted with echoed stdin
					f.results[token] = RawResult{
						Status: Status{ID: 3, Description: "Accepted"},
						Stdout: ptr(base64.StdEncoding.EncodeToString(stdin)),
						Token:  token,
					}
				}
				resp = append(resp, map[string]string{"token": token})
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(resp)
		case http.MethodGet:
			atomic.AddInt32(&f.pollHit, 1)
			tokens := strings.Split(r.URL.Query().Get("tokens"), ",")
			out := make([]RawResult, len(tokens))
			f.mu.Lock()
			for i, t := range tokens {
				out[i] = f.results[t]
			}
			f.mu.Unlock()
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{"submissions": out})
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
	return mux
}

func ptr(s string) *string { return &s }

func TestPostBatchReturnsResultsInOrder(t *testing.T) {
	f := &fakeJudge0{results: map[string]RawResult{}}
	srv := httptest.NewServer(f.handler())
	defer srv.Close()

	stdins := []string{"a", "b", "c"}
	results, err := Client{BaseURL: srv.URL}.PostBatch(
		context.Background(),
		map[string]any{"language_id": 71, "source_code": "x"},
		stdins,
		BatchOptions{PollInterval: 5 * time.Millisecond},
	)
	if err != nil {
		t.Fatalf("PostBatch err: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}
	for i, want := range stdins {
		if results[i].Stdout != want {
			t.Errorf("idx %d: want stdout %q, got %q", i, want, results[i].Stdout)
		}
	}
	if got := atomic.LoadInt32(&f.postHit); got != 1 {
		t.Errorf("expected 1 POST, got %d", got)
	}
}

func TestPostBatchChunksLargeInput(t *testing.T) {
	f := &fakeJudge0{results: map[string]RawResult{}}
	srv := httptest.NewServer(f.handler())
	defer srv.Close()

	stdins := make([]string, 25) // 25 > default chunk 20
	for i := range stdins {
		stdins[i] = "in" + string(rune('A'+i))
	}
	_, err := Client{BaseURL: srv.URL}.PostBatch(
		context.Background(),
		map[string]any{"language_id": 71, "source_code": "x"},
		stdins,
		BatchOptions{MaxChunk: 20, PollInterval: 5 * time.Millisecond},
	)
	if err != nil {
		t.Fatalf("PostBatch err: %v", err)
	}
	if got := atomic.LoadInt32(&f.postHit); got != 2 {
		t.Errorf("expected 2 POSTs (chunked at 20), got %d", got)
	}
}

func TestPostBatchPollsUntilTerminal(t *testing.T) {
	f := &fakeJudge0{results: map[string]RawResult{}}
	// seed both tokens as pending; flip to accepted after first poll
	f.results["tok-x"] = RawResult{Status: Status{ID: 1, Description: "In Queue"}, Token: "tok-x"}
	f.results["tok-y"] = RawResult{Status: Status{ID: 1, Description: "In Queue"}, Token: "tok-y"}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			polls := atomic.AddInt32(&f.pollHit, 1)
			if polls >= 2 {
				f.mu.Lock()
				f.results["tok-x"] = RawResult{Status: Status{ID: 3, Description: "Accepted"}, Stdout: ptr(base64.StdEncoding.EncodeToString([]byte("x"))), Token: "tok-x"}
				f.results["tok-y"] = RawResult{Status: Status{ID: 3, Description: "Accepted"}, Stdout: ptr(base64.StdEncoding.EncodeToString([]byte("y"))), Token: "tok-y"}
				f.mu.Unlock()
			}
		}
		f.handler().ServeHTTP(w, r)
	}))
	defer srv.Close()

	var first int32
	results, err := Client{BaseURL: srv.URL}.PostBatch(
		context.Background(),
		map[string]any{"language_id": 71, "source_code": "x"},
		[]string{"x", "y"},
		BatchOptions{
			PollInterval: 5 * time.Millisecond,
			OnResult: func(idx int, r Result) {
				atomic.AddInt32(&first, 1)
				if r.Status.ID != 3 {
					t.Errorf("onResult called with non-terminal status %d", r.Status.ID)
				}
			},
		},
	)
	if err != nil {
		t.Fatalf("PostBatch err: %v", err)
	}
	if len(results) != 2 || results[0].Stdout != "x" || results[1].Stdout != "y" {
		t.Errorf("unexpected results: %+v", results)
	}
	if got := atomic.LoadInt32(&first); got != 2 {
		t.Errorf("expected onResult called twice, got %d", got)
	}
	if got := atomic.LoadInt32(&f.pollHit); got < 2 {
		t.Errorf("expected ≥2 polls, got %d", got)
	}
}
