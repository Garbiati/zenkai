## Summary

<!-- 1-3 bullet points describing what this PR does and why -->

-
-

## Changes

<!-- List the main files changed and what changed in each -->

- `path/to/file.ts`: What changed

## Related Issue

<!-- Closes #123 -->

Closes #

## Checklist

### Code Quality

- [ ] Tests pass (`cd backend && npm test`)
- [ ] Lint passes (`cd backend && npm run lint:check`)
- [ ] TypeScript compiles without errors (`tsc --noEmit`)
- [ ] No hardcoded secrets or credentials

### Documentation

- [ ] ADR created if this is an architectural change (zone IMUTÁVEL/PROTEGIDA)
- [ ] `docs/BUSINESS_RULES.md` updated if a business rule changed
- [ ] i18n keys added to both `messages/pt-BR.json` and `messages/en-US.json` (if UI change)
- [ ] Code is self-documenting (no unnecessary comments; JSDoc on public methods if non-obvious)

### Testing

- [ ] New behavior covered by tests
- [ ] Edge cases considered (empty states, errors, auth boundaries)
- [ ] Manual smoke test done locally

### Deployment

- [ ] No breaking API changes (or migration strategy documented)
- [ ] Database schema changes are backwards compatible (or ADR + migration written)
- [ ] No new dependencies without justification in PR description

---

**Type of change:**

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (no functional changes, no new features)
- [ ] Documentation update
- [ ] CI/infrastructure change
