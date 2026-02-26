import { ButtonHTMLAttributes, ReactNode } from 'react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'neon' | 'ghost';
  glowColor?: 'pink' | 'cyan' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GlassButton({
  children,
  variant = 'secondary',
  glowColor = 'cyan',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}: GlassButtonProps) {
  const baseClasses = 'font-medium rounded-lg transition-all duration-300 flex items-center gap-2 justify-center';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    primary: {
      pink: 'bg-gradient-vaporwave text-white shadow-neon-pink hover:shadow-glow-lg disabled:opacity-50',
      cyan: 'bg-gradient-cyber text-white shadow-neon-cyan hover:shadow-glow-lg disabled:opacity-50',
      purple: 'bg-gradient-neon text-white shadow-neon-purple hover:shadow-glow-lg disabled:opacity-50',
    },
    secondary: {
      pink: 'bg-glass-bg/40 backdrop-blur-xl border border-neon-pink/30 text-neon-pink hover:border-neon-pink/60 hover:shadow-neon-pink disabled:opacity-50',
      cyan: 'bg-glass-bg/40 backdrop-blur-xl border border-neon-cyan/30 text-neon-cyan hover:border-neon-cyan/60 hover:shadow-neon-cyan disabled:opacity-50',
      purple: 'bg-glass-bg/40 backdrop-blur-xl border border-neon-purple/30 text-neon-purple hover:border-neon-purple/60 hover:shadow-neon-purple disabled:opacity-50',
    },
    neon: {
      pink: 'bg-neon-pink text-white shadow-neon-pink hover:shadow-glow-lg disabled:opacity-50',
      cyan: 'bg-neon-cyan text-black shadow-neon-cyan hover:shadow-glow-lg disabled:opacity-50',
      purple: 'bg-neon-purple text-white shadow-neon-purple hover:shadow-glow-lg disabled:opacity-50',
    },
    ghost: {
      pink: 'bg-transparent border border-neon-pink/20 text-foreground hover:bg-neon-pink/10 hover:border-neon-pink/40 disabled:opacity-50',
      cyan: 'bg-transparent border border-neon-cyan/20 text-foreground hover:bg-neon-cyan/10 hover:border-neon-cyan/40 disabled:opacity-50',
      purple: 'bg-transparent border border-neon-purple/20 text-foreground hover:bg-neon-purple/10 hover:border-neon-purple/40 disabled:opacity-50',
    },
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant][glowColor]}
        ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
