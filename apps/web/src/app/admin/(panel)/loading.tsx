import { t } from '@/i18n/es-MX';

const bar = 'rounded-ui bg-raised motion-safe:animate-pulse';

// Shown on the lit table while Nest answers; after a while without visits,
// Cloud Run takes some seconds to wake up. Same outline as the home it replaces.
export default function AdminLoading() {
  return (
    <section aria-busy="true">
      <p role="status" className="sr-only">
        {t.admin.home.loading}
      </p>
      <div className={`h-8 w-64 max-w-full ${bar}`} />
      <div className={`mt-6 h-11 w-80 max-w-full ${bar}`} />
      <div className={`mt-12 h-6 w-36 ${bar}`} />
      <div className={`mt-5 h-14 max-w-[48rem] ${bar}`} />
      <div className={`mt-4 h-14 max-w-[48rem] ${bar}`} />
    </section>
  );
}
