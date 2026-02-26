import { useMemo } from 'react';

interface FloatingShapesProps {
  shapes?: 'triangles' | 'hexagons' | 'mixed';
  count?: number;
  color?: 'pink' | 'cyan' | 'purple';
  className?: string;
}

export function FloatingShapes({
  shapes = 'mixed',
  count = 6,
  color = 'cyan',
  className = '',
}: FloatingShapesProps) {
  const colorMap = {
    pink: '#FF3FFF',
    cyan: '#00FFFF',
    purple: '#A855F7',
  };

  const shapeElements = useMemo(() => {
    const elements = [];

    for (let i = 0; i < count; i++) {
      const size = Math.random() * 80 + 40; // 40-120px
      const left = Math.random() * 100; // 0-100%
      const top = Math.random() * 100; // 0-100%
      const delay = Math.random() * 6; // 0-6s
      const duration = Math.random() * 4 + 4; // 4-8s
      const rotation = Math.random() * 360; // 0-360deg

      let shapeType = shapes;
      if (shapes === 'mixed') {
        shapeType = Math.random() > 0.5 ? 'triangles' : 'hexagons';
      }

      elements.push({
        id: i,
        size,
        left,
        top,
        delay,
        duration,
        rotation,
        shapeType,
      });
    }

    return elements;
  }, [count, shapes]);

  return (
    <div className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}>
      {shapeElements.map((shape) => (
        <div
          key={shape.id}
          className="absolute animate-float"
          style={{
            left: `${shape.left}%`,
            top: `${shape.top}%`,
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            animationDelay: `${shape.delay}s`,
            animationDuration: `${shape.duration}s`,
            transform: `rotate(${shape.rotation}deg)`,
            opacity: 0.05,
          }}
        >
          {shape.shapeType === 'triangles' ? (
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <polygon
                points="50,10 90,90 10,90"
                fill="none"
                stroke={colorMap[color]}
                strokeWidth="2"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <polygon
                points="50,5 90,25 90,70 50,95 10,70 10,25"
                fill="none"
                stroke={colorMap[color]}
                strokeWidth="2"
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
