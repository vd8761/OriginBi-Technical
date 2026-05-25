package pluginhost

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// EntitlementSource explains why a user has access to a plugin. The string
// values are surfaced to the admin "User entitlements" page so support can
// answer "where did this access come from?" without DB introspection.
type EntitlementSource string

const (
	SourcePurchase EntitlementSource = "purchase"
	SourceOrg      EntitlementSource = "org"
	SourceFreeTier EntitlementSource = "free-tier"
)

// LanguageEntitlement is one row in the resolver output: the language plugin
// the user can use plus the reason they have access.
type LanguageEntitlement struct {
	Plugin *Manifest
	Source EntitlementSource
	// ItemRef is set when Source == SourcePurchase. It carries the legacy
	// pricing slug ("coding:python") that exam_assignments.assignment_ref
	// continues to reference.
	ItemRef string
	// OrgID is set when Source == SourceOrg.
	OrgID string
}

// UserLanguagePlugins resolves the set of language.* plugins the user can use.
//
// Resolution order (most specific first; first match wins per language):
//
//  1. Purchases: rows in `purchases` joined to `pricing_items.plugin_id`
//     where the pointed-to plugin is category='language'.
//  2. Org entitlements: rows in `org_plugin_entitlements` with state='enabled'
//     whose plugin is a language and whose org has the user as a member.
//  3. Free tier: language plugins where enabled_by_default=true AND
//     requires_license=false.
//
// All sources are intersected with platform availability: any language plugin
// whose `platform_plugin_entitlements.state='disabled'` is dropped.
func (r *Registry) UserLanguagePlugins(ctx context.Context, userID int64) ([]LanguageEntitlement, error) {
	platformDisabled, err := r.platformDisabledSlugs(ctx)
	if err != nil {
		return nil, err
	}

	out := map[string]LanguageEntitlement{}

	// 1) Assignments — resolve language plugin via schema->>legacyItemRef.
	rows, err := r.pool.Query(ctx, `
		SELECT p.slug, a.assignment_ref
		FROM exam_assignments a
		JOIN plugins p ON p.schema->>'legacyItemRef' = a.assignment_ref
		WHERE a.candidate_user_id = $1
		  AND a.status = 'active'
		  AND p.category = 'language'
		  AND a.assignment_ref IS NOT NULL
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("pluginhost: list assignments for user %d: %w", userID, err)
	}
	for rows.Next() {
		var slug, itemRef string
		if err := rows.Scan(&slug, &itemRef); err != nil {
			rows.Close()
			return nil, fmt.Errorf("pluginhost: scan purchase row: %w", err)
		}
		if platformDisabled[slug] {
			continue
		}
		if _, dup := out[slug]; dup {
			continue
		}
		m := r.BySlug(slug)
		if m == nil {
			continue
		}
		out[slug] = LanguageEntitlement{Plugin: m, Source: SourcePurchase, ItemRef: itemRef}
	}
	rows.Close()

	// 2) Org entitlements.
	rows, err = r.pool.Query(ctx, `
		SELECT p.slug, om.org_id::text
		FROM organization_members om
		JOIN org_plugin_entitlements ope ON ope.org_id = om.org_id
		JOIN plugins p ON p.id = ope.plugin_id
		WHERE om.user_id = $1
		  AND om.revoked_at IS NULL
		  AND ope.state = 'enabled'
		  AND p.category = 'language'
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("pluginhost: list org entitlements for user %d: %w", userID, err)
	}
	for rows.Next() {
		var slug, orgID string
		if err := rows.Scan(&slug, &orgID); err != nil {
			rows.Close()
			return nil, fmt.Errorf("pluginhost: scan org entitlement: %w", err)
		}
		if platformDisabled[slug] {
			continue
		}
		if _, dup := out[slug]; dup {
			continue
		}
		m := r.BySlug(slug)
		if m == nil {
			continue
		}
		out[slug] = LanguageEntitlement{Plugin: m, Source: SourceOrg, OrgID: orgID}
	}
	rows.Close()

	// 3) Free tier — any language plugin that's free-and-default-on and not
	//    already covered. Looked up from the in-memory registry.
	for _, m := range r.ByCategory(CategoryLanguage) {
		if _, dup := out[m.Slug]; dup {
			continue
		}
		if platformDisabled[m.Slug] {
			continue
		}
		if m.RequiresLicense || !m.EnabledByDefault {
			continue
		}
		out[m.Slug] = LanguageEntitlement{Plugin: m, Source: SourceFreeTier}
	}

	// Stable slug order.
	result := make([]LanguageEntitlement, 0, len(out))
	for _, ent := range out {
		result = append(result, ent)
	}
	sortByPluginSlug(result)
	return result, nil
}

