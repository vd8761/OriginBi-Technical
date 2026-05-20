package server

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"net/mail"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"

	"github.com/originbi/exam-engine/internal/auth"
)

const (
	sessionCookieName           = "ob_session"
	sessionTTL                  = 24 * time.Hour
	technicalRegistrationSource = "originbi-technical"
)

type authResponse struct {
	User         userDTO         `json:"user"`
	Registration registrationDTO `json:"registration"`
	ExpiresAt    time.Time       `json:"expiresAt,omitempty"`
}

type sessionContextKey struct{}

type sessionContextValue struct {
	user    userDTO
	expires time.Time
}

func withSessionContext(ctx context.Context, user userDTO, expires time.Time) context.Context {
	return context.WithValue(ctx, sessionContextKey{}, sessionContextValue{user: user, expires: expires})
}

func sessionFromContext(ctx context.Context) (sessionContextValue, bool) {
	v, ok := ctx.Value(sessionContextKey{}).(sessionContextValue)
	return v, ok
}

type userDTO struct {
	ID      int64  `json:"id"`
	Email   string `json:"email"`
	Status  string `json:"status"`
	IsAdmin bool   `json:"isAdmin"`
}

type registrationDTO struct {
	FullName           string          `json:"fullName"`
	Gender             string          `json:"gender"`
	CountryCode        string          `json:"countryCode"`
	Phone              string          `json:"phone"`
	Role               string          `json:"role"`
	RegistrationSource string          `json:"registrationSource"`
	DateOfBirth        *string         `json:"dateOfBirth,omitempty"`
	City               string          `json:"city,omitempty"`
	State              string          `json:"state,omitempty"`
	Country            string          `json:"country,omitempty"`
	EducationLevel     string          `json:"educationLevel,omitempty"`
	InstitutionName    string          `json:"institutionName,omitempty"`
	GraduationYear     *int            `json:"graduationYear,omitempty"`
	WorkStatus         string          `json:"workStatus,omitempty"`
	IsTechAssessment   bool            `json:"isTechAssessment"`
	Metadata           json.RawMessage `json:"metadata,omitempty"`
}

