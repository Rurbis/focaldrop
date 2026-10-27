import { ConsoleLogger, HttpException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

export async function bootstrap(env: Env): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({ json: true, colors: false, compact: true }),
  });

  configureApp(app);
  app.enableShutdownHooks();

  try {
    await app.listen(env.PORT);
  } catch (error) {
    await app.close();
    throw error;
  }
}

// HTTP settings shared by the server and the e2e tests.
export function configureApp(app: NestExpressApplication): void {
  // Compressed request bodies get a 415 instead of being inflated. Nothing
  // sends them to the API (the browser talks to Next, which forwards plain
  // JSON), and decompressing untrusted input was the path of two October 2026
  // advisories: body-parser GHSA-27r3-jxmh-p828 and the Node.js Brotli decoder
  // CVE-2026-111497. Registered before init, these replace Nest's defaults.
  app.useBodyParser('json', { inflate: false });
  app.useBodyParser('urlencoded', { inflate: false, extended: true });
  // Nest turns malformed JSON into a BadRequestException, but other parser
  // rejections (too large, compressed) stay plain http-errors, which the Sentry
  // filter reports as crashes: anyone could drain the free quota with junk
  // requests. As HttpExceptions they keep the same response and count as
  // expected client errors.
  app.use((error: unknown, _request: Request, _response: Response, next: NextFunction) => {
    next(toHttpException(error));
  });
}

function toHttpException(error: unknown): unknown {
  return isClientError(error)
    ? new HttpException(error.message, error.status, { cause: error })
    : error;
}

function isClientError(error: unknown): error is Error & { status: number } {
  return (
    error instanceof Error &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500
  );
}
