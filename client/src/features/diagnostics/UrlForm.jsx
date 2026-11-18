import { RefreshCw, Zap } from 'lucide-react';

export function UrlForm({ value, onChange, onSubmit, loading }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading || !value.trim()) {
      return;
    }

    onSubmit(event);
  };

  return (
    <form
      aria-busy={loading}
      onSubmit={handleSubmit}
      className="flex flex-col gap-2.5 sm:flex-row"
    >
      <div className="relative flex flex-1 items-center rounded border border-white/10 bg-[#07080c] px-3 py-2 transition-colors focus-within:border-indigo-500">
        <label className="sr-only" htmlFor="diagnostic-target-url">
          Target URL
        </label>
        <span
          aria-hidden="true"
          className="mr-2 select-none font-mono text-xs text-indigo-400"
        >
          TARGET&gt;
        </span>
        <input
          autoComplete="url"
          className="w-full border-none bg-transparent font-mono text-xs text-white placeholder-slate-600 focus:outline-none sm:text-sm"
          disabled={loading}
          id="diagnostic-target-url"
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://example.com"
          type="text"
          value={value}
        />
        <span className="hidden rounded border border-white/5 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 md:inline-block">
          HTTP / HTTPS
        </span>
      </div>

      <button
        className="flex items-center justify-center gap-2 rounded bg-white px-5 py-2.5 font-mono text-xs font-semibold text-black shadow-sm transition-all hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        disabled={loading || !value.trim()}
        type="submit"
      >
        {loading ? (
          <>
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            <span>PROBING...</span>
          </>
        ) : (
          <>
            <Zap aria-hidden="true" className="h-3.5 w-3.5 fill-black" />
            <span>EXECUTE PROBE</span>
          </>
        )}
      </button>
    </form>
  );
}

export default UrlForm;