type registerRequest struct {
	Email              string          `json:"email"`
	Password           string          `json:"password"`
	CognitoSub         string          `json:"cognitoSub"`
	Name               string          `json:"name"`
	Gender             string          `json:"gender"`
	CountryCode        string          `json:"countryCode"`
	Phone              string          `json:"phone"`
	Role               string          `json:"role"`
	RegistrationSource string          `json:"registrationSource"`
	DateOfBirth        string          `json:"dateOfBirth"`
	City               string          `json:"city"`
	State              string          `json:"state"`
	Country            string          `json:"country"`
	EducationLevel     string          `json:"educationLevel"`
	InstitutionName    string          `json:"institutionName"`
	GraduationYear     *int            `json:"graduationYear"`
	WorkStatus         string          `json:"workStatus"`
	Metadata           json.RawMessage `json:"metadata"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type bootstrapAdminRequest struct {
	Token    string `json:"token"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type emailAvailabilityResponse struct {
	Available bool `json:"available"`
}

func (s *Server) emailAvailability(w http.ResponseWriter, r *http.Request) {
	if !s.limiter.allow(rateKey(r, "email-availability"), 30, time.Minute) {
		writeError(w, http.StatusTooManyRequests, tooManyRequestsMessage(30, time.Minute))
		return
	}
	email := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("email")))
	if !validEmail(email) {
		writeError(w, http.StatusBadRequest, "valid email is required")
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	var exists bool
	if err := s.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM users
			WHERE lower(email) = lower($1)
		)
	`, email).Scan(&exists); err != nil {
		writeError(w, http.StatusInternalServerError, "email lookup failed")
		return
	}
	writeJSON(w, http.StatusOK, emailAvailabilityResponse{Available: !exists})
}

type phoneAvailabilityResponse struct {
	Available bool `json:"available"`
}

func (s *Server) phoneAvailability(w http.ResponseWriter, r *http.Request) {
	if !s.limiter.allow(rateKey(r, "phone-availability"), 30, time.Minute) {
		writeError(w, http.StatusTooManyRequests, tooManyRequestsMessage(30, time.Minute))
		return
	}
	phone := strings.TrimSpace(r.URL.Query().Get("phone"))
	if phone == "" {
		writeError(w, http.StatusBadRequest, "phone number is required")
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	var exists bool
	if err := s.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM registrations
			WHERE mobile_number = $1
		)
	`, phone).Scan(&exists); err != nil {
		writeError(w, http.StatusInternalServerError, "phone lookup failed")
		return
	}
	writeJSON(w, http.StatusOK, phoneAvailabilityResponse{Available: !exists})
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	if !s.limiter.allow(rateKey(r, "register"), 8, time.Minute) {
		writeError(w, http.StatusTooManyRequests, tooManyRequestsMessage(8, time.Minute))
		return
	}
	var req registerRequest
	if !decodeJSON(w, r, &req, maxAuthBodyBytes) {
		return
	}
	if err := normalizeRegistrationInput(&req, false); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	req.CognitoSub = strings.TrimSpace(req.CognitoSub)
	if req.CognitoSub == "" {
		writeError(w, http.StatusBadRequest, "cognitoSub is required")
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(ctx)

	var existingID int64
	err = tx.QueryRow(ctx, `
		SELECT id
		FROM users
		WHERE lower(email) = lower($1)
		LIMIT 1
	`, req.Email).Scan(&existingID)
	if err == nil {
		writeError(w, http.StatusConflict, "email already registered")
		return
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusInternalServerError, "user lookup failed")
		return
	}

	metadataBytes, isTechAssessment, err := registrationMetadata(&req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "metadata encode failed")
		return
	}

	var user userDTO
	err = tx.QueryRow(ctx, `
		INSERT INTO users (
		    email, cognito_sub, role, name, email_verified, is_active,
		    is_blocked, metadata, created_at, updated_at
		)
		VALUES ($1, $2, 'STUDENT', $3, TRUE, TRUE, FALSE, $4::jsonb, now(), now())
		RETURNING id, COALESCE(email, ''), 'active', FALSE
	`, req.Email, req.CognitoSub, req.Name, metadataBytes).Scan(&user.ID, &user.Email, &user.Status, &user.IsAdmin)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create user failed")
		return
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO registrations (
			user_id, registration_source, full_name, gender, country_code,
			mobile_number, status, payment_status, payment_required,
			metadata, is_deleted, is_tech_assessment, created_at, updated_at
		)
		VALUES ($1, 'SELF', $2, $3, $4, $5, 'COMPLETED',
		        'NOT_REQUIRED', FALSE, $6::jsonb, FALSE, $7, now(), now())
	`, user.ID, req.Name, req.Gender, req.CountryCode, req.Phone, metadataBytes, isTechAssessment); err != nil {
		writeError(w, http.StatusInternalServerError, "create registration failed")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
		return
	}

	reg, _ := s.registrationForUser(r.Context(), user.ID)
	writeJSON(w, http.StatusCreated, authResponse{User: user, Registration: reg})
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	if !s.limiter.allow(rateKey(r, "login"), 12, time.Minute) {
		writeError(w, http.StatusTooManyRequests, tooManyRequestsMessage(12, time.Minute))
		return
	}
	var req loginRequest
	if !decodeJSON(w, r, &req, maxAuthBodyBytes) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if !validEmail(email) || strings.TrimSpace(req.Password) == "" {
		writeError(w, http.StatusBadRequest, "valid email and password are required")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var user userDTO
	var passwordHash string
	err := s.pool.QueryRow(ctx, `
		SELECT id, email, password, status, is_admin
		FROM users
		WHERE email = $1 AND deleted_at IS NULL
	`, email).Scan(&user.ID, &user.Email, &passwordHash, &user.Status, &user.IsAdmin)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	if user.Status != "active" || bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1`, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "login update failed")
		return
	}
	token, expires, err := createSession(ctx, tx, user.ID, r)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create session failed")
		return
	}
	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
		return
	}
	setSessionCookie(w, token, expires)

	reg, _ := s.registrationForUser(r.Context(), user.ID)
	writeJSON(w, http.StatusOK, authResponse{User: user, Registration: reg, ExpiresAt: expires})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(sessionCookieName); err == nil && c.Value != "" {
		ctx, cancel := contextWithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		_, _ = s.pool.Exec(ctx, `
			UPDATE user_sessions SET revoked_at = now()
			WHERE token_hash = $1 AND revoked_at IS NULL
		`, hashToken(c.Value))
	}
	clearSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{"status": "logged_out"})
}

