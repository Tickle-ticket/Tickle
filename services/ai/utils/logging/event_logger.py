"""통합 이벤트 로깅 모듈. 모든 매크로와 사람 데이터가 동일한 포맷으로 기록."""
import json
import os
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

from .session import Session


@dataclass
class InputEvent:
    session_id: str
    ts_ms: float            # 세션 시작 기준 상대 시간 (ms)
    event: str              # mouse_move | mouse_click | mouse_scroll | key_down | key_up
    x: Optional[int] = None
    y: Optional[int] = None
    button: Optional[str] = None   # left | right | middle
    key: Optional[str] = None
    dx: Optional[float] = None     # 이전 마우스 이벤트 대비 x 변화
    dy: Optional[float] = None
    dt_ms: Optional[float] = None  # 같은 타입 이전 이벤트와의 시간차
    speed: Optional[float] = None  # px/ms
    source: str = ""
    label: str = "macro"           # "macro" | "human"

    def to_dict(self) -> dict:
        d = asdict(self)
        # None 값 제거하여 JSONL 크기 절약
        return {k: v for k, v in d.items() if v is not None}


class EventLogger:
    """세션별 JSONL 이벤트 로거."""

    def __init__(self, session: Session, base_dir: str = "data/raw"):
        self.session = session
        subfolder = session.label if session.label in ("macro", "human") else "macro"
        self.output_dir = Path(base_dir) / subfolder
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.file_path = self.output_dir / f"{session.session_id}.jsonl"
        self._buffer: list[dict] = []
        self._last_mouse_event: Optional[InputEvent] = None
        self._last_key_event: Optional[InputEvent] = None
        self._last_event_by_type: dict[str, InputEvent] = {}

    def log(self, event_type: str, x: Optional[int] = None, y: Optional[int] = None,
            button: Optional[str] = None, key: Optional[str] = None):
        """이벤트 기록. 자동으로 delta/speed 계산."""
        ts_ms = self.session.elapsed_ms()

        dx, dy, dt_ms, speed = None, None, None, None

        # 마우스 이벤트면 delta 계산
        if event_type.startswith("mouse") and x is not None and y is not None:
            prev = self._last_mouse_event
            if prev and prev.x is not None and prev.y is not None:
                dx = float(x - prev.x)
                dy = float(y - prev.y)
                dt_ms = ts_ms - prev.ts_ms
                if dt_ms > 0:
                    dist = (dx ** 2 + dy ** 2) ** 0.5
                    speed = round(dist / dt_ms, 4)
                dx = round(dx, 2)
                dy = round(dy, 2)
                dt_ms = round(dt_ms, 3)

        # 같은 타입 이벤트 간격
        if event_type in self._last_event_by_type:
            prev_same = self._last_event_by_type[event_type]
            if dt_ms is None:
                dt_ms = round(ts_ms - prev_same.ts_ms, 3)

        evt = InputEvent(
            session_id=self.session.session_id,
            ts_ms=round(ts_ms, 3),
            event=event_type,
            x=x, y=y,
            button=button, key=key,
            dx=dx, dy=dy, dt_ms=dt_ms, speed=speed,
            source=self.session.source,
            label=self.session.label,
        )

        self._buffer.append(evt.to_dict())

        # 이전 이벤트 갱신
        if event_type.startswith("mouse"):
            self._last_mouse_event = evt
        if event_type.startswith("key"):
            self._last_key_event = evt
        self._last_event_by_type[event_type] = evt

        # 버퍼가 100개 이상이면 자동 flush
        if len(self._buffer) >= 100:
            self.flush()

    def flush(self):
        """버퍼를 파일에 기록."""
        if not self._buffer:
            return
        with open(self.file_path, "a", encoding="utf-8") as f:
            for evt_dict in self._buffer:
                f.write(json.dumps(evt_dict, ensure_ascii=False) + "\n")
        self._buffer.clear()

    @property
    def event_count(self) -> int:
        return len(self._buffer)
