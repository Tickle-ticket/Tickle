"""데모 raw 이벤트 입력 스키마.

브라우저의 app.js 가 POST /log 로 보내는 페이로드 구조.
프로토타입 단계이므로 events 는 Dict[str, Any] 리스트로 느슨하게 받음.
정식 스키마 확정(Sprint 1) 시점에 엄격화 예정.
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class LogPayload(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=100)
    url: str = ""
    ts: Optional[int] = None
    events: List[Dict[str, Any]]