func (s *Server) session(w http.ResponseWriter, r *http.Request) {
	session, ok := sessionFromContext(r.Context())
	if !ok {
		user, expires, found := s.userFromSession(r.Context(), r)
		if !found {
			writeError(w, http.StatusUnauthorized, "unauthenticated")
			return
		}
		session = sessionContextValue{user: user, expires: expires}
	}
	reg, _ := s.registrationForUser(r.Context(), session.user.ID)
	writeJSON(w, http.StatusOK, authResponse{User: session.user, Registration: reg, ExpiresAt: session.expires})
}

func (s *Server) sessionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, expires, ok := s.userFromBearer(r.Context(), r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthenticated")
			return
		}
		ctx := withSessionContext(r.Context(), user, expires)
		ctx = auth.WithPrincipal(ctx, auth.Principal{
			UserID: user.ID,
			OrgID:  s.defaultOrgID,
		})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *Server) getRegistration(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	reg, err := s.registrationForUser(r.Context(), principal.UserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "registration not found")
		return
	}
	writeJSON(w, http.StatusOK, reg)
}

func (s *Server) updateRegistration(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	var req registerRequest
	if !decodeJSON(w, r, &req, maxAuthBodyBytes) {
		return
	}
	if err := normalizeRegistrationInput(&req, false); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	metadataBytes, isTechAssessment, err := registrationMetadata(&req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "metadata encode failed")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	_, err = s.pool.Exec(ctx, `
		UPDATE registrations
		SET full_name=$2,
		    gender=$3,
		    country_code=$4,
		    mobile_number=$5,
		    metadata=$6::jsonb,
		    is_tech_assessment = CASE WHEN $7 THEN TRUE ELSE is_tech_assessment END,
		    updated_at=now()
		WHERE user_id=$1 AND is_deleted = FALSE
	`, principal.UserID, req.Name, req.Gender, req.CountryCode, req.Phone, metadataBytes, isTechAssessment)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	reg, _ := s.registrationForUser(r.Context(), principal.UserID)
	writeJSON(w, http.StatusOK, reg)
}

func (s *Server) bootstrapAdmin(w http.ResponseWriter, r *http.Request) {
	if !s.limiter.allow(rateKey(r, "bootstrap"), 5, 5*time.Minute) {
		writeError(w, http.StatusTooManyRequests, tooManyRequestsMessage(5, 5*time.Minute))
		return
	}
	var req bootstrapAdminRequest
	if !decodeJSON(w, r, &req, maxAuthBodyBytes) {
		return
	}
	token := req.Token
	if token == "" {
		token = r.Header.Get("X-Bootstrap-Token")
	}
	expectedToken, ok := bootstrapToken()
	if !ok {
		writeError(w, http.StatusNotFound, "bootstrap disabled")
		return
	}
	if !constantTimeEqual(token, expectedToken) {
		writeError(w, http.StatusUnauthorized, "invalid bootstrap token")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Name = strings.TrimSpace(req.Name)
	if !validEmail(req.Email) || !validPassword(req.Password) {
		writeError(w, http.StatusBadRequest, "valid email and password are required")
		return
	}
	if req.Name == "" {
		req.Name = "Platform Admin"
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "password hashing failed")
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(ctx)

	var user userDTO
	err = tx.QueryRow(ctx, `
		INSERT INTO users (email, password, is_admin)
		VALUES ($1, $2, true)
		ON CONFLICT (email) DO UPDATE
		SET password = EXCLUDED.password,
		    is_admin = true,
		    status = 'active',
		    updated_at = now(),
		    deleted_at = NULL
		RETURNING id, email, status, is_admin
	`, req.Email, string(hash)).Scan(&user.ID, &user.Email, &user.Status, &user.IsAdmin)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "bootstrap user failed")
		return
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO registrations (user_id, full_name, gender, country_code, phone, user_role)
		VALUES ($1, $2, 'OTHER', '+91', '', 'ADMIN')
		ON CONFLICT (user_id) DO UPDATE
		SET full_name = EXCLUDED.full_name,
		    user_role = 'ADMIN',
		    updated_at = now()
	`, user.ID, req.Name); err != nil {
		writeError(w, http.StatusInternalServerError, "bootstrap registration failed")
		return
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO organization_members (id, org_id, user_id, role)
		VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, 'platform_admin')
		ON CONFLICT (org_id, user_id, role) DO NOTHING
	`, uuid.New(), user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "bootstrap membership failed")
		return
	}

	tokenValue, expires, err := createSession(ctx, tx, user.ID, r)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create session failed")
		return
	}
	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
		return
	}
	setSessionCookie(w, tokenValue, expires)
	reg, _ := s.registrationForUser(r.Context(), user.ID)
	writeJSON(w, http.StatusOK, authResponse{User: user, Registration: reg, ExpiresAt: expires})
}

