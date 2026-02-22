# Changelog

## [0.1.0] - 2026-02-22

Initial MVP release — clean Kanban board for small teams.

### Core Features

- **Kanban board** with 4 columns: Backlog, Standby, In Progress, Done
- **Task lifecycle**: backlog → in_progress → done (with standby for blocked/paused)
- **Auto time tracking**: start/pause/resume/stop based on task state changes
- **Block/flag system**: required reason to block, resolution note to unblock
- **Heartbeat presence**: active/inactive based on browser activity (60s interval)
- **Undo system**: revert completed tasks (max 3x per task)
- **Task archiving**: archive completed tasks to reduce board clutter
- **Estimated hours**: optional time estimates with predicted completion dates
- **Work schedules**: global + per-member configurable schedules

### Multi-tenancy

- **Organizations** with invite-based membership
- **Open invites** (Discord-style, no email required) and email-based invites
- **Self-registration**: creates member + organization + JWT with orgId
- **Tenant isolation**: all queries scoped by organization

### Real-time

- **WebSocket gateway**: task:created/updated/deleted events scoped to org rooms
- **Online presence**: green/gray dots on avatars based on WebSocket connection
- **Heartbeat-triggered notifications**: inactivity warning, 8h approaching, deadline exceeded

### Auth & Security

- **JWT authentication** with login, register, change-password
- **Onboarding wizard**: role choice → team setup → invite link generation
- **helmet.js** security headers
- **Rate limiting**: global 100/min + strict 5/min on auth endpoints
- **Semgrep OWASP Top 10** in CI (blocking)

### UX

- **i18n**: Portuguese (pt-BR) and English (en-US)
- **Quick Complete feedback**: 5s auto-dismiss banner after task completion
- **Daily Digest**: banner shown after 5h worked or after 5pm
- **Hand-drawn visual style**: Excalidraw-like, post-it cards aesthetic

### Infrastructure

- **Docker Compose**: one-command setup (backend + frontend + PostgreSQL)
- **CI/CD**: GitHub Actions for lint, typecheck, test, build, security scan
- **Swagger/OpenAPI** at `/api`
- **Email service**: Nodemailer with graceful degradation
- **Audit log**: full history of all task operations
