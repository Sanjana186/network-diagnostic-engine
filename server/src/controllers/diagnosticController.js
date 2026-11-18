import { probeUrl } from '../services/networkProber.js';
import { analyzeBottlenecks } from '../services/bottleneckAnalyzer.js';

/**
 * Controller to handle POST /api/diagnose
 * Initiates the low-level network probe, evaluates bottleneck heuristics, and formats the output.
 */
export async function runDiagnostics(req, res) {
  try {
    const inputUrl = req.normalizedUrl || req.body.url;

    if (!inputUrl || typeof inputUrl !== 'string' || inputUrl.trim() === '') {
      return res.status(400).json({
        error: 'INVALID_URL',
        message: 'The "url" field is required and must be a valid HTTP/HTTPS URL string.'
      });
    }

    const targetUrl = inputUrl.trim();

    // If SSRF middleware pre-validated the IP and measured DNS lookup, pass them in
    const probeOptions = {};
    if (req.validatedTarget) {
      probeOptions.validatedIp = req.validatedTarget.ip;
      probeOptions.dnsDuration = req.validatedTarget.dnsDuration;
    }

    // Execute low-level network probe
    const probeResult = await probeUrl(targetUrl, probeOptions);

    // Run Engineer 2's deterministic V1 bottleneck heuristics engine
    const analysis = analyzeBottlenecks({
      timings: probeResult.timings,
      metrics: probeResult.metrics
    });

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
