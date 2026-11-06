import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';
import { DatabaseService } from '../src/db/database.module.js';

describe('HTTP settings (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({})
      .compile();
    const nestApp = fixture.createNestApplication<NestExpressApplication>({ logger: false });
    configureApp(nestApp);
    app = nestApp;
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['a successful response', '/health', 200],
    ['an error', '/does-not-exist', 404],
  ])('does not name the framework in %s', async (_name, path, status) => {
    const response = await request(app.getHttpServer()).get(path).expect(status);

    expect(response.headers).not.toHaveProperty('x-powered-by');
  });
});
