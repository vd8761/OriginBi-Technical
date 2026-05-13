package server

import (
	"sync"
	"time"
)

type rateLimiter struct {
	mu      sync.Mutex
	buckets map[string]rateBucket
}

type rateBucket struct {
	windowStart time.Time
	count       int
}

func newRateLimiter() *rateLimiter {
	return &rateLimiter{buckets: map[string]rateBucket{}}
}

func (l *rateLimiter) allow(key string, limit int, window time.Duration) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()

	b := l.buckets[key]
	if b.windowStart.IsZero() || now.Sub(b.windowStart) >= window {
		l.buckets[key] = rateBucket{windowStart: now, count: 1}
		l.pruneLocked(now, window)
		return true
	}
	if b.count >= limit {
		return false
	}
	b.count++
	l.buckets[key] = b
	return true
}

func (l *rateLimiter) pruneLocked(now time.Time, window time.Duration) {
	for key, bucket := range l.buckets {
		if now.Sub(bucket.windowStart) > 2*window {
			delete(l.buckets, key)
		}
	}
}
