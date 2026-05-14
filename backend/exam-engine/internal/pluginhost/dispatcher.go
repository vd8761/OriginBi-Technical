package pluginhost

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"sync"

	"github.com/google/uuid"
)

// ActionRequest is what an HTTP handler passes to the dispatcher. The plugin
// owns the meaning of `Payload`; the dispatcher only routes.
type ActionRequest struct {
	AttemptID      uuid.UUID
	ExamQuestionID uuid.UUID
	UserID         int64
	Action         string          // e.g. "coding.run-custom"
	Payload        json.RawMessage // plugin-defined
}

// ActionResponse is the dispatcher's response envelope. Body is plugin-defined
// JSON; HTTPStatus lets a plugin signal e.g. 422 Validation Error to the
// caller without the caller knowing the plugin internals.
type ActionResponse struct {
	HTTPStatus int
	Body       json.RawMessage
}

// ActionHandler is the function a plugin package registers to handle a given
// action ID. Multiple plugins cannot register the same action ID; the
// registry rejects collisions at registration time.
type ActionHandler func(ctx context.Context, reg *Registry, req ActionRequest) (ActionResponse, error)

// ErrActionUnknown is returned when no plugin has registered a handler for the
// requested action ID. The HTTP layer should map this to 404.
var ErrActionUnknown = errors.New("pluginhost: action not registered")

// ErrActionConflict is returned by RegisterAction when two plugins try to own
// the same action ID. A clear, fail-fast signal at boot.
var ErrActionConflict = errors.New("pluginhost: action already registered")

type actionRecord struct {
	pluginSlug string
	handler    ActionHandler
}

// actionRegistry is a separate concurrency boundary from the manifest cache so
// hot dispatch paths don't contend with admin Reloads.
type actionRegistry struct {
	mu       sync.RWMutex
	handlers map[string]actionRecord
}

func newActionRegistry() *actionRegistry {
	return &actionRegistry{handlers: map[string]actionRecord{}}
}

// RegisterAction associates an action ID with a handler. Plugin packages call
// this in their bootstrap. Returns ErrActionConflict if the action is already
// registered.
func (r *Registry) RegisterAction(pluginSlug, action string, h ActionHandler) error {
	if r.actions == nil {
		r.actions = newActionRegistry()
	}
	r.actions.mu.Lock()
	defer r.actions.mu.Unlock()
	if existing, ok := r.actions.handlers[action]; ok {
		return fmt.Errorf("%w: %s already owned by %s", ErrActionConflict, action, existing.pluginSlug)
	}
	r.actions.handlers[action] = actionRecord{pluginSlug: pluginSlug, handler: h}
	if r.logger != nil {
		r.logger.Debug("plugin action registered", "plugin", pluginSlug, "action", action)
	}
	return nil
}

// Dispatch routes an ActionRequest to the registered handler. Returns
// ErrActionUnknown if nothing is registered. Plugin handlers run with the
// caller's context — they are responsible for timeouts.
func (r *Registry) Dispatch(ctx context.Context, req ActionRequest) (ActionResponse, error) {
	if r.actions == nil {
		return ActionResponse{}, ErrActionUnknown
	}
	r.actions.mu.RLock()
	rec, ok := r.actions.handlers[req.Action]
	r.actions.mu.RUnlock()
	if !ok {
		return ActionResponse{}, ErrActionUnknown
	}
	return rec.handler(ctx, r, req)
}

// RegisteredActions returns the set of action IDs that currently have
// handlers, sorted. Used by admin /plugins/{id} for the "actions" tab.
func (r *Registry) RegisteredActions() []string {
	if r.actions == nil {
		return nil
	}
	r.actions.mu.RLock()
	defer r.actions.mu.RUnlock()
	out := make([]string, 0, len(r.actions.handlers))
	for a := range r.actions.handlers {
		out = append(out, a)
	}
	sort.Strings(out)
	return out
}
