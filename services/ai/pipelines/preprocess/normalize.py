"""좌표 정규화.

매크로(매크로는 1920x1080 기준 좌표)와 사람(개인 모니터 해상도 다양)의
좌표를 공통 기준(예: 1920x1080 또는 [0, 1])으로 변환해서 feature 계산이
해상도 영향 받지 않도록 함.

session_start 이벤트의 viewport 정보를 참고하여 정규화.
"""
from typing import List, Dict, Optional, Tuple

DEFAULT_BASE_W = 1920
DEFAULT_BASE_H = 1080


def normalize_coords(
    events: List[Dict],
    target_resolution: Tuple[int, int] = (DEFAULT_BASE_W, DEFAULT_BASE_H),
) -> List[Dict]:
    """각 이벤트의 x/y 를 target_resolution 기준으로 스케일.

    session_start 의 `viewport.w` / `viewport.h` 를 원본 해상도로 사용.
    viewport 정보 없으면 정규화 안 함 (pass-through).

    원본 필드 보존을 위해 `x_raw`, `y_raw` 로 백업 후 x/y 덮어쓰기.
    """
    src_w, src_h = _find_viewport(events)
    if src_w is None or src_h is None:
        return events

    sx = target_resolution[0] / src_w
    sy = target_resolution[1] / src_h

    out = []
    for evt in events:
        if "x" in evt and "y" in evt:
            new = dict(evt)
            new["x_raw"] = evt["x"]
            new["y_raw"] = evt["y"]
            new["x"] = int(round(evt["x"] * sx))
            new["y"] = int(round(evt["y"] * sy))
            out.append(new)
        else:
            out.append(evt)
    return out


def _find_viewport(events: List[Dict]) -> Tuple[Optional[int], Optional[int]]:
    """session_start 이벤트에서 viewport 추출."""
    for evt in events:
        if evt.get("type") == "session_start" and "viewport" in evt:
            vp = evt["viewport"]
            return vp.get("w"), vp.get("h")
    return None, None
