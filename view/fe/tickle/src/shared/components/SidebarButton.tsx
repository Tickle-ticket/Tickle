import React from 'react';

export interface SidebarButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  label: string;
  image?: React.ReactNode;
  imageSrc?: string;
  imageSize?: number | string;
  imageWidth?: number | string;
  imageHeight?: number | string;
  textColor?: string;
  activeTextColor?: string;
  fontFamily?: React.CSSProperties['fontFamily'];
  fontWeight?: number;
  fontSize?: number | string;
  textMargin?: number | string;
  textMarginX?: number | string;
  textMarginY?: number | string;
  textMarginTop?: number | string;
  textMarginRight?: number | string;
  textMarginBottom?: number | string;
  textMarginLeft?: number | string;
  marginY?: number | string;
  isActive?: boolean;
  hasChildren?: boolean;
  badge?: string;
  activeBackgroundColor?: string;
  hoverBackgroundColor?: string;
}

export function SidebarButton({
  label,
  image,
  imageSrc,
  imageSize = 14,
  imageWidth,
  imageHeight,
  textColor = '#a7adb7',
  activeTextColor = '#ffffff',
  fontFamily,
  fontWeight = 700,
  fontSize,
  textMargin,
  textMarginX,
  textMarginY,
  textMarginTop,
  textMarginRight,
  textMarginBottom,
  textMarginLeft,
  marginY = 0,
  isActive = false,
  hasChildren = false,
  badge,
  activeBackgroundColor = '#2f72f2',
  hoverBackgroundColor = '#292929',
  className = '',
  onMouseEnter,
  onMouseLeave,
  style,
  ...props
}: SidebarButtonProps) {
  const resolvedTextColor = isActive ? activeTextColor : textColor;
  const resolvedBackgroundColor = isActive ? activeBackgroundColor : style?.backgroundColor;
  const verticalMargin = typeof marginY === 'number' ? `${marginY}px` : marginY;
  const textFontSize = typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
  const resolveSize = (value?: number | string) => (
    typeof value === 'number' ? `${value}px` : value
  );
  const textMarginValue = resolveSize(textMargin);
  const textMarginXValue = resolveSize(textMarginX);
  const textMarginYValue = resolveSize(textMarginY);
  const imageSizeValue = resolveSize(imageSize);
  const imageWidthValue = resolveSize(imageWidth) ?? imageSizeValue;
  const imageHeightValue = resolveSize(imageHeight) ?? imageSizeValue;

  return (
    <button
      type="button"
      className={[
        'group relative flex h-[33px] w-full items-center gap-[15px] pl-[22px] pr-[14px] text-left text-[11px] tracking-normal transition-colors',
        className,
      ].join(' ')}
      style={{
        ...style,
        color: resolvedTextColor,
        backgroundColor: resolvedBackgroundColor,
        fontFamily,
        fontWeight,
        marginTop: verticalMargin,
        marginBottom: verticalMargin,
      }}
      aria-current={isActive ? 'page' : undefined}
      {...props}
      onMouseEnter={(event) => {
        if (!isActive) {
          event.currentTarget.style.backgroundColor = hoverBackgroundColor;
        }

        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        if (!isActive) {
          event.currentTarget.style.backgroundColor = '';
        }

        onMouseLeave?.(event);
      }}
    >
      {isActive && (
        <span
          className="hidden lg:block absolute left-0 top-0 h-full w-[3px]"
          style={{ backgroundColor: activeTextColor }}
          aria-hidden="true"
        />
      )}

      {(imageSrc || image) && (
        <span
          className="flex shrink-0 items-center justify-center"
          style={{ width: imageWidthValue, height: imageHeightValue }}
        >
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt=""
            className="shrink-0 object-contain"
            style={{ width: imageWidthValue, height: imageHeightValue }}
            aria-hidden="true"
          />
        ) : (
          image
        )}
        </span>
      )}

      <span
        className="min-w-0 flex-1 truncate"
        style={{
          fontSize: textFontSize,
          margin: textMarginValue,
          marginTop: resolveSize(textMarginTop) ?? textMarginYValue,
          marginRight: resolveSize(textMarginRight) ?? textMarginXValue,
          marginBottom: resolveSize(textMarginBottom) ?? textMarginYValue,
          marginLeft: resolveSize(textMarginLeft) ?? textMarginXValue,
        }}
      >
        {label}
      </span>

      {badge && (
        <span className="flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#46dc7d] px-[4px] text-[9px] font-bold leading-none text-[#1e1e1e]">
          {badge}
        </span>
      )}

      {hasChildren && (
        <span className="text-[9px]">▼</span>
      )}
    </button>
  );
}

export default SidebarButton;
