import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleSystemProps {
  particleCount: number;
  color: string;
}

function ParticleSystem({ particleCount, color }: ParticleSystemProps) {
  const points = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const colorObj = new THREE.Color(color);

    for (let i = 0; i < particleCount; i++) {
      // Random positions in a sphere
      const radius = Math.random() * 15 + 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;
    }

    return [positions, colors];
  }, [particleCount, color]);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      points.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.1;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

interface ParticleBackgroundProps {
  particleCount?: number;
  color?: 'pink' | 'cyan' | 'purple';
  className?: string;
}

export function ParticleBackground({
  particleCount = 50,
  color = 'cyan',
  className = '',
}: ParticleBackgroundProps) {
  const colorMap = {
    pink: '#FF3FFF',
    cyan: '#00FFFF',
    purple: '#A855F7',
  };

  return (
    <div className={`fixed inset-0 pointer-events-none z-0 ${className}`}>
      <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
        <ParticleSystem particleCount={particleCount} color={colorMap[color]} />
      </Canvas>
    </div>
  );
}
