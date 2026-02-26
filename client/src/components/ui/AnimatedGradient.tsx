interface AnimatedGradientProps {
  variant?: 'vaporwave' | 'cyber' | 'neon';
  opacity?: number;
  speed?: 'slow' | 'normal' | 'fast';
  className?: string;
}

export function AnimatedGradient({
  variant = 'vaporwave',
  opacity = 1,
  speed = 'normal',
  className = '',
}: AnimatedGradientProps) {
  const gradientClasses = {
    vaporwave: 'bg-gradient-vaporwave',
    cyber: 'bg-gradient-cyber',
    neon: 'bg-gradient-neon',
  };

  const speedClasses = {
    slow: '[animation-duration:25s]',
    normal: '[animation-duration:15s]',
    fast: '[animation-duration:8s]',
  };

  return (
    <div
      className={`
        fixed inset-0 pointer-events-none z-0
        ${gradientClasses[variant]}
        animate-gradient-shift
        ${speedClasses[speed]}
        ${className}
      `}
      style={{
        backgroundSize: '400% 400%',
        opacity: opacity,
      }}
    />
  );
}
