import { BadgeColor } from '@/src/shared/components/types';

const BADGE_COLORS: BadgeColor[] = ['red', 'blue', 'green', 'purple', 'grey'];

/**
 * 뱃지의 인덱스(순서)에 따라 순차적으로 색상을 반환합니다.
 * 첫번째는 빨간색, 두번째는 파란색, 세번째는 초록색 등으로 나타납니다.
 */
export const getBadgeColor = (index: number): BadgeColor => {
  return BADGE_COLORS[index % BADGE_COLORS.length];
};
