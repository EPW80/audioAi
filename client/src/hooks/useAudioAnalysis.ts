import { useRef, useCallback, useState, useEffect } from "react";

export interface AudioAnalysisData {
  bass: number; // 0-1 normalized bass level
  mid: number; // 0-1 normalized mid level
  treble: number; // 0-1 normalized treble level
  volume: number; // 0-1 normalized overall volume
  frequencies: Uint8Array | null;
  isBeat: boolean; // true on detected beat frames
}

export interface UseAudioAnalysisReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  analysisData: AudioAnalysisData;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  getFrequencyData: () => Uint8Array | null;
}

// EMA smoothing alpha — lower = smoother, higher = more reactive
const SMOOTH_ALPHA = 0.15;

// Beat detection: fire when bass exceeds moving average by this factor
const BEAT_THRESHOLD = 1.4;
const BEAT_COOLDOWN_MS = 150;

export function useAudioAnalysis(): UseAudioAnalysisReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number>(0);

  // Smoothed band values (EMA state)
  const smoothedRef = useRef({ bass: 0, mid: 0, treble: 0, volume: 0 });

  // Beat detection state
  const bassHistoryRef = useRef<number[]>([]);
  const lastBeatTimeRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [analysisData, setAnalysisData] = useState<AudioAnalysisData>({
    bass: 0,
    mid: 0,
    treble: 0,
    volume: 0,
    frequencies: null,
    isBeat: false,
  });

  const initAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    // Higher FFT for better frequency resolution
    analyser.fftSize = 1024;
    // Lower smoother — we do our own per-band EMA
    analyser.smoothingTimeConstant = 0.5;

    const source = audioContext.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;
    dataArrayRef.current = new Uint8Array(
      analyser.frequencyBinCount,
    ) as Uint8Array<ArrayBuffer>;
  }, []);

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(
      dataArrayRef.current as Uint8Array<ArrayBuffer>,
    );
    const data = dataArrayRef.current;
    const bufferLength = data.length;

    // Frequency band boundaries
    const bassEnd = Math.floor(bufferLength * 0.1);
    const midEnd = Math.floor(bufferLength * 0.5);

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;
    let total = 0;

    for (let i = 0; i < bufferLength; i++) {
      const value = data[i];
      total += value;
      if (i < bassEnd) bassSum += value;
      else if (i < midEnd) midSum += value;
      else trebleSum += value;
    }

    const rawBass = bassSum / (bassEnd * 255);
    const rawMid = midSum / ((midEnd - bassEnd) * 255);
    const rawTreble = trebleSum / ((bufferLength - midEnd) * 255);
    const rawVolume = total / (bufferLength * 255);

    // Apply EMA smoothing per band
    const s = smoothedRef.current;
    s.bass = s.bass + SMOOTH_ALPHA * (rawBass - s.bass);
    s.mid = s.mid + SMOOTH_ALPHA * (rawMid - s.mid);
    s.treble = s.treble + SMOOTH_ALPHA * (rawTreble - s.treble);
    s.volume = s.volume + SMOOTH_ALPHA * (rawVolume - s.volume);

    // Beat detection via bass energy vs moving average
    const history = bassHistoryRef.current;
    history.push(rawBass);
    if (history.length > 43) history.shift(); // ~43 frames ≈ 700ms at 60fps

    const avgBass = history.reduce((a, b) => a + b, 0) / history.length;
    const now = performance.now();
    const isBeat =
      rawBass > avgBass * BEAT_THRESHOLD &&
      now - lastBeatTimeRef.current > BEAT_COOLDOWN_MS;

    if (isBeat) lastBeatTimeRef.current = now;

    setAnalysisData({
      bass: s.bass,
      mid: s.mid,
      treble: s.treble,
      volume: s.volume,
      frequencies: new Uint8Array(data),
      isBeat,
    });
  }, []);

  const updateLoop = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
    analyzeAudio();
    animationRef.current = requestAnimationFrame(updateLoop);
  }, [analyzeAudio]);

  const play = useCallback(async () => {
    if (!audioRef.current) return;

    initAudioContext();

    if (audioContextRef.current?.state === "suspended") {
      await audioContextRef.current.resume();
    }

    await audioRef.current.play();
    setIsPlaying(true);
    animationRef.current = requestAnimationFrame(updateLoop);
  }, [initAudioContext, updateLoop]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
    cancelAnimationFrame(animationRef.current);
  }, []);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const getFrequencyData = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return null;
    analyserRef.current.getByteFrequencyData(
      dataArrayRef.current as Uint8Array<ArrayBuffer>,
    );
    return dataArrayRef.current;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return {
    audioRef,
    analysisData,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    seek,
    getFrequencyData,
  };
}
