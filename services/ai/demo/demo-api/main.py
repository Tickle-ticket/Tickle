"""FastAPI 데모 서버.

실행 방법:
    cd demo/demo-api
    uvicorn main:app --port 8080 --reload

엔드포인트:
    GET  /            → demo/front-demo/index.html (티켓팅 데모 진입)
    GET  /style.css, /app.js, /event_logger.js, /mock_pages/* → 정적 파일
    POST /log         → 브라우저 이벤트 수집 → data/raw/prototype/{session_id}.jsonl
    GET  /health      → 헬스체크
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from routers.collect import router as collect_router

FRONT_DIR = Path(__file__).resolve().parent.parent / "front-demo"

app = FastAPI(title="TicketDemo API", version="0.1.0")

app.include_router(collect_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


# 정적 파일 서빙은 가장 마지막에 mount (다른 라우트가 우선 매칭됨)
app.mount("/", StaticFiles(directory=str(FRONT_DIR), html=True), name="front")
