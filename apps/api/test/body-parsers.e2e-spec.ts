import { brotliCompressSync, gzipSync } from 'node:zlib';

import { Body, Controller, type INestApplication, Post } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as Sentry from '@sentry/nestjs';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';
import { SENTRY_DATA_COLLECTION } from '../src/constants/sentry.constants.js';

@Controller('__test-body')
class EchoController {
  @Post()
  echo(@Body() body: unknown): unknown {
    return body;
  }
}

describe('Request body parsing (e2e)', () => {
  let app: INestApplication<App>;
  const events: Sentry.ErrorEvent[] = [];
  const json = JSON.stringify({ name: 'demo' });

  beforeAll(async () => {
    Sentry.init({
      dsn: 'https://public@example.invalid/1',
      dataCollection: SENTRY_DATA_COLLECTION,
      tracesSampleRate: 0,
      // Dedupe drops an event equal to the previous one, which would hide a
      // second report of the same rejection.
      integrations: (defaults) => defaults.filter((integration) => integration.name !== 'Dedupe'),
      beforeSend(event) {
        events.push(event);
        return event;
      },
      // Keep verification entirely local; no events are sent to Sentry.
      transport: () => ({
        send: () => Promise.resolve({ statusCode: 200 }),
        flush: () => Promise.resolve(true),
      }),
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [EchoController],
    }).compile();

    const nestApp = moduleFixture.createNestApplication<NestExpressApplication>({ logger: false });
    configureApp(nestApp);
    app = nestApp;
    await app.init();
  });

  beforeEach(() => {
    events.length = 0;
  });

  afterAll(async () => {
    await app.close();
    await Sentry.close(2000);
  });

  it('parses a plain JSON body', () =>
    request(app.getHttpServer())
      .post('/__test-body')
      .set('Content-Type', 'application/json')
      .send(json)
      .expect(201)
      .expect({ name: 'demo' }));

  it('parses a plain urlencoded body', () =>
    request(app.getHttpServer())
      .post('/__test-body')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('name=demo')
      .expect(201)
      .expect({ name: 'demo' }));

  it.each([
    ['br', 'application/json', brotliCompressSync(json)],
    ['gzip', 'application/json', gzipSync(json)],
    ['gzip', 'application/x-www-form-urlencoded', gzipSync('name=demo')],
  ])(
    'rejects a %s-compressed %s body with 415 without inflating it',
    async (encoding, type, body) => {
      await request(app.getHttpServer())
        .post('/__test-body')
        .set('Content-Type', type)
        .set('Content-Encoding', encoding)
        .send(body)
        .expect(415)
        .expect({ statusCode: 415, message: 'content encoding unsupported' });

      await Sentry.flush(2000);
      expect(events).toHaveLength(0);
    },
  );

  it('answers a body over the 100 KB limit with 413 and keeps it out of Sentry', async () => {
    await request(app.getHttpServer())
      .post('/__test-body')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ name: 'a'.repeat(200_000) }))
      .expect(413)
      .expect({ statusCode: 413, message: 'request entity too large' });

    await Sentry.flush(2000);
    expect(events).toHaveLength(0);
  });
});
