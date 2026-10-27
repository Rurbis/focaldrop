import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

const resetPasswordForEmail = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { resetPasswordForEmail } }),
}));

const { requestPasswordReset } = await import('./actions');
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
