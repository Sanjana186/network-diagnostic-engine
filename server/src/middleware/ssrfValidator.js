import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

const IPV6_GLOBAL_UNICAST = ipaddr.parseCIDR('2000::/3');

function sendError(res, status, error, message) {
  return res.status(status).json({ error, message });
}

function parseIpLiteral(hostname) {
  const addressText = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;

  if (!ipaddr.isValid(addressText)) {
    return null;
  }

  return ipaddr.parse(addressText);
}

function isPublicAddress(addressText) {
  if (!ipaddr.isValid(addressText)) {
    return false;
  }

  const address = ipaddr.parse(addressText);

  // ipaddr.js classifies private and special-use ranges separately from unicast.
  if (address.range() !== 'unicast') {
    return false;
  }

  // IPv6 global unicast is limited to 2000::/3; reject other unicast-class ranges.
  if (address.kind() === 'ipv6' && !address.match(IPV6_GLOBAL_UNICAST)) {
    return false;
  }

  return true;
}

function getUrlValidationError(inputUrl) {
  let url;

  try {
    url = new URL(inputUrl);
  } catch {
    return {
      error: 'INVALID_URL',
      message: 'The url must be a valid HTTP or HTTPS URL.'
    };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      error: 'UNSUPPORTED_PROTOCOL',
      message: 'Only http: and https: URLs are supported.'
    };
  }

  const authorityStart = inputUrl.indexOf('://') + 3;
  const authority = inputUrl.slice(authorityStart).split(/[/?#]/, 1)[0];
  if (url.username || url.password || authority.includes('@')) {
    return {
      error: 'URL_CREDENTIALS_NOT_ALLOWED',
      message: 'URLs must not contain embedded credentials.'
    };
  }

  const expectedPort = url.protocol === 'https:' ? '443' : '80';
  if (url.port && url.port !== expectedPort) {
    return {
      error: 'UNSUPPORTED_PORT',
      message: `Only port ${expectedPort} is permitted for ${url.protocol.slice(0, -1)}.`
    };
  }

  if (!url.hostname) {
    return {
      error: 'INVALID_URL',
      message: 'The URL must include a hostname.'
    };
  }

  return { url };
}

export async function ssrfValidator(req, res, next) {
  const inputUrl = req.body && req.body.url;

  if (typeof inputUrl !== 'string' || inputUrl.trim() === '') {
    return sendError(res, 400, 'INVALID_URL', 'A non-empty url string is required.');
  }

  const validation = getUrlValidationError(inputUrl.trim());
  if (validation.error) {
    return sendError(res, 400, validation.error, validation.message);
  }

  const url = validation.url;
  const hostname = url.hostname;
  const literalAddress = parseIpLiteral(hostname);

  let addresses;
  let dnsDuration = 0;

  if (literalAddress) {
    addresses = [{ address: literalAddress.toString() }];
  } else {
    const dnsStart = process.hrtime.bigint();

    try {
      addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    } catch {
      return sendError(
        res,
        502,
        'DNS_RESOLUTION_FAILED',
        'The target hostname could not be resolved.'
      );
    }

    dnsDuration = Number(process.hrtime.bigint() - dnsStart) / 1e6;
  }

  if (
    !Array.isArray(addresses) ||
    addresses.length === 0 ||
    addresses.some((entry) => !entry || typeof entry.address !== 'string')
  ) {
    return sendError(
      res,
      502,
      'DNS_RESOLUTION_FAILED',
      'The target hostname did not resolve to any IP addresses.'
    );
  }

  // Validate every answer before choosing one, so a safe answer cannot hide an unsafe one.
  if (addresses.some(({ address }) => !isPublicAddress(address))) {
    return sendError(
      res,
      403,
      'SSRF_BLOCKED',
      'The target resolves to a non-public or special-use IP address.'
    );
  }

  req.normalizedUrl = url.href;
  req.targetHostname = hostname;
  req.validatedTarget = {
    ip: addresses[0].address,
    dnsDuration
  };

  return next();
}

export default ssrfValidator;
