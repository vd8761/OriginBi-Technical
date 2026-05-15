package pluginhost

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Command is a single engine→client message delivered over SSE. The kind
// is plugin-defined (e.g. "attempt.terminate", "warning.show"); payload is
// opaque to the hub.
type Command struct {
	Kind     string          `json:"kind"`
	Payload  json.RawMessage `json:"payload,omitempty"`
	IssuedAt time.Time       `json:"issued_at"`
	PluginID *uuid.UUID      `json:"plugin_id,omitempty"`
}

// commandChannelBuffer is the per-attempt buffer cap. If a client disconnects
// and a plugin keeps sending, we keep at most this many messages before we
// start dropping the oldest. 64 is comfortably more than any realistic
// proctoring decision rate within a single attempt.
const commandChannelBuffer = 64

// CommandHub fans plugin-emitted commands out to all open SSE listeners for a
// given attempt. Buffers messages when no listener is connected so a
// briefly-reconnecting client doesn't miss a critical decision.
type CommandHub struct {
	mu       sync.Mutex
	channels map[uuid.UUID]*commandChannel
}

type commandChannel struct {
	mu        sync.Mutex
	pending   []Command           // buffered while no listener
	listeners map[uint64]chan Command
	nextID    uint64
}

// NewCommandHub returns an empty hub.
func NewCommandHub() *CommandHub {
	return &CommandHub{channels: map[uuid.UUID]*commandChannel{}}
}

// Commands returns the hub attached to this registry, allocating on demand.
func (r *Registry) Commands() *CommandHub {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.commands == nil {
		r.commands = NewCommandHub()
	}
	return r.commands
}

func (h *CommandHub) channel(attemptID uuid.UUID) *commandChannel {
	h.mu.Lock()
	defer h.mu.Unlock()
	ch, ok := h.channels[attemptID]
	if !ok {
		ch = &commandChannel{listeners: map[uint64]chan Command{}}
		h.channels[attemptID] = ch
	}
	return ch
}

// Send queues a command for delivery to listeners on the given attempt. If no
// listener is connected, the command buffers up to commandChannelBuffer items
// per attempt; older items are dropped on overflow. Always non-blocking from
// the caller's perspective.
func (h *CommandHub) Send(attemptID uuid.UUID, cmd Command) {
	if cmd.IssuedAt.IsZero() {
		cmd.IssuedAt = time.Now().UTC()
	}
	ch := h.channel(attemptID)
	ch.mu.Lock()
	defer ch.mu.Unlock()

	if len(ch.listeners) == 0 {
		ch.pending = append(ch.pending, cmd)
		if len(ch.pending) > commandChannelBuffer {
			// Drop oldest to make room. Critical commands should always win
			// the race against stale ones.
			ch.pending = ch.pending[len(ch.pending)-commandChannelBuffer:]
		}
		return
	}
	for _, listener := range ch.listeners {
		// Non-blocking send: if the listener is slow we drop on the floor for
		// that one consumer rather than holding up Send for everyone else.
		select {
		case listener <- cmd:
		default:
		}
	}
}

// Listen attaches a new listener to the given attempt and returns its channel
// plus an unsubscribe func. Buffered (pending) commands flush into the new
// channel before any future Send dispatches.
func (h *CommandHub) Listen(ctx context.Context, attemptID uuid.UUID) (<-chan Command, func()) {
	ch := h.channel(attemptID)
	ch.mu.Lock()
	id := ch.nextID
	ch.nextID++
	out := make(chan Command, commandChannelBuffer)
	ch.listeners[id] = out
	if len(ch.pending) > 0 {
		// Drain pending into the new listener. Best-effort; if the listener
		// buffer is too small we silently drop the overflow (it was already
		// past commandChannelBuffer).
		for _, cmd := range ch.pending {
			select {
			case out <- cmd:
			default:
			}
		}
		ch.pending = nil
	}
	ch.mu.Unlock()

	unsubscribe := func() {
		ch.mu.Lock()
		delete(ch.listeners, id)
		close(out)
		ch.mu.Unlock()
	}
	return out, unsubscribe
}

// DecisionInput is the payload passed to RecordDecision. PluginID and
// AttemptID are mandatory; everything else is best-effort context.
type DecisionInput struct {
	AttemptID      uuid.UUID
	PluginID       uuid.UUID
	TriggerEventID *uuid.UUID
	Decision       string
	Reason         string
	Payload        json.RawMessage
}

// RecordDecision writes a row to plugin_decisions for audit. Returns the new
// row id. The caller is responsible for any follow-up command Send — the two
// concerns are independent (a decision may be informational and have no
// matching client command).
func (r *Registry) RecordDecision(ctx context.Context, in DecisionInput) (uuid.UUID, error) {
	if r == nil || r.pool == nil {
		return uuid.Nil, ErrNoPool
	}
	payload := in.Payload
	if len(payload) == 0 {
		payload = json.RawMessage("{}")
	}
	var id uuid.UUID
	err := r.pool.QueryRow(ctx, `
		INSERT INTO plugin_decisions
		    (attempt_id, plugin_id, trigger_event_id, decision, reason, payload)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb)
		RETURNING id
	`, in.AttemptID, in.PluginID, in.TriggerEventID, in.Decision, in.Reason, []byte(payload)).Scan(&id)
	return id, err
}

// ErrNoPool indicates the registry has no database pool attached (e.g. a
// test-only registry). Callers should treat this as a programmer error.
var ErrNoPool = errNoPool{}

type errNoPool struct{}

func (errNoPool) Error() string { return "pluginhost: registry has no db pool" }