// isAdminRegistered returns true when the user's most recent active
// registration row has registration_source = 'ADMIN'. Such users get every
// assessment for free — the entitlement gates in listAssignments and
// startAttempt fall through as if they had paid.
func (s *Server) isAdminRegistered(ctx context.Context, userID int64) bool {
	ctx, cancel := contextWithTimeout(ctx, 2*time.Second)
	defer cancel()
	var source string
	err := s.pool.QueryRow(ctx, `
		SELECT COALESCE(registration_source, 'SELF')
		FROM registrations
		WHERE user_id = $1 AND is_deleted = FALSE
		ORDER BY created_at DESC, id DESC
		LIMIT 1
	`, userID).Scan(&source)
	if err != nil {
		return false
	}
	return strings.EqualFold(source, "ADMIN")
}

func (s *Server) isAdmin(ctx context.Context, userID int64) bool {
	ctx, cancel := contextWithTimeout(ctx, 2*time.Second)
	defer cancel()
	// The active schema has no is_admin/status/deleted_at columns — admin
	// status is derived from the `role` enum on `users`. userFromBearer
	// already maps role → user.IsAdmin the same way (cf. ~50 lines below).
	var role *string
	err := s.pool.QueryRow(ctx, `
		SELECT role
		FROM users
		WHERE id = $1 AND is_active = TRUE AND is_blocked = FALSE
	`, userID).Scan(&role)
	if err != nil || role == nil {
		return false
	}
	switch *role {
	case "ADMIN", "SUPER_ADMIN", "STAFF":
		return true
	}
	return false
}

func (s *Server) registrationForUser(ctx context.Context, userID int64) (registrationDTO, error) {
	ctx, cancel := contextWithTimeout(ctx, 3*time.Second)
	defer cancel()
	var reg registrationDTO
	var metadata []byte
	err := s.pool.QueryRow(ctx, `
		SELECT COALESCE(full_name, ''),
		       COALESCE(gender, ''),
		       COALESCE(country_code, '+91'),
		       COALESCE(mobile_number, ''),
		       COALESCE(status, ''),
		       COALESCE(registration_source, 'SELF'),
		       COALESCE(is_tech_assessment, FALSE),
		       metadata
		FROM registrations
		WHERE user_id = $1 AND is_deleted = FALSE
		ORDER BY created_at DESC, id DESC
		LIMIT 1
	`, userID).Scan(&reg.FullName, &reg.Gender, &reg.CountryCode, &reg.Phone, &reg.Role, &reg.RegistrationSource, &reg.IsTechAssessment, &metadata)
	if err != nil {
		return registrationDTO{}, err
	}
	if len(metadata) > 0 {
		reg.Metadata = json.RawMessage(metadata)
		var meta map[string]any
		if err := json.Unmarshal(metadata, &meta); err == nil {
			if v, ok := meta["institutionName"].(string); ok {
				reg.InstitutionName = v
			} else if v, ok := meta["institution_name"].(string); ok {
				reg.InstitutionName = v
			}
			if v, ok := meta["city"].(string); ok {
				reg.City = v
			}
			if v, ok := meta["state"].(string); ok {
				reg.State = v
			}
			if v, ok := meta["country"].(string); ok {
				reg.Country = v
			}
			if v, ok := meta["educationLevel"].(string); ok {
				reg.EducationLevel = v
			} else if v, ok := meta["education_level"].(string); ok {
				reg.EducationLevel = v
			}
			if v, ok := meta["workStatus"].(string); ok {
				reg.WorkStatus = v
			} else if v, ok := meta["work_status"].(string); ok {
				reg.WorkStatus = v
			}
		}
	}
	return reg, nil
}

