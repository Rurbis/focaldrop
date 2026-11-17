import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { exportJWK, generateKeyPair, SignJWT, type JWK, type JWTPayload } from 'jose';

/** A test key pair, with the public half as Supabase publishes it in its JWKS. */
export async function createSigningKey(kid: string) {
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' };
  return { kid, privateKey, jwk };
}

export type SigningKey = Awaited<ReturnType<typeof createSigningKey>>;

/** Signs any payload, so tests can also build tokens that Supabase never would. */
export function signToken(key: SigningKey, payload: JWTPayload, kid = key.kid): Promise<string> {
  return new SignJWT(payload).setProtectedHeader({ alg: 'ES256', kid }).sign(key.privateKey);
}

/** Serves a JWKS over real HTTP, so the API fetches and caches it as in staging. */
export async function startJwksServer(initialKeys: JWK[]) {
  let keys = initialKeys;
  let status = 200;
  let requests = 0;
  const server = createServer((_request, response) => {
    requests += 1;
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ keys }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const issuer = `http://127.0.0.1:${port}/auth/v1`;

  return {
    issuer,
    url: `${issuer}/.well-known/jwks.json`,
    requests: () => requests,
    setKeys: (next: JWK[]) => {
      keys = next;
    },
    setStatus: (next: number) => {
      status = next;
    },
    close: () =>
      new Promise<void>((resolve) => {
        if (!server.listening) return resolve();
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}
