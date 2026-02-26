import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioAnalysisData } from '../../hooks/useAudioAnalysis';

interface ParticleSystemProps {
  analysisData: AudioAnalysisData;
  particleCount?: number;
  colorPalette?: string[];
  intensity?: number;
}

export function ParticleSystem({
  analysisData,
  particleCount = 2000,
  colorPalette = ['#4F46E5', '#7C3AED', '#EC4899'],
  intensity = 1.0,
}: ParticleSystemProps) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Initialize particle positions and velocities
  const { positions, velocities, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const paletteColors = colorPalette.map((hex) => new THREE.Color(hex));

    for (let i = 0; i < particleCount; i++) {
      // Spherical distribution
      const radius = 3 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Random velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      // Random color from palette
      const color = paletteColors[Math.floor(Math.random() * paletteColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Random sizes
      sizes[i] = 0.05 + Math.random() * 0.1;
    }

    return { positions, velocities, colors, sizes };
  }, [particleCount, colorPalette]);

  // Custom shader for particles
  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uBass: { value: 0 },
          uMid: { value: 0 },
          uTreble: { value: 0 },
          uIntensity: { value: intensity },
        },
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          uniform float uTime;
          uniform float uBass;
          uniform float uMid;
          uniform float uIntensity;
          
          void main() {
            vColor = color;
            
            vec3 pos = position;
            
            // Pulsate based on bass
            float pulse = 1.0 + uBass * uIntensity * 0.5;
            pos *= pulse;
            
            // Spiral motion based on mid frequencies
            float angle = uTime * 0.5 + length(position) * 0.5;
            float spiralAmount = uMid * uIntensity * 0.3;
            pos.x += sin(angle) * spiralAmount;
            pos.z += cos(angle) * spiralAmount;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            
            // Size based on bass — minimum multiplier raised so particles are
            // visible even without audio (base 2x rather than 1x).
            float dynamicSize = size * (2.0 + uBass * uIntensity);
            gl_PointSize = dynamicSize * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          uniform float uTreble;
          uniform float uIntensity;
          
          void main() {
            // Circular particle shape
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            
            // Glow effect
            float glow = 1.0 - dist * 2.0;
            glow = pow(glow, 2.0);
            
            // Boost brightness with treble
            vec3 finalColor = vColor * (1.0 + uTreble * uIntensity * 0.5);
            
            gl_FragColor = vec4(finalColor, glow * 0.8);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [intensity]
  );

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.getElapsedTime();

    // Update uniforms with audio data
    materialRef.current.uniforms.uTime.value = time;
    materialRef.current.uniforms.uBass.value = analysisData.bass;
    materialRef.current.uniforms.uMid.value = analysisData.mid;
    materialRef.current.uniforms.uTreble.value = analysisData.treble;
    materialRef.current.uniforms.uIntensity.value = intensity;

    // Rotate the entire system
    meshRef.current.rotation.y += 0.002 + analysisData.mid * 0.01;
    meshRef.current.rotation.x = Math.sin(time * 0.1) * 0.1;

    // Stronger outward push on detected beats
    const beatImpulse = analysisData.isBeat ? intensity * 0.12 : 0;

    // Update particle positions
    const positionAttribute = meshRef.current.geometry.attributes.position;
    const posArray = positionAttribute.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      const distance = Math.sqrt(
        posArray[i3] ** 2 + posArray[i3 + 1] ** 2 + posArray[i3 + 2] ** 2
      );

      if (distance > 0) {
        const beatPush = analysisData.bass * intensity * 0.02 + beatImpulse;
        posArray[i3] += (posArray[i3] / distance) * velocities[i3] + (posArray[i3] / distance) * beatPush;
        posArray[i3 + 1] += (posArray[i3 + 1] / distance) * velocities[i3 + 1] + (posArray[i3 + 1] / distance) * beatPush;
        posArray[i3 + 2] += (posArray[i3 + 2] / distance) * velocities[i3 + 2] + (posArray[i3 + 2] / distance) * beatPush;

        // Reset particles that go too far
        if (distance > 12) {
          const newRadius = 2 + Math.random() * 2;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);

          posArray[i3] = newRadius * Math.sin(phi) * Math.cos(theta);
          posArray[i3 + 1] = newRadius * Math.sin(phi) * Math.sin(theta);
          posArray[i3 + 2] = newRadius * Math.cos(phi);
        }
      }
    }

    positionAttribute.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry key={particleCount}>
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
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </points>
  );
}
