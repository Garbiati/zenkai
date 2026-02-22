/**
 * Parses CORS allowed origins from environment variables.
 *
 * Env vars:
 *   CORS_ORIGINS — comma-separated list of exact origin strings
 *                  e.g. "http://localhost:3000,https://app.example.com"
 *   CORS_REGEX   — comma-separated list of regex patterns (no slashes)
 *                  e.g. "\.trycloudflare\.com$"
 *
 * Defaults to "http://localhost:3000" when CORS_ORIGINS is not set.
 */
export function parseCorsOrigins(): (string | RegExp)[] {
  const origins: (string | RegExp)[] = [];

  const raw = process.env.CORS_ORIGINS;
  if (raw) {
    raw.split(',').forEach((o) => origins.push(o.trim()));
  } else {
    origins.push('http://localhost:3000');
  }

  const regex = process.env.CORS_REGEX;
  if (regex) {
    regex.split(',').forEach((r) => origins.push(new RegExp(r.trim())));
  }

  return origins;
}
