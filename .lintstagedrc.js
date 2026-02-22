/**
 * lint-staged configuration
 *
 * Note: ESLint for backend/frontend runs in CI (docker-based envs have local packages).
 * Locally, only Prettier formatting is enforced to avoid issues with empty node_modules.
 */
module.exports = {
  // All JSON, Markdown, JS config files — format check (prettier installed at root)
  '**/*.{json,md,js,ts,tsx}': ['prettier --check --ignore-unknown'],
};