// userFromBearer verifies a Cognito access token from the Authorization
// header, then resolves the local `users` row by cognito_sub. We trust the
// JWT signature/expiry for authentication; the DB lookup gives us the BIGINT
// id used as FK throughout the schema.
func (s *Server) userFromBearer(ctx context.Context, r *http.Request) (userDTO, time.Time, bool) {
	if s.cognito == nil {
		s.logger.Warn("auth: cognito verifier not configured", "path", r.URL.Path)
		return userDTO{}, time.Time{}, false
	}
	header := r.Header.Get("Authorization")
	if header == "" {
		s.logger.Warn("auth: missing Authorization header", "path", r.URL.Path)
		return userDTO{}, time.Time{}, false
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" {
		s.logger.Warn("auth: malformed Authorization header", "path", r.URL.Path)
		return userDTO{}, time.Time{}, false
	}

	verifyCtx, cancel := contextWithTimeout(ctx, 5*time.Second)
	defer cancel()
	claims, err := s.cognito.Verify(verifyCtx, parts[1])
	if err != nil {
		s.logger.Warn("auth: cognito verify failed", "path", r.URL.Path, "err", err)
		return userDTO{}, time.Time{}, false
	}

	dbCtx, dbCancel := contextWithTimeout(ctx, 3*time.Second)
	defer dbCancel()
	var user userDTO
	var role *string
	identity := strings.TrimSpace(claims.Email)
	if identity == "" {
		identity = strings.TrimSpace(claims.Username)
	}
	err = s.pool.QueryRow(dbCtx, `
		SELECT id, COALESCE(email, ''), role
		FROM users
		WHERE (
		        cognito_sub = $1
		        OR (
		            $2 <> ''
		            AND lower(COALESCE(email, '')) = lower($2)
		            AND COALESCE(cognito_sub, '') = ''
		        )
		      )
		  AND is_active = TRUE
		  AND is_blocked = FALSE
		ORDER BY CASE WHEN cognito_sub = $1 THEN 0 ELSE 1 END, id
		LIMIT 1
	`, claims.Sub, identity).Scan(&user.ID, &user.Email, &role)
	if errors.Is(err, pgx.ErrNoRows) {
		// Older registrations created users with cognito_sub = '' so we
		// can't match by sub yet. The Cognito access token in our hand is
		// proof of identity — call Cognito GetUser (it uses the access
		// token itself as the credential, no IAM keys required) to fetch
		// the real email, then resolve the local user by email and
		// backfill the sub so the next request takes the fast path.
		email, fetchErr := s.cognito.FetchUserEmail(ctx, parts[1])
		if fetchErr != nil {
			s.logger.Warn("auth: GetUser backfill failed", "path", r.URL.Path, "sub", claims.Sub, "err", fetchErr)
			return userDTO{}, time.Time{}, false
		}
		err = s.pool.QueryRow(dbCtx, `
			SELECT id, COALESCE(email, ''), role
			FROM users
			WHERE lower(COALESCE(email, '')) = lower($1)
			  AND COALESCE(cognito_sub, '') = ''
			  AND is_active = TRUE
			  AND is_blocked = FALSE
			LIMIT 1
		`, email).Scan(&user.ID, &user.Email, &role)
		if err != nil {
			s.logger.Warn("auth: email-fallback lookup failed", "path", r.URL.Path, "sub", claims.Sub, "email", email, "err", err)
			return userDTO{}, time.Time{}, false
		}
		s.logger.Info("auth: backfilling cognito_sub via GetUser", "user_id", user.ID, "email", email)
	} else if err != nil {
		s.logger.Warn("auth: user lookup failed", "path", r.URL.Path, "sub", claims.Sub, "identity", identity, "err", err)
		return userDTO{}, time.Time{}, false
	}
	if identity != "" {
		_, _ = s.pool.Exec(dbCtx, `
			UPDATE users
			SET cognito_sub = $2, updated_at = now()
			WHERE id = $1 AND COALESCE(cognito_sub, '') = ''
		`, user.ID, claims.Sub)
	}
	user.Status = "active"
	if role != nil {
		switch *role {
		case "ADMIN", "SUPER_ADMIN", "STAFF":
			user.IsAdmin = true
		}
	}
	return user, claims.Expiry, true
}

