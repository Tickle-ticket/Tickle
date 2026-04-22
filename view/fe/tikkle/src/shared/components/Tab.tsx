import React, { ReactNode } from 'react';
import type { TabProps, TabItemProps } from './types';

const TabItem = ({ children, selected, redBean = false, onClick }: TabItemProps) => {
  return (
    <button
      role="tab"
      aria-selected={selected}
      title={redBean ? '(업데이트 있음)' : undefined}
      onClick={onClick}
      style={{
        position: 'relative',
        background: 'none',
        border: 'none',
        borderBottom: selected
          ? `0.125em solid var(--toss-ui-tab-text)`
          : '0.125em solid transparent',
        color: selected ? 'var(--toss-ui-tab-text)' : 'var(--toss-ui-tab-inactive)',
        fontWeight: selected ? 'bold' : 'normal',
        cursor: 'pointer',
        padding: '0 0.5em',
        height: '100%',
        transition: 'all 0.2s ease-in-out',
        flexShrink: 0,
      }}
    >
      {children}

      {}
      {redBean && (
        <span
          style={{
            position: 'absolute',
            top: '0.25em',
            right: '-0.25em',
            width: '0.3em',
            height: '0.3em',
            backgroundColor: 'var(--toss-ui-red-bean)',
            borderRadius: '50%',
          }}
        />
      )}
    </button>
  );
};

const Tab = ({
  children,
  onChange,
  size = 'large',
  fluid = false,
  itemGap,
  ariaLabel,
  isLoading = false,
  skeletonCount = 3,
}: TabProps) => {

  const gapInEm = itemGap ? `${itemGap / 16}em` : undefined;

  const sizeStyles = {
    large: { fontSize: '1em', height: '3em' },
    small: { fontSize: '0.875em', height: '2.5em' },
  };

  if (isLoading) {
    // 다채로운 길이를 제공하기 위한 배열 풀
    const widthPool = [60, 80, 50, 70, 90, 55];
    
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: gapInEm,
          width: '100%',
          borderBottom: `0.0625em solid var(--toss-grey-200)`,
          ...sizeStyles[size],
        }}
      >
        {Array.from({ length: skeletonCount }).map((_, i) => {
          const w = widthPool[i % widthPool.length];
          return (
            <div
              key={i}
              style={{
                height: '100%',
                padding: '0 0.5em',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div style={{ width: w, height: '1em' }} className="bg-gray-200 animate-pulse rounded-sm" />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: gapInEm,
        overflowX: fluid ? 'auto' : 'visible',
        whiteSpace: fluid ? 'nowrap' : 'normal',
        width: '100%',
        borderBottom: `0.0625em solid var(--toss-grey-200)`,
        ...sizeStyles[size],
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
      className="hide-scrollbar"
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement<TabItemProps>(child)) {
          return React.cloneElement(child, {
            ...child.props,
            onClick: () => onChange(index),
          });
        }
        return child;
      })}
    </div>
  );
};

Tab.Item = TabItem;

export default Tab;