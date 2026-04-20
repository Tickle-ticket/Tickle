from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class TrialRecord(BaseModel):
    model_config = ConfigDict(extra="allow")

    # 프런트에서 전달하는 trial 단위 저장 payload
    trialId: int
    summary: dict[str, Any]
    metrics: dict[str, Any]
    eventRows: list[dict[str, Any]]
    windowRows: list[dict[str, Any]]


class TrialSaveResponse(BaseModel):
    ok: bool
    trial_id: int
    saved_to: str


class MacroRunRequest(BaseModel):
    # 매크로 제어 UI에서 입력받는 실행 파라미터
    url: str = "http://localhost:5173"
    seats: list[str] = ["B3", "B4"]
    skip_queue: bool = True
    confirm_booking: bool = True
    repeat: int = 1
    headless: bool = False
    timeout_ms: int = 15000
    slow_mo_ms: int = 150
    action_delay_ms: int = 80
    hover_ms: int = 30
    typing_delay_ms: int = 80
    mouse_steps: int = 5
    python_path: str | None = None
    trial_label: str = "macro"


class MacroRunResponse(BaseModel):
    ok: bool
    job_id: str


class MacroJobStatus(BaseModel):
    # 백그라운드 매크로 작업의 현재 상태와 로그
    job_id: str
    status: str
    created_at: float
    finished_at: float | None = None
    return_code: int | None = None
    command: list[str]
    trial_label: str
    repeat: int
    logs: str = ""
