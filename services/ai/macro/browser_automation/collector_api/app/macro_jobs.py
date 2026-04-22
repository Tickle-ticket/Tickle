from __future__ import annotations

import os
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path

from .schemas import MacroJobStatus, MacroRunRequest


ROOT_DIR = Path(__file__).resolve().parents[2]
MACRO_SCRIPT = ROOT_DIR / "macro_runner" / "cli.py"

_jobs: dict[str, MacroJobStatus] = {}
_trial_context_queue: list[dict] = []
_lock = threading.Lock()

# 반복 실행이 길어지면(예: 200회) 라벨 큐가 중간에 만료되어 human으로 떨어질 수 있어 넉넉히 둔다.
LABEL_TTL_SECONDS = 30 * 60


def default_python_path() -> str:
    return os.environ.get("MACRO_PYTHON_PATH") or sys.executable


def enqueue_labels(label: str, repeat: int) -> None:
    with _lock:
        expires_at = time.time() + LABEL_TTL_SECONDS
        _trial_context_queue.extend([{"label": label, "expires_at": expires_at, "run_params": None}] * max(1, repeat))


def enqueue_context_items(items: list[dict]) -> None:
    """Enqueue trial contexts in FIFO order.

    Each item should contain:
      - label: "human" | "macro"
      - run_params: optional dict (e.g., slow_mo_ms, action_delay_ms ...)
    """

    with _lock:
        expires_at = time.time() + LABEL_TTL_SECONDS
        for item in items:
            _trial_context_queue.append(
                {
                    "label": str(item.get("label", "human")),
                    "expires_at": expires_at,
                    "run_params": item.get("run_params"),
                }
            )


def consume_next_context(default_label: str = "human") -> dict:
    with _lock:
        if _trial_context_queue:
            now = time.time()
            while _trial_context_queue:
                item = _trial_context_queue.pop(0)
                if item["expires_at"] >= now:
                    return {"label": str(item.get("label", default_label)), "run_params": item.get("run_params")}
    return {"label": default_label, "run_params": None}


def list_jobs() -> list[MacroJobStatus]:
    with _lock:
        return list(_jobs.values())


def get_job(job_id: str) -> MacroJobStatus | None:
    with _lock:
        return _jobs.get(job_id)


def _store_job(job: MacroJobStatus) -> None:
    with _lock:
        _jobs[job.job_id] = job


def build_macro_command(request: MacroRunRequest) -> list[str]:
    # UI 입력값을 Playwright CLI 인자로 그대로 변환한다.
    command = [
        request.python_path or default_python_path(),
        str(MACRO_SCRIPT),
        "--url",
        request.url,
        "--repeat",
        str(request.repeat),
        "--timeout-ms",
        str(request.timeout_ms),
        "--slow-mo-ms",
        str(request.slow_mo_ms),
        "--action-delay-ms",
        str(request.action_delay_ms),
        "--hover-ms",
        str(request.hover_ms),
        "--typing-delay-ms",
        str(request.typing_delay_ms),
        "--mouse-steps",
        str(request.mouse_steps),
    ]
    if request.skip_queue:
        command.append("--skip-queue")
    if request.confirm_booking:
        command.append("--confirm-booking")
    if request.headless:
        command.append("--headless")
    if request.seats:
        command.extend(["--seats", *request.seats])
    return command


def start_macro_job(request: MacroRunRequest) -> MacroJobStatus:
    job_id = uuid.uuid4().hex[:12]
    command = build_macro_command(request)
    job = MacroJobStatus(
        job_id=job_id,
        status="queued",
        created_at=time.time(),
        command=command,
        trial_label=request.trial_label,
        repeat=request.repeat,
    )
    _store_job(job)

    # 매크로 실행 직후 저장될 trial들을 macro로 라벨링하기 위한 큐를 채운다.
    # 매크로 실행 파라미터도 함께 기록할 수 있게 run_params를 같이 enqueue한다.
    run_params = {
        "slow_mo_ms": int(request.slow_mo_ms),
        "action_delay_ms": int(request.action_delay_ms),
        "hover_ms": int(request.hover_ms),
        "typing_delay_ms": int(request.typing_delay_ms),
        "mouse_steps": int(request.mouse_steps),
    }
    enqueue_context_items([{"label": request.trial_label, "run_params": run_params}] * max(1, int(request.repeat)))

    def runner() -> None:
        job.status = "running"
        _store_job(job)
        try:
            completed = subprocess.run(
                command,
                cwd=str(ROOT_DIR),
                text=True,
                capture_output=True,
                check=False,
            )
            job.return_code = completed.returncode
            job.logs = (completed.stdout or "") + ("\n" + completed.stderr if completed.stderr else "")
            job.status = "completed" if completed.returncode == 0 else "failed"
        except Exception as error:  # noqa: BLE001
            job.return_code = -1
            job.logs = str(error)
            job.status = "failed"
        finally:
            job.finished_at = time.time()
            _store_job(job)

    thread = threading.Thread(target=runner, daemon=True)
    thread.start()
    return job

