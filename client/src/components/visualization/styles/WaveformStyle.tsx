import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioAnalysisData } from '../../../hooks/useAudioAnalysis';

interface WaveformStyleProps {
  analysisData: AudioAnalysisData;
  colorPalette?: string[];
  intensity?: number;
}

const BAR_COUNT = 64;

export function WaveformStyle({
  analysisData,
  colorPalette = ['#06B6D4', '#0EA5E9', '#38BDF8'],
  intensity = 1.0,
}: WaveformStyleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);

  const { geometry, material, positions } = useMemo(() => {
    const geometry = new THREE.BoxGeometry(0.3, 1, 0.3);
    const colors = colorPalette.map((c) => new THREE.Color(c));
    const material = new THREE.MeshStandardMaterial({
      color: colors[0],
      emissive: colors[0],
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8,
    });

    const positions: [number, number, number][] = [];
    const spacing = 0.5;
    const totalWidth = (BAR_COUNT - 1) * spacing;
    for (let i = 0; i < BAR_COUNT; i++) {
      positions.push([i * spacing - totalWidth / 2, 0, 0]);
    }

    return { geometry, material, positions };
  }, [colorPalette]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    groupRef.current.rotation.y = Math.sin(time * 0.2) * 0.3;

    const freqs = analysisData.frequencies;
    const paletteColors = colorPalette.map((c) => new THREE.Color(c));

    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const freqVal = freqs
        ? freqs[Math.floor((i / BAR_COUNT) * (freqs.length / 2))] / 255
        : analysisData.bass;

      const targetScale = 0.5 + freqVal * intensity * 8;
      mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, targetScale, 0.15);
      mesh.position.y = mesh.scale.y / 2;

      const colorIdx = Math.floor((i / BAR_COUNT) * paletteColors.length);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + freqVal * intensity;
      mat.color.copy(paletteColors[colorIdx]);
      mat.emissive.copy(paletteColors[colorIdx]);
    });
  });

  return (
    <group ref={groupRef}>
      <pointLight position={[0, 5, 5]} intensity={2} color={colorPalette[0]} />
      {positions.map((pos, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el; }}
          position={pos}
          geometry={geometry}
          material={material.clone()}
        />
      ))}
    </group>
  );
}
