function normalizeAllowedOrigin(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;

  const value = raw.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.origin !== 'null' ? url.origin : null;
  } catch {
    return null;
  }
}

export function getAllowedCheckoutOrigins(configuredOrigins: string[] | null | undefined): string[] {
  if (!Array.isArray(configuredOrigins)) return [];

  return Array.from(
    new Set(configuredOrigins.map(normalizeAllowedOrigin).filter((origin): origin is string => Boolean(origin)))
  );
}

export function isAllowedCheckoutRedirect(
  rawUrl: string | null | undefined,
  configuredOrigins: string[] | null | undefined = ['https://checkout.stripe.com'],
  production = true
): boolean {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  if (production && parsed.protocol !== 'https:') return false;

  const allowedOrigins = getAllowedCheckoutOrigins(configuredOrigins);
  if (allowedOrigins.length === 0) return false;

  return allowedOrigins.includes(parsed.origin);
}
