import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'chip';
  size?: 'sm' | 'md';
  icon?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon = false, className = '', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-1.5 rounded-md transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary: 'bg-accent text-accent-on font-semibold hover:bg-accent-hover',
      secondary: 'bg-raised border border-border text-fg hover:border-border-strong',
      ghost: 'bg-transparent text-fg-secondary hover:bg-raised hover:text-fg',
      chip: 'bg-accent-dim border border-accent-line text-accent text-xs font-semibold',
    };

    const sizes = icon
      ? 'p-[7px]'
      : size === 'sm'
        ? 'px-3.5 py-[7px] text-[13px]'
        : 'px-[18px] py-[10px] text-sm';

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${variant === 'chip' ? 'px-2 py-1' : sizes} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
