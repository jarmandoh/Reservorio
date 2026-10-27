export interface IdempotencyAttempt {
  fingerprint: string;
  key: string;
}

export function idempotencyAttempt(
  scope: string,
  previous: IdempotencyAttempt | null,
  payload: unknown
): IdempotencyAttempt {
  const fingerprint = JSON.stringify(payload);
  if (previous?.fingerprint === fingerprint) return previous;

  const storageKey = `reservorio:idempotency:${scope}`;
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null') as IdempotencyAttempt | null;
    if (saved?.fingerprint === fingerprint && saved.key) return saved;
  } catch {}

  const attempt = { fingerprint, key: crypto.randomUUID() };
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(attempt));
  } catch {}
  return attempt;
}

export function clearIdempotencyAttempt(scope: string, attempt: IdempotencyAttempt | null): void {
  if (!attempt) return;
  const storageKey = `reservorio:idempotency:${scope}`;
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null') as IdempotencyAttempt | null;
    if (saved?.key === attempt.key) sessionStorage.removeItem(storageKey);
  } catch {}
}
