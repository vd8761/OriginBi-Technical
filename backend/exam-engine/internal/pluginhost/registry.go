package pluginhost

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Registry is the in-process plugin catalog. It is built once at boot from the
// `plugins` table, then cached. Lookups are O(1) by slug or UUID. The Registry
// is safe for concurrent use; writes only happen via Bootstrap / Reload.
type Registry struct {
	mu        sync.RWMutex
	pool      *pgxpool.Pool
	logger    *slog.Logger
	bySlug    map[string]*Manifest
	byID      map[uuid.UUID]*Manifest
	loadOrder []string
	graphErrs []*DependencyError
	loadedAt  time.Time
	// blockingSlugs is the set of base plugin slugs that MUST load cleanly for
	// the engine to boot. Today: just assessment.coding. Configured at Bootstrap.
	blockingSlugs map[string]bool
	// actions is the registry of plugin action handlers, populated by plugin
	// packages calling RegisterAction during bootstrap. See dispatcher.go.
	actions *actionRegistry
	// events is the in-process publish/subscribe bus shared by all plugins.
	// Lazy-initialised on first Events() call to keep zero-value Registries
	// (e.g. ad-hoc test instances) usable without explicit setup.
	events *EventBus
	// commands is the engine→client SSE command hub, lazy-initialised on first
	// access via Commands(). See pluginhost/commands.go.
	commands *CommandHub
}

// BootstrapOptions configures the load. Zero value is fine; tests typically
// override BlockingSlugs to "" (no fatal slugs).
type BootstrapOptions struct {
	// BlockingSlugs, when non-empty, causes Bootstrap to return an error if any
	// of these plugin slugs are missing or have unresolved required deps.
	// Production default: {"assessment.coding": true}.
	BlockingSlugs map[string]bool
}

// Bootstrap loads every row from `plugins` into an in-memory Registry,
// validates the dependency graph, and emits warnings for non-blocking
// problems. It returns an error only when a slug in opts.BlockingSlugs fails
// validation — optional plugin failures are logged but allow boot to proceed.
func Bootstrap(ctx context.Context, pool *pgxpool.Pool, logger *slog.Logger, opts BootstrapOptions) (*Registry, error) {
	r := &Registry{
		pool:          pool,
		logger:        logger,
		bySlug:        map[string]*Manifest{},
		byID:          map[uuid.UUID]*Manifest{},
		blockingSlugs: opts.BlockingSlugs,
	}
	if err := r.Reload(ctx); err != nil {
		return nil, err
	}
	return r, nil
}

