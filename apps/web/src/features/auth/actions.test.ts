import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

const resetPasswordForEmail = vi.fn();
const signOutOfSupabase = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT ${path}`);
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({ auth: { resetPasswordForEmail, signOut: signOutOfSupabase } }),
}));
vi.mock('next/navigation', () => ({ redirect }));

const { requestPasswordReset, signOut } = await import('./actions');
const { initialFormState } = await import('./form-state');

function form(email: string) {
  const data = new FormData();
  data.set('email', email);
  return data;
}

describe('requestPasswordReset', () => {
  let log: MockInstance<typeof console.error>;

  beforeEach(() => {
    resetPasswordForEmail.mockReset();
    log = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    log.mockRestore();
  });

  it('answers "sent" for an address with no account', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    expect(await requestPasswordReset(initialFormState, form('nadie@example.test'))).toEqual({
      status: 'sent',
    });
  });

  it.each([
    ['the per-user rate limit', { code: 'over_email_send_rate_limit', status: 429 }],
    ['a failure sending the email', { code: 'unexpected_failure', status: 500 }],
  ])('answers the same "sent" for %s, so the account stays hidden', async (_case, error) => {
    resetPasswordForEmail.mockResolvedValue({ data: null, error });

    expect(await requestPasswordReset(initialFormState, form('owner@example.test'))).toEqual({
      status: 'sent',
    });
    expect(log).toHaveBeenCalledWith('Password recovery request failed', error);
    expect(JSON.stringify(log.mock.calls)).not.toContain('owner@example.test');
  });

  it('rejects a malformed email without calling Supabase', async () => {
    expect(await requestPasswordReset(initialFormState, form('owner@'))).toEqual({
      status: 'error',
      error: 'invalidEmail',
      email: 'owner@',
    });
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe('signOut', () => {
  beforeEach(() => {
    signOutOfSupabase.mockReset().mockResolvedValue({ error: null });
    redirect.mockClear();
  });

  it('ends only this browser session', async () => {
    await signOut();
    expect(signOutOfSupabase).toHaveBeenCalledWith({ scope: 'local' });
  });

  // A redirect() here makes Next render the login by itself, and under next dev
  // or next start that request reaches the page with a loopback host: the login
  // named the agency of another domain until reloaded (review of PR #91). The
  // browser navigates instead, with its real host.
  it('returns instead of redirecting from the server', async () => {
    await expect(signOut()).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });
});
