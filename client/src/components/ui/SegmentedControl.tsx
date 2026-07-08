interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div className={`flex bg-inset border border-border rounded-md p-0.5 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 font-mono text-xs rounded-[5px] px-2 py-1.5 transition-colors duration-150 ${
            option.value === value
              ? 'bg-raised font-semibold text-fg'
              : 'bg-transparent text-fg-muted hover:text-fg-secondary'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
