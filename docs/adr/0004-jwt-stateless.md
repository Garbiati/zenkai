# ADR 0004: JWT Stateless Authentication Without Refresh Tokens

**Status:** Accepted
**Date:** 2025-01-01
**Decided by:** Alessandro Garbiati

---

## Context

The dashboard needs authentication that:

- Is stateless (no session store required)
- Works with a separate frontend (Next.js) and backend (NestJS) on different ports/domains
- Supports a small team (7 members) with predictable usage patterns
- Is simple to implement and understand

JWT (JSON Web Tokens) are the standard for stateless API authentication. The decision is whether to implement:

1. **Access token only** — Simple, but token lives until expiry even if user logs out
2. **Access token + refresh token** — More secure, but requires token storage strategy and revocation logic

---

## Decision

Use **JWT access tokens only** (no refresh tokens) with a **24-hour expiry**.

Implementation:

- `POST /auth/login` returns `{ access_token: "..." }`
- Frontend stores token in `localStorage` (simple, no httpOnly cookie complexity for now)
- Token carries: `{ sub: memberId, username, isAdmin }`
- All protected routes use `JwtAuthGuard`
- Logout = clear localStorage (token remains valid server-side until expiry — acceptable for internal tool)

---

## Consequences

### Positive

- Zero infrastructure for token management (no Redis, no token table)
- Simple implementation: `@nestjs/jwt` + `@nestjs/passport`
- Easy to understand for any developer

### Negative

- Cannot invalidate tokens server-side (e.g., forced logout after password change doesn't immediately expire old tokens)
- localStorage is vulnerable to XSS (mitigated: no user-generated HTML rendered, strict CSP)
- 24-hour expiry means a stolen token is valid for up to 24 hours

### Mitigation

- After `change-password`, backend checks `must_change_password` flag — old tokens can still access the API but the frontend redirects to change-password on any 403 with `mustChangePassword: true`
- Internal tool with small, trusted team — risk profile is low

---

## Future Consideration

If the tool grows to external users or requires compliance (SOC2, etc.):

- Implement httpOnly cookie storage
- Add refresh token with rotation
- Add token blacklist (Redis) on logout/password change

Create a new ADR when this becomes necessary.

---

## Alternatives Considered

| Alternative             | Reason for rejection                                              |
| ----------------------- | ----------------------------------------------------------------- |
| Access + Refresh tokens | Complexity not justified for 7-person internal tool               |
| Session cookies         | Requires session store; complicates Docker/scaling                |
| Paseto                  | Less ecosystem support; similar security to JWT for this use case |
| Auth0 / Clerk           | External dependency; overkill for internal tool                   |

---

## References

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [@nestjs/jwt](https://github.com/nestjs/jwt)
- [OWASP JWT Security](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
