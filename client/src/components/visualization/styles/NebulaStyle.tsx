import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioAnalysisData } from '../../../hooks/useAudioAnalysis';

interface NebulaStyleProps {
  analysisData: AudioAnalysisData;
  particleCount?: number;
  colorPalette?: string[];
  intensity?: number;
}

export function NebulaStyle({
  analysisData,
  particleCount = 3000,
  colorPalette = ['#8B5CF6', '#A78BFA', '#C4B5FD'],
  intensity = 0.8,
}: NebulaStyleProps) {
  const meshRef = useRef<THREE.Points>(null);

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const paletteColors = colorPalette.map((h) => new THREE.Color(h));

    for (let i = 0; i < particleCount; i++) {
      // Layered cloud distribution
      const layer = Math.floor(Math.random() * 3);
      const r = 2 + layer * 2 + Math.random() * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.6;

      positions[i * 3] = r * Math.cos(theta) * Math.cos(phi);
      positions[i * 3 + 1] = r * Math.sin(phi);
      positions[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);

      const c = paletteColors[layer % paletteColors.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = 0.08 + Math.random() * 0.15;
    }
    return { positions, colors, sizes };
  }, [particleCount, colorPalette]);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uBass: { value: 0 },
          uIntensity: { value: intensity },
        },
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          varying float vOpacity;
          uniform float uTime;
          uniform float uBass;
          uniform float uIntensity;

          void main() {
            vColor = color;
            vec3 pos = position;
            float drift = sin(uTime * 0.3 + pos.x * 0.5) * 0.4
                        + cos(uTime * 0.2 + pos.z * 0.5) * 0.4;
            pos.y += drift;
            float breathe = 1.0 + uBass * uIntensity * 0.4;
            pos *= breathe;
            vOpacity = 0.4 + uBass * uIntensity * 0.5;
            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * (500.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vOpacity;

          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float glow = pow(1.0 - d * 2.0, 3.0);
            gl_FragColor = vec4(vColor, glow * vOpacity);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [intensity]
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    shaderMaterial.uniforms.uTime.value = time;
    shaderMaterial.uniforms.uBass.value = analysisData.bass;
    shaderMaterial.uniforms.uIntensity.value = intensity;
    meshRef.current.rotation.y += 0.001 + analysisData.mid * 0.003;
  });

  return (
    <points ref={meshRef} key={particleCount}>
      <bufferGeometry key={particleCount}>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={particleCount} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={particleCount} array={sizes} itemSize={1} />
      </bufferGeometry>
      <primitive object={shaderMaterial} attach="material" />
    </points>
  );
}
