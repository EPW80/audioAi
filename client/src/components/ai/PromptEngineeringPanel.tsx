import { useState } from "react";
import { Wand2, ChevronDown, ChevronUp, Save, Zap, Layers, Sparkles, Shuffle } from "lucide-react";
import { aiApi } from "../../lib/api";
import { Button } from "../ui/Button";
import { SegmentedControl } from "../ui/SegmentedControl";
import type { AISettings } from "../../types";

const SD_MODELS = [
  {
    value: "stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750d7579acdf40d2d39bfe9e4d05",
    label: "Stable Diffusion 2.1",
  },
  {
    value: "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    label: "SDXL 1.0",
  },
];

const TRANSITION_MODES: {
  value: NonNullable<AISettings["transitionMode"]>;
  label: string;
  description: string;
  icon: typeof Zap;
}[] = [
  {
    value: "cut",
    label: "Cut",
    description: "Hard cuts between sections. Fastest, no extra cost.",
    icon: Zap,
  },
  {
    value: "crossfade",
    label: "Crossfade",
    description: "Smooth fade between sections. No extra API cost.",
    icon: Layers,
  },
  {
    value: "interpolate",
    label: "AI Interpolation",
    description: "AI-generated transition frames. Smoothest, uses API credits.",
    icon: Sparkles,
  },
];

interface PromptEngineeringPanelProps {
  projectId: string;
  initialSettings: AISettings;
  onSettingsChange: (settings: Partial<AISettings>) => void;
}

