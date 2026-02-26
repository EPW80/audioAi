#!/usr/bin/env python3
"""
Audio analysis script using Librosa.
Extracts BPM, beat timestamps, and onset detection for audio synchronization.

Usage: python analyze_audio.py <audio_file_path>
Output: JSON to stdout with analysis results
"""

import sys
import json
import numpy as np

try:
    import librosa
except ImportError:
    print(json.dumps({"error": "librosa not installed. Run: pip install librosa"}))
    sys.exit(1)


def analyze_audio(file_path: str) -> dict:
    """
    Analyze audio file and extract musical features.

    Returns:
        dict with bpm, beats (timestamps), onsets (timestamps),
        duration, and spectral features
    """
    try:
        # Load audio file
        y, sr = librosa.load(file_path, sr=22050, mono=True)
        duration = librosa.get_duration(y=y, sr=sr)

        # Beat detection
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()

        # Handle tempo - may be array in newer librosa
        if hasattr(tempo, "__iter__"):
            bpm = float(tempo[0]) if len(tempo) > 0 else 120.0
        else:
            bpm = float(tempo)

        # Onset detection (transients - good for key moments)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        onset_frames = librosa.onset.onset_detect(
            onset_envelope=onset_env, sr=sr, backtrack=True
        )
        onset_times = librosa.frames_to_time(onset_frames, sr=sr).tolist()

        # Spectral centroid (brightness over time) - sampled
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        # Downsample to ~1 per second for storage efficiency
        samples_per_sec = int(sr / 512)  # hop_length default
        centroid_times = []
        centroid_values = []
        for i in range(0, len(spectral_centroid), samples_per_sec):
            t = librosa.frames_to_time(i, sr=sr)
            centroid_times.append(float(t))
            centroid_values.append(float(spectral_centroid[i]))

        # RMS energy (loudness over time) - sampled
        rms = librosa.feature.rms(y=y)[0]
        rms_times = []
        rms_values = []
        for i in range(0, len(rms), samples_per_sec):
            t = librosa.frames_to_time(i, sr=sr)
            rms_times.append(float(t))
            rms_values.append(float(rms[i]))

        # Find dramatic moments (peaks in onset strength)
        # Normalize and find peaks above threshold
        onset_env_norm = onset_env / (onset_env.max() + 1e-6)
        peak_indices = np.where(onset_env_norm > 0.7)[0]
        peak_times = librosa.frames_to_time(peak_indices, sr=sr).tolist()

        return {
            "success": True,
            "duration": round(duration, 3),
            "bpm": round(bpm, 1),
            "beats": [round(t, 3) for t in beat_times],
            "onsets": [round(t, 3) for t in onset_times[:100]],  # Limit for storage
            "peaks": [round(t, 3) for t in peak_times[:50]],  # Dramatic moments
            "spectral": {
                "times": centroid_times[:60],  # ~1 min max
                "values": centroid_values[:60],
            },
            "energy": {
                "times": rms_times[:60],
                "values": rms_values[:60],
            },
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: analyze_audio.py <audio_file_path>"}))
        sys.exit(1)

    file_path = sys.argv[1]
    result = analyze_audio(file_path)
    print(json.dumps(result))
