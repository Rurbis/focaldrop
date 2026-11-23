// Synthetic Nest API for the visual tests (#52). It answers only what the
// pages under test ask for: GET /public/tenant for one fictitious agency on
// alpha.localhost. It never talks to staging or holds real data.
import { createServer } from 'node:http';

const port = Number(process.env.VISUAL_API_PORT ?? 3321);

const agency = {
  id: '01900000-0000-7000-8000-0000000000a1',
  slug: 'estudio-alba',
  name: 'Estudio Alba',
  status: 'active',
  timezone: 'America/Hermosillo',
  locale: 'es-MX',
  currency: 'MXN',
};

createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method === 'GET' && request.url === '/health') {
    response.end('{"status":"ok"}');
    return;
  }
  if (
    request.method === 'GET' &&
    request.url === '/public/tenant' &&
    request.headers['x-tenant-host'] === 'alpha.localhost'
  ) {
    response.end(JSON.stringify(agency));
    return;
  }
  response.writeHead(404);
  response.end('{"error":"Not found"}');
}).listen(port, '127.0.0.1');