// userFromSession is retained for legacy cookie-based callers (none in the
// current router after the Cognito migration). Kept compiling against the
// real `users` schema so it doesn't crash if accidentally invoked.
func (s *Server) userFromSession(ctx context.Context, r *http.Request) (userDTO, time.Time, bool) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		return userDTO{}, time.Time{}, false
	}
	ctx, cancel := contextWithTimeout(ctx, 3*time.Second)
	defer cancel()
	var user userDTO
	var expires time.Time
	var role *string
	err = s.pool.QueryRow(ctx, `
		SELECT u.id, COALESCE(u.email, ''), u.role, us.expires_at
		FROM user_sessions us
		JOIN users u ON u.id = us.user_id
		WHERE us.token_hash = $1
		  AND us.revoked_at IS NULL
		  AND us.expires_at > now()
		  AND u.is_active = TRUE
		  AND u.is_blocked = FALSE
	`, hashToken(cookie.Value)).Scan(&user.ID, &user.Email, &role, &expires)
	if err != nil {
		return userDTO{}, time.Time{}, false
	}
	user.Status = "active"
	if role != nil {
		switch *role {
		case "ADMIN", "SUPER_ADMIN", "STAFF":
			user.IsAdmin = true
		}
	}
	return user, expires, true
}

type txExecutor interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
}

func createSession(ctx context.Context, tx txExecutor, userID int64, r *http.Request) (string, time.Time, error) {
	token, err := randomToken()
	if err != nil {
		return "", time.Time{}, err
	}
	expires := time.Now().UTC().Add(sessionTTL)
	_, err = tx.Exec(ctx, `
		INSERT INTO user_sessions (id, user_id, token_hash, user_agent, ip_address, expires_at)
		VALUES ($1,$2,$3,$4,$5,$6)
	`, uuid.New(), userID, hashToken(token), r.UserAgent(), clientIP(r), expires)
	return token, expires, err
}

func randomToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func setSessionCookie(w http.ResponseWriter, token string, expires time.Time) {
	sameSite := sameSiteMode()
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		Domain:   cookieDomain(),
		Expires:  expires,
		MaxAge:   int(sessionTTL.Seconds()),
		HttpOnly: true,
		Secure:   secureCookies() || sameSite == http.SameSiteNoneMode,
		SameSite: sameSite,
	})
}

func clearSessionCookie(w http.ResponseWriter) {
	sameSite := sameSiteMode()
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		Domain:   cookieDomain(),
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   secureCookies() || sameSite == http.SameSiteNoneMode,
		SameSite: sameSite,
	})
}


