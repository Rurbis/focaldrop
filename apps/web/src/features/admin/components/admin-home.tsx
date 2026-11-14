import { Message } from '@/components/ui/message';
import { StatusBadge } from '@/components/ui/status-badge';
import { t } from '@/i18n/es-MX';

import type { AdminHome } from '../me';
import { RetryButton } from './retry-button';

type ShownHome = Extract<AdminHome, { status: 'ready' | 'no-access' | 'unavailable' }>;

export function AdminHomeView({ home }: { home: ShownHome }) {
  if (home.status !== 'ready') {
    return (
      <section aria-labelledby="home-title" className="max-w-2xl">
        <h1 id="home-title" className="text-page font-semibold tracking-tight text-ink">
          {t.admin.home.title}
        </h1>
        <div className="mt-6 space-y-4">
          {home.status === 'no-access' ? (
            <Message tone="warning">{t.admin.home.noAccess}</Message>
          ) : (
            <>
              <Message tone="error">{t.admin.home.unavailable}</Message>
              <RetryButton />
            </>
          )}
        </div>
      </section>
    );
  }

  const { profile, agency, role } = home.me;
  return (
    <section aria-labelledby="home-title" className="max-w-3xl">
      <p className="text-ui font-medium break-words text-ink-muted">{agency.name}</p>
      <h1
        id="home-title"
        className="mt-1 text-page font-semibold tracking-tight break-words text-ink"
      >
        {t.admin.home.greeting} {profile.fullName}
      </h1>
      <p className="mt-3 text-body text-ink-muted">{t.admin.home.intro}</p>
      <dl className="mt-8 grid gap-6 rounded-ui border border-line bg-surface p-5 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-caption font-medium text-ink-muted">{t.admin.home.agency}</dt>
          <dd className="mt-1 text-title font-semibold break-words text-ink">{agency.name}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-ink-muted">{t.admin.home.role}</dt>
          <dd className="mt-2">
            <StatusBadge tone="accent">{t.admin.home.roles[role]}</StatusBadge>
          </dd>
        </div>
      </dl>
    </section>
  );
}
