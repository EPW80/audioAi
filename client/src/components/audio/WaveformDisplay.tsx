import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformDisplayProps {
  audioUrl: string;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
}

export function WaveformDisplay({
  audioUrl,
  audioRef,
  duration,
  isPlaying,
  onSeek,
}: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#3A3A41',
      progressColor: '#E8933A',
      cursorColor: '#EDEDEF',
      cursorWidth: 1.5,
      height: 64,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      normalize: true,
      interact: true,
      hideScrollbar: true,
      media: audioRef.current || undefined,
    });

    wavesurfer.load(audioUrl).catch((error) => {
      if (error.name !== 'AbortError') {
        console.error('Error loading audio:', error);
      }
    });

    wavesurfer.on('click', (progress) => {
      const time = progress * duration;
      onSeek(time);
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl, audioRef, duration, onSeek]);

  // Sync playback state
  useEffect(() => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      wavesurferRef.current.play();
    } else {
      wavesurferRef.current.pause();
    }
  }, [isPlaying]);

  return <div ref={containerRef} className="w-full" />;
}
