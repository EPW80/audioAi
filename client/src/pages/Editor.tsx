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
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-xl text-red-400">Project not found</p>
        <button onClick={() => navigate('/projects')} className="mt-4 text-primary hover:underline">
          Back to Projects
        </button>
      </div>
    );
  }

  const audioUrl = `/${project.audioPath}`;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <audio ref={audioRef as React.RefObject<HTMLAudioElement>} src={audioUrl} crossOrigin="anonymous" preload="auto" />

      {/* Top bar */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/projects')} className="p-2 rounded hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">{project.name}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded transition-colors ${showSettings ? 'bg-accent' : 'hover:bg-accent'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {exportProgress}%
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Visualization area */}
        <div className="w-full h-full p-4">
          <Scene
            ref={sceneRef}
            analysisData={analysisData}
            particleCount={particleCount}
            colorPalette={colorPalette}
            intensity={intensity}
            style={activeStyle}
          />
        </div>

        {/* Settings panel — absolute overlay so it doesn't fight the flex layout */}
        {showSettings && (
          <div className="absolute top-0 right-0 h-full w-80 border-l border-border flex flex-col bg-background z-10">
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('style')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'style' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Style
                </span>
              </button>
              <button
                onClick={() => setActiveTab('params')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'params' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" />
                  Parameters
                </span>
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'ai' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  AI
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === 'style' ? (
                <>
                  <p className="text-xs text-muted-foreground">Choose a visual preset. Parameters will update to match.</p>
                  <div className="grid grid-cols-1 gap-3">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={`text-left p-3 rounded-lg border-2 transition-all ${activeStyle === preset.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 hover:bg-accent'
                          }`}
                      >
                        {/* Color swatches */}
                        <div className="flex gap-1 mb-2">
                          {preset.defaultSettings.colorPalette.map((c, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <div className="font-medium text-sm">{preset.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{preset.description}</div>
                      </button>
                    ))}
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
                    <label className="block text-sm text-muted-foreground mb-2">
                      Particle Count: {particleCount}
                    </label>
                    <input
                      type="range"
                      min="500"
                      max="5000"
                      step="100"
                      value={particleCount}
                      onChange={(e) => setParticleCount(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      Intensity: {intensity.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Colors</label>
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
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Export Resolution</label>
                    <div className="flex gap-2">
                      {(['720p', '1080p'] as const).map((res) => (
                        <button
                          key={res}
                          onClick={() => setResolution(res)}
                          className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${resolution === res ? 'bg-primary text-primary-foreground' : 'bg-accent hover:bg-accent/80'}`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-border">
              <button
                onClick={handleSaveSettings}
                className="w-full py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="border-t border-border p-4 space-y-3">
        {/* Timeline editor */}
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

        {/* Playback controls + waveform */}
        <div className="flex items-center gap-4">
          <button
            onClick={handlePlayPause}
            className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>

          <div className="flex-1">
            <WaveformDisplay
              audioUrl={audioUrl}
              audioRef={audioRef}
              currentTime={currentTime}
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
