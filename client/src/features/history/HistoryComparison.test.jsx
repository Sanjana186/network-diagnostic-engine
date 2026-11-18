import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HistoryComparison } from './HistoryComparison.jsx';

const BASE_TIMINGS = {
  dnsLookup: 10,
  tcpConnection: 20,
  tlsHandshake: 30,
  ttfb: 40,
  dataTransfer: 50,
  totalDuration: 100
};

function makeDiagnosticResponse({
  url = 'https://example.com/current?source=diagnostic#result',
  timings = {},
  metrics = {},
  analysis = {}
} = {}) {
  return {
    target: {
      url,
      protocol: url.startsWith('http:') ? 'http:' : 'https:',
      hostname: 'example.com',
      ip: '203.0.113.10'
    },
    timings: { ...BASE_TIMINGS, ...timings },
    metrics: {
      statusCode: 200,
      contentLengthBytes: 4096,
      throughputKbps: 256,
      ...metrics
    },
    analysis: {
      primaryBottleneck: 'ttfb',
      severity: 'moderate',
      summary: 'The server response contributes a notable share of total time.',
      recommendations: ['Review the response path.'],
      ...analysis
    }
  };
}

function makeHistoryRecord({
  hostname = 'example.com',
  url = 'https://example.com/previous?source=history#saved',
  timestamp = '2025-03-10T12:30:00.000Z',
  timings = {},
  metrics = {},
  analysis = {},
  result
} = {}) {
  return {
    id: 'history-previous',
    hostname,
    timestamp,
    result: result ?? makeDiagnosticResponse({ url, timings, metrics, analysis })
  };
}

function renderComparison(props = {}) {
  return render(<HistoryComparison {...props} />);
}

function getTimingCells(label) {
  const row = screen.getByRole('row', { name: new RegExp(label, 'i') });
  return within(row).getAllByRole('cell').map((cell) => cell.textContent.trim());
}

function makeComparableProps({ currentUrl, previousHostname, previousUrl, currentTimings, previousTimings } = {}) {
  return {
    currentResult: makeDiagnosticResponse({
      ...(currentUrl ? { url: currentUrl } : {}),
      ...(currentTimings ? { timings: currentTimings } : {})
    }),
    previousRecord: makeHistoryRecord({
      ...(previousHostname !== undefined ? { hostname: previousHostname } : {}),
      ...(previousUrl ? { url: previousUrl } : {}),
      ...(previousTimings ? { timings: previousTimings } : {})
    })
  };
}

