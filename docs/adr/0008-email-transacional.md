# ADR 0008: Email Transacional para Convites

**Status:** Accepted
**Date:** 2026-02-21
**Decided by:** Alessandro Garbiati

---

## Context

The Zenkai dashboard needs to send transactional emails to invite new team members.
The invite flow requires:

- Generating a secure, time-limited token server-side
- Sending an email with a link containing the token
- The link allows the recipient to set their password and activate their account
- Development environment must work offline or with a sandbox SMTP provider
- Production must be reliable, deliverable, and cost-effective at small scale

The project is small-team (≤20 members). Email volume is low — invites only, no marketing.

---

## Decision

Use **Nodemailer** as the email transport library, with environment-specific SMTP configuration:

- **Development / CI:** [Ethereal Email](https://ethereal.email/) (auto-created disposable inbox) or [Mailtrap](https://mailtrap.io/) sandbox. No real emails sent.
- **Production:** [SendGrid](https://sendgrid.com/) SMTP relay (free tier: 100 emails/day). Can be swapped for any SMTP-compatible provider (AWS SES, Mailgun, Brevo) by changing env vars only.

Token strategy:

- Invite token: `crypto.randomBytes(32).toString('hex')` — stored hashed in DB with a 48-hour expiry.
- Link format: `{APP_URL}/accept-invite?token={raw_token}`
- On acceptance: token validated, password set, `must_change_password` flag cleared.

A dedicated `MailModule` wraps Nodemailer with a `MailService` exposing a single `sendInvite(to, token)` method. SMTP credentials are injected via `ConfigService` from environment variables.

---

## Consequences

### Positive

- Nodemailer is zero-dependency, battle-tested, and SMTP-agnostic — switching providers requires only env var changes
- Ethereal/Mailtrap sandbox prevents accidental email delivery in dev/CI
- Token-based invite decouples auth from email infrastructure (token can be re-sent without a new account)
- Simple surface area: one service, one public method, easy to unit-test with mocks

### Negative

- No built-in retry or queue — if SMTP fails, the invite is lost (acceptable at this scale)
- SendGrid free tier (100/day) is sufficient now but would require a paid plan if volume grows
- HTML email templates require maintenance (added in a future iteration; initial version is plain text)

### Neutral

- Nodemailer handles both SMTP and service-specific transports; the abstraction stays the same regardless of provider

---

## Alternatives Considered

| Alternative              | Reason for rejection                                                        |
| ------------------------ | --------------------------------------------------------------------------- |
| `@nestjs-modules/mailer` | Adds Handlebars/EJS templating; overkill for a single invite email          |
| Resend SDK               | Newer provider, excellent DX, but vendor lock-in at the SDK level           |
| AWS SES direct SDK       | Requires more AWS IAM setup; SMTP relay works with the same Nodemailer code |
| No email (manual invite) | Admin must share credentials out-of-band — poor UX and insecure             |

---

## Environment Variables

```env
# All workspaces — add to backend/.env and backend/.env.example
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=generated@ethereal.email
SMTP_PASS=generated_password
SMTP_FROM="Zenkai <no-reply@zenkai.app>"
APP_URL=http://localhost:3000
```

---

## References

- [Nodemailer Documentation](https://nodemailer.com/)
- [Ethereal Email](https://ethereal.email/)
- [SendGrid SMTP Integration](https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api)
- `docs/BUSINESS_RULES.md` — Password rules apply on invite acceptance
