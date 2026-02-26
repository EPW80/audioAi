import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioAnalysisData } from '../../../hooks/useAudioAnalysis';

interface AuroraStyleProps {
  analysisData: AudioAnalysisData;
  particleCount?: number;
  colorPalette?: string[];
  intensity?: number;
}

const RIBBON_COUNT = 5;

export function AuroraStyle({
  analysisData,
  particleCount = 2500,
  colorPalette = ['#34D399', '#6EE7B7', '#A7F3D0'],
  intensity = 0.9,
}: AuroraStyleProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { positions, colors, sizes } = useMemo(() => {
    const perRibbon = Math.floor(particleCount / RIBBON_COUNT);
    const total = perRibbon * RIBBON_COUNT;
    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const sizes = new Float32Array(total);
    const paletteColors = colorPalette.map((h) => new THREE.Color(h));

    for (let r = 0; r < RIBBON_COUNT; r++) {
      const ribbonColor = paletteColors[r % paletteColors.length];
      const yOffset = (r - RIBBON_COUNT / 2) * 1.5;
      for (let p = 0; p < perRibbon; p++) {
        const idx = (r * perRibbon + p) * 3;
        const t = p / perRibbon;
        const x = (t - 0.5) * 18;
        const z = (Math.random() - 0.5) * 2;
        positions[idx] = x;
        positions[idx + 1] = yOffset + (Math.random() - 0.5) * 0.8;
        positions[idx + 2] = z;
        colors[idx] = ribbonColor.r;
        colors[idx + 1] = ribbonColor.g;
        colors[idx + 2] = ribbonColor.b;
        sizes[r * perRibbon + p] = 0.06 + Math.random() * 0.12;
      }
    }
    return { positions, colors, sizes };
  }, [particleCount, colorPalette]);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uTreble: { value: 0 },
          uBass: { value: 0 },
          uIntensity: { value: intensity },
        },
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          varying float vAlpha;
          uniform float uTime;
          uniform float uTreble;
          uniform float uBass;
          uniform float uIntensity;

          void main() {
            vColor = color;
            vec3 pos = position;

            // Ribbon wave
            float wave = sin(uTime * 0.8 + pos.x * 0.4) * (1.5 + uTreble * uIntensity * 3.0)
                       + cos(uTime * 0.5 + pos.x * 0.2) * 0.5;
            pos.y += wave;

            // Treble-driven hue shimmer encoded in alpha
            vAlpha = 0.5 + uTreble * uIntensity * 0.5;

            float breathe = 1.0 + uBass * uIntensity * 0.15;
            pos *= breathe;

            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * (560.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float glow = pow(1.0 - d * 2.0, 2.0);
            gl_FragColor = vec4(vColor, glow * vAlpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [intensity]
  );

  const total = Math.floor(particleCount / RIBBON_COUNT) * RIBBON_COUNT;

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    shaderMaterial.uniforms.uTime.value = time;
    shaderMaterial.uniforms.uTreble.value = analysisData.treble;
    shaderMaterial.uniforms.uBass.value = analysisData.bass;
    shaderMaterial.uniforms.uIntensity.value = intensity;
    groupRef.current.rotation.y = Math.sin(time * 0.05) * 0.2;
  });

  return (
    <group ref={groupRef}>
      <points key={particleCount}>
        <bufferGeometry key={particleCount}>
          <bufferAttribute attach="attributes-position" count={total} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={total} array={colors} itemSize={3} />
          <bufferAttribute attach="attributes-size" count={total} array={sizes} itemSize={1} />
        </bufferGeometry>
        <primitive object={shaderMaterial} attach="material" />
      </points>
    </group>
  );
}
