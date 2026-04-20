from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .macro_jobs import consume_next_label, get_job, list_jobs, start_macro_job
from .schemas import MacroJobStatus, MacroRunRequest, MacroRunResponse, TrialRecord, TrialSaveResponse
from .storage import ensure_storage, list_trials, save_trial_payload


app = FastAPI(title="browser-automation-collector-api", version="0.1.0")
STATIC_DIR = Path(__file__).resolve().parents[1] / "static"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    # 데이터 저장 디렉터리를 미리 준비한다.
    ensure_storage()


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/macro-control")
def macro_control() -> FileResponse:
    # 매크로 실행용 단순 제어 페이지를 정적 파일로 제공한다.
    return FileResponse(STATIC_DIR / "macro_control.html")


@app.get("/api/trials")
def get_trials() -> list[dict]:
    return list_trials()


@app.post("/api/trials", response_model=TrialSaveResponse)
def post_trial(record: TrialRecord) -> TrialSaveResponse:
    payload = record.model_dump()
    # 프런트가 라벨을 직접 보내지 않은 경우, 매크로 실행 큐의 라벨을 사용한다.
    label = payload.get("trialLabel") or payload.get("summary", {}).get("trialLabel") or consume_next_label(default="human")
    payload["trialLabel"] = label
    payload.setdefault("summary", {})
    payload["summary"]["trialLabel"] = label
    file_path = save_trial_payload(payload)
    return TrialSaveResponse(ok=True, trial_id=record.trialId, saved_to=str(file_path))


@app.get("/api/macro/jobs", response_model=list[MacroJobStatus])
def get_macro_jobs() -> list[MacroJobStatus]:
    return list_jobs()


@app.get("/api/macro/jobs/{job_id}", response_model=MacroJobStatus)
def get_macro_job(job_id: str) -> MacroJobStatus:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Unknown job_id: {job_id}")
    return job


@app.post("/api/macro/run", response_model=MacroRunResponse)
def post_macro_run(request: MacroRunRequest) -> MacroRunResponse:
    # 매크로 실행은 백그라운드 job으로 시작하고 job_id만 즉시 반환한다.
    job = start_macro_job(request)
    return MacroRunResponse(ok=True, job_id=job.job_id)
