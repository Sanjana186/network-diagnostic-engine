import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { now, diffMs } from '../utils/timer.js';

/**
 * Probes a given URL to measure stage-by-stage network timings:
 * - DNS Lookup
 * - TCP Connection
 * - TLS Handshake (HTTPS only)
 * - Time to First Byte (TTFB)
 * - Data Transfer
 * - Total Duration & Throughput
 * 
 * @param {string} targetUrl - URL to probe (must start with http:// or https://)
 * @param {object} [options]
 * @param {number} [options.timeout=10000] - Total timeout in milliseconds
 * @returns {Promise<object>} Probe results matching the shared API contract
 */
export async function probeUrl(targetUrl, options = {}) {
  const timeoutMs = options.timeout || 10000;
  
  // 1. Parse and validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (err) {
    throw new Error(`Invalid URL format: ${err.message}`);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${parsedUrl.protocol}. Only http: and https: are allowed.`);
  }

  const isHttps = parsedUrl.protocol === 'https:';
  const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : (isHttps ? 443 : 80);
  const hostname = parsedUrl.hostname;

  // 2. Measure DNS Lookup
  const dnsStart = now();
  let resolvedIp;
  try {
    const lookupResult = await dns.lookup(hostname);
    resolvedIp = lookupResult.address;
  } catch (dnsErr) {
    throw new Error(`DNS Resolution failed for "${hostname}": ${dnsErr.code || dnsErr.message}`);
  }
  const dnsDuration = diffMs(dnsStart);

  // 3. Measure TCP, TLS, TTFB, and Data Transfer using http/https request lifecycle hooks
  return new Promise((resolve, reject) => {
    let tcpStart = 0n;
    let tcpDuration = 0;
    let tlsStart = 0n;
    let tlsDuration = 0;
    let ttfbStart = 0n;
    let ttfbDuration = 0;
    let downloadStart = 0n;
    let downloadDuration = 0;
    let totalBytes = 0;
    let isFinished = false;

    // Overall request start
    const requestStart = now();

    const requestOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: port,
      path: (parsedUrl.pathname || '/') + (parsedUrl.search || ''),
      method: 'GET',
      headers: {
        'User-Agent': 'NetworkDiagnosticEngine/1.0 (Capstone Diagnostic Tool)',
        'Accept': '*/*',
        'Connection': 'close', // Do not reuse socket; we want a fresh connection measurement
      },
    };

    const client = isHttps ? https : http;

    const req = client.request(requestOptions);

    // Timeout guard
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
    });

    req.on('socket', (socket) => {
      tcpStart = now();

      // Socket is connecting (TCP 3-way handshake)
      socket.on('connect', () => {
        tcpDuration = diffMs(tcpStart);
        if (isHttps) {
          tlsStart = now();
        }
      });

      // If HTTPS, TLS handshake completes on 'secureConnect'
      if (isHttps) {
        socket.on('secureConnect', () => {
          tlsDuration = diffMs(tlsStart);
        });
      }
    });

    // Request sent, waiting for first byte of response
    req.on('finish', () => {
      ttfbStart = now();
    });

    // First byte of response received
    req.on('response', (res) => {
      ttfbDuration = ttfbStart !== 0n ? diffMs(ttfbStart) : 0;
      downloadStart = now();

      res.on('data', (chunk) => {
        totalBytes += chunk.length;
      });

      res.on('end', () => {
        if (isFinished) return;
        isFinished = true;

        downloadDuration = downloadStart !== 0n ? diffMs(downloadStart) : 0;
        const totalDuration = diffMs(requestStart);

        // Throughput calculation: (Bytes * 8) / (downloadDuration in ms) = Kbps
        let throughputKbps = 0;
        if (downloadDuration > 0 && totalBytes > 0) {
          throughputKbps = Number(((totalBytes * 8) / downloadDuration).toFixed(2));
        }

        resolve({
          target: {
            url: targetUrl,
            protocol: parsedUrl.protocol,
            hostname: hostname,
            ip: resolvedIp,
            port: port,
          },
          timings: {
            dnsLookup: dnsDuration,
            tcpConnection: tcpDuration,
            tlsHandshake: tlsDuration,
            ttfb: ttfbDuration,
            dataTransfer: downloadDuration,
            totalDuration: totalDuration,
          },
          metrics: {
            statusCode: res.statusCode,
            contentLengthBytes: totalBytes,
            throughputKbps: throughputKbps,
            httpVersion: res.httpVersion,
          },
        });
      });

      res.on('error', (resErr) => {
        if (!isFinished) {
          isFinished = true;
          reject(new Error(`Response streaming error: ${resErr.message}`));
        }
      });
    });

    req.on('error', (reqErr) => {
      if (!isFinished) {
        isFinished = true;
        reject(new Error(`Connection failed: ${reqErr.code || reqErr.message}`));
      }
    });

    // Send the request
    req.end();
  });
}

export default {
  probeUrl,
};
