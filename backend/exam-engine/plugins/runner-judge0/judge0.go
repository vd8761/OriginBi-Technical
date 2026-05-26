package runnerjudge0

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Status struct {
	ID          int    `json:"id"`
	Description string `json:"description"`
}

type RawResult struct {
	Stdout        *string `json:"stdout"`
	Stderr        *string `json:"stderr"`
	CompileOutput *string `json:"compile_output"`
	Message       *string `json:"message"`
	Status        Status  `json:"status"`
	Time          *string `json:"time"`
	Memory        *int    `json:"memory"`
	Token         string  `json:"token"`
}

type Result struct {
	Stdout        string
	Stderr        string
	CompileOutput string
	Message       string
	Status        Status
	Time          *string
	Memory        *int
	Token         string
}

type Client struct {
	BaseURL    string
	HTTPClient *http.Client
}

func (c Client) Post(ctx context.Context, payload map[string]any, stdin string) (Result, error) {
	body := cloneMap(payload)
	body["stdin"] = encodeBase64(stdin)
	raw, err := json.Marshal(body)
	if err != nil {
		return Result{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/submissions?base64_encoded=true&wait=true", bytes.NewReader(raw))
	if err != nil {
		return Result{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	httpClient := c.HTTPClient
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	res, err := httpClient.Do(req)
	if err != nil {
		return Result{}, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 8<<10))
		if len(body) > 0 {
			return Result{}, fmt.Errorf("status %d: %s", res.StatusCode, string(body))
		}
		return Result{}, fmt.Errorf("status %d", res.StatusCode)
	}
	var rawResult RawResult
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&rawResult); err != nil {
		return Result{}, err
	}
	return Decode(rawResult), nil
}

// BatchOptions controls PostBatch behavior. PollInterval defaults to 200ms,
// MaxChunk defaults to 20 (Judge0's MAX_SUBMISSION_BATCH_SIZE default). OnResult
// is called once per submission as it first transitions to a terminal status
// (status.id >= 3); callers use it to stream per-test progress to clients.
// The callback runs on the polling goroutine, so it must not block.
type BatchOptions struct {
	MaxChunk     int
	PollInterval time.Duration
	OnResult     func(idx int, r Result)
}

// PostBatch submits N stdins against a single source payload using Judge0's
// /submissions/batch endpoint, then polls until every result is terminal.
// Returns results in the same order as stdins. Chunks larger than MaxChunk are
// split into sequential batches; per-chunk poll loops still run in parallel
// inside Judge0.
func (c Client) PostBatch(ctx context.Context, payload map[string]any, stdins []string, opts BatchOptions) ([]Result, error) {
	if len(stdins) == 0 {
		return nil, nil
	}
	chunk := opts.MaxChunk
	if chunk <= 0 {
		chunk = 20
	}
	pollEvery := opts.PollInterval
	if pollEvery <= 0 {
		pollEvery = 200 * time.Millisecond
	}
	out := make([]Result, len(stdins))
	for start := 0; start < len(stdins); start += chunk {
		end := start + chunk
		if end > len(stdins) {
			end = len(stdins)
		}
		tokens, err := c.submitBatch(ctx, payload, stdins[start:end])
		if err != nil {
			return nil, err
		}
		if err := c.pollBatch(ctx, tokens, out, start, pollEvery, opts.OnResult); err != nil {
			return nil, err
		}
	}
	return out, nil
}

func (c Client) submitBatch(ctx context.Context, payload map[string]any, stdins []string) ([]string, error) {
	subs := make([]map[string]any, len(stdins))
	for i, stdin := range stdins {
		body := cloneMap(payload)
		body["stdin"] = encodeBase64(stdin)
		subs[i] = body
	}
	raw, err := json.Marshal(map[string]any{"submissions": subs})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/submissions/batch?base64_encoded=true", bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := c.httpClient().Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 8<<10))
		return nil, fmt.Errorf("batch submit status %d: %s", res.StatusCode, string(body))
	}
	var resp []struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&resp); err != nil {
		return nil, err
	}
	if len(resp) != len(stdins) {
		return nil, fmt.Errorf("batch submit returned %d tokens for %d stdins", len(resp), len(stdins))
	}
	tokens := make([]string, len(resp))
	for i, r := range resp {
		if r.Token == "" {
			return nil, fmt.Errorf("batch submit returned empty token at index %d", i)
		}
		tokens[i] = r.Token
	}
	return tokens, nil
}

func (c Client) pollBatch(ctx context.Context, tokens []string, out []Result, baseIdx int, interval time.Duration, onResult func(int, Result)) error {
	seen := make([]bool, len(tokens))
	tokenList := strings.Join(tokens, ",")
	pollURL := c.BaseURL + "/submissions/batch?base64_encoded=true&fields=*&tokens=" + url.QueryEscape(tokenList)
	for {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, pollURL, nil)
		if err != nil {
			return err
		}
		res, err := c.httpClient().Do(req)
		if err != nil {
			return err
		}
		body, readErr := io.ReadAll(io.LimitReader(res.Body, 8<<20))
		res.Body.Close()
		if readErr != nil {
			return readErr
		}
		if res.StatusCode < 200 || res.StatusCode >= 300 {
			return fmt.Errorf("batch poll status %d: %s", res.StatusCode, string(body))
		}
		var parsed struct {
			Submissions []RawResult `json:"submissions"`
		}
		if err := json.Unmarshal(body, &parsed); err != nil {
			return err
		}
		if len(parsed.Submissions) != len(tokens) {
			return fmt.Errorf("batch poll returned %d submissions for %d tokens", len(parsed.Submissions), len(tokens))
		}
		allDone := true
		for i, raw := range parsed.Submissions {
			if raw.Status.ID < 3 {
				allDone = false
				continue
			}
			if seen[i] {
				continue
			}
			seen[i] = true
			r := Decode(raw)
			out[baseIdx+i] = r
			if onResult != nil {
				onResult(baseIdx+i, r)
			}
		}
		if allDone {
			return nil
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(interval):
		}
	}
}

func (c Client) httpClient() *http.Client {
	if c.HTTPClient != nil {
		return c.HTTPClient
	}
	return http.DefaultClient
}

func Decode(raw RawResult) Result {
	return Result{
		Stdout:        decodeMaybeBase64(raw.Stdout),
		Stderr:        decodeMaybeBase64(raw.Stderr),
		CompileOutput: decodeMaybeBase64(raw.CompileOutput),
		Message:       decodeMaybeBase64(raw.Message),
		Status:        raw.Status,
		Time:          raw.Time,
		Memory:        raw.Memory,
		Token:         raw.Token,
	}
}

func decodeMaybeBase64(v *string) string {
	if v == nil || *v == "" {
		return ""
	}
	bytes, err := base64.StdEncoding.DecodeString(*v)
	if err != nil {
		return *v
	}
	return string(bytes)
}

func cloneMap(in map[string]any) map[string]any {
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}