func clientIP(r *http.Request) string {
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return strings.TrimSpace(strings.Split(ip, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

func bootstrapToken() (string, bool) {
	v := strings.TrimSpace(os.Getenv("BOOTSTRAP_ADMIN_TOKEN"))
	return v, v != ""
}

func constantTimeEqual(a string, b string) bool {
	if a == "" || b == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

func rateKey(r *http.Request, action string) string {
	return action + ":" + clientIP(r)
}

func registrationMetadata(req *registerRequest) ([]byte, bool, error) {
	if len(req.Metadata) == 0 {
		req.Metadata = json.RawMessage("{}")
	}
	var metadata map[string]any
	if err := json.Unmarshal(req.Metadata, &metadata); err != nil {
		return nil, false, err
	}

	source := req.RegistrationSource
	if source == "" {
		source = metadataString(metadata, "source")
	}
	if source == "" {
		source = technicalRegistrationSource
	}
	req.RegistrationSource = source

	metadata["source"] = source
	metadata["fullName"] = req.Name
	metadata["mobileNumber"] = req.Phone
	metadata["countryCode"] = req.CountryCode
	metadata["gender"] = req.Gender
	metadata["cognitoSub"] = req.CognitoSub
	metadata["hasChangedPassword"] = true

	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		return nil, false, err
	}
	return metadataBytes, isOriginBITechnicalSource(source), nil
}

func metadataString(metadata map[string]any, key string) string {
	if v, ok := metadata[key].(string); ok {
		return strings.TrimSpace(v)
	}
	return ""
}

func isOriginBITechnicalSource(source string) bool {
	normalized := strings.ToLower(strings.TrimSpace(source))
	normalized = strings.NewReplacer("-", "", "_", "", " ", "").Replace(normalized)
	return normalized == "originbitechnical"
}

func normalizeRegistrationInput(req *registerRequest, requirePassword bool) error {
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Name = strings.TrimSpace(req.Name)
	req.Gender = strings.ToUpper(strings.TrimSpace(req.Gender))
	req.CountryCode = strings.TrimSpace(req.CountryCode)
	req.Phone = strings.TrimSpace(req.Phone)
	req.Role = strings.ToUpper(strings.TrimSpace(req.Role))
	req.RegistrationSource = strings.TrimSpace(req.RegistrationSource)
	req.DateOfBirth = strings.TrimSpace(req.DateOfBirth)
	req.City = strings.TrimSpace(req.City)
	req.State = strings.TrimSpace(req.State)
	req.Country = strings.TrimSpace(req.Country)
	req.EducationLevel = strings.TrimSpace(req.EducationLevel)
	req.InstitutionName = strings.TrimSpace(req.InstitutionName)
	req.WorkStatus = strings.TrimSpace(req.WorkStatus)

	if req.Name == "" {
		return errors.New("name is required")
	}
	if len(req.Name) > 160 {
		return errors.New("name is too long")
	}
	if !validEmail(req.Email) {
		return errors.New("valid email is required")
	}
	if requirePassword && !validPassword(req.Password) {
		return errors.New("valid password is required")
	}
	if req.Gender == "" {
		req.Gender = "OTHER"
	}
	if !validGender(req.Gender) {
		return errors.New("invalid gender")
	}
	if req.CountryCode == "" {
		req.CountryCode = "+91"
	}
	if len(req.CountryCode) > 8 || !strings.HasPrefix(req.CountryCode, "+") {
		return errors.New("invalid country code")
	}
	if req.Phone == "" {
		return errors.New("phone is required")
	}
	if len(req.Phone) > 32 {
		return errors.New("phone is too long")
	}
	if req.Role == "" {
		req.Role = "COLLEGE_STUDENT"
	}
	if len(req.Role) > 64 {
		return errors.New("role is too long")
	}
	if req.DateOfBirth != "" {
		if _, err := time.Parse("2006-01-02", req.DateOfBirth); err != nil {
			return errors.New("invalid dateOfBirth")
		}
	}
	if len(req.City) > 120 || len(req.State) > 120 || len(req.Country) > 120 ||
		len(req.EducationLevel) > 120 || len(req.InstitutionName) > 200 ||
		len(req.WorkStatus) > 120 || len(req.RegistrationSource) > 120 {
		return errors.New("registration field is too long")
	}
	if len(req.Metadata) == 0 {
		req.Metadata = json.RawMessage("{}")
	}
	if !json.Valid(req.Metadata) {
		return errors.New("invalid metadata")
	}
	if len(req.Metadata) > 16<<10 {
		return errors.New("metadata is too large")
	}
	return nil
}

func validEmail(email string) bool {
	if email == "" || len(email) > 254 || strings.ContainsAny(email, " \t\r\n") {
		return false
	}
	addr, err := mail.ParseAddress(email)
	return err == nil && addr.Address == email
}

func validPassword(password string) bool {
	return len(password) >= 8 && len(password) <= 256 && strings.TrimSpace(password) != ""
}

func validGender(gender string) bool {
	switch gender {
	case "MALE", "FEMALE", "OTHER":
		return true
	default:
		return false
	}
}
