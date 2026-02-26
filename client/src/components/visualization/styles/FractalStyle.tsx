import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioAnalysisData } from '../../../hooks/useAudioAnalysis';

interface FractalStyleProps {
  analysisData: AudioAnalysisData;
  colorPalette?: string[];
  intensity?: number;
}

export function FractalStyle({
  analysisData,
  colorPalette = ['#F59E0B', '#EF4444', '#8B5CF6'],
  intensity = 1.0,
}: FractalStyleProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(20, 20, 1, 1);
    const colors = colorPalette.map((c) => new THREE.Color(c));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uIntensity: { value: intensity },
        uColor1: { value: colors[0] },
        uColor2: { value: colors[1] },
        uColor3: { value: colors[2] },
        uResolution: { value: new THREE.Vector2(1024, 1024) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;
        uniform float uTreble;
        uniform float uIntensity;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec2 uResolution;
        varying vec2 vUv;

        vec2 complexMul(vec2 a, vec2 b) {
          return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
        }

        float mandelbrot(vec2 c, float maxIter) {
          vec2 z = vec2(0.0);
          float n = 0.0;
          for (float i = 0.0; i < 100.0; i++) {
            if (i >= maxIter) break;
            z = complexMul(z, z) + c;
            if (dot(z, z) > 4.0) break;
            n = i;
          }
          return n / maxIter;
        }

        void main() {
          vec2 uv = vUv - 0.5;
          
          // Zoom based on bass
          float zoom = 2.5 - uBass * uIntensity * 1.5;
          zoom = max(zoom, 0.5);
          
          // Pan based on time and mid frequencies
          float panX = sin(uTime * 0.1) * 0.3 + uMid * 0.2;
          float panY = cos(uTime * 0.15) * 0.3;
          
          vec2 c = uv * zoom + vec2(-0.7 + panX, panY);
          
          // Iterations based on treble
          float maxIter = 50.0 + uTreble * uIntensity * 50.0;
          float n = mandelbrot(c, maxIter);
          
          // Color mapping
          vec3 color;
          if (n < 0.33) {
            color = mix(uColor1, uColor2, n * 3.0);
          } else if (n < 0.66) {
            color = mix(uColor2, uColor3, (n - 0.33) * 3.0);
          } else {
            color = mix(uColor3, uColor1, (n - 0.66) * 3.0);
          }
          
          // Boost brightness with volume
          float brightness = 0.5 + uBass * uIntensity * 0.5;
          color *= brightness;
          
          // Glow effect on beats
          float glow = uBass > 0.6 ? (uBass - 0.6) * 2.0 : 0.0;
          color += vec3(glow * 0.3);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });

    return { geometry, material };
  }, [colorPalette, intensity]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    const mat = meshRef.current.material as THREE.ShaderMaterial;

    mat.uniforms.uTime.value = time;
    mat.uniforms.uBass.value = analysisData.bass;
    mat.uniforms.uMid.value = analysisData.mid;
    mat.uniforms.uTreble.value = analysisData.treble;
    mat.uniforms.uIntensity.value = intensity;
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}
