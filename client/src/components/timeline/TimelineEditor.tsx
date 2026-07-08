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
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-fg-muted uppercase tracking-[0.1em]">
          Timeline
        </span>
        <div className="flex items-center gap-2">
          {beats.length > 0 && (
            <>
              <button
                onClick={() => setShowBeats(!showBeats)}
                title="Toggle beat markers"
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-[5px] bg-raised border transition-colors duration-150 ${
                  showBeats ? 'border-border-strong text-fg' : 'border-border text-fg-muted'
                }`}
              >
                <Music className="w-[11px] h-[11px]" />
                Beats
              </button>
              <label className="flex items-center gap-1.5 text-[13px] text-fg-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapToBeats}
                  onChange={(e) => setSnapToBeats(e.target.checked)}
                  className="w-3 h-3"
                  style={{ accentColor: 'var(--accent)' }}
                />
                Snap
              </label>
            </>
          )}
          <button
            onClick={handleAddKeyframe}
            title="Add keyframe at current time"
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-[5px] bg-accent-dim border border-accent-line text-accent transition-colors duration-150"
          >
            <Plus className="w-[11px] h-[11px]" />
            Add keyframe
          </button>
        </div>
      </div>

      {/* Rail */}
      <div
        ref={railRef}
        onClick={handleRailClick}
        className="relative h-9 bg-inset border border-border rounded-md cursor-pointer select-none overflow-hidden"
      >
        {/* Beat grid */}
        {showBeats &&
          beats.map((beat, i) => (
            <div
              key={`beat-${i}`}
              className="absolute top-0 bottom-0 w-px pointer-events-none"
              style={{ left: `${timeToPercent(beat)}%`, background: '#26262B' }}
            />
          ))}

        {/* Progress fill */}
        <div
          className="absolute top-0 left-0 h-full pointer-events-none"
          style={{
            width: `${timeToPercent(currentTime)}%`,
            background: 'rgba(232, 147, 58, 0.08)',
          }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-accent pointer-events-none"
          style={{ left: `${timeToPercent(currentTime)}%` }}
        />

        {/* Keyframe markers */}
        {keyframes.map((kf, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-[2px] bg-accent border border-panel pointer-events-none"
            style={{
              top: '14px',
              left: `${timeToPercent(kf.time)}%`,
              transform: 'translateX(-50%) rotate(45deg)',
            }}
          />
        ))}

        {/* Time labels */}
        <div className="absolute bottom-0.5 left-1.5 font-mono text-[9px] text-fg-muted pointer-events-none">
          {formatTime(0)}
        </div>
        <div className="absolute bottom-0.5 right-1.5 font-mono text-[9px] text-fg-muted pointer-events-none">
          {formatTime(duration)}
        </div>
      </div>

      {/* Keyframe chips */}
      {keyframes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keyframes.map((kf, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-raised border border-border rounded-[5px] px-2 py-1"
            >
              <span className="font-mono text-[11px] text-accent">{formatTime(kf.time)}</span>
              <span className="flex gap-0.5">
                {kf.settings.colorPalette.map((c, ci) => (
                  <span
                    key={ci}
                    className="w-[9px] h-[9px] rounded-[2px]"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </span>
              <span className="capitalize text-xs text-fg-secondary">{kf.style}</span>
              <button
                onClick={() => handleDeleteKeyframe(i)}
                className="text-fg-muted hover:text-[var(--status-failed)] transition-colors duration-150"
              >
                <Trash2 className="w-[11px] h-[11px]" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
