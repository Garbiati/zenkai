# Skill: /adr — Architecture Decision Record

Use this skill before making any change to a PROTECTED or IMMUTABLE zone.

## When to use

- Changing the database schema in a non-additive way
- Adding/removing/changing API endpoints (breaking changes)
- Changing the auth flow or JWT strategy
- Restructuring NestJS modules
- Replacing or adding a major dependency
- Changing TypeORM strategy (synchronize → migrations)
- Any change the developer might regret in 6 months

## Steps

1. **Understand the context**: What problem are you solving? Why is the current approach insufficient?

2. **Create the ADR file**:

   ```
   docs/adr/XXXX-short-title.md
   ```

   Where XXXX is the next sequential number (check existing ADRs).

3. **Fill the template** (copy from `docs/adr/0000-template.md`):
   - **Status**: `Proposed`
   - **Context**: Why is this decision needed?
   - **Decision**: What exactly will be done?
   - **Consequences**: What are the trade-offs? What becomes easier? What becomes harder?
   - **Decided by**: `Claude Code (agent)` or the developer's name
   - **Date**: today's date

4. **Present to the developer**: Show the ADR and ask for approval before implementing.

5. **After approval**: Change status to `Accepted` and proceed with implementation.

## Template path

`docs/adr/0000-template.md`

## Example

> "I need to add a new `category` field to tasks. This is an additive schema change.
> ADR 0007 created: Proposed → Accepted by developer → proceed."
