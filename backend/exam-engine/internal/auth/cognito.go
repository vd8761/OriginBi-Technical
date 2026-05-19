// Cognito JWT verification.
//
// Pulls the user pool's public JWKS once on construction, caches it (auto-
// refreshing in the background), and verifies access tokens issued by AWS
// Cognito: signature, expiry, issuer, audience, and token_use=access.
package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

type CognitoVerifier struct {
	cache    *jwk.Cache
	jwksURL  string
	issuer   string
	clientID string
	region   string
}

type CognitoClaims struct {
	Sub      string
	Username string
	Email    string
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
		region:   region,
	}, nil
}

// FetchUserEmail calls Cognito's GetUser API using the access token itself
// as the credential — no AWS IAM keys required. Only the legitimate holder
// of the access token can call this, so the returned email is the real
// user's email. Used as a backstop when our local users.cognito_sub column
// is empty (older registrations missing the sub mapping).
func (c *CognitoVerifier) FetchUserEmail(ctx context.Context, accessToken string) (string, error) {
	if accessToken == "" {
		return "", fmt.Errorf("cognito: missing access token")
	}
	endpoint := fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/", c.region)
	body, err := json.Marshal(map[string]string{"AccessToken": accessToken})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("X-Amz-Target", "AWSCognitoIdentityProviderService.GetUser")
	req.Header.Set("Content-Type", "application/x-amz-json-1.1")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("cognito GetUser %d: %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	var parsed struct {
		UserAttributes []struct {
			Name  string `json:"Name"`
			Value string `json:"Value"`
		} `json:"UserAttributes"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", fmt.Errorf("cognito GetUser decode: %w", err)
	}
	for _, attr := range parsed.UserAttributes {
		if attr.Name == "email" {
			return strings.TrimSpace(attr.Value), nil
		}
	}
	return "", fmt.Errorf("cognito GetUser: no email attribute")
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
	if v, ok := tok.Get("email"); ok {
		claims.Email, _ = v.(string)
	}
	if claims.Sub == "" {
		return nil, fmt.Errorf("cognito: token has no subject")
	}
	return claims, nil
}