// IsLanguageEntitledForUser is the fast path for runtime checks (run code,
// submit). Returns true if `langSlug` (a plugin slug) is in the user's
// entitlement set.
func (r *Registry) IsLanguageEntitledForUser(ctx context.Context, userID int64, langSlug string) (bool, error) {
	if r.BySlug(langSlug) == nil {
		return false, nil
	}
	ents, err := r.UserLanguagePlugins(ctx, userID)
	if err != nil {
		return false, err
	}
	for _, e := range ents {
		if e.Plugin.Slug == langSlug {
			return true, nil
		}
	}
	return false, nil
}

// LanguagePluginByItemRef resolves a legacy pricing slug ("coding:python") to
// its language plugin manifest. Returns nil if no plugin claims that legacy
// item_ref. Used by purchase_handlers.go to validate purchasable items
// without a hardcoded allowlist.
func (r *Registry) LanguagePluginByItemRef(ctx context.Context, itemRef string) (*Manifest, error) {
	var pluginID string
	err := r.pool.QueryRow(ctx, `
		SELECT id::text
		FROM plugins
		WHERE schema->>'legacyItemRef' = $1
		  AND category = 'language'
		LIMIT 1
	`, itemRef).Scan(&pluginID)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("pluginhost: lookup item_ref %s: %w", itemRef, err)
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, m := range r.bySlug {
		if m.ID.String() == pluginID {
			return m, nil
		}
	}
	return nil, nil
}

// IsPurchasableLanguagePlugin reports whether `itemRef` is a known coding
// language plugin item_ref. Replaces the hardcoded `isCodingItemRef`
// allowlist in purchase_handlers.go.
func (r *Registry) IsPurchasableLanguagePlugin(ctx context.Context, itemRef string) (bool, error) {
	m, err := r.LanguagePluginByItemRef(ctx, itemRef)
	if err != nil {
		return false, err
	}
	return m != nil && m.IsLanguage(), nil
}

// IsPluginAvailable reports whether a plugin exists in the in-memory catalog
// and is not disabled at the platform scope.
func (r *Registry) IsPluginAvailable(ctx context.Context, slug string) (bool, error) {
	if r.BySlug(slug) == nil {
		return false, nil
	}
	disabled, err := r.platformDisabledSlugs(ctx)
	if err != nil {
		return false, err
	}
	return !disabled[slug], nil
}

// platformDisabledSlugs returns the set of plugin slugs that are globally
// disabled via platform_plugin_entitlements. A row missing from the table
// means "default" — fall back to the manifest's enabled_by_default.
func (r *Registry) platformDisabledSlugs(ctx context.Context) (map[string]bool, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT p.slug
		FROM platform_plugin_entitlements ppe
		JOIN plugins p ON p.id = ppe.plugin_id
		WHERE ppe.state = 'disabled'
	`)
	if err != nil {
		return nil, fmt.Errorf("pluginhost: list platform-disabled plugins: %w", err)
	}
	defer rows.Close()
	disabled := map[string]bool{}
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			return nil, fmt.Errorf("pluginhost: scan platform disabled: %w", err)
		}
		disabled[slug] = true
	}
	return disabled, nil
}

func sortByPluginSlug(xs []LanguageEntitlement) {
	for i := 1; i < len(xs); i++ {
		for j := i; j > 0 && xs[j-1].Plugin.Slug > xs[j].Plugin.Slug; j-- {
			xs[j-1], xs[j] = xs[j], xs[j-1]
		}
	}
}