describe('missing and invalid comparison inputs', () => {
  it('explains that a current diagnostic result is required', () => {
    renderComparison({ previousRecord: makeHistoryRecord() });

    expect(screen.getByRole('status'))
      .toHaveTextContent('Run a diagnostic to compare it with a previous result.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('explains that a previous run must be selected', () => {
    renderComparison({ currentResult: makeDiagnosticResponse() });

    expect(screen.getByRole('status'))
      .toHaveTextContent('Select a previous diagnostic run to compare.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('handles both current and previous results being absent', () => {
    renderComparison();

    expect(screen.getByRole('status'))
      .toHaveTextContent('Run a diagnostic to compare it with a previous result.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('rejects a selected record without a diagnostic result', () => {
    renderComparison({
      currentResult: makeDiagnosticResponse(),
      previousRecord: { hostname: 'example.com', timestamp: '2025-03-10T12:30:00.000Z' }
    });

    expect(screen.getByRole('alert'))
      .toHaveTextContent('The selected history record has no diagnostic result to compare.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it.each([
    ['missing current URL', { currentUrl: '' }],
    ['invalid current URL', { currentUrl: 'not a URL' }],
    ['hostless current URL', { currentUrl: 'mailto:probe@example.com' }],
    ['invalid previous URL', { previousUrl: 'https://' }],
    ['hostless previous URL', { previousUrl: 'mailto:probe@example.com' }]
  ])('does not compare with a %s', (_description, urls) => {
    const props = makeComparableProps(urls);
    if (urls.currentUrl === '') {
      delete props.currentResult.target.url;
    }

    renderComparison(props);

    expect(screen.getByRole('alert'))
      .toHaveTextContent('Comparison is unavailable because a target URL or hostname is invalid.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('rejects a previous record with no hostname', () => {
    const previousRecord = makeHistoryRecord();
    delete previousRecord.hostname;
    renderComparison({
      currentResult: makeDiagnosticResponse(),
      previousRecord
    });

    expect(screen.getByRole('alert'))
      .toHaveTextContent('Comparison is unavailable because a target URL or hostname is invalid.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('same-domain validation', () => {
  it('compares matching domains using case and trailing-dot normalization', () => {
    renderComparison(makeComparableProps({
      currentUrl: 'HTTPS://EXAMPLE.COM.:8443/current?probe=1#now',
      previousHostname: 'EXAMPLE.COM.',
      previousUrl: 'http://example.com:8080/previous?old=1#saved'
    }));

    expect(screen.getByRole('table', { name: /comparison for example\.com/i }))
      .toBeInTheDocument();
    expect(screen.getByText((_, element) => (
      element.tagName === 'P'
      && element.textContent === 'Comparing example.com with an earlier run for the same domain.'
    )))
      .toBeInTheDocument();
  });

  it.each([
    ['different hostname', 'other.example', 'https://other.example/previous'],
    ['subdomain', 'api.example.com', 'https://api.example.com/previous']
  ])('rejects a %s instead of using substring matching', (_description, hostname, url) => {
    renderComparison(makeComparableProps({
      currentUrl: 'https://example.com/current',
      previousHostname: hostname,
      previousUrl: url
    }));

    expect(screen.getByRole('alert'))
      .toHaveTextContent('Comparisons are limited to the same domain.');
    expect(screen.getByRole('alert')).toHaveTextContent(`selected: ${hostname}`);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('rejects inconsistent hostname data in a history record', () => {
    renderComparison(makeComparableProps({
      currentUrl: 'https://example.com/current',
      previousHostname: 'other.example',
      previousUrl: 'https://example.com/previous'
    }));

    expect(screen.getByRole('alert'))
      .toHaveTextContent('The selected history record has inconsistent hostname information.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('normalizes paths, queries, fragments and ports to the hostname', () => {
    renderComparison(makeComparableProps({
      currentUrl: 'https://example.com:9443/a/b?current=yes#current',
      previousHostname: 'example.com',
      previousUrl: 'http://example.com:8080/other?previous=yes#previous'
    }));

    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});

describe('timing comparisons', () => {
  it('compares all six contract timing fields with values, differences, percentages and direction', () => {
    const currentTimings = {
      dnsLookup: 15,
      tcpConnection: 15,
      tlsHandshake: 30,
      ttfb: 60,
      dataTransfer: 0,
      totalDuration: 125
    };
    renderComparison(makeComparableProps({ currentTimings }));

    expect(getTimingCells('DNS lookup'))
      .toEqual(['10 ms', '15 ms', '5 ms', '+50%', 'Increased']);
    expect(getTimingCells('TCP connection'))
      .toEqual(['20 ms', '15 ms', '5 ms', '-25%', 'Decreased']);
    expect(getTimingCells('TLS handshake'))
      .toEqual(['30 ms', '30 ms', '0 ms', '0%', 'Unchanged']);
    expect(getTimingCells('Time to first byte'))
      .toEqual(['40 ms', '60 ms', '20 ms', '+50%', 'Increased']);
    expect(getTimingCells('Content download'))
      .toEqual(['50 ms', '0 ms', '50 ms', '-100%', 'Decreased']);
    expect(getTimingCells('Total duration'))
      .toEqual(['100 ms', '125 ms', '25 ms', '+25%', 'Increased']);
  });

  it('shows a positive percentage sign and absolute increase difference', () => {
    renderComparison(makeComparableProps({
      currentTimings: { dnsLookup: 30 }
    }));

    expect(getTimingCells('DNS lookup'))
      .toEqual(['10 ms', '30 ms', '20 ms', '+200%', 'Increased']);
  });

  it('shows a negative percentage and a non-negative absolute decrease difference', () => {
    renderComparison(makeComparableProps({
      currentTimings: { dnsLookup: 5 }
    }));

    expect(getTimingCells('DNS lookup'))
      .toEqual(['10 ms', '5 ms', '5 ms', '-50%', 'Decreased']);
  });

  it('shows zero difference and percentage for unchanged nonzero measurements', () => {
    renderComparison(makeComparableProps({
      currentTimings: { dnsLookup: 10 }
    }));

    expect(getTimingCells('DNS lookup'))
      .toEqual(['10 ms', '10 ms', '0 ms', '0%', 'Unchanged']);
  });

  it('does not divide by zero when a zero baseline increases', () => {
    renderComparison(makeComparableProps({
      previousTimings: { dnsLookup: 0 },
      currentTimings: { dnsLookup: 5 }
    }));

    expect(getTimingCells('DNS lookup'))
      .toEqual(['0 ms', '5 ms', '5 ms', 'N/A (previous value was 0 ms)', 'Increased']);
    expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument();
  });

  it('marks a zero-to-zero comparison as unchanged with an unavailable percentage', () => {
    renderComparison(makeComparableProps({
      previousTimings: { dnsLookup: 0 },
      currentTimings: { dnsLookup: 0 }
    }));

    expect(getTimingCells('DNS lookup'))
      .toEqual(['0 ms', '0 ms', '0 ms', 'N/A (previous value was 0 ms)', 'Unchanged']);
  });
});

const MISSING = Symbol('missing');
const invalidValues = [
  ['missing', MISSING],
  ['null', null],
  ['negative', -1],
  ['numeric string', '12'],
  ['NaN', NaN],
  ['Infinity', Infinity],
  ['negative Infinity', -Infinity],
  ['object', {}]
];

function setTiming(result, field, value) {
  if (value === MISSING) {
    delete result.timings[field];
  } else {
    result.timings[field] = value;
  }
}

describe('invalid timing measurements', () => {
  it.each(invalidValues)('rejects an invalid previous value (%s)', (_label, value) => {
    const props = makeComparableProps();
    setTiming(props.previousRecord.result, 'dnsLookup', value);
    renderComparison(props);

    expect(getTimingCells('DNS lookup')).toEqual([
      'Unavailable',
      '10 ms',
      'Unavailable',
      'Unavailable',
      'Unavailable'
    ]);
  });

  it.each(invalidValues)('rejects an invalid current value (%s)', (_label, value) => {
    const props = makeComparableProps();
    setTiming(props.currentResult, 'dnsLookup', value);
    renderComparison(props);

    expect(getTimingCells('DNS lookup')).toEqual([
      '10 ms',
      'Unavailable',
      'Unavailable',
      'Unavailable',
      'Unavailable'
    ]);
  });

  it('handles missing timing objects on both results', () => {
    const props = makeComparableProps();
    props.previousRecord.result.timings = null;
    props.currentResult.timings = undefined;
    renderComparison(props);

    expect(getTimingCells('DNS lookup')).toEqual([
      'Unavailable',
      'Unavailable',
      'Unavailable',
      'Unavailable',
      'Unavailable'
    ]);
    expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument();
  });
});

describe('small and large measurements', () => {
  it('formats very small finite measurements without rounding them to zero', () => {
    const props = makeComparableProps({
      previousTimings: { dnsLookup: 1e-8 },
      currentTimings: { dnsLookup: 2e-8 }
    });
    renderComparison(props);

    expect(getTimingCells('DNS lookup')).toEqual([
      '1.000000000e-8 ms',
      '2.000000000e-8 ms',
      '1.000000000e-8 ms',
      '+100%',
      'Increased'
    ]);
  });

  it('formats very large finite measurements in scientific notation', () => {
    const props = makeComparableProps({
      previousTimings: { dnsLookup: 1e308 },
      currentTimings: { dnsLookup: 1.5e308 }
    });
    renderComparison(props);

    expect(getTimingCells('DNS lookup')).toEqual([
      '1.000000000e+308 ms',
      '1.500000000e+308 ms',
      '5.000000000e+307 ms',
      '+50%',
      'Increased'
    ]);
  });

  it('reports an unrepresentable percentage as unavailable instead of displaying Infinity', () => {
    const props = makeComparableProps({
      previousTimings: { dnsLookup: Number.MIN_VALUE },
      currentTimings: { dnsLookup: Number.MAX_VALUE }
    });
    renderComparison(props);

    const cells = getTimingCells('DNS lookup');
    expect(cells[3]).toBe('Unavailable');
    expect(cells[4]).toBe('Increased');
    expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument();
  });
});

describe('response context and timestamp', () => {
  it('shows previous and current HTTP status, content length and throughput with units', () => {
    const props = makeComparableProps();
    props.previousRecord.result.metrics = {
      statusCode: 201,
      contentLengthBytes: 2048,
      throughputKbps: 128
    };
    props.currentResult.metrics = {
      statusCode: 206,
      contentLengthBytes: 4096,
      throughputKbps: 256
    };
    renderComparison(props);

    const context = screen.getByRole('region', { name: 'Response context' });
    expect(within(context).getByText('Previous HTTP status').parentElement)
      .toHaveTextContent('201');
    expect(within(context).getByText('Current HTTP status').parentElement)
      .toHaveTextContent('206');
    expect(within(context).getByText('Previous content length').parentElement)
      .toHaveTextContent('2,048 bytes');
    expect(within(context).getByText('Current content length').parentElement)
      .toHaveTextContent('4,096 bytes');
    expect(within(context).getByText('Previous throughput').parentElement)
      .toHaveTextContent('128 Kbps');
    expect(within(context).getByText('Current throughput').parentElement)
      .toHaveTextContent('256 Kbps');
    expect(context).not.toHaveTextContent('%');
  });

  it('shows unavailable for missing or invalid context metrics', () => {
    const props = makeComparableProps();
    props.previousRecord.result.metrics = {
      statusCode: null,
      contentLengthBytes: '2048',
      throughputKbps: Infinity
    };
    props.currentResult.metrics = {};
    renderComparison(props);

    const context = screen.getByRole('region', { name: 'Response context' });
    expect(within(context).getAllByText('Unavailable')).toHaveLength(6);
  });

  it('renders a semantic formatted time for a valid previous timestamp', () => {
    const props = makeComparableProps();
    props.previousRecord.timestamp = '2025-03-10T12:30:00.000Z';
    renderComparison(props);

    const time = screen.getByText(
      new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
        .format(new Date(props.previousRecord.timestamp))
    );
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', props.previousRecord.timestamp);
  });

  it.each([undefined, 'not a date'])(
    'does not render a timestamp for invalid or missing values (%j)',
    (timestamp) => {
      const props = makeComparableProps();
      props.previousRecord.timestamp = timestamp;
      renderComparison(props);

      expect(screen.queryByText(/^Previous run:/)).not.toBeInTheDocument();
      expect(screen.queryByRole('table')).toBeInTheDocument();
    }
  );
});

describe('accessible comparison structure', () => {
  it('provides a named comparison section, caption, column headers, and timing row headers', () => {
    renderComparison(makeComparableProps());

    expect(screen.getByRole('region', { name: 'Diagnostic comparison' })).toBeInTheDocument();
    const table = screen.getByRole('table', {
      name: 'Previous and current diagnostic timing comparison for example.com'
    });
    expect(within(table).getByRole('columnheader', { name: 'Timing' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Previous' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Current' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Absolute difference' }))
      .toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'DNS lookup' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Total duration' })).toBeInTheDocument();
  });

  it('labels comparison direction with text, not color alone', () => {
    renderComparison(makeComparableProps({ currentTimings: { dnsLookup: 15 } }));

    expect(within(screen.getByRole('row', { name: /DNS lookup/ })).getByText('Increased'))
      .toBeInTheDocument();
    expect(screen.getByText(/Direction describes the measured timing only/)).toBeInTheDocument();
  });

  it('uses status semantics for missing selections and alert semantics for invalid comparisons', () => {
    const { unmount } = render(<HistoryComparison />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    unmount();

    renderComparison(makeComparableProps({
      currentUrl: 'https://example.com/current',
      previousHostname: 'other.example',
      previousUrl: 'https://other.example/previous'
    }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
