interface GridBackgroundProps {
  variant?: 'grid' | 'hexagon' | 'dots';
  color?: 'cyan' | 'pink' | 'purple';
  animate?: boolean;
  opacity?: number;
  className?: string;
}

export function GridBackground({
  variant = 'grid',
  color = 'cyan',
  animate = false,
  opacity = 0.1,
  className = '',
}: GridBackgroundProps) {
  const colorMap = {
    cyan: 'rgba(0, 255, 255,',
    pink: 'rgba(255, 63, 255,',
    purple: 'rgba(168, 85, 247,',
  };

  const getBackgroundStyle = () => {
    const colorValue = colorMap[color];

    switch (variant) {
      case 'grid':
        return {
          backgroundImage: `
            linear-gradient(${colorValue} ${opacity}) 1px, transparent 1px),
            linear-gradient(90deg, ${colorValue} ${opacity}) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        };
      case 'dots':
        return {
          backgroundImage: `radial-gradient(circle, ${colorValue} ${opacity}) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        };
      case 'hexagon':
        return {
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='50' height='43.4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M25 0l25 14.4v14.6L25 43.4 0 29V14.4z' fill='none' stroke='${encodeURIComponent(colorValue.slice(0, -1))}' stroke-width='0.5' opacity='${opacity}'/%3E%3C/svg%3E")`,
          backgroundSize: '50px 43.4px',
        };
      default:
        return {};
    }
  };

  const animateClass = animate && variant === 'grid' ? 'animate-grid-flow' : '';

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 ${animateClass} ${className}`}
      style={getBackgroundStyle()}
    />
  );
}
