import { useState } from "react";
import { Wand2, ChevronDown, ChevronUp, Save } from "lucide-react";
import { aiApi } from "../../lib/api";
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
      });
      onSettingsChange({ mode, sdPrompt, sdNegativePrompt, sdModel });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      // could show error state here
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4 mt-4 pt-4 border-t border-white/10">
      <h3 className="text-sm font-semibold text-white/90">Generation Mode</h3>

      {/* Mode toggle */}
      <div className="flex rounded-lg overflow-hidden border border-white/10">
        {(["procedural", "ai-hybrid"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              mode === m
                ? "bg-indigo-600 text-white"
                : "bg-white/5 text-white/50 hover:text-white/80"
            }`}
          >
            {m === "procedural" ? "Procedural" : "AI Hybrid"}
          </button>
        ))}
      </div>

      {mode === "procedural" && (
        <p className="text-xs text-white/50">
          Uses Three.js procedural visualization for export. Fast and always available.
        </p>
      )}

      {mode === "ai-hybrid" && (
        <div className="space-y-3">
          <p className="text-xs text-white/50">
            Stable Diffusion generates images at beat boundaries, composited with your audio.
          </p>

          {/* Prompt textarea */}
          <div>
            <label className="text-xs text-white/60 block mb-1">
              Visual Prompt
              <span className="ml-2 text-white/30">{sdPrompt.length}/300</span>
            </label>
            <textarea
              value={sdPrompt}
              onChange={(e) => setSdPrompt(e.target.value.slice(0, 300))}
              placeholder="dark neon cityscape with rain and bokeh, cinematic lighting..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          {/* Enhance button */}
          <button
            onClick={handleRefinePrompt}
            disabled={isRefining || !sdPrompt.trim()}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Wand2 size={12} className={isRefining ? "animate-pulse" : ""} />
            {isRefining ? "Enhancing..." : "Enhance with AI"}
          </button>

          {/* Refined prompt */}
          {refinedPrompt && (
            <div className="rounded-lg bg-indigo-950/40 border border-indigo-500/20 p-3 space-y-2">
              <p className="text-xs text-white/50">Refined prompt:</p>
              <p className="text-xs text-white/80 leading-relaxed">{refinedPrompt}</p>
              <button
                onClick={() => {
                  setSdPrompt(refinedPrompt);
                  setRefinedPrompt("");
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Use refined prompt
              </button>
            </div>
          )}

          {/* Negative prompt (collapsible) */}
          <button
            onClick={() => setShowNegative(!showNegative)}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60"
          >
            {showNegative ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Negative prompt
          </button>
          {showNegative && (
            <textarea
              value={sdNegativePrompt}
              onChange={(e) => setSdNegativePrompt(e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 placeholder-white/20 resize-none focus:outline-none focus:border-indigo-500/60"
            />
          )}

          {/* Model selector */}
          <div>
            <label className="text-xs text-white/60 block mb-1">Model</label>
            <select
              value={sdModel}
              onChange={(e) => setSdModel(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/60"
            >
              {SD_MODELS.map((m) => (
                <option key={m.value} value={m.value} className="bg-gray-900">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-xs font-medium transition-colors"
      >
        <Save size={12} />
        {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save AI Settings"}
      </button>
    </div>
  );
}
