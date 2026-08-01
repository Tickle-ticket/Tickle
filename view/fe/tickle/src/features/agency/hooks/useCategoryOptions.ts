'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchCategories } from '@/src/shared/api/eventApi';
import { ApiError } from '@/src/shared/api/types';
import type { Category } from '@/src/shared/api/types/event.types';

/**
 * 카테고리 목록을 불러오고 선택 상태를 유지합니다.
 *
 * <p>목록이 다시 내려왔을 때 이미 고른 값이 그 안에 없으면 선택을 비웁니다.
 * 없는 카테고리로 등록을 시도하면 서버에서 막히기 때문입니다.</p>
 */
export const useCategoryOptions = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isCategoryListLoading, setIsCategoryListLoading] = useState(true);
  const [categoryListErrorMessage, setCategoryListErrorMessage] = useState<string | null>(null);


  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setIsCategoryListLoading(true);
      setCategoryListErrorMessage(null);

      try {
        const response = await fetchCategories();
        if (cancelled) {
          return;
        }

        const nextCategories = Array.from(response.data.categories);
        setCategories(nextCategories);
        setSelectedCategoryId((current) => {
          if (current && nextCategories.some((category) => String(category.categoryId) === current)) {
            return current;
          }

          return '';
        });

        if (nextCategories.length === 0) {
          setCategoryListErrorMessage('카테고리 목록이 비어 있습니다.');
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCategoryListErrorMessage(
          error instanceof ApiError ? error.message : '카테고리 목록을 불러오지 못했습니다.',
        );
      } finally {
        if (!cancelled) {
          setIsCategoryListLoading(false);
        }
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
    }, []);

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

  return {
    categories,
    categoryOptions,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedCategoryInfo,
    isCategoryListLoading,
    categoryListErrorMessage,
  };
};
