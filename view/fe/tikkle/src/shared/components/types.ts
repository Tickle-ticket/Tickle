import type { ReactNode } from 'react';

export type BadgeSize = 'xsmall' | 'small' | 'medium' | 'large';
export type BadgeColor = 'blue' | 'red' | 'grey' | 'green';
export type BadgeVariant = 'fill' | 'outline';

export interface BadgeProps {
  size?: BadgeSize;
  color?: BadgeColor;
  variant?: BadgeVariant;
  children?: ReactNode; // Loading 시에는 children이 없을 수 있으므로 optional로 변경합니다.
  className?: string;
  fullWidth?: boolean;
  maxLength?: number;
  isLoading?: boolean;
}

export interface BaseButtonProps {
  as?: React.ElementType;
  color?: 'primary' | 'danger' | 'dark' | 'light';
  variant?: 'fill' | 'weak';
  display?: 'inline' | 'block' | 'full';
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  isLoading?: boolean;
  htmlStyle?: React.CSSProperties;
}

export type ButtonProps = BaseButtonProps & 
  React.ButtonHTMLAttributes<HTMLButtonElement> & 
  React.AnchorHTMLAttributes<HTMLAnchorElement>;

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  isLoading?: boolean;
}

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | number;
  isLoading?: boolean;
  className?: string;
}

export interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  fullWidth?: boolean;
  isLoading?: boolean;
}

export interface TabProps {
  children: ReactNode;
  onChange: (index: number) => void;
  size?: 'small' | 'large';
  fluid?: boolean;
  itemGap?: number;
  ariaLabel?: string;
  isLoading?: boolean;
  skeletonCount?: number;
}

export interface TabItemProps {
  children: ReactNode;
  selected?: boolean;
  redBean?: boolean;
  onClick?: () => void;
}

export interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  as?: React.ElementType;
  typography?: 't1' | 't2' | 't3' | 't4' | 't5' | 't6' | 't7';
  color?: 'primary' | 'secondary' | 'tertiary' | 'blue' | 'red' | 'white' | 'gray';
  fontWeight?: 'regular' | 'medium' | 'bold' | 'semibold';
  textAlign?: 'left' | 'center' | 'right';
  ellipsis?: boolean;
}

export interface TitleProps {
  title?: string;
  leftIcon?: ReactNode | 'back' | 'close';
  onLeftClick?: () => void;
  rightElement?: ReactNode;
  transparent?: boolean;
  bottomBorder?: boolean;
  className?: string;
}

export interface TableColumn<T = any> {
  key: Extract<keyof T, string> | string;
  header: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => ReactNode;
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  tableLayout?: 'auto' | 'fixed';
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  className?: string;
}
