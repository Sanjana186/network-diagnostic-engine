import { probeUrl } from '../services/networkProber.js';

/**
 * Controller to handle POST /api/diagnose
 * Initiates the low-level network probe and formats the output.
 */
export async function runDiagnostics(req, res) {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return res.status(400).json({
        error: 'INVALID_URL',
        message: 'The "url" field is required and must be a valid HTTP/HTTPS URL string.'
      });
    }

    const trimmedUrl = url.trim();

    // If SSRF middleware pre-validated the IP and measured DNS lookup, pass them in
    const probeOptions = {};
    if (req.validatedTarget) {
      probeOptions.validatedIp = req.validatedTarget.ip;
      probeOptions.dnsDuration = req.validatedTarget.dnsDuration;
    }

    // Execute low-level network probe
    const probeResult = await probeUrl(trimmedUrl, probeOptions);

    // Compute basic bottleneck analysis fallback until Engineer 2 plugs in the full heuristic engine
    const timings = probeResult.timings;
    const stageEntries = [
      { name: 'DNS Resolution', key: 'dnsLookup', time: timings.dnsLookup },
      { name: 'TCP Connection', key: 'tcpConnection', time: timings.tcpConnection },
      { name: 'TLS Handshake', key: 'tlsHandshake', time: timings.tlsHandshake },
      { name: 'Server Response (TTFB)', key: 'ttfb', time: timings.ttfb },
      { name: 'Content Download', key: 'dataTransfer', time: timings.dataTransfer },
    ];

    const slowest = stageEntries.reduce((max, curr) => curr.time > max.time ? curr : max, stageEntries[0]);
    const percentageOfTotal = timings.totalDuration > 0 
      ? Number(((slowest.time / timings.totalDuration) * 100).toFixed(1))
      : 0;

    const analysis = {
      primaryBottleneck: slowest.key,
      bottleneckName: slowest.name,
      durationMs: slowest.time,
      percentageOfTotal: percentageOfTotal,
      severity: percentageOfTotal > 50 ? 'critical' : (percentageOfTotal > 30 ? 'moderate' : 'optimal'),
      summary: `${slowest.name} took ${slowest.time}ms, accounting for ${percentageOfTotal}% of total latency.`,
      recommendations: [
        `Focus optimization efforts on ${slowest.name} to achieve the highest performance gain.`
      ]
    };

    return res.status(200).json({
      ...probeResult,
      analysis,
    });
  } catch (error) {
    console.error('Diagnostic error:', error.message);
    return res.status(500).json({
      error: 'DIAGNOSTIC_FAILED',
      message: error.message || 'An unexpected error occurred during network probing.'
    });
  }
}

export default {
  runDiagnostics,
};
