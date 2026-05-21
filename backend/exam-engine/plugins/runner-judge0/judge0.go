package runnerjudge0

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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
