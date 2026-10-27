import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Showcase } from './showcase';

export const metadata: Metadata = {
  title: 'Sistema de diseño',
};

// Development tool (#52): every component in light and dark, with worst-case
// data. It never ships: production answers 404.
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Showcase />;
}
