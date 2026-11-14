import { t } from '@/i18n/es-MX';

// Shown while Nest answers; after a while without visits, Cloud Run takes some seconds to wake up.
export default function AdminLoading() {
  return (
    <section aria-busy="true" className="max-w-3xl">
      <p role="status" className="sr-only">
        {t.admin.home.loading}
      </p>
      <div className="h-5 w-40 rounded-ui bg-raised motion-safe:animate-pulse" />
      <div className="mt-3 h-9 w-72 max-w-full rounded-ui bg-raised motion-safe:animate-pulse" />
      <div className="mt-4 h-5 w-96 max-w-full rounded-ui bg-raised motion-safe:animate-pulse" />
      <div className="mt-8 h-28 rounded-ui bg-raised motion-safe:animate-pulse" />
    </section>
  );
}
