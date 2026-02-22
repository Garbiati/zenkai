# Skill: /hotfix — Create a Hotfix

Use this skill when there's an urgent production bug that needs immediate fix.

## Steps

### 1. Create hotfix branch from main

```bash
git fetch origin
git checkout -b hotfix/<issue-number>-<short-description> origin/main
# Example: hotfix/101-login-500-error
```

### 2. Reproduce the bug

- Write a failing test that captures the bug FIRST (TDD even for hotfixes)
- This proves you understand the issue and prevents regression

### 3. Fix the minimal amount of code

- Fix ONLY the bug
- Do NOT refactor surrounding code
- Do NOT add features
- Keep the diff small for easy review

### 4. Verify

```bash
cd backend && npm test
cd backend && npm run lint
```

### 5. Create PR targeting main (and develop)

```bash
gh pr create \
  --base main \
  --title "hotfix: <short description> (#<issue>)" \
  --body "## Problem
<What broke and when>

## Root Cause
<What caused it>

## Fix
<What was changed and why>

## Test
- [ ] Reproducing test added: <test name>
- [ ] Tests pass
- [ ] Deployed to staging and verified"
```

### 6. After merge to main, also merge to develop

```bash
git checkout develop
git merge main
git push origin develop
```

## Commit Format

```
hotfix: fix login 500 when password contains special chars (#101)
```

## Notes

- Hotfixes bypass normal PR review if severity is P0 (production down)
- Always create a follow-up issue for any technical debt introduced
- Document the incident in `docs/incidents/YYYY-MM-DD-<title>.md`
