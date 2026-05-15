package proctoringtabswitch

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/originbi/exam-engine/internal/pluginhost"
)

const (
	Slug                    = "proctoring.tab-switch"
	EventTabSwitched        = "proctoring.tab.switched"
	EventAttemptSubmitted   = "attempt.submitted"
	CommandWarningToast     = "attempt.warning-toast"
	CommandAttemptTerminate = "attempt.terminate"

	defaultThreshold = 3
)

type DecisionRecorder func(context.Context, pluginhost.DecisionInput) (uuid.UUID, error)
type CommandSender func(uuid.UUID, pluginhost.Command)

type ControllerOptions struct {
	Threshold      int
	RecordDecision DecisionRecorder
	SendCommand    CommandSender
	Now            func() time.Time
}

type Controller struct {
	pluginID       uuid.UUID
	threshold      int
	recordDecision DecisionRecorder
	sendCommand    CommandSender
	now            func() time.Time

	mu         sync.Mutex
	counts     map[uuid.UUID]int
	terminated map[uuid.UUID]bool
}

func NewController(pluginID uuid.UUID, opts ControllerOptions) *Controller {
	threshold := opts.Threshold
	if threshold <= 0 {
		threshold = defaultThreshold
	}
	now := opts.Now
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &Controller{
		pluginID:       pluginID,
		threshold:      threshold,
		recordDecision: opts.RecordDecision,
		sendCommand:    opts.SendCommand,
		now:            now,
		counts:         map[uuid.UUID]int{},
		terminated:     map[uuid.UUID]bool{},
	}
}

func Register(r *pluginhost.Registry) error {
	if r == nil {
		return nil
	}
	manifest := r.BySlug(Slug)
	if manifest == nil {
		return nil
	}

	controller := NewController(manifest.ID, ControllerOptions{
		RecordDecision: r.RecordDecision,
		SendCommand:    r.Commands().Send,
	})
	r.Events().Subscribe(EventTabSwitched, controller.HandleTabSwitched)
	r.Events().Subscribe(EventAttemptSubmitted, controller.HandleAttemptClosed)
	return nil
}

func (c *Controller) HandleTabSwitched(ctx context.Context, e pluginhost.Event) error {
	if c == nil || e.AttemptID == uuid.Nil {
		return nil
	}

	c.mu.Lock()
	c.counts[e.AttemptID]++
	count := c.counts[e.AttemptID]
	alreadyTerminated := c.terminated[e.AttemptID]
	if count >= c.threshold {
		c.terminated[e.AttemptID] = true
	}
	c.mu.Unlock()

	if alreadyTerminated {
		return nil
	}
	if count < c.threshold {
		c.sendWarning(e.AttemptID, count)
		return nil
	}
	return c.terminate(ctx, e, count)
}

func (c *Controller) HandleAttemptClosed(_ context.Context, e pluginhost.Event) error {
	if c == nil || e.AttemptID == uuid.Nil {
		return nil
	}
	c.mu.Lock()
	delete(c.counts, e.AttemptID)
	delete(c.terminated, e.AttemptID)
	c.mu.Unlock()
	return nil
}

func (c *Controller) sendWarning(attemptID uuid.UUID, count int) {
	if c.sendCommand == nil {
		return
	}
	payload, _ := json.Marshal(map[string]any{
		"title":     "Tab switch detected",
		"message":   "Stay on this tab during the assessment.",
		"count":     count,
		"threshold": c.threshold,
		"severity":  "warning",
	})
	c.sendCommand(attemptID, pluginhost.Command{
		Kind:     CommandWarningToast,
		Payload:  payload,
		IssuedAt: c.now(),
		PluginID: &c.pluginID,
	})
}

func (c *Controller) terminate(ctx context.Context, e pluginhost.Event, count int) error {
	payload, _ := json.Marshal(map[string]any{
		"reason":     "tab-switch-limit-exceeded",
		"count":      count,
		"threshold":  c.threshold,
		"eventKind":  e.Kind,
		"occurredAt": e.OccurredAt,
	})

	var decisionID uuid.UUID
	if c.recordDecision != nil {
		id, err := c.recordDecision(ctx, pluginhost.DecisionInput{
			AttemptID: e.AttemptID,
			PluginID:  c.pluginID,
			Decision:  "auto_terminate",
			Reason:    "tab-switch-limit-exceeded",
			Payload:   payload,
		})
		if err != nil {
			return err
		}
		decisionID = id
	}

	if c.sendCommand != nil {
		commandPayload, _ := json.Marshal(map[string]any{
			"reason":     "tab-switch-limit-exceeded",
			"count":      count,
			"threshold":  c.threshold,
			"decisionId": decisionID.String(),
			"title":      "Assessment locked",
			"message":    "The tab-switch limit was exceeded. Your attempt is being submitted.",
		})
		c.sendCommand(e.AttemptID, pluginhost.Command{
			Kind:     CommandAttemptTerminate,
			Payload:  commandPayload,
			IssuedAt: c.now(),
			PluginID: &c.pluginID,
		})
	}
	return nil
}
