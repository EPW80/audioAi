import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  color?: 'pink' | 'cyan' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({
  color = 'cyan',
  size = 'md',
  className = '',
}: LoadingSpinnerProps) {
  const colorClasses = {
    pink: 'text-neon-pink drop-shadow-glow',
    cyan: 'text-neon-cyan drop-shadow-glow',
    purple: 'text-neon-purple drop-shadow-glow',
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <Loader2
      className={`
        animate-spin
        ${colorClasses[color]}
        ${sizeClasses[size]}
        ${className}
      `}
    />
  );
}
