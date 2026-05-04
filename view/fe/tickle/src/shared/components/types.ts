import type { ReactNode } from 'react';

export type BadgeSize = 'xsmall' | 'small' | 'medium' | 'large';
export type BadgeColor = 'blue' | 'red' | 'grey' | 'green' | 'purple';
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

export interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  fullWidth?: boolean;
  isLoading?: boolean;
  size?: 'small' | 'medium';
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
  isLoading?: boolean;
}

export interface TitleProps {
  title?: string;
  leftIcon?: ReactNode | 'back' | 'close';
  onLeftClick?: () => void;
  rightElement?: ReactNode;
  transparent?: boolean;
  bottomBorder?: boolean;
  className?: string;
  isLoading?: boolean;
  textColor?: string;
}

export interface TableColumn<T = unknown> {
  key: Extract<keyof T, string> | string;
  header: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => ReactNode;
}

export interface TableProps<T = unknown> {
  columns: TableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  tableLayout?: 'auto' | 'fixed';
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  className?: string;
}

export interface BannerPosterProps {
  src: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  children?: ReactNode;
  isLoading?: boolean;
  showGradient?: boolean;
}

export interface BannerTitleProps {
  title: string;
  color?: string;
  className?: string;
  isLoading?: boolean;
}

export interface BannerSubtitleProps {
  subtitle: string;
  color?: string;
  className?: string;
  isLoading?: boolean;
}

export interface BannerPlaceProps {
  place: string;
  color?: string;
  className?: string;
  isLoading?: boolean;
}

export interface BannerTimeProps {
  time: string;
  color?: string;
  className?: string;
  isLoading?: boolean;
}

export interface PerformanceBannerProps {
  src: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  title: string;
  subtitle?: string;
  date?: string;
  venue?: string;
  color?: string;
  className?: string;
  currentBadge?: number;
  totalBadge?: number;
  onNext?: () => void;
  onPrev?: () => void;
  isLoading?: boolean;
}

export interface BannerNavigationProps {
  onNext?: () => void;
  onPrev?: () => void;
  current?: number;
  total?: number;
  variant?: 'arrow' | 'scroll-down' | 'badge' | 'dots' | 'badge-arrows';
  className?: string;
  isLoading?: boolean;
}

export interface InfoPosterProps {
  src: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  disabled?: boolean;
  className?: string;
  isLoading?: boolean;
  priority?: boolean;
}

export interface InfoTitleProps {
  title: string;
  className?: string;
  isLoading?: boolean;
}

export interface InfoPlaceProps {
  place: string;
  className?: string;
  isLoading?: boolean;
}

export interface InfoDayProps {
  day: string;
  className?: string;
  isLoading?: boolean;
}

export interface InfoRankProps {
  rank: number;
  className?: string;
  isLoading?: boolean;
}

export interface InfoTimeProps {
  targetDate?: string | Date | number;
  className?: string;
  isLoading?: boolean;
}

export interface InfoCardProps {
  src: string;
  alt?: string;
  disabled?: boolean;
  title: string;
  place?: string;
  day?: string;
  badges?: Array<string | { text: string; color?: BadgeColor; variant?: BadgeVariant }>;
  rank?: number;
  showRank?: boolean;
  targetDate?: string | Date | number;
  showTime?: boolean;
  className?: string;
  isLoading?: boolean;
  isWishlisted?: boolean;
  onWishlistToggle?: (e: React.MouseEvent) => void;
  wishlistVariant?: 'default' | 'greyPlus'; // default: 반투명 검정 배경, greyPlus: 불투명 회색 배경
  layoutId?: string;
  priority?: boolean;
}

export interface LogoProps {
  variant?: 'primary' | 'white' | 'black';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: () => void;
}

export interface SegmentedControlOption {
  label: string;
  value: string;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  columns?: number;
  rows?: number;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  isLoading?: boolean;
}

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  padding?: 'none' | 'small' | 'medium' | 'large';
  variant?: 'outline' | 'shadow' | 'flat' | 'gray';
  className?: string;
  isLoading?: boolean;
}

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  isLoading?: boolean;
  size?: 'small' | 'medium';
  className?: string;
}

export interface AccordionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  className?: string;
  isLoading?: boolean;
}

export interface StageProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
  label?: string;
  isLoading?: boolean;
  className?: string;
}

export interface CalendarProps {
  enabledDates?: (string | Date)[];
  selectedDate?: Date | string | null;
  onSelect?: (date: Date, e?: React.MouseEvent<HTMLButtonElement>) => void;
  isLoading?: boolean;
  className?: string;
}

export type SeatStatus = 'selectable' | 'disabled';
export type SeatColor = 'pink' | 'yellow' | 'mint' | 'red' | 'green' | 'blue' | 'purple' | 'gray' | 'orange' | 'cyan' | 'high' | 'medium' | 'low';
export type CongestionLevel = 'high' | 'medium' | 'low' | 'none';

export interface SeatProps extends Omit<React.CanvasHTMLAttributes<HTMLCanvasElement>, 'onClick'> {
  status?: SeatStatus;
  color?: SeatColor;
  congestion?: CongestionLevel;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  isLoading?: boolean;
  className?: string;
}

export type ErrorType = '404' | '500' | '401' | 'timeout' | 'soldout';

export interface ErrorViewProps {
  type: ErrorType;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export interface TimelineNavItem {
  id: string;
  title: string;
}

export interface TimelineNavProps {
  items: TimelineNavItem[];
  activeIndex: number;
  onItemClick: (id: string, index: number) => void;
  color?: 'black' | 'blue' | 'primary';
  size?: 'small' | 'medium';
  lineStyle?: 'solid' | 'dashed';
  className?: string;
  isLoading?: boolean;
}

export interface PanelToggleProps {
  isFolded: boolean;
  onToggle: () => void;
  side?: 'left' | 'right';
  variant?: 'floating' | 'attached';
  className?: string;
  isLoading?: boolean;
}
