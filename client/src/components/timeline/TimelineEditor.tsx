import { useRef, useCallback, useState } from 'react';
import { Plus, Trash2, Music } from 'lucide-react';
import type { Keyframe, VisualStyle } from '../../types';
import { snapToBeat } from '../../lib/keyframeEngine';

interface TimelineEditorProps {
  duration: number;
  currentTime: number;
  keyframes: Keyframe[];
  activeStyle: VisualStyle;
  particleCount: number;
  colorPalette: string[];
  intensity: number;
  beats?: number[];
  onKeyframesChange: (keyframes: Keyframe[]) => void;
  onSeek: (time: number) => void;
}

export function TimelineEditor({
  duration,
  currentTime,
  keyframes,
  activeStyle,
  particleCount,
  colorPalette,
  intensity,
  beats = [],
  onKeyframesChange,
  onSeek,
}: TimelineEditorProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [showBeats, setShowBeats] = useState(true);
  const [snapToBeats, setSnapToBeats] = useState(true);

  const timeToPercent = (t: number) => (duration > 0 ? (t / duration) * 100 : 0);

  const handleRailClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!railRef.current) return;
      const rect = railRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const time = Math.round(pct * duration * 10) / 10;
      onSeek(time);
    },
    [duration, onSeek]
  );

  const handleAddKeyframe = () => {
    let time = Math.round(currentTime * 10) / 10;
    // Snap to nearest beat if enabled
    if (snapToBeats && beats.length > 0) {
      time = snapToBeat(time, beats, 0.15);
    }
    // Don't add duplicate at same time
    if (keyframes.some((k) => Math.abs(k.time - time) < 0.1)) return;

    const newKeyframe: Keyframe = {
      time,
      style: activeStyle,
      settings: { particleCount, colorPalette, intensity },
    };

    const updated = [...keyframes, newKeyframe].sort((a, b) => a.time - b.time);
    onKeyframesChange(updated);
  };

  const handleDeleteKeyframe = (index: number) => {
    const updated = keyframes.filter((_, i) => i !== index);
    onKeyframesChange(updated);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (duration === 0) return null;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Timeline</span>
        <div className="flex items-center gap-2">
          {beats.length > 0 && (
            <>
              <button
                onClick={() => setShowBeats(!showBeats)}
                title="Toggle beat markers"
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${showBeats ? 'bg-pink-500/20 text-pink-400' : 'bg-accent text-muted-foreground'
                  }`}
              >
                <Music className="w-3 h-3" />
                Beats
              </button>
              <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapToBeats}
                  onChange={(e) => setSnapToBeats(e.target.checked)}
                  className="w-3 h-3 accent-primary"
                />
                Snap
              </label>
            </>
          )}
          <button
            onClick={handleAddKeyframe}
            title="Add keyframe at current time"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Keyframe
          </button>
        </div>
      </div>

      {/* Rail */}
      <div
        ref={railRef}
        onClick={handleRailClick}
        className="relative h-8 bg-accent rounded cursor-pointer select-none"
      >
        {/* Progress fill */}
        <div
          className="absolute top-0 left-0 h-full bg-primary/20 rounded pointer-events-none"
          style={{ width: `${timeToPercent(currentTime)}%` }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary pointer-events-none"
          style={{ left: `${timeToPercent(currentTime)}%` }}
        />

        {/* Beat markers */}
        {showBeats && beats.map((beat, i) => (
          <div
            key={`beat-${i}`}
            className="absolute top-0 bottom-0 w-px bg-pink-500/40 pointer-events-none"
            style={{ left: `${timeToPercent(beat)}%` }}
          />
        ))}

        {/* Keyframe markers */}
        {keyframes.map((kf, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
            style={{ left: `${timeToPercent(kf.time)}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-2 h-2 mt-3 rounded-sm bg-yellow-400 rotate-45" />
          </div>
        ))}

        {/* Time labels */}
        <div className="absolute bottom-0 left-1 text-[10px] text-muted-foreground pointer-events-none">
          {formatTime(0)}
        </div>
        <div className="absolute bottom-0 right-1 text-[10px] text-muted-foreground pointer-events-none">
          {formatTime(duration)}
        </div>
      </div>

      {/* Keyframe list */}
      {keyframes.length > 0 && (
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {keyframes.map((kf, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs px-2 py-1 rounded bg-accent/50 hover:bg-accent"
            >
              <span className="text-muted-foreground w-10">{formatTime(kf.time)}</span>
              <div className="flex gap-1 items-center">
                {kf.settings.colorPalette.map((c, ci) => (
                  <div key={ci} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="capitalize text-muted-foreground">{kf.style}</span>
              <button
                onClick={() => handleDeleteKeyframe(i)}
                className="p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
