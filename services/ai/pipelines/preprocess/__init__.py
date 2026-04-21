"""Raw 이벤트 → feature 계산 직전까지의 전처리 단계.

의존 순서:
    dedupe → derive → session_split → normalize

각 모듈은 pure function 한두 개로 구성. 상태 없음. Shadow mode 대비.
"""
from pipelines.preprocess.dedupe import dedupe_label_clicks
from pipelines.preprocess.derive import derive_mouse_dynamics
from pipelines.preprocess.session_split import split_by_page
from pipelines.preprocess.normalize import normalize_coords

__all__ = [
    "dedupe_label_clicks",
    "derive_mouse_dynamics",
    "split_by_page",
    "normalize_coords",
]
