"""POST /log 엔드포인트.

브라우저 app.js 가 보내는 이벤트 배치를 받아 jsonl 파일에 append 한다.
"""
from fastapi import APIRouter, Response

from schemas.raw_event import LogPayload
from services.storage import append_events

router = APIRouter()


@router.post("/log", status_code=204)
async def collect_log(payload: LogPayload) -> Response:
    append_events(
        session_id=payload.session_id,
        url=payload.url,
        batch_ts=payload.ts,
        events=payload.events,
    )
    return Response(status_code=204)
