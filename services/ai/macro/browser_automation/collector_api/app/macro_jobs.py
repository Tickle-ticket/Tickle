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
_label_queue: list[dict[str, float | str]] = []
_lock = threading.Lock()


def default_python_path() -> str:
    return os.environ.get("MACRO_PYTHON_PATH") or sys.executable


def enqueue_labels(label: str, repeat: int) -> None:
    with _lock:
        # 실행 직후 저장될 trial에 사용할 라벨을 임시 큐에 넣어 둔다.
        expires_at = time.time() + 180
        _label_queue.extend([{"label": label, "expires_at": expires_at}] * max(1, repeat))


def consume_next_label(default: str = "human") -> str:
    with _lock:
        if _label_queue:
            now = time.time()
            while _label_queue:
                item = _label_queue.pop(0)
                if item["expires_at"] >= now:
                    return str(item["label"])
    return default


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
    enqueue_labels(request.trial_label, request.repeat)

    def runner() -> None:
        job.status = "running"
        _store_job(job)
        try:
            # 실제 브라우저 자동화는 별도 프로세스로 실행한다.
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
