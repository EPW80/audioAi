import { Link } from 'react-router-dom';
import { Upload, Sparkles, Download } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { AnimatedGradient } from '../components/ui/AnimatedGradient';
import { GridBackground } from '../components/ui/GridBackground';
import { FloatingShapes } from '../components/ui/FloatingShapes';
import { ParticleBackground } from '../components/ui/ParticleBackground';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { HexagonPattern } from '../components/ui/HexagonPattern';
import { NeonText } from '../components/ui/NeonText';

export function Home() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="relative min-h-screen">
      {/* Background layers */}
      <AnimatedGradient variant="vaporwave" />
      <GridBackground variant="grid" color="cyan" animate />
      <FloatingShapes shapes="mixed" count={6} />
      <ParticleBackground particleCount={50} color="cyan" />

      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 font-tech">
            Transform Audio to
            <span className="chrome-text"> Visual Art</span>
          </h1>
          <p className="text-xl text-foreground/80 mb-12">
            Upload your music and watch it come alive with{' '}
            <NeonText color="pink" intensity="medium" animate>
              AI-powered visualizations
            </NeonText>
            .
            <br />
            Beat-matched particles, synchronized colors, and stunning video exports.
          </p>

          <div className="flex gap-4 justify-center mb-16">
            <Link to={user ? '/projects' : '/login'}>
              <GlassButton variant="neon" glowColor="pink" size="lg">
                Get Started
              </GlassButton>
            </Link>
            <a href="#features">
              <GlassButton variant="secondary" glowColor="cyan" size="lg">
                Learn More
              </GlassButton>
            </a>
          </div>

          <div id="features" className="grid md:grid-cols-3 gap-8 text-left">
            <GlassCard glowColor="cyan" hover className="p-6 relative">
              <HexagonPattern color="cyan" opacity={0.05} size="sm" />
              <div className="relative z-10">
                <Upload className="w-10 h-10 text-neon-cyan drop-shadow-glow mb-4" />
                <h3 className="text-xl font-semibold mb-2 font-tech">Upload Audio</h3>
                <p className="text-foreground/70">
                  Support for MP3, WAV, FLAC, and more. Simply drag and drop your audio files.
                </p>
              </div>
            </GlassCard>

            <GlassCard glowColor="pink" hover className="p-6 relative">
              <HexagonPattern color="pink" opacity={0.05} size="sm" />
              <div className="relative z-10">
                <Sparkles className="w-10 h-10 text-neon-pink drop-shadow-glow mb-4" />
                <h3 className="text-xl font-semibold mb-2 font-tech">AI Visualization</h3>
                <p className="text-foreground/70">
                  Beat-matched particle systems that react to your music in real-time.
                </p>
              </div>
            </GlassCard>

            <GlassCard glowColor="purple" hover className="p-6 relative">
              <HexagonPattern color="purple" opacity={0.05} size="sm" />
              <div className="relative z-10">
                <Download className="w-10 h-10 text-neon-purple drop-shadow-glow mb-4" />
                <h3 className="text-xl font-semibold mb-2 font-tech">Export Video</h3>
                <p className="text-foreground/70">
                  Download your creation as a high-quality 720p MP4 video file.
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
