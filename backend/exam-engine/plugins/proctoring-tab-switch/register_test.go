package proctoringtabswitch

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/originbi/exam-engine/internal/pluginhost"
)

func TestControllerTerminatesOnThresholdOnce(t *testing.T) {
	pluginID := uuid.New()
	attemptID := uuid.New()
	decisionID := uuid.New()

	var decisions []pluginhost.DecisionInput
	var commands []pluginhost.Command
	controller := NewController(pluginID, ControllerOptions{
		Threshold: 3,
		Now:       func() time.Time { return time.Unix(100, 0).UTC() },
		RecordDecision: func(ctx context.Context, in pluginhost.DecisionInput) (uuid.UUID, error) {
			decisions = append(decisions, in)
			return decisionID, nil
		},
		SendCommand: func(_ uuid.UUID, cmd pluginhost.Command) {
			commands = append(commands, cmd)
		},
	})

	for i := 0; i < 4; i++ {
		if err := controller.HandleTabSwitched(context.Background(), pluginhost.Event{
			Kind:       EventTabSwitched,
			AttemptID:  attemptID,
			OccurredAt: time.Unix(int64(i), 0).UTC(),
			Payload:    json.RawMessage(`{}`),
		}); err != nil {
			t.Fatalf("HandleTabSwitched #%d: %v", i+1, err)
		}
	}

	if len(decisions) != 1 {
		t.Fatalf("decisions: got %d, want 1", len(decisions))
	}
	if decisions[0].Decision != "auto_terminate" {
		t.Fatalf("decision: got %q, want auto_terminate", decisions[0].Decision)
	}
	if decisions[0].PluginID != pluginID {
		t.Fatalf("plugin id: got %s, want %s", decisions[0].PluginID, pluginID)
	}

	if len(commands) != 3 {
		t.Fatalf("commands: got %d, want 3 (two warnings + terminate)", len(commands))
	}
	if commands[0].Kind != CommandWarningToast || commands[1].Kind != CommandWarningToast {
		t.Fatalf("first two commands should be warnings, got %q and %q", commands[0].Kind, commands[1].Kind)
	}
	if commands[2].Kind != CommandAttemptTerminate {
		t.Fatalf("final command: got %q, want %q", commands[2].Kind, CommandAttemptTerminate)
	}
}

func TestControllerClearsAttemptStateOnSubmit(t *testing.T) {
	controller := NewController(uuid.New(), ControllerOptions{Threshold: 2})
	attemptID := uuid.New()

	if err := controller.HandleTabSwitched(context.Background(), pluginhost.Event{
		Kind:      EventTabSwitched,
		AttemptID: attemptID,
	}); err != nil {
		t.Fatal(err)
	}
	if err := controller.HandleAttemptClosed(context.Background(), pluginhost.Event{
		Kind:      EventAttemptSubmitted,
		AttemptID: attemptID,
	}); err != nil {
		t.Fatal(err)
	}

	controller.mu.Lock()
	defer controller.mu.Unlock()
	if _, ok := controller.counts[attemptID]; ok {
		t.Fatal("attempt count was not cleared")
	}
}
