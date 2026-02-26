import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioAnalysisData } from '../../../hooks/useAudioAnalysis';

interface OceanStyleProps {
    analysisData: AudioAnalysisData;
    colorPalette?: string[];
    intensity?: number;
}

const GRID_SIZE = 128;

export function OceanStyle({
    analysisData,
    colorPalette = ['#0369A1', '#0EA5E9', '#7DD3FC'],
    intensity = 1.0,
}: OceanStyleProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    const { geometry, material } = useMemo(() => {
        const geometry = new THREE.PlaneGeometry(20, 20, GRID_SIZE, GRID_SIZE);
        geometry.rotateX(-Math.PI / 2);

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
            },
            vertexShader: `
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;
        uniform float uIntensity;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vElevation;

        void main() {
          vec3 pos = position;
          
          // Multiple wave layers
          float wave1 = sin(pos.x * 0.5 + uTime * 1.5) * cos(pos.z * 0.3 + uTime);
          float wave2 = sin(pos.x * 0.8 - uTime * 2.0) * sin(pos.z * 0.6 + uTime * 0.8);
          float wave3 = cos(pos.x * 1.2 + pos.z * 0.9 + uTime * 1.2);
          
          // Bass drives large waves, mid adds detail
          float bassWave = wave1 * uBass * uIntensity * 2.0;
          float midWave = wave2 * uMid * uIntensity * 1.0;
          float detailWave = wave3 * 0.2;
          
          pos.y = bassWave + midWave + detailWave;
          vElevation = pos.y;

          vPosition = pos;
          // Approximate normal from wave gradient (dFdx/dFdy are fragment-only).
          // Differentiate the dominant wave analytically instead.
          float dydx = cos(pos.x * 0.5 + uTime * 1.5) * 0.5 * cos(pos.z * 0.3 + uTime) * uBass * uIntensity * 2.0
                     + cos(pos.x * 0.8 - uTime * 2.0) * 0.8 * sin(pos.z * 0.6 + uTime * 0.8) * uMid * uIntensity
                     - sin(pos.x * 1.2 + pos.z * 0.9 + uTime * 1.2) * 1.2 * 0.2;
          float dydz = -sin(pos.x * 0.5 + uTime * 1.5) * sin(pos.z * 0.3 + uTime) * 0.3 * uBass * uIntensity * 2.0
                     + sin(pos.x * 0.8 - uTime * 2.0) * cos(pos.z * 0.6 + uTime * 0.8) * 0.6 * uMid * uIntensity
                     - sin(pos.x * 1.2 + pos.z * 0.9 + uTime * 1.2) * 0.9 * 0.2;
          vNormal = normalize(vec3(-dydx, 1.0, -dydz));
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
            fragmentShader: `
        uniform float uTime;
        uniform float uBass;
        uniform float uTreble;
        uniform float uIntensity;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vElevation;

        void main() {
          // Color based on elevation
          vec3 color;
          float normalizedElev = (vElevation + 2.0) / 4.0;
          
          if (normalizedElev < 0.5) {
            color = mix(uColor1, uColor2, normalizedElev * 2.0);
          } else {
            color = mix(uColor2, uColor3, (normalizedElev - 0.5) * 2.0);
          }
          
          // Fresnel-like rim effect
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
          color += uColor3 * fresnel * 0.5;
          
          // Specular highlights on peaks
          float specular = pow(max(vElevation, 0.0), 2.0) * uTreble * uIntensity;
          color += vec3(specular * 0.5);
          
          // Foam on wave crests
          float foam = smoothstep(0.8, 1.2, vElevation) * uBass;
          color = mix(color, vec3(1.0), foam * 0.6);
          
          gl_FragColor = vec4(color, 0.95);
        }
      `,
            side: THREE.DoubleSide,
            transparent: true,
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

        // Gentle camera sway
        meshRef.current.rotation.z = Math.sin(time * 0.2) * 0.05;
    });

    return (
        <>
            {/* fog must attach to the scene, not a group */}
            <fog attach="fog" args={['#001020', 10, 40]} />
            <mesh ref={meshRef} geometry={geometry} material={material} position={[0, -2, 0]} />
        </>
    );
}
