interface ScanLinesProps {
  intensity?: 'subtle' | 'medium' | 'strong';
  color?: 'cyan' | 'pink' | 'purple';
  className?: string;
}

export function ScanLines({
  intensity = 'subtle',
  color = 'cyan',
  className = '',
}: ScanLinesProps) {
  const intensityMap = {
    subtle: 0.03,
    medium: 0.06,
    strong: 0.1,
  };

  const colorMap = {
    cyan: '0, 255, 255',
    pink: '255, 63, 255',
    purple: '168, 85, 247',
  };

  const opacityValue = intensityMap[intensity];
  const colorValue = colorMap[color];

  return (
    <>
      {/* Static scan lines */}
      <div
        className={`fixed inset-0 pointer-events-none z-[1000] ${className}`}
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(${colorValue}, ${opacityValue}) 2px,
            rgba(${colorValue}, ${opacityValue}) 4px
          )`,
        }}
      />
      {/* Animated scan line */}
      <div
        className="fixed inset-0 pointer-events-none z-[999] animate-scan-line"
        style={{
          background: `linear-gradient(
            180deg,
            transparent 0%,
            rgba(${colorValue}, ${opacityValue * 3}) 50%,
            transparent 100%
          )`,
          height: '100px',
        }}
      />
    </>
  );
}
