import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  nested?: boolean;
  hover?: boolean;
  radius?: 8 | 10 | 12;
}

export function Card({ nested = false, hover = false, radius, className = '', ...props }: CardProps) {
  const surface = nested ? 'bg-card-nested' : 'bg-panel';
  const r = radius ?? (nested ? 8 : 10);
  const radiusClass = r === 12 ? 'rounded-xl' : r === 8 ? 'rounded-lg' : 'rounded-[10px]';
  const hoverClass = hover ? 'hover:border-border-strong transition-colors duration-150' : '';

  return (
    <div
      className={`${surface} border border-border ${radiusClass} ${hoverClass} ${className}`}
      {...props}
    />
  );
}
