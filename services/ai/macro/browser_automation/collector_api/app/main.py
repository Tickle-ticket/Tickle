from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .macro_jobs import consume_next_context, enqueue_context_items, enqueue_labels, get_job, list_jobs, start_macro_job
from .schemas import (
    LabelEnqueueRequest,
    LabelEnqueueResponse,
    LabelEnqueueContextRequest,
    MacroJobStatus,
    MacroRunRequest,
    MacroRunResponse,
    TrialRecord,
    TrialSaveResponse,
)
from .storage import ensure_storage, list_trials, save_trial_payload
from .storage import append_macro_run_params


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
    # 데이터 저장 디렉토리를 미리 준비한다.
    ensure_storage()


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/macro-control")
def macro_control() -> FileResponse:
    # 매크로 실행을 위한 간단한 제어 페이지를 정적 파일로 제공한다.
    return FileResponse(STATIC_DIR / "macro_control.html")


@app.get("/api/trials")
def get_trials() -> list[dict]:
    return list_trials()


@app.post("/api/trials", response_model=TrialSaveResponse)
def post_trial(record: TrialRecord) -> TrialSaveResponse:
    payload = record.model_dump()

    # 매크로 실행 신호가 없으면 기본은 human이다.
    # 프론트에서 임의로 label을 보내더라도, 서버에서 최종 label을 확정한다.
    ctx = consume_next_context(default_label="human")
    label = str(ctx.get("label", "human"))
    payload["label"] = label
    payload.setdefault("summary", {})
    payload["summary"]["label"] = label

    file_path, saved_trial_id = save_trial_payload(payload)

    # trial payload schema는 유지하면서, macro run params는 sidecar JSONL로만 저장한다.
    run_params = ctx.get("run_params")
    if label == "macro" and isinstance(run_params, dict) and run_params:
        append_macro_run_params(saved_trial_id, run_params)

    return TrialSaveResponse(ok=True, trial_id=saved_trial_id, saved_to=str(file_path))


@app.post("/api/labels/enqueue", response_model=LabelEnqueueResponse)
def post_enqueue_labels(request: LabelEnqueueRequest) -> LabelEnqueueResponse:
    enqueue_labels(request.label, max(1, int(request.repeat)))
    return LabelEnqueueResponse(ok=True)


@app.post("/api/labels/enqueue_context", response_model=LabelEnqueueResponse)
def post_enqueue_context(request: LabelEnqueueContextRequest) -> LabelEnqueueResponse:
    # 실행별 파라미터(run_params)까지 포함해서 라벨 큐를 채운다.
    items = [item.model_dump() for item in request.items]
    enqueue_context_items(items)
    return LabelEnqueueResponse(ok=True)


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
