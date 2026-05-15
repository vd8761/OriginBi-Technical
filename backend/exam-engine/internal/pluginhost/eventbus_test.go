package pluginhost

import (
	"context"
	"encoding/json"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestEventBus_PublishFansOutToSubscribers(t *testing.T) {
	bus := NewEventBus()

	var aCount, bCount, otherCount int32
	bus.Subscribe("proctoring.tab.switched", func(ctx context.Context, e Event) error {
		atomic.AddInt32(&aCount, 1)
		if e.Kind != "proctoring.tab.switched" {
			t.Errorf("subscriber A saw wrong kind %q", e.Kind)
		}
		return nil
	})
	bus.Subscribe("proctoring.tab.switched", func(ctx context.Context, e Event) error {
		atomic.AddInt32(&bCount, 1)
		return nil
	})
	bus.Subscribe("other.kind", func(ctx context.Context, e Event) error {
		atomic.AddInt32(&otherCount, 1)
		return nil
	})

	attemptID := uuid.New()
	for i := 0; i < 3; i++ {
		if err := bus.Publish(context.Background(), Event{
			Kind:       "proctoring.tab.switched",
			AttemptID:  attemptID,
			OccurredAt: time.Now(),
			Payload:    json.RawMessage(`{}`),
		}); err != nil {
			t.Fatalf("publish: %v", err)
		}
	}

	if atomic.LoadInt32(&aCount) != 3 {
		t.Errorf("subscriber A: got %d, want 3", aCount)
	}
	if atomic.LoadInt32(&bCount) != 3 {
		t.Errorf("subscriber B: got %d, want 3", bCount)
	}
	if atomic.LoadInt32(&otherCount) != 0 {
		t.Errorf("subscriber for other.kind should not fire on tab events, got %d", otherCount)
	}
}

func TestEventBus_OneSubscriberErrorDoesNotStopOthers(t *testing.T) {
	bus := NewEventBus()

	var goodFired int32
	bus.Subscribe("attempt.started", func(ctx context.Context, e Event) error {
		return errors.New("boom")
	})
	bus.Subscribe("attempt.started", func(ctx context.Context, e Event) error {
		atomic.AddInt32(&goodFired, 1)
		return nil
	})

	err := bus.Publish(context.Background(), Event{
		Kind:       "attempt.started",
		OccurredAt: time.Now(),
	})
	if err == nil {
		t.Fatal("expected the first subscriber's error to surface")
	}
	if atomic.LoadInt32(&goodFired) != 1 {
		t.Errorf("second subscriber must still fire even when the first errors; got %d", goodFired)
	}
}

func TestCommandHub_BuffersUntilListenerAttaches(t *testing.T) {
	hub := NewCommandHub()
	attemptID := uuid.New()

	for i := 0; i < 5; i++ {
		hub.Send(attemptID, Command{Kind: "warning.show", Payload: json.RawMessage(`{}`)})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()
	commands, unsubscribe := hub.Listen(ctx, attemptID)
	defer unsubscribe()

	received := 0
loop:
	for received < 5 {
		select {
		case <-commands:
			received++
		case <-ctx.Done():
			break loop
		}
	}
	if received != 5 {
		t.Errorf("expected 5 buffered commands to drain to new listener, got %d", received)
	}
}

func TestCommandHub_LiveDeliveryToActiveListener(t *testing.T) {
	hub := NewCommandHub()
	attemptID := uuid.New()

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()
	commands, unsubscribe := hub.Listen(ctx, attemptID)
	defer unsubscribe()

	hub.Send(attemptID, Command{Kind: "attempt.terminate", Payload: json.RawMessage(`{"reason":"tab-switch-limit"}`)})

	select {
	case cmd := <-commands:
		if cmd.Kind != "attempt.terminate" {
			t.Errorf("got kind %q, want attempt.terminate", cmd.Kind)
		}
	case <-ctx.Done():
		t.Fatal("listener did not receive the live command in time")
	}
}
