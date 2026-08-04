import { useState } from "react";
import { Sparkles, Loader2, Check, Copy, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface SpellcheckSuggestion {
  original: string;
  suggested: string;
  reason: string;
}

interface AiSpellcheckPanelProps {
  content: string;
  onApplySuggestion: (original: string, suggested: string) => void;
}

export function AiSpellcheckPanel({ content, onApplySuggestion }: AiSpellcheckPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [suggestions, setSuggestions] = useState<SpellcheckSuggestion[] | null>(null);

  const generateSuggestions = async () => {
    if (!content || content === '<p></p>') {
      toast.error("Please write some content first.");
      return;
    }
    
    setIsPending(true);
    try {
      const res = await fetch('/api/spellcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result.error || result.details || 'Failed to generate suggestions');
      }
      setSuggestions(result.suggestions || []);
      setExpanded(true);
      const n = (result.suggestions || []).length;
      toast.success(n ? `Spellcheck complete — ${n} suggestion${n === 1 ? '' : 's'}` : 'Spellcheck complete — no issues found');
    } catch (e: any) {
      toast.error(e.message || "Failed to generate suggestions");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: "#e8eaf0",
        background: "#fafbfc",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: "var(--primary)" }} />
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            AI Spellchecker
          </span>
        </div>
        <button
          onClick={generateSuggestions}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{
            background: "var(--primary)",
            color: "white",
            opacity: isPending ? 0.7 : 1,
          }}
          type="button"
        >
          {isPending ? (
            <>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Checking...
            </>
          ) : (
            <>
              <Sparkles size={12} /> {suggestions !== null ? "Re-check" : "Check Text"}
            </>
          )}
        </button>
      </div>

      {suggestions !== null && (
        <div
          className="px-4 pb-4 space-y-3 border-t"
          style={{ borderColor: "var(--surface)" }}
        >
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between pt-3"
          >
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--primary)" }}
            >
              {suggestions.length === 0 ? "No issues found!" : `${suggestions.length} suggestions`}
            </span>
            <ChevronDown
              size={14}
              style={{
                color: "var(--muted)",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </button>

          {expanded && suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((sug, i) => (
                <SuggestionCard
                  key={i}
                  suggestion={sug}
                  onApply={(original, suggested) => onApplySuggestion(original, suggested)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onApply,
}: {
  suggestion: SpellcheckSuggestion;
  onApply: (original: string, suggested: string) => void;
}) {
  const [applied, setApplied] = useState(false);

  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{
        background: "var(--background)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--muted)" }}
        >
          {suggestion.reason}
        </span>
      </div>
      <div
        className="text-xs rounded px-2 py-1.5"
        style={{
          background: "var(--surface)",
          color: "var(--muted)",
          textDecoration: "line-through",
        }}
      >
        <span className="font-bold" style={{ color: "var(--muted)" }}>
          Original:{" "}
        </span>
        {suggestion.original}
      </div>
      <div
        className="text-xs rounded px-2 py-1.5"
        style={{
          background: "var(--primary)",
          color: "white",
          border: "1px solid var(--primary)",
        }}
      >
        <span className="font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>
          Suggested:{" "}
        </span>
        {suggestion.suggested}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {!applied && (
          <button
            onClick={() => {
              onApply(suggestion.original, suggestion.suggested);
              setApplied(true);
              toast.success(`Applied suggestion`);
            }}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all"
            style={{ background: "var(--primary)", color: "white" }}
          >
            <Check size={11} /> Apply
          </button>
        )}
        {applied && (
          <span
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: "var(--primary)" }}
          >
            <Check size={11} /> Applied
          </span>
        )}
      </div>
    </div>
  );
}
