// Cognito JWT verification.
//
// Pulls the user pool's public JWKS once on construction, caches it (auto-
// refreshing in the background), and verifies access tokens issued by AWS
// Cognito: signature, expiry, issuer, audience, and token_use=access.
package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

type CognitoVerifier struct {
	cache    *jwk.Cache
	jwksURL  string
	issuer   string
	clientID string
}

type CognitoClaims struct {
	Sub      string
	Username string
	Expiry   time.Time
}

// NewCognitoVerifier primes the JWKS cache. Returns an error if the well-
// known URL is unreachable (so misconfiguration fails fast on boot).
func NewCognitoVerifier(ctx context.Context, region, userPoolID, clientID string) (*CognitoVerifier, error) {
	if region == "" || userPoolID == "" || clientID == "" {
		return nil, fmt.Errorf("cognito: region, user pool id, and client id are required")
	}
	issuer := fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s", region, userPoolID)
	jwksURL := issuer + "/.well-known/jwks.json"

	cache := jwk.NewCache(ctx)
	if err := cache.Register(jwksURL, jwk.WithMinRefreshInterval(15*time.Minute)); err != nil {
		return nil, fmt.Errorf("cognito: register jwks: %w", err)
	}
	if _, err := cache.Refresh(ctx, jwksURL); err != nil {
		return nil, fmt.Errorf("cognito: fetch jwks from %s: %w", jwksURL, err)
	}
	return &CognitoVerifier{
		cache:    cache,
		jwksURL:  jwksURL,
		issuer:   issuer,
		clientID: clientID,
	}, nil
}

// Verify parses and validates a Cognito ACCESS token (not the id token).
func (c *CognitoVerifier) Verify(ctx context.Context, token string) (*CognitoClaims, error) {
	set, err := c.cache.Get(ctx, c.jwksURL)
	if err != nil {
		return nil, fmt.Errorf("cognito: get jwks: %w", err)
	}
	tok, err := jwt.Parse(
		[]byte(token),
		jwt.WithKeySet(set),
		jwt.WithValidate(true),
		jwt.WithIssuer(c.issuer),
	)
	if err != nil {
		return nil, fmt.Errorf("cognito: parse token: %w", err)
	}

	// token_use must be "access" (we don't accept id tokens here)
	if v, ok := tok.Get("token_use"); ok {
		if s, _ := v.(string); s != "access" {
			return nil, fmt.Errorf("cognito: token_use %q is not 'access'", s)
		}
	} else {
		return nil, fmt.Errorf("cognito: token_use claim missing")
	}

	// client_id must match the configured app client
	if v, ok := tok.Get("client_id"); ok {
		if s, _ := v.(string); s != c.clientID {
			return nil, fmt.Errorf("cognito: client_id mismatch")
		}
	} else {
		return nil, fmt.Errorf("cognito: client_id claim missing")
	}

	claims := &CognitoClaims{
		Sub:    tok.Subject(),
		Expiry: tok.Expiration(),
	}
	if v, ok := tok.Get("username"); ok {
		claims.Username, _ = v.(string)
	}
	if claims.Sub == "" {
		return nil, fmt.Errorf("cognito: token has no subject")
	}
	return claims, nil
}
