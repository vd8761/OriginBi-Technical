package pluginhost

import (
	"errors"
	"fmt"
	"sort"
)

// DependencyError describes a graph problem detected during Bootstrap. We
// surface these as warnings rather than fatal errors for non-required plugins
// so a broken addon does not bring down the whole engine.
type DependencyError struct {
	PluginSlug string
	Kind       string // "missing-require" | "missing-extends" | "cycle"
	Detail     string
}

func (e *DependencyError) Error() string {
	return fmt.Sprintf("plugin %s: %s (%s)", e.PluginSlug, e.Detail, e.Kind)
}

// resolveGraph validates the dependency graph across a set of manifests and
// returns either a topological order of plugin slugs (deepest deps first) or
// the list of graph errors. Cycles are returned as DependencyError entries —
// one per slug involved — so callers can report all problems at once.
func resolveGraph(manifests map[string]*Manifest) (order []string, errs []*DependencyError) {
	if len(manifests) == 0 {
		return nil, nil
	}

	providers := capabilityProviders(manifests)

	// Validate required + extended slugs exist.
	for _, m := range manifests {
		for _, dep := range m.Requires {
			if len(resolveDependencyProviders(dep, manifests, providers)) == 0 {
				errs = append(errs, &DependencyError{
					PluginSlug: m.Slug,
					Kind:       "missing-require",
					Detail:     fmt.Sprintf("requires %q which is not installed", dep),
				})
			}
		}
		for _, dep := range m.Extends {
			if _, ok := manifests[dep]; !ok {
				errs = append(errs, &DependencyError{
					PluginSlug: m.Slug,
					Kind:       "missing-extends",
					Detail:     fmt.Sprintf("extends %q which is not installed", dep),
				})
			}
		}
	}

	// Topological sort over `requires` edges. extends edges are documentation
	// only — they don't gate load order.
	const (
		white = 0 // unvisited
		gray  = 1 // in current DFS path → cycle candidate
		black = 2 // finished
	)
	color := make(map[string]int, len(manifests))

	// Deterministic iteration: visit slugs alphabetically so the topological
	// order is stable across boots and the order returned in cycle errors is
	// reproducible.
	slugs := make([]string, 0, len(manifests))
	for s := range manifests {
		slugs = append(slugs, s)
	}
	sort.Strings(slugs)

	var (
		stack    []string
		cyclesAt = map[string]bool{}
		visit    func(string) error
	)
	visit = func(slug string) error {
		switch color[slug] {
		case gray:
			// Walk back through stack to extract the cycle path.
			cycle := append([]string(nil), stack...)
			cycle = append(cycle, slug)
			for _, s := range cycle {
				cyclesAt[s] = true
			}
			return fmt.Errorf("cycle: %v", cycle)
		case black:
			return nil
		}
		m, ok := manifests[slug]
		if !ok {
			// Missing dep — already reported above; skip.
			color[slug] = black
			return nil
		}
		color[slug] = gray
		stack = append(stack, slug)
		// Deterministic edge ordering inside each node.
		deps := append([]string(nil), m.Requires...)
		sort.Strings(deps)
		for _, dep := range deps {
			targets := resolveDependencyProviders(dep, manifests, providers)
			if len(targets) == 0 {
				continue
			}
			for _, target := range targets {
				if target == slug {
					continue
				}
				if err := visit(target); err != nil {
					return err
				}
			}
		}
		stack = stack[:len(stack)-1]
		color[slug] = black
		order = append(order, slug)
		return nil
	}

	for _, slug := range slugs {
		if color[slug] != black {
			if err := visit(slug); err != nil {
				// Stop walking — cycle plugins are recorded in cyclesAt.
				_ = err
				stack = nil
			}
		}
	}

	for slug := range cyclesAt {
		errs = append(errs, &DependencyError{
			PluginSlug: slug,
			Kind:       "cycle",
			Detail:     "participates in a dependency cycle",
		})
	}

	// Sort error list so callers get stable output.
	sort.Slice(errs, func(i, j int) bool {
		if errs[i].PluginSlug != errs[j].PluginSlug {
			return errs[i].PluginSlug < errs[j].PluginSlug
		}
		return errs[i].Kind < errs[j].Kind
	})

	return order, errs
}

func capabilityProviders(manifests map[string]*Manifest) map[string][]string {
	providers := map[string][]string{}
	for slug, m := range manifests {
		providers[slug] = append(providers[slug], slug)
		for _, capability := range m.Provides {
			providers[capability] = append(providers[capability], slug)
		}
	}
	for capability := range providers {
		sort.Strings(providers[capability])
	}
	return providers
}

func resolveDependencyProviders(dep string, manifests map[string]*Manifest, providers map[string][]string) []string {
	if _, ok := manifests[dep]; ok {
		return []string{dep}
	}
	return providers[dep]
}

// FilterErrorsBlocking returns the subset of dependency errors that should
// fail boot. Today: every error involving a base plugin in category=assessment
// is fatal; other errors (missing optional addon, cycle in non-base addon)
// produce a warning but allow boot to continue.
//
// Callers pass the set of base assessment slugs that the platform considers
// load-bearing — typically just "assessment.coding" in this codebase.
func FilterErrorsBlocking(errs []*DependencyError, blockingSlugs map[string]bool) []*DependencyError {
	if len(errs) == 0 || len(blockingSlugs) == 0 {
		return nil
	}
	var out []*DependencyError
	for _, e := range errs {
		if blockingSlugs[e.PluginSlug] {
			out = append(out, e)
		}
	}
	return out
}

// JoinErrors flattens a list of dependency errors into a single error suitable
// for fatal boot failures.
func JoinErrors(errs []*DependencyError) error {
	if len(errs) == 0 {
		return nil
	}
	wrapped := make([]error, 0, len(errs))
	for _, e := range errs {
		wrapped = append(wrapped, e)
	}
	return errors.Join(wrapped...)
}