export function PromptEngineeringPanel({
  projectId,
  initialSettings,
  onSettingsChange,
}: PromptEngineeringPanelProps) {
  const [mode, setMode] = useState<AISettings["mode"]>(
    initialSettings.mode ?? "procedural"
  );
  const [sdPrompt, setSdPrompt] = useState(initialSettings.sdPrompt ?? "");
  const [sdNegativePrompt, setSdNegativePrompt] = useState(
    initialSettings.sdNegativePrompt ?? "blurry, distorted, low quality, watermark"
  );
  const [sdModel, setSdModel] = useState(
    initialSettings.sdModel ?? SD_MODELS[0].value
  );
  const [transitionMode, setTransitionMode] = useState<NonNullable<AISettings["transitionMode"]>>(
    initialSettings.transitionMode ?? "crossfade"
  );
  const [autoVaryPrompts, setAutoVaryPrompts] = useState(
    initialSettings.autoVaryPrompts ?? true
  );
  const [refinedPrompt, setRefinedPrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNegative, setShowNegative] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function handleRefinePrompt() {
    if (!sdPrompt.trim()) return;
    setIsRefining(true);
    try {
      const res = await aiApi.refinePrompt(projectId, sdPrompt);
      setRefinedPrompt((res.data as { refinedPrompt: string }).refinedPrompt);
    } catch {
      // silently fail — user still has original prompt
    } finally {
      setIsRefining(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await aiApi.saveSettings(projectId, {
        mode,
        sdPrompt,
        sdNegativePrompt,
        sdModel,
        transitionMode,
        autoVaryPrompts,
      });
      onSettingsChange({ mode, sdPrompt, sdNegativePrompt, sdModel, transitionMode, autoVaryPrompts });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      // could show error state here
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3.5 mt-3.5 pt-3.5 border-t border-border">
      <h3 className="text-[13px] font-semibold">Generation mode</h3>

      <SegmentedControl
        options={[
          { value: "procedural", label: "Procedural" },
          { value: "ai-hybrid", label: "AI hybrid" },
        ]}
        value={mode ?? "procedural"}
        onChange={(m) => setMode(m)}
      />

      {mode === "procedural" && (
        <p className="text-xs text-fg-muted">
          Uses Three.js procedural visualization for export. Fast and always available.
        </p>
      )}

      {mode === "ai-hybrid" && (
        <div className="space-y-3">
          <p className="text-xs text-fg-muted">
            Stable Diffusion generates images at beat boundaries, composited with your audio.
          </p>

          {/* Prompt textarea */}
          <div>
            <label className="text-[13px] font-medium text-fg-secondary block mb-1.5">
              Visual prompt
              <span className="ml-2 font-mono text-[11px] text-fg-muted font-normal">
                {sdPrompt.length}/300
              </span>
            </label>
            <textarea
              value={sdPrompt}
              onChange={(e) => setSdPrompt(e.target.value.slice(0, 300))}
              placeholder="dark neon cityscape with rain and bokeh, cinematic lighting..."
              rows={3}
              className="w-full bg-inset border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-muted resize-none outline-none transition-colors duration-150 focus:border-accent"
            />
          </div>

          {/* Enhance button */}
          <button
            onClick={handleRefinePrompt}
            disabled={isRefining || !sdPrompt.trim()}
            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          >
            <Wand2 size={12} className={isRefining ? "animate-pulse" : ""} />
            {isRefining ? "Enhancing..." : "Enhance with AI"}
          </button>

          {/* Refined prompt */}
          {refinedPrompt && (
            <div
              className="rounded-lg p-3 space-y-2"
              style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)" }}
            >
              <p className="text-xs text-fg-muted">Refined prompt:</p>
              <p className="text-xs leading-[18px] text-fg-secondary">{refinedPrompt}</p>
              <button
                onClick={() => {
                  setSdPrompt(refinedPrompt);
                  setRefinedPrompt("");
                }}
                className="text-xs text-accent hover:text-accent-hover font-semibold transition-colors duration-150"
              >
                Use refined prompt
              </button>
            </div>
          )}

          {/* Negative prompt (collapsible) */}
          <button
            onClick={() => setShowNegative(!showNegative)}
            className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg-secondary transition-colors duration-150"
          >
            {showNegative ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Negative prompt
          </button>
          {showNegative && (
            <textarea
              value={sdNegativePrompt}
              onChange={(e) => setSdNegativePrompt(e.target.value)}
              rows={2}
              className="w-full bg-inset border border-border rounded-md px-3 py-2 text-xs text-fg-secondary placeholder:text-fg-muted resize-none outline-none transition-colors duration-150 focus:border-accent"
            />
          )}

          {/* Model selector */}
          <div>
            <label className="text-[13px] font-medium text-fg-secondary block mb-1.5">Model</label>
            <select
              value={sdModel}
              onChange={(e) => setSdModel(e.target.value)}
              className="w-full bg-inset border border-border rounded-md px-3 py-2 text-xs text-fg outline-none transition-colors duration-150 focus:border-accent"
            >
              {SD_MODELS.map((m) => (
                <option key={m.value} value={m.value} className="bg-panel">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Transition mode selector */}
          <div>
            <label className="text-[13px] font-medium text-fg-secondary block mb-2">
              Transition style
            </label>
            <div className="space-y-2">
              {TRANSITION_MODES.map((tm) => {
                const Icon = tm.icon;
                const isSelected = transitionMode === tm.value;
                return (
                  <button
                    key={tm.value}
                    onClick={() => setTransitionMode(tm.value)}
                    className="w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-colors duration-150"
                    style={{
                      background: isSelected ? "rgba(232, 147, 58, 0.07)" : "var(--bg-card-nested)",
                      borderColor: isSelected ? "rgba(232, 147, 58, 0.45)" : "var(--border)",
                    }}
                  >
                    <Icon
                      size={14}
                      className={`mt-0.5 flex-shrink-0 ${isSelected ? "text-accent" : "text-fg-muted"}`}
                    />
                    <div>
                      <span className={`text-xs font-semibold block ${isSelected ? "text-fg" : "text-fg-secondary"}`}>
                        {tm.label}
                      </span>
                      <span className="text-[10px] text-fg-muted leading-tight block mt-0.5">
                        {tm.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto-vary prompts per section toggle */}
          <div>
            <button
              onClick={() => setAutoVaryPrompts(!autoVaryPrompts)}
              className="w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-colors duration-150"
              style={{
                background: autoVaryPrompts ? "rgba(232, 147, 58, 0.07)" : "var(--bg-card-nested)",
                borderColor: autoVaryPrompts ? "rgba(232, 147, 58, 0.45)" : "var(--border)",
              }}
            >
              <Shuffle
                size={14}
                className={`mt-0.5 flex-shrink-0 ${autoVaryPrompts ? "text-accent" : "text-fg-muted"}`}
              />
              <div>
                <span className={`text-xs font-semibold block ${autoVaryPrompts ? "text-fg" : "text-fg-secondary"}`}>
                  Auto-vary prompts
                </span>
                <span className="text-[10px] text-fg-muted leading-tight block mt-0.5">
                  AI generates unique prompts per beat section for visual progression. Uses keyframes and audio context.
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Save button */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={handleSave}
        disabled={isSaving}
      >
        <Save size={12} />
        {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save AI settings"}
      </Button>
    </div>
  );
}
