import { http, HttpResponse } from 'msw';
import type { Category } from '../types/event.types';

/**
 * 카테고리 목록 mock 핸들러입니다.
 *
 * 홈 배너는 카테고리를 먼저 조회한 뒤 각 카테고리의 랭킹 1위를 모아 만들기
 * 때문에(useHomeData#useHomeBanners), 이 응답이 없으면 배너 전체가 비어버린다.
 * 검색 화면도 같은 API로 카테고리명을 대조한다(useSearchData).
 *
 * categoryId는 랭킹 mock(homeHandlers)이 쓰는 값과 맞춰둔다.
 */
const CATEGORIES: Category[] = [
  { categoryId: 1, categoryName: '뮤지컬' },
  { categoryId: 2, categoryName: '콘서트' },
  { categoryId: 3, categoryName: '연극' },
  { categoryId: 4, categoryName: '클래식' },
  { categoryId: 5, categoryName: '스포츠' },
];

export const categoryHandlers = [
  http.get('*/api/v1/categories', async () => {
    return HttpResponse.json({
      status: 200,
      message: 'OK',
      data: { categories: CATEGORIES },
    });
  }),
];
