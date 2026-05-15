package pluginhost

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Event is the in-process notification published by the kernel and by plugins.
// It carries the same kind of payload that ends up in attempt_events on disk:
// telemetry is still the source of truth; the bus is for in-memory reactions.
//
// Subscribers run synchronously inside Publish. They MUST be cheap and MUST
// NOT block on I/O. Long-running work belongs in a goroutine they spawn.
type Event struct {
	Kind       string
	AttemptID  uuid.UUID
	UserID     int64
	PluginID   uuid.UUID
	Severity   int16
	OccurredAt time.Time
	// Payload is the raw event body. Plugins decode it according to their own
	// schema. The bus never inspects it.
	Payload json.RawMessage
}

// Subscriber is the function shape a plugin registers. Errors are logged but
// do not stop other subscribers — one bad plugin must not poison the bus.
type Subscriber func(ctx context.Context, e Event) error

// EventBus is the in-process publish/subscribe registered alongside Registry.
// Lookups are O(kinds) where kinds is the number of distinct event kinds
// observed at runtime; publication is O(subscribers for that kind).
type EventBus struct {
	mu   sync.RWMutex
	subs map[string][]Subscriber
}

// NewEventBus returns a ready-to-use bus.
func NewEventBus() *EventBus {
	return &EventBus{subs: map[string][]Subscriber{}}
}

// Subscribe attaches a subscriber to a single event kind. Plugins call this
// during Register. Unsubscribe is intentionally not exposed in v1 — plugins
// register at boot and live for the process lifetime.
func (b *EventBus) Subscribe(kind string, sub Subscriber) {
	if b == nil || sub == nil || kind == "" {
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	b.subs[kind] = append(b.subs[kind], sub)
}

// Publish fans an event out to every subscriber for its kind. Returns the
// first subscriber error encountered, but always calls every subscriber so a
// crash in one does not silence the rest. The caller chooses whether to log
// that error or escalate.
func (b *EventBus) Publish(ctx context.Context, e Event) error {
	if b == nil {
		return nil
	}
	b.mu.RLock()
	subs := append([]Subscriber(nil), b.subs[e.Kind]...)
	b.mu.RUnlock()

	var firstErr error
	for _, sub := range subs {
		if err := sub(ctx, e); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}

// Events returns the event bus attached to this registry, allocating one on
// first access so the field is never nil for callers.
func (r *Registry) Events() *EventBus {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.events == nil {
		r.events = NewEventBus()
	}
	return r.events
}
