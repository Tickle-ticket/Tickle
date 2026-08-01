'use client';

import { useQueryClient } from '@tanstack/react-query';
import { isFailure } from '@/src/shared/api/errors';
import { createFavorite, deleteFavorite } from '@/src/shared/api/favoriteApi';
import { getAccessToken } from '@/src/shared/api/tokenManager';
import { useWishlistStore } from '@/src/shared/store/useWishlistStore';

/**
 * 찜 등록·해제를 한 곳에서 처리하는 훅입니다.
 *
 * 홈·상세·검색·마이페이지 네 화면이 같은 동작을 따로 구현하면서 실패 처리가
 * 제각각이었다. 같은 404인데 어떤 화면은 조용히 넘기고 어떤 화면은 모달을
 * 띄웠고, 롤백 방향이 어긋나는 곳도 있었다.
 *
 * 낙관적 업데이트와 롤백은 이 훅이 맡고, 사용자에게 무엇을 보여줄지는 호출부가
 * 콜백으로 정한다.
 */

/** 찜 목록 쿼리 키. 토글 후 갱신 대상이다. */
const WISHLIST_QUERY_KEY = ['myUpcomingWishlist'];

/**
 * 서버가 이미 원하는 상태였음을 뜻하는 응답인지 판별합니다.
 *
 * 해제하려는데 찜이 없거나(404), 등록하려는데 이미 있는(409) 경우다. 사용자가
 * 의도한 결과는 이미 이뤄졌으므로 실패로 다루지 않는다 — 롤백하면 오히려
 * 화면이 서버와 어긋난다.
 */
const isAlreadyInDesiredState = (error: unknown) =>
  isFailure(error, 'NotFoundError') || isFailure(error, 'ConflictError');

interface UseFavoriteToggleOptions {
  /**
   * 비로그인 상태에서 토글을 시도했을 때 호출된다.
   * 로그인 유도 방식(모달 문구·복귀 경로)이 화면마다 달라 호출부에 맡긴다.
   */
  onRequireLogin?: () => void;
  /**
   * 실패해 롤백한 뒤 호출된다. 넘기지 않으면 조용히 되돌리기만 한다.
   * 찜은 되돌리기 쉬운 가벼운 동작이라 알림을 강제하지 않는다.
   */
  onError?: (error: unknown) => void;
  /** 찜을 새로 등록했을 때 호출된다(하트 애니메이션 등). */
  onAdded?: (eventId: string) => void;
}

export const useFavoriteToggle = (options: UseFavoriteToggleOptions = {}) => {
  const { onRequireLogin, onError, onAdded } = options;

  const queryClient = useQueryClient();
  const wishlistMap = useWishlistStore((s) => s.wishlistMap);
  const addWishlist = useWishlistStore((s) => s.addWishlist);
  const removeWishlist = useWishlistStore((s) => s.removeWishlist);

  /**
   * 찜 상태를 뒤집습니다.
   *
   * @param eventId       공연 식별자
   * @param currentlyOn   현재 찜 상태. 넘기지 않으면 스토어 값을 쓴다.
   *                      상세 화면처럼 서버 응답(isFavorite)을 기준으로 삼는
   *                      곳이 있어 열어둔다.
   */
  const toggle = async (eventId: string, currentlyOn?: boolean) => {
    if (!getAccessToken()) {
      onRequireLogin?.();
      return;
    }

    const wasOn = currentlyOn ?? !!wishlistMap[eventId];

    // 낙관적 업데이트 — 응답을 기다리지 않고 먼저 반영한다.
    if (wasOn) {
      removeWishlist(eventId);
    } else {
      addWishlist(eventId);
      onAdded?.(eventId);
    }

    try {
      if (wasOn) {
        await deleteFavorite(Number(eventId));
      } else {
        await createFavorite(Number(eventId));
      }
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    } catch (error) {
      if (isAlreadyInDesiredState(error)) {
        // 서버가 이미 원하는 상태다. 화면을 그대로 두고 목록만 맞춘다.
        queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
        return;
      }

      // 낙관적 업데이트를 되돌린다. wasOn은 토글 직전 값이라 항상 정확하다.
      if (wasOn) {
        addWishlist(eventId);
      } else {
        removeWishlist(eventId);
      }

      console.error('찜 상태 변경 실패:', error);
      onError?.(error);
    }
  };

  return { toggle, wishlistMap };
};
