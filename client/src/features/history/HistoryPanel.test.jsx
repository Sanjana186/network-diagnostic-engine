import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseDiagnosticHistory = vi.hoisted(() => vi.fn());

vi.mock('./useDiagnosticHistory.js', () => ({
  useDiagnosticHistory: mockUseDiagnosticHistory
}));

import { HistoryPanel } from './HistoryPanel.jsx';

let hookState;
let deleteRecord;
let clearHistory;

function makeDiagnosticResponse({
  url = 'https://example.com/path?source=history',
  timings = {},
  metrics = {},
  analysis = {}
} = {}) {
  return {
    target: { url },
    timings: {
      dnsLookup: 10,
      tcpConnection: 20,
      tlsHandshake: 30,
      ttfb: 40,
      dataTransfer: 50,
      totalDuration: 150,
      ...timings
    },
    metrics: {
      statusCode: 200,
      contentLengthBytes: 4096,
      throughputKbps: 256,
      ...metrics
    },
    analysis: {
      primaryBottleneck: 'dataTransfer',
      severity: 'critical',
      summary: 'Content transfer is the largest measured delay.',
      recommendations: ['Review payload size and delivery.'],
      ...analysis
    }
  };
}

function makeRecord({
  id = 'record-1',
  hostname = 'example.com',
  timestamp = '2025-03-10T12:30:00.000Z',
  result = makeDiagnosticResponse()
} = {}) {
  return { id, hostname, timestamp, result };
}

function renderPanel(overrides = {}) {
  hookState = {
    history: [],
    isLoading: false,
    storageError: false,
    deleteRecord,
    clearHistory,
    ...overrides
  };
  return render(<HistoryPanel />);
}

