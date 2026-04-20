"""세션을 페이지 단위로 분할.

브라우저 수집 세션은 여러 페이지(`/`, `/mock_pages/seat.html` 등)를 넘나듦.
feature 일부(A1 time_to_first_click, A4 inter_click_interval) 는 페이지 단위
집계가 필요함.

저장 포맷에 `_url` 필드가 storage.py 에서 배치별로 붙지만, 같은 배치 내
여러 url 이 섞이진 않음 (한 페이지에서 배치 후 전송). session_start 이벤트의
`url` 필드로 페이지 전환 감지 가능.
"""
from typing import List, Dict
from urllib.parse import urlparse


def split_by_page(events: List[Dict]) -> Dict[str, List[Dict]]:
    """event list 를 페이지(path) 단위 dict 로 분리.

    분할 기준:
      1. `_url` 필드가 있으면 그것을 그대로 사용 (storage.py 붙여줌)
      2. 없으면 session_start 이벤트 사이 구간으로 나눔 (매크로 로그 등)

    Returns:
        {page_path: [events_in_that_page]}
    """
    buckets: Dict[str, List[Dict]] = {}
    current_page = None

    for evt in events:
        page = None
        if "_url" in evt:
            page = _path_of(evt["_url"])
        elif evt.get("type") == "session_start" and "url" in evt:
            page = _path_of(evt["url"])

        if page is not None:
            current_page = page

        key = current_page or "unknown"
        buckets.setdefault(key, []).append(evt)

    return buckets


def _path_of(url: str) -> str:
    """URL 전체에서 path 부분만 추출. "/mock_pages/seat.html?eid=E001" → "/mock_pages/seat.html" """
    try:
        parsed = urlparse(url)
        return parsed.path or url
    except Exception:
        return url
