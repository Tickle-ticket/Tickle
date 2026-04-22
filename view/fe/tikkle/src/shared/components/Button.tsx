import React, { ElementType, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
import type { BaseButtonProps, ButtonProps } from './types';

const sizeStyles: Record<string, React.CSSProperties> = {
  small: { padding: '0 12px', height: '32px', fontSize: '14px', borderRadius: '6px' },
  medium: { padding: '0 16px', height: '40px', fontSize: '15px', borderRadius: '8px' },
  large: { padding: '0 20px', height: '48px', fontSize: '16px', borderRadius: '12px' },
  xlarge: { padding: '0 24px', height: '56px', fontSize: '17px', borderRadius: '16px' },
};

const displayStyles: Record<string, React.CSSProperties> = {
  inline: { display: 'inline-flex', width: 'auto' },
  block: { display: 'flex', width: '100%' },
  full: { display: 'flex', width: '100%', borderRadius: '0' },
};

export const Button = React.forwardRef<HTMLElement, ButtonProps>(
  (
    {
      as = 'button',
      color = 'primary',
      variant = 'fill',
      display = 'inline',
      size = 'xlarge',
      isLoading = false,
      disabled = false,
      type = 'button',
      htmlStyle,
      children,
      className,
      'aria-label': ariaLabel,
      href,
      ...rest
    },
    ref
  ) => {
    const Component = as as ElementType;

    const getThemeStyles = (): React.CSSProperties => {
      let baseStyle: React.CSSProperties = {};

      if (variant === 'fill') {
        switch (color) {
          case 'primary': baseStyle = { '--button-background-color': 'var(--toss-blue-500)', '--button-color': 'var(--toss-white)' } as React.CSSProperties; break;
          case 'danger': baseStyle = { '--button-background-color': 'var(--toss-red-500)', '--button-color': 'var(--toss-white)' } as React.CSSProperties; break;
          case 'dark': baseStyle = { '--button-background-color': 'var(--toss-grey-700)', '--button-color': 'var(--toss-white)' } as React.CSSProperties; break;
          case 'light': baseStyle = { '--button-background-color': 'var(--toss-white)', '--button-color': 'var(--toss-grey-600)' } as React.CSSProperties; break;
        }
      } else if (variant === 'weak') {
        switch (color) {
          case 'primary': baseStyle = { '--button-background-color': 'var(--toss-blue-100)', '--button-color': 'var(--toss-blue-600)' } as React.CSSProperties; break;
          case 'danger': baseStyle = { '--button-background-color': 'var(--toss-red-100)', '--button-color': 'var(--toss-red-600)' } as React.CSSProperties; break;
          case 'dark': baseStyle = { '--button-background-color': 'var(--toss-grey-100)', '--button-color': 'var(--toss-grey-600)' } as React.CSSProperties; break;
          case 'light': baseStyle = { '--button-background-color': 'rgba(255, 255, 255, 0.15)', '--button-color': 'var(--toss-white)' } as React.CSSProperties; break;
        }
      }
      return baseStyle;
    };

    const isInteractionDisabled = disabled || isLoading;

    const combinedStyle: React.CSSProperties = {
      ...sizeStyles[size],
      ...displayStyles[display],
      ...getThemeStyles(),
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      cursor: isInteractionDisabled ? 'not-allowed' : 'pointer',
      fontWeight: 600,
      textDecoration: 'none',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background-color 0.2s ease, opacity 0.2s ease',

      backgroundColor: 'var(--button-background-color)',
      color: 'var(--button-color)',
      opacity: isInteractionDisabled ? 'var(--button-disabled-opacity-color, 0.5)' : 1,
      ...htmlStyle,
    };

    const accessibilityProps = {
      'aria-disabled': isInteractionDisabled,
      'aria-busy': isLoading,

      'aria-label': isLoading && !ariaLabel ? '처리 중' : ariaLabel,
    };

    return (
      <Component
        ref={ref}
        type={as === 'button' ? type : undefined}
        href={as === 'a' ? href : undefined}
        disabled={as === 'button' ? isInteractionDisabled : undefined}
        style={combinedStyle}
        className={className}
        onClick={isInteractionDisabled ? undefined : rest.onClick}
        {...accessibilityProps}
        {...rest}
      >

        <span style={{ opacity: isLoading ? 0 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {children}
        </span>

        {isLoading && (
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            aria-hidden="true"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="animate-dot-bounce"
                style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: 'currentColor',
                  borderRadius: '50%',
                  opacity: 0.5,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </span>
        )}
      </Component>
    );
  }
);

Button.displayName = 'Button';
export default Button;