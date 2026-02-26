import { InputHTMLAttributes, forwardRef } from 'react';

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  glowColor?: 'pink' | 'cyan' | 'purple';
  className?: string;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ glowColor = 'cyan', className = '', ...props }, ref) => {
    const baseClasses = 'w-full px-4 py-2 rounded-lg backdrop-blur-xl transition-all duration-300 outline-none';

    const glowClasses = {
      pink: 'bg-glass-bg/40 border border-neon-pink/30 text-foreground placeholder:text-muted-foreground focus:border-neon-pink focus:shadow-neon-pink',
      cyan: 'bg-glass-bg/40 border border-neon-cyan/30 text-foreground placeholder:text-muted-foreground focus:border-neon-cyan focus:shadow-neon-cyan',
      purple: 'bg-glass-bg/40 border border-neon-purple/30 text-foreground placeholder:text-muted-foreground focus:border-neon-purple focus:shadow-neon-purple',
    };

    return (
      <input
        ref={ref}
        className={`
          ${baseClasses}
          ${glowClasses[glowColor]}
          ${className}
        `}
        {...props}
      />
    );
  }
);

GlassInput.displayName = 'GlassInput';
