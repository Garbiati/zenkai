# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in Zenkai, please report it responsibly.

**Do NOT open a public issue.**

Instead, email **alessandro.garbiati@gmail.com** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

### Response Timeline

| Stage              | Target   |
| ------------------ | -------- |
| Acknowledgment     | 48 hours |
| Initial assessment | 5 days   |
| Fix or mitigation  | 14 days  |
| Public disclosure  | 30 days  |

## Security Measures in Place

- **SAST**: Semgrep with OWASP Top 10 rules (blocking in CI)
- **Secrets scanning**: Gitleaks in CI pipeline
- **HTTP security headers**: helmet.js on all responses
- **Rate limiting**: Global 100 req/60s; auth endpoints 5 req/60s
- **Authentication**: JWT with mandatory strong passwords (8+ chars, uppercase, number)
- **CORS**: Configurable origins via environment variables (no wildcards in production)
- **Tenant isolation**: All queries scoped by organization ID
- **Audit logging**: All mutations recorded with before/after state

## Scope

This policy covers the Zenkai application code, its Docker configuration, and CI/CD pipelines. Third-party dependencies are monitored but not directly maintained by us.
