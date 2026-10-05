import { describe, expect, it } from 'vitest';
import { isAllowedCheckoutRedirect } from './checkout-url';

describe('isAllowedCheckoutRedirect', () => {
  it('accepts Stripe checkout URLs using the production allowlist by default', () => {
    expect(isAllowedCheckoutRedirect('https://checkout.stripe.com/session/123')).toBe(true);
  });

  it('accepts a trusted HTTPS origin when explicitly configured', () => {
    expect(
      isAllowedCheckoutRedirect('https://checkout.stripe.com/session/123', ['https://checkout.stripe.com'], false)
    ).toBe(true);
  });

  it('accepts an explicitly configured local HTTP origin only in non-production', () => {
    expect(isAllowedCheckoutRedirect('http://localhost:3001/checkout', ['http://localhost:3001'], false)).toBe(true);
  });

  it('rejects HTTP in production even when allowlisted', () => {
    expect(
      isAllowedCheckoutRedirect('http://checkout.stripe.com/session/123', ['http://checkout.stripe.com'], true)
    ).toBe(false);
  });

  it('rejects javascript scheme redirects', () => {
    expect(isAllowedCheckoutRedirect('javascript:alert(1)', ['https://checkout.stripe.com'], false)).toBe(false);
  });

  it('rejects external origins not in the allowlist', () => {
    expect(isAllowedCheckoutRedirect('https://evil.example/pay', ['https://checkout.stripe.com'], false)).toBe(false);
  });

  it('rejects malformed and missing URLs', () => {
    expect(isAllowedCheckoutRedirect('not a url', ['https://checkout.stripe.com'], false)).toBe(false);
    expect(isAllowedCheckoutRedirect('', ['https://checkout.stripe.com'], false)).toBe(false);
    expect(isAllowedCheckoutRedirect(undefined, ['https://checkout.stripe.com'], false)).toBe(false);
  });

  it('rejects suffix-based origin spoofing', () => {
    expect(
      isAllowedCheckoutRedirect('https://checkout.stripe.com.evil.example/pay', ['https://checkout.stripe.com'], false)
    ).toBe(false);
  });

  it('fails closed when no origins are configured', () => {
    expect(isAllowedCheckoutRedirect('https://checkout.stripe.com/session/123', [], true)).toBe(false);
  });
});
