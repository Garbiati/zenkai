module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce conventional commit types
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'test', // Adding or correcting tests
        'chore', // Build process, auxiliary tools, dependencies
        'perf', // Performance improvement
        'ci', // CI/CD changes
        'hotfix', // Urgent production fix
        'revert', // Revert a previous commit
      ],
    ],
    // Scope is optional but must be valid module name if provided
    'scope-case': [2, 'always', 'lower-case'],
    // Subject line: max 100 chars
    'header-max-length': [2, 'always', 100],
    // Subject must not end with period
    'subject-full-stop': [2, 'never', '.'],
    // Subject must not be empty
    'subject-empty': [2, 'never'],
    // Type must not be empty
    'type-empty': [2, 'never'],
  },
};
