import { t } from '@/i18n/es-MX';

const bar = 'rounded-ui bg-raised motion-safe:animate-pulse';

// Shown on the lit table while Nest answers; after a while without visits,
// Cloud Run takes some seconds to wake up, so the wait is said in words too.
// Same outline as the home it replaces.
export default function AdminLoading() {
  return (
    <section aria-busy="true">
      <div className={`h-8 w-64 max-w-full ${bar}`} />
      <div className={`mt-6 h-11 w-80 max-w-full ${bar}`} />
      <p role="status" className="mt-7 text-ui text-ink-muted">
        {t.admin.home.loading}
      </p>
      <div className={`mt-8 h-6 w-36 ${bar}`} />
      <div className={`mt-5 h-14 ${bar}`} />
      <div className={`mt-4 h-14 ${bar}`} />
    </section>
  );
}
