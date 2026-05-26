package server

import (
	"context"
	"time"
)

// contextWithTimeout is a tiny indirection so handlers don't import
// "context" just for the timeout helper.
func contextWithTimeout(parent context.Context, d time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(parent, d)
}
