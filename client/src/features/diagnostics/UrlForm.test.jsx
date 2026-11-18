import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UrlForm } from './UrlForm.jsx';

function renderUrlForm(overrides = {}) {
  const props = {
    value: 'https://example.com',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    loading: false,
    ...overrides
  };
  const rendered = render(<UrlForm {...props} />);

  return { ...rendered, props };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('UrlForm rendering and accessibility', () => {
  it('renders a semantic form and a labeled URL input with its placeholder', () => {
    const { container } = renderUrlForm();
    const form = container.querySelector('form');
    const input = screen.getByLabelText('Target URL');

    expect(form).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'https://example.com');
    expect(input).toHaveValue('https://example.com');
  });

  it('shows the decorative target prefix and HTTP/HTTPS hint accessibly', () => {
    renderUrlForm();

    expect(screen.getByText('TARGET>')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('HTTP / HTTPS')).toBeInTheDocument();
  });

  it('provides the normal submit button name and idle busy state', () => {
    const { container } = renderUrlForm();

    expect(screen.getByRole('button', { name: 'EXECUTE PROBE' })).toBeInTheDocument();
    expect(container.querySelector('form')).toHaveAttribute('aria-busy', 'false');
  });
});

describe('controlled input behavior', () => {
  it.each([
    'example.com',
    'http://example.com',
    'https://example.com/path',
    'not a valid URL',
    'ftp://example.com'
  ])('renders the supplied value without normalization: %s', (value) => {
    renderUrlForm({ value });

    expect(screen.getByLabelText('Target URL')).toHaveValue(value);
  });

  it.each([
    'example.com',
    'http://example.com',
    'https://example.com/path',
    'not a valid URL',
    'ftp://example.com',
    '  example.com  '
  ])('reports input changes as the exact string: %j', (updatedValue) => {
    const onChange = vi.fn();
    renderUrlForm({ onChange });

    fireEvent.change(screen.getByLabelText('Target URL'), {
      target: { value: updatedValue }
    });

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(updatedValue);
  });
});

describe('form submission', () => {
  it('submits a nonblank value once with the prevented React form event', () => {
    const onSubmit = vi.fn();
    const { container } = renderUrlForm({ onSubmit });

    fireEvent.submit(container.querySelector('form'));

    expect(onSubmit).toHaveBeenCalledOnce();
    const submitEvent = onSubmit.mock.calls[0][0];
    expect(submitEvent.type).toBe('submit');
    expect(submitEvent.target).toBe(container.querySelector('form'));
    expect(submitEvent.defaultPrevented).toBe(true);
  });

  it.each(['', '   \t'])('does not submit a blank value: %j', (value) => {
    const onSubmit = vi.fn();
    const { container } = renderUrlForm({ value, onSubmit });

    fireEvent.submit(container.querySelector('form'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not submit while loading, including through the form submit path', () => {
    const onSubmit = vi.fn();
    const { container } = renderUrlForm({ loading: true, onSubmit });

    fireEvent.submit(container.querySelector('form'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each(['not a valid URL', 'ftp://example.com'])(
    'does not reject malformed or unsupported-looking text: %s',
    (value) => {
      const onSubmit = vi.fn();
      const { container } = renderUrlForm({ value, onSubmit });

      fireEvent.submit(container.querySelector('form'));

      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit.mock.calls[0][0].target.querySelector('input')).toHaveValue(value);
    }
  );
});

describe('loading and disabled states', () => {
  it('disables the input and submit button and shows the probing state while loading', () => {
    const { container } = renderUrlForm({ loading: true });

    expect(screen.getByLabelText('Target URL')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'PROBING...' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'EXECUTE PROBE' })).not.toBeInTheDocument();
    expect(container.querySelector('form')).toHaveAttribute('aria-busy', 'true');
  });

  it('restores enabled controls and the execute label when loading finishes', () => {
    const { container, props, rerender } = renderUrlForm({ loading: true });

    rerender(<UrlForm {...props} loading={false} />);

    expect(screen.getByLabelText('Target URL')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'EXECUTE PROBE' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'PROBING...' })).not.toBeInTheDocument();
    expect(container.querySelector('form')).toHaveAttribute('aria-busy', 'false');
  });

  it.each([
    ['', false, true],
    ['   ', false, true],
    ['example.com', false, false],
    ['', true, true]
  ])(
    'sets submit disabled state for value %j and loading=%s',
    (value, loading, disabled) => {
      renderUrlForm({ value, loading });

      const button = screen.getByRole('button', {
        name: loading ? 'PROBING...' : 'EXECUTE PROBE'
      });
      expect(button.disabled).toBe(disabled);
    }
  );
});
