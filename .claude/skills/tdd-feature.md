# Skill: /tdd-feature — Test-Driven Development Workflow

Use this skill when implementing any new feature or fixing a non-trivial bug.

## The TDD Cycle

### 1. RED — Write the failing test first

Before touching implementation code:

```bash
# Backend
# Create the test file: src/module/module.service.spec.ts
# Write the test that describes the expected behavior
# Run it — it MUST fail (red)
cd backend && npm test -- --testPathPattern="module.service" --watch
```

The test should:

- Test one behavior at a time
- Use descriptive names: `'should throw ForbiddenException when non-owner tries to activate task'`
- Mock external dependencies (TypeORM repos, other services)

### 2. GREEN — Implement the minimum to pass

Write the simplest possible code that makes the test pass.
Do NOT add extra logic "just in case". YAGNI.

```bash
cd backend && npm test -- --testPathPattern="module.service"
# All tests pass → GREEN
```

### 3. REFACTOR — Clean up without breaking

- Extract repeated logic into private methods
- Add JSDoc to public methods
- Ensure naming is clear
- Run tests again to confirm still green

### 4. Commit in two steps

```bash
git add src/module/module.service.spec.ts
git commit -m "test: add spec for <behavior>"

git add src/module/module.service.ts
git commit -m "feat: implement <behavior>"
```

## Naming Convention

```
describe('TasksService') {
  describe('activate') {
    it('should start time tracking when task is activated')
    it('should throw ConflictException when member already has active task')
    it('should throw ForbiddenException when non-owner tries to activate')
  }
}
```

## Mocking TypeORM Repositories

```typescript
const mockRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
};

providers: [TasksService, { provide: getRepositoryToken(Task), useValue: mockRepo }];
```

## Coverage Target

- Backend: 80% lines + functions
- Frontend: 70% lines + functions
- Run: `cd backend && npm test -- --coverage`
