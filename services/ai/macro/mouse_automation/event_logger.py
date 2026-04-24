"""통합 이벤트 로깅 모듈. 모든 매크로와 사람 데이터가 동일한 포맷으로 기록.

출력: JSONL 한 줄에 1 이벤트. 파일 경로 = `{base_dir}/{label}/{session_id}.jsonl`
      예: data/raw/macro/abcdef123456.jsonl
          data/raw/human/fedcba654321.jsonl

dx/dy/dt_ms/speed 는 이전 마우스 이벤트 대비 자동 계산 — feature 엔지니어링 시
매번 다시 계산할 필요 없이 raw 에 이미 파생 정보 포함.

라벨 스키마 (2026-04-21):
  label = "macro" | "human"  (str). 기존 0/1 int 였으나 가독성 위해 변경.
  폴더명도 이 라벨 따라 자동 분기 (init 참조).
"""
import json
import os
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

from .session import Session


@dataclass
class InputEvent:
    """한 이벤트를 JSONL 에 쓰기 위한 직렬화 단위."""
    session_id: str
    ts_ms: float                   # 세션 시작 기준 상대 시간 (ms)
    event: str                     # mouse_move | mouse_click | mouse_scroll | key_down | key_up
    x: Optional[int] = None        # 마우스 이벤트 좌표 (OS 스크린 기준)
    y: Optional[int] = None
    button: Optional[str] = None   # left | right | middle
    key: Optional[str] = None      # 키 이벤트의 키 이름
    dx: Optional[float] = None     # 이전 마우스 이벤트 대비 x 변화 (자동 계산)
    dy: Optional[float] = None
    dt_ms: Optional[float] = None  # 같은 타입 이전 이벤트와의 시간차 (자동 계산)
    speed: Optional[float] = None  # px/ms — sqrt(dx^2+dy^2)/dt_ms (자동 계산)
    source: str = ""               # 매크로 식별자 (Session.source)
    label: str = "macro"           # "macro" | "human" — 학습 라벨

    def to_dict(self) -> dict:
        d = asdict(self)
        # None 값 제거하여 JSONL 크기 절약 (마우스 이벤트에서 key 필드가 null 이면 생략)
        return {k: v for k, v in d.items() if v is not None}


class EventLogger:
    """세션별 JSONL 이벤트 로거.

    사용법:
        session = Session(source="pyautogui_lv1", label="macro")
        logger = EventLogger(session)   # data/raw/macro/{session_id}.jsonl 생성
        session.start()
        logger.log("mouse_click", x=100, y=200, button="left")
        ...
        session.end()
        logger.flush()                  # 버퍼 남은 것 파일에 기록
    """

    def __init__(self, session: Session, base_dir: str = "data/raw"):
        self.session = session
        # label 이 "macro" or "human" 이면 그대로 폴더명, 아니면 기본 "macro" 로
        subfolder = session.label if session.label in ("macro", "human") else "macro"
        self.output_dir = Path(base_dir) / subfolder
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.file_path = self.output_dir / f"{session.session_id}.jsonl"
        # 100 이벤트마다 자동 flush (log() 내부) — 메모리 사용 제한
        self._buffer: list[dict] = []
        # delta/speed 자동 계산용 — 이전 이벤트 참조
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
