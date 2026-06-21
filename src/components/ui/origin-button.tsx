import { type VariantProps } from 'class-variance-authority';
import { motion } from 'motion/react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { buttonVariants } from './Button';

const FILL_DURATION = 0.45;
const FILL_EASE = [0.16, 1, 0.3, 1] as const;

type ButtonHTMLAttributesForMotion = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  | 'onAnimationEnd'
  | 'onAnimationIteration'
  | 'onAnimationStart'
  | 'onDrag'
  | 'onDragEnd'
  | 'onDragEnter'
  | 'onDragExit'
  | 'onDragLeave'
  | 'onDragOver'
  | 'onDragStart'
  | 'onDrop'
>;

function getCoverDiameter(width: number, height: number, x: number, y: number) {
  return Math.ceil(
    2 *
      Math.max(
        Math.hypot(x, y),
        Math.hypot(width - x, y),
        Math.hypot(x, height - y),
        Math.hypot(width - x, height - y),
      ),
  );
}

function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

function hasTextContent(node: React.ReactNode): boolean {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node).trim().length > 0;
  }

  if (Array.isArray(node)) {
    return node.some(hasTextContent);
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return hasTextContent(node.props.children);
  }

  return false;
}

type OriginButtonProps = ButtonHTMLAttributesForMotion &
  VariantProps<typeof buttonVariants> & {
    children?: React.ReactNode;
    loading?: boolean;
  };

const OriginButton = React.forwardRef<HTMLButtonElement, OriginButtonProps>(
  (
    {
      children,
      className,
      disabled = false,
      loading = false,
      size = 'default',
      type = 'button',
      variant = 'default',
      onBlur,
      onClick,
      onFocus,
      onKeyDown,
      onKeyUp,
      onPointerCancel,
      onPointerDown,
      onPointerEnter,
      onPointerLeave,
      onPointerUp,
      ...props
    },
    ref,
  ) => {
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const isDisabled = Boolean(disabled || loading);
    const [hovered, setHovered] = React.useState(false);
    const [isPressed, setIsPressed] = React.useState(false);
    const [origin, setOrigin] = React.useState({ x: 0, y: 0 });
    const [coverSize, setCoverSize] = React.useState(0);

    const ariaLabel = props['aria-label'];
    const ariaLabelledBy = props['aria-labelledby'];

    React.useEffect(() => {
      if (!import.meta.env.DEV) {
        return;
      }

      if (hasTextContent(children) || ariaLabel?.trim() || ariaLabelledBy?.trim()) {
        return;
      }

      console.warn(
        'OriginButton: provide visible label text or aria-label / aria-labelledby so the control has an accessible name.',
      );
    }, [ariaLabel, ariaLabelledBy, children]);

    const updateOrigin = React.useCallback((x: number, y: number) => {
      const node = buttonRef.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      setOrigin({ x, y });
      setCoverSize(getCoverDiameter(rect.width, rect.height, x, y));
    }, []);

    const updateOriginFromPointer = React.useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        updateOrigin(event.clientX - rect.left, event.clientY - rect.top);
      },
      [updateOrigin],
    );

    const updateOriginFromCenter = React.useCallback(() => {
      const node = buttonRef.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      updateOrigin(rect.width / 2, rect.height / 2);
    }, [updateOrigin]);

    const showFill = !isDisabled && (hovered || isPressed);

    React.useLayoutEffect(() => {
      const node = buttonRef.current;
      if (!(node && showFill)) return;

      const measure = () => {
        const rect = node.getBoundingClientRect();
        setCoverSize(getCoverDiameter(rect.width, rect.height, origin.x, origin.y));
      };

      measure();

      const observer = new ResizeObserver(measure);
      observer.observe(node);

      return () => observer.disconnect();
    }, [showFill, origin.x, origin.y]);

    const setMergedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        assignRef(ref, node);
      },
      [ref],
    );

    return (
      <motion.button
        {...props}
        aria-busy={loading || undefined}
        className={cn(
          buttonVariants({ size, variant }),
          'relative overflow-hidden',
          loading && 'cursor-wait',
          className,
        )}
        data-pressed={isPressed ? 'true' : 'false'}
        disabled={isDisabled}
        onBlur={(event) => {
          onBlur?.(event);
          setIsPressed(false);
          if (!event.defaultPrevented) {
            setHovered(false);
          }
        }}
        onClick={onClick}
        onFocus={(event) => {
          onFocus?.(event);
          if (isDisabled || event.defaultPrevented) return;
          if (event.currentTarget.matches(':focus-visible')) {
            updateOriginFromCenter();
            setHovered(true);
          }
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);

          if (
            event.defaultPrevented ||
            isDisabled ||
            event.repeat ||
            (event.key !== ' ' && event.key !== 'Enter')
          ) {
            return;
          }

          if (event.key === ' ') {
            event.preventDefault();
          }

          updateOriginFromCenter();
          setIsPressed(true);
          setHovered(true);
        }}
        onKeyUp={(event) => {
          onKeyUp?.(event);

          if (event.key === ' ' || event.key === 'Enter') {
            setIsPressed(false);
            if (!event.currentTarget.matches(':focus-visible')) {
              setHovered(false);
            }
          }
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event);
          setIsPressed(false);
        }}
        onPointerDown={(event) => {
          onPointerDown?.(event);

          if (event.defaultPrevented || isDisabled || event.button !== 0) {
            return;
          }

          updateOriginFromPointer(event);
          setIsPressed(true);
          setHovered(true);
        }}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          if (isDisabled || event.defaultPrevented) return;
          updateOriginFromPointer(event);
          setHovered(true);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          setHovered(false);
          setIsPressed(false);
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event);
          setIsPressed(false);
        }}
        ref={setMergedRef}
        type={type}
        whileTap={isDisabled ? undefined : { scale: 0.985 }}
      >
        <motion.span
          animate={{ scale: showFill && coverSize > 0 ? 1 : 0 }}
          aria-hidden
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/10"
          initial={false}
          style={{
            height: coverSize,
            left: origin.x,
            top: origin.y,
            width: coverSize,
          }}
          transition={{ duration: FILL_DURATION, ease: FILL_EASE }}
        />
        <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
      </motion.button>
    );
  },
);

OriginButton.displayName = 'OriginButton';

export { OriginButton };
export type { OriginButtonProps };