// Reload re-reads `plugins` from the database. Safe to call from an admin API
// after a plugin row is inserted or updated.
func (r *Registry) Reload(ctx context.Context) error {
	rows, err := r.pool.Query(ctx, `
		SELECT id, kind::text, slug, name, version,
		       COALESCE(plugin_type, ''),
		       COALESCE(category, ''),
		       requires, extends, provides, schema,
		       requires_license, enabled_by_default
		FROM plugins
		ORDER BY slug
	`)
	if err != nil {
		return fmt.Errorf("pluginhost: query plugins: %w", err)
	}
	defer rows.Close()

	bySlug := make(map[string]*Manifest)
	byID := make(map[uuid.UUID]*Manifest)
	for rows.Next() {
		var (
			m        Manifest
			requires []byte
			extends  []byte
			provides []byte
			schema   []byte
			ptype    string
			category string
		)
		if err := rows.Scan(
			&m.ID, &m.Kind, &m.Slug, &m.Name, &m.Version,
			&ptype, &category,
			&requires, &extends, &provides, &schema,
			&m.RequiresLicense, &m.EnabledByDefault,
		); err != nil {
			return fmt.Errorf("pluginhost: scan plugin row: %w", err)
		}
		m.PluginType = PluginType(ptype)
		m.Category = Category(category)
		if err := json.Unmarshal(requires, &m.Requires); err != nil {
			return fmt.Errorf("pluginhost: decode requires for %s: %w", m.Slug, err)
		}
		if err := json.Unmarshal(extends, &m.Extends); err != nil {
			return fmt.Errorf("pluginhost: decode extends for %s: %w", m.Slug, err)
		}
		if err := json.Unmarshal(provides, &m.Provides); err != nil {
			return fmt.Errorf("pluginhost: decode provides for %s: %w", m.Slug, err)
		}
		m.Schema = json.RawMessage(schema)
		bySlug[m.Slug] = &m
		byID[m.ID] = &m
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("pluginhost: iterate plugin rows: %w", err)
	}

	// Inject kernel-provided slugs as synthetic manifests so plugins that
	// declare them in `requires` resolve cleanly. The kernel is the host
	// runtime itself — not a database row — see docs/plugin-architecture/
	// plugin-model.md ("runtime.exam-session: kernel; not a plugin row").
	for _, slug := range kernelSlugs() {
		if _, exists := bySlug[slug]; exists {
			continue
		}
		bySlug[slug] = &Manifest{
			Slug:             slug,
			Name:             slug,
			Version:          "kernel",
			PluginType:       PluginType("kernel"),
			EnabledByDefault: true,
		}
	}

	order, errs := resolveGraph(bySlug)

	// Fatal only if a blocking slug has an unresolved problem.
	fatal := FilterErrorsBlocking(errs, r.blockingSlugs)
	if len(fatal) > 0 {
		return fmt.Errorf("pluginhost: blocking plugin errors: %w", JoinErrors(fatal))
	}

	if r.logger != nil {
		for _, e := range errs {
			r.logger.Warn("plugin dependency issue",
				"slug", e.PluginSlug, "kind", e.Kind, "detail", e.Detail)
		}
	}

	r.mu.Lock()
	r.bySlug = bySlug
	r.byID = byID
	r.loadOrder = order
	r.graphErrs = errs
	r.loadedAt = time.Now()
	r.mu.Unlock()

	if r.logger != nil {
		r.logger.Info("plugin registry loaded",
			"count", len(bySlug),
			"with_warnings", len(errs),
			"load_order_len", len(order),
		)
	}
	return nil
}

// BySlug returns the manifest registered under the given slug, or nil if no
// plugin with that slug is installed.
func (r *Registry) BySlug(slug string) *Manifest {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.bySlug[slug]
}

// ByID returns the manifest with the given UUID, or nil if not present.
func (r *Registry) ByID(id uuid.UUID) *Manifest {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.byID[id]
}

// ByCategory returns every manifest whose Category matches `c`, sorted by slug.
func (r *Registry) ByCategory(c Category) []*Manifest {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]*Manifest, 0, len(r.bySlug))
	for _, m := range r.bySlug {
		if m.Category == c {
			out = append(out, m)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Slug < out[j].Slug })
	return out
}

// All returns every loaded manifest in dependency order (deepest deps first),
// suitable for action-handler registration. Falls back to slug order if the
// graph has cycles.
func (r *Registry) All() []*Manifest {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]*Manifest, 0, len(r.bySlug))
	for _, slug := range r.loadOrder {
		if m := r.bySlug[slug]; m != nil {
			out = append(out, m)
		}
	}
	// Append any manifest not covered by load order (cycle participants).
	covered := make(map[string]bool, len(out))
	for _, m := range out {
		covered[m.Slug] = true
	}
	slugs := make([]string, 0, len(r.bySlug))
	for slug := range r.bySlug {
		if !covered[slug] {
			slugs = append(slugs, slug)
		}
	}
	sort.Strings(slugs)
	for _, slug := range slugs {
		out = append(out, r.bySlug[slug])
	}
	return out
}

// GraphErrors returns the dependency warnings recorded at the last Reload.
// Useful for the admin /plugins endpoint to surface health.
func (r *Registry) GraphErrors() []*DependencyError {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]*DependencyError, len(r.graphErrs))
	copy(out, r.graphErrs)
	return out
}

// LoadedAt returns the timestamp of the most recent successful Reload.
func (r *Registry) LoadedAt() time.Time {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.loadedAt
}

// kernelSlugs lists capability slugs that the exam-engine itself satisfies
// at runtime. Plugins are allowed to declare these in `requires` without a
// matching row in the plugins table.
func kernelSlugs() []string {
	return []string{
		"runtime.exam-session",
	}
}
