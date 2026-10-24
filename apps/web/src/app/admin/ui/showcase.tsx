'use client';

import { useRef } from 'react';
import { UNSAFE_PortalProvider } from 'react-aria';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Menu, MenuItem } from '@/components/ui/menu';
import { Message } from '@/components/ui/message';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { Cell, Column, Row, Table, TableBody, TableHeader } from '@/components/ui/table';
import { TextField } from '@/components/ui/text-field';

// Sample data on purpose at the extremes (break-ui): long names without spaces,
// zero and five-digit counts, accents, non-Latin text and emoji.
const galleries: {
  id: string;
  name: string;
  photos: number;
  status: string;
  tone: StatusTone;
  expires: string;
}[] = [
  {
    id: '1',
    name: 'Boda de Ana y Luis · Hacienda San Gabriel',
    photos: 412,
    status: 'Publicada',
    tone: 'accent',
    expires: '18 nov',
  },
  {
    id: '2',
    name: 'XV años de María José Fernández de la Garza y Villaseñor',
    photos: 0,
    status: 'Borrador',
    tone: 'neutral',
    expires: 'Sin publicar',
  },
  {
    id: '3',
    name: 'Producto_CafeTostadoDelNorte_Temporada2026_FINAL_v3',
    photos: 12480,
    status: 'Vence pronto',
    tone: 'warning',
    expires: 'mañana',
  },
  {
    id: '4',
    name: 'Sesión 東京 de Yuki 📷',
    photos: 64,
    status: 'Vencida',
    tone: 'muted',
    expires: '2 oct',
  },
  {
    id: '5',
    name: 'Graduación',
    photos: 1,
    status: 'Por borrar',
    tone: 'danger',
    expires: 'en 7 días',
  },
];

const swatches = [
  ['paper', 'bg-paper'],
  ['surface', 'bg-surface'],
  ['raised', 'bg-raised'],
  ['ink', 'bg-ink'],
  ['ink-muted', 'bg-ink-muted'],
  ['accent', 'bg-accent'],
  ['danger', 'bg-danger'],
  ['success', 'bg-success'],
  ['warning', 'bg-warning'],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-title font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ThemeColumn({ theme }: { theme: 'light' | 'dark' }) {
  // Menus and dialogs render in a portal, by default at the end of <body>. This
  // one keeps them inside the column, so they take its theme, not the page's.
  const portal = useRef<HTMLDivElement>(null);

  return (
    <div data-theme={theme} className="bg-paper text-ink">
      <UNSAFE_PortalProvider getContainer={() => portal.current}>
        <div className="flex flex-col gap-12 p-6 md:p-10">
          <ThemeSections theme={theme} />
        </div>
      </UNSAFE_PortalProvider>
      <div ref={portal} />
    </div>
  );
}

function ThemeSections({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <>
      <p className="text-ui text-ink-muted">{theme === 'light' ? 'Modo claro' : 'Modo oscuro'}</p>

      <Section title="Tipografía">
        <p className="text-page font-semibold tracking-tight">Galerías de la agencia</p>
        <p className="text-title font-semibold">Boda de Ana y Luis</p>
        <p className="text-body">
          La galería vence el 18 de noviembre. Ana ya descargó 312 de 412 fotos.
        </p>
        <p className="text-ui">Publicada el 19 de octubre · 412 fotos</p>
        <p className="text-caption text-ink-muted">Instrument Sans · 28, 20, 16, 15 y 13 px</p>
      </Section>

      <Section title="Color">
        <div className="grid grid-cols-3 gap-3">
          {swatches.map(([name, className]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div className={`h-12 rounded-ui ring-1 ring-line ${className}`} />
              <span className="text-caption text-ink-muted">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Botones">
        <div className="flex flex-wrap gap-2">
          <Button>Publicar galería</Button>
          <Button variant="secondary">Copiar link</Button>
          <Button variant="quiet">Cancelar</Button>
          <Button variant="danger">Eliminar</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm">Pequeño</Button>
          <Button isDisabled>Deshabilitado</Button>
          <Button isPending pendingLabel="Publicando…">
            Publicar
          </Button>
        </div>
      </Section>

      <Section title="Campos">
        <TextField label="Nombre de la galería" placeholder="Boda de Ana y Luis" />
        <TextField
          label="Correo del cliente"
          type="email"
          description="Le enviamos el link y los avisos de vencimiento."
        />
        <TextField
          label="Fecha del evento"
          isInvalid
          defaultValue="31/02/2026"
          errorMessage="Esa fecha no existe."
        />
      </Section>

      <Section title="Mensajes y estados">
        <Message tone="error">
          No se pudo publicar. Revisa tu conexión y vuelve a intentarlo.
        </Message>
        <Message tone="warning">Esta galería vence mañana y nadie la ha abierto.</Message>
        <Message tone="success">Galería publicada. El cliente ya recibió el link.</Message>
        <Message tone="info">Las fotos se entregan sin comprimir.</Message>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="accent">Publicada</StatusBadge>
          <StatusBadge tone="neutral">Borrador</StatusBadge>
          <StatusBadge tone="warning">Vence pronto</StatusBadge>
          <StatusBadge tone="success">Descargada</StatusBadge>
          <StatusBadge tone="muted">Vencida</StatusBadge>
          <StatusBadge tone="danger">Por borrar</StatusBadge>
        </div>
      </Section>

      <Section title="Menú y diálogo">
        <div className="flex flex-wrap gap-2">
          <Menu label="Acciones" variant="secondary">
            <MenuItem id="copy">Copiar link</MenuItem>
            <MenuItem id="whatsapp">Enviar por WhatsApp</MenuItem>
            <MenuItem id="extend">Extender vencimiento</MenuItem>
            <MenuItem id="delete" tone="danger">
              Eliminar galería
            </MenuItem>
          </Menu>
          <ConfirmDialog
            trigger="Eliminar galería"
            title="¿Eliminar la galería?"
            confirmLabel="Eliminar"
            cancelLabel="Cancelar"
            tone="danger"
            onConfirm={() => {}}
          >
            Pasa a la papelera por 7 días; después se borra con todas sus fotos.
          </ConfirmDialog>
        </div>
      </Section>

      <Section title="Tabla">
        <Table aria-label="Galerías">
          <TableHeader>
            <Column isRowHeader>Galería</Column>
            <Column align="end">Fotos</Column>
            <Column>Estado</Column>
            <Column>Vence</Column>
          </TableHeader>
          <TableBody items={galleries}>
            {(gallery) => (
              <Row id={gallery.id}>
                <Cell>
                  <span className="wrap-anywhere">{gallery.name}</span>
                </Cell>
                <Cell align="end">{gallery.photos.toLocaleString('es-MX')}</Cell>
                <Cell>
                  <StatusBadge tone={gallery.tone}>{gallery.status}</StatusBadge>
                </Cell>
                <Cell>{gallery.expires}</Cell>
              </Row>
            )}
          </TableBody>
        </Table>
        <Table aria-label="Galerías vacías">
          <TableHeader>
            <Column isRowHeader>Galería</Column>
            <Column>Estado</Column>
          </TableHeader>
          <TableBody
            renderEmptyState={() => (
              <p className="px-2 py-6 text-ui text-ink-muted">
                Todavía no hay galerías. Crea la primera para empezar.
              </p>
            )}
          >
            {[]}
          </TableBody>
        </Table>
      </Section>
    </>
  );
}

export function Showcase() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2">
      <ThemeColumn theme="light" />
      <ThemeColumn theme="dark" />
    </div>
  );
}
