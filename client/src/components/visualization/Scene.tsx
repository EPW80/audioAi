import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { ParticleSystem } from './ParticleSystem';
import { WaveformStyle } from './styles/WaveformStyle';
import { NebulaStyle } from './styles/NebulaStyle';
import { CyberpunkStyle } from './styles/CyberpunkStyle';
import { AuroraStyle } from './styles/AuroraStyle';
import { FractalStyle } from './styles/FractalStyle';
import { OceanStyle } from './styles/OceanStyle';
import type { AudioAnalysisData } from '../../hooks/useAudioAnalysis';
import type { VisualStyle } from '../../types';

interface SceneProps {
  analysisData: AudioAnalysisData;
  particleCount?: number;
  colorPalette?: string[];
  intensity?: number;
  style?: VisualStyle;
}

export interface SceneHandle {
  captureFrame: () => string | null;
}

function StyleRenderer({
  style,
  analysisData,
  particleCount,
  colorPalette,
  intensity,
}: Required<SceneProps>) {
  switch (style) {
    case 'waveform':
      return <WaveformStyle analysisData={analysisData} colorPalette={colorPalette} intensity={intensity} />;
    case 'nebula':
      return <NebulaStyle analysisData={analysisData} particleCount={particleCount} colorPalette={colorPalette} intensity={intensity} />;
    case 'cyberpunk':
      return <CyberpunkStyle analysisData={analysisData} colorPalette={colorPalette} intensity={intensity} />;
    case 'aurora':
      return <AuroraStyle analysisData={analysisData} particleCount={particleCount} colorPalette={colorPalette} intensity={intensity} />;
    case 'fractal':
      return <FractalStyle analysisData={analysisData} colorPalette={colorPalette} intensity={intensity} />;
    case 'ocean':
      return <OceanStyle analysisData={analysisData} colorPalette={colorPalette} intensity={intensity} />;
    case 'particles':
    default:
      return <ParticleSystem analysisData={analysisData} particleCount={particleCount} colorPalette={colorPalette} intensity={intensity} />;
  }
}

export const Scene = forwardRef<SceneHandle, SceneProps>(
  ({ analysisData, particleCount = 2000, colorPalette = ['#4F46E5', '#7C3AED', '#EC4899'], intensity = 1.0, style = 'particles' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => ({
      captureFrame: () => {
        if (!canvasRef.current) return null;
        return canvasRef.current.toDataURL('image/jpeg', 0.9);
      },
    }));

    return (
      <div className="w-full h-full bg-black rounded-xl overflow-hidden">
        <Canvas
          ref={canvasRef}
          camera={{ position: [0, 0, 15], fov: 60 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
          style={{ background: '#000' }}
          onCreated={({ gl }) => {
            // Patch addEventListener to force passive:true on wheel events,
            // working around drei's OrbitControls registering non-passive listeners.
            const el = gl.domElement;
            const original = el.addEventListener.bind(el);
            el.addEventListener = (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
              if (type === 'wheel') {
                const patched: AddEventListenerOptions =
                  typeof options === 'object' ? { ...options, passive: true } : { passive: true };
                return original(type, listener, patched);
              }
              return original(type, listener, options);
            };
          }}
        >
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />

          <StyleRenderer
            style={style}
            analysisData={analysisData}
            particleCount={particleCount}
            colorPalette={colorPalette}
            intensity={intensity}
          />

          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={5}
            maxDistance={30}
            autoRotate={false}
          />
        </Canvas>
      </div>
    );
  }
);

Scene.displayName = 'Scene';
