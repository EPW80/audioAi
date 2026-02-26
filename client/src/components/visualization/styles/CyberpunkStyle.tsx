import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioAnalysisData } from '../../../hooks/useAudioAnalysis';

interface CyberpunkStyleProps {
  analysisData: AudioAnalysisData;
  colorPalette?: string[];
  intensity?: number;
}

const GRID_SIZE = 20;
const GRID_STEP = 1;

export function CyberpunkStyle({
  analysisData,
  colorPalette = ['#F0ABFC', '#22D3EE', '#4ADE80'],
  intensity = 1.2,
}: CyberpunkStyleProps) {
  const gridGroupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const { gridGeometry, gridMaterial } = useMemo(() => {
    const points: number[] = [];
    const half = (GRID_SIZE * GRID_STEP) / 2;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * GRID_STEP - half;
      // X lines
      points.push(-half, 0, pos, half, 0, pos);
      // Z lines
      points.push(pos, 0, -half, pos, 0, half);
    }
    const gridGeometry = new THREE.BufferGeometry();
    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const gridMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(colorPalette[1]),
      transparent: true,
      opacity: 0.5,
    });
    return { gridGeometry, gridMaterial };
  }, [colorPalette]);

  // Vertical scan line
  const scanRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!gridGroupRef.current) return;
    const time = state.clock.getElapsedTime();

    // Tilt grid with mid
    gridGroupRef.current.rotation.x = -0.4 - analysisData.mid * intensity * 0.2;

    // Scan line movement
    if (scanRef.current) {
      const half = (GRID_SIZE * GRID_STEP) / 2;
      scanRef.current.position.z = ((time * 3) % (GRID_SIZE * GRID_STEP)) - half;
      const mat = scanRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + analysisData.treble * intensity * 0.5;
    }

    // Pulse grid color with bass
    if (linesRef.current) {
      const mat = linesRef.current.material as THREE.LineBasicMaterial;
      const base = new THREE.Color(colorPalette[1]);
      const bright = base.clone().multiplyScalar(1 + analysisData.bass * intensity * 2);
      mat.color.copy(bright);
      mat.opacity = 0.3 + analysisData.bass * intensity * 0.4;
    }
  });

  const half = (GRID_SIZE * GRID_STEP) / 2;

  return (
    <group ref={gridGroupRef} position={[0, -3, 0]}>
      <lineSegments ref={linesRef} geometry={gridGeometry} material={gridMaterial} />

      {/* Scan line plane */}
      <mesh ref={scanRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[GRID_SIZE * GRID_STEP, 0.15]} />
        <meshBasicMaterial
          color={new THREE.Color(colorPalette[0])}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Horizon glow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[GRID_SIZE * GRID_STEP, GRID_SIZE * GRID_STEP]} />
        <meshBasicMaterial
          color={new THREE.Color(colorPalette[2])}
          transparent
          opacity={0.04}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <pointLight position={[0, 2, 0]} intensity={1.5 + analysisData.bass * intensity * 3} color={colorPalette[0]} distance={half} />
    </group>
  );
}
