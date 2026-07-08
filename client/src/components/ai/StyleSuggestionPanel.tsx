import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { aiApi } from "../../lib/api";
import { Button } from "../ui/Button";
import type { AIStyleSuggestion, VisualStyle } from "../../types";

interface StyleSuggestionPanelProps {
  projectId: string;
  hasAudioMetadata: boolean;
  onApplySuggestion: (
    styleId: VisualStyle,
    palette: string[],
    prompt: string
  ) => void;
}

export function StyleSuggestionPanel({
  projectId,
  hasAudioMetadata,
  onApplySuggestion,
}: StyleSuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<AIStyleSuggestion[]>([]);
  const [overallMood, setOverallMood] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);

  async function handleAnalyze(refresh = false) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await aiApi.suggestStyles(projectId, refresh);
      const data = res.data as {
        suggestions: AIStyleSuggestion[];
        overallMood: string;
      };
      setSuggestions(data.suggestions ?? []);
      setOverallMood(data.overallMood ?? "");
      setAnalyzed(true);
    } catch {
      setError("Failed to get AI suggestions. Check that your API keys are configured.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold">Style suggestions</h3>
        {analyzed && (
          <button
            onClick={() => handleAnalyze(true)}
            disabled={isLoading}
            className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 disabled:opacity-50 transition-colors duration-150"
          >
            <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        )}
      </div>

      {!analyzed && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => handleAnalyze(false)}
          disabled={isLoading || !hasAudioMetadata}
        >
          {isLoading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles size={14} className="text-accent" />
              Analyze with AI
            </>
          )}
        </Button>
      )}

      {!hasAudioMetadata && (
        <p className="text-xs text-fg-muted">
          Audio analysis must complete before AI suggestions are available.
        </p>
      )}

      {error && (
        <p
          className="text-xs rounded-md p-2"
          style={{
            color: "var(--status-failed)",
            background: "rgba(217, 95, 88, 0.1)",
            border: "1px solid rgba(217, 95, 88, 0.3)",
          }}
        >
          {error}
        </p>
      )}

      {overallMood && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-muted">Mood:</span>
          <span className="font-mono text-[10px] uppercase px-[7px] py-0.5 rounded bg-raised border border-border text-fg-secondary">
            {overallMood}
          </span>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <div
              key={s.styleId}
              className="rounded-lg bg-card-nested border border-border p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold capitalize">{s.styleId}</span>
                <div className="flex items-center gap-2">
                  {/* Confidence bar */}
                  <div className="w-14 h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.round(s.score * 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-fg-muted">
                    {Math.round(s.score * 100)}%
                  </span>
                </div>
              </div>

              {/* Color palette */}
              <div className="flex gap-1">
                {s.suggestedPalette.map((color) => (
                  <div
                    key={color}
                    className="w-4 h-4 rounded border border-border"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              <p className="text-xs leading-[18px] text-fg-secondary">{s.explanation}</p>

              <button
                onClick={() =>
                  onApplySuggestion(
                    s.styleId as VisualStyle,
                    s.suggestedPalette,
                    s.suggestedPrompt
                  )
                }
                className="text-xs text-accent hover:text-accent-hover font-semibold transition-colors duration-150"
              >
                Apply style
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
