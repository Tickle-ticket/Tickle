import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from './eventApi';

/**
 * 공연 카테고리 목록을 조회합니다.
 *
 * <p>홈·검색·기획사 등록이 모두 같은 목록을 쓰고, 운영 중에 바뀌는 일이 거의
 * 없어 한 쿼리로 모읍니다. 화면마다 따로 부르면 같은 응답을 여러 번 받는다.</p>
 */
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetchCategories();
      return response.data.categories;
    },
    // 카테고리는 운영 중에 바뀌는 일이 거의 없다. cachePolicy의 LONG(5분)보다
    // 훨씬 길게 잡아도 무방하다.
    staleTime: 1000 * 60 * 60,
  });
};
