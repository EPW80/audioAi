import { ReactNode } from 'react';

interface NeonTextProps {
  children: ReactNode;
  color?: 'pink' | 'cyan' | 'purple' | 'magenta';
  intensity?: 'low' | 'medium' | 'high';
  animate?: boolean;
  className?: string;
}

export function NeonText({
  children,
  color = 'cyan',
  intensity = 'medium',
  animate = false,
  className = '',
}: NeonTextProps) {
  const colorClasses = {
    pink: 'text-neon-pink',
    cyan: 'text-neon-cyan',
    purple: 'text-neon-purple',
    magenta: 'text-neon-magenta',
  };

  const intensityClasses = {
    low: 'drop-shadow-glow-sm',
    medium: 'drop-shadow-glow',
    high: 'drop-shadow-glow-lg',
  };

  const animateClass = animate ? 'animate-neon-pulse' : '';

  return (
    <span
      className={`
        ${colorClasses[color]}
        ${intensityClasses[intensity]}
        ${animateClass}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
