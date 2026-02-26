interface HexagonPatternProps {
  color?: 'cyan' | 'pink' | 'purple';
  opacity?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function HexagonPattern({
  color = 'cyan',
  opacity = 0.1,
  size = 'md',
  className = '',
}: HexagonPatternProps) {
  const colorMap = {
    cyan: '%2300FFFF',
    pink: '%23FF3FFF',
    purple: '%23A855F7',
  };

  const sizeMap = {
    sm: '30px 26px',
    md: '50px 43.4px',
    lg: '70px 60.6px',
  };

  const svgDataUrl = `url("data:image/svg+xml,%3Csvg width='50' height='43.4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M25 0l25 14.4v14.6L25 43.4 0 29V14.4z' fill='none' stroke='${colorMap[color]}' stroke-width='0.5' opacity='${opacity}'/%3E%3C/svg%3E")`;

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        backgroundImage: svgDataUrl,
        backgroundSize: sizeMap[size],
      }}
    />
  );
}
