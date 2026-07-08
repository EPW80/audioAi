import { Link } from 'react-router-dom';
import { Upload, Sparkles, Download } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const PLAYHEAD = 1;

// Deterministic bars matching the design prototype's seeded generator
function generateBars(total = 96) {
  let seed = 31;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const bars: { h: number; played: boolean }[] = [];
  let env = 0.5;
  for (let i = 0; i < total; i++) {
    env = Math.max(0.1, Math.min(1, env + (rnd() - 0.5) * 0.4));
    const beat = i % 8 < 1 ? 0.3 : 0;
    bars.push({
      h: Math.max(6, Math.round((env + beat) * 88)),
      played: i / total < PLAYHEAD,
    });
  }
  return bars;
}

const BARS = generateBars();

const FEATURES = [
  {
    icon: Upload,
    title: 'Upload audio',
    body: 'Support for MP3, WAV, FLAC, and more. Simply drag and drop your audio files.',
  },
  {
    icon: Sparkles,
    title: 'AI visualization',
    body: 'Beat-matched particle systems that react to your music in real-time.',
  },
  {
    icon: Download,
    title: 'Export video',
    body: 'Download your creation as a high-quality 720p MP4 video file.',
  },
];

export function Home() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="max-w-[1120px] mx-auto px-6 pt-24 w-full">
      <div className="max-w-[720px] mx-auto text-center">
        <div className="font-mono text-xs font-medium tracking-[0.14em] uppercase text-accent mb-5">
          Audio → Video Visualization
        </div>
        <h1 className="text-[52px] leading-[1.08] font-semibold tracking-[-0.025em] mb-5 [text-wrap:balance]">
          Transform audio to <span className="text-accent">visual art</span>
        </h1>
        <p className="text-[17px] leading-[26px] text-fg-secondary mb-9 [text-wrap:pretty]">
          Upload your music and watch it come alive with AI-powered visualizations.
          Beat-matched particles, synchronized colors, and stunning video exports.
        </p>
        <div className="flex gap-3 justify-center mb-[72px]">
          <Link to={user ? '/projects' : '/login'}>
            <Button variant="primary">Get started</Button>
          </Link>
          <a href="#features">
            <Button variant="secondary">Learn more</Button>
          </a>
        </div>
      </div>

      {/* Waveform motif */}
      <div className="max-w-[880px] mx-auto mb-[72px] px-6 py-5 bg-inset border border-border rounded-[10px]">
        <div className="flex items-center gap-0.5 h-[72px]">
          {BARS.map((bar, i) => (
            <div
              key={i}
              className={`flex-1 rounded-[1px] ${bar.played ? 'bg-accent' : 'bg-border-strong'}`}
              style={{ height: `${bar.h}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-3 font-mono text-[11px] text-fg-muted">
          <span>00:00.000</span>
          <span className="text-accent whitespace-nowrap">▶ midnight-drive.wav</span>
          <span>03:47.520</span>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="grid md:grid-cols-3 gap-4 pb-24 text-left">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <Card key={title} hover className="p-6">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-raised border border-border mb-4">
              <Icon className="w-[18px] h-[18px] text-accent" />
            </span>
            <h3 className="text-base leading-[22px] font-semibold mb-1.5">{title}</h3>
            <p className="text-fg-secondary text-sm leading-[21px]">{body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
