import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import dns from 'node:dns/promises';
import { ssrfValidator } from './ssrfValidator.js';

async function runMiddleware(url, resolver) {
  const originalLookup = dns.lookup;
  const req = { body: {} };
  if (url !== runMiddleware.missingUrl) {
    req.body.url = url;
  }

  let statusCode;
  let responseBody;
  let nextCalls = 0;
  const lookupCalls = [];
  const res = {
    status(status) {
      statusCode = status;
      return this;
    },
    json(body) {
      responseBody = body;
      return body;
    }
  };

  dns.lookup = async (hostname, options) => {
    lookupCalls.push({ hostname, options });
    if (!resolver) {
      throw new Error('Unexpected DNS lookup in test');
    }
    return resolver(hostname, options);
  };

  try {
    await ssrfValidator(req, res, () => {
      nextCalls += 1;
    });
  } finally {
    dns.lookup = originalLookup;
  }

  return { req, statusCode, responseBody, nextCalls, lookupCalls };
}

runMiddleware.missingUrl = Symbol('missing URL');

function assertBlocked(result, status = 403) {
  assert.equal(result.statusCode, status);
  assert.equal(result.nextCalls, 0);
  assert.equal(typeof result.responseBody.error, 'string');
  assert.ok(result.responseBody.error.length > 0);
  assert.equal(typeof result.responseBody.message, 'string');
  assert.ok(result.responseBody.message.length > 0);
}

describe('ssrfValidator', { concurrency: false }, () => {
  test('accepts a public IPv4 literal without DNS lookup', async () => {
    const result = await runMiddleware('http://8.8.8.8');

    assert.equal(result.nextCalls, 1);
    assert.equal(result.lookupCalls.length, 0);
    assert.equal(result.req.validatedTarget.ip, '8.8.8.8');
    assert.equal(result.req.validatedTarget.dnsDuration, 0);
  });

  test('accepts a public IPv6 literal without DNS lookup', async () => {
    const result = await runMiddleware('https://[2606:4700:4700::1111]');

    assert.equal(result.nextCalls, 1);
    assert.equal(result.lookupCalls.length, 0);
    assert.equal(result.req.validatedTarget.ip, '2606:4700:4700::1111');
    assert.equal(result.req.validatedTarget.dnsDuration, 0);
  });

  test('accepts a public hostname resolving to public IPv4 and IPv6 addresses', async () => {
    const result = await runMiddleware('https://example.test', async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '2606:4700:4700::1111', family: 6 }
    ]);

    assert.equal(result.nextCalls, 1);
    assert.equal(result.req.validatedTarget.ip, '93.184.216.34');
    assert.equal(Number.isFinite(result.req.validatedTarget.dnsDuration), true);
    assert.ok(result.req.validatedTarget.dnsDuration >= 0);
  });

  test('rejects localhost resolving to loopback IPv4', async () => {
    const result = await runMiddleware('http://localhost', async () => [
      { address: '127.0.0.1', family: 4 }
    ]);

    assertBlocked(result);
  });

  test('rejects private IPv4 literals', async () => {
    const result = await runMiddleware('http://10.12.0.5');

    assertBlocked(result);
  });

  test('rejects loopback IPv6 literals', async () => {
    const result = await runMiddleware('http://[::1]');

    assertBlocked(result);
  });

  test('rejects IPv4 link-local addresses', async () => {
    const result = await runMiddleware('http://169.254.1.10');

    assertBlocked(result);
  });

  test('rejects the cloud metadata IPv4 address', async () => {
    const result = await runMiddleware('http://169.254.169.254');

    assertBlocked(result);
  });

  test('rejects IPv6 link-local DNS answers', async () => {
    const result = await runMiddleware('https://example.test', async () => [
      { address: 'fe80::1', family: 6 }
    ]);

    assertBlocked(result);
  });

  test('rejects IPv4-mapped IPv6 literals', async () => {
    const result = await runMiddleware('https://[::ffff:8.8.8.8]');

    assertBlocked(result);
  });

  test('rejects DNS answers containing both public and private IPs', async () => {
    const result = await runMiddleware('https://mixed.example.test', async () => [
      { address: '8.8.8.8', family: 4 },
      { address: '192.168.1.5', family: 4 }
    ]);

    assertBlocked(result);
  });

  test('rejects an empty DNS result with a 502 response', async () => {
    const result = await runMiddleware('https://empty.example.test', async () => []);

    assertBlocked(result, 502);
  });

  test('returns 502 when DNS lookup fails', async () => {
    const result = await runMiddleware('https://failure.example.test', async () => {
      throw new Error('simulated DNS failure');
    });

    assertBlocked(result, 502);
    assert.equal(result.responseBody.error, 'DNS_RESOLUTION_FAILED');
  });

  test('returns 400 when the URL is missing', async () => {
    const result = await runMiddleware(runMiddleware.missingUrl);

    assertBlocked(result, 400);
    assert.equal(result.responseBody.error, 'INVALID_URL');
  });

  test('returns 400 when the URL is empty', async () => {
    const result = await runMiddleware('   ');

    assertBlocked(result, 400);
    assert.equal(result.responseBody.error, 'INVALID_URL');
  });

  test('returns 400 when the URL is not a string', async () => {
    const result = await runMiddleware(123);

    assertBlocked(result, 400);
    assert.equal(result.responseBody.error, 'INVALID_URL');
  });

  test('rejects malformed URLs', async () => {
    const result = await runMiddleware('http://[::1');

    assertBlocked(result, 400);
    assert.equal(result.responseBody.error, 'INVALID_URL');
  });

  test('rejects unsupported URL protocols', async () => {
    const result = await runMiddleware('ftp://example.test');

    assertBlocked(result, 400);
    assert.equal(result.responseBody.error, 'UNSUPPORTED_PROTOCOL');
  });

  test('rejects embedded URL credentials', async () => {
    const result = await runMiddleware('https://user:password@example.test');

    assertBlocked(result, 400);
    assert.equal(result.responseBody.error, 'URL_CREDENTIALS_NOT_ALLOWED');
  });

  test('rejects unsupported ports', async () => {
    const result = await runMiddleware('http://example.test:8080');

    assertBlocked(result, 400);
    assert.equal(result.responseBody.error, 'UNSUPPORTED_PORT');
  });

  test('attaches the normalized URL and hostname', async () => {
    const result = await runMiddleware('HTTPS://ExAmPlE.test:443/path?x=1', async () => [
      { address: '8.8.8.8', family: 4 }
    ]);

    assert.equal(result.req.normalizedUrl, 'https://example.test/path?x=1');
    assert.equal(result.req.targetHostname, 'example.test');
  });

  test('attaches an approved IP and non-negative DNS duration', async () => {
    const result = await runMiddleware('https://example.test', async () => [
      { address: '1.1.1.1', family: 4 }
    ]);

    assert.deepEqual(Object.keys(result.req.validatedTarget), ['ip', 'dnsDuration']);
    assert.equal(result.req.validatedTarget.ip, '1.1.1.1');
    assert.equal(Number.isFinite(result.req.validatedTarget.dnsDuration), true);
    assert.ok(result.req.validatedTarget.dnsDuration >= 0);
  });

  test('calls next exactly once on success and never on rejection', async () => {
    const success = await runMiddleware('http://8.8.4.4');
    const rejected = await runMiddleware('http://127.0.0.1');

    assert.equal(success.nextCalls, 1);
    assert.equal(rejected.nextCalls, 0);
  });
});
