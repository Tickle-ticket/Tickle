'use client';

import { useMemo, useState } from 'react';
import { ApiError } from '@/src/shared/api/types';
import { useCategories } from '@/src/shared/api/useCategories';

/**
 * 카테고리 목록을 불러오고 선택 상태를 유지합니다.
 *
 * <p>목록이 다시 내려왔을 때 이미 고른 값이 그 안에 없으면 선택을 비웁니다.
 * 없는 카테고리로 등록을 시도하면 서버에서 막히기 때문입니다.</p>
 */
export const useCategoryOptions = () => {
  const { data, isLoading, error } = useCategories();
  const categories = useMemo(() => data ?? [], [data]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // 목록에 없는 값이 남아 있으면 렌더 중에 비운다. effect로 미루면 한 프레임
  // 동안 잘못된 선택이 화면에 남는다.
  const isSelectionStale =
    selectedCategoryId !== '' &&
    categories.length > 0 &&
    !categories.some((category) => String(category.categoryId) === selectedCategoryId);

  if (isSelectionStale) {
    setSelectedCategoryId('');
  }

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: String(category.categoryId),
        label: category.categoryName,
      })),
    [categories],
  );

  const selectedCategoryInfo = useMemo(
    () => categories.find((category) => String(category.categoryId) === selectedCategoryId),
    [categories, selectedCategoryId],
  );

  const categoryListErrorMessage = error
    ? error instanceof ApiError
      ? error.message
      : '카테고리 목록을 불러오지 못했습니다.'
    : !isLoading && categories.length === 0
      ? '카테고리 목록이 비어 있습니다.'
      : null;

  return {
    categories,
    categoryOptions,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedCategoryInfo,
    isCategoryListLoading: isLoading,
    categoryListErrorMessage,
  };
};
