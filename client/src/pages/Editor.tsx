import { startTransition, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Play,
  Pause,
  Download,
  Settings,
  ArrowLeft,
  Loader2,
  Music,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { projectsApi } from '../lib/api';
import { useAudioAnalysis } from '../hooks/useAudioAnalysis';
import { Scene, SceneHandle } from '../components/visualization/Scene';
import { WaveformDisplay } from '../components/audio/WaveformDisplay';
import { PRESETS } from '../lib/presets';
import { TimelineEditor } from '../components/timeline/TimelineEditor';
import { getInterpolatedState } from '../lib/keyframeEngine';
import { StyleSuggestionPanel } from '../components/ai/StyleSuggestionPanel';
import { PromptEngineeringPanel } from '../components/ai/PromptEngineeringPanel';
import { Button } from '../components/ui/Button';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { STATUS_META } from '../components/ui/StatusDot';
import type { VisualStyle, Keyframe, AISettings } from '../types';

interface Project {
  _id: string;
  name: string;
  audioPath: string;
  status: string;
  keyframes?: Keyframe[];
  audioMetadata?: {
    duration?: number;
    bpm?: number;
    beats?: number[];
    onsets?: number[];
    peaks?: number[];
  };
  settings: {
    particleCount: number;
    colorPalette: string[];
    intensity: number;
    style?: VisualStyle;
    resolution?: '720p' | '1080p';
  };
  aiSettings?: AISettings;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function Editor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const sceneRef = useRef<SceneHandle>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'style' | 'params' | 'ai'>('style');
  const [aiSettings, setAiSettings] = useState<AISettings>({
    mode: 'procedural',
    sdPrompt: '',
    sdNegativePrompt: 'blurry, distorted, low quality, watermark',
    sdModel: 'stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750d7579acdf40d2d39bfe9e4d05',
  });
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Local settings state
  const [activeStyle, setActiveStyle] = useState<VisualStyle>('particles');
  const [particleCount, setParticleCount] = useState(2000);
  const [intensity, setIntensity] = useState(1.0);
  const [colorPalette, setColorPalette] = useState(['#4F46E5', '#7C3AED', '#EC4899']);
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');

  const { data, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getOne(projectId!),
    enabled: !!projectId,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      projectsApi.updateSettings(projectId!, settings),
  });

  const updateKeyframesMutation = useMutation({
    mutationFn: (kfs: Keyframe[]) => projectsApi.updateKeyframes(projectId!, kfs),
  });

  const project: Project | undefined = data?.data?.project;

  const {
    audioRef,
    analysisData,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    seek,
  } = useAudioAnalysis();

  // Initialize settings from project
  useEffect(() => {
    if (project?.settings) {
      setParticleCount(project.settings.particleCount);
      setIntensity(project.settings.intensity);
      setColorPalette(project.settings.colorPalette);
      setActiveStyle(project.settings.style ?? 'particles');
      setResolution(project.settings.resolution ?? '720p');
    }
    if (project?.keyframes) {
      setKeyframes(project.keyframes as Keyframe[]);
    }
    if (project?.aiSettings) {
      setAiSettings(project.aiSettings);
    }
  }, [project]);

  const handleApplySuggestion = (
    styleId: VisualStyle,
    palette: string[],
    prompt: string
  ) => {
    startTransition(() => {
      setActiveStyle(styleId);
      setColorPalette(palette);
    });
    setAiSettings((prev) => ({ ...prev, sdPrompt: prompt }));
  };

  // Apply keyframe settings with smooth interpolation (only during playback, not while editing)
  useEffect(() => {
    if (keyframes.length === 0) return;
    if (!isPlaying || showSettings) return;

    const state = getInterpolatedState(keyframes, currentTime, 'easeInOut', 0.5);
    if (!state) return;

    // Apply interpolated values (smooth transitions)
    setActiveStyle(state.style);
    setParticleCount(state.particleCount);
    setColorPalette(state.colorPalette);
    setIntensity(state.intensity);
  }, [currentTime, keyframes, isPlaying, showSettings]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleKeyframesChange = (updated: Keyframe[]) => {
    setKeyframes(updated);
    updateKeyframesMutation.mutate(updated);
  };

  const handleSelectPreset = (preset: typeof PRESETS[number]) => {
    startTransition(() => {
      setActiveStyle(preset.id);
      setParticleCount(preset.defaultSettings.particleCount);
      setColorPalette(preset.defaultSettings.colorPalette);
      setIntensity(preset.defaultSettings.intensity);
    });
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      particleCount,
      colorPalette,
      intensity,
      style: activeStyle,
      resolution,
    });
    setShowSettings(false);
  };

  const handleExport = async () => {
    if (!audioRef.current || !sceneRef.current) return;

    setExporting(true);
    setExportProgress(0);

    const fps = 30;
    const totalFrames = Math.ceil(duration * fps);
    const frames: string[] = [];

    pause();
    seek(0);

    for (let i = 0; i < totalFrames; i++) {
      const time = i / fps;
      seek(time);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const frame = sceneRef.current.captureFrame();
      if (frame) frames.push(frame);
      setExportProgress(Math.round((i / totalFrames) * 100));
    }

    console.log(`Captured ${frames.length} frames`);
    alert(`Export complete! Captured ${frames.length} frames. Server-side video encoding coming soon.`);

    setExporting(false);
    setExportProgress(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-[1120px] mx-auto px-6 py-16 text-center">
        <p className="text-xl" style={{ color: 'var(--status-failed)' }}>
          Project not found
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="mt-4 text-accent hover:text-accent-hover transition-colors duration-150"
        >
          Back to projects
        </button>
      </div>
    );
  }

  const audioUrl = `/${project.audioPath}`;
  const statusMeta = STATUS_META[project.status as keyof typeof STATUS_META] ?? STATUS_META.uploaded;
  const bpm = project.audioMetadata?.bpm;
  const totalDuration = duration || project.audioMetadata?.duration || 0;

  const TABS = [
    { id: 'style' as const, label: 'Style', icon: Sparkles },
    { id: 'params' as const, label: 'Params', icon: Settings },
    { id: 'ai' as const, label: 'AI', icon: Wand2 },
  ];

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-app">
      <audio ref={audioRef as React.RefObject<HTMLAudioElement>} src={audioUrl} crossOrigin="anonymous" preload="auto" />

      {/* Top bar */}
      <div className="h-[52px] shrink-0 bg-panel border-b border-border flex items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" icon onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
            <Music className="w-3.5 h-3.5 text-accent-on" />
          </span>
          <h1 className="text-sm font-semibold">{project.name}</h1>
          <span
            className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded"
            style={{ background: statusMeta.pillBg, color: statusMeta.color }}
          >
            {project.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {(bpm || totalDuration > 0) && (
            <span className="font-mono text-[11px] text-fg-muted mr-1">
              {bpm ? `${Math.round(bpm)} BPM` : ''}
              {bpm && totalDuration > 0 ? ' · ' : ''}
              {totalDuration > 0 ? formatTime(totalDuration) : ''}
            </span>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-[7px] rounded-md border transition-colors duration-150 ${
              showSettings
                ? 'bg-raised border-border-strong text-fg'
                : 'border-transparent text-fg-secondary hover:bg-raised hover:text-fg'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
          <Button variant="primary" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {exportProgress}%
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Export
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Viewport */}
        <div className="flex-1 min-w-0 relative m-3 bg-inset-deep border border-border rounded-lg overflow-hidden">
          <Scene
            ref={sceneRef}
            analysisData={analysisData}
            particleCount={particleCount}
            colorPalette={colorPalette}
            intensity={intensity}
            style={activeStyle}
          />
          <span className="absolute top-2.5 left-3 font-mono text-[10px] uppercase text-fg-muted pointer-events-none">
            Preview · {activeStyle}
          </span>
          <span className="absolute bottom-2.5 right-3 font-mono text-[10px] text-fg-muted pointer-events-none">
            {resolution} · 30 fps
          </span>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <aside className="w-[300px] shrink-0 bg-panel border-l border-border flex flex-col min-h-0">
            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 py-2.5 text-[13px] font-medium transition-colors duration-150 border-b-2 -mb-px ${
                    activeTab === id
                      ? 'text-fg border-accent'
                      : 'text-fg-muted border-transparent hover:text-fg-secondary'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Icon className="w-[13px] h-[13px]" />
                    {label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
              {activeTab === 'style' ? (
                <>
                  <p className="text-xs text-fg-muted">
                    Choose a visual preset. Parameters will update to match.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {PRESETS.map((preset) => {
                      const selected = activeStyle === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => handleSelectPreset(preset)}
                          className="text-left px-3 py-2.5 rounded-lg border transition-colors duration-150"
                          style={{
                            background: selected ? 'rgba(232, 147, 58, 0.07)' : 'var(--bg-card-nested)',
                            borderColor: selected ? 'rgba(232, 147, 58, 0.45)' : 'var(--border)',
                          }}
                          onMouseEnter={(e) => {
                            if (!selected) e.currentTarget.style.borderColor = 'var(--border-hover-card)';
                          }}
                          onMouseLeave={(e) => {
                            if (!selected) e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {preset.defaultSettings.colorPalette.map((c, i) => (
                                <span
                                  key={i}
                                  className="w-2.5 h-2.5 rounded-[3px]"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <span className="text-[13px] font-semibold">{preset.name}</span>
                            {selected && (
                              <span className="ml-auto font-mono text-[9px] uppercase text-accent">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-xs leading-[17px] text-fg-muted mt-1">
                            {preset.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : activeTab === 'ai' ? (
                <>
                  <StyleSuggestionPanel
                    projectId={projectId!}
                    hasAudioMetadata={!!project?.audioMetadata}
                    onApplySuggestion={handleApplySuggestion}
                  />
                  <PromptEngineeringPanel
                    projectId={projectId!}
                    initialSettings={aiSettings}
                    onSettingsChange={(updates) =>
                      setAiSettings((prev) => ({ ...prev, ...updates }))
                    }
                  />
                </>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[13px] font-medium text-fg-secondary">
                        Particle count
                      </label>
                      <span className="font-mono text-xs text-fg">{particleCount}</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="5000"
                      step="100"
                      value={particleCount}
                      onChange={(e) => setParticleCount(Number(e.target.value))}
                      className="slider w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[13px] font-medium text-fg-secondary">
                        Intensity
                      </label>
                      <span className="font-mono text-xs text-fg">{intensity.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))}
                      className="slider w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-fg-secondary mb-2">
                      Colors
                    </label>
                    <div className="flex gap-2">
                      {colorPalette.map((color, i) => (
                        <input
                          key={i}
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const newPalette = [...colorPalette];
                            newPalette[i] = e.target.value;
                            setColorPalette(newPalette);
                          }}
                          className="w-[34px] h-[34px] rounded-md border border-border cursor-pointer bg-transparent"
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-fg-secondary mb-2">
                      Export resolution
                    </label>
                    <SegmentedControl
                      options={[
                        { value: '720p', label: '720p' },
                        { value: '1080p', label: '1080p' },
                      ]}
                      value={resolution}
                      onChange={setResolution}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="px-3 py-3.5 border-t border-border shrink-0">
              <Button variant="primary" size="sm" className="w-full" onClick={handleSaveSettings}>
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Save settings'
                )}
              </Button>
            </div>
          </aside>
        )}
      </div>

      {/* Bottom dock */}
      <div className="shrink-0 bg-panel border-t border-border px-4 py-3 space-y-2.5">
        <TimelineEditor
          duration={duration}
          currentTime={currentTime}
          keyframes={keyframes}
          activeStyle={activeStyle}
          particleCount={particleCount}
          colorPalette={colorPalette}
          intensity={intensity}
          beats={project?.audioMetadata?.beats || []}
          onKeyframesChange={handleKeyframesChange}
          onSeek={seek}
        />

        {/* Transport */}
        <div className="flex items-center gap-4">
          <button
            onClick={handlePlayPause}
            className="w-11 h-11 rounded-full bg-accent text-accent-on hover:bg-accent-hover transition-colors duration-150 flex items-center justify-center flex-shrink-0"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <span className="font-mono text-[13px] whitespace-nowrap">
            <span className="text-fg">{formatTime(currentTime)}</span>
            <span className="text-fg-muted"> / {formatTime(totalDuration)}</span>
          </span>

          <div className="flex-1 min-w-0">
            <WaveformDisplay
              audioUrl={audioUrl}
              audioRef={audioRef}
              duration={duration}
              isPlaying={isPlaying}
              onSeek={seek}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
