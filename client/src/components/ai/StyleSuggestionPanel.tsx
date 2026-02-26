import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { aiApi } from "../../lib/api";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/90">Style Suggestions</h3>
        {analyzed && (
          <button
            onClick={() => handleAnalyze(true)}
            disabled={isLoading}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        )}
      </div>

      {!analyzed && (
        <button
          onClick={() => handleAnalyze(false)}
          disabled={isLoading || !hasAudioMetadata}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {isLoading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Analyze with AI
            </>
          )}
        </button>
      )}

      {!hasAudioMetadata && (
        <p className="text-xs text-amber-400/80">
          Audio analysis must complete before AI suggestions are available.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-900/20 rounded p-2">{error}</p>
      )}

      {overallMood && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Mood:</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 font-medium">
            {overallMood}
          </span>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <div
              key={s.styleId}
              className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white capitalize">
                  {s.styleId}
                </span>
                <div className="flex items-center gap-2">
                  {/* Confidence bar */}
                  <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.round(s.score * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/40">
                    {Math.round(s.score * 100)}%
                  </span>
                </div>
              </div>

              {/* Color palette */}
              <div className="flex gap-1">
                {s.suggestedPalette.map((color) => (
                  <div
                    key={color}
                    className="w-5 h-5 rounded-sm border border-white/10"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              <p className="text-xs text-white/60 leading-relaxed">{s.explanation}</p>

              <button
                onClick={() =>
                  onApplySuggestion(
                    s.styleId as VisualStyle,
                    s.suggestedPalette,
                    s.suggestedPrompt
                  )
                }
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
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
