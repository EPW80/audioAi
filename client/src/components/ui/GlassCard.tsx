import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'pink' | 'cyan' | 'purple' | 'none';
  variant?: 'default' | 'elevated' | 'flat';
  hover?: boolean;
}

export function GlassCard({
  children,
  className = '',
  glowColor = 'none',
  variant = 'default',
  hover = false,
}: GlassCardProps) {
  const baseClasses = 'rounded-xl backdrop-blur-xl transition-all duration-300';

  const variantClasses = {
    default: 'bg-glass-bg/40 border border-glass-border/20',
    elevated: 'bg-glass-bg/50 border border-glass-border/30 shadow-glass',
    flat: 'bg-glass-bg/30 border border-glass-border/10',
  };

  const glowClasses = {
    pink: hover
      ? 'hover:border-neon-pink/40 hover:shadow-neon-pink'
      : 'border-neon-pink/20 shadow-neon-pink',
    cyan: hover
      ? 'hover:border-neon-cyan/40 hover:shadow-neon-cyan'
      : 'border-neon-cyan/20 shadow-neon-cyan',
    purple: hover
      ? 'hover:border-neon-purple/40 hover:shadow-neon-purple'
      : 'border-neon-purple/20 shadow-neon-purple',
    none: '',
  };

  const hoverClasses = hover
    ? 'hover:bg-glass-bg/50 hover:border-glass-border/40 cursor-pointer'
    : '';

  return (
    <div
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${glowClasses[glowColor]}
        ${hoverClasses}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
