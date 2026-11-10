import { Message } from '@/components/ui/message';
import { StatusBadge } from '@/components/ui/status-badge';
import { t } from '@/i18n/es-MX';

import { firstName } from '../first-name';
import type { AdminHome } from '../me';
import { RetryButton } from './retry-button';

type ShownHome = Extract<AdminHome, { status: 'ready' | 'no-access' | 'unavailable' }>;

const iconClass =
  'size-4 fill-none stroke-current stroke-[2.25] [stroke-linecap:round] [stroke-linejoin:round]';

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={iconClass}>
      <path d="M5 10.5l3 3 7-7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={iconClass}>
      <circle cx="10" cy="10" r="6" />
      <path d="M10 6.8V10l2.2 1.4" />
    </svg>
  );
}

/** Home of the panel in the "Mesa de luz" design (A3): who you are and what comes next. */
export function AdminHomeView({ home }: { home: ShownHome }) {
  if (home.status !== 'ready') {
    return (
      <section aria-labelledby="home-title" className="max-w-[40rem]">
        <h1 id="home-title" className="text-page font-semibold tracking-tight text-ink">
          {t.admin.home.title}
        </h1>
        <div className="mt-7 flex flex-col items-start gap-4">
          {home.status === 'no-access' ? (
            <Message tone="info">{t.admin.home.noAccess}</Message>
          ) : (
            <>
              <Message tone="warning">{t.admin.home.unavailable}</Message>
              <RetryButton />
            </>
          )}
        </div>
      </section>
    );
  }

  const { profile, agency, role } = home.me;
  return (
    <section aria-labelledby="home-title">
      <h1
        id="home-title"
        className="text-page font-semibold tracking-tight break-words text-balance text-ink"
      >
        {t.admin.home.greeting} {firstName(profile.fullName)}
      </h1>
      <dl className="mt-5 flex flex-wrap gap-x-14 gap-y-4">
        <div className="min-w-0">
          <dt className="text-caption text-ink-muted">{t.admin.home.agency}</dt>
          <dd className="mt-0.5 text-body font-medium break-words text-ink">{agency.name}</dd>
        </div>
        <div>
          <dt className="text-caption text-ink-muted">{t.admin.home.role}</dt>
          <dd className="mt-0.5 text-body font-medium text-ink">{t.admin.home.roles[role]}</dd>
        </div>
      </dl>

      <h2 className="mt-11 text-title font-semibold tracking-tight text-ink">
        {t.admin.home.next.title}
      </h2>
      <ol className="mt-1.5">
        <li className="flex items-start gap-3.5 py-3.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-success-soft text-success">
            <CheckIcon />
          </span>
          <div className="min-w-0">
            <p className="text-body font-semibold text-ink">{t.admin.home.next.ready}</p>
            <p className="max-w-[36rem] text-body break-words text-ink-muted">
              {t.admin.home.next.readyAs[role](agency.name)}
            </p>
          </div>
        </li>
        <li className="flex flex-wrap items-start gap-3.5 py-3.5 sm:flex-nowrap">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-raised text-ink-muted">
            <ClockIcon />
          </span>
          <div className="min-w-0 flex-[1_1_calc(100%-2.75rem)] sm:flex-1">
            <p className="text-body font-semibold text-ink">{t.admin.home.next.soon}</p>
            <p className="max-w-[36rem] text-body text-ink-muted">{t.admin.home.next.soonBody}</p>
          </div>
          <span className="ml-[2.625rem] sm:ml-0">
            <StatusBadge tone="muted">{t.admin.home.next.soonBadge}</StatusBadge>
          </span>
        </li>
      </ol>
    </section>
  );
}
