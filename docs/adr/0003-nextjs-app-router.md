# ADR 0003: Next.js 14 with App Router

**Status:** Accepted
**Date:** 2025-01-01
**Decided by:** Alessandro Garbiati

---

## Context

The Zenkai dashboard frontend needs a React framework that:

- Supports TypeScript natively
- Provides routing out of the box
- Works well with `next-intl` for i18n (pt-BR / en-US)
- Can be deployed easily (Vercel, Docker, Cloudflare)
- Is recognizable to hiring managers as a modern, production-grade choice

Next.js 14 introduced the App Router (stable) which uses React Server Components and a file-system based routing in the `app/` directory.

---

## Decision

Use **Next.js 14 with App Router**.

Key choices within Next.js:

- `app/` directory (App Router) — NOT `pages/` (Pages Router)
- All components are Client Components (`'use client'`) for now — the dashboard requires heavy interactivity
- `next-intl` for internationalization with `defaultLocale: 'pt-BR'`
- Tailwind CSS for styling (utility-first, compatible with Excalidraw aesthetic)

---

## Consequences

### Positive

- App Router is the future of Next.js (Pages Router is in maintenance mode)
- File-system routing is intuitive: `app/dashboard/page.tsx` → `/dashboard`
- `next-intl` has first-class App Router support
- Vercel deployment is trivial

### Negative

- App Router has more complexity than Pages Router for auth patterns
- RSC (React Server Components) patterns are still evolving
- All pages currently use `'use client'` — this defeats some RSC benefits, but is pragmatic for a dashboard with heavy client state

### Neutral

- `next dev` performance is similar to Pages Router for small projects

---

## Alternatives Considered

| Alternative          | Reason for rejection                                             |
| -------------------- | ---------------------------------------------------------------- |
| Next.js Pages Router | Legacy; new projects should use App Router                       |
| Vite + React         | No SSR, no file-based routing, more manual setup                 |
| Remix                | Less familiar; smaller ecosystem for i18n                        |
| SvelteKit            | TypeScript support is good but different mental model from React |

---

## References

- [Next.js App Router](https://nextjs.org/docs/app)
- [next-intl with App Router](https://next-intl-docs.vercel.app/docs/getting-started/app-router)