beforeEach(() => {
  deleteRecord = vi.fn().mockReturnValue({ success: true, deleted: true });
  clearHistory = vi.fn().mockReturnValue({ success: true });
  hookState = {
    history: [],
    isLoading: false,
    storageError: false,
    deleteRecord,
    clearHistory
  };
  mockUseDiagnosticHistory.mockReset().mockImplementation(() => hookState);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('HistoryPanel rendering', () => {
  it('renders the named history section and introductory text', () => {
    renderPanel();

    expect(screen.getByRole('region', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByText('Previous network diagnostic runs saved in this browser.'))
      .toBeInTheDocument();
  });

  it('renders multiple records independently with their diagnostic details', () => {
    const first = makeRecord();
    const second = makeRecord({
      id: 'record-2',
      hostname: 'github.com',
      result: makeDiagnosticResponse({
        url: 'https://github.com/network-diagnostic',
        timings: { totalDuration: 221.3 },
        metrics: { statusCode: 503 },
        analysis: {
          primaryBottleneck: 'ttfb',
          severity: 'moderate',
          summary: 'The server response took longer than expected.'
        }
      })
    });

    renderPanel({ history: [first, second] });

    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(2);
    expect(within(articles[0]).getByRole('heading', { name: 'example.com' })).toBeInTheDocument();
    expect(within(articles[0]).getByText('https://example.com/path?source=history'))
      .toBeInTheDocument();
    expect(within(articles[0]).getByText('200')).toBeInTheDocument();
    expect(within(articles[0]).getByText('150.00 ms')).toBeInTheDocument();
    expect(within(articles[0]).getByText('Data Transfer')).toBeInTheDocument();
    expect(within(articles[0]).getByText('Critical')).toBeInTheDocument();
    expect(within(articles[0]).getByText('Content transfer is the largest measured delay.'))
      .toBeInTheDocument();
    expect(within(articles[1]).getByRole('heading', { name: 'github.com' })).toBeInTheDocument();
    expect(within(articles[1]).getByText('503')).toBeInTheDocument();
    expect(within(articles[1]).getByText('221.30 ms')).toBeInTheDocument();
    expect(within(articles[1]).getByText('Ttfb')).toBeInTheDocument();
    expect(within(articles[1]).getByText('Moderate')).toBeInTheDocument();
  });

  it('renders a meaningful timestamp', () => {
    const record = makeRecord();

    renderPanel({ history: [record] });

    const article = screen.getByRole('article');
    const time = article.querySelector('time');
    expect(time).toHaveAttribute('dateTime', record.timestamp);
    expect(time).toHaveTextContent(
      new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
        .format(new Date(record.timestamp))
    );
  });

  it('handles missing optional display fields without crashing', () => {
    const record = makeRecord({
      timestamp: null,
      result: {
        target: {},
        timings: {},
        metrics: {},
        analysis: {}
      }
    });

    renderPanel({ history: [record] });

    const article = screen.getByRole('article');
    expect(within(article).getByRole('heading', { name: 'example.com' })).toBeInTheDocument();
    expect(within(article).getAllByText('Unavailable')).toHaveLength(4);
    expect(within(article).getByText('Time unavailable')).toBeInTheDocument();
    expect(within(article).queryByText(/Content transfer/)).not.toBeInTheDocument();
  });
});

describe('loading and empty states', () => {
  it('shows loading status without showing the empty-history message', () => {
    renderPanel({ isLoading: true });

    expect(screen.getByRole('status')).toHaveTextContent('Loading diagnostic history');
    expect(screen.queryByText('No diagnostic history yet')).not.toBeInTheDocument();
  });

  it('shows loaded records once loading completes', () => {
    hookState = {
      history: [makeRecord()],
      isLoading: true,
      storageError: false,
      deleteRecord,
      clearHistory
    };
    const { rerender } = render(<HistoryPanel />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();

    hookState = { ...hookState, isLoading: false };
    rerender(<HistoryPanel />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('shows a helpful empty state without destructive actions', () => {
    renderPanel();

    expect(screen.getByRole('heading', { name: 'No diagnostic history yet' }))
      .toBeInTheDocument();
    expect(screen.getByText('Previous diagnostic runs will appear here.'))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear history' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete diagnostic/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('storage error state', () => {
  it('shows storage and unavailable-history messages instead of a successful empty state', () => {
    renderPanel({ storageError: true });

    expect(screen.getByRole('alert')).toHaveTextContent('Browser storage could not be accessed');
    expect(screen.getByRole('status'))
      .toHaveTextContent('History entries cannot be displayed until browser storage is available.');
    expect(screen.queryByText('No diagnostic history yet')).not.toBeInTheDocument();
  });

  it('keeps supplied records visible alongside a storage warning', () => {
    const record = makeRecord();

    renderPanel({ history: [record], storageError: true });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.queryByText('History entries cannot be displayed until browser storage is available.'))
      .not.toBeInTheDocument();
  });
});

describe('individual deletion', () => {
  it('provides a meaningfully named delete action for every record', () => {
    renderPanel({
      history: [
        makeRecord(),
        makeRecord({ id: 'record-2', hostname: 'github.com' })
      ]
    });

    expect(screen.getByRole('button', { name: 'Delete diagnostic for example.com' }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete diagnostic for github.com' }))
      .toBeInTheDocument();
  });

  it('asks for confirmation and allows cancellation without deleting', () => {
    renderPanel({ history: [makeRecord()] });

    fireEvent.click(screen.getByRole('button', { name: 'Delete diagnostic for example.com' }));

    expect(screen.getByRole('group', { name: 'Confirm deleting history for example.com' }))
      .toBeInTheDocument();
    expect(screen.getByText('Delete this run?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('group', { name: 'Confirm deleting history for example.com' }))
      .not.toBeInTheDocument();
    expect(deleteRecord).not.toHaveBeenCalled();
  });

  it('calls deleteRecord with the correct ID and closes confirmation on success', () => {
    renderPanel({ history: [makeRecord({ id: 'delete-me' })] });
    fireEvent.click(screen.getByRole('button', { name: 'Delete diagnostic for example.com' }));

    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(deleteRecord).toHaveBeenCalledTimes(1);
    expect(deleteRecord).toHaveBeenCalledWith('delete-me');
    expect(screen.queryByRole('group', { name: 'Confirm deleting history for example.com' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('treats a successful no-op deletion as success', () => {
    deleteRecord.mockReturnValue({ success: true, deleted: false });
    renderPanel({ history: [makeRecord()] });
    fireEvent.click(screen.getByRole('button', { name: 'Delete diagnostic for example.com' }));

    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(deleteRecord).toHaveBeenCalledWith('record-1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Confirm deleting history for example.com' }))
      .not.toBeInTheDocument();
  });

  it('shows an error and keeps the record visible when deletion fails', () => {
    deleteRecord.mockReturnValue({ success: false, error: 'storage_write_failed' });
    renderPanel({ history: [makeRecord()] });
    fireEvent.click(screen.getByRole('button', { name: 'Delete diagnostic for example.com' }));

    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(screen.getByRole('alert'))
      .toHaveTextContent('This diagnostic could not be deleted. Please try again.');
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete diagnostic for example.com' }))
      .toBeInTheDocument();
  });
});

describe('clearing history', () => {
  it('shows a count confirmation and allows cancellation without clearing', () => {
    renderPanel({
      history: [makeRecord(), makeRecord({ id: 'record-2', hostname: 'github.com' })]
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));

    expect(screen.getByRole('group', { name: 'Confirm clearing diagnostic history' }))
      .toHaveTextContent('Clear all 2 runs?');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('group', { name: 'Confirm clearing diagnostic history' }))
      .not.toBeInTheDocument();
    expect(clearHistory).not.toHaveBeenCalled();
  });

  it('calls clearHistory and closes confirmation on success', () => {
    renderPanel({ history: [makeRecord()] });
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));

    fireEvent.click(screen.getByRole('button', { name: 'Confirm clear' }));

    expect(clearHistory).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('group', { name: 'Confirm clearing diagnostic history' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error and keeps the supplied records visible when clearing fails', () => {
    clearHistory.mockReturnValue({ success: false, error: 'storage_remove_failed' });
    renderPanel({ history: [makeRecord()] });
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));

    fireEvent.click(screen.getByRole('button', { name: 'Confirm clear' }));

    expect(screen.getByRole('alert'))
      .toHaveTextContent('History could not be cleared. Please try again.');
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear history' })).toBeInTheDocument();
  });
});

describe('interaction state and accessibility', () => {
  it('opening clear confirmation cancels an individual delete confirmation', () => {
    renderPanel({ history: [makeRecord()] });
    fireEvent.click(screen.getByRole('button', { name: 'Delete diagnostic for example.com' }));
    expect(screen.getByRole('group', { name: 'Confirm deleting history for example.com' }))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));

    expect(screen.getByRole('group', { name: 'Confirm clearing diagnostic history' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Confirm deleting history for example.com' }))
      .not.toBeInTheDocument();
  });

  it('opening an individual delete confirmation cancels clear confirmation', () => {
    renderPanel({ history: [makeRecord()] });
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    expect(screen.getByRole('group', { name: 'Confirm clearing diagnostic history' }))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete diagnostic for example.com' }));

    expect(screen.getByRole('group', { name: 'Confirm deleting history for example.com' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Confirm clearing diagnostic history' }))
      .not.toBeInTheDocument();
  });

  it('dismisses an operation error', () => {
    clearHistory.mockReturnValue({ success: false });
    renderPanel({ history: [makeRecord()] });
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm clear' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss history operation error' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears prior operation errors when a later delete succeeds', () => {
    deleteRecord
      .mockReturnValueOnce({ success: false, error: 'storage_write_failed' })
      .mockReturnValueOnce({ success: true, deleted: true });
    renderPanel({ history: [makeRecord()] });

    fireEvent.click(screen.getByRole('button', { name: 'Delete diagnostic for example.com' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete diagnostic for example.com' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(deleteRecord).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears prior operation errors when a later clear succeeds', () => {
    clearHistory
      .mockReturnValueOnce({ success: false, error: 'storage_remove_failed' })
      .mockReturnValueOnce({ success: true });
    renderPanel({ history: [makeRecord()] });

    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm clear' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm clear' }));

    expect(clearHistory).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps confirmation cancellation free of destructive hook calls', () => {
    renderPanel({ history: [makeRecord()] });

    fireEvent.click(screen.getByRole('button', { name: 'Delete diagnostic for example.com' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(deleteRecord).not.toHaveBeenCalled();
    expect(clearHistory).not.toHaveBeenCalled();
  });
});
