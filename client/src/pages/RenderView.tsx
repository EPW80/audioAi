/**
 * RenderView - A headless rendering page for Puppeteer server-side video capture.
 * This page loads a project, applies keyframes, and renders frames at the specified time.
 * 
 * Query params:
 * - projectId: The project to render
 * - time: Current time in seconds
 * - width: Output width
 * - height: Output height
 */

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Scene, SceneHandle } from '../components/visualization/Scene';
import { getInterpolatedState } from '../lib/keyframeEngine';
import type { Keyframe, VisualStyle } from '../types';
import type { AudioAnalysisData } from '../hooks/useAudioAnalysis';

interface RenderData {
    project: {
        _id: string;
        keyframes: Keyframe[];
        settings: {
            particleCount: number;
            colorPalette: string[];
            intensity: number;
            style: VisualStyle;
        };
        audioMetadata?: {
            duration?: number;
            beats?: number[];
        };
    };
}

export function RenderView() {
    const [searchParams] = useSearchParams();
    const sceneRef = useRef<SceneHandle>(null);
    const [renderData, setRenderData] = useState<RenderData | null>(null);
    const [ready, setReady] = useState(false);

    const projectId = searchParams.get('projectId');
    const time = parseFloat(searchParams.get('time') || '0');
    const width = parseInt(searchParams.get('width') || '1920');
    const height = parseInt(searchParams.get('height') || '1080');

    // Simulated audio analysis based on time (for consistent renders)
    const [analysisData, setAnalysisData] = useState<AudioAnalysisData>({
        bass: 0,
        mid: 0,
        treble: 0,
        volume: 0,
        frequencies: null,
        isBeat: false,
    });

    // Load project data
    useEffect(() => {
        if (!projectId) return;

        const token = searchParams.get('token');
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        fetch(`/api/projects/${projectId}`, { headers })
            .then((res) => res.json())
            .then((data) => {
                if (data.project) {
                    setRenderData(data);
                    setReady(true);
                }
            })
            .catch(console.error);
    }, [projectId, searchParams]);

    // Generate deterministic audio-like values from time for consistent renders
    useEffect(() => {
        const beats = renderData?.project?.audioMetadata?.beats || [];

        // Check if we're near a beat
        const nearBeat = beats.some((b) => Math.abs(b - time) < 0.05);

        // Generate pseudo-audio data based on time
        const bass = nearBeat ? 0.8 + Math.random() * 0.2 : 0.3 + 0.2 * Math.sin(time * 2);
        const mid = 0.4 + 0.3 * Math.sin(time * 3 + 1);
        const treble = 0.3 + 0.2 * Math.sin(time * 5 + 2);

        setAnalysisData({
            bass,
            mid,
            treble,
            volume: (bass + mid + treble) / 3,
            frequencies: null,
            isBeat: nearBeat,
        });
    }, [time, renderData]);

    if (!renderData) {
        return <div id="render-status" data-status="loading">Loading...</div>;
    }

    const keyframes = renderData.project.keyframes || [];
    const state = getInterpolatedState(keyframes, time, 'easeInOut', 0.5);

    const activeStyle = state?.style || renderData.project.settings.style || 'particles';
    const particleCount = state?.particleCount || renderData.project.settings.particleCount;
    const colorPalette = state?.colorPalette || renderData.project.settings.colorPalette;
    const intensity = state?.intensity || renderData.project.settings.intensity;

    return (
        <div
            id="render-container"
            data-status={ready ? 'ready' : 'loading'}
            style={{ width: `${width}px`, height: `${height}px`, background: '#000' }}
        >
            <Scene
                ref={sceneRef}
                analysisData={analysisData}
                particleCount={particleCount}
                colorPalette={colorPalette}
                intensity={intensity}
                style={activeStyle}
            />
        </div>
    );
}
