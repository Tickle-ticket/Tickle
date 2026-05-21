package com.ssafy.tickle.favorite.presentation;

import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.favorite.application.FavoriteService;
import com.ssafy.tickle.favorite.presentation.dto.FavoriteCreateResponse;
import com.ssafy.tickle.favorite.presentation.dto.FavoriteEventsResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 공연 찜 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Favorite", description = "공연 찜 API")
public class FavoriteController implements FavoriteApiDoc {

    private final FavoriteService favoriteService;

    @Override
    @PostMapping("/events/{eventId}/favorite")
    public ResponseEntity<BaseResponse<FavoriteCreateResponse>> createFavorite(
            @PathVariable("eventId") Long eventId,
            @UserId Long userId
    ) {
        FavoriteCreateResponse response = favoriteService.createFavorite(userId, eventId);

        return ResponseEntity
                .status(SuccessCode.CREATED.getStatus())
                .body(BaseResponse.success(SuccessCode.CREATED, response));
    }

    @Override
    @DeleteMapping("/events/{eventId}/favorite")
    public ResponseEntity<BaseResponse<Void>> deleteFavorite(
            @PathVariable("eventId") Long eventId,
            @UserId Long userId
    ) {
        favoriteService.deleteFavorite(userId, eventId);

        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, null));
    }

    @Override
    @GetMapping("/users/me/favorites")
    public ResponseEntity<BaseResponse<FavoriteEventsResponse>> getFavoriteEvents(
            @UserId Long userId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, favoriteService.getFavoriteEvents(userId, page, size)));
    }
}
