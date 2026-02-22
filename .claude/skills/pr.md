# Skill: /pr — Create a Pull Request

Use this skill to create a PR following project conventions.

**IMPORTANT:** This skill includes a mandatory pre-PR gate. The PR will only be created after the
history check passes. Never skip the gate steps.

---

## Step 0 — Pre-PR Gate (mandatory, run FIRST)

### 0a. Check commit history

```bash
# Count commits ahead of main
COMMITS=$(git log --oneline origin/main..HEAD | wc -l)
echo "Commits nesta branch: $COMMITS"

# Show the full history
git log --oneline origin/main..HEAD

# Show diff size
git diff origin/main..HEAD --stat | tail -1
```

**Evaluate:**

| Condition                        | Action                              |
| -------------------------------- | ----------------------------------- |
| `fix:` or `wip:` commits present | **STOP** — squash before continuing |
| `COMMITS > 7`                    | **STOP** — squash or split the PR   |
| Diff > 1500 added lines          | Warn the user; consider splitting   |
| Everything clean                 | Proceed to Step 1                   |

### 0b. If squash is needed

```bash
# Option A: Squash ALL into one clean commit
git reset --soft origin/main
git commit -m "feat(scope): description of the complete change"

# Option B: Squash only the trailing fix/chore commits (last N)
git reset --soft HEAD~N
git commit -m "chore(ci): description"

# After squash: force-push (safe on feature branches)
git push --force-with-lease origin $(git branch --show-current)
```

After squashing, re-run step 0a to confirm the history is clean.

### 0c. Verify CI locally

```bash
# Backend lint (must pass with 0 warnings)
docker exec zenkai-backend-1 sh -c "cd /app && node_modules/.bin/eslint src --max-warnings=0"

# Backend tests (all must pass)
docker exec zenkai-backend-1 sh -c "cd /app && node_modules/.bin/jest --passWithNoTests"

# TypeScript check
docker exec zenkai-backend-1 sh -c "cd /app && node_modules/.bin/tsc --noEmit"
```

Only continue if lint = 0 errors, tests = all green.

---

## Step 1 — Ensure you're on a feature branch

```bash
git branch --show-current
# Should be: feature/xxx, fix/xxx, docs/xxx, chore/xxx
# NOT main or develop
```

---

## Step 2 — Create the PR (as DRAFT first)

```bash
gh pr create \
  --base main \
  --draft \
  --title "feat(scope): short imperative description" \
  --body "$(cat <<'EOF'
## Summary

- What was done (bullet points)
- Why it was done (link to issue if exists)

## Changes

- `path/to/file.ts`: what changed and why
- `path/to/other.ts`: what changed and why

## Test Plan

- [ ] Unit tests: describe which tests cover this
- [ ] Manual: steps to verify the feature works
- [ ] Regression: confirm existing features still work

## Checklist

- [ ] Tests pass (`npm test`)
- [ ] Lint passes (`npm run lint:check`)
- [ ] No `fix:` or `wip:` commits in history (`git log --oneline origin/main..HEAD`)
- [ ] ADR created if architectural change
- [ ] i18n keys added to both pt-BR.json and en-US.json (if UI change)
- [ ] No hardcoded secrets or IPs
- [ ] `docs/BUSINESS_RULES.md` updated if rule changed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Step 3 — Wait for CI, then mark Ready

```bash
# Watch CI status
gh pr checks --watch

# When all checks pass, mark as ready for review
gh pr ready

# Show PR URL for human review
gh pr view --web
```

---

## Branch Naming

```
feature/42-auto-archive-tasks
fix/87-heartbeat-race-condition
docs/update-adr-typeorm
chore/upgrade-nestjs-11
hotfix/99-login-broken-prod
```

---

## What makes a good PR

| Metric         | Target                        |
| -------------- | ----------------------------- |
| Commits        | 1–5 meaningful, no `fix:`     |
| Lines added    | < 800 (ideal), < 1500 (max)   |
| Files changed  | < 30 (ideal)                  |
| Test coverage  | New code covered by tests     |
| PR description | Summary + changes + test plan |
