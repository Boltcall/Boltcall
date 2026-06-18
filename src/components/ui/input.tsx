'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';
import { motion, type Variants } from 'motion/react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  value?: string | number | readonly string[];
  className?: string;
}

const containerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const letterVariants: Variants = {
  initial: {
    y: 0,
    color: 'inherit',
  },
  animate: {
    y: '-120%',
    color: 'var(--zinc-500)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

export const Input = ({
  label,
  className = '',
  disabled,
  id,
  onBlur,
  onFocus,
  type = 'text',
  value,
  ...props
}: InputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const resolvedLabel = label ?? props['aria-label'] ?? props.placeholder ?? '';
  const valueText = value == null ? '' : String(value);
  const showLabel = isFocused || valueText.length > 0;

  return (
    <div className={cn('relative', className)}>
      <motion.label
        htmlFor={inputId}
        className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-zinc-900 dark:text-zinc-50"
        variants={containerVariants}
        initial="initial"
        animate={showLabel ? 'animate' : 'initial'}
      >
        {resolvedLabel.split('').map((char, index) => (
          <motion.span
            key={index}
            className="inline-block text-sm"
            variants={letterVariants}
            style={{ willChange: 'transform' }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </motion.label>

      <input
        id={inputId}
        type={type}
        value={value}
        disabled={disabled}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        aria-label={props['aria-label'] ?? resolvedLabel}
        {...props}
        className={cn(
          'h-14 w-full border-b-2 border-zinc-900 bg-transparent pb-1 pt-5 text-base font-medium text-zinc-900 outline-none placeholder-transparent dark:border-zinc-50 dark:text-zinc-50',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      />
    </div>
  );
};
