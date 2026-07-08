import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        id={id}
        className={`w-full bg-inset border border-border rounded-md px-3 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition-colors duration-150 focus:border-accent ${className}`}
        {...props}
      />
    );

    if (!label) return input;

    return (
      <div>
        <label htmlFor={id} className="block text-[13px] font-medium text-fg-secondary mb-1.5">
          {label}
        </label>
        {input}
      </div>
    );
  }
);

Input.displayName = 'Input';
